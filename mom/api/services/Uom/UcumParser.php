<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Minimal UCUM expression parser for the P06 governed golden subset.
 *
 * This is intentionally not a full UCUM universe. Unknown atoms are rejected
 * with a controlled gap so external strings cannot leak into conversion core.
 */
final class UcumParser
{
    public const MAX_EXPRESSION_BYTES = 256;
    public const MAX_ATOM_COUNT = 16;

    private const ATOMS = [
        'g' => ['canonical_code' => 'g', 'quantity_kind_code' => 'Mass', 'dimension' => 'M1'],
        'kg' => ['canonical_code' => 'kg', 'quantity_kind_code' => 'Mass', 'dimension' => 'M1'],
        'mg' => ['canonical_code' => 'mg', 'quantity_kind_code' => 'Mass', 'dimension' => 'M1'],
        'ug' => ['canonical_code' => 'ug', 'quantity_kind_code' => 'Mass', 'dimension' => 'M1'],
        'L' => ['canonical_code' => 'L', 'quantity_kind_code' => 'Volume', 'dimension' => 'L3'],
        'mL' => ['canonical_code' => 'mL', 'quantity_kind_code' => 'Volume', 'dimension' => 'L3'],
        'mol' => ['canonical_code' => 'mol', 'quantity_kind_code' => 'AmountOfSubstance', 'dimension' => 'N1'],
        'Cel' => ['canonical_code' => 'Cel', 'quantity_kind_code' => 'ThermodynamicTemperature', 'dimension' => 'Theta1', 'special' => true, 'is_affine' => true],
        '[degF]' => ['canonical_code' => 'degF', 'quantity_kind_code' => 'ThermodynamicTemperature', 'dimension' => 'Theta1', 'special' => true, 'is_affine' => true],
    ];

