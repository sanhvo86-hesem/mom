<?php

declare(strict_types=1);

namespace MOM\Services;

use InvalidArgumentException;
use MOM\Database\Connection;
use RuntimeException;

// ── Value Objects ────────────────────────────────────────────────────────────

/**
 * Immutable date range for KPI period queries.
 */
final readonly class DateRange
{
    public string $start;
    public string $end;

    /**
     * @param string $start ISO date (YYYY-MM-DD).
     * @param string $end   ISO date (YYYY-MM-DD).
     */
    public function __construct(string $start, string $end)
    {
        $this->start = $start;
        $this->end   = $end;
    }

    /** Number of calendar days in the range (inclusive). */
    public function days(): int
    {
        return max(1, (int) round(
            (strtotime($this->end) - strtotime($this->start)) / 86400
        ) + 1);
    }

    /** Build from "last N days" shorthand. */
    public static function lastDays(int $days): self
    {
        return new self(
            date('Y-m-d', strtotime("-{$days} days")),
            date('Y-m-d'),
        );
    }

    /** @return array{start: string, end: string} */
    public function toArray(): array
    {
        return ['start' => $this->start, 'end' => $this->end];
    }
}

/**
 * Traffic-light status for a KPI value vs target.
 */
enum KpiStatus: string
{
    case GREEN  = 'green';
    case YELLOW = 'yellow';
    case RED    = 'red';
    case GREY   = 'grey';
}

/**
 * Result of a single KPI calculation.
 */
final readonly class KpiResult
{
    /**
     * @param string    $metricCode  Metric code (e.g. "OEE", "OTD").
     * @param float     $value       Calculated value.
     * @param string    $unit        Display unit ("%" | "ppm" | "$" | "ratio" | "count").
     * @param float     $target      Target value.
     * @param KpiStatus $status      Traffic-light status.
     * @param array     $breakdown   Calculation breakdown / sub-components.
     * @param string    $periodStart Period start date.
     * @param string    $periodEnd   Period end date.
     * @param string    $calculatedAt ISO timestamp of calculation.
     */
    public function __construct(
        public string    $metricCode,
        public float     $value,
        public string    $unit,
        public float     $target,
        public KpiStatus $status,
        public array     $breakdown,
        public string    $periodStart,
        public string    $periodEnd,
        public string    $calculatedAt,
    ) {}

    /** @return array Serializable representation. */
    public function toArray(): array
    {
        return [
            'metric_code'   => $this->metricCode,
            'value'         => round($this->value, 4),
            'unit'          => $this->unit,
            'target'        => round($this->target, 4),
            'status'        => $this->status->value,
            'breakdown'     => $this->breakdown,
            'period_start'  => $this->periodStart,
            'period_end'    => $this->periodEnd,
            'calculated_at' => $this->calculatedAt,
        ];
    }
}

/**
 * Aggregated dashboard data payload.
 */
final readonly class DashboardData
{
    /**
     * @param array  $kpis       Associative array of metric_code => KpiResult.
     * @param array  $alerts     KPIs currently below threshold.
     * @param array  $trends     Trend sparkline data per KPI.
     * @param string $department Department filter applied.
     * @param array  $period     Period range.
     */
    public function __construct(
        public array  $kpis,
        public array  $alerts,
        public array  $trends,
        public string $department,
        public array  $period,
    ) {}

    /** @return array */
    public function toArray(): array
    {
        $kpiArrays = [];
        foreach ($this->kpis as $code => $kpi) {
            $kpiArrays[$code] = $kpi instanceof KpiResult ? $kpi->toArray() : $kpi;
        }
        return [
            'kpis'       => $kpiArrays,
            'alerts'     => $this->alerts,
            'trends'     => $this->trends,
            'department' => $this->department,
            'period'     => $this->period,
        ];
    }
}

// ── KPI Engine ──────────────────────────────────────────────────────────────

