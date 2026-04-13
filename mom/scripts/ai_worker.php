<?php

declare(strict_types=1);

/**
 * AI Worker Daemon - Long-running RabbitMQ consumer for AI inference queues.
 *
 * Tiến trình chạy nền tiêu thụ hàng đợi AI từ RabbitMQ.
 * Xử lý: dự đoán, phân tích, huấn luyện, phản hồi.
 *
 * Usage:
 *   php scripts/ai_worker.php
 *
 * Signals:
 *   SIGTERM / SIGINT - Graceful shutdown (dừng an toàn)
 *
 * @package MOM\Scripts
 * @since   2.2.0
 */

// ── Bootstrap ───────────────────────────────────────────────────────────

$baseDir = dirname(__DIR__);
require_once $baseDir . '/vendor/autoload.php';

use MOM\Api\Services\QueueService;

// ── Constants ───────────────────────────────────────────────────────────

/** PID file location / Vị trí file PID */
const PID_FILE = __DIR__ . '/../data/ai-worker.pid';

/** Memory limit in bytes (256 MB) / Giới hạn bộ nhớ */
const MEMORY_LIMIT = 256 * 1024 * 1024;

/** Heartbeat interval in seconds / Khoảng nhịp tim */
const HEARTBEAT_INTERVAL = 60;

/** Maximum retry attempts per message / Số lần thử lại tối đa */
const MAX_RETRIES = 3;

/** Dead-letter queue name / Hàng đợi thư chết */
const DEAD_LETTER_QUEUE = 'ai.dead_letter';

// ── Globals ─────────────────────────────────────────────────────────────

$running = true;
$lastHeartbeat = time();
$messagesProcessed = 0;
$messagesFailed = 0;

// ── Signal Handling / Xử lý tín hiệu ──────────────────────────────────

if (extension_loaded('pcntl')) {
    pcntl_async_signals(true);

    $shutdownHandler = function (int $signal) use (&$running): void {
        $sigName = $signal === SIGTERM ? 'SIGTERM' : 'SIGINT';
        logWorker("Received {$sigName}, shutting down gracefully... / Nhận {$sigName}, đang dừng an toàn...");
        $running = false;
    };

    pcntl_signal(SIGTERM, $shutdownHandler);
    pcntl_signal(SIGINT, $shutdownHandler);
} else {
    logWorker('WARNING: pcntl extension not loaded, signal handling disabled / Cảnh báo: pcntl không có, không xử lý tín hiệu');
}

// ── PID File / File PID ────────────────────────────────────────────────

