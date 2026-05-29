<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Runtime guard helpers for item/revision/site/spec authority.
 *
 * This slice evaluates release and cross-reference invariants. P31/P32 own
 * command mutation, audit/evidence, idempotency, and regulated e-sign.
 */
final class ItemRevisionAuthorityService
{
    private const RELEASED_STATES = ['released', 'active', 'production'];

    public function __construct(private readonly ?UomAuthorityService $uomAuthority = null)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'item_revision_authority',
            'readiness_state' => 'service_authority_partial',
            'item_authority' => 'item',
            'legacy_item_bridge' => 'item_legacy_key_bridge',
            'revision_authority' => 'item_revision',
            'site_profile_authority' => 'item_site_profile_authority',
            'spec_authority' => 'item_spec',
            'customer_crossref_authority' => 'item_customer_crossref_authority',
            'supplier_crossref_authority' => 'item_supplier_crossref_authority',
            'uom_release_dependency' => 'UomAuthorityService::assertUomApprovedForRelease',
            'generic_crud_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $before
     * @param array<string, mixed> $after
     * @return array<string, mixed>
     */
    public function evaluateReleasedRevisionEdit(array $before, array $after): array
    {
        $state = strtolower(trim((string)($before['lifecycle_state'] ?? $before['status'] ?? '')));
        if (!in_array($state, self::RELEASED_STATES, true)) {
            return [
                'allowed' => true,
                'status' => 'passed',
                'reason_code' => 'revision_not_released',
                'message' => 'Revision is not released; draft edits may proceed through command policy.',
            ];
        }

        foreach (['item_id', 'revision_code', 'drawing_reference', 'effective_from', 'release_hash'] as $field) {
            if (($before[$field] ?? null) !== ($after[$field] ?? null)) {
                return $this->blocked('released_revision_direct_edit', 'Released revision technical fields are immutable; create a new ECO revision instead.', [
                    'field' => $field,
                    'before' => $before[$field] ?? null,
                    'after' => $after[$field] ?? null,
                ]);
            }
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'released_revision_safe_transition',
            'message' => 'No immutable released revision fields changed.',
        ];
    }

    /**
     * @param array<string, mixed> $item
     * @param array<string, mixed> $revision
     * @param list<array<string, mixed>> $specs
     * @return array<string, mixed>
     */
    public function evaluateRevisionRelease(array $item, array $revision, array $specs = []): array
    {
        $uomCode = strtoupper(trim((string)($item['base_uom_code'] ?? $item['uom'] ?? '')));
        if ($uomCode === '') {
            return $this->blocked('item_base_uom_missing', 'Item revision release requires a base UOM.');
        }
        if ($this->uomAuthority !== null) {
            try {
                $this->uomAuthority->assertUomApprovedForRelease($uomCode);
            } catch (\DomainException $e) {
                return $this->blocked((string)$e->getMessage(), 'Item revision release requires an approved UOM.', [
                    'base_uom_code' => $uomCode,
                ]);
            }
        }

        $revisionState = strtolower(trim((string)($revision['lifecycle_state'] ?? $revision['status'] ?? 'draft')));
        if (!in_array($revisionState, ['draft', 'approved', 'pre_release'], true)) {
            return $this->blocked('revision_state_not_releasable', 'Revision is not in a releasable state.', [
                'lifecycle_state' => $revisionState,
            ]);
        }

        foreach ($specs as $spec) {
            if (!is_array($spec)) {
                continue;
            }
            $specStatus = strtolower(trim((string)($spec['status_code'] ?? 'active')));
            if ($specStatus !== 'active') {
                return $this->blocked('revision_spec_not_active', 'All release specs must be active.', [
                    'spec_code' => $spec['spec_code'] ?? null,
                    'status_code' => $specStatus,
                ]);
            }
            if (($spec['is_ctq'] ?? false) === true || ($spec['is_cqa'] ?? false) === true) {
                if (trim((string)($spec['measurement_method'] ?? '')) === '') {
                    return $this->blocked('critical_spec_missing_method', 'CTQ/CQA specs require a measurement method.', [
                        'spec_code' => $spec['spec_code'] ?? null,
                    ]);
                }
            }
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'revision_release_ready',
            'message' => 'Revision release gate passed for item/UOM/spec prerequisites.',
        ];
    }

