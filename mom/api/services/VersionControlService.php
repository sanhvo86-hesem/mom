<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;
use Throwable;

/**
 * Read-only aggregator for the Admin → Version Control tab.
 *
 * Combines four data sources into a single panel-ready payload:
 *   1. Git working-tree state (already exposed by AdminController::gitStatus).
 *   2. Runtime-config drift between site copy and VPS mirror
 *      (delegated to DataSyncStatusService).
 *   3. Snapshot inventory (delegated to DataSyncMutationService).
 *   4. DCC document revision activity from Postgres
 *      (dcc_document_revision + dcc_document_revision_history +
 *      dcc_document_header).
 *
 * The service degrades gracefully if Postgres is unavailable: the
 * document-history sections return empty arrays instead of failing the
 * whole overview call. This matches the JSON_ONLY → POSTGRES_PRIMARY
 * migration ladder used elsewhere in the portal.
 */
final class VersionControlService
{
    /** @phpstan-ignore-next-line property.onlyWritten — retained for future filesystem-scoped lookups */
    private string $dataDir;
    private DataLayer $data;

    public function __construct(string $dataDir, DataLayer $data)
    {
        $this->dataDir = rtrim($dataDir, DIRECTORY_SEPARATOR);
        $this->data = $data;
    }

    /**
     * Compact dashboard payload for the "Tổng quan" sub-tab.
     *
     * @param array<string, mixed> $syncStatus    Output of DataSyncStatusService::status()
     * @param array<int, array<string,mixed>> $snapshots  Output of DataSyncMutationService::listSnapshots()
     * @return array<string, mixed>
     */
    public function buildOverview(array $syncStatus, array $snapshots): array
    {
        $configFiles = is_array($syncStatus['config_files'] ?? null)
            ? $syncStatus['config_files']
            : [];

        $driftCount = 0;
        $missingMirror = 0;
        $missingSite = 0;
        $totalFiles = 0;
        foreach ($configFiles as $row) {
            if (!is_array($row)) {
                continue;
            }
            $totalFiles++;
            $sitePresent = !empty($row['site_present']);
            $mirrorPresent = !empty($row['mirror_present']);
            if (!$sitePresent) {
                $missingSite++;
            }
            if (!$mirrorPresent) {
                $missingMirror++;
            }
            if ($sitePresent && $mirrorPresent && !empty($row['drift'])) {
                $driftCount++;
            }
        }

        $snapshotTotal = count($snapshots);
        $snapshotLatestAt = '';
        $snapshotLatestActor = '';
        $snapshotLatestReason = '';
        if ($snapshotTotal > 0) {
            $first = $snapshots[0] ?? [];
            $snapshotLatestAt = (string)($first['captured_at'] ?? '');
            $snapshotLatestActor = (string)($first['actor'] ?? '');
            $snapshotLatestReason = (string)($first['reason'] ?? '');
        }

        $docActivity = $this->summarizeDocActivity();
        $recentDocChanges = $this->listRecentDocChanges(8);

        return [
            'generated_at'    => $this->isoNow(),
            'config_drift'    => [
                'total_files'      => $totalFiles,
                'drift_count'      => $driftCount,
                'missing_mirror'   => $missingMirror,
                'missing_site'     => $missingSite,
                'last_observed_at' => (string)($syncStatus['observed_at'] ?? ''),
            ],
            'snapshots'       => [
                'total'        => $snapshotTotal,
                'latest_at'    => $snapshotLatestAt,
                'latest_actor' => $snapshotLatestActor,
                'latest_reason'=> $snapshotLatestReason,
                'retain_max'   => 60,
            ],
            'doc_activity'    => $docActivity,
            'recent_doc_changes' => $recentDocChanges,
        ];
    }

