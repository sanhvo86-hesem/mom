<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

/**
 * RaciMatrixService
 * ----------------------------------------------------------------------------
 * Backs the admin "RACI matrix" editor and is the single control point for the
 * RACI ecosystem. The editable store is mom/data/config/raci_matrix.json
 * (runtime config, seeded from the git-tracked raci_matrix.bootstrap.json).
 *
 * On save the service:
 *   1. accepts ONLY the A/R/C/I role letters from the admin payload — the
 *      structural cells are kept server-side, blocking markup injection;
 *   2. validates the RACI invariants (exactly one A, at least one R per row);
 *   3. regenerates the RACI-GATE-MATRIX region inside RACI-MASTER-MATRIX §5, AND every
 *      RACI-MATRIX region embedded in the managed SOP / JD documents;
 *   4. bumps the DCC minor revision of every document it actually changed.
 *
 * A managed SOP/JD region is delimited by:
 *   <!-- RACI-MATRIX:START kind=sop code=SOP-201 --> … <!-- RACI-MATRIX:END -->
 *   <!-- RACI-MATRIX:START kind=jd  role=PD       --> … <!-- RACI-MATRIX:END -->
 * The marker carries the filter, so no per-save HTML parsing is needed.
 */
final class RaciMatrixService
{
    private const CONFIG_RELATIVE_PATH    = 'config/raci_matrix.json';
    private const BOOTSTRAP_RELATIVE_PATH = 'config/raci_matrix.bootstrap.json';
    private const RACI_MASTER_RELATIVE_PATH  =
        'mom/docs/system/organization/04-RACI-Authority/raci-master-matrix.html';
    private const GATE_REGION = 'RACI-GATE-MATRIX';

    /** @var array<int, string> */
    private const ROLES = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR','IT'];
    /** @var array<int, string> */
    private const LETTERS = ['A','R','C','I'];
    /** @var array<string, string> */
    private const ALIAS = [
        'ENGM'=>'ENG','PE'=>'ENG','CAM'=>'ENG','DFM'=>'ENG',
        'BUY'=>'SCM','XNK'=>'SCM','ITA'=>'IT','ESA'=>'IT',
        'QCL'=>'QA','QC'=>'QA','QE'=>'QA','SL'=>'WKM','SET'=>'WKM','OPR'=>'WKM',
    ];
    /** @var array<int, string> Globs (relative to rootDir) for managed SOP/JD docs. */
    private const MANAGED_GLOBS = [
        'mom/docs/operations/sops/*/*.html',
        'mom/docs/system/organization/03-Job-Descriptions/*/*.html',
    ];

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
        $runtime = FileHelper::readJson($this->configPath());
        $runtime = is_array($runtime) ? $runtime : [];
        $boot    = FileHelper::readJson($this->bootstrapPath());
        $boot    = is_array($boot) ? $boot : [];

        // Schema-version gate. When the bootstrap seed ships a newer schema
        // (e.g. a column added or a CDR set restructured) the runtime file
        // written under the old schema is structurally stale — discard it so
        // the deployed seed takes full effect. A save() under the new schema
        // re-stamps the runtime file and normal merging resumes.
        $bootSv = (int)($boot['schema_version'] ?? 0);
        $rtSv   = (int)($runtime['schema_version'] ?? 0);
        if ($bootSv > 0 && $rtSv < $bootSv) {
            $runtime = [];
        }

