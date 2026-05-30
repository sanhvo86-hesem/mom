<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Bridges QC inspection and MES inline measurements to the MEASVAL evidence envelope.
 *
 * Responsibilities:
 *   - Resolve PostgreSQL measurement_unit enum values to canonical UoM codes
 *   - Optionally convert measurement to a display/reporting unit
 *   - Generate MEASVAL envelope with SHA-256 audit hash via MeasurementValueFactory
 *   - Persist envelope + display value back to source table (inspection_results / mes_inline_measurements)
 *   - Write a row to uom_measurement_thread for the digital thread
 *
 * Usage (QC flow):
 *   $bridge->wrapInspectionResult($resultId, displayUnit: 'IN');
 *
 * Usage (MES inline):
 *   $bridge->wrapInlineMeasurement($measurementId, displayUnit: null); // raw wrap, no conversion
 *
 * ISA-88 note: Any characteristic with kpc_flag or ctq_flag SHOULD be wrapped
 * before the inspection record is closed — the MEASVAL hash is evidence for
 * regulated dimensional and safety-critical characteristics.
 *
 * Hardness (HRC/HRB) and surface roughness (Ra) are marked is_conversion_blocked
 * in the unit catalog. The bridge wraps them but does NOT attempt inter-scale
 * conversion. Attempting conversion raises UomBlockedConversionException.
 */
final class QualityMeasurementBridge
{
    /** PostgreSQL measurement_unit enum → canonical UoM code */
    private const ENUM_TO_CANONICAL = [
        'mm'  => 'MM',
        'in'  => 'IN',
        'deg' => 'DEG',
        'Ra'  => 'RA_UM',
        'HRC' => 'HRC',
        'HRB' => 'HRB',
    ];

    public function __construct(
        private readonly Connection             $db,
        private readonly ConversionEngine       $engine,
        private readonly MeasurementValueFactory $measvalFactory,
    ) {}

    /**
     * Wrap an inspection_results row in a MEASVAL envelope.
     *
     * @param string      $resultId     UUID from inspection_results.result_id
     * @param string|null $displayUnit  Optional canonical target unit for display
     *                                  conversion. Null = wrap only, no conversion.
     * @return array  The generated MEASVAL envelope
     * @throws UomException if result not found or unit resolution fails
     */
    public function wrapInspectionResult(string $resultId, ?string $displayUnit = null): array
    {
        $row = $this->db->queryOne(
            "SELECT result_id, item_id, job_number, operation_seq, characteristic,
                    characteristic_designator, ctq_flag, kpc_flag,
                    actual_value, measurement_unit, inspector_id, recorded_at
             FROM inspection_results
             WHERE result_id = :id",
            [':id' => $resultId]
        );

        if ($row === null) {
            throw new UomException('UOM_QC_RESULT_NOT_FOUND',
                "Inspection result '{$resultId}' not found.", 404);
        }

        if ($row['actual_value'] === null) {
            throw new UomException('UOM_QC_NO_VALUE',
                "Inspection result '{$resultId}' has no actual_value.", 422);
        }

        $canonicalUnit = $this->resolveEnumUnit((string)($row['measurement_unit'] ?? ''));
        $magnitude     = (string)$row['actual_value'];

        $measval = $this->buildMeasval(
            magnitude:    $magnitude,
            fromUnit:     $canonicalUnit,
            displayUnit:  $displayUnit,
            context: [
                'source_table'  => 'inspection_results',
                'source_id'     => $resultId,
                'context_code'  => 'QC',
                'item_id'       => $row['item_id'] ?? null,
                'job_number'    => $row['job_number'] ?? null,
                'operation_seq' => $row['operation_seq'] ?? null,
                'characteristic'=> $row['characteristic'],
                'ctq_flag'      => (bool)($row['ctq_flag'] ?? false),
                'kpc_flag'      => (bool)($row['kpc_flag'] ?? false),
                'inspector_id'  => $row['inspector_id'] ?? null,
                'recorded_at'   => $row['recorded_at'] ?? null,
            ]
        );

        $this->persistToInspectionResult($resultId, $canonicalUnit, $measval, $displayUnit);
        $this->writeThread('inspection_results', $resultId, $measval, $row);

        return $measval;
    }