    /**
     * Aggregate counts of revision-history rows for the dashboard tile.
     *
     * @return array<string, int|string>
     */
    public function summarizeDocActivity(): array
    {
        $defaults = [
            'total_revisions'  => 0,
            'distinct_docs'    => 0,
            'last_7d'          => 0,
            'last_30d'         => 0,
            'last_recorded_at' => '',
        ];

        try {
            $row = $this->data->row(
                "SELECT
                    COUNT(*)::INT AS total_revisions,
                    COUNT(DISTINCT doc_code)::INT AS distinct_docs,
                    COUNT(*) FILTER (WHERE recorded_at >= now() - interval '7 days')::INT AS last_7d,
                    COUNT(*) FILTER (WHERE recorded_at >= now() - interval '30 days')::INT AS last_30d,
                    COALESCE(MAX(recorded_at)::TEXT, '') AS last_recorded_at
                 FROM dcc_document_revision_history"
            );
            if (!is_array($row)) {
                return $defaults;
            }
            return [
                'total_revisions'  => (int)($row['total_revisions'] ?? 0),
                'distinct_docs'    => (int)($row['distinct_docs'] ?? 0),
                'last_7d'          => (int)($row['last_7d'] ?? 0),
                'last_30d'         => (int)($row['last_30d'] ?? 0),
                'last_recorded_at' => (string)($row['last_recorded_at'] ?? ''),
            ];
        } catch (Throwable) {
            return $defaults;
        }
    }

    /**
     * Latest N rows across all docs, joined to header for current revision/status.
     *
     * @return list<array<string, mixed>>
     */
    public function listRecentDocChanges(int $limit = 25): array
    {
        $limit = max(1, min(200, $limit));
        try {
            $rows = $this->data->query(
                "SELECT h.history_id, h.doc_code, h.revision, h.previous_revision,
                        h.from_status, h.to_status, h.actor_party_id,
                        h.actor_role_code, h.note, h.recorded_at,
                        hdr.status      AS header_status,
                        hdr.revision    AS header_revision,
                        hdr.doc_type    AS doc_type
                 FROM dcc_document_revision_history h
                 LEFT JOIN dcc_document_header hdr ON hdr.doc_code = h.doc_code
                 ORDER BY h.recorded_at DESC
                 LIMIT :lim",
                [':lim' => $limit]
            );
            return is_array($rows) ? array_values(array_map([$this, 'normalizeHistoryRow'], $rows)) : [];
        } catch (Throwable) {
            return [];
        }
    }

    /**
     * Paged list of docs that have any revision history, with row counts.
     *
     * @return array{docs: list<array<string,mixed>>, total: int}
     */
    public function listDocsWithHistory(int $limit = 100, string $search = ''): array
    {
        $limit = max(1, min(500, $limit));
        $search = trim($search);
        try {
            $where = '';
            $params = [':lim' => $limit];
            if ($search !== '') {
                $where = " WHERE h.doc_code ILIKE :q";
                $params[':q'] = '%' . $search . '%';
            }

            $rows = $this->data->query(
                "SELECT h.doc_code,
                        COUNT(*)::INT                                AS history_rows,
                        MAX(h.recorded_at)::TEXT                     AS last_recorded_at,
                        MAX(h.revision)                              AS latest_revision_seen,
                        MAX(hdr.status)                              AS header_status,
                        MAX(hdr.revision)                            AS header_revision,
                        MAX(hdr.doc_type)                            AS doc_type
                 FROM dcc_document_revision_history h
                 LEFT JOIN dcc_document_header hdr ON hdr.doc_code = h.doc_code
                 $where
                 GROUP BY h.doc_code
                 ORDER BY MAX(h.recorded_at) DESC NULLS LAST
                 LIMIT :lim",
                $params
            );
            $docs = is_array($rows) ? array_values(array_map(static function ($r) {
                $r = is_array($r) ? $r : [];
                return [
                    'doc_code'         => (string)($r['doc_code'] ?? ''),
                    'history_rows'     => (int)($r['history_rows'] ?? 0),
                    'last_recorded_at' => (string)($r['last_recorded_at'] ?? ''),
                    'latest_revision'  => (string)($r['latest_revision_seen'] ?? ''),
                    'header_status'    => (string)($r['header_status'] ?? ''),
                    'header_revision'  => (string)($r['header_revision'] ?? ''),
                    'doc_type'         => (string)($r['doc_type'] ?? ''),
                ];
            }, $rows)) : [];

            $total = (int)($this->data->scalar(
                "SELECT COUNT(DISTINCT doc_code)::INT FROM dcc_document_revision_history"
            ) ?? 0);

            return ['docs' => $docs, 'total' => $total];
        } catch (Throwable) {
            return ['docs' => [], 'total' => 0];
        }
    }

