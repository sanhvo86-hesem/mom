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

    /**
     * Runtime overlay written by the KPI Admin Console. The git-tracked
     * registry above is the structural SSOT; this gitignored overlay carries
     * only Console-editable governance fields (thresholds, owner, cadence,
     * decision/action, counter_metric). A schema-version gate discards a
     * stale overlay when a deploy bumps the seed schema.
     */
    private const KPI_AUTHORITY_REGISTRY_RUNTIME_PATH = __DIR__ . '/../../data/registry/kpi-authority-registry.runtime.json';

    /**
     * Governance KPI fields the Console may override at runtime.
     *
     * The first block is the legacy editable set (Pha 1 + Track 4). The second
     * block (MCS-EXT-1, introduced 2026-05-24) carries Metric Control Schema
     * extension attributes — all OPTIONAL per metric, validated against
     * registry.metric_control_schema_extension enums when present.
     *
     * Forbidden structural fields (canonical_code, formula, data_source,
     * calculation_status, metric_type) are NEVER in this list — they are
     * structural SSOT and enforced by check_kpi_integrity.php P0.12.
     */
    public const CONSOLE_EDITABLE_FIELDS = [
        // Legacy editable fields (Pha 1 + Track 4):
        'thresholds', 'owner_role', 'data_stewardship_role', 'cadence',
        'decision_action', 'action_reference', 'counter_metric',
        'data_contract_gap', 'target_graduation_condition',
        'evidence_source', 'blocking_conditions',
        // MCS-EXT-1 extension fields (optional, enum-validated):
        'metric_subtype', 'control_intent', 'measurement_data_type',
        'scoring_model_detail', 'evaluation_use', 'reward_mode',
        'paired_metric', 'attribution_rule', 'lifecycle_status',
        'sample_policy', 'usage_contexts', 'role_assignments',
    ];

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

    /** Governance KPIs graduated to runtime calculation in Stage 4. */
    public const METRIC_PLAN_ADHERENCE       = 'PLAN_ADHERENCE';
    public const METRIC_WIP_AGING            = 'WIP_AGING';
    public const METRIC_NCR_CLOSURE_AGING    = 'NCR_CLOSURE_AGING';
    public const METRIC_ECO_CLOSURE_AGING    = 'ECO_CLOSURE_AGING';
    public const METRIC_MATERIAL_AVAILABILITY_PLAN = 'MATERIAL_AVAILABILITY_PLAN';
    public const METRIC_INVENTORY_ACCURACY   = 'INVENTORY_ACCURACY';
    public const METRIC_DSO                  = 'DSO';
    public const METRIC_INVOICE_RFT          = 'INVOICE_RFT';
    public const METRIC_INCIDENT_ACTION_CLOSURE_AGING = 'INCIDENT_ACTION_CLOSURE_AGING';

    /** Quality gate KPIs graduated to runtime calculation in Prompt 05. */
    public const METRIC_FAI_FIRST_PASS         = 'FAI_FIRST_PASS';
    public const METRIC_IN_PROCESS_REJECT_RATE = 'IN_PROCESS_REJECT_RATE';

    /** Age thresholds (days) past which an open item counts as aged. */
    private const AGE_DAYS_WIP             = 21;
    private const AGE_DAYS_NCR             = 30;
    private const AGE_DAYS_ECO             = 45;
    private const AGE_DAYS_INCIDENT_ACTION = 30;

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
        self::METRIC_PLAN_ADHERENCE,
        self::METRIC_WIP_AGING,
        self::METRIC_NCR_CLOSURE_AGING,
        self::METRIC_ECO_CLOSURE_AGING,
        self::METRIC_MATERIAL_AVAILABILITY_PLAN,
        self::METRIC_INVENTORY_ACCURACY,
        self::METRIC_DSO,
        self::METRIC_INVOICE_RFT,
        self::METRIC_INCIDENT_ACTION_CLOSURE_AGING,
        self::METRIC_FAI_FIRST_PASS,
        self::METRIC_IN_PROCESS_REJECT_RATE,
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
        self::METRIC_PLAN_ADHERENCE      => 90.0,
        self::METRIC_WIP_AGING           => 5.0,      // ≤ 5% aged WIP
        self::METRIC_NCR_CLOSURE_AGING   => 10.0,     // ≤ 10% aged open NCR
        self::METRIC_ECO_CLOSURE_AGING   => 10.0,     // ≤ 10% aged open ECO
        self::METRIC_MATERIAL_AVAILABILITY_PLAN => 95.0,
        self::METRIC_INVENTORY_ACCURACY  => 98.0,
        self::METRIC_DSO                 => 45.0,     // ≤ 45 days
        self::METRIC_INVOICE_RFT         => 98.0,
        self::METRIC_INCIDENT_ACTION_CLOSURE_AGING => 10.0,
        self::METRIC_FAI_FIRST_PASS         => 95.0,    // ≥ 95% (registry green_point)
        self::METRIC_IN_PROCESS_REJECT_RATE => 1.0,     // ≤ 1% (registry target)
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
        self::METRIC_PLAN_ADHERENCE      => '%',
        self::METRIC_WIP_AGING           => '%',
        self::METRIC_NCR_CLOSURE_AGING   => '%',
        self::METRIC_ECO_CLOSURE_AGING   => '%',
        self::METRIC_MATERIAL_AVAILABILITY_PLAN => '%',
        self::METRIC_INVENTORY_ACCURACY  => '%',
        self::METRIC_DSO                 => 'day',
        self::METRIC_INVOICE_RFT         => '%',
        self::METRIC_INCIDENT_ACTION_CLOSURE_AGING => '%',
        self::METRIC_FAI_FIRST_PASS         => '%',
        self::METRIC_IN_PROCESS_REJECT_RATE => '%',
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
        self::METRIC_WIP_AGING,
        self::METRIC_NCR_CLOSURE_AGING,
        self::METRIC_ECO_CLOSURE_AGING,
        self::METRIC_DSO,
        self::METRIC_INCIDENT_ACTION_CLOSURE_AGING,
        self::METRIC_IN_PROCESS_REJECT_RATE,
    ];

    private Connection $db;
    private ?array $kpiAuthorityRegistry = null;
    /** @var array<string, array{green_point: float, yellow_point: float, target: float, direction: string, unit: string}>|null */
    private ?array $governanceThresholdMap = null;

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

        // Non-runtime (staged / manual) KPI — there is no calc* function. Read
        // the latest manually-entered data point from kpi_manual_inputs (the
        // KPI data-input API writes there). The metric still resolves to a
        // real KpiResult instead of throwing.
        if (!in_array($metricCode, self::ALL_METRICS, true)) {
            return $this->calculateFromManualInput($metricCode, $period);
        }

        $calculator = $this->getCalculator($metricCode);
        $breakdown  = $calculator($period, $filters);

        $value  = (float) ($breakdown['value'] ?? 0.0);
        $target = $this->getKpiTarget($metricCode);
        // $metricCode is guaranteed to be in ALL_METRICS here (non-runtime
        // metrics returned above), so UNITS always has the key.
        $unit   = self::UNITS[$metricCode];
        $status = $this->evaluateStatus($metricCode, $value, $target);

        // Insufficient-data gate: when a calculator reports a sample_size
        // below the registry-declared minimum (formula.min_sample), the
        // ratio is statistically meaningless or the source is still
        // accumulating data. Show grey "insufficient data", never a
        // misleading red/green. Honors prompt 03 min_sample + prompt 04
        // empty-source handling.
        if (array_key_exists('sample_size', $breakdown)) {
            $sampleSize = (int) $breakdown['sample_size'];
            $minSample  = $this->registryMinSample($metricCode);
            if ($sampleSize < max(1, $minSample)) {
                $status = KpiStatus::GREY;
                $breakdown['insufficient_data'] = true;
                $breakdown['insufficient_data_reason'] = $sampleSize === 0
                    ? 'no source data in period — metric is accumulating data'
                    : "sample size {$sampleSize} below minimum {$minSample}";
            }
        }

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
     * Resolve a non-runtime (staged / manual) KPI from its latest manual
     * data point in kpi_manual_inputs. When no input exists the result is
     * grey and carries the input_endpoint so a frontend knows where to POST.
     */
    private function calculateFromManualInput(string $metricCode, DateRange $period): KpiResult
    {
        $rt     = $this->registryGovernanceThresholds($metricCode);
        $unit   = $rt['unit'] ?? (self::UNITS[$metricCode] ?? '%');
        $target = $this->getKpiTarget($metricCode);

        // Resolve the registry metric so we can honor calculation_status.
        // For staged_data_contract / data_contract_required metrics the value
        // field MUST be suppressed even if a manual_input row exists — the
        // metric is not yet a contracted data source, so any numeric value is
        // by definition pre-contract noise. dashboard_render_contract.
        // render_rules.staged_data_contract codifies this.
        $support  = $this->describeMetricSupport($metricCode);
        $metric   = is_array($support['metric'] ?? null) ? $support['metric'] : [];
        $calcStat = (string) ($metric['calculation_status']
            ?? $support['calculation_status']
            ?? $support['backend_status']
            ?? '');
        $isStaged = in_array($calcStat, ['staged_data_contract', 'data_contract_required'], true);

        $row = null;
        try {
            $row = $this->db->queryOne(
                "SELECT value, unit, breakdown, input_status, entered_at, entered_by
                 FROM kpi_manual_inputs
                 WHERE metric_code = :code
                   AND input_status <> 'superseded'
                   AND period_start >= :s AND period_end <= :e
                 ORDER BY period_end DESC, entered_at DESC
                 LIMIT 1",
                [':code' => $metricCode, ':s' => $period->start, ':e' => $period->end],
            );
        } catch (\Throwable) {
            $row = null;
        }

        if ($row === null) {
            // Staged/manual metric with no input → SUPPRESS the value (return
            // 0 in the struct for backward compat but flag insufficient_data
            // so dashboard renderers honoring dashboard_render_contract.
            // render_rules.staged_data_contract hide the number).
            return new KpiResult(
                metricCode:   $metricCode,
                value:        0.0,
                unit:         $unit,
                target:       $target,
                status:       KpiStatus::GREY,
                breakdown:    [
                    'value'                    => 0,
                    'value_suppressed'         => true,
                    'no_manual_input'          => true,
                    'insufficient_data'        => true,
                    'insufficient_data_reason' => 'no manual input for this period — '
                        . 'staged/manual metric awaiting input',
                    'data_source'              => 'manual_input',
                    'input_endpoint'           => $this->inputEndpoint($metricCode),
                    'note'                     => 'No manual input for this period — the KPI '
                        . 'data-input endpoint is wired and waiting for a frontend POST.',
                ],
                periodStart:  $period->start,
                periodEnd:    $period->end,
                calculatedAt: gmdate('c'),
            );
        }

        $value      = (float) $row['value'];
        $inputStat  = (string) ($row['input_status'] ?? '');
        // manual_input_contract.reward_gate: only 'verified' counts toward
        // reward. The DB CHECK constraint in migration 196 physically limits
        // input_status to {draft, submitted, verified, superseded} — there is
        // no 'approved' / 'pending_review' status in the DB. 'verified' is the
        // post-approval state set by DashboardController.kpiInputApprove after
        // separation-of-duties is enforced (approver != entered_by).
        $isVerified = ($inputStat === 'verified');
        $isPending  = !$isVerified; // covers draft / submitted / empty
        $status     = $this->evaluateStatus($metricCode, $value, $target);
        // Pending input MUST NOT show as solid green/red — render grey so the
        // operator sees the status badge instead of a tradeable RAG colour.
        if ($isPending) {
            $status = KpiStatus::GREY;
        }

        // Staged / data_contract_required metric: ALWAYS suppress the value,
        // even with an existing manual_input row. The dashboard render rule
        // for staged_data_contract requires the numeric value to be hidden;
        // only the badge + data_contract_gap may render.
        if ($isStaged) {
            return new KpiResult(
                metricCode:   $metricCode,
                value:        0.0,
                unit:         (string) ($row['unit'] ?? '') !== '' ? (string) $row['unit'] : $unit,
                target:       $target,
                status:       KpiStatus::GREY,
                breakdown:    [
                    'value'                    => null,
                    'value_suppressed'         => true,
                    'insufficient_data'        => true,
                    'insufficient_data_reason' => 'metric_staged_data_contract_value_suppressed',
                    'calculation_status'       => $calcStat,
                    'data_source'              => 'manual_input',
                    'input_status'             => $row['input_status'] ?? null,
                    'input_pending_review'     => $isPending,
                    'reward_eligible_input'    => false,
                    'entered_by'               => $row['entered_by'] ?? null,
                    'entered_at'               => $row['entered_at'] ?? null,
                ],
                periodStart:  $period->start,
                periodEnd:    $period->end,
                calculatedAt: gmdate('c'),
            );
        }

        return new KpiResult(
            metricCode:   $metricCode,
            value:        $value,
            unit:         (string) ($row['unit'] ?? '') !== '' ? (string) $row['unit'] : $unit,
            target:       $target,
            status:       $status,
            breakdown:    [
                'value'                  => $value,
                'data_source'            => 'manual_input',
                'input_status'           => $row['input_status'] ?? null,
                'input_pending_review'   => $isPending,
                'reward_eligible_input'  => $isVerified,
                'entered_by'             => $row['entered_by'] ?? null,
                'entered_at'             => $row['entered_at'] ?? null,
            ],
            periodStart:  $period->start,
            periodEnd:    $period->end,
            calculatedAt: gmdate('c'),
        );
    }

    /** Action-route a frontend uses to POST a manual data point for a KPI. */
    public function inputEndpoint(string $metricCode): string
    {
        return 'POST /api/kpi/' . strtoupper(trim($metricCode)) . '/input';
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
     * Return the governed KPI catalog with backend calculation coverage.
     *
     * @return array<string, mixed>
     */
    public function getMetricCatalog(): array
    {
        $registry = $this->loadKpiAuthorityRegistry();
        $aliases = $this->registryAliases($registry);
        $catalog = [];

        foreach (self::ALL_METRICS as $code) {
            $this->upsertCatalogMetric($catalog, $code, 'runtime_calculated_metrics', [
                'backend_status' => 'runtime_calculated',
                'runtime_calculated' => true,
            ], $aliases);
        }

        foreach ($this->registryRows($registry, 'annex122_governance_kpis') as $row) {
            $code = $this->codeField($row, 'canonical_code');
            if ($code === '') {
                continue;
            }
            $this->upsertCatalogMetric($catalog, $code, 'annex122_governance_kpis', [
                'name' => $this->stringField($row, 'name'),
                'name_vi' => $this->stringField($row, 'name_vi'),
                'tier' => $this->stringField($row, 'tier'),
                'layer' => $this->stringField($row, 'layer'),
                'registry_status' => $this->stringField($row, 'status'),
                'registry_calculation_status' => $this->stringField($row, 'calculation_status'),
                'annex122_no' => $row['no'] ?? null,
                'purpose' => $this->stringField($row, 'purpose'),
                'formula' => is_array($row['formula'] ?? null) ? $row['formula'] : null,
                'thresholds' => is_array($row['thresholds'] ?? null) ? $row['thresholds'] : null,
                'registry_data_source' => is_array($row['data_source'] ?? null) ? $row['data_source'] : null,
                'owner_role' => $this->stringField($row, 'owner_role'),
                'data_stewardship_role' => $this->stringField($row, 'data_stewardship_role'),
                'cadence' => $this->stringField($row, 'cadence'),
                'lead_or_lag' => $this->stringField($row, 'lead_or_lag'),
                'paired_metric' => $this->stringField($row, 'paired_metric'),
                'decision_action' => $this->stringField($row, 'decision_action'),
                'action_reference' => $this->stringField($row, 'action_reference'),
                'attribution_rule' => $this->stringField($row, 'attribution_rule'),
                'data_contract_gap' => $this->stringField($row, 'data_contract_gap'),
                'target_graduation_condition' => $this->stringField($row, 'target_graduation_condition'),
                'evidence_source' => $this->stringField($row, 'evidence_source'),
                'blocking_conditions' => $this->arrayField($row, 'blocking_conditions'),
                'registry_counter_metric' => is_array($row['counter_metric'] ?? null)
                    ? $row['counter_metric'] : null,
                'reward_eligible' => $row['reward_eligible'] ?? null,
                // MCS-EXT-1 passthrough — null/empty when metric not enriched yet.
                'metric_subtype' => $this->stringField($row, 'metric_subtype'),
                'control_intent' => $this->stringField($row, 'control_intent'),
                'measurement_data_type' => $this->stringField($row, 'measurement_data_type'),
                'scoring_model_detail' => $this->stringField($row, 'scoring_model_detail'),
                'evaluation_use' => $this->stringField($row, 'evaluation_use'),
                'reward_mode' => $this->stringField($row, 'reward_mode'),
                'lifecycle_status' => $this->stringField($row, 'lifecycle_status'),
                'sample_policy' => is_array($row['sample_policy'] ?? null) ? $row['sample_policy'] : null,
                'usage_contexts' => $this->arrayField($row, 'usage_contexts'),
	                'role_assignments' => is_array($row['role_assignments'] ?? null)
	                    ? $row['role_assignments'] : [],
	                'lam_profile_link' => $this->stringField($row, 'lam_profile_link'),
	                'customer_profile_link' => $this->stringField($row, 'customer_profile_link'),
	                'applicability_rule' => $this->stringField($row, 'applicability_rule'),
	                'hold_release_rule' => $this->stringField($row, 'hold_release_rule'),
	                'controllability_scope' => $this->stringField($row, 'controllability_scope'),
	                'action_when_red' => $this->stringField($row, 'action_when_red'),
	                'components' => is_array($row['components'] ?? null) ? $row['components'] : [],
	                'required_evidence' => $this->arrayField($row, 'required_evidence'),
	            ], $aliases);
	        }

        foreach ($this->registryRows($registry, 'proposed_operating_metrics') as $row) {
            $code = $this->codeField($row, 'canonical_code');
            if ($code === '') {
                continue;
            }
            $this->upsertCatalogMetric($catalog, $code, 'proposed_operating_metrics', [
                'name' => $this->stringField($row, 'name'),
                'name_vi' => $this->stringField($row, 'name_vi'),
                'layer' => $this->stringField($row, 'layer'),
                'registry_status' => $this->stringField($row, 'status'),
                'registry_calculation_status' => $this->stringField($row, 'calculation_status'),
                'thresholds' => is_array($row['thresholds'] ?? null) ? $row['thresholds'] : null,
                'owner_role' => $this->stringField($row, 'owner_role'),
                'cadence' => $this->stringField($row, 'cadence'),
                'decision_action' => $this->stringField($row, 'decision_action'),
                'data_contract_gap' => $this->stringField($row, 'data_contract_gap'),
                'target_graduation_condition' => $this->stringField($row, 'target_graduation_condition'),
                'evidence_source' => $this->stringField($row, 'evidence_source'),
                'blocking_conditions' => $this->arrayField($row, 'blocking_conditions'),
                'registry_counter_metric' => is_array($row['counter_metric'] ?? null)
                    ? $row['counter_metric'] : null,
                // MCS-EXT-1 passthrough — null/empty when metric not enriched yet.
                'metric_subtype' => $this->stringField($row, 'metric_subtype'),
                'control_intent' => $this->stringField($row, 'control_intent'),
                'measurement_data_type' => $this->stringField($row, 'measurement_data_type'),
                'scoring_model_detail' => $this->stringField($row, 'scoring_model_detail'),
                'evaluation_use' => $this->stringField($row, 'evaluation_use'),
                'reward_mode' => $this->stringField($row, 'reward_mode'),
                'lifecycle_status' => $this->stringField($row, 'lifecycle_status'),
                'sample_policy' => is_array($row['sample_policy'] ?? null) ? $row['sample_policy'] : null,
                'usage_contexts' => $this->arrayField($row, 'usage_contexts'),
	                'role_assignments' => is_array($row['role_assignments'] ?? null)
	                    ? $row['role_assignments'] : [],
	                'lam_profile_link' => $this->stringField($row, 'lam_profile_link'),
	                'customer_profile_link' => $this->stringField($row, 'customer_profile_link'),
	                'applicability_rule' => $this->stringField($row, 'applicability_rule'),
	                'paired_metric' => $this->stringField($row, 'paired_metric'),
	                'attribution_rule' => $this->stringField($row, 'attribution_rule'),
	                'gate' => $this->stringField($row, 'gate'),
	                'linked_cdr' => is_array($row['linked_cdr'] ?? null) ? $row['linked_cdr'] : null,
	                'gate_pass_condition' => $this->stringField($row, 'gate_pass_condition'),
	                'hold_release_rule' => $this->stringField($row, 'hold_release_rule'),
	                'controllability_scope' => $this->stringField($row, 'controllability_scope'),
	                'action_when_red' => $this->stringField($row, 'action_when_red'),
	                'components' => is_array($row['components'] ?? null) ? $row['components'] : [],
	                'required_evidence' => $this->arrayField($row, 'required_evidence'),
	            ], $aliases);
	        }

        foreach ($this->registryStringList($registry, 'executive_scorecard') as $code) {
            $this->upsertCatalogMetric($catalog, $code, 'executive_scorecard', [], $aliases);
        }

        foreach ($this->registryRows($registry, 'dashboard_core_kpis') as $row) {
            $code = $this->codeField($row, 'canonical_code');
            if ($code === '') {
                continue;
            }
            $this->upsertCatalogMetric($catalog, $code, 'dashboard_core_kpis', [
                'name' => $this->stringField($row, 'name'),
                'local_id' => $this->stringField($row, 'local_id'),
                'declared_backend_status' => $this->stringField($row, 'backend_status'),
                'primary_endpoint' => $this->stringField($row, 'primary_endpoint'),
            ], $aliases);
        }

        foreach ($this->registryRows($registry, 'gate_control_metrics') as $row) {
            $code = $this->codeField($row, 'canonical_code');
            if ($code === '') {
                continue;
            }
            $this->upsertCatalogMetric($catalog, $code, 'gate_control_metrics', [
                'name' => $this->stringField($row, 'name'),
                'local_id' => $this->stringField($row, 'local_id'),
                'classification' => $this->stringField($row, 'classification'),
                'gate' => $this->stringField($row, 'gate'),
                'linked_cdr' => is_array($row['linked_cdr'] ?? null) ? $row['linked_cdr'] : null,
                'gate_pass_condition' => $this->stringField($row, 'gate_pass_condition'),
                'registry_calculation_status' => $this->stringField($row, 'calculation_status'),
                'thresholds' => is_array($row['thresholds'] ?? null) ? $row['thresholds'] : null,
                'owner_role' => $this->stringField($row, 'owner_role'),
                'cadence' => $this->stringField($row, 'cadence'),
                'data_contract_gap' => $this->stringField($row, 'data_contract_gap'),
                'target_graduation_condition' => $this->stringField($row, 'target_graduation_condition'),
                'evidence_source' => $this->stringField($row, 'evidence_source'),
                'blocking_conditions' => $this->arrayField($row, 'blocking_conditions'),
                'registry_counter_metric' => is_array($row['counter_metric'] ?? null)
                    ? $row['counter_metric'] : null,
                // MCS-EXT-1 passthrough for gate metrics.
                'metric_subtype' => $this->stringField($row, 'metric_subtype'),
                'control_intent' => $this->stringField($row, 'control_intent'),
                'measurement_data_type' => $this->stringField($row, 'measurement_data_type'),
                'scoring_model_detail' => $this->stringField($row, 'scoring_model_detail'),
                'evaluation_use' => $this->stringField($row, 'evaluation_use'),
                'reward_mode' => $this->stringField($row, 'reward_mode'),
                'lifecycle_status' => $this->stringField($row, 'lifecycle_status'),
                'sample_policy' => is_array($row['sample_policy'] ?? null) ? $row['sample_policy'] : null,
                'usage_contexts' => $this->arrayField($row, 'usage_contexts'),
	                'role_assignments' => is_array($row['role_assignments'] ?? null)
	                    ? $row['role_assignments'] : [],
	                'lam_profile_link' => $this->stringField($row, 'lam_profile_link'),
	                'customer_profile_link' => $this->stringField($row, 'customer_profile_link'),
	                'applicability_rule' => $this->stringField($row, 'applicability_rule'),
	                'paired_metric' => $this->stringField($row, 'paired_metric'),
	                'attribution_rule' => $this->stringField($row, 'attribution_rule'),
	                'hold_release_rule' => $this->stringField($row, 'hold_release_rule'),
	                'components' => is_array($row['components'] ?? null) ? $row['components'] : [],
	                'required_evidence' => $this->arrayField($row, 'required_evidence'),
	            ], $aliases);
	        }

        $this->enrichCatalogGovernance($catalog, $registry);
        ksort($catalog);
        $jdScorecards = $this->jdScorecards();
        $gateCoverage = $this->gateCoverage($registry);
        $integrityStatus = $this->catalogIntegrityStatus($registry, $catalog);

        return [
            'registry_id' => is_string($registry['registry_id'] ?? null) ? $registry['registry_id'] : null,
            'registry_version' => is_string($registry['version'] ?? null) ? $registry['version'] : null,
            'schema_version' => $this->registrySchemaVersion(),
            'registry_schema_version' => $this->registrySchemaVersion(),
            'authority_rule' => is_string($registry['authority_rule'] ?? null) ? $registry['authority_rule'] : null,
            'metric_types' => [
                'kpi',
                'operating_metric',
                'gate_control_metric',
                'role_performance_measure',
                'health_indicator',
                'counter_metric',
            ],
            'counts' => [
                'runtime_calculated_metrics' => count(self::ALL_METRICS),
                'known_metric_codes' => count($catalog),
                'legacy_aliases' => count($aliases),
                'annex122_governance_kpis' => count($this->registryRows($registry, 'annex122_governance_kpis')),
                'dashboard_core_kpis' => count($this->registryRows($registry, 'dashboard_core_kpis')),
                'gate_control_metrics' => count($this->registryRows($registry, 'gate_control_metrics')),
                'proposed_operating_metrics' => count($this->registryRows($registry, 'proposed_operating_metrics')),
            ],
            'runtime_calculated_metrics' => self::ALL_METRICS,
            'executive_scorecard' => $this->registryStringList($registry, 'executive_scorecard'),
            'legacy_aliases' => $aliases,
            'data_contract_required_fields' => $this->registryStringList($registry, 'data_contract_required_fields', false),
            'role_measure_policy' => is_array($registry['role_measure_policy'] ?? null) ? $registry['role_measure_policy'] : [],
            'performance_governance_policy' => is_array($registry['performance_governance_policy'] ?? null) ? $registry['performance_governance_policy'] : [],
            'change_control_policy' => is_array($registry['change_control_policy'] ?? null) ? $registry['change_control_policy'] : [],
            'metric_governance_schema' => is_array($registry['metric_governance_schema'] ?? null) ? $registry['metric_governance_schema'] : [],
            'metric_governance_defaults' => is_array($registry['metric_governance_defaults'] ?? null) ? $registry['metric_governance_defaults'] : [],
            'scorecard_operating_model' => is_array($registry['scorecard_operating_model'] ?? null) ? $registry['scorecard_operating_model'] : [],
            'customer_ncr_severity_matrix' => is_array($registry['customer_ncr_severity_matrix'] ?? null) ? $registry['customer_ncr_severity_matrix'] : [],
            'customer_ncr_data_contract' => is_array($registry['customer_ncr_data_contract'] ?? null) ? $registry['customer_ncr_data_contract'] : [],
            'bonus_simulation_model' => is_array($registry['bonus_simulation_model'] ?? null) ? $registry['bonus_simulation_model'] : [],
            'quality_escape_dashboard_contract' => is_array($registry['quality_escape_dashboard_contract'] ?? null) ? $registry['quality_escape_dashboard_contract'] : [],
            'document_audit' => is_array($registry['document_audit'] ?? null) ? $registry['document_audit'] : [],
            'performance_governance_audit' => is_array($registry['performance_governance_audit'] ?? null) ? $registry['performance_governance_audit'] : [],
            'jd_scorecards' => $jdScorecards,
            'gate_coverage' => $gateCoverage,
            'integrity_status' => $integrityStatus,
            'metrics' => array_values($catalog),
        ];
    }

    /**
     * Describe whether a metric is known and whether KpiEngine can calculate it now.
     *
     * @return array<string, mixed>
     */
    public function describeMetricSupport(string $metricCode): array
    {
        $requestedCode = strtoupper(trim($metricCode));
        $canonicalCode = $this->normalizeMetricCode($requestedCode);
        $catalog = $this->getMetricCatalog();
        $metric = null;

        foreach (($catalog['metrics'] ?? []) as $row) {
            if (is_array($row) && ($row['canonical_code'] ?? null) === $canonicalCode) {
                $metric = $row;
                break;
            }
        }

        $runtimeCalculated = in_array($canonicalCode, self::ALL_METRICS, true);
        // A counter-metric code (<KPI>-CTR) is a governed metric too — it
        // owns a data-input endpoint so the frontend can feed it 1:1.
        $counterCodes = $this->counterMetricCodes();
        $isCounter = isset($counterCodes[$canonicalCode]);
        $knownMetric = $metric !== null || $runtimeCalculated || $isCounter;
        $backendStatus = $runtimeCalculated
            ? 'runtime_calculated'
            : ($isCounter ? 'counter_metric_manual'
                : ($knownMetric ? 'data_contract_required' : 'unknown_metric'));
        if (is_array($metric) && is_string($metric['calculation_status'] ?? null)) {
            $backendStatus = $metric['calculation_status'];
        }

        return [
            'requested_code' => $requestedCode,
            'canonical_code' => $canonicalCode,
            'alias_normalized' => $requestedCode !== $canonicalCode,
            'known_metric' => $knownMetric,
            'runtime_calculated' => $runtimeCalculated,
            'is_counter_metric' => $isCounter,
            'backend_status' => $backendStatus,
            'calculation_status' => $backendStatus,
            'metric_type' => is_array($metric) ? ($metric['metric_type'] ?? null) : null,
            'is_official_kpi' => is_array($metric) ? ($metric['is_official_kpi'] ?? null) : null,
            'evaluation_use' => is_array($metric) ? ($metric['evaluation_use'] ?? null) : null,
            'consequence' => is_array($metric) ? ($metric['consequence'] ?? null) : null,
            'metric' => $metric,
        ];
    }

    /**
     * Every dedicated counter-metric code → its definition object. Each KPI
     * owns exactly one counter-metric with a unique code (<KPI>-CTR) and a
     * data-input endpoint, so the frontend addresses them 1:1.
     *
     * @return array<string, array<string, mixed>>
     */
    public function counterMetricCodes(): array
    {
        $registry = $this->loadKpiAuthorityRegistry();
        $out = [];
        foreach (['annex122_governance_kpis', 'gate_control_metrics',
                  'proposed_operating_metrics'] as $section) {
            foreach (($registry[$section] ?? []) as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $cm = $row['counter_metric'] ?? null;
                if (is_array($cm) && trim((string) ($cm['code'] ?? '')) !== '') {
                    $out[strtoupper(trim((string) $cm['code']))] = $cm;
                }
            }
        }
        return $out;
    }

    /**
     * Threshold-badge catalog — every governed KPI code mapped to its numeric
     * thresholds and metadata. The ANNEX live RAG-badge renderer hydrates the
     * xanh/vàng/đỏ boxes embedded in controlled documents from this, so a
     * reader can tell a system-linked KPI (badge present, bound to the
     * Authority registry) from a hardcoded one (no badge). Reads the registry
     * with the runtime overlay applied, so Console edits and added KPIs show.
     *
     * @return array<string, array<string, mixed>>
     */
    public function kpiThresholdBadges(): array
    {
        $registry = $this->loadKpiAuthorityRegistry();
        $sections = [
            'annex122_governance_kpis'   => 'governance',
            'gate_control_metrics'       => 'gate',
            'proposed_operating_metrics' => 'proposed',
        ];
        $out = [];
        foreach ($sections as $section => $group) {
            foreach (($registry[$section] ?? []) as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
                // Governance is iterated first — the canonical row wins; a
                // gate/proposed row sharing the code does not overwrite it.
                if ($code === '' || isset($out[$code])) {
                    continue;
                }
                $t = is_array($row['thresholds'] ?? null) ? $row['thresholds'] : [];
                if (!isset($t['green_point'], $t['yellow_point'])
                    || !is_numeric($t['green_point']) || !is_numeric($t['yellow_point'])) {
                    continue;
                }
                $out[$code] = [
                    'code'               => $code,
                    'group'              => $group,
                    'name_vi'            => (string) ($row['name_vi'] ?? ''),
                    'direction'          => (string) ($t['direction'] ?? 'higher_is_better'),
                    'unit'               => (string) ($t['unit'] ?? ''),
                    'green_point'        => (float) $t['green_point'],
                    'yellow_point'       => (float) $t['yellow_point'],
                    'target'             => isset($t['target']) && is_numeric($t['target'])
                        ? (float) $t['target'] : null,
                    'calculation_status' => (string) ($row['calculation_status']
                        ?? ($row['status'] ?? '')),
                    'counter_metric'     => $row['counter_metric'] ?? null,
                    'retired'            => ($row['retired'] ?? false) === true,
                ];
            }
        }
        return $out;
    }

    /**
     * Per-JD weighted KPI scorecards, enriched for document rendering — each
     * scorecard item carries the KPI's name, numeric thresholds, status and
     * counter-metric code resolved from the registry. The JD-scorecard
     * renderer (13-jd-scorecard-renderer.js) hydrates the §KPI section of
     * every job-description document from this.
     *
     * @return array<string, mixed>
     */
    public function jdScorecards(): array
    {
        $registry = $this->loadKpiAuthorityRegistry();
        $roles = $registry['jd_kpi_scorecards']['roles'] ?? null;
        if (!is_array($roles)) {
            return ['roles' => []];
        }
        // canonical code → display metadata
        $meta = [];
        foreach (['annex122_governance_kpis', 'gate_control_metrics',
                  'proposed_operating_metrics'] as $section) {
            foreach (($registry[$section] ?? []) as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
                if ($code === '' || isset($meta[$code])) {
                    continue;
                }
                $cm = $row['counter_metric'] ?? null;
                $meta[$code] = [
                    'name_vi'            => (string) ($row['name_vi'] ?? ''),
                    'name'               => (string) ($row['name'] ?? ''),
                    'thresholds'         => is_array($row['thresholds'] ?? null)
                        ? $row['thresholds'] : null,
                    'calculation_status' => (string) ($row['calculation_status']
                        ?? ($row['status'] ?? '')),
                    'tier'               => (string) ($row['tier'] ?? ''),
                    'counter_code'       => is_array($cm)
                        ? (string) ($cm['code'] ?? '') : '',
                    'metric_type'        => (string) ($row['metric_type'] ?? ''),
                    'evidence_source'    => (string) ($row['evidence_source'] ?? ''),
                    'blocking_conditions'=> is_array($row['blocking_conditions'] ?? null)
                        ? $row['blocking_conditions'] : [],
                ];
            }
        }
        $out = [];
        foreach ($roles as $roleCode => $card) {
            if (!is_array($card)) {
                continue;
            }
            $rawActive = is_array($card['active_scorecard'] ?? null)
                ? $card['active_scorecard']
                : (is_array($card['scorecard'] ?? null) ? $card['scorecard'] : []);
            $items = [];
            foreach ($rawActive as $it) {
                if (!is_array($it)) {
                    continue;
                }
                $code = strtoupper(trim((string) ($it['kpi_code'] ?? '')));
                $m = $meta[$code] ?? [];
                $calcStatus = (string) ($m['calculation_status'] ?? '');
                $defaultScoreStatus = in_array($calcStatus, ['staged_data_contract', 'data_contract_required'], true)
                    ? 'candidate_data_contract'
                    : 'active_runtime_or_manual';
                $items[] = [
                    'kpi_code'           => $code,
                    'mapped_canonical_metric' => (string) ($it['mapped_canonical_metric'] ?? $code),
                    'measure_type'       => (string) ($it['measure_type'] ?? ($m['metric_type'] ?? 'role_performance_measure')),
                    'weight'             => (int) ($it['weight'] ?? 0),
                    'rationale'          => (string) ($it['rationale'] ?? ''),
                    'name_vi'            => $m['name_vi'] ?? '',
                    'thresholds'         => $m['thresholds'] ?? null,
                    'calculation_status' => $calcStatus,
                    'counter_code'       => $m['counter_code'] ?? '',
                    'scorecard_scoring_status' => (string) ($it['scorecard_scoring_status'] ?? $defaultScoreStatus),
                    'scorecard_contributes_to_reward' => (bool) ($it['scorecard_contributes_to_reward'] ?? false),
                    'evidence_source'    => (string) ($it['evidence_source'] ?? ($m['evidence_source'] ?? '')),
                    'controllability_scope' => (string) ($it['controllability_scope'] ?? ''),
                    'blocking_conditions'=> is_array($it['blocking_conditions'] ?? null)
                        ? $it['blocking_conditions'] : ($m['blocking_conditions'] ?? []),
                ];
            }
            $candidateBank = is_array($card['candidate_bank'] ?? null) ? $card['candidate_bank'] : [];
            $optionalRotate = is_array($card['optional_rotate'] ?? null) ? $card['optional_rotate'] : [];
            $doNotUse = is_array($card['do_not_use'] ?? null) ? $card['do_not_use'] : [];
            $out[strtoupper((string) $roleCode)] = [
                'role_code' => (string) ($card['role_code'] ?? $roleCode),
                'jd_title_vi' => (string) ($card['jd_title_vi'] ?? ''),
                'jd_file' => (string) ($card['jd_file'] ?? ''),
                'model' => is_array($card['active_scorecard'] ?? null) ? 'active_candidate' : 'legacy_scorecard_projection',
                'recommended_active_count' => (int) ($card['recommended_active_count'] ?? count($items)),
                'active_measure_count' => count($items),
                'active_scorecard' => $items,
                'scorecard' => $items,
                'candidate_bank' => $candidateBank,
                'optional_rotate' => $optionalRotate,
                'do_not_use' => $doNotUse,
                'fairness_notes' => is_array($card['fairness_notes'] ?? null) ? $card['fairness_notes'] : [],
            ];
        }
        return ['roles' => $out];
    }

    public function isRuntimeCalculatedMetric(string $metricCode): bool
    {
        return in_array($this->normalizeMetricCode($metricCode), self::ALL_METRICS, true);
    }

    public function isKnownMetricCode(string $metricCode): bool
    {
        return (bool) ($this->describeMetricSupport($metricCode)['known_metric'] ?? false);
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

        // The registry numeric threshold is the SSOT target for a governance KPI.
        $rt = $this->registryGovernanceThresholds($metricCode);
        if ($rt !== null) {
            return $rt['target'];
        }

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

        // Stamp the registry schema version onto the snapshot so a later
        // schema bump (changed formula/threshold definitions) can gate this
        // structurally stale row out of trend reads.
        $meta = $result->breakdown;
        $meta['schema_version'] = $this->registrySchemaVersion();

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
                ':meta'   => json_encode($meta, JSON_UNESCAPED_UNICODE),
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
     * OEE = Availability x Performance x Quality.
     *
     * Source: mes_oee_snapshots (migration 025_mes_tables.sql) — one row per
     * equipment per snapshot_date per shift_code, with planned/run/downtime/
     * setup all in seconds and good/total pieces in counts. We compute the
     * three sub-factors from raw seconds/pieces (NOT averaging the per-row
     * generated `oee` column — averaging ratios is statistically wrong).
     *
     * Prompt 05 phantom-table fix: previous implementation queried
     * `equipment_logs` which has no migration (P04 finding).
     */
    private function calcOee(DateRange $period, array $filters): array
    {
        $where  = $this->buildOeeSnapshotWhereClause($filters);
        $params = [':s' => $period->start, ':e' => $period->end];

        $row = $this->db->queryOne(
            "SELECT
                COUNT(*)                                              AS sample_size,
                COALESCE(SUM(planned_production_time_sec), 0)         AS planned_sec,
                COALESCE(SUM(actual_run_time_sec), 0)                 AS run_sec,
                COALESCE(SUM(downtime_sec), 0)                        AS downtime_sec,
                COALESCE(SUM(total_pieces), 0)                        AS total_pieces,
                COALESCE(SUM(good_pieces), 0)                         AS good_pieces,
                COALESCE(SUM(ideal_cycle_time_sec * total_pieces), 0) AS ideal_run_sec
             FROM mes_oee_snapshots
             WHERE snapshot_date BETWEEN :s AND :e {$where}",
            $params,
        );

        $sample      = (int)   ($row['sample_size']   ?? 0);
        $plannedSec  = (float) ($row['planned_sec']   ?? 0);
        $runSec      = (float) ($row['run_sec']       ?? 0);
        $downtimeSec = (float) ($row['downtime_sec']  ?? 0);
        $totalPieces = (float) ($row['total_pieces']  ?? 0);
        $goodPieces  = (float) ($row['good_pieces']   ?? 0);
        $idealRunSec = (float) ($row['ideal_run_sec'] ?? 0);

        if ($sample === 0) {
            return [
                'value'              => 0.0,
                'sample_size'        => 0,
                'numerator_quality'  => 0.0,
                'denominator_quality'=> 0.0,
                'breakdown'          => [],
                'empty_result'       => true,
                'data_source'        => 'mes_oee_snapshots',
            ];
        }

        $dataQualityFlags = [];

        $availability = $plannedSec > 0
            ? (($plannedSec - $downtimeSec) / $plannedSec) * 100
            : 0.0;
        $performanceRaw = $runSec > 0 && $idealRunSec > 0
            ? ($idealRunSec / $runSec) * 100
            : 0.0;
        // Cap Performance at 100% — values > 100% indicate ideal_cycle_time
        // drift (machine running faster than declared standard); flag it so
        // the data steward can recalibrate the standard rather than allowing
        // OEE > 100%.
        $performance = min(100.0, $performanceRaw);
        if ($performanceRaw > 100.0) {
            $dataQualityFlags[] = 'performance_above_100_ideal_cycle_drift';
        }
        $quality      = $totalPieces > 0
            ? ($goodPieces / $totalPieces) * 100
            : 0.0;

        if ($idealRunSec <= 0) {
            $dataQualityFlags[] = 'missing_ideal_cycle_time';
        }
        if ($totalPieces <= 0) {
            $dataQualityFlags[] = 'missing_piece_counts';
        }

        $oee = ($availability / 100) * ($performance / 100) * ($quality / 100) * 100;

        // Breakdown by equipment_id (top contributors).
        $breakdown = [];
        try {
            $rows = $this->db->query(
                "SELECT equipment_id AS key,
                        COUNT(*) AS count,
                        AVG(oee) * 100 AS value
                 FROM mes_oee_snapshots
                 WHERE snapshot_date BETWEEN :s AND :e {$where}
                 GROUP BY equipment_id
                 ORDER BY value ASC
                 LIMIT 10",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown[] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }
        } catch (\Throwable) {
            // Breakdown is best-effort.
        }

        return [
            'value'              => round($oee, 2),
            'sample_size'        => $sample,
            'numerator_quality'  => round($goodPieces, 2),
            'denominator_quality'=> round($totalPieces, 2),
            'availability'       => round($availability, 2),
            'performance'        => round($performance, 2),
            'quality'            => round($quality, 2),
            'planned_sec'        => round($plannedSec, 2),
            'run_sec'            => round($runSec, 2),
            'downtime_sec'       => round($downtimeSec, 2),
            'good_pieces'        => $goodPieces,
            'total_pieces'       => $totalPieces,
            'breakdown'          => $breakdown,
            'data_source'        => 'mes_oee_snapshots',
            'data_quality_flags' => $dataQualityFlags,
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

        return ['value' => round($pct, 2), 'sample_size' => $total, 'on_time' => $onTime, 'total' => $total];
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
     * Machine Utilization = SUM(actual_run_time_sec) / SUM(planned_production_time_sec) x 100.
     *
     * Source: mes_oee_snapshots (migration 025_mes_tables.sql).
     * Prompt 05 phantom-table fix: previous code queried `equipment_logs`
     * which has no migration.
     */
    private function calcMachineUtil(DateRange $period, array $filters): array
    {
        $where  = $this->buildOeeSnapshotWhereClause($filters);
        $params = [':s' => $period->start, ':e' => $period->end];

        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS sample_size,
                COALESCE(SUM(actual_run_time_sec), 0)         AS run_sec,
                COALESCE(SUM(planned_production_time_sec), 0) AS planned_sec
             FROM mes_oee_snapshots
             WHERE snapshot_date BETWEEN :s AND :e {$where}",
            $params,
        );

        $sample     = (int)   ($row['sample_size'] ?? 0);
        $runSec     = (float) ($row['run_sec']     ?? 0);
        $plannedSec = (float) ($row['planned_sec'] ?? 0);

        if ($sample === 0) {
            return [
                'value'        => 0.0,
                'sample_size'  => 0,
                'numerator'    => 0.0,
                'denominator'  => 0.0,
                'breakdown'    => [],
                'empty_result' => true,
                'data_source'  => 'mes_oee_snapshots',
            ];
        }

        $pct = $plannedSec > 0 ? ($runSec / $plannedSec) * 100 : 0.0;

        $breakdown = [];
        try {
            $rows = $this->db->query(
                "SELECT equipment_id AS key,
                        COUNT(*) AS count,
                        CASE WHEN SUM(planned_production_time_sec) > 0
                             THEN (SUM(actual_run_time_sec) / SUM(planned_production_time_sec)) * 100
                             ELSE 0 END AS value
                 FROM mes_oee_snapshots
                 WHERE snapshot_date BETWEEN :s AND :e {$where}
                 GROUP BY equipment_id
                 ORDER BY value ASC
                 LIMIT 10",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown[] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }
        } catch (\Throwable) {
            // best-effort
        }

        return [
            'value'        => round($pct, 2),
            'sample_size'  => $sample,
            'numerator'    => round($runSec, 2),
            'denominator'  => round($plannedSec, 2),
            'run_sec'      => round($runSec, 2),
            'planned_sec'  => round($plannedSec, 2),
            'breakdown'    => $breakdown,
            'data_source'  => 'mes_oee_snapshots',
        ];
    }

    /**
     * Setup Time Ratio = SUM(setup_time_sec) / SUM(planned_production_time_sec) x 100.
     *
     * Source: mes_oee_snapshots (migration 025_mes_tables.sql).
     * Prompt 05 phantom-table fix: previous code queried `equipment_logs`.
     */
    private function calcSetupRatio(DateRange $period, array $filters): array
    {
        $where  = $this->buildOeeSnapshotWhereClause($filters);
        $params = [':s' => $period->start, ':e' => $period->end];

        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS sample_size,
                COALESCE(SUM(setup_time_sec), 0)              AS setup_sec,
                COALESCE(SUM(planned_production_time_sec), 0) AS planned_sec
             FROM mes_oee_snapshots
             WHERE snapshot_date BETWEEN :s AND :e {$where}",
            $params,
        );

        $sample     = (int)   ($row['sample_size'] ?? 0);
        $setupSec   = (float) ($row['setup_sec']   ?? 0);
        $plannedSec = (float) ($row['planned_sec'] ?? 0);

        if ($sample === 0) {
            return [
                'value'        => 0.0,
                'sample_size'  => 0,
                'numerator'    => 0.0,
                'denominator'  => 0.0,
                'breakdown'    => [],
                'empty_result' => true,
                'data_source'  => 'mes_oee_snapshots',
            ];
        }

        $pct = $plannedSec > 0 ? ($setupSec / $plannedSec) * 100 : 0.0;

        $breakdown = [];
        try {
            $rows = $this->db->query(
                "SELECT equipment_id AS key,
                        COUNT(*) AS count,
                        CASE WHEN SUM(planned_production_time_sec) > 0
                             THEN (SUM(setup_time_sec) / SUM(planned_production_time_sec)) * 100
                             ELSE 0 END AS value
                 FROM mes_oee_snapshots
                 WHERE snapshot_date BETWEEN :s AND :e {$where}
                 GROUP BY equipment_id
                 ORDER BY value DESC
                 LIMIT 10",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown[] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }
        } catch (\Throwable) {
            // best-effort
        }

        return [
            'value'        => round($pct, 2),
            'sample_size'  => $sample,
            'numerator'    => round($setupSec, 2),
            'denominator'  => round($plannedSec, 2),
            'setup_sec'    => round($setupSec, 2),
            'planned_sec'  => round($plannedSec, 2),
            'breakdown'    => $breakdown,
            'data_source'  => 'mes_oee_snapshots',
        ];
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

        return ['value' => round($pct, 2), 'sample_size' => $total, 'on_time' => $onTime, 'total' => $total];
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

        return ['value' => round($pct, 2), 'sample_size' => $total, 'completed' => $completed, 'total' => $total];
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
            'sample_size'  => (int) ($row['vendor_count'] ?? 0),
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

        return ['value' => round($ppm, 0), 'sample_size' => $shipments, 'complaints' => $complaints, 'shipments' => $shipments];
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

    // ── Stage 4 graduated governance KPI calculators ────────────────────────

    /**
     * Plan Adherence = Jobs started on/before the planned start / Jobs planned
     * to start in the period x 100. Re-sequences approved via the
     * approved_resequence metadata flag are excluded from the lateness count
     * (registry attribution_rule for PLAN_ADHERENCE).
     */
    private function calcPlanAdherence(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (
                    WHERE start_date_actual IS NOT NULL
                      AND start_date_actual <= start_date_planned
                ) AS on_plan,
                COUNT(*) FILTER (
                    WHERE COALESCE((metadata->>'approved_resequence')::boolean, FALSE) = TRUE
                ) AS approved_resequence
             FROM job_orders
             WHERE start_date_planned BETWEEN :s AND :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        $total      = (int) ($row['total'] ?? 0);
        $onPlan     = (int) ($row['on_plan'] ?? 0);
        $resequence = (int) ($row['approved_resequence'] ?? 0);
        // Approved re-sequences are not counted as adherence failures.
        $adhered = min($total, $onPlan + $resequence);
        $pct     = $total > 0 ? ($adhered / $total) * 100 : 0.0;

        return [
            'value'               => round($pct, 2),
            'sample_size'         => $total,
            'jobs_planned'        => $total,
            'jobs_on_plan'        => $onPlan,
            'approved_resequence' => $resequence,
        ];
    }

    /**
     * WIP Aging = Open jobs older than the WIP age threshold / Open jobs x 100.
     * "Open" = released/active jobs as of the period end; age counts from the
     * job creation date so a late close cannot improve the number.
     */
    private function calcWipAging(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS open_jobs,
                COUNT(*) FILTER (
                    WHERE created_at < (:e::date - make_interval(days => :age))
                ) AS aged
             FROM job_orders
             WHERE job_status IN ('released', 'active', 'on_hold')
               AND created_at <= (:e || ' 23:59:59')::timestamptz",
            [':e' => $period->end, ':age' => self::AGE_DAYS_WIP],
        );

        $open = (int) ($row['open_jobs'] ?? 0);
        $aged = (int) ($row['aged'] ?? 0);
        $pct  = $open > 0 ? ($aged / $open) * 100 : 0.0;

        return [
            'value'          => round($pct, 2),
            'sample_size'    => $open,
            'open_jobs'      => $open,
            'aged_jobs'      => $aged,
            'age_threshold_days' => self::AGE_DAYS_WIP,
        ];
    }

    /**
     * NCR Closure Aging = Open NCRs older than the NCR age threshold / Open
     * NCRs x 100. Age counts from the NCR open date (created_at), not the
     * close date, so deferring a closure cannot flatter the number.
     */
    private function calcNcrClosureAging(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS open_ncr,
                COUNT(*) FILTER (
                    WHERE created_at < (:e::date - make_interval(days => :age))
                ) AS aged
             FROM ncr_records
             WHERE (ncr_status IS NULL OR ncr_status NOT IN ('Closed', 'Verified'))
               AND created_at <= (:e || ' 23:59:59')::timestamptz",
            [':e' => $period->end, ':age' => self::AGE_DAYS_NCR],
        );

        $open = (int) ($row['open_ncr'] ?? 0);
        $aged = (int) ($row['aged'] ?? 0);
        $pct  = $open > 0 ? ($aged / $open) * 100 : 0.0;

        return [
            'value'              => round($pct, 2),
            'sample_size'        => $open,
            'open_ncr'           => $open,
            'aged_ncr'           => $aged,
            'age_threshold_days' => self::AGE_DAYS_NCR,
        ];
    }

    /**
     * ECO Closure Aging = Open engineering change requests older than the ECO
     * age threshold / Open ECRs x 100. Age counts from the request open date.
     */
    private function calcEcoClosureAging(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS open_eco,
                COUNT(*) FILTER (
                    WHERE created_at < (:e::date - make_interval(days => :age))
                ) AS aged
             FROM engineering_change_requests
             WHERE (ecr_status IS NULL OR ecr_status NOT IN ('Closed', 'Rejected'))
               AND created_at <= (:e || ' 23:59:59')::timestamptz",
            [':e' => $period->end, ':age' => self::AGE_DAYS_ECO],
        );

        $open = (int) ($row['open_eco'] ?? 0);
        $aged = (int) ($row['aged'] ?? 0);
        $pct  = $open > 0 ? ($aged / $open) * 100 : 0.0;

        return [
            'value'              => round($pct, 2),
            'sample_size'        => $open,
            'open_eco'           => $open,
            'aged_eco'           => $aged,
            'age_threshold_days' => self::AGE_DAYS_ECO,
        ];
    }

    /**
     * Material Availability for Plan = Planned jobs with material ready /
     * Jobs planned to start in the period x 100.
     */
    private function calcMaterialAvailabilityPlan(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (
                    WHERE LOWER(COALESCE(material_readiness_status, '')) IN
                          ('ready', 'available', 'complete', 'ok', 'cleared')
                ) AS ready
             FROM job_orders
             WHERE start_date_planned BETWEEN :s AND :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        $total = (int) ($row['total'] ?? 0);
        $ready = (int) ($row['ready'] ?? 0);
        $pct   = $total > 0 ? ($ready / $total) * 100 : 0.0;

        return [
            'value'        => round($pct, 2),
            'sample_size'  => $total,
            'jobs_planned' => $total,
            'material_ready' => $ready,
        ];
    }

    /**
     * Inventory Accuracy = Cycle-count lines with zero variance / Cycle-count
     * lines counted in the period x 100.
     */
    private function calcInventoryAccuracy(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE COALESCE(variance_qty, 0) = 0) AS accurate
             FROM wms_cycle_count_results
             WHERE created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
            [':s' => $period->start, ':e' => $period->end],
        );

        $total    = (int) ($row['total'] ?? 0);
        $accurate = (int) ($row['accurate'] ?? 0);
        $pct      = $total > 0 ? ($accurate / $total) * 100 : 0.0;

        return [
            'value'         => round($pct, 2),
            'sample_size'   => $total,
            'lines_counted' => $total,
            'lines_accurate' => $accurate,
        ];
    }

    /**
     * DSO = Average (payment date - invoice date) over AR invoices paid in
     * the period, in days.
     */
    private function calcDso(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS paid_count,
                COALESCE(AVG((payment_date - invoice_date)), 0) AS dso_days
             FROM ap_ar_invoices
             WHERE UPPER(COALESCE(ledger_type, '')) = 'AR'
               AND payment_date IS NOT NULL
               AND invoice_date BETWEEN :s AND :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        $count = (int) ($row['paid_count'] ?? 0);
        $dso   = (float) ($row['dso_days'] ?? 0);

        return [
            'value'      => round($dso, 1),
            'sample_size' => $count,
            'paid_count' => $count,
        ];
    }

    /**
     * Invoice Right-First-Time = Invoices passing three-way match / Invoices
     * issued in the period x 100.
     */
    private function calcInvoiceRft(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE three_way_match_status = 'matched') AS rft
             FROM ap_ar_invoices
             WHERE invoice_date BETWEEN :s AND :e",
            [':s' => $period->start, ':e' => $period->end],
        );

        $total = (int) ($row['total'] ?? 0);
        $rft   = (int) ($row['rft'] ?? 0);
        $pct   = $total > 0 ? ($rft / $total) * 100 : 0.0;

        return [
            'value'         => round($pct, 2),
            'sample_size'   => $total,
            'invoices'      => $total,
            'invoices_rft'  => $rft,
        ];
    }

    /**
     * Incident Action Closure Aging = Open incidents older than the incident
     * action age threshold / Open incidents x 100. Age counts from the
     * incident open date.
     */
    private function calcIncidentActionClosureAging(DateRange $period, array $filters): array
    {
        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) AS open_incidents,
                COUNT(*) FILTER (
                    WHERE created_at < (:e::date - make_interval(days => :age))
                ) AS aged
             FROM ehs_incidents
             WHERE LOWER(COALESCE(incident_status, '')) NOT IN ('closed', 'cancelled', 'void')
               AND created_at <= (:e || ' 23:59:59')::timestamptz",
            [':e' => $period->end, ':age' => self::AGE_DAYS_INCIDENT_ACTION],
        );

        $open = (int) ($row['open_incidents'] ?? 0);
        $aged = (int) ($row['aged'] ?? 0);
        $pct  = $open > 0 ? ($aged / $open) * 100 : 0.0;

        return [
            'value'              => round($pct, 2),
            'sample_size'        => $open,
            'open_incidents'     => $open,
            'aged_incidents'     => $aged,
            'age_threshold_days' => self::AGE_DAYS_INCIDENT_ACTION,
        ];
    }

    /**
     * FAI First-Pass Acceptance = COUNT(fai_overall_result = 'Approved')
     *                             / COUNT(*) of FAI records in period × 100.
     *
     * Source: fai_records (migration 011_quality.sql).
     * `fai_overall_result` CHECK constraint accepts 'Approved' / 'Conditional'
     * / 'Rejected'. We count only 'Approved' as first-pass; 'Conditional'
     * (accepted with deviations) and 'Rejected' both count as not-first-pass.
     *
     * Prompt 05 graduation: this metric was `staged_data_contract` in P04;
     * source columns confirmed verified. Calc function authored fresh.
     */
    private function calcFaiFirstPass(DateRange $period, array $filters): array
    {
        $params = [':s' => $period->start, ':e' => $period->end];

        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) FILTER (WHERE fai_overall_result = 'Approved') AS approved,
                COUNT(*) FILTER (WHERE fai_overall_result IS NOT NULL) AS total,
                COUNT(*) FILTER (WHERE fai_overall_result IS NULL
                                   OR fai_overall_result NOT IN ('Approved','Conditional','Rejected')) AS unscored
             FROM fai_records
             WHERE created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
            $params,
        );

        $approved = (int) ($row['approved'] ?? 0);
        $total    = (int) ($row['total']    ?? 0);
        $unscored = (int) ($row['unscored'] ?? 0);

        if ($total === 0) {
            return [
                'value'        => 0.0,
                'sample_size'  => 0,
                'numerator'    => 0,
                'denominator'  => 0,
                'breakdown'    => [],
                'empty_result' => true,
                'data_source'  => 'fai_records',
            ];
        }

        $pct = ($approved / $total) * 100;

        $dataQualityFlags = [];
        if ($unscored > 0) {
            $dataQualityFlags[] = "unscored_fai_result_count={$unscored}";
        }

        // Breakdowns: by part_number (product family proxy), by fai_type, by customer.
        $breakdown = [
            'by_part_number' => [],
            'by_fai_type'    => [],
            'by_customer'    => [],
        ];
        try {
            $rows = $this->db->query(
                "SELECT COALESCE(part_number, '(unknown)') AS key,
                        COUNT(*) AS count,
                        CASE WHEN COUNT(*) > 0
                             THEN (COUNT(*) FILTER (WHERE fai_overall_result = 'Approved')::numeric
                                   / COUNT(*)) * 100
                             ELSE 0 END AS value
                 FROM fai_records
                 WHERE created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
                 GROUP BY part_number
                 ORDER BY value ASC, count DESC
                 LIMIT 10",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown['by_part_number'][] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }

            $rows = $this->db->query(
                "SELECT COALESCE(fai_type::text, '(unknown)') AS key,
                        COUNT(*) AS count,
                        CASE WHEN COUNT(*) > 0
                             THEN (COUNT(*) FILTER (WHERE fai_overall_result = 'Approved')::numeric
                                   / COUNT(*)) * 100
                             ELSE 0 END AS value
                 FROM fai_records
                 WHERE created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
                 GROUP BY fai_type
                 ORDER BY count DESC",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown['by_fai_type'][] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }

            $rows = $this->db->query(
                "SELECT COALESCE(customer, '(unknown)') AS key,
                        COUNT(*) AS count,
                        CASE WHEN COUNT(*) > 0
                             THEN (COUNT(*) FILTER (WHERE fai_overall_result = 'Approved')::numeric
                                   / COUNT(*)) * 100
                             ELSE 0 END AS value
                 FROM fai_records
                 WHERE created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
                 GROUP BY customer
                 ORDER BY count DESC
                 LIMIT 10",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown['by_customer'][] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }
        } catch (\Throwable) {
            // best-effort
        }

        return [
            'value'        => round($pct, 2),
            'sample_size'  => $total,
            'numerator'    => $approved,
            'denominator'  => $total,
            'approved'     => $approved,
            'total'        => $total,
            'breakdown'    => $breakdown,
            'data_source'  => 'fai_records',
            'data_quality_flags' => $dataQualityFlags,
        ];
    }

    /**
     * In-Process Reject Rate = COUNT(pass_fail = 'fail') / COUNT(*) × 100
     * on ipqc_inspection_results in the period.
     *
     * Source: ipqc_inspection_results (migration 084_execution_quality_projection.sql).
     * `pass_fail` is CHECK ('pass','fail'), lowercase.
     *
     * Prompt 05 graduation: this metric was `staged_data_contract` (gate G5)
     * in P04. Lower-is-better: target ≤ 1% (registry green_point).
     */
    private function calcInProcessRejectRate(DateRange $period, array $filters): array
    {
        $params = [':s' => $period->start, ':e' => $period->end];

        $row = $this->db->queryOne(
            "SELECT
                COUNT(*) FILTER (WHERE pass_fail = 'fail')             AS fails,
                COUNT(*) FILTER (WHERE pass_fail IN ('pass','fail'))   AS total,
                COUNT(*) FILTER (WHERE pass_fail IS NULL OR pass_fail NOT IN ('pass','fail')) AS unscored
             FROM ipqc_inspection_results
             WHERE created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
            $params,
        );

        $fails    = (int) ($row['fails']    ?? 0);
        $total    = (int) ($row['total']    ?? 0);
        $unscored = (int) ($row['unscored'] ?? 0);

        if ($total === 0) {
            return [
                'value'        => 0.0,
                'sample_size'  => 0,
                'numerator'    => 0,
                'denominator'  => 0,
                'breakdown'    => [],
                'empty_result' => true,
                'data_source'  => 'ipqc_inspection_results',
            ];
        }

        $pct = ($fails / $total) * 100;

        $dataQualityFlags = [];
        if ($unscored > 0) {
            $dataQualityFlags[] = "unscored_ipqc_result_count={$unscored}";
        }

        // Breakdowns: by defect_code, by characteristic. Workcenter/shift are
        // on the parent ipqc_inspections row — joined for the workcenter view.
        $breakdown = [
            'by_defect_code'     => [],
            'by_characteristic'  => [],
            'by_inspection_status' => [],
        ];
        try {
            $rows = $this->db->query(
                "SELECT COALESCE(defect_code, '(none)') AS key,
                        COUNT(*) AS count,
                        CASE WHEN COUNT(*) > 0
                             THEN (COUNT(*) FILTER (WHERE pass_fail = 'fail')::numeric
                                   / COUNT(*)) * 100
                             ELSE 0 END AS value
                 FROM ipqc_inspection_results
                 WHERE created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
                 GROUP BY defect_code
                 ORDER BY count DESC
                 LIMIT 10",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown['by_defect_code'][] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }

            $rows = $this->db->query(
                "SELECT characteristic AS key,
                        COUNT(*) AS count,
                        CASE WHEN COUNT(*) > 0
                             THEN (COUNT(*) FILTER (WHERE pass_fail = 'fail')::numeric
                                   / COUNT(*)) * 100
                             ELSE 0 END AS value
                 FROM ipqc_inspection_results
                 WHERE created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
                 GROUP BY characteristic
                 ORDER BY value DESC, count DESC
                 LIMIT 10",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown['by_characteristic'][] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }

            $rows = $this->db->query(
                "SELECT COALESCE(i.inspection_status, '(unknown)') AS key,
                        COUNT(r.*) AS count,
                        CASE WHEN COUNT(r.*) > 0
                             THEN (COUNT(r.*) FILTER (WHERE r.pass_fail = 'fail')::numeric
                                   / COUNT(r.*)) * 100
                             ELSE 0 END AS value
                 FROM ipqc_inspection_results r
                 LEFT JOIN ipqc_inspections i ON i.ipqc_inspection_id = r.ipqc_inspection_id
                 WHERE r.created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz
                 GROUP BY i.inspection_status
                 ORDER BY count DESC",
                $params,
            );
            foreach ($rows as $r) {
                $breakdown['by_inspection_status'][] = [
                    'key'   => (string) $r['key'],
                    'count' => (int)    $r['count'],
                    'value' => round((float) $r['value'], 2),
                ];
            }
        } catch (\Throwable) {
            // best-effort
        }

        return [
            'value'        => round($pct, 2),
            'sample_size'  => $total,
            'numerator'    => $fails,
            'denominator'  => $total,
            'fails'        => $fails,
            'total'        => $total,
            'breakdown'    => $breakdown,
            'data_source'  => 'ipqc_inspection_results',
            'data_quality_flags' => $dataQualityFlags,
        ];
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
            self::METRIC_PLAN_ADHERENCE      => $this->calcPlanAdherence(...),
            self::METRIC_WIP_AGING           => $this->calcWipAging(...),
            self::METRIC_NCR_CLOSURE_AGING   => $this->calcNcrClosureAging(...),
            self::METRIC_ECO_CLOSURE_AGING   => $this->calcEcoClosureAging(...),
            self::METRIC_MATERIAL_AVAILABILITY_PLAN => $this->calcMaterialAvailabilityPlan(...),
            self::METRIC_INVENTORY_ACCURACY  => $this->calcInventoryAccuracy(...),
            self::METRIC_DSO                 => $this->calcDso(...),
            self::METRIC_INVOICE_RFT         => $this->calcInvoiceRft(...),
            self::METRIC_INCIDENT_ACTION_CLOSURE_AGING => $this->calcIncidentActionClosureAging(...),
            self::METRIC_FAI_FIRST_PASS         => $this->calcFaiFirstPass(...),
            self::METRIC_IN_PROCESS_REJECT_RATE => $this->calcInProcessRejectRate(...),
            default => throw new RuntimeException("Unknown metric: {$metricCode}"),
        };
    }

    /**
     * Evaluate RAG status for a metric value vs target.
     *
     * A governance KPI carries numeric thresholds in the registry
     * (thresholds.green_point / yellow_point / direction) — the SSOT. RAG is
     * then pure arithmetic. Pure-runtime operating metrics without a registry
     * threshold fall back to the target ± yellow-band heuristic.
     */
    private function evaluateStatus(string $metricCode, float $value, float $target): KpiStatus
    {
        $rt = $this->registryGovernanceThresholds($metricCode);
        if ($rt !== null) {
            $green  = $rt['green_point'];
            $yellow = $rt['yellow_point'];
            if ($rt['direction'] === 'lower_is_better') {
                if ($value <= $green) {
                    return KpiStatus::GREEN;
                }
                return $value <= $yellow ? KpiStatus::YELLOW : KpiStatus::RED;
            }
            if ($value >= $green) {
                return KpiStatus::GREEN;
            }
            return $value >= $yellow ? KpiStatus::YELLOW : KpiStatus::RED;
        }

        if ($target === 0.0) {
            return KpiStatus::GREY;
        }

        $lowerBetter = in_array($metricCode, self::LOWER_IS_BETTER, true);
        $yellowThreshold = $this->getYellowThreshold($metricCode, $target);

        if ($lowerBetter) {
            if ($value <= $target) {
                return KpiStatus::GREEN;
            }
            return $value <= $yellowThreshold ? KpiStatus::YELLOW : KpiStatus::RED;
        }

        if ($value >= $target) {
            return KpiStatus::GREEN;
        }
        return $value >= $yellowThreshold ? KpiStatus::YELLOW : KpiStatus::RED;
    }

    /**
     * Numeric thresholds authored for a metric in the registry. Scans all
     * three governed sections — governance KPIs, gate control metrics, and
     * proposed operating metrics — so every KPI (not just governance) gets
     * arithmetic RAG. Governance wins for a code that appears in more than
     * one section (single canonical definition).
     *
     * @return array{green_point: float, yellow_point: float, target: float, direction: string, unit: string}|null
     */
    private function registryGovernanceThresholds(string $metricCode): ?array
    {
        $code = strtoupper(trim($metricCode));
        if ($this->governanceThresholdMap === null) {
            $this->governanceThresholdMap = [];
            $registry = $this->loadKpiAuthorityRegistry();
            // Order matters: governance first (highest authority), then gate,
            // then proposed — first writer wins for an overlapping code.
            foreach (['annex122_governance_kpis', 'gate_control_metrics', 'proposed_operating_metrics'] as $section) {
                foreach ($this->registryRows($registry, $section) as $row) {
                    $rc = $this->codeField($row, 'canonical_code');
                    $t = $row['thresholds'] ?? null;
                    if ($rc === '' || isset($this->governanceThresholdMap[$rc])
                        || !is_array($t) || !isset($t['green_point'], $t['yellow_point'])) {
                        continue;
                    }
                    $this->governanceThresholdMap[$rc] = [
                        'green_point'  => (float) $t['green_point'],
                        'yellow_point' => (float) $t['yellow_point'],
                        'target'       => (float) ($t['target'] ?? $t['green_point']),
                        'direction'    => (string) ($t['direction'] ?? 'higher_is_better'),
                        'unit'         => (string) ($t['unit'] ?? ''),
                    ];
                }
            }
        }
        return $this->governanceThresholdMap[$code] ?? null;
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

            // Schema-version gate: ignore snapshots persisted under an older
            // registry schema (their formula/threshold definitions are stale).
            // getKpiTrend falls back to live recalculation when this yields
            // nothing, so the gate never loses data — it only forces a
            // recompute under the current definitions.
            $rows = $this->db->query(
                "SELECT {$truncFn}::date AS bucket, AVG(ks.actual_value) AS avg_value,
                        AVG(ks.target_value) AS avg_target, MAX(ks.kpi_status) AS status
                 FROM kpi_snapshots ks
                 JOIN kpi_definitions kd ON kd.kpi_id = ks.kpi_id
                 WHERE kd.metric_code = :code
                   AND ks.period_start >= :s AND ks.period_end <= :e
                   AND COALESCE((ks.metadata->>'schema_version')::int, 0) >= :sv
                 GROUP BY bucket
                 ORDER BY bucket",
                [':code' => $metricCode, ':s' => $period->start, ':e' => $period->end,
                 ':sv' => $this->registrySchemaVersion()],
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
     * Build optional WHERE clause fragment for mes_oee_snapshots-filtered
     * queries. The OEE snapshot table carries equipment_id, shift_code, and
     * primary_job_number; dept_code filters resolve via the equipment table.
     */
    private function buildOeeSnapshotWhereClause(array $filters): string
    {
        $clauses = [];
        if (!empty($filters['machine_id'])) {
            $clauses[] = "AND equipment_id = " . $this->db->getPdo()->quote((string) $filters['machine_id']);
        }
        if (!empty($filters['shift_code'])) {
            $clauses[] = "AND shift_code = " . $this->db->getPdo()->quote((string) $filters['shift_code']);
        }
        if (!empty($filters['dept_code'])) {
            $clauses[] = "AND equipment_id IN (
                SELECT equipment_id FROM equipment WHERE department_id = "
                . $this->db->getPdo()->quote((string) $filters['dept_code']) . ")";
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
        $target = self::DEFAULT_TARGETS[$metricCode];
        $unit   = self::UNITS[$metricCode];

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
            $this->applyRuntimeOverlay($this->kpiAuthorityRegistry);
        }

        return $this->kpiAuthorityRegistry;
    }

    /**
     * Merge the KPI Admin Console runtime overlay onto the seed registry.
     * Only CONSOLE_EDITABLE_FIELDS of annex122_governance_kpis rows are
     * overlaid. Schema-version gate: an overlay stamped older than the seed
     * schema_version is structurally stale and ignored — same rule as
     * RaciMatrixService::load().
     *
     * @param array<string, mixed> $registry
     */
    private function applyRuntimeOverlay(array &$registry): void
    {
        if (!is_file(self::KPI_AUTHORITY_REGISTRY_RUNTIME_PATH)) {
            return;
        }
        $overlay = json_decode((string) file_get_contents(self::KPI_AUTHORITY_REGISTRY_RUNTIME_PATH), true);
        if (!is_array($overlay)) {
            return;
        }

        $seedSchema    = (int) ($registry['schema_version'] ?? 0);
        $overlaySchema = (int) ($overlay['schema_version'] ?? 0);
        if ($seedSchema > 0 && $overlaySchema < $seedSchema) {
            return; // stale overlay — seed advanced past it
        }

        // Each registry section the Console can edit has its own override map
        // plus optional Console-added KPIs and a retired-code list.
        $sections = [
            'annex122_governance_kpis'   => ['governance_overrides', 'governance'],
            'gate_control_metrics'       => ['gate_overrides', 'gate'],
            'proposed_operating_metrics' => ['proposed_overrides', 'proposed'],
        ];
        $addedAll   = is_array($overlay['added_kpis'] ?? null) ? $overlay['added_kpis'] : [];
        $retiredAll = is_array($overlay['retired_codes'] ?? null) ? $overlay['retired_codes'] : [];
        $applied = false;
        foreach ($sections as $section => [$overrideKey, $group]) {
            $overrides = $overlay[$overrideKey] ?? null;
            $rows      = $registry[$section] ?? null;
            $added     = is_array($addedAll[$group] ?? null) ? $addedAll[$group] : [];
            $retired   = is_array($retiredAll[$group] ?? null) ? $retiredAll[$group] : [];
            if (!is_array($rows)) {
                continue;
            }
            $hasWork = is_array($overrides) || $added !== [] || $retired !== [];
            if (!$hasWork) {
                continue;
            }
            // Field-level overrides onto seed rows.
            if (is_array($overrides)) {
                foreach ($rows as $i => $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
                    $patch = $overrides[$code] ?? null;
                    if (!is_array($patch)) {
                        continue;
                    }
                    foreach (self::CONSOLE_EDITABLE_FIELDS as $field) {
                        if (array_key_exists($field, $patch)) {
                            $rows[$i][$field] = $patch[$field];
                        }
                    }
                }
            }
            // Append Console-added KPIs.
            foreach ($added as $row) {
                if (is_array($row) && trim((string) ($row['canonical_code'] ?? '')) !== '') {
                    $rows[] = $row;
                }
            }
            // Mark retired KPIs — soft retire (never physical delete).
            if ($retired !== []) {
                $retiredMap = [];
                foreach ($retired as $c) {
                    $retiredMap[strtoupper(trim((string) $c))] = true;
                }
                foreach ($rows as $i => $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
                    if (isset($retiredMap[$code])) {
                        $rows[$i]['retired'] = true;
                        $rows[$i]['calculation_status'] = 'retired';
                    }
                }
            }
            $registry[$section] = $rows;
            $applied = true;
        }
        if ($applied) {
            $registry['runtime_overlay_applied'] = true;
            $registry['runtime_overlay_updated_at'] = (string) ($overlay['updated_at'] ?? '');
        }
    }

    /**
     * Registry schema version (prompt 02). Acts as a runtime-snapshot gate:
     * a snapshot persisted under an older schema is structurally stale once
     * the registry bumps schema_version (formula/threshold/data-source
     * definitions changed), so trend reads ignore it. Mirrors the
     * schema-version gate in RaciMatrixService::load().
     */
    private function registrySchemaVersion(): int
    {
        $version = $this->loadKpiAuthorityRegistry()['schema_version'] ?? 0;
        return is_int($version) ? $version : (int) $version;
    }

    /**
     * Minimum sample size declared for a governance KPI
     * (annex122_governance_kpis[].formula.min_sample). 0 when not declared.
     */
    private function registryMinSample(string $metricCode): int
    {
        $code = strtoupper(trim($metricCode));
        foreach ($this->registryRows($this->loadKpiAuthorityRegistry(), 'annex122_governance_kpis') as $row) {
            if ($this->codeField($row, 'canonical_code') === $code) {
                $formula = $row['formula'] ?? null;
                if (is_array($formula) && isset($formula['min_sample'])) {
                    return (int) $formula['min_sample'];
                }
                return 0;
            }
        }
        return 0;
    }

    /**
     * @param array<string, mixed> $registry
     * @return array<string, string>
     */
    private function registryAliases(array $registry): array
    {
        $aliases = [];
        $rawAliases = $registry['legacy_aliases'] ?? [];
        if (!is_array($rawAliases)) {
            return $aliases;
        }

        foreach ($rawAliases as $alias => $canonical) {
            if (!is_string($alias) || !is_string($canonical)) {
                continue;
            }
            $alias = strtoupper(trim($alias));
            $canonical = strtoupper(trim($canonical));
            if ($alias !== '' && $canonical !== '') {
                $aliases[$alias] = $canonical;
            }
        }

        ksort($aliases);
        return $aliases;
    }

    /**
     * @param array<string, mixed> $registry
     * @return array<int, array<string, mixed>>
     */
    private function registryRows(array $registry, string $key): array
    {
        $rows = $registry[$key] ?? [];
        if (!is_array($rows)) {
            return [];
        }

        return array_values(array_filter($rows, static fn(mixed $row): bool => is_array($row)));
    }

    /**
     * @param array<string, mixed> $registry
     * @return list<string>
     */
    private function registryStringList(array $registry, string $key, bool $uppercase = true): array
    {
        $values = $registry[$key] ?? [];
        if (!is_array($values)) {
            return [];
        }

        $list = [];
        foreach ($values as $value) {
            if (is_string($value) && trim($value) !== '') {
                $value = trim($value);
                $list[] = $uppercase ? strtoupper($value) : $value;
            }
        }

        return array_values(array_unique($list));
    }

    /**
     * @param array<string, array<string, mixed>> $catalog
     * @param array<string, mixed>                $registry
     */
    private function enrichCatalogGovernance(array &$catalog, array $registry): void
    {
        $overrides = $this->registryMetricGovernanceOverrides($registry);
        $scorecardItems = $this->registryScorecardItems($registry);
        $defaults = is_array($registry['metric_governance_defaults'] ?? null)
            ? $registry['metric_governance_defaults']
            : [];

        foreach ($catalog as $code => &$metric) {
            $override = array_merge($scorecardItems[$code] ?? [], $overrides[$code] ?? []);
            $sources = $this->stringListFromValue($metric['sources'] ?? []);
            $usageTypes = $this->inferUsageTypes($sources);
            foreach ($this->stringListFromValue($override['usage_types'] ?? []) as $usageType) {
                $usageTypes[] = $usageType;
            }
            $usageTypes = array_values(array_unique($usageTypes));
            sort($usageTypes);

            $metricType = $this->stringField($override, 'metric_type');
            if ($metricType === '') {
                $metricType = $this->inferMetricType($metric, $sources);
            }

            $evaluationUse = $this->stringField($override, 'evaluation_use');
            if ($evaluationUse === '') {
                $evaluationUse = $this->inferEvaluationUse($metric, $sources, $metricType);
            }

            $evaluationScope = $this->stringField($override, 'evaluation_scope');
            if ($evaluationScope === '') {
                $evaluationScope = $this->inferEvaluationScope($metric, $sources, $metricType);
            }

            $resultType = $this->stringField($override, 'result_type');
            if ($resultType === '') {
                $resultType = $this->inferResultType($metricType);
            }

            $calculationStatus = $this->stringField($override, 'calculation_status');
            if ($calculationStatus === '') {
                $calculationStatus = $this->inferCalculationStatus($metric);
            }

            $isOfficialKpi = $metricType === 'kpi';
            $metric['metric_type'] = $metricType;
            $metric['classification'] = $metricType;
            $metric['usage_types'] = $usageTypes;
            $metric['is_official_kpi'] = $isOfficialKpi;
            $metric['result_type'] = $resultType;
            $metric['evaluation_use'] = $evaluationUse;
            $metric['evaluation_scope'] = $evaluationScope;
            $metric['calculation_status'] = $calculationStatus;
            $metric['backend_status'] = $calculationStatus;

            $this->applyGovernanceText(
                $metric,
                $override,
                $metricType,
                $defaults,
            );
            $this->applyGovernanceLists($metric, $override);
	            $this->applyDataContract($metric, $override, $calculationStatus);
	            $this->applyConsequence($metric, $override, $metricType, $defaults);
	            $this->applyScorecardRules($metric, $override);
	            $this->applyMetricControlSummary($metric);
	        }
	        unset($metric);
	    }

    /**
     * @param array<string, mixed> $registry
     * @return array<string, array<string, mixed>>
     */
    private function registryMetricGovernanceOverrides(array $registry): array
    {
        $raw = $registry['metric_governance_overrides'] ?? [];
        if (!is_array($raw)) {
            return [];
        }

        $overrides = [];
        foreach ($raw as $code => $row) {
            if (!is_string($code) || !is_array($row)) {
                continue;
            }
            $code = strtoupper(trim($code));
            if ($code !== '') {
                $overrides[$code] = $row;
            }
        }

        return $overrides;
    }

    /**
     * @param array<string, mixed> $registry
     * @return array<string, array<string, mixed>>
     */
    private function registryScorecardItems(array $registry): array
    {
        $model = $registry['scorecard_operating_model'] ?? [];
        if (!is_array($model) || !is_array($model['executive_scorecard_items'] ?? null)) {
            return [];
        }

        $contracts = [];
        $rawContracts = $registry['scorecard_evidence_contracts'] ?? [];
        if (is_array($rawContracts)) {
            foreach ($rawContracts as $code => $row) {
                if (!is_string($code) || !is_array($row)) {
                    continue;
                }
                $code = strtoupper(trim($code));
                if ($code !== '') {
                    $contracts[$code] = $row;
                }
            }
        }

        $items = [];
        foreach ($model['executive_scorecard_items'] as $row) {
            if (!is_array($row)) {
                continue;
            }
            $code = $this->codeField($row, 'canonical_code');
            if ($code !== '') {
                $items[$code] = array_merge($row, $contracts[$code] ?? []);
            }
        }

        return $items;
    }

    /**
     * @return list<string>
     */
    private function stringListFromValue(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        $list = [];
        foreach ($value as $item) {
            if (is_string($item) && trim($item) !== '') {
                $list[] = trim($item);
            }
        }

        return array_values(array_unique($list));
    }

    /**
     * @param list<string> $sources
     * @return list<string>
     */
    private function inferUsageTypes(array $sources): array
    {
        $map = [
            'runtime_calculated_metrics' => 'runtime_calculated',
            'annex122_governance_kpis' => 'annex122_governance',
            'proposed_operating_metrics' => 'proposed_operating',
            'executive_scorecard' => 'executive_scorecard',
            'dashboard_core_kpis' => 'dashboard_core',
            'gate_control_metrics' => 'gate_control',
        ];

        $usageTypes = [];
        foreach ($sources as $source) {
            if (isset($map[$source])) {
                $usageTypes[] = $map[$source];
            }
        }

        return array_values(array_unique($usageTypes));
    }

    /**
     * @param array<string, mixed> $metric
     * @param list<string>         $sources
     */
    private function inferMetricType(array $metric, array $sources): string
    {
        if (in_array('executive_scorecard', $sources, true) || in_array('annex122_governance_kpis', $sources, true)) {
            return 'kpi';
        }
        if (in_array('gate_control_metrics', $sources, true)) {
            return 'gate_control_metric';
        }
        if (in_array('proposed_operating_metrics', $sources, true) || in_array('dashboard_core_kpis', $sources, true)) {
            return 'operating_metric';
        }
        if (($metric['runtime_calculated'] ?? false) === true) {
            return 'operating_metric';
        }

        return 'health_indicator';
    }

    /**
     * @param array<string, mixed> $metric
     * @param list<string>         $sources
     */
    private function inferEvaluationUse(array $metric, array $sources, string $metricType): string
    {
        if ($metricType === 'kpi') {
            if (in_array('executive_scorecard', $sources, true) || $this->stringField($metric, 'tier') === 'company') {
                return 'company_scorecard';
            }
            if ($this->stringField($metric, 'tier') === 'department' || $this->stringField($metric, 'tier') === 'value_stream') {
                return 'department_scorecard';
            }

            return 'management_review';
        }
        if ($metricType === 'gate_control_metric' || $metricType === 'operating_metric') {
            return 'process_control_review';
        }
        if ($metricType === 'role_performance_measure') {
            return 'role_performance_measure';
        }

        return 'none';
    }

    /**
     * @param array<string, mixed> $metric
     * @param list<string>         $sources
     */
    private function inferEvaluationScope(array $metric, array $sources, string $metricType): string
    {
        $tier = $this->stringField($metric, 'tier');
        if ($tier !== '') {
            return $tier;
        }

        $layer = $this->stringField($metric, 'layer');
        if ($layer !== '') {
            return $layer;
        }

        if (in_array('executive_scorecard', $sources, true)) {
            return 'company';
        }
        if ($metricType === 'gate_control_metric') {
            return 'qms_mes_gate';
        }

        return 'process';
    }

    private function inferResultType(string $metricType): string
    {
        return match ($metricType) {
            'kpi' => 'outcome',
            'gate_control_metric' => 'gate',
            'role_performance_measure' => 'compliance',
            'health_indicator' => 'health',
            default => 'driver',
        };
    }

    /**
     * @param array<string, mixed> $metric
     */
    private function inferCalculationStatus(array $metric): string
    {
        if (($metric['runtime_calculated'] ?? false) === true) {
            return 'runtime_calculated';
        }

        // The KPI authority registry is the SSOT for calculation status of a
        // governed KPI (prompt 02). A registry-authored value wins over any
        // inference from declared_backend_status or registry_status.
        $registryCalc = $this->stringField($metric, 'registry_calculation_status');
        if ($registryCalc !== '') {
            return $registryCalc;
        }

        $declared = $this->stringField($metric, 'declared_backend_status');
        if ($declared !== '') {
            return $declared;
        }

        $registryStatus = $this->stringField($metric, 'registry_status');
        if ($registryStatus === 'staged_data_contract') {
            return 'staged_data_contract';
        }
        if ($registryStatus === 'retained_from_annex122') {
            return 'data_contract_required';
        }

        $backendStatus = $this->stringField($metric, 'backend_status');
        if ($backendStatus !== '') {
            return $backendStatus;
        }

        return 'data_contract_required';
    }

    /**
     * @param array<string, mixed> $metric
     * @param array<string, mixed> $override
     * @param array<string, mixed> $defaults
     */
    private function applyGovernanceText(array &$metric, array $override, string $metricType, array $defaults): void
    {
        $name = is_string($metric['name'] ?? null) ? $metric['name'] : (string) ($metric['canonical_code'] ?? 'metric');
        $metric['strategic_intent'] = $this->overrideOrDefault(
            $override,
            'strategic_intent',
            $this->defaultStrategicIntent($metricType, $name),
        );
        $metric['motive'] = $this->overrideOrDefault(
            $override,
            'motive',
            $this->defaultMotive($metricType),
        );
        $metric['expected_result'] = $this->overrideOrDefault(
            $override,
            'expected_result',
            $this->defaultExpectedResult($metricType),
        );
        $metric['decision_purpose'] = $this->overrideOrDefault(
            $override,
            'decision_purpose',
            $this->defaultDecisionPurpose($metricType),
        );
        $metric['accountable_owner'] = $this->overrideOrDefault($override, 'accountable_owner', 'Process owner defined by registry or source document');
        $metric['review_cadence'] = $this->overrideOrDefault($override, 'review_cadence', 'per approved scorecard or tier review cadence');
        $metric['review_forum'] = $this->overrideOrDefault($override, 'review_forum', $metricType === 'kpi' ? 'BSC/Hoshin or management review' : 'process control review');
        $metric['rating_method'] = $this->overrideOrDefault($override, 'rating_method', $this->defaultString($defaults, 'rating_method', 'RAG plus owner review'));
        $metric['anti_gaming_guardrail'] = $this->overrideOrDefault($override, 'anti_gaming_guardrail', $this->defaultString($defaults, 'anti_gaming_guardrail', 'Pair with safety, quality, delivery, and evidence integrity checks.'));
        $metric['controllability_scope'] = $this->overrideOrDefault($override, 'controllability_scope', $this->defaultString($defaults, 'controllability_scope', 'Shared system outcome unless a documented event proves controllable behavior.'));
        $metric['data_confidence_level'] = $this->overrideOrDefault($override, 'data_confidence_level', (string) ($metric['calculation_status'] ?? 'data_contract_required'));
    }

    /**
     * @param array<string, mixed> $metric
     * @param array<string, mixed> $override
     */
    private function applyGovernanceLists(array &$metric, array $override): void
    {
        // counter_metric is a dedicated per-KPI definition object
        // {name_vi, name, intent} authored on the registry row — the SSOT.
        // It names the side-effect that appears when the KPI is gamed; it is
        // NOT a borrowed headline-KPI code. The registry row wins; legacy
        // metric_governance_overrides apply only when the row carries none.
        $registryCounter = $metric['registry_counter_metric'] ?? null;
        $counterMetric = $override['counter_metric'] ?? null;
        if (is_array($registryCounter) && ($registryCounter['name_vi'] ?? '') !== '') {
            $metric['counter_metric'] = $registryCounter;
        } elseif (is_array($counterMetric) && ($counterMetric['name_vi'] ?? '') !== '') {
            $metric['counter_metric'] = $counterMetric;
        } else {
            $metric['counter_metric'] = null;
        }

        $drilldowns = $override['drilldown_dimensions'] ?? null;
        if (is_array($drilldowns)) {
            $metric['drilldown_dimensions'] = array_values(array_filter($drilldowns, static fn(mixed $item): bool => is_string($item) && trim($item) !== ''));
        } else {
            $metric['drilldown_dimensions'] = [];
        }
    }

    /**
     * @param array<string, mixed> $metric
     * @param array<string, mixed> $override
     */
    private function applyDataContract(array &$metric, array $override, string $calculationStatus): void
    {
        $code = (string) ($metric['canonical_code'] ?? '');
        $runtimeCalculated = ($metric['runtime_calculated'] ?? false) === true;
        $primaryEndpoint = $this->stringField($metric, 'primary_endpoint');
        if ($primaryEndpoint === '' && $runtimeCalculated) {
            $primaryEndpoint = "GET /api/kpi/{$code}";
        }

        $metric['data_contract'] = [
            'calculation_status' => $calculationStatus,
            'calculation_endpoint' => $runtimeCalculated ? "GET /api/kpi/{$code}" : null,
            'catalog_endpoint' => 'GET /api/kpi/catalog',
            // Every KPI exposes a data-input endpoint a frontend can POST to.
            // Runtime KPIs read from GET; staged/manual KPIs are fed through
            // this POST. The endpoint is derived from the code (SSOT) — never
            // hardcoded per metric.
            'input_endpoint' => "POST /api/kpi/{$code}/input",
            'input_list_endpoint' => "GET /api/kpi/{$code}/input",
            'primary_endpoint' => $primaryEndpoint !== '' ? $primaryEndpoint : 'GET /api/kpi/catalog',
            'source_system' => $this->overrideOrDefault($override, 'source_system', 'approved MOM/MES/EQMS/ERP read model or staged data contract'),
            'source_table_or_record' => $this->overrideOrDefault($override, 'source_table_or_record', 'approved source table, event record, or staged data contract'),
            'evidence_record' => $this->overrideOrDefault($override, 'evidence_record', 'source document, event log, form, snapshot, or governed data contract'),
            'authority_service_path' => $this->overrideOrDefault($override, 'authority_service_path', 'KpiEngine catalog data contract; execution truth remains MOM/MES/EQMS/ERP service path'),
            'freshness_rule' => $this->overrideOrDefault($override, 'freshness_rule', 'per review cadence and approved close calendar'),
            'lineage_rule' => $this->overrideOrDefault($override, 'lineage_rule', 'metric value must trace to approved source evidence before scorecard use'),
            'data_contract_approval_id' => $this->nullableStringField($override, 'data_contract_approval_id'),
            'evidence_manifest_id' => $this->nullableStringField($override, 'evidence_manifest_id'),
        ];
        $metric['data_contract_status'] = $runtimeCalculated
            ? 'approved_runtime'
            : match ($calculationStatus) {
                'manual', 'manual_governed' => 'manual_governed',
                'retired' => 'retired',
                default => 'staged_data_contract',
            };
        $metric['runtime_endpoint'] = $runtimeCalculated ? "GET /api/kpi/{$code}" : null;
        $metric['input_endpoint'] = "POST /api/kpi/{$code}/input";
        $metric['data_contract_gap'] = $this->overrideOrDefault(
            $override,
            'data_contract_gap',
            (string) ($metric['data_contract_gap'] ?? ''),
        );
        $metric['target_graduation_condition'] = $this->overrideOrDefault(
            $override,
            'target_graduation_condition',
            (string) ($metric['target_graduation_condition'] ?? ''),
        );
        $metric['evidence_source'] = $this->overrideOrDefault(
            $override,
            'evidence_source',
            (string) ($metric['evidence_source'] ?? ''),
        );
    }

    /**
     * @param array<string, mixed> $metric
     * @param array<string, mixed> $override
     * @param array<string, mixed> $defaults
     */
    private function applyConsequence(array &$metric, array $override, string $metricType, array $defaults): void
    {
        $metric['consequence'] = [
            'recognition_applicable' => $metricType === 'kpi',
            'calibration_input_only' => $metricType === 'kpi',
            'monetary_recognition_status' => $metricType === 'kpi' ? 'requires_scorecard_calibration' : 'not_applicable',
            'recognition_decision_authority' => 'HR/QMS/CEO calibration, never automatic from a single metric value',
            'corrective_action_applicable' => $metricType !== 'health_indicator',
            'discipline_applicable' => false,
            'discipline_from_metric' => false,
            'recognition_rule' => $this->overrideOrDefault($override, 'recognition_rule', $this->defaultString($defaults, 'recognition_rule', 'Recognition requires balanced evidence and calibration.')),
            'corrective_action_rule' => $this->overrideOrDefault($override, 'corrective_action_rule', $this->defaultString($defaults, 'corrective_action_rule', 'Below-target result triggers review and corrective action before people discipline.')),
            'discipline_guardrail' => $this->overrideOrDefault($override, 'discipline_guardrail', $this->defaultString($defaults, 'discipline_guardrail', 'No direct discipline from outcome metric alone.')),
        ];
    }

    /**
     * @param array<string, mixed> $metric
     * @param array<string, mixed> $override
     */
	    private function applyScorecardRules(array &$metric, array $override): void
	    {
        $weight = $override['scorecard_weight_pct'] ?? null;
        $scorecardApplicable = is_int($weight) || is_float($weight);
        $rewardRule = $this->overrideOrDefault($override, 'reward_rule', '');

        $metric['scorecard_applicable'] = $scorecardApplicable;
        $metric['scorecard_weight_pct'] = is_int($weight) || is_float($weight) ? (float) $weight : null;
        $metric['scorecard_unit'] = $this->nullableStringField($override, 'unit');
        $metric['scorecard_target'] = $this->numericField($override, 'target');
        $metric['scorecard_higher_is_better'] = $this->boolField($override, 'higher_is_better');
        $metric['quantitative_thresholds'] = $this->arrayField($override, 'quantitative_thresholds');
        $metric['rating_criteria'] = $this->overrideOrDefault($override, 'rating_criteria', '');
        $metric['reward_rule'] = $rewardRule;
        $metric['blocking_conditions'] = $this->stringListFromValue(
            $override['blocking_conditions'] ?? ($metric['blocking_conditions'] ?? []),
        );
        $metric['scorecard_scoring_status'] = $scorecardApplicable
            ? $this->overrideOrDefault($override, 'scorecard_scoring_status', 'candidate_data_contract')
            : 'not_applicable';
        $metric['scorecard_contributes_to_reward'] = $scorecardApplicable
            ? ($this->boolField($override, 'scorecard_contributes_to_reward') ?? false)
            : false;
        $metric['scorecard_governance_reason'] = $scorecardApplicable
            ? $this->overrideOrDefault($override, 'scorecard_governance_reason', 'Executive scorecard item governed by scorecard_operating_model.')
            : 'Not an executive scorecard item; use metric_type/evaluation_use/consequence for local control only.';

        if ($metric['rating_criteria'] === '' && ($metric['metric_type'] ?? null) === 'kpi') {
            $metric['rating_criteria'] = 'Use approved scorecard RAG thresholds, source evidence, counter-metric review, and calibration before recognition or corrective action.';
        }
        if ($metric['reward_rule'] === '' && ($metric['metric_type'] ?? null) === 'kpi') {
            $metric['reward_rule'] = 'Eligible only through balanced scorecard calibration with safety, quality, delivery and data-integrity blockers cleared.';
        }
	        if ($metric['reward_rule'] !== '' && is_array($metric['consequence'] ?? null)) {
	            $metric['consequence']['recognition_rule'] = $metric['reward_rule'];
	            $metric['consequence']['recognition_applicable'] = $metric['scorecard_contributes_to_reward'];
	            $metric['consequence']['calibration_input_only'] = !$metric['scorecard_contributes_to_reward'];
	            $metric['consequence']['monetary_recognition_status'] = $metric['scorecard_contributes_to_reward']
	                ? 'eligible_after_hr_qms_ceo_calibration_and_blocker_check'
	                : (string) $metric['scorecard_scoring_status'];
	        }
	    }

	    /**
	     * @param array<string, mixed> $metric
	     */
	    private function applyMetricControlSummary(array &$metric): void
	    {
	        $status = (string) ($metric['calculation_status'] ?? 'data_contract_required');
	        $staged = in_array($status, ['staged_data_contract', 'data_contract_required'], true);
	        $counterMetric = $metric['counter_metric'] ?? null;
	        $blocking = $this->stringListFromValue($metric['blocking_conditions'] ?? []);
	        $samplePolicy = is_array($metric['sample_policy'] ?? null) ? $metric['sample_policy'] : null;
	        $roleAssignments = is_array($metric['role_assignments'] ?? null) ? $metric['role_assignments'] : [];
	        $usageContexts = $this->stringListFromValue($metric['usage_contexts'] ?? []);
	        if ($usageContexts === [] && (string) ($metric['evaluation_use'] ?? '') !== '') {
	            $usageContexts = [(string) $metric['evaluation_use']];
	        }

	        $evidenceSource = (string) ($metric['evidence_source'] ?? '');
	        $dataContractGap = (string) ($metric['data_contract_gap'] ?? '');
	        $evidenceStatus = match ((string) ($metric['data_contract_status'] ?? '')) {
	            'approved_runtime' => 'approved_runtime',
	            'manual_governed' => $evidenceSource !== '' ? 'manual_governed_with_evidence' : 'manual_governed_missing_evidence',
	            'retired' => 'retired',
	            default => $dataContractGap !== '' ? 'staged_gap_declared' : ($evidenceSource !== '' ? 'evidence_declared' : 'missing_evidence'),
	        };

	        $assignmentRoles = [];
	        $assignmentTypes = [];
	        $activeAssignments = 0;
	        $candidateAssignments = 0;
	        foreach ($roleAssignments as $assignment) {
	            if (!is_array($assignment)) {
	                continue;
	            }
	            $role = trim((string) ($assignment['role'] ?? $assignment['role_code'] ?? ''));
	            if ($role !== '') {
	                $assignmentRoles[] = strtoupper($role);
	            }
	            $type = trim((string) ($assignment['assignment_type'] ?? ''));
	            if ($type !== '') {
	                $assignmentTypes[] = $type;
	            }
	            if (($assignment['active_or_candidate'] ?? '') === 'active') {
	                $activeAssignments++;
	            } elseif (($assignment['active_or_candidate'] ?? '') === 'candidate') {
	                $candidateAssignments++;
	            }
	        }

	        $metric['metric_control'] = [
	            'type' => [
	                'metric_type' => (string) ($metric['metric_type'] ?? ''),
	                'metric_subtype' => (string) ($metric['metric_subtype'] ?? ''),
	                'control_intent' => (string) ($metric['control_intent'] ?? ''),
	                'measurement_data_type' => (string) ($metric['measurement_data_type'] ?? ''),
	            ],
	            'scoring' => [
	                'scoring_model_detail' => (string) ($metric['scoring_model_detail'] ?? ''),
	                'scorecard_applicable' => (bool) ($metric['scorecard_applicable'] ?? false),
	                'scorecard_scoring_status' => (string) ($metric['scorecard_scoring_status'] ?? 'not_applicable'),
	            ],
	            'evaluation' => [
	                'evaluation_use' => (string) ($metric['evaluation_use'] ?? ''),
	                'evaluation_scope' => (string) ($metric['evaluation_scope'] ?? ''),
	            ],
	            'reward' => [
	                'reward_mode' => (string) ($metric['reward_mode'] ?? ''),
	                'reward_eligible' => (bool) ($metric['reward_eligible'] ?? false),
	                'scorecard_contributes_to_reward' => (bool) ($metric['scorecard_contributes_to_reward'] ?? false),
	            ],
	            'lifecycle' => [
	                'lifecycle_status' => (string) ($metric['lifecycle_status'] ?? ''),
	                'calculation_status' => $status,
	                'data_contract_status' => (string) ($metric['data_contract_status'] ?? ''),
	            ],
	            'staged_value_suppression' => [
	                'suppressed' => $staged,
	                'reason' => $staged
	                    ? 'No runtime/manual-governed score; dashboard consumers must suppress numeric value display.'
	                    : '',
	            ],
	            'role_assignment_summary' => [
	                'count' => count($roleAssignments),
	                'roles' => array_values(array_unique($assignmentRoles)),
	                'assignment_types' => array_values(array_unique($assignmentTypes)),
	                'active_count' => $activeAssignments,
	                'candidate_count' => $candidateAssignments,
	            ],
	            'blockers' => $blocking,
	            'evidence_status' => $evidenceStatus,
	            'sample_policy' => $samplePolicy,
	            'usage_contexts' => $usageContexts,
	            'counter_metric_status' => [
	                'status' => is_array($counterMetric) ? 'present' : 'missing',
	                'code' => is_array($counterMetric) ? (string) ($counterMetric['code'] ?? '') : '',
	                'intent' => is_array($counterMetric) ? (string) ($counterMetric['intent'] ?? '') : '',
	            ],
	        ];
	    }

	    /**
	     * @param array<string, mixed> $registry
	     * @return array<string, mixed>
     */
    private function gateCoverage(array $registry): array
    {
        $byGate = [];
        $missingCdr = [];
        $total = 0;
        $withCdr = 0;

        foreach ($this->registryRows($registry, 'gate_control_metrics') as $row) {
            $code = $this->codeField($row, 'canonical_code');
            if ($code === '') {
                continue;
            }
            $gate = $this->stringField($row, 'gate');
            if ($gate === '') {
                $gate = 'unassigned';
            }
            $cdr = $this->stringListFromValue($row['linked_cdr'] ?? []);
            $total++;
            if ($cdr !== []) {
                $withCdr++;
            } else {
                $missingCdr[] = $code;
            }
            $byGate[$gate] ??= [
                'gate' => $gate,
                'count' => 0,
                'with_cdr' => 0,
                'metrics' => [],
            ];
            $byGate[$gate]['count']++;
            if ($cdr !== []) {
                $byGate[$gate]['with_cdr']++;
            }
            $byGate[$gate]['metrics'][] = [
                'canonical_code' => $code,
                'linked_cdr' => $cdr,
                'gate_pass_condition' => $this->stringField($row, 'gate_pass_condition'),
                'calculation_status' => $this->stringField($row, 'calculation_status'),
                'owner_role' => $this->stringField($row, 'owner_role'),
                'data_contract_gap' => $this->stringField($row, 'data_contract_gap'),
            ];
        }

        ksort($byGate);
        sort($missingCdr);

        return [
            'total_gate_metrics' => $total,
            'with_linked_cdr' => $withCdr,
            'coverage_pct' => $total > 0 ? round($withCdr / $total * 100, 1) : 0.0,
            'missing_cdr_codes' => $missingCdr,
            'by_gate' => array_values($byGate),
        ];
    }

    /**
     * @param array<string, mixed>               $registry
     * @param array<string, array<string, mixed>> $catalog
     * @return array<string, mixed>
     */
    private function catalogIntegrityStatus(array $registry, array $catalog): array
    {
        $findings = [];
        $statusCounts = [];
        $typeCounts = [];

        foreach ($catalog as $code => $metric) {
            $status = (string) ($metric['calculation_status'] ?? 'unknown');
            $type = (string) ($metric['metric_type'] ?? 'unknown');
            $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;
            $typeCounts[$type] = ($typeCounts[$type] ?? 0) + 1;

            $isStaged = in_array($status, ['staged_data_contract', 'data_contract_required'], true);
            $reward = ($metric['reward_eligible'] ?? false) === true
                || ($metric['scorecard_contributes_to_reward'] ?? false) === true;
            if ($isStaged && $reward) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'STAGED_REWARD_METRIC',
                    'metric_code' => (string) $code,
                    'message' => 'Staged/data-contract metric is still marked reward or scorecard-contributing.',
                ];
            }
            if (($metric['is_official_kpi'] ?? false) === true
                && ($metric['counter_metric'] ?? null) === null) {
                $findings[] = [
                    'priority' => 'P1',
                    'code' => 'OFFICIAL_KPI_WITHOUT_COUNTER',
                    'metric_code' => (string) $code,
                    'message' => 'Official KPI has no counter-metric guardrail.',
                ];
            }
        }

        foreach (['annex122_governance_kpis', 'gate_control_metrics', 'proposed_operating_metrics'] as $section) {
            $seen = [];
            foreach ($this->registryRows($registry, $section) as $row) {
                $code = $this->codeField($row, 'canonical_code');
                if ($code === '') {
                    continue;
                }
                if (isset($seen[$code])) {
                    $findings[] = [
                        'priority' => 'P1',
                        'code' => 'DUPLICATE_CANONICAL_CODE_IN_SECTION',
                        'metric_code' => $code,
                        'section' => $section,
                        'message' => 'Duplicate canonical code within the same registry section.',
                    ];
                }
                $seen[$code] = true;
            }
        }

        foreach ($this->registryRows($registry, 'gate_control_metrics') as $row) {
            $code = $this->codeField($row, 'canonical_code');
            if ($code !== '' && $this->stringListFromValue($row['linked_cdr'] ?? []) === []) {
                $findings[] = [
                    'priority' => 'P1',
                    'code' => 'GATE_METRIC_WITHOUT_CDR',
                    'metric_code' => $code,
                    'message' => 'Gate control metric has no linked CDR evidence anchor.',
                ];
            }
        }

        $roles = $registry['jd_kpi_scorecards']['roles'] ?? [];
        if (is_array($roles)) {
            foreach ($roles as $roleCode => $role) {
                if (!is_array($role)) {
                    continue;
                }
                $items = is_array($role['active_scorecard'] ?? null)
                    ? $role['active_scorecard']
                    : (is_array($role['scorecard'] ?? null) ? $role['scorecard'] : []);
                if ($items === []) {
                    continue;
                }
                $weightTotal = 0;
                foreach ($items as $item) {
                    if (is_array($item)) {
                        $weightTotal += (int) ($item['weight'] ?? 0);
                    }
                }
                if ($weightTotal !== 100) {
                    $findings[] = [
                        'priority' => 'P1',
                        'code' => 'JD_ACTIVE_WEIGHT_NOT_100',
                        'role_code' => strtoupper((string) $roleCode),
                        'message' => 'JD active scorecard weight total is not 100.',
                    ];
                }
                if (count($items) > 6) {
                    $findings[] = [
                        'priority' => 'P2',
                        'code' => 'JD_ACTIVE_SET_TOO_LARGE',
                        'role_code' => strtoupper((string) $roleCode),
                        'message' => 'JD active scorecard may be too broad for practical coaching.',
                    ];
                }
            }
        }

        $priorityRank = ['P0' => 0, 'P1' => 1, 'P2' => 2, 'P3' => 3];
        usort($findings, static function (array $a, array $b) use ($priorityRank): int {
            return ($priorityRank[$a['priority'] ?? 'P3'] ?? 3) <=> ($priorityRank[$b['priority'] ?? 'P3'] ?? 3);
        });

        $overall = 'PASS';
        foreach ($findings as $finding) {
            if (($finding['priority'] ?? '') === 'P0') {
                $overall = 'FAIL';
                break;
            }
            if (($finding['priority'] ?? '') === 'P1') {
                $overall = 'WARN';
            }
        }

        ksort($statusCounts);
        ksort($typeCounts);

        return [
            'status' => $overall,
            'finding_count' => count($findings),
            'status_counts' => $statusCounts,
            'metric_type_counts' => $typeCounts,
            'findings' => array_slice($findings, 0, 200),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<int|string, mixed>
     */
    private function arrayField(array $row, string $key): array
    {
        $value = $row[$key] ?? [];
        return is_array($value) ? $value : [];
    }

    /**
     * @param array<string, mixed> $row
     */
    private function nullableStringField(array $row, string $key): ?string
    {
        $value = $this->stringField($row, $key);
        return $value !== '' ? $value : null;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function numericField(array $row, string $key): ?float
    {
        $value = $row[$key] ?? null;
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        return null;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function boolField(array $row, string $key): ?bool
    {
        $value = $row[$key] ?? null;
        return is_bool($value) ? $value : null;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function overrideOrDefault(array $row, string $key, string $default): string
    {
        $value = $this->stringField($row, $key);
        return $value !== '' ? $value : $default;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function defaultString(array $row, string $key, string $default): string
    {
        $value = $row[$key] ?? null;
        return is_string($value) && trim($value) !== '' ? trim($value) : $default;
    }

    private function defaultStrategicIntent(string $metricType, string $name): string
    {
        return match ($metricType) {
            'kpi' => "Formal scorecard control for {$name}.",
            'gate_control_metric' => "Gate control for {$name}.",
            'role_performance_measure' => "Role capability control for {$name}.",
            'health_indicator' => "Trend visibility for {$name}.",
            default => "Operating control for {$name}.",
        };
    }

    private function defaultMotive(string $metricType): string
    {
        return match ($metricType) {
            'kpi' => 'Drive management decisions, balanced recognition, corrective action, and resource allocation.',
            'gate_control_metric' => 'Prevent bypass, hold/release errors, and missing QMS/MES evidence.',
            'role_performance_measure' => 'Drive coaching, certification, OJT, and role capability growth.',
            'health_indicator' => 'Create awareness of trend risk without rating or people consequence.',
            default => 'Detect drift early and trigger owner action, escalation, or coaching.',
        };
    }

    private function defaultExpectedResult(string $metricType): string
    {
        return match ($metricType) {
            'kpi' => 'Sustained business result improvement without weakening safety, quality, delivery, or data integrity.',
            'gate_control_metric' => 'Controlled release decisions with complete evidence and fewer escaped issues.',
            'role_performance_measure' => 'Improved role competence and stable work authorization.',
            'health_indicator' => 'Earlier visibility of risk trends.',
            default => 'Faster local reaction and fewer repeated process deviations.',
        };
    }

    private function defaultDecisionPurpose(string $metricType): string
    {
        return match ($metricType) {
            'kpi' => 'Set scorecard status, management review actions, and balanced improvement priorities.',
            'gate_control_metric' => 'Decide hold, release, escalation, retraining, NCR, CAPA, or evidence correction.',
            'role_performance_measure' => 'Decide coaching, OJT, certification, role level, or work authorization.',
            'health_indicator' => 'Decide whether trend monitoring needs deeper review.',
            default => 'Decide shift/day/week actions and escalation.',
        };
    }

    /**
     * @param array<string, mixed>  $catalog
     * @param array<string, mixed>  $extra
     * @param array<string, string> $aliases
     */
    private function upsertCatalogMetric(array &$catalog, string $metricCode, string $source, array $extra, array $aliases): void
    {
        $code = strtoupper(trim($metricCode));
        if ($code === '') {
            return;
        }

        $runtimeCalculated = in_array($code, self::ALL_METRICS, true);
        $catalog[$code] ??= [
            'canonical_code' => $code,
            'name' => str_replace('_', ' ', $code),
            'sources' => [],
            'aliases' => [],
            'local_ids' => [],
            'source_classifications' => [],
            'runtime_calculated' => $runtimeCalculated,
            'backend_status' => $runtimeCalculated ? 'runtime_calculated' : 'data_contract_required',
            'unit' => self::UNITS[$code] ?? null,
            'target' => self::DEFAULT_TARGETS[$code] ?? null,
            'lower_is_better' => in_array($code, self::LOWER_IS_BETTER, true),
        ];

        if (!in_array($source, $catalog[$code]['sources'], true)) {
            $catalog[$code]['sources'][] = $source;
            sort($catalog[$code]['sources']);
        }

        foreach ($aliases as $alias => $canonical) {
            if ($canonical === $code && !in_array($alias, $catalog[$code]['aliases'], true)) {
                $catalog[$code]['aliases'][] = $alias;
                sort($catalog[$code]['aliases']);
            }
        }

        foreach ($extra as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            if ($key === 'backend_status' && $runtimeCalculated) {
                continue;
            }
            if ($key === 'runtime_calculated') {
                $catalog[$code][$key] = (bool) $value;
                continue;
            }
            if ($key === 'classification' && is_string($value)) {
                $classification = trim($value);
                if ($classification !== '') {
                    $catalog[$code]['source_classifications'][$source] = $classification;
                    $catalog[$code]['legacy_classification'] ??= $classification;
                }
                continue;
            }
            if ($key === 'local_id' && is_string($value)) {
                $localId = trim($value);
                if ($localId !== '') {
                    $catalog[$code]['local_id'] ??= $localId;
                    if (!in_array($localId, $catalog[$code]['local_ids'], true)) {
                        $catalog[$code]['local_ids'][] = $localId;
                        sort($catalog[$code]['local_ids']);
                    }
                }
                continue;
            }
            $catalog[$code][$key] = $value;
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function stringField(array $row, string $key): string
    {
        $value = $row[$key] ?? '';
        return is_string($value) ? trim($value) : '';
    }

    /**
     * @param array<string, mixed> $row
     */
    private function codeField(array $row, string $key): string
    {
        return strtoupper($this->stringField($row, $key));
    }
}
