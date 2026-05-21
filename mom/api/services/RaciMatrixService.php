<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

/**
 * RaciMatrixService
 * ----------------------------------------------------------------------------
 * Backs the admin "RACI matrix" editor. The editable store is
 * mom/data/config/raci_matrix.json (runtime config, seeded from the
 * git-tracked raci_matrix.bootstrap.json). On save the service:
 *   1. accepts ONLY the A/R/C/I role letters from the admin payload — the
 *      structural cells (gate/CDR/activity/FRM links) are kept from the
 *      stored config, so the admin cannot inject markup into a controlled doc;
 *   2. validates the RACI invariants (exactly one A per row, at least one R);
 *   3. regenerates the marked §5 gate-matrix region inside ANNEX-121 so the
 *      controlled document always reflects the edited matrix.
 *
 * ANNEX-121 stays the published controlled document; this service keeps it in
 * lock-step with the editable store — the propagation the admin module needs.
 */
final class RaciMatrixService
{
    private const CONFIG_RELATIVE_PATH    = 'config/raci_matrix.json';
    private const BOOTSTRAP_RELATIVE_PATH = 'config/raci_matrix.bootstrap.json';
    private const ANNEX121_RELATIVE_PATH  =
        'mom/docs/operations/references/01-ANNEX-100/'
        . '12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html';
    private const REGION_KEY = 'RACI-GATE-MATRIX';

    /** @var array<int, string> */
    private const ROLES = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR/IT'];
    /** @var array<int, string> */
    private const LETTERS = ['A','R','C','I'];

    private string $rootDir;
    private string $dataDir;

    public function __construct(string $rootDir, string $dataDir)
    {
        $this->rootDir = rtrim($rootDir, '/');
        $this->dataDir = rtrim($dataDir, '/');
    }

    /** @return array<string, mixed> */
    public function load(): array
    {
        $stored = FileHelper::readJson($this->configPath());
        if (!is_array($stored) || empty($stored['rows'])) {
            $stored = FileHelper::readJson($this->bootstrapPath());
        }
        return $this->normalise(is_array($stored) ? $stored : []);
    }

    /**
     * @param array<string, mixed> $incoming
     * @param array<string, mixed> $actor
     * @return array<string, mixed>
     */
    public function save(array $incoming, array $actor, string $reason = ''): array
    {
        // Structural cells always come from the stored config; the payload only
        // contributes role letters. This blocks markup injection into ANNEX-121.
        $config = $this->load();
        $incomingRows = is_array($incoming['rows'] ?? null) ? $incoming['rows'] : [];

        foreach ($config['rows'] as $i => $row) {
            $src = is_array($incomingRows[$i] ?? null) ? $incomingRows[$i] : [];
            $srcRoles = is_array($src['roles'] ?? null) ? $src['roles'] : [];
            $roles = [];
            foreach (self::ROLES as $role) {
                $roles[$role] = $this->cleanLetter((string)($srcRoles[$role] ?? ''));
            }
            $config['rows'][$i]['roles'] = $roles;
        }

        $this->validate($config);

        $now = gmdate('c');
        $config['updated_at'] = $now;
        $config['updated_by'] = $this->actorName($actor);
        $config['reason']     = trim($reason);

        $published = $this->publishAnnex121($config);
        $config['last_publication'] = [
            'published_at' => $now,
            'published_by' => $config['updated_by'],
            'document'     => $published,
        ];

        FileHelper::writeJson($this->configPath(), $config);

        return ['config' => $config, 'updated_documents' => [$published]];
    }

    /* ── Normalisation ──────────────────────────────────────────────────── */

    /**
     * @param array<string, mixed> $config
     * @return array<string, mixed>
     */
    private function normalise(array $config): array
    {
        $rows = [];
        $srcRows = is_array($config['rows'] ?? null) ? $config['rows'] : [];
        foreach ($srcRows as $row) {
            if (!is_array($row)) { continue; }
            $roles = [];
            $srcRoles = is_array($row['roles'] ?? null) ? $row['roles'] : [];
            foreach (self::ROLES as $role) {
                $roles[$role] = $this->cleanLetter((string)($srcRoles[$role] ?? ''));
            }
            $rows[] = [
                'gate'          => trim((string)($row['gate'] ?? '')),
                'cdr'           => trim((string)($row['cdr'] ?? '')),
                'gate_html'     => (string)($row['gate_html'] ?? ''),
                'cdr_html'      => (string)($row['cdr_html'] ?? ''),
                'activity_html' => (string)($row['activity_html'] ?? ''),
                'frm_html'      => (string)($row['frm_html'] ?? ''),
                'roles'         => $roles,
            ];
        }
        return [
            'schema_version' => 1,
            'updated_at'     => (string)($config['updated_at'] ?? ''),
            'updated_by'     => (string)($config['updated_by'] ?? ''),
            'reason'         => (string)($config['reason'] ?? ''),
            'rows'           => $rows,
        ];
    }

