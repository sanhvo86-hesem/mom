<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;
use Throwable;

/**
 * Post-translation reviewer.
 *
 * After the machine translator writes the English locale artifact, this
 * service spawns `tools/scripts/translation/dcc_locale_reviewer_haiku.py`
 * with the Vietnamese source + the rendered English content. The python
 * script calls Claude Haiku 4.5 (via the `claude` CLI subscription) with
 * `mom/data/config/translation-reviewer-system-prompt.md` as the system
 * prompt; the model returns a JSON report of defects.
 *
 * The JSON report is stored verbatim in `translation_review_run.issues_jsonb`
 * plus a tiny denormalized roll-up on `dcc_document_locale_variant.last_review_*`
 * so the admin "Translated Docs" tab can render a badge without joining.
 *
 * Outcomes:
 *   - pass     → no issues. Variant state unchanged.
 *   - advisory → only advisory issues. Variant state unchanged; admin sees yellow.
 *   - fail     → at least one critical issue. Caller should flip variant to blocked.
 *   - error    → reviewer failed to run (CLI missing, timeout, JSON parse). Variant unchanged
 *                so we don't block on a tooling failure — admin sees grey badge.
 *   - skipped  → reviewer disabled by routing rule.
 */
final class TranslationReviewer
{
    private const DEFAULT_PROVIDER = 'claude_cli';
    private const DEFAULT_MODEL = 'haiku-4-5';
    private const DEFAULT_TIMEOUT_SECONDS = 150;

    public function __construct(
        private readonly DataLayer $data,
        private readonly string $rootDir,
    ) {}

