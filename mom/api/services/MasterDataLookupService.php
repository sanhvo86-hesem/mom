<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;

/**
 * MasterDataLookupService — single read-only adapter for the part /
 * customer / revision lookups the AEOI validation pipeline needs.
 *
 * Why a dedicated service:
 *   The HESEM repo stores master data across both Postgres tables (when
 *   POSTGRES_PRIMARY mode is on) and master-data.json (legacy JSON_ONLY
 *   mode + dev installs). Different services were re-implementing the
 *   lookup with subtly different field names, and a few were silently
 *   "passing" when the table existed but had a different schema. Per
 *   GPT Pro audit P0-08, validation must NOT silently pass when master
 *   data lookup is unavailable — that's a configuration_error blocker,
 *   not a "skip with warning".
 *
 * Schema tolerance:
 *   - customers/parts JSON files use one shape per install (we accept
 *     `customer_id`, `customerId`, `id` for the customer key).
 *   - PG `customers` / `parts` / `part_revisions` tables (where present)
 *     use snake_case columns; we don't query them yet but the service
 *     leaves the door open for a follow-up.
 *
 * @package MOM\Api\Services
 */
final class MasterDataLookupService
{
    private const MASTER_DATA_FILE = '/master-data/master-data.json';

    /** @var array<string,mixed>|null Cached file contents, null until first read. */
    private ?array $cache = null;

    public function __construct(
        private readonly string $dataDir,
        /**
         * @phpstan-ignore-next-line property.unused — reserved for the
         *  PG-table lookup path (Phase 4). Today we only consult the
         *  JSON master-data file; injecting the connection now keeps
         *  the constructor stable when the DB path lands.
         */
        private readonly ?Connection $db = null
    ) {}

    // ── Customer ────────────────────────────────────────────────────────

    /**
     * Find a customer by id (preferred), name fallback. Returns null when
     * the master data file is reachable but no match exists. Throws on
     * "lookup is broken" (file missing, permission denied, malformed
     * JSON) so the caller treats it as a configuration_error.
     *
     * @return ?array<string,mixed>
     */
    public function findCustomer(string $customerId, string $customerName = ''): ?array
    {
        $master    = $this->loadMaster();
        $customers = is_array($master['customers'] ?? null) ? $master['customers'] : [];

        $idLower   = strtolower(trim($customerId));
        $nameLower = strtolower(trim($customerName));

        foreach ($customers as $c) {
            if (!is_array($c)) continue;
            $cid = strtolower((string)($c['customer_id'] ?? $c['customerId'] ?? $c['id'] ?? ''));
            if ($idLower !== '' && $cid === $idLower) {
                return $c;
            }
        }
        if ($nameLower !== '') {
            foreach ($customers as $c) {
                if (!is_array($c)) continue;
                $cname = strtolower((string)($c['customer_name'] ?? $c['name'] ?? ''));
                if ($cname === $nameLower) {
                    return $c;
                }
            }
        }
        return null;
    }

    // ── Part ────────────────────────────────────────────────────────────

    /**
     * Find a part row by part_number (exact, case-sensitive — part numbers
     * are identity codes, not labels). Returns null when not found.
     *
     * @return ?array<string,mixed>
     */
    public function findPart(string $partNumber): ?array
    {
        $partNumber = trim($partNumber);
        if ($partNumber === '') {
            return null;
        }
        $master = $this->loadMaster();
        $parts  = is_array($master['parts'] ?? null) ? $master['parts'] : [];
        foreach ($parts as $p) {
            if (!is_array($p)) continue;
            if ((string)($p['part_number'] ?? $p['partNumber'] ?? $p['id'] ?? '') === $partNumber) {
                return $p;
            }
        }
        return null;
    }

