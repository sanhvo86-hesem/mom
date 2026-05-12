<?php

declare(strict_types=1);

/**
 * Backfill: mom/docs/**​/*.html  →  PostgreSQL dcc_document_body
 * (Phase 2 of ADR-0013).
 *
 * Walks the controlled-document filesystem and imports every .html
 * file as one row in dcc_document_body, with sha256 verification.
 *
 * Filename grammar:
 *
 *   pol-qms-002-quality-objectives.html
 *      → doc_code  = pol-qms-002
 *      → locale    = vi  (default)
 *
 *   _pol-qms-001-quality-policy.en.html
 *      → doc_code  = pol-qms-001
 *      → locale    = en  (locale = `_<base>.<locale>.html`)
 *
 *   _pol-qms-001-quality-policy.preview_r1_0.en.html
 *      → SKIPPED (preview snapshots)
 *
 * The doc_code → revision mapping comes from dcc_document_header. If a
 * header row does not exist for a discovered code, the file is logged
 * to the "no_header" bucket and skipped (operator must seed the header
 * first).
 *
 * Modes:
 *   --dry-run   Walk and report the would-be import counts.
 *   --apply     Execute the import.
 *   --advance=<mode>
 *               After successful --apply, set the dcc_documents
 *               collection to <mode>. Allowed: shadow_write,
 *               postgres_primary, postgres_only.
 *
 * Common flags:
 *   --actor=<name>      Audit actor (default: $USER@host).
 *   --change-ref=<ref>  Audit change-ref.
 *   --root=<path>       Override docs root (default: <repo>/mom/docs).
 *   --limit=<n>         Process only N files (debug aid).
 *   --verbose           One line per file.
 *
 * Exit codes:
 *   0 success
 *   1 usage error
 *   2 DB / filesystem unreachable
 *   3 some files could not be imported
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

require_once __DIR__ . '/../vendor/autoload.php';

use MOM\Api\Services\AuditChainService;
use MOM\Api\Services\DataCollectionModeResolver;
use MOM\Api\Services\DocumentBodyRepository;
use MOM\Database\Connection;

/** @var list<string> $argv */
$argv = $argv ?? [];
$opts = parseArgvDoc($argv);
if ($opts === null) {
    fwrite(STDERR, usageDoc());
    exit(1);
}

$portalRoot = realpath(__DIR__ . '/..') ?: __DIR__ . '/..';
$docsRoot   = $opts['root'] ?? ($portalRoot . '/docs');
if (!is_dir($docsRoot)) {
    fwrite(STDERR, "docs root not found: {$docsRoot}\n");
    exit(2);
}

// Connect ────────────────────────────────────────────────────────────────────
$configFile = $portalRoot . '/database/config.php';
if (!is_file($configFile)) {
    fwrite(STDERR, "database/config.php missing\n");
    exit(2);
}
try {
    $db = Connection::getInstance((array)(require $configFile));
    $db->queryOne('SELECT 1');
} catch (Throwable $e) {
    fwrite(STDERR, "PostgreSQL unreachable: " . $e->getMessage() . "\n");
    exit(2);
}

$resolver = new DataCollectionModeResolver($db);
$audit    = new AuditChainService($db);
$repo     = new DocumentBodyRepository($db, $resolver, $audit, $docsRoot);

// Walk filesystem ────────────────────────────────────────────────────────────
$candidates = scanDocs($docsRoot);
if ($opts['limit'] !== null) {
    $candidates = array_slice($candidates, 0, $opts['limit']);
}
$total = count($candidates);
printf("[backfill_document_bodies] mode=%s candidates=%d root=%s\n",
    $opts['mode'], $total, $docsRoot);

// Index dcc_document_header so we can map doc_code → revision quickly.
$headerByCode = loadHeaderIndex($db);

// Audit start ────────────────────────────────────────────────────────────────
if ($opts['mode'] === 'apply') {
    $audit->record(
        eventType:     'dcc_body_backfill_started',
        aggregateType: 'dcc.document_body',
        aggregateId:   'backfill',
        actorId:       null,
        actorName:     $opts['actor'],
        payload:       ['change_ref' => $opts['change_ref'], 'count' => $total],
    );
}