    /**
     * Run the reviewer and persist a row. Returns the normalized review result.
     *
     * @param array<string,mixed> $opts
     *   - doc_code           string  (required)
     *   - vi_html            string  (required) source VN HTML in memory
     *   - en_html            string  (required) rendered EN HTML in memory
     *   - variant_id         ?int    locale variant id for cross-reference
     *   - source_revision    ?string
     *   - source_hash        ?string sha256 of normalized source
     *   - triggered_by       ?string actor
     *   - reviewer_provider  ?string default 'claude_cli'
     *   - reviewer_model     ?string default 'haiku-4-5'
     *   - max_paragraphs     ?int    default 80
     *   - enabled            ?bool   default true
     *
     * @return array{outcome:string, review:array<string,mixed>, review_id:?int, summary:string, issues_critical:int, issues_advisory:int, error?:string}
     */
    public function run(array $opts): array
    {
        $docCode = trim((string)($opts['doc_code'] ?? ''));
        $viHtml = (string)($opts['vi_html'] ?? '');
        $enHtml = (string)($opts['en_html'] ?? '');
        $enabled = !array_key_exists('enabled', $opts) || (bool)$opts['enabled'];

        if (!$enabled) {
            return [
                'outcome' => 'skipped',
                'review' => [],
                'review_id' => null,
                'summary' => 'reviewer disabled for this routing rule',
                'issues_critical' => 0,
                'issues_advisory' => 0,
            ];
        }
        if ($docCode === '' || $viHtml === '' || $enHtml === '') {
            return [
                'outcome' => 'error',
                'review' => [],
                'review_id' => null,
                'summary' => 'reviewer skipped: missing doc_code / vi_html / en_html',
                'issues_critical' => 0,
                'issues_advisory' => 0,
                'error' => 'missing_inputs',
            ];
        }

        $provider = trim((string)($opts['reviewer_provider'] ?? self::DEFAULT_PROVIDER)) ?: self::DEFAULT_PROVIDER;
        $model = trim((string)($opts['reviewer_model'] ?? self::DEFAULT_MODEL)) ?: self::DEFAULT_MODEL;
        $maxParagraphs = (int)($opts['max_paragraphs'] ?? 80);
        $variantId = isset($opts['variant_id']) ? (int)$opts['variant_id'] : null;
        $sourceRevision = $opts['source_revision'] ?? null;
        $sourceHash = $opts['source_hash'] ?? null;
        $triggeredBy = $opts['triggered_by'] ?? null;

        $payload = [
            'doc_code' => $docCode,
            'vi_html' => $viHtml,
            'en_html' => $enHtml,
            'max_paragraphs' => $maxParagraphs,
        ];

        $startedAt = microtime(true);
        $spawned = $this->spawnReviewer($payload, $provider, $model);
        $durationMs = (int)round((microtime(true) - $startedAt) * 1000);

        if (!$spawned['ok']) {
            $row = $this->persistRow([
                'doc_code' => $docCode,
                'variant_id' => $variantId,
                'source_revision' => $sourceRevision,
                'source_hash_sha256' => $sourceHash,
                'reviewer_provider' => $provider,
                'reviewer_model' => $model,
                'outcome' => 'error',
                'paragraphs_reviewed' => 0,
                'issues_critical' => 0,
                'issues_advisory' => 0,
                'summary' => substr((string)($spawned['error'] ?? 'reviewer failed'), 0, 600),
                'issues_jsonb' => '[]',
                'usage_input_tokens' => null,
                'usage_output_tokens' => null,
                'usage_cached_tokens' => null,
                'duration_ms' => $durationMs,
                'error_message' => (string)($spawned['error'] ?? 'unknown'),
                'iteration_num' => 1,
                'triggered_by' => $triggeredBy,
            ]);
            return [
                'outcome' => 'error',
                'review' => [],
                'review_id' => $row,
                'summary' => (string)($spawned['error'] ?? 'reviewer failed'),
                'issues_critical' => 0,
                'issues_advisory' => 0,
                'error' => (string)($spawned['error'] ?? 'reviewer_failed'),
            ];
        }

        $review = $spawned['review'];
        $outcome = (string)($review['outcome'] ?? 'error');
        $summary = (string)($review['summary'] ?? '');
        $stats = is_array($review['stats'] ?? null) ? $review['stats'] : [];
        $crit = (int)($stats['issues_critical'] ?? 0);
        $adv = (int)($stats['issues_advisory'] ?? 0);
        $paragraphsReviewed = (int)($stats['paragraphs_reviewed'] ?? 0);
        $issues = is_array($review['issues'] ?? null) ? $review['issues'] : [];
        $usage = is_array($spawned['usage'] ?? null) ? $spawned['usage'] : [];

        $reviewId = $this->persistRow([
            'doc_code' => $docCode,
            'variant_id' => $variantId,
            'source_revision' => $sourceRevision,
            'source_hash_sha256' => $sourceHash,
            'reviewer_provider' => $provider,
            'reviewer_model' => $model,
            'outcome' => $outcome,
            'paragraphs_reviewed' => $paragraphsReviewed,
            'issues_critical' => $crit,
            'issues_advisory' => $adv,
            'summary' => $summary,
            'issues_jsonb' => json_encode($issues, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '[]',
            'usage_input_tokens' => isset($usage['input_tokens']) ? (int)$usage['input_tokens'] : null,
            'usage_output_tokens' => isset($usage['output_tokens']) ? (int)$usage['output_tokens'] : null,
            'usage_cached_tokens' => isset($usage['cached_input_tokens']) ? (int)$usage['cached_input_tokens'] : null,
            'duration_ms' => $durationMs,
            'error_message' => null,
            'iteration_num' => 1,
            'triggered_by' => $triggeredBy,
        ]);

        if ($variantId !== null && $reviewId !== null) {
            $this->updateVariantCachedReview($variantId, $outcome, $crit, $adv, $reviewId);
        }

        // ── Auto-capture issues as learning-loop candidates (status='auto') ──
        // Admin still needs to click Approve before they influence prompts;
        // this just shovels them into the curation queue.
        if ($reviewId !== null && $issues !== []) {
            try {
                $learning = new TranslationLearningService($this->data, $this->rootDir);
                $learning->recordIssuesFromReview($reviewId, $docCode, $issues);
            } catch (Throwable $e) {
                error_log('TranslationReviewer: learning capture failed: ' . $e->getMessage());
            }
        }

        return [
            'outcome' => $outcome,
            'review' => $review,
            'review_id' => $reviewId,
            'summary' => $summary,
            'issues_critical' => $crit,
            'issues_advisory' => $adv,
        ];
    }

    /**
     * Spawn the python reviewer via proc_open. Pipes JSON in/out.
     *
     * @return array{ok:bool, review?:array<string,mixed>, usage?:array<string,int>, error?:string}
     */
    private function spawnReviewer(array $payload, string $provider, string $model): array
    {
        $script = $this->rootDir . '/tools/scripts/translation/dcc_locale_reviewer_haiku.py';
        if (!is_file($script)) {
            return ['ok' => false, 'error' => 'reviewer_script_missing'];
        }
        $python = getenv('DCC_TRANSLATION_PYTHON');
        if (!is_string($python) || $python === '') {
            // Fall back to the virtualenv shipped with the dcc-translation
            // provider on VPS; otherwise use system python3.
            $vpsVenv = '/var/www/data-private/venvs/dcc-translation/bin/python';
            $python = is_file($vpsVenv) ? $vpsVenv : 'python3';
        }

        $cmd = escapeshellcmd($python) . ' ' . escapeshellarg($script);
        $envOverlay = [
            'DCC_REVIEWER_MODEL' => $model,
            'DCC_REVIEWER_TIMEOUT' => (string)self::DEFAULT_TIMEOUT_SECONDS,
        ];
        // The claude CLI lives under the operator's home (not www-data's),
        // and the binary path is operator-specific (/usr/local/bin/claude on
        // VPS, /opt/homebrew/bin/claude on dev Macs). PHP-FPM env doesn't
        // carry these — they live in translation_credentials. Mirror the
        // resolution that TranslationAdminController::runSingleTest does for
        // the translator side so the reviewer can find its CLI.
        try {
            $credRows = $this->data->query(
                "SELECT cli_binary_path, cli_auth_home_path
                   FROM translation_credentials
                  WHERE provider_key = :p1 LIMIT 1",
                [':p1' => $provider]
            );
            if (is_array($credRows) && isset($credRows[0])) {
                $bin = trim((string)($credRows[0]['cli_binary_path'] ?? ''));
                $home = trim((string)($credRows[0]['cli_auth_home_path'] ?? ''));
                if ($bin !== '') {
                    $envOverlay['DCC_CLI_BINARY'] = $bin;
                }
                if ($home !== '') {
                    $envOverlay['DCC_CLI_AUTH_HOME'] = $home;
                    $envOverlay['HOME'] = $home;
                }
            }
        } catch (Throwable $e) {
            error_log('TranslationReviewer: credential lookup failed: ' . $e->getMessage());
        }
        // Fallback to env (dev workstation) if DB row is empty.
        $envCliBinary = getenv('DCC_CLI_BINARY');
        if (empty($envOverlay['DCC_CLI_BINARY']) && is_string($envCliBinary) && $envCliBinary !== '') {
            $envOverlay['DCC_CLI_BINARY'] = $envCliBinary;
        }
        $envAuthHome = getenv('DCC_CLI_AUTH_HOME');
        if (empty($envOverlay['DCC_CLI_AUTH_HOME']) && is_string($envAuthHome) && $envAuthHome !== '') {
            $envOverlay['DCC_CLI_AUTH_HOME'] = $envAuthHome;
        }

        $env = $_ENV !== [] ? $_ENV : (getenv() ?: []);
        $envForProc = array_merge(is_array($env) ? $env : [], $envOverlay);

        $spec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proc = @proc_open(['/bin/sh', '-lc', 'exec ' . $cmd], $spec, $pipes, $this->rootDir, $envForProc);
        if (!is_resource($proc)) {
            return ['ok' => false, 'error' => 'reviewer_spawn_failed'];
        }

        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($encoded)) {
            if (is_resource($pipes[0])) { fclose($pipes[0]); }
            if (is_resource($pipes[1])) { fclose($pipes[1]); }
            if (is_resource($pipes[2])) { fclose($pipes[2]); }
            proc_close($proc);
            return ['ok' => false, 'error' => 'reviewer_payload_encode_failed'];
        }

        if (is_resource($pipes[0])) {
            fwrite($pipes[0], $encoded);
            fclose($pipes[0]);
        }
        $stdout = is_resource($pipes[1]) ? stream_get_contents($pipes[1]) : '';
        $stderr = is_resource($pipes[2]) ? stream_get_contents($pipes[2]) : '';
        if (is_resource($pipes[1])) { fclose($pipes[1]); }
        if (is_resource($pipes[2])) { fclose($pipes[2]); }
        $exit = proc_close($proc);

        if ($exit !== 0) {
            // Reviewer writes its JSON {ok:false, error:...} to stdout (per
            // the bash exit code convention in dcc_locale_reviewer_haiku.py).
            // Capture both streams so the admin can see what actually broke.
            $errDetail = trim((string)$stderr);
            if ($errDetail === '') {
                $errDetail = trim((string)$stdout);
            }
            return ['ok' => false, 'error' => 'reviewer_exit_' . $exit . ': ' . substr($errDetail, 0, 400)];
        }
        $decoded = json_decode((string)$stdout, true);
        if (!is_array($decoded) || empty($decoded['ok'])) {
            return ['ok' => false, 'error' => 'reviewer_bad_json:' . substr((string)$stdout, 0, 400)];
        }
        return [
            'ok' => true,
            'review' => is_array($decoded['review'] ?? null) ? $decoded['review'] : [],
            'usage' => is_array($decoded['usage'] ?? null) ? $decoded['usage'] : [],
        ];
    }

