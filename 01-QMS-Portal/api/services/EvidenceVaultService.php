<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;

/**
 * Evidence Vault Service for HESEM QMS Portal.
 *
 * Tamper-evident digital evidence storage with SHA-256 hash chain,
 * custody logging, and entity linking. Ensures full traceability
 * of quality records, machine logs, and measurement data.
 *
 * @package HESEM\QMS\Services
 * @since   4.0.0
 */
final class EvidenceVaultService
{
    private readonly string $dataDir;
    private readonly string $evidenceDir;
    private readonly string $vaultFile;
    private readonly string $custodyFile;
    private readonly string $linksFile;

    // ── Construction ────────────────────────────────────────────────────────

    public function __construct(string $dataDir)
    {
        $this->dataDir     = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->evidenceDir = $this->dataDir . '/evidence';
        $this->vaultFile   = $this->evidenceDir . '/vault.json';
        $this->custodyFile = $this->evidenceDir . '/custody.json';
        $this->linksFile   = $this->evidenceDir . '/links.json';

        if (!is_dir($this->evidenceDir)) {
            @mkdir($this->evidenceDir, 0775, true);
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Store a new evidence record in the vault.
     *
     * Computes SHA-256 of the file content, extends the hash chain, and saves.
     *
     * @param array  $evidence Evidence data (must include 'file_hash' or 'content').
     * @param string $userId   Storing user.
     * @return array Created evidence record with chain metadata.
     */
    public function store(array $evidence, string $userId): array
    {
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
            'chain_hash'     => $chainHash,
            'chain_sequence' => $chainSequence,
            'stored_by'      => $userId,
            'stored_at'      => $now,
            'created_at'     => $now,
        ]);

        // Remove raw content from stored record (keep hash only)
        unset($record['content']);

        $vault[] = $record;
        $this->saveVault($vault);

        // Record initial custody event
        $this->recordCustody($record['evidence_id'], 'stored', $userId, 'Initial storage in vault');

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
     */
    public function link(string $evidenceId, string $entityType, string $entityId, string $userId): void
    {
        $links = $this->loadLinks();

        // Check for duplicate
        foreach ($links as $link) {
            if (is_array($link)
                && ($link['evidence_id'] ?? '') === $evidenceId
                && ($link['entity_type'] ?? '') === $entityType
                && ($link['entity_id'] ?? '') === $entityId) {
                return; // Already linked
            }
        }

        $links[] = [
            'link_id'      => $this->generateUuidV4(),
            'evidence_id'  => $evidenceId,
            'entity_type'  => $entityType,
            'entity_id'    => $entityId,
            'linked_at'    => $this->nowIso(),
            'linked_by'    => $userId,
        ];

        $this->saveLinks($links);
    }

    /**
     * Remove a link between evidence and an entity.
     */
    public function unlink(string $evidenceId, string $entityType, string $entityId, string $userId): void
    {
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
     * @param string      $action     Action (e.g., 'stored', 'accessed', 'exported', 'uploaded').
     * @param string      $userId     Acting user.
     * @param string|null $reason     Optional reason.
     */
    public function recordCustody(string $evidenceId, string $action, string $userId, ?string $reason = null): void
    {
        $custody = $this->loadCustody();

        $custody[] = [
            'event_id'    => $this->generateUuidV4(),
            'evidence_id' => $evidenceId,
            'action'      => $action,
            'user'        => $userId,
            'reason'      => $reason,
            'timestamp'   => $this->nowIso(),
        ];

        $this->saveCustody($custody);
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

    /**
     * Verify the entire hash chain.
     *
     * Iterates all records by chain_sequence, re-computes each chain_hash,
     * and compares with the stored value.
     *
     * @return array{valid: bool, broken_at: ?int, total: int}
     */
    public function verifyChain(): array
    {
        $vault = $this->loadVault();

        // Sort by chain_sequence ascending
        usort($vault, fn(array $a, array $b) =>
            ((int)($a['chain_sequence'] ?? 0)) <=> ((int)($b['chain_sequence'] ?? 0)));

        $total         = count($vault);
        $prevChainHash = 'GENESIS';

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

            $prevChainHash = $storedHash;
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
}
