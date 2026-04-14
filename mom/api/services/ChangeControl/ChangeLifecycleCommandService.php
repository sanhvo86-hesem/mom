<?php

declare(strict_types=1);

namespace MOM\Services\ChangeControl;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use MOM\Services\ControlPlane\EffectivityGateService;
use RuntimeException;

/**
 * Authoritative command surface for PLM/eQMS change request/order lifecycle.
 */
final class ChangeLifecycleCommandService
{
    private ?object $db;

    public function __construct(?object $db)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createChangeRequest(array $input, string $actorRef): array
    {
        $this->requireDb();
        $status = $this->enum($input['status'] ?? 'draft', ['draft', 'submitted', 'triage', 'approved_for_order', 'rejected', 'cancelled']);
        if ($status === 'approved_for_order') {
            throw new RuntimeException('change_request_terminal_status_requires_transition');
        }

        $number = $this->text($input['change_request_number'] ?? '');
        if ($number === '') {
            $number = 'CR-' . gmdate('Ymd-His') . '-' . substr(hash('sha256', $actorRef . json_encode($input)), 0, 6);
        }

        $row = $this->db->queryOne(
            "INSERT INTO plm_change_requests
                (change_request_number, request_type, title, problem_statement, proposed_solution,
                 impact_summary, priority, status, target_effective_date, metadata)
             VALUES
                (:number, :request_type, :title, :problem_statement, :proposed_solution,
                 :impact_summary, :priority, :status, :target_effective_date, CAST(:metadata AS jsonb))
             ON CONFLICT (change_request_number) DO UPDATE SET updated_at = now()
             RETURNING *",
            [
                ':number' => $number,
                ':request_type' => $this->enum($input['request_type'] ?? 'internal', ['ecr', 'customer_change', 'supplier_change', 'internal']),
                ':title' => $this->requiredText($input, 'title'),
                ':problem_statement' => $this->nullableText($input['problem_statement'] ?? null),
                ':proposed_solution' => $this->nullableText($input['proposed_solution'] ?? null),
                ':impact_summary' => $this->nullableText($input['impact_summary'] ?? null),
                ':priority' => $this->enum($input['priority'] ?? 'medium', ['low', 'medium', 'high', 'critical']),
                ':status' => $status,
                ':target_effective_date' => $this->nullableText($input['target_effective_date'] ?? null),
                ':metadata' => $this->json(['actor_ref' => $actorRef, 'authority' => 'change_lifecycle_command']),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('change_request_create_failed');
        }
        $this->persistAffectedObjects($row['plm_change_request_id'] ?? null, null, $input['affected_objects'] ?? []);
        return $this->normalizeRow($row);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function transitionChangeRequest(array $input, string $actorRef): array
    {
        $this->requireDb();
        $target = $this->enum($input['target_status'] ?? $input['status'] ?? '', ['draft', 'submitted', 'triage', 'approved_for_order', 'rejected', 'cancelled']);
        $id = $this->requiredText($input, 'change_request_id');
        $current = $this->loadChangeRequestRow($id);
        $this->assertAllowedRequestTransition(strtolower($this->text($current['status'] ?? '')), $target);

        $row = $this->db->queryOne(
            "UPDATE plm_change_requests
             SET status = :status,
                 metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
                 updated_at = now()
             WHERE plm_change_request_id::text = :id OR change_request_number = :id
             RETURNING *",
            [
                ':status' => $target,
                ':id' => $id,
                ':metadata' => $this->json(['transitioned_by' => $actorRef, 'reason' => $this->text($input['reason'] ?? '')]),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('change_request_not_found');
        }
        return $this->normalizeRow($row);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createChangeOrder(array $input, string $actorRef): array
    {
        $this->requireDb();
        if (method_exists($this->db, 'transactional')) {
            return $this->db->transactional(fn(): array => $this->createChangeOrderInsideTransaction($input, $actorRef));
        }

        return $this->createChangeOrderInsideTransaction($input, $actorRef);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function createChangeOrderInsideTransaction(array $input, string $actorRef): array
    {
        $status = $this->enum($input['status'] ?? 'draft', ['draft', 'impact_assessment', 'in_review', 'approved', 'released', 'implemented', 'closed', 'cancelled']);
        if (in_array($status, ['released', 'implemented', 'closed'], true)) {
            throw new RuntimeException('change_order_release_requires_transition');
        }

        $number = $this->text($input['change_order_number'] ?? '');
        if ($number === '') {
            $number = 'CO-' . gmdate('Ymd-His') . '-' . substr(hash('sha256', $actorRef . json_encode($input)), 0, 6);
        }

        $row = $this->db->queryOne(
            "INSERT INTO plm_change_orders
                (change_order_number, plm_change_request_id, order_type, title, effectivity_type,
                 effective_from_date, effective_to_date, serial_effective_from, serial_effective_to,
                 status, implementation_due_date, metadata)
             VALUES
                (:number, CAST(:request_id AS uuid), :order_type, :title, :effectivity_type,
                 :effective_from_date, :effective_to_date, :serial_effective_from, :serial_effective_to,
                 :status, :implementation_due_date, CAST(:metadata AS jsonb))
             ON CONFLICT (change_order_number) DO UPDATE SET updated_at = now()
             RETURNING *",
            [
                ':number' => $number,
                ':request_id' => $this->nullableUuid($input['plm_change_request_id'] ?? $input['change_request_id'] ?? null),
                ':order_type' => $this->enum($input['order_type'] ?? 'eco', ['eco', 'ecn', 'temporary_deviation', 'document_update']),
                ':title' => $this->requiredText($input, 'title'),
                ':effectivity_type' => $this->enum($input['effectivity_type'] ?? 'date', ['date', 'serial', 'lot']),
                ':effective_from_date' => $this->nullableText($input['effective_from_date'] ?? null),
                ':effective_to_date' => $this->nullableText($input['effective_to_date'] ?? null),
                ':serial_effective_from' => $this->nullableText($input['serial_effective_from'] ?? null),
                ':serial_effective_to' => $this->nullableText($input['serial_effective_to'] ?? null),
                ':status' => $status,
                ':implementation_due_date' => $this->nullableText($input['implementation_due_date'] ?? null),
                ':metadata' => $this->json($this->changeOrderMetadata($input, $actorRef)),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('change_order_create_failed');
        }
        $orderId = $row['plm_change_order_id'] ?? null;
        $affectedObjects = $this->persistAffectedObjects(null, $orderId, $input['affected_objects'] ?? []);
        $this->persistResultingObjects($orderId, $input['resulting_objects'] ?? [], $affectedObjects);
        $this->persistEffectivities($orderId, $input['effectivities'] ?? [], $actorRef);
        $this->persistTrainingRequirements($orderId, $input['training_requirements'] ?? [], $actorRef);
        $this->persistVerifications($orderId, $input['verifications'] ?? [], $actorRef);
        $this->persistEffectivenessReviews($orderId, $input['effectiveness_reviews'] ?? [], $actorRef);
        $this->persistWipDispositions($orderId, $input['wip_dispositions'] ?? [], $actorRef);
        $this->persistRollbackRequirements($orderId, $input['rollback_requirements'] ?? $input['affected_objects'] ?? [], $input['rollback_plan'] ?? null, $actorRef);
        $this->persistEmergencyControl($orderId, $input, $actorRef);
        return $this->normalizeRow($row);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function transitionChangeOrder(array $input, string $actorRef): array
    {
        $this->requireDb();
        $target = $this->enum($input['target_status'] ?? $input['status'] ?? '', ['draft', 'impact_assessment', 'in_review', 'approved', 'released', 'implemented', 'closed', 'cancelled']);
        $id = $this->requiredText($input, 'change_order_id');
        $current = $this->loadChangeOrderRow($id);
        $this->assertAllowedOrderTransition(strtolower($this->text($current['status'] ?? '')), $target);

        $releaseGate = null;
        if ($target === 'released') {
            $releaseGate = $this->evaluateChangeOrderReleaseReadiness($id, $input);
            if (!$releaseGate['allowed']) {
                throw new RuntimeException('change_order_release_gate_blocked:' . implode(',', array_map(
                    static fn(array $blocker): string => (string)($blocker['code'] ?? 'unknown_blocker'),
                    $releaseGate['blockers'],
                )));
            }
        }

        if ($target === 'closed') {
            $this->assertEffectivenessClosure($id);
        }

        if ($target === 'implemented') {
            $this->assertImplementationEvidence($id, $input);
        }

        $row = $this->db->queryOne(
            "UPDATE plm_change_orders
             SET status = :status,
                 approved_at = CASE WHEN :status IN ('approved', 'released') AND approved_at IS NULL THEN now() ELSE approved_at END,
                 metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
                 updated_at = now()
             WHERE plm_change_order_id::text = :id OR change_order_number = :id
             RETURNING *",
            [
                ':status' => $target,
                ':id' => $id,
                ':metadata' => $this->json(array_filter([
                    'transitioned_by' => $actorRef,
                    'reason' => $this->text($input['reason'] ?? ''),
                    'release_gate' => $releaseGate,
                ], static fn(mixed $value): bool => $value !== null && $value !== '')),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('change_order_not_found');
        }
        return $this->normalizeRow($row);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    public function evaluateChangeOrderReleaseReadiness(string $changeOrderId, array $overrides = []): array
    {
        $package = $this->loadChangeLifecyclePackage($changeOrderId);
        $gate = (new EffectivityGateService())->evaluateChangeOrderRelease(
            $package['change_order'],
            $package['affected_objects'],
            $package['resulting_objects'],
            $package['effectivities'],
            $package['training_requirements'],
            $package['verifications'],
            $package['conflicts'],
        );

        $blockers = $gate['blockers'];
        $warnings = $gate['warnings'];

        if ($package['effectiveness_reviews'] === []) {
            $blockers[] = $this->blocker('effectiveness_review_required', 'Change order release requires a scheduled effectiveness review.');
        }

        foreach ($this->blockedTraceabilityGates($package['affected_objects'], $package['resulting_objects']) as $gate) {
            $blockers[] = $this->blocker('traceability_5m_gate_blocked', 'Required 5M traceability context is incomplete.', $gate);
        }

        $rollbackRequired = $this->releaseRequiresRollback($package['effectivities']);
        $emergency = $this->isEmergencyChange($package['change_order'], $overrides);
        if ($rollbackRequired || $emergency) {
            $rollback = $this->rollbackPlan($package['change_order'], $overrides, $package['rollback_requirements']);
            if ($rollback === []) {
                $blockers[] = $this->blocker('rollback_plan_required', 'Retroactive, WIP-impacting, ship-hold, or emergency change release requires a rollback plan.');
            }
        }

        if ($emergency) {
            $emergencyBlockers = $this->emergencyControlBlockers(
                $package['change_order'],
                $overrides,
                $package['emergency_change_controls'],
                $package['rollback_requirements'],
            );
            $blockers = array_merge($blockers, $emergencyBlockers);
        }

        return [
            'allowed' => $blockers === [],
            'blockers' => $blockers,
            'warnings' => $warnings,
            'change_order_id' => $this->text($package['change_order']['plm_change_order_id'] ?? $changeOrderId),
            'canonical_lifecycle_sources' => [
                'plm_change_affected_objects',
                'plm_change_resulting_objects',
                'plm_change_effectivities',
                'plm_change_training_requirements',
                'plm_change_verifications',
                'plm_change_effectiveness_reviews',
                'wip_dispositions',
                'rollback_requirements',
                'emergency_change_controls',
                'effectivity_conflicts',
            ],
        ];
    }

    private function normalizeDb(?object $db): ?object
    {
        if ($db instanceof DataLayer) {
            return $db->getConnection();
        }
        if ($db instanceof Connection) {
            return $db;
        }
        if ($db !== null && method_exists($db, 'getConnection')) {
            try {
                $candidate = $db->getConnection();
                return is_object($candidate) ? $candidate : null;
            } catch (\Throwable) {
                return null;
            }
        }
        return $db;
    }

    private function requireDb(): void
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_change_store_required');
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function persistAffectedObjects(mixed $requestId, mixed $orderId, mixed $objects): array
    {
        if (!is_array($objects) || $objects === []) {
            return [];
        }
        $rows = [];
        foreach ($objects as $object) {
            if (!is_array($object)) {
                continue;
            }
            $row = $this->db->queryOne(
                "INSERT INTO plm_change_affected_objects
                    (plm_change_request_id, plm_change_order_id, object_type, object_id, object_revision,
                     affected_fields, requested_effect, disposition, effectivity_rule, wip_disposition,
                     idempotency_key, metadata)
                 VALUES
                    (CAST(:request_id AS uuid), CAST(:order_id AS uuid), :object_type, :object_id, :object_revision,
                     CAST(:affected_fields AS text[]), :requested_effect, :disposition, CAST(:effectivity_rule AS jsonb),
                     CAST(:wip_disposition AS jsonb), :idempotency_key, CAST(:metadata AS jsonb))
                 ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
                 RETURNING *",
                [
                    ':request_id' => $this->nullableUuid($requestId),
                    ':order_id' => $this->nullableUuid($orderId),
                    ':object_type' => $this->requiredText($object, 'object_type'),
                    ':object_id' => $this->requiredText($object, 'object_id'),
                    ':object_revision' => $this->nullableText($object['object_revision'] ?? null),
                    ':affected_fields' => $this->postgresTextArray($object['affected_fields'] ?? []),
                    ':requested_effect' => $this->enum($object['requested_effect'] ?? 'metadata_update', ['create', 'revise', 'release', 'supersede', 'withdraw', 'obsolete', 'replace', 'amend', 'deviation', 'metadata_update', 'training_update', 'publication_update']),
                    ':disposition' => $this->enum($object['disposition'] ?? 'pending', ['pending', 'accepted', 'rejected', 'deferred', 'cancelled']),
                    ':effectivity_rule' => $this->json(is_array($object['effectivity_rule'] ?? null) ? $object['effectivity_rule'] : []),
                    ':wip_disposition' => $this->json(is_array($object['wip_disposition'] ?? null) ? $object['wip_disposition'] : []),
                    ':idempotency_key' => hash('sha256', 'affected|' . $this->text($requestId) . '|' . $this->text($orderId) . '|' . $this->requiredText($object, 'object_type') . '|' . $this->requiredText($object, 'object_id') . '|' . ($this->nullableText($object['object_revision'] ?? null) ?? '') . '|' . $this->postgresTextArray($object['affected_fields'] ?? []) . '|' . $this->text($object['requested_effect'] ?? 'metadata_update') . '|' . $this->json(is_array($object['effectivity_rule'] ?? null) ? $object['effectivity_rule'] : []) . '|' . $this->json(is_array($object['wip_disposition'] ?? null) ? $object['wip_disposition'] : [])),
                    ':metadata' => $this->json(['authority' => 'change_lifecycle_command']),
                ],
            );
            if (is_array($row)) {
                $rows[] = $this->normalizeRow($row);
            }
        }
        return $rows;
    }

    /**
     * @param list<array<string, mixed>> $affectedObjects
     */
    private function persistResultingObjects(mixed $orderId, mixed $objects, array $affectedObjects): void
    {
        if (!is_array($objects) || $objects === []) {
            return;
        }
        foreach ($objects as $object) {
            if (!is_array($object)) {
                continue;
            }
            $affectedObjectId = $this->resolveAffectedObjectId($object, $affectedObjects);
            $this->db->queryOne(
                "INSERT INTO plm_change_resulting_objects
                    (plm_change_order_id, affected_object_id, object_type, object_id, resulting_revision, result_role, release_state,
                     idempotency_key, metadata)
                 VALUES
                    (CAST(:order_id AS uuid), CAST(:affected_object_id AS uuid), :object_type, :object_id, :resulting_revision, :result_role, :release_state,
                     :idempotency_key, CAST(:metadata AS jsonb))
                 ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
                 RETURNING *",
                [
                    ':order_id' => $this->nullableUuid($orderId),
                    ':affected_object_id' => $affectedObjectId,
                    ':object_type' => $this->requiredText($object, 'object_type'),
                    ':object_id' => $this->requiredText($object, 'object_id'),
                    ':resulting_revision' => $this->nullableText($object['resulting_revision'] ?? null),
                    ':result_role' => $this->enum($object['result_role'] ?? 'configuration_item', ['new_revision', 'replacement', 'superseding_record', 'published_record', 'training_release', 'configuration_item']),
                    ':release_state' => $this->enum($object['release_state'] ?? 'planned', ['planned', 'ready', 'released', 'blocked', 'withdrawn', 'superseded']),
                    ':idempotency_key' => hash('sha256', 'resulting|' . $this->text($orderId) . '|' . $affectedObjectId . '|' . $this->requiredText($object, 'object_type') . '|' . $this->requiredText($object, 'object_id') . '|' . ($this->nullableText($object['resulting_revision'] ?? null) ?? '') . '|' . $this->text($object['result_role'] ?? 'configuration_item') . '|' . $this->text($object['release_state'] ?? 'planned')),
                    ':metadata' => $this->json(['authority' => 'change_lifecycle_command']),
                ],
            );
        }
    }

    /**
     * @param array<string, mixed> $resultingObject
     * @param list<array<string, mixed>> $affectedObjects
     */
    private function resolveAffectedObjectId(array $resultingObject, array $affectedObjects): string
    {
        $explicit = $this->nullableUuid($resultingObject['affected_object_id'] ?? null);
        if ($explicit !== null) {
            return $explicit;
        }

        $affectedRef = $this->text($resultingObject['affected_object_ref'] ?? '');
        if ($affectedRef !== '') {
            foreach ($affectedObjects as $affected) {
                if ($this->text($affected['plm_change_affected_object_id'] ?? '') === $affectedRef) {
                    return $affectedRef;
                }
                if ($this->text($affected['object_id'] ?? '') === $affectedRef) {
                    $id = $this->nullableUuid($affected['plm_change_affected_object_id'] ?? null);
                    if ($id !== null) {
                        return $id;
                    }
                }
            }
            throw new RuntimeException('resulting_object_affected_ref_not_found');
        }

        $sourceType = $this->text($resultingObject['source_object_type'] ?? $resultingObject['affected_object_type'] ?? '');
        $sourceId = $this->text($resultingObject['source_object_id'] ?? $resultingObject['affected_object_source_id'] ?? '');
        if ($sourceType !== '' && $sourceId !== '') {
            foreach ($affectedObjects as $affected) {
                if ($this->text($affected['object_type'] ?? '') === $sourceType && $this->text($affected['object_id'] ?? '') === $sourceId) {
                    $id = $this->nullableUuid($affected['plm_change_affected_object_id'] ?? null);
                    if ($id !== null) {
                        return $id;
                    }
                }
            }
            throw new RuntimeException('resulting_object_source_not_affected');
        }

        if (count($affectedObjects) === 1) {
            $id = $this->nullableUuid($affectedObjects[0]['plm_change_affected_object_id'] ?? null);
            if ($id !== null) {
                return $id;
            }
        }

        throw new RuntimeException('resulting_object_affected_object_required');
    }

    private function persistWipDispositions(mixed $orderId, mixed $objects, string $actorRef): void
    {
        if (!is_array($objects) || $objects === []) {
            return;
        }

        foreach ($objects as $object) {
            if (!is_array($object)) {
                continue;
            }
            $wip = is_array($object['wip_disposition'] ?? null) ? $object['wip_disposition'] : $object;
            $disposition = $this->text($wip['disposition'] ?? '');
            if ($disposition === '') {
                continue;
            }

            $this->db->queryOne(
                "INSERT INTO wip_dispositions
                    (plm_change_order_id, wip_object_type, wip_object_id, disposition, disposition_state,
                     evidence_record_id, metadata)
                 VALUES
                    (CAST(:order_id AS uuid), :wip_object_type, :wip_object_id, :disposition, :disposition_state,
                     CAST(:evidence_record_id AS uuid), CAST(:metadata AS jsonb))
                 ON CONFLICT (plm_change_order_id, wip_object_type, wip_object_id) DO UPDATE SET
                     disposition = EXCLUDED.disposition,
                     disposition_state = EXCLUDED.disposition_state,
                     updated_at = now()
                 RETURNING *",
                [
                    ':order_id' => $this->nullableUuid($orderId),
                    ':wip_object_type' => $this->enum($object['wip_object_type'] ?? $object['object_type'] ?? '', ['work_order', 'job_order', 'lot', 'serial', 'purchase_order', 'inventory_lot']),
                    ':wip_object_id' => $this->requiredText($object, 'wip_object_id'),
                    ':disposition' => $this->enum($disposition, ['use_as_is', 'rework', 'scrap', 'hold', 'convert_to_new_revision', 'ship_under_deviation']),
                    ':disposition_state' => $this->enum($wip['disposition_state'] ?? 'planned', ['planned', 'approved', 'executed', 'waived', 'cancelled']),
                    ':evidence_record_id' => $this->nullableUuid($wip['evidence_record_id'] ?? null),
                    ':metadata' => $this->json(['actor_ref' => $actorRef, 'authority' => 'change_lifecycle_command']),
                ],
            );
        }
    }

    private function persistRollbackRequirements(mixed $orderId, mixed $objects, mixed $rollbackPlan, string $actorRef): void
    {
        if (!is_array($rollbackPlan) || $rollbackPlan === [] || !is_array($objects) || $objects === []) {
            return;
        }

        foreach ($objects as $object) {
            if (!is_array($object)) {
                continue;
            }
            $this->db->queryOne(
                "INSERT INTO rollback_requirements
                    (plm_change_order_id, object_type, object_id, rollback_state, rollback_plan)
                 VALUES
                    (CAST(:order_id AS uuid), :object_type, :object_id, :rollback_state, CAST(:rollback_plan AS jsonb))
                 ON CONFLICT (plm_change_order_id, object_type, object_id) DO UPDATE SET
                     rollback_plan = EXCLUDED.rollback_plan,
                     updated_at = now()
                 RETURNING *",
                [
                    ':order_id' => $this->nullableUuid($orderId),
                    ':object_type' => $this->requiredText($object, 'object_type'),
                    ':object_id' => $this->requiredText($object, 'object_id'),
                    ':rollback_state' => $this->enum($object['rollback_state'] ?? 'required', ['required', 'planned', 'approved', 'executed', 'waived', 'not_required']),
                    ':rollback_plan' => $this->json($rollbackPlan),
                ],
            );
        }
    }

    private function persistEmergencyControl(mixed $orderId, array $input, string $actorRef): void
    {
        $emergency = $this->bool($input['emergency_change'] ?? false)
            || strtolower($this->text($input['order_type'] ?? '')) === 'temporary_deviation';
        if (!$emergency) {
            return;
        }

        $this->db->queryOne(
            "INSERT INTO emergency_change_controls
                (plm_change_order_id, emergency_state, declared_reason, risk_payload, required_followup_payload,
                 declared_by, signature_event_id)
             VALUES
                (CAST(:order_id AS uuid), :emergency_state, :declared_reason, CAST(:risk_payload AS jsonb),
                 CAST(:required_followup_payload AS jsonb), CAST(:declared_by AS uuid), CAST(:signature_event_id AS uuid))
             ON CONFLICT (plm_change_order_id) DO UPDATE SET
                 emergency_state = EXCLUDED.emergency_state,
                 risk_payload = EXCLUDED.risk_payload,
                 required_followup_payload = EXCLUDED.required_followup_payload
             RETURNING *",
            [
                ':order_id' => $this->nullableUuid($orderId),
                ':emergency_state' => $this->enum($input['emergency_state'] ?? 'declared', ['declared', 'approved_for_use', 'contained', 'normalized', 'rejected', 'rolled_back']),
                ':declared_reason' => $this->requiredText($input, 'emergency_justification'),
                ':risk_payload' => $this->json([
                    'risk_accepted' => $this->bool($input['risk_accepted'] ?? false),
                    'risk_acceptance_signature_event_id' => $this->text($input['risk_acceptance_signature_event_id'] ?? ''),
                    'actor_ref' => $actorRef,
                ]),
                ':required_followup_payload' => $this->json([
                    'post_implementation_review_due_at' => $this->text($input['post_implementation_review_due_at'] ?? ''),
                    'rollback_plan' => is_array($input['rollback_plan'] ?? null) ? $input['rollback_plan'] : [],
                ]),
                ':declared_by' => $this->nullableUuid($input['declared_by'] ?? null),
                ':signature_event_id' => $this->nullableUuid($input['risk_acceptance_signature_event_id'] ?? null),
            ],
        );
    }

    private function persistEffectivities(mixed $orderId, mixed $effectivities, string $actorRef): void
    {
        if (!is_array($effectivities) || $effectivities === []) {
            return;
        }
        foreach ($effectivities as $effectivity) {
            if (!is_array($effectivity)) {
                continue;
            }
            $this->db->queryOne(
                "INSERT INTO plm_change_effectivities
                    (plm_change_order_id, object_type, object_id, effectivity_type, effectivity_scope,
                     effective_from, effective_to, release_impact, metadata)
                 VALUES
                    (CAST(:order_id AS uuid), :object_type, :object_id, :effectivity_type, CAST(:effectivity_scope AS jsonb),
                     :effective_from, :effective_to, :release_impact, CAST(:metadata AS jsonb))
                 RETURNING *",
                [
                    ':order_id' => $this->nullableUuid($orderId),
                    ':object_type' => $this->requiredText($effectivity, 'object_type'),
                    ':object_id' => $this->requiredText($effectivity, 'object_id'),
                    ':effectivity_type' => $this->enum($effectivity['effectivity_type'] ?? 'date', ['date', 'site', 'plant', 'product', 'lot', 'serial', 'order', 'role']),
                    ':effectivity_scope' => $this->json(is_array($effectivity['effectivity_scope'] ?? null) ? $effectivity['effectivity_scope'] : []),
                    ':effective_from' => $this->requiredText($effectivity, 'effective_from'),
                    ':effective_to' => $this->nullableText($effectivity['effective_to'] ?? null),
                    ':release_impact' => $this->enum($effectivity['release_impact'] ?? 'prospective', ['prospective', 'retroactive', 'wip_hold', 'wip_rework', 'ship_hold', 'no_impact']),
                    ':metadata' => $this->json(['actor_ref' => $actorRef, 'authority' => 'change_lifecycle_command']),
                ],
            );
        }
    }

    private function persistTrainingRequirements(mixed $orderId, mixed $requirements, string $actorRef): void
    {
        if (!is_array($requirements) || $requirements === []) {
            return;
        }
        foreach ($requirements as $requirement) {
            if (!is_array($requirement)) {
                continue;
            }
            $this->db->queryOne(
                "INSERT INTO plm_change_training_requirements
                    (plm_change_order_id, object_type, object_id, audience_type, audience_ref,
                     training_requirement_type, due_before_effective, requirement_state, due_at, satisfied_at,
                     idempotency_key, metadata)
                 VALUES
                    (CAST(:order_id AS uuid), :object_type, :object_id, :audience_type, :audience_ref,
                     :requirement_type, :due_before_effective, :requirement_state, :due_at, :satisfied_at,
                     :idempotency_key, CAST(:metadata AS jsonb))
                 ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
                 RETURNING *",
                [
                    ':order_id' => $this->nullableUuid($orderId),
                    ':object_type' => $this->requiredText($requirement, 'object_type'),
                    ':object_id' => $this->requiredText($requirement, 'object_id'),
                    ':audience_type' => $this->enum($requirement['audience_type'] ?? 'role', ['user', 'role', 'department', 'site', 'plant']),
                    ':audience_ref' => $this->requiredText($requirement, 'audience_ref'),
                    ':requirement_type' => $this->enum($requirement['training_requirement_type'] ?? 'read_ack', ['read_ack', 'qualification', 'training_course', 'practical_assessment']),
                    ':due_before_effective' => $this->bool($requirement['due_before_effective'] ?? true),
                    ':requirement_state' => $this->enum($requirement['requirement_state'] ?? 'open', ['open', 'satisfied', 'waived', 'expired', 'superseded', 'cancelled']),
                    ':due_at' => $this->nullableText($requirement['due_at'] ?? null),
                    ':satisfied_at' => $this->nullableText($requirement['satisfied_at'] ?? null),
                    ':idempotency_key' => hash('sha256', 'training|' . $this->text($orderId) . '|' . $this->requiredText($requirement, 'object_type') . '|' . $this->requiredText($requirement, 'object_id') . '|' . $this->enum($requirement['audience_type'] ?? 'role', ['user', 'role', 'department', 'site', 'plant']) . '|' . $this->requiredText($requirement, 'audience_ref') . '|' . $this->enum($requirement['training_requirement_type'] ?? 'read_ack', ['read_ack', 'qualification', 'training_course', 'practical_assessment']) . '|' . ($this->bool($requirement['due_before_effective'] ?? true) ? 'due_before' : 'advisory')),
                    ':metadata' => $this->json(['actor_ref' => $actorRef, 'authority' => 'change_lifecycle_command']),
                ],
            );
        }
    }

    private function persistVerifications(mixed $orderId, mixed $verifications, string $actorRef): void
    {
        if (!is_array($verifications) || $verifications === []) {
            return;
        }
        foreach ($verifications as $verification) {
            if (!is_array($verification)) {
                continue;
            }
            $this->db->queryOne(
                "INSERT INTO plm_change_verifications
                    (plm_change_order_id, verification_type, verification_state, object_type, object_id,
                     evidence_record_id, verified_at, failure_reason, idempotency_key, metadata)
                 VALUES
                    (CAST(:order_id AS uuid), :verification_type, :verification_state, :object_type, :object_id,
                     CAST(:evidence_record_id AS uuid), :verified_at, :failure_reason, :idempotency_key, CAST(:metadata AS jsonb))
                 ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
                 RETURNING *",
                [
                    ':order_id' => $this->nullableUuid($orderId),
                    ':verification_type' => $this->enum($verification['verification_type'] ?? 'implementation', ['implementation', 'document_release', 'training_complete', 'publication_complete', 'process_validation', 'first_article', 'audit']),
                    ':verification_state' => $this->enum($verification['verification_state'] ?? 'planned', ['planned', 'in_progress', 'passed', 'failed', 'waived', 'blocked', 'cancelled']),
                    ':object_type' => $this->nullableText($verification['object_type'] ?? null),
                    ':object_id' => $this->nullableText($verification['object_id'] ?? null),
                    ':evidence_record_id' => $this->nullableUuid($verification['evidence_record_id'] ?? null),
                    ':verified_at' => $this->nullableText($verification['verified_at'] ?? null),
                    ':failure_reason' => $this->nullableText($verification['failure_reason'] ?? null),
                    ':idempotency_key' => hash('sha256', 'verification|' . $this->text($orderId) . '|' . $this->enum($verification['verification_type'] ?? 'implementation', ['implementation', 'document_release', 'training_complete', 'publication_complete', 'process_validation', 'first_article', 'audit']) . '|' . $this->text($verification['object_type'] ?? '') . '|' . $this->text($verification['object_id'] ?? '') . '|' . ($this->nullableUuid($verification['evidence_record_id'] ?? null) ?? '') . '|' . $this->enum($verification['verification_state'] ?? 'planned', ['planned', 'in_progress', 'passed', 'failed', 'waived', 'blocked', 'cancelled'])),
                    ':metadata' => $this->json(array_merge(
                        ['actor_ref' => $actorRef, 'authority' => 'change_lifecycle_command'],
                        is_array($verification['metadata'] ?? null) ? $verification['metadata'] : [],
                    )),
                ],
            );
        }
    }

    private function persistEffectivenessReviews(mixed $orderId, mixed $reviews, string $actorRef): void
    {
        if (!is_array($reviews) || $reviews === []) {
            return;
        }
        foreach ($reviews as $review) {
            if (!is_array($review)) {
                continue;
            }
            $this->db->queryOne(
                "INSERT INTO plm_change_effectiveness_reviews
                    (plm_change_order_id, review_state, review_due_at, reviewed_at, effectiveness_result,
                     followup_required, followup_object_type, followup_object_id, idempotency_key, metadata)
                 VALUES
                    (CAST(:order_id AS uuid), :review_state, :review_due_at, :reviewed_at, CAST(:effectiveness_result AS jsonb),
                     :followup_required, :followup_object_type, :followup_object_id, :idempotency_key, CAST(:metadata AS jsonb))
                 ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
                 RETURNING *",
                [
                    ':order_id' => $this->nullableUuid($orderId),
                    ':review_state' => $this->enum($review['review_state'] ?? 'scheduled', ['scheduled', 'due', 'in_review', 'effective', 'ineffective', 'overdue', 'cancelled']),
                    ':review_due_at' => $this->requiredText($review, 'review_due_at'),
                    ':reviewed_at' => $this->nullableText($review['reviewed_at'] ?? null),
                    ':effectiveness_result' => $this->json(is_array($review['effectiveness_result'] ?? null) ? $review['effectiveness_result'] : []),
                    ':followup_required' => $this->bool($review['followup_required'] ?? false),
                    ':followup_object_type' => $this->nullableText($review['followup_object_type'] ?? null),
                    ':followup_object_id' => $this->nullableText($review['followup_object_id'] ?? null),
                    ':idempotency_key' => hash('sha256', 'effectiveness|' . $this->text($orderId) . '|' . $this->requiredText($review, 'review_due_at')),
                    ':metadata' => $this->json(['actor_ref' => $actorRef, 'authority' => 'change_lifecycle_command']),
                ],
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function loadChangeRequestRow(string $id): array
    {
        $row = $this->db->queryOne(
            "SELECT * FROM plm_change_requests WHERE plm_change_request_id::text = :id OR change_request_number = :id LIMIT 1",
            [':id' => $id],
        );
        if (!is_array($row)) {
            throw new RuntimeException('change_request_not_found');
        }
        return $this->normalizeRow($row);
    }

    /**
     * @return array<string, mixed>
     */
    private function loadChangeOrderRow(string $id): array
    {
        $row = $this->db->queryOne(
            "SELECT * FROM plm_change_orders WHERE plm_change_order_id::text = :id OR change_order_number = :id LIMIT 1",
            [':id' => $id],
        );
        if (!is_array($row)) {
            throw new RuntimeException('change_order_not_found');
        }
        return $this->normalizeRow($row);
    }

    /**
     * @return array{
     *   change_order: array<string, mixed>,
     *   affected_objects: list<array<string, mixed>>,
     *   resulting_objects: list<array<string, mixed>>,
     *   effectivities: list<array<string, mixed>>,
     *   training_requirements: list<array<string, mixed>>,
     *   verifications: list<array<string, mixed>>,
     *   effectiveness_reviews: list<array<string, mixed>>,
     *   wip_dispositions: list<array<string, mixed>>,
     *   rollback_requirements: list<array<string, mixed>>,
     *   emergency_change_controls: list<array<string, mixed>>,
     *   conflicts: list<array<string, mixed>>
     * }
     */
    private function loadChangeLifecyclePackage(string $id): array
    {
        $order = $this->loadChangeOrderRow($id);
        $orderId = $this->text($order['plm_change_order_id'] ?? $id);
        return [
            'change_order' => $order,
            'affected_objects' => $this->queryRows("SELECT * FROM plm_change_affected_objects WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'resulting_objects' => $this->queryRows("SELECT * FROM plm_change_resulting_objects WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'effectivities' => $this->queryRows("SELECT * FROM plm_change_effectivities WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'training_requirements' => $this->queryRows("SELECT * FROM plm_change_training_requirements WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'verifications' => $this->queryRows("SELECT * FROM plm_change_verifications WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'effectiveness_reviews' => $this->queryRows("SELECT * FROM plm_change_effectiveness_reviews WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'wip_dispositions' => $this->queryRows("SELECT * FROM wip_dispositions WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'rollback_requirements' => $this->queryRows("SELECT * FROM rollback_requirements WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'emergency_change_controls' => $this->queryRows("SELECT * FROM emergency_change_controls WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
            'conflicts' => $this->queryRows("SELECT * FROM effectivity_conflicts WHERE plm_change_order_id::text = :id", [':id' => $orderId]),
        ];
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    private function queryRows(string $sql, array $params): array
    {
        if (method_exists($this->db, 'query')) {
            $rows = $this->db->query($sql, $params);
        } elseif (method_exists($this->db, 'queryAll')) {
            $rows = $this->db->queryAll($sql, $params);
        } else {
            $rows = [];
        }

        if (!is_array($rows)) {
            return [];
        }

        $normalized = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $normalized[] = $this->normalizeRow($row);
            }
        }
        return $normalized;
    }

    private function assertAllowedRequestTransition(string $current, string $target): void
    {
        $allowed = [
            'draft' => ['submitted', 'cancelled'],
            'submitted' => ['triage', 'rejected', 'cancelled'],
            'triage' => ['approved_for_order', 'rejected'],
            'approved_for_order' => [],
            'rejected' => [],
            'cancelled' => [],
        ];
        $current = $current === '' ? 'draft' : $current;
        if (!in_array($target, $allowed[$current] ?? [], true)) {
            throw new RuntimeException('invalid_change_request_transition');
        }
    }

    private function assertAllowedOrderTransition(string $current, string $target): void
    {
        $allowed = [
            'draft' => ['impact_assessment', 'cancelled'],
            'impact_assessment' => ['in_review', 'cancelled'],
            'in_review' => ['approved', 'cancelled'],
            'approved' => ['released'],
            'released' => ['implemented'],
            'implemented' => ['closed'],
            'closed' => [],
            'cancelled' => [],
        ];
        $current = $current === '' ? 'draft' : $current;
        if (!in_array($target, $allowed[$current] ?? [], true)) {
            throw new RuntimeException('invalid_change_order_transition');
        }
    }

    private function assertEffectivenessClosure(string $id): void
    {
        $package = $this->loadChangeLifecyclePackage($id);
        foreach ($package['effectiveness_reviews'] as $review) {
            if (strtolower($this->text($review['review_state'] ?? '')) === 'effective') {
                return;
            }
        }
        throw new RuntimeException('effective_review_required_before_change_order_close');
    }

    private function assertImplementationEvidence(string $id, array $input): void
    {
        if ($this->text($input['implementation_evidence_record_id'] ?? $input['evidence_record_id'] ?? '') !== '') {
            return;
        }

        $package = $this->loadChangeLifecyclePackage($id);
        foreach ($package['verifications'] as $verification) {
            $type = strtolower($this->text($verification['verification_type'] ?? ''));
            $state = strtolower($this->text($verification['verification_state'] ?? ''));
            if ($type === 'implementation' && in_array($state, ['passed', 'waived'], true)) {
                return;
            }
        }

        throw new RuntimeException('implementation_evidence_required');
    }

    /**
     * @param list<array<string, mixed>> $affectedObjects
     * @param list<array<string, mixed>> $resultingObjects
     * @return list<array<string, mixed>>
     */
    private function blockedTraceabilityGates(array $affectedObjects, array $resultingObjects): array
    {
        $blocked = [];
        foreach (array_merge($affectedObjects, $resultingObjects) as $object) {
            $objectType = $this->text($object['object_type'] ?? '');
            $objectId = $this->text($object['object_id'] ?? '');
            if ($objectType === '' || $objectId === '' || !method_exists($this->db, 'query')) {
                continue;
            }
            $rows = $this->queryRows(
                "SELECT *
                 FROM traceability_5m_obligations
                 WHERE lower(object_type) = :object_type
                   AND object_id = :object_id
                   AND gate_state = 'blocked'",
                [
                    ':object_type' => strtolower($objectType),
                    ':object_id' => $objectId,
                ],
            );
            foreach ($rows as $row) {
                $blocked[] = $row;
            }
        }
        return $blocked;
    }

    /**
     * @param list<array<string, mixed>> $effectivities
     */
    private function releaseRequiresRollback(array $effectivities): bool
    {
        foreach ($effectivities as $effectivity) {
            $impact = strtolower($this->text($effectivity['release_impact'] ?? ''));
            if (in_array($impact, ['retroactive', 'wip_hold', 'wip_rework', 'ship_hold'], true)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<string, mixed> $order
     * @param array<string, mixed> $overrides
     */
    private function isEmergencyChange(array $order, array $overrides): bool
    {
        $metadata = is_array($order['metadata'] ?? null) ? $order['metadata'] : [];
        return $this->bool($overrides['emergency_change'] ?? $metadata['emergency_change'] ?? false)
            || strtolower($this->text($order['order_type'] ?? '')) === 'temporary_deviation';
    }

    /**
     * @param array<string, mixed> $order
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function rollbackPlan(array $order, array $overrides, array $rollbackRequirements = []): array
    {
        if (is_array($overrides['rollback_plan'] ?? null)) {
            return $overrides['rollback_plan'];
        }
        foreach ($rollbackRequirements as $requirement) {
            if (is_array($requirement['rollback_plan'] ?? null) && $requirement['rollback_plan'] !== []) {
                return $requirement['rollback_plan'];
            }
            if (is_string($requirement['rollback_plan'] ?? null)) {
                $decoded = json_decode((string)$requirement['rollback_plan'], true);
                if (is_array($decoded) && $decoded !== []) {
                    return $decoded;
                }
            }
        }
        $metadata = is_array($order['metadata'] ?? null) ? $order['metadata'] : [];
        return is_array($metadata['rollback_plan'] ?? null) ? $metadata['rollback_plan'] : [];
    }

    /**
     * @param array<string, mixed> $order
     * @param array<string, mixed> $overrides
     * @return list<array<string, mixed>>
     */
    private function emergencyControlBlockers(array $order, array $overrides, array $emergencyControls = [], array $rollbackRequirements = []): array
    {
        $metadata = is_array($order['metadata'] ?? null) ? $order['metadata'] : [];
        $control = $this->firstEmergencyControl($emergencyControls);
        $riskPayload = is_array($control['risk_payload'] ?? null) ? $control['risk_payload'] : [];
        $followupPayload = is_array($control['required_followup_payload'] ?? null) ? $control['required_followup_payload'] : [];
        $rollback = $this->rollbackPlan($order, $overrides, $rollbackRequirements);
        $blockers = [];

        if ($this->text($overrides['emergency_justification'] ?? $metadata['emergency_justification'] ?? $control['declared_reason'] ?? '') === '') {
            $blockers[] = $this->blocker('emergency_justification_required', 'Emergency change requires justification.');
        }
        $riskSignature = $this->text($overrides['risk_acceptance_signature_event_id'] ?? $metadata['risk_acceptance_signature_event_id'] ?? $riskPayload['risk_acceptance_signature_event_id'] ?? $control['signature_event_id'] ?? '');
        $riskWaiver = $this->text($overrides['risk_acceptance_waiver_id'] ?? $metadata['risk_acceptance_waiver_id'] ?? $riskPayload['risk_acceptance_waiver_id'] ?? '');
        if ($riskSignature === '' && $riskWaiver === '') {
            $blockers[] = $this->blocker('emergency_risk_signature_or_waiver_required', 'Emergency change requires a durable risk-acceptance e-signature or approved waiver record.');
        }
        foreach (['rollback_strategy', 'rollback_trigger'] as $field) {
            if ($this->text($rollback[$field] ?? '') === '') {
                $blockers[] = $this->blocker('rollback_' . $field . '_required', 'Emergency rollback plan is incomplete.');
            }
        }
        if ($this->text($overrides['post_implementation_review_due_at'] ?? $metadata['post_implementation_review_due_at'] ?? $followupPayload['post_implementation_review_due_at'] ?? '') === '') {
            $blockers[] = $this->blocker('post_implementation_review_required', 'Emergency change requires post-implementation review due date.');
        }
        return $blockers;
    }

    /**
     * @param list<array<string, mixed>> $controls
     * @return array<string, mixed>
     */
    private function firstEmergencyControl(array $controls): array
    {
        foreach ($controls as $control) {
            if (!is_array($control)) {
                continue;
            }
            foreach (['risk_payload', 'required_followup_payload'] as $field) {
                if (is_string($control[$field] ?? null)) {
                    $decoded = json_decode((string)$control[$field], true);
                    if (is_array($decoded)) {
                        $control[$field] = $decoded;
                    }
                }
            }
            return $control;
        }
        return [];
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function changeOrderMetadata(array $data, string $actorRef): array
    {
        $metadata = [
            'actor_ref' => $actorRef,
            'authority' => 'change_lifecycle_command',
        ];
        foreach (['emergency_change', 'emergency_justification', 'risk_accepted', 'risk_acceptance_signature_event_id', 'post_implementation_review_due_at'] as $field) {
            if (array_key_exists($field, $data)) {
                $metadata[$field] = $data[$field];
            }
        }
        if (is_array($data['rollback_plan'] ?? null)) {
            $metadata['rollback_plan'] = $data['rollback_plan'];
        }
        return $metadata;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function blocker(string $code, string $message, array $data = []): array
    {
        return ['code' => $code, 'message' => $message, 'data' => $data];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requiredText(array $data, string $key): string
    {
        $value = $this->text($data[$key] ?? '');
        if ($value === '') {
            throw new RuntimeException($key . '_required');
        }
        return $value;
    }

    /**
     * @param list<string> $allowed
     */
    private function enum(mixed $value, array $allowed): string
    {
        $value = strtolower($this->text($value));
        if (!in_array($value, $allowed, true)) {
            throw new RuntimeException('invalid_enum_value');
        }
        return $value;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function nullableText(mixed $value): ?string
    {
        $text = $this->text($value);
        return $text === '' ? null : $text;
    }

    private function nullableUuid(mixed $value): ?string
    {
        $text = $this->text($value);
        return preg_match('/^[a-f0-9-]{36}$/i', $text) === 1 ? $text : null;
    }

    private function bool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        $text = strtolower($this->text($value));
        return in_array($text, ['1', 'true', 'yes', 'y', 'on'], true);
    }

    private function postgresTextArray(mixed $values): string
    {
        $items = is_array($values) ? $values : [];
        $escaped = array_map(static fn(mixed $value): string => '"' . str_replace('"', '\"', trim((string)$value)) . '"', $items);
        return '{' . implode(',', array_filter($escaped, static fn(string $value): bool => $value !== '""')) . '}';
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        foreach (['metadata', 'effectivity_rule', 'wip_disposition'] as $field) {
            if (is_string($row[$field] ?? null)) {
                $decoded = json_decode((string)$row[$field], true);
                if (is_array($decoded)) {
                    $row[$field] = $decoded;
                }
            }
        }
        return $row;
    }

    private function json(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }
        return $json;
    }
}