function writePidFile(): void
{
    $dir = dirname(PID_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    file_put_contents(PID_FILE, (string)getmypid());
}

function removePidFile(): void
{
    if (is_file(PID_FILE)) {
        @unlink(PID_FILE);
    }
}

/**
 * Check if another worker is already running.
 * Kiểm tra xem worker khác đang chạy không.
 */
function isAlreadyRunning(): bool
{
    if (!is_file(PID_FILE)) {
        return false;
    }
    $pid = (int)file_get_contents(PID_FILE);
    if ($pid <= 0) {
        return false;
    }
    // Check if process exists / Kiểm tra tiến trình tồn tại
    if (function_exists('posix_kill')) {
        return posix_kill($pid, 0);
    }
    return file_exists("/proc/{$pid}");
}

// ── Logging / Ghi log ──────────────────────────────────────────────────

function logWorker(string $message): void
{
    $ts = gmdate('Y-m-d H:i:s');
    $mem = round(memory_get_usage(true) / 1024 / 1024, 1);
    error_log("[AI-Worker {$ts}] [{$mem}MB] {$message}");
}

// ── Message Handlers / Bộ xử lý tin nhắn ──────────────────────────────

/**
 * Route message to appropriate handler based on routing key.
 * Điều phối tin nhắn đến bộ xử lý phù hợp theo routing key.
 *
 * @param array $message Decoded message data
 * @return bool True if processed successfully
 */
function handleMessage(array $message): bool
{
    $routingKey = $message['routing_key'] ?? '';
    $payload = $message['payload'] ?? [];
    $eventId = $message['event_id'] ?? 'unknown';

    logWorker("Processing [{$eventId}] routing_key={$routingKey}");

    // Determine handler by routing key prefix
    // Xác định bộ xử lý theo tiền tố routing key
    if (str_starts_with($routingKey, 'ai.predict')) {
        return handlePrediction($eventId, $payload);
    }

    if (str_starts_with($routingKey, 'ai.analyze')) {
        return handleAnalysis($eventId, $payload);
    }

    if (str_starts_with($routingKey, 'ai.train')) {
        return handleTrainSnapshot($eventId, $payload);
    }

    if (str_starts_with($routingKey, 'ai.feedback')) {
        return handleFeedbackProcess($eventId, $payload);
    }

    logWorker("Unknown routing key: {$routingKey}, skipping / Routing key không xác định, bỏ qua");
    return true; // ACK unknown messages to prevent requeue loop
}

/**
 * Handle AI prediction request.
 * Xử lý yêu cầu dự đoán AI.
 */
function handlePrediction(string $eventId, array $payload): bool
{
    $modelType = $payload['model_type'] ?? 'unknown';
    $target = $payload['target'] ?? '';
    logWorker("Prediction [{$eventId}] model={$modelType} target={$target}");

    // TODO: Implement prediction pipeline (Phase 2)
    // - Load model configuration
    // - Prepare feature vector from payload
    // - Run inference via AI service
    // - Store result in ai_predictions table
    // - Publish ai.prediction.created event

    logWorker("Prediction [{$eventId}] completed / Dự đoán hoàn tất");
    return true;
}

/**
 * Handle AI analysis request.
 * Xử lý yêu cầu phân tích AI.
 */
function handleAnalysis(string $eventId, array $payload): bool
{
    $analysisType = $payload['analysis_type'] ?? 'unknown';
    $scope = $payload['scope'] ?? '';
    logWorker("Analysis [{$eventId}] type={$analysisType} scope={$scope}");

    // TODO: Implement analysis pipeline (Phase 2)
    // - Fetch data from specified scope
    // - Run analysis algorithm
    // - Store results
    // - Publish ai.analysis.completed event

    logWorker("Analysis [{$eventId}] completed / Phân tích hoàn tất");
    return true;
}

/**
 * Handle training data snapshot request.
 * Xử lý yêu cầu chụp dữ liệu huấn luyện.
 */
function handleTrainSnapshot(string $eventId, array $payload): bool
{
    $modelId = $payload['model_id'] ?? 'unknown';
    $dataSource = $payload['data_source'] ?? '';
    logWorker("TrainSnapshot [{$eventId}] model={$modelId} source={$dataSource}");

    // TODO: Implement training snapshot pipeline (Phase 2)
    // - Extract training data from specified source
    // - Validate and clean data
    // - Store snapshot for model training
    // - Publish ai.train.snapshot.stored event

    logWorker("TrainSnapshot [{$eventId}] completed / Chụp huấn luyện hoàn tất");
    return true;
}

/**
 * Handle feedback processing request.
 * Xử lý yêu cầu phản hồi.
 */
function handleFeedbackProcess(string $eventId, array $payload): bool
{
    $predictionId = $payload['prediction_id'] ?? 'unknown';
    $feedbackType = $payload['feedback_type'] ?? '';
    logWorker("Feedback [{$eventId}] prediction={$predictionId} type={$feedbackType}");

    // TODO: Implement feedback pipeline (Phase 2)
    // - Store feedback against prediction
    // - Update model accuracy metrics
    // - Trigger retraining if threshold crossed
    // - Publish ai.feedback.recorded event

    logWorker("Feedback [{$eventId}] completed / Phản hồi hoàn tất");
    return true;
}

// ── Dead-letter Handling / Xử lý thư chết ──────────────────────────────

/**
 * Move a message to the dead-letter queue after exceeding max retries.
 * Chuyển tin nhắn sang hàng đợi thư chết sau khi vượt quá giới hạn thử lại.
 */
function deadLetterMessage(QueueService $queue, array $message, string $reason): void
{
    $eventId = $message['event_id'] ?? 'unknown';
    logWorker("Dead-lettering [{$eventId}]: {$reason} / Chuyển thư chết: {$reason}");

    $message['_dead_letter'] = [
        'reason'      => $reason,
        'worker_pid'  => getmypid(),
        'dead_at'     => gmdate('c'),
    ];

    $queue->publish('ai.dead_letter', $message, QueueService::EXCHANGE_AI);
}

// ── Main Loop / Vòng lặp chính ─────────────────────────────────────────

logWorker('=== AI Worker starting / Khởi động AI Worker ===');

// Check for existing worker / Kiểm tra worker đang chạy
if (isAlreadyRunning()) {
    logWorker('Another AI worker is already running, exiting / Worker khác đang chạy, thoát');
    exit(1);
}

writePidFile();
logWorker('PID file written: ' . PID_FILE . ' (PID: ' . getmypid() . ')');

// Track retry counts per message / Theo dõi số lần thử lại mỗi tin nhắn
$retryCounts = [];

// Initialize QueueService / Khởi tạo QueueService
$dataDir = $baseDir . '/data';
try {
    $queue = new QueueService($dataDir);
    logWorker('QueueService initialized, AMQP=' . ($queue->isAmqpAvailable() ? 'yes' : 'no (file fallback)'));
} catch (\Throwable $e) {
    logWorker('FATAL: Failed to initialize QueueService: ' . $e->getMessage());
    removePidFile();
    exit(2);
}

// Message handler with retry tracking / Bộ xử lý tin nhắn với theo dõi thử lại
$messageHandler = function (array $message) use ($queue, &$retryCounts, &$messagesProcessed, &$messagesFailed, &$running): bool {
    if (!$running) {
        return false; // NACK to requeue during shutdown / Requeue khi đang dừng
    }

    $eventId = $message['event_id'] ?? 'msg-' . bin2hex(random_bytes(4));

    // Check memory before processing / Kiểm tra bộ nhớ trước khi xử lý
    if (memory_get_usage(true) > MEMORY_LIMIT) {
        logWorker('Memory limit approaching, requesting restart / Gần đạt giới hạn bộ nhớ, yêu cầu khởi động lại');
        $running = false;
        return false;
    }

    // Retry tracking / Theo dõi thử lại
    if (!isset($retryCounts[$eventId])) {
        $retryCounts[$eventId] = 0;
    }

    try {
        $result = handleMessage($message);

        if ($result) {
            $messagesProcessed++;
            unset($retryCounts[$eventId]);
            return true;
        }

        // Handler returned false — increment retry / Tăng lần thử
        $retryCounts[$eventId]++;
        if ($retryCounts[$eventId] >= MAX_RETRIES) {
            deadLetterMessage($queue, $message, "Max retries ({$retryCounts[$eventId]}) reached");
            unset($retryCounts[$eventId]);
            $messagesFailed++;
            return true; // ACK to remove from main queue
        }

        logWorker("Retry {$retryCounts[$eventId]}/" . MAX_RETRIES . " for [{$eventId}]");
        return false; // NACK to requeue
    } catch (\Throwable $e) {
        // Error isolation: one failed message does NOT crash the worker
        // Cô lập lỗi: một tin nhắn lỗi KHÔNG làm sập worker
        logWorker("ERROR processing [{$eventId}]: {$e->getMessage()}");

        $retryCounts[$eventId]++;
        if ($retryCounts[$eventId] >= MAX_RETRIES) {
            deadLetterMessage($queue, $message, "Exception after {$retryCounts[$eventId]} retries: {$e->getMessage()}");
            unset($retryCounts[$eventId]);
            $messagesFailed++;
            return true; // ACK to remove from main queue
        }

        return false; // NACK to requeue
    }
};

logWorker('Subscribing to queue: ' . QueueService::QUEUE_AI_INFERENCE);

// If AMQP is available, use blocking consumer with periodic checks
// Nếu AMQP khả dụng, dùng consumer chặn với kiểm tra định kỳ
if ($queue->isAmqpAvailable()) {
    // For AMQP, we use a non-blocking polling approach so we can check
    // signals, heartbeat, and memory between iterations.
    // Với AMQP, dùng polling không chặn để kiểm tra tín hiệu, nhịp tim, bộ nhớ.

    logWorker('Entering AMQP consume loop / Bắt đầu vòng lặp tiêu thụ AMQP');

    // Use consume() in a way that we can break out for signal checks
    // QueueService::consume() is blocking, so we run it with a wrapper
    // that sets $running = false on timeout or signal.

    // Instead of blocking consume, poll with wait() and timeout
    // to allow signal handling between iterations.
    try {
        $queue->consume(QueueService::QUEUE_AI_INFERENCE, function (array $msg) use ($messageHandler, &$running, &$lastHeartbeat): bool {
            // Heartbeat / Nhịp tim
            $now = time();
            if ($now - $lastHeartbeat >= HEARTBEAT_INTERVAL) {
                logWorker(sprintf(
                    'Heartbeat: running=%s mem=%sMB / Nhịp tim',
                    $running ? 'yes' : 'no',
                    round(memory_get_usage(true) / 1024 / 1024, 1)
                ));
                $lastHeartbeat = $now;
            }

            // Memory check / Kiểm tra bộ nhớ
            if (memory_get_usage(true) > MEMORY_LIMIT) {
                logWorker('Memory limit exceeded, stopping / Vượt giới hạn bộ nhớ, dừng');
                $running = false;
                return false;
            }

            if (!$running) {
                return false;
            }

            return $messageHandler($msg);
        }, 1);
    } catch (\Throwable $e) {
        logWorker('AMQP consume error: ' . $e->getMessage());
    }
} else {
    // File-based fallback: poll loop / Chế độ file: vòng lặp poll
    logWorker('Using file-based queue fallback / Dùng hàng đợi file dự phòng');

    while ($running) {
        // Heartbeat / Nhịp tim
        $now = time();
        if ($now - $lastHeartbeat >= HEARTBEAT_INTERVAL) {
            logWorker(sprintf(
                'Heartbeat: processed=%d failed=%d mem=%sMB / Nhịp tim: đã xử lý=%d lỗi=%d',
                $messagesProcessed,
                $messagesFailed,
                round(memory_get_usage(true) / 1024 / 1024, 1),
                $messagesProcessed,
                $messagesFailed
            ));
            $lastHeartbeat = $now;
        }

        // Memory check / Kiểm tra bộ nhớ
        if (memory_get_usage(true) > MEMORY_LIMIT) {
            logWorker('Memory limit exceeded, exiting for restart / Vượt giới hạn bộ nhớ, thoát để khởi động lại');
            break;
        }

        // Process pending messages from file queue
        // Xử lý tin nhắn chờ từ hàng đợi file
        $pending = $queue->getPendingCount(QueueService::QUEUE_AI_INFERENCE);
        if ($pending > 0) {
            logWorker("Found {$pending} pending messages / Tìm thấy {$pending} tin nhắn chờ");
            $queue->consume(QueueService::QUEUE_AI_INFERENCE, $messageHandler);
        }

        // Sleep between polls (1 second) / Nghỉ giữa các lần poll
        if ($running) {
            sleep(1);
        }

        // Dispatch pending signals / Xử lý tín hiệu chờ
        if (extension_loaded('pcntl')) {
            pcntl_signal_dispatch();
        }
    }
}

// ── Shutdown / Dừng ─────────────────────────────────────────────────────

logWorker(sprintf(
    '=== AI Worker shutting down: processed=%d failed=%d / Dừng AI Worker ===',
    $messagesProcessed,
    $messagesFailed
));

$queue->close();
removePidFile();

logWorker('Cleanup complete, exiting / Dọn dẹp xong, thoát');
exit(0);