        // The bootstrap seed is the STRUCTURAL source of truth — it defines
        // which CDR rows exist (gate, code, activity, forms). The runtime
        // file only carries the live A/R/C/I letter state. Merging the two
        // means a new CDR row added to the bootstrap appears immediately,
        // while any letter edited through the admin UI is preserved.
        $bootRows    = is_array($boot['rows'] ?? null) ? $boot['rows'] : [];
        $runtimeRows = is_array($runtime['rows'] ?? null) ? $runtime['rows'] : [];
        if ($bootRows) {
            $rtByKey = [];
            foreach ($runtimeRows as $rr) {
                if (!is_array($rr)) { continue; }
                $rtByKey[$this->rowKey($rr)] = $rr;
            }
            $merged = [];
            foreach ($bootRows as $br) {
                if (!is_array($br)) { continue; }
                $rt = $rtByKey[$this->rowKey($br)] ?? null;
                if (is_array($rt) && is_array($rt['roles'] ?? null)) {
                    $br['roles'] = $rt['roles'];
                }
                $merged[] = $br;
            }
            $gateSrc = ['rows' => $merged];
        } else {
            $gateSrc = !empty($runtime['rows']) ? $runtime : $boot;
        }
        foreach (['updated_at', 'updated_by', 'reason'] as $metaKey) {
            $gateSrc[$metaKey] = (string)($runtime[$metaKey] ?? $boot[$metaKey] ?? '');
        }
        $config = $this->normalise($gateSrc);
        // Carry the bootstrap schema version so a save() re-stamps the
        // runtime file as current and future loads merge it normally.
        $config['schema_version'] = $bootSv > 0 ? $bootSv : 1;

        // Auxiliary datasets (value-stream §4, document-level §6, support).
        // Same rule as the gate matrix: the bootstrap defines how many rows
        // exist; the runtime file overlays edited cells by position. A new
        // row appended to the bootstrap therefore appears immediately.
        foreach (['value_stream', 'document_level', 'support'] as $key) {
            $bootArr = is_array($boot[$key] ?? null) ? $boot[$key] : [];
            $rtArr   = is_array($runtime[$key] ?? null) ? $runtime[$key] : [];
            if ($bootArr) {
                $merged = [];
                foreach ($bootArr as $i => $br) {
                    $merged[] = (isset($rtArr[$i]) && is_array($rtArr[$i])) ? $rtArr[$i] : $br;
                }
                $src = $merged;
            } else {
                $src = $rtArr;
            }
            $config[$key] = $this->normaliseCells($src);
        }

        // JD interface RACI + SOP role RACI — document-keyed maps. The
        // bootstrap defines which documents are managed; the runtime file
        // overlays edited HTML per slug.
        foreach (['jd_interface', 'sop_roles'] as $key) {
            $bootMap = is_array($boot[$key] ?? null) ? $boot[$key] : [];
            $rtMap   = is_array($runtime[$key] ?? null) ? $runtime[$key] : [];
            if ($bootMap) {
                $merged = $bootMap;
                foreach ($rtMap as $slug => $entry) {
                    if (isset($merged[$slug]) && is_array($entry)) {
                        $merged[$slug] = $entry;
                    }
                }
                $src = $merged;
            } else {
                $src = $rtMap;
            }
            $config[$key] = $this->normaliseDocHtmlMap($src);
        }

