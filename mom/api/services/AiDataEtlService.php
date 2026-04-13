<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;

/**
 * AiDataEtlService - Extract, Transform, Load for AI training datasets.
 * Dịch vụ ETL dữ liệu AI — trích xuất, chuyển đổi, tải cho tập dữ liệu huấn luyện.
 *
 * Provides methods to extract feature data from production tables,
 * snapshot it for model training, and track dataset history.
 *
 * Supported model types:
 *   - tool_wear           : Machine telemetry features for tool wear prediction
 *   - quality_prediction   : Quality prediction history with NCR correlation
 *   - scheduling          : Production schedule slot features for optimization
 *
 * @package MOM\Api\Services
 * @since   2.2.0
 */
final class AiDataEtlService
{
    // ── Dependencies ───────────────────────────────────────────────────────
    // Các phụ thuộc

    private Connection $db;
    private string $dataDir;

    /** @var list<string> Valid model types / Loại mô hình hợp lệ */
    private const VALID_MODEL_TYPES = ['tool_wear', 'quality_prediction', 'scheduling'];

    /** Default date range lookback in days / Khoảng thời gian mặc định tính bằng ngày */
    private const DEFAULT_LOOKBACK_DAYS = 90;

    /** @var array<string, list<string>> Feature columns per model type / Cột đặc trưng theo loại mô hình */
    private const MODEL_FEATURES = [
        'tool_wear' => [
            'spindle_load_pct', 'vibration_rms', 'spindle_temperature',
            'power_consumption_kw', 'feed_rate_actual', 'spindle_speed_actual',
        ],
        'quality_prediction' => [
            'prediction_type', 'severity', 'confidence', 'status', 'recent_ncr_count',
        ],
        'scheduling' => [
            'machine_id', 'wo_number', 'slot_date', 'start_time',
            'end_time', 'status', 'duration_hours',
        ],
    ];

    // ── Construction ───────────────────────────────────────────────────────

