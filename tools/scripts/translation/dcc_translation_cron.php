<?php

declare(strict_types=1);

/**
 * dcc_translation_cron.php — user-mode translation worker.
 *
 * Why this exists:
 *   The portal's request handler (PHP-FPM as www-data) can spawn the local
 *   NLLB driver because that driver doesn't need OAuth credentials. But the
 *   subscription CLIs (`claude`, `codex`) read OAuth tokens from
 *   $HOME/.claude/.credentials.json, which lives under the operator's user
 *   account and is not readable by www-data.
 *
 *   This worker runs under the operator's user (via cron or systemd), polls
 *   the dcc_document_locale_variant table for variants whose source_hash
 *   has drifted from the published artifact, and re-runs translation using
 *   the registry-resolved provider chain. Every attempt is logged in
 *   translation_usage_log just like the inline path.
 *
 * Cron example (run every 5 min as the operator user):
 *   *\/5 * * * *  cd /var/www/mom-app && /usr/bin/php tools/scripts/translation/dcc_translation_cron.php >> /var/log/dcc-translation-cron.log 2>&1
 *
 * Env:
 *   DCC_CRON_BATCH_LIMIT     max docs per run (default 5; cron polls again in 5 min)
 *   DCC_CRON_ONLY_TIERS      comma list e.g. "tier_1,tier_2" — limit scope
 *   DCC_CRON_DRY_RUN         "1" → log what would happen, don't write
 *
 * Exit codes:
 *   0  success (including "no work to do")
 *   2  fatal config error (missing autoload, no DB)
 */

$root = realpath(__DIR__ . '/../../..');
if ($root === false) {
    fwrite(STDERR, "Cannot resolve project root from cron script.\n");
    exit(2);
}

$autoload = $root . '/mom/vendor/autoload.php';
if (!is_file($autoload)) {
    fwrite(STDERR, "Composer autoload not found at {$autoload}.\n");
    exit(2);
}
require_once $autoload;

// Load env from .env file AND from PHP-FPM pool config (env[FOO] = bar lines).
// Cron runs outside FPM so pool env isn't auto-injected; we mirror what
// mom/database/migrate.php does to make DB creds + provider config available.
$envSources = array_filter([
    $root . '/mom/.env',
    '/etc/php/8.5/fpm/pool.d/mom.conf',
], 'is_file');
foreach ($envSources as $src) {
    foreach (file($src, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, ';')) {
            continue;
        }
        // Match either `KEY=VALUE` (.env) or `env[KEY] = VALUE` (php-fpm pool)
        if (preg_match('/^env\[([^\]]+)\]\s*=\s*(.*)$/', $line, $m)
            || preg_match('/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i', $line, $m)) {
            $k = trim($m[1]);
            $v = trim($m[2], " \t\"'");
            if ($k !== '' && getenv($k) === false) {
                putenv("{$k}={$v}");
                $_ENV[$k] = $v;
            }
        }
    }
}

// We need the DataLayer + DocumentLocaleAutomationService. The application
// boot is in mom/api/index.php; we don't want to run the full HTTP boot.
// Reuse the bootstrap helpers via a minimal include.
$dataDir = $root . '/mom/data';

// Manual DataLayer init — signature is ($dataDir, $rootDir, ?$configOverride).
require_once $root . '/mom/database/Connection.php';
require_once $root . '/mom/database/DataLayer.php';
$dataLayer = new \MOM\Database\DataLayer($dataDir, $root);

$batchLimit = (int)(getenv('DCC_CRON_BATCH_LIMIT') ?: '5');
$onlyTiers = trim((string)(getenv('DCC_CRON_ONLY_TIERS') ?: ''));
$dryRun = (string)(getenv('DCC_CRON_DRY_RUN') ?: '') === '1';

$startTs = microtime(true);
log_line("dcc-translation-cron start: limit={$batchLimit} only_tiers={$onlyTiers} dry_run=" . ($dryRun ? 'yes' : 'no'));

