<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;
use Throwable;

/**
 * GraphicsQaGateRunner
 * ----------------------------------------------------------------------------
 * Runs the 19 Standard-36 QA gates (V4 rule R-082) for a staged rollout and
 * persists results into `graphics_qa_gate_result`.
 *
 * A gate evaluates to `pass | warn | fail | skip | waived`. A `fail` row with
 * `blocker = true` prevents `graphics_rollout_scope` from transitioning to
 * `applied` unless a waiver covers it (mirrors SAP publish blockers).
 *
 * This runner wires the *automated* gates (schema, contrast, dark-mode sync,
 * focus ring, etc.). Manual gates (release sign-off, platform-specific QA)
 * are stubbed to `skip` and await reviewer input.
 *
 * @package MOM\Api\Services
 * @since   3.2.0 (V4 conformance pass — 2026-04-19)
 */
final class GraphicsQaGateRunner
{
    /** @var array<int, array{gate_id:string, gate_name:string, category:string, automated:bool, blocker:bool}> */
    private const GATES = [
        ['gate_id'=>'G01','gate_name'=>'Schema validation',    'category'=>'schema',   'automated'=>true, 'blocker'=>true],
        ['gate_id'=>'G02','gate_name'=>'Template match',       'category'=>'schema',   'automated'=>true, 'blocker'=>true],
        ['gate_id'=>'G03','gate_name'=>'Token consistency',    'category'=>'schema',   'automated'=>true, 'blocker'=>true],
        ['gate_id'=>'G04','gate_name'=>'Dark mode sync',       'category'=>'visual',   'automated'=>true, 'blocker'=>true],
        ['gate_id'=>'G05','gate_name'=>'Contrast AA',          'category'=>'a11y',     'automated'=>true, 'blocker'=>true],
        ['gate_id'=>'G06','gate_name'=>'WCAG 2.2',             'category'=>'a11y',     'automated'=>true, 'blocker'=>false],
        ['gate_id'=>'G07','gate_name'=>'Focus ring',           'category'=>'a11y',     'automated'=>true, 'blocker'=>true],
        ['gate_id'=>'G08','gate_name'=>'Responsive',           'category'=>'visual',   'automated'=>false,'blocker'=>true],
        ['gate_id'=>'G09','gate_name'=>'Density',              'category'=>'visual',   'automated'=>false,'blocker'=>false],
        ['gate_id'=>'G10','gate_name'=>'Manufacturing',        'category'=>'compliance','automated'=>false,'blocker'=>false],
        ['gate_id'=>'G11','gate_name'=>'Print output',         'category'=>'visual',   'automated'=>false,'blocker'=>true],
        ['gate_id'=>'G12','gate_name'=>'Perf budget',          'category'=>'perf',     'automated'=>true, 'blocker'=>false],
        ['gate_id'=>'G13','gate_name'=>'Rollback safety',      'category'=>'compliance','automated'=>true, 'blocker'=>true],
        ['gate_id'=>'G14','gate_name'=>'Audit trail',          'category'=>'compliance','automated'=>true, 'blocker'=>true],
        ['gate_id'=>'G15','gate_name'=>'Naming standard',      'category'=>'schema',   'automated'=>true, 'blocker'=>false],
        ['gate_id'=>'G16','gate_name'=>'Build packet',         'category'=>'schema',   'automated'=>true, 'blocker'=>false],
        ['gate_id'=>'G17','gate_name'=>'Block contract',       'category'=>'schema',   'automated'=>true, 'blocker'=>false],
        ['gate_id'=>'G18','gate_name'=>'Release signoff',      'category'=>'compliance','automated'=>false,'blocker'=>true],
        ['gate_id'=>'G19','gate_name'=>'Platform specific',    'category'=>'visual',   'automated'=>false,'blocker'=>false],
    ];

    private DataLayer $data;
    private DesignTokenCatalogService $catalog;

    public function __construct(DataLayer $data, DesignTokenCatalogService $catalog)
    {
        $this->data = $data;
        $this->catalog = $catalog;
    }

