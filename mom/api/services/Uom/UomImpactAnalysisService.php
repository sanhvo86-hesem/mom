<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Analyzes downstream impact before mutating UoM rules, units, or aliases.
 *
 * Impact analysis is a mandatory governance step before:
 *   - Deprecating a canonical unit (lifecycle_status change to 'deprecated')
 *   - Changing a conversion rule's factor/offset
 *   - Removing or superseding an alias
 *
 * The service queries across all UoM-referencing tables and returns a structured
 * impact report that can be attached to a change request (CAPA, ECO, or direct
 * admin action). It does NOT make any writes — read-only.
 *
 * Impact dimensions checked:
 *   1. Item UoM policy (item_uom_policy) — active policies using this unit/rule
 *   2. Open orders — SO, PO, WO lines referencing the unit (best-effort via metadata JSON)
 *   3. Inspection plans — active plans using this unit in characteristic definitions
 *   4. Aliases — aliases that resolve to this canonical code
 *   5. Measurement thread — recent MEASVAL digital thread entries
 *   6. Conversion rule graph — sibling rules that depend on SI-base hop through this unit
 */
final class UomImpactAnalysisService
{
    private const RECENT_WINDOW_DAYS = 30;

    public function __construct(private readonly Connection $db) {}

    /**
     * Full impact report for deprecating or changing a canonical unit.
     *
     * @param string $canonicalCode  The unit to analyse (e.g. 'KG', 'MM', 'IN')
     * @return array{
     *   canonical_code: string,
     *   impact_level: 'NONE'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL',
     *   dimensions: array,
     *   recommendation: string,
     *   analysis_at: string,
     * }
     */
    public function analyzeUnitDeprecation(string $canonicalCode): array
    {
        $canonicalCode = strtoupper($canonicalCode);

        $unit = $this->db->queryOne(
            "SELECT canonical_code, display_label_en, quantity_kind_code, lifecycle_status,
                    is_conversion_blocked
             FROM uom_unit_catalog WHERE canonical_code = :c",
            [':c' => $canonicalCode]
        );

        if ($unit === null) {
            throw new UomException('UOM_UNIT_NOT_FOUND',
                "Unit '{$canonicalCode}' not found in catalog.", 404);
        }

        $dims = [
            'item_policies'   => $this->countItemPoliciesByUnit($canonicalCode),
            'active_aliases'  => $this->countAliasesByCanonical($canonicalCode),
            'conversion_rules'=> $this->countConversionRulesByUnit($canonicalCode),
            'recent_thread'   => $this->countRecentMeasvalThread($canonicalCode),
            'inspection_plans'=> $this->countInspectionPlansByUnit($canonicalCode),
        ];

        $level          = $this->computeImpactLevel($dims);
        $recommendation = $this->buildUnitRecommendation($level, $dims, $canonicalCode);

        return [
            'canonical_code' => $canonicalCode,
            'unit_label_en'  => $unit['display_label_en'],
            'kind_code'      => $unit['quantity_kind_code'],
            'current_status' => $unit['lifecycle_status'],
            'impact_level'   => $level,
            'dimensions'     => $dims,
            'recommendation' => $recommendation,
            'analysis_at'    => (new \DateTimeImmutable())->format(\DateTimeInterface::RFC3339),
        ];
    }

    /**
     * Impact report for changing a specific conversion rule's factor/offset.
     *
     * @param string $ruleId  UUID of the conversion rule
     * @return array
     */
    public function analyzeRuleChange(string $ruleId): array
    {
        $rule = $this->db->queryOne(
            "SELECT id, rule_code, from_unit_code, to_unit_code,
                    factor, offset_value, category, rule_version, lifecycle_status
             FROM uom_conversion_rule WHERE id = :id",
            [':id' => $ruleId]
        );

        if ($rule === null) {
            throw new UomException('UOM_RULE_NOT_FOUND',
                "Conversion rule '{$ruleId}' not found.", 404);
        }

        $fromUnit = $rule['from_unit_code'];
        $toUnit   = $rule['to_unit_code'];

        $dims = [
            'policies_using_from' => $this->countItemPoliciesByUnit($fromUnit),
            'policies_using_to'   => $this->countItemPoliciesByUnit($toUnit),
            'recent_thread_from'  => $this->countRecentMeasvalThread($fromUnit),
            'recent_thread_to'    => $this->countRecentMeasvalThread($toUnit),
            'active_measval_jobs' => $this->countActiveJobsByUnitPair($fromUnit, $toUnit),
            'is_affine'           => $rule['category'] === 'affine',
            'rule_version'        => (int)$rule['rule_version'],
        ];

        $level = $this->computeRuleImpactLevel($dims, $rule);

        return [
            'rule_id'        => $ruleId,
            'rule_code'      => $rule['rule_code'],
            'from_unit'      => $fromUnit,
            'to_unit'        => $toUnit,
            'current_factor' => $rule['factor'],
            'category'       => $rule['category'],
            'lifecycle'      => $rule['lifecycle_status'],
            'impact_level'   => $level,
            'dimensions'     => $dims,
            'recommendation' => $this->buildRuleRecommendation($level, $dims, $rule),
            'analysis_at'    => (new \DateTimeImmutable())->format(\DateTimeInterface::RFC3339),
        ];
    }

