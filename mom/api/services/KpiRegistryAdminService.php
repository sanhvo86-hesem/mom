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
        $library = $this->buildLibrary($governance, $gate, $proposed);
        $views = $this->buildConsoleViews($library, $seed);

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
            'customer_requirement_profiles' => is_array($seed['customer_requirement_profiles'] ?? null)
                ? $seed['customer_requirement_profiles'] : new \stdClass(),
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
            // P08 — dashboard render + manual input contracts are exposed to
            // the portal so dashboards and the manual-input form honor the
            // same governance rules (no staged value leak, reward gate on
            // input_status, structured field allowlist).
            'dashboard_render_contract' => is_array($seed['dashboard_render_contract'] ?? null)
                ? $seed['dashboard_render_contract'] : new \stdClass(),
            'manual_input_contract' => is_array($seed['manual_input_contract'] ?? null)
                ? $seed['manual_input_contract'] : new \stdClass(),
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
            'annex122_updated' => $regenerated,
            'config'           => $this->load(),
        ];
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

        if ($subtype === 'spc_capability_metric' || in_array($scoring, ['spc_control_chart', 'spec_limit_capability'], true)) {
            $sample = $row['sample_policy'] ?? null;
            if (!is_array($sample) || !isset($sample['min_n_score']) || !is_numeric($sample['min_n_score'])
                || (int) $sample['min_n_score'] <= 0) {
                throw new RuntimeException('kpi_registry_mco_sample_policy_missing:' . $code);
            }
            $this->validateSpcCapabilityContract($row, $code, $sample);
        }

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
    private function buildLibrary(array $governance, array $gate, array $proposed): array
    {
        $lib = [];
        $push = function (array $row, string $group) use (&$lib): void {
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
                'gate'               => $row['gate'] ?? null,
                'linked_cdr'         => is_array($row['linked_cdr'] ?? null) ? $row['linked_cdr'] : [],
                'gate_pass_condition'=> $row['gate_pass_condition'] ?? '',
                'layer'              => $row['layer'] ?? null,
                'calculation_status' => $status,
                'data_contract_status' => $dataContractStatus,
                'runtime_endpoint'   => $runtimeEndpoint,
                'input_endpoint'     => $inputEndpoint,
                'data_contract_gap'  => (string) ($row['data_contract_gap'] ?? ''),
                'target_graduation_condition' => (string) ($row['target_graduation_condition'] ?? ''),
                'evidence_source'    => (string) ($row['evidence_source'] ?? ''),
                'blocking_conditions'=> is_array($row['blocking_conditions'] ?? null) ? $row['blocking_conditions'] : [],
                'owner_role'         => $row['owner_role'] ?? null,
                'data_stewardship_role' => $row['data_stewardship_role'] ?? null,
                'applicable_jds'     => is_array($row['applicable_jds'] ?? null) ? $row['applicable_jds'] : [],
                'counter_metric'     => $row['counter_metric'] ?? null,
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
                'sample_policy'         => is_array($row['sample_policy'] ?? null) ? $row['sample_policy'] : null,
                'usage_contexts'        => is_array($row['usage_contexts'] ?? null) ? $row['usage_contexts'] : [],
                'role_assignments'      => is_array($row['role_assignments'] ?? null) ? $row['role_assignments'] : [],
                // P03 — link a metric to a customer requirement profile (e.g. LAM_SEMSYSCO).
                'lam_profile_link'      => (string) ($row['lam_profile_link'] ?? ''),
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
                    'message' => 'Staged metric is still reward eligible.',
                ];
            }
            if (($row['group'] ?? '') === 'governance'
                && (bool) ($row['reward_eligible'] ?? false)
                && $cm === null) {
                $findings[] = [
                    'priority' => 'P1',
                    'code' => 'REWARD_KPI_WITHOUT_COUNTER',
                    'metric_code' => $code,
                    'message' => 'Reward KPI has no counter-metric guardrail.',
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
                'message' => 'Gate control metric has no linked CDR.',
            ];
        }

        $roles = $this->roleScorecardSummary($seed['jd_kpi_scorecards']['roles'] ?? []);
        foreach ($roles as $role) {
            if (($role['active_weight_total'] ?? 100) !== 100) {
                $findings[] = [
                    'priority' => 'P1',
                    'code' => 'JD_WEIGHT_TOTAL_NOT_100',
                    'role_code' => $role['role_code'] ?? '',
                    'message' => 'JD active scorecard weight total is not 100.',
                ];
            }
            if (($role['active_measure_count'] ?? 0) > 6) {
                $findings[] = [
                    'priority' => 'P2',
                    'code' => 'JD_ACTIVE_SET_TOO_LARGE',
                    'role_code' => $role['role_code'] ?? '',
                    'message' => 'JD active set may be too broad for practical coaching.',
                ];
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
            'integrity_status' => [
                'status' => $integrity,
                'finding_count' => count($findings),
                'findings' => array_slice($findings, 0, 200),
            ],
        ];
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
                'recommended_active_count' => (int) ($role['recommended_active_count'] ?? count($active)),
                'active_measure_count' => count($active),
                'active_weight_total' => $weightTotal,
                'candidate_count' => is_array($role['candidate_bank'] ?? null) ? count($role['candidate_bank']) : 0,
                'optional_count' => is_array($role['optional_rotate'] ?? null) ? count($role['optional_rotate']) : 0,
                'do_not_use_count' => is_array($role['do_not_use'] ?? null) ? count($role['do_not_use']) : 0,
                'fairness_notes' => is_array($role['fairness_notes'] ?? null) ? $role['fairness_notes'] : [],
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
        foreach (['name_vi', 'name', 'intent'] as $k) {
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
        $code = strtoupper(trim((string) ($patch['canonical_code'] ?? '')));
        $code = preg_replace('/[^A-Z0-9_]/', '', $code) ?? '';

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
        $head = '<div class="table-card"><table class="table" style="table-layout:fixed">'
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
        $head = '<div class="table-card"><table class="table" style="table-layout:fixed">'
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
            . str_replace('-', '<br>', $e($localId)) . '</td><td>' . $metric . '</td><td>'
            . $e($g['gate_pass_condition'] ?? '') . '</td><td class="center">' . $cdrCell
            . '</td><td class="nowrap">' . $e($target) . '</td><td>'
            . $this->roleLink((string) ($g['owner_role'] ?? '')) . '</td><td>'
            . $e($cadence) . '</td><td>' . $evidence . '</td></tr>';
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

        return '<tr data-kpi-code="' . $e($code) . '"><td>' . $kpiCell . '</td>'
            . '<td>' . $formula . '</td><td>' . $thresholds . '</td>'
            . '<td>' . $owner . '</td><td>' . $src . '</td><td>' . $cadenceCell . '</td>'
            . '<td>' . $decision . '</td></tr>';
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
