<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Naked-number scanner (HESEM UoM V3 P08 deliverable).
 *
 * Walks a list of column/path triples (table, column, sample value) and
 * surfaces "naked" measurement values — numeric data with no unit, no
 * quantity-kind and no canonical SI tag. Used by CI / data-quality
 * jobs to flag rows that need unit annotation before they can flow
 * through MEASVAL.
 *
 * The scanner is deliberately schema-agnostic — it takes already-loaded
 * sample data, so unit tests can run against a fixture array without a
 * live database. The CI integration that loads sample data from each
 * controlled table lives outside this class.
 *
 * Naked-number heuristic:
 *   - Column name matches a measurement-like noun
 *     (`weight`, `mass`, `length`, `quantity`, `qty`, `volume`,
 *     `temperature`, `temp`, `pressure`, `density`, `concentration`,
 *     `dimension`).
 *   - Sample value is numeric.
 *   - No sibling column declares the unit
 *     (`<col>_unit`, `<col>_uom`, `<col>_canonical_code`).
 *
 * Output severity is `P0` if the table belongs to a regulated domain
 * (inspection, calibration, batch_release, control_chart, msa) and
 * `P2` otherwise.
 */
final class UomNakedNumberScanner
{
    private const MEASUREMENT_NOUNS = [
        'weight', 'mass', 'length', 'width', 'height', 'depth',
        'quantity', 'qty', 'amount',
        'volume', 'capacity',
        'temperature', 'temp',
        'pressure', 'density', 'concentration', 'dimension',
        'flow', 'rate', 'speed', 'velocity',
    ];

    private const REGULATED_TABLE_PATTERNS = [
        '#^inspection_#',
        '#^calibration_#',
        '#^msa_#',
        '#^batch_release#',
        '#^control_chart#',
        '#^lot_results#',
        '#^spc_#',
    ];

    /**
     * @param list<array{table:string, column:string, value:mixed,
     *               siblings: list<string>}> $rows
     * @return list<array{table:string, column:string, severity:string,
     *               reason:string}>
     */
    public function scan(array $rows): array
    {
        $findings = [];

        foreach ($rows as $r) {
            $col = strtolower($r['column']);
            $val = $r['value'];

            if (!$this->looksLikeMeasurement($col)) {
                continue;
            }
            if (!is_numeric($val)) {
                continue;
            }
            if ($this->hasUnitSibling($col, $r['siblings'] ?? [])) {
                continue;
            }

            $findings[] = [
                'table'    => $r['table'],
                'column'   => $r['column'],
                'severity' => $this->severityFor($r['table']),
                'reason'   => sprintf(
                    "Numeric measurement column '%s' has no unit/uom/canonical sibling",
                    $r['column']
                ),
            ];
        }

        return $findings;
    }

    private function looksLikeMeasurement(string $columnLower): bool
    {
        foreach (self::MEASUREMENT_NOUNS as $noun) {
            if (str_contains($columnLower, $noun)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param list<string> $siblings
     */
    private function hasUnitSibling(string $columnLower, array $siblings): bool
    {
        $candidates = [
            $columnLower . '_unit',
            $columnLower . '_uom',
            $columnLower . '_canonical_code',
            $columnLower . '_unit_code',
            'unit_code',
            'uom_code',
        ];
        foreach ($siblings as $s) {
            $sLow = strtolower($s);
            if (in_array($sLow, $candidates, true)) {
                return true;
            }
        }
        return false;
    }

    private function severityFor(string $table): string
    {
        foreach (self::REGULATED_TABLE_PATTERNS as $pat) {
            if (preg_match($pat, strtolower($table)) === 1) {
                return 'P0';
            }
        }
        return 'P2';
    }
}
