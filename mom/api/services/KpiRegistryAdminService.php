<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Services\KpiEngine;
use RuntimeException;

/**
 * KpiRegistryAdminService — backend for the KPI Admin Console.
 *
 * The git-tracked kpi-authority-registry.json is the structural SSOT. The
 * Console edits a small set of governance fields (thresholds, owner,
 * cadence, decision/action, counter_metric); those edits are persisted to a
 * gitignored runtime overlay and merged back by KpiEngine under a
 * schema-version gate. On save the ANNEX-122 §4/§5/§6 marker regions are
 * regenerated so the controlled document always matches the registry.
 *
 * Mirrors the RaciMatrixService pattern (seed-as-SSOT + runtime overlay +
 * marker-region republication).
 *
 * @package MOM\Api\Services
 */
final class KpiRegistryAdminService
{
    private const REGISTRY_RELATIVE   = 'registry/kpi-authority-registry.json';
    private const OVERLAY_RELATIVE    = 'registry/kpi-authority-registry.runtime.json';
    private const ANNEX122_RELATIVE   = 'mom/docs/operations/references/01-ANNEX-100/'
        . '12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html';
    private const ANNEX128_RELATIVE   = 'mom/docs/operations/references/01-ANNEX-100/'
        . '12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html';
    private const KPI_MATRIX_REPORT_RELATIVE = '_reports/kpi/report-kpi-system-matrix-2026-04-19.json';

    /** Role code → [JD href relative to ANNEX-122, hover title]. */
    private const ROLE_LINKS = [
        'CEO'  => ['../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html', 'Chief Executive Officer (Tổng Giám đốc)'],
        'PD'   => ['../../../../system/organization/03-Job-Descriptions/01-JD-Executive/jd-production-director.html', 'Production Director (Giám đốc sản xuất)'],
        'CS'   => ['../../../../system/organization/03-Job-Descriptions/06-JD-Sales/jd-customer-service.html', 'Customer Service (Nhân viên dịch vụ khách hàng)'],
        'EST'  => ['../../../../system/organization/03-Job-Descriptions/06-JD-Sales/jd-estimator.html', 'Estimator (Nhân viên báo giá)'],
        'QA'   => ['../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html', 'QA Manager (Trưởng bộ phận đảm bảo chất lượng)'],
        'QC'   => ['../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qc-inspector-cmm-programmer-operator.html', 'QC Inspector / CMM Programmer-Operator (Nhân viên QC / lập trình viên - vận hành CMM)'],
        'QMS'  => ['../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html', 'QMS Engineer (Kỹ sư hệ thống QMS)'],
        'MCS'  => ['../../../../system/organization/03-Job-Descriptions/04-JD-Quality/jd-metrology-and-calibration-specialist.html', 'Metrology and Calibration Specialist (Chuyên viên đo lường và hiệu chuẩn)'],
        'FIN'  => ['../../../../system/organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html', 'Finance Manager (Quản lý tài chính)'],
        'EHS'  => ['../../../../system/organization/03-Job-Descriptions/09-JD-EHS/jd-ehs-specialist.html', 'EHS Specialist (Chuyên viên EHS)'],
        'ENGM' => ['../../../../system/organization/03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html', 'Engineering Lead / Manager (Trưởng nhóm / quản lý kỹ thuật)'],
        'PPL'  => ['../../../../system/organization/03-Job-Descriptions/02-JD-Production/jd-production-planner.html', 'Production Planner (Điều độ sản xuất)'],
        'WKM'  => ['../../../../system/organization/03-Job-Descriptions/02-JD-Production/jd-cnc-workshop-manager.html', 'CNC Workshop Manager (Quản lý phân xưởng CNC)'],
        'SL'   => ['../../../../system/organization/03-Job-Descriptions/02-JD-Production/jd-shift-leader.html', 'Shift Leader (Trưởng ca)'],
        'SCM'  => ['../../../../system/organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-supply-chain-manager.html', 'Supply Chain Manager (Quản lý chuỗi cung ứng)'],
        'HR'   => ['../../../../system/organization/03-Job-Descriptions/08-JD-HR/jd-hr-manager.html', 'HR Manager (Quản lý nhân sự)'],
        'ITA'  => ['../../../../system/organization/03-Job-Descriptions/10-JD-IT/jd-it-admin.html', 'IT Admin (Quản trị viên CNTT)'],
    ];

    private const LAYER_VI = [
        'bsc_monthly' => 'BSC tháng', 'toc_weekly' => 'TOC tuần',
        'lean_daily' => 'Lean ngày', 'qms_mes_gate' => 'Cổng QMS/MES',
    ];
    private const CADENCE_VI = [
        'per-event' => 'Theo sự kiện', 'daily' => 'Ngày',
        'weekly' => 'Tuần', 'monthly' => 'Tháng',
    ];
    private const VALID_CADENCE = ['per-event', 'daily', 'weekly', 'monthly'];
    private const VALID_CANONICAL_CODE_PATTERN = '/^[A-Z0-9_]+$/';
    private const FORBIDDEN_CANONICAL_CODE_PATTERN = '/(^|_)(GIAO|HANG|HO_SO|PHE_DUYET|BANG_CHUNG)(_|$)/';

    /**
     * MCS-EXT-1 — Metric Control Schema extension allowed values.
     * Mirrored from registry.metric_control_schema_extension.* so the service
     * can validate without re-reading the seed on every call. Kept in sync by
     * check_kpi_integrity.php P0 rule "extension_enum_sync".
     */
    private const EXT_METRIC_SUBTYPES = [
        'official_kpi', 'operating_metric', 'gate_control_metric',
        'role_performance_measure', 'health_indicator', 'counter_metric',
        'blocker_metric', 'supplier_scorecard_metric', 'okr_key_result',
        'spc_capability_metric', 'composite_readiness_index',
    ];
    private const EXT_CONTROL_INTENT = [
        'delivery_reliability', 'customer_quality_escape', 'quality_at_source',
        'flow_constraint', 'wip_queue_control', 'gate_release_control',
        'material_supplier_readiness', 'cost_margin_control',
        'safety_risk_control', 'people_competency', 'data_integrity',
        'compliance_evidence', 'continuous_improvement',
        'anti_gaming_guardrail', 'customer_specific_requirement',
    ];
    private const EXT_MEASUREMENT_DATA_TYPE = [
        'percent_ratio', 'count', 'time_duration', 'aging_days', 'money_cost',
        'queue_wip', 'binary_event', 'rubric_score', 'spc_variable',
        'attribute_defect', 'composite_index', 'risk_score',
        'evidence_completeness',
    ];
    private const EXT_SCORING_MODEL = [
        'none_monitor_only', 'binary_pass_fail', 'rag_3_band',
        'rag_5_band_stretch', 'sla_aging_bucket', 'escalation_ladder',
        'baseline_improvement', 'trend_direction', 'spc_control_chart',
        'spec_limit_capability', 'risk_matrix', 'composite_weighted_score',
        'event_severity_score', 'pareto_loss_bucket', 'blocker_only',
        'evidence_completeness_score',
    ];
    private const EXT_SCORING_BY_SUBTYPE = [
        'official_kpi' => ['rag_3_band', 'rag_5_band_stretch', 'composite_weighted_score'],
        'operating_metric' => ['rag_3_band', 'trend_direction', 'sla_aging_bucket'],
        'gate_control_metric' => ['binary_pass_fail', 'sla_aging_bucket', 'blocker_only'],
        'role_performance_measure' => ['rag_3_band', 'rubric_score', 'trend_direction'],
        'health_indicator' => ['none_monitor_only', 'trend_direction', 'evidence_completeness_score'],
        'counter_metric' => ['blocker_only', 'event_severity_score'],
        'blocker_metric' => ['blocker_only'],
        'supplier_scorecard_metric' => ['composite_weighted_score', 'rag_3_band', 'evidence_completeness_score'],
        'okr_key_result' => ['baseline_improvement', 'trend_direction'],
        'spc_capability_metric' => ['spec_limit_capability', 'spc_control_chart'],
        'composite_readiness_index' => ['composite_weighted_score'],
    ];
    private const EXT_EVALUATION_USE = [
        'none', 'daily_management', 'gate_hold_release',
        'hold_release_only_not_reward_or_discipline',
        'management_review', 'company_scorecard', 'department_scorecard',
        'role_performance_review', 'supplier_scorecard',
        'competency_certification', 'process_control_review',
        'improvement_project',
    ];
    private const EXT_REWARD_MODE = [
        'not_rewardable', 'recognition_only', 'team_reward_candidate',
        'role_review_input', 'bonus_pool_candidate', 'supplier_consequence',
        'certification_gate', 'blocker_only',
    ];
    private const EXT_ASSIGNMENT_TYPE = [
        'accountable_owner', 'process_owner', 'data_steward', 'contributor',
        'gate_approver', 'observer', 'role_measure_active',
        'role_measure_candidate', 'counter_owner', 'blocker_owner',
    ];
    private const EXT_LIFECYCLE_STATUS = [
        'draft', 'proposed', 'pilot', 'active', 'active_runtime',
        'manual_governed', 'frozen', 'deprecated', 'retired',
    ];
    private const EXT_ROWS_ACTIVE_OR_CANDIDATE = ['active', 'candidate'];

    /**
     * Reward modes that imply runtime score participation. When set, the
     * metric MUST be runtime_calculated (mirrors existing P0.7 reward gate).
     */
    private const REWARD_MODES_REQUIRE_RUNTIME = [
        'team_reward_candidate', 'role_review_input', 'bonus_pool_candidate',
    ];

    private string $rootDir;
    private string $dataDir;

    public function __construct(string $rootDir, string $dataDir)
    {
        $this->rootDir = rtrim($rootDir, '/');
        $this->dataDir = rtrim($dataDir, '/');
    }

    // ── Public API ───────────────────────────────────────────────────────

    /**
     * Load the governed KPI catalog grouped for the Console, with coverage
     * statistics. The seed registry is the structural SSOT; the runtime
     * overlay's editable fields are merged in under the same schema-version
     * gate KpiEngine applies — Console and engine never diverge.
     *
     * @return array<string, mixed>
     */
    public function load(): array
    {
        $seed    = $this->readRegistrySeed();
        $overlay = FileHelper::readJson($this->overlayPath());
        $governance = $this->mergedGovernanceKpis($seed, $overlay);
        $gate       = $this->mergedSection($seed, $overlay, 'gate_control_metrics', 'gate_overrides');
        $proposed   = $this->mergedSection($seed, $overlay, 'proposed_operating_metrics', 'proposed_overrides');
        $customerProfiles = $this->mergedCustomerRequirementProfiles($seed, $overlay);
        $effectiveSeed = $seed;
        $effectiveSeed['customer_requirement_profiles'] = $customerProfiles;

        // All metric codes — the Console counter-metric dropdown spans every
        // governed KPI so a counter can be picked across groups.
        $allCodes = [];
        foreach ([$governance, $gate, $proposed] as $set) {
            foreach ($set as $row) {
                $c = (string) ($row['canonical_code'] ?? '');
                if ($c !== '') {
                    $allCodes[$c] = true;
                }
            }
        }

        // KPI Library — every metric flattened with its classification so the
        // Console can browse and filter across all groups.
        $library = $this->buildLibrary(
            $governance,
            $gate,
            $proposed,
            is_array($overlay) ? (string) ($overlay['updated_at'] ?? '') : '',
        );
        $views = $this->buildConsoleViews($library, $effectiveSeed);

        // Console-added KPIs + retired codes already in the overlay. The
        // Console must re-send these on every save (the overlay's add/retire
        // maps are replaced wholesale), so they round-trip here.
        $emptyGroups = ['governance' => [], 'gate' => [], 'proposed' => []];
        $overlayAdded   = $emptyGroups;
        $overlayRetired = $emptyGroups;
        if (is_array($overlay)) {
            foreach (array_keys($emptyGroups) as $g) {
                if (is_array($overlay['added_kpis'][$g] ?? null)) {
                    $overlayAdded[$g] = array_values(array_filter(
                        $overlay['added_kpis'][$g],
                        'is_array',
                    ));
                }
                if (is_array($overlay['retired_codes'][$g] ?? null)) {
                    $overlayRetired[$g] = array_values(array_map(
                        'strval',
                        $overlay['retired_codes'][$g],
                    ));
                }
            }
        }

        return [
            'registry_id'       => $seed['registry_id'] ?? null,
            'registry_version'  => $seed['version'] ?? null,
            'schema_version'    => (int) ($seed['schema_version'] ?? 0),
            'overlay_present'   => is_array($overlay),
            'overlay_updated_at'=> is_array($overlay) ? ($overlay['updated_at'] ?? null) : null,
            'overlay_updated_by'=> is_array($overlay) ? ($overlay['updated_by'] ?? null) : null,
            'editable_fields'   => KpiEngine::CONSOLE_EDITABLE_FIELDS,
            'role_codes'        => array_keys(self::ROLE_LINKS),
            'cadence_options'   => self::VALID_CADENCE,
            'metric_governance_schema' => is_array($seed['metric_governance_schema'] ?? null)
                ? $seed['metric_governance_schema'] : new \stdClass(),
            'metric_control_schema_extension' => is_array($seed['metric_control_schema_extension'] ?? null)
                ? $seed['metric_control_schema_extension'] : new \stdClass(),
            'customer_requirement_profiles' => $customerProfiles !== []
                ? $customerProfiles : new \stdClass(),
            'customer_ncr_severity_matrix' => is_array($seed['customer_ncr_severity_matrix'] ?? null)
                ? $seed['customer_ncr_severity_matrix'] : new \stdClass(),
            'customer_ncr_data_contract' => is_array($seed['customer_ncr_data_contract'] ?? null)
                ? $seed['customer_ncr_data_contract'] : new \stdClass(),
            'bonus_simulation_model' => is_array($seed['bonus_simulation_model'] ?? null)
                ? $seed['bonus_simulation_model'] : new \stdClass(),
            'quality_escape_dashboard_contract' => is_array($seed['quality_escape_dashboard_contract'] ?? null)
                ? $seed['quality_escape_dashboard_contract'] : new \stdClass(),
            'ctq_characteristics' => is_array($seed['ctq_characteristics'] ?? null)
                ? $seed['ctq_characteristics'] : new \stdClass(),
            'ctq_capability_policy' => is_array($seed['ctq_capability_policy'] ?? null)
                ? $seed['ctq_capability_policy'] : new \stdClass(),
            'ctq_data_contract' => is_array($seed['ctq_data_contract'] ?? null)
                ? $seed['ctq_data_contract'] : new \stdClass(),
            'lam_evidence_pack_contract' => is_array($seed['lam_evidence_pack_contract'] ?? null)
                ? $seed['lam_evidence_pack_contract'] : new \stdClass(),
            'lean_flow_operating_model' => is_array($seed['lean_flow_operating_model'] ?? null)
                ? $seed['lean_flow_operating_model'] : new \stdClass(),
            // P08 — dashboard render + manual input contracts are exposed to
            // the portal so dashboards and the manual-input form honor the
            // same governance rules (no staged value leak, reward gate on
            // input_status, structured field allowlist).
            'dashboard_render_contract' => is_array($seed['dashboard_render_contract'] ?? null)
                ? $seed['dashboard_render_contract'] : new \stdClass(),
            'manual_input_contract' => is_array($seed['manual_input_contract'] ?? null)
                ? $seed['manual_input_contract'] : new \stdClass(),
            'admin_console_contract' => $this->adminConsoleContract(),
            'all_metric_codes'  => array_keys($allCodes),
            'governance_kpis'   => $governance,
            'gate_control_metrics'      => $gate,
            'proposed_operating_metrics'=> $proposed,
            'dashboard_core_kpis'       => $seed['dashboard_core_kpis'] ?? [],
            'process_catalog'   => $seed['process_catalog'] ?? new \stdClass(),
            'jd_kpi_scorecards' => $seed['jd_kpi_scorecards'] ?? new \stdClass(),
            'library'           => $library,
            'admin_views'        => $views,
            'official_kpis'      => $views['official_kpis'],
            'operating_metrics'  => $views['operating_metrics'],
            'gate_control_metrics_view' => $views['gate_control_metrics'],
            'role_scorecards'    => $views['role_scorecards'],
            'health_indicators'  => $views['health_indicators'],
            'counter_metrics'    => $views['counter_metrics'],
            'staged_metrics'     => $views['staged_metrics'],
            'retired_metrics'    => $views['retired_metrics'],
            'data_contracts'     => $views['data_contracts'],
            'gate_coverage'      => $views['gate_coverage'],
            'integrity_status'   => $views['integrity_status'],
            'facets'            => $this->buildFacets($library, $seed),
            'stats'             => $this->computeStats($governance),
            'overlay_added'     => $overlayAdded,
            'overlay_retired'   => $overlayRetired,
        ];
    }

    /**
     * Persist Console edits to the runtime overlay, regenerate the ANNEX-122
     * §4/§5/§6 marker regions, and return the reloaded catalog.
     *
     * @param array<string, mixed> $incoming  {governance_overrides: {CODE: {...editable...}}}
     * @param array<string, mixed> $actor
     * @return array<string, mixed>
     */
    /** Registry section → [overlay override-map key, library group name]. */
    private const OVERRIDE_SECTIONS = [
        'annex122_governance_kpis'   => 'governance_overrides',
        'gate_control_metrics'       => 'gate_overrides',
        'proposed_operating_metrics' => 'proposed_overrides',
    ];
    /** Registry section → KPI Library group key. */
    private const SECTION_GROUP = [
        'annex122_governance_kpis'   => 'governance',
        'gate_control_metrics'       => 'gate',
        'proposed_operating_metrics' => 'proposed',
    ];
    private const VALID_DIRECTION = ['higher_is_better', 'lower_is_better'];

    public function save(array $incoming, array $actor, string $reason = ''): array
    {
        $seed = $this->readRegistrySeed();

        $overlay = [
            'overlay_id'     => 'KPI-CONSOLE-OVERLAY',
            'schema_version' => (int) ($seed['schema_version'] ?? 0),
            'updated_at'     => gmdate('c'),
            'updated_by'     => $this->actorName($actor),
            'reason'         => trim($reason),
        ];
        $totalOverrides = 0;
        $effectiveGovernance = [];
        $effectiveGate = is_array($seed['gate_control_metrics'] ?? null)
            ? $seed['gate_control_metrics'] : [];
        $addedAll   = ['governance' => [], 'gate' => [], 'proposed' => []];
        $retiredAll = ['governance' => [], 'gate' => [], 'proposed' => []];

        $rawAdded   = is_array($incoming['added_kpis'] ?? null) ? $incoming['added_kpis'] : [];
        $rawRetired = is_array($incoming['retired_codes'] ?? null) ? $incoming['retired_codes'] : [];
        $rawProfiles = is_array($incoming['customer_requirement_profiles'] ?? null)
            ? $incoming['customer_requirement_profiles'] : null;

        foreach (self::OVERRIDE_SECTIONS as $section => $key) {
            $group    = self::SECTION_GROUP[$section];
            $seedRows = is_array($seed[$section] ?? null) ? $seed[$section] : [];
            $knownCodes = [];
            foreach ($seedRows as $row) {
                if (is_array($row) && isset($row['canonical_code'])) {
                    $knownCodes[strtoupper(trim((string) $row['canonical_code']))] = true;
                }
            }

            // Accept only known codes + editable fields; structural fields
            // (formula, data_source, calculation_status, gate…) never writable.
            $raw = $incoming[$key] ?? [];
            $overrides = [];
            if (is_array($raw)) {
                foreach ($raw as $code => $patch) {
                    $code = strtoupper(trim((string) $code));
                    if (!isset($knownCodes[$code]) || !is_array($patch)) {
                        continue;
                    }
                    $clean = [];
                    foreach (KpiEngine::CONSOLE_EDITABLE_FIELDS as $field) {
                        if (array_key_exists($field, $patch)) {
                            $clean[$field] = $this->sanitizeField($field, $patch[$field]);
                        }
                    }
                    if ($clean !== []) {
                        $overrides[$code] = $clean;
                    }
                }
            }

            // Console-added KPIs for this group — sanitized, codes must not
            // collide with a seed code or with each other.
            $added = [];
            $addedCodes = [];
            foreach (($rawAdded[$group] ?? []) as $patch) {
                if (!is_array($patch)) {
                    continue;
                }
                $row = $this->sanitizeAddedKpi($patch);
                $cc  = strtoupper((string) $row['canonical_code']);
                if ($cc === '') {
                    throw new RuntimeException('kpi_registry_added_missing_code');
                }
                if (isset($knownCodes[$cc]) || isset($addedCodes[$cc])) {
                    throw new RuntimeException('kpi_registry_added_code_conflict:' . $cc);
                }
                $addedCodes[$cc] = true;
                $added[] = $row;
            }
            $this->validateMetricControlRows($added, $section, true);
            $addedAll[$group] = $added;

            // Retired codes — only seed or just-added codes may be retired.
            $retired = [];
            foreach (($rawRetired[$group] ?? []) as $c) {
                $c = strtoupper(trim((string) $c));
                if ($c !== '' && (isset($knownCodes[$c]) || isset($addedCodes[$c]))) {
                    $retired[$c] = true;
                }
            }
            $retiredAll[$group] = array_keys($retired);

            // Effective rows = seed + overrides + added → validate the live
            // (non-retired) set before persisting.
            $effective = [];
            foreach ($seedRows as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $code = (string) ($row['canonical_code'] ?? '');
                if (isset($overrides[$code])) {
                    foreach ($overrides[$code] as $field => $value) {
                        $row[$field] = $value;
                    }
                }
                $effective[] = $row;
            }
            foreach ($added as $row) {
                $effective[] = $row;
            }
            $live = array_values(array_filter(
                $effective,
                static fn(array $r): bool => !isset($retired[strtoupper(trim((string) ($r['canonical_code'] ?? '')))]),
            ));
            if ($section === 'annex122_governance_kpis') {
                $this->validate($live);
                $effectiveGovernance = $live;
            } elseif ($section === 'gate_control_metrics') {
                $this->validateMetricThresholds($live, $section);
                $effectiveGate = $live;
            } else {
                $this->validateMetricThresholds($live, $section);
            }
            $this->validateMetricControlRows($live, $section, false);

            $overlay[$key] = $overrides;
            $totalOverrides += count($overrides);
        }

        $overlay['added_kpis']   = $addedAll;
        $overlay['retired_codes']= $retiredAll;
        $profileCount = 0;
        if ($rawProfiles !== null) {
            $profiles = $this->sanitizeCustomerRequirementProfiles($rawProfiles);
            $this->validateCustomerRequirementProfiles($profiles, $effectiveGovernance, $effectiveGate, $seed);
            $overlay['customer_requirement_profiles'] = $profiles;
            $profileCount = count((array) ($profiles['profiles'] ?? []));
        }

        FileHelper::writeJson($this->overlayPath(), $overlay);
        $regenerated = $this->regenerateAnnex122($effectiveGovernance, $effectiveGate);

        $addedCount   = count($addedAll['governance']) + count($addedAll['gate']) + count($addedAll['proposed']);
        $retiredCount = count($retiredAll['governance']) + count($retiredAll['gate']) + count($retiredAll['proposed']);

        return [
            'saved'            => true,
            'overlay'          => $overlay,
            'override_count'   => $totalOverrides,
            'added_count'      => $addedCount,
            'retired_count'    => $retiredCount,
            'profile_count'    => $profileCount,
            'annex122_updated' => $regenerated,
            'config'           => $this->load(),
        ];
    }

