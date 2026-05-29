<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Command-time readiness gate for MES release/start/material/program decisions.
 *
 * P34 keeps this service side-effect free: command handlers must persist the
 * returned snapshot/event in PostgreSQL with P31 idempotency/audit/outbox.
 */
final class ResourceReadinessService
{
    private const BLOCKING_OPERATOR_STATUSES = ['expired', 'suspended', 'revoked', 'inactive', 'unqualified'];
    private const BLOCKING_MACHINE_STATUSES = ['blocked', 'down', 'offline', 'inactive', 'locked', 'maintenance_due', 'pm_overdue', 'calibration_expired'];
    private const BLOCKING_TOOL_STATUSES = ['blocked', 'broken', 'expired', 'retired', 'quarantined', 'calibration_expired'];

    public function __construct(
        private readonly ?CanonicalQualityCaseAuthorityService $qualityCaseAuthority = null,
    ) {
    }

    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'resource_readiness_mes_event_spine',
            'readiness_state' => 'service_gate_partial',
            'readiness_snapshot_authority' => 'resource_readiness_snapshot',
            'runtime_event_spine_authority' => 'mes_runtime_event_spine',
            'quality_hold_authority_consumed' => 'quality_holds via CanonicalQualityCaseAuthorityService',
            'engineering_checksum_gate' => 'expected/controller SHA-256 parity',
            'generic_crud_mutation_allowed' => false,
            'covered_gates' => [
                'operator_qualification',
                'machine_pm_calibration',
                'material_quality_hold',
                'tool_gage_life_calibration',
                'nc_program_checksum',
                'ipqc_containment_plan',
            ],
        ];
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function evaluateReleaseOrStart(array $context, ?DateTimeImmutable $asOf = null): array
    {
        return $this->evaluateReadiness($context, $asOf);
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function evaluateMaterialIssue(array $context, ?DateTimeImmutable $asOf = null): array
    {
        $context['readiness_scope'] = $context['readiness_scope'] ?? 'material_issue';
        $context['command_name'] = $context['command_name'] ?? 'IssueMaterial';

        return $this->evaluateReadiness($context, $asOf);
    }

    /**
     * @param array<string, mixed> $inspection
     * @param array<int, array<string, mixed>> $existingOpenCases
     * @return array<string, mixed>
     */
    public function planIpqcFailureContainment(array $inspection, array $existingOpenCases = []): array
    {
        $result = strtolower($this->text($inspection['result'] ?? $inspection['inspection_result'] ?? ''));
        if (!in_array($result, ['fail', 'failed', 'reject', 'rejected', 'nc', 'nonconforming'], true)) {
            return [
                'allowed' => true,
                'status' => 'passed',
                'reason_code' => 'ipqc_result_not_failed',
                'message' => 'IPQC result does not require containment.',
            ];
        }

        $failure = $inspection + [
            'inspection_stage' => 'ipqc',
            'source_type' => 'ipqc',
            'source_id' => $this->text($inspection['inspection_id'] ?? $inspection['ipqc_id'] ?? $inspection['source_id'] ?? ''),
            'result' => $result,
        ];

        $plan = $this->qualityAuthority()->createFailureContainmentPlan($failure, $existingOpenCases);
        if (($plan['allowed'] ?? false) === true) {
            $plan['runtime_event'] = $this->buildRuntimeEvent('quality.containment_required', [
                'event_state' => 'planned',
                'source_aggregate_type' => 'ipqc',
                'source_aggregate_ref' => $this->text($failure['source_id'] ?? ''),
                'work_order_ref' => $this->text($inspection['work_order_id'] ?? $inspection['wo_number'] ?? ''),
                'operation_ref' => $this->text($inspection['operation_ref'] ?? $inspection['operation_seq'] ?? ''),
                'material_lot_ref' => $this->text($inspection['lot_id'] ?? $inspection['lot_number'] ?? ''),
                'inspection_ref' => $this->text($failure['source_id'] ?? ''),
                'quality_case_ref' => $this->text($plan['nonconformance']['nonconformance_no'] ?? ''),
                'payload' => [
                    'containment_plan' => [
                        'reason_code' => $plan['reason_code'] ?? '',
                        'gates_blocked' => $plan['gates_blocked'] ?? [],
                        'holds' => $plan['holds'] ?? [],
                    ],
                ],
            ]);
        }

        return $plan;
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function buildRuntimeEvent(string $eventType, array $context): array
    {
        $event = [
            'event_type' => $eventType,
            'event_state' => $this->text($context['event_state'] ?? 'recorded') ?: 'recorded',
            'source_system' => $this->text($context['source_system'] ?? 'mom') ?: 'mom',
            'source_aggregate_type' => $this->text($context['source_aggregate_type'] ?? 'work_order'),
            'source_aggregate_ref' => $this->text($context['source_aggregate_ref'] ?? $context['work_order_ref'] ?? $context['wo_number'] ?? $context['job_ref'] ?? ''),
            'work_order_ref' => $this->text($context['work_order_ref'] ?? $context['wo_number'] ?? $context['work_order_id'] ?? ''),
            'job_ref' => $this->text($context['job_ref'] ?? $context['job_number'] ?? $context['job_id'] ?? ''),
            'operation_ref' => $this->text($context['operation_ref'] ?? $context['operation_seq'] ?? ''),
            'work_center_ref' => $this->text($context['work_center_ref'] ?? $context['work_center_id'] ?? ''),
            'machine_ref' => $this->text($context['machine_ref'] ?? $context['machine_id'] ?? $context['equipment_id'] ?? ''),
            'operator_ref' => $this->text($context['operator_ref'] ?? $context['operator_id'] ?? $context['employee_id'] ?? ''),
            'material_lot_ref' => $this->text($context['material_lot_ref'] ?? $context['lot_id'] ?? $context['lot_number'] ?? ''),
            'tool_ref' => $this->text($context['tool_ref'] ?? $context['tool_id'] ?? ''),
            'nc_program_ref' => $this->text($context['nc_program_ref'] ?? $context['nc_program_id'] ?? $context['program_id'] ?? ''),
            'inspection_ref' => $this->text($context['inspection_ref'] ?? $context['inspection_id'] ?? ''),
            'quality_case_ref' => $this->text($context['quality_case_ref'] ?? $context['ncr_id'] ?? ''),
            'occurred_at' => $this->text($context['occurred_at'] ?? gmdate(DATE_ATOM)),
            'command_correlation_id' => $this->text($context['command_correlation_id'] ?? $context['correlation_id'] ?? ''),
            'idempotency_key' => $this->text($context['idempotency_key'] ?? ''),
            'payload' => is_array($context['payload'] ?? null) ? (array)$context['payload'] : [],
            'metadata' => is_array($context['metadata'] ?? null) ? (array)$context['metadata'] : [],
        ];

        $event['event_hash_sha256'] = $this->hashPayload($event);

        return $event;
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function evaluateReadiness(array $context, ?DateTimeImmutable $asOf = null): array
    {
        $asOf = $asOf ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $gateResults = [
            'operator_qualification' => $this->checkOperatorQualification($context, $asOf),
            'machine_readiness' => $this->checkMachineReadiness($context, $asOf),
            'material_quality_hold' => $this->checkMaterialQualityHolds($context),
            'tool_gage_readiness' => $this->checkToolGageReadiness($context, $asOf),
            'nc_program_checksum' => $this->checkNcProgramChecksum($context),
        ];

        $blockers = [];
        foreach ($gateResults as $gate => $result) {
            if (($result['allowed'] ?? false) === true) {
                continue;
            }
            $blockers[] = [
                'gate' => $gate,
                'code' => $this->text($result['reason_code'] ?? 'resource_readiness_blocked'),
                'message' => $this->text($result['message'] ?? 'Resource readiness gate blocked.'),
                'context' => $result['context'] ?? [],
            ];
        }

        $snapshot = $this->buildReadinessSnapshot($context, $gateResults, $blockers, $asOf);
        $decision = [
            'allowed' => $blockers === [],
            'status' => $blockers === [] ? 'passed' : 'blocked',
            'reason_code' => $blockers === [] ? 'resource_readiness_ready' : 'resource_readiness_blocked',
            'message' => $blockers === [] ? 'Resource readiness gates passed.' : 'One or more resource readiness gates blocked execution.',
            'blockers' => $blockers,
            'gate_results' => $gateResults,
            'readiness_snapshot' => $snapshot,
            'runtime_event' => $this->buildRuntimeEvent('resource.readiness_evaluated', [
                'event_state' => $blockers === [] ? 'recorded' : 'blocked',
                'source_aggregate_type' => 'resource_readiness_snapshot',
                'source_aggregate_ref' => $snapshot['snapshot_hash_sha256'],
                'work_order_ref' => $snapshot['work_order_ref'],
                'job_ref' => $snapshot['job_ref'],
                'operation_ref' => $snapshot['operation_ref'],
                'work_center_ref' => $snapshot['work_center_ref'],
                'machine_ref' => $snapshot['machine_ref'],
                'operator_ref' => $snapshot['operator_ref'],
                'material_lot_ref' => $snapshot['material_lot_ref'],
                'nc_program_ref' => $snapshot['nc_program_ref'],
                'command_correlation_id' => $snapshot['command_correlation_id'],
                'idempotency_key' => $snapshot['idempotency_key'],
                'occurred_at' => $snapshot['evaluated_at'],
                'payload' => [
                    'readiness_state' => $snapshot['readiness_state'],
                    'blocker_codes' => $snapshot['blocker_codes'],
                    'gate_results' => $gateResults,
                ],
            ]),
        ];

        if ($blockers === []) {
            unset($decision['blockers']);
        }

        return $decision;
    }

    /** @param array<string, mixed> $context */
    private function checkOperatorQualification(array $context, DateTimeImmutable $asOf): array
    {
        $qualification = $context['operator_qualification'] ?? $context['qualification'] ?? null;
        $qualificationList = is_array($context['operator_qualifications'] ?? null) ? (array)$context['operator_qualifications'] : [];
        if ($qualification === null && $qualificationList !== []) {
            $qualification = $qualificationList[0];
        }

        if (!is_array($qualification)) {
            if ((bool)($context['require_operator_qualification'] ?? false)) {
                return $this->blocked('operator_qualification_missing', 'Operator qualification evidence is required.', [
                    'operator_ref' => $this->text($context['operator_ref'] ?? $context['operator_id'] ?? $context['employee_id'] ?? ''),
                ]);
            }

            return $this->allowed('operator_qualification_not_provided', 'Operator qualification gate has no provided evidence in this slice.');
        }

        $status = strtolower($this->text($qualification['status'] ?? $qualification['qualification_level'] ?? 'active'));
        if (in_array($status, self::BLOCKING_OPERATOR_STATUSES, true) || (bool)($qualification['is_active'] ?? true) === false) {
            return $this->blocked('operator_training_expired', 'Operator qualification is expired, inactive, suspended, or revoked.', [
                'operator_ref' => $this->text($qualification['employee_id'] ?? $context['operator_id'] ?? ''),
                'status' => $status,
            ]);
        }

        $expiry = $this->text($qualification['expires_at'] ?? $qualification['expiry_date'] ?? '');
        if ($expiry !== '' && $this->isPast($expiry, $asOf, true)) {
            return $this->blocked('operator_training_expired', 'Operator qualification expiry date is in the past.', [
                'operator_ref' => $this->text($qualification['employee_id'] ?? $context['operator_id'] ?? ''),
                'expiry_date' => $expiry,
            ]);
        }

        return $this->allowed('operator_qualification_ready', 'Operator qualification gate passed.');
    }

    /** @param array<string, mixed> $context */
    private function checkMachineReadiness(array $context, DateTimeImmutable $asOf): array
    {
        $machine = is_array($context['machine'] ?? null)
            ? (array)$context['machine']
            : (is_array($context['equipment'] ?? null) ? (array)$context['equipment'] : []);

        if ($machine === []) {
            if ((bool)($context['require_machine_readiness_evidence'] ?? false)) {
                return $this->blocked('machine_readiness_evidence_missing', 'Machine readiness evidence is required.');
            }
            return $this->allowed('machine_readiness_not_provided', 'Machine readiness gate has no provided evidence in this slice.');
        }

        $status = strtolower($this->text($machine['status'] ?? $machine['machine_status'] ?? $machine['resource_status'] ?? 'active'));
        if (in_array($status, self::BLOCKING_MACHINE_STATUSES, true)) {
            return $this->blocked('machine_unavailable', 'Machine status blocks release/start.', [
                'machine_ref' => $this->text($machine['machine_id'] ?? $machine['equipment_id'] ?? $context['machine_id'] ?? ''),
                'status' => $status,
            ]);
        }

        $pmStatus = strtolower($this->text($machine['pm_status'] ?? $machine['maintenance_status'] ?? 'current'));
        if (in_array($pmStatus, ['overdue', 'expired', 'due', 'blocked'], true)) {
            return $this->blocked('machine_pm_overdue', 'Machine preventive maintenance is overdue.', [
                'machine_ref' => $this->text($machine['machine_id'] ?? $machine['equipment_id'] ?? $context['machine_id'] ?? ''),
                'pm_status' => $pmStatus,
            ]);
        }

        foreach (['pm_due_at', 'next_pm_due_at', 'maintenance_due_at', 'next_maintenance_due_at'] as $field) {
            $value = $this->text($machine[$field] ?? '');
            if ($value !== '' && $this->isPast($value, $asOf, false)) {
                return $this->blocked('machine_pm_overdue', 'Machine preventive maintenance due date is in the past.', [
                    'machine_ref' => $this->text($machine['machine_id'] ?? $machine['equipment_id'] ?? $context['machine_id'] ?? ''),
                    $field => $value,
                ]);
            }
        }

        $calibrationStatus = strtolower($this->text($machine['calibration_status'] ?? 'current'));
        if (in_array($calibrationStatus, ['expired', 'oot', 'out_of_tolerance', 'blocked'], true)) {
            return $this->blocked('machine_calibration_expired', 'Machine calibration status blocks release/start.', [
                'machine_ref' => $this->text($machine['machine_id'] ?? $machine['equipment_id'] ?? $context['machine_id'] ?? ''),
                'calibration_status' => $calibrationStatus,
            ]);
        }

        $calibrationDue = $this->text($machine['calibration_due_at'] ?? $machine['next_calibration_due_at'] ?? '');
        if ($calibrationDue !== '' && $this->isPast($calibrationDue, $asOf, true)) {
            return $this->blocked('machine_calibration_expired', 'Machine calibration due date is in the past.', [
                'machine_ref' => $this->text($machine['machine_id'] ?? $machine['equipment_id'] ?? $context['machine_id'] ?? ''),
                'calibration_due_at' => $calibrationDue,
            ]);
        }

        return $this->allowed('machine_readiness_ready', 'Machine PM/calibration gate passed.');
    }

    /** @param array<string, mixed> $context */
    private function checkMaterialQualityHolds(array $context): array
    {
        $holds = is_array($context['quality_holds'] ?? null) ? (array)$context['quality_holds'] : [];
        $lotRefs = $this->materialLotRefs($context);
        if ($lotRefs === []) {
            return $this->allowed('material_lot_not_provided', 'Material lot hold gate has no lot reference in this slice.');
        }

        foreach ($lotRefs as $lotRef) {
            $gate = $this->qualityAuthority()->evaluateHoldGate('lot', $lotRef, $holds);
            if (($gate['allowed'] ?? false) === false) {
                return $this->blocked('material_lot_on_hold', 'Material lot has an active canonical quality hold.', [
                    'lot_ref' => $lotRef,
                    'quality_hold_gate' => $gate,
                ]);
            }
        }

        return $this->allowed('material_lot_hold_clear', 'No active canonical quality hold blocks material lots.');
    }

    /** @param array<string, mixed> $context */
    private function checkToolGageReadiness(array $context, DateTimeImmutable $asOf): array
    {
        $resources = [];
        foreach (['tools', 'tooling', 'gages', 'gauges'] as $field) {
            if (is_array($context[$field] ?? null)) {
                foreach ((array)$context[$field] as $resource) {
                    if (is_array($resource)) {
                        $resources[] = $resource;
                    }
                }
            }
        }

        if ($resources === []) {
            return $this->allowed('tool_gage_not_provided', 'Tool/gage gate has no provided evidence in this slice.');
        }

        foreach ($resources as $resource) {
            $ref = $this->text($resource['tool_id'] ?? $resource['gage_id'] ?? $resource['id'] ?? '');
            $status = strtolower($this->text($resource['status'] ?? $resource['tool_status'] ?? $resource['gage_status'] ?? 'active'));
            if (in_array($status, self::BLOCKING_TOOL_STATUSES, true)) {
                return $this->blocked('tool_or_gage_not_ready', 'Tool/gage status blocks release/start.', [
                    'resource_ref' => $ref,
                    'status' => $status,
                ]);
            }

            $lifeRemaining = $resource['life_remaining'] ?? $resource['life_remaining_pct'] ?? null;
            if (is_numeric($lifeRemaining) && (float)$lifeRemaining <= 0.0) {
                return $this->blocked('tool_life_exhausted', 'Tool life is exhausted.', [
                    'resource_ref' => $ref,
                    'life_remaining' => (float)$lifeRemaining,
                ]);
            }

            $calibrationDue = $this->text($resource['calibration_due_at'] ?? $resource['next_calibration_due_at'] ?? '');
            if ($calibrationDue !== '' && $this->isPast($calibrationDue, $asOf, true)) {
                return $this->blocked('gage_calibration_expired', 'Gage/tool calibration due date is in the past.', [
                    'resource_ref' => $ref,
                    'calibration_due_at' => $calibrationDue,
                ]);
            }

            $msaStatus = strtolower($this->text($resource['msa_status'] ?? $resource['grr_status'] ?? 'acceptable'));
            if (in_array($msaStatus, ['failed', 'unacceptable', 'expired', 'blocked'], true)) {
                return $this->blocked('gage_msa_not_acceptable', 'Gage MSA/GRR status blocks CTQ work.', [
                    'resource_ref' => $ref,
                    'msa_status' => $msaStatus,
                ]);
            }
        }

        return $this->allowed('tool_gage_readiness_ready', 'Tool/gage readiness gate passed.');
    }

    /** @param array<string, mixed> $context */
    private function checkNcProgramChecksum(array $context): array
    {
        $expected = strtolower($this->text($context['expected_nc_checksum_sha256'] ?? $context['expected_checksum_sha256'] ?? ''));
        $actual = strtolower($this->text($context['actual_nc_checksum_sha256'] ?? $context['controller_nc_checksum_sha256'] ?? $context['actual_checksum_sha256'] ?? ''));
        if (is_array($context['nc_program'] ?? null)) {
            $program = (array)$context['nc_program'];
            $expected = $expected !== '' ? $expected : strtolower($this->text($program['expected_checksum_sha256'] ?? $program['checksum_sha256'] ?? ''));
            $actual = $actual !== '' ? $actual : strtolower($this->text($program['actual_checksum_sha256'] ?? $program['controller_checksum_sha256'] ?? $program['controller_checksum'] ?? ''));
        }

        if ($expected === '' && $actual === '') {
            return $this->allowed('nc_checksum_not_provided', 'NC checksum gate has no provided evidence in this slice.');
        }
        if ($expected !== '' && !$this->isSha256($expected)) {
            return $this->blocked('nc_expected_checksum_invalid', 'Expected NC checksum must be SHA-256.', [
                'expected_nc_checksum_sha256' => $expected,
            ]);
        }
        if ($actual !== '' && !$this->isSha256($actual)) {
            return $this->blocked('nc_actual_checksum_invalid', 'Controller NC checksum must be SHA-256.', [
                'actual_nc_checksum_sha256' => $actual,
            ]);
        }
        if ($expected !== '' && $actual === '' && (bool)($context['require_controller_nc_checksum'] ?? false)) {
            return $this->blocked('nc_controller_checksum_missing', 'Controller NC checksum is required before start.', [
                'expected_nc_checksum_sha256' => $expected,
            ]);
        }
        if ($expected !== '' && $actual !== '' && !hash_equals($expected, $actual)) {
            return $this->blocked('nc_checksum_mismatch', 'Controller NC program checksum does not match the released checksum.', [
                'expected_nc_checksum_sha256' => $expected,
                'actual_nc_checksum_sha256' => $actual,
            ]);
        }

        return $this->allowed('nc_checksum_ready', 'NC checksum gate passed.');
    }

    /**
     * @param array<string, mixed> $context
     * @param array<string, array<string, mixed>> $gateResults
     * @param list<array<string, mixed>> $blockers
     * @return array<string, mixed>
     */
    private function buildReadinessSnapshot(array $context, array $gateResults, array $blockers, DateTimeImmutable $asOf): array
    {
        $snapshot = [
            'command_name' => $this->text($context['command_name'] ?? 'ResourceReadiness.Evaluate') ?: 'ResourceReadiness.Evaluate',
            'readiness_scope' => $this->text($context['readiness_scope'] ?? 'work_order_start') ?: 'work_order_start',
            'readiness_state' => $blockers === [] ? 'ready' : 'blocked',
            'work_order_ref' => $this->text($context['work_order_ref'] ?? $context['wo_number'] ?? $context['work_order_id'] ?? ''),
            'job_ref' => $this->text($context['job_ref'] ?? $context['job_number'] ?? $context['job_id'] ?? ''),
            'operation_ref' => $this->text($context['operation_ref'] ?? $context['operation_seq'] ?? ''),
            'work_center_ref' => $this->text($context['work_center_ref'] ?? $context['work_center_id'] ?? ''),
            'machine_ref' => $this->text($context['machine_ref'] ?? $context['machine_id'] ?? $context['equipment_id'] ?? ''),
            'operator_ref' => $this->text($context['operator_ref'] ?? $context['operator_id'] ?? $context['employee_id'] ?? ''),
            'material_lot_ref' => $this->materialLotRefs($context)[0] ?? '',
            'tool_refs' => $this->resourceRefs($context, ['tools', 'tooling'], ['tool_id', 'id']),
            'gage_refs' => $this->resourceRefs($context, ['gages', 'gauges'], ['gage_id', 'tool_id', 'id']),
            'engineering_package_ref' => $this->text($context['engineering_package_ref'] ?? $context['engineering_release_package_id'] ?? ''),
            'engineering_package_hash_sha256' => $this->text($context['engineering_package_hash_sha256'] ?? $context['package_hash_sha256'] ?? ''),
            'nc_program_ref' => $this->text($context['nc_program_ref'] ?? $context['nc_program_id'] ?? $context['program_id'] ?? ''),
            'expected_nc_checksum_sha256' => strtolower($this->text($context['expected_nc_checksum_sha256'] ?? $context['expected_checksum_sha256'] ?? '')),
            'actual_nc_checksum_sha256' => strtolower($this->text($context['actual_nc_checksum_sha256'] ?? $context['controller_nc_checksum_sha256'] ?? $context['actual_checksum_sha256'] ?? '')),
            'blocker_codes' => array_values(array_map(static fn(array $blocker): string => (string)($blocker['code'] ?? ''), $blockers)),
            'gate_results' => $gateResults,
            'quality_hold_refs' => $this->qualityHoldRefs($gateResults),
            'evaluated_by' => $this->text($context['evaluated_by'] ?? $context['actor_user_id'] ?? $context['operator_id'] ?? ''),
            'evaluated_at' => $asOf->setTimezone(new DateTimeZone('UTC'))->format(DATE_ATOM),
            'command_correlation_id' => $this->text($context['command_correlation_id'] ?? $context['correlation_id'] ?? ''),
            'idempotency_key' => $this->text($context['idempotency_key'] ?? ''),
            'metadata' => is_array($context['metadata'] ?? null) ? (array)$context['metadata'] : [],
        ];
        $snapshot['snapshot_hash_sha256'] = $this->hashPayload($snapshot);

        return $snapshot;
    }

    /** @return list<string> */
    private function materialLotRefs(array $context): array
    {
        $refs = [];
        foreach (['material_lot_ref', 'material_lot_id', 'lot_id', 'lot_number'] as $field) {
            $ref = $this->text($context[$field] ?? '');
            if ($ref !== '') {
                $refs[] = $ref;
            }
        }
        if (is_array($context['material_lots'] ?? null)) {
            foreach ((array)$context['material_lots'] as $lot) {
                if (!is_array($lot)) {
                    continue;
                }
                $ref = $this->text($lot['material_lot_ref'] ?? $lot['material_lot_id'] ?? $lot['lot_id'] ?? $lot['lot_number'] ?? '');
                if ($ref !== '') {
                    $refs[] = $ref;
                }
            }
        }

        return array_values(array_unique($refs));
    }

    /**
     * @param list<string> $fields
     * @param list<string> $idFields
     * @return list<string>
     */
    private function resourceRefs(array $context, array $fields, array $idFields): array
    {
        $refs = [];
        foreach ($fields as $field) {
            if (!is_array($context[$field] ?? null)) {
                continue;
            }
            foreach ((array)$context[$field] as $resource) {
                if (!is_array($resource)) {
                    continue;
                }
                foreach ($idFields as $idField) {
                    $ref = $this->text($resource[$idField] ?? '');
                    if ($ref !== '') {
                        $refs[] = $ref;
                        break;
                    }
                }
            }
        }

        return array_values(array_unique($refs));
    }

    /** @param array<string, array<string, mixed>> $gateResults */
    private function qualityHoldRefs(array $gateResults): array
    {
        $refs = [];
        $active = $gateResults['material_quality_hold']['context']['quality_hold_gate']['active_holds'] ?? [];
        if (is_array($active)) {
            foreach ($active as $hold) {
                if (!is_array($hold)) {
                    continue;
                }
                $ref = $this->text($hold['quality_hold_id'] ?? '');
                if ($ref !== '') {
                    $refs[] = $ref;
                }
            }
        }

        return array_values(array_unique($refs));
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

    private function isSha256(string $hash): bool
    {
        return preg_match('/^[a-f0-9]{64}$/', $hash) === 1;
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

if (!class_exists('MOM\\Api\\Services\\ResourceReadinessService', false)) {
    class_alias(ResourceReadinessService::class, 'MOM\\Api\\Services\\ResourceReadinessService');
}