    /**
     * @param string          $dataDir Absolute path to data directory / Đường dẫn tuyệt đối đến thư mục dữ liệu
     * @param Connection|null $db      Database connection (null = singleton) / Kết nối DB (null = singleton)
     */
    public function __construct(string $dataDir, ?Connection $db = null)
    {
        $this->dataDir = rtrim($dataDir, '/');
        $this->db = $db ?? Connection::getInstance();
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Extract training data for the specified model type.
     * Trích xuất dữ liệu huấn luyện cho loại mô hình chỉ định.
     *
     * Constructs and executes a JOIN query appropriate for the model type,
     * applies date range filtering, and returns a summary with sample rows.
     *
     * @param string $modelType One of: tool_wear, quality_prediction, scheduling
     * @param array  $options   Optional keys: date_from, date_to (Y-m-d strings)
     * @return array{model_type: string, row_count: int, features: list<string>, date_range: array, sample_rows: list<array>}
     * @throws \InvalidArgumentException If modelType is invalid / Nếu loại mô hình không hợp lệ
     */
    public function extractTrainingData(string $modelType, array $options = []): array
    {
        $this->validateModelType($modelType);

        // ── Resolve date range / Xác định khoảng thời gian ──
        $dateTo   = $options['date_to']   ?? date('Y-m-d');
        $dateFrom = $options['date_from'] ?? date('Y-m-d', strtotime('-' . self::DEFAULT_LOOKBACK_DAYS . ' days'));

        // ── Build and execute query / Xây dựng và thực thi truy vấn ──
        $rows = match ($modelType) {
            'tool_wear'           => $this->extractToolWear($dateFrom, $dateTo),
            'quality_prediction'  => $this->extractQualityPrediction($dateFrom, $dateTo),
            'scheduling'          => $this->extractScheduling($dateFrom, $dateTo),
        };

        return [
            'model_type'  => $modelType,
            'row_count'   => count($rows),
            'features'    => self::MODEL_FEATURES[$modelType],
            'date_range'  => ['from' => $dateFrom, 'to' => $dateTo],
            'sample_rows' => array_slice($rows, 0, 5),
        ];
    }

    /**
     * Create a training dataset snapshot for the given model type.
     * Tạo bản chụp tập dữ liệu huấn luyện cho loại mô hình.
     *
     * Extracts data for the last 90 days, stores metadata in the
     * ai_training_datasets table, and returns the dataset record.
     *
     * @param string $modelType One of: tool_wear, quality_prediction, scheduling
     * @return array Dataset metadata record / Bản ghi siêu dữ liệu tập dữ liệu
     * @throws \InvalidArgumentException If modelType is invalid / Nếu loại mô hình không hợp lệ
     * @throws \RuntimeException On database failure / Khi lỗi cơ sở dữ liệu
     */
    public function snapshotForModel(string $modelType): array
    {
        $this->validateModelType($modelType);

        // ── Extract data for last 90 days / Trích xuất dữ liệu 90 ngày gần nhất ──
        $dateTo   = date('Y-m-d');
        $dateFrom = date('Y-m-d', strtotime('-' . self::DEFAULT_LOOKBACK_DAYS . ' days'));

        $extracted = $this->extractTrainingData($modelType, [
            'date_from' => $dateFrom,
            'date_to'   => $dateTo,
        ]);

        // ── Store metadata in ai_training_datasets / Lưu siêu dữ liệu vào ai_training_datasets ──
        $datasetName = "{$modelType}_snapshot_" . date('Ymd');

        try {
            $sql = "INSERT INTO ai_training_datasets
                        (dataset_name, model_type, row_count, feature_columns, date_range_start, date_range_end, status)
                    VALUES
                        (:dataset_name, :model_type, :row_count, :feature_columns, :date_range_start, :date_range_end, 'ready')
                    RETURNING *";

            $rows = $this->db->query($sql, [
                'dataset_name'     => $datasetName,
                'model_type'       => $modelType,
                'row_count'        => $extracted['row_count'],
                'feature_columns'  => json_encode($extracted['features'], JSON_UNESCAPED_UNICODE),
                'date_range_start' => $dateFrom,
                'date_range_end'   => $dateTo,
            ]);

            $record = $rows[0] ?? null;

            if ($record === null) {
                throw new \RuntimeException('INSERT RETURNING returned no rows.');
            }

            // Parse JSONB fields for response / Giải mã JSONB cho response
            if (isset($record['feature_columns']) && is_string($record['feature_columns'])) {
                $record['feature_columns'] = json_decode($record['feature_columns'], true) ?? [];
            }

            return $record;

        } catch (\Throwable $e) {
            @error_log('[AiDataEtlService] snapshotForModel DB error: ' . $e->getMessage());
            throw new \RuntimeException(
                "Failed to create dataset snapshot for {$modelType}. / Không thể tạo bản chụp tập dữ liệu cho {$modelType}. "
                . $e->getMessage()
            );
        }
    }

    /**
     * Get dataset creation history.
     * Lấy lịch sử tạo tập dữ liệu.
     *
     * @param string|null $modelType Filter by model type (null = all) / Lọc theo loại mô hình (null = tất cả)
     * @param int         $limit     Maximum records to return (default: 20) / Số bản ghi tối đa
     * @return list<array> List of dataset metadata records / Danh sách bản ghi siêu dữ liệu
     */
    public function getDatasetHistory(?string $modelType = null, int $limit = 20): array
    {
        try {
            $where  = '';
            $params = [];

            if ($modelType !== null) {
                $this->validateModelType($modelType);
                $where = 'WHERE model_type = :model_type';
                $params['model_type'] = $modelType;
            }

            $sql = "SELECT * FROM ai_training_datasets
                    {$where}
                    ORDER BY created_at DESC
                    LIMIT :limit_val";

            $params['limit_val'] = $limit;

            $rows = $this->db->query($sql, $params);

            // Parse JSONB fields / Giải mã JSONB
            foreach ($rows as &$row) {
                if (isset($row['feature_columns']) && is_string($row['feature_columns'])) {
                    $row['feature_columns'] = json_decode($row['feature_columns'], true) ?? [];
                }
            }
            unset($row);

            return $rows;

        } catch (\InvalidArgumentException $e) {
            throw $e;
        } catch (\Throwable $e) {
            @error_log('[AiDataEtlService] getDatasetHistory error: ' . $e->getMessage());
            return [];
        }
    }

    // ── Private Extraction Methods ─────────────────────────────────────────
    // Các phương thức trích xuất nội bộ

    /**
     * Extract tool wear telemetry features.
     * Trích xuất đặc trưng đo lường mòn dao.
     *
     * @return list<array>
     */
    private function extractToolWear(string $dateFrom, string $dateTo): array
    {
        try {
            return $this->db->query(
                "SELECT
                    mt.machine_id, mt.tool_id, mt.timestamp,
                    mt.spindle_load_pct, mt.spindle_temperature, mt.power_consumption_kw,
                    SQRT(mt.vibration_x^2 + mt.vibration_y^2 + mt.vibration_z^2) AS vibration_rms,
                    mt.feed_rate_actual, mt.spindle_speed_actual
                 FROM machine_telemetry_extended mt
                 WHERE mt.timestamp BETWEEN :date_from AND :date_to
                   AND mt.tool_id IS NOT NULL
                 ORDER BY mt.machine_id, mt.tool_id, mt.timestamp",
                ['date_from' => $dateFrom, 'date_to' => $dateTo]
            );
        } catch (\Throwable $e) {
            @error_log('[AiDataEtlService] extractToolWear error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Extract quality prediction history with NCR correlation.
     * Trích xuất lịch sử dự đoán chất lượng với tương quan NCR.
     *
     * @return list<array>
     */
    private function extractQualityPrediction(string $dateFrom, string $dateTo): array
    {
        try {
            return $this->db->query(
                "SELECT
                    qp.prediction_id, qp.machine_id, qp.prediction_type, qp.severity,
                    qp.confidence_score AS confidence, qp.status, qp.created_at,
                    (SELECT COUNT(*) FROM ncr_records nr
                     WHERE nr.created_at >= qp.created_at - INTERVAL '7 days') AS recent_ncr_count
                 FROM quality_predictions qp
                 WHERE qp.created_at BETWEEN :date_from AND :date_to
                 ORDER BY qp.created_at",
                ['date_from' => $dateFrom, 'date_to' => $dateTo]
            );
        } catch (\Throwable $e) {
            @error_log('[AiDataEtlService] extractQualityPrediction error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Extract production scheduling slot features.
     * Trích xuất đặc trưng slot lịch trình sản xuất.
     *
     * @return list<array>
     */
    private function extractScheduling(string $dateFrom, string $dateTo): array
    {
        try {
            return $this->db->query(
                "SELECT
                    ps.slot_id, ps.machine_id, ps.wo_number, ps.slot_date,
                    ps.start_time, ps.end_time, ps.status,
                    EXTRACT(EPOCH FROM (ps.end_time - ps.start_time))/3600 AS duration_hours
                 FROM production_schedule_slots ps
                 WHERE ps.slot_date BETWEEN :date_from AND :date_to
                 ORDER BY ps.machine_id, ps.start_time",
                ['date_from' => $dateFrom, 'date_to' => $dateTo]
            );
        } catch (\Throwable $e) {
            @error_log('[AiDataEtlService] extractScheduling error: ' . $e->getMessage());
            return [];
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────────
    // Hàm trợ giúp nội bộ

    /**
     * Validate that the model type is supported.
     * Xác thực loại mô hình được hỗ trợ.
     *
     * @throws \InvalidArgumentException If modelType is not valid / Nếu loại mô hình không hợp lệ
     */
    private function validateModelType(string $modelType): void
    {
        if (!in_array($modelType, self::VALID_MODEL_TYPES, true)) {
            throw new \InvalidArgumentException(
                "Invalid model_type '{$modelType}'. Valid: " . implode(', ', self::VALID_MODEL_TYPES)
                . " / Loại mô hình không hợp lệ '{$modelType}'. Hợp lệ: " . implode(', ', self::VALID_MODEL_TYPES)
            );
        }
    }
}
