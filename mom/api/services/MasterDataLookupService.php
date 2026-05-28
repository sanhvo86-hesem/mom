<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;

/**
 * MasterDataLookupService — single read-only adapter for the part /
 * customer / revision lookups the AEOI validation pipeline needs.
 *
 * Source priority:
 *   1. POSTGRES_PRIMARY (USE_POSTGRES=1 + Connection wired) → query the
 *      customers + items + item_revisions tables. These installs have no
 *      master-data.json, so JSON-first would always fail-closed and keep
 *      every AEOI case blocked on master_data_lookup_unavailable. This
 *      was the Phase-4 follow-up to P0-08, landed 2026-05-28.
 *   2. Otherwise → fall back to master-data.json (legacy JSON_ONLY +
 *      dev installs).
 *
 * Both paths populate the same in-memory shape so callers don't branch:
 *   { customers: [...], parts: [...], revisions: [...] }
 *
 * Read-only. DataSyncMutationService is still the sole writer to
 * master-data.json; the customers/items/item_revisions tables are
 * written through the master-data admin UI and sync pipeline.
 *
 * Per GPT Pro audit P0-08, an unavailable lookup is a configuration_error
 * blocker — never a silent pass.
 *
 * @package MOM\Api\Services
 */
final class MasterDataLookupService
{
    private const MASTER_DATA_FILE = '/master-data/master-data.json';

    /** @var array<string,mixed>|null Per-request cache, null until first load. */
    private ?array $cache = null;

    /** Which path served the cache: 'postgres' | 'json'. Null until loadMaster() succeeds. */
    private ?string $source = null;

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
        try {
            $this->loadMaster();
            return $this->source === 'postgres'
                ? 'ok (postgres: customers + items + item_revisions)'
                : 'ok (json: ' . $this->dataDir . self::MASTER_DATA_FILE . ')';
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

        // POSTGRES_PRIMARY installs hold the master data in tables, not in
        // master-data.json. Trying disk first would always fail and gate
        // every AEOI case on master_data_lookup_unavailable.
        if ($this->isPostgresEnabled() && $this->db !== null) {
            try {
                $loaded = $this->loadMasterFromPg($this->db);
            } catch (\Throwable $e) {
                throw new \RuntimeException(
                    'postgres lookup failed: ' . $e->getMessage(),
                    0,
                    $e
                );
            }
            $this->cache  = $loaded;
            $this->source = 'postgres';
            return $loaded;
        }

        $loaded       = $this->loadMasterFromJson();
        $this->cache  = $loaded;
        $this->source = 'json';
        return $loaded;
    }

    /**
     * Verified live 2026-05-28: the actively-populated tables on the
     * POSTGRES_PRIMARY install are `customers`, `items` (plural), and
     * `item_revisions` (plural). The singular `item` / `item_revision`
     * tables exist but are empty placeholders for a future redesign —
     * reading them would break this lookup.
     *
     * item_revisions uses SCD2 (`valid_to IS NULL` ⇒ currently valid);
     * we collapse the lifecycle into a single `status` key so
     * isRevisionReleased() works on the row directly. An expired
     * revision becomes "superseded" (caller treats as not_released);
     * a current revision keeps its `change_type` as status.
     *
     * @return array{customers: list<array<string,mixed>>, parts: list<array<string,mixed>>, revisions: list<array<string,mixed>>}
     */
    private function loadMasterFromPg(Connection $db): array
    {
        $customers = $db->query(
            'SELECT customer_id, customer_name, customer_status
               FROM customers'
        );
        $parts = $db->query(
            'SELECT item_id           AS part_number,
                    description       AS part_description,
                    item_status::text AS status,
                    drawing_revision  AS revision
               FROM items'
        );
        $revisions = $db->query(
            "SELECT item_id AS part_number,
                    rev     AS revision_number,
                    CASE WHEN valid_to IS NULL
                         THEN lower(change_type)
                         ELSE 'superseded'
                    END     AS status,
                    valid_to
               FROM item_revisions"
        );

        return [
            'customers' => array_values($customers),
            'parts'     => array_values($parts),
            'revisions' => array_values($revisions),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function loadMasterFromJson(): array
    {
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
        return $decoded;
    }

    private function isPostgresEnabled(): bool
    {
        $raw = getenv('USE_POSTGRES');
        if ($raw === false || $raw === '') {
            return false;
        }
        return filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) === true;
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
