<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Resolves alias strings to canonical unit codes.
 *
 * Lookup priority (highest to lowest):
 *   1. Exact match in uom_unit_catalog (already canonical)
 *   2. Alias in uom_alias filtered by context_scope (SUPPLIER/CUSTOMER/SYSTEM)
 *   3. UNECE external code in uom_external_code_map
 *   4. OPC UA numeric UnitId in uom_external_code_map
 *
 * If resolution fails and the alias is unrecognised, it is submitted to
 * uom_alias_quarantine for human review. The caller receives
 * UomExternalCodeUnknownException so it can surface the quarantine notice.
 *
 * Alias codes are looked up case-insensitively (lower() index on alias_code).
 * Canonical codes remain case-sensitive (matching UCUM convention).
 */
final class UomAliasResolutionService
{
    private const CACHE_TTL = 1800;
    private const CACHE_PREFIX = 'uom:alias:';

    public function __construct(
        private readonly Connection $db,
        private readonly ?\Redis $redis = null
    ) {}

    /**
     * Resolve an alias to a canonical_code.
     *
     * @param string      $alias      Raw unit string from external source
     * @param string      $contextScope Context: SUPPLIER, CUSTOMER, SYSTEM
     * @param string|null $supplierId  Narrow lookup to specific supplier
     * @throws UomExternalCodeUnknownException If alias cannot be resolved
     */
    public function resolve(
        string  $alias,
        string  $contextScope = 'SYSTEM',
        ?string $supplierId = null
    ): string {
        $cacheKey = self::CACHE_PREFIX . strtolower($alias) . ':' . $contextScope . ':' . ($supplierId ?? '');
        $cached   = $this->cacheGet($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $canonical = $this->tryResolve($alias, $contextScope, $supplierId);

        if ($canonical === null) {
            $this->submitToQuarantine($alias, $contextScope, $supplierId);
            throw new UomExternalCodeUnknownException($contextScope, $alias);
        }

        $this->cacheSet($cacheKey, $canonical);
        return $canonical;
    }

    /**
     * Resolve an OPC UA UnitId (numeric) to a canonical_code.
     *
     * @param int $unitId   OPC UA EUInformation.UnitId (numeric, e.g. 4408 for kg)
     * @throws UomExternalCodeUnknownException if UnitId has no mapping
     */
    public function resolveOpcUaUnitId(int $unitId): string
    {
        $row = $this->db->queryOne(
            "SELECT canonical_code FROM uom_external_code_map
             WHERE external_system = 'OPC_UA'
               AND external_numeric_id = :id",
            [':id' => $unitId]
        );

        if ($row === null) {
            throw new UomExternalCodeUnknownException('OPC_UA', $unitId);
        }

        return (string)$row['canonical_code'];
    }

    /**
     * Resolve a UNECE Rec 20 three-letter code to a canonical_code.
     *
     * @param string $unece  e.g. 'KGM', 'MTR', 'LTR'
     * @throws UomExternalCodeUnknownException
     */
    public function resolveUnece(string $unece): string
    {
        $row = $this->db->queryOne(
            "SELECT canonical_code FROM uom_external_code_map
             WHERE external_system = 'UNECE_REC20'
               AND external_code = :code",
            [':code' => strtoupper($unece)]
        );

        if ($row === null) {
            throw new UomExternalCodeUnknownException('UNECE_REC20', $unece);
        }

        return (string)$row['canonical_code'];
    }

    private function tryResolve(string $alias, string $contextScope, ?string $supplierId): ?string
    {
        // 1. Exact match in catalog
        $row = $this->db->queryOne(
            "SELECT canonical_code FROM uom_unit_catalog
             WHERE canonical_code = :a AND lifecycle_status = 'active'",
            [':a' => $alias]
        );
        if ($row !== null) {
            return $row['canonical_code'];
        }

        // 2. Alias table (case-insensitive via lower() index)
        $params = [':alias' => strtolower($alias), ':ctx' => $contextScope];
        $supplierClause = '';
        if ($supplierId !== null) {
            $supplierClause = ' AND (supplier_id = :sid OR supplier_id IS NULL)';
            $params[':sid'] = $supplierId;
        }
        $row = $this->db->queryOne(
            "SELECT canonical_code FROM uom_alias
             WHERE lower(alias_code) = :alias
               AND context_scope = :ctx
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
               {$supplierClause}
             ORDER BY supplier_id NULLS LAST
             LIMIT 1",
            $params
        );
        if ($row !== null) {
            return $row['canonical_code'];
        }

        // 3. UNECE code
        $row = $this->db->queryOne(
            "SELECT canonical_code FROM uom_external_code_map
             WHERE external_system = 'UNECE_REC20' AND external_code = :a",
            [':a' => strtoupper($alias)]
        );
        if ($row !== null) {
            return $row['canonical_code'];
        }

        return null;
    }

    private function submitToQuarantine(string $alias, string $contextScope, ?string $supplierId): void
    {
        try {
            $this->db->execute(
                "INSERT INTO uom_alias_quarantine
                     (alias_code, context_scope, supplier_id, submitted_at, review_status)
                 VALUES (:a, :ctx, :sid, NOW(), 'PENDING')
                 ON CONFLICT DO NOTHING",
                [':a' => $alias, ':ctx' => $contextScope, ':sid' => $supplierId]
            );
        } catch (\Throwable) {
            // Quarantine write failure must not block the caller's error path.
        }
    }

    private function cacheGet(string $key): ?string
    {
        if ($this->redis === null) {
            return null;
        }
        try {
            $v = $this->redis->get($key);
            return is_string($v) ? $v : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function cacheSet(string $key, string $value): void
    {
        if ($this->redis === null) {
            return;
        }
        try {
            $this->redis->setex($key, self::CACHE_TTL, $value);
        } catch (\Throwable) {
        }
    }
}