    private function persistRow(array $row): ?int
    {
        try {
            $this->data->execute(
                'INSERT INTO translation_review_run
                    (doc_code, locale_code, variant_id, source_revision, source_hash_sha256,
                     reviewer_provider, reviewer_model, outcome, paragraphs_reviewed,
                     issues_critical, issues_advisory, summary, issues_jsonb,
                     usage_input_tokens, usage_output_tokens, usage_cached_tokens,
                     duration_ms, error_message, iteration_num, triggered_by)
                 VALUES (:p1, :p2, :p3, :p4, :p5, :p6, :p7, :p8, :p9, :p10, :p11, :p12, :p13::jsonb,
                         :p14, :p15, :p16, :p17, :p18, :p19, :p20)',
                [
                    ':p1' => $row['doc_code'],
                    ':p2' => 'en',
                    ':p3' => $row['variant_id'],
                    ':p4' => $row['source_revision'],
                    ':p5' => $row['source_hash_sha256'],
                    ':p6' => $row['reviewer_provider'],
                    ':p7' => $row['reviewer_model'],
                    ':p8' => $row['outcome'],
                    ':p9' => $row['paragraphs_reviewed'],
                    ':p10' => $row['issues_critical'],
                    ':p11' => $row['issues_advisory'],
                    ':p12' => $row['summary'],
                    ':p13' => $row['issues_jsonb'],
                    ':p14' => $row['usage_input_tokens'],
                    ':p15' => $row['usage_output_tokens'],
                    ':p16' => $row['usage_cached_tokens'],
                    ':p17' => $row['duration_ms'],
                    ':p18' => $row['error_message'],
                    ':p19' => $row['iteration_num'],
                    ':p20' => $row['triggered_by'],
                ]
            );
            $idRows = $this->data->query("SELECT currval(pg_get_serial_sequence('translation_review_run','review_id')) AS id");
            if (is_array($idRows) && isset($idRows[0]['id'])) {
                return (int)$idRows[0]['id'];
            }
        } catch (Throwable $e) {
            error_log('TranslationReviewer.persistRow failed: ' . $e->getMessage());
        }
        return null;
    }

