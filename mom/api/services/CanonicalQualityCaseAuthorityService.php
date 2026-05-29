<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Runtime guard for canonical quality hold and case linkage.
 *
 * This service evaluates the quality-case decisions that later domain command
 * handlers must commit in PostgreSQL. It does not mutate legacy JSON stores and
 * it does not release holds without P32 regulated evidence.
 */
final class CanonicalQualityCaseAuthorityService
{
    private const ACTIVE_HOLD_STATUSES = ['active', 'open', 'on_hold', 'quality_hold', 'quarantine'];
    private const CLOSED_CASE_STATUSES = ['closed', 'resolved', 'released', 'voided', 'cancelled', 'canceled'];
    private const FAIL_RESULTS = ['fail', 'failed', 'reject', 'rejected', 'nc', 'nonconforming'];
    private const CRITICAL_SCAR_SEVERITIES = ['critical', 'high', 'major', 'safety'];

    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'canonical_quality_case_authority',
            'readiness_state' => 'service_gate_partial',
            'hold_authority' => 'quality_holds',
            'trigger_ledger_authority' => 'quality_order_trigger_ledger',
            'trace_link_authority' => 'quality_case_trace_link',
            'quality_order_authority' => 'quality_order',
            'ncr_authority' => 'nonconformance/ncr_records',
            'mrb_authority' => 'material_review_board/ncr_mrb_decisions',
            'capa_authority' => 'capa/capa_records',
            'complaint_authority' => 'complaint/customer_complaints',
            'scar_authority' => 'scar_records',
            'regulated_release_gate' => RegulatedCommandEvidenceGateService::class,
            'generic_crud_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $holds
     * @return array<string, mixed>
     */
    public function evaluateHoldGate(string $subjectType, string $subjectRef, array $holds): array
    {
        $subjectType = $this->text($subjectType);
        $subjectRef = $this->text($subjectRef);
        if ($subjectType === '' || $subjectRef === '') {
            return $this->blocked('quality_hold_subject_required', 'Quality hold gate requires subject_type and subject_ref.');
        }

        $active = [];
        foreach ($holds as $hold) {
            if (!is_array($hold) || !$this->holdMatches($hold, $subjectType, $subjectRef)) {
                continue;
            }
            $status = strtolower($this->text($hold['hold_status'] ?? $hold['status'] ?? 'active'));
            if (in_array($status, self::ACTIVE_HOLD_STATUSES, true)) {
                $active[] = [
                    'quality_hold_id' => $this->text($hold['quality_hold_id'] ?? $hold['hold_id'] ?? $hold['id'] ?? ''),
                    'source_type' => $this->text($hold['source_type'] ?? ''),
                    'source_ref' => $this->text($hold['source_ref'] ?? $hold['source_id'] ?? ''),
                    'severity_code' => $this->text($hold['severity_code'] ?? $hold['severity'] ?? ''),
                ];
            }
        }

        if ($active !== []) {
            return $this->blocked('active_quality_hold_blocks_subject', 'Active quality hold blocks governed movement/release.', [
                'subject_type' => $subjectType,
                'subject_ref' => $subjectRef,
                'active_holds' => $active,
            ]);
        }

        return $this->allowed('no_active_quality_hold', 'No active canonical quality hold found for subject.', [
            'subject_type' => $subjectType,
            'subject_ref' => $subjectRef,
        ]);
    }

