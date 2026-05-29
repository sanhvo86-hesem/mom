<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * UoM Data Quality Scanner.
 *
 * Proactively surfaces data quality issues across the UoM subsystem.
 * All methods are read-only — no writes.
 *
 * Designed for:
 *   - Scheduled metrology review (run via admin UI or cron)
 *   - Pre-migration health checks
 *   - Regulatory audit preparation (FDA, ISO 9001 measurement traceability)
 *
 * Issues categories:
 *   QUARANTINE  — aliases awaiting human review after resolution failure
 *   ORPHAN      — item policies referencing inactive/deprecated units
 *   GAP         — unit pairs used in ITUOM with no direct conversion rule
 *   DENSITY     — materials needing volume↔mass conversion but missing density registry
 *   DRIFT       — MEASVAL records whose audit_hash is inconsistent (tamper indicator)
 *   STALE       — pending_review rules older than threshold
 */
final class UomDataQualityScanner
{
    private const STALE_REVIEW_DAYS     = 14;
    private const DENSITY_CHECK_UNITS   = ['L', 'ML', 'M3', 'CM3']; // volume units needing density

    public function __construct(private readonly Connection $db) {}

    /**
     * Run all scanners and return a consolidated health report.
     *
     * @return array{
     *   scanned_at: string,
     *   overall_status: 'OK'|'WARNING'|'CRITICAL',
     *   findings: array,
     *   totals: array,
     * }
     */
    public function fullScan(): array
    {
        $findings = [
            'quarantine'     => $this->scanQuarantinedAliases(),
            'orphan_policies'=> $this->scanOrphanedPolicies(),
            'conversion_gaps'=> $this->scanConversionGaps(),
            'density_missing'=> $this->scanMissingDensity(),
            'stale_reviews'  => $this->scanStaleReviews(),
            'ai_pending'     => $this->scanPendingAiAdvisories(),
        ];

        $totals = [
            'quarantine'      => count($findings['quarantine']),
            'orphan_policies' => count($findings['orphan_policies']),
            'conversion_gaps' => count($findings['conversion_gaps']),
            'density_missing' => count($findings['density_missing']),
            'stale_reviews'   => count($findings['stale_reviews']),
            'ai_pending'      => count($findings['ai_pending']),
        ];

        $total = array_sum($totals);
        $overallStatus = $total === 0 ? 'OK'
            : ($totals['orphan_policies'] > 0 || $totals['stale_reviews'] > 5 ? 'CRITICAL' : 'WARNING');

        return [
            'scanned_at'     => (new \DateTimeImmutable())->format(\DateTimeInterface::RFC3339),
            'overall_status' => $overallStatus,
            'findings'       => $findings,
            'totals'         => $totals,
            'total_issues'   => $total,
        ];
    }

    /**
     * Aliases in uom_alias_quarantine awaiting metrology team review.
     *
     * @return list<array{alias_string, source_system, first_seen_at, retry_count}>
     */
    public function scanQuarantinedAliases(): array
    {
        return $this->db->query(
            "SELECT alias_string, source_system, first_seen_at,
                    retry_count, last_attempt_at,
                    EXTRACT(DAY FROM now() - first_seen_at)::int AS days_pending
             FROM uom_alias_quarantine
             WHERE resolved_at IS NULL
             ORDER BY retry_count DESC, first_seen_at ASC
             LIMIT 200",
            []
        );
    }

    /**
     * Item UoM policy rows that reference units not currently 'active'.
     *
     * These are orphaned policies — the unit was deprecated or deactivated
     * after the policy was set. ConversionEngine will fail for these items
     * until the policy is updated.
     *
     * @return list<array{item_id, slot, unit_code, unit_status, policy_id}>
     */
    public function scanOrphanedPolicies(): array
    {
        return $this->db->query(
            "SELECT p.id AS policy_id, p.item_id, p.context_code,
                    slot.slot_name, slot.unit_code, u.lifecycle_status AS unit_status
             FROM item_uom_policy p
             CROSS JOIN LATERAL (
                 VALUES
                     ('inventory', p.inventory_unit_code),
                     ('purchase',  p.purchase_unit_code),
                     ('sales',     p.sales_unit_code),
                     ('recipe',    p.recipe_unit_code),
                     ('qc',        p.qc_unit_code)
             ) AS slot(slot_name, unit_code)
             JOIN uom_unit_catalog u ON u.canonical_code = slot.unit_code
             WHERE p.lifecycle_status = 'active'
               AND u.lifecycle_status <> 'active'
             ORDER BY p.item_id, slot.slot_name",
            []
        );
    }