    /**
     * @param array<string, mixed> $orderLine
     * @param list<array<string, mixed>> $crossrefs
     * @return array<string, mixed>
     */
    public function evaluateCustomerCrossref(array $orderLine, array $crossrefs, ?\DateTimeImmutable $at = null): array
    {
        $at ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $requestedPart = trim((string)($orderLine['customer_part_number'] ?? ''));
        $requestedRevision = trim((string)($orderLine['customer_revision_code'] ?? $orderLine['customer_revision'] ?? ''));
        foreach ($crossrefs as $crossref) {
            if (!is_array($crossref) || !$this->isEffectiveApproved($crossref, 'crossref_status', $at)) {
                continue;
            }
            if (trim((string)($crossref['customer_part_number'] ?? '')) !== $requestedPart) {
                continue;
            }
            $crossRevision = trim((string)($crossref['customer_revision_code'] ?? ''));
            if ($requestedRevision !== '' && $crossRevision !== '' && strcasecmp($crossRevision, $requestedRevision) !== 0) {
                return $this->blocked('customer_revision_mismatch', 'Customer revision does not match approved item cross-reference.', [
                    'requested_revision' => $requestedRevision,
                    'approved_revision' => $crossRevision,
                ]);
            }
            return [
                'allowed' => true,
                'status' => 'passed',
                'reason_code' => 'customer_crossref_matched',
                'crossref' => $crossref,
            ];
        }

        return $this->blocked('customer_part_crossref_missing', 'No approved customer item cross-reference matched the order line.', [
            'customer_part_number' => $requestedPart,
            'customer_revision_code' => $requestedRevision,
        ]);
    }

    /**
     * @param array<string, mixed> $poLine
     * @param list<array<string, mixed>> $crossrefs
     * @return array<string, mixed>
     */
    public function evaluateSupplierCrossref(array $poLine, array $crossrefs, ?\DateTimeImmutable $at = null): array
    {
        $at ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $supplierPart = trim((string)($poLine['supplier_part_number'] ?? ''));
        $supplierRevision = trim((string)($poLine['supplier_revision_code'] ?? $poLine['supplier_revision'] ?? ''));
        foreach ($crossrefs as $crossref) {
            if (!is_array($crossref) || !$this->isEffectiveApproved($crossref, 'crossref_status', $at)) {
                continue;
            }
            if (trim((string)($crossref['supplier_part_number'] ?? '')) !== $supplierPart) {
                continue;
            }
            $crossRevision = trim((string)($crossref['supplier_revision_code'] ?? ''));
            if ($supplierRevision !== '' && $crossRevision !== '' && strcasecmp($crossRevision, $supplierRevision) !== 0) {
                return $this->blocked('supplier_revision_mismatch', 'Supplier revision does not match approved item cross-reference.', [
                    'requested_revision' => $supplierRevision,
                    'approved_revision' => $crossRevision,
                ]);
            }
            return [
                'allowed' => true,
                'status' => 'passed',
                'reason_code' => 'supplier_crossref_matched',
                'crossref' => $crossref,
            ];
        }

        return $this->blocked('supplier_item_crossref_missing', 'No approved supplier item cross-reference matched the PO line.', [
            'supplier_part_number' => $supplierPart,
            'supplier_revision_code' => $supplierRevision,
        ]);
    }

    /**
     * @param array<string, mixed> $snapshotBefore
     * @param array<string, mixed> $snapshotAfter
     * @return array<string, mixed>
     */
    public function evaluateEcoSnapshotStability(array $snapshotBefore, array $snapshotAfter): array
    {
        foreach (['work_order_id', 'item_revision_id', 'revision_code', 'released_snapshot_hash'] as $field) {
            if (($snapshotBefore[$field] ?? null) !== ($snapshotAfter[$field] ?? null)) {
                return $this->blocked('running_snapshot_mutated_by_eco', 'ECO/new revision must not mutate a running WO snapshot.', [
                    'field' => $field,
                    'before' => $snapshotBefore[$field] ?? null,
                    'after' => $snapshotAfter[$field] ?? null,
                ]);
            }
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'running_snapshot_stable',
            'message' => 'Running WO snapshot remained stable across ECO/new revision.',
        ];
    }

    /**
     * @param array<string, mixed> $record
     */
    private function isEffectiveApproved(array $record, string $statusField, \DateTimeImmutable $at): bool
    {
        $status = strtolower(trim((string)($record[$statusField] ?? '')));
        if (!in_array($status, ['approved', 'conditional', 'active'], true)) {
            return false;
        }
        foreach (['effective_from' => 'from', 'effective_to' => 'to'] as $field => $direction) {
            $raw = trim((string)($record[$field] ?? ''));
            if ($raw === '') {
                continue;
            }
            try {
                $time = new \DateTimeImmutable($raw);
            } catch (\Throwable) {
                return false;
            }
            if ($direction === 'from' && $time > $at) {
                return false;
            }
            if ($direction === 'to' && $time <= $at) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
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

if (!class_exists('MOM\\Api\\Services\\ItemRevisionAuthorityService', false)) {
    class_alias(ItemRevisionAuthorityService::class, 'MOM\\Api\\Services\\ItemRevisionAuthorityService');
}
