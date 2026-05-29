<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Runtime gate helpers for tooling, fixture, gage, OOT, and MSA authority.
 *
 * P35 keeps decisions side-effect free. Domain command handlers must persist
 * returned policies/windows/impact scopes with P31 audit/outbox and P32 evidence
 * when a regulated release or override is required.
 */
final class ToolingGageAuthorityService
{
    private const BLOCKING_TOOL_STATUSES = ['blocked', 'broken', 'expired', 'retired', 'quarantined', 'calibration_expired'];
    private const APPROVED_PRESET_STATUSES = ['approved', 'verified', 'released'];
    private const FAIL_RESULTS = ['fail', 'failed', 'reject', 'rejected', 'nc', 'nonconforming'];

    public function __construct(
        private readonly ?CanonicalQualityCaseAuthorityService $qualityCaseAuthority = null,
    ) {
    }

    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'tooling_gage_authority',
            'readiness_state' => 'service_gate_partial',
            'tool_life_policy_authority' => 'tooling_life_runtime_policy',
            'tool_compatibility_authority' => 'tooling_machine_compatibility_rule',
            'tool_breakage_suspect_authority' => 'tool_breakage_suspect_window',
            'gage_msa_policy_authority' => 'gage_msa_gate_policy',
            'gage_oot_impact_authority' => 'gage_oot_impact_scope',
            'generic_crud_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function evaluateToolingReadiness(array $context, ?DateTimeImmutable $asOf = null): array
    {
        $asOf = $asOf ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $resources = $this->toolResources($context);
        if ($resources === []) {
            return $this->allowed('tooling_evidence_not_provided', 'Tooling gate has no provided evidence in this slice.');
        }

        foreach ($resources as $resource) {
            $status = strtolower($this->text($resource['status'] ?? $resource['tool_status'] ?? $resource['assembly_status'] ?? 'active'));
            if (in_array($status, self::BLOCKING_TOOL_STATUSES, true)) {
                return $this->blocked('tool_or_assembly_not_ready', 'Tool or tool assembly status blocks load/start.', [
                    'tool_ref' => $this->toolRef($resource),
                    'status' => $status,
                ]);
            }

            $life = $this->evaluateLifePolicy($resource, $context);
            if (($life['allowed'] ?? false) === false) {
                return $life;
            }

            $preset = $this->evaluatePresetOffsetApproval($resource['preset'] ?? $resource['tool_preset'] ?? []);
            if (($preset['allowed'] ?? true) === false) {
                return $preset;
            }

            $compatibility = $this->evaluateCompatibility($resource, $context);
            if (($compatibility['allowed'] ?? false) === false) {
                return $compatibility;
            }
        }

        return $this->allowed('tooling_readiness_ready', 'Tooling life, preset, and compatibility gates passed.');
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function evaluateGageCtqGate(array $context, ?DateTimeImmutable $asOf = null): array
    {
        $asOf = $asOf ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $gage = is_array($context['gage'] ?? null)
            ? (array)$context['gage']
            : $this->firstArray($context['gages'] ?? $context['gauges'] ?? []);
        if ($gage === []) {
            return $this->allowed('gage_evidence_not_provided', 'Gage/MSA gate has no provided evidence in this slice.');
        }

        $gageRef = $this->text($gage['gage_id'] ?? $gage['tool_id'] ?? $gage['equipment_id'] ?? $gage['id'] ?? '');
        $status = strtolower($this->text($gage['status'] ?? $gage['gage_status'] ?? $gage['calibration_status'] ?? 'active'));
        if (in_array($status, ['expired', 'oot', 'out_of_tolerance', 'blocked', 'quarantined'], true)) {
            return $this->blocked('gage_calibration_expired', 'Gage calibration status blocks CTQ measurement.', [
                'gage_ref' => $gageRef,
                'status' => $status,
            ]);
        }

        $due = $this->text($gage['calibration_due_at'] ?? $gage['next_due_date'] ?? $gage['next_due'] ?? '');
        if ($due !== '' && $this->isPast($due, $asOf, true)) {
            return $this->blocked('gage_calibration_expired', 'Gage calibration due date is in the past.', [
                'gage_ref' => $gageRef,
                'calibration_due_at' => $due,
            ]);
        }

        if ((bool)($gage['oot_open'] ?? $gage['oot_declared'] ?? false)) {
            return $this->blocked('gage_oot_open', 'Open gage OOT investigation blocks CTQ measurement.', [
                'gage_ref' => $gageRef,
            ]);
        }

        $policy = is_array($context['msa_policy'] ?? null) ? (array)$context['msa_policy'] : [];
        $maxGrr = (float)($policy['max_grr_percent'] ?? $gage['max_grr_percent'] ?? 30.0);
        $minNdc = (int)($policy['min_ndc'] ?? $gage['min_ndc'] ?? 5);
        $grr = $gage['grr_percent'] ?? $gage['grr_pct'] ?? null;
        $ndc = $gage['ndc'] ?? $gage['ndc_count'] ?? null;
        $grrResult = strtolower($this->text($gage['grr_result'] ?? $gage['msa_result'] ?? 'acceptable'));

        if ($grrResult === 'unacceptable'
            || (is_numeric($grr) && (float)$grr > $maxGrr)
            || (is_numeric($ndc) && (int)$ndc < $minNdc)) {
            return $this->blocked('gage_msa_not_acceptable', 'Gage MSA/Gage R&R result is not acceptable for CTQ measurement.', [
                'gage_ref' => $gageRef,
                'grr_percent' => is_numeric($grr) ? (float)$grr : null,
                'ndc' => is_numeric($ndc) ? (int)$ndc : null,
                'max_grr_percent' => $maxGrr,
                'min_ndc' => $minNdc,
            ]);
        }

        return $this->allowed('gage_ctq_gate_ready', 'Gage calibration and MSA gate passed.');
    }

    /**
     * @param mixed $preset
     * @return array<string, mixed>
     */
    public function evaluatePresetOffsetApproval(mixed $preset): array
    {
        if (!is_array($preset) || $preset === []) {
            return $this->allowed('tool_preset_not_provided', 'Tool preset gate has no provided evidence in this slice.');
        }

        $status = strtolower($this->text($preset['preset_status'] ?? $preset['verified_status'] ?? $preset['status'] ?? 'verified'));
        if (!in_array($status, self::APPROVED_PRESET_STATUSES, true)) {
            return $this->blocked('tool_preset_not_approved', 'Tool preset/offset is not approved or verified.', [
                'preset_ref' => $this->text($preset['preset_id'] ?? $preset['preset_number'] ?? ''),
                'status' => $status,
            ]);
        }

        $drift = $preset['offset_drift_mm'] ?? null;
        $limit = $preset['max_offset_drift_mm'] ?? $preset['drift_limit_mm'] ?? null;
        if (is_numeric($drift) && is_numeric($limit) && abs((float)$drift) > abs((float)$limit)) {
            return $this->blocked('tool_offset_drift_exceeds_limit', 'Tool preset/offset drift exceeds approved limit.', [
                'preset_ref' => $this->text($preset['preset_id'] ?? $preset['preset_number'] ?? ''),
                'offset_drift_mm' => (float)$drift,
                'max_offset_drift_mm' => (float)$limit,
            ]);
        }

        return $this->allowed('tool_preset_offset_ready', 'Tool preset/offset approval gate passed.');
    }

    /**
     * @param array<string, mixed> $breakage
     * @return array<string, mixed>
     */
    public function createBreakageSuspectWindow(array $breakage): array
    {
        $toolRef = $this->text($breakage['tool_ref'] ?? $breakage['tool_id'] ?? '');
        $breakageRef = $this->text($breakage['breakage_event_ref'] ?? $breakage['event_id'] ?? '');
        $breakageAt = $this->text($breakage['breakage_at'] ?? $breakage['event_time'] ?? '');
        $lastGoodAt = $this->text($breakage['last_good_at'] ?? $breakage['last_good_check_at'] ?? '');
        if ($toolRef === '' || $breakageRef === '' || $breakageAt === '' || $lastGoodAt === '') {
            return $this->blocked('tool_breakage_window_evidence_required', 'Tool breakage suspect window requires tool, event, breakage time, and last good checkpoint.');
        }

        $window = [
            'breakage_event_ref' => $breakageRef,
            'tool_ref' => $toolRef,
            'tooling_assembly_ref' => $this->text($breakage['tooling_assembly_ref'] ?? $breakage['assembly_id'] ?? ''),
            'equipment_ref' => $this->text($breakage['equipment_ref'] ?? $breakage['equipment_id'] ?? $breakage['machine_id'] ?? ''),
            'work_order_ref' => $this->text($breakage['work_order_ref'] ?? $breakage['wo_number'] ?? $breakage['work_order_id'] ?? ''),
            'job_ref' => $this->text($breakage['job_ref'] ?? $breakage['job_number'] ?? ''),
            'operation_ref' => $this->text($breakage['operation_ref'] ?? $breakage['operation_seq'] ?? ''),
            'last_good_event_ref' => $this->text($breakage['last_good_event_ref'] ?? ''),
            'last_good_at' => $lastGoodAt,
            'breakage_at' => $breakageAt,
            'affected_work_order_refs' => $this->list($breakage['affected_work_order_refs'] ?? $breakage['affected_work_orders'] ?? []),
            'affected_lot_refs' => $this->list($breakage['affected_lot_refs'] ?? $breakage['affected_lots'] ?? []),
            'affected_serial_refs' => $this->list($breakage['affected_serial_refs'] ?? $breakage['affected_serials'] ?? []),
            'containment_required' => true,
            'suspect_window_status' => 'containment_required',
        ];
        $window['window_hash_sha256'] = $this->hashPayload($window);

        $qualityPlan = $this->qualityAuthority()->createFailureContainmentPlan([
            'source_type' => 'tool_breakage',
            'source_id' => $breakageRef,
            'inspection_stage' => 'tool_breakage',
            'result' => 'fail',
            'severity' => $this->text($breakage['severity'] ?? 'major'),
            'work_order_id' => $window['work_order_ref'],
            'lot_id' => $window['affected_lot_refs'][0] ?? $this->text($breakage['lot_id'] ?? ''),
            'serial_id' => $window['affected_serial_refs'][0] ?? $this->text($breakage['serial_id'] ?? ''),
            'defects' => [['code' => 'TOOL_BREAKAGE']],
        ]);

        return [
            'allowed' => true,
            'status' => 'planned',
            'reason_code' => 'tool_breakage_suspect_window_required',
            'suspect_window' => $window,
            'quality_containment_plan' => $qualityPlan,
        ];
    }

    /**
     * @param array<string, mixed> $oot
     * @return array<string, mixed>
     */
    public function planGageOotImpact(array $oot): array
    {
        $gageRef = $this->text($oot['gage_ref'] ?? $oot['gage_id'] ?? $oot['equipment_id'] ?? '');
        $ootRef = $this->text($oot['oot_ref'] ?? $oot['oot_id'] ?? $oot['calibration_id'] ?? '');
        $lastGoodAt = $this->text($oot['last_known_good_at'] ?? $oot['last_known_good_date'] ?? '');
        $discoveredAt = $this->text($oot['oot_discovered_at'] ?? $oot['oot_discovery_date'] ?? '');
        if ($gageRef === '' || $ootRef === '' || $lastGoodAt === '' || $discoveredAt === '') {
            return $this->blocked('gage_oot_impact_evidence_required', 'Gage OOT impact scope requires gage, OOT reference, last good date, and discovery date.');
        }

        $affectedShipments = $this->list($oot['affected_shipment_refs'] ?? $oot['affected_shipments'] ?? []);
        $scope = [
            'oot_ref' => $ootRef,
            'calibration_ref' => $this->text($oot['calibration_ref'] ?? $oot['calibration_id'] ?? ''),
            'gage_ref' => $gageRef,
            'last_known_good_at' => $lastGoodAt,
            'oot_discovered_at' => $discoveredAt,
            'affected_work_order_refs' => $this->list($oot['affected_work_order_refs'] ?? $oot['affected_work_orders'] ?? []),
            'affected_lot_refs' => $this->list($oot['affected_lot_refs'] ?? $oot['affected_lots'] ?? []),
            'affected_serial_refs' => $this->list($oot['affected_serial_refs'] ?? $oot['affected_serials'] ?? []),
            'affected_shipment_refs' => $affectedShipments,
            'affected_customer_refs' => $this->list($oot['affected_customer_refs'] ?? $oot['affected_customers'] ?? []),
            'wip_containment_required' => true,
            'shipment_review_required' => $affectedShipments !== [],
            'impact_status' => $affectedShipments !== [] ? 'customer_review' : 'containment_required',
        ];
        $scope['impact_hash_sha256'] = $this->hashPayload($scope);

        return [
            'allowed' => true,
            'status' => 'planned',
            'reason_code' => 'gage_oot_impact_scope_required',
            'impact_scope' => $scope,
        ];
    }

    /**
     * @param array<string, mixed> $resource
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function evaluateLifePolicy(array $resource, array $context): array
    {
        $basis = strtolower($this->text($resource['life_basis'] ?? $resource['policy_basis'] ?? 'percent_remaining'));
        $stopThreshold = $resource['stop_threshold'] ?? $resource['stop_threshold_pct'] ?? $context['tool_stop_threshold_pct'] ?? null;
        $current = $resource['life_remaining_pct'] ?? $resource['tool_life_remaining_pct'] ?? $resource['life_remaining'] ?? null;

        if ($basis !== 'percent_remaining') {
            $current = $resource['life_used'] ?? $resource['usage_value'] ?? $current;
        }

        if (is_numeric($current) && is_numeric($stopThreshold)) {
            $currentValue = (float)$current;
            $stopValue = (float)$stopThreshold;
            $blocks = $basis === 'percent_remaining' ? $currentValue <= $stopValue : $currentValue >= $stopValue;
            if ($blocks) {
                return $this->blocked('tool_life_below_stop_threshold', 'Tool life is at or beyond the stop threshold.', [
                    'tool_ref' => $this->toolRef($resource),
                    'policy_basis' => $basis,
                    'current_value' => $currentValue,
                    'stop_threshold' => $stopValue,
                ]);
            }
        }

        return $this->allowed('tool_life_policy_ready', 'Tool life stop policy passed.');
    }

    /**
     * @param array<string, mixed> $resource
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function evaluateCompatibility(array $resource, array $context): array
    {
        $machineFamily = strtolower($this->text($context['machine_family_code'] ?? $context['machine_family'] ?? $context['machine_type'] ?? ''));
        $equipmentRef = strtolower($this->text($context['equipment_ref'] ?? $context['equipment_id'] ?? $context['machine_id'] ?? ''));
        $allowedFamilies = $this->list($resource['compatible_machine_families'] ?? $resource['approved_machine_families'] ?? []);
        $allowedEquipment = $this->list($resource['compatible_equipment_refs'] ?? $resource['approved_equipment_refs'] ?? []);

        if ($machineFamily !== '' && $allowedFamilies !== []) {
            $normalized = array_map(static fn(string $value): string => strtolower(trim($value)), $allowedFamilies);
            if (!in_array($machineFamily, $normalized, true)) {
                return $this->blocked('tool_assembly_machine_family_incompatible', 'Tool assembly is not approved for the machine family.', [
                    'tool_ref' => $this->toolRef($resource),
                    'machine_family_code' => $machineFamily,
                    'approved_machine_families' => $allowedFamilies,
                ]);
            }
        }

        if ($equipmentRef !== '' && $allowedEquipment !== []) {
            $normalized = array_map(static fn(string $value): string => strtolower(trim($value)), $allowedEquipment);
            if (!in_array($equipmentRef, $normalized, true)) {
                return $this->blocked('tool_assembly_equipment_incompatible', 'Tool assembly is not approved for the equipment.', [
                    'tool_ref' => $this->toolRef($resource),
                    'equipment_ref' => $equipmentRef,
                    'approved_equipment_refs' => $allowedEquipment,
                ]);
            }
        }

        return $this->allowed('tool_compatibility_ready', 'Tool compatibility gate passed.');
    }

    /** @return list<array<string, mixed>> */
    private function toolResources(array $context): array
    {
        $resources = [];
        foreach (['tools', 'tooling', 'tool_assemblies', 'tooling_assemblies'] as $field) {
            if (!is_array($context[$field] ?? null)) {
                continue;
            }
            foreach ((array)$context[$field] as $resource) {
                if (is_array($resource)) {
                    $resources[] = $resource;
                }
            }
        }
        if (is_array($context['tool'] ?? null)) {
            $resources[] = (array)$context['tool'];
        }
        if (is_array($context['tool_assembly'] ?? null)) {
            $resources[] = (array)$context['tool_assembly'];
        }

        return $resources;
    }

    /** @param mixed $value */
    private function firstArray(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        foreach ($value as $entry) {
            if (is_array($entry)) {
                return $entry;
            }
        }

        return [];
    }

    /** @param mixed $value */
    private function list(mixed $value): array
    {
        if (is_string($value) && trim($value) !== '') {
            return [trim($value)];
        }
        if (!is_array($value)) {
            return [];
        }

        $out = [];
        foreach ($value as $entry) {
            if (is_scalar($entry) && trim((string)$entry) !== '') {
                $out[] = trim((string)$entry);
            }
        }

        return array_values(array_unique($out));
    }

    /** @param array<string, mixed> $resource */
    private function toolRef(array $resource): string
    {
        return $this->text($resource['tool_ref'] ?? $resource['tool_id'] ?? $resource['tooling_assembly_ref'] ?? $resource['assembly_id'] ?? $resource['id'] ?? '');
    }

    private function isPast(string $date, DateTimeImmutable $asOf, bool $endOfDay): bool
    {
        $suffix = $endOfDay && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1 ? ' 23:59:59 UTC' : '';
        $timestamp = strtotime($date . $suffix);
        if ($timestamp === false) {
            return false;
        }

        return $timestamp < $asOf->getTimestamp();
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    /** @return array<string, mixed> */
    private function allowed(string $reasonCode, string $message): array
    {
        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => $reasonCode,
            'message' => $message,
        ];
    }

    /** @return array<string, mixed> */
    private function blocked(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => false,
            'status' => 'blocked',
            'reason_code' => $reasonCode,
            'message' => $message,
            'context' => $context,
        ];
    }

    /** @param array<string, mixed> $payload */
    private function hashPayload(array $payload): string
    {
        ksort($payload);

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    private function qualityAuthority(): CanonicalQualityCaseAuthorityService
    {
        return $this->qualityCaseAuthority ?? new CanonicalQualityCaseAuthorityService();
    }
}

if (!class_exists('MOM\\Api\\Services\\ToolingGageAuthorityService', false)) {
    class_alias(ToolingGageAuthorityService::class, 'MOM\\Api\\Services\\ToolingGageAuthorityService');
}