/**
 * KPI calculation engine for CNC precision machining operations.
 *
 * Computes manufacturing KPIs from PostgreSQL data (job_orders,
 * inspection_results, ncr_records, capa_records, calibration_records,
 * training_records, equipment, shipments, vendor_ratings, etc.)
 * and persists periodic snapshots to kpi_snapshots.
 *
 * All formulas follow industry-standard definitions aligned with
 * HESEM's QMS quality manual.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class KpiEngine
{
    private const KPI_AUTHORITY_REGISTRY_PATH = __DIR__ . '/../../data/registry/kpi-authority-registry.json';

    /** Metric codes for all supported KPIs. */
    public const METRIC_OEE                  = 'OEE';
    public const METRIC_OTD                  = 'OTD';
    public const METRIC_DPMO                 = 'DPMO';
    public const METRIC_COPQ                 = 'COPQ';
    public const METRIC_FPY                  = 'FPY';
    public const METRIC_SCRAP_RATE           = 'SCRAP_RATE';
    public const METRIC_REWORK_RATE          = 'REWORK_RATE';
    public const METRIC_MACHINE_UTILIZATION  = 'MACHINE_UTIL';
    public const METRIC_SETUP_TIME_RATIO     = 'SETUP_RATIO';
    public const METRIC_NCR_RATE             = 'NCR_RATE';
    public const METRIC_CAPA_CLOSURE         = 'CAPA_CLOSURE';
    public const METRIC_CAL_COMPLIANCE       = 'CAL_COMPLIANCE';
    public const METRIC_TRAINING_COMPLETION  = 'TRAINING_COMP';
    public const METRIC_SUPPLIER_OTD         = 'SUPPLIER_OTD';
    public const METRIC_SUPPLIER_QUALITY     = 'SUPPLIER_QUAL';
    public const METRIC_COMPLAINT_RATE       = 'COMPLAINT_RATE';
    public const METRIC_INVENTORY_TURNS      = 'INV_TURNS';
    public const METRIC_LABOR_EFFICIENCY     = 'LABOR_EFF';
    public const METRIC_PUT_THRU_INDEX       = 'PUT_THRU';

    /** All metric codes in calculation order. */
    public const ALL_METRICS = [
        self::METRIC_OEE,
        self::METRIC_OTD,
        self::METRIC_DPMO,
        self::METRIC_COPQ,
        self::METRIC_FPY,
        self::METRIC_SCRAP_RATE,
        self::METRIC_REWORK_RATE,
        self::METRIC_MACHINE_UTILIZATION,
        self::METRIC_SETUP_TIME_RATIO,
        self::METRIC_NCR_RATE,
        self::METRIC_CAPA_CLOSURE,
        self::METRIC_CAL_COMPLIANCE,
        self::METRIC_TRAINING_COMPLETION,
        self::METRIC_SUPPLIER_OTD,
        self::METRIC_SUPPLIER_QUALITY,
        self::METRIC_COMPLAINT_RATE,
        self::METRIC_INVENTORY_TURNS,
        self::METRIC_LABOR_EFFICIENCY,
        self::METRIC_PUT_THRU_INDEX,
    ];

    /** Default target values per metric. */
    private const DEFAULT_TARGETS = [
        self::METRIC_OEE                 => 85.0,
        self::METRIC_OTD                 => 95.0,
        self::METRIC_DPMO                => 3400.0,   // ≤ 3400 = 4-sigma
        self::METRIC_COPQ                => 0.0,      // minimise ($ amount)
        self::METRIC_FPY                 => 95.0,
        self::METRIC_SCRAP_RATE          => 2.0,      // ≤ 2%
        self::METRIC_REWORK_RATE         => 3.0,      // ≤ 3%
        self::METRIC_MACHINE_UTILIZATION => 80.0,
        self::METRIC_SETUP_TIME_RATIO    => 10.0,     // ≤ 10%
        self::METRIC_NCR_RATE            => 5.0,      // ≤ 5%
        self::METRIC_CAPA_CLOSURE        => 90.0,
        self::METRIC_CAL_COMPLIANCE      => 100.0,
        self::METRIC_TRAINING_COMPLETION => 95.0,
        self::METRIC_SUPPLIER_OTD        => 90.0,
        self::METRIC_SUPPLIER_QUALITY    => 98.0,
        self::METRIC_COMPLAINT_RATE      => 100.0,    // ≤ 100 PPM
        self::METRIC_INVENTORY_TURNS     => 6.0,
        self::METRIC_LABOR_EFFICIENCY    => 85.0,
        self::METRIC_PUT_THRU_INDEX      => 0.0,      // revenue / labor-hr
    ];

    /** Units per metric. */
    private const UNITS = [
        self::METRIC_OEE                 => '%',
        self::METRIC_OTD                 => '%',
        self::METRIC_DPMO                => 'ppm',
        self::METRIC_COPQ                => '$',
        self::METRIC_FPY                 => '%',
        self::METRIC_SCRAP_RATE          => '%',
        self::METRIC_REWORK_RATE         => '%',
        self::METRIC_MACHINE_UTILIZATION => '%',
        self::METRIC_SETUP_TIME_RATIO    => '%',
        self::METRIC_NCR_RATE            => '%',
        self::METRIC_CAPA_CLOSURE        => '%',
        self::METRIC_CAL_COMPLIANCE      => '%',
        self::METRIC_TRAINING_COMPLETION => '%',
        self::METRIC_SUPPLIER_OTD        => '%',
        self::METRIC_SUPPLIER_QUALITY    => '%',
        self::METRIC_COMPLAINT_RATE      => 'ppm',
        self::METRIC_INVENTORY_TURNS     => 'turns',
        self::METRIC_LABOR_EFFICIENCY    => '%',
        self::METRIC_PUT_THRU_INDEX      => '$/hr',
    ];

    /** Metrics where lower is better (invert RAG logic). */
    private const LOWER_IS_BETTER = [
        self::METRIC_DPMO,
        self::METRIC_COPQ,
        self::METRIC_SCRAP_RATE,
        self::METRIC_REWORK_RATE,
        self::METRIC_SETUP_TIME_RATIO,
        self::METRIC_NCR_RATE,
        self::METRIC_COMPLAINT_RATE,
    ];

    private Connection $db;
    private ?array $kpiAuthorityRegistry = null;

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(?Connection $db = null)
    {
        $this->db = $db ?? Connection::getInstance();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Calculate a single KPI for the given period.
     *
     * @param string    $metricCode Metric code constant.
     * @param DateRange $period     Calculation period.
     * @param array     $filters    Optional filters (dept_code, machine_id, customer_id, etc.).
     * @return KpiResult
     */
    public function calculateKpi(string $metricCode, DateRange $period, array $filters = []): KpiResult
    {
        $metricCode = $this->normalizeMetricCode($metricCode);
        $calculator = $this->getCalculator($metricCode);
        $breakdown  = $calculator($period, $filters);

        $value  = (float) ($breakdown['value'] ?? 0.0);
        $target = $this->getKpiTarget($metricCode);
        $unit   = self::UNITS[$metricCode] ?? '%';
        $status = $this->evaluateStatus($metricCode, $value, $target);

        return new KpiResult(
            metricCode:   $metricCode,
            value:        $value,
            unit:         $unit,
            target:       $target,
            status:       $status,
            breakdown:    $breakdown,
            periodStart:  $period->start,
            periodEnd:    $period->end,
            calculatedAt: gmdate('c'),
        );
    }

    /**
     * Calculate all KPIs for a period, optionally filtered by department.
     *
     * @param DateRange    $period     Calculation period.
     * @param string|null  $department Department code filter.
     * @return array<string, KpiResult>
     */
    public function calculateAllKpis(DateRange $period, ?string $department = null): array
    {
        $filters = $department !== null ? ['dept_code' => $department] : [];
        $results = [];
        foreach (self::ALL_METRICS as $code) {
            try {
                $results[$code] = $this->calculateKpi($code, $period, $filters);
            } catch (\Throwable) {
                // Skip KPIs that fail (missing data, etc.)
                $results[$code] = $this->emptyResult($code, $period);
            }
        }
        return $results;
    }

    /**
     * Get KPI trend data for charting (time-series).
     *
     * @param string    $metricCode  Metric code.
     * @param DateRange $period      Overall period.
     * @param string    $granularity 'daily' | 'weekly' | 'monthly'.
     * @return array<int, array{date: string, value: float}>
     */
    public function getKpiTrend(string $metricCode, DateRange $period, string $granularity = 'daily'): array
    {
        $metricCode = $this->normalizeMetricCode($metricCode);

        // Try stored snapshots first
        $stored = $this->loadTrendFromSnapshots($metricCode, $period, $granularity);
        if (!empty($stored)) {
            return $stored;
        }

        // Fall back to live calculation per sub-period
        $intervals = $this->splitPeriod($period, $granularity);
        $trend = [];
        foreach ($intervals as $sub) {
            try {
                $result = $this->calculateKpi($metricCode, $sub);
                $trend[] = [
                    'date'   => $sub->start,
                    'value'  => round($result->value, 4),
                    'target' => round($result->target, 4),
                    'status' => $result->status->value,
                ];
            } catch (\Throwable) {
                $trend[] = [
                    'date'   => $sub->start,
                    'value'  => null,
                    'target' => $this->getKpiTarget($metricCode),
                    'status' => KpiStatus::GREY->value,
                ];
            }
        }
        return $trend;
    }

    /**
     * Get the target value for a KPI (from kpi_definitions or defaults).
     *
     * @param string $metricCode Metric code.
     * @return float
     */
    public function getKpiTarget(string $metricCode): float
    {
        $metricCode = $this->normalizeMetricCode($metricCode);
        try {
            $row = $this->db->queryOne(
                'SELECT target FROM kpi_definitions WHERE metric_code = :code AND is_active = TRUE',
                [':code' => $metricCode],
            );
            if ($row !== null && $row['target'] !== null) {
                return (float) $row['target'];
            }
        } catch (\Throwable) {
            // DB not available, use defaults
        }
        return self::DEFAULT_TARGETS[$metricCode] ?? 0.0;
    }

    /**
     * Persist a KPI calculation result as a snapshot.
     *
     * @param string    $metricCode Metric code.
     * @param KpiResult $result     Calculated result.
     */
    public function saveSnapshot(string $metricCode, KpiResult $result): void
    {
        $metricCode = $this->normalizeMetricCode($metricCode);

        $kpiId = $this->db->queryScalar(
            'SELECT kpi_id FROM kpi_definitions WHERE metric_code = :code',
            [':code' => $metricCode],
        );

        if ($kpiId === null) {
            // Auto-register KPI definition if missing
            $kpiId = $this->registerKpiDefinition($metricCode);
        }

        $statusEnum = match ($result->status) {
            KpiStatus::GREEN  => 'green',
            KpiStatus::YELLOW => 'yellow',
            KpiStatus::RED    => 'red',
            default           => 'grey',
        };

        $this->db->execute(
            'INSERT INTO kpi_snapshots
                (kpi_id, period_start, period_end, actual_value, target_value, kpi_status, metadata)
             VALUES
                (:kpi_id, :ps, :pe, :av, :tv, :status::kpi_status_enum, :meta::jsonb)
             ON CONFLICT DO NOTHING',
            [
                ':kpi_id' => $kpiId,
                ':ps'     => $result->periodStart,
                ':pe'     => $result->periodEnd,
                ':av'     => $result->value,
                ':tv'     => $result->target,
                ':status' => $statusEnum,
                ':meta'   => json_encode($result->breakdown, JSON_UNESCAPED_UNICODE),
            ],
        );
    }

    /**
     * Build aggregated dashboard data for a department and period.
     *
     * @param DateRange $period     Reporting period.
     * @param string    $department Department code ('ALL' for company-wide).
     * @return DashboardData
     */
    public function getDashboardData(DateRange $period, string $department = 'ALL'): DashboardData
    {
        $dept = strtoupper(trim($department));
        $deptFilter = $dept !== 'ALL' ? $dept : null;

        $kpis   = $this->calculateAllKpis($period, $deptFilter);
        $alerts = $this->getKpiAlerts();

        // Build mini-trend (last 12 data points) for top KPIs
        $topKpis = [self::METRIC_OEE, self::METRIC_OTD, self::METRIC_FPY, self::METRIC_SCRAP_RATE];
        $trends = [];
        foreach ($topKpis as $code) {
            $trends[$code] = $this->getKpiTrend($code, $period, 'weekly');
        }

        return new DashboardData(
            kpis:       $kpis,
            alerts:     $alerts,
            trends:     $trends,
            department: $dept,
            period:     $period->toArray(),
        );
    }

    /**
     * Get all KPIs currently below their target threshold (alerts).
     *
     * @return array<int, array{metric_code: string, value: float, target: float, status: string, gap: float}>
     */
    public function getKpiAlerts(): array
    {
        $alerts = [];

        try {
            $rows = $this->db->query(
                'SELECT ks.actual_value, ks.target_value, ks.kpi_status,
                        kd.metric_code, kd.kpi_name, kd.threshold_yellow
                 FROM kpi_snapshots ks
                 JOIN kpi_definitions kd ON kd.kpi_id = ks.kpi_id
                 WHERE kd.is_active = TRUE
                   AND ks.kpi_status IN (\'red\', \'yellow\')
                   AND ks.recorded_at >= (now() - INTERVAL \'30 days\')
                 ORDER BY ks.recorded_at DESC',
            );

            $seen = [];
            foreach ($rows as $row) {
                $code = (string)$row['metric_code'];
                if (isset($seen[$code])) {
                    continue; // only latest per metric
                }
                $seen[$code] = true;

                $actual = (float) $row['actual_value'];
                $target = (float) $row['target_value'];
                $gap    = $target !== 0.0 ? round(($actual - $target) / $target * 100, 2) : 0.0;

                $alerts[] = [
                    'metric_code' => $code,
                    'kpi_name'    => (string)$row['kpi_name'],
                    'value'       => round($actual, 4),
                    'target'      => round($target, 4),
                    'status'      => (string)$row['kpi_status'],
                    'gap'         => $gap,
                    'gap_pct'     => $gap,
                ];
            }
        } catch (\Throwable) {
            // No DB access or table not yet populated
        }

        return $alerts;
    }

    // ── Individual KPI Calculators ──────────────────────────────────────────

    /**
     * OEE = Availability x Performance x Quality
     */
    private function calcOee(DateRange $period, array $filters): array
    {
        $where = $this->buildEquipmentWhereClause($filters);

        // Availability: (Planned - Downtime) / Planned
        $availRow = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(planned_hours), 0) AS planned,
                COALESCE(SUM(downtime_hours), 0) AS downtime,
                COALESCE(SUM(run_hours), 0) AS run_time
             FROM equipment_logs
             WHERE log_date BETWEEN :s AND :e {$where}",
            [':s' => $period->start, ':e' => $period->end],
        );

        $planned  = (float) ($availRow['planned'] ?? 0);
        $downtime = (float) ($availRow['downtime'] ?? 0);
        $runTime  = (float) ($availRow['run_time'] ?? 0);

        $availability = $planned > 0 ? (($planned - $downtime) / $planned) * 100 : 0;

        // Performance: (Ideal Cycle Time x Total Count) / Run Time
        $perfRow = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(jo.completed_qty + jo.scrapped_qty + jo.rework_qty), 0) AS total_count,
                COALESCE(SUM(jo.completed_qty * COALESCE(i.standard_cycle_time, 0)), 0) AS ideal_time
             FROM job_orders jo
             LEFT JOIN items i ON i.item_id = jo.item_id
             WHERE jo.start_date_actual BETWEEN :s AND :e
               AND jo.job_status IN ('released', 'active', 'completed', 'closed')",
            [':s' => $period->start, ':e' => $period->end],
        );

        $idealTime = (float) ($perfRow['ideal_time'] ?? 0);
        $performance = $runTime > 0 ? ($idealTime / $runTime) * 100 : 0;

        // Quality: Good Count / Total Count
        $qualRow = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(completed_qty), 0) AS good,
                COALESCE(SUM(completed_qty + scrapped_qty + rework_qty), 0) AS total
             FROM job_orders
             WHERE start_date_actual BETWEEN :s AND :e
               AND job_status IN ('released', 'active', 'completed', 'closed')",
            [':s' => $period->start, ':e' => $period->end],
        );

        $goodCount  = (float) ($qualRow['good'] ?? 0);
        $totalCount = (float) ($qualRow['total'] ?? 0);
        $quality    = $totalCount > 0 ? ($goodCount / $totalCount) * 100 : 0;

        $oee = ($availability / 100) * ($performance / 100) * ($quality / 100) * 100;

        return [
            'value'        => round($oee, 2),
            'availability' => round($availability, 2),
            'performance'  => round($performance, 2),
            'quality'      => round($quality, 2),
            'planned_hrs'  => round($planned, 2),
            'downtime_hrs' => round($downtime, 2),
            'run_time_hrs' => round($runTime, 2),
            'good_count'   => $goodCount,
            'total_count'  => $totalCount,
        ];
    }

    /**
     * OTD = Orders Shipped On/Before Promise Date / Total Orders Shipped x 100
     */
    private function calcOtd(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) FILTER (WHERE s.delivery_date_actual <= s.delivery_date_est) AS on_time,
                COUNT(*) AS total
             FROM shipments s
             WHERE s.ship_date BETWEEN :s AND :e
               AND s.shipment_status = 'delivered'",
            [':s' => $period->start, ':e' => $period->end],
        );

        $onTime = (int) ($row['on_time'] ?? 0);
        $total  = (int) ($row['total'] ?? 0);
        $pct    = $total > 0 ? ($onTime / $total) * 100 : 0;

        return ['value' => round($pct, 2), 'on_time' => $onTime, 'total' => $total];
    }

    /**
     * DPMO = (Defects / (Units x Opportunities)) x 1,000,000
     */
    private function calcDpmo(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(ir.defects_found), 0) AS defects,
                COALESCE(SUM(ir.sample_size), 0) AS units,
                COUNT(DISTINCT ir.characteristic) AS opportunities
             FROM inspection_results ir
             WHERE ir.recorded_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
            [':s' => $period->start, ':e' => $period->end],
        );

        $defects       = (int) ($row['defects'] ?? 0);
        $units         = (int) ($row['units'] ?? 0);
        $opportunities = max(1, (int) ($row['opportunities'] ?? 1));
        $denominator   = $units * $opportunities;
        $dpmo          = $denominator > 0 ? ($defects / $denominator) * 1_000_000 : 0;

        return [
            'value'         => round($dpmo, 0),
            'defects'       => $defects,
            'units'         => $units,
            'opportunities' => $opportunities,
        ];
    }

    /**
     * COPQ = Internal Failure + External Failure + Appraisal + Prevention costs.
     */
    private function calcCopq(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(CASE WHEN (metadata->>'cost_category') = 'internal_failure'
                    THEN (metadata->>'cost_amount')::numeric ELSE 0 END), 0) AS internal,
                COALESCE(SUM(CASE WHEN (metadata->>'cost_category') = 'external_failure'
                    THEN (metadata->>'cost_amount')::numeric ELSE 0 END), 0) AS external,
                COALESCE(SUM(CASE WHEN (metadata->>'cost_category') = 'appraisal'
                    THEN (metadata->>'cost_amount')::numeric ELSE 0 END), 0) AS appraisal,
                COALESCE(SUM(CASE WHEN (metadata->>'cost_category') = 'prevention'
                    THEN (metadata->>'cost_amount')::numeric ELSE 0 END), 0) AS prevention
             FROM ncr_records nr
             JOIN records r ON r.record_id = nr.record_id
             WHERE r.created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
            [':s' => $period->start, ':e' => $period->end],
        );

        $internal   = (float) ($row['internal'] ?? 0);
        $external   = (float) ($row['external'] ?? 0);
        $appraisal  = (float) ($row['appraisal'] ?? 0);
        $prevention = (float) ($row['prevention'] ?? 0);
        $total      = $internal + $external + $appraisal + $prevention;

        return [
            'value'      => round($total, 2),
            'internal'   => round($internal, 2),
            'external'   => round($external, 2),
            'appraisal'  => round($appraisal, 2),
            'prevention' => round($prevention, 2),
        ];
    }

    /**
     * FPY = Units Passing First Inspection / Total Units Inspected x 100
     */
    private function calcFpy(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) FILTER (WHERE pass_fail = 'PASS') AS pass_count,
                COUNT(*) AS total
             FROM inspection_results
             WHERE recorded_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
               AND (metadata->>'inspection_stage') IS DISTINCT FROM 'reinspection'",
            [':s' => $period->start, ':e' => $period->end],
        );

        $pass  = (int) ($row['pass_count'] ?? 0);
        $total = (int) ($row['total'] ?? 0);
        $pct   = $total > 0 ? ($pass / $total) * 100 : 0;

        return ['value' => round($pct, 2), 'pass' => $pass, 'total' => $total];
    }

    /**
     * Scrap Rate = Scrapped Units / Total Units Produced x 100
     */
    private function calcScrapRate(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(scrapped_qty), 0) AS scrapped,
                COALESCE(SUM(completed_qty + scrapped_qty + rework_qty), 0) AS total
             FROM job_orders
             WHERE start_date_actual BETWEEN :s AND :e
               AND job_status IN ('completed', 'closed')",
            [':s' => $period->start, ':e' => $period->end],
        );

        $scrapped = (float) ($row['scrapped'] ?? 0);
        $total    = (float) ($row['total'] ?? 0);
        $pct      = $total > 0 ? ($scrapped / $total) * 100 : 0;

        return ['value' => round($pct, 2), 'scrapped' => $scrapped, 'total' => $total];
    }

    /**
     * Rework Rate = Reworked Units / Total Units Produced x 100
     */
    private function calcReworkRate(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(rework_qty), 0) AS reworked,
                COALESCE(SUM(completed_qty + scrapped_qty + rework_qty), 0) AS total
             FROM job_orders
             WHERE start_date_actual BETWEEN :s AND :e
               AND job_status IN ('completed', 'closed')",
            [':s' => $period->start, ':e' => $period->end],
        );

        $reworked = (float) ($row['reworked'] ?? 0);
        $total    = (float) ($row['total'] ?? 0);
        $pct      = $total > 0 ? ($reworked / $total) * 100 : 0;

        return ['value' => round($pct, 2), 'reworked' => $reworked, 'total' => $total];
    }

    /**
     * Machine Utilization = Actual Machine Hours / Available Machine Hours x 100
     */
    private function calcMachineUtil(DateRange $period, array $filters): array
    {
        $where = $this->buildEquipmentWhereClause($filters);

        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(run_hours), 0) AS actual,
                COALESCE(SUM(planned_hours), 0) AS available
             FROM equipment_logs
             WHERE log_date BETWEEN :s AND :e {$where}",
            [':s' => $period->start, ':e' => $period->end],
        );

        $actual    = (float) ($row['actual'] ?? 0);
        $available = (float) ($row['available'] ?? 0);
        $pct       = $available > 0 ? ($actual / $available) * 100 : 0;

        return ['value' => round($pct, 2), 'actual_hrs' => round($actual, 2), 'available_hrs' => round($available, 2)];
    }

    /**
     * Setup Time Ratio = Total Setup Time / Total Available Time x 100
     */
    private function calcSetupRatio(DateRange $period, array $filters): array
    {
        $where = $this->buildEquipmentWhereClause($filters);

        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(setup_hours), 0) AS setup,
                COALESCE(SUM(planned_hours), 0) AS available
             FROM equipment_logs
             WHERE log_date BETWEEN :s AND :e {$where}",
            [':s' => $period->start, ':e' => $period->end],
        );

        $setup     = (float) ($row['setup'] ?? 0);
        $available = (float) ($row['available'] ?? 0);
        $pct       = $available > 0 ? ($setup / $available) * 100 : 0;

        return ['value' => round($pct, 2), 'setup_hrs' => round($setup, 2), 'available_hrs' => round($available, 2)];
    }

    /**
     * NCR Rate = NCRs Opened / Total Jobs x 100
     */
    private function calcNcrRate(DateRange $period, array $filters): array
    {
        $ncrCount = (int) $this->db->queryScalar(
            "SELECT COUNT(*) FROM ncr_records nr
             JOIN records r ON r.record_id = nr.record_id
             WHERE r.created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
            [':s' => $period->start, ':e' => $period->end],
        );

        $jobCount = (int) $this->db->queryScalar(
            "SELECT COUNT(*) FROM job_orders
             WHERE start_date_actual BETWEEN :s AND :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        $pct = $jobCount > 0 ? ($ncrCount / $jobCount) * 100 : 0;

        return ['value' => round($pct, 2), 'ncr_count' => $ncrCount, 'job_count' => $jobCount];
    }

    /**
     * CAPA Closure Rate = CAPAs Closed On Time / Total CAPAs Due x 100
     */
    private function calcCapaClosure(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) FILTER (WHERE capa_status = 'Closed'
                    AND (completion_date IS NULL OR completion_date <= target_date)) AS on_time,
                COUNT(*) AS total
             FROM capa_records
             WHERE target_date BETWEEN :s AND :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        $onTime = (int) ($row['on_time'] ?? 0);
        $total  = (int) ($row['total'] ?? 0);
        $pct    = $total > 0 ? ($onTime / $total) * 100 : 0;

        return ['value' => round($pct, 2), 'on_time' => $onTime, 'total' => $total];
    }

    /**
     * Calibration Compliance = Gages Calibrated On Time / Total Gages Due x 100
     */
    private function calcCalCompliance(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) FILTER (WHERE cr.calibration_date <= e.calibration_due) AS on_time,
                COUNT(*) AS total
             FROM equipment e
             LEFT JOIN calibration_records cr ON cr.equipment_id = e.equipment_id
                 AND cr.calibration_date = (
                     SELECT MAX(c2.calibration_date) FROM calibration_records c2
                     WHERE c2.equipment_id = e.equipment_id
                 )
             WHERE e.is_active = TRUE
               AND e.calibration_due IS NOT NULL
               AND e.calibration_due BETWEEN :s AND :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        $onTime = (int) ($row['on_time'] ?? 0);
        $total  = (int) ($row['total'] ?? 0);
        $pct    = $total > 0 ? ($onTime / $total) * 100 : 0;

        return ['value' => round($pct, 2), 'on_time' => $onTime, 'total' => $total];
    }

    /**
     * Training Completion = Training Completed On Time / Total Training Required x 100
     */
    private function calcTrainingCompletion(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) FILTER (WHERE assessment_result IN ('Pass', 'Conditional')) AS completed,
                COUNT(*) AS total
             FROM training_records
             WHERE recorded_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
            [':s' => $period->start, ':e' => $period->end],
        );

        $completed = (int) ($row['completed'] ?? 0);
        $total     = (int) ($row['total'] ?? 0);
        $pct       = $total > 0 ? ($completed / $total) * 100 : 0;

        return ['value' => round($pct, 2), 'completed' => $completed, 'total' => $total];
    }

    /**
     * Supplier OTD = Supplier On-Time Deliveries / Total Supplier Deliveries x 100
     */
    private function calcSupplierOtd(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(AVG(otd_pct), 0) AS avg_otd,
                COUNT(*) AS vendor_count
             FROM vendor_ratings
             WHERE period_start >= :s AND period_end <= :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        return [
            'value'        => round((float) ($row['avg_otd'] ?? 0), 2),
            'vendor_count' => (int) ($row['vendor_count'] ?? 0),
        ];
    }

    /**
     * Supplier Quality = Accepted Lots / Total Lots Received x 100
     */
    private function calcSupplierQuality(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(AVG(quality_pct), 0) AS avg_quality,
                COUNT(*) AS vendor_count
             FROM vendor_ratings
             WHERE period_start >= :s AND period_end <= :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        return [
            'value'        => round((float) ($row['avg_quality'] ?? 0), 2),
            'vendor_count' => (int) ($row['vendor_count'] ?? 0),
        ];
    }

    /**
     * Customer Complaint Rate = Complaints / Total Shipments x 1000 (PPM)
     */
    private function calcComplaintRate(DateRange $period, array $filters): array
    {
        $complaints = (int) $this->db->queryScalar(
            "SELECT COUNT(*) FROM ncr_records nr
             JOIN records r ON r.record_id = nr.record_id
             WHERE nr.nonconformance_source = 'Customer'
               AND r.created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
            [':s' => $period->start, ':e' => $period->end],
        );

        $shipments = (int) $this->db->queryScalar(
            "SELECT COUNT(*) FROM shipments
             WHERE ship_date BETWEEN :s AND :e
               AND shipment_status = 'delivered'",
            [':s' => $period->start, ':e' => $period->end],
        );

        $ppm = $shipments > 0 ? ($complaints / $shipments) * 1_000_000 : 0;

        return ['value' => round($ppm, 0), 'complaints' => $complaints, 'shipments' => $shipments];
    }

    /**
     * Inventory Turns = COGS / Average Inventory Value
     */
    private function calcInventoryTurns(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM((metadata->>'cogs')::numeric), 0) AS cogs,
                COALESCE(AVG((metadata->>'inventory_value')::numeric), 0) AS avg_inv
             FROM kpi_snapshots ks
             JOIN kpi_definitions kd ON kd.kpi_id = ks.kpi_id
             WHERE kd.metric_code = 'INV_TURNS'
               AND ks.period_start >= :s AND ks.period_end <= :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        $cogs   = (float) ($row['cogs'] ?? 0);
        $avgInv = (float) ($row['avg_inv'] ?? 0);
        $turns  = $avgInv > 0 ? $cogs / $avgInv : 0;

        return ['value' => round($turns, 2), 'cogs' => round($cogs, 2), 'avg_inventory' => round($avgInv, 2)];
    }

    /**
     * Labor Efficiency = Standard Hours Earned / Actual Hours Worked x 100
     */
    private function calcLaborEfficiency(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM(jo.completed_qty * COALESCE(i.standard_cycle_time, 0)), 0) AS std_hrs,
                COALESCE(SUM((jo.metadata->>'actual_labor_hours')::numeric), 0) AS actual_hrs
             FROM job_orders jo
             LEFT JOIN items i ON i.item_id = jo.item_id
             WHERE jo.start_date_actual BETWEEN :s AND :e
               AND jo.job_status IN ('completed', 'closed')",
            [':s' => $period->start, ':e' => $period->end],
        );

        $stdHrs    = (float) ($row['std_hrs'] ?? 0);
        $actualHrs = (float) ($row['actual_hrs'] ?? 0);
        $pct       = $actualHrs > 0 ? ($stdHrs / $actualHrs) * 100 : 0;

        return ['value' => round($pct, 2), 'standard_hrs' => round($stdHrs, 2), 'actual_hrs' => round($actualHrs, 2)];
    }

    /**
     * Put-Thru Index = Revenue / Direct Labor Hours
     */
    private function calcPutThru(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COALESCE(SUM((jo.metadata->>'revenue')::numeric), 0) AS revenue,
                COALESCE(SUM((jo.metadata->>'actual_labor_hours')::numeric), 0) AS labor_hrs
             FROM job_orders jo
             WHERE jo.start_date_actual BETWEEN :s AND :e
               AND jo.job_status IN ('completed', 'closed')",
            [':s' => $period->start, ':e' => $period->end],
        );

        $revenue  = (float) ($row['revenue'] ?? 0);
        $laborHrs = (float) ($row['labor_hrs'] ?? 0);
        $index    = $laborHrs > 0 ? $revenue / $laborHrs : 0;

        return ['value' => round($index, 2), 'revenue' => round($revenue, 2), 'labor_hrs' => round($laborHrs, 2)];
    }

    // ── Internal Helpers ────────────────────────────────────────────────────

    /**
     * Map metric code to its calculator closure.
     *
     * @param string $metricCode
     * @return callable(DateRange, array): array
     */
    private function getCalculator(string $metricCode): callable
    {
        $metricCode = $this->normalizeMetricCode($metricCode);

        return match ($metricCode) {
            self::METRIC_OEE                 => $this->calcOee(...),
            self::METRIC_OTD                 => $this->calcOtd(...),
            self::METRIC_DPMO                => $this->calcDpmo(...),
            self::METRIC_COPQ                => $this->calcCopq(...),
            self::METRIC_FPY                 => $this->calcFpy(...),
            self::METRIC_SCRAP_RATE          => $this->calcScrapRate(...),
            self::METRIC_REWORK_RATE         => $this->calcReworkRate(...),
            self::METRIC_MACHINE_UTILIZATION => $this->calcMachineUtil(...),
            self::METRIC_SETUP_TIME_RATIO    => $this->calcSetupRatio(...),
            self::METRIC_NCR_RATE            => $this->calcNcrRate(...),
            self::METRIC_CAPA_CLOSURE        => $this->calcCapaClosure(...),
            self::METRIC_CAL_COMPLIANCE      => $this->calcCalCompliance(...),
            self::METRIC_TRAINING_COMPLETION => $this->calcTrainingCompletion(...),
            self::METRIC_SUPPLIER_OTD        => $this->calcSupplierOtd(...),
            self::METRIC_SUPPLIER_QUALITY    => $this->calcSupplierQuality(...),
            self::METRIC_COMPLAINT_RATE      => $this->calcComplaintRate(...),
            self::METRIC_INVENTORY_TURNS     => $this->calcInventoryTurns(...),
            self::METRIC_LABOR_EFFICIENCY    => $this->calcLaborEfficiency(...),
            self::METRIC_PUT_THRU_INDEX      => $this->calcPutThru(...),
            default => throw new RuntimeException("Unknown metric: {$metricCode}"),
        };
    }

    /**
     * Evaluate RAG status for a metric value vs target.
     */
    private function evaluateStatus(string $metricCode, float $value, float $target): KpiStatus
    {
        if ($target === 0.0) {
            return KpiStatus::GREY;
        }

        $lowerBetter = in_array($metricCode, self::LOWER_IS_BETTER, true);

        // Load thresholds from definition if available
        $yellowThreshold = $this->getYellowThreshold($metricCode, $target);

        if ($lowerBetter) {
            // Lower is better: green if value <= target
            if ($value <= $target) {
                return KpiStatus::GREEN;
            }
            return $value <= $yellowThreshold ? KpiStatus::YELLOW : KpiStatus::RED;
        }

        // Higher is better: green if value >= target
        if ($value >= $target) {
            return KpiStatus::GREEN;
        }
        return $value >= $yellowThreshold ? KpiStatus::YELLOW : KpiStatus::RED;
    }

    /**
     * Get the yellow threshold for a metric (boundary between yellow and red).
     */
    private function getYellowThreshold(string $metricCode, float $target): float
    {
        try {
            $row = $this->db->queryOne(
                'SELECT threshold_yellow FROM kpi_definitions WHERE metric_code = :code AND is_active = TRUE',
                [':code' => $metricCode],
            );
            if ($row !== null && $row['threshold_yellow'] !== null) {
                return (float) $row['threshold_yellow'];
            }
        } catch (\Throwable) {
            // Use default
        }

        $lowerBetter = in_array($metricCode, self::LOWER_IS_BETTER, true);
        return $lowerBetter ? $target * 1.5 : $target * 0.8;
    }

    /**
     * Create an empty KpiResult for metrics that failed calculation.
     */
    private function emptyResult(string $metricCode, DateRange $period): KpiResult
    {
        $metricCode = $this->normalizeMetricCode($metricCode);

        return new KpiResult(
            metricCode:   $metricCode,
            value:        0.0,
            unit:         self::UNITS[$metricCode] ?? '%',
            target:       self::DEFAULT_TARGETS[$metricCode] ?? 0.0,
            status:       KpiStatus::GREY,
            breakdown:    ['value' => 0, 'error' => 'Calculation failed or no data'],
            periodStart:  $period->start,
            periodEnd:    $period->end,
            calculatedAt: gmdate('c'),
        );
    }

    /**
     * Load trend data from stored kpi_snapshots.
     *
     * @return array<int, array{date: string, value: float}>
     */
    private function loadTrendFromSnapshots(string $metricCode, DateRange $period, string $granularity): array
    {
        $metricCode = $this->normalizeMetricCode($metricCode);

        try {
            $truncFn = match ($granularity) {
                'weekly'  => "date_trunc('week', ks.period_start)",
                'monthly' => "date_trunc('month', ks.period_start)",
                default   => 'ks.period_start',
            };

            $rows = $this->db->query(
                "SELECT {$truncFn}::date AS bucket, AVG(ks.actual_value) AS avg_value,
                        AVG(ks.target_value) AS avg_target, MAX(ks.kpi_status) AS status
                 FROM kpi_snapshots ks
                 JOIN kpi_definitions kd ON kd.kpi_id = ks.kpi_id
                 WHERE kd.metric_code = :code
                   AND ks.period_start >= :s AND ks.period_end <= :e
                 GROUP BY bucket
                 ORDER BY bucket",
                [':code' => $metricCode, ':s' => $period->start, ':e' => $period->end],
            );

            return array_map(fn(array $r) => [
                'date'   => $r['bucket'],
                'value'  => round((float) $r['avg_value'], 4),
                'target' => round((float) $r['avg_target'], 4),
                'status' => $r['status'] ?? 'grey',
            ], $rows);
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Split a DateRange into sub-periods by granularity.
     *
     * @return DateRange[]
     */
    private function splitPeriod(DateRange $period, string $granularity): array
    {
        $intervals = [];
        $current   = strtotime($period->start);
        $end       = strtotime($period->end);

        while ($current <= $end) {
            $nextEnd = match ($granularity) {
                'weekly'  => strtotime('+6 days', $current),
                'monthly' => strtotime('+1 month -1 day', $current),
                default   => $current,
            };
            $nextEnd = min($nextEnd, $end);
            $intervals[] = new DateRange(date('Y-m-d', $current), date('Y-m-d', $nextEnd));
            $current = strtotime('+1 day', $nextEnd);
        }

        return $intervals;
    }

    /**
     * Build optional WHERE clause fragment for equipment-filtered queries.
     */
    private function buildEquipmentWhereClause(array $filters): string
    {
        $clauses = [];
        if (!empty($filters['machine_id'])) {
            $clauses[] = "AND equipment_id = " . $this->db->getPdo()->quote($filters['machine_id']);
        }
        if (!empty($filters['dept_code'])) {
            $clauses[] = "AND equipment_id IN (
                SELECT equipment_id FROM equipment WHERE department_id = "
                . $this->db->getPdo()->quote($filters['dept_code']) . ")";
        }
        return implode(' ', $clauses);
    }

    /**
     * Auto-register a KPI definition if it does not exist.
     *
     * @return string UUID of the new kpi_definitions row.
     */
    private function registerKpiDefinition(string $metricCode): string
    {
        $metricCode = $this->normalizeMetricCode($metricCode);
        if (!in_array($metricCode, self::ALL_METRICS, true)) {
            throw new InvalidArgumentException("KPI metric is not approved for KpiEngine auto-registration: {$metricCode}");
        }

        $name   = str_replace('_', ' ', $metricCode);
        $target = self::DEFAULT_TARGETS[$metricCode] ?? 0;
        $unit   = self::UNITS[$metricCode] ?? '%';

        $row = $this->db->insertReturning(
            "INSERT INTO kpi_definitions (metric_code, kpi_name, formula, unit, target, is_active)
             VALUES (:code, :name, :formula, :unit, :target, TRUE)
             RETURNING kpi_id",
            [
                ':code'    => $metricCode,
                ':name'    => $name,
                ':formula' => "See KpiEngine::{$metricCode}",
                ':unit'    => $unit,
                ':target'  => $target,
            ],
        );

        return (string) ($row['kpi_id'] ?? '');
    }

    /**
     * Normalize approved legacy aliases to the single runtime metric code.
     */
    private function normalizeMetricCode(string $metricCode): string
    {
        $code = strtoupper(trim($metricCode));
        if ($code === '') {
            return $code;
        }

        $aliases = $this->loadKpiAuthorityRegistry()['legacy_aliases'] ?? [];
        if (is_array($aliases)) {
            $canonical = $aliases[$code] ?? null;
            if (is_string($canonical) && trim($canonical) !== '') {
                return strtoupper(trim($canonical));
            }
        }

        return $code;
    }

    /**
     * Load the governed KPI registry. Missing registry falls back to built-in constants.
     *
     * @return array<string, mixed>
     */
    private function loadKpiAuthorityRegistry(): array
    {
        if ($this->kpiAuthorityRegistry !== null) {
            return $this->kpiAuthorityRegistry;
        }

        $this->kpiAuthorityRegistry = [];
        if (!is_file(self::KPI_AUTHORITY_REGISTRY_PATH)) {
            return $this->kpiAuthorityRegistry;
        }

        $payload = json_decode((string) file_get_contents(self::KPI_AUTHORITY_REGISTRY_PATH), true);
        if (is_array($payload)) {
            $this->kpiAuthorityRegistry = $payload;
        }

        return $this->kpiAuthorityRegistry;
    }
}