// Find candidates: variants in machine_preview/blocked whose engine_version
// doesn't match the currently-routed provider. We re-translate when the
// engine has changed (e.g. switched from NLLB to Codex/Claude routing).
$candidatesSql = "
    SELECT v.locale_variant_id, v.doc_code, v.translation_state, v.translation_provider,
           v.engine_version, v.metadata, v.updated_at,
           h.doc_type, h.title, h.subtitle, h.revision, h.status, h.filesystem_path
      FROM dcc_document_locale_variant v
      JOIN dcc_document_header h ON h.doc_code = v.doc_code
     WHERE v.locale = :p1
       AND v.translation_state IN (:p2, :p3)
       AND COALESCE(v.translation_provider, '') NOT IN ('claude_cli:claude-opus-4-7', 'claude_cli:haiku', 'codex_cli:gpt-5')
     ORDER BY v.updated_at ASC
     LIMIT :p4
";

try {
    $rows = $dataLayer->query(
        $candidatesSql,
        [':p1' => 'en', ':p2' => 'machine_preview', ':p3' => 'blocked', ':p4' => $batchLimit]
    );
} catch (\Throwable $e) {
    log_line('Query failed: ' . $e->getMessage());
    exit(2);
}

if (!is_array($rows) || count($rows) === 0) {
    log_line('No candidates. Exiting cleanly.');
    exit(0);
}

log_line(sprintf('Found %d candidate(s).', count($rows)));

$registry = new \MOM\Services\Translation\ProviderRegistryService(
    $dataLayer,
    new \MOM\Services\Translation\SecretVaultService($dataLayer),
);
$tierFilter = $onlyTiers === '' ? [] : array_map('trim', explode(',', $onlyTiers));

$processed = 0;
$skipped = 0;
foreach ($rows as $row) {
    $docCode = (string)$row['doc_code'];
    $docType = (string)($row['doc_type'] ?? '');
    $tier = $registry->tierForDocType($docType);
    if (!empty($tierFilter) && !in_array($tier, $tierFilter, true)) {
        $skipped++;
        continue;
    }
    $resolution = $registry->describeResolution($docCode, $docType);
    $primary = $resolution['attempts'][0] ?? null;
    if ($primary === null) {
        log_line("[SKIP] {$docCode}: no provider attempt resolves.");
        $skipped++;
        continue;
    }
    log_line(sprintf(
        '[%s] %s tier=%s primary=%s/%s',
        $dryRun ? 'DRY' : 'RUN',
        $docCode,
        $tier,
        $primary['provider_key'],
        $primary['model_id'] ?? '-'
    ));
    if ($dryRun) {
        continue;
    }

    // Resolve the source HTML file from the header.filesystem_path column.
    $relPath = (string)($row['filesystem_path'] ?? '');
    if ($relPath === '') {
        log_line("   ERROR {$docCode}: header.path is empty.");
        continue;
    }
    $absPath = $root . '/' . ltrim($relPath, '/');
    if (!is_file($absPath)) {
        log_line("   ERROR {$docCode}: source file not found at {$absPath}");
        continue;
    }
    $sourceHtml = @file_get_contents($absPath);
    if ($sourceHtml === false || trim($sourceHtml) === '') {
        log_line("   ERROR {$docCode}: source HTML empty/unreadable");
        continue;
    }

    try {
        $automation = new \MOM\Services\DocumentControl\DocumentLocaleAutomationService(
            $dataLayer,
            $root
        );
        $result = $automation->syncEnglishMachinePreview([
            'doc_code' => $docCode,
            'base_rel_path' => $relPath,
            'source_html' => $sourceHtml,
            'source_status' => $row['status'] ?? 'released',
            'revision' => (string)($row['revision'] ?? '0.0'),
            'trigger' => 'cron_bulk',
            'actor' => 'cron_worker',
            'title' => (string)($row['title'] ?? ''),
            'subtitle' => (string)($row['subtitle'] ?? ''),
            'effective_date' => date('Y-m-d'),
        ]);
        log_line(sprintf(
            '   → state=%s provider=%s engine=%s',
            $result['translation_state'] ?? '?',
            $result['translation_provider'] ?? '?',
            $result['engine_version'] ?? '?'
        ));
        $processed++;
    } catch (\Throwable $e) {
        log_line("   ERROR {$docCode}: " . $e->getMessage());
    }
}

$elapsedMs = (int)((microtime(true) - $startTs) * 1000);
log_line(sprintf(
    'dcc-translation-cron done in %dms: processed=%d skipped=%d total=%d',
    $elapsedMs, $processed, $skipped, count($rows)
));
exit(0);

function log_line(string $msg): void
{
    fwrite(STDOUT, '[' . date('Y-m-d H:i:s') . '] ' . $msg . "\n");
}