    /**
     * Wrap a mes_inline_measurements row in a MEASVAL envelope.
     *
     * @param int         $measurementId  measurement_id (BIGINT identity)
     * @param string|null $displayUnit    Optional target unit for display
     * @return array  MEASVAL envelope
     */
    public function wrapInlineMeasurement(int $measurementId, ?string $displayUnit = null): array
    {
        $row = $this->db->queryOne(
            "SELECT measurement_id, equipment_id, job_number, operation_seq,
                    part_number, serial_number, lot_number,
                    characteristic_id, characteristic_name,
                    unit, measured_value, conformance, measured_at, operator_id
             FROM mes_inline_measurements
             WHERE measurement_id = :id",
            [':id' => $measurementId]
        );

        if ($row === null) {
            throw new UomException('UOM_MES_MEASUREMENT_NOT_FOUND',
                "Inline measurement '{$measurementId}' not found.", 404);
        }

        $canonicalUnit = $this->resolveEnumUnit((string)($row['unit'] ?? ''));
        $magnitude     = (string)$row['measured_value'];

        $measval = $this->buildMeasval(
            magnitude:   $magnitude,
            fromUnit:    $canonicalUnit,
            displayUnit: $displayUnit,
            context: [
                'source_table'  => 'mes_inline_measurements',
                'source_id'     => (string)$measurementId,
                'context_code'  => 'MES',
                'item_id'       => $row['part_number'] ?? null,
                'job_number'    => $row['job_number'] ?? null,
                'operation_seq' => $row['operation_seq'] ?? null,
                'characteristic'=> $row['characteristic_name'] ?? $row['characteristic_id'] ?? null,
                'equipment_id'  => $row['equipment_id'] ?? null,
                'serial_number' => $row['serial_number'] ?? null,
                'conformance'   => $row['conformance'] ?? null,
            ]
        );

        $this->persistToInlineMeasurement($measurementId, $canonicalUnit, $measval, $displayUnit);
        $this->writeThread('mes_inline_measurements', (string)$measurementId, $measval, $row);

        return $measval;
    }

    /**
     * Batch-wrap multiple inspection results.
     *
     * Returns map of resultId → ['measval' => array] | ['error' => string].
     * Never throws — failures per record are captured in the error key.
     *
     * @param list<string> $resultIds
     * @param string|null  $displayUnit
     * @return array<string, array>
     */
    public function batchWrapInspectionResults(array $resultIds, ?string $displayUnit = null): array
    {
        $out = [];
        foreach ($resultIds as $id) {
            try {
                $out[$id] = ['measval' => $this->wrapInspectionResult($id, $displayUnit)];
            } catch (UomException $e) {
                $out[$id] = ['error' => $e->problemCode . ': ' . $e->getMessage()];
            }
        }
        return $out;
    }

    /**
     * Resolve PostgreSQL measurement_unit enum to a canonical UoM code.
     *
     * Falls back to alias table (SYSTEM scope) for values not in the hardcoded map.
     */
    private function resolveEnumUnit(string $pgEnum): string
    {
        if (isset(self::ENUM_TO_CANONICAL[$pgEnum])) {
            return self::ENUM_TO_CANONICAL[$pgEnum];
        }

        // Try alias table for extended enum values added after migration 001
        $row = $this->db->queryOne(
            "SELECT canonical_code FROM uom_alias
             WHERE lower(alias_code) = lower(:a) AND context_scope = 'SYSTEM'
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
             LIMIT 1",
            [':a' => $pgEnum]
        );

        if ($row !== null) {
            return $row['canonical_code'];
        }

        throw new UomException('UOM_QC_UNKNOWN_ENUM_UNIT',
            "Cannot resolve measurement_unit enum value '{$pgEnum}' to a canonical UoM code. "
            . "Add an alias via uom_alias (context_scope='SYSTEM') or extend QualityMeasurementBridge::ENUM_TO_CANONICAL.",
            422);
    }

    /**
     * Build MEASVAL envelope, optionally converting to a display unit.
     */
    private function buildMeasval(
        string  $magnitude,
        string  $fromUnit,
        ?string $displayUnit,
        array   $context
    ): array {
        if ($displayUnit !== null && $displayUnit !== $fromUnit) {
            // Full conversion path — returns ['result', 'from_unit', 'to_unit', 'measval']
            $converted = $this->engine->convert(
                magnitude:       $magnitude,
                fromUnit:        $fromUnit,
                toUnit:          $displayUnit,
                displayPrecision: 6,
                roundingPolicy:  'ROUND_HALF_EVEN',
                context:         $context
            );
            return $converted['measval'];
        }

        // Wrap-only path — no conversion, just envelope
        return $this->measvalFactory->buildWrapOnly(
            magnitude: $magnitude,
            unitCode:  $fromUnit,
            context:   $context
        );
    }