    /**
     * @param array<string, mixed> $failure
     * @param array<int, array<string, mixed>> $existingOpenCases
     * @return array<string, mixed>
     */
    public function createFailureContainmentPlan(array $failure, array $existingOpenCases = []): array
    {
        $sourceType = strtolower($this->text($failure['source_type'] ?? $failure['inspection_stage'] ?? ''));
        $sourceRef = $this->text($failure['source_ref'] ?? $failure['source_id'] ?? '');
        $result = strtolower($this->text($failure['result'] ?? ''));
        $stage = strtolower($this->text($failure['inspection_stage'] ?? $sourceType));
        if ($sourceType === '' || $sourceRef === '') {
            return $this->blocked('quality_failure_source_required', 'Quality failure requires source_type/source_ref.');
        }
        if (!in_array($result, self::FAIL_RESULTS, true)) {
            return $this->allowed('quality_result_not_failed', 'Quality result does not require containment.', [
                'source_type' => $sourceType,
                'source_ref' => $sourceRef,
            ]);
        }
        if ($this->openCaseExists($existingOpenCases, $sourceType, $sourceRef)) {
            return $this->blocked('duplicate_open_quality_case_for_source', 'Duplicate open quality case for the same source is blocked.', [
                'source_type' => $sourceType,
                'source_ref' => $sourceRef,
            ]);
        }

        $triggerHash = hash('sha256', json_encode([
            'source_type' => $sourceType,
            'source_ref' => $sourceRef,
            'stage' => $stage,
            'result' => $result,
            'defects' => $failure['defects'] ?? [],
        ], JSON_UNESCAPED_SLASHES));

        $severity = strtolower($this->text($failure['severity'] ?? 'major'));
        if (!in_array($severity, ['minor', 'major', 'critical', 'safety'], true)) {
            $severity = 'major';
        }

        $qualityOrderNo = 'QO-' . strtoupper($stage) . '-' . substr($triggerHash, 0, 12);
        $ncrNo = 'NCR-' . strtoupper($stage) . '-' . substr($triggerHash, 12, 12);
        $plan = [
            'allowed' => true,
            'status' => 'planned',
            'reason_code' => 'quality_failure_containment_required',
            'trigger_hash_sha256' => $triggerHash,
            'quality_order' => [
                'quality_order_no' => $qualityOrderNo,
                'source_type' => $sourceType,
                'source_ref' => $sourceRef,
                'case_type' => 'nonconformance',
                'severity_code' => $severity,
                'status_code' => 'containment_active',
            ],
            'nonconformance' => [
                'nonconformance_no' => $ncrNo,
                'source_type' => $sourceType,
                'source_ref' => $sourceRef,
                'status_code' => 'containment_active',
                'containment_action' => 'canonical_quality_hold',
            ],
            'holds' => [],
            'case_links' => [
                ['relationship_code' => 'quality_order_to_ncr', 'case_ref_type' => 'quality_order', 'case_ref' => $qualityOrderNo, 'trace_entity_type' => 'ncr', 'trace_entity_ref' => $ncrNo],
                ['relationship_code' => 'ncr_to_capa_review', 'case_ref_type' => 'ncr', 'case_ref' => $ncrNo, 'trace_entity_type' => 'capa_review', 'trace_entity_ref' => 'CAPA-REVIEW-' . substr($triggerHash, 24, 8)],
            ],
            'gates_blocked' => [],
            'outbox_events' => [
                ['event_type' => 'quality.ncr.created', 'aggregate_type' => 'nonconformance', 'aggregate_id' => $ncrNo],
                ['event_type' => 'quality.hold.applied', 'aggregate_type' => 'quality_order', 'aggregate_id' => $qualityOrderNo],
            ],
        ];

        foreach ($this->subjectsForFailure($failure, $stage) as $subject) {
            $plan['holds'][] = [
                'hold_number' => 'HOLD-' . strtoupper($stage) . '-' . substr(hash('sha256', $subject['subject_type'] . '|' . $subject['subject_ref'] . '|' . $triggerHash), 0, 12),
                'subject_type' => $subject['subject_type'],
                'subject_ref' => $subject['subject_ref'],
                'hold_reason_code' => $stage . '_failure',
                'severity_code' => $severity,
                'source_type' => $sourceType,
                'source_ref' => $sourceRef,
                'hold_status' => 'active',
            ];
            $plan['case_links'][] = [
                'relationship_code' => 'held_subject',
                'case_ref_type' => 'ncr',
                'case_ref' => $ncrNo,
                'trace_entity_type' => $subject['subject_type'],
                'trace_entity_ref' => $subject['subject_ref'],
            ];
        }

        $plan['gates_blocked'] = match ($stage) {
            'iqc', 'incoming', 'incoming_inspection' => ['putaway_inventory', 'supplier_item_approval_if_critical'],
            'oqc', 'final_inspection', 'shipment' => ['packing_confirm', 'shipment_release', 'delivery_confirm'],
            default => ['issue_material', 'complete_operation', 'shipment_release'],
        };

        return $plan;
    }

