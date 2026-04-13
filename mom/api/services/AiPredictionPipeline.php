<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;

/**
 * AiPredictionPipeline - Full prediction lifecycle orchestrator.
 * Đường ống dự đoán AI — điều phối toàn bộ vòng đời dự đoán.
 *
 * Lifecycle: creation → storage → action-triggering → feedback → expiry.
 * Vòng đời: tạo → lưu trữ → kích hoạt hành động → phản hồi → hết hạn.
 *
 * Integrations:
 *   - quality_predictions      : Core prediction storage / Lưu trữ dự đoán
 *   - ai_recommendation_actions: Automated action tracking / Theo dõi hành động tự động
 *   - ai_feedback_loops        : Operator feedback collection / Thu thập phản hồi vận hành viên
 *   - EventBus                 : Domain event publishing / Phát sự kiện miền
 *   - EventBroadcaster         : Real-time SSE broadcasting / Phát SSE thời gian thực
 *
 * @package MOM\Api\Services
 * @since   2.2.0
 */
final class AiPredictionPipeline
{
    // ── Dependencies ───────────────────────────────────────────────────────
    // Các phụ thuộc

    private Connection $db;
    private string $dataDir;

    // ── Valid enum values (must match DB enums) ────────────────────────────
    // Giá trị enum hợp lệ (phải khớp với enum trong DB)

    /** @var list<string> Valid prediction types from prediction_type_enum */
    private const VALID_PREDICTION_TYPES = [
        'tool_wear', 'defect_probability', 'spc_anomaly', 'process_drift', 'equipment_failure',
    ];

    /** @var list<string> Valid severity levels from prediction_severity_enum */
    private const VALID_SEVERITIES = [
        'info', 'watch', 'warning', 'critical',
    ];

    /** @var list<string> Valid feedback types */
    private const VALID_FEEDBACK_TYPES = [
        'correct', 'incorrect', 'partially_correct', 'not_applicable',
    ];

    /**
     * Confidence adjustment map per feedback type.
     * Bảng điều chỉnh độ tin cậy theo loại phản hồi.
     *
     * @var array<string, float>
     */
    private const CONFIDENCE_ADJUSTMENTS = [
        'correct'           =>  0.05,
        'incorrect'         => -0.10,
        'partially_correct' =>  0.02,
        'not_applicable'    =>  0.00,
    ];

    /**
     * Action mapping: prediction_type + severity → action_type.
     * Bảng ánh xạ hành động: loại dự đoán + mức độ nghiêm trọng → loại hành động.
     *
     * Format: 'prediction_type:severity' => action_type
     * Fallback entries use 'prediction_type:*' for any severity.
     *
     * @var array<string, string>
     */
    private const ACTION_MAP = [
        // quality anomaly types (defect_probability, process_drift) + critical → auto NCR
        // Bất thường chất lượng + nghiêm trọng → tự động tạo NCR
        'defect_probability:critical' => 'auto_ncr',
        'process_drift:critical'      => 'auto_ncr',

        // equipment_failure + critical or warning → maintenance request
        // Lỗi thiết bị + nghiêm trọng hoặc cảnh báo → yêu cầu bảo trì
        'equipment_failure:critical' => 'maintenance_request',
        'equipment_failure:warning'  => 'maintenance_request',

        // SPC anomaly → alert sent / Bất thường SPC → gửi cảnh báo
        'spc_anomaly:critical' => 'alert_sent',
        'spc_anomaly:warning'  => 'alert_sent',
        'spc_anomaly:watch'    => 'alert_sent',

        // Tool wear + critical → tool change order / Mòn dao + nghiêm trọng → lệnh thay dao
        'tool_wear:critical' => 'tool_change_order',
        'tool_wear:warning'  => 'tool_change_order',
    ];

    // ── Construction ───────────────────────────────────────────────────────