$tally = [
    'imported'     => 0,
    'skipped_existing'  => 0,
    'no_header'    => 0,
    'failed'       => 0,
    'preview'      => 0,
    'by_locale'    => [],
];
$failures = [];

foreach ($candidates as $i => $cand) {
    $abs    = $cand['path'];
    $code   = $cand['doc_code'];
    $locale = $cand['locale'];

    if ($cand['preview']) {
        $tally['preview']++;
        continue;
    }
    $header = $headerByCode[$code] ?? null;
    if ($header === null) {
        $tally['no_header']++;
        if ($opts['verbose']) {
            printf("  [%4d/%4d] no_header  %s (%s)\n", $i + 1, $total, $code, basename($abs));
        }
        continue;
    }
    $revision = (string)($header['revision'] ?? 'V0');
    $status   = strtolower((string)($header['status'] ?? 'released'));
    if (!in_array($status, ['draft','in_review','approved','released','superseded','obsolete'], true)) {
        $status = 'released';
    }

    if ($opts['mode'] === 'dry-run') {
        $tally['imported']++;
        $tally['by_locale'][$locale] = ($tally['by_locale'][$locale] ?? 0) + 1;
        if ($opts['verbose']) {
            printf("  [%4d/%4d] would_import %s rev=%s status=%s locale=%s\n",
                $i + 1, $total, $code, $revision, $status, $locale);
        }
        continue;
    }

    $html = @file_get_contents($abs);
    if ($html === false) {
        $tally['failed']++;
        $failures[] = ['path' => $abs, 'reason' => 'unreadable'];
        continue;
    }

    // Pre-check duplicate (avoid trigger noise on idempotent re-run).
    try {
        $exists = $db->queryOne(
            'SELECT 1
               FROM dcc_document_body
              WHERE doc_code = :c AND revision = :r AND status = :s AND locale = :l
                AND body_sha256 = :sha',
            [
                ':c'   => $code,
                ':r'   => $revision,
                ':s'   => $status,
                ':l'   => $locale,
                ':sha' => hash('sha256', $html),
            ],
        );
        if (is_array($exists)) {
            $tally['skipped_existing']++;
            if ($opts['verbose']) {
                printf("  [%4d/%4d] skip_dup    %s\n", $i + 1, $total, $code);
            }
            continue;
        }
    } catch (Throwable $e) {
        // Non-fatal — continue to the INSERT, ON CONFLICT will catch it.
    }

    try {
        $repo->saveVersion(
            payload: [
                'doc_code'    => $code,
                'revision'    => $revision,
                'status'      => $status,
                'locale'      => $locale,
                'body_html'   => $html,
                'source_path' => relPath($abs, $portalRoot),
                // Backfill: file already exists on disk; do NOT trigger
                // the FS mirror branch by leaving fs_relpath unset.
                'metadata'    => [
                    'imported_from'   => 'cli:backfill_document_bodies_to_postgres',
                    'imported_at'     => gmdate('c'),
                    'original_size'   => filesize($abs) ?: 0,
                ],
                'created_by'  => $opts['actor'],
                'change_ref'  => $opts['change_ref'],
            ],
            actor: $opts['actor'],
        );
        $tally['imported']++;
        $tally['by_locale'][$locale] = ($tally['by_locale'][$locale] ?? 0) + 1;
        if ($opts['verbose']) {
            printf("  [%4d/%4d] imported   %s rev=%s status=%s locale=%s\n",
                $i + 1, $total, $code, $revision, $status, $locale);
        }
    } catch (Throwable $e) {
        $tally['failed']++;
        $failures[] = ['path' => $abs, 'doc_code' => $code, 'reason' => $e->getMessage()];
        printf("  [%4d/%4d] FAIL       %s :: %s\n", $i + 1, $total, $code, $e->getMessage());
    }
}