    /**
     * @param array<string, mixed> $disposition
     * @param array<string, mixed> $regulatedEvidenceResult
     * @return array<string, mixed>
     */
    public function evaluateMrbDisposition(array $disposition, array $regulatedEvidenceResult): array
    {
        $decision = strtolower($this->text($disposition['disposition'] ?? $disposition['disposition_decision'] ?? ''));
        if ($decision === '') {
            return $this->blocked('mrb_disposition_required', 'MRB disposition decision is required.');
        }

        if ($decision === 'use_as_is') {
            if (($regulatedEvidenceResult['allowed'] ?? false) !== true) {
                return $this->blocked('mrb_use_as_is_esign_required', 'Use-as-is MRB disposition requires approved regulated e-sign evidence.', [
                    'evidence_reason_code' => $regulatedEvidenceResult['reason_code'] ?? 'missing_regulated_evidence',
                ]);
            }
            if ((bool)($disposition['customer_concession_required'] ?? false)
                && $this->text($disposition['customer_concession_ref'] ?? $disposition['customer_concession_number'] ?? '') === '') {
                return $this->blocked('mrb_customer_concession_required', 'Use-as-is MRB disposition requires customer concession reference.');
            }
        }

        return $this->allowed('mrb_disposition_gate_ready', 'MRB disposition has required evidence for this gate.', [
            'disposition' => $decision,
        ]);
    }

    /**
     * @param array<string, mixed> $supplierApproval
     * @param array<int, array<string, mixed>> $scars
     * @return array<string, mixed>
     */
    public function evaluateSupplierApprovalAgainstScar(array $supplierApproval, array $scars): array
    {
        $supplierRef = $this->text($supplierApproval['supplier_ref'] ?? $supplierApproval['vendor_id'] ?? $supplierApproval['supplier_id'] ?? '');
        $itemRef = $this->text($supplierApproval['item_ref'] ?? $supplierApproval['item_id'] ?? $supplierApproval['part_number'] ?? '');
        foreach ($scars as $scar) {
            if (!is_array($scar)) {
                continue;
            }
            if (!$this->scarMatchesSupplierItem($scar, $supplierRef, $itemRef)) {
                continue;
            }
            $severity = strtolower($this->text($scar['severity'] ?? $scar['priority'] ?? ''));
            $status = strtolower($this->text($scar['status'] ?? 'issued'));
            if (in_array($severity, self::CRITICAL_SCAR_SEVERITIES, true) && !in_array($status, self::CLOSED_CASE_STATUSES, true)) {
                return $this->blocked('critical_scar_blocks_supplier_item_approval', 'Open critical SCAR blocks supplier item approval.', [
                    'scar_ref' => $this->text($scar['scar_id'] ?? $scar['id'] ?? $scar['scar_number'] ?? ''),
                    'supplier_ref' => $supplierRef,
                    'item_ref' => $itemRef,
                    'scar_status' => $status,
                ]);
            }
        }

        return $this->allowed('no_blocking_critical_scar', 'No open critical SCAR blocks supplier item approval.', [
            'supplier_ref' => $supplierRef,
            'item_ref' => $itemRef,
        ]);
    }

    /**
     * @param array<string, mixed> $complaint
     * @param array<int, array<string, mixed>> $traceLinks
     * @return array<string, mixed>
     */
    public function traceComplaintBackward(array $complaint, array $traceLinks): array
    {
        $complaintRef = $this->text($complaint['complaint_ref'] ?? $complaint['complaint_id'] ?? $complaint['id'] ?? $complaint['complaint_number'] ?? '');
        if ($complaintRef === '') {
            return $this->blocked('complaint_ref_required', 'Complaint trace requires complaint reference.');
        }

        $found = [];
        foreach ($traceLinks as $link) {
            if (!is_array($link)) {
                continue;
            }
            $caseRef = $this->text($link['case_ref'] ?? $link['complaint_ref'] ?? '');
            $caseType = strtolower($this->text($link['case_ref_type'] ?? 'complaint'));
            if ($caseRef !== $complaintRef || $caseType !== 'complaint') {
                continue;
            }
            $type = strtolower($this->text($link['trace_entity_type'] ?? $link['entity_type'] ?? ''));
            $ref = $this->text($link['trace_entity_ref'] ?? $link['entity_ref'] ?? '');
            if ($type !== '' && $ref !== '') {
                $found[$type][] = $ref;
            }
        }

        $missing = [];
        foreach (['shipment', 'lot', 'serial'] as $required) {
            if (($found[$required] ?? []) === []) {
                $missing[] = $required;
            }
        }
        if ($missing !== []) {
            return $this->blocked('complaint_backward_trace_incomplete', 'Complaint must trace back to shipment, lot, and serial.', [
                'complaint_ref' => $complaintRef,
                'missing_trace' => $missing,
                'found_trace' => $found,
            ]);
        }

        return $this->allowed('complaint_backward_trace_ready', 'Complaint has backward shipment/lot/serial trace.', [
            'complaint_ref' => $complaintRef,
            'trace' => $found,
        ]);
    }