        $config['linked_documents'] = $this->linkedDocuments();
        return $config;
    }

    /**
     * Normalise a document-keyed {slug: {title, html}} map (JD interface
     * tables, SOP §4 role tables).
     *
     * @param array<string, mixed> $src
     * @return array<string, array{title: string, html: string}>
     */
    private function normaliseDocHtmlMap(array $src): array
    {
        $out = [];
        foreach ($src as $slug => $entry) {
            if (!is_string($slug) || !is_array($entry)) { continue; }
            $out[$slug] = [
                'title' => trim((string)($entry['title'] ?? $slug)),
                'html'  => $this->sanitiseCell((string)($entry['html'] ?? '')),
            ];
        }
        return $out;
    }

    /**
     * @param array<int, mixed> $src
     * @return array<int, array{cells: array<int, string>}>
     */
    private function normaliseCells(array $src): array
    {
        $out = [];
        foreach ($src as $row) {
            $cells = is_array($row['cells'] ?? null) ? $row['cells'] : [];
            $out[] = ['cells' => array_map(fn($c) => $this->sanitiseCell((string)$c), $cells)];
        }
        return $out;
    }

    /** Defence-in-depth: strip scripting from admin-authored controlled-doc cells. */
    private function sanitiseCell(string $html): string
    {
        $html = (string)preg_replace('/<\s*script\b.*?<\s*\/\s*script\s*>/is', '', $html);
        $html = (string)preg_replace('/\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|\S+)/i', '', $html);
        $html = (string)preg_replace('/javascript:/i', '', $html);
        return $html;
    }

    /**
     * @param array<string, mixed> $incoming
     * @param array<string, mixed> $actor
     * @return array<string, mixed>
     */
    public function save(array $incoming, array $actor, string $reason = ''): array
    {
        // Structural cells always come from the stored config; the payload only
        // contributes role letters. This blocks markup injection.
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
            // Accept editable level_hint_html (sanitised) — admin can rewrite the
            // tooltip content but cannot inject scripts or arbitrary markup.
            if (array_key_exists('level_hint_html', $src)) {
                $config['rows'][$i]['level_hint_html'] = $this->sanitiseHint((string)$src['level_hint_html']);
                // Re-compose activity_html so the regenerated HTML region stays
                // byte-consistent with the new hint content.
                $config['rows'][$i]['activity_html'] = $this->renderActivityCell($config['rows'][$i]);
            }
        }

        // Auxiliary datasets (§4 value-stream, §6 document-level, support
        // supplement) — accept the edited cells, but only when the payload
        // keeps the stored row/column shape, so a partial post cannot drop
        // rows. sanitiseCell() in normaliseCells() strips active markup.
        foreach (['value_stream', 'document_level', 'support'] as $key) {
            if (!is_array($incoming[$key] ?? null)) {
                continue;
            }
            $stored  = is_array($config[$key] ?? null) ? $config[$key] : [];
            $cleaned = $this->normaliseCells($incoming[$key]);
            if (count($cleaned) === count($stored)) {
                $config[$key] = $cleaned;
            }
        }

        // JD interface RACI + SOP role RACI — accept edited entries for
        // slugs that already exist in the store; unknown slugs are ignored
        // so a stray payload cannot register an unrecognised document.
        foreach (['jd_interface', 'sop_roles'] as $key) {
            if (!is_array($incoming[$key] ?? null)) {
                continue;
            }
            $stored  = is_array($config[$key] ?? null) ? $config[$key] : [];
            $cleaned = $this->normaliseDocHtmlMap($incoming[$key]);
            foreach ($cleaned as $slug => $entry) {
                if (isset($stored[$slug])) {
                    $stored[$slug] = $entry;
                }
            }
            $config[$key] = $stored;
        }

        $this->validate($config);

        $now = gmdate('c');
        $config['updated_at'] = $now;
        $config['updated_by'] = $this->actorName($actor);
        $config['reason']     = trim($reason);

        $published = $this->publishAll($config);
        $config['last_publication'] = [
            'published_at' => $now,
            'published_by' => $config['updated_by'],
            'documents'    => $published,
        ];

        // linked_documents is a code-defined registry — never persisted.
        $persist = $config;
        unset($persist['linked_documents']);
        FileHelper::writeJson($this->configPath(), $persist);

        return ['config' => $config, 'updated_documents' => $published];
    }

    /**
     * Build the expected published HTML for the RACI master and each managed
     * SOP/JD document without writing files. Used by integrity guards so CI
     * can compare published docs with deterministic source rendering.
     *
     * @param array<string, mixed>|null $config
     * @return array<string, string>
     */
    public function previewPublication(?array $config = null): array
    {
        $config ??= $this->load();
        $this->validate($config);

        $preview = [];
        $preview[self::RACI_MASTER_RELATIVE_PATH] = $this->renderRaciMasterMatrix($config);
        foreach ($this->managedDocPaths() as $path) {
            $rendered = $this->renderManagedDocument($path, $config);
            if ($rendered === null) {
                continue;
            }
            $relative = ltrim(str_replace($this->rootDir, '', $path), '/');
            $preview[$relative] = $rendered;
        }

        return $preview;
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
                'gate'             => trim((string)($row['gate'] ?? '')),
                'cdr'              => trim((string)($row['cdr'] ?? '')),
                'gate_html'        => (string)($row['gate_html'] ?? ''),
                'cdr_html'         => (string)($row['cdr_html'] ?? ''),
                'activity_html'    => (string)($row['activity_html'] ?? ''),
                'activity_label'   => (string)($row['activity_label'] ?? ''),
                'level_hint_html'  => (string)($row['level_hint_html'] ?? ''),
                'frm_html'         => (string)($row['frm_html'] ?? ''),
                'roles'            => $roles,
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

    /**
     * Sanitise level-hint HTML — allow only safe inline tags + the Authority
     * link convention. Strips scripts, event handlers, and inline styles.
     * Allowed: <b>, <strong>, <i>, <em>, <br>, <a href="..."> (no target=_blank
     * needed since tooltip is in-document). Class attribute kept only for <a>
     * "entity-link role-link" used by role links.
     */
    private function sanitiseHint(string $html): string
    {
        $html = (string)$html;
        // Strip script/style blocks entirely
        $html = preg_replace('#<(script|style)\b[^>]*>.*?</\1>#is', '', $html) ?? '';
        // Strip on*= handlers and javascript: URIs
        $html = preg_replace('#\s+on[a-z]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', $html) ?? '';
        $html = preg_replace('#javascript:#i', '', $html) ?? '';
        // Allowlist tags: b, strong, i, em, br, a. Strip anything else.
        // Use a single-pass: keep allowed tags, strip others.
        $allowed = ['b','strong','i','em','br','a'];
        $allowedRe = '#</?(?!(?:' . implode('|', $allowed) . ')\b)[a-z][^>]*>#i';
        $html = preg_replace($allowedRe, '', $html) ?? '';
        // For <a> tags, keep href + class only
        $html = preg_replace_callback(
            '#<a\b([^>]*)>#i',
            function ($m) {
                $attrs = $m[1];
                $href = '';
                $class = '';
                if (preg_match('#\bhref\s*=\s*"([^"]*)"#i', $attrs, $h)) {
                    $href = htmlspecialchars($h[1], ENT_QUOTES | ENT_HTML5);
                }
                if (preg_match('#\bclass\s*=\s*"([^"]*)"#i', $attrs, $c)) {
                    $class = htmlspecialchars($c[1], ENT_QUOTES | ENT_HTML5);
                }
                $out = '<a';
                if ($href !== '') { $out .= ' href="' . $href . '"'; }
                if ($class !== '') { $out .= ' class="' . $class . '"'; }
                $out .= '>';
                return $out;
            },
            $html
        ) ?? '';
        return trim($html);
    }

    /**
     * Compose the activity cell HTML from label + optional hint.
     * If level_hint_html is non-empty, wrap with the standard
     * raci-hint-trigger / raci-level-hint structure used in HTML §3.2.
     */
    private function renderActivityCell(array $row): string
    {
        $label = (string)($row['activity_label'] ?? '');
        $hint  = (string)($row['level_hint_html'] ?? '');
        $stored = (string)($row['activity_html'] ?? '');

        if ($label === '' && $hint === '') {
            // No new-schema fields populated — fall back to stored activity_html
            return $stored;
        }
        if ($label === '') {
            // Derive label from stored activity_html by stripping hint wrapper
            $label = trim(preg_replace('#<span class="raci-hint-trigger".*?</span></span>\s*#s', '', $stored) ?? $stored);
        }
        if ($hint === '') {
            return $label;
        }
        $code = htmlspecialchars((string)($row['cdr'] ?? ''), ENT_QUOTES | ENT_HTML5);
        return $label . ' '
            . '<span class="raci-hint-trigger" tabindex="0" role="button" '
            . 'aria-label="Chi tiết L1/L2/L3 + VD thực chiến cho ' . $code . '">'
            . '<span class="raci-hint-chip">L1·L2·L3 ⓘ</span>'
            . '<span class="raci-level-hint">' . $hint . '</span>'
            . '</span>';
    }

    /**
     * Stable identity of a gate-matrix row — gate + CDR + activity text.
     * Used to carry runtime letter edits across a bootstrap structure change.
     *
     * @param array<string, mixed> $row
     */
    private function rowKey(array $row): string
    {
        return trim((string)($row['gate'] ?? '')) . '|'
             . trim((string)($row['cdr'] ?? '')) . '|'
             . $this->plainText((string)($row['activity_html'] ?? ''));
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

    /* ── Publication ────────────────────────────────────────────────────── */

    /**
     * @param array<string, mixed> $config
     * @return array<int, array<string, string>>
     */
    private function publishAll(array $config): array
    {
        $results = [];
        $results[] = $this->publishRaciMasterMatrix($config);
        foreach ($this->managedDocPaths() as $path) {
            $res = $this->publishManagedDoc($path, $config);
            if ($res !== null) {
                $results[] = $res;
            }
        }
        return $results;
    }

    /**
     * @param array<string, mixed> $config
     * @return array<string, string>
     */
    private function publishRaciMasterMatrix(array $config): array
    {
        $path = $this->rootDir . '/' . self::RACI_MASTER_RELATIVE_PATH;
        $html = @file_get_contents($path);
        if ($html === false) {
            throw new RuntimeException('raci_matrix_master_not_readable');
        }
        $updated = $this->renderRaciMasterMatrix($config, $html);
        if ($updated === $html) {
            return ['doc_code' => 'RACI-MASTER-MATRIX', 'path' => self::RACI_MASTER_RELATIVE_PATH,
                    'previous_revision' => '', 'new_revision' => '', 'changed' => 'no'];
        }
        $rev = $this->bumpRevision($updated);
        if (@file_put_contents($path, $rev['html'], LOCK_EX) === false) {
            throw new RuntimeException('raci_matrix_master_not_writable');
        }
        return ['doc_code' => 'RACI-MASTER-MATRIX', 'path' => self::RACI_MASTER_RELATIVE_PATH,
                'previous_revision' => $rev['previous_revision'],
                'new_revision' => $rev['new_revision'], 'changed' => 'yes'];
    }

    /**
     * Auxiliary-dataset region block: one <tr> per row, cells verbatim.
     *
     * @param array<int, array{cells: array<int, string>}> $rows
     */
    private function buildSimpleBlock(array $rows): string
    {
        $out = [];
        foreach ($rows as $row) {
            $cells = is_array($row['cells'] ?? null) ? $row['cells'] : [];
            $tds = '';
            foreach ($cells as $c) {
                $tds .= '<td>' . (string)$c . '</td>';
            }
            $out[] = '<tr>' . $tds . '</tr>';
        }
        return implode("\n", $out);
    }

    /**
     * @param array<string, mixed> $config
     * @return array<string, string>|null  null when the region is unchanged
     */
    private function publishManagedDoc(string $path, array $config): ?array
    {
        $html = @file_get_contents($path);
        if ($html === false) {
            return null;
        }
        $rendered = $this->renderManagedDocument($path, $config, $html);
        if ($rendered === null || $rendered === $html) {
            return null;
        }
        $rev = $this->bumpRevision($rendered);
        if (@file_put_contents($path, $rev['html'], LOCK_EX) === false) {
            throw new RuntimeException('raci_matrix_managed_doc_not_writable:' . basename($path));
        }
        $rel = ltrim(str_replace($this->rootDir, '', $path), '/');
        return ['doc_code' => strtoupper(basename($path, '.html')), 'path' => $rel,
                'previous_revision' => $rev['previous_revision'],
                'new_revision' => $rev['new_revision'], 'changed' => 'yes'];
    }

    /**
     * @param array<string, mixed> $config
     */
    private function renderRaciMasterMatrix(array $config, ?string $html = null): string
    {
        $html ??= @file_get_contents($this->rootDir . '/' . self::RACI_MASTER_RELATIVE_PATH) ?: '';
        if ($html === '') {
            throw new RuntimeException('raci_matrix_master_not_readable');
        }

        $updated = $html;
        $updated = $this->replaceRegionIfPresent($updated, self::GATE_REGION, $this->buildGateBlock($config['rows']));
        $updated = $this->replaceRegionIfPresent($updated, 'RACI-VALUESTREAM', $this->buildSimpleBlock($config['value_stream'] ?? []));
        $updated = $this->replaceRegionIfPresent($updated, 'RACI-DOCLEVEL', $this->buildSimpleBlock($config['document_level'] ?? []));
        $updated = $this->replaceRegionIfPresent($updated, 'RACI-SUPPORT', $this->buildSimpleBlock($config['support'] ?? []));

        return $updated;
    }

    /**
     * @param array<string, mixed> $config
     */
    private function renderManagedDocument(string $path, array $config, ?string $html = null): ?string
    {
        $html ??= @file_get_contents($path) ?: '';
        if ($html === '') {
            return null;
        }

        $hasMatrix = str_contains($html, '<!-- RACI-MATRIX:START');
        $hasRoles = str_contains($html, '<!-- RACI-ROLES:START');
        if (!$hasMatrix && !$hasRoles) {
            return null;
        }

        $rendered = $html;
        if ($hasMatrix) {
            $p = $this->markerParams($html);
            $jdStore = is_array($config['jd_interface'] ?? null) ? $config['jd_interface'] : [];
            if ($p['kind'] === 'jd' && $p['jd'] !== '' && isset($jdStore[$p['jd']]['html'])) {
                $block = (string)$jdStore[$p['jd']]['html'];
            } else {
                $block = $this->buildRegionTable($p['kind'], $p['key'], $config['rows']);
            }
            $replaced = $this->replaceManagedRegion($rendered, $block);
            if ($replaced !== null) {
                $rendered = $replaced;
            }
        }

        if ($hasRoles) {
            $slug = $this->rolesMarkerSlug($html);
            $roleStore = is_array($config['sop_roles'] ?? null) ? $config['sop_roles'] : [];
            if ($slug !== '' && isset($roleStore[$slug]['html'])) {
                $replaced = $this->replaceRolesRegion($rendered, (string)$roleStore[$slug]['html']);
                if ($replaced !== null) {
                    $rendered = $replaced;
                }
            }
        }

        return $rendered;
    }

    /** @return array<int, string> */
    private function managedDocPaths(): array
    {
        $out = [];
        foreach (self::MANAGED_GLOBS as $glob) {
            foreach (glob($this->rootDir . '/' . $glob) ?: [] as $p) {
                if (str_starts_with(basename($p), '_')) { continue; }
                $out[] = $p;
            }
        }
        return $out;
    }

    /* ── Region builders ────────────────────────────────────────────────── */

    /**
     * RACI-MASTER-MATRIX §5 gate matrix — full 15-column tbody rows.
     *
     * @param array<int, array<string, mixed>> $rows
     */
    private function buildGateBlock(array $rows): string
    {
        // Since the 2026-05-23 consolidation the matrix uses a single
        // combined G/CDR cell (stacked vertically inside .gc-stack), so the
        // generated row has 15 cells: G+CDR | activity | 12 roles | FRM/SOP.
        $out = [];
        foreach ($rows as $row) {
            $cells  = '<td><div class="gc-stack">' . $row['gate_html']
                    . '<hr>' . $row['cdr_html'] . '</div></td>';
            // Render activity cell from label + hint if new-schema fields are set;
            // falls back to stored activity_html for backward compat.
            $cells .= '<td>' . $this->renderActivityCell($row) . '</td>';
            foreach (self::ROLES as $role) {
                $cells .= $this->raciCell((string)($row['roles'][$role] ?? ''));
            }
            $cells .= '<td>' . $row['frm_html'] . '</td>';
            $out[] = '<tr>' . $cells . '</tr>';
        }
        return implode("\n", $out);
    }

    /**
     * Embedded SOP/JD region — a 14-column table of the rows relevant to the
     * document. Output MUST byte-match the bootstrap fill so an unchanged save
     * does not spuriously bump revisions.
     *
     * @param array<int, array<string, mixed>> $rows
     */
    private function buildRegionTable(string $kind, string $key, array $rows): string
    {
        $relevant = $this->rowsFor($kind, $key, $rows);
        if (count($relevant) === 0) {
            return '<div class="table-card"><table class="table"><tbody><tr>'
                 . '<td>Không có hoạt động RACI gắn trực tiếp.</td></tr></tbody></table></div>';
        }
        $thead = '<thead><tr><th>Cổng</th><th>CDR</th><th>Hoạt động</th>';
        foreach (self::ROLES as $role) {
            $thead .= '<th>' . $role . '</th>';
        }
        $thead .= '</tr></thead>';

        $body = '';
        foreach ($relevant as $row) {
            $cells  = '<td>' . $this->plainText((string)$row['gate_html']) . '</td>';
            $cells .= '<td>' . $this->plainText((string)$row['cdr_html']) . '</td>';
            $cells .= '<td>' . $this->plainText((string)$row['activity_html']) . '</td>';
            foreach (self::ROLES as $role) {
                $cells .= $this->raciCell((string)($row['roles'][$role] ?? ''));
            }
            $body .= '<tr>' . $cells . "</tr>\n";
        }
        return '<div class="table-card"><table class="table">' . $thead
             . "\n<tbody>\n" . $body . '</tbody></table></div>';
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function rowsFor(string $kind, string $key, array $rows): array
    {
        $out = [];
        if ($kind === 'sop') {
            $k = strtoupper($key);
            foreach ($rows as $row) {
                if ($k !== '' && str_contains(strtoupper((string)$row['frm_html']), $k)) {
                    $out[] = $row;
                }
            }
        } elseif ($kind === 'jd') {
            $col = self::ALIAS[strtoupper($key)] ?? strtoupper($key);
            foreach ($rows as $row) {
                $v = (string)($row['roles'][$col] ?? '');
                if (in_array($v, self::LETTERS, true)) {
                    $out[] = $row;
                }
            }
        }
        return $out;
    }

    private function raciCell(string $value): string
    {
        $value = $this->cleanLetter($value);
        if ($value === '') {
            return '<td></td>';
        }
        return '<td class="raci-cell raci-' . $value . '">' . $value . '</td>';
    }

    private function plainText(string $html): string
    {
        $spaced = preg_replace('/<[^>]+>/u', ' ', $html);
        return trim((string)preg_replace('/\s+/u', ' ', (string)$spaced));
    }

    /* ── Region replacement ─────────────────────────────────────────────── */

    /** Replace a region, or return the HTML unchanged if its markers are absent. */
    private function replaceRegionIfPresent(string $html, string $key, string $block): string
    {
        if (!str_contains($html, '<!-- ' . $key . ':START -->')
            || !str_contains($html, '<!-- ' . $key . ':END -->')) {
            return $html;
        }
        return $this->replaceRegion($html, $key, $block);
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
        $next = preg_replace_callback($pattern, static fn(): string => $managed, $html, 1, $count);
        if ($count !== 1 || $next === null) {
            throw new RuntimeException('raci_matrix_region_replace_failed:' . $key);
        }
        return $next;
    }

    /** Replaces a RACI-MATRIX region while preserving the START marker params. */
    private function replaceManagedRegion(string $html, string $block): ?string
    {
        $pattern = '/(<!-- RACI-MATRIX:START\b[^>]*-->).*?(<!-- RACI-MATRIX:END -->)/s';
        $next = preg_replace_callback(
            $pattern,
            static fn(array $m): string => $m[1] . "\n" . $block . "\n" . $m[2],
            $html,
            1,
            $count
        );
        return ($count === 1 && $next !== null) ? $next : null;
    }

    /** Replaces a RACI-ROLES region while preserving the START marker params. */
    private function replaceRolesRegion(string $html, string $block): ?string
    {
        $pattern = '/(<!-- RACI-ROLES:START\b[^>]*-->).*?(<!-- RACI-ROLES:END -->)/s';
        $next = preg_replace_callback(
            $pattern,
            static fn(array $m): string => $m[1] . "\n" . $block . "\n" . $m[2],
            $html,
            1,
            $count
        );
        return ($count === 1 && $next !== null) ? $next : null;
    }

    /** Reads the sop=<slug> attribute from the first RACI-ROLES marker. */
    private function rolesMarkerSlug(string $html): string
    {
        if (preg_match('/<!-- RACI-ROLES:START\s+([^>]*?)-->/', $html, $m)
            && preg_match('/sop=(\S+)/', $m[1], $s)) {
            return $s[1];
        }
        return '';
    }

    /** @return array{kind: string, key: string, jd: string} */
    private function markerParams(string $html): array
    {
        $kind = ''; $key = ''; $jd = '';
        if (preg_match('/<!-- RACI-MATRIX:START\s+([^>]*?)-->/', $html, $m)) {
            if (preg_match('/kind=(\S+)/', $m[1], $k)) { $kind = $k[1]; }
            if (preg_match('/jd=(\S+)/', $m[1], $j)) { $jd = $j[1]; }
            if (preg_match('/code=(\S+)/', $m[1], $c)) { $key = $c[1]; }
            elseif (preg_match('/role=(\S+)/', $m[1], $r)) { $key = $r[1]; }
        }
        return ['kind' => $kind, 'key' => $key, 'jd' => $jd];
    }

    /* ── DCC minor revision bump ─────────────────────────────────────────── */

    /** @return array{html: string, previous_revision: string, new_revision: string} */
    private function bumpRevision(string $html): array
    {
        $pattern = '/data-dcc-bootstrap=(["\'])(.*?)\1/s';
        if (!preg_match($pattern, $html, $match, PREG_OFFSET_CAPTURE)) {
            return ['html' => $html, 'previous_revision' => '', 'new_revision' => ''];
        }
        $quote   = $match[1][0];
        $payload = html_entity_decode($match[2][0], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $data    = json_decode($payload, true);
        if (!is_array($data) || !is_array($data['header'] ?? null)) {
            return ['html' => $html, 'previous_revision' => '', 'new_revision' => ''];
        }
        $previous = (string)($data['header']['revision'] ?? 'V0');
        $next     = $this->nextRevision($previous);
        $data['header']['revision'] = $next;
        $data['header']['effective_date'] = gmdate('Y-m-d');

        $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            return ['html' => $html, 'previous_revision' => $previous, 'new_revision' => $previous];
        }
        $attr = $quote === '"'
            ? htmlspecialchars($encoded, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
            : str_replace("'", '&#039;', $encoded);
        $html = substr_replace(
            $html,
            'data-dcc-bootstrap=' . $quote . $attr . $quote,
            (int)$match[0][1],
            strlen($match[0][0])
        );
        return ['html' => $html, 'previous_revision' => $previous, 'new_revision' => $next];
    }

    private function nextRevision(string $revision): string
    {
        if (preg_match('/^V(\d+)(?:\.(\d+))?$/', trim($revision), $m)) {
            $minor = isset($m[2]) && $m[2] !== '' ? (int)$m[2] : 0;
            return 'V' . (int)$m[1] . '.' . ($minor + 1);
        }
        return 'V0.1';
    }

    /* ── Linked-document registry (admin hub) ───────────────────────────── */

    /**
     * @return array<int, array<string, string>>
     */
    private function linkedDocuments(): array
    {
        $ref = 'docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/';
        $hub = 'docs/system/organization/04-RACI-Authority/';
        return [
            ['code' => 'RACI-MASTER-MATRIX', 'title' => 'Ma trận RACI tổng thể (mục 5 G0→G7)',
             'url' => $hub . 'raci-master-matrix.html', 'relation' => 'auto'],
            ['code' => 'SOP §4', 'title' => '10 SOP — bảng RACI nhúng sinh tự động',
             'url' => '', 'relation' => 'auto'],
            ['code' => 'JD §6', 'title' => '24 JD — bảng RACI nhúng sinh tự động',
             'url' => '', 'relation' => 'auto'],
            ['code' => 'SIDEBAR', 'title' => 'Sidebar “Thẩm quyền & RACI” trên mọi SOP/JD',
             'url' => '', 'relation' => 'live'],
            ['code' => 'ANNEX-123', 'title' => 'Ma trận phó / dự phòng cho vai trò giữ chữ A',
             'url' => $ref . 'annex-123-deputy-backup-matrix.html', 'relation' => 'sibling'],
            ['code' => 'AUTHORITY-MATRIX', 'title' => 'Ma trận thẩm quyền — sổ đăng ký quyết định & ngưỡng L1/L2/L3',
             'url' => $hub . 'authority-matrix.html', 'relation' => 'sibling'],
            ['code' => 'ROLE-BUNDLES', 'title' => 'Từ điển mã vai trò & bản đồ gộp cột RACI',
             'url' => $hub . 'role-and-department-bundles.html', 'relation' => 'summary'],
            ['code' => 'CI GUARD', 'title' => 'check_raci_integrity.php — kiểm bất biến mỗi lần deploy',
             'url' => '', 'relation' => 'guard'],
        ];
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