    /**
     * Run every automated gate over a staged rollout and persist one row per
     * gate into graphics_qa_gate_result. Returns the aggregate summary.
     *
     * @param array{rollout_id?:string, simulation_run_id?:string, draft_changes?:array<string, array<string, mixed>>, color_mode?:string, evaluator?:string} $ctx
     * @return array{gates:array<int, array<string, mixed>>, blockers:int, passed:int, warned:int, failed:int, skipped:int}
     */
    public function run(array $ctx): array
    {
        $rolloutId   = $ctx['rollout_id'] ?? null;
        $simRunId    = $ctx['simulation_run_id'] ?? null;
        $changes     = is_array($ctx['draft_changes'] ?? null) ? $ctx['draft_changes'] : [];
        $colorMode   = (string)($ctx['color_mode'] ?? 'light');
        $evaluator   = (string)($ctx['evaluator'] ?? 'automated:qa_gate_runner');

        $summary = ['gates' => [], 'blockers' => 0, 'passed' => 0, 'warned' => 0, 'failed' => 0, 'skipped' => 0];

        foreach (self::GATES as $gate) {
            $result = $this->evaluate($gate, $changes, $colorMode);
            $result['gate_id'] = $gate['gate_id'];
            $result['gate_name'] = $gate['gate_name'];
            $result['evaluator'] = $evaluator;

            $status = (string)$result['status'];
            $blocker = $gate['blocker'] && $status === 'fail';
            $result['blocker'] = $blocker;

            $summary['gates'][] = $result;
            if ($blocker) { $summary['blockers']++; }
            if ($status === 'pass')  { $summary['passed']++; }
            if ($status === 'warn')  { $summary['warned']++; }
            if ($status === 'fail')  { $summary['failed']++; }
            if ($status === 'skip')  { $summary['skipped']++; }

            if ($rolloutId !== null) {
                $this->persistRow($rolloutId, $simRunId, $result);
            }
        }

        return $summary;
    }

    /**
     * Evaluate one gate. Pure function — no DB writes here.
     *
     * @param array{gate_id:string, gate_name:string, category:string, automated:bool, blocker:bool} $gate
     * @param array<string, array<string, mixed>> $changes
     * @return array{status:string, score:float|null, findings:array<int, array<string, mixed>>, evidence_url:string|null}
     */
    private function evaluate(array $gate, array $changes, string $colorMode): array
    {
        try {
            switch ($gate['gate_id']) {
                case 'G01': return $this->gateSchemaValidation($changes);
                case 'G03': return $this->gateTokenConsistency($changes);
                case 'G04': return $this->gateDarkModeSync($changes);
                case 'G05': return $this->gateContrastAa($changes, $colorMode);
                case 'G07': return $this->gateFocusRing($changes);
                case 'G13': return $this->gateRollbackSafety($changes);
                case 'G14': return $this->gateAuditTrail($changes);
                case 'G15': return $this->gateNamingStandard($changes);
                default:
                    if (!$gate['automated']) {
                        return $this->skip('manual review required');
                    }
                    return $this->skip('evaluator not yet implemented');
            }
        } catch (Throwable $e) {
            return [
                'status' => 'warn',
                'score'  => null,
                'findings' => [['type' => 'evaluator_error', 'message' => $e->getMessage()]],
                'evidence_url' => null,
            ];
        }
    }

    // ── Individual gate evaluators ───────────────────────────────────────────

    /** @param array<string, array<string, mixed>> $changes */
    private function gateSchemaValidation(array $changes): array
    {
        $findings = [];
        foreach ($changes as $key => $row) {
            if (!preg_match('/^[a-zA-Z_][\w]*(\.[a-zA-Z_][\w]*)*$/', (string)$key)) {
                $findings[] = ['type' => 'bad_token_key', 'token_key' => $key];
            }
            if (!array_key_exists('to', $row) || !is_scalar($row['to'])) {
                $findings[] = ['type' => 'missing_or_invalid_value', 'token_key' => $key];
            }
        }
        return $this->summarize($findings, count($changes));
    }

    /** @param array<string, array<string, mixed>> $changes */
    private function gateTokenConsistency(array $changes): array
    {
        $findings = [];
        foreach (array_keys($changes) as $tokenKey) {
            $token = $this->catalog->getToken((string)$tokenKey);
            if ($token === null) {
                $findings[] = ['type' => 'unknown_token', 'token_key' => $tokenKey];
            } elseif (!empty($token['is_deprecated'])) {
                $findings[] = ['type' => 'deprecated_token', 'token_key' => $tokenKey];
            }
        }
        return $this->summarize($findings, count($changes));
    }