    /** @param array<string, mixed> $hold */
    private function holdMatches(array $hold, string $subjectType, string $subjectRef): bool
    {
        $type = strtolower($this->text($hold['subject_type'] ?? $hold['hold_subject_type'] ?? ''));
        $ref = $this->text($hold['subject_ref'] ?? $hold['subject_id'] ?? $hold['lot_number'] ?? $hold['serial_number'] ?? '');
        return $type === strtolower($subjectType) && $ref === $subjectRef;
    }

    /**
     * @param array<int, array<string, mixed>> $cases
     */
    private function openCaseExists(array $cases, string $sourceType, string $sourceRef): bool
    {
        foreach ($cases as $case) {
            if (!is_array($case)) {
                continue;
            }
            $caseSourceType = strtolower($this->text($case['source_type'] ?? ''));
            $caseSourceRef = $this->text($case['source_ref'] ?? $case['source_id'] ?? '');
            $status = strtolower($this->text($case['status_code'] ?? $case['status'] ?? 'open'));
            if ($caseSourceType === $sourceType && $caseSourceRef === $sourceRef && !in_array($status, self::CLOSED_CASE_STATUSES, true)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<string, mixed> $failure
     * @return list<array{subject_type:string, subject_ref:string}>
     */
    private function subjectsForFailure(array $failure, string $stage): array
    {
        $subjects = [];
        $map = match ($stage) {
            'iqc', 'incoming', 'incoming_inspection' => [
                'receipt' => ['receipt_id', 'purchase_receipt_id'],
                'lot' => ['lot_id', 'lot_number'],
                'supplier' => ['supplier_id', 'vendor_id'],
            ],
            'oqc', 'final_inspection', 'shipment' => [
                'shipment' => ['shipment_id', 'packing_id'],
                'sales_order' => ['sales_order_id', 'so_number'],
                'lot' => ['lot_id', 'lot_number'],
                'serial' => ['serial_id', 'serial_number'],
            ],
            default => [
                'work_order' => ['work_order_id', 'wo_number'],
                'lot' => ['lot_id', 'lot_number'],
                'serial' => ['serial_id', 'serial_number'],
            ],
        };

        foreach ($map as $type => $fields) {
            foreach ($fields as $field) {
                $ref = $this->text($failure[$field] ?? '');
                if ($ref !== '') {
                    $subjects[] = ['subject_type' => $type, 'subject_ref' => $ref];
                    break;
                }
            }
        }

        return $subjects;
    }

    /** @param array<string, mixed> $scar */
    private function scarMatchesSupplierItem(array $scar, string $supplierRef, string $itemRef): bool
    {
        $scarSupplier = $this->text($scar['supplier_ref'] ?? $scar['supplier_id'] ?? $scar['vendor_id'] ?? '');
        if ($supplierRef !== '' && $scarSupplier !== '' && $scarSupplier !== $supplierRef) {
            return false;
        }
        if ($itemRef === '') {
            return true;
        }

        foreach (['item_ref', 'item_id', 'part_number'] as $field) {
            if ($this->text($scar[$field] ?? '') === $itemRef) {
                return true;
            }
        }

        $affected = $scar['affected_parts'] ?? $scar['affected_items'] ?? [];
        if (is_string($affected)) {
            return $affected === $itemRef;
        }
        if (is_array($affected)) {
            foreach ($affected as $entry) {
                if ($this->text($entry) === $itemRef || (is_array($entry) && $this->text($entry['item_ref'] ?? $entry['item_id'] ?? $entry['part_number'] ?? '') === $itemRef)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    /** @return array<string, mixed> */
    private function allowed(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => $reasonCode,
            'message' => $message,
        ] + $context;
    }

    /** @return array<string, mixed> */
    private function blocked(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => false,
            'status' => 'blocked',
            'reason_code' => $reasonCode,
            'message' => $message,
        ] + $context;
    }
}

if (!class_exists('MOM\\Api\\Services\\CanonicalQualityCaseAuthorityService', false)) {
    class_alias(CanonicalQualityCaseAuthorityService::class, 'MOM\\Api\\Services\\CanonicalQualityCaseAuthorityService');
}