    private function persistToInspectionResult(
        string  $resultId,
        string  $canonicalUnit,
        array   $measval,
        ?string $displayUnit
    ): void {
        $displayValue = null;
        if ($displayUnit !== null && isset($measval['display']['magnitude'])) {
            $displayValue = $measval['display']['magnitude'];
        }

        $this->db->execute(
            "UPDATE inspection_results
             SET canonical_unit_code = :cu,
                 measval_envelope    = :mv::jsonb,
                 display_unit_code   = :du,
                 display_value       = :dv,
                 measval_version     = 1
             WHERE result_id = :id",
            [
                ':cu' => $canonicalUnit,
                ':mv' => json_encode($measval, JSON_THROW_ON_ERROR),
                ':du' => $displayUnit,
                ':dv' => $displayValue,
                ':id' => $resultId,
            ]
        );
    }

    private function persistToInlineMeasurement(
        int     $measurementId,
        string  $canonicalUnit,
        array   $measval,
        ?string $displayUnit
    ): void {
        $displayValue = null;
        if ($displayUnit !== null && isset($measval['display']['magnitude'])) {
            $displayValue = $measval['display']['magnitude'];
        }

        $this->db->execute(
            "UPDATE mes_inline_measurements
             SET canonical_unit_code = :cu,
                 measval_envelope    = :mv::jsonb,
                 display_unit_code   = :du,
                 display_value       = :dv
             WHERE measurement_id = :id",
            [
                ':cu' => $canonicalUnit,
                ':mv' => json_encode($measval, JSON_THROW_ON_ERROR),
                ':du' => $displayUnit,
                ':dv' => $displayValue,
                ':id' => $measurementId,
            ]
        );
    }

    private function writeThread(string $sourceTable, string $sourceId, array $measval, array $row): void
    {
        $input    = $measval['input']           ?? [];
        $display  = $measval['display']         ?? [];
        $evidence = $measval['evidence']        ?? [];
        $thread   = $measval['digital_thread']  ?? [];
        $prec     = $measval['precision_envelope'] ?? [];

        $this->db->execute(
            "INSERT INTO uom_measurement_thread (
                source_table, source_id, audit_hash,
                from_unit_code, to_unit_code,
                magnitude_input, magnitude_result,
                rule_code, rule_version, rounding_policy,
                context_code, item_id, job_number, operation_seq, characteristic,
                inspector_id, ai_advisory_flag, recorded_at
             ) VALUES (
                :st, :si, :ah,
                :fu, :tu,
                :mi, :mr,
                :rc, :rv, :rp,
                :cc, :it, :jn, :os, :ch,
                :ii, :af, now()
             )",
            [
                ':st' => $sourceTable,
                ':si' => $sourceId,
                ':ah' => $thread['audit_hash']                     ?? '',
                ':fu' => $input['unit_code']                       ?? null,
                ':tu' => $display['unit_code']                     ?? null,
                ':mi' => (string)($input['magnitude']              ?? ''),
                ':mr' => $display['magnitude']                     ?? null,
                ':rc' => $evidence['rule_code']                    ?? null,
                ':rv' => isset($evidence['rule_version']) ? (int)$evidence['rule_version'] : null,
                ':rp' => $prec['rounding_policy']                  ?? 'ROUND_HALF_EVEN',
                ':cc' => $row['context_code']   ?? null,
                ':it' => $row['item_id']       ?? $row['part_number'] ?? null,
                ':jn' => $row['job_number']    ?? null,
                ':os' => isset($row['operation_seq']) ? (int)$row['operation_seq'] : null,
                ':ch' => $row['characteristic'] ?? $row['characteristic_name'] ?? null,
                ':ii' => $row['inspector_id']  ?? $row['operator_id'] ?? null,
                ':af' => (bool)($measval['semantic_context']['ai_advisory'] ?? false),
            ]
        );
    }
}
