<?php

declare(strict_types=1);

/**
 * Long-lived queue worker process.
 *
 * Consumes messages from RabbitMQ queues and dispatches to handlers.
 * Designed to run as a supervised process (systemd, Docker, etc.)
 *
 * Usage:
 *   php scripts/worker.php --queue=epicor.outbox
 *   php scripts/worker.php --queue=notifications.email
 *   php scripts/worker.php --queue=events.audit
 *   php scripts/worker.php --queue=jobs.scheduled
 *
 * @package MOM\Scripts
 * @since   2.1.0
 */

// ── Bootstrap ──────────────────────────────────────────────────────────

$BASE_DIR = dirname(__DIR__);
$DATA_DIR = $BASE_DIR . '/data';

// Composer autoload
$autoload = $BASE_DIR . '/vendor/autoload.php';
if (is_file($autoload)) {
    require_once $autoload;
}

// Legacy helpers (for store access, etc.)
if (!function_exists('api_json')) {
    define('API_HELPERS_ONLY', true);
    require_once $BASE_DIR . '/api.php';
}

// ── Parse Arguments ────────────────────────────────────────────────────

$options = getopt('', ['queue:', 'prefetch:', 'max-messages:', 'help']);

if (isset($options['help']) || !isset($options['queue'])) {
    echo "HESEM MOM Portal - Queue Worker\n\n";
    echo "Usage: php worker.php --queue=<queue_name> [--prefetch=1] [--max-messages=0]\n\n";
    echo "Available queues:\n";
    echo "  epicor.outbox          Epicor ERP integration outbox\n";
    echo "  notifications.email    Email notification delivery\n";
    echo "  notifications.inapp    In-app notification storage\n";
    echo "  events.audit           Audit event logging\n";
    echo "  events.analytics       Analytics event processing\n";
    echo "  jobs.scheduled         Scheduled job execution\n\n";
    echo "Options:\n";
    echo "  --prefetch=N           Prefetch count (default: 1)\n";
    echo "  --max-messages=N       Stop after N messages (0=infinite, default: 0)\n";
    exit(0);
}

$queueName = $options['queue'];
$prefetch = max(1, (int)($options['prefetch'] ?? 1));
$maxMessages = max(0, (int)($options['max-messages'] ?? 0));

// ── Services ───────────────────────────────────────────────────────────

use MOM\Api\Services\QueueService;
use MOM\Api\Services\CacheService;
use MOM\Api\Services\LogTransport;

$cache = new CacheService($DATA_DIR);
$queue = new QueueService($DATA_DIR);
$log = new LogTransport($DATA_DIR);

// ── Signal Handling ────────────────────────────────────────────────────

$running = true;

if (function_exists('pcntl_signal')) {
    pcntl_async_signals(true);
    $shutdown = function () use (&$running, $log) {
        $running = false;
        $log->info('worker', ['event' => 'shutdown_signal', 'queue' => $GLOBALS['queueName']]);
        $log->flush();
    };
    pcntl_signal(SIGTERM, $shutdown);
    pcntl_signal(SIGINT, $shutdown);
}

// ── Handler Registry ───────────────────────────────────────────────────

$handlers = [
    QueueService::QUEUE_EPICOR_OUTBOX => function (array $message) use ($DATA_DIR, $log): bool {
        $log->info('worker', ['event' => 'process_epicor', 'message_id' => $message['event_id'] ?? 'unknown']);
        // Delegate to OutboxWorker for actual Epicor transport
        try {
            $worker = new \MOM\Services\OutboxWorker($DATA_DIR);
            $result = $worker->processPending(['limit' => 1]);
            return true;
        } catch (\Throwable $e) {
            $log->error("Epicor outbox error: {$e->getMessage()}");
            return false;
        }
    },

    QueueService::QUEUE_NOTIFICATIONS_EMAIL => function (array $message) use ($DATA_DIR, $log): bool {
        $log->info('worker', ['event' => 'process_email', 'notification_id' => $message['payload']['notification_id'] ?? 'unknown']);
        // TODO: Implement SMTP transport
        return true;
    },

    QueueService::QUEUE_NOTIFICATIONS_INAPP => function (array $message) use ($DATA_DIR, $log): bool {
        $log->info('worker', ['event' => 'process_inapp', 'notification_id' => $message['payload']['notification_id'] ?? 'unknown']);
        // In-app notifications are stored in the existing NotificationGateway queue
        return true;
    },

    QueueService::QUEUE_EVENTS_AUDIT => function (array $message) use ($log): bool {
        $log->audit($message['payload'] ?? $message);
        return true;
    },

    QueueService::QUEUE_EVENTS_ANALYTICS => function (array $message) use ($cache, $log): bool {
        // Update real-time KPI counters in cache
        $eventType = $message['payload']['type'] ?? $message['routing_key'] ?? 'unknown';
        $cache->increment("analytics:event_count:{$eventType}", 1, 86400);
        return true;
    },

    QueueService::QUEUE_JOBS_SCHEDULED => function (array $message) use ($DATA_DIR, $log): bool {
        $jobName = $message['payload']['job'] ?? 'unknown';
        $log->info('worker', ['event' => 'run_job', 'job' => $jobName]);
        // Delegate to ScheduledJobs
        try {
            $jobs = new \MOM\Api\Services\ScheduledJobs($DATA_DIR);
            $result = $jobs->run($jobName);
            return $result['ok'] ?? false;
        } catch (\Throwable $e) {
            $log->error("Scheduled job error ({$jobName}): {$e->getMessage()}");
            return false;
        }
    },
];

// ── Main Loop ──────────────────────────────────────────────────────────

$handler = $handlers[$queueName] ?? null;
if ($handler === null) {
    echo "ERROR: Unknown queue '{$queueName}'\n";
    echo "Run with --help for available queues.\n";
    exit(1);
}

echo "[Worker] Starting consumer for queue: {$queueName}\n";
echo "[Worker] AMQP: " . ($queue->isAmqpAvailable() ? 'connected' : 'file-fallback') . "\n";
echo "[Worker] Prefetch: {$prefetch}\n";

$log->info('worker', [
    'event'    => 'started',
    'queue'    => $queueName,
    'amqp'     => $queue->isAmqpAvailable(),
    'prefetch' => $prefetch,
]);
$log->flush();

$processedCount = 0;

$wrappedHandler = function (array $message) use ($handler, &$processedCount, $maxMessages, &$running, $log): bool {
    $result = $handler($message);
    $processedCount++;

    if ($maxMessages > 0 && $processedCount >= $maxMessages) {
        $running = false;
        $log->info('worker', ['event' => 'max_messages_reached', 'count' => $processedCount]);
        $log->flush();
    }

    return $result;
};

try {
    $queue->consume($queueName, $wrappedHandler, $prefetch);
} catch (\Throwable $e) {
    $log->error("Worker fatal error: {$e->getMessage()}", [
        'queue' => $queueName,
        'trace' => $e->getTraceAsString(),
    ]);
    $log->flush();
    echo "[Worker] Fatal error: {$e->getMessage()}\n";
    exit(2);
}

$log->info('worker', ['event' => 'stopped', 'processed' => $processedCount]);
$log->flush();
$queue->close();

echo "[Worker] Stopped. Processed {$processedCount} messages.\n";
