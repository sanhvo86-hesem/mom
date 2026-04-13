<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Evidence Vault Service for HESEM MOM Portal.
 *
 * Tamper-evident digital evidence storage with SHA-256 hash chain,
 * custody logging, and entity linking. Ensures full traceability
 * of quality records, machine logs, and measurement data.
 *
 * Supports DataLayer migration ladder:
 *   JSON_ONLY        → Read/write JSON only
 *   SHADOW_WRITE     → Read JSON, write BOTH JSON + PostgreSQL
 *   POSTGRES_PRIMARY → Read PostgreSQL (fallback JSON), write both
 *   POSTGRES_ONLY    → Read/write PostgreSQL only
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class EvidenceVaultService
{
    private readonly string $dataDir;
    private readonly string $evidenceDir;
    private ?DataLayer $dataLayer = null;
    private readonly string $vaultFile;
    private readonly string $custodyFile;
    private readonly string $linksFile;

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir, ?DataLayer $dataLayer = null)
    {
        $this->dataDir     = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->evidenceDir = $this->dataDir . '/evidence';
        $this->vaultFile   = $this->evidenceDir . '/vault.json';
        $this->custodyFile = $this->evidenceDir . '/custody.json';
        $this->linksFile   = $this->evidenceDir . '/links.json';
        $this->dataLayer   = $dataLayer;

        if (!is_dir($this->evidenceDir)) {
            @mkdir($this->evidenceDir, 0775, true);
        }
    }

    // ── DataLayer Mode Helpers ──────────────────────────────────────────────

    private function pgWriteEnabled(): bool
    {
        if ($this->dataLayer === null) return false;
        return $this->dataLayer->getMode() !== DataLayer::MODE_JSON_ONLY;
    }

    private function jsonWriteEnabled(): bool
    {
        if ($this->dataLayer === null) return true;
        return $this->dataLayer->getMode() !== DataLayer::MODE_POSTGRES_ONLY;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Store a new evidence record in the vault.
     *
     * Accepts either (file, metadata, userId) from controller upload,
     * or (evidence, userId) for direct programmatic use.
     *
     * @param array       $fileOrEvidence  File upload array or evidence data.
     * @param array|string $metadataOrUser Metadata array (when file upload) or userId string (legacy).
     * @param string|null  $userId         User ID (when file upload).
     * @return array Created evidence record with chain metadata.
     */
    public function store(array $fileOrEvidence, array|string $metadataOrUser = '', ?string $userId = null): array
    {
        // Normalize the multi-signature call into (evidence, userId)
        if (is_array($metadataOrUser)) {
            // Called as store($file, $metadata, $userId) from controller
            $file = $fileOrEvidence;
            $metadata = $metadataOrUser;
            $actorId = $userId ?? 'unknown';

            $tmpPath = $file['tmp_name'] ?? '';
            $originalName = $file['name'] ?? 'unknown';
            $fileHash = is_file($tmpPath) ? hash_file('sha256', $tmpPath) : hash('sha256', $originalName . $this->nowIso());

            $uploadDir = $this->dataDir . '/uploads/evidence';
            if (!is_dir($uploadDir)) {
                @mkdir($uploadDir, 0775, true);
            }
            $storedName = $this->generateUuidV4() . '_' . basename($originalName);
            $storedPath = $uploadDir . '/' . $storedName;
            if (is_file($tmpPath)) {
                @move_uploaded_file($tmpPath, $storedPath);
            }

            $evidence = array_merge($metadata, [
                'filename'    => $originalName,
                'file_hash'   => $fileHash,
                'stored_path' => $storedPath,
                'mime_type'   => $file['type'] ?? 'application/octet-stream',
                'file_size'   => $file['size'] ?? 0,
            ]);
        } else {
            // Called as store($evidence, $userId) — legacy/programmatic path
            $evidence = $fileOrEvidence;
            $actorId = is_string($metadataOrUser) ? $metadataOrUser : ($userId ?? 'unknown');
        }

        $vault = $this->loadVault();
        $now   = $this->nowIso();

        // Compute or use provided file hash
        $fileHash = $evidence['file_hash'] ?? '';
        if ($fileHash === '' && isset($evidence['content'])) {
            $fileHash = hash('sha256', (string)$evidence['content']);
        }
        if ($fileHash === '') {
            $fileHash = hash('sha256', json_encode($evidence) . $now);
        }

        // Get chain head
        $chainHead     = $this->getChainHeadInternal($vault);
        $prevChainHash = $chainHead !== null ? ($chainHead['chain_hash'] ?? 'GENESIS') : 'GENESIS';

        // Extend hash chain
        $chainHash     = hash('sha256', $fileHash . $prevChainHash);
        $chainSequence = $chainHead !== null ? (int)($chainHead['chain_sequence'] ?? 0) + 1 : 1;

        $record = array_merge($evidence, [
            'evidence_id'    => $this->generateUuidV4(),
            'file_hash'      => $fileHash,
            'previous_hash'  => $prevChainHash,
            'chain_hash'     => $chainHash,
            'chain_sequence' => $chainSequence,
            'stored_by'      => $actorId,
            'stored_at'      => $now,
            'created_at'     => $now,
        ]);

        // Remove raw content from stored record (keep hash only)
        unset($record['content']);

        $vault[] = $record;
        if ($this->jsonWriteEnabled()) {
            $this->saveVault($vault);
        }

        // PostgreSQL dual-write
        $this->pgInsertEvidence($record);

        // Record initial custody event
        $this->recordCustody($record['evidence_id'], 'uploaded', $actorId, 'Initial storage in vault');

        return $record;
    }

    /**
     * List all evidence records with optional filters.
     *
     * Supported filters:
     *   - type        (string): Exact match on evidence type.
     *   - date_from   (string): YYYY-MM-DD inclusive lower bound on stored_at.
     *   - date_to     (string): YYYY-MM-DD inclusive upper bound on stored_at.
     *   - entity_type (string): Filter to evidence linked to this entity type.
     *   - entity_id   (string): Filter to evidence linked to this entity id.
     *
     * @param array<string, string> $filters
     * @return array<int, array<string, mixed>>
     */
    public function getAll(array $filters = []): array
    {
        if (!isset($filters['entity_id']) && isset($filters['record'])) {
            $filters['entity_id'] = (string)$filters['record'];
        }
        if (!isset($filters['entity_type']) && isset($filters['record_type'])) {
            $filters['entity_type'] = (string)$filters['record_type'];
        }

        $vault  = $this->loadVault();
        $result = [];

        // If filtering by entity, get linked evidence IDs first
        $linkedIds = null;
        if ((isset($filters['entity_type']) && $filters['entity_type'] !== '') ||
            (isset($filters['entity_id']) && $filters['entity_id'] !== '')) {
            $linkedIds = [];
            $links = $this->loadLinks();
            foreach ($links as $link) {
                if (!is_array($link)) {
                    continue;
                }
                $match = true;
                if (isset($filters['entity_type']) && $filters['entity_type'] !== '') {
                    if (($link['entity_type'] ?? '') !== $filters['entity_type']) {
                        $match = false;
                    }
                }
                if (isset($filters['entity_id']) && $filters['entity_id'] !== '') {
                    if (($link['entity_id'] ?? '') !== $filters['entity_id']) {
                        $match = false;
                    }
                }
                if ($match) {
                    $linkedIds[] = $link['evidence_id'] ?? '';
                }
            }
        }

        foreach ($vault as $rec) {
            if (!is_array($rec)) {
                continue;
            }

            if (isset($filters['type']) && $filters['type'] !== '') {
                if (($rec['type'] ?? '') !== $filters['type']) {
                    continue;
                }
            }

            $storedDate = substr($rec['stored_at'] ?? '', 0, 10);
            if (isset($filters['date_from']) && $filters['date_from'] !== '') {
                if ($storedDate < $filters['date_from']) {
                    continue;
                }
            }
            if (isset($filters['date_to']) && $filters['date_to'] !== '') {
                if ($storedDate > $filters['date_to']) {
                    continue;
                }
            }

            if ($linkedIds !== null) {
                if (!in_array($rec['evidence_id'] ?? '', $linkedIds, true)) {
                    continue;
                }
            }

            $result[] = $rec;
        }

        usort($result, fn(array $a, array $b) => strcmp($b['stored_at'] ?? '', $a['stored_at'] ?? ''));

        return $result;
    }

    /**
     * Get detail of a single evidence record.
     *
     * @param string $evidenceId Evidence UUID.
     * @return array|null
     */
    public function getDetail(string $evidenceId): ?array
    {
        $vault = $this->loadVault();
        foreach ($vault as $rec) {
            if (is_array($rec) && ($rec['evidence_id'] ?? '') === $evidenceId) {
                return $rec;
            }
        }
        return null;
    }

    /**
     * Link evidence to an entity (e.g., WO, SO, NCR).
     *
     * Accepts either (evidenceId, entityType, entityId, userId) for programmatic use,
     * or (evidenceId, recordId, recordType, userId, note) from the controller.
     *
     * @return array|null The created link record, or null if already exists.
     */
    public function link(string $evidenceId, string $entityTypeOrRecordId, string $entityIdOrRecordType, string $userId, ?string $note = null): ?array
    {
        // Normalize: if 5th arg ($note) is provided, the caller used the controller
        // signature link($evidenceId, $recordId, $recordType, $userId, $note).
        // The controller sends (evidenceId, recordId, recordType, userId, note)
        // so entityTypeOrRecordId = recordId and entityIdOrRecordType = recordType.
        // We swap to match internal semantics.
        if ($note !== null) {
            $entityType = $entityIdOrRecordType;
            $entityId   = $entityTypeOrRecordId;
        } else {
            $entityType = $entityTypeOrRecordId;
            $entityId   = $entityIdOrRecordType;
        }

        $links = $this->loadLinks();

        // Check for duplicate
        foreach ($links as $link) {
            if (is_array($link)
                && ($link['evidence_id'] ?? '') === $evidenceId
                && ($link['entity_type'] ?? '') === $entityType
                && ($link['entity_id'] ?? '') === $entityId) {
                return null; // Already linked
            }
        }

        $linkRecord = [
            'link_id'      => $this->generateUuidV4(),
            'evidence_id'  => $evidenceId,
            'entity_type'  => $entityType,
            'entity_id'    => $entityId,
            'linked_at'    => $this->nowIso(),
            'linked_by'    => $userId,
            'note'         => $note,
        ];

        $links[] = $linkRecord;
        if ($this->jsonWriteEnabled()) {
            $this->saveLinks($links);
        }

        // PostgreSQL dual-write
        $this->pgInsertLink($linkRecord);

        return $linkRecord;
    }

    /**
     * Remove a link between evidence and an entity.
     */
    public function unlink(string $evidenceId, string $entityType, string $entityId, string $userId): void
    {
        if ($this->jsonWriteEnabled()) {
            $links   = $this->loadLinks();
            $updated = [];

            foreach ($links as $link) {
                if (!is_array($link)) {
                    continue;
                }
                if (($link['evidence_id'] ?? '') === $evidenceId
                    && ($link['entity_type'] ?? '') === $entityType
                    && ($link['entity_id'] ?? '') === $entityId) {
                    continue; // Skip this link (remove it)
                }
                $updated[] = $link;
            }

            $this->saveLinks($updated);
        }

        // PostgreSQL: delete the link
        if ($this->pgWriteEnabled()) {
            try {
                $db = $this->dataLayer->getConnection();
                if ($db !== null) {
                    $db->execute(
                    'DELETE FROM evidence_links WHERE evidence_id = CAST(:eid AS uuid) AND linked_entity_type = :etype AND linked_entity_id = :entityid',
                        [':eid' => $evidenceId, ':etype' => $entityType, ':entityid' => $entityId]
                    );
                }
            } catch (\Throwable $e) {
                error_log('[EvidenceVaultService] PG unlink failed: ' . $e->getMessage());
            }
        }

        // Record custody event for unlink
        $this->recordCustody($evidenceId, 'unlinked', $userId,
            "Unlinked from {$entityType}:{$entityId}");
    }

    /**
     * Get all evidence linked to a specific entity.
     *
     * @param string $entityType Entity type (e.g., 'wo', 'so', 'ncr').
     * @param string $entityId   Entity identifier.
     * @return array<int, array<string, mixed>> Evidence records.
     */
    public function getLinkedEvidence(string $entityType, string $entityId): array
    {
        $links      = $this->loadLinks();
        $evidenceIds = [];

        foreach ($links as $link) {
            if (is_array($link)
                && ($link['entity_type'] ?? '') === $entityType
                && ($link['entity_id'] ?? '') === $entityId) {
                $evidenceIds[] = $link['evidence_id'] ?? '';
            }
        }

        if (empty($evidenceIds)) {
            return [];
        }

        $vault  = $this->loadVault();
        $result = [];

        foreach ($vault as $rec) {
            if (is_array($rec) && in_array($rec['evidence_id'] ?? '', $evidenceIds, true)) {
                $result[] = $rec;
            }
        }

        usort($result, fn(array $a, array $b) => strcmp($b['stored_at'] ?? '', $a['stored_at'] ?? ''));

        return $result;
    }

    /**
     * Record a custody event for an evidence record.
     *
     * @param string      $evidenceId Evidence UUID.
     * @param string      $action     Action (e.g., 'uploaded', 'viewed', 'downloaded').
     * @param string      $userId     Acting user.
     * @param string|null $reason     Optional reason.
     */
    public function recordCustody(string $evidenceId, string $action, string $userId, ?string $reason = null): void
    {
        $event = [
            'event_id'    => $this->generateUuidV4(),
            'evidence_id' => $evidenceId,
            'action'      => $action,
            'user'        => $userId,
            'reason'      => $reason,
            'timestamp'   => $this->nowIso(),
        ];

        if ($this->jsonWriteEnabled()) {
            $custody = $this->loadCustody();
            $custody[] = $event;
            $this->saveCustody($custody);
        }

        // PostgreSQL dual-write
        $this->pgInsertCustody($event);
    }

    /**
     * Get custody log for an evidence record, sorted by timestamp descending.
     *
     * @param string $evidenceId Evidence UUID.
     * @return array<int, array<string, mixed>>
     */
    public function getCustodyLog(string $evidenceId): array
    {
        $custody = $this->loadCustody();
        $result  = [];

        foreach ($custody as $event) {
            if (is_array($event) && ($event['evidence_id'] ?? '') === $evidenceId) {
                $result[] = $event;
            }
        }

        usort($result, fn(array $a, array $b) => strcmp($b['timestamp'] ?? '', $a['timestamp'] ?? ''));

        return $result;
    }

    // ── Governance attachment helpers ──────────────────────────────────────

    /**
     * List attachments for a governed entity (e.g., approval_group) from the DB.
     *
     * @return list<array>
     */
    public function listGovernanceAttachments(string $entityName, string $entityId, object $db): array
    {
        try {
            $stmt = $db->prepare(
                "SELECT attachment_id, entity_name, entity_id, file_name, content_type,
                        file_size_bytes, checksum_sha256, uploaded_by_party_id, created_at,
                        updated_at, row_version, evidence_chain_hash
                 FROM attachment
                 WHERE entity_name = :en AND entity_id = :eid
                 ORDER BY created_at DESC, attachment_id DESC"
            );
            $stmt->execute([':en' => $entityName, ':eid' => $entityId]);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return [];
        }
    }

    /**
     * Get a single governance attachment by ID from the DB.
     *
     * @return array|null
     */
    public function getGovernanceAttachment(string $attachmentId, object $db): ?array
    {
        try {
            $stmt = $db->prepare(
                "SELECT attachment_id, entity_name, entity_id, file_name, content_type,
                        file_size_bytes, checksum_sha256, uploaded_by_party_id, created_at,
                        updated_at, row_version, evidence_chain_hash
                 FROM attachment
                 WHERE attachment_id = :aid"
            );
            $stmt->execute([':aid' => $attachmentId]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return is_array($row) ? $row : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Create a governance attachment record in the DB.
     *
     * @return array The created attachment row.
     */
    public function createGovernanceAttachment(array $file, string $approvalGroupId, string $uploadedByPartyId, object $db, ?string $commentText = null, ?string $documentTypeCode = null): array
    {
        $originalName = $file['name'] ?? 'unknown';
        $tmpPath = $file['tmp_name'] ?? '';
        $contentType = $file['type'] ?? 'application/octet-stream';
        $fileSize = $file['size'] ?? 0;

        $checksum = is_file($tmpPath) ? hash_file('sha256', $tmpPath) : hash('sha256', $originalName . $this->nowIso());

        $uploadDir = $this->dataDir . '/uploads/evidence';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0775, true);
        }
        $storedName = $this->generateUuidV4() . '_' . basename($originalName);
        $storedPath = $uploadDir . '/' . $storedName;
        if (is_file($tmpPath)) {
            @move_uploaded_file($tmpPath, $storedPath);
        }

        $attachmentId = $this->generateUuidV4();

        try {
            $stmt = $db->prepare(
                "INSERT INTO attachment (attachment_id, entity_name, entity_id, file_name, storage_uri,
                                        checksum_sha256, content_type, file_size_bytes, uploaded_by_party_id)
                 VALUES (:aid, 'approval_group', :eid, :fn, :uri, :cs, :ct, :fs, :up)"
            );
            $stmt->execute([
                ':aid' => $attachmentId,
                ':eid' => $approvalGroupId,
                ':fn'  => $originalName,
                ':uri' => $storedPath,
                ':cs'  => $checksum,
                ':ct'  => $contentType,
                ':fs'  => $fileSize,
                ':up'  => $uploadedByPartyId,
            ]);
        } catch (\Throwable $e) {
            throw new \RuntimeException('Failed to create attachment: ' . $e->getMessage());
        }

        return $this->getGovernanceAttachment($attachmentId, $db) ?? [
            'attachment_id' => $attachmentId,
            'entity_name'   => 'approval_group',
            'entity_id'     => $approvalGroupId,
            'file_name'     => $originalName,
        ];
    }

    /**
     * Compute a strong ETag for an attachment row.
     */
    public function computeAttachmentETag(array $row): string
    {
        $canonical = json_encode([
            'attachment_id'    => $row['attachment_id'] ?? '',
            'checksum_sha256'  => $row['checksum_sha256'] ?? '',
            'row_version'      => (int)($row['row_version'] ?? 1),
            'updated_at'       => $row['updated_at'] ?? '',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return '"' . hash('sha256', $canonical) . '"';
    }

    /**
     * Verify the entire hash chain.
     *
     * Iterates all records by chain_sequence, re-computes each chain_hash,
     * and compares with the stored value.
     *
     * @return array{valid: bool, broken_at: ?int, total: int}
     */
    public function verifyChain(?string $evidenceId = null): array
    {
        $vault = $this->loadVault();

        // Sort by chain_sequence ascending
        usort($vault, fn(array $a, array $b) =>
            ((int)($a['chain_sequence'] ?? 0)) <=> ((int)($b['chain_sequence'] ?? 0)));

        $total         = count($vault);
        $prevChainHash = 'GENESIS';

        $found = $evidenceId === null;
        foreach ($vault as $idx => $rec) {
            if (!is_array($rec)) {
                continue;
            }

            $fileHash       = $rec['file_hash'] ?? '';
            $storedHash     = $rec['chain_hash'] ?? '';
            $expectedHash   = hash('sha256', $fileHash . $prevChainHash);

            if ($expectedHash !== $storedHash) {
                return [
                    'valid'     => false,
                    'broken_at' => (int)($rec['chain_sequence'] ?? $idx),
                    'total'     => $total,
                ];
            }

            if ($evidenceId !== null && (string)($rec['evidence_id'] ?? '') === $evidenceId) {
                $found = true;
                break;
            }

            $prevChainHash = $storedHash;
        }

        if (!$found) {
            return [
                'valid'     => false,
                'broken_at' => null,
                'total'     => $total,
                'error'     => 'evidence_not_found',
            ];
        }

        return [
            'valid'     => true,
            'broken_at' => null,
            'total'     => $total,
        ];
    }

    /**
     * Text search across evidence titles and descriptions.
     *
     * @param string $query Search string.
     * @return array<int, array<string, mixed>>
     */
    public function search(string $query): array
    {
        $vault  = $this->loadVault();
        $result = [];
        $q      = strtolower($query);

        foreach ($vault as $rec) {
            if (!is_array($rec)) {
                continue;
            }

            $title = strtolower($rec['title'] ?? '');
            $desc  = strtolower($rec['description'] ?? '');
            $fname = strtolower($rec['filename'] ?? '');

            if (strpos($title, $q) !== false
                || strpos($desc, $q) !== false
                || strpos($fname, $q) !== false) {
                $result[] = $rec;
            }
        }

        usort($result, fn(array $a, array $b) => strcmp($b['stored_at'] ?? '', $a['stored_at'] ?? ''));

        return $result;
    }

    /**
     * Get the latest evidence record in the chain (the chain head).
     *
     * @return array|null
     */
    public function getChainHead(): ?array
    {
        return $this->getChainHeadInternal($this->loadVault());
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private function getChainHeadInternal(array $vault): ?array
    {
        if (empty($vault)) {
            return null;
        }

        $head = null;
        $maxSeq = -1;

        foreach ($vault as $rec) {
            if (!is_array($rec)) {
                continue;
            }
            $seq = (int)($rec['chain_sequence'] ?? 0);
            if ($seq > $maxSeq) {
                $maxSeq = $seq;
                $head   = $rec;
            }
        }

        return $head;
    }

    private function loadVault(): array
    {
        return $this->readJson($this->vaultFile) ?? [];
    }

    private function saveVault(array $data): void
    {
        $this->writeJson($this->vaultFile, array_values($data));
    }

    private function loadCustody(): array
    {
        return $this->readJson($this->custodyFile) ?? [];
    }

    private function saveCustody(array $data): void
    {
        $this->writeJson($this->custodyFile, array_values($data));
    }

    private function loadLinks(): array
    {
        return $this->readJson($this->linksFile) ?? [];
    }

    private function saveLinks(array $data): void
    {
        $this->writeJson($this->linksFile, array_values($data));
    }

    private function readJson(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false) {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function writeJson(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $tmp  = $path . '.tmp.' . getmypid();
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Cannot write ' . basename($path));
        }
        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }

    private function generateUuidV4(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    // ── PostgreSQL Integration ─────────────────────────────────────────────

    /**
     * Insert evidence record into evidence_vault table.
     */
    private function pgInsertEvidence(array $record): void
    {
        if (!$this->pgWriteEnabled()) return;
        try {
            $db = $this->dataLayer->getConnection();
            if ($db === null) return;
            $meta = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $actorUuid = $this->resolveUserUuid($db, (string)($record['stored_by'] ?? ''));

            $db->execute(
                'INSERT INTO evidence_vault
                    (evidence_id, evidence_type, title, description, file_name, file_path,
                     file_hash_sha256, previous_hash, mime_type, file_size_bytes, chain_hash,
                     chain_sequence, uploaded_by, uploaded_at, metadata)
                 VALUES
                    (CAST(:eid AS uuid), CAST(:etype AS evidence_type_enum), :title, :desc, :fname, :fpath,
                     :fhash, :prevhash, :mime, :fsize, :chash,
                     :cseq, CAST(:user AS uuid), CAST(:uploaded_at AS timestamptz), CAST(:meta AS jsonb))
                 ON CONFLICT (evidence_id) DO NOTHING',
                [
                    ':eid'   => $record['evidence_id'],
                    ':etype' => $this->mapEvidenceType($record['type'] ?? 'document'),
                    ':title' => $record['title'] ?? '',
                    ':desc'  => $record['description'] ?? '',
                    ':fname' => $record['filename'] ?? $record['original_name'] ?? '',
                    ':fpath' => $record['stored_path'] ?? '',
                    ':fhash' => $record['file_hash'] ?? '',
                    ':prevhash' => $record['previous_hash'] ?? null,
                    ':mime'  => $record['mime_type'] ?? 'application/octet-stream',
                    ':fsize' => (int)($record['file_size'] ?? 0),
                    ':chash' => $record['chain_hash'] ?? '',
                    ':cseq'  => (int)($record['chain_sequence'] ?? 0),
                    ':user'  => $actorUuid,
                    ':uploaded_at' => $record['stored_at'] ?? $this->nowIso(),
                    ':meta'  => $meta,
                ]
            );
        } catch (\Throwable $e) {
            error_log('[EvidenceVaultService] PG insert evidence failed: ' . $e->getMessage());
        }
    }

    /**
     * Insert custody event into evidence_chain_custody table.
     */
    private function pgInsertCustody(array $event): void
    {
        if (!$this->pgWriteEnabled()) return;
        try {
            $db = $this->dataLayer->getConnection();
            if ($db === null) return;
            $custodyAction = $this->mapCustodyAction($event['action'] ?? 'accessed');
            $actorName = (string)($event['user'] ?? 'unknown');
            $actorUuid = $this->resolveUserUuid($db, $actorName);
            $details = json_encode([
                'source' => 'EvidenceVaultService',
                'raw_action' => (string)($event['action'] ?? ''),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $db->execute(
                'INSERT INTO evidence_chain_custody
                    (custody_id, evidence_id, action, actor_id, actor_name, reason, details, recorded_at)
                 VALUES
                    (CAST(:cid AS uuid), CAST(:eid AS uuid), CAST(:action AS custody_action_enum), CAST(:actor_id AS uuid), :actor_name, :reason, CAST(:details AS jsonb), CAST(:recorded_at AS timestamptz))
                 ON CONFLICT DO NOTHING',
                [
                    ':cid'         => $event['event_id'],
                    ':eid'         => $event['evidence_id'],
                    ':action'      => $custodyAction,
                    ':actor_id'    => $actorUuid,
                    ':actor_name'  => $actorName,
                    ':reason'      => $event['reason'] ?? null,
                    ':details'     => $details,
                    ':recorded_at' => $event['timestamp'] ?? $this->nowIso(),
                ]
            );
        } catch (\Throwable $e) {
            error_log('[EvidenceVaultService] PG insert custody failed: ' . $e->getMessage());
        }
    }

    /**
     * Insert link into evidence_links table.
     */
    private function pgInsertLink(array $linkRecord): void
    {
        if (!$this->pgWriteEnabled()) return;
        try {
            $db = $this->dataLayer->getConnection();
            if ($db === null) return;
            $linkedBy = (string)($linkRecord['linked_by'] ?? '');
            $linkedByUuid = $this->resolveUserUuid($db, $linkedBy);
            $metadata = json_encode([
                'note' => $linkRecord['note'] ?? null,
                'linked_by_name' => $linkedBy,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $db->execute(
                'INSERT INTO evidence_links
                    (link_id, evidence_id, linked_entity_type, linked_entity_id, linked_by, linked_at, metadata)
                 VALUES
                    (CAST(:lid AS uuid), CAST(:eid AS uuid), :etype, :entityid, CAST(:user AS uuid), CAST(:linked_at AS timestamptz), CAST(:metadata AS jsonb))
                 ON CONFLICT DO NOTHING',
                [
                    ':lid'       => $linkRecord['link_id'],
                    ':eid'       => $linkRecord['evidence_id'],
                    ':etype'     => $linkRecord['entity_type'] ?? '',
                    ':entityid'  => $linkRecord['entity_id'] ?? '',
                    ':user'      => $linkedByUuid,
                    ':linked_at' => $linkRecord['linked_at'] ?? $this->nowIso(),
                    ':metadata'  => $metadata,
                ]
            );
        } catch (\Throwable $e) {
            error_log('[EvidenceVaultService] PG insert link failed: ' . $e->getMessage());
        }
    }

    /**
     * Map evidence type to DB enum value.
     */
    private function mapEvidenceType(string $type): string
    {
        $type = strtolower(trim($type));
        $aliases = [
            'certificate' => 'material_cert',
            'cert' => 'material_cert',
            'measurement' => 'measurement_data',
            'measurement_data' => 'measurement_data',
            'machine' => 'machine_log',
            'machine_log' => 'machine_log',
            'log' => 'machine_log',
            'report' => 'test_report',
            'test_report' => 'test_report',
        ];
        $type = $aliases[$type] ?? $type;
        $valid = [
            'photo', 'video', 'document', 'measurement_data', 'machine_log',
            'material_cert', 'test_report', 'coc', 'coa', 'scan', 'email', 'other',
        ];
        return in_array($type, $valid, true) ? $type : 'document';
    }

    /**
     * Map custody action to DB enum value.
     */
    private function mapCustodyAction(string $action): string
    {
        $action = strtolower(trim($action));
        $aliases = [
            'stored' => 'uploaded',
            'store' => 'uploaded',
            'upload' => 'uploaded',
            'accessed' => 'viewed',
            'access' => 'viewed',
            'read' => 'viewed',
            'exported' => 'downloaded',
            'export' => 'downloaded',
            'download' => 'downloaded',
            'sealed' => 'verified',
            'released' => 'verified',
            'archived' => 'verified',
        ];
        $action = $aliases[$action] ?? $action;
        $valid = ['uploaded', 'viewed', 'downloaded', 'transferred', 'linked', 'unlinked', 'verified', 'flagged'];
        return in_array($action, $valid, true) ? $action : 'viewed';
    }

    private function resolveUserUuid(object $db, string $actor): ?string
    {
        $actor = trim($actor);
        if ($actor === '') {
            return null;
        }
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $actor) === 1) {
            return strtolower($actor);
        }

        try {
            if (method_exists($db, 'queryOne')) {
                $row = $db->queryOne(
                    'SELECT user_id FROM users WHERE username = :actor OR employee_id = :actor OR email = :actor LIMIT 1',
                    [':actor' => $actor],
                );
                if (is_array($row) && !empty($row['user_id'])) {
                    return (string)$row['user_id'];
                }
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }
}
