<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Item UoM Policy (ITUOM) resolution service.
 *
 * Implements the 8-level priority resolution for choosing the correct
 * unit slot for a given item in a given business context.
 *
 * Priority (highest → lowest):
 *   1. item_id + site_id + supplier_id + customer_id + context_code
 *   2. item_id + site_id + supplier_id + context_code
 *   3. item_id + site_id + customer_id + context_code
 *   4. item_id + site_id + context_code
 *   5. item_id + supplier_id + context_code
 *   6. item_id + customer_id + context_code
 *   7. item_id + context_code (STANDARD context)
 *   8. item_id fallback (first active policy for item)
 *
 * The five canonical unit slots per policy row:
 *   - inventory_unit_code  — stock counting, ledger, WIP
 *   - purchase_unit_code   — PO lines, GR
 *   - sales_unit_code      — SO lines, delivery
 *   - recipe_unit_code     — BOM/recipe ingredients
 *   - qc_unit_code         — inspection results, test records
 *
 * ISA-88 note: recipe_unit_code is what BatchManager uses for parameter
 * scaling. Any unit-of-quantity change in a recipe must update this field
 * and re-sign the recipe via the approval workflow.
 *
 * Redis cache: key `uom:ituom:{item_id}:{site}:{supp}:{cust}:{ctx}`, TTL 1800s.
 */
final class ItemUomPolicyService
{
    private const CACHE_TTL    = 1800;
    private const CACHE_PREFIX = 'uom:ituom:';

    public function __construct(
        private readonly Connection $db,
        private readonly ?\Redis $redis = null
    ) {}

