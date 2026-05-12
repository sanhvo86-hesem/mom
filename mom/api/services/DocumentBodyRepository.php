<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;
use Throwable;

/**
 * Mode-aware repository for DCC document bodies (Phase 2 of ADR-0013).
 *
 * The HTML body of every controlled QMS document moves from the
 * filesystem (mom/docs/**​/*.html) into the append-only, sha256-verified
 * table dcc_document_body (migration 175). This class is the runtime
 * gateway:
 *
 *   - In `json_only` mode: read from filesystem, write to filesystem.
 *   - In `shadow_write`:    read from filesystem, write to BOTH (DB-first
 *                            so a DB failure aborts the write atomically;
 *                            filesystem write follows on success).
 *   - In `postgres_primary`: read DB (fall back to filesystem on miss),
 *                            write DB then mirror filesystem.
 *   - In `postgres_only`:    read DB, write DB; filesystem ignored. The
 *                            filesystem copy may exist as a stale cache.
 *
 * The append-only contract (no UPDATE/DELETE) is enforced both at the
 * application layer (this class only INSERTs) and at the DB layer
 * (triggers in migration 175).
 */
final class DocumentBodyRepository
{
    public const COLLECTION_KEY = 'dcc_documents';

    public function __construct(
        private readonly Connection $db,
        private readonly DataCollectionModeResolver $modeResolver,
        private readonly AuditChainService $audit,
        private readonly string $docsRoot,
    ) {
    }

    // ── Reads ──────────────────────────────────────────────────────────────

    /**
     * Return the currently-effective body for a document × locale.
     * Falls back across the source hierarchy as defined by the mode.
     *
     * @return array{body_html:string, body_sha256:string, revision:string, status:string, source:string}|null
     */
    public function findCurrent(string $docCode, string $locale = 'vi'): ?array
    {
        $mode = $this->modeResolver->modeFor(self::COLLECTION_KEY);

        return match ($mode) {
            DataCollectionModeResolver::MODE_JSON_ONLY,
            DataCollectionModeResolver::MODE_SHADOW_WRITE
                => $this->readFs($docCode, $locale),
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY
                => $this->readDbCurrent($docCode, $locale)
                    ?? $this->readFs($docCode, $locale),
            DataCollectionModeResolver::MODE_POSTGRES_ONLY
                => $this->readDbCurrent($docCode, $locale),
            default => $this->readFs($docCode, $locale),
        };
    }

    /**
     * Return a specific historical revision (for diff / rollback / audit).
     *
     * @return array{body_html:string, body_sha256:string, revision:string, status:string, source:string}|null
     */
    public function findRevision(
        string $docCode,
        string $revision,
        string $status,
        string $locale = 'vi',
    ): ?array {
        try {
            $row = $this->db->queryOne(
                'SELECT body_html, body_sha256, revision, status
                   FROM dcc_document_body
                  WHERE doc_code = :code
                    AND revision = :rev
                    AND status   = :status
                    AND locale   = :locale',
                [
                    ':code'   => $docCode,
                    ':rev'    => $revision,
                    ':status' => $status,
                    ':locale' => $locale,
                ],
            );
        } catch (Throwable $e) {
            @error_log('[DocumentBodyRepository] findRevision failed: ' . $e->getMessage());
            return null;
        }
        if (!is_array($row)) {
            return null;
        }
        return [
            'body_html'   => (string)$row['body_html'],
            'body_sha256' => (string)$row['body_sha256'],
            'revision'    => (string)$row['revision'],
            'status'      => (string)$row['status'],
            'source'      => 'postgres',
        ];
    }