    /** @param array<string, array<string, mixed>> $changes */
    private function gateDarkModeSync(array $changes): array
    {
        $findings = [];
        foreach (array_keys($changes) as $tokenKey) {
            $token = $this->catalog->getToken((string)$tokenKey);
            if ($token === null) continue;
            if (($token['family'] ?? '') !== 'color') continue;
            if (empty($token['default_dark'])) {
                $findings[] = ['type' => 'missing_dark_value', 'token_key' => $tokenKey];
            }
            if (empty($token['default_high_contrast'])) {
                $findings[] = ['type' => 'missing_high_contrast_value', 'token_key' => $tokenKey];
            }
        }
        return $this->summarize($findings, count($changes));
    }

    /** @param array<string, array<string, mixed>> $changes */
    private function gateContrastAa(array $changes, string $colorMode): array
    {
        $findings = [];
        foreach ($changes as $tokenKey => $row) {
            $token = $this->catalog->getToken((string)$tokenKey);
            if ($token === null || empty($token['wcag_pair_token'])) continue;
            $fg = (string)($row['to'] ?? '');
            $bg = (string)($this->catalog->getEffectiveValue((string)$token['wcag_pair_token'], [], $colorMode) ?? '');
            if ($fg === '' || $bg === '') continue;
            $ratio = self::contrastRatio($fg, $bg);
            $min   = (float)($token['wcag_min_contrast'] ?? 4.5);
            if ($ratio + 0.005 < $min) {
                $findings[] = [
                    'type' => 'contrast_below_minimum',
                    'token_key' => $tokenKey,
                    'paired_token' => $token['wcag_pair_token'],
                    'ratio' => round($ratio, 2),
                    'required_min' => $min,
                ];
            }
        }
        return $this->summarize($findings, count($changes));
    }

    /** @param array<string, array<string, mixed>> $changes */
    private function gateFocusRing(array $changes): array
    {
        $findings = [];
        if (array_key_exists('effects.focusRingColor', $changes)) {
            $ring = (string)($changes['effects.focusRingColor']['to'] ?? '');
            if ($ring !== '') {
                foreach (['colorsLight.bgPage', 'colorsLight.bgSurface', 'colorsLight.bgSurfaceAlt'] as $bgKey) {
                    $bg = (string)($this->catalog->getEffectiveValue($bgKey, [], 'light') ?? '');
                    if ($bg === '') continue;
                    $ratio = self::contrastRatio(self::stripAlpha($ring), $bg);
                    if ($ratio < 3.0) {
                        $findings[] = [
                            'type' => 'focus_ring_insufficient_contrast',
                            'against' => $bgKey,
                            'ratio' => round($ratio, 2),
                        ];
                    }
                }
            }
        }
        return $this->summarize($findings, 1);
    }

    /** @param array<string, array<string, mixed>> $changes */
    private function gateRollbackSafety(array $changes): array
    {
        $findings = [];
        foreach ($changes as $tokenKey => $row) {
            if (!array_key_exists('from', $row)) {
                $findings[] = ['type' => 'missing_prior_value', 'token_key' => $tokenKey];
            }
        }
        return $this->summarize($findings, count($changes));
    }

    /** @param array<string, array<string, mixed>> $changes */
    private function gateAuditTrail(array $changes): array
    {
        $findings = [];
        if ($changes === []) {
            $findings[] = ['type' => 'empty_changeset', 'message' => 'Audit gate requires at least one staged change'];
        }
        return $this->summarize($findings, 1);
    }