    /**
     * Resolve the effective ITUOM policy for an item in a given context.
     *
     * @param string      $itemId       Item code / part number
     * @param string|null $siteId       Facility / plant code
     * @param string|null $supplierId   Supplier code (for purchase context)
     * @param string|null $customerId   Customer code (for sales context)
     * @param string      $contextCode  'STANDARD' | 'EDI' | 'LEGACY' | custom
     * @return array{
     *   item_id:              string,
     *   inventory_unit_code:  string,
     *   purchase_unit_code:   string,
     *   sales_unit_code:      string,
     *   recipe_unit_code:     string,
     *   qc_unit_code:         string,
     *   resolved_priority:    int,
     *   policy_id:            string,
     *   effective_from:       string,
     * }|null  Returns null when no policy exists for the item.
     */
    public function resolve(
        string  $itemId,
        ?string $siteId       = null,
        ?string $supplierId   = null,
        ?string $customerId   = null,
        string  $contextCode  = 'STANDARD'
    ): ?array {
        $cacheKey = self::CACHE_PREFIX . implode(':', [
            $itemId,
            $siteId       ?? '',
            $supplierId   ?? '',
            $customerId   ?? '',
            $contextCode,
        ]);

        $cached = $this->cacheGet($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $policy = $this->resolveByPriority($itemId, $siteId, $supplierId, $customerId, $contextCode);

        if ($policy !== null) {
            $this->cacheSet($cacheKey, $policy);
        }

        return $policy;
    }

    /**
     * Get the unit code for a specific slot in a given context.
     *
     * @param string $slot  One of: 'inventory', 'purchase', 'sales', 'recipe', 'qc'
     * @throws UomException if slot is invalid or no policy found
     */
    public function getSlotUnit(
        string  $itemId,
        string  $slot,
        ?string $siteId     = null,
        ?string $supplierId = null,
        ?string $customerId = null,
        string  $contextCode = 'STANDARD'
    ): ?string {
        $validSlots = ['inventory', 'purchase', 'sales', 'recipe', 'qc'];
        if (!in_array($slot, $validSlots, true)) {
            throw new UomException(
                'UOM_INVALID_SLOT',
                "Invalid slot '{$slot}'. Valid slots: " . implode(', ', $validSlots),
                400
            );
        }

        $policy = $this->resolve($itemId, $siteId, $supplierId, $customerId, $contextCode);
        return $policy ? $policy[$slot . '_unit_code'] : null;
    }

    /**
     * Resolve the packaging policy for an item.
     *
     * Returns the inner/outer/pallet tier configuration seeded in
     * item_packaging_policy. Packaging tiers are ITUOM_ONLY — they have
     * no physical conversion factors and cannot be passed to ConversionEngine.
     */
    public function resolvePackaging(
        string  $itemId,
        ?string $siteId     = null,
        ?string $supplierId = null,
        ?string $customerId = null
    ): ?array {
        $row = $this->db->queryOne(
            "SELECT id, item_id, site_id, supplier_id, customer_id,
                    inner_pack_label, inner_pack_label_vi, inner_pack_qty,
                    outer_pack_label, outer_pack_label_vi, outer_pack_qty,
                    pallet_label, pallet_label_vi, pallet_qty,
                    outer_pack_weight_kg, outer_pack_length_mm,
                    outer_pack_width_mm, outer_pack_height_mm,
                    effective_from, effective_to
             FROM item_packaging_policy
             WHERE item_id = :item
               AND (site_id = :site OR site_id IS NULL)
               AND (supplier_id = :supp OR supplier_id IS NULL)
               AND (customer_id = :cust OR customer_id IS NULL)
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
             ORDER BY
               (CASE WHEN site_id     IS NOT NULL THEN 1 ELSE 0 END) DESC,
               (CASE WHEN supplier_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
               (CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
               effective_from DESC
             LIMIT 1",
            [
                ':item' => $itemId,
                ':site' => $siteId,
                ':supp' => $supplierId,
                ':cust' => $customerId,
            ]
        );

        return $row;
    }

    /**
     * List all active policies for an item (for admin/audit views).
     *
     * @return list<array>
     */
    public function listPolicies(string $itemId): array
    {
        return $this->db->query(
            "SELECT id, item_id, site_id, supplier_id, customer_id,
                    context_code, inventory_unit_code, purchase_unit_code,
                    sales_unit_code, recipe_unit_code, qc_unit_code,
                    lifecycle_status, version, effective_from, effective_to
             FROM item_uom_policy
             WHERE item_id = :item
               AND lifecycle_status = 'active'
             ORDER BY effective_from DESC",
            [':item' => $itemId]
        );
    }

    // ── 8-level priority resolution ───────────────────────────────────────────

    private function resolveByPriority(
        string  $itemId,
        ?string $siteId,
        ?string $supplierId,
        ?string $customerId,
        string  $contextCode
    ): ?array {
        $candidates = [
            // Priority 1: all four context dimensions match
            [1, $siteId, $supplierId, $customerId, $contextCode],
            // Priority 2: site + supplier
            [2, $siteId, $supplierId, null, $contextCode],
            // Priority 3: site + customer
            [3, $siteId, null, $customerId, $contextCode],
            // Priority 4: site only
            [4, $siteId, null, null, $contextCode],
            // Priority 5: supplier only
            [5, null, $supplierId, null, $contextCode],
            // Priority 6: customer only
            [6, null, null, $customerId, $contextCode],
            // Priority 7: context_code only
            [7, null, null, null, $contextCode],
            // Priority 8: STANDARD context fallback
            [8, null, null, null, 'STANDARD'],
        ];

        foreach ($candidates as [$priority, $site, $supp, $cust, $ctx]) {
            $row = $this->db->queryOne(
                "SELECT id, item_id, inventory_unit_code, purchase_unit_code,
                        sales_unit_code, recipe_unit_code, qc_unit_code,
                        effective_from
                 FROM item_uom_policy
                 WHERE item_id = :item
                   AND lifecycle_status = 'active'
                   AND context_code = :ctx
                   AND site_id " . ($site === null ? 'IS NULL' : '= :site') . "
                   AND supplier_id " . ($supp === null ? 'IS NULL' : '= :supp') . "
                   AND customer_id " . ($cust === null ? 'IS NULL' : '= :cust') . "
                   AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
                 ORDER BY effective_from DESC
                 LIMIT 1",
                array_filter([
                    ':item' => $itemId,
                    ':ctx'  => $ctx,
                    ':site' => $site,
                    ':supp' => $supp,
                    ':cust' => $cust,
                ], static fn ($v) => $v !== null)
            );

            if ($row !== null) {
                return array_merge($row, ['resolved_priority' => $priority]);
            }
        }

        return null;
    }

    private function cacheGet(string $key): ?array
    {
        if ($this->redis === null) {
            return null;
        }
        try {
            $raw = $this->redis->get($key);
            return is_string($raw) ? json_decode($raw, true, flags: JSON_THROW_ON_ERROR) : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function cacheSet(string $key, array $data): void
    {
        if ($this->redis === null) {
            return;
        }
        try {
            $this->redis->setex($key, self::CACHE_TTL, json_encode($data, JSON_THROW_ON_ERROR));
        } catch (\Throwable) {
        }
    }
}