    /**
     * Find a revision row for a given part. We accept three storage
     * shapes:
     *   1. `master.revisions` array with {part_number, revision_number, status}
     *   2. `part.revisions[]` embedded inside the part row
     *   3. Just the `revision` field on the part row (single-revision items)
     *
     * Returns null when no match. The caller decides whether "not found"
     * is a blocker (SO commit) or a warning (CPO commit).
     *
     * @return ?array<string,mixed>
     */
    public function findRevisionForPart(string $partNumber, string $revisionNumber): ?array
    {
        $revisionNumber = trim($revisionNumber);
        if ($partNumber === '' || $revisionNumber === '') {
            return null;
        }
        $partNumber = trim($partNumber);
        $master = $this->loadMaster();

        // Shape 1: top-level revisions table
        $revisions = is_array($master['revisions'] ?? null) ? $master['revisions'] : [];
        foreach ($revisions as $r) {
            if (!is_array($r)) continue;
            $rPart = (string)($r['part_number'] ?? $r['partNumber'] ?? '');
            $rRev  = (string)($r['revision_number'] ?? $r['revision'] ?? '');
            if ($rPart === $partNumber && strcasecmp($rRev, $revisionNumber) === 0) {
                return $r;
            }
        }

        // Shapes 2 + 3 hang off the part row
        $part = $this->findPart($partNumber);
        if (!is_array($part)) {
            return null;
        }
        // Shape 2
        if (is_array($part['revisions'] ?? null)) {
            foreach ($part['revisions'] as $r) {
                if (!is_array($r)) continue;
                $rRev = (string)($r['revision_number'] ?? $r['revision'] ?? '');
                if (strcasecmp($rRev, $revisionNumber) === 0) {
                    return $r;
                }
            }
        }
        // Shape 3
        $singleRev = (string)($part['revision'] ?? $part['current_revision'] ?? '');
        if ($singleRev !== '' && strcasecmp($singleRev, $revisionNumber) === 0) {
            return [
                'part_number'     => $partNumber,
                'revision_number' => $singleRev,
                'status'          => (string)($part['status'] ?? $part['revision_status'] ?? ''),
                'released'        => $this->isReleasedFlag($part),
            ];
        }
        return null;
    }

    /**
     * True when the revision row is considered released-current and safe
     * for production commit. Accepts several status flags because the
     * JSON shape varies per install.
     *
     * @param array<string,mixed> $revision
     */
    public function isRevisionReleased(array $revision): bool
    {
        $status = strtolower((string)($revision['status']
                            ?? $revision['revision_status']
                            ?? $revision['engineering_status']
                            ?? ''));
        if (in_array($status, ['released', 'current', 'active', 'production'], true)) {
            return true;
        }
        if (in_array($status, ['draft', 'pending_release', 'pending', 'obsolete', 'superseded', 'on_hold'], true)) {
            return false;
        }
        // Boolean fallbacks
        if (isset($revision['released']) && $revision['released'] === true) {
            return true;
        }
        if (isset($revision['is_released']) && $revision['is_released'] === true) {
            return true;
        }
        // Conservative default: unknown status → treat as NOT released.
        return false;
    }

    // ── Health / availability ───────────────────────────────────────────

    /**
     * Returns true when the lookup is functional (file readable + JSON
     * parses + has the expected top-level keys). Used by validation to
     * decide between "unknown_part" (blocker) vs "master_data_lookup_
     * unavailable" (configuration_error).
     */
    public function isAvailable(): bool
    {
        try {
            $master = $this->loadMaster();
            return is_array($master)
                && (isset($master['customers']) || isset($master['parts']));
        } catch (\Throwable) {
            return false;
        }
    }

    public function describeAvailability(): string
    {
        $file = $this->dataDir . self::MASTER_DATA_FILE;
        if (!is_file($file)) {
            return "master-data.json not found at $file";
        }
        if (!is_readable($file)) {
            return "master-data.json not readable at $file";
        }
        try {
            $this->loadMaster();
            return 'ok';
        } catch (\Throwable $e) {
            return $e->getMessage();
        }
    }

    // ── Internals ───────────────────────────────────────────────────────

    /**
     * @return array<string,mixed>
     */
    private function loadMaster(): array
    {
        if ($this->cache !== null) {
            return $this->cache;
        }
        $file = $this->dataDir . self::MASTER_DATA_FILE;
        if (!is_file($file) || !is_readable($file)) {
            throw new \RuntimeException('master-data.json not readable at ' . $file);
        }
        $raw = file_get_contents($file);
        if ($raw === false) {
            throw new \RuntimeException('Cannot read master-data.json');
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('master-data.json is not valid JSON');
        }
        $this->cache = $decoded;
        return $decoded;
    }

    /**
     * @param array<string,mixed> $part
     */
    private function isReleasedFlag(array $part): bool
    {
        $status = strtolower((string)($part['engineering_status']
                            ?? $part['status']
                            ?? ''));
        return in_array($status, ['released', 'current', 'active', 'production'], true);
    }
}
