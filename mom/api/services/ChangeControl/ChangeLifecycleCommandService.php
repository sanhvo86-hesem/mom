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
        $idempotencyKey = $this->requiredText($input, 'idempotency_key');
        $requestHash = $this->requestHash($input);
        $this->assertCreateIdempotencyLedger('change_request:create', $idempotencyKey, $requestHash);

        $number = $this->text($input['change_request_number'] ?? '');
        if ($number === '') {
            $number = 'CR-' . gmdate('Ymd-His') . '-' . substr(hash('sha256', $actorRef . json_encode($input)), 0, 6);
        }

        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO plm_change_requests
                    (change_request_number, request_type, title, problem_statement, proposed_solution,
                     impact_summary, priority, status, target_effective_date, metadata)
                VALUES
                    (:number, :request_type, :title, :problem_statement, :proposed_solution,
                     :impact_summary, :priority, :status, :target_effective_date, CAST(:metadata AS jsonb))
                ON CONFLICT (change_request_number) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM plm_change_requests WHERE change_request_number = :number
             LIMIT 1",
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
                ':metadata' => $this->json([
                    'actor_ref' => $actorRef,
                    'authority' => 'change_lifecycle_command',
                    'idempotency_key' => $idempotencyKey,
                    'request_hash_sha256' => $requestHash,
                ]),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('change_request_create_failed');
        }
        $this->assertRequestReplayEquivalent($row, $requestHash, 'change_request');
        $this->persistAffectedObjects($row['plm_change_request_id'] ?? null, null, $input['affected_objects'] ?? []);
        $this->completeCreateIdempotencyLedger('change_request:create', $idempotencyKey, $requestHash, $this->normalizeRow($row));
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
        $this->assertTransitionGovernance($input, $actorRef, 'change_request', strtolower($this->text($current['status'] ?? '')), $target, $current);

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
        $idempotencyKey = $this->requiredText($input, 'idempotency_key');
        $requestHash = $this->requestHash($input);
        $this->assertCreateIdempotencyLedger('change_order:create', $idempotencyKey, $requestHash);

        $number = $this->text($input['change_order_number'] ?? '');
        if ($number === '') {
            $number = 'CO-' . gmdate('Ymd-His') . '-' . substr(hash('sha256', $actorRef . json_encode($input)), 0, 6);
        }

        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO plm_change_orders
                    (change_order_number, plm_change_request_id, order_type, title, effectivity_type,
                     effective_from_date, effective_to_date, serial_effective_from, serial_effective_to,
                     status, implementation_due_date, metadata)
                VALUES
                    (:number, CAST(:request_id AS uuid), :order_type, :title, :effectivity_type,
                     :effective_from_date, :effective_to_date, :serial_effective_from, :serial_effective_to,
                     :status, :implementation_due_date, CAST(:metadata AS jsonb))
                ON CONFLICT (change_order_number) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM plm_change_orders WHERE change_order_number = :number
             LIMIT 1",
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
                ':metadata' => $this->json($this->changeOrderMetadata($input, $actorRef) + [
                    'idempotency_key' => $idempotencyKey,
                    'request_hash_sha256' => $requestHash,
                ]),
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('change_order_create_failed');
        }
        $this->assertRequestReplayEquivalent($row, $requestHash, 'change_order');
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
        $this->completeCreateIdempotencyLedger('change_order:create', $idempotencyKey, $requestHash, $this->normalizeRow($row));
        return $this->normalizeRow($row);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function transitionChangeOrder(array $input, string $actorRef): array
    {
        $this->requireDb();
        if (method_exists($this->db, 'transactional')) {
            return $this->db->transactional(fn(): array => $this->transitionChangeOrderInsideTransaction($input, $actorRef));
        }

        return $this->transitionChangeOrderInsideTransaction($input, $actorRef);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function transitionChangeOrderInsideTransaction(array $input, string $actorRef): array
    {
        $target = $this->enum($input['target_status'] ?? $input['status'] ?? '', ['draft', 'impact_assessment', 'in_review', 'approved', 'released', 'implemented', 'closed', 'cancelled']);
        $id = $this->requiredText($input, 'change_order_id');
        $current = $this->loadChangeOrderRow($id);
        $this->assertAllowedOrderTransition(strtolower($this->text($current['status'] ?? '')), $target);
        $this->assertTransitionGovernance($input, $actorRef, 'change_order', strtolower($this->text($current['status'] ?? '')), $target, $current);

        $releaseGate = null;
        $releaseSideEffects = null;
        $releaseSignature = null;
        $releasePackageHash = null;
        if ($target === 'released') {
            $releaseGate = $this->evaluateChangeOrderReleaseReadiness($id, $input);
            if (!$releaseGate['allowed']) {
                throw new RuntimeException('change_order_release_gate_blocked:' . implode(',', array_map(
                    static fn(array $blocker): string => (string)($blocker['code'] ?? 'unknown_blocker'),
                    $releaseGate['blockers'],
                )));
            }
            $releasePackageHash = $this->releasePackageHash($current, $releaseGate);
            $releaseSignatureEventId = $this->nullableUuid($input['signature_event_id'] ?? $input['release_signature_event_id'] ?? null);
            if ($releaseSignatureEventId === null) {
                throw new RuntimeException('change_order_release_signature_required');
            }
            $releaseSignature = (new ChangeReleaseSignatureValidator($this->db))->requireValidReleaseSignature(
                $releaseSignatureEventId,
                $current,
                $releasePackageHash,
                $actorRef,
            );
            $releaseSideEffects = (new ChangeReleaseSideEffectService($this->db))->apply($current, [
                'change_order_id' => $this->text($current['plm_change_order_id'] ?? $id),
                'actor_ref' => $actorRef,
                'signature_event_id' => $releaseSignatureEventId,
                'release_package_hash_sha256' => $releasePackageHash,
            ]);
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
                 release_signature_event_id = CASE WHEN :status = 'released' THEN CAST(:release_signature_event_id AS uuid) ELSE release_signature_event_id END,
                 release_package_hash_sha256 = CASE WHEN :status = 'released' THEN :release_package_hash_sha256 ELSE release_package_hash_sha256 END,
                 metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata AS jsonb),
                 updated_at = now()
             WHERE plm_change_order_id::text = :id OR change_order_number = :id
             RETURNING *",
            [
                ':status' => $target,
                ':id' => $id,
                ':release_signature_event_id' => is_array($releaseSignature) ? $this->nullableUuid($releaseSignature['signature_event_id'] ?? null) : null,
                ':release_package_hash_sha256' => $releasePackageHash,
                ':metadata' => $this->json(array_filter([
                    'transitioned_by' => $actorRef,
                    'reason' => $this->text($input['reason'] ?? ''),
                    'release_gate' => $releaseGate,
                    'release_package_hash_sha256' => $releasePackageHash,
                    'release_signature_event_id' => is_array($releaseSignature) ? $this->text($releaseSignature['signature_event_id'] ?? '') : null,
                    'release_side_effects' => $releaseSideEffects,
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
        $detectedConflicts = (new EffectivityConflictService($this->db))->detectAndPersist(
            $this->text($package['change_order']['plm_change_order_id'] ?? $changeOrderId),
            $package['effectivities'],
        );
        $conflicts = array_merge($package['conflicts'], $detectedConflicts);
        $gate = (new EffectivityGateService())->evaluateChangeOrderRelease(
            $package['change_order'],
            $package['affected_objects'],
            $package['resulting_objects'],
            $package['effectivities'],
            $package['training_requirements'],
            $package['verifications'],
            $conflicts,
        );

        $blockers = $gate['blockers'];
        $warnings = $gate['warnings'];

        if ($package['effectiveness_reviews'] === []) {
            $blockers[] = $this->blocker('effectiveness_review_required', 'Change order release requires a scheduled effectiveness review.');
        }

        foreach ($this->blockedTraceabilityGates($package['affected_objects'], $package['resulting_objects']) as $gate) {
            $blockers[] = $this->blocker('traceability_5m_gate_blocked', 'Required 5M traceability context is incomplete.', $gate);
        }
        foreach ($this->unresolvedWipDispositions($package['wip_dispositions']) as $disposition) {
            $blockers[] = $this->blocker('wip_disposition_unresolved', 'WIP, on-order, or finished-goods impact disposition must be approved, executed, or signed-waived before release.', $disposition);
        }
        foreach ($this->missingWipImpactDispositionCoverage($package['effectivities'], $package['wip_dispositions']) as $impact) {
            $blockers[] = $this->blocker('wip_impact_disposition_required', 'Every WIP, on-order, finished-goods, or retroactive effectivity impact requires an explicit disposition row before release.', $impact);
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
            'release_package_payload' => $this->canonicalReleasePackagePayload($package, $conflicts),
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
                    ':requested_effect' => $this->enum($object['requested_effect'] ?? 'metadata_update', ['create', 'revise', 'release', 'supersede', 'withdraw', 'obsolete', 'replace', 'amend', 'deviation', 'metadata_update', 'training_update', 'publication_update', 'deploy_controlled_source', 'run_controlled_migration', 'reload_controlled_runtime']),
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
            $affectedObjectId = $this->resolveAffectedObjectId($orderId, $object, $affectedObjects);
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
    private function resolveAffectedObjectId(mixed $orderId, array $resultingObject, array $affectedObjects): string
    {
        $explicit = $this->nullableUuid($resultingObject['affected_object_id'] ?? null);
        if ($explicit !== null) {
            foreach ($affectedObjects as $affected) {
                if ($this->text($affected['plm_change_affected_object_id'] ?? '') === $explicit) {
                    return $explicit;
                }
            }
            $row = $this->db->queryOne(
                "SELECT plm_change_affected_object_id
                 FROM plm_change_affected_objects
                 WHERE plm_change_order_id = CAST(:order_id AS uuid)
                   AND plm_change_affected_object_id = CAST(:affected_object_id AS uuid)
                 LIMIT 1",
                [
                    ':order_id' => $this->nullableUuid($orderId),
                    ':affected_object_id' => $explicit,
                ],
            );
            if (!is_array($row) || $this->text($row['plm_change_affected_object_id'] ?? '') !== $explicit) {
                throw new RuntimeException('resulting_object_affected_object_not_in_change_order');
            }
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
                     satisfaction_signature_event_id, waiver_signature_event_id, training_evidence_record_id,
                     source_training_record_id,
                     idempotency_key, metadata)
                 VALUES
                    (CAST(:order_id AS uuid), :object_type, :object_id, :audience_type, :audience_ref,
                     :requirement_type, :due_before_effective, :requirement_state, :due_at, :satisfied_at,
                     CAST(:satisfaction_signature_event_id AS uuid), CAST(:waiver_signature_event_id AS uuid),
                     CAST(:training_evidence_record_id AS uuid), :source_training_record_id,
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
                    ':satisfaction_signature_event_id' => $this->nullableUuid($requirement['satisfaction_signature_event_id'] ?? $requirement['signature_event_id'] ?? null),
                    ':waiver_signature_event_id' => $this->nullableUuid($requirement['waiver_signature_event_id'] ?? null),
                    ':training_evidence_record_id' => $this->nullableUuid($requirement['training_evidence_record_id'] ?? $requirement['evidence_record_id'] ?? null),
                    ':source_training_record_id' => $this->nullableText($requirement['source_training_record_id'] ?? $requirement['training_record_id'] ?? null),
                    ':idempotency_key' => hash('sha256', 'training|' . $this->text($orderId) . '|' . $this->requiredText($requirement, 'object_type') . '|' . $this->requiredText($requirement, 'object_id') . '|' . $this->enum($requirement['audience_type'] ?? 'role', ['user', 'role', 'department', 'site', 'plant']) . '|' . $this->requiredText($requirement, 'audience_ref') . '|' . $this->enum($requirement['training_requirement_type'] ?? 'read_ack', ['read_ack', 'qualification', 'training_course', 'practical_assessment']) . '|' . ($this->bool($requirement['due_before_effective'] ?? true) ? 'due_before' : 'advisory')),
                    ':metadata' => $this->json(['actor_ref' => $actorRef, 'authority' => 'change_lifecycle_command'] + (is_array($requirement['metadata'] ?? null) ? $requirement['metadata'] : [])),
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

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $currentRow
     */
    private function assertTransitionGovernance(
        array $input,
        string $actorRef,
        string $aggregateType,
        string $current,
        string $target,
        array $currentRow,
    ): void {
        if ($this->text($input['reason'] ?? '') === '' && !in_array($target, ['cancelled', 'rejected'], true)) {
            throw new RuntimeException($aggregateType . '_transition_reason_required');
        }

        $roles = $this->normalizedRoles($input['actor_roles'] ?? $input['_actor_roles'] ?? []);
        if ($roles === []) {
            throw new RuntimeException($aggregateType . '_transition_actor_roles_required');
        }
        if (!$this->transitionRoleAllowed($aggregateType, $target, $roles)) {
            throw new RuntimeException($aggregateType . '_transition_role_not_authorized');
        }

        if ($aggregateType === 'change_order' && in_array($target, ['approved', 'released', 'closed'], true)) {
            $creator = $this->creatorRef($currentRow);
            if ($creator !== '' && hash_equals($creator, $actorRef)) {
                throw new RuntimeException('change_order_transition_sod_violation');
            }
        }

        if ($target === 'released' && $this->nullableUuid($input['signature_event_id'] ?? $input['release_signature_event_id'] ?? null) === null) {
            throw new RuntimeException('change_order_release_signature_required');
        }
    }

    /**
     * @param list<string>|mixed $roles
     * @return list<string>
     */
    private function normalizedRoles(mixed $roles): array
    {
        if (!is_array($roles)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            static fn(mixed $role): string => strtolower(trim((string)$role)),
            $roles,
        ))));
    }

    /**
     * @param list<string> $roles
     */
    private function transitionRoleAllowed(string $aggregateType, string $target, array $roles): bool
    {
        $policy = $aggregateType === 'change_request'
            ? [
                'submitted' => ['requester', 'author', 'qa', 'qms_engineer', 'change_coordinator', 'admin'],
                'triage' => ['change_coordinator', 'qa_manager', 'qms_manager', 'admin'],
                'approved_for_order' => ['change_coordinator', 'qa_manager', 'qms_manager', 'admin'],
                'rejected' => ['change_coordinator', 'qa_manager', 'qms_manager', 'admin'],
                'cancelled' => ['requester', 'change_coordinator', 'admin'],
            ]
            : [
                'impact_assessment' => ['change_coordinator', 'qa_manager', 'qms_manager', 'engineering_manager', 'admin'],
                'in_review' => ['change_coordinator', 'qa_manager', 'qms_manager', 'admin'],
                'approved' => ['qa_manager', 'qms_manager', 'engineering_manager', 'compliance_manager', 'admin'],
                'released' => ['qa_manager', 'qms_manager', 'change_coordinator', 'compliance_manager', 'admin'],
                'implemented' => ['implementation_owner', 'production_manager', 'change_coordinator', 'admin'],
                'closed' => ['qa_manager', 'qms_manager', 'compliance_manager', 'admin'],
                'cancelled' => ['change_coordinator', 'qa_manager', 'qms_manager', 'admin'],
            ];

        $allowed = $policy[$target] ?? [];
        if ($allowed === []) {
            return true;
        }
        foreach ($roles as $role) {
            if (in_array($role, $allowed, true)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function creatorRef(array $row): string
    {
        $metadata = $row['metadata'] ?? [];
        if (is_string($metadata)) {
            $decoded = json_decode($metadata, true);
            $metadata = is_array($decoded) ? $decoded : [];
        }
        return is_array($metadata) ? $this->text($metadata['actor_ref'] ?? $metadata['created_by_actor_ref'] ?? '') : '';
    }

    /**
     * @param array<string, mixed> $changeOrder
     * @param array<string, mixed> $releaseGate
     */
    private function releasePackageHash(array $changeOrder, array $releaseGate): string
    {
        return hash('sha256', $this->json([
            'package_type' => 'change_order_release',
            'change_order_id' => $this->text($changeOrder['plm_change_order_id'] ?? ''),
            'change_order_number' => $this->text($changeOrder['change_order_number'] ?? ''),
            'from_state' => $this->text($changeOrder['status'] ?? ''),
            'to_state' => 'released',
            'release_gate' => [
                'allowed' => (bool)($releaseGate['allowed'] ?? false),
                'blockers' => $releaseGate['blockers'] ?? [],
                'canonical_lifecycle_sources' => $releaseGate['canonical_lifecycle_sources'] ?? [],
                'release_package_payload' => $releaseGate['release_package_payload'] ?? [],
            ],
        ]));
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

    /**
     * @param array<string, mixed> $input
     */
    private function requestHash(array $input): string
    {
        $copy = $input;
        unset($copy['idempotency_key']);
        return hash('sha256', $this->json($copy));
    }

    private function assertCreateIdempotencyLedger(string $scopeKey, string $idempotencyKey, string $fingerprintHash): void
    {
        $row = $this->db->queryOne(
            "WITH inserted AS (
                INSERT INTO idempotency_replay_ledger
                    (scope_key, scope_key_hash, idempotency_key, fingerprint_hash, status, response_payload, expires_at, metadata)
                VALUES
                    (:scope_key, :scope_key_hash, :idempotency_key, :fingerprint_hash, 'in_progress', '{}'::jsonb,
                     now() + interval '24 hours', CAST(:metadata AS jsonb))
                ON CONFLICT (scope_key_hash, idempotency_key) DO NOTHING
                RETURNING *
             )
             SELECT * FROM inserted
             UNION ALL
             SELECT * FROM idempotency_replay_ledger
              WHERE scope_key_hash = :scope_key_hash
                AND idempotency_key = :idempotency_key
             LIMIT 1",
            [
                ':scope_key' => $scopeKey,
                ':scope_key_hash' => hash('sha256', $scopeKey),
                ':idempotency_key' => $idempotencyKey,
                ':fingerprint_hash' => $fingerprintHash,
                ':metadata' => $this->json(['authority' => 'ChangeLifecycleCommandService']),
            ],
        );

        if (!is_array($row) || $this->text($row['ledger_id'] ?? '') === '') {
            throw new RuntimeException('change_lifecycle_idempotency_ledger_required');
        }
        if (!hash_equals($this->text($row['fingerprint_hash'] ?? ''), $fingerprintHash)) {
            throw new RuntimeException('change_lifecycle_idempotency_conflict');
        }
    }

    /**
     * @param array<string, mixed> $response
     */
    private function completeCreateIdempotencyLedger(string $scopeKey, string $idempotencyKey, string $fingerprintHash, array $response): void
    {
        $row = $this->db->queryOne(
            "UPDATE idempotency_replay_ledger
             SET status = 'completed',
                 status_code = 201,
                 response_payload = CAST(:response_payload AS jsonb),
                 completed_at = now(),
                 updated_at = now()
             WHERE scope_key_hash = :scope_key_hash
               AND idempotency_key = :idempotency_key
               AND fingerprint_hash = :fingerprint_hash
             RETURNING ledger_id",
            [
                ':scope_key_hash' => hash('sha256', $scopeKey),
                ':idempotency_key' => $idempotencyKey,
                ':fingerprint_hash' => $fingerprintHash,
                ':response_payload' => $this->json($response),
            ],
        );
        if (!is_array($row) || $this->text($row['ledger_id'] ?? '') === '') {
            throw new RuntimeException('change_lifecycle_idempotency_completion_required');
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function assertRequestReplayEquivalent(array $row, string $requestHash, string $aggregateType): void
    {
        $metadata = $row['metadata'] ?? [];
        if (is_string($metadata)) {
            $decoded = json_decode($metadata, true);
            $metadata = is_array($decoded) ? $decoded : [];
        }

        $storedHash = is_array($metadata) ? $this->text($metadata['request_hash_sha256'] ?? '') : '';
        if ($storedHash === '' || !hash_equals($storedHash, $requestHash)) {
            throw new RuntimeException($aggregateType . '_idempotency_conflict');
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
                   " . $this->traceabilityScopeFilterSql($object) . "
                   AND gate_state = 'blocked'",
                [
                    ':object_type' => strtolower($objectType),
                    ':object_id' => $objectId,
                ] + $this->traceabilityScopeParams($object),
            );
            foreach ($rows as $row) {
                $blocked[] = $row;
            }
        }
        return $blocked;
    }

    /**
     * @param list<array<string, mixed>> $wipDispositions
     * @return list<array<string, mixed>>
     */
    private function unresolvedWipDispositions(array $wipDispositions): array
    {
        $unresolved = [];
        foreach ($wipDispositions as $disposition) {
            $state = strtolower($this->text($disposition['disposition_state'] ?? ''));
            $metadata = is_array($disposition['metadata'] ?? null) ? $disposition['metadata'] : [];
            if (!in_array($state, ['approved', 'executed', 'waived', 'cancelled'], true)) {
                $unresolved[] = $disposition;
                continue;
            }
            if ($state === 'waived'
                && $this->text($disposition['waiver_signature_event_id'] ?? $metadata['waiver_signature_event_id'] ?? '') === ''
            ) {
                $unresolved[] = $disposition + ['unresolved_reason' => 'waived_disposition_signature_required'];
            }
        }
        return $unresolved;
    }

    /**
     * @param list<array<string, mixed>> $effectivities
     * @param list<array<string, mixed>> $wipDispositions
     * @return list<array<string, mixed>>
     */
    private function missingWipImpactDispositionCoverage(array $effectivities, array $wipDispositions): array
    {
        $dispositionKeys = [];
        foreach ($wipDispositions as $disposition) {
            $type = strtolower($this->text($disposition['wip_object_type'] ?? $disposition['object_type'] ?? ''));
            $id = $this->text($disposition['wip_object_id'] ?? $disposition['object_id'] ?? '');
            if ($type !== '' && $id !== '') {
                $dispositionKeys[$type . '|' . $id] = true;
            }
        }

        $missing = [];
        $hasDisposition = $dispositionKeys !== [];
        foreach ($effectivities as $effectivity) {
            $impact = strtolower($this->text($effectivity['release_impact'] ?? ''));
            if (!in_array($impact, ['retroactive', 'wip_hold', 'wip_rework', 'ship_hold'], true)) {
                continue;
            }
            $type = strtolower($this->text($effectivity['object_type'] ?? ''));
            $id = $this->text($effectivity['object_id'] ?? '');
            if ($hasDisposition && !in_array($type, ['work_order', 'job_order', 'lot', 'batch', 'serial', 'finished_good', 'sales_order', 'purchase_order'], true)) {
                continue;
            }
            if ($type === '' || $id === '') {
                $missing[] = $effectivity + ['missing_reason' => 'effectivity_object_required_for_wip_impact_disposition'];
                continue;
            }
            if (!isset($dispositionKeys[$type . '|' . $id])) {
                $missing[] = $effectivity + ['missing_reason' => 'wip_impact_disposition_not_enumerated'];
            }
        }
        return $missing;
    }

    /**
     * @param array<string, mixed> $object
     */
    private function traceabilityScopeFilterSql(array $object): string
    {
        $scope = $this->objectScope($object);
        if ($scope === []) {
            return '';
        }
        $clauses = [];
        foreach ($scope as $field => $_value) {
            $clauses[] = "AND COALESCE({$field}, '') = COALESCE(:{$field}, '')";
        }
        return "\n                   " . implode("\n                   ", $clauses);
    }

    /**
     * @param array<string, mixed> $object
     * @return array<string, string|null>
     */
    private function traceabilityScopeParams(array $object): array
    {
        $params = [];
        foreach ($this->objectScope($object) as $field => $value) {
            $params[':' . $field] = $value;
        }
        return $params;
    }

    /**
     * @param array<string, mixed> $object
     * @return array<string, string>
     */
    private function objectScope(array $object): array
    {
        $scope = [];
        foreach (['metadata', 'effectivity_rule', 'effectivity_scope', 'scope'] as $container) {
            $raw = $object[$container] ?? null;
            if (is_string($raw)) {
                $decoded = json_decode($raw, true);
                $raw = is_array($decoded) ? $decoded : null;
            }
            if (is_array($raw)) {
                foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
                    $value = $this->text($raw[$field] ?? '');
                    if ($value !== '') {
                        $scope[$field] = $value;
                    }
                }
            }
        }
        foreach (['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'] as $field) {
            $value = $this->text($object[$field] ?? '');
            if ($value !== '') {
                $scope[$field] = $value;
            }
        }
        return $scope;
    }

    /**
     * @param array{
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
     * } $package
     * @param list<array<string, mixed>> $conflicts
     * @return array<string, mixed>
     */
    private function canonicalReleasePackagePayload(array $package, array $conflicts): array
    {
        return $this->canonicalize([
            'change_order' => $package['change_order'],
            'affected_objects' => $package['affected_objects'],
            'resulting_objects' => $package['resulting_objects'],
            'effectivities' => $package['effectivities'],
            'training_requirements' => $package['training_requirements'],
            'verifications' => $package['verifications'],
            'effectiveness_reviews' => $package['effectiveness_reviews'],
            'wip_dispositions' => $package['wip_dispositions'],
            'rollback_requirements' => $package['rollback_requirements'],
            'emergency_change_controls' => $package['emergency_change_controls'],
            'effectivity_conflicts' => $conflicts,
        ]);
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
        if ($riskWaiver !== '' && $riskSignature === '') {
            $blockers[] = $this->blocker('emergency_risk_waiver_signature_required', 'Emergency risk waiver must be bound to an authoritative signature event.');
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

    private function canonicalize(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        $normalized = [];
        foreach ($value as $key => $item) {
            if ($key === 'created_at' || $key === 'updated_at' || $key === 'row_version') {
                continue;
            }
            $normalized[$key] = $this->canonicalize($item);
        }

        if (array_is_list($normalized)) {
            usort($normalized, static function (mixed $left, mixed $right): int {
                return strcmp(
                    json_encode($left, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '',
                    json_encode($right, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '',
                );
            });
            return $normalized;
        }

        ksort($normalized);
        return $normalized;
    }
}
