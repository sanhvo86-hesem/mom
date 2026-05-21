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
            'governance_kpis'   => $governance,
            'gate_control_metrics'      => $seed['gate_control_metrics'] ?? [],
            'proposed_operating_metrics'=> $seed['proposed_operating_metrics'] ?? [],
            'dashboard_core_kpis'       => $seed['dashboard_core_kpis'] ?? [],
            'stats'             => $this->computeStats($governance),
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
    public function save(array $incoming, array $actor, string $reason = ''): array
    {
        $seed = $this->readRegistrySeed();
        $seedKpis = is_array($seed['annex122_governance_kpis'] ?? null)
            ? $seed['annex122_governance_kpis'] : [];

        $seedByCode = [];
        foreach ($seedKpis as $row) {
            if (is_array($row) && isset($row['canonical_code'])) {
                $seedByCode[(string) $row['canonical_code']] = $row;
            }
        }

        $rawOverrides = $incoming['governance_overrides'] ?? null;
        if (!is_array($rawOverrides)) {
            throw new RuntimeException('kpi_registry_invalid_payload');
        }

        // Accept only known codes and only editable fields; structural fields
        // (formula, data_source, calculation_status, tier…) are never writable.
        $overrides = [];
        foreach ($rawOverrides as $code => $patch) {
            $code = strtoupper(trim((string) $code));
            if (!isset($seedByCode[$code]) || !is_array($patch)) {
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

        // Build the effective governance set (seed + overrides) and validate.
        $effective = [];
        foreach ($seedKpis as $row) {
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
        $this->validate($effective);

        $now = gmdate('c');
        $overlay = [
            'overlay_id'          => 'KPI-CONSOLE-OVERLAY',
            'schema_version'      => (int) ($seed['schema_version'] ?? 0),
            'updated_at'          => $now,
            'updated_by'          => $this->actorName($actor),
            'reason'              => trim($reason),
            'governance_overrides'=> $overrides,
        ];
        FileHelper::writeJson($this->overlayPath(), $overlay);

        $regenerated = $this->regenerateAnnex122($effective);

        return [
            'saved'            => true,
            'overlay'          => $overlay,
            'override_count'   => count($overrides),
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
        $rows = [];
        foreach (($seed['annex122_governance_kpis'] ?? []) as $row) {
            if (is_array($row)) {
                $rows[] = $row;
            }
        }

        $seedSchema    = (int) ($seed['schema_version'] ?? 0);
        $overlaySchema = is_array($overlay) ? (int) ($overlay['schema_version'] ?? 0) : 0;
        $overrides = is_array($overlay) ? ($overlay['governance_overrides'] ?? null) : null;
        // Stale overlay (seed advanced past it) → ignore, same gate as engine.
        if (!is_array($overrides) || ($seedSchema > 0 && $overlaySchema < $seedSchema)) {
            return $rows;
        }

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
        return $rows;
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
                $counter = trim((string) ($row['counter_metric'] ?? ''));
                if ($counter === '') {
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
        if ($field === 'counter_metric' && ($value === null || $value === '')) {
            return null;
        }
        return $this->plainText((string) $value);
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
            if (trim((string) ($row['counter_metric'] ?? '')) !== '') {
                $withCounter++;
            }
            if (($row['reward_eligible'] ?? false) === true) {
                $rewardEligible++;
                if (trim((string) ($row['counter_metric'] ?? '')) !== '') {
                    // reward KPI with counter — counted in coverage below
                }
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
            . '<thead><tr><th>KPI</th><th>Công thức</th><th>Ngưỡng X/V/Đ</th>'
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

        [$tg, $ty, $tr] = $this->thresholdDisplay($t);
        $thresholds = '<span class="kpi-good" style="padding:1px 5px;border-radius:4px">Xanh ' . $e($tg) . '</span><br>'
            . '<span class="kpi-warn" style="padding:1px 5px;border-radius:4px">Vàng ' . $e($ty) . '</span><br>'
            . '<span class="kpi-bad" style="padding:1px 5px;border-radius:4px">Đỏ ' . $e($tr) . '</span>';
        if (!empty($t['basis'])) {
            $thresholds .= '<br><span class="mini-note">Căn cứ: ' . $e($t['basis']) . '</span>';
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
        if (!empty($k['counter_metric'])) {
            $extras[] = 'Counter-metric: <span class="role-code">' . $e($k['counter_metric']) . '</span>';
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