    /**
     * @param string       $dataDir Absolute path to data directory / Đường dẫn tuyệt đối đến thư mục dữ liệu
     * @param Connection|null $db   Database connection (null = singleton) / Kết nối DB (null = singleton)
     */
    public function __construct(string $dataDir, ?Connection $db = null)
    {
        $this->dataDir = rtrim($dataDir, '/');
        $this->db = $db ?? Connection::getInstance();
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Create a new AI prediction record.
     * Tạo bản ghi dự đoán AI mới.
     *
     * Stores the prediction in quality_predictions, emits domain events,
     * and auto-triggers actions for critical severity.
     *
     * @param array $data Prediction data with required keys:
     *   - prediction_type (string): One of prediction_type_enum values
     *   - severity        (string): One of prediction_severity_enum values
     *   - entity_type|machine_id (string): At least one identifier required
     *   Optional keys: confidence_score, item_id, job_number, wo_number,
     *   machine_id, operator_id, characteristic, predicted_value,
     *   threshold_value, current_trend, model_version, recommendation,
     *   recommendation_vi, metadata, expires_at
     *
     * @return array Created prediction record
     * @throws \InvalidArgumentException On validation failure / Khi xác thực thất bại
     */
    public function createPrediction(array $data): array
    {
        // ── Validate required fields / Xác thực các trường bắt buộc ──
        $this->validateRequired($data, ['prediction_type', 'severity']);

        if (empty($data['entity_type']) && empty($data['machine_id'])) {
            throw new \InvalidArgumentException(
                'Either entity_type or machine_id is required. / Cần ít nhất entity_type hoặc machine_id.'
            );
        }

        if (!in_array($data['prediction_type'], self::VALID_PREDICTION_TYPES, true)) {
            throw new \InvalidArgumentException(
                "Invalid prediction_type '{$data['prediction_type']}'. Valid: "
                . implode(', ', self::VALID_PREDICTION_TYPES)
            );
        }

        if (!in_array($data['severity'], self::VALID_SEVERITIES, true)) {
            throw new \InvalidArgumentException(
                "Invalid severity '{$data['severity']}'. Valid: "
                . implode(', ', self::VALID_SEVERITIES)
            );
        }

        // ── Build INSERT columns + params / Xây dựng cột INSERT + tham số ──
        $columns = [
            'prediction_type' => $data['prediction_type'],
            'severity'        => $data['severity'],
            'status'          => $data['status'] ?? 'active',
        ];

        // Optional scalar fields / Các trường tùy chọn
        $optionalFields = [
            'confidence_score', 'item_id', 'job_number', 'wo_number',
            'machine_id', 'operator_id', 'characteristic',
            'predicted_value', 'threshold_value', 'current_trend',
            'data_points_used', 'model_version',
            'recommendation', 'recommendation_vi',
        ];

        foreach ($optionalFields as $field) {
            if (isset($data[$field]) && $data[$field] !== '') {
                $columns[$field] = $data[$field];
            }
        }

        // JSONB metadata / Dữ liệu mở rộng
        if (isset($data['metadata'])) {
            $columns['metadata'] = is_string($data['metadata'])
                ? $data['metadata']
                : json_encode($data['metadata'], JSON_UNESCAPED_UNICODE);
        }

        // Expiry timestamp / Thời điểm hết hạn
        if (isset($data['expires_at']) && $data['expires_at'] !== '') {
            $columns['expires_at'] = $data['expires_at'];
        }

        // ── INSERT with RETURNING to get generated UUID / INSERT với RETURNING để lấy UUID ──
        try {
            $colNames   = implode(', ', array_keys($columns));
            $placeholders = implode(', ', array_map(fn($k) => ':' . $k, array_keys($columns)));

            $sql = "INSERT INTO quality_predictions ({$colNames})
                    VALUES ({$placeholders})
                    RETURNING *";

            $rows = $this->db->query($sql, $columns);
            $record = $rows[0] ?? null;

            if ($record === null) {
                throw new \RuntimeException('INSERT RETURNING returned no rows.');
            }

            // ── Parse JSONB fields for response / Giải mã JSONB cho response ──
            if (isset($record['metadata']) && is_string($record['metadata'])) {
                $record['metadata'] = json_decode($record['metadata'], true) ?? [];
            }

        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] createPrediction DB error: ' . $e->getMessage());
            throw new \RuntimeException(
                'Failed to create prediction. / Không thể tạo dự đoán. ' . $e->getMessage()
            );
        }

        // ── Emit domain event / Phát sự kiện miền ──
        try {
            EventBus::getInstance()->emit(
                DomainEvent::AI_PREDICTION_CREATED,
                'quality_predictions',
                $record['prediction_id'],
                $record
            );
        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] EventBus emit error: ' . $e->getMessage());
        }