    /**
     * Combined bodies + transitions for a single doc, plus header snapshot.
     *
     * @return array{header: array<string,mixed>|null, bodies: list<array<string,mixed>>, transitions: list<array<string,mixed>>}
     */
    public function getDocRevisions(string $docCode): array
    {
        $docCode = strtolower(trim($docCode));
        if ($docCode === '' || strlen($docCode) > 80 || !preg_match('/^[a-z0-9._-]+$/i', $docCode)) {
            return ['header' => null, 'bodies' => [], 'transitions' => []];
        }
        try {
            $header = $this->data->row(
                "SELECT doc_code, title, subtitle, doc_type, status, revision,
                        effective_date, owner_role_code, approver_role_code,
                        iso_clause, updated_at, updated_by
                 FROM dcc_document_header
                 WHERE doc_code = :c",
                [':c' => $docCode]
            );
            $bodies = $this->data->query(
                "SELECT revision_id, revision, update_type, effective_date,
                        content_sha256, filename, dcr_id, dcn_id,
                        approved_by, approved_at, released_by, released_at,
                        signature_event_id, is_current, note
                 FROM dcc_document_revision
                 WHERE doc_code = :c
                 ORDER BY approved_at DESC NULLS LAST, revision DESC",
                [':c' => $docCode]
            ) ?? [];
            $transitions = $this->data->query(
                "SELECT history_id, revision, previous_revision,
                        from_status, to_status, effective_date,
                        actor_party_id, actor_role_code,
                        dcr_id, dcn_id, note, recorded_at
                 FROM dcc_document_revision_history
                 WHERE doc_code = :c
                 ORDER BY recorded_at DESC",
                [':c' => $docCode]
            ) ?? [];

            return [
                'header'      => is_array($header) ? $header : null,
                'bodies'      => array_values(array_map([$this, 'normalizeBodyRow'], $bodies)),
                'transitions' => array_values(array_map([$this, 'normalizeHistoryRow'], $transitions)),
            ];
        } catch (Throwable) {
            return ['header' => null, 'bodies' => [], 'transitions' => []];
        }
    }

    /**
     * @param mixed $row
     * @return array<string, mixed>
     */
    private function normalizeHistoryRow($row): array
    {
        $row = is_array($row) ? $row : [];
        return [
            'history_id'         => (string)($row['history_id'] ?? ''),
            'doc_code'           => (string)($row['doc_code'] ?? ''),
            'revision'           => (string)($row['revision'] ?? ''),
            'previous_revision'  => (string)($row['previous_revision'] ?? ''),
            'from_status'        => (string)($row['from_status'] ?? ''),
            'to_status'          => (string)($row['to_status'] ?? ''),
            'effective_date'     => (string)($row['effective_date'] ?? ''),
            'actor_party_id'     => (string)($row['actor_party_id'] ?? ''),
            'actor_role_code'    => (string)($row['actor_role_code'] ?? ''),
            'dcr_id'             => (string)($row['dcr_id'] ?? ''),
            'dcn_id'             => (string)($row['dcn_id'] ?? ''),
            'note'               => (string)($row['note'] ?? ''),
            'recorded_at'        => (string)($row['recorded_at'] ?? ''),
            'header_status'      => (string)($row['header_status'] ?? ''),
            'header_revision'    => (string)($row['header_revision'] ?? ''),
            'doc_type'           => (string)($row['doc_type'] ?? ''),
        ];
    }

    /**
     * @param mixed $row
     * @return array<string, mixed>
     */
    private function normalizeBodyRow($row): array
    {
        $row = is_array($row) ? $row : [];
        return [
            'revision_id'         => (string)($row['revision_id'] ?? ''),
            'revision'            => (string)($row['revision'] ?? ''),
            'update_type'         => (string)($row['update_type'] ?? ''),
            'effective_date'      => (string)($row['effective_date'] ?? ''),
            'content_sha256'      => (string)($row['content_sha256'] ?? ''),
            'filename'            => (string)($row['filename'] ?? ''),
            'dcr_id'              => (string)($row['dcr_id'] ?? ''),
            'dcn_id'              => (string)($row['dcn_id'] ?? ''),
            'approved_by'         => (string)($row['approved_by'] ?? ''),
            'approved_at'         => (string)($row['approved_at'] ?? ''),
            'released_by'         => (string)($row['released_by'] ?? ''),
            'released_at'         => (string)($row['released_at'] ?? ''),
            'signature_event_id'  => (string)($row['signature_event_id'] ?? ''),
            'is_current'          => !empty($row['is_current']),
            'note'                => (string)($row['note'] ?? ''),
        ];
    }

    private function isoNow(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}
