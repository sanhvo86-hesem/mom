<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Resolves conversion rules for a (from_unit, to_unit) pair.
 *
 * Resolution order:
 *   1. Direct rule  — from=from, to=to, status='approved'
 *   2. Reverse rule — from=to, to=from, status='approved', bidirectional=true
 *   3. SI base hop  — no rule; both units are non-affine; compute via si_factor
 *
 * Redis cache: key `uom:rule:{from}:{to}`, TTL 3600 s.
 * Cache is invalidated when a rule changes lifecycle_status (handled by
 * UomWorkflowService in IMPL-07).
 */
final class ConversionRuleService
{
    private const CACHE_TTL = 3600;
    private const CACHE_PREFIX = 'uom:rule:';
    private const BCMATH_SCALE = 30;

    public function __construct(
        private readonly Connection $db,
        private readonly ?\Redis $redis = null
    ) {}

    /**
     * Resolve the rule for a given unit pair. Returns a normalised descriptor:
     *
     * [
     *   'rule_code'       => string,      // NULL for SI-base-hop
     *   'rule_version'    => int,
     *   'category'        => string,      // 'exact_linear', 'affine', 'si_base_hop', …
     *   'factor'          => string,      // numeric string
     *   'offset_value'    => string,      // '0' for linear
     *   'rounding_policy' => string,      // policy_code
     *   'reversed'        => bool,        // true when using a reverse path
     *   'risk_level'      => string,
     * ]
     *
     * @throws UomNoConversionPathException when no path is found
     */
    public function resolve(string $fromCode, string $toCode, array $fromUnit, array $toUnit): array
    {
        if ($fromCode === $toCode) {
            return $this->identityRule($fromCode);
        }

        $cacheKey = self::CACHE_PREFIX . $fromCode . ':' . $toCode;
        $cached   = $this->cacheGet($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $rule = $this->findDirectRule($fromCode, $toCode)
            ?? $this->findReverseRule($fromCode, $toCode)
            ?? $this->buildSiBaseHop($fromCode, $toCode, $fromUnit, $toUnit);

        if ($rule === null) {
            throw new UomNoConversionPathException($fromCode, $toCode);
        }

        $this->cacheSet($cacheKey, $rule);
        return $rule;
    }

    private function findDirectRule(string $from, string $to): ?array
    {
        $row = $this->db->queryOne(
            "SELECT rule_code, version, category, factor, offset_value,
                    rounding_policy_id, risk_level
             FROM uom_conversion_rule
             WHERE from_unit_code = :from
               AND to_unit_code   = :to
               AND lifecycle_status = 'approved'
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
             ORDER BY version DESC
             LIMIT 1",
            [':from' => $from, ':to' => $to]
        );

        if ($row === null) {
            return null;
        }

        return $this->normalise($row, false);
    }

    private function findReverseRule(string $from, string $to): ?array
    {
        $row = $this->db->queryOne(
            "SELECT rule_code, version, category, factor, offset_value,
                    rounding_policy_id, risk_level
             FROM uom_conversion_rule
             WHERE from_unit_code = :to
               AND to_unit_code   = :from
               AND lifecycle_status = 'approved'
               AND bidirectional = true
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
             ORDER BY version DESC
             LIMIT 1",
            [':from' => $from, ':to' => $to]
        );

        if ($row === null) {
            return null;
        }

        return $this->normalise($row, true);
    }

    /**
     * Build a synthetic SI-base-hop rule for non-affine units without a seeded rule.
     *
     * factor = from_si_factor / to_si_factor
     * This handles e.g. km → ft: factor = 1000 / 0.3048 = 3280.8399...
     */
    private function buildSiBaseHop(
        string $from,
        string $to,
        array  $fromUnit,
        array  $toUnit
    ): ?array {
        if ($fromUnit['is_affine'] || $toUnit['is_affine']) {
            return null;
        }
        if (empty($fromUnit['si_factor']) || empty($toUnit['si_factor'])) {
            return null;
        }

        $toSiFactor = (string)$toUnit['si_factor'];
        if (bccomp($toSiFactor, '0', self::BCMATH_SCALE) === 0) {
            return null;
        }

        $syntheticFactor = bcdiv(
            (string)$fromUnit['si_factor'],
            $toSiFactor,
            self::BCMATH_SCALE
        );

        $riskLevel = ($fromUnit['risk_level'] === 'high' || $toUnit['risk_level'] === 'high')
            ? 'high'
            : (($fromUnit['risk_level'] === 'medium' || $toUnit['risk_level'] === 'medium') ? 'medium' : 'low');

        return [
            'rule_code'       => null,
            'rule_version'    => 0,
            'category'        => 'si_base_hop',
            'factor'          => $syntheticFactor,
            'offset_value'    => '0',
            'rounding_policy' => 'ROUND_HALF_EVEN',
            'reversed'        => false,
            'risk_level'      => $riskLevel,
        ];
    }

    private function identityRule(string $code): array
    {
        return [
            'rule_code'       => null,
            'rule_version'    => 0,
            'category'        => 'identity',
            'factor'          => '1',
            'offset_value'    => '0',
            'rounding_policy' => 'ROUND_NONE',
            'reversed'        => false,
            'risk_level'      => 'low',
        ];
    }

    private function normalise(array $row, bool $reversed): array
    {
        return [
            'rule_code'       => $row['rule_code'],
            'rule_version'    => (int)$row['version'],
            'category'        => $row['category'],
            'factor'          => (string)($row['factor'] ?? '1'),
            'offset_value'    => (string)($row['offset_value'] ?? '0'),
            'rounding_policy' => $row['rounding_policy_id'] ?? 'ROUND_HALF_EVEN',
            'reversed'        => $reversed,
            'risk_level'      => $row['risk_level'] ?? 'low',
        ];
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
            // Cache failure is non-fatal; conversion continues without cache.
        }
    }
}
