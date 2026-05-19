<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;
use Throwable;

/**
 * Translation Learning — recurring-error memory injected back into prompts.
 *
 * Flow:
 *   reviewer emits issues  →  recordIssuesFromReview()  →  rows with status='auto'
 *   admin clicks Approve   →  approve()                 →  status='approved'
 *   translator / reviewer  ←  loadActivePromptBlock()   ←  rows with status='approved'
 *
 * The active prompt block is cached on disk at
 * `mom/data/cache/translation-learning-block.md`. Every approve/disable
 * mutation triggers a regen of that file so python adapters can read it
 * without DB access (they run as background workers).
 *
 * Backed by migration 190_translation_learning.sql.
 *
 * @since 4.3.0
 */
final class TranslationLearningService
{
    private const CACHE_REL = 'mom/data/cache/translation-learning-block.md';
    private const MAX_ACTIVE_ROWS = 60;
    private const MAX_DOC_CODES_PER_ROW = 25;

    public function __construct(
        private readonly DataLayer $data,
        private readonly string $rootDir,
    ) {}

    // ── 1. Auto-capture from a reviewer run ────────────────────────────────

    /**
     * Walk the issues from a translation_review_run row and upsert one
     * learning row per unique (vi_pattern, category) pair. status='auto'
     * unless an existing row is already approved (then just bump hits).
     *
     * @param int $reviewId
     * @param string $docCode
     * @param list<array<string,mixed>> $issues
     * @return array{captured:int, updated:int}
     */
    public function recordIssuesFromReview(int $reviewId, string $docCode, array $issues): array
    {
        $captured = 0;
        $updated = 0;
        foreach ($issues as $issue) {
            if (!is_array($issue)) continue;
            $vi = trim((string)($issue['vi_excerpt'] ?? ''));
            $enWrong = trim((string)($issue['en_excerpt'] ?? ''));
            $category = trim((string)($issue['category'] ?? 'other'));
            $severity = strtolower(trim((string)($issue['severity'] ?? 'advisory')));
            $suggestion = trim((string)($issue['suggestion'] ?? ''));
            $explanation = trim((string)($issue['explanation'] ?? ''));
            if ($vi === '' || $category === '') {
                continue;
            }
            if ($severity !== 'critical') { $severity = 'advisory'; }
            $vi = mb_substr($vi, 0, 200);
            $enWrong = mb_substr($enWrong, 0, 300);
            $suggestion = mb_substr($suggestion, 0, 300);
            $explanation = mb_substr($explanation, 0, 300);
            $hash = hash('sha256', mb_strtolower($vi) . '|' . mb_strtolower($category));

            try {
                $existing = $this->data->query(
                    'SELECT learning_id, status, hit_count, doc_codes
                       FROM translation_learning
                      WHERE dedupe_hash = :p1 LIMIT 1',
                    [':p1' => $hash]
                );
                if (is_array($existing) && isset($existing[0])) {
                    $row = $existing[0];
                    $codes = $this->decodeDocCodes($row['doc_codes'] ?? '[]');
                    if (!in_array($docCode, $codes, true) && $docCode !== '') {
                        $codes[] = $docCode;
                        $codes = array_slice($codes, -self::MAX_DOC_CODES_PER_ROW);
                    }
                    $this->data->execute(
                        "UPDATE translation_learning
                            SET hit_count = hit_count + 1,
                                last_seen_at = now(),
                                doc_codes = :p1::jsonb,
                                last_review_id = :p2,
                                en_wrong_pattern = COALESCE(:p3, en_wrong_pattern),
                                en_correct = COALESCE(:p4, en_correct),
                                explanation = COALESCE(:p5, explanation),
                                severity = CASE WHEN :p6 = 'critical' THEN 'critical' ELSE severity END
                          WHERE learning_id = :p7",
                        [
                            ':p1' => json_encode(array_values($codes), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '[]',
                            ':p2' => $reviewId,
                            ':p3' => $enWrong !== '' ? $enWrong : null,
                            ':p4' => $suggestion !== '' ? $suggestion : null,
                            ':p5' => $explanation !== '' ? $explanation : null,
                            ':p6' => $severity,
                            ':p7' => (int)$row['learning_id'],
                        ]
                    );
                    $updated++;
                } else {
                    $this->data->execute(
                        "INSERT INTO translation_learning
                            (dedupe_hash, vi_pattern, en_wrong_pattern, en_correct,
                             category, severity, explanation, status, hit_count,
                             doc_codes, last_review_id, created_by)
                         VALUES (:p1, :p2, :p3, :p4, :p5, :p6, :p7, 'auto', 1, :p8::jsonb, :p9, :p10)",
                        [
                            ':p1' => $hash,
                            ':p2' => $vi,
                            ':p3' => $enWrong !== '' ? $enWrong : null,
                            ':p4' => $suggestion !== '' ? $suggestion : null,
                            ':p5' => $category,
                            ':p6' => $severity,
                            ':p7' => $explanation !== '' ? $explanation : null,
                            ':p8' => json_encode($docCode !== '' ? [$docCode] : [], JSON_UNESCAPED_UNICODE) ?: '[]',
                            ':p9' => $reviewId,
                            ':p10' => 'reviewer.auto',
                        ]
                    );
                    $captured++;
                }
            } catch (Throwable $e) {
                error_log('TranslationLearningService.recordIssuesFromReview row failed: ' . $e->getMessage());
            }
        }
        return ['captured' => $captured, 'updated' => $updated];
    }

    // ── 2. Active prompt block (approved rows) ─────────────────────────────

    /**
     * Render the markdown block injected into the translator + reviewer
     * user prompts. Caps at MAX_ACTIVE_ROWS rows, sorted by hit_count then
     * last_seen_at desc.
     *
     * Returns "" when there are no approved rows.
     */
    public function loadActivePromptBlock(): string
    {
        $rows = $this->data->query(
            "SELECT vi_pattern, en_wrong_pattern, en_correct, category, severity, explanation
               FROM translation_learning
              WHERE status = 'approved'
              ORDER BY hit_count DESC, last_seen_at DESC
              LIMIT :p1",
            [':p1' => self::MAX_ACTIVE_ROWS]
        );
        if (!is_array($rows) || $rows === []) {
            return '';
        }

        $lines = [];
        $lines[] = '## LEARNED ANTI-PATTERNS — recurring errors from past reviews';
        $lines[] = '';
        $lines[] = 'The post-translation reviewer has previously caught the following recurring errors. **NEVER produce the wrong English again.** Apply the corrections below before emitting any translated segment.';
        $lines[] = '';
        $i = 1;
        foreach ($rows as $row) {
            $vi = trim((string)$row['vi_pattern']);
            $wrong = trim((string)($row['en_wrong_pattern'] ?? ''));
            $correct = trim((string)($row['en_correct'] ?? ''));
            $cat = trim((string)$row['category']);
            $sev = trim((string)$row['severity']);
            $why = trim((string)($row['explanation'] ?? ''));
            if ($vi === '') continue;
            $lines[] = sprintf('%d. [%s · %s]', $i++, $cat, $sev);
            $lines[] = '   VI source : ' . $vi;
            if ($wrong !== '') {
                $lines[] = '   NEVER emit: ' . $wrong;
            }
            if ($correct !== '') {
                $lines[] = '   CORRECT   : ' . $correct;
            }
            if ($why !== '') {
                $lines[] = '   Why       : ' . $why;
            }
            $lines[] = '';
        }
        $lines[] = '---';
        $lines[] = '';
        return implode("\n", $lines);
    }

    /**
     * Regenerate the on-disk cache file so python adapters can read the
     * block without hitting the DB. Called on every mutation.
     */
    public function regenerateCacheFile(): bool
    {
        $block = $this->loadActivePromptBlock();
        $path = rtrim($this->rootDir, '/') . '/' . self::CACHE_REL;
        $dir = dirname($path);
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0775, true) && !is_dir($dir)) {
                return false;
            }
        }
        return (bool)@file_put_contents($path, $block, LOCK_EX);
    }

    public function cacheFilePath(): string
    {
        return rtrim($this->rootDir, '/') . '/' . self::CACHE_REL;
    }

    // ── 3. Admin CRUD ───────────────────────────────────────────────────────

    /**
     * @param array{status?:string, category?:string, search?:string, limit?:int, offset?:int} $filters
     * @return array{rows:list<array<string,mixed>>, total:int}
     */
    public function listLearnings(array $filters = []): array
    {
        $where = [];
        $params = [];
        $status = trim((string)($filters['status'] ?? ''));
        if ($status !== '' && in_array($status, ['auto', 'approved', 'disabled'], true)) {
            $where[] = 'status = :p_status';
            $params[':p_status'] = $status;
        }
        $category = trim((string)($filters['category'] ?? ''));
        if ($category !== '') {
            $where[] = 'category = :p_cat';
            $params[':p_cat'] = $category;
        }
        $search = trim((string)($filters['search'] ?? ''));
        if ($search !== '') {
            $where[] = '(vi_pattern ILIKE :p_srch OR en_wrong_pattern ILIKE :p_srch OR en_correct ILIKE :p_srch)';
            $params[':p_srch'] = '%' . $search . '%';
        }
        $whereClause = $where === [] ? '' : (' WHERE ' . implode(' AND ', $where));
        $limit = max(1, min(200, (int)($filters['limit'] ?? 50)));
        $offset = max(0, (int)($filters['offset'] ?? 0));

        $rows = $this->data->query(
            "SELECT learning_id, vi_pattern, en_wrong_pattern, en_correct,
                    category, severity, status, hit_count, doc_codes,
                    explanation, notes, first_seen_at, last_seen_at,
                    created_at, updated_at, created_by, updated_by
               FROM translation_learning
              $whereClause
              ORDER BY (status = 'approved') DESC,
                       hit_count DESC,
                       last_seen_at DESC
              LIMIT $limit OFFSET $offset",
            $params
        );
        $countRow = $this->data->query(
            "SELECT COUNT(*) AS total FROM translation_learning $whereClause",
            $params
        );
        $total = is_array($countRow) && isset($countRow[0]['total']) ? (int)$countRow[0]['total'] : 0;
        return ['rows' => is_array($rows) ? $rows : [], 'total' => $total];
    }

    public function findById(int $id): ?array
    {
        $rows = $this->data->query(
            'SELECT * FROM translation_learning WHERE learning_id = :p1 LIMIT 1',
            [':p1' => $id]
        );
        if (!is_array($rows) || $rows === []) {
            return null;
        }
        return $rows[0];
    }

    public function approve(int $id, string $actor): bool
    {
        return $this->setStatus($id, 'approved', $actor);
    }

    public function disable(int $id, string $actor): bool
    {
        return $this->setStatus($id, 'disabled', $actor);
    }

    private function setStatus(int $id, string $status, string $actor): bool
    {
        try {
            $this->data->execute(
                'UPDATE translation_learning
                    SET status = :p1, updated_by = :p2, updated_at = now()
                  WHERE learning_id = :p3',
                [':p1' => $status, ':p2' => $actor, ':p3' => $id]
            );
            $this->regenerateCacheFile();
            return true;
        } catch (Throwable $e) {
            error_log('TranslationLearningService.setStatus failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Update editable fields. Status changes go through approve/disable.
     *
     * @param array<string,mixed> $fields
     */
    public function updateFields(int $id, array $fields, string $actor): bool
    {
        $allowed = ['vi_pattern', 'en_wrong_pattern', 'en_correct', 'category', 'severity', 'explanation', 'notes'];
        $sets = [];
        $params = [':p_id' => $id, ':p_actor' => $actor];
        $i = 1;
        foreach ($fields as $k => $v) {
            if (!in_array($k, $allowed, true)) continue;
            if ($k === 'severity') {
                $sev = strtolower(trim((string)$v));
                if (!in_array($sev, ['critical', 'advisory'], true)) continue;
                $v = $sev;
            }
            $key = ':p' . $i++;
            $sets[] = $k . ' = ' . $key;
            $params[$key] = $v === null ? null : (is_string($v) ? mb_substr($v, 0, 400) : $v);
        }
        if ($sets === []) return false;
        $sets[] = 'updated_by = :p_actor';
        $sets[] = 'updated_at = now()';
        try {
            $this->data->execute(
                'UPDATE translation_learning SET ' . implode(', ', $sets) . ' WHERE learning_id = :p_id',
                $params
            );
            $this->regenerateCacheFile();
            return true;
        } catch (Throwable $e) {
            error_log('TranslationLearningService.updateFields failed: ' . $e->getMessage());
            return false;
        }
    }

    public function delete(int $id): bool
    {
        try {
            $this->data->execute(
                'DELETE FROM translation_learning WHERE learning_id = :p1',
                [':p1' => $id]
            );
            $this->regenerateCacheFile();
            return true;
        } catch (Throwable $e) {
            error_log('TranslationLearningService.delete failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Promote a single review issue to a learning row (manual path from the
     * review modal). Creates with status='approved' immediately if approve=true.
     *
     * @param array<string,mixed> $issue
     */
    public function promoteFromIssue(array $issue, string $docCode, ?int $reviewId, string $actor, bool $approve = true): ?int
    {
        $vi = trim((string)($issue['vi_excerpt'] ?? ''));
        $enWrong = trim((string)($issue['en_excerpt'] ?? ''));
        $category = trim((string)($issue['category'] ?? 'other'));
        $severity = strtolower(trim((string)($issue['severity'] ?? 'advisory')));
        $suggestion = trim((string)($issue['suggestion'] ?? ''));
        $explanation = trim((string)($issue['explanation'] ?? ''));
        if ($vi === '' || $category === '') return null;
        if ($severity !== 'critical') { $severity = 'advisory'; }

        $hash = hash('sha256', mb_strtolower($vi) . '|' . mb_strtolower($category));
        try {
            $existing = $this->data->query(
                'SELECT learning_id FROM translation_learning WHERE dedupe_hash = :p1 LIMIT 1',
                [':p1' => $hash]
            );
            if (is_array($existing) && isset($existing[0])) {
                $id = (int)$existing[0]['learning_id'];
                // Refresh fields + force approve if requested.
                $this->updateFields($id, [
                    'en_wrong_pattern' => $enWrong,
                    'en_correct' => $suggestion,
                    'category' => $category,
                    'severity' => $severity,
                    'explanation' => $explanation,
                ], $actor);
                if ($approve) {
                    $this->approve($id, $actor);
                }
                return $id;
            }
            $this->data->execute(
                "INSERT INTO translation_learning
                    (dedupe_hash, vi_pattern, en_wrong_pattern, en_correct,
                     category, severity, explanation, status, hit_count,
                     doc_codes, last_review_id, created_by, updated_by)
                 VALUES (:p1, :p2, :p3, :p4, :p5, :p6, :p7, :p8, 1, :p9::jsonb, :p10, :p11, :p11)",
                [
                    ':p1' => $hash,
                    ':p2' => mb_substr($vi, 0, 200),
                    ':p3' => $enWrong !== '' ? mb_substr($enWrong, 0, 300) : null,
                    ':p4' => $suggestion !== '' ? mb_substr($suggestion, 0, 300) : null,
                    ':p5' => $category,
                    ':p6' => $severity,
                    ':p7' => $explanation !== '' ? mb_substr($explanation, 0, 300) : null,
                    ':p8' => $approve ? 'approved' : 'auto',
                    ':p9' => json_encode($docCode !== '' ? [$docCode] : [], JSON_UNESCAPED_UNICODE) ?: '[]',
                    ':p10' => $reviewId,
                    ':p11' => $actor,
                ]
            );
            $idRows = $this->data->query("SELECT currval(pg_get_serial_sequence('translation_learning','learning_id')) AS id");
            $newId = is_array($idRows) && isset($idRows[0]['id']) ? (int)$idRows[0]['id'] : null;
            $this->regenerateCacheFile();
            return $newId;
        } catch (Throwable $e) {
            error_log('TranslationLearningService.promoteFromIssue failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Manually create a new learning row from scratch (admin form).
     */
    public function createManual(array $fields, string $actor): ?int
    {
        $vi = trim((string)($fields['vi_pattern'] ?? ''));
        $category = trim((string)($fields['category'] ?? 'other'));
        $correct = trim((string)($fields['en_correct'] ?? ''));
        if ($vi === '' || $correct === '') return null;
        $hash = hash('sha256', mb_strtolower($vi) . '|' . mb_strtolower($category));
        try {
            $existing = $this->data->query(
                'SELECT learning_id FROM translation_learning WHERE dedupe_hash = :p1 LIMIT 1',
                [':p1' => $hash]
            );
            if (is_array($existing) && isset($existing[0])) {
                return (int)$existing[0]['learning_id'];
            }
            $severity = strtolower(trim((string)($fields['severity'] ?? 'advisory')));
            if (!in_array($severity, ['critical', 'advisory'], true)) $severity = 'advisory';
            $this->data->execute(
                "INSERT INTO translation_learning
                    (dedupe_hash, vi_pattern, en_wrong_pattern, en_correct, category,
                     severity, explanation, status, hit_count, doc_codes, created_by, updated_by, notes)
                 VALUES (:p1, :p2, :p3, :p4, :p5, :p6, :p7, 'approved', 0, '[]'::jsonb, :p8, :p8, :p9)",
                [
                    ':p1' => $hash,
                    ':p2' => mb_substr($vi, 0, 200),
                    ':p3' => mb_substr(trim((string)($fields['en_wrong_pattern'] ?? '')), 0, 300) ?: null,
                    ':p4' => mb_substr($correct, 0, 300),
                    ':p5' => $category,
                    ':p6' => $severity,
                    ':p7' => mb_substr(trim((string)($fields['explanation'] ?? '')), 0, 300) ?: null,
                    ':p8' => $actor,
                    ':p9' => mb_substr(trim((string)($fields['notes'] ?? '')), 0, 400) ?: null,
                ]
            );
            $idRows = $this->data->query("SELECT currval(pg_get_serial_sequence('translation_learning','learning_id')) AS id");
            $this->regenerateCacheFile();
            return is_array($idRows) && isset($idRows[0]['id']) ? (int)$idRows[0]['id'] : null;
        } catch (Throwable $e) {
            error_log('TranslationLearningService.createManual failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Aggregate stats for the admin tab header.
     *
     * @return array{auto:int, approved:int, disabled:int, total:int}
     */
    public function stats(): array
    {
        $rows = $this->data->query(
            "SELECT status, COUNT(*) AS n FROM translation_learning GROUP BY status"
        );
        $out = ['auto' => 0, 'approved' => 0, 'disabled' => 0, 'total' => 0];
        if (is_array($rows)) {
            foreach ($rows as $row) {
                $status = (string)($row['status'] ?? '');
                $n = (int)($row['n'] ?? 0);
                if (isset($out[$status])) {
                    $out[$status] = $n;
                }
                $out['total'] += $n;
            }
        }
        return $out;
    }

    /**
     * @param mixed $raw
     * @return list<string>
     */
    private function decodeDocCodes($raw): array
    {
        if (is_array($raw)) {
            return array_values(array_filter(array_map('strval', $raw), fn ($s) => $s !== ''));
        }
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return array_values(array_filter(array_map('strval', $decoded), fn ($s) => $s !== ''));
            }
        }
        return [];
    }
}
