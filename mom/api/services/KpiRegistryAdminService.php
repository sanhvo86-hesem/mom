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
            'all_metric_codes'  => array_keys($allCodes),
            'governance_kpis'   => $governance,
            'gate_control_metrics'      => $gate,
            'proposed_operating_metrics'=> $proposed,
            'dashboard_core_kpis'       => $seed['dashboard_core_kpis'] ?? [],
            'process_catalog'   => $seed['process_catalog'] ?? new \stdClass(),
            'library'           => $library,
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
            } else {
                $this->validateMetricThresholds($live, $section);
            }

            $overlay[$key] = $overrides;
            $totalOverrides += count($overrides);
        }

        $overlay['added_kpis']   = $addedAll;
        $overlay['retired_codes']= $retiredAll;

        FileHelper::writeJson($this->overlayPath(), $overlay);
        $regenerated = $this->regenerateAnnex122($effectiveGovernance);

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
            $lib[] = [
                'canonical_code'     => (string) ($row['canonical_code'] ?? ''),
                'local_id'           => $row['local_id'] ?? null,
                'name'               => $row['name'] ?? '',
                'name_vi'            => $row['name_vi'] ?? '',
                'group'              => $group,
                'tier'               => $row['tier'] ?? null,
                'process'            => (string) ($row['process'] ?? 'unclassified'),
                'category'           => (string) ($row['category'] ?? 'internal'),
                'gate'               => $row['gate'] ?? null,
                'layer'              => $row['layer'] ?? null,
                'calculation_status' => (string) ($row['calculation_status'] ?? ($row['status'] ?? '')),
                'owner_role'         => $row['owner_role'] ?? null,
                'applicable_jds'     => is_array($row['applicable_jds'] ?? null) ? $row['applicable_jds'] : [],
                'counter_metric'     => $row['counter_metric'] ?? null,
                'purpose'            => $row['purpose'] ?? '',
                'thresholds'         => $t,
                'reward_eligible'    => (bool) ($row['reward_eligible'] ?? false),
                'retired'            => (bool) ($row['retired'] ?? false),
                'origin'             => (string) ($row['origin'] ?? 'seed'),
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
            if (($row['origin'] ?? 'seed') === 'console_added') {
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
        ];
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
            if ($code === '') {
                throw new RuntimeException('kpi_registry_missing_code');
            }
            if (isset($seen[$code])) {
                throw new RuntimeException('kpi_registry_duplicate_code:' . $code);
            }
            $seen[$code] = true;

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
        }
    }

    private function sanitizeField(string $field, mixed $value): mixed
    {
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
     * minimal, manually-tracked KPI is created — runtime calculation requires
     * a code change, so a Console-added KPI is always calculation_status
     * 'manual' and feeds from kpi_manual_inputs.
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

        return [
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
            'calculation_status' => 'manual',
            'thresholds'         => $thr,
            'purpose'            => $this->plainText((string) ($patch['purpose'] ?? '')),
            'decision_action'    => $this->plainText((string) ($patch['decision_action'] ?? '')),
            'reward_eligible'    => false,
            'origin'             => 'console_added',
        ];
    }

    // ── Statistics ───────────────────────────────────────────────────────

    /**
     * @param array<int, array<string, mixed>> $governance
     * @return array<string, mixed>
     */
    private function computeStats(array $governance): array
    {
        $total = count($governance);
        $byStatus = ['runtime_calculated' => 0, 'staged_data_contract' => 0, 'manual' => 0, 'retired' => 0];
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
            if (is_array($t) && trim((string) ($t['green'] ?? '')) !== ''
                && trim((string) ($t['yellow'] ?? '')) !== ''
                && trim((string) ($t['red'] ?? '')) !== '') {
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
     */
    private function regenerateAnnex122(array $kpis): bool
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
            . '<colgroup><col style="width:15%"><col style="width:20%">'
            . '<col style="width:12%"><col style="width:12%"><col style="width:16%">'
            . '<col style="width:11%"><col style="width:14%"></colgroup>'
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
     * @param array<string, mixed> $k
     */
    private function renderGovernanceRow(array $k): string
    {
        $e = fn(mixed $v): string => $this->esc((string) ($v ?? ''));
        $f  = is_array($k['formula'] ?? null) ? $k['formula'] : [];
        $t  = is_array($k['thresholds'] ?? null) ? $k['thresholds'] : [];
        $ds = is_array($k['data_source'] ?? null) ? $k['data_source'] : [];
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
            . '<span class="kpi-good" style="padding:1px 5px;border-radius:4px">G ' . $e($tg) . '</span><br>'
            . '<span class="kpi-warn" style="padding:1px 5px;border-radius:4px">Y ' . $e($ty) . '</span><br>'
            . '<span class="kpi-bad" style="padding:1px 5px;border-radius:4px">R ' . $e($tr) . '</span>'
            . '</div>';
        if (!empty($t['basis'])) {
            $thresholds .= '<span class="mini-note">Căn cứ: ' . $e($t['basis']) . '</span>';
        }

        $owner = $this->roleLink((string) ($k['owner_role'] ?? ''));
        $steward = (string) ($k['data_stewardship_role'] ?? '');
        if ($steward !== '' && $steward !== (string) ($k['owner_role'] ?? '')) {
            $owner .= '<br><span class="mini-note">Xác nhận dữ liệu: ' . $this->roleLink($steward) . '</span>';
        }

        $tables = is_array($ds['tables'] ?? null) ? implode(', ', $ds['tables']) : '';
        $src = '<b>' . $e($ds['system'] ?? '') . '</b> · ' . $e($tables)
            . '<br><span class="mini-note">' . $e($ds['evidence'] ?? '') . '</span>';

        $calcStatus = (string) ($k['calculation_status'] ?? '');
        $calcBadge = match ($calcStatus) {
            'runtime_calculated' => '<span class="inline-tag" style="background:#ebfbee;color:#2b8a3e">Tính runtime</span>',
            'manual' => '<span class="inline-tag" style="background:#eef2ff;color:#3730a3">Nhập tay</span>',
            default => '<span class="inline-tag" style="background:#fff9db;color:#e67700">Chờ hợp đồng dữ liệu</span>',
        };
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
            . '<td>' . $formula . '</td><td class="nowrap">' . $thresholds . '</td>'
            . '<td>' . $owner . '</td><td>' . $src . '</td><td>' . $cadenceCell . '</td>'
            . '<td>' . $decision . '</td></tr>';
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
