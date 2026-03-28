<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use HESEM\QMS\Database\Connection;
use RuntimeException;

/**
 * Dashboard data aggregation service for HESEM QMS Portal.
 *
 * Orchestrates KpiEngine, SpcEngine, and direct database queries to
 * build the data payloads consumed by the executive, quality,
 * production, supplier, and department dashboards.
 *
 * @package HESEM\QMS\Services
 * @since   4.0.0
 */
final class DashboardService
{
    private Connection $db;
    private KpiEngine  $kpi;
    private SpcEngine  $spc;

    /** Cache directory for pre-built widget data. */
    private readonly string $cacheDir;

    /** Widget cache TTL in seconds (3 minutes). */
    private const CACHE_TTL = 180;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string          $dataDir Path to qms-data directory.
     * @param Connection|null $db      Database connection.
     * @param KpiEngine|null  $kpi     KPI engine instance.
     * @param SpcEngine|null  $spc     SPC engine instance.
     */
    public function __construct(
        string      $dataDir,
        ?Connection $db = null,
        ?KpiEngine  $kpi = null,
        ?SpcEngine  $spc = null,
    ) {
        $this->db  = $db  ?? Connection::getInstance();
        $this->kpi = $kpi ?? new KpiEngine($this->db);
        $this->spc = $spc ?? new SpcEngine($this->db);

        $base = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->cacheDir = $base . '/dashboard-cache';
        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0775, true);
        }
    }

    // ── Dashboard Endpoints ─────────────────────────────────────────────────

    /**
     * Executive dashboard: top-level KPIs for management review.
     *
     * @param DateRange $period Reporting period.
     * @return array
     */
    public function getExecutiveDashboard(DateRange $period): array
    {
        $topKpis = [
            KpiEngine::METRIC_OEE,
            KpiEngine::METRIC_OTD,
            KpiEngine::METRIC_FPY,
            KpiEngine::METRIC_SCRAP_RATE,
            KpiEngine::METRIC_COPQ,
            KpiEngine::METRIC_COMPLAINT_RATE,
            KpiEngine::METRIC_CAPA_CLOSURE,
            KpiEngine::METRIC_PUT_THRU_INDEX,
        ];

        $kpis = [];
        foreach ($topKpis as $code) {
            try {
                $kpis[$code] = $this->kpi->calculateKpi($code, $period)->toArray();
            } catch (\Throwable) {
                $kpis[$code] = ['metric_code' => $code, 'value' => null, 'status' => 'grey'];
            }
        }

        // Trend data for sparklines
        $trends = [];
        foreach ([KpiEngine::METRIC_OEE, KpiEngine::METRIC_OTD, KpiEngine::METRIC_FPY] as $code) {
            $trends[$code] = $this->kpi->getKpiTrend($code, $period, 'weekly');
        }

        return [
            'dashboard' => 'executive',
            'period'    => $period->toArray(),
            'kpis'      => $kpis,
            'trends'    => $trends,
            'alerts'    => $this->kpi->getKpiAlerts(),
            'summary'   => $this->buildExecutiveSummary($period),
        ];
    }

    /**
     * Quality dashboard: NCR, CAPA, FPY, Cpk details.
     *
     * @param DateRange $period Reporting period.
     * @return array
     */
    public function getQualityDashboard(DateRange $period): array
    {
        $qualityKpis = [
            KpiEngine::METRIC_FPY,
            KpiEngine::METRIC_SCRAP_RATE,
            KpiEngine::METRIC_REWORK_RATE,
            KpiEngine::METRIC_NCR_RATE,
            KpiEngine::METRIC_CAPA_CLOSURE,
            KpiEngine::METRIC_DPMO,
            KpiEngine::METRIC_CAL_COMPLIANCE,
            KpiEngine::METRIC_COMPLAINT_RATE,
        ];

        $kpis = [];
        foreach ($qualityKpis as $code) {
            try {
                $kpis[$code] = $this->kpi->calculateKpi($code, $period)->toArray();
            } catch (\Throwable) {
                $kpis[$code] = ['metric_code' => $code, 'value' => null, 'status' => 'grey'];
            }
        }

        return [
            'dashboard'   => 'quality',
            'period'      => $period->toArray(),
            'kpis'        => $kpis,
            'ncr_pareto'  => $this->getWidgetData('ncr_pareto', ['period' => $period]),
            'capa_aging'  => $this->getWidgetData('capa_aging', ['period' => $period]),
            'spc_alerts'  => $this->spc->getSpcAlerts(),
            'calibration' => $this->getWidgetData('calibration_status', []),
        ];
    }

    /**
     * Production dashboard: OEE, utilization, WIP, schedule adherence.
     *
     * @param DateRange $period Reporting period.
     * @return array
     */
    public function getProductionDashboard(DateRange $period): array
    {
        $prodKpis = [
            KpiEngine::METRIC_OEE,
            KpiEngine::METRIC_MACHINE_UTILIZATION,
            KpiEngine::METRIC_SETUP_TIME_RATIO,
            KpiEngine::METRIC_LABOR_EFFICIENCY,
            KpiEngine::METRIC_PUT_THRU_INDEX,
            KpiEngine::METRIC_SCRAP_RATE,
        ];

        $kpis = [];
        foreach ($prodKpis as $code) {
            try {
                $kpis[$code] = $this->kpi->calculateKpi($code, $period)->toArray();
            } catch (\Throwable) {
                $kpis[$code] = ['metric_code' => $code, 'value' => null, 'status' => 'grey'];
            }
        }

        return [
            'dashboard'  => 'production',
            'period'     => $period->toArray(),
            'kpis'       => $kpis,
            'oee_trend'  => $this->getWidgetData('oee_trend', ['period' => $period]),
            'job_status' => $this->getWidgetData('job_status', ['period' => $period]),
            'wip_aging'  => $this->getWidgetData('wip_aging', ['period' => $period]),
        ];
    }

    /**
     * Supplier dashboard: supplier scorecard summary.
     *
     * @param DateRange $period Reporting period.
     * @return array
     */
    public function getSupplierDashboard(DateRange $period): array
    {
        $supplierKpis = [
            KpiEngine::METRIC_SUPPLIER_OTD,
            KpiEngine::METRIC_SUPPLIER_QUALITY,
            KpiEngine::METRIC_INVENTORY_TURNS,
        ];

        $kpis = [];
        foreach ($supplierKpis as $code) {
            try {
                $kpis[$code] = $this->kpi->calculateKpi($code, $period)->toArray();
            } catch (\Throwable) {
                $kpis[$code] = ['metric_code' => $code, 'value' => null, 'status' => 'grey'];
            }
        }

        return [
            'dashboard'        => 'supplier',
            'period'           => $period->toArray(),
            'kpis'             => $kpis,
            'vendor_scorecards' => $this->loadVendorScorecards($period),
            'otd_trend'        => $this->getWidgetData('otd_trend', ['period' => $period]),
        ];
    }

    /**
     * Department-specific dashboard.
     *
     * @param string    $department Department code (e.g. "PROD", "QA", "ENGR").
     * @param DateRange $period     Reporting period.
     * @return array
     */
    public function getDepartmentDashboard(string $department, DateRange $period): array
    {
        $department = strtoupper(trim($department));

        $kpis = $this->kpi->calculateAllKpis($period, $department);
        $kpiArrays = [];
        foreach ($kpis as $code => $result) {
            $kpiArrays[$code] = $result instanceof KpiResult ? $result->toArray() : $result;
        }

        return [
            'dashboard'       => 'department',
            'department'      => $department,
            'period'          => $period->toArray(),
            'kpis'            => $kpiArrays,
            'training_matrix' => $this->getWidgetData('training_matrix', ['department' => $department]),
            'risk_heatmap'    => $this->getWidgetData('risk_heatmap', ['department' => $department]),
        ];
    }

    // ── Widget Data ─────────────────────────────────────────────────────────

    /**
     * Get individual widget data by type.
     *
     * @param string $widgetType Widget type code.
     * @param array  $params     Widget-specific parameters.
     * @return array
     */
    public function getWidgetData(string $widgetType, array $params): array
    {
        // Check cache
        $cacheKey = $widgetType . '_' . md5(json_encode($params));
        $cached   = $this->readCache($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $data = match ($widgetType) {
            'ncr_pareto'          => $this->widgetNcrPareto($params),
            'capa_aging'          => $this->widgetCapaAging($params),
            'oee_trend'           => $this->widgetOeeTrend($params),
            'otd_trend'           => $this->widgetOtdTrend($params),
            'calibration_status'  => $this->widgetCalibrationStatus(),
            'training_matrix'     => $this->widgetTrainingMatrix($params),
            'risk_heatmap'        => $this->widgetRiskHeatmap($params),
            'spc_alerts'          => $this->widgetSpcAlerts(),
            'job_status'          => $this->widgetJobStatus($params),
            'wip_aging'           => $this->widgetWipAging($params),
            default               => throw new RuntimeException("Unknown widget type: {$widgetType}"),
        };

        $this->writeCache($cacheKey, $data);
        return $data;
    }

    // ── Widget Implementations ──────────────────────────────────────────────

    /**
     * NCR Pareto: Top defect types ranked by frequency.
     */
    private function widgetNcrPareto(array $params): array
    {
        $period = $params['period'] ?? DateRange::lastDays(90);

        try {
            $rows = $this->db->query(
                "SELECT nr.defect_type, COUNT(*) AS cnt,
                        SUM(COALESCE((nr.metadata->>'cost_amount')::numeric, 0)) AS total_cost
                 FROM ncr_records nr
                 JOIN records r ON r.record_id = nr.record_id
                 WHERE r.created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
                 GROUP BY nr.defect_type
                 ORDER BY cnt DESC
                 LIMIT 20",
                [':s' => $period->start, ':e' => $period->end],
            );

            $total = array_sum(array_column($rows, 'cnt'));
            $cumulative = 0;
            $items = [];
            foreach ($rows as $row) {
                $cumulative += (int) $row['cnt'];
                $items[] = [
                    'defect_type'    => $row['defect_type'] ?? 'Unclassified',
                    'count'          => (int) $row['cnt'],
                    'cost'           => round((float) $row['total_cost'], 2),
                    'pct'            => $total > 0 ? round(((int) $row['cnt'] / $total) * 100, 1) : 0,
                    'cumulative_pct' => $total > 0 ? round(($cumulative / $total) * 100, 1) : 0,
                ];
            }

            return ['widget' => 'ncr_pareto', 'items' => $items, 'total' => $total];
        } catch (\Throwable) {
            return ['widget' => 'ncr_pareto', 'items' => [], 'total' => 0];
        }
    }

    /**
     * CAPA aging analysis.
     */
    private function widgetCapaAging(array $params): array
    {
        try {
            $rows = $this->db->query(
                "SELECT
                    capa_status,
                    COUNT(*) AS cnt,
                    COUNT(*) FILTER (WHERE target_date < CURRENT_DATE AND capa_status NOT IN ('Closed', 'Verified')) AS overdue,
                    AVG(EXTRACT(DAY FROM (COALESCE(completion_date, CURRENT_DATE) - created_at))) AS avg_age_days
                 FROM capa_records
                 GROUP BY capa_status
                 ORDER BY cnt DESC",
            );

            $buckets = [
                '0-30 days'   => 0,
                '31-60 days'  => 0,
                '61-90 days'  => 0,
                '90+ days'    => 0,
            ];

            $openCapas = $this->db->query(
                "SELECT EXTRACT(DAY FROM (CURRENT_DATE - created_at)) AS age
                 FROM capa_records
                 WHERE capa_status NOT IN ('Closed', 'Verified')",
            );

            foreach ($openCapas as $c) {
                $age = (int) ($c['age'] ?? 0);
                if ($age <= 30) {
                    $buckets['0-30 days']++;
                } elseif ($age <= 60) {
                    $buckets['31-60 days']++;
                } elseif ($age <= 90) {
                    $buckets['61-90 days']++;
                } else {
                    $buckets['90+ days']++;
                }
            }

            return [
                'widget'     => 'capa_aging',
                'by_status'  => array_map(fn(array $r) => [
                    'status'       => $r['capa_status'],
                    'count'        => (int) $r['cnt'],
                    'overdue'      => (int) $r['overdue'],
                    'avg_age_days' => round((float) ($r['avg_age_days'] ?? 0), 1),
                ], $rows),
                'aging_buckets' => $buckets,
            ];
        } catch (\Throwable) {
            return ['widget' => 'capa_aging', 'by_status' => [], 'aging_buckets' => []];
        }
    }

    /**
     * OEE trend by machine/line.
     */
    private function widgetOeeTrend(array $params): array
    {
        $period = $params['period'] ?? DateRange::lastDays(90);
        return [
            'widget' => 'oee_trend',
            'trend'  => $this->kpi->getKpiTrend(KpiEngine::METRIC_OEE, $period, 'weekly'),
        ];
    }

    /**
     * OTD trend by customer.
     */
    private function widgetOtdTrend(array $params): array
    {
        $period = $params['period'] ?? DateRange::lastDays(90);
        return [
            'widget' => 'otd_trend',
            'trend'  => $this->kpi->getKpiTrend(KpiEngine::METRIC_OTD, $period, 'weekly'),
        ];
    }

    /**
     * Gage calibration status: due, overdue, on-time.
     */
    private function widgetCalibrationStatus(): array
    {
        try {
            $row = $this->db->queryOne(
                "SELECT
                    COUNT(*) FILTER (WHERE calibration_due < CURRENT_DATE) AS overdue,
                    COUNT(*) FILTER (WHERE calibration_due BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')) AS due_soon,
                    COUNT(*) FILTER (WHERE calibration_due > (CURRENT_DATE + INTERVAL '30 days')) AS ok,
                    COUNT(*) AS total
                 FROM equipment
                 WHERE is_active = TRUE AND calibration_due IS NOT NULL",
            );

            $overdue = (int) ($row['overdue'] ?? 0);
            $dueSoon = (int) ($row['due_soon'] ?? 0);
            $ok      = (int) ($row['ok'] ?? 0);
            $total   = (int) ($row['total'] ?? 0);

            // List overdue gages
            $overdueList = $this->db->query(
                "SELECT equipment_id, equipment_name, calibration_due,
                        (CURRENT_DATE - calibration_due) AS days_overdue
                 FROM equipment
                 WHERE is_active = TRUE
                   AND calibration_due IS NOT NULL
                   AND calibration_due < CURRENT_DATE
                 ORDER BY calibration_due
                 LIMIT 20",
            );

            return [
                'widget'       => 'calibration_status',
                'overdue'      => $overdue,
                'due_soon'     => $dueSoon,
                'ok'           => $ok,
                'total'        => $total,
                'overdue_list' => $overdueList,
            ];
        } catch (\Throwable) {
            return ['widget' => 'calibration_status', 'overdue' => 0, 'due_soon' => 0, 'ok' => 0, 'total' => 0, 'overdue_list' => []];
        }
    }

    /**
     * Training completion heatmap (department x topic).
     */
    private function widgetTrainingMatrix(array $params): array
    {
        $deptFilter = $params['department'] ?? null;

        try {
            $where = '';
            $bind = [];
            if ($deptFilter !== null) {
                $where = "AND e.department_id = :dept";
                $bind[':dept'] = $deptFilter;
            }

            $rows = $this->db->query(
                "SELECT
                    COALESCE(e.department_id, 'N/A') AS department,
                    tr.training_topic,
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE tr.assessment_result IN ('Pass', 'Conditional')) AS completed
                 FROM training_records tr
                 LEFT JOIN employees e ON e.employee_id = tr.trainee_id
                 WHERE tr.recorded_at >= (now() - INTERVAL '365 days') {$where}
                 GROUP BY department, tr.training_topic
                 ORDER BY department, tr.training_topic",
                $bind,
            );

            $matrix = [];
            foreach ($rows as $r) {
                $dept  = $r['department'];
                $topic = $r['training_topic'];
                $total = (int) $r['total'];
                $done  = (int) $r['completed'];
                $pct   = $total > 0 ? round(($done / $total) * 100, 1) : 0;

                $matrix[] = [
                    'department' => $dept,
                    'topic'      => $topic,
                    'total'      => $total,
                    'completed'  => $done,
                    'pct'        => $pct,
                ];
            }

            return ['widget' => 'training_matrix', 'matrix' => $matrix];
        } catch (\Throwable) {
            return ['widget' => 'training_matrix', 'matrix' => []];
        }
    }

    /**
     * Risk heatmap: likelihood x impact matrix.
     */
    private function widgetRiskHeatmap(array $params): array
    {
        try {
            $rows = $this->db->query(
                "SELECT
                    COALESCE((metadata->>'risk_likelihood')::int, 3) AS likelihood,
                    COALESCE((metadata->>'risk_impact')::int, 3) AS impact,
                    COUNT(*) AS cnt,
                    string_agg(record_id, ', ' ORDER BY record_id) AS record_ids
                 FROM records
                 WHERE record_type IN ('RISK', 'OPPORTUNITY')
                   AND status NOT IN ('closed', 'cancelled')
                 GROUP BY likelihood, impact
                 ORDER BY likelihood DESC, impact DESC",
            );

            $cells = [];
            foreach ($rows as $r) {
                $cells[] = [
                    'likelihood' => (int) $r['likelihood'],
                    'impact'     => (int) $r['impact'],
                    'count'      => (int) $r['cnt'],
                    'rpn'        => (int) $r['likelihood'] * (int) $r['impact'],
                    'record_ids' => $r['record_ids'],
                ];
            }

            return ['widget' => 'risk_heatmap', 'cells' => $cells];
        } catch (\Throwable) {
            return ['widget' => 'risk_heatmap', 'cells' => []];
        }
    }

    /**
     * Active SPC out-of-control alerts.
     */
    private function widgetSpcAlerts(): array
    {
        return [
            'widget' => 'spc_alerts',
            'alerts' => $this->spc->getSpcAlerts(),
        ];
    }

    /**
     * Job order status distribution.
     */
    private function widgetJobStatus(array $params): array
    {
        try {
            $rows = $this->db->query(
                "SELECT job_status, COUNT(*) AS cnt
                 FROM job_orders
                 WHERE job_status NOT IN ('cancelled')
                 GROUP BY job_status
                 ORDER BY cnt DESC",
            );

            $statuses = [];
            foreach ($rows as $r) {
                $statuses[] = [
                    'status' => $r['job_status'],
                    'count'  => (int) $r['cnt'],
                ];
            }

            $total = array_sum(array_column($statuses, 'count'));

            return ['widget' => 'job_status', 'statuses' => $statuses, 'total' => $total];
        } catch (\Throwable) {
            return ['widget' => 'job_status', 'statuses' => [], 'total' => 0];
        }
    }

    /**
     * WIP aging by operation.
     */
    private function widgetWipAging(array $params): array
    {
        try {
            $rows = $this->db->query(
                "SELECT
                    job_status,
                    COUNT(*) AS cnt,
                    AVG(EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(start_date_actual, start_date_planned)))) AS avg_age,
                    SUM(order_qty - completed_qty - scrapped_qty) AS wip_qty
                 FROM job_orders
                 WHERE job_status IN ('released', 'active')
                 GROUP BY job_status
                 ORDER BY avg_age DESC",
            );

            $buckets = [
                '0-7 days'   => 0,
                '8-14 days'  => 0,
                '15-30 days' => 0,
                '30+ days'   => 0,
            ];

            $wipJobs = $this->db->query(
                "SELECT EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(start_date_actual, start_date_planned))) AS age
                 FROM job_orders
                 WHERE job_status IN ('released', 'active')",
            );

            foreach ($wipJobs as $j) {
                $age = (int) ($j['age'] ?? 0);
                if ($age <= 7) {
                    $buckets['0-7 days']++;
                } elseif ($age <= 14) {
                    $buckets['8-14 days']++;
                } elseif ($age <= 30) {
                    $buckets['15-30 days']++;
                } else {
                    $buckets['30+ days']++;
                }
            }

            return [
                'widget'        => 'wip_aging',
                'by_status'     => array_map(fn(array $r) => [
                    'status'  => $r['job_status'],
                    'count'   => (int) $r['cnt'],
                    'avg_age' => round((float) ($r['avg_age'] ?? 0), 1),
                    'wip_qty' => (float) ($r['wip_qty'] ?? 0),
                ], $rows),
                'aging_buckets' => $buckets,
            ];
        } catch (\Throwable) {
            return ['widget' => 'wip_aging', 'by_status' => [], 'aging_buckets' => []];
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Build executive summary counts.
     */
    private function buildExecutiveSummary(DateRange $period): array
    {
        try {
            return [
                'open_ncrs'      => (int) $this->db->queryScalar(
                    "SELECT COUNT(*) FROM ncr_records nr
                     JOIN records r ON r.record_id = nr.record_id
                     WHERE r.status NOT IN ('closed', 'cancelled')",
                ),
                'open_capas'     => (int) $this->db->queryScalar(
                    "SELECT COUNT(*) FROM capa_records WHERE capa_status NOT IN ('Closed', 'Verified')",
                ),
                'active_jobs'    => (int) $this->db->queryScalar(
                    "SELECT COUNT(*) FROM job_orders WHERE job_status IN ('released', 'active')",
                ),
                'overdue_cal'    => (int) $this->db->queryScalar(
                    "SELECT COUNT(*) FROM equipment
                     WHERE is_active = TRUE AND calibration_due < CURRENT_DATE",
                ),
                'pending_fai'    => (int) $this->db->queryScalar(
                    "SELECT COUNT(*) FROM fai_records fr
                     JOIN records r ON r.record_id = fr.record_id
                     WHERE r.status = 'in_progress'",
                ),
            ];
        } catch (\Throwable) {
            return [
                'open_ncrs'   => 0,
                'open_capas'  => 0,
                'active_jobs' => 0,
                'overdue_cal' => 0,
                'pending_fai' => 0,
            ];
        }
    }

    /**
     * Load vendor scorecards for the period.
     */
    private function loadVendorScorecards(DateRange $period): array
    {
        try {
            return $this->db->query(
                "SELECT v.vendor_id, v.vendor_name, v.vendor_rating_grade,
                        vr.rating_score, vr.otd_pct, vr.quality_pct, vr.scar_count
                 FROM vendors v
                 LEFT JOIN vendor_ratings vr ON vr.vendor_id = v.vendor_id
                    AND vr.period_start >= :s AND vr.period_end <= :e
                 WHERE v.vendor_status = 'approved'
                 ORDER BY vr.rating_score DESC NULLS LAST
                 LIMIT 50",
                [':s' => $period->start, ':e' => $period->end],
            );
        } catch (\Throwable) {
            return [];
        }
    }

    // ── Caching ─────────────────────────────────────────────────────────────

    /**
     * Read a cached widget result.
     */
    private function readCache(string $key): ?array
    {
        $file = $this->cacheDir . '/' . md5($key) . '.json';
        if (!file_exists($file)) {
            return null;
        }
        $stat = @filemtime($file);
        if ($stat === false || (time() - $stat) > self::CACHE_TTL) {
            @unlink($file);
            return null;
        }
        $raw = @file_get_contents($file);
        if ($raw === false) {
            return null;
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    /**
     * Write a widget result to cache.
     */
    private function writeCache(string $key, array $data): void
    {
        $file = $this->cacheDir . '/' . md5($key) . '.json';
        @file_put_contents(
            $file,
            json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            LOCK_EX,
        );
    }
}
