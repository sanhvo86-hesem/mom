<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * MES-to-Evidence Vault Bridge for HESEM MOM Portal.
 *
 * Captures machine events (operation completions, alarm resolutions,
 * first-piece approvals, incoming inspections) and stores them as
 * tamper-evident records in the Evidence Vault with automatic
 * entity linking and custody logging.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class MesEvidenceBridge
{
    private readonly string $dataDir;
    private readonly EvidenceVaultService $vault;

    private const SYSTEM_USER = 'system/mes-bridge';

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string               $dataDir Absolute path to data directory.
     * @param EvidenceVaultService $vault   Evidence vault service instance.
     */
    public function __construct(string $dataDir, EvidenceVaultService $vault)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->vault   = $vault;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Capture evidence when a WO operation completes.
     *
     * Creates evidence with type 'machine_log', capturing cycle time,
     * spindle load, and tool wear data. Auto-links to the WO entity.
     *
     * @param string $woNumber      Work Order number.
     * @param array  $operationData Operation data: {operation_id, cycle_time_sec,
     *                              spindle_load_pct, tool_wear_pct, machine_id,
     *                              operator_id, program_id, ...}
     * @return string Evidence ID.
     */
    public function captureOnOperationComplete(string $woNumber, array $operationData): string
    {
        $operationId = $operationData['operation_id'] ?? 'unknown';

        $evidence = [
            'type'        => 'machine_log',
            'title'       => "Operation complete: {$woNumber} / Op {$operationId}",
            'description' => "Machine log captured on operation completion for WO {$woNumber}.",
            'source'      => 'mes_bridge',
            'wo_number'   => $woNumber,
            'data'        => [
                'operation_id'     => $operationId,
                'cycle_time_sec'   => $operationData['cycle_time_sec'] ?? null,
                'spindle_load_pct' => $operationData['spindle_load_pct'] ?? null,
                'tool_wear_pct'    => $operationData['tool_wear_pct'] ?? null,
                'machine_id'       => $operationData['machine_id'] ?? null,
                'operator_id'      => $operationData['operator_id'] ?? null,
                'program_id'       => $operationData['program_id'] ?? null,
                'feed_rate'        => $operationData['feed_rate'] ?? null,
                'spindle_speed'    => $operationData['spindle_speed'] ?? null,
            ],
            'file_hash'   => hash('sha256', json_encode($operationData) . $woNumber . $this->nowIso()),
        ];

        $record     = $this->vault->store($evidence, self::SYSTEM_USER);
        $evidenceId = $record['evidence_id'];

        // Auto-link to WO
        $this->vault->link($evidenceId, 'wo', $woNumber, self::SYSTEM_USER);

        // Record custody
        $this->vault->recordCustody(
            $evidenceId,
            'uploaded',
            self::SYSTEM_USER,
            "Auto-captured on operation complete for WO {$woNumber}, Op {$operationId}"
        );

        return $evidenceId;
    }

    /**
     * Capture evidence when a machine alarm is resolved.
     *
     * Creates evidence with type 'machine_log', capturing alarm details,
     * resolution action, and downtime duration. Auto-links to equipment.
     *
     * @param string $alarmId   Alarm identifier.
     * @param array  $alarmData Alarm data: {equipment_id, alarm_code, alarm_description,
     *                          resolution_action, downtime_minutes, resolved_by, ...}
     * @return string Evidence ID.
     */
    public function captureOnAlarmResolved(string $alarmId, array $alarmData): string
    {
        $equipmentId = $alarmData['equipment_id'] ?? 'unknown';
        $alarmCode   = $alarmData['alarm_code'] ?? '';

        $evidence = [
            'type'        => 'machine_log',
            'title'       => "Alarm resolved: {$alarmCode} on {$equipmentId}",
            'description' => "Machine alarm resolution log for alarm {$alarmId}.",
            'source'      => 'mes_bridge',
            'alarm_id'    => $alarmId,
            'data'        => [
                'equipment_id'      => $equipmentId,
                'alarm_code'        => $alarmCode,
                'alarm_description' => $alarmData['alarm_description'] ?? '',
                'resolution_action' => $alarmData['resolution_action'] ?? '',
                'downtime_minutes'  => $alarmData['downtime_minutes'] ?? null,
                'resolved_by'       => $alarmData['resolved_by'] ?? '',
                'alarm_start'       => $alarmData['alarm_start'] ?? '',
                'alarm_end'         => $alarmData['alarm_end'] ?? '',
            ],
            'file_hash'   => hash('sha256', json_encode($alarmData) . $alarmId . $this->nowIso()),
        ];

        $record     = $this->vault->store($evidence, self::SYSTEM_USER);
        $evidenceId = $record['evidence_id'];

        // Auto-link to equipment
        $this->vault->link($evidenceId, 'equipment', $equipmentId, self::SYSTEM_USER);

        $this->vault->recordCustody(
            $evidenceId,
            'uploaded',
            self::SYSTEM_USER,
            "Auto-captured on alarm resolution: {$alarmCode} on equipment {$equipmentId}"
        );

        return $evidenceId;
    }

    /**
     * Capture evidence when first-piece inspection is approved.
     *
     * Creates evidence with type 'measurement_data', capturing measurement
     * results, pass/fail status, and inspector. Auto-links to WO and JO.
     *
     * @param string $woNumber       Work Order number.
     * @param array  $inspectionData Inspection data: {jo_number, inspector_id,
     *                               measurements: [{dimension, nominal, actual, tolerance, pass}],
     *                               overall_result, instrument_ids, ...}
     * @return string Evidence ID.
     */
    public function captureOnFirstPieceApproved(string $woNumber, array $inspectionData): string
    {
        $joNumber = $inspectionData['jo_number'] ?? '';
        $result   = $inspectionData['overall_result'] ?? 'pass';

        $evidence = [
            'type'        => 'measurement_data',
            'title'       => "First piece approved: {$woNumber}",
            'description' => "First article inspection data for WO {$woNumber}. Result: {$result}.",
            'source'      => 'mes_bridge',
            'wo_number'   => $woNumber,
            'jo_number'   => $joNumber,
            'data'        => [
                'inspector_id'   => $inspectionData['inspector_id'] ?? '',
                'measurements'   => $inspectionData['measurements'] ?? [],
                'overall_result' => $result,
                'instrument_ids' => $inspectionData['instrument_ids'] ?? [],
                'inspection_time' => $inspectionData['inspection_time'] ?? $this->nowIso(),
            ],
            'file_hash'   => hash('sha256', json_encode($inspectionData) . $woNumber . $this->nowIso()),
        ];

        $record     = $this->vault->store($evidence, self::SYSTEM_USER);
        $evidenceId = $record['evidence_id'];

        // Auto-link to WO
        $this->vault->link($evidenceId, 'wo', $woNumber, self::SYSTEM_USER);

        // Auto-link to JO if provided
        if ($joNumber !== '') {
            $this->vault->link($evidenceId, 'jo', $joNumber, self::SYSTEM_USER);
        }

        $this->vault->recordCustody(
            $evidenceId,
            'uploaded',
            self::SYSTEM_USER,
            "Auto-captured on first piece approval for WO {$woNumber}"
        );

        return $evidenceId;
    }

    /**
     * Capture evidence for an incoming material inspection.
     *
     * Creates evidence with type 'measurement_data' for incoming inspection
     * results. Auto-links to PO and vendor entities.
     *
     * @param string $inspectionId Incoming inspection ID.
     * @param array  $inspData     Inspection data: {po_number, vendor_id,
     *                             part_id, lot_id, measurements, result,
     *                             inspector_id, certificate_of_conformance, ...}
     * @return string Evidence ID.
     */
    public function captureOnIncomingInspection(string $inspectionId, array $inspData): string
    {
        $poNumber = $inspData['po_number'] ?? '';
        $vendorId = $inspData['vendor_id'] ?? '';
        $partId   = $inspData['part_id'] ?? '';
        $result   = $inspData['result'] ?? 'pending';

        $evidence = [
            'type'          => 'measurement_data',
            'title'         => "Incoming inspection: {$inspectionId} - {$partId}",
            'description'   => "Incoming material inspection for PO {$poNumber}, vendor {$vendorId}. Result: {$result}.",
            'source'        => 'mes_bridge',
            'inspection_id' => $inspectionId,
            'data'          => [
                'po_number'    => $poNumber,
                'vendor_id'    => $vendorId,
                'part_id'      => $partId,
                'lot_id'       => $inspData['lot_id'] ?? '',
                'measurements' => $inspData['measurements'] ?? [],
                'result'       => $result,
                'inspector_id' => $inspData['inspector_id'] ?? '',
                'coc_received' => $inspData['certificate_of_conformance'] ?? false,
                'qty_received' => $inspData['qty_received'] ?? 0,
                'qty_sampled'  => $inspData['qty_sampled'] ?? 0,
            ],
            'file_hash'     => hash('sha256', json_encode($inspData) . $inspectionId . $this->nowIso()),
        ];

        $record     = $this->vault->store($evidence, self::SYSTEM_USER);
        $evidenceId = $record['evidence_id'];

        // Auto-link to PO
        if ($poNumber !== '') {
            $this->vault->link($evidenceId, 'po', $poNumber, self::SYSTEM_USER);
        }

        // Auto-link to vendor
        if ($vendorId !== '') {
            $this->vault->link($evidenceId, 'vendor', $vendorId, self::SYSTEM_USER);
        }

        $this->vault->recordCustody(
            $evidenceId,
            'uploaded',
            self::SYSTEM_USER,
            "Auto-captured incoming inspection {$inspectionId} for PO {$poNumber}"
        );

        return $evidenceId;
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