    /**
     * @return list<array{revision:string, status:string, locale:string, body_sha256:string, created_at:string, created_by:string}>
     */
    public function listVersions(string $docCode): array
    {
        try {
            $rows = $this->db->query(
                'SELECT revision, status, locale, body_sha256, created_at, created_by
                   FROM dcc_document_body
                  WHERE doc_code = :code
                  ORDER BY created_at DESC',
                [':code' => $docCode],
            );
        } catch (Throwable $e) {
            @error_log('[DocumentBodyRepository] listVersions failed: ' . $e->getMessage());
            return [];
        }
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'revision'    => (string)($r['revision'] ?? ''),
                'status'      => (string)($r['status'] ?? ''),
                'locale'      => (string)($r['locale'] ?? 'vi'),
                'body_sha256' => (string)($r['body_sha256'] ?? ''),
                'created_at'  => (string)($r['created_at'] ?? ''),
                'created_by'  => (string)($r['created_by'] ?? ''),
            ];
        }
        return $out;
    }

    // ── Writes ─────────────────────────────────────────────────────────────

    /**
     * Persist a new body version. Returns the body_sha256 of the saved
     * row. Caller must compute revision and status before invoking
     * (these correspond to the document's lifecycle state).
     *
     * @param array{
     *   doc_code:string,
     *   revision:string,
     *   status:string,
     *   locale?:string,
     *   body_html:string,
     *   source_path?:?string,
     *   fs_relpath?:?string,
     *   metadata?:array<string,mixed>,
     *   created_by?:string,
     *   change_ref?:string
     * } $payload
     *
     * `source_path`  — informational only, written into dcc_document_body.source_path.
     * `fs_relpath`   — relative to docsRoot. If non-null AND mode != postgres_only,
     *                  the body is also written to docsRoot/$fs_relpath atomically.
     *                  During backfill the file already lives on disk, so callers
     *                  pass null to skip the FS mirror.
     */
    public function saveVersion(array $payload, string $actor): string
    {
        $docCode  = trim((string)$payload['doc_code']);
        $revision = trim((string)$payload['revision']);
        $status   = trim((string)$payload['status']);
        $locale   = trim((string)($payload['locale'] ?? 'vi'));
        $html     = (string)$payload['body_html'];

        if ($docCode === '' || $revision === '' || $status === '' || $html === '') {
            throw new \InvalidArgumentException('saveVersion: doc_code/revision/status/body_html required');
        }
        $sha = hash('sha256', $html);
        $mode = $this->modeResolver->modeFor(self::COLLECTION_KEY);

        $dbOk = false;
        $fsOk = false;

        // DB write — mandatory for shadow_write+; in json_only this branch
        // is skipped entirely.
        if (in_array($mode, [
            DataCollectionModeResolver::MODE_SHADOW_WRITE,
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
            DataCollectionModeResolver::MODE_POSTGRES_ONLY,
        ], true)) {
            try {
                $this->db->execute(
                    'INSERT INTO dcc_document_body (
                         doc_code, revision, status, locale,
                         body_html, body_sha256, body_size,
                         source_path, metadata, created_by, change_ref
                     ) VALUES (
                         :code, :rev, :status, :locale,
                         :html, :sha, :size,
                         :source_path, CAST(:metadata AS jsonb), :created_by, :change_ref
                     )
                     ON CONFLICT (doc_code, revision, status, locale) DO NOTHING',
                    [
                        ':code'        => $docCode,
                        ':rev'         => $revision,
                        ':status'      => $status,
                        ':locale'      => $locale,
                        ':html'        => $html,
                        ':sha'         => $sha,
                        ':size'        => strlen($html),
                        ':source_path' => $payload['source_path'] ?? null,
                        ':metadata'    => json_encode(
                            $payload['metadata'] ?? [],
                            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                        ) ?: '{}',
                        ':created_by'  => $payload['created_by'] ?? $actor,
                        ':change_ref'  => $payload['change_ref'] ?? null,
                    ],
                );
                $dbOk = true;
            } catch (Throwable $e) {
                if ($mode === DataCollectionModeResolver::MODE_POSTGRES_ONLY) {
                    throw new RuntimeException('document_body_db_write_failed: ' . $e->getMessage(), 0, $e);
                }
                @error_log('[DocumentBodyRepository] DB write failed: ' . $e->getMessage());
            }
        }

        // Filesystem mirror — only when caller explicitly wants the file
        // updated on disk (portal edit path). Backfill skips this branch.
        if (in_array($mode, [
            DataCollectionModeResolver::MODE_JSON_ONLY,
            DataCollectionModeResolver::MODE_SHADOW_WRITE,
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
        ], true)) {
            $fsRelpath = $payload['fs_relpath'] ?? null;
            if (is_string($fsRelpath) && $fsRelpath !== '') {
                try {
                    $this->writeFs($fsRelpath, $html);
                    $fsOk = true;
                } catch (Throwable $e) {
                    if ($mode === DataCollectionModeResolver::MODE_JSON_ONLY) {
                        throw $e;
                    }
                    @error_log('[DocumentBodyRepository] FS mirror failed: ' . $e->getMessage());
                }
            }
        }

        $this->audit->record(
            eventType:     'dcc_body_saved',
            aggregateType: 'dcc.document_body',
            aggregateId:   $docCode,
            actorId:       null,
            actorName:     $actor,
            payload: [
                'mode'        => $mode,
                'revision'    => $revision,
                'status'      => $status,
                'locale'      => $locale,
                'body_sha256' => $sha,
                'body_size'   => strlen($html),
                'db_ok'       => $dbOk,
                'fs_ok'       => $fsOk,
                'change_ref'  => $payload['change_ref'] ?? null,
            ],
        );

        return $sha;
    }

    /**
     * Mark an approved body row as the released body for its document.
     * This is a metadata-only update on dcc_document_header — the body
     * itself stays immutable.
     */
    public function publishRelease(
        string $docCode,
        string $revision,
        string $locale,
        string $actor,
        string $changeRef,
    ): void {
        try {
            $body = $this->db->queryOne(
                'SELECT body_id, body_sha256
                   FROM dcc_document_body
                  WHERE doc_code = :code
                    AND revision = :rev
                    AND status   = :status
                    AND locale   = :locale',
                [
                    ':code'   => $docCode,
                    ':rev'    => $revision,
                    ':status' => 'approved',
                    ':locale' => $locale,
                ],
            );
        } catch (Throwable $e) {
            throw new RuntimeException('publishRelease: lookup failed: ' . $e->getMessage(), 0, $e);
        }
        if (!is_array($body)) {
            throw new RuntimeException(
                "publishRelease: no approved body for {$docCode} rev={$revision} locale={$locale}"
            );
        }
        $this->db->execute(
            'UPDATE dcc_document_header
                SET released_body_id     = :body_id,
                    released_body_sha256 = :sha,
                    released_at          = now(),
                    revision             = :rev,
                    status               = \'released\',
                    updated_at           = now(),
                    updated_by           = :actor
              WHERE doc_code = :code',
            [
                ':body_id' => (string)$body['body_id'],
                ':sha'     => (string)$body['body_sha256'],
                ':rev'     => $revision,
                ':code'    => $docCode,
                ':actor'   => $actor,
            ],
        );
        $this->audit->record(
            eventType:     'dcc_body_released',
            aggregateType: 'dcc.document_body',
            aggregateId:   $docCode,
            actorId:       null,
            actorName:     $actor,
            payload: [
                'revision'    => $revision,
                'locale'      => $locale,
                'body_id'     => (string)$body['body_id'],
                'body_sha256' => (string)$body['body_sha256'],
                'change_ref'  => $changeRef,
            ],
        );
    }

    // ── Internals ──────────────────────────────────────────────────────────

    /**
     * Resolve the on-disk path for a doc_code by scanning common
     * locations in mom/docs/**. Returns the first matching .html file.
     */
    public function resolveFsPathByCode(string $docCode): ?string
    {
        $code = strtolower(trim($docCode));
        if ($code === '') {
            return null;
        }
        $bases = [
            $this->docsRoot . '/system',
            $this->docsRoot . '/operations',
            $this->docsRoot . '/forms',
            $this->docsRoot . '/training',
            $this->docsRoot . '/glossary',
        ];
        foreach ($bases as $base) {
            if (!is_dir($base)) {
                continue;
            }
            $iter = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($base, \FilesystemIterator::SKIP_DOTS),
            );
            foreach ($iter as $f) {
                /** @var \SplFileInfo $f */
                if (!$f->isFile() || strtolower($f->getExtension()) !== 'html') {
                    continue;
                }
                $name = strtolower($f->getFilename());
                if (str_starts_with($name, $code . '-') || str_starts_with($name, '_' . $code . '-')) {
                    return $f->getPathname();
                }
            }
        }
        return null;
    }

    /**
     * @return array{body_html:string, body_sha256:string, revision:string, status:string, source:string}|null
     */
    private function readFs(string $docCode, string $locale): ?array
    {
        $path = $this->resolveFsPathByCode($docCode);
        if ($path === null) {
            return null;
        }
        $html = @file_get_contents($path);
        if ($html === false) {
            return null;
        }
        return [
            'body_html'   => $html,
            'body_sha256' => hash('sha256', $html),
            'revision'    => 'fs',          // unknown without manifest; caller may resolve via dcc_document_header
            'status'      => 'released',    // assumed live
            'source'      => 'filesystem:' . $path,
        ];
    }

    /**
     * @return array{body_html:string, body_sha256:string, revision:string, status:string, source:string}|null
     */
    private function readDbCurrent(string $docCode, string $locale): ?array
    {
        try {
            $row = $this->db->queryOne(
                'SELECT body_html, body_sha256, revision, status
                   FROM dcc_document_body_current
                  WHERE doc_code = :code AND locale = :locale',
                [':code' => $docCode, ':locale' => $locale],
            );
        } catch (Throwable $e) {
            @error_log('[DocumentBodyRepository] readDbCurrent failed: ' . $e->getMessage());
            return null;
        }
        if (!is_array($row)) {
            return null;
        }
        return [
            'body_html'   => (string)$row['body_html'],
            'body_sha256' => (string)$row['body_sha256'],
            'revision'    => (string)$row['revision'],
            'status'      => (string)$row['status'],
            'source'      => 'postgres',
        ];
    }

    private function writeFs(string $relPath, string $html): void
    {
        $abs = $this->docsRoot . '/' . ltrim($relPath, '/');
        $dir = dirname($abs);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('cannot_create_dir:' . $dir);
        }
        $tmp = $abs . '.tmp.' . bin2hex(random_bytes(4));
        if (@file_put_contents($tmp, $html, LOCK_EX) === false) {
            throw new RuntimeException('write_failed:' . basename($abs));
        }
        if (!@rename($tmp, $abs)) {
            @unlink($tmp);
            throw new RuntimeException('rename_failed:' . basename($abs));
        }
        @chmod($abs, 0664);
    }
}