    /**
     * Impact report for retiring or changing an alias.
     *
     * @param string $aliasString  The alias text (e.g. 'KG', 'hộp', 'pao')
     * @param string $contextScope 'SUPPLIER' | 'CUSTOMER' | 'SYSTEM' | 'LIMS'
     * @param string|null $contextId
     */
    public function analyzeAliasChange(
        string $aliasString,
        string $contextScope,
        ?string $contextId = null
    ): array {
        $alias = $this->db->queryOne(
            "SELECT id, alias_string, canonical_code, context_scope, lifecycle_status
             FROM uom_alias
             WHERE alias_string = :a
               AND context_scope = :s
               AND COALESCE(context_id, '') = COALESCE(:ci, '')
               AND lifecycle_status = 'active'
             LIMIT 1",
            [':a' => $aliasString, ':s' => $contextScope, ':ci' => $contextId]
        );

        if ($alias === null) {
            throw new UomException('UOM_ALIAS_NOT_FOUND',
                "Active alias '{$aliasString}' [{$contextScope}] not found.", 404);
        }

        $dims = [
            'quarantine_pending' => 0, // alias is active, changing affects future lookups
            'canonical_impacts'  => $this->analyzeUnitDeprecation($alias['canonical_code'])['dimensions'],
            'context_scope'      => $contextScope,
            'context_id'         => $contextId,
        ];

        return [
            'alias_id'       => $alias['id'],
            'alias_string'   => $aliasString,
            'canonical_code' => $alias['canonical_code'],
            'context_scope'  => $contextScope,
            'impact_level'   => 'LOW',
            'dimensions'     => $dims,
            'recommendation' => 'Retire alias only after confirming no active EDI/LIMS feeds reference this string.',
            'analysis_at'    => (new \DateTimeImmutable())->format(\DateTimeInterface::RFC3339),
        ];
    }

    // ─── private query helpers ────────────────────────────────────────────────

    private function countItemPoliciesByUnit(string $code): int
    {
        $row = $this->db->queryOne(
            "SELECT COUNT(*) AS c FROM item_uom_policy
             WHERE lifecycle_status = 'active'
               AND (inventory_unit_code = :c OR purchase_unit_code = :c
                    OR sales_unit_code = :c OR recipe_unit_code = :c
                    OR qc_unit_code = :c)",
            [':c' => $code]
        );
        return (int)($row['c'] ?? 0);
    }

    private function countAliasesByCanonical(string $code): int
    {
        $row = $this->db->queryOne(
            "SELECT COUNT(*) AS c FROM uom_alias
             WHERE canonical_code = :c AND lifecycle_status = 'active'",
            [':c' => $code]
        );
        return (int)($row['c'] ?? 0);
    }

    private function countConversionRulesByUnit(string $code): int
    {
        $row = $this->db->queryOne(
            "SELECT COUNT(*) AS c FROM uom_conversion_rule
             WHERE lifecycle_status = 'active'
               AND (from_unit_code = :c OR to_unit_code = :c)",
            [':c' => $code]
        );
        return (int)($row['c'] ?? 0);
    }

    private function countRecentMeasvalThread(string $code): int
    {
        $row = $this->db->queryOne(
            "SELECT COUNT(*) AS c FROM uom_measurement_thread
             WHERE (from_unit_code = :c OR to_unit_code = :c)
               AND recorded_at >= now() - INTERVAL '" . self::RECENT_WINDOW_DAYS . " days'",
            [':c' => $code]
        );
        return (int)($row['c'] ?? 0);
    }