    /**
     * @param array<string, mixed>      $seed
     * @param array<string, mixed>|null $overlay
     * @return array<string, mixed>
     */
    private function mergedCustomerRequirementProfiles(array $seed, ?array $overlay): array
    {
        $root = is_array($seed['customer_requirement_profiles'] ?? null)
            ? $seed['customer_requirement_profiles'] : [];
        $seedSchema    = (int) ($seed['schema_version'] ?? 0);
        $overlaySchema = is_array($overlay) ? (int) ($overlay['schema_version'] ?? 0) : 0;
        if (!is_array($overlay) || ($seedSchema > 0 && $overlaySchema < $seedSchema)
            || !is_array($overlay['customer_requirement_profiles'] ?? null)) {
            return $root;
        }
        $patch = $overlay['customer_requirement_profiles'];
        foreach (['schema_version', 'introduced_at', 'rule', 'default_profile_code'] as $field) {
            if (array_key_exists($field, $patch)) {
                $root[$field] = $field === 'schema_version'
                    ? (int) $patch[$field]
                    : (is_scalar($patch[$field]) ? (string) $patch[$field] : $patch[$field]);
            }
        }
        $profiles = is_array($root['profiles'] ?? null) ? $root['profiles'] : [];
        foreach (($patch['profiles'] ?? []) as $code => $profile) {
            if (is_array($profile)) {
                $profiles[(string) $code] = $profile;
            }
        }
        $root['profiles'] = $profiles;
        return $root;
    }

    /**
     * Apply the runtime overlay's editable fields onto the seed governance
     * KPI rows, honoring the schema-version gate. Mirrors
     * KpiEngine::applyRuntimeOverlay so both surfaces agree.
     *
     * @param array<string, mixed>      $seed
     * @param array<string, mixed>|null $overlay
     * @return array<int, array<string, mixed>>
     */
    private function mergedGovernanceKpis(array $seed, ?array $overlay): array
    {
        return $this->mergedSection($seed, $overlay, 'annex122_governance_kpis', 'governance_overrides');
    }

    /**
     * Apply the runtime overlay's editable fields onto a seed registry
     * section, honoring the schema-version gate. Mirrors
     * KpiEngine::applyRuntimeOverlay so Console and engine never diverge.
     *
     * @param array<string, mixed>      $seed
     * @param array<string, mixed>|null $overlay
     * @return array<int, array<string, mixed>>
     */
    private function mergedSection(array $seed, ?array $overlay, string $section, string $overrideKey): array
    {
        $rows = [];
        foreach (($seed[$section] ?? []) as $row) {
            if (is_array($row)) {
                $rows[] = $row;
            }
        }

        $seedSchema    = (int) ($seed['schema_version'] ?? 0);
        $overlaySchema = is_array($overlay) ? (int) ($overlay['schema_version'] ?? 0) : 0;
        // Stale overlay (seed advanced past it) → ignore, same gate as engine.
        if (!is_array($overlay) || ($seedSchema > 0 && $overlaySchema < $seedSchema)) {
            return $rows;
        }

        // Field-level overrides onto seed rows.
        $overrides = $overlay[$overrideKey] ?? null;
        if (is_array($overrides)) {
            foreach ($rows as $i => $row) {
                $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
                $patch = $overrides[$code] ?? null;
                if (!is_array($patch)) {
                    continue;
                }
                foreach (KpiEngine::CONSOLE_EDITABLE_FIELDS as $field) {
                    if (array_key_exists($field, $patch)) {
                        $rows[$i][$field] = $patch[$field];
                    }
                }
            }
        }

        // Console-added KPIs + soft-retire markers.
        $group = self::SECTION_GROUP[$section] ?? str_replace('_overrides', '', $overrideKey);
        foreach (($overlay['added_kpis'][$group] ?? []) as $add) {
            if (is_array($add) && trim((string) ($add['canonical_code'] ?? '')) !== '') {
                $rows[] = $add;
            }
        }
        $retired = [];
        foreach (($overlay['retired_codes'][$group] ?? []) as $c) {
            $retired[strtoupper(trim((string) $c))] = true;
        }
        if ($retired !== []) {
            foreach ($rows as $i => $row) {
                $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
                if (isset($retired[$code])) {
                    $rows[$i]['retired'] = true;
                    $rows[$i]['calculation_status'] = 'retired';
                }
            }
        }
        // Every counter-metric carries a derived code + endpoint stamped from
        // its KPI's canonical code — never trusted from a Console override.
        foreach ($rows as $i => $row) {
            $rows[$i]['counter_metric'] = $this->stampCounter(
                (string) ($row['canonical_code'] ?? ''),
                $row['counter_metric'] ?? null,
            );
        }
        return $rows;
    }

    /** Derived counter-metric code for a KPI canonical code. */
    private function counterCodeFor(string $canonical): string
    {
        return strtoupper(trim($canonical)) . '-CTR';
    }

    /**
     * Stamp a counter-metric object with its derived code + data-input
     * endpoint (1:1 with the KPI). Returns null when the object has no
     * name_vi (no counter authored).
     *
     * @return array<string, mixed>|null
     */
    private function stampCounter(string $canonical, mixed $cm): ?array
    {
        if (!is_array($cm) || trim((string) ($cm['name_vi'] ?? '')) === '') {
            return null;
        }
        $code = $this->counterCodeFor($canonical);
        return [
            'code'     => $code,
            'endpoint' => 'POST /api/kpi/' . $code . '/input',
            'name_vi'  => $this->plainText((string) ($cm['name_vi'] ?? '')),
            'name'     => $this->plainText((string) ($cm['name'] ?? '')),
            'intent'   => $this->plainText((string) ($cm['intent'] ?? '')),
        ];
    }

    /**
     * Light validation for gate / proposed metrics — they carry numeric
     * thresholds and a counter_metric but not the full governance schema.
     *
     * @param array<int, array<string, mixed>> $rows
     */
    private function validateMetricThresholds(array $rows, string $section): void
    {
        foreach ($rows as $row) {
            $code = (string) ($row['canonical_code'] ?? '');
            $t = $row['thresholds'] ?? null;
            // Gate metrics that share a governance code legitimately carry no
            // own thresholds (the governance KPI is the canonical definition).
            if (is_array($t) && isset($t['green_point'])) {
                if (!is_numeric($t['green_point']) || !is_numeric($t['yellow_point'] ?? null)) {
                    throw new RuntimeException('kpi_registry_threshold_incomplete:' . $code);
                }
                $gp = (float) $t['green_point'];
                $yp = (float) $t['yellow_point'];
                $dir = (string) ($t['direction'] ?? 'higher_is_better');
                if ($dir === 'higher_is_better' && $gp < $yp) {
                    throw new RuntimeException('kpi_registry_threshold_order:' . $code);
                }
                if ($dir === 'lower_is_better' && $gp > $yp) {
                    throw new RuntimeException('kpi_registry_threshold_order:' . $code);
                }
            }
        }
    }