    private function cleanLetter(string $value): string
    {
        $value = strtoupper(trim($value));
        return in_array($value, self::LETTERS, true) ? $value : '';
    }

    /* ── Validation ─────────────────────────────────────────────────────── */

    /** @param array<string, mixed> $config */
    private function validate(array $config): void
    {
        $rows = $config['rows'] ?? [];
        if (!is_array($rows) || count($rows) === 0) {
            throw new RuntimeException('raci_matrix_empty');
        }
        foreach ($rows as $row) {
            $label = (string)($row['gate'] ?? '?') . '/' . (string)($row['cdr'] ?? '?');
            $letters = array_values($row['roles'] ?? []);
            $a = count(array_filter($letters, static fn($x) => $x === 'A'));
            $r = count(array_filter($letters, static fn($x) => $x === 'R'));
            if ($a !== 1) {
                throw new RuntimeException('raci_matrix_invalid_accountable:' . $label . ':' . $a);
            }
            if ($r < 1) {
                throw new RuntimeException('raci_matrix_missing_responsible:' . $label);
            }
        }
    }

    /* ── Publication into ANNEX-121 ─────────────────────────────────────── */

    /**
     * @param array<string, mixed> $config
     * @return array<string, string>
     */
    private function publishAnnex121(array $config): array
    {
        $path = $this->rootDir . '/' . self::ANNEX121_RELATIVE_PATH;
        $html = @file_get_contents($path);
        if ($html === false) {
            throw new RuntimeException('raci_matrix_annex121_not_readable');
        }

        $block = $this->buildGateBlock($config['rows']);
        $updated = $this->replaceRegion($html, self::REGION_KEY, $block);

        if (@file_put_contents($path, $updated, LOCK_EX) === false) {
            throw new RuntimeException('raci_matrix_annex121_not_writable');
        }

        return [
            'doc_code' => 'ANNEX-121',
            'path'     => self::ANNEX121_RELATIVE_PATH,
            'rows'     => (string)count($config['rows']),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function buildGateBlock(array $rows): string
    {
        $out = [];
        foreach ($rows as $row) {
            $cells  = '<td>' . $row['gate_html'] . '</td>';
            $cells .= '<td>' . $row['cdr_html'] . '</td>';
            $cells .= '<td>' . $row['activity_html'] . '</td>';
            foreach (self::ROLES as $role) {
                $cells .= $this->raciCell((string)($row['roles'][$role] ?? ''));
            }
            $cells .= '<td>' . $row['frm_html'] . '</td>';
            $out[] = '<tr>' . $cells . '</tr>';
        }
        return implode("\n", $out);
    }

    private function raciCell(string $value): string
    {
        $value = $this->cleanLetter($value);
        if ($value === '') {
            return '<td></td>';
        }
        return '<td class="raci-cell raci-' . $value . '">' . $value . '</td>';
    }

    private function replaceRegion(string $html, string $key, string $block): string
    {
        $start = '<!-- ' . $key . ':START -->';
        $end   = '<!-- ' . $key . ':END -->';
        if (!str_contains($html, $start) || !str_contains($html, $end)) {
            throw new RuntimeException('raci_matrix_region_markers_missing:' . $key);
        }
        $pattern = '/' . preg_quote($start, '/') . '.*?' . preg_quote($end, '/') . '/s';
        $managed = $start . "\n" . $block . "\n" . $end;
        $next = preg_replace($pattern, $managed, $html, 1, $count);
        if ($count !== 1 || $next === null) {
            throw new RuntimeException('raci_matrix_region_replace_failed:' . $key);
        }
        return $next;
    }

    /* ── Helpers ────────────────────────────────────────────────────────── */

    /** @param array<string, mixed> $actor */
    private function actorName(array $actor): string
    {
        foreach (['username', 'full_name', 'name', 'email'] as $key) {
            $value = trim((string)($actor[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }
        return 'admin';
    }

    private function configPath(): string
    {
        return $this->dataDir . '/' . self::CONFIG_RELATIVE_PATH;
    }

    private function bootstrapPath(): string
    {
        return $this->dataDir . '/' . self::BOOTSTRAP_RELATIVE_PATH;
    }
}