    /**
     * @return array{
     *   status:string,
     *   input:string,
     *   normalized:string,
     *   atoms:list<array<string,mixed>>,
     *   operators:list<string>,
     *   quantity_kind_code:string|null,
     *   dimension_vector:string|null,
     *   is_affine:bool,
     *   controlled_gap?:string
     * }
     */
    public function parse(string $expression): array
    {
        $normalized = trim($expression);
        if (strlen($normalized) > self::MAX_EXPRESSION_BYTES) {
            throw new UomException(
                'UOM_UCUM_EXPRESSION_TOO_LONG',
                'UCUM expression exceeds the governed parser length limit.',
                422
            );
        }

        if ($normalized === '' || preg_match('/[^A-Za-z0-9_\\[\\]{}\\.\\/\\*\\-]/', $normalized)) {
            throw new UomException('UOM_UCUM_INVALID_EXPRESSION', 'UCUM expression contains unsupported tokens.', 422);
        }

        $parts = preg_split('/([\\/*])/', $normalized, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
        if ($parts === false || $parts === []) {
            throw new UomException('UOM_UCUM_INVALID_EXPRESSION', 'UCUM expression is empty.', 422);
        }

        $atoms = [];
        $operators = [];
        $expectAtom = true;
        foreach ($parts as $part) {
            if ($part === '/' || $part === '*') {
                if ($expectAtom) {
                    throw new UomException('UOM_UCUM_INVALID_EXPRESSION', 'UCUM operator is not between atoms.', 422);
                }
                $operators[] = $part;
                $expectAtom = true;
                continue;
            }

            if (!$expectAtom) {
                throw new UomException('UOM_UCUM_INVALID_EXPRESSION', 'UCUM atoms must be separated by an operator.', 422);
            }
            $atoms[] = $this->parseAtom($part);
            $expectAtom = false;
        }
        if ($expectAtom) {
            throw new UomException('UOM_UCUM_INVALID_EXPRESSION', 'UCUM expression ends with an operator.', 422);
        }
        if (count($atoms) > self::MAX_ATOM_COUNT) {
            throw new UomException(
                'UOM_UCUM_EXPRESSION_TOO_COMPLEX',
                'UCUM expression exceeds the governed atom-count limit.',
                422
            );
        }

        return [
            'status' => 'parsed',
            'input' => $expression,
            'normalized' => $normalized,
            'atoms' => $atoms,
            'operators' => $operators,
            'quantity_kind_code' => $this->inferQuantityKind($atoms, $operators),
            'dimension_vector' => $this->dimensionVector($atoms, $operators),
            'is_affine' => in_array(true, array_column($atoms, 'is_affine'), true),
        ];
    }

    public function validateCatalogRow(array $row): void
    {
        $ucumCode = (string)($row['ucum_code'] ?? '');
        if ($ucumCode === '' || !isset(self::ATOMS[$ucumCode])) {
            throw new UomException(
                'UOM_UCUM_ATOM_CONTROLLED_GAP',
                "Catalog UCUM code '{$ucumCode}' is not in the P06 golden subset.",
                422
            );
        }

        $expected = self::ATOMS[$ucumCode];
        if ((string)($row['canonical_code'] ?? '') !== (string)$expected['canonical_code']
            || (string)($row['quantity_kind_code'] ?? '') !== (string)$expected['quantity_kind_code']
        ) {
            throw new UomException(
                'UOM_UCUM_CATALOG_MISMATCH',
                "Catalog row for UCUM '{$ucumCode}' does not match canonical mapping.",
                422
            );
        }

        if (isset($row['dimension_vector'])
            && (string)$row['dimension_vector'] !== ''
            && (string)$row['dimension_vector'] !== (string)$expected['dimension']
        ) {
            throw new UomException(
                'UOM_UCUM_DIMENSION_MISMATCH',
                "Catalog dimension for UCUM '{$ucumCode}' does not match parser contract.",
                422
            );
        }
    }

    /**
     * @return array<string,mixed>
     */
    private function parseAtom(string $token): array
    {
        $token = trim($token);
        if (preg_match('/^(.+?)([-+]?[0-9]+)$/', $token, $m) === 1 && isset(self::ATOMS[$m[1]])) {
            return self::ATOMS[$m[1]] + ['ucum_atom' => $m[1], 'exponent' => (int)$m[2]];
        }
        if (!isset(self::ATOMS[$token])) {
            throw new UomException(
                'UOM_UCUM_ATOM_CONTROLLED_GAP',
                "UCUM atom '{$token}' is not in the P06 golden subset.",
                422
            );
        }
        return self::ATOMS[$token] + ['ucum_atom' => $token, 'exponent' => 1];
    }

    private function inferQuantityKind(array $atoms, array $operators): ?string
    {
        if (count($atoms) === 1) {
            return (string)$atoms[0]['quantity_kind_code'];
        }
        if (count($atoms) === 2
            && ($operators[0] ?? '') === '/'
            && ($atoms[0]['quantity_kind_code'] ?? '') === 'Mass'
            && ($atoms[1]['quantity_kind_code'] ?? '') === 'Volume'
        ) {
            return 'MassConcentration';
        }
        if (count($atoms) === 2
            && ($operators[0] ?? '') === '/'
            && ($atoms[0]['quantity_kind_code'] ?? '') === 'AmountOfSubstance'
            && ($atoms[1]['quantity_kind_code'] ?? '') === 'Volume'
        ) {
            return 'Molarity';
        }
        return null;
    }

    private function dimensionVector(array $atoms, array $operators): ?string
    {
        $kind = $this->inferQuantityKind($atoms, $operators);
        return match ($kind) {
            'Mass' => 'M1',
            'Volume' => 'L3',
            'AmountOfSubstance' => 'N1',
            'ThermodynamicTemperature' => 'Theta1',
            'MassConcentration' => 'M1L-3',
            'Molarity' => 'N1L-3',
            default => null,
        };
    }
}