// Audit finish ───────────────────────────────────────────────────────────────
if ($opts['mode'] === 'apply') {
    $audit->record(
        eventType:     'dcc_body_backfill_finished',
        aggregateType: 'dcc.document_body',
        aggregateId:   'backfill',
        actorId:       null,
        actorName:     $opts['actor'],
        payload:       [
            'change_ref' => $opts['change_ref'],
            'tally'      => $tally,
            'failures'   => $failures,
        ],
    );
}

printf(
    "[backfill_document_bodies] done: imported=%d skipped_dup=%d no_header=%d preview=%d failed=%d\n",
    $tally['imported'], $tally['skipped_existing'], $tally['no_header'], $tally['preview'], $tally['failed']
);
printf("[backfill_document_bodies] by_locale: %s\n",
    json_encode($tally['by_locale'], JSON_UNESCAPED_SLASHES));

if ($opts['advance'] !== null && $opts['mode'] === 'apply' && $tally['failed'] === 0) {
    $resolver->advance(
        DocumentBodyRepository::COLLECTION_KEY,
        $opts['advance'],
        $opts['actor'],
        $opts['change_ref'],
    );
    $audit->record(
        eventType:     'collection_mode_advanced',
        aggregateType: 'data_collection_state',
        aggregateId:   DocumentBodyRepository::COLLECTION_KEY,
        actorId:       null,
        actorName:     $opts['actor'],
        payload:       [
            'collection_key' => DocumentBodyRepository::COLLECTION_KEY,
            'new_mode'       => $opts['advance'],
            'change_ref'     => $opts['change_ref'],
        ],
    );
    printf("[backfill_document_bodies] advanced collection 'dcc_documents' to mode=%s\n",
        $opts['advance']);
}

exit($tally['failed'] === 0 ? 0 : 3);

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * @return list<array{path:string, doc_code:string, locale:string, preview:bool}>
 */
function scanDocs(string $root): array
{
    $bases = ['system','operations','forms','training','glossary'];
    $out = [];
    foreach ($bases as $b) {
        $abs = $root . '/' . $b;
        if (!is_dir($abs)) {
            continue;
        }
        $iter = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($abs, FilesystemIterator::SKIP_DOTS),
        );
        foreach ($iter as $f) {
            /** @var SplFileInfo $f */
            if (!$f->isFile() || strtolower($f->getExtension()) !== 'html') {
                continue;
            }
            $name = $f->getFilename();
            $parsed = parseDocFilename($name);
            if ($parsed === null) {
                continue;
            }
            $out[] = [
                'path'     => $f->getPathname(),
                'doc_code' => $parsed['doc_code'],
                'locale'   => $parsed['locale'],
                'preview'  => $parsed['preview'],
            ];
        }
    }
    sort($out);
    return $out;
}

/**
 * @return array{doc_code:string, locale:string, preview:bool}|null
 */
function parseDocFilename(string $name): ?array
{
    $base = preg_replace('/\.html$/i', '', $name) ?? $name;

    // Strip leading underscore (locale-tagged variant marker).
    $work = ltrim($base, '_');
    if ($work === '') {
        return null;
    }

    // Detect preview snapshot:  *.preview_rN_M.<locale>?
    $preview = (bool)preg_match('/\.preview_r\d+(?:_\d+)?(?:\.[a-z]{2,5})?$/i', $work);

    // Detect locale suffix:  <slug>.<locale>
    $locale = 'vi';
    if (preg_match('/^(.*)\.([a-z]{2,5})$/i', $work, $m)) {
        // Locale suffix like '.en' / '.fr-CA' / '.preview' (already caught above).
        $maybe = strtolower($m[2]);
        if (!str_starts_with($maybe, 'preview')) {
            $locale = $maybe;
            $work = $m[1];
        }
    }

    // Strip trailing preview tag if present.
    $work = preg_replace('/\.preview_r\d+(?:_\d+)?$/i', '', $work) ?? $work;

    // Doc code = the prefix up to the first 3-segment boundary, e.g.
    //   "pol-qms-001-quality-objectives" → "pol-qms-001"
    if (!preg_match('/^([a-z][a-z0-9]+-[a-z0-9]+-[0-9]+)/i', $work, $m)) {
        return null;
    }
    return [
        'doc_code' => strtolower($m[1]),
        'locale'   => $locale,
        'preview'  => $preview,
    ];
}