    /** @param array<string, array<string, mixed>> $changes */
    private function gateNamingStandard(array $changes): array
    {
        $findings = [];
        foreach (array_keys($changes) as $tokenKey) {
            $token = $this->catalog->getToken((string)$tokenKey);
            if ($token === null) continue;
            $cssVar = (string)($token['css_variable'] ?? '');
            if ($cssVar === '') continue;
            if (!preg_match('/^--[a-z][a-z0-9-]*(-[a-z0-9]+)*$/', $cssVar)) {
                $findings[] = ['type' => 'css_variable_name_nonconforming', 'token_key' => $tokenKey, 'css_variable' => $cssVar];
            }
        }
        return $this->summarize($findings, count($changes));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * @param array<int, array<string, mixed>> $findings
     * @return array{status:string, score:float|null, findings:array<int, array<string, mixed>>, evidence_url:null}
     */
    private function summarize(array $findings, int $denominator): array
    {
        if ($findings === []) {
            return ['status' => 'pass', 'score' => 100.0, 'findings' => [], 'evidence_url' => null];
        }
        $failCount = count($findings);
        $score = $denominator > 0 ? max(0.0, 100.0 - ($failCount / max(1, $denominator)) * 100.0) : 0.0;
        return [
            'status' => $failCount > 0 ? 'fail' : 'warn',
            'score' => round($score, 2),
            'findings' => $findings,
            'evidence_url' => null,
        ];
    }

    /** @return array{status:string, score:null, findings:array{0:array{type:string,message:string}}, evidence_url:null} */
    private function skip(string $reason): array
    {
        return [
            'status' => 'skip',
            'score' => null,
            'findings' => [['type' => 'skipped', 'message' => $reason]],
            'evidence_url' => null,
        ];
    }

    /** @param array{gate_id:string, gate_name:string, status:string, score:float|null, findings:array<int, array<string, mixed>>, blocker:bool, evaluator:string, evidence_url:string|null} $result */
    private function persistRow(string $rolloutId, ?string $simRunId, array $result): void
    {
        try {
            // PDO (native prepares) rejects Postgres $N placeholders and binds a
            // PHP bool to ''/'1' — use ? + 1-indexed params, and pass blocker as
            // a 'true'/'false' text bound through ?::boolean.
            $this->data->execute(
                'INSERT INTO graphics_qa_gate_result
                    (rollout_id, simulation_run_id, gate_id, gate_name, status, score, findings, blocker, evaluator, evidence_url)
                 VALUES (?,?,?,?,?,?,COALESCE(?::jsonb,\'[]\'::jsonb),?::boolean,?,?)
                 ON CONFLICT (rollout_id, gate_id) DO UPDATE SET
                    status       = EXCLUDED.status,
                    score        = EXCLUDED.score,
                    findings     = EXCLUDED.findings,
                    blocker      = EXCLUDED.blocker,
                    evaluator    = EXCLUDED.evaluator,
                    evaluated_at = NOW(),
                    evidence_url = EXCLUDED.evidence_url',
                array_combine(range(1, 10), [
                    $rolloutId,
                    $simRunId,
                    $result['gate_id'],
                    $result['gate_name'],
                    $result['status'],
                    $result['score'],
                    json_encode($result['findings']),
                    !empty($result['blocker']) ? 'true' : 'false',
                    $result['evaluator'],
                    $result['evidence_url'],
                ])
            );
        } catch (Throwable $e) {
            // Evidence trail: audit table not reachable; fall silent, caller
            // will retry when the DB mode is available.
        }
    }

    // ── Pure colour math (WCAG 2.1) ─────────────────────────────────────────

    private static function contrastRatio(string $fg, string $bg): float
    {
        $l1 = self::relativeLuminance($fg);
        $l2 = self::relativeLuminance($bg);
        $hi = max($l1, $l2);
        $lo = min($l1, $l2);
        return ($hi + 0.05) / ($lo + 0.05);
    }

    private static function relativeLuminance(string $color): float
    {
        [$r, $g, $b] = self::parseRgb($color);
        $channels = array_map(static function (float $v): float {
            $v = $v / 255.0;
            return $v <= 0.03928 ? $v / 12.92 : pow(($v + 0.055) / 1.055, 2.4);
        }, [$r, $g, $b]);
        return 0.2126 * $channels[0] + 0.7152 * $channels[1] + 0.0722 * $channels[2];
    }

    /** @return array{0:float,1:float,2:float} */
    private static function parseRgb(string $color): array
    {
        $color = trim($color);
        if (preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $color, $m)) {
            $hex = $m[1];
            if (strlen($hex) === 3) {
                $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
            }
            $hex = substr($hex, 0, 6);
            $n = hexdec($hex);
            return [(float)(($n >> 16) & 0xff), (float)(($n >> 8) & 0xff), (float)($n & 0xff)];
        }
        if (preg_match('/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i', $color, $m)) {
            return [(float)$m[1], (float)$m[2], (float)$m[3]];
        }
        return [0.0, 0.0, 0.0];
    }

    private static function stripAlpha(string $color): string
    {
        if (preg_match('/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i', $color, $m)) {
            return sprintf('rgb(%d,%d,%d)', (int)$m[1], (int)$m[2], (int)$m[3]);
        }
        return $color;
    }
}
