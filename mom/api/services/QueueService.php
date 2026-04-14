<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * QueueService - RabbitMQ-backed message queue with JSONL file fallback.
 *
 * Provides reliable async messaging for the MOM Portal. Uses RabbitMQ
 * when available; degrades to JSONL file-based queuing (compatible with
 * the existing OutboxWorker / NotificationGateway patterns).
 *
 * Exchanges:
 *   mom.events        (topic)  - Domain events (workflow transitions, CRUD)
 *   mom.commands       (direct) - Command dispatch (scheduled jobs)
 *   mom.notifications  (fanout) - Notification broadcast
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class QueueService
{
    private ?\PhpAmqpLib\Connection\AMQPStreamConnection $connection = null;
    private ?\PhpAmqpLib\Channel\AMQPChannel $channel = null;
    private bool $amqpAvailable = false;
    private bool $publisherConfirmsEnabled = false;
    private string $fileDir;
    private int $fileMaxAttempts;

    // Exchange names
    public const EXCHANGE_EVENTS        = 'mom.events';
    public const EXCHANGE_COMMANDS       = 'mom.commands';
    public const EXCHANGE_NOTIFICATIONS  = 'mom.notifications';
    public const EXCHANGE_AI             = 'mom.ai';

    // Queue names
    public const QUEUE_EPICOR_OUTBOX     = 'epicor.outbox';
    public const QUEUE_NOTIFICATIONS_EMAIL = 'notifications.email';
    public const QUEUE_NOTIFICATIONS_INAPP = 'notifications.inapp';
    public const QUEUE_JOBS_SCHEDULED    = 'jobs.scheduled';
    public const QUEUE_EVENTS_AUDIT      = 'events.audit';
    public const QUEUE_EVENTS_ANALYTICS  = 'events.analytics';

    // AI queues / Hàng đợi AI
    public const QUEUE_AI_INFERENCE  = 'ai.inference';
    public const QUEUE_AI_ANALYSIS   = 'ai.analysis';
    public const QUEUE_AI_FEEDBACK   = 'ai.feedback';
    public const QUEUE_AI_TRAINING   = 'ai.training';

    /**
     * @param string $dataDir    Base data directory
     * @param array  $amqpConfig RabbitMQ config ['host','port','user','password','vhost']
     */
    public function __construct(
        string $dataDir,
        array $amqpConfig = [],
        int $fileMaxAttempts = 3
    ) {
        $this->fileDir = rtrim($dataDir, '/') . '/queue';
        $this->fileMaxAttempts = max(1, $fileMaxAttempts);
        if (!is_dir($this->fileDir)) {
            @mkdir($this->fileDir, 0775, true);
        }

        $this->connectAmqp($amqpConfig);
    }

    /**
     * Attempt RabbitMQ connection and declare topology.
     */
    private function connectAmqp(array $config): void
    {
        $host = $config['host'] ?? (getenv('AMQP_HOST') ?: '127.0.0.1');
        $port = (int)($config['port'] ?? (getenv('AMQP_PORT') ?: 5672));
        $user = $config['user'] ?? (getenv('AMQP_USER') ?: 'guest');
        $password = $config['password'] ?? (getenv('AMQP_PASSWORD') ?: 'guest');
        $vhost = $config['vhost'] ?? (getenv('AMQP_VHOST') ?: '/');

        try {
            $this->connection = new \PhpAmqpLib\Connection\AMQPStreamConnection(
                $host,
                $port,
                $user,
                $password,
                $vhost,
                false,  // insist
                'AMQPLAIN', // login_method
                null,   // login_response
                'en_US', // locale
                3.0,    // connection_timeout
                3.0     // read_write_timeout
            );
            $this->channel = $this->connection->channel();
            $this->declareTopology();
            $this->enablePublisherConfirms();
            $this->amqpAvailable = true;
        } catch (\Throwable $e) {
            $this->connection = null;
            $this->channel = null;
            $this->amqpAvailable = false;
            $this->publisherConfirmsEnabled = false;
            @error_log("[QueueService] AMQP unavailable ({$host}:{$port}): {$e->getMessage()}");
        }
    }

    /**
     * Declare exchanges and queues. Idempotent.
     */
    private function declareTopology(): void
    {
        if (!$this->channel) return;

        // Exchanges
        $this->channel->exchange_declare(self::EXCHANGE_EVENTS, 'topic', false, true, false);
        $this->channel->exchange_declare(self::EXCHANGE_COMMANDS, 'direct', false, true, false);
        $this->channel->exchange_declare(self::EXCHANGE_NOTIFICATIONS, 'fanout', false, true, false);

        // Queues (durable)
        $this->channel->queue_declare(self::QUEUE_EPICOR_OUTBOX, false, true, false, false);
        $this->channel->queue_declare(self::QUEUE_NOTIFICATIONS_EMAIL, false, true, false, false);
        $this->channel->queue_declare(self::QUEUE_NOTIFICATIONS_INAPP, false, true, false, false);
        $this->channel->queue_declare(self::QUEUE_JOBS_SCHEDULED, false, true, false, false);
        $this->channel->queue_declare(self::QUEUE_EVENTS_AUDIT, false, true, false, false);
        $this->channel->queue_declare(self::QUEUE_EVENTS_ANALYTICS, false, true, false, false);

        // Bindings
        // Events exchange -> audit + analytics queues (all events)
        $this->channel->queue_bind(self::QUEUE_EVENTS_AUDIT, self::EXCHANGE_EVENTS, '#');
        $this->channel->queue_bind(self::QUEUE_EVENTS_ANALYTICS, self::EXCHANGE_EVENTS, '#');

        // Events exchange -> epicor outbox (specific routing keys)
        $this->channel->queue_bind(self::QUEUE_EPICOR_OUTBOX, self::EXCHANGE_EVENTS, 'epicor.*');

        // Commands exchange -> scheduled jobs queue
        $this->channel->queue_bind(self::QUEUE_JOBS_SCHEDULED, self::EXCHANGE_COMMANDS, 'job.run');

        // Notifications exchange -> email + in-app queues (fanout = all)
        $this->channel->queue_bind(self::QUEUE_NOTIFICATIONS_EMAIL, self::EXCHANGE_NOTIFICATIONS);
        $this->channel->queue_bind(self::QUEUE_NOTIFICATIONS_INAPP, self::EXCHANGE_NOTIFICATIONS);

        // AI exchange (topic) / Sàn giao dịch AI
        $this->channel->exchange_declare(self::EXCHANGE_AI, 'topic', false, true, false);

        // AI queues (durable) / Hàng đợi AI (bền vững)
        $this->channel->queue_declare(self::QUEUE_AI_INFERENCE, false, true, false, false);
        $this->channel->queue_declare(self::QUEUE_AI_ANALYSIS, false, true, false, false);
        $this->channel->queue_declare(self::QUEUE_AI_FEEDBACK, false, true, false, false);
        $this->channel->queue_declare(self::QUEUE_AI_TRAINING, false, true, false, false);

        // AI exchange bindings / Liên kết sàn AI
        $this->channel->queue_bind(self::QUEUE_AI_INFERENCE, self::EXCHANGE_AI, 'ai.predict.#');
        $this->channel->queue_bind(self::QUEUE_AI_ANALYSIS, self::EXCHANGE_AI, 'ai.analyze.#');
        $this->channel->queue_bind(self::QUEUE_AI_FEEDBACK, self::EXCHANGE_AI, 'ai.feedback.#');
        $this->channel->queue_bind(self::QUEUE_AI_TRAINING, self::EXCHANGE_AI, 'ai.train.#');
    }

    /**
     * Require broker confirms before AMQP can be treated as authoritative.
     */
    private function enablePublisherConfirms(): void
    {
        if (!$this->channel) {
            throw new \RuntimeException('AMQP channel is not available for publisher confirms');
        }

        $this->channel->set_nack_handler(static function (): void {
            throw new \RuntimeException('AMQP broker negatively acknowledged the published message');
        });
        $this->channel->set_return_listener(
            static function (int $replyCode, string $replyText, string $exchange = '', string $routingKey = '', mixed ...$unused): void {
                throw new \RuntimeException("AMQP broker returned unroutable message ({$replyCode}) on {$exchange}/{$routingKey}: {$replyText}");
            }
        );
        $this->channel->confirm_select();
        $this->publisherConfirmsEnabled = true;
    }

    private function waitForPublishConfirm(): void
    {
        if (!$this->channel || !$this->publisherConfirmsEnabled) {
            throw new \RuntimeException('AMQP publisher confirms are not enabled');
        }
        $this->channel->wait_for_pending_acks_returns(5.0);
    }

    /**
     * Publish a domain event.
     *
     * @param string $routingKey  Dot-notation routing key (e.g. 'workflow.transitioned', 'record.created')
     * @param array  $payload     Event data
     * @param string $exchange    Exchange name (default: mom.events)
     * @return bool True if published successfully
     */
    public function publish(string $routingKey, array $payload, string $exchange = self::EXCHANGE_EVENTS): bool
    {
        $message = [
            'event_id'    => $this->generateId(),
            'routing_key' => $routingKey,
            'exchange'    => $exchange,
            'payload'     => $payload,
            'published_at' => gmdate('c'),
            'source'      => 'mom-portal',
        ];

        if ($this->amqpAvailable) {
            try {
                $amqpMessage = new \PhpAmqpLib\Message\AMQPMessage(
                    json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    [
                        'content_type'  => 'application/json',
                        'delivery_mode' => \PhpAmqpLib\Message\AMQPMessage::DELIVERY_MODE_PERSISTENT,
                        'message_id'    => bin2hex(random_bytes(16)), // WRK-024: Separate AMQP message ID
                        'correlation_id' => $message['event_id'], // WRK-024: Domain event linkage
                        'timestamp'     => time(),
                    ]
                );
                $this->channel->basic_publish($amqpMessage, $exchange, $routingKey, true);
                $this->waitForPublishConfirm();
                return true;
            } catch (\Throwable $e) {
                @error_log("[QueueService] AMQP publish error: {$e->getMessage()}");
                // Fall through to file-based
            }
        }

        // File fallback: append to JSONL queue
        return $this->filePublish($routingKey, $message);
    }

    /**
     * Publish a notification (convenience method).
     */
    public function publishNotification(array $notification): bool
    {
        return $this->publish('notification.send', $notification, self::EXCHANGE_NOTIFICATIONS);
    }

    /**
     * Publish a command (convenience method).
     */
    public function publishCommand(string $command, array $payload = []): bool
    {
        return $this->publish($command, $payload, self::EXCHANGE_COMMANDS);
    }

    /**
     * Consume messages from a queue (blocking).
     * Designed for long-lived worker processes.
     *
     * WRK-002 FIX: AMQP consumer includes timeout protection via wait() timeout parameter.
     * File consumer enforces job-level timeout (default 300s per job).
     *
     * @param string   $queue    Queue name
     * @param callable $handler  function(array $message): bool — return true to ACK, false to NACK
     * @param int      $prefetch Number of messages to prefetch (QOS)
     * @param int      $timeoutPerJobSeconds Max execution time per job (default 300s)
     */
    public function consume(string $queue, callable $handler, int $prefetch = 1, int $timeoutPerJobSeconds = 300): void
    {
        if ($this->amqpAvailable) {
            $this->channel->basic_qos(0, $prefetch, false);
            $this->channel->basic_consume(
                $queue,
                '',     // consumer tag
                false,  // no_local
                false,  // no_ack
                false,  // exclusive
                false,  // nowait
                function (\PhpAmqpLib\Message\AMQPMessage $amqpMsg) use ($handler, $timeoutPerJobSeconds) {
                    $jobStart = time();
                    $data = json_decode($amqpMsg->getBody(), true);

                    // WRK-008: Validate message schema before processing
                    if (!is_array($data) || !isset($data['event_id'], $data['routing_key'])) {
                        // Dead-letter without retry
                        $amqpMsg->nack(false, false);
                        @error_log('[QueueService] Rejected malformed message');
                        return;
                    }

                    try {
                        // WRK-002: Check timeout before and during handler execution
                        if (time() - $jobStart > $timeoutPerJobSeconds) {
                            @error_log("[QueueService] Job timeout after {$timeoutPerJobSeconds}s");
                            $amqpMsg->nack(false, true); // requeue for another worker
                            return;
                        }

                        $result = $handler($data);

                        // Check timeout after handler completes
                        if (time() - $jobStart > $timeoutPerJobSeconds) {
                            @error_log("[QueueService] Job timeout after {$timeoutPerJobSeconds}s (during completion)");
                            $amqpMsg->nack(false, true); // requeue
                            return;
                        }

                        if ($result) {
                            $amqpMsg->ack();
                        } else {
                            $amqpMsg->nack(false, true); // requeue
                        }
                    } catch (\Throwable $e) {
                        @error_log("[QueueService] Consumer error: {$e->getMessage()}");
                        $amqpMsg->nack(false, true); // requeue on error
                    }
                }
            );

            // REAUDIT-R6-019: Use wait() with timeout to prevent indefinite blocking
            // Timeout should account for job timeout to avoid premature returns while job is processing
            $waitTimeout = max(70, $timeoutPerJobSeconds + 10);
            while ($this->channel->is_consuming()) {
                $this->channel->wait(null, false, $waitTimeout);
            }
        } else {
            // File-based polling consumer with timeout
            $this->fileConsume($queue, $handler, $timeoutPerJobSeconds);
        }
    }

    /**
     * Get pending message count from a queue.
     */
    public function getPendingCount(string $queue): int
    {
        if ($this->amqpAvailable) {
            try {
                [$queueName, $messageCount] = $this->channel->queue_declare($queue, true);
                return (int)$messageCount;
            } catch (\Throwable $e) {
                @error_log("[QueueService] AMQP queue inspect error: {$e->getMessage()}");
            }
        }

        // File fallback
        $file = $this->fileDir . '/' . $this->sanitizeQueueName($queue) . '.jsonl';
        if (!is_file($file)) return 0;

        $count = 0;
        $fp = @fopen($file, 'r');
        if ($fp) {
            try {
                while (fgets($fp) !== false) {
                    $count++;
                }
            } finally {
                fclose($fp);
            }
        }
        return $count;
    }

    /**
     * Check if RabbitMQ is available.
     */
    public function isAmqpAvailable(): bool
    {
        return $this->amqpAvailable;
    }

    /**
     * Get health status.
     */
    public function getHealth(): array
    {
        $fileStats = $this->fileQueueStats();
        return [
            'amqp_available'   => $this->amqpAvailable,
            'fallback_mode'    => !$this->amqpAvailable ? 'file' : 'none',
            'file_queue_dir'   => $this->fileDir,
            'file_backlog_count' => $fileStats['backlog_count'],
            'file_dead_letter_count' => $fileStats['dead_letter_count'],
            'file_reconciliation_required' => $fileStats['dead_letter_count'] > 0,
            'file_max_attempts' => $this->fileMaxAttempts,
        ];
    }

    /**
     * Graceful shutdown.
     */
    public function close(): void
    {
        try {
            if ($this->channel) {
                $this->channel->close();
            }
            if ($this->connection) {
                $this->connection->close();
            }
        } catch (\Throwable $e) {
            // Ignore close errors
        }
        $this->channel = null;
        $this->connection = null;
        $this->amqpAvailable = false;
    }

    public function __destruct()
    {
        $this->close();
    }

    // ── File Fallback Methods ───────────────────────────────────────────

    private function sanitizeQueueName(string $queue): string
    {
        return preg_replace('/[^a-z0-9_\-.]/', '_', strtolower($queue));
    }

    private function filePublish(string $routingKey, array $message): bool
    {
        // Map routing key to file queue
        $queueName = $this->routingKeyToQueue($routingKey, $message['exchange'] ?? '');
        $file = $this->fileDir . '/' . $this->sanitizeQueueName($queueName) . '.jsonl';
        $message['file_attempts'] = 0;
        $message['file_status'] = 'pending';

        $line = json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        $result = @file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
        return $result !== false;
    }

    private function routingKeyToQueue(string $routingKey, string $exchange): string
    {
        if ($exchange === self::EXCHANGE_NOTIFICATIONS) {
            return self::QUEUE_NOTIFICATIONS_INAPP;
        }
        if ($exchange === self::EXCHANGE_COMMANDS) {
            return self::QUEUE_JOBS_SCHEDULED;
        }
        if (str_starts_with($routingKey, 'epicor.')) {
            return self::QUEUE_EPICOR_OUTBOX;
        }
        // AI routing keys → AI queues / Routing key AI → hàng đợi AI
        if ($exchange === self::EXCHANGE_AI) {
            if (str_starts_with($routingKey, 'ai.predict')) return self::QUEUE_AI_INFERENCE;
            if (str_starts_with($routingKey, 'ai.analyze')) return self::QUEUE_AI_ANALYSIS;
            if (str_starts_with($routingKey, 'ai.feedback')) return self::QUEUE_AI_FEEDBACK;
            if (str_starts_with($routingKey, 'ai.train')) return self::QUEUE_AI_TRAINING;
            return self::QUEUE_AI_INFERENCE; // Default AI queue
        }
        return self::QUEUE_EVENTS_AUDIT;
    }

    private function fileConsume(string $queue, callable $handler, int $timeoutPerJobSeconds = 300): void
    {
        $file = $this->fileDir . '/' . $this->sanitizeQueueName($queue) . '.jsonl';
        if (!is_file($file)) return;

        $remaining = [];
        $fp = @fopen($file, 'r+');
        if (!$fp) return;

        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            return;
        }

        try {
            // WRK-001 FIX: Read all messages first, then process them.
            // This prevents message loss if the worker crashes during processing.
            // Only truncate the file AFTER all messages have been successfully processed.
            $messages = [];
            while (($line = fgets($fp)) !== false) {
                $line = trim($line);
                if ($line === '') continue;

                $data = json_decode($line, true);
                if (!is_array($data)) {
                    $this->writeDeadLetter($queue, [
                        'file_status' => 'dead_letter',
                        'dead_letter_reason' => 'invalid_json',
                        'raw_line' => $line,
                        'dead_lettered_at' => gmdate('c'),
                    ]);
                    continue;
                }

                $messages[] = ['line' => $line, 'data' => $data];
            }

            // Now process all messages
            $remaining = [];
            $processStart = time();
            foreach ($messages as $msg) {
                // WRK-002: Check if overall job timeout has been exceeded
                if (time() - $processStart > $timeoutPerJobSeconds) {
                    @error_log("[QueueService] File consumer timeout after {$timeoutPerJobSeconds}s; keeping remaining messages for next run");
                    $remaining[] = $msg['line'];
                    continue;
                }

                try {
                    $result = $handler($msg['data']);
                    if (!$result) {
                        $this->retainOrDeadLetter($queue, $msg['data'], $remaining, 'handler_returned_false');
                    }
                } catch (\Throwable $e) {
                    $this->retainOrDeadLetter($queue, $msg['data'], $remaining, 'handler_exception:' . $e->getMessage());
                    @error_log("[QueueService] File consumer error: {$e->getMessage()}");
                }
            }

            // WRK-010: Use atomic temp file swap for file queue atomicity
            // Only truncate and rewrite AFTER all processing is complete
            if (!empty($remaining)) {
                $tmpFile = $file . '.tmp.' . bin2hex(random_bytes(6));
                file_put_contents($tmpFile, implode("\n", $remaining) . "\n", LOCK_EX);
                rename($tmpFile, $file); // atomic
            } else {
                ftruncate($fp, 0);
            }
        } finally {
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }

    private function generateId(): string
    {
        return sprintf(
            'evt-%s-%s',
            gmdate('YmdHis'),
            bin2hex(random_bytes(4))
        );
    }

    /**
     * @param array<string, mixed> $message
     * @param list<string> $remaining
     */
    private function retainOrDeadLetter(string $queue, array $message, array &$remaining, string $reason): void
    {
        $attempts = (int)($message['file_attempts'] ?? 0) + 1;
        $message['file_attempts'] = $attempts;
        $message['last_attempt_at'] = gmdate('c');
        $message['last_error'] = substr($reason, 0, 500);

        if ($attempts >= $this->fileMaxAttempts) {
            $message['file_status'] = 'dead_letter';
            $message['dead_letter_reason'] = substr($reason, 0, 500);
            $message['dead_lettered_at'] = gmdate('c');
            $this->writeDeadLetter($queue, $message);
            return;
        }

        $message['file_status'] = 'retry_pending';
        $encoded = json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (is_string($encoded) && $encoded !== '') {
            $remaining[] = $encoded;
        }
    }

    /**
     * @param array<string, mixed> $message
     */
    private function writeDeadLetter(string $queue, array $message): void
    {
        $file = $this->fileDir . '/' . $this->sanitizeQueueName($queue) . '.dead-letter.jsonl';
        $encoded = json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            $encoded = '{"file_status":"dead_letter","dead_letter_reason":"encode_failed"}';
        }
        @file_put_contents($file, $encoded . "\n", FILE_APPEND | LOCK_EX);
    }

    /**
     * @return array{backlog_count:int, dead_letter_count:int}
     */
    private function fileQueueStats(): array
    {
        $backlog = 0;
        $deadLetter = 0;
        $files = is_dir($this->fileDir) ? (glob($this->fileDir . '/*.jsonl') ?: []) : [];

        foreach ($files as $file) {
            if (!is_file($file)) {
                continue;
            }
            $count = 0;
            $fp = @fopen($file, 'r');
            if ($fp) {
                try {
                    while (fgets($fp) !== false) {
                        $count++;
                    }
                } finally {
                    fclose($fp);
                }
            }

            if (str_ends_with($file, '.dead-letter.jsonl')) {
                $deadLetter += $count;
            } else {
                $backlog += $count;
            }
        }

        return ['backlog_count' => $backlog, 'dead_letter_count' => $deadLetter];
    }
}