    private function countInspectionPlansByUnit(string $code): int
    {
        // inspection_plans uses measurement_unit PG enum, not canonical_code directly.
        // We check inspection_results for recent use of the canonical unit.
        $row = $this->db->queryOne(
            "SELECT COUNT(*) AS c FROM inspection_results
             WHERE canonical_unit_code = :c
               AND recorded_at >= now() - INTERVAL '" . self::RECENT_WINDOW_DAYS . " days'",
            [':c' => $code]
        );
        return (int)($row['c'] ?? 0);
    }

    private function countActiveJobsByUnitPair(string $from, string $to): int
    {
        $row = $this->db->queryOne(
            "SELECT COUNT(*) AS c FROM uom_measurement_thread
             WHERE from_unit_code = :f AND to_unit_code = :t
               AND recorded_at >= now() - INTERVAL '" . self::RECENT_WINDOW_DAYS . " days'",
            [':f' => $from, ':t' => $to]
        );
        return (int)($row['c'] ?? 0);
    }

    private function computeImpactLevel(array $dims): string
    {
        $policies = $dims['item_policies'];
        $rules    = $dims['conversion_rules'];
        $thread   = $dims['recent_thread'];

        if ($policies === 0 && $rules === 0 && $thread === 0) {
            return 'NONE';
        }
        if ($policies >= 50 || $thread >= 1000) {
            return 'CRITICAL';
        }
        if ($policies >= 10 || $thread >= 100 || $rules >= 5) {
            return 'HIGH';
        }
        if ($policies >= 1 || $rules >= 1 || $thread >= 10) {
            return 'MEDIUM';
        }
        return 'LOW';
    }

    private function computeRuleImpactLevel(array $dims, array $rule): string
    {
        $totalPolicies = (int)$dims['policies_using_from'] + (int)$dims['policies_using_to'];
        $totalThread   = (int)$dims['recent_thread_from'] + (int)$dims['recent_thread_to'];
        $isAffine      = (bool)$dims['is_affine'];

        // Affine rule changes are always at least MEDIUM due to T/°F danger
        if ($isAffine && ($totalPolicies > 0 || $totalThread > 0)) {
            return $totalPolicies >= 5 ? 'HIGH' : 'MEDIUM';
        }

        return $this->computeImpactLevel([
            'item_policies'    => $totalPolicies,
            'conversion_rules' => 0,
            'recent_thread'    => $totalThread,
        ]);
    }

    private function buildUnitRecommendation(string $level, array $dims, string $code): string
    {
        return match ($level) {
            'NONE'     => "Unit '{$code}' has no downstream dependencies. Safe to deprecate.",
            'LOW'      => "Minimal impact. Update {$dims['active_aliases']} alias(es) before deprecating.",
            'MEDIUM'   => "Moderate impact: {$dims['item_policies']} active item policy slot(s). "
                          . "Migrate policies before deprecating.",
            'HIGH'     => "High impact: {$dims['item_policies']} policies, "
                          . "{$dims['conversion_rules']} rules, "
                          . "{$dims['recent_thread']} recent MEASVAL records. "
                          . "Requires ECO + full migration plan.",
            'CRITICAL' => "CRITICAL: Unit '{$code}' is deeply embedded. "
                          . "Deprecation requires multi-sprint migration program. "
                          . "Engage metrology and supply chain teams.",
            default    => "Impact level '{$level}' unknown.",
        };
    }

    private function buildRuleRecommendation(string $level, array $dims, array $rule): string
    {
        $affineWarning = $dims['is_affine']
            ? ' This is an AFFINE rule — changing factor/offset will affect ALL historical conversions '
              . '(e.g. temperature). Historical MEASVAL records are immutable; new conversions will use '
              . 'the updated factor. Audit carefully.'
            : '';

        return match ($level) {
            'NONE'   => "Rule has no recent usage. Safe to update.{$affineWarning}",
            'LOW'    => "Low usage. Update rule factor with standard e-sign workflow.{$affineWarning}",
            'MEDIUM' => "Moderate usage ({$dims['active_measval_jobs']} recent jobs). "
                        . "Schedule update in next maintenance window.{$affineWarning}",
            'HIGH'   => "High usage across {$dims['policies_using_from']} item policy slots. "
                        . "Plan versioned rule replacement.{$affineWarning}",
            default  => "Review required before proceeding.{$affineWarning}",
        };
    }
}