        // ── Broadcast via SSE / Phát qua SSE thời gian thực ──
        try {
            EventBroadcaster::getInstance()->aiPredictionUpdated('created', $record);
        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] EventBroadcaster error: ' . $e->getMessage());
        }

        // ── Auto-trigger actions for critical severity / Tự động kích hoạt hành động cho mức nghiêm trọng ──
        if (($record['severity'] ?? '') === 'critical') {
            try {
                $record['_triggered_actions'] = $this->triggerActions($record['prediction_id']);
            } catch (\Throwable $e) {
                @error_log('[AiPredictionPipeline] Auto-trigger actions error: ' . $e->getMessage());
                $record['_triggered_actions'] = [];
            }
        }

        return $record;
    }

    /**
     * Trigger automated actions based on prediction type and severity.
     * Kích hoạt hành động tự động dựa trên loại dự đoán và mức độ nghiêm trọng.
     *
     * Determines the appropriate action from the ACTION_MAP, stores it in
     * ai_recommendation_actions, and emits events + broadcasts.
     *
     * @param string $predictionId UUID of the prediction / UUID của dự đoán
     * @return array List of triggered action records / Danh sách bản ghi hành động đã kích hoạt
     * @throws \RuntimeException If prediction not found / Nếu không tìm thấy dự đoán
     */
    public function triggerActions(string $predictionId): array
    {
        // ── Load prediction from DB / Tải dự đoán từ DB ──
        try {
            $prediction = $this->db->queryOne(
                'SELECT * FROM quality_predictions WHERE prediction_id = :id',
                ['id' => $predictionId]
            );
        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] triggerActions query error: ' . $e->getMessage());
            throw new \RuntimeException(
                "Failed to load prediction {$predictionId}. / Không thể tải dự đoán."
            );
        }

        if ($prediction === null) {
            throw new \RuntimeException(
                "Prediction {$predictionId} not found. / Không tìm thấy dự đoán {$predictionId}."
            );
        }

        $predictionType = $prediction['prediction_type'] ?? '';
        $severity       = $prediction['severity'] ?? '';

        // ── Determine action type from mapping / Xác định loại hành động từ bảng ánh xạ ──
        $actionType = self::ACTION_MAP["{$predictionType}:{$severity}"]
                   ?? self::ACTION_MAP["{$predictionType}:*"]
                   ?? null;

        if ($actionType === null) {
            // No action defined for this combination / Không có hành động cho tổ hợp này
            return [];
        }

        // ── Build action payload / Xây dựng dữ liệu hành động ──
        $actionPayload = [
            'prediction_type'  => $predictionType,
            'severity'         => $severity,
            'machine_id'       => $prediction['machine_id'] ?? null,
            'item_id'          => $prediction['item_id'] ?? null,
            'job_number'       => $prediction['job_number'] ?? null,
            'wo_number'        => $prediction['wo_number'] ?? null,
            'confidence_score' => $prediction['confidence_score'] ?? null,
            'recommendation'   => $prediction['recommendation'] ?? null,
            'triggered_at'     => gmdate('c'),
        ];

        // ── Insert action record / Chèn bản ghi hành động ──
        $triggeredActions = [];

        try {
            $sql = "INSERT INTO ai_recommendation_actions
                        (prediction_id, action_type, action_payload, status)
                    VALUES
                        (:prediction_id, :action_type, :action_payload, 'pending')
                    RETURNING *";

            $rows = $this->db->query($sql, [
                'prediction_id' => $predictionId,
                'action_type'   => $actionType,
                'action_payload' => json_encode($actionPayload, JSON_UNESCAPED_UNICODE),
            ]);

            $actionRecord = $rows[0] ?? null;

            if ($actionRecord !== null) {
                // Parse JSONB fields / Giải mã JSONB
                if (isset($actionRecord['action_payload']) && is_string($actionRecord['action_payload'])) {
                    $actionRecord['action_payload'] = json_decode($actionRecord['action_payload'], true) ?? [];
                }
                if (isset($actionRecord['result']) && is_string($actionRecord['result'])) {
                    $actionRecord['result'] = json_decode($actionRecord['result'], true);
                }

                $triggeredActions[] = $actionRecord;
            }

        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] triggerActions insert error: ' . $e->getMessage());
            throw new \RuntimeException(
                'Failed to store action record. / Không thể lưu bản ghi hành động. ' . $e->getMessage()
            );
        }

        // ── Emit domain event / Phát sự kiện miền ──
        try {
            EventBus::getInstance()->emit(
                DomainEvent::AI_PREDICTION_ACTIONED,
                'ai_recommendation_actions',
                $predictionId,
                [
                    'prediction_id' => $predictionId,
                    'action_type'   => $actionType,
                    'actions'       => $triggeredActions,
                ]
            );
        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] EventBus emit actioned error: ' . $e->getMessage());
        }

        // ── Broadcast via SSE / Phát qua SSE thời gian thực ──
        try {
            EventBroadcaster::getInstance()->aiPredictionUpdated('actioned', [
                'prediction_id' => $predictionId,
                'action_type'   => $actionType,
                'actions'       => $triggeredActions,
            ]);
        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] EventBroadcaster actioned error: ' . $e->getMessage());
        }

        return $triggeredActions;
    }

    /**
     * Record operator/manager feedback on a prediction.
     * Ghi nhận phản hồi của vận hành viên/quản lý về một dự đoán.
     *
     * Stores feedback in ai_feedback_loops, adjusts prediction confidence
     * score, and emits domain events.
     *
     * @param string $predictionId  UUID of the prediction / UUID dự đoán
     * @param string $userId        UUID of the user providing feedback / UUID người phản hồi
     * @param string $feedbackType  One of: correct, incorrect, partially_correct, not_applicable
     * @param array  $details       Optional details: notes, actual_outcome / Chi tiết tùy chọn
     * @return array Created feedback record / Bản ghi phản hồi đã tạo
     * @throws \InvalidArgumentException On invalid feedbackType / Khi loại phản hồi không hợp lệ
     */
    public function recordFeedback(
        string $predictionId,
        string $userId,
        string $feedbackType,
        array $details = []
    ): array {
        // ── Validate feedback type / Xác thực loại phản hồi ──
        if (!in_array($feedbackType, self::VALID_FEEDBACK_TYPES, true)) {
            throw new \InvalidArgumentException(
                "Invalid feedback_type '{$feedbackType}'. Valid: "
                . implode(', ', self::VALID_FEEDBACK_TYPES)
            );
        }

        $confidenceAdjustment = self::CONFIDENCE_ADJUSTMENTS[$feedbackType];

        // ── Insert feedback record / Chèn bản ghi phản hồi ──
        try {
            $params = [
                'prediction_id'         => $predictionId,
                'user_id'               => $userId,
                'feedback_type'         => $feedbackType,
                'confidence_adjustment' => $confidenceAdjustment,
            ];

            $colNames = 'prediction_id, user_id, feedback_type, confidence_adjustment';
            $placeholderStr = ':prediction_id, :user_id, :feedback_type, :confidence_adjustment';

            // Optional: notes / Ghi chú tùy chọn
            if (isset($details['notes']) && $details['notes'] !== '') {
                $colNames .= ', notes';
                $placeholderStr .= ', :notes';
                $params['notes'] = $details['notes'];
            }

            // Optional: actual_outcome (JSONB) / Kết quả thực tế
            if (isset($details['actual_outcome'])) {
                $colNames .= ', actual_outcome';
                $placeholderStr .= ', :actual_outcome';
                $params['actual_outcome'] = is_string($details['actual_outcome'])
                    ? $details['actual_outcome']
                    : json_encode($details['actual_outcome'], JSON_UNESCAPED_UNICODE);
            }

            $sql = "INSERT INTO ai_feedback_loops ({$colNames})
                    VALUES ({$placeholderStr})
                    RETURNING *";

            $rows = $this->db->query($sql, $params);
            $feedbackRecord = $rows[0] ?? null;

            if ($feedbackRecord === null) {
                throw new \RuntimeException('INSERT RETURNING returned no rows for feedback.');
            }

            // Parse JSONB fields / Giải mã JSONB
            if (isset($feedbackRecord['actual_outcome']) && is_string($feedbackRecord['actual_outcome'])) {
                $feedbackRecord['actual_outcome'] = json_decode($feedbackRecord['actual_outcome'], true);
            }

        } catch (\InvalidArgumentException $e) {
            throw $e;
        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] recordFeedback insert error: ' . $e->getMessage());
            throw new \RuntimeException(
                'Failed to store feedback. / Không thể lưu phản hồi. ' . $e->getMessage()
            );
        }

        // ── Update prediction confidence score / Cập nhật điểm tin cậy dự đoán ──
        if ($confidenceAdjustment !== 0.0) {
            try {
                $this->db->execute(
                    "UPDATE quality_predictions
                     SET confidence_score = GREATEST(0, LEAST(100,
                            COALESCE(confidence_score, 50) + :adj
                         ))
                     WHERE prediction_id = :id",
                    [
                        'adj' => $confidenceAdjustment,
                        'id'  => $predictionId,
                    ]
                );
            } catch (\Throwable $e) {
                @error_log('[AiPredictionPipeline] confidence update error: ' . $e->getMessage());
                // Non-fatal — feedback is already stored / Không nghiêm trọng — phản hồi đã được lưu
            }
        }

        // ── Emit domain event / Phát sự kiện miền ──
        try {
            EventBus::getInstance()->emit(
                DomainEvent::AI_FEEDBACK_RECORDED,
                'ai_feedback_loops',
                $predictionId,
                [
                    'prediction_id'         => $predictionId,
                    'user_id'               => $userId,
                    'feedback_type'         => $feedbackType,
                    'confidence_adjustment' => $confidenceAdjustment,
                ]
            );
        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] EventBus feedback emit error: ' . $e->getMessage());
        }

        return $feedbackRecord;
    }

    /**
     * Expire stale predictions older than the given age.
     * Hết hạn các dự đoán cũ hơn số ngày cho phép.
     *
     * Updates status from 'active' to 'expired' for predictions whose
     * created_at is older than $maxAgeDays days ago.
     *
     * @param int $maxAgeDays Maximum age in days (default: 30) / Tuổi tối đa tính bằng ngày
     * @return int Number of expired predictions / Số dự đoán đã hết hạn
     */
    public function expireStale(int $maxAgeDays = 30): int
    {
        try {
            $count = $this->db->execute(
                "UPDATE quality_predictions
                 SET status = 'expired'
                 WHERE status = 'active'
                   AND created_at < NOW() - INTERVAL '1 day' * :days",
                ['days' => $maxAgeDays]
            );

            if ($count > 0) {
                @error_log("[AiPredictionPipeline] Expired {$count} stale predictions older than {$maxAgeDays} days.");
            }

            return $count;

        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] expireStale error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get aggregated dashboard metrics for AI predictions.
     * Lấy chỉ số tổng hợp cho bảng điều khiển dự đoán AI.
     *
     * Returns:
     *   - total_active      : Count of active predictions / Số dự đoán đang hoạt động
     *   - total_critical    : Count of active + critical / Số dự đoán nghiêm trọng đang hoạt động
     *   - accuracy_pct      : Correct feedback / total feedback * 100 / Phần trăm chính xác
     *   - mean_time_to_action: Avg seconds from prediction to first action / Thời gian TB từ dự đoán đến hành động
     *   - by_type           : Counts grouped by prediction_type / Số lượng theo loại dự đoán
     *   - by_severity       : Counts grouped by severity / Số lượng theo mức độ nghiêm trọng
     *
     * @return array Dashboard metrics / Chỉ số bảng điều khiển
     */
    public function getDashboardMetrics(): array
    {
        $metrics = [
            'total_active'         => 0,
            'total_critical'       => 0,
            'accuracy_pct'         => 0.0,
            'mean_time_to_action'  => 0.0,
            'by_type'              => [],
            'by_severity'          => [],
        ];

        try {
            // ── Total active predictions / Tổng số dự đoán đang hoạt động ──
            $metrics['total_active'] = (int)($this->db->queryScalar(
                "SELECT COUNT(*) FROM quality_predictions WHERE status = 'active'"
            ) ?? 0);

            // ── Total critical + active / Tổng số nghiêm trọng + đang hoạt động ──
            $metrics['total_critical'] = (int)($this->db->queryScalar(
                "SELECT COUNT(*) FROM quality_predictions
                 WHERE status = 'active' AND severity = 'critical'"
            ) ?? 0);

            // ── Accuracy from feedback / Độ chính xác từ phản hồi ──
            $feedbackStats = $this->db->queryOne(
                "SELECT
                    COUNT(*) AS total_feedback,
                    COUNT(*) FILTER (WHERE feedback_type = 'correct') AS correct_count
                 FROM ai_feedback_loops"
            );

            if ($feedbackStats !== null && (int)$feedbackStats['total_feedback'] > 0) {
                $metrics['accuracy_pct'] = round(
                    ((int)$feedbackStats['correct_count'] / (int)$feedbackStats['total_feedback']) * 100,
                    2
                );
            }

            // ── Mean time to action (seconds) / Thời gian TB đến hành động (giây) ──
            $mtta = $this->db->queryScalar(
                "SELECT EXTRACT(EPOCH FROM AVG(a.created_at - p.created_at))
                 FROM ai_recommendation_actions a
                 JOIN quality_predictions p ON p.prediction_id = a.prediction_id"
            );
            $metrics['mean_time_to_action'] = $mtta !== null ? round((float)$mtta, 2) : 0.0;

            // ── Counts by prediction type / Số lượng theo loại dự đoán ──
            $byType = $this->db->query(
                "SELECT prediction_type, COUNT(*) AS cnt
                 FROM quality_predictions
                 WHERE status = 'active'
                 GROUP BY prediction_type
                 ORDER BY cnt DESC"
            );
            foreach ($byType as $row) {
                $metrics['by_type'][$row['prediction_type']] = (int)$row['cnt'];
            }

            // ── Counts by severity / Số lượng theo mức độ nghiêm trọng ──
            $bySeverity = $this->db->query(
                "SELECT severity, COUNT(*) AS cnt
                 FROM quality_predictions
                 WHERE status = 'active'
                 GROUP BY severity
                 ORDER BY cnt DESC"
            );
            foreach ($bySeverity as $row) {
                $metrics['by_severity'][$row['severity']] = (int)$row['cnt'];
            }

        } catch (\Throwable $e) {
            @error_log('[AiPredictionPipeline] getDashboardMetrics error: ' . $e->getMessage());
            // Return partial metrics — whatever we managed to collect
            // Trả về chỉ số phần — bất kỳ gì đã thu thập được
        }

        return $metrics;
    }

    // ── Private Helpers ────────────────────────────────────────────────────
    // Hàm trợ giúp nội bộ

    /**
     * Validate that required keys are present and non-empty in the data array.
     * Xác thực rằng các khóa bắt buộc có mặt và không rỗng trong mảng dữ liệu.
     *
     * @param array        $data     Input data / Dữ liệu đầu vào
     * @param list<string> $required Required key names / Tên khóa bắt buộc
     * @throws \InvalidArgumentException If any required field is missing / Nếu thiếu trường bắt buộc
     */
    private function validateRequired(array $data, array $required): void
    {
        $missing = [];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $missing[] = $field;
            }
        }

        if (!empty($missing)) {
            throw new \InvalidArgumentException(
                'Missing required fields: ' . implode(', ', $missing)
                . ' / Thiếu các trường bắt buộc: ' . implode(', ', $missing)
            );
        }
    }
}
