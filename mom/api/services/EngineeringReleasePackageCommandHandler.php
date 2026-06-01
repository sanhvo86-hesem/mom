<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use Throwable;

/**
 * Command-side authority for engineering release packages.
 *
 * This handler intentionally builds manifests from persisted package/member
 * rows. Caller-provided hash fields are never accepted as package authority.
 */
final class EngineeringReleasePackageCommandHandler
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?GateContextBuilder $gateContextBuilder = null,
        private readonly ?RequiredMemberMatrix $requiredMemberMatrix = null,
        private readonly ?EngineeringPackageManifestBuilder $manifestBuilder = null,
    ) {}

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function createEngineeringReleasePackage(array $command): array
    {
        $this->rejectCallerManifestHash($command);
        $policy = $this->json($command['required_member_policy'] ?? []);
        $metadata = $this->json($command['metadata'] ?? []);
        $actorId = $this->actor($command);
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');

        return $this->db->transactional(function () use ($command, $policy, $metadata, $actorId, $idempotencyKey): array {
            $row = $this->db->insertReturning(
                "INSERT INTO engineering_release_package
                    (package_code, item_ref, revision_ref, site_ref, required_member_policy, metadata, created_by)
                 VALUES
                    (:package_code, :item_ref, :revision_ref, :site_ref, CAST(:policy AS jsonb), CAST(:metadata AS jsonb), :created_by)
                 RETURNING package_id::text, package_code, lifecycle_status",
                [
                    ':package_code' => $this->requiredText($command, 'package_code'),
                    ':item_ref' => $this->requiredText($command, 'item_ref'),
                    ':revision_ref' => $this->requiredText($command, 'revision_ref'),
                    ':site_ref' => $this->text($command['site_ref'] ?? ''),
                    ':policy' => $policy,
                    ':metadata' => $metadata,
                    ':created_by' => $actorId,
                ]
            ) ?? [];

            $this->writeAuditAndOutbox(
                'engineering_release_package.created',
                (string)$row['package_id'],
                ['package' => $row],
                $actorId,
                $idempotencyKey
            );

            return $row;
        });
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function addPackageMember(array $command): array
    {
        $this->rejectCallerManifestHash($command);
        $actorId = $this->actor($command);
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');
        $packageId = $this->requiredText($command, 'package_id');

        return $this->db->transactional(function () use ($command, $actorId, $idempotencyKey, $packageId): array {
            $package = $this->loadPackageForUpdate($packageId);
            $this->assertPackageEditable($package);

            $row = $this->db->insertReturning(
                "INSERT INTO engineering_release_package_member
                    (package_id, member_type, member_ref, member_revision, member_status, source_authority, metadata, added_by)
                 VALUES
                    (CAST(:package_id AS uuid), :member_type, :member_ref, :member_revision, :member_status, :source_authority, CAST(:metadata AS jsonb), :added_by)
                 ON CONFLICT (package_id, member_type, member_ref, member_revision)
                 DO UPDATE SET
                    member_status = EXCLUDED.member_status,
                    source_authority = EXCLUDED.source_authority,
                    metadata = EXCLUDED.metadata,
                    updated_at = now()
                 RETURNING member_id::text, package_id::text, member_type, member_ref, member_revision, member_status",
                [
                    ':package_id' => $packageId,
                    ':member_type' => $this->requiredText($command, 'member_type'),
                    ':member_ref' => $this->requiredText($command, 'member_ref'),
                    ':member_revision' => $this->text($command['member_revision'] ?? ''),
                    ':member_status' => strtolower($this->requiredText($command, 'member_status')),
                    ':source_authority' => $this->requiredText($command, 'source_authority'),
                    ':metadata' => $this->json($command['metadata'] ?? []),
                    ':added_by' => $actorId,
                ]
            ) ?? [];

            $this->writeAuditAndOutbox(
                'engineering_release_package.member_added',
                $packageId,
                ['member' => $row],
                $actorId,
                $idempotencyKey
            );

            return $row;
        });
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function submitPackageForApproval(array $command): array
    {
        return $this->transitionEditablePackage($command, 'submitted', 'engineering_release_package.submitted');
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function approveEngineeringReleasePackage(array $command): array
    {
        $this->rejectCallerManifestHash($command);
        $actorId = $this->actor($command);
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');
        $packageId = $this->requiredText($command, 'package_id');

        return $this->db->transactional(function () use ($command, $actorId, $idempotencyKey, $packageId): array {
            $package = $this->loadPackageForUpdate($packageId);
            $this->assertPackageEditable($package);

            $approval = $this->db->insertReturning(
                "INSERT INTO engineering_release_package_approval
                    (package_id, approver_id, approval_meaning, approval_status, signed_payload_hash_sha256, metadata)
                 VALUES
                    (CAST(:package_id AS uuid), :approver_id, :approval_meaning, 'approved', :signed_payload_hash_sha256, CAST(:metadata AS jsonb))
                 ON CONFLICT (package_id, approver_id, approval_meaning) WHERE approval_status = 'approved'
                 DO UPDATE SET
                    signed_payload_hash_sha256 = EXCLUDED.signed_payload_hash_sha256,
                    metadata = EXCLUDED.metadata,
                    approved_at = now()
                 RETURNING approval_id::text, package_id::text, approver_id, approval_meaning, approval_status, approved_at",
                [
                    ':package_id' => $packageId,
                    ':approver_id' => $actorId,
                    ':approval_meaning' => $this->text($command['approval_meaning'] ?? 'engineering_release_approved'),
                    ':signed_payload_hash_sha256' => $this->nullableSha256($command['signed_payload_hash_sha256'] ?? null),
                    ':metadata' => $this->json($command['metadata'] ?? []),
                ]
            ) ?? [];

            $this->db->execute(
                "UPDATE engineering_release_package
                    SET lifecycle_status = 'approved', updated_at = now()
                  WHERE package_id = CAST(:package_id AS uuid)
                    AND lifecycle_status IN ('draft','submitted','approved')",
                [':package_id' => $packageId]
            );

            $this->writeAuditAndOutbox(
                'engineering_release_package.approved',
                $packageId,
                ['approval' => $approval],
                $actorId,
                $idempotencyKey
            );

            return $approval;
        });
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function releaseEngineeringReleasePackage(array $command): array
    {
        $this->rejectCallerManifestHash($command);
        $actorId = $this->actor($command);
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');
        $packageId = $this->requiredText($command, 'package_id');

        return $this->db->transactional(function () use ($command, $actorId, $idempotencyKey, $packageId): array {
            $package = $this->loadPackageForUpdate($packageId);
            $this->assertPackageEditable($package);

            if ($this->gateContextBuilder !== null) {
                $this->gateContextBuilder->buildOrFail(
                    'ReleaseEngineeringReleasePackageCommand',
                    array_merge($package, ['package_id' => $packageId, 'evidence' => $command['evidence'] ?? []]),
                    ['actor_id' => $actorId]
                );
            }

            $members = $this->loadMembers($packageId);
            $approvals = $this->loadApprovals($packageId);
            $matrix = ($this->requiredMemberMatrix ?? new RequiredMemberMatrix())->evaluate($package, $members);
            if ($matrix['missing'] !== [] || $matrix['draft'] !== []) {
                throw new EngineeringReleasePackageException('engineering_package_release_invariants_failed', $matrix);
            }
            if ($approvals === []) {
                throw new EngineeringReleasePackageException('engineering_package_approval_required', [
                    'package_id' => $packageId,
                ]);
            }

            $manifest = ($this->manifestBuilder ?? new EngineeringPackageManifestBuilder())->build($package, $members, $approvals);
            $manifestHash = (string)$manifest['manifest_hash_sha256'];

            $row = $this->db->insertReturning(
                "UPDATE engineering_release_package
                    SET lifecycle_status = 'released',
                        manifest_json = CAST(:manifest AS jsonb),
                        manifest_hash_sha256 = :manifest_hash,
                        released_at = now(),
                        released_by = :released_by,
                        updated_at = now()
                  WHERE package_id = CAST(:package_id AS uuid)
                    AND lifecycle_status IN ('approved','submitted')
                 RETURNING package_id::text, package_code, lifecycle_status, manifest_hash_sha256, released_at",
                [
                    ':package_id' => $packageId,
                    ':manifest' => $this->json($manifest),
                    ':manifest_hash' => $manifestHash,
                    ':released_by' => $actorId,
                ]
            );

            if ($row === null) {
                throw new EngineeringReleasePackageException('engineering_package_not_approved_for_release', [
                    'package_id' => $packageId,
                    'current_status' => (string)($package['lifecycle_status'] ?? ''),
                ]);
            }

            $this->writePackageEvent($packageId, 'released', ['manifest_hash_sha256' => $manifestHash], $actorId);
            $this->writeAuditAndOutbox(
                'engineering_release_package.released',
                $packageId,
                ['package' => $row, 'manifest_hash_sha256' => $manifestHash],
                $actorId,
                $idempotencyKey
            );

            return array_merge($row, ['manifest' => $manifest]);
        });
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function supersedePackage(array $command): array
    {
        $actorId = $this->actor($command);
        $packageId = $this->requiredText($command, 'package_id');
        $successorId = $this->requiredText($command, 'superseded_by_package_id');

        return $this->db->transactional(function () use ($actorId, $packageId, $successorId): array {
            $row = $this->db->insertReturning(
                "UPDATE engineering_release_package
                    SET lifecycle_status = 'superseded',
                        superseded_by_package_id = CAST(:successor_id AS uuid),
                        updated_at = now()
                  WHERE package_id = CAST(:package_id AS uuid)
                    AND lifecycle_status = 'released'
                 RETURNING package_id::text, lifecycle_status, superseded_by_package_id::text",
                [
                    ':package_id' => $packageId,
                    ':successor_id' => $successorId,
                ]
            );
            if ($row === null) {
                throw new EngineeringReleasePackageException('engineering_package_supersede_requires_released_source');
            }
            $this->writeAuditAndOutbox('engineering_release_package.superseded', $packageId, ['package' => $row], $actorId);

            return $row;
        });
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function withdrawPackage(array $command): array
    {
        return $this->transitionEditablePackage($command, 'withdrawn', 'engineering_release_package.withdrawn');
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function bindPackageToWorkOrder(array $command): array
    {
        $actorId = $this->actor($command);
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');
        $packageId = $this->requiredText($command, 'package_id');
        $workOrderRef = $this->requiredText($command, 'work_order_ref');
        $expectedHash = $this->nullableSha256($command['package_manifest_hash_sha256'] ?? $command['expected_manifest_hash_sha256'] ?? null);
        if ($expectedHash === null) {
            throw new EngineeringReleasePackageException('package_manifest_hash_required');
        }

        return $this->db->transactional(function () use ($actorId, $idempotencyKey, $packageId, $workOrderRef, $expectedHash): array {
            $package = $this->loadPackage($packageId);
            if ((string)($package['lifecycle_status'] ?? '') !== 'released') {
                throw new EngineeringReleasePackageException('released_engineering_package_required', ['package_id' => $packageId]);
            }
            $serverHash = strtolower((string)($package['manifest_hash_sha256'] ?? ''));
            if ($serverHash === '' || !hash_equals($serverHash, strtolower($expectedHash))) {
                throw new EngineeringReleasePackageException('engineering_package_manifest_hash_mismatch', [
                    'package_id' => $packageId,
                    'expected' => strtolower($expectedHash),
                    'actual' => $serverHash,
                ]);
            }

            $manifestJson = $this->json($package['manifest_json'] ?? []);
            $snapshot = $this->db->insertReturning(
                "INSERT INTO work_order_engineering_package_snapshot
                    (work_order_ref, package_id, package_manifest_hash_sha256, package_manifest_json, bound_by, idempotency_key)
                 VALUES
                    (:work_order_ref, CAST(:package_id AS uuid), :manifest_hash, CAST(:manifest_json AS jsonb), :bound_by, :idempotency_key)
                 ON CONFLICT (work_order_ref, idempotency_key)
                 DO UPDATE SET work_order_ref = EXCLUDED.work_order_ref
                 RETURNING snapshot_id::text, work_order_ref, package_id::text, package_manifest_hash_sha256, bound_at",
                [
                    ':work_order_ref' => $workOrderRef,
                    ':package_id' => $packageId,
                    ':manifest_hash' => $serverHash,
                    ':manifest_json' => $manifestJson,
                    ':bound_by' => $actorId,
                    ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : hash('sha256', 'bind|' . $workOrderRef . '|' . $packageId . '|' . $serverHash),
                ]
            ) ?? [];

            $this->db->execute(
                "UPDATE work_orders
                    SET engineering_package_id = CAST(:package_id AS uuid),
                        engineering_package_manifest_hash_sha256 = :manifest_hash,
                        engineering_package_snapshot_id = CAST(:snapshot_id AS uuid),
                        release_gate_status = 'ready',
                        updated_at = now()
                  WHERE work_order_id::text = :work_order_ref
                     OR work_order_number = :work_order_ref",
                [
                    ':package_id' => $packageId,
                    ':manifest_hash' => $serverHash,
                    ':snapshot_id' => (string)$snapshot['snapshot_id'],
                    ':work_order_ref' => $workOrderRef,
                ]
            );

            $this->writeAuditAndOutbox(
                'engineering_release_package.bound_to_work_order',
                $packageId,
                ['snapshot' => $snapshot],
                $actorId,
                $idempotencyKey
            );

            return $snapshot;
        });
    }

    /**
     * Release a work order only after binding an explicit engineering package
     * snapshot in the same PostgreSQL transaction.
     *
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function releaseWorkOrderWithPackage(array $command): array
    {
        $actorId = $this->actor($command);
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');
        $packageId = $this->requiredText($command, 'package_id');
        $workOrderRef = $this->requiredText($command, 'work_order_ref');
        $expectedHash = $this->nullableSha256($command['package_manifest_hash_sha256'] ?? $command['expected_manifest_hash_sha256'] ?? null);
        if ($expectedHash === null) {
            throw new EngineeringReleasePackageException('package_manifest_hash_required');
        }

        return $this->db->transactional(function () use ($actorId, $idempotencyKey, $packageId, $workOrderRef, $expectedHash): array {
            $package = $this->loadPackage($packageId);
            if ((string)($package['lifecycle_status'] ?? '') !== 'released') {
                throw new EngineeringReleasePackageException('released_engineering_package_required', ['package_id' => $packageId]);
            }

            $serverHash = strtolower((string)($package['manifest_hash_sha256'] ?? ''));
            if ($serverHash === '' || !hash_equals($serverHash, strtolower($expectedHash))) {
                throw new EngineeringReleasePackageException('engineering_package_manifest_hash_mismatch', [
                    'package_id' => $packageId,
                    'expected' => strtolower($expectedHash),
                    'actual' => $serverHash,
                ]);
            }

            $snapshot = $this->db->insertReturning(
                "INSERT INTO work_order_engineering_package_snapshot
                    (work_order_ref, package_id, package_manifest_hash_sha256, package_manifest_json, bound_by, idempotency_key)
                 VALUES
                    (:work_order_ref, CAST(:package_id AS uuid), :manifest_hash, CAST(:manifest_json AS jsonb), :bound_by, :idempotency_key)
                 ON CONFLICT (work_order_ref, idempotency_key)
                 DO UPDATE SET work_order_ref = EXCLUDED.work_order_ref
                 RETURNING snapshot_id::text, work_order_ref, package_id::text, package_manifest_hash_sha256, bound_at",
                [
                    ':work_order_ref' => $workOrderRef,
                    ':package_id' => $packageId,
                    ':manifest_hash' => $serverHash,
                    ':manifest_json' => $this->json($package['manifest_json'] ?? []),
                    ':bound_by' => $actorId,
                    ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : hash('sha256', 'release-wo|' . $workOrderRef . '|' . $packageId . '|' . $serverHash),
                ]
            ) ?? [];

            $this->db->execute(
                "UPDATE work_orders
                    SET engineering_package_id = CAST(:package_id AS uuid),
                        engineering_package_manifest_hash_sha256 = :manifest_hash,
                        engineering_package_snapshot_id = CAST(:snapshot_id AS uuid),
                        release_gate_status = 'released',
                        work_order_status = 'released',
                        updated_at = now()
                  WHERE work_order_id::text = :work_order_ref
                     OR work_order_number = :work_order_ref",
                [
                    ':package_id' => $packageId,
                    ':manifest_hash' => $serverHash,
                    ':snapshot_id' => (string)$snapshot['snapshot_id'],
                    ':work_order_ref' => $workOrderRef,
                ]
            );

            $this->writeAuditAndOutbox(
                'engineering_release_package.work_order_released',
                $packageId,
                ['snapshot' => $snapshot, 'work_order_ref' => $workOrderRef],
                $actorId,
                $idempotencyKey
            );

            return [
                'work_order_ref' => $workOrderRef,
                'package_id' => $packageId,
                'package_manifest_hash_sha256' => $serverHash,
                'snapshot' => $snapshot,
                'work_order_status' => 'released',
            ];
        });
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function bindPackageToJobOrder(array $command): array
    {
        $jobOrderRef = $this->requiredText($command, 'job_order_ref');

        return $this->bindPackageToPlanningOrder(
            $command,
            'job_order',
            'job_orders',
            'job_order_id',
            'job_number',
            $jobOrderRef,
            'engineering_release_package.bound_to_job_order'
        );
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    public function bindPackageToSalesOrder(array $command): array
    {
        $salesOrderRef = $this->requiredText($command, 'sales_order_ref');

        return $this->bindPackageToPlanningOrder(
            $command,
            'sales_order',
            'sales_order',
            'sales_order_id',
            'sales_order_no',
            $salesOrderRef,
            'engineering_release_package.bound_to_sales_order'
        );
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    private function transitionEditablePackage(array $command, string $targetStatus, string $eventType): array
    {
        $this->rejectCallerManifestHash($command);
        $actorId = $this->actor($command);
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');
        $packageId = $this->requiredText($command, 'package_id');

        return $this->db->transactional(function () use ($actorId, $idempotencyKey, $packageId, $targetStatus, $eventType): array {
            $package = $this->loadPackageForUpdate($packageId);
            $this->assertPackageEditable($package);
            $row = $this->db->insertReturning(
                "UPDATE engineering_release_package
                    SET lifecycle_status = :status, updated_at = now()
                  WHERE package_id = CAST(:package_id AS uuid)
                 RETURNING package_id::text, package_code, lifecycle_status",
                [
                    ':status' => $targetStatus,
                    ':package_id' => $packageId,
                ]
            ) ?? [];

            $this->writeAuditAndOutbox($eventType, $packageId, ['package' => $row], $actorId, $idempotencyKey);

            return $row;
        });
    }

    /**
     * @param array<string,mixed> $command
     * @return array<string,mixed>
     */
    private function bindPackageToPlanningOrder(
        array $command,
        string $orderScope,
        string $tableName,
        string $idColumn,
        string $numberColumn,
        string $orderRef,
        string $eventType
    ): array {
        $actorId = $this->actor($command);
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');
        $packageId = $this->requiredText($command, 'package_id');
        $expectedHash = $this->nullableSha256($command['package_manifest_hash_sha256'] ?? $command['expected_manifest_hash_sha256'] ?? null);
        if ($expectedHash === null) {
            throw new EngineeringReleasePackageException('package_manifest_hash_required');
        }

        return $this->db->transactional(function () use ($actorId, $idempotencyKey, $packageId, $expectedHash, $orderScope, $tableName, $idColumn, $numberColumn, $orderRef, $eventType): array {
            $package = $this->loadPackage($packageId);
            if ((string)($package['lifecycle_status'] ?? '') !== 'released') {
                throw new EngineeringReleasePackageException('released_engineering_package_required', ['package_id' => $packageId]);
            }

            $serverHash = strtolower((string)($package['manifest_hash_sha256'] ?? ''));
            if ($serverHash === '' || !hash_equals($serverHash, strtolower($expectedHash))) {
                throw new EngineeringReleasePackageException('engineering_package_manifest_hash_mismatch', [
                    'package_id' => $packageId,
                    'expected' => strtolower($expectedHash),
                    'actual' => $serverHash,
                ]);
            }

            $snapshot = $this->db->insertReturning(
                "INSERT INTO order_engineering_package_snapshot
                    (order_scope, order_ref, package_id, package_manifest_hash_sha256, package_manifest_json, bound_by, idempotency_key)
                 VALUES
                    (:order_scope, :order_ref, CAST(:package_id AS uuid), :manifest_hash, CAST(:manifest_json AS jsonb), :bound_by, :idempotency_key)
                 ON CONFLICT (order_scope, order_ref, idempotency_key)
                 DO UPDATE SET order_ref = EXCLUDED.order_ref
                 RETURNING snapshot_id::text, order_scope, order_ref, package_id::text, package_manifest_hash_sha256, bound_at",
                [
                    ':order_scope' => $orderScope,
                    ':order_ref' => $orderRef,
                    ':package_id' => $packageId,
                    ':manifest_hash' => $serverHash,
                    ':manifest_json' => $this->json($package['manifest_json'] ?? []),
                    ':bound_by' => $actorId,
                    ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : hash('sha256', 'bind|' . $orderScope . '|' . $orderRef . '|' . $packageId . '|' . $serverHash),
                ]
            ) ?? [];

            $this->db->execute(
                "UPDATE {$tableName}
                    SET engineering_package_id = CAST(:package_id AS uuid),
                        engineering_package_manifest_hash_sha256 = :manifest_hash,
                        engineering_package_snapshot_id = CAST(:snapshot_id AS uuid)
                  WHERE {$idColumn}::text = :order_ref
                     OR {$numberColumn} = :order_ref",
                [
                    ':package_id' => $packageId,
                    ':manifest_hash' => $serverHash,
                    ':snapshot_id' => (string)$snapshot['snapshot_id'],
                    ':order_ref' => $orderRef,
                ]
            );

            $this->writeAuditAndOutbox(
                $eventType,
                $packageId,
                ['snapshot' => $snapshot],
                $actorId,
                $idempotencyKey
            );

            return $snapshot;
        });
    }

    /**
     * @return array<string,mixed>
     */
    private function loadPackageForUpdate(string $packageId): array
    {
        $row = $this->db->queryOne(
            "SELECT *, package_id::text AS package_id
               FROM engineering_release_package
              WHERE package_id = CAST(:package_id AS uuid)
              FOR UPDATE",
            [':package_id' => $packageId]
        );
        if ($row === null) {
            throw new EngineeringReleasePackageException('engineering_package_not_found', ['package_id' => $packageId]);
        }

        return $this->decodePackageRow($row);
    }

    /**
     * @return array<string,mixed>
     */
    private function loadPackage(string $packageId): array
    {
        $row = $this->db->queryOne(
            "SELECT *, package_id::text AS package_id
               FROM engineering_release_package
              WHERE package_id = CAST(:package_id AS uuid)",
            [':package_id' => $packageId]
        );
        if ($row === null) {
            throw new EngineeringReleasePackageException('engineering_package_not_found', ['package_id' => $packageId]);
        }

        return $this->decodePackageRow($row);
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function loadMembers(string $packageId): array
    {
        return $this->db->query(
            "SELECT member_id::text, package_id::text, member_type, member_ref, member_revision,
                    member_status, source_authority, metadata
               FROM engineering_release_package_member
              WHERE package_id = CAST(:package_id AS uuid)
              ORDER BY member_type, member_ref, member_revision",
            [':package_id' => $packageId]
        );
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function loadApprovals(string $packageId): array
    {
        return $this->db->query(
            "SELECT approval_id::text, package_id::text, approver_id, approval_meaning, approved_at
               FROM engineering_release_package_approval
              WHERE package_id = CAST(:package_id AS uuid)
                AND approval_status = 'approved'
              ORDER BY approved_at, approval_id",
            [':package_id' => $packageId]
        );
    }

    /**
     * @param array<string,mixed> $package
     */
    private function assertPackageEditable(array $package): void
    {
        if (in_array((string)($package['lifecycle_status'] ?? ''), ['released', 'superseded', 'withdrawn'], true)) {
            throw new EngineeringReleasePackageException('released_engineering_package_immutable', [
                'package_id' => (string)($package['package_id'] ?? ''),
                'lifecycle_status' => (string)($package['lifecycle_status'] ?? ''),
            ]);
        }
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function decodePackageRow(array $row): array
    {
        foreach (['required_member_policy', 'manifest_json', 'metadata'] as $field) {
            if (isset($row[$field]) && is_string($row[$field]) && trim($row[$field]) !== '') {
                $decoded = json_decode($row[$field], true);
                if (is_array($decoded)) {
                    $row[$field] = $decoded;
                }
            }
        }

        return $row;
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function writeAuditAndOutbox(
        string $eventType,
        string $packageId,
        array $payload,
        string $actorId,
        string $idempotencyKey = ''
    ): void {
        $payloadJson = $this->json($payload);
        $this->db->execute(
            "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
             VALUES (:event_type, 'engineering_release_package', :aggregate_id, :actor_name, CAST(:payload AS jsonb), '{}'::jsonb, now())",
            [
                ':event_type' => $eventType,
                ':aggregate_id' => $packageId,
                ':actor_name' => $actorId,
                ':payload' => $payloadJson,
            ]
        );

        $this->db->execute(
            "INSERT INTO domain_outbox_events
                (aggregate_type, aggregate_id, event_type, payload, idempotency_key, payload_schema_version)
             VALUES
                ('engineering_release_package', :aggregate_id, :event_type, CAST(:payload AS jsonb), :idempotency_key, 'engineering_release_package.v1')
             ON CONFLICT (aggregate_type, aggregate_id, event_type, idempotency_key) WHERE idempotency_key IS NOT NULL
             DO NOTHING",
            [
                ':aggregate_id' => $packageId,
                ':event_type' => $eventType,
                ':payload' => $payloadJson,
                ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
            ]
        );
    }

    /**
     * @param array<string,mixed> $payload
     */
    private function writePackageEvent(string $packageId, string $eventType, array $payload, string $actorId): void
    {
        $this->db->execute(
            "INSERT INTO engineering_release_package_event (package_id, event_type, payload, actor_id)
             VALUES (CAST(:package_id AS uuid), :event_type, CAST(:payload AS jsonb), :actor_id)",
            [
                ':package_id' => $packageId,
                ':event_type' => $eventType,
                ':payload' => $this->json($payload),
                ':actor_id' => $actorId,
            ]
        );
    }

    /**
     * @param array<string,mixed> $command
     */
    private function rejectCallerManifestHash(array $command): void
    {
        foreach (['manifest_hash', 'manifest_hash_sha256', 'package_manifest_hash_sha256', 'caller_manifest_hash'] as $field) {
            if (array_key_exists($field, $command) && trim((string)$command[$field]) !== '') {
                throw new EngineeringReleasePackageException('caller_manifest_hash_forbidden', [
                    'field' => $field,
                ]);
            }
        }
    }

    /**
     * @param array<string,mixed> $command
     */
    private function actor(array $command): string
    {
        return $this->text($command['actor_id'] ?? $command['user_id'] ?? 'system');
    }

    /**
     * @param array<string,mixed> $input
     */
    private function requiredText(array $input, string $field): string
    {
        $value = $this->text($input[$field] ?? '');
        if ($value === '') {
            throw new EngineeringReleasePackageException('required_field_missing', ['field' => $field]);
        }

        return $value;
    }

    private function text(mixed $value): string
    {
        return trim((string)$value);
    }

    private function nullableSha256(mixed $value): ?string
    {
        $hash = strtolower($this->text($value));
        if ($hash === '') {
            return null;
        }
        if (!preg_match('/^[a-f0-9]{64}$/', $hash)) {
            throw new EngineeringReleasePackageException('sha256_hash_invalid');
        }

        return $hash;
    }

    private function json(mixed $value): string
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : $value;
        }

        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new EngineeringReleasePackageException('json_encode_failed', previous: $e);
        }
    }
}