/**
 * @return array<string, array{revision:string, status:string}>
 */
function loadHeaderIndex(Connection $db): array
{
    try {
        $rows = $db->query(
            'SELECT doc_code, revision, status FROM dcc_document_header',
        );
    } catch (Throwable $e) {
        @error_log('[backfill_document_bodies] header lookup failed: ' . $e->getMessage());
        return [];
    }
    $out = [];
    foreach ($rows as $r) {
        $out[strtolower((string)($r['doc_code'] ?? ''))] = [
            'revision' => (string)($r['revision'] ?? 'V0'),
            'status'   => (string)($r['status'] ?? 'released'),
        ];
    }
    return $out;
}

function relPath(string $abs, string $root): string
{
    $abs  = str_replace('\\', '/', $abs);
    $root = rtrim(str_replace('\\', '/', $root), '/');
    if (str_starts_with($abs, $root . '/')) {
        return substr($abs, strlen($root) + 1);
    }
    return $abs;
}

/**
 * @return array{mode:string, actor:string, change_ref:string, root:?string, limit:?int, verbose:bool, advance:?string}|null
 */
function parseArgvDoc(array $argv): ?array
{
    $modes = ['dry-run' => false, 'apply' => false];
    $opts  = [
        'mode'       => 'dry-run',
        'actor'      => sprintf('%s@%s', getenv('USER') ?: 'cli', gethostname() ?: 'host'),
        'change_ref' => 'cli:backfill_document_bodies',
        'root'       => null,
        'limit'      => null,
        'verbose'    => false,
        'advance'    => null,
    ];
    $allowedAdvance = [
        DataCollectionModeResolver::MODE_SHADOW_WRITE,
        DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
        DataCollectionModeResolver::MODE_POSTGRES_ONLY,
    ];
    array_shift($argv);
    foreach ($argv as $a) {
        if ($a === '--dry-run')   { $modes['dry-run'] = true; continue; }
        if ($a === '--apply')     { $modes['apply']   = true; continue; }
        if ($a === '--verbose')   { $opts['verbose']  = true; continue; }
        if ($a === '-h' || $a === '--help') { return null; }
        if (str_starts_with($a, '--actor='))      { $opts['actor']      = substr($a, 8);  continue; }
        if (str_starts_with($a, '--change-ref=')) { $opts['change_ref'] = substr($a, 13); continue; }
        if (str_starts_with($a, '--root='))       { $opts['root']       = substr($a, 7);  continue; }
        if (str_starts_with($a, '--limit='))      { $opts['limit']      = (int)substr($a, 8); continue; }
        if (str_starts_with($a, '--advance=')) {
            $val = substr($a, 10);
            if (!in_array($val, $allowedAdvance, true)) {
                fwrite(STDERR, "Invalid --advance value: {$val}\n");
                return null;
            }
            $opts['advance'] = $val;
            continue;
        }
        fwrite(STDERR, "Unknown argument: {$a}\n");
        return null;
    }
    if ($modes['dry-run'] === $modes['apply']) {
        fwrite(STDERR, "Specify exactly one of --dry-run / --apply.\n");
        return null;
    }
    $opts['mode'] = $modes['apply'] ? 'apply' : 'dry-run';
    return $opts;
}

function usageDoc(): string
{
    return <<<USAGE
Usage:
  php mom/tools/backfill_document_bodies_to_postgres.php (--dry-run|--apply)
       [--actor=NAME] [--change-ref=REF] [--root=PATH] [--limit=N] [--verbose]
       [--advance=shadow_write|postgres_primary|postgres_only]

Examples:
  # Inventory pass — what will be imported, no writes.
  php mom/tools/backfill_document_bodies_to_postgres.php --dry-run --verbose

  # Import everything, then advance collection to shadow_write.
  php mom/tools/backfill_document_bodies_to_postgres.php --apply \\
      --actor=ops@hesem --change-ref=ADR-0013-phase2-import \\
      --advance=shadow_write

USAGE;
}