    /**
     * Metric Control Object enforcement. Legacy rows that carry no structural
     * MCS fields stay compatible; Console-added rows must be born complete.
     *
     * @param array<int, array<string, mixed>> $rows
     */
    private function validateMetricControlRows(array $rows, string $section, bool $requireComplete): void
    {
        foreach ($rows as $row) {
            $this->validateMetricControlObject($row, $section, $requireComplete);
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function validateMetricControlObject(array $row, string $section, bool $requireComplete): void
    {
        $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
        if ($code === '') {
            $code = '(missing-code)';
        }
        $this->assertCanonicalCode($code, 'kpi_registry_mco_invalid_code');

        $subtype = $this->sanitizeEnum($row['metric_subtype'] ?? '', self::EXT_METRIC_SUBTYPES);
        $intent = $this->sanitizeEnum($row['control_intent'] ?? '', self::EXT_CONTROL_INTENT);
        $measure = $this->sanitizeEnum($row['measurement_data_type'] ?? '', self::EXT_MEASUREMENT_DATA_TYPE);
        $scoring = $this->sanitizeEnum($row['scoring_model_detail'] ?? '', self::EXT_SCORING_MODEL);
        $evalUse = $this->sanitizeEnum($row['evaluation_use'] ?? '', self::EXT_EVALUATION_USE);
        $rewardMode = $this->sanitizeEnum($row['reward_mode'] ?? '', self::EXT_REWARD_MODE);
        $lifecycle = $this->sanitizeEnum($row['lifecycle_status'] ?? '', self::EXT_LIFECYCLE_STATUS);
        $calcStatus = trim((string) ($row['calculation_status'] ?? ''));

        $adopted = $requireComplete || $this->hasMetricControlAdoption($row);

        if ($rewardMode !== '' && in_array($rewardMode, self::REWARD_MODES_REQUIRE_RUNTIME, true)
            && $calcStatus !== '' && $calcStatus !== 'runtime_calculated') {
            throw new RuntimeException(
                'kpi_registry_mco_reward_requires_runtime:' . $code
                . ' (reward_mode=' . $rewardMode . ' but calculation_status=' . $calcStatus . ')'
            );
        }
        if ($rewardMode === 'bonus_pool_candidate') {
            $this->validateBonusPoolCandidateContract($row, $code);
        }

        if (!$adopted) {
            return;
        }

        $this->requireMcoField($subtype, 'metric_subtype', $code);
        $this->requireMcoField($intent, 'control_intent', $code);
        $this->requireMcoField($measure, 'measurement_data_type', $code);
        $this->requireMcoField($scoring, 'scoring_model_detail', $code);
        $this->requireMcoField($evalUse, 'evaluation_use', $code);
        $this->requireMcoField($rewardMode, 'reward_mode', $code);
        $this->requireMcoField($lifecycle, 'lifecycle_status', $code);

        if ($subtype !== '' && $scoring !== '' && isset(self::EXT_SCORING_BY_SUBTYPE[$subtype])
            && !in_array($scoring, self::EXT_SCORING_BY_SUBTYPE[$subtype], true)) {
            throw new RuntimeException(
                'kpi_registry_mco_scoring_subtype_mismatch:' . $code
                . ' (scoring_model_detail=' . $scoring . ', metric_subtype=' . $subtype . ')'
            );
        }

        if ($requireComplete) {
            if (!$this->hasText($row, 'owner_role')) {
                throw new RuntimeException('kpi_registry_mco_missing_owner_role:' . $code);
            }
            if (!$this->hasText($row, 'evidence_source')) {
                throw new RuntimeException('kpi_registry_mco_missing_evidence_source:' . $code);
            }
            if (!$this->hasText($row, 'data_contract_gap') || !$this->hasText($row, 'target_graduation_condition')) {
                throw new RuntimeException('kpi_registry_mco_missing_staged_contract:' . $code);
            }
            if (!in_array($subtype, ['health_indicator', 'counter_metric', 'blocker_metric'], true)
                && !$this->hasCounterIntent($row)) {
                throw new RuntimeException('kpi_registry_mco_missing_counter_metric:' . $code);
            }
            if ($subtype !== 'health_indicator' && !$this->hasNonEmptyList($row['blocking_conditions'] ?? null)) {
                throw new RuntimeException('kpi_registry_mco_missing_blocking_conditions:' . $code);
            }
            if (in_array($subtype, ['official_kpi', 'operating_metric'], true)
                && !$this->hasText($row, 'decision_action')) {
                throw new RuntimeException('kpi_registry_mco_missing_decision_action:' . $code);
            }
            if ($subtype === 'official_kpi') {
                $thresholds = is_array($row['thresholds'] ?? null) ? $row['thresholds'] : [];
                if (!is_numeric($thresholds['green_point'] ?? null) || !is_numeric($thresholds['yellow_point'] ?? null)) {
                    throw new RuntimeException('kpi_registry_mco_official_thresholds_missing:' . $code);
                }
            }
        }

        if ($subtype === 'health_indicator') {
            if ($rewardMode !== '' && $rewardMode !== 'not_rewardable') {
                throw new RuntimeException('kpi_registry_mco_health_rewardable:' . $code);
            }
            if (($row['reward_eligible'] ?? false) === true
                || ($row['scorecard_contributes_to_reward'] ?? false) === true
                || (string) ($row['scorecard_role'] ?? '') === 'scored_core') {
                throw new RuntimeException('kpi_registry_mco_health_scored_core:' . $code);
            }
        }

        if ($subtype === 'gate_control_metric') {
            foreach (['gate', 'gate_pass_condition', 'hold_release_rule', 'evidence_source'] as $field) {
                if (!$this->hasText($row, $field)) {
                    throw new RuntimeException('kpi_registry_mco_gate_missing_' . $field . ':' . $code);
                }
            }
            if (!$this->hasNonEmptyList($row['linked_cdr'] ?? null)) {
                throw new RuntimeException('kpi_registry_mco_gate_missing_linked_cdr:' . $code);
            }
            if (!in_array($rewardMode, ['blocker_only', 'not_rewardable'], true)) {
                throw new RuntimeException('kpi_registry_mco_gate_invalid_reward_mode:' . $code);
            }
        }
        if ($subtype === 'blocker_metric') {
            if ($rewardMode !== 'blocker_only') {
                throw new RuntimeException('kpi_registry_mco_blocker_invalid_reward_mode:' . $code);
            }
            if ($scoring !== 'blocker_only') {
                throw new RuntimeException('kpi_registry_mco_blocker_invalid_scoring_model:' . $code);
            }
            if (!$this->hasNonEmptyList($row['blocking_conditions'] ?? null)) {
                throw new RuntimeException('kpi_registry_mco_blocker_missing_conditions:' . $code);
            }
            if (!$this->hasText($row, 'hold_release_rule') && !$this->hasText($row, 'decision_action')) {
                throw new RuntimeException('kpi_registry_mco_blocker_missing_hold_or_action:' . $code);
            }
        }
        if ($calcStatus === 'manual_governed') {
            $manual = $row['manual_input_contract'] ?? null;
            if ((string) ($row['backend_status'] ?? '') !== 'manual_governed') {
                throw new RuntimeException('kpi_registry_mco_manual_governed_missing_backend_status:' . $code);
            }
            if ((string) ($row['primary_endpoint'] ?? '') !== 'GET /api/kpi/' . $code) {
                throw new RuntimeException('kpi_registry_mco_manual_governed_missing_primary_endpoint:' . $code);
            }
            if (!is_array($manual)) {
                throw new RuntimeException('kpi_registry_mco_manual_governed_missing_contract:' . $code);
            }
            if (!$this->hasText($manual, 'form')) {
                throw new RuntimeException('kpi_registry_mco_manual_governed_missing_form:' . $code);
            }
            if (!$this->hasNonEmptyList($manual['fields'] ?? null)) {
                throw new RuntimeException('kpi_registry_mco_manual_governed_missing_fields:' . $code);
            }
            if (trim((string) ($manual['verification'] ?? '')) === '') {
                throw new RuntimeException('kpi_registry_mco_manual_governed_missing_verification:' . $code);
            }
            if (!$this->hasText($manual, 'reward_gate')) {
                throw new RuntimeException('kpi_registry_mco_manual_governed_missing_reward_gate:' . $code);
            }
        }
        if ($calcStatus === 'runtime_calculated') {
            if ((string) ($row['backend_status'] ?? '') !== 'runtime_calculated') {
                throw new RuntimeException('kpi_registry_mco_runtime_missing_backend_status:' . $code);
            }
            if ((string) ($row['primary_endpoint'] ?? '') !== 'GET /api/kpi/' . $code) {
                throw new RuntimeException('kpi_registry_mco_runtime_missing_primary_endpoint:' . $code);
            }
        }

        if ($subtype === 'role_performance_measure') {
            if (!$this->hasNonEmptyList($row['role_assignments'] ?? null) && !$this->hasText($row, 'owner_role')) {
                throw new RuntimeException('kpi_registry_mco_role_missing_assignment:' . $code);
            }
            if (!$this->hasText($row, 'controllability_scope')
                && !$this->roleAssignmentsCarryControllability($row['role_assignments'] ?? null)) {
                throw new RuntimeException('kpi_registry_mco_role_missing_controllability:' . $code);
            }
            if (!$this->hasText($row, 'action_when_red') && !$this->hasText($row, 'decision_action')) {
                throw new RuntimeException('kpi_registry_mco_role_missing_action_when_red:' . $code);
            }
        }

        if ($subtype === 'counter_metric' && !$this->hasCounterIntent($row)
            && !$this->hasText($row, 'paired_metric') && !$this->hasText($row, 'parent_metric')) {
            throw new RuntimeException('kpi_registry_mco_counter_missing_parent_or_intent:' . $code);
        }

        if ($intent === 'customer_specific_requirement'
            && !$this->hasText($row, 'lam_profile_link')
            && !$this->hasText($row, 'customer_profile_link')
            && !$this->hasText($row, 'applicability_rule')
            && !$this->hasText($row, 'data_contract_gap')) {
            throw new RuntimeException('kpi_registry_mco_customer_specific_missing_profile:' . $code);
        }
        if ($intent === 'customer_specific_requirement' && $requireComplete
            && !$this->hasNonEmptyList($row['required_evidence'] ?? null)) {
            throw new RuntimeException('kpi_registry_mco_customer_specific_missing_required_evidence:' . $code);
        }

        if ($subtype === 'spc_capability_metric' || in_array($scoring, ['spc_control_chart', 'spec_limit_capability'], true)) {
            $sample = $row['sample_policy'] ?? null;
            if (!is_array($sample) || !isset($sample['min_n_score']) || !is_numeric($sample['min_n_score'])
                || (int) $sample['min_n_score'] <= 0) {
                throw new RuntimeException('kpi_registry_mco_sample_policy_missing:' . $code);
            }
            $this->validateSpcCapabilityContract($row, $code, $sample);
        }
        $this->validateCtqBundleContract($row, $code);

        if ($subtype === 'composite_readiness_index' || $scoring === 'composite_weighted_score') {
            $weightTotal = $this->componentWeightTotal($row['components'] ?? null);
            if ($weightTotal !== null && abs($weightTotal - 100.0) > 0.01) {
                throw new RuntimeException('kpi_registry_mco_composite_weights_not_100:' . $code);
            }
            if ($weightTotal === null && !$this->hasText($row, 'data_contract_gap')) {
                throw new RuntimeException('kpi_registry_mco_composite_weights_missing:' . $code);
            }
        }

        $this->validateScoringModelRequirements($row, $code, $scoring);
    }

    /**
     * Prompt 06 capability enforcement. A Cpk/SPC metric may be staged, but it
     * must not be born with a policy that can score/reward/customer-claim low-N
     * or un-gaged data.
     *
     * @param array<string, mixed> $row
     * @param array<string, mixed> $sample
     */
    private function validateSpcCapabilityContract(array $row, string $code, array $sample): void
    {
        $minN = (int) ($sample['min_n_score'] ?? 0);
        $internalN = (int) ($sample['internal_n'] ?? 0);
        $customerN = (int) ($sample['customer_grade_n'] ?? 0);
        if ($minN < 25 || $internalN < 50 || $customerN < 100) {
            throw new RuntimeException('kpi_registry_mco_capability_sample_thresholds_invalid:' . $code);
        }
        if (($sample['stability_required'] ?? null) !== true) {
            throw new RuntimeException('kpi_registry_mco_capability_stability_required:' . $code);
        }
        if (($sample['gage_validity_required'] ?? null) !== true) {
            throw new RuntimeException('kpi_registry_mco_capability_gage_validity_required:' . $code);
        }
        $rewardMode = strtolower(trim((string) ($row['reward_mode'] ?? '')));
        $calcStatus = (string) ($row['calculation_status'] ?? '');
        if ($calcStatus !== 'runtime_calculated' && $rewardMode !== '' && $rewardMode !== 'not_rewardable') {
            throw new RuntimeException('kpi_registry_mco_capability_staged_not_rewardable:' . $code);
        }
        if (($row['reward_eligible'] ?? false) === true || ($row['scorecard_contributes_to_reward'] ?? false) === true) {
            throw new RuntimeException('kpi_registry_mco_capability_no_direct_reward:' . $code);
        }
        if ($calcStatus === 'runtime_calculated') {
            $dataSource = $row['data_source'] ?? null;
            $hasCtqSpec = is_array($dataSource)
                && (
                    $this->hasText($dataSource, 'ctq_spec_contract')
                    || $this->hasText($dataSource, 'ctq_spec_source')
                    || $this->hasText($dataSource, 'spec_source')
                );
            if (!$hasCtqSpec) {
                throw new RuntimeException('kpi_registry_mco_capability_runtime_missing_ctq_spec_source:' . $code);
            }
        } elseif (!$this->hasText($row, 'data_contract_gap')) {
            throw new RuntimeException('kpi_registry_mco_capability_staged_gap_required:' . $code);
        }
    }

    /**
     * Prompt 05 CTQ bundle enforcement. These rows cannot drift into generic
     * metrics once the LAM capability module depends on them for real gates.
     *
     * @param array<string, mixed> $row
     */
    private function validateCtqBundleContract(array $row, string $code): void
    {
        if ($code === 'INSUFFICIENT_CPK_DATA_STATUS') {
            if ((string) ($row['metric_subtype'] ?? '') !== 'health_indicator') {
                throw new RuntimeException('kpi_registry_ctq_bundle_insufficient_must_be_health:' . $code);
            }
            if (strtolower(trim((string) ($row['reward_mode'] ?? ''))) !== 'not_rewardable') {
                throw new RuntimeException('kpi_registry_ctq_bundle_insufficient_rewardable:' . $code);
            }
        }

        if (in_array($code, ['CTQ_OUT_OF_SPEC_EVENT_COUNT', 'CTQ_SPECIAL_CAUSE_OPEN_ACTIONS'], true)) {
            if ((string) ($row['metric_subtype'] ?? '') !== 'gate_control_metric') {
                throw new RuntimeException('kpi_registry_ctq_bundle_gate_subtype_required:' . $code);
            }
            if (strtoupper(trim((string) ($row['gate'] ?? ''))) !== 'G5') {
                throw new RuntimeException('kpi_registry_ctq_bundle_gate_g5_required:' . $code);
            }
            if (!$this->hasText($row, 'lam_profile_link')) {
                throw new RuntimeException('kpi_registry_ctq_bundle_profile_link_required:' . $code);
            }
        }

        if ($code === 'POST_CHANGE_CPK_REVALIDATION'
            && strtoupper(trim((string) ($row['gate'] ?? ''))) !== 'G1') {
            throw new RuntimeException('kpi_registry_ctq_bundle_post_change_gate_g1_required:' . $code);
        }
        if ($code === 'GAGE_VALID_FOR_CTQ_MEASUREMENT'
            && strtoupper(trim((string) ($row['gate'] ?? ''))) !== 'G5') {
            throw new RuntimeException('kpi_registry_ctq_bundle_gage_gate_g5_required:' . $code);
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function validateScoringModelRequirements(array $row, string $code, string $scoring): void
    {
        if ($scoring === 'rag_3_band') {
            $t = is_array($row['thresholds'] ?? null) ? $row['thresholds'] : [];
            if (!is_numeric($t['green_point'] ?? null) || !is_numeric($t['yellow_point'] ?? null)) {
                throw new RuntimeException('kpi_registry_mco_scoring_rag_3_band_missing_thresholds:' . $code);
            }
        }

        if ($scoring === 'rag_5_band_stretch') {
            $t = is_array($row['thresholds'] ?? null) ? $row['thresholds'] : [];
            foreach (['stretch_point', 'green_point', 'yellow_point', 'red_point', 'blocked_condition'] as $key) {
                if (!isset($t[$key]) && !$this->hasText($row, $key)) {
                    throw new RuntimeException('kpi_registry_mco_scoring_rag_5_band_missing_' . $key . ':' . $code);
                }
            }
        }

        if ($scoring === 'binary_pass_fail'
            && !$this->hasText($row, 'gate_pass_condition')
            && !isset($row['thresholds']['pass_condition'])
            && !isset($row['thresholds']['fail_condition'])) {
            throw new RuntimeException('kpi_registry_mco_scoring_binary_missing_pass_fail:' . $code);
        }

        if ($scoring === 'blocker_only'
            && !$this->hasNonEmptyList($row['blocking_conditions'] ?? null)
            && !$this->hasText($row, 'hold_release_rule')) {
            throw new RuntimeException('kpi_registry_mco_scoring_blocker_missing_conditions:' . $code);
        }

        if ($scoring === 'evidence_completeness_score'
            && !$this->hasText($row, 'evidence_source')
            && !$this->hasNonEmptyList($row['required_evidence'] ?? null)) {
            throw new RuntimeException('kpi_registry_mco_scoring_evidence_missing_source:' . $code);
        }

        if ($scoring === 'event_severity_score'
            && !$this->hasNonEmptyList($row['blocking_conditions'] ?? null)
            && !$this->hasCounterIntent($row)) {
            throw new RuntimeException('kpi_registry_mco_scoring_event_severity_missing_matrix:' . $code);
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hasMetricControlAdoption(array $row): bool
    {
        foreach ([
            'metric_subtype', 'control_intent', 'measurement_data_type',
            'scoring_model_detail', 'evaluation_use', 'lifecycle_status',
            'sample_policy', 'usage_contexts', 'role_assignments',
        ] as $field) {
            $value = $row[$field] ?? null;
            if (is_string($value) && trim($value) !== '') {
                return true;
            }
            if (is_array($value) && $value !== []) {
                return true;
            }
        }
        return false;
    }

    private function requireMcoField(string $value, string $field, string $code): void
    {
        if ($value === '') {
            throw new RuntimeException('kpi_registry_mco_missing_' . $field . ':' . $code);
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hasText(array $row, string $field): bool
    {
        return trim((string) ($row[$field] ?? '')) !== '';
    }

    private function hasNonEmptyList(mixed $value): bool
    {
        if (!is_array($value)) {
            return false;
        }
        foreach ($value as $item) {
            if (is_array($item)) {
                return true;
            }
            if (trim((string) $item) !== '') {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hasCounterIntent(array $row): bool
    {
        $counter = $row['counter_metric'] ?? null;
        if (is_array($counter) && trim((string) ($counter['intent'] ?? '')) !== '') {
            return true;
        }
        return $this->hasText($row, 'anti_gaming_intent');
    }

    /**
     * @param array<string, mixed> $row
     */
    private function validateBonusPoolCandidateContract(array $row, string $code): void
    {
        if ((string) ($row['calculation_status'] ?? '') !== 'runtime_calculated') {
            throw new RuntimeException('kpi_registry_mco_bonus_requires_runtime:' . $code);
        }
        if (!$this->hasText($row, 'attribution_rule')) {
            throw new RuntimeException('kpi_registry_mco_bonus_missing_attribution:' . $code);
        }
        if (!$this->hasCounterIntent($row)) {
            throw new RuntimeException('kpi_registry_mco_bonus_missing_counter_metric:' . $code);
        }
        if (!$this->hasNonEmptyList($row['blocking_conditions'] ?? null)) {
            throw new RuntimeException('kpi_registry_mco_bonus_missing_blocking_conditions:' . $code);
        }
        if (!$this->hasRewardSamplePolicy($row)) {
            throw new RuntimeException('kpi_registry_mco_bonus_missing_min_sample:' . $code);
        }
        if (array_key_exists('calibration_required', $row) && $row['calibration_required'] === false) {
            throw new RuntimeException('kpi_registry_mco_bonus_calibration_disabled:' . $code);
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hasRewardSamplePolicy(array $row): bool
    {
        foreach ([
            ['sample_policy', 'min_n_score'],
            ['formula', 'min_sample'],
            ['thresholds', 'min_sample'],
        ] as [$objectKey, $valueKey]) {
            $object = $row[$objectKey] ?? null;
            if (is_array($object) && is_numeric($object[$valueKey] ?? null)
                && (float) $object[$valueKey] > 0) {
                return true;
            }
        }
        return false;
    }

    private function roleAssignmentsCarryControllability(mixed $value): bool
    {
        if (!is_array($value)) {
            return false;
        }
        foreach ($value as $row) {
            if (is_array($row) && trim((string) ($row['controllability_scope'] ?? '')) !== '') {
                return true;
            }
        }
        return false;
    }

    private function componentWeightTotal(mixed $value): ?float
    {
        if (!is_array($value) || $value === []) {
            return null;
        }
        $total = 0.0;
        $hasWeight = false;
        foreach ($value as $row) {
            if (is_array($row) && isset($row['weight_pct']) && is_numeric($row['weight_pct'])) {
                $total += (float) $row['weight_pct'];
                $hasWeight = true;
            }
        }
        return $hasWeight ? $total : null;
    }

    // ── KPI Library ──────────────────────────────────────────────────────

    /**
     * Flatten every governed metric into one library list, each row tagged
     * with its group, process, category and JD roles for cross-group
     * browsing and filtering.
     *
     * @param array<int, array<string, mixed>> $governance
     * @param array<int, array<string, mixed>> $gate
     * @param array<int, array<string, mixed>> $proposed
     * @return array<int, array<string, mixed>>
     */
    private function buildLibrary(array $governance, array $gate, array $proposed, string $overlayUpdatedAt = ''): array
    {
        $lib = [];
        $push = function (array $row, string $group) use (&$lib, $overlayUpdatedAt): void {
            $t = is_array($row['thresholds'] ?? null) ? $row['thresholds'] : [];
            $code = (string) ($row['canonical_code'] ?? '');
            $status = (string) ($row['calculation_status'] ?? ($row['status'] ?? ''));
            $metricType = (string) ($row['metric_type'] ?? '');
            if ($metricType === '') {
                $metricType = match ($group) {
                    'governance' => 'kpi',
                    'gate' => 'gate_control_metric',
                    default => $status === 'health_indicator' ? 'health_indicator' : 'operating_metric',
                };
            }
            $runtimeEndpoint = $status === 'runtime_calculated' ? 'GET /api/kpi/' . $code : null;
            $inputEndpoint = $code !== '' ? 'POST /api/kpi/' . $code . '/input' : null;
            $dataContractStatus = match ($status) {
                'runtime_calculated' => 'approved_runtime',
                'manual', 'manual_governed' => 'manual_governed',
                'retired' => 'retired',
                default => 'staged_data_contract',
            };
            $counterMetric = is_array($row['counter_metric'] ?? null) ? $row['counter_metric'] : null;
            $samplePolicy = is_array($row['sample_policy'] ?? null) ? $row['sample_policy'] : null;
            $dataConfidence = (string) ($row['data_confidence_level'] ?? $status);
            $lib[] = [
                'canonical_code'     => $code,
                'local_id'           => $row['local_id'] ?? null,
                'name'               => $row['name'] ?? '',
                'name_vi'            => $row['name_vi'] ?? '',
                'group'              => $group,
                'metric_type'        => $metricType,
                'usage_types'        => is_array($row['usage_types'] ?? null) ? $row['usage_types'] : [],
                'tier'               => $row['tier'] ?? null,
                'process'            => (string) ($row['process'] ?? 'unclassified'),
                'category'           => (string) ($row['category'] ?? 'internal'),
                'cadence'            => (string) ($row['cadence'] ?? ''),
                'gate'               => $row['gate'] ?? null,
                'linked_cdr'         => is_array($row['linked_cdr'] ?? null) ? $row['linked_cdr'] : [],
                'gate_pass_condition'=> $row['gate_pass_condition'] ?? '',
                'layer'              => $row['layer'] ?? null,
                'calculation_status' => $status,
                'data_contract_status' => $dataContractStatus,
                'runtime_endpoint'   => $runtimeEndpoint,
                'input_endpoint'     => $inputEndpoint,
                'primary_endpoint'   => (string) ($row['primary_endpoint'] ?? ($runtimeEndpoint ?: 'GET /api/kpi/catalog')),
                'data_contract_gap'  => (string) ($row['data_contract_gap'] ?? ''),
                'target_graduation_condition' => (string) ($row['target_graduation_condition'] ?? ''),
                'evidence_source'    => (string) ($row['evidence_source'] ?? ''),
                'blocking_conditions'=> is_array($row['blocking_conditions'] ?? null) ? $row['blocking_conditions'] : [],
                'owner_role'         => $row['owner_role'] ?? null,
                'owner'              => (string) ($row['owner_role'] ?? ''),
                'data_stewardship_role' => $row['data_stewardship_role'] ?? null,
                'data_confidence'    => $dataConfidence,
                'data_confidence_level' => $dataConfidence,
                'last_updated'       => (string) ($row['last_updated'] ?? ($overlayUpdatedAt !== '' ? $overlayUpdatedAt : null)),
                'applicable_jds'     => is_array($row['applicable_jds'] ?? null) ? $row['applicable_jds'] : [],
                'counter_metric'     => $counterMetric,
                'counter_metric_status' => [
                    'status' => $counterMetric !== null ? 'present' : 'missing',
                    'code' => is_array($counterMetric) ? (string) ($counterMetric['code'] ?? '') : '',
                    'intent' => is_array($counterMetric) ? (string) ($counterMetric['intent'] ?? '') : '',
                ],
                'purpose'            => $row['purpose'] ?? '',
                'decision_action'    => $row['decision_action'] ?? '',
                'action_reference'   => $row['action_reference'] ?? '',
                'thresholds'         => $t,
                'reward_eligible'    => (bool) ($row['reward_eligible'] ?? false),
                'retired'            => (bool) ($row['retired'] ?? false),
                'origin'             => (string) ($row['origin'] ?? 'seed'),
                // MCS-EXT-1 passthrough (all optional — empty string when absent
                // so the Console can detect "unset" without checking key presence).
                'metric_subtype'        => (string) ($row['metric_subtype'] ?? ''),
                'control_intent'        => (string) ($row['control_intent'] ?? ''),
                'measurement_data_type' => (string) ($row['measurement_data_type'] ?? ''),
                'scoring_model_detail'  => (string) ($row['scoring_model_detail'] ?? ''),
                'evaluation_use'        => (string) ($row['evaluation_use'] ?? ''),
                'reward_mode'           => (string) ($row['reward_mode'] ?? ''),
                'paired_metric'         => (string) ($row['paired_metric'] ?? ''),
                'attribution_rule'      => (string) ($row['attribution_rule'] ?? ''),
                'lifecycle_status'      => (string) ($row['lifecycle_status'] ?? ''),
                'sample_policy'         => $samplePolicy,
                'min_sample'            => is_array($samplePolicy) && is_numeric($samplePolicy['min_n_score'] ?? null)
                    ? (int) $samplePolicy['min_n_score'] : null,
                'usage_contexts'        => is_array($row['usage_contexts'] ?? null) ? $row['usage_contexts'] : [],
                'role_assignments'      => is_array($row['role_assignments'] ?? null) ? $row['role_assignments'] : [],
                // P03 — link a metric to a customer requirement profile (e.g. LAM_SEMSYSCO).
                'lam_profile_link'      => (string) ($row['lam_profile_link'] ?? ''),
                'customer_profile_link' => (string) ($row['customer_profile_link'] ?? ''),
                'applicability_rule'    => (string) ($row['applicability_rule'] ?? ''),
                'hold_release_rule'     => (string) ($row['hold_release_rule'] ?? ''),
                'controllability_scope' => (string) ($row['controllability_scope'] ?? ''),
                'action_when_red'       => (string) ($row['action_when_red'] ?? ''),
                'components'            => is_array($row['components'] ?? null) ? $row['components'] : [],
                'required_evidence'     => is_array($row['required_evidence'] ?? null) ? $row['required_evidence'] : [],
                'manual_input_contract' => is_array($row['manual_input_contract'] ?? null) ? $row['manual_input_contract'] : null,
                'manual_input_status'   => null,
                'backend_status'        => (string) ($row['backend_status'] ?? ''),
                'retention_years'       => is_numeric($row['retention_years'] ?? null) ? (int) $row['retention_years'] : null,
                'retention_owner'       => (string) ($row['retention_owner'] ?? ''),
                'staged_gap_status'     => ($status === 'runtime_calculated' || $status === 'manual_governed' || $status === 'manual')
                    ? 'closed'
                    : ((string) ($row['data_contract_gap'] ?? '') !== '' ? 'declared' : 'missing'),
            ];
        };
        foreach ($governance as $r) {
            if (is_array($r)) {
                $push($r, 'governance');
            }
        }
        foreach ($gate as $r) {
            if (is_array($r)) {
                $push($r, 'gate');
            }
        }
        foreach ($proposed as $r) {
            if (is_array($r)) {
                $push($r, 'proposed');
            }
        }
        return $lib;
    }

    /**
     * Filter facets for the KPI Library — the distinct values, with counts,
     * the Console renders as filter chips.
     *
     * @param array<int, array<string, mixed>> $library
     * @param array<string, mixed>             $seed
     * @return array<string, mixed>
     */
    private function buildFacets(array $library, array $seed): array
    {
        $count = static function (string $field) use ($library): array {
            $out = [];
            foreach ($library as $row) {
                $v = $row[$field] ?? null;
                $values = is_array($v) ? $v : [$v];
                foreach ($values as $item) {
                    $item = (string) $item;
                    if ($item === '') {
                        continue;
                    }
                    $out[$item] = ($out[$item] ?? 0) + 1;
                }
            }
            ksort($out);
            return $out;
        };
        $procCatalog = is_array($seed['process_catalog'] ?? null) ? $seed['process_catalog'] : [];
        $processFacet = [];
        foreach ($count('process') as $key => $n) {
            $meta = is_array($procCatalog[$key] ?? null) ? $procCatalog[$key] : [];
            $processFacet[] = [
                'key'   => $key,
                'label' => (string) ($meta['vi'] ?? $key),
                'gate'  => $meta['gate'] ?? null,
                'count' => $n,
            ];
        }
        $retiredCount = 0;
        $addedCount   = 0;
        foreach ($library as $row) {
            if (($row['retired'] ?? false) === true) {
                $retiredCount++;
            }
            if (in_array((string) ($row['origin'] ?? 'seed'), ['console_added', 'console_proposed'], true)) {
                $addedCount++;
            }
        }
        return [
            'process'            => $processFacet,
            'category'           => $count('category'),
            'group'              => $count('group'),
            'tier'               => $count('tier'),
            'calculation_status' => $count('calculation_status'),
            'applicable_jds'     => $count('applicable_jds'),
            'retired'            => $retiredCount,
            'console_added'      => $addedCount,
            'total'              => count($library),
            // MCS-EXT-1 filter facets.
            'metric_subtype'        => $count('metric_subtype'),
            'control_intent'        => $count('control_intent'),
            'measurement_data_type' => $count('measurement_data_type'),
            'scoring_model_detail'  => $count('scoring_model_detail'),
            'evaluation_use'        => $count('evaluation_use'),
            'reward_mode'           => $count('reward_mode'),
            'lifecycle_status'      => $count('lifecycle_status'),
        ];
    }

    /**
     * P10 Admin Console contract. Kept backend-side so the frontend renders
     * the wizard and save guardrails from an explicit contract instead of
     * relying only on UI copy.
     *
     * @return array<string, mixed>
     */
    private function adminConsoleContract(): array
    {
        return [
            'contract_id' => 'KPI-ADMIN-CONSOLE-DYNAMIC-UX-P13',
            'editor_mode' => 'field_structured_no_raw_json',
            'wizard_sections' => [
                'problem_control_intent',
                'metric_subtype',
                'measurement_data_type',
                'scoring_model',
                'data_contract_evidence',
                'evaluation_reward_weight',
                'role_assignments',
                'counter_blocker_lifecycle',
            ],
            'blocked_save_fields' => [
                'formula',
                'data_source',
                'runtime_calculator',
                'calculation_status_runtime_promotion',
                'source_table',
                'source_column',
            ],
            'ui_render_contract' => [
                'show_metric_state_badges' => ['runtime_calculated', 'manual_governed', 'staged_data_contract', 'pilot', 'retired'],
                'suppress_staged_numeric_values' => true,
                'show_counter_metric_status' => true,
                'show_action_when_red' => true,
                'show_evidence_link' => true,
            ],
            'save_policy' => [
                'console_added_metrics' => 'Chỉ số tạo từ bảng quản trị luôn ở calculation_status=staged_data_contract và lifecycle_status=pilot; bảng quản trị không được tự nâng lên runtime_calculated.',
                'runtime_metric_formula' => 'Chỉ đọc; công thức tính tự động phải đổi trong dịch vụ máy chủ có kiểm soát.',
                'runtime_metric_source_table' => 'Chỉ đọc; source_table của luồng tính tự động phải đổi qua hợp đồng dữ liệu và dịch vụ máy chủ.',
                'reward_enablement' => 'Bị chặn nếu chưa đạt hàng rào kiểm soát máy chủ về runtime_calculated, chỉ số đối trọng, điều kiện chặn, attribution_rule và cỡ mẫu tối thiểu.',
                'audit_reason' => 'Bắt buộc nhập lý do thay đổi, tối thiểu 4 ký tự và tối đa 500 ký tự.',
            ],
            'dynamic_validation_rules' => [
                'spc_capability_metric' => [
                    'sample_policy.min_n_score >= 25',
                    'sample_policy.internal_n >= 50',
                    'sample_policy.customer_grade_n >= 100',
                    'stability_required=true',
                    'gage_validity_required=true',
                    'Bắt buộc có data_contract_gap hoặc hợp đồng tính tự động cho CTQ/spec/gage.',
                ],
                'gate_control_metric' => [
                    'Bắt buộc có gate.',
                    'Bắt buộc có linked_cdr.',
                    'Bắt buộc có gate_pass_condition.',
                    'Bắt buộc có hold_release_rule.',
                    'reward_mode chỉ được là blocker_only hoặc not_rewardable',
                ],
                'composite_readiness_index' => [
                    'Bắt buộc có components.',
                    'Tổng weight của components phải bằng 100.',
                ],
                'bonus_pool_candidate' => [
                    'calculation_status phải là runtime_calculated',
                    'Bắt buộc có attribution_rule.',
                    'Bắt buộc có counter_metric intent.',
                    'Bắt buộc có blocking_conditions.',
                    'Bắt buộc có sample_policy.min_n_score hoặc formula.min_sample.',
                    'Không được tắt calibration một cách tường minh.',
                ],
                'health_indicator' => [
                    'reward_mode=not_rewardable',
                    'scorecard_contributes_to_reward=false',
                ],
                'customer_specific_requirement' => [
                    'Bắt buộc có profile link hoặc applicability rule.',
                ],
                'flow_constraint' => [
                    'Driver TOC phải có data_contract_gap và target_graduation_condition rõ ràng.',
                    'CURRENT_CONSTRAINT_RESOURCE phải có manual_input_contract với constraint_id/resource_type/resource_code/approved_by/action_due_at/evidence_reference.',
                    'Constraint driver không được rewardable hoặc scorecard_contributes_to_reward=true khi chưa runtime.',
                ],
                'wip_queue_control' => [
                    'Queue driver phải khai queue_entry/oldest item/owner/hold reason/action due/promise risk/blocker category trong contract dữ liệu hoặc nhập tay.',
                    'Queue driver staged/manual không được hiển thị như số runtime trên bảng điều hành.',
                ],
            ],
            'dynamic_field_groups' => [
                'generic_identity' => ['canonical_code', 'name', 'name_vi', 'process', 'category', 'owner_role', 'cadence'],
                'gate_control_metric' => ['gate', 'linked_cdr', 'gate_pass_condition', 'hold_release_rule', 'required_evidence', 'evidence_source'],
                'spc_capability_metric' => ['sample_policy.min_n_score', 'sample_policy.internal_n', 'sample_policy.customer_grade_n', 'sample_policy.stability_required', 'sample_policy.gage_validity_required', 'required_evidence', 'evidence_source'],
                'composite_readiness_index' => ['components', 'components.weight_pct', 'data_contract_gap', 'target_graduation_condition'],
                'customer_specific_requirement' => ['lam_profile_link', 'customer_profile_link', 'applicability_rule', 'required_evidence'],
                'reward_control' => ['reward_mode', 'attribution_rule', 'counter_metric.intent', 'blocking_conditions', 'sample_policy.min_n_score'],
                'role_performance_measure' => ['role_assignments', 'controllability_scope', 'action_when_red', 'owner_role'],
            ],
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $library
     * @param array<string, mixed>             $seed
     * @return array<string, mixed>
     */
    private function buildConsoleViews(array $library, array $seed): array
    {
        $active = static fn(array $row): bool => !($row['retired'] ?? false)
            && ($row['calculation_status'] ?? '') !== 'retired';
        $byStatus = [];
        $byType = [];
        $counterMetrics = [];
        $dataContracts = [];
        $findings = [];

        foreach ($library as $row) {
            $status = (string) ($row['calculation_status'] ?? 'unknown');
            $type = (string) ($row['metric_type'] ?? 'unknown');
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;
            $byType[$type] = ($byType[$type] ?? 0) + 1;

            $code = (string) ($row['canonical_code'] ?? '');
            $cm = is_array($row['counter_metric'] ?? null) ? $row['counter_metric'] : null;
            if ($cm !== null && trim((string) ($cm['code'] ?? '')) !== '') {
                $counterMetrics[] = [
                    'parent_code' => $code,
                    'counter_code' => (string) $cm['code'],
                    'name_vi' => (string) ($cm['name_vi'] ?? ''),
                    'intent' => (string) ($cm['intent'] ?? ''),
                    'parent_reward_eligible' => (bool) ($row['reward_eligible'] ?? false),
                    'parent_status' => $status,
                ];
            }

            $dataContracts[] = [
                'canonical_code' => $code,
                'name_vi' => (string) ($row['name_vi'] ?? ($row['name'] ?? '')),
                'group' => (string) ($row['group'] ?? ''),
                'metric_type' => $type,
                'calculation_status' => $status,
                'data_contract_status' => (string) ($row['data_contract_status'] ?? ''),
                'data_contract_gap' => (string) ($row['data_contract_gap'] ?? ''),
                'target_graduation_condition' => (string) ($row['target_graduation_condition'] ?? ''),
                'input_endpoint' => $row['input_endpoint'] ?? null,
                'runtime_endpoint' => $row['runtime_endpoint'] ?? null,
                'owner_role' => $row['owner_role'] ?? null,
            ];

            $isStaged = in_array($status, ['staged_data_contract', 'data_contract_required'], true);
            if ($isStaged && (bool) ($row['reward_eligible'] ?? false)) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'STAGED_REWARD_METRIC',
                    'metric_code' => $code,
                    'message' => 'Chỉ số chờ hợp đồng dữ liệu vẫn đang được đánh dấu đủ điều kiện tính thưởng.',
                ];
            }
            if (($row['group'] ?? '') === 'governance'
                && (bool) ($row['reward_eligible'] ?? false)
                && $cm === null) {
                $findings[] = [
                    'priority' => 'P1',
                    'code' => 'REWARD_KPI_WITHOUT_COUNTER',
                    'metric_code' => $code,
                    'message' => 'KPI có tính thưởng chưa có chỉ số đối trọng để chống thao túng.',
                ];
            }
        }

        foreach ($this->gateCoverage(array_values(array_filter(
            $library,
            static fn(array $row): bool => ($row['group'] ?? '') === 'gate',
        )))['missing_cdr_codes'] as $missingCode) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'GATE_METRIC_WITHOUT_CDR',
                'metric_code' => $missingCode,
                'message' => 'Chỉ số kiểm soát cổng chưa liên kết CDR.',
            ];
        }

        $roles = $this->roleScorecardSummary($seed['jd_kpi_scorecards']['roles'] ?? []);
        foreach ($roles as $role) {
            if (($role['active_weight_total'] ?? 100) !== 100) {
                $findings[] = [
                    'priority' => 'P1',
                    'code' => 'JD_WEIGHT_TOTAL_NOT_100',
                    'role_code' => $role['role_code'] ?? '',
                    'message' => 'Tổng trọng số thẻ điểm JD đang dùng không bằng 100.',
                ];
            }
            if (($role['active_measure_count'] ?? 0) > 6) {
                $findings[] = [
                    'priority' => 'P2',
                    'code' => 'JD_ACTIVE_SET_TOO_LARGE',
                    'role_code' => $role['role_code'] ?? '',
                    'message' => 'Bộ chỉ số đang dùng của JD có thể quá rộng để kèm cặp thực tế.',
                ];
            }
        }

        $bscPanel = $this->bscIntegrityPanel($seed, $library);
        $lamPanel = $this->lamCoveragePanel($seed);
        $evidencePackPanel = $this->lamEvidencePackPanel($seed, $library);
        $pilotGovernanceReview = $this->pilotGovernanceReview($seed, $library);
        $pilotGovernancePanel = is_array($pilotGovernanceReview['panel'] ?? null)
            ? $pilotGovernanceReview['panel'] : [];
        $cpkPanel = $this->cpkPolicyPanel($library);
        $severityPanel = $this->severityBonusPanel($seed, $library);
        $annex128Panel = $this->annex128Panel($seed);
        $leanFlowPanel = $this->leanFlowPanel($seed, $library);
        $roleFairnessPanel = $this->roleFairnessPanel($roles);
        $dataContractBacklogPanel = $this->dataContractBacklogPanel($library);
        $auditDocsPanel = $this->auditFacingDocsHealthPanel($seed, $annex128Panel);
        $worldClassPanel = $this->worldClassReadinessPanel(
            $library,
            $bscPanel,
            $lamPanel,
            $evidencePackPanel,
            $pilotGovernancePanel,
            $cpkPanel,
            $severityPanel,
            $leanFlowPanel,
            $roleFairnessPanel,
            $dataContractBacklogPanel,
            $auditDocsPanel,
        );
        foreach ([
            $bscPanel,
            $lamPanel,
            $evidencePackPanel,
            $pilotGovernancePanel,
            $cpkPanel,
            $severityPanel,
            $annex128Panel,
            $leanFlowPanel,
            $roleFairnessPanel,
            $dataContractBacklogPanel,
            $auditDocsPanel,
            $worldClassPanel,
        ] as $panel) {
            foreach (($panel['findings'] ?? []) as $finding) {
                if (is_array($finding)) {
                    $findings[] = $finding;
                }
            }
        }

        $rank = ['P0' => 0, 'P1' => 1, 'P2' => 2, 'P3' => 3];
        usort($findings, static fn(array $a, array $b): int
            => ($rank[(string) $a['priority']] ?? 3) <=> ($rank[(string) $b['priority']] ?? 3));
        $integrity = 'PASS';
        foreach ($findings as $finding) {
            if ($finding['priority'] === 'P0') {
                $integrity = 'FAIL';
                break;
            }
            if ($finding['priority'] === 'P1') {
                $integrity = 'WARN';
            }
        }

        ksort($byStatus);
        ksort($byType);

        return [
            'counts' => [
                'total_metrics' => count($library),
                'by_calculation_status' => $byStatus,
                'by_metric_type' => $byType,
                'official_active' => count(array_filter($library, static fn(array $row): bool
                    => ($row['group'] ?? '') === 'governance' && $active($row))),
                'staged' => count(array_filter($library, static fn(array $row): bool
                    => in_array((string) ($row['calculation_status'] ?? ''), ['staged_data_contract', 'data_contract_required'], true))),
                'retired' => count(array_filter($library, static fn(array $row): bool
                    => !$active($row))),
                'counter_metrics' => count($counterMetrics),
                'role_scorecards' => count($roles),
            ],
            'official_kpis' => array_values(array_filter($library, static fn(array $row): bool
                => ($row['group'] ?? '') === 'governance' && $active($row))),
            'operating_metrics' => array_values(array_filter($library, static fn(array $row): bool
                => (($row['group'] ?? '') === 'proposed' || ($row['metric_type'] ?? '') === 'operating_metric') && $active($row))),
            'gate_control_metrics' => array_values(array_filter($library, static fn(array $row): bool
                => ($row['group'] ?? '') === 'gate' && $active($row))),
            'health_indicators' => array_values(array_filter($library, static fn(array $row): bool
                => ($row['metric_type'] ?? '') === 'health_indicator' && $active($row))),
            'counter_metrics' => $counterMetrics,
            'role_scorecards' => $roles,
            'staged_metrics' => array_values(array_filter($library, static fn(array $row): bool
                => in_array((string) ($row['calculation_status'] ?? ''), ['staged_data_contract', 'data_contract_required'], true))),
            'retired_metrics' => array_values(array_filter($library, static fn(array $row): bool
                => !$active($row))),
            'data_contracts' => $dataContracts,
            'gate_coverage' => $this->gateCoverage(array_values(array_filter(
                $library,
                static fn(array $row): bool => ($row['group'] ?? '') === 'gate',
            ))),
            'pilot_governance_review' => $pilotGovernanceReview,
            'integrity_status' => [
                'status' => $integrity,
                'finding_count' => count($findings),
                'findings' => array_slice($findings, 0, 200),
            ],
            'integrity_panels' => [
                'world_class_readiness_cockpit' => $worldClassPanel,
                'lam_gate_coverage' => $lamPanel,
                'lam_evidence_pack_readiness' => $evidencePackPanel,
                'pilot_governance_readiness' => $pilotGovernancePanel,
                'ctq_cpk_backlog' => $cpkPanel,
                'customer_ncr_severity_8d' => $severityPanel,
                'driver_panel_maturity' => $leanFlowPanel,
                'role_scorecard_fairness' => $roleFairnessPanel,
                'data_contract_backlog' => $dataContractBacklogPanel,
                'audit_facing_docs_health' => $auditDocsPanel,
                'bsc_model' => $bscPanel,
                'annex128_matrix' => $annex128Panel,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $seed
     * @param array<int, array<string, mixed>> $library
     * @return array<string, mixed>
     */
    private function pilotGovernanceReview(array $seed, array $library): array
    {
        $program = is_array($seed['pilot_governance_program'] ?? null)
            ? $seed['pilot_governance_program'] : [];
        $findings = [];
        if ($program === []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'PILOT_GOVERNANCE_PROGRAM_MISSING',
                'metric_code' => 'pilot_governance_program',
                'message' => 'Pilot governance program is missing.',
            ];

            return [
                'panel' => [
                    'status' => 'FAIL',
                    'program_id' => '',
                    'scope_metric_count' => 0,
                    'review_forum_count' => 0,
                    'status_summary' => [],
                    'decision_summary' => [],
                    'findings' => $findings,
                ],
                'program_id' => '',
                'pilot_window' => [],
                'reward_freeze_controls' => [],
                'metric_rows' => [],
                'findings' => $findings,
            ];
        }

        $scope = is_array($program['pilot_scope'] ?? null) ? $program['pilot_scope'] : [];
        $window = is_array($scope['pilot_window'] ?? null) ? $scope['pilot_window'] : [];
        $freeze = is_array($program['reward_freeze_controls'] ?? null) ? $program['reward_freeze_controls'] : [];
        $dashboard = is_array($program['pilot_dashboard_contract'] ?? null) ? $program['pilot_dashboard_contract'] : [];
        $reviewContract = is_array($program['pilot_metric_review_contract'] ?? null) ? $program['pilot_metric_review_contract'] : [];
        $cadence = is_array($program['review_cadence'] ?? null) ? $program['review_cadence'] : [];
        $overrides = is_array($seed['metric_governance_overrides'] ?? null) ? $seed['metric_governance_overrides'] : [];

        if ((string) ($scope['customer_profile'] ?? '') !== 'LAM_SEMSYSCO') {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'PILOT_SCOPE_PROFILE_DRIFT',
                'metric_code' => 'pilot_scope.customer_profile',
                'message' => 'Pilot scope must remain customer_profile=LAM_SEMSYSCO.',
            ];
        }
        if ((int) ($window['duration_days'] ?? 0) !== 90) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'PILOT_WINDOW_NOT_90_DAYS',
                'metric_code' => 'pilot_scope.pilot_window',
                'message' => 'Pilot window must declare duration_days=90.',
            ];
        }
        foreach (['start_date', 'end_date'] as $dateKey) {
            if (!is_string($window[$dateKey] ?? null) || trim((string) $window[$dateKey]) === '') {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'PILOT_WINDOW_DATE_MISSING',
                    'metric_code' => 'pilot_scope.pilot_window.' . $dateKey,
                    'message' => 'Pilot window must declare start_date and end_date.',
                ];
            }
        }
        foreach (['part_families', 'work_centers', 'roles_in_scope', 'gates_in_scope', 'excluded_metrics', 'success_criteria'] as $field) {
            if (!is_array($scope[$field] ?? null) || $scope[$field] === []) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'PILOT_SCOPE_FIELD_MISSING',
                    'metric_code' => 'pilot_scope.' . $field,
                    'message' => "Pilot scope must declare non-empty '$field'.",
                ];
            }
        }

        foreach ([
            'monetary_payout_allowed',
            'payroll_impact_allowed',
            'automatic_discipline_allowed',
        ] as $flag) {
            if (($freeze[$flag] ?? true) !== false) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'PILOT_REWARD_FREEZE_FLAG_DRIFT',
                    'metric_code' => 'reward_freeze_controls.' . $flag,
                    'message' => "Pilot reward-freeze control '$flag' must remain false.",
                ];
            }
        }
        $watermark = strtoupper(trim((string) ($freeze['bonus_simulation_watermark'] ?? '')));
        foreach (['SIMULATION ONLY', 'PILOT', 'NO PAYOUT'] as $token) {
            if (!str_contains($watermark, $token)) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'PILOT_REWARD_WATERMARK_THIN',
                    'metric_code' => 'reward_freeze_controls.bonus_simulation_watermark',
                    'message' => "Pilot reward watermark must contain '$token'.",
                ];
            }
        }

        $requiredDashboardFields = [
            'metric_code',
            'metric_status_runtime_manual_staged',
            'data_confidence_level',
            'owner_role',
            'owner_action',
            'owner_action_due_date',
            'blocker_status',
            'counter_metric_status',
            'evidence_completeness_status',
            'pilot_learning_notes',
        ];
        $dashboardFields = is_array($dashboard['required_fields'] ?? null) ? $dashboard['required_fields'] : [];
        foreach ($requiredDashboardFields as $field) {
            if (!in_array($field, $dashboardFields, true)) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'PILOT_DASHBOARD_FIELD_MISSING',
                    'metric_code' => $field,
                    'message' => "Pilot dashboard contract is missing required field '$field'.",
                ];
            }
        }
        if (trim((string) ($dashboard['pilot_report_path'] ?? '')) === '') {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'PILOT_REPORT_PATH_MISSING',
                'metric_code' => 'pilot_dashboard_contract.pilot_report_path',
                'message' => 'Pilot dashboard contract must declare pilot_report_path.',
            ];
        }

        $requiredReviewFields = [
            'metric_code',
            'metric_status_runtime_manual_staged',
            'data_confidence_level',
            'known_gaps',
            'owner_role',
            'review_forum',
            'graduation_decision_after_pilot',
        ];
        $reviewFields = is_array($reviewContract['required_fields'] ?? null) ? $reviewContract['required_fields'] : [];
        foreach ($requiredReviewFields as $field) {
            if (!in_array($field, $reviewFields, true)) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'PILOT_REVIEW_FIELD_MISSING',
                    'metric_code' => $field,
                    'message' => "Pilot metric review contract is missing required field '$field'.",
                ];
            }
        }

        $requiredForums = [
            'daily_tier_review',
            'weekly_toc_constraint_review',
            'weekly_lam_evidence_review',
            'monthly_bsc_review',
            'monthly_qms_ceo_calibration',
            'pilot_retrospective',
            'day_90_go_no_go',
        ];
        $forumNames = [];
        foreach ($cadence as $row) {
            if (is_array($row)) {
                $forum = trim((string) ($row['forum'] ?? ''));
                if ($forum !== '') {
                    $forumNames[] = $forum;
                }
            }
        }
        foreach ($requiredForums as $forum) {
            if (!in_array($forum, $forumNames, true)) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'PILOT_REVIEW_FORUM_MISSING',
                    'metric_code' => $forum,
                    'message' => "Pilot review cadence is missing forum '$forum'.",
                ];
            }
        }

        $byCode = [];
        foreach ($library as $row) {
            $code = strtoupper((string) ($row['canonical_code'] ?? ''));
            if ($code !== '') {
                $byCode[$code] = $row;
            }
        }

        $scopeCodes = [];
        foreach (['scored_core', 'strategic_driver_panel', 'lam_evidence_gates', 'ctq_cpk_pilot_bundle', 'customer_quality_simulation'] as $bucket) {
            foreach ((array) ($scope[$bucket] ?? []) as $code) {
                $canon = strtoupper(trim((string) $code));
                if ($canon !== '' && !in_array($canon, $scopeCodes, true)) {
                    $scopeCodes[] = $canon;
                }
            }
        }

        $statusSummary = [];
        $decisionSummary = [];
        $metricRows = [];
        foreach ($scopeCodes as $code) {
            $row = $byCode[$code] ?? null;
            if ($row === null) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'PILOT_SCOPE_REFERENCES_UNKNOWN_METRIC',
                    'metric_code' => $code,
                    'message' => 'Pilot scope references a metric that is missing from the library.',
                ];
            }
            $status = $row === null ? 'missing_metric' : (string) ($row['calculation_status'] ?? 'unknown');
            $owner = $row === null ? '' : trim((string) ($row['owner_role'] ?? ''));
            if ($row !== null && $owner === '') {
                $findings[] = [
                    'priority' => 'P1',
                    'code' => 'PILOT_METRIC_OWNER_MISSING',
                    'metric_code' => $code,
                    'message' => 'Pilot metric is missing owner_role.',
                ];
            }
            $knownGaps = $row === null
                ? 'Metric row is missing from the library.'
                : trim((string) ($row['data_contract_gap'] ?? ''));
            if ($knownGaps === '') {
                $knownGaps = $status === 'runtime_calculated'
                    ? 'Runtime authority is available; continue pilot proof and drift monitoring.'
                    : 'No explicit gap note declared.';
            }
            $confidence = $this->pilotConfidenceLevelForStatus($status);
            $reviewForum = $this->pilotReviewForumForCode($code, $scope, $overrides);
            $decision = $this->pilotGraduationDecision($code, $row, $scope);

            $metricRows[] = [
                'metric_code' => $code,
                'metric_status_runtime_manual_staged' => $status,
                'data_confidence_level' => $confidence,
                'known_gaps' => $knownGaps,
                'owner_role' => $owner !== '' ? $owner : 'MISSING_OWNER',
                'review_forum' => $reviewForum,
                'graduation_decision_after_pilot' => $decision,
            ];
            $statusSummary[$status] = ($statusSummary[$status] ?? 0) + 1;
            $decisionSummary[$decision] = ($decisionSummary[$decision] ?? 0) + 1;
        }

        return [
            'panel' => [
                'status' => $this->panelStatusFromFindings($findings),
                'program_id' => (string) ($program['program_id'] ?? ''),
                'pilot_window' => $window,
                'scope_metric_count' => count($scopeCodes),
                'review_forum_count' => count($forumNames),
                'status_summary' => $statusSummary,
                'decision_summary' => $decisionSummary,
                'findings' => $findings,
            ],
            'program_id' => (string) ($program['program_id'] ?? ''),
            'profile' => (string) ($scope['customer_profile'] ?? ''),
            'pilot_window' => $window,
            'reward_freeze_controls' => $freeze,
            'pilot_scope' => $scope,
            'pilot_dashboard_contract' => $dashboard,
            'review_cadence' => $cadence,
            'status_summary' => $statusSummary,
            'decision_summary' => $decisionSummary,
            'metric_rows' => $metricRows,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $scope
     * @param array<string, mixed> $overrides
     */
    private function pilotReviewForumForCode(string $code, array $scope, array $overrides): string
    {
        $override = is_array($overrides[$code] ?? null) ? $overrides[$code] : [];
        $reviewForum = trim((string) ($override['review_forum'] ?? ''));
        if ($reviewForum !== '') {
            return $reviewForum;
        }

        foreach ([
            'lam_evidence_gates' => 'weekly_lam_evidence_review',
            'ctq_cpk_pilot_bundle' => 'monthly_qms_ceo_calibration',
            'customer_quality_simulation' => 'weekly_lam_evidence_review + monthly_qms_ceo_calibration',
            'strategic_driver_panel' => 'weekly_toc_constraint_review',
            'scored_core' => 'monthly_bsc_review',
        ] as $bucket => $forum) {
            if (in_array($code, (array) ($scope[$bucket] ?? []), true)) {
                return $forum;
            }
        }

        return 'monthly_bsc_review';
    }

    /**
     * @param array<string, mixed>|null $row
     * @param array<string, mixed> $scope
     */
    private function pilotGraduationDecision(string $code, ?array $row, array $scope): string
    {
        if ($row === null) {
            return 'needs_another_pilot';
        }

        $status = (string) ($row['calculation_status'] ?? '');
        if (in_array($status, ['staged_data_contract', 'data_contract_required', 'missing_metric'], true)) {
            return 'not_reward_eligible';
        }
        if ($status === 'manual' || $status === 'manual_governed') {
            return in_array($code, (array) ($scope['lam_evidence_gates'] ?? []), true)
                ? 'audit_ready'
                : 'needs_another_pilot';
        }
        if ($status === 'runtime_calculated') {
            if (in_array($code, (array) ($scope['scored_core'] ?? []), true)) {
                return 'production_ready';
            }
            if (in_array($code, (array) ($scope['customer_quality_simulation'] ?? []), true)) {
                return 'not_reward_eligible';
            }
            return 'audit_ready';
        }

        return 'needs_another_pilot';
    }

    private function pilotConfidenceLevelForStatus(string $status): string
    {
        return match ($status) {
            'runtime_calculated' => '5/5 authority-ready for pilot decision making',
            'manual_governed' => '3/5 controlled but still depends on maker-checker and review cadence',
            'manual' => '2/5 visible only after verification; not reward-eligible',
            'staged_data_contract', 'data_contract_required' => '1/5 learning-only until data contract is graduated',
            'missing_metric' => '0/5 pilot scope references a missing metric',
            default => '1/5 unknown confidence until governance clarifies the state',
        };
    }

    /**
     * @param array<int, array<string, mixed>> $roles
     * @return array<string, mixed>
     */
    private function roleFairnessPanel(array $roles): array
    {
        $countDrift = [];
        $missingNotes = [];
        $activeCandidate = [];
        foreach ($roles as $role) {
            $roleCode = (string) ($role['role_code'] ?? '');
            $recommended = (int) ($role['recommended_active_count'] ?? 0);
            $activeCount = (int) ($role['active_measure_count'] ?? 0);
            if ($recommended > 0 && $activeCount > $recommended
                && trim((string) ($role['active_count_justification'] ?? '')) === '') {
                $countDrift[] = $roleCode;
            }
            $fairnessNotes = $role['fairness_notes'] ?? null;
            if ((is_array($fairnessNotes) && $fairnessNotes === [])
                || (!is_array($fairnessNotes) && trim((string) $fairnessNotes) === '')) {
                $missingNotes[] = $roleCode;
            }
            if ((int) ($role['candidate_count'] ?? 0) > 0 && $activeCount >= $recommended && $recommended > 0) {
                $activeCandidate[] = $roleCode;
            }
        }
        $findings = [];
        if ($countDrift !== []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'ROLE_FAIRNESS_COUNT_JUSTIFICATION_MISSING',
                'metric_code' => implode(',', $countDrift),
                'message' => 'Role scorecards exceed recommended active count without a fairness justification.',
            ];
        }
        if ($missingNotes !== []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'ROLE_FAIRNESS_NOTES_MISSING',
                'metric_code' => implode(',', $missingNotes),
                'message' => 'Role scorecards are missing fairness_notes that explain controllability and review use.',
            ];
        }

        return [
            'status' => $this->panelStatusFromFindings($findings),
            'role_count' => count($roles),
            'roles_missing_fairness_notes' => $missingNotes,
            'roles_missing_count_justification' => $countDrift,
            'roles_with_candidate_backlog' => $activeCandidate,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $library
     * @return array<string, mixed>
     */
    private function dataContractBacklogPanel(array $library): array
    {
        $stagedCodes = [];
        $missingGap = [];
        $manualMissingVerification = [];
        foreach ($library as $row) {
            $code = (string) ($row['canonical_code'] ?? '');
            $status = (string) ($row['calculation_status'] ?? '');
            if (in_array($status, ['staged_data_contract', 'data_contract_required'], true)) {
                $stagedCodes[] = $code;
                if (trim((string) ($row['data_contract_gap'] ?? '')) === ''
                    || trim((string) ($row['target_graduation_condition'] ?? '')) === '') {
                    $missingGap[] = $code;
                }
            }
            if ($status === 'manual_governed') {
                $manual = is_array($row['manual_input_contract'] ?? null) ? $row['manual_input_contract'] : [];
                if (trim((string) ($manual['verification'] ?? '')) === '') {
                    $manualMissingVerification[] = $code;
                }
            }
        }
        $findings = [];
        if ($missingGap !== []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'DATA_CONTRACT_BACKLOG_MISSING_GAP',
                'metric_code' => implode(',', $missingGap),
                'message' => 'Staged metrics must declare both data_contract_gap and target_graduation_condition.',
            ];
        }
        if ($manualMissingVerification !== []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'MANUAL_GOVERNED_VERIFICATION_GAP',
                'metric_code' => implode(',', $manualMissingVerification),
                'message' => 'Manual-governed metrics are missing verification guidance in manual_input_contract.',
            ];
        }

        return [
            'status' => $this->panelStatusFromFindings($findings),
            'staged_metric_count' => count($stagedCodes),
            'staged_gap_codes' => $missingGap,
            'manual_governed_missing_verification' => $manualMissingVerification,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $seed
     * @param array<string, mixed> $annex128Panel
     * @return array<string, mixed>
     */
    private function auditFacingDocsHealthPanel(array $seed, array $annex128Panel): array
    {
        $docs = [
            'ANNEX-122' => $this->rootDir . '/' . self::ANNEX122_RELATIVE,
            'ANNEX-125' => $this->rootDir . '/mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-125-cnc-performance-operating-system.html',
            'ANNEX-126' => $this->rootDir . '/mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-126-hoshin-strategy-deployment-and-catchball.html',
            'ANNEX-127' => $this->rootDir . '/mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-127-kpi-authority-registry-and-operational-metrics.html',
            'ANNEX-128' => $this->rootDir . '/' . self::ANNEX128_RELATIVE,
            'ANNEX-129' => $this->rootDir . '/mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-129-bsc-kpi-operating-mechanism-assessment.html',
            'WI-202' => $this->rootDir . '/mom/docs/operations/work-instructions/02-WI-200/wi-202-daily-management-tier-meetings-kpi-and-escalation.html',
        ];
        $forbiddenTokens = [
            'CHECK_DIM_REPORT_ON_GIAO HÀNG',
            'DOC_HỒ SƠ_RETENTION_10Y',
            'PROCESS_CHANGE_PHÊ DUYỆT_RATE',
            'Balanced Thẻ điểm',
            'OPC UA máy Tools',
            'giao hàngments',
            'sub-nhà cung cấp',
            'đặc biệt-quy trình',
        ];
        $filesPresent = 0;
        $tokenHits = [];
        foreach ($docs as $label => $path) {
            if (!is_file($path)) {
                continue;
            }
            $filesPresent++;
            $html = (string) file_get_contents($path);
            foreach ($forbiddenTokens as $token) {
                if (stripos($html, $token) !== false) {
                    $tokenHits[] = $label . ':' . $token;
                }
            }
        }
        $findings = [];
        if ($tokenHits !== []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'AUDIT_DOC_CANONICAL_TOKEN_DRIFT',
                'metric_code' => implode(',', $tokenHits),
                'message' => 'Audit-facing documents still contain forbidden translated code or machine-translated wording.',
            ];
        }
        foreach (($annex128Panel['findings'] ?? []) as $finding) {
            if (is_array($finding)) {
                $findings[] = $finding;
            }
        }

        return [
            'status' => $this->panelStatusFromFindings($findings),
            'checked_document_count' => $filesPresent,
            'registry_version' => (string) ($seed['version'] ?? ''),
            'forbidden_token_hits' => $tokenHits,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $library
     * @param array<string, mixed> ...$panels
     * @return array<string, mixed>
     */
    private function worldClassReadinessPanel(array $library, array ...$panels): array
    {
        $runtime = 0;
        $manual = 0;
        $staged = 0;
        foreach ($library as $row) {
            $status = (string) ($row['calculation_status'] ?? '');
            if ($status === 'runtime_calculated') {
                $runtime++;
            } elseif ($status === 'manual_governed' || $status === 'manual') {
                $manual++;
            } elseif (in_array($status, ['staged_data_contract', 'data_contract_required'], true)) {
                $staged++;
            }
        }
        $panelStatuses = [];
        $findings = [];
        foreach ($panels as $panel) {
            $panelStatuses[] = (string) ($panel['status'] ?? 'PASS');
            foreach ((array) ($panel['findings'] ?? []) as $finding) {
                if (is_array($finding) && in_array((string) ($finding['priority'] ?? ''), ['P0', 'P1'], true)) {
                    $findings[] = $finding;
                }
            }
        }
        $findings = array_slice($findings, 0, 20);

        return [
            'status' => $this->panelStatusFromFindings($findings),
            'runtime_metric_count' => $runtime,
            'manual_governed_count' => $manual,
            'staged_metric_count' => $staged,
            'panel_statuses' => $panelStatuses,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $seed
     * @param array<int, array<string, mixed>> $library
     * @return array<string, mixed>
     */
    private function leanFlowPanel(array $seed, array $library): array
    {
        $leanFlow = is_array($seed['lean_flow_operating_model'] ?? null) ? $seed['lean_flow_operating_model'] : [];
        $findings = [];
        if ($leanFlow === []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'LEAN_FLOW_MODEL_MISSING',
                'metric_code' => 'lean_flow_operating_model',
                'message' => 'Lean/TOC driver operating model is missing.',
            ];
            return [
                'status' => $this->panelStatusFromFindings($findings),
                'findings' => $findings,
            ];
        }

        $known = [];
        foreach ($library as $row) {
            $code = strtoupper((string) ($row['canonical_code'] ?? ''));
            if ($code !== '') {
                $known[$code] = $row;
            }
        }

        $constraintStatuses = [];
        foreach ((array) ($leanFlow['required_constraint_metrics'] ?? []) as $code) {
            $code = strtoupper((string) $code);
            $row = $known[$code] ?? null;
            if (!is_array($row)) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'LEAN_FLOW_CONSTRAINT_METRIC_MISSING',
                    'metric_code' => $code,
                    'message' => 'Required constraint metric is missing from the KPI library.',
                ];
                continue;
            }
            $constraintStatuses[$code] = (string) ($row['calculation_status'] ?? '');
            if (($row['cadence'] ?? '') === 'monthly') {
                $findings[] = [
                    'priority' => 'P1',
                    'code' => 'LEAN_FLOW_CONSTRAINT_MONTHLY_CADENCE',
                    'metric_code' => $code,
                    'message' => 'Constraint driver cadence drifted to monthly; it must support daily/weekly action loops.',
                ];
            }
        }

        $queueStatuses = [];
        foreach ((array) ($leanFlow['cmm_qc_queue_metrics'] ?? []) as $code) {
            $code = strtoupper((string) $code);
            $row = $known[$code] ?? null;
            if (!is_array($row)) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'LEAN_FLOW_QUEUE_METRIC_MISSING',
                    'metric_code' => $code,
                    'message' => 'Required queue/control metric is missing from the KPI library.',
                ];
                continue;
            }
            $queueStatuses[$code] = (string) ($row['calculation_status'] ?? '');
        }

        $contractIds = [];
        foreach (['constraint_register_contract', 'queue_aging_contract', 'constraint_loss_contract', 'action_loop_contract'] as $field) {
            $row = is_array($leanFlow[$field] ?? null) ? $leanFlow[$field] : [];
            $contractIds[$field] = (string) ($row['contract_id'] ?? '');
            if ($row === [] || trim((string) ($row['contract_id'] ?? '')) === '') {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'LEAN_FLOW_CONTRACT_MISSING',
                    'metric_code' => $field,
                    'message' => 'Lean/TOC operating model is missing a required contract block or contract_id.',
                ];
                continue;
            }
            if (!is_array($row['required_fields'] ?? null) || $row['required_fields'] === []) {
                $findings[] = [
                    'priority' => 'P0',
                    'code' => 'LEAN_FLOW_CONTRACT_REQUIRED_FIELDS_MISSING',
                    'metric_code' => $field,
                    'message' => 'Lean/TOC contract must declare required_fields.',
                ];
            }
        }

        $forums = is_array($leanFlow['review_forums'] ?? null) ? $leanFlow['review_forums'] : [];
        if (count($forums) < 3) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'LEAN_FLOW_REVIEW_FORUMS_THIN',
                'metric_code' => 'review_forums',
                'message' => 'Lean/TOC operating model should declare daily Tier 1, daily Tier 2 and weekly TOC review forums.',
            ];
        }

        return [
            'status' => $this->panelStatusFromFindings($findings),
            'model_id' => (string) ($leanFlow['model_id'] ?? ''),
            'constraint_metric_statuses' => $constraintStatuses,
            'queue_metric_statuses' => $queueStatuses,
            'review_forum_count' => count($forums),
            'contract_ids' => $contractIds,
            'linked_outcome_metrics' => is_array($leanFlow['linked_outcome_metrics'] ?? null)
                ? $leanFlow['linked_outcome_metrics'] : [],
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $seed
     * @param array<int, array<string, mixed>> $library
     * @return array<string, mixed>
     */
    private function bscIntegrityPanel(array $seed, array $library): array
    {
        $model = is_array($seed['scorecard_operating_model'] ?? null) ? $seed['scorecard_operating_model'] : [];
        $modelId = (string) ($model['model_id'] ?? '');
        $core = is_array($seed['executive_scorecard'] ?? null) ? $seed['executive_scorecard'] : [];
        $items = is_array($model['executive_scorecard_items'] ?? null) ? $model['executive_scorecard_items'] : [];
        $weightTotal = 0.0;
        $stagedCore = [];
        $byCode = [];
        foreach ($library as $row) {
            $code = strtoupper((string) ($row['canonical_code'] ?? ''));
            if ($code !== '') {
                $byCode[$code] = $row;
            }
        }
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $code = strtoupper((string) ($item['canonical_code'] ?? ''));
            $weightTotal += (float) ($item['scorecard_weight_pct'] ?? 0);
            $status = (string) ($byCode[$code]['calculation_status'] ?? $item['calculation_status'] ?? '');
            if ($status !== 'runtime_calculated' && $status !== 'manual_governed') {
                $stagedCore[] = $code;
            }
        }
        $findings = [];
        if (!str_contains($modelId, 'LEAN-7')) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'BSC_MODEL_NOT_LEAN_7',
                'metric_code' => 'executive_scorecard',
                'message' => 'BSC operating model id does not declare LEAN-7.',
            ];
        }
        if (count($core) !== 7 || count($items) !== 7) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'BSC_CORE_COUNT_DRIFT',
                'metric_code' => 'executive_scorecard',
                'message' => 'Executive scored core must contain exactly 7 metrics.',
            ];
        }
        if (abs($weightTotal - 100.0) > 0.01) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'BSC_WEIGHT_TOTAL_NOT_100',
                'metric_code' => 'executive_scorecard',
                'message' => 'Executive scored-core weights do not sum to 100.',
            ];
        }
        if ($stagedCore !== []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'BSC_STAGED_CORE_METRIC',
                'metric_code' => implode(',', $stagedCore),
                'message' => 'Staged metric appears in the scored BSC core.',
            ];
        }

        return [
            'status' => $this->panelStatusFromFindings($findings),
            'model_id' => $modelId,
            'core_count' => count($core),
            'item_count' => count($items),
            'weight_total' => $weightTotal,
            'staged_core_metrics' => $stagedCore,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $seed
     * @return array<string, mixed>
     */
    private function lamCoveragePanel(array $seed): array
    {
        $profiles = $seed['customer_requirement_profiles']['profiles'] ?? [];
        $profile = is_array($profiles['LAM_SEMSYSCO'] ?? null) ? $profiles['LAM_SEMSYSCO'] : [];
        $coverage = is_array($profile['gate_coverage'] ?? null) ? $profile['gate_coverage'] : [];
        $byGate = [];
        $empty = [];
        foreach (['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'] as $gate) {
            $metrics = is_array($coverage[$gate] ?? null) ? array_values($coverage[$gate]) : [];
            $byGate[$gate] = count($metrics);
            if ($metrics === []) {
                $empty[] = $gate;
            }
        }
        $findings = [];
        if ($profile === []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'LAM_PROFILE_MISSING',
                'metric_code' => 'LAM_SEMSYSCO',
                'message' => 'LAM/Semsysco customer requirement profile is missing.',
            ];
        } elseif ($empty !== []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'LAM_GATE_COVERAGE_EMPTY',
                'metric_code' => implode(',', $empty),
                'message' => 'LAM/Semsysco gate coverage has empty gates.',
            ];
        }

        return [
            'status' => $this->panelStatusFromFindings($findings),
            'profile_id' => (string) ($profile['profile_id'] ?? 'LAM_SEMSYSCO'),
            'linked_metric_count' => is_array($profile['linked_metrics'] ?? null) ? count($profile['linked_metrics']) : 0,
            'gate_counts' => $byGate,
            'empty_gates' => $empty,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $seed
     * @param array<int, array<string, mixed>> $library
     * @return array<string, mixed>
     */
    private function lamEvidencePackPanel(array $seed, array $library): array
    {
        $profiles = $seed['customer_requirement_profiles']['profiles'] ?? [];
        $profile = is_array($profiles['LAM_SEMSYSCO'] ?? null) ? $profiles['LAM_SEMSYSCO'] : [];
        $contract = is_array($seed['lam_evidence_pack_contract'] ?? null) ? $seed['lam_evidence_pack_contract'] : [];
        $metricLinks = is_array($contract['mirror_profile_fields']['evidence_pack_metric_links'] ?? null)
            ? $contract['mirror_profile_fields']['evidence_pack_metric_links']
            : (is_array($profile['evidence_pack_metric_links'] ?? null) ? $profile['evidence_pack_metric_links'] : []);
        $recordKeys = is_array($contract['record_keys'] ?? null)
            ? $contract['record_keys']
            : (is_array($profile['evidence_pack_record_keys'] ?? null) ? $profile['evidence_pack_record_keys'] : []);
        $sections = is_array($contract['required_sections'] ?? null)
            ? $contract['required_sections']
            : (is_array($profile['evidence_pack_sections'] ?? null) ? $profile['evidence_pack_sections'] : []);
        $retention = is_array($contract['retention_requirements'] ?? null)
            ? $contract['retention_requirements']
            : (is_array($profile['retention_requirements'] ?? null) ? $profile['retention_requirements'] : []);
        $viewSpec = is_array($contract['audit_pack_view'] ?? null)
            ? $contract['audit_pack_view']
            : (is_array($profile['audit_pack_view'] ?? null) ? $profile['audit_pack_view'] : []);
        $retrievalTest = is_array($contract['retrieval_test'] ?? null) ? $contract['retrieval_test'] : [];

        $known = [];
        foreach ($library as $row) {
            $code = strtoupper((string) ($row['canonical_code'] ?? ''));
            if ($code !== '') {
                $known[$code] = $row;
            }
        }

        $missingMetrics = [];
        $metricStatuses = [];
        foreach ($metricLinks as $code) {
            $up = strtoupper((string) $code);
            $row = $known[$up] ?? null;
            if (!is_array($row)) {
                $missingMetrics[] = $up;
                continue;
            }
            $metricStatuses[$up] = [
                'calculation_status' => (string) ($row['calculation_status'] ?? ''),
                'group' => (string) ($row['group'] ?? ''),
                'primary_endpoint' => (string) ($row['primary_endpoint'] ?? ''),
            ];
        }

        $findings = [];
        if ($profile === []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'LAM_EVIDENCE_PACK_PROFILE_MISSING',
                'metric_code' => 'LAM_SEMSYSCO',
                'message' => 'LAM/Semsysco evidence-pack profile block is missing.',
            ];
        }
        if ($contract === []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'LAM_EVIDENCE_PACK_CONTRACT_MISSING',
                'metric_code' => 'lam_evidence_pack_contract',
                'message' => 'LAM/Semsysco evidence-pack contract block is missing.',
            ];
        }
        if ($metricLinks === []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'LAM_EVIDENCE_PACK_METRIC_LINKS_EMPTY',
                'metric_code' => 'LAM_SEMSYSCO',
                'message' => 'LAM/Semsysco evidence pack must declare metric links used for shipment audit retrieval.',
            ];
        }
        if ($missingMetrics !== []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'LAM_EVIDENCE_PACK_METRIC_MISSING',
                'metric_code' => implode(',', $missingMetrics),
                'message' => 'LAM/Semsysco evidence-pack metric links include unknown canonical codes.',
            ];
        }
        if (count($recordKeys) < 6) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'LAM_EVIDENCE_PACK_RECORD_KEYS_THIN',
                'metric_code' => 'evidence_pack_record_keys',
                'message' => 'LAM/Semsysco evidence pack should declare record keys for order/job/shipment/profile/part/revision and immutable packet lookup.',
            ];
        }
        if (count($sections) < 8) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'LAM_EVIDENCE_PACK_SECTION_THIN',
                'metric_code' => 'evidence_pack_sections',
                'message' => 'LAM/Semsysco evidence pack should declare the required audit sections end-to-end.',
            ];
        }
        if (!is_array($retrievalTest['query_keys'] ?? null) || count($retrievalTest['query_keys']) < 4) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'LAM_EVIDENCE_PACK_RETRIEVAL_KEYS_MISSING',
                'metric_code' => 'lam_evidence_pack_contract.retrieval_test',
                'message' => 'LAM/Semsysco evidence pack contract must declare retrieval query keys for PO/shipment/job/packet lookup.',
            ];
        }
        if (!is_array($retrievalTest['expected_outputs'] ?? null) || count($retrievalTest['expected_outputs']) < 4) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'LAM_EVIDENCE_PACK_RETRIEVAL_OUTPUTS_THIN',
                'metric_code' => 'lam_evidence_pack_contract.retrieval_test',
                'message' => 'LAM/Semsysco evidence pack contract should declare retrieval outputs for release package, provenance, gaps, retention and audit trail.',
            ];
        }
        if ((int) ($retention['retention_years'] ?? 0) < 10 || trim((string) ($retention['retention_owner_role'] ?? '')) === '') {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'LAM_EVIDENCE_PACK_RETENTION_GAP',
                'metric_code' => 'retention_requirements',
                'message' => 'LAM/Semsysco evidence pack must declare retention_years >= 10 and a retention_owner_role.',
            ];
        }
        if ((int) ($retention['retrieval_sla_minutes'] ?? 0) <= 0) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'LAM_EVIDENCE_PACK_RETRIEVAL_SLA_MISSING',
                'metric_code' => 'retention_requirements',
                'message' => 'Audit retrieval SLA in minutes must be declared for LAM/Semsysco evidence packs.',
            ];
        }
        if (!is_array($viewSpec['primary_views'] ?? null) || $viewSpec['primary_views'] === []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'LAM_EVIDENCE_PACK_PRIMARY_VIEW_MISSING',
                'metric_code' => 'audit_pack_view',
                'message' => 'Audit-pack view spec should declare printable/exportable primary views or endpoints.',
            ];
        }
        if (!is_array($viewSpec['required_status_panels'] ?? null) || $viewSpec['required_status_panels'] === []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'LAM_EVIDENCE_PACK_STATUS_PANEL_MISSING',
                'metric_code' => 'audit_pack_view',
                'message' => 'Audit-pack view spec should declare required status panels for gate status, blockers, source links, retention, and audit trail.',
            ];
        }

        return [
            'status' => $this->panelStatusFromFindings($findings),
            'profile_id' => (string) ($profile['profile_id'] ?? 'LAM_SEMSYSCO'),
            'metric_link_count' => count($metricLinks),
            'metric_statuses' => $metricStatuses,
            'missing_metric_links' => $missingMetrics,
            'record_key_count' => count($recordKeys),
            'section_count' => count($sections),
            'contract_id' => (string) ($contract['contract_id'] ?? ''),
            'retention_requirements' => $retention,
            'audit_pack_view' => $viewSpec,
            'retrieval_test' => $retrievalTest,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $library
     * @return array<string, mixed>
     */
    private function cpkPolicyPanel(array $library): array
    {
        $checked = 0;
        $gaps = [];
        foreach ($library as $row) {
            $subtype = (string) ($row['metric_subtype'] ?? '');
            $scoring = (string) ($row['scoring_model_detail'] ?? '');
            if ($subtype !== 'spc_capability_metric'
                && !in_array($scoring, ['spc_control_chart', 'spec_limit_capability'], true)) {
                continue;
            }
            $checked++;
            $sample = is_array($row['sample_policy'] ?? null) ? $row['sample_policy'] : [];
            if (!isset($sample['min_n_score']) || !is_numeric($sample['min_n_score'])) {
                $gaps[] = (string) ($row['canonical_code'] ?? '');
            }
        }
        $findings = [];
        if ($gaps !== []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'CPK_SAMPLE_POLICY_GAP',
                'metric_code' => implode(',', $gaps),
                'message' => 'Cpk/SPC capability metrics must declare sample_policy.min_n_score.',
            ];
        }
        return [
            'status' => $this->panelStatusFromFindings($findings),
            'checked_metric_count' => $checked,
            'gap_codes' => $gaps,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $seed
     * @param array<int, array<string, mixed>> $library
     * @return array<string, mixed>
     */
    private function severityBonusPanel(array $seed, array $library): array
    {
        $bonus = is_array($seed['bonus_simulation_model'] ?? null) ? $seed['bonus_simulation_model'] : [];
        $severity = is_array($seed['customer_ncr_severity_matrix'] ?? null) ? $seed['customer_ncr_severity_matrix'] : [];
        $required = [
            'CUSTOMER_NCR_SEVERITY_SCORE',
            'CUSTOMER_NCR_EVENTS_M',
            'DEFECTIVE_ORDER_RATE_M',
            'NO_LATE_NO_NCR_COUNTER',
            'NO_CONTAINMENT_COUNTER',
            'REPEAT_ROOT_CAUSE_ESCAPE_RATE',
            'CUSTOMER_NOTIFICATION_LT',
            'NCR_3D_RESPONSE_SLA',
            'NCR_4D_PRELIMINARY_SLA',
            'NCR_8D_UPDATE_SLA',
            'CUSTOMER_ACCEPTED_8D_CLOSURE_RATE',
            'TRAINING_AS_CAPA_COUNTER',
        ];
        $requiredLevels = [
            'internal_contained',
            'near_miss',
            'minor',
            'major',
            'critical',
            'repeat_same_root_cause',
            'late_or_no_ncr',
            'no_customer_notification',
            'no_containment',
            'unauthorized_change',
            'ship_deviation_without_special_release',
            'special_release_missing',
            'expired_gage_used_for_release',
            'falsified_record',
        ];
        $known = [];
        foreach ($library as $row) {
            $code = strtoupper((string) ($row['canonical_code'] ?? ''));
            if ($code !== '') {
                $known[$code] = true;
            }
        }
        $missing = array_values(array_filter($required, static fn(string $code): bool => !isset($known[$code])));
        $severityLevels = array_values(array_filter(
            array_keys($severity),
            static fn(string $key): bool => !in_array($key, ['matrix_id', 'authority', 'usage_rule'], true),
        ));
        $missingLevels = array_values(array_filter($requiredLevels, static fn(string $key): bool => !in_array($key, $severityLevels, true)));
        $findings = [];
        if (($bonus['simulation_only'] ?? null) !== true) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'BONUS_SIMULATION_NOT_SIM_ONLY',
                'metric_code' => 'bonus_simulation_model',
                'message' => 'Bonus simulation model must remain simulation_only=true.',
            ];
        }
        if ($severity === []) {
            $findings[] = [
                'priority' => 'P0',
                'code' => 'CUSTOMER_NCR_SEVERITY_MATRIX_MISSING',
                'metric_code' => 'customer_ncr_severity_matrix',
                'message' => 'Customer NCR severity matrix is missing.',
            ];
        }
        if ($missingLevels !== []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'CUSTOMER_NCR_SEVERITY_LEVEL_MISSING',
                'metric_code' => implode(',', $missingLevels),
                'message' => 'Customer NCR severity matrix is missing required controlled levels.',
            ];
        }
        if ($missing !== []) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'CUSTOMER_NCR_REQUIRED_METRIC_MISSING',
                'metric_code' => implode(',', $missing),
                'message' => 'Customer NCR severity/SLA required metrics are missing from the library.',
            ];
        }
        return [
            'status' => $this->panelStatusFromFindings($findings),
            'simulation_only' => (bool) ($bonus['simulation_only'] ?? false),
            'severity_levels' => $severityLevels,
            'required_metric_count' => count($required),
            'missing_required_metrics' => $missing,
            'missing_severity_levels' => $missingLevels,
            'findings' => $findings,
        ];
    }

    /**
     * @param array<string, mixed> $seed
     * @return array<string, mixed>
     */
    private function annex128Panel(array $seed): array
    {
        $version = (string) ($seed['version'] ?? '');
        $annexPath = $this->rootDir . '/' . self::ANNEX128_RELATIVE;
        $reportPath = $this->rootDir . '/' . self::KPI_MATRIX_REPORT_RELATIVE;
        $report = is_file($reportPath) ? FileHelper::readJson($reportPath) : null;
        $reportVersion = is_array($report) ? (string) ($report['registry_version'] ?? '') : '';
        $findings = [];
        if (!is_file($annexPath)) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'ANNEX128_MISSING',
                'metric_code' => 'ANNEX-128',
                'message' => 'ANNEX-128 generated matrix HTML is missing.',
            ];
        }
        if ($reportVersion === '' || $reportVersion !== $version) {
            $findings[] = [
                'priority' => 'P1',
                'code' => 'ANNEX128_REPORT_STALE',
                'metric_code' => 'ANNEX-128',
                'message' => 'Báo cáo kiểm tra ma trận hệ thống KPI đang dùng registry_version cũ, không khớp registry hiện hành.',
            ];
        }
        return [
            'status' => $this->panelStatusFromFindings($findings),
            'annex128_path' => self::ANNEX128_RELATIVE,
            'report_path' => self::KPI_MATRIX_REPORT_RELATIVE,
            'registry_version' => $version,
            'report_registry_version' => $reportVersion,
            'annex_exists' => is_file($annexPath),
            'findings' => $findings,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $findings
     */
    private function panelStatusFromFindings(array $findings): string
    {
        $status = 'PASS';
        foreach ($findings as $finding) {
            if (($finding['priority'] ?? '') === 'P0') {
                return 'FAIL';
            }
            if (($finding['priority'] ?? '') === 'P1') {
                $status = 'WARN';
            }
        }
        return $status;
    }

    /**
     * @param array<int, array<string, mixed>> $gateRows
     * @return array<string, mixed>
     */
    private function gateCoverage(array $gateRows): array
    {
        $byGate = [];
        $missing = [];
        $total = 0;
        $withCdr = 0;
        foreach ($gateRows as $row) {
            $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
            if ($code === '') {
                continue;
            }
            $gate = trim((string) ($row['gate'] ?? 'unassigned'));
            $cdr = is_array($row['linked_cdr'] ?? null) ? array_values(array_filter(
                array_map('strval', $row['linked_cdr']),
                static fn(string $v): bool => trim($v) !== '',
            )) : [];
            $total++;
            if ($cdr !== []) {
                $withCdr++;
            } else {
                $missing[] = $code;
            }
            $byGate[$gate] ??= ['gate' => $gate, 'count' => 0, 'with_cdr' => 0, 'metrics' => []];
            $byGate[$gate]['count']++;
            if ($cdr !== []) {
                $byGate[$gate]['with_cdr']++;
            }
            $byGate[$gate]['metrics'][] = [
                'canonical_code' => $code,
                'name_vi' => (string) ($row['name_vi'] ?? ($row['name'] ?? '')),
                'linked_cdr' => $cdr,
                'gate_pass_condition' => (string) ($row['gate_pass_condition'] ?? ''),
                'calculation_status' => (string) ($row['calculation_status'] ?? ''),
                'owner_role' => (string) ($row['owner_role'] ?? ''),
            ];
        }
        ksort($byGate);
        sort($missing);
        return [
            'total_gate_metrics' => $total,
            'with_linked_cdr' => $withCdr,
            'coverage_pct' => $total > 0 ? round($withCdr / $total * 100, 1) : 0.0,
            'missing_cdr_codes' => $missing,
            'by_gate' => array_values($byGate),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function roleScorecardSummary(mixed $roles): array
    {
        if (!is_array($roles)) {
            return [];
        }
        $out = [];
        foreach ($roles as $roleCode => $role) {
            if (!is_array($role)) {
                continue;
            }
            $active = is_array($role['active_scorecard'] ?? null)
                ? $role['active_scorecard']
                : (is_array($role['scorecard'] ?? null) ? $role['scorecard'] : []);
            $weightTotal = 0;
            foreach ($active as $item) {
                if (is_array($item)) {
                    $weightTotal += (int) ($item['weight'] ?? 0);
                }
            }
            $out[] = [
                'role_code' => strtoupper((string) ($role['role_code'] ?? $roleCode)),
                'jd_title_vi' => (string) ($role['jd_title_vi'] ?? ''),
                'jd_file' => (string) ($role['jd_file'] ?? ''),
                'model' => is_array($role['active_scorecard'] ?? null) ? 'active_candidate' : 'legacy_scorecard_projection',
                'role_scorecard_model' => (string) ($role['role_scorecard_model'] ?? ''),
                'recommended_active_count' => (int) ($role['recommended_active_count'] ?? count($active)),
                'active_measure_count' => count($active),
                'active_weight_total' => $weightTotal,
                'candidate_count' => is_array($role['candidate_bank'] ?? null) ? count($role['candidate_bank']) : 0,
                'optional_count' => is_array($role['optional_rotate'] ?? null) ? count($role['optional_rotate']) : 0,
                'do_not_use_count' => is_array($role['do_not_use'] ?? null) ? count($role['do_not_use']) : 0,
                'role_blocker_count' => is_array($role['role_blockers'] ?? null) ? count($role['role_blockers']) : 0,
                'controllability_scope' => (string) ($role['controllability_scope'] ?? ''),
                'active_count_justification' => (string) ($role['active_count_justification'] ?? ''),
                'attribution_rules' => is_array($role['attribution_rules'] ?? null) ? $role['attribution_rules'] : [],
                'warning' => (string) ($role['not_automatic_reward_or_discipline_warning'] ?? ''),
                'fairness_notes' => is_array($role['fairness_notes'] ?? null)
                    ? $role['fairness_notes'] : (string) ($role['fairness_notes'] ?? ''),
            ];
        }
        usort($out, static fn(array $a, array $b): int
            => strcmp((string) $a['role_code'], (string) $b['role_code']));
        return $out;
    }

    // ── Validation ───────────────────────────────────────────────────────

    /**
     * @param array<int, array<string, mixed>> $kpis
     */
    private function validate(array $kpis): void
    {
        $seen = [];
        foreach ($kpis as $row) {
            $code = (string) ($row['canonical_code'] ?? '');
            $codeKey = strtoupper(trim($code));
            if ($code === '') {
                throw new RuntimeException('kpi_registry_missing_code');
            }
            $this->assertCanonicalCode($codeKey, 'kpi_registry_invalid_code');
            if (isset($seen[$codeKey])) {
                throw new RuntimeException('kpi_registry_duplicate_code:' . $codeKey);
            }
            $seen[$codeKey] = true;

            // Numeric threshold schema (SSOT): green_point + yellow_point must
            // be present and numeric, and ordered consistently with direction.
            $t = $row['thresholds'] ?? null;
            if (!is_array($t) || !is_numeric($t['green_point'] ?? null)
                || !is_numeric($t['yellow_point'] ?? null)) {
                throw new RuntimeException('kpi_registry_threshold_incomplete:' . $code);
            }
            $gp = (float) $t['green_point'];
            $yp = (float) $t['yellow_point'];
            $dir = (string) ($t['direction'] ?? 'higher_is_better');
            if ($dir === 'higher_is_better' && $gp < $yp) {
                throw new RuntimeException('kpi_registry_threshold_order:' . $code
                    . ' (higher_is_better needs green_point >= yellow_point)');
            }
            if ($dir === 'lower_is_better' && $gp > $yp) {
                throw new RuntimeException('kpi_registry_threshold_order:' . $code
                    . ' (lower_is_better needs green_point <= yellow_point)');
            }

            if (($row['reward_eligible'] ?? false) === true) {
                if ($this->counterName($row['counter_metric'] ?? null) === '') {
                    throw new RuntimeException('kpi_registry_reward_without_counter:' . $code);
                }
            }

            $cadence = trim((string) ($row['cadence'] ?? ''));
            if ($cadence !== '' && !in_array($cadence, self::VALID_CADENCE, true)) {
                throw new RuntimeException('kpi_registry_invalid_cadence:' . $code);
            }

            // MCS-EXT-1 cross-field guardrails (only when extension fields present).
            $rewardMode = $this->sanitizeEnum($row['reward_mode'] ?? '', self::EXT_REWARD_MODE);
            if ($rewardMode !== '' && in_array($rewardMode, self::REWARD_MODES_REQUIRE_RUNTIME, true)) {
                $calcStatus = (string) ($row['calculation_status'] ?? '');
                if ($calcStatus !== '' && $calcStatus !== 'runtime_calculated') {
                    throw new RuntimeException(
                        'kpi_registry_reward_mode_requires_runtime:' . $code
                        . ' (reward_mode=' . $rewardMode . ' but calculation_status=' . $calcStatus . ')'
                    );
                }
            }
            // metric_subtype + scoring_model_detail compatibility (loose check —
            // CI guard does the full table; here we only catch obvious mis-pairings).
            $subtype = $this->sanitizeEnum($row['metric_subtype'] ?? '', self::EXT_METRIC_SUBTYPES);
            $scoring = $this->sanitizeEnum($row['scoring_model_detail'] ?? '', self::EXT_SCORING_MODEL);
            if ($subtype === 'spc_capability_metric' && $scoring !== '' &&
                !in_array($scoring, ['spec_limit_capability', 'spc_control_chart'], true)) {
                throw new RuntimeException(
                    'kpi_registry_scoring_subtype_mismatch:' . $code
                    . ' (spc_capability_metric requires spec_limit_capability or spc_control_chart, got ' . $scoring . ')'
                );
            }
            if ($subtype === 'gate_control_metric' && $scoring !== '' &&
                !in_array($scoring, ['binary_pass_fail', 'sla_aging_bucket', 'blocker_only'], true)) {
                throw new RuntimeException(
                    'kpi_registry_scoring_subtype_mismatch:' . $code
                    . ' (gate_control_metric scoring must be binary_pass_fail/sla_aging_bucket/blocker_only, got ' . $scoring . ')'
                );
            }
            // spc_capability_metric requires sample_policy with min_n_score.
            if ($subtype === 'spc_capability_metric') {
                $sp = $row['sample_policy'] ?? null;
                if (!is_array($sp) || !isset($sp['min_n_score']) || !is_numeric($sp['min_n_score'])) {
                    throw new RuntimeException(
                        'kpi_registry_sample_policy_missing:' . $code
                        . ' (spc_capability_metric requires sample_policy.min_n_score)'
                    );
                }
            }
        }
    }

    /**
     * Coerce an incoming value to one of the allowed enum values; return ''
     * (empty) when invalid or empty — caller decides whether to drop.
     */
    private function sanitizeEnum(mixed $value, array $allowed): string
    {
        if (!is_string($value) && !is_int($value)) {
            return '';
        }
        $v = strtolower(trim((string) $value));
        return in_array($v, $allowed, true) ? $v : '';
    }

    /**
     * MCS-EXT-1 sample_policy shape:
     * {min_n_score:int, provisional_n:int, internal_n:int, customer_grade_n:int,
     *  stability_required:bool, gage_validity_required:bool}
     */
    private function sanitizeSamplePolicy(mixed $value): ?array
    {
        if (!is_array($value)) {
            return null;
        }
        $out = [];
        // n values clamped to >=0; negative would defeat the n >= min_n_score
        // gate and force everything to score, bypassing the sample-policy intent.
        foreach (['min_n_score', 'provisional_n', 'internal_n', 'customer_grade_n'] as $k) {
            if (isset($value[$k]) && is_numeric($value[$k])) {
                $out[$k] = max(0, (int) $value[$k]);
            }
        }
        foreach (['stability_required', 'gage_validity_required'] as $k) {
            if (isset($value[$k])) {
                $out[$k] = (bool) $value[$k];
            }
        }
        return $out === [] ? null : $out;
    }

    /**
     * MCS-EXT-1 role_assignments shape (array of objects):
     * [{role, assignment_type, weight_pct, active_or_candidate, controllability_scope}]
     */
    private function sanitizeRoleAssignments(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $row) {
            if (!is_array($row)) {
                continue;
            }
            $role = $this->plainText((string) ($row['role'] ?? ''));
            if ($role === '') {
                continue;
            }
            $assignment = $this->sanitizeEnum($row['assignment_type'] ?? '', self::EXT_ASSIGNMENT_TYPE);
            $aoc = $this->sanitizeEnum($row['active_or_candidate'] ?? '', self::EXT_ROWS_ACTIVE_OR_CANDIDATE);
            $entry = ['role' => strtoupper($role)];
            if ($assignment !== '') {
                $entry['assignment_type'] = $assignment;
            }
            if (isset($row['weight_pct']) && is_numeric($row['weight_pct'])) {
                $entry['weight_pct'] = (float) $row['weight_pct'];
            }
            if ($aoc !== '') {
                $entry['active_or_candidate'] = $aoc;
            }
            $ctrl = $this->plainText((string) ($row['controllability_scope'] ?? ''));
            if ($ctrl !== '') {
                $entry['controllability_scope'] = $ctrl;
            }
            $out[] = $entry;
        }
        return $out;
    }

    /**
     * @return list<string>
     */
    private function sanitizeStringList(mixed $value): array
    {
        if (is_string($value)) {
            $value = preg_split('/\R|,/', $value) ?: [];
        }
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $item) {
            $text = $this->plainText((string) $item);
            if ($text !== '') {
                $out[] = $text;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * @param array<string, mixed> $root
     * @return array<string, mixed>
     */
    private function sanitizeCustomerRequirementProfiles(array $root): array
    {
        $out = [];
        foreach (['schema_version', 'introduced_at', 'rule', 'default_profile_code'] as $field) {
            if (array_key_exists($field, $root)) {
                $out[$field] = $field === 'schema_version'
                    ? (int) $root[$field]
                    : $this->plainText((string) $root[$field]);
            }
        }
        $profiles = [];
        foreach (($root['profiles'] ?? []) as $code => $profile) {
            if (!is_array($profile)) {
                continue;
            }
            $profileCode = preg_replace('/[^A-Z0-9_]/', '', strtoupper((string) $code)) ?? '';
            if ($profileCode === '') {
                continue;
            }
            $applies = is_array($profile['applies_when'] ?? null) ? $profile['applies_when'] : [];
            $cleanApplies = [
                'customer_codes' => $this->sanitizeStringList($applies['customer_codes'] ?? []),
                'manual_profile_assignment_allowed' => (bool) ($applies['manual_profile_assignment_allowed'] ?? true),
                'order_or_po_override_allowed' => (bool) ($applies['order_or_po_override_allowed'] ?? true),
                'default_for_unassigned' => (bool) ($applies['default_for_unassigned'] ?? false),
            ];
            foreach (['silent_default_forbidden', 'assignment_event_required'] as $flag) {
                if (array_key_exists($flag, $applies)) {
                    $cleanApplies[$flag] = (bool) $applies[$flag];
                }
            }
            if (is_array($applies['assignment_event_contract'] ?? null)) {
                $contract = $applies['assignment_event_contract'];
                $cleanApplies['assignment_event_contract'] = [
                    'event_name' => $this->plainText((string) ($contract['event_name'] ?? '')),
                    'required_fields' => $this->sanitizeStringList($contract['required_fields'] ?? []),
                    'g1_block_rule' => $this->plainText((string) ($contract['g1_block_rule'] ?? '')),
                ];
            }

            $qreq = [];
            if (is_array($profile['quality_requirements'] ?? null)) {
                foreach ($profile['quality_requirements'] as $k => $v) {
                    $key = preg_replace('/[^a-zA-Z0-9_]/', '', (string) $k) ?? '';
                    if ($key === '') {
                        continue;
                    }
                    if (is_bool($v) || is_int($v) || is_float($v) || is_string($v)) {
                        $qreq[$key] = is_string($v) ? $this->plainText($v) : $v;
                    } elseif (is_array($v)) {
                        $qreq[$key] = $this->sanitizeStringList($v);
                    }
                }
            }

            $gateCoverage = [];
            if (is_array($profile['gate_coverage'] ?? null)) {
                foreach ($profile['gate_coverage'] as $gate => $codes) {
                    $g = strtoupper(preg_replace('/[^G0-9]/', '', (string) $gate) ?? '');
                    if ($g !== '') {
                        $gateCoverage[$g] = $this->sanitizeStringList($codes);
                    }
                }
            }

            $profiles[$profileCode] = [
                'profile_id' => $this->plainText((string) ($profile['profile_id'] ?? $profileCode)),
                'profile_name' => $this->plainText((string) ($profile['profile_name'] ?? '')),
                'profile_name_vi' => $this->plainText((string) ($profile['profile_name_vi'] ?? '')),
                'status' => $this->plainText((string) ($profile['status'] ?? 'active')),
                'applies_when' => $cleanApplies,
                'quality_requirements' => $qreq,
                'linked_metrics' => $this->sanitizeStringList($profile['linked_metrics'] ?? []),
            ];
            if ($gateCoverage !== []) {
                $profiles[$profileCode]['gate_coverage'] = $gateCoverage;
            }
            $evidence = $this->sanitizeStringList($profile['evidence_pack_required'] ?? []);
            if ($evidence !== []) {
                $profiles[$profileCode]['evidence_pack_required'] = $evidence;
            }
            $evidenceMetricLinks = $this->sanitizeStringList($profile['evidence_pack_metric_links'] ?? []);
            if ($evidenceMetricLinks !== []) {
                $profiles[$profileCode]['evidence_pack_metric_links'] = $evidenceMetricLinks;
            }
            $recordKeys = $this->sanitizeStringList($profile['evidence_pack_record_keys'] ?? []);
            if ($recordKeys !== []) {
                $profiles[$profileCode]['evidence_pack_record_keys'] = $recordKeys;
            }
            $sections = $this->sanitizeStringList($profile['evidence_pack_sections'] ?? []);
            if ($sections !== []) {
                $profiles[$profileCode]['evidence_pack_sections'] = $sections;
            }
            if (is_array($profile['retention_requirements'] ?? null)) {
                $retention = $profile['retention_requirements'];
                $profiles[$profileCode]['retention_requirements'] = [
                    'record_class' => $this->plainText((string) ($retention['record_class'] ?? '')),
                    'retention_years' => max(0, (int) ($retention['retention_years'] ?? 0)),
                    'retention_owner_role' => $this->plainText((string) ($retention['retention_owner_role'] ?? '')),
                    'storage_authority' => $this->plainText((string) ($retention['storage_authority'] ?? '')),
                    'retrieval_sla_minutes' => max(0, (int) ($retention['retrieval_sla_minutes'] ?? 0)),
                    'immutable_hash_required' => (bool) ($retention['immutable_hash_required'] ?? false),
                    'export_copy_required' => (bool) ($retention['export_copy_required'] ?? false),
                    'authority_endpoints' => $this->sanitizeStringList($retention['authority_endpoints'] ?? []),
                ];
            }
            if (is_array($profile['audit_pack_view'] ?? null)) {
                $view = $profile['audit_pack_view'];
                $profiles[$profileCode]['audit_pack_view'] = [
                    'printable_exportable' => (bool) ($view['printable_exportable'] ?? false),
                    'primary_views' => $this->sanitizeStringList($view['primary_views'] ?? []),
                    'required_status_panels' => $this->sanitizeStringList($view['required_status_panels'] ?? []),
                    'required_links' => $this->sanitizeStringList($view['required_links'] ?? []),
                    'audit_trail_required' => (bool) ($view['audit_trail_required'] ?? false),
                    'missing_evidence_must_render' => (bool) ($view['missing_evidence_must_render'] ?? false),
                ];
            }
            if (is_array($profile['activation_flow'] ?? null)) {
                $profiles[$profileCode]['activation_flow'] = $this->sanitizeStringList($profile['activation_flow']);
            }
        }
        $out['profiles'] = $profiles;
        return $out;
    }

    /**
     * @param array<string, mixed>          $root
     * @param array<int, array<string,mixed>> $governance
     * @param array<int, array<string,mixed>> $gate
     * @param array<string, mixed>          $seed
     */
    private function validateCustomerRequirementProfiles(array $root, array $governance, array $gate, array $seed): void
    {
        $profiles = is_array($root['profiles'] ?? null) ? $root['profiles'] : [];
        if ($profiles === []) {
            throw new RuntimeException('kpi_registry_customer_profiles_empty');
        }
        $codes = [];
        $gateRows = [];
        $collect = static function (array $rows) use (&$codes): void {
            foreach ($rows as $row) {
                if (is_array($row)) {
                    $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
                    if ($code !== '') {
                        $codes[$code] = true;
                    }
                }
            }
        };
        $collect($governance);
        $collect($gate);
        $collect(is_array($seed['proposed_operating_metrics'] ?? null) ? $seed['proposed_operating_metrics'] : []);
        foreach ($gate as $row) {
            if (is_array($row)) {
                $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
                if ($code !== '') {
                    $gateRows[$code] = $row;
                }
            }
        }
        foreach ((array) ($seed['runtime_calculated_metrics'] ?? []) as $code) {
            $codes[strtoupper((string) $code)] = true;
        }

        foreach ($profiles as $code => $profile) {
            if (!is_array($profile)) {
                throw new RuntimeException('kpi_registry_customer_profile_not_object:' . $code);
            }
            if (trim((string) ($profile['profile_id'] ?? $code)) === '') {
                throw new RuntimeException('kpi_registry_customer_profile_missing_profile_id:' . $code);
            }
            if (trim((string) ($profile['profile_name'] ?? '')) === ''
                && trim((string) ($profile['profile_name_vi'] ?? '')) === '') {
                throw new RuntimeException('kpi_registry_customer_profile_missing_name:' . $code);
            }
            if (!is_array($profile['applies_when'] ?? null)) {
                throw new RuntimeException('kpi_registry_customer_profile_missing_applies_when:' . $code);
            }
            if (!is_array($profile['quality_requirements'] ?? null)) {
                throw new RuntimeException('kpi_registry_customer_profile_missing_quality_requirements:' . $code);
            }
            $linkedMetrics = array_values(array_map(
                static fn($value): string => strtoupper(trim((string) $value)),
                (array) ($profile['linked_metrics'] ?? [])
            ));
            if ($linkedMetrics === []) {
                throw new RuntimeException('kpi_registry_customer_profile_missing_linked_metrics:' . $code);
            }
            foreach ((array) ($profile['linked_metrics'] ?? []) as $linked) {
                $linkedCode = strtoupper(trim((string) $linked));
                if ($linkedCode !== '' && !isset($codes[$linkedCode])) {
                    throw new RuntimeException('kpi_registry_customer_profile_unknown_metric:' . $code . ':' . $linkedCode);
                }
            }
            $gateCoverage = is_array($profile['gate_coverage'] ?? null) ? $profile['gate_coverage'] : [];
            foreach ($gateCoverage as $gateName => $metricCodes) {
                $gate = strtoupper(trim((string) $gateName));
                $list = array_values(array_filter(array_map(
                    static fn($value): string => strtoupper(trim((string) $value)),
                    (array) $metricCodes
                )));
                foreach ($list as $metricCode) {
                    if (!isset($codes[$metricCode])) {
                        throw new RuntimeException('kpi_registry_customer_profile_unknown_gate_metric:' . $code . ':' . $gate . ':' . $metricCode);
                    }
                    if (!in_array($metricCode, $linkedMetrics, true)) {
                        throw new RuntimeException('kpi_registry_customer_profile_gate_metric_not_linked:' . $code . ':' . $gate . ':' . $metricCode);
                    }
                    $gateRow = $gateRows[$metricCode] ?? null;
                    if (!is_array($gateRow)) {
                        throw new RuntimeException('kpi_registry_customer_profile_gate_metric_missing_row:' . $code . ':' . $gate . ':' . $metricCode);
                    }
                    if (strtoupper(trim((string) ($gateRow['gate'] ?? ''))) !== $gate) {
                        throw new RuntimeException('kpi_registry_customer_profile_gate_metric_gate_mismatch:' . $code . ':' . $gate . ':' . $metricCode);
                    }
                    if (trim((string) ($gateRow['lam_profile_link'] ?? '')) !== $code) {
                        throw new RuntimeException('kpi_registry_customer_profile_gate_metric_profile_mismatch:' . $code . ':' . $gate . ':' . $metricCode);
                    }
                }
            }
            if ($code === 'LAM_SEMSYSCO') {
                foreach (['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'] as $gate) {
                    $list = array_values(array_filter(array_map(
                        static fn($value): string => strtoupper(trim((string) $value)),
                        (array) ($gateCoverage[$gate] ?? [])
                    )));
                    if ($list === []) {
                        throw new RuntimeException('kpi_registry_customer_profile_lam_empty_gate:' . $gate);
                    }
                }
                if ($this->sanitizeStringList($profile['evidence_pack_required'] ?? []) === []) {
                    throw new RuntimeException('kpi_registry_customer_profile_lam_missing_evidence_pack');
                }
                $evidenceMetricLinks = $this->sanitizeStringList($profile['evidence_pack_metric_links'] ?? []);
                if ($evidenceMetricLinks === []) {
                    throw new RuntimeException('kpi_registry_customer_profile_lam_missing_evidence_metric_links');
                }
                foreach ($evidenceMetricLinks as $metricCode) {
                    if (!isset($codes[strtoupper($metricCode)])) {
                        throw new RuntimeException('kpi_registry_customer_profile_unknown_evidence_metric:' . $code . ':' . strtoupper($metricCode));
                    }
                }
                if ($this->sanitizeStringList($profile['evidence_pack_record_keys'] ?? []) === []) {
                    throw new RuntimeException('kpi_registry_customer_profile_lam_missing_evidence_record_keys');
                }
                if ($this->sanitizeStringList($profile['evidence_pack_sections'] ?? []) === []) {
                    throw new RuntimeException('kpi_registry_customer_profile_lam_missing_evidence_sections');
                }
                $retention = is_array($profile['retention_requirements'] ?? null) ? $profile['retention_requirements'] : [];
                if ((int) ($retention['retention_years'] ?? 0) < 10
                    || trim((string) ($retention['retention_owner_role'] ?? '')) === ''
                    || (int) ($retention['retrieval_sla_minutes'] ?? 0) <= 0) {
                    throw new RuntimeException('kpi_registry_customer_profile_lam_retention_requirements_invalid');
                }
                $viewSpec = is_array($profile['audit_pack_view'] ?? null) ? $profile['audit_pack_view'] : [];
                if ($this->sanitizeStringList($viewSpec['primary_views'] ?? []) === []
                    || $this->sanitizeStringList($viewSpec['required_status_panels'] ?? []) === []) {
                    throw new RuntimeException('kpi_registry_customer_profile_lam_audit_pack_view_invalid');
                }
            }
        }
    }

    /**
     * Accept either [{code/name, weight_pct}] or newline "CODE|weight" rows.
     *
     * @return list<array<string, mixed>>
     */
    private function sanitizeComponents(mixed $value): array
    {
        if (is_string($value)) {
            $rows = [];
            foreach (preg_split('/\R+/', $value) ?: [] as $line) {
                $line = trim((string) $line);
                if ($line === '') {
                    continue;
                }
                $parts = array_map('trim', explode('|', $line));
                $rows[] = [
                    'code' => $parts[0] ?? '',
                    'weight_pct' => $parts[1] ?? null,
                    'name' => $parts[2] ?? '',
                ];
            }
            $value = $rows;
        }
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $row) {
            if (!is_array($row)) {
                continue;
            }
            $entry = [];
            foreach (['code', 'name', 'intent'] as $field) {
                $text = $this->plainText((string) ($row[$field] ?? ''));
                if ($text !== '') {
                    $entry[$field] = $field === 'code' ? strtoupper($text) : $text;
                }
            }
            if (isset($row['weight_pct']) && is_numeric($row['weight_pct'])) {
                $entry['weight_pct'] = (float) $row['weight_pct'];
            }
            if ($entry !== []) {
                $out[] = $entry;
            }
        }
        return $out;
    }

    private function sanitizeField(string $field, mixed $value): mixed
    {
        // MCS-EXT-1 extension fields — enum-validated, free-text-fenced.
        if ($field === 'metric_subtype') {
            return $this->sanitizeEnum($value, self::EXT_METRIC_SUBTYPES);
        }
        if ($field === 'control_intent') {
            return $this->sanitizeEnum($value, self::EXT_CONTROL_INTENT);
        }
        if ($field === 'measurement_data_type') {
            return $this->sanitizeEnum($value, self::EXT_MEASUREMENT_DATA_TYPE);
        }
        if ($field === 'scoring_model_detail') {
            return $this->sanitizeEnum($value, self::EXT_SCORING_MODEL);
        }
        if ($field === 'evaluation_use') {
            return $this->sanitizeEnum($value, self::EXT_EVALUATION_USE);
        }
        if ($field === 'reward_mode') {
            return $this->sanitizeEnum($value, self::EXT_REWARD_MODE);
        }
        if ($field === 'lifecycle_status') {
            return $this->sanitizeEnum($value, self::EXT_LIFECYCLE_STATUS);
        }
        if ($field === 'paired_metric') {
            // Reference to another canonical_code (validated by CI guard).
            $v = $this->plainText((string) $value);
            return $v === '' ? '' : strtoupper($v);
        }
        if ($field === 'attribution_rule') {
            return $this->plainText((string) $value);
        }
        if ($field === 'sample_policy') {
            return $this->sanitizeSamplePolicy($value);
        }
        if ($field === 'usage_contexts') {
            return $this->sanitizeStringList($value);
        }
        if ($field === 'role_assignments') {
            return $this->sanitizeRoleAssignments($value);
        }
        if (in_array($field, ['linked_cdr', 'required_evidence'], true)) {
            return $this->sanitizeStringList($value);
        }
        if ($field === 'components') {
            return $this->sanitizeComponents($value);
        }
        // Legacy fields.
        if ($field === 'thresholds') {
            $out = [];
            if (is_array($value)) {
                // Numeric bounds — coerce to float so the SSOT stays numeric.
                foreach (['green_point', 'yellow_point', 'target'] as $k) {
                    if (isset($value[$k]) && is_numeric($value[$k])) {
                        $out[$k] = (float) $value[$k];
                    }
                }
                foreach (['direction', 'unit', 'basis'] as $k) {
                    if (isset($value[$k])) {
                        $out[$k] = $this->plainText((string) $value[$k]);
                    }
                }
            }
            return $out;
        }
        if ($field === 'counter_metric') {
            // Dedicated per-KPI counter definition {name_vi, name, intent}.
            return $this->sanitizeCounterMetric($value);
        }
        if ($field === 'blocking_conditions') {
            return $this->sanitizeStringList($value);
        }
        return $this->plainText((string) $value);
    }

    /**
     * Normalize a counter-metric value to the dedicated-definition object
     * {name_vi, name, intent} (each plain text). Returns null when empty.
     */
    private function sanitizeCounterMetric(mixed $value): ?array
    {
        if (!is_array($value)) {
            return null;
        }
        $out = [];
        foreach (['name_vi', 'name', 'intent', 'intent_vi'] as $k) {
            if (isset($value[$k])) {
                $out[$k] = $this->plainText((string) $value[$k]);
            }
        }
        return ($out['name_vi'] ?? '') !== '' ? $out : null;
    }

    /** Display name of a dedicated counter-metric object (Vietnamese first). */
    private function counterName(mixed $counter): string
    {
        if (is_array($counter)) {
            return trim((string) ($counter['name_vi'] ?? ($counter['name'] ?? '')));
        }
        return trim((string) $counter);
    }

    /**
     * Normalize a Console field to plain text. Threshold values legitimately
     * contain '<' and '>' (e.g. "<90%", ">200 ppm"), so tags are NOT stripped
     * here — stored values are raw text and every render path escapes them
     * (renderGovernanceRow via esc(); the Console JS via its _esc()). This
     * removes control characters and caps length to bound abuse.
     */
    private function plainText(string $value): string
    {
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value) ?? $value;
        $value = trim($value);
        return mb_substr($value, 0, 2000);
    }

    /**
     * Build a clean KPI row from a Console "Add KPI" form payload. Only a
     * minimal, staged data-contract proposal is created — runtime calculation
     * or manual-governed scoring requires a controlled code/data-contract
     * change, so a Console-added KPI cannot become active scoring truth here.
     *
     * @param array<string, mixed> $patch
     * @return array<string, mixed>
     */
    private function sanitizeAddedKpi(array $patch): array
    {
        $rawCode = strtoupper(trim((string) ($patch['canonical_code'] ?? '')));
        $code = preg_replace('/[^A-Z0-9_]/', '', $rawCode) ?? '';
        if ($rawCode === '' || $rawCode !== $code) {
            throw new RuntimeException('kpi_registry_added_invalid_code:' . $rawCode);
        }
        $this->assertCanonicalCode($code, 'kpi_registry_added_invalid_code');

        $t   = is_array($patch['thresholds'] ?? null) ? $patch['thresholds'] : [];
        $dir = (string) ($t['direction'] ?? 'higher_is_better');
        if (!in_array($dir, self::VALID_DIRECTION, true)) {
            $dir = 'higher_is_better';
        }
        $thr = [
            'direction' => $dir,
            'unit'      => $this->plainText((string) ($t['unit'] ?? 'percent')),
        ];
        foreach (['green_point', 'yellow_point', 'target'] as $k) {
            if (isset($t[$k]) && is_numeric($t[$k])) {
                $thr[$k] = (float) $t[$k];
            }
        }
        if (isset($t['basis'])) {
            $thr['basis'] = $this->plainText((string) $t['basis']);
        }

        $owner   = $this->plainText((string) ($patch['owner_role'] ?? ''));
        $cadence = (string) ($patch['cadence'] ?? 'monthly');
        if (!in_array($cadence, self::VALID_CADENCE, true)) {
            $cadence = 'monthly';
        }
        $counter = $this->sanitizeCounterMetric($patch['counter_metric'] ?? null);
        $gap = $this->plainText((string) ($patch['data_contract_gap'] ?? ''));
        $graduation = $this->plainText((string) ($patch['target_graduation_condition'] ?? ''));
        if ($gap === '' || $graduation === '') {
            throw new RuntimeException('kpi_registry_added_missing_contract:' . $code);
        }
        $blocking = $this->sanitizeField('blocking_conditions', $patch['blocking_conditions'] ?? []);

        $roleAssignments = $this->sanitizeRoleAssignments($patch['role_assignments'] ?? []);
        if ($roleAssignments === [] && $owner !== '') {
            $roleAssignments[] = [
                'role' => strtoupper($owner),
                'assignment_type' => $this->sanitizeEnum($patch['assignment_type'] ?? 'accountable_owner', self::EXT_ASSIGNMENT_TYPE) ?: 'accountable_owner',
                'weight_pct' => 100.0,
                'active_or_candidate' => 'candidate',
                'controllability_scope' => $this->plainText((string) ($patch['controllability_scope'] ?? 'Staged proposal; controllability must be confirmed before active use.')),
            ];
        }

        $row = [
            'canonical_code'     => $code,
            'local_id'           => null,
            'name'               => $this->plainText((string) ($patch['name'] ?? '')),
            'name_vi'            => $this->plainText((string) ($patch['name_vi'] ?? '')),
            'tier'               => $this->plainText((string) ($patch['tier'] ?? 'department')),
            'process'            => $this->plainText((string) ($patch['process'] ?? 'unclassified')),
            'category'           => $this->plainText((string) ($patch['category'] ?? 'internal')),
            'owner_role'         => $owner,
            'data_stewardship_role' => $owner,
            'applicable_jds'     => $owner !== '' ? [$owner] : [],
            'counter_metric'     => $this->stampCounter($code, $counter),
            'cadence'            => $cadence,
            'layer'              => $this->plainText((string) ($patch['layer'] ?? 'bsc_monthly')),
            'lead_or_lag'        => ($patch['lead_or_lag'] ?? '') === 'lead' ? 'lead' : 'lag',
            'calculation_status' => 'staged_data_contract',
            'thresholds'         => $thr,
            'purpose'            => $this->plainText((string) ($patch['purpose'] ?? '')),
            'decision_action'    => $this->plainText((string) ($patch['decision_action'] ?? '')),
            'data_contract_gap'   => $gap,
            'target_graduation_condition' => $graduation,
            'evidence_source'     => $this->plainText((string) ($patch['evidence_source'] ?? '')),
            'blocking_conditions' => is_array($blocking) ? $blocking : [],
            'reward_eligible'    => false,
            'origin'             => 'console_proposed',
        ];

        foreach ([
            'metric_subtype', 'control_intent', 'measurement_data_type',
            'scoring_model_detail', 'evaluation_use', 'reward_mode',
            'paired_metric', 'attribution_rule', 'lifecycle_status',
        ] as $field) {
            if (array_key_exists($field, $patch)) {
                $value = $this->sanitizeField($field, $patch[$field]);
                if ($value !== '' && $value !== null) {
                    $row[$field] = $value;
                }
            }
        }
        $samplePolicy = $this->sanitizeField('sample_policy', $patch['sample_policy'] ?? null);
        if (is_array($samplePolicy) && $samplePolicy !== []) {
            $row['sample_policy'] = $samplePolicy;
        }
        $usageContexts = $this->sanitizeStringList($patch['usage_contexts'] ?? []);
        if ($usageContexts !== []) {
            $row['usage_contexts'] = $usageContexts;
        }
        if ($roleAssignments !== []) {
            $row['role_assignments'] = $roleAssignments;
        }
        foreach ([
            'gate', 'gate_pass_condition', 'hold_release_rule',
            'lam_profile_link', 'customer_profile_link', 'applicability_rule',
            'controllability_scope', 'action_when_red',
        ] as $field) {
            $value = $this->plainText((string) ($patch[$field] ?? ''));
            if ($value !== '') {
                $row[$field] = $value;
            }
        }
        $linkedCdr = $this->sanitizeStringList($patch['linked_cdr'] ?? []);
        if ($linkedCdr !== []) {
            $row['linked_cdr'] = $linkedCdr;
        }
        $components = $this->sanitizeComponents($patch['components'] ?? []);
        if ($components !== []) {
            $row['components'] = $components;
        }
        $requiredEvidence = $this->sanitizeStringList($patch['required_evidence'] ?? []);
        if ($requiredEvidence !== []) {
            $row['required_evidence'] = $requiredEvidence;
        }

        return $row;
    }

    private function assertCanonicalCode(string $code, string $errorPrefix): void
    {
        if ($code === ''
            || preg_match(self::VALID_CANONICAL_CODE_PATTERN, $code) !== 1
            || preg_match(self::FORBIDDEN_CANONICAL_CODE_PATTERN, $code) === 1) {
            throw new RuntimeException($errorPrefix . ':' . $code);
        }
    }

    // ── Statistics ───────────────────────────────────────────────────────

    /**
     * @param array<int, array<string, mixed>> $governance
     * @return array<string, mixed>
     */
    private function computeStats(array $governance): array
    {
        $total = count($governance);
        $byStatus = ['runtime_calculated' => 0, 'staged_data_contract' => 0, 'manual_governed' => 0, 'manual' => 0, 'retired' => 0];
        $byTier = [];
        $withThresholds = 0;
        $withCounter = 0;
        $rewardEligible = 0;
        foreach ($governance as $row) {
            $status = (string) ($row['calculation_status'] ?? '');
            if (isset($byStatus[$status])) {
                $byStatus[$status]++;
            }
            $tier = (string) ($row['tier'] ?? 'unknown');
            $byTier[$tier] = ($byTier[$tier] ?? 0) + 1;
            $t = $row['thresholds'] ?? null;
            if (is_array($t) && is_numeric($t['green_point'] ?? null)
                && is_numeric($t['yellow_point'] ?? null)) {
                $withThresholds++;
            }
            if ($this->counterName($row['counter_metric'] ?? null) !== '') {
                $withCounter++;
            }
            if (($row['reward_eligible'] ?? false) === true) {
                $rewardEligible++;
            }
        }
        return [
            'total'               => $total,
            'by_calculation_status'=> $byStatus,
            'by_tier'             => $byTier,
            'threshold_coverage_pct' => $total > 0 ? round($withThresholds / $total * 100, 1) : 0.0,
            'counter_coverage_pct'   => $total > 0 ? round($withCounter / $total * 100, 1) : 0.0,
            'reward_eligible'     => $rewardEligible,
        ];
    }

    // ── ANNEX-122 region regeneration ────────────────────────────────────

    /**
     * Regenerate the KPI-COMPANY / KPI-VALUESTREAM / KPI-DEPARTMENT marker
     * regions inside ANNEX-122 from the effective governance KPI set.
     *
     * @param array<int, array<string, mixed>> $kpis
     * @param array<int, array<string, mixed>> $gateMetrics
     */
    private function regenerateAnnex122(array $kpis, array $gateMetrics = []): bool
    {
        $path = $this->rootDir . '/' . self::ANNEX122_RELATIVE;
        if (!is_file($path)) {
            return false;
        }
        $html = (string) file_get_contents($path);

        $tiers = [
            'KPI-COMPANY'     => 'company',
            'KPI-VALUESTREAM' => 'value_stream',
            'KPI-DEPARTMENT'  => 'department',
        ];
        $changed = false;
        foreach ($tiers as $marker => $tier) {
            $rows = array_values(array_filter(
                $kpis,
                static fn(array $k): bool => ($k['tier'] ?? '') === $tier,
            ));
            $table = $this->renderGovernanceTable($rows);
            $next = $this->replaceRegion($html, $marker, $table);
            if ($next !== null) {
                $html = $next;
                $changed = true;
            }
        }
        if ($gateMetrics !== []) {
            $table = $this->renderGateControlTable($gateMetrics);
            $next = $this->replaceRegion($html, 'KPI-GATE', $table);
            if ($next !== null) {
                $html = $next;
                $changed = true;
            }
        }
        if ($changed) {
            file_put_contents($path, $html);
        }
        return $changed;
    }

    /**
     * Replace the body between <!-- KEY:START --> and <!-- KEY:END -->.
     * Returns null when the markers are absent (no silent corruption).
     */
    private function replaceRegion(string $html, string $key, string $body): ?string
    {
        $start = '<!-- ' . $key . ':START -->';
        $end   = '<!-- ' . $key . ':END -->';
        $i = strpos($html, $start);
        $j = strpos($html, $end);
        if ($i === false || $j === false || $j < $i) {
            return null;
        }
        return substr($html, 0, $i + strlen($start))
            . $body
            . substr($html, $j);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function renderGovernanceTable(array $rows): string
    {
        $head = '<div class="table-card"><table class="table annex122-wide-table annex122-governance-table" style="table-layout:fixed">'
            . '<colgroup><col style="width:15%"><col style="width:18%">'
            . '<col style="width:16%"><col style="width:12%"><col style="width:14%">'
            . '<col style="width:10%"><col style="width:15%"></colgroup>'
            . '<thead><tr><th>KPI</th><th>Công thức</th><th>Ngưỡng G/Y/R</th>'
            . '<th>Owner / xác nhận dữ liệu</th><th>Nguồn dữ liệu</th>'
            . '<th>Nhịp · lớp · loại</th><th>Quyết định khi lệch ngưỡng</th></tr></thead><tbody>';
        $body = '';
        foreach ($rows as $k) {
            $body .= $this->renderGovernanceRow($k);
        }
        return $head . $body . '</tbody></table></div>';
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function renderGateControlTable(array $rows): string
    {
        $head = '<div class="table-card"><table class="table annex122-wide-table annex122-gate-table" style="table-layout:fixed">'
            . '<colgroup><col style="width:7%"><col style="width:8%">'
            . '<col style="width:17%"><col style="width:22%"><col style="width:9%">'
            . '<col style="width:8%"><col style="width:8%"><col style="width:7%">'
            . '<col style="width:14%"></colgroup>'
            . '<thead><tr><th>Gate</th><th>ID</th><th>Metric</th><th>Điều kiện pass</th>'
            . '<th>CDR</th><th>Target</th><th>Owner</th><th>Nhịp</th>'
            . '<th>Evidence / status</th></tr></thead><tbody>';
        $body = '';
        foreach ($rows as $row) {
            $body .= $this->renderGateControlRow($row);
        }
        return $head . $body . '</tbody></table></div>';
    }

    /**
     * @param array<string, mixed> $g
     */
    private function renderGateControlRow(array $g): string
    {
        $e = fn(mixed $v): string => $this->esc((string) ($v ?? ''));
        $localId = (string) ($g['local_id'] ?? '');
        $code = (string) ($g['canonical_code'] ?? '');
        $cdrs = array_map(
            static fn(mixed $v): string => strtoupper(trim((string) $v)),
            (array) ($g['linked_cdr'] ?? []),
        );
        $cdrCell = implode(' ', array_map(
            fn(string $cdr): string => '<span class="role-code">' . $this->esc($cdr) . '</span>',
            array_filter($cdrs, static fn(string $cdr): bool => $cdr !== ''),
        ));
        $target = (string) ($g['target'] ?? ($g['thresholds']['target'] ?? ''));
        $cadence = (string) (self::CADENCE_VI[$g['cadence'] ?? ''] ?? ($g['cadence'] ?? ''));
        $dataSource = $g['data_source'] ?? '';
        $evidence = $this->renderDataSourceSummary($dataSource);
        $evidenceSource = trim((string) ($g['evidence_source'] ?? ''));
        if ($evidenceSource !== '' && $evidenceSource !== $this->dataSourceEvidenceText($dataSource)) {
            $evidence .= '<br><span class="mini-note">' . $e($evidenceSource) . '</span>';
        }
        $evidence .= '<br>' . $this->calcStatusSymbol((string) ($g['calculation_status'] ?? ''));

        $metric = '<b>' . $e($g['name_vi'] ?? ($g['name'] ?? '')) . '</b><br>'
            . '<span class="role-code">' . $e($code) . '</span>';
        if (trim((string) ($g['name'] ?? '')) !== '' && trim((string) ($g['name_vi'] ?? '')) !== '') {
            $metric .= ' <span class="mini-note">' . $e($g['name']) . '</span>';
        }

        return '<tr data-gate-metric="' . $e($localId) . '"><td><span class="badge-soft">'
            . $e($g['gate'] ?? '') . '</span></td><td class="kpi-gate-code">'
            . str_replace('-', '<br>', $e($localId)) . '</td><td class="annex122-metric-cell">' . $metric . '</td><td>'
            . $e($g['gate_pass_condition'] ?? '') . '</td><td class="center">' . $cdrCell
            . '</td><td class="nowrap">' . $e($target) . '</td><td>'
            . $this->roleLink((string) ($g['owner_role'] ?? '')) . '</td><td>'
            . $e($cadence) . '</td><td class="annex122-evidence-cell">' . $evidence . '</td></tr>';
    }

    /**
     * @param array<string, mixed> $k
     */
    private function renderGovernanceRow(array $k): string
    {
        $e = fn(mixed $v): string => $this->esc((string) ($v ?? ''));
        $f  = is_array($k['formula'] ?? null) ? $k['formula'] : [];
        $t  = is_array($k['thresholds'] ?? null) ? $k['thresholds'] : [];
        $code = (string) ($k['canonical_code'] ?? '');

        $dir = ($f['direction'] ?? '') === 'lower_is_better' ? 'thấp hơn là tốt' : 'cao hơn là tốt';
        $formula = 'Tử số: ' . $e($f['numerator'] ?? '') . '<br>Mẫu số: ' . $e($f['denominator'] ?? '')
            . '<br>Đơn vị: <b>' . $e($f['unit'] ?? '') . '</b> · ' . $e($dir);
        if (!empty($f['exclusions']) && $f['exclusions'] !== 'none') {
            $formula .= '<br><span class="mini-note">Loại trừ: ' . $e($f['exclusions']) . '</span>';
        }
        if (!empty($f['min_sample'])) {
            $formula .= '<br><span class="mini-note">Cỡ mẫu tối thiểu: ' . $e($f['min_sample']) . '</span>';
        }

        // RAG badge box — wrapped in a data-kpi-rag element so the ANNEX
        // live renderer (12-kpi-badge-renderer.js) can hydrate it from the
        // KPI Authority API at view time. The marked-up box is the
        // recognizable graphic that proves a KPI is system-linked; a
        // threshold cell without it is hardcoded.
        [$tg, $ty, $tr] = $this->thresholdDisplay($t);
        $thresholds = '<div class="kpi-rag-badge" data-kpi-rag="authority" data-kpi-code="' . $e($code) . '">'
            . '<span class="kpi-good">G ' . $e($tg) . '</span><br>'
            . '<span class="kpi-warn">Y ' . $e($ty) . '</span><br>'
            . '<span class="kpi-bad">R ' . $e($tr) . '</span>'
            . '</div>';
        if (!empty($t['basis'])) {
            $thresholds .= '<span class="mini-note">Căn cứ: ' . $e($t['basis']) . '</span>';
        }

        $owner = $this->roleLink((string) ($k['owner_role'] ?? ''));
        $steward = (string) ($k['data_stewardship_role'] ?? '');
        if ($steward !== '' && $steward !== (string) ($k['owner_role'] ?? '')) {
            $owner .= '<br><span class="mini-note">Xác nhận dữ liệu: ' . $this->roleLink($steward) . '</span>';
        }

        $src = $this->renderDataSourceSummary($k['data_source'] ?? []);

        $calcStatus = (string) ($k['calculation_status'] ?? '');
        $calcBadge = $this->calcStatusSymbol($calcStatus);
        $leadLag = ($k['lead_or_lag'] ?? '') === 'lead' ? 'Chỉ số dẫn (lead)' : 'Chỉ số kết quả (lag)';
        $cadenceCell = $e(self::CADENCE_VI[$k['cadence'] ?? ''] ?? ($k['cadence'] ?? ''))
            . ' · ' . $e(self::LAYER_VI[$k['layer'] ?? ''] ?? ($k['layer'] ?? ''))
            . '<br>' . $e($leadLag) . '<br>' . $calcBadge;

        $decision = $e($k['decision_action'] ?? '');
        if (!empty($k['action_reference'])) {
            $decision .= '<br><span class="mini-note">Tham chiếu hành động: ' . $e($k['action_reference']) . '</span>';
        }
        if (!empty($k['attribution_rule'])) {
            $decision .= '<br><span class="mini-note">Quy kết công bằng: ' . $e($k['attribution_rule']) . '</span>';
        }
        $extras = [];
        if (!empty($k['paired_metric'])) {
            $extras[] = 'Ghép cặp: <span class="role-code">' . $e($k['paired_metric']) . '</span>';
        }
        // Counter-metric — show the unique code (the addressable token); the
        // name + anti-gaming intent ride in the title tooltip.
        $cm = is_array($k['counter_metric'] ?? null) ? $k['counter_metric'] : null;
        if ($cm !== null && trim((string) ($cm['code'] ?? '')) !== '') {
            $tip = trim((string) ($cm['name_vi'] ?? ''));
            $intent = trim((string) ($cm['intent'] ?? ''));
            if ($intent !== '') {
                $tip .= ($tip !== '' ? ' — ' : '') . $intent;
            }
            $extras[] = 'Counter-metric: <span class="role-code" title="' . $e($tip) . '">'
                . $e($cm['code']) . '</span>';
        }
        if (($k['reward_eligible'] ?? false) === true) {
            $extras[] = '<b>Gắn khen thưởng</b> (có counter-metric)';
        }
        if ($extras !== []) {
            $decision .= '<br><span class="mini-note">' . implode(' · ', $extras) . '</span>';
        }

        $kpiCell = '<b>' . $e($k['name_vi'] ?? '') . '</b><br><span class="role-code">' . $e($code)
            . '</span> <span class="mini-note">' . $e($k['name'] ?? '') . '</span>';

        return '<tr data-kpi-code="' . $e($code) . '"><td class="annex122-metric-cell">' . $kpiCell . '</td>'
            . '<td class="annex122-formula-cell">' . $formula . '</td><td>' . $thresholds . '</td>'
            . '<td>' . $owner . '</td><td class="annex122-source-cell">' . $src . '</td><td>' . $cadenceCell . '</td>'
            . '<td class="annex122-decision-cell">' . $decision . '</td></tr>';
    }

    private function renderDataSourceSummary(mixed $source): string
    {
        if (is_array($source)) {
            $system = trim((string) ($source['system'] ?? ''));
            $tables = is_array($source['tables'] ?? null)
                ? implode(', ', array_map('strval', $source['tables']))
                : trim((string) ($source['tables'] ?? ''));
            $columns = is_array($source['columns'] ?? null)
                ? implode(', ', array_map('strval', $source['columns']))
                : trim((string) ($source['columns'] ?? ''));
            $evidence = trim((string) ($source['evidence'] ?? $source['contract'] ?? ''));

            $summary = $system !== '' ? '<b>' . $this->esc($system) . '</b>' : '';
            if ($tables !== '') {
                $summary .= ($summary !== '' ? ' · ' : '') . $this->esc($tables);
            }
            if ($columns !== '') {
                $summary .= '<br><span class="mini-note">Columns: ' . $this->esc($columns) . '</span>';
            }
            if ($evidence !== '') {
                $summary .= '<br><span class="mini-note">' . $this->esc($evidence) . '</span>';
            }

            return $summary !== '' ? $summary : '<span class="mini-note">No data source declared</span>';
        }

        $value = trim((string) ($source ?? ''));
        return $value !== ''
            ? $this->esc($value)
            : '<span class="mini-note">No data source declared</span>';
    }

    private function dataSourceEvidenceText(mixed $source): string
    {
        if (!is_array($source)) {
            return '';
        }

        return trim((string) ($source['evidence'] ?? $source['contract'] ?? ''));
    }

    /**
     * Derive (green, yellow, red) display strings from the numeric threshold
     * schema. Must stay byte-identical to the Python stage generator's
     * _threshold_display so a Console save and a stage regeneration produce
     * the same ANNEX-122.
     *
     * @param array<string, mixed> $t
     * @return array{0: string, 1: string, 2: string}
     */
    private function thresholdDisplay(array $t): array
    {
        if (!isset($t['green_point'], $t['yellow_point'])) {
            return [(string) ($t['green'] ?? ''), (string) ($t['yellow'] ?? ''), (string) ($t['red'] ?? '')];
        }
        $suffix = [
            'percent' => '%', 'ppm' => ' ppm', 'day' => ' ngày',
            'rate' => '', 'ratio' => '', 'count' => '', 'vnd' => ' ₫',
        ];
        $suf = $suffix[(string) ($t['unit'] ?? '')] ?? '';
        // %g matches Python's "%g" formatting (95.0→"95", 99.5→"99.5").
        $num = static fn(mixed $x): string => sprintf('%g', (float) $x);
        $g = $num($t['green_point']);
        $y = $num($t['yellow_point']);
        if (($t['direction'] ?? '') === 'lower_is_better') {
            return ["≤ {$g}{$suf}", ">{$g} – ≤{$y}{$suf}", "> {$y}{$suf}"];
        }
        return ["≥ {$g}{$suf}", "{$y} – <{$g}{$suf}", "< {$y}{$suf}"];
    }

    /**
     * Calculation status as a compact symbol — runtime ⚙ / manual ✎ /
     * staged ○ — so the §4/§5/§6 cells stay narrow. Full wording rides in
     * the title tooltip.
     */
    private function calcStatusSymbol(string $status): string
    {
        [$sym, $class, $title] = match ($status) {
            'runtime_calculated' => ['⚙', 'runtime', 'Tính runtime — số tính tự động từ hệ thống'],
            'manual', 'manual_governed' => ['✎', 'manual', 'Nhập tay có quản trị — nạp số qua endpoint nhập liệu'],
            'retired'            => ['⊘', 'retired', 'KPI đã ngừng dùng'],
            default              => ['○', 'staged', 'Chờ hợp đồng dữ liệu — chưa có nguồn số'],
        };
        return '<span class="kpi-calc-sym kpi-calc-' . $class . '" title="'
            . $this->esc($title) . '">' . $sym . '</span>';
    }

    private function roleLink(string $code): string
    {
        $code = trim($code);
        if (isset(self::ROLE_LINKS[$code])) {
            [$href, $title] = self::ROLE_LINKS[$code];
            return '<a class="entity-link role-link" href="' . $this->esc($href) . '" title="' . $this->esc($title)
                . '"><span class="entity-code role-code">' . $this->esc($code) . '</span></a>';
        }
        return '<span class="role-code">' . $this->esc($code) . '</span>';
    }

    /**
     * HTML-escape matching Python html.escape(quote=True) so the Console's
     * ANNEX-122 regeneration is byte-identical to the stage generator
     * (single quote → &#x27;, not PHP's default &#039;).
     */
    private function esc(string $value): string
    {
        return str_replace('&#039;', '&#x27;', htmlspecialchars($value, ENT_QUOTES, 'UTF-8'));
    }

    // ── Internal helpers ─────────────────────────────────────────────────

    /** @return array<string, mixed> */
    private function readRegistrySeed(): array
    {
        $seed = FileHelper::readJson($this->registryPath());
        if (!is_array($seed)) {
            throw new RuntimeException('kpi_registry_seed_missing');
        }
        return $seed;
    }

    private function registryPath(): string
    {
        return $this->dataDir . '/' . self::REGISTRY_RELATIVE;
    }

    private function overlayPath(): string
    {
        return $this->dataDir . '/' . self::OVERLAY_RELATIVE;
    }

    /** @param array<string, mixed> $actor */
    private function actorName(array $actor): string
    {
        foreach (['username', 'name', 'user_id'] as $key) {
            $value = trim((string) ($actor[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }
        return 'admin';
    }
}