    /**
     * Unit pairs that appear together in active ITUOM policies
     * but have no direct conversion rule in either direction.
     *
     * These gaps cause ConversionEngine to fall through to SI-base hop.
     * If both units lack si_factor, the hop also fails → runtime error.
     *
     * @return list<array{slot_a, unit_a, slot_b, unit_b, item_count, has_si_hop}>
     */
    public function scanConversionGaps(): array
    {
        $pairs = $this->db->query(
            "SELECT LEAST(p.inventory_unit_code, p.purchase_unit_code) AS unit_a,
                    GREATEST(p.inventory_unit_code, p.purchase_unit_code) AS unit_b,
                    COUNT(DISTINCT p.item_id) AS item_count
             FROM item_uom_policy p
             WHERE p.lifecycle_status = 'active'
               AND p.inventory_unit_code <> p.purchase_unit_code
             GROUP BY unit_a, unit_b
             UNION
             SELECT LEAST(p.inventory_unit_code, p.sales_unit_code),
                    GREATEST(p.inventory_unit_code, p.sales_unit_code),
                    COUNT(DISTINCT p.item_id)
             FROM item_uom_policy p
             WHERE p.lifecycle_status = 'active'
               AND p.inventory_unit_code <> p.sales_unit_code
             GROUP BY 1, 2",
            []
        );

        $gaps = [];
        foreach ($pairs as $pair) {
            $a = $pair['unit_a'];
            $b = $pair['unit_b'];

            $hasRule = $this->db->queryOne(
                "SELECT 1 FROM uom_conversion_rule
                 WHERE lifecycle_status = 'active'
                   AND ((from_unit_code = :a AND to_unit_code = :b)
                     OR (from_unit_code = :b AND to_unit_code = :a))
                 LIMIT 1",
                [':a' => $a, ':b' => $b]
            );

            if ($hasRule === null) {
                // Check if SI-base hop is possible
                $siRow = $this->db->queryOne(
                    "SELECT
                       (SELECT si_factor FROM uom_unit_catalog WHERE canonical_code = :a) AS fa,
                       (SELECT si_factor FROM uom_unit_catalog WHERE canonical_code = :b) AS fb",
                    [':a' => $a, ':b' => $b]
                );
                $hasSiHop = $siRow && $siRow['fa'] !== null && $siRow['fb'] !== null;

                $gaps[] = [
                    'unit_a'      => $a,
                    'unit_b'      => $b,
                    'item_count'  => (int)$pair['item_count'],
                    'has_si_hop'  => $hasSiHop,
                    'severity'    => $hasSiHop ? 'WARNING' : 'ERROR',
                ];
            }
        }

        return $gaps;
    }

    /**
     * Items where ITUOM uses a volume unit for inventory/purchase/sales
     * but no density record exists in material_density_registry.
     *
     * These items will fail volume↔mass conversion at runtime.
     *
     * @return list<array{item_id, slot, volume_unit, missing_density}>
     */
    public function scanMissingDensity(): array
    {
        $volumeList = "'" . implode("','", self::DENSITY_CHECK_UNITS) . "'";

        return $this->db->query(
            "SELECT p.item_id, slot.slot_name, slot.unit_code AS volume_unit
             FROM item_uom_policy p
             CROSS JOIN LATERAL (
                 VALUES
                     ('inventory', p.inventory_unit_code),
                     ('purchase',  p.purchase_unit_code),
                     ('sales',     p.sales_unit_code)
             ) AS slot(slot_name, unit_code)
             WHERE p.lifecycle_status = 'active'
               AND slot.unit_code IN ({$volumeList})
               AND NOT EXISTS (
                   SELECT 1 FROM material_density_registry
                   WHERE item_id = p.item_id AND lifecycle_status = 'active'
               )
             ORDER BY p.item_id",
            []
        );
    }

    /**
     * Conversion rules stuck in 'pending_review' longer than STALE_REVIEW_DAYS.
     *
     * @return list<array{rule_id, rule_code, from_unit, to_unit, days_pending, steps_completed}>
     */
    public function scanStaleReviews(): array
    {
        return $this->db->query(
            "SELECT r.id AS rule_id, r.rule_code, r.from_unit_code, r.to_unit_code,
                    EXTRACT(DAY FROM now() - r.created_at)::int AS days_pending,
                    COUNT(a.id) AS steps_completed
             FROM uom_conversion_rule r
             LEFT JOIN uom_rule_approval a ON a.rule_id = r.id AND a.rule_version = r.rule_version
             WHERE r.lifecycle_status = 'pending_review'
               AND r.created_at < now() - INTERVAL '" . self::STALE_REVIEW_DAYS . " days'
             GROUP BY r.id, r.rule_code, r.from_unit_code, r.to_unit_code, r.created_at
             ORDER BY days_pending DESC",
            []
        );
    }

    /**
     * AI advisory log entries awaiting human review.
     *
     * @return list<array{id, advisory_type, model_id, confidence, days_pending}>
     */
    public function scanPendingAiAdvisories(): array
    {
        return $this->db->query(
            "SELECT id, advisory_type, model_id, model_version,
                    confidence,
                    EXTRACT(DAY FROM now() - created_at)::int AS days_pending,
                    created_at
             FROM uom_ai_advisory_log
             WHERE human_reviewed = false
             ORDER BY created_at ASC
             LIMIT 100",
            []
        );
    }

    /**
     * Count active aliases per canonical code for a catalog health overview.
     *
     * @return list<array{canonical_code, display_label_en, alias_count, quarantine_count}>
     */
    public function catalogAliasHealth(): array
    {
        return $this->db->query(
            "SELECT u.canonical_code, u.display_label_en,
                    COUNT(DISTINCT a.id) FILTER (WHERE a.lifecycle_status = 'active') AS alias_count,
                    COUNT(DISTINCT q.id)                                              AS quarantine_count
             FROM uom_unit_catalog u
             LEFT JOIN uom_alias a ON a.canonical_code = u.canonical_code
             LEFT JOIN uom_alias_quarantine q ON q.alias_string IN (
                 SELECT alias_string FROM uom_alias WHERE canonical_code = u.canonical_code
             ) AND q.resolved_at IS NULL
             WHERE u.lifecycle_status = 'active'
             GROUP BY u.canonical_code, u.display_label_en
             ORDER BY alias_count DESC, u.canonical_code",
            []
        );
    }
}