    private function updateVariantCachedReview(int $variantId, string $outcome, int $crit, int $adv, int $reviewId): void
    {
        try {
            $this->data->execute(
                'UPDATE dcc_document_locale_variant
                    SET last_review_outcome = :p1,
                        last_review_at = now(),
                        last_review_issues_critical = :p2,
                        last_review_issues_advisory = :p3,
                        last_review_id = :p4
                  WHERE id = :p5',
                [
                    ':p1' => $outcome,
                    ':p2' => $crit,
                    ':p3' => $adv,
                    ':p4' => $reviewId,
                    ':p5' => $variantId,
                ]
            );
        } catch (Throwable $e) {
            error_log('TranslationReviewer.updateVariantCachedReview failed: ' . $e->getMessage());
        }
    }

    /**
     * Read the most-recent reviewer record per variant for admin UI.
     *
     * @return list<array<string,mixed>>
     */
    public function recentRuns(int $limit = 50): array
    {
        $limit = max(1, min(500, $limit));
        $rows = $this->data->query(
            'SELECT review_id, doc_code, locale_code, variant_id, outcome,
                    paragraphs_reviewed, issues_critical, issues_advisory,
                    summary, reviewer_provider, reviewer_model, duration_ms,
                    created_at
               FROM translation_review_run
              ORDER BY created_at DESC
              LIMIT :p1',
            [':p1' => $limit]
        );
        return is_array($rows) ? $rows : [];
    }

    /**
     * @return ?array<string,mixed>
     */
    public function findRun(int $reviewId): ?array
    {
        $rows = $this->data->query(
            'SELECT * FROM translation_review_run WHERE review_id = :p1 LIMIT 1',
            [':p1' => $reviewId]
        );
        if (!is_array($rows) || $rows === []) {
            return null;
        }
        return $rows[0];
    }
}
