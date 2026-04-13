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
    private string $fileDir;

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
        array $amqpConfig = []
    ) {
        $this->fileDir = rtrim($dataDir, '/') . '/queue';
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
            $this->amqpAvailable = true;
        } catch (\Throwable $e) {
            $this->connection = null;
            $this->channel = null;
            $this->amqpAvailable = false;
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
                        'message_id'    => $message['event_id'],
                        'timestamp'     => time(),
                    ]
                );
                $this->channel->basic_publish($amqpMessage, $exchange, $routingKey);
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
     * @param string   $queue    Queue name
     * @param callable $handler  function(array $message): bool — return true to ACK, false to NACK
     * @param int      $prefetch Number of messages to prefetch (QOS)
     */
    public function consume(string $queue, callable $handler, int $prefetch = 1): void
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
                function (\PhpAmqpLib\Message\AMQPMessage $amqpMsg) use ($handler) {
                    $data = json_decode($amqpMsg->getBody(), true);
                    try {
                        $result = $handler($data);
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

            while ($this->channel->is_consuming()) {
                $this->channel->wait();
            }
        } else {
            // File-based polling consumer
            $this->fileConsume($queue, $handler);
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
            while (fgets($fp) !== false) {
                $count++;
            }
            fclose($fp);
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
        return [
            'amqp_available'   => $this->amqpAvailable,
            'fallback_mode'    => !$this->amqpAvailable ? 'file' : 'none',
            'file_queue_dir'   => $this->fileDir,
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

    private function fileConsume(string $queue, callable $handler): void
    {
        $file = $this->fileDir . '/' . $this->sanitizeQueueName($queue) . '.jsonl';
        if (!is_file($file)) return;

        $remaining = [];
        $fp = @fopen($file, 'r');
        if (!$fp) return;

        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            return;
        }

        while (($line = fgets($fp)) !== false) {
            $line = trim($line);
            if ($line === '') continue;

            $data = json_decode($line, true);
            if (!is_array($data)) continue;

            try {
                $result = $handler($data);
                if (!$result) {
                    $remaining[] = $line; // Keep for retry
                }
            } catch (\Throwable $e) {
                $remaining[] = $line; // Keep on error
                @error_log("[QueueService] File consumer error: {$e->getMessage()}");
            }
        }

        // Rewrite file with remaining messages
        ftruncate($fp, 0);
        rewind($fp);
        if (!empty($remaining)) {
            fwrite($fp, implode("\n", $remaining) . "\n");
        }

        flock($fp, LOCK_UN);
        fclose($fp);
    }

    private function generateId(): string
    {
        return sprintf(
            'evt-%s-%s',
            gmdate('YmdHis'),
            bin2hex(random_bytes(4))
        );
    }
}
