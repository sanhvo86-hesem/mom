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
 * Source selection (Phase 4, 2026-05-28):
 *   - If `USE_POSTGRES=1` AND a Connection is injected, read from PG
 *     `customers`, `item`, `item_revisions` tables. This is the
 *     production path.
 *   - Else fall back to `mom/data/master-data/master-data.json`. Used by
 *     JSON_ONLY installs (legacy + local dev).
 *   The two paths return the same in-memory shape so callers don't care.
 *
 * Schema tolerance (JSON path):
 *   - customers/parts JSON files use one shape per install (we accept
 *     `customer_id`, `customerId`, `id` for the customer key).
 *
 * @package MOM\Api\Services
 */
final class MasterDataLookupService
{
    private const MASTER_DATA_FILE = '/master-data/master-data.json';

    /** @var array<string,mixed>|null Cached master data, null until first load. */
    private ?array $cache = null;

    /** @var string|null Which source actually populated $cache ('postgres' | 'json'). */
    private ?string $cacheSource = null;

    public function __construct(
        private readonly string $dataDir,
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
     * parses + has the expected top-level keys, OR PG tables queryable).
     * Used by validation to decide between "unknown_part" (blocker) vs
     * "master_data_lookup_unavailable" (configuration_error).
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
        try {
            $this->loadMaster();
            return $this->cacheSource === 'postgres'
                ? 'ok (source=postgres)'
                : 'ok (source=json)';
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

        if ($this->shouldUsePostgres()) {
            $this->cache = $this->loadFromPostgres();
            $this->cacheSource = 'postgres';
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
        $this->cacheSource = 'json';
        return $decoded;
    }

    private function shouldUsePostgres(): bool
    {
        if ($this->db === null) {
            return false;
        }
        $usePostgres = getenv('USE_POSTGRES');
        return $usePostgres === '1' || $usePostgres === 'true';
    }

    /**
     * Read customers/item/item_revisions from PG and shape into the
     * same dict the JSON path returns. Empty arrays are acceptable
     * (means no rows yet) — only a failed query is a fatal error.
     *
     * @return array<string,mixed>
     */
    private function loadFromPostgres(): array
    {
        if ($this->db === null) {
            throw new \RuntimeException('loadFromPostgres called without DB connection');
        }

        $customers = $this->db->query(
            'SELECT customer_id, customer_name, customer_status,
                    customer_type, contact_email, payment_terms,
                    currency_default
               FROM customers
              WHERE customer_status = :p_status
              ORDER BY customer_id',
            [':p_status' => 'active']
        );

        $items = $this->db->query(
            'SELECT item_code, item_name, item_type, base_uom_code,
                    status_code, product_family_code
               FROM item
              WHERE status_code = :p_status
              ORDER BY item_code',
            [':p_status' => 'active']
        );

        $revisions = $this->db->query(
            'SELECT item_id AS part_number,
                    rev      AS revision_number,
                    change_type,
                    description,
                    valid_from,
                    valid_to,
                    eco_number
               FROM item_revisions
              WHERE deleted_at IS NULL
              ORDER BY item_id, rev',
            []
        );

        // Map PG columns to the same keys the JSON shape uses, so downstream
        // findPart/findRevision logic works unchanged.
        $partsShaped = array_map(static function (array $row): array {
            return [
                'part_number'      => (string)$row['item_code'],
                'part_description' => (string)($row['item_name'] ?? ''),
                'uom'              => (string)($row['base_uom_code'] ?? ''),
                'status'           => (string)($row['status_code'] ?? ''),
                'item_type'        => (string)($row['item_type'] ?? ''),
                'product_family'   => (string)($row['product_family_code'] ?? ''),
            ];
        }, $items);

        $revisionsShaped = array_map(static function (array $row): array {
            $validFrom = $row['valid_from'] ?? null;
            $validTo   = $row['valid_to']   ?? null;
            // Released = currently in the valid window (no end date, or end is future)
            $released = $validTo === null || $validTo === '' || strtotime((string)$validTo) > time();
            return [
                'part_number'     => (string)$row['part_number'],
                'revision_number' => (string)$row['revision_number'],
                'change_type'     => (string)($row['change_type'] ?? ''),
                'description'     => (string)($row['description'] ?? ''),
                'valid_from'      => $validFrom,
                'valid_to'        => $validTo,
                'eco_number'      => (string)($row['eco_number'] ?? ''),
                'status'          => $released ? 'released' : 'obsolete',
                'released'        => $released,
            ];
        }, $revisions);

        return [
            'customers' => $customers,
            'parts'     => $partsShaped,
            'revisions' => $revisionsShaped,
            '_meta'     => [
                'source'         => 'postgres',
                'loaded_at'      => date(DATE_ATOM),
                'customer_count' => count($customers),
                'part_count'     => count($partsShaped),
                'revision_count' => count($revisionsShaped),
            ],
        ];
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
