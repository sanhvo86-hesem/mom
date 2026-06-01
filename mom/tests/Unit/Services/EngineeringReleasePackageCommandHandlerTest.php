<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\EngineeringReleasePackageCommandHandler;
use MOM\Api\Services\EngineeringReleasePackageException;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class EngineeringReleasePackageCommandHandlerTest extends TestCase
{
    public function testReleaseBlocksWhenInspectionPlanMissingBeforeMutation(): void
    {
        $db = new FakeEngineeringReleaseConnection(
            $this->package(),
            $this->membersExcept('inspection_plan'),
            [$this->approval()]
        );
        $handler = new EngineeringReleasePackageCommandHandler($db);

        try {
            $handler->releaseEngineeringReleasePackage([
                'package_id' => '11111111-1111-1111-1111-111111111111',
                'actor_id' => 'qa-lead',
            ]);
            $this->fail('Expected release invariant failure.');
        } catch (EngineeringReleasePackageException $e) {
            $this->assertSame('engineering_package_release_invariants_failed', $e->reasonCode());
            $this->assertContains('inspection_plan', $e->details()['missing']);
            $this->assertFalse($db->releaseUpdateAttempted);
            $this->assertSame([], $db->executedSql);
        }
    }

    public function testReleaseBlocksWhenControlPlanIsDraft(): void
    {
        $members = $this->baseMembers();
        foreach ($members as &$member) {
            if ($member['member_type'] === 'control_plan') {
                $member['member_status'] = 'draft';
            }
        }
        unset($member);

        $handler = new EngineeringReleasePackageCommandHandler(new FakeEngineeringReleaseConnection(
            $this->package(),
            $members,
            [$this->approval()]
        ));

        try {
            $handler->releaseEngineeringReleasePackage([
                'package_id' => '11111111-1111-1111-1111-111111111111',
                'actor_id' => 'qa-lead',
            ]);
            $this->fail('Expected draft member failure.');
        } catch (EngineeringReleasePackageException $e) {
            $draftTypes = array_column($e->details()['draft'], 'member_type');
            $this->assertContains('control_plan', $draftTypes);
        }
    }

    public function testCncPolicyRequiresNcProgramMember(): void
    {
        $handler = new EngineeringReleasePackageCommandHandler(new FakeEngineeringReleaseConnection(
            $this->package(['required_member_policy' => ['cnc_required' => true]]),
            $this->baseMembers(),
            [$this->approval()]
        ));

        try {
            $handler->releaseEngineeringReleasePackage([
                'package_id' => '11111111-1111-1111-1111-111111111111',
                'actor_id' => 'manufacturing-engineer',
            ]);
            $this->fail('Expected missing NC program failure.');
        } catch (EngineeringReleasePackageException $e) {
            $this->assertContains('nc_program', $e->details()['missing']);
        }
    }

    public function testToolPolicyRequiresToolRequirementMember(): void
    {
        $handler = new EngineeringReleasePackageCommandHandler(new FakeEngineeringReleaseConnection(
            $this->package(['required_member_policy' => ['tool_required' => true]]),
            $this->baseMembers(),
            [$this->approval()]
        ));

        try {
            $handler->releaseEngineeringReleasePackage([
                'package_id' => '11111111-1111-1111-1111-111111111111',
                'actor_id' => 'manufacturing-engineer',
            ]);
            $this->fail('Expected missing tool requirement failure.');
        } catch (EngineeringReleasePackageException $e) {
            $this->assertContains('tool_requirement', $e->details()['missing']);
        }
    }

    public function testReleasedPackageRejectsMemberEdit(): void
    {
        $db = new FakeEngineeringReleaseConnection($this->package(['lifecycle_status' => 'released']));
        $handler = new EngineeringReleasePackageCommandHandler($db);

        try {
            $handler->addPackageMember([
                'package_id' => '11111111-1111-1111-1111-111111111111',
                'member_type' => 'inspection_plan',
                'member_ref' => 'IP-1',
                'member_status' => 'released',
                'source_authority' => 'inspection_plan',
                'actor_id' => 'qa-lead',
            ]);
            $this->fail('Expected immutable released package failure.');
        } catch (EngineeringReleasePackageException $e) {
            $this->assertSame('released_engineering_package_immutable', $e->reasonCode());
            $this->assertFalse($db->memberWriteAttempted);
        }
    }

    public function testCallerProvidedManifestHashIsRejected(): void
    {
        $handler = new EngineeringReleasePackageCommandHandler(new FakeEngineeringReleaseConnection($this->package()));

        $this->expectException(EngineeringReleasePackageException::class);

        $handler->releaseEngineeringReleasePackage([
            'package_id' => '11111111-1111-1111-1111-111111111111',
            'manifest_hash_sha256' => str_repeat('a', 64),
            'actor_id' => 'qa-lead',
        ]);
    }

    public function testBindBlocksManifestHashMismatchBeforeSnapshotWrite(): void
    {
        $db = new FakeEngineeringReleaseConnection($this->package([
            'lifecycle_status' => 'released',
            'manifest_hash_sha256' => str_repeat('a', 64),
            'manifest_json' => ['package_id' => '11111111-1111-1111-1111-111111111111'],
        ]));
        $handler = new EngineeringReleasePackageCommandHandler($db);

        try {
            $handler->bindPackageToWorkOrder([
                'package_id' => '11111111-1111-1111-1111-111111111111',
                'work_order_ref' => 'WO-1001',
                'package_manifest_hash_sha256' => str_repeat('b', 64),
                'actor_id' => 'planner',
            ]);
            $this->fail('Expected manifest mismatch.');
        } catch (EngineeringReleasePackageException $e) {
            $this->assertSame('engineering_package_manifest_hash_mismatch', $e->reasonCode());
            $this->assertFalse($db->snapshotWriteAttempted);
        }
    }

    public function testSuccessfulReleaseBuildsServerManifestAndWritesOutbox(): void
    {
        $db = new FakeEngineeringReleaseConnection(
            $this->package(),
            $this->baseMembers(),
            [$this->approval()]
        );
        $handler = new EngineeringReleasePackageCommandHandler($db);

        $result = $handler->releaseEngineeringReleasePackage([
            'package_id' => '11111111-1111-1111-1111-111111111111',
            'actor_id' => 'qa-lead',
            'idempotency_key' => 'release-pkg-1',
        ]);

        $this->assertSame('released', $result['lifecycle_status']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $result['manifest_hash_sha256']);
        $this->assertSame($result['manifest_hash_sha256'], $result['manifest']['manifest_hash_sha256']);
        $this->assertTrue($db->releaseUpdateAttempted);
        $this->assertNotEmpty($db->executedSql);
    }

    public function testBindJobOrderWritesFrozenPlanningSnapshot(): void
    {
        $db = new FakeEngineeringReleaseConnection($this->package([
            'lifecycle_status' => 'released',
            'manifest_hash_sha256' => str_repeat('c', 64),
            'manifest_json' => ['package_id' => '11111111-1111-1111-1111-111111111111'],
        ]));
        $handler = new EngineeringReleasePackageCommandHandler($db);

        $snapshot = $handler->bindPackageToJobOrder([
            'package_id' => '11111111-1111-1111-1111-111111111111',
            'job_order_ref' => 'JO-1001',
            'package_manifest_hash_sha256' => str_repeat('c', 64),
            'actor_id' => 'planner',
            'idempotency_key' => 'bind-jo-1',
        ]);

        $this->assertSame('job_order', $snapshot['order_scope']);
        $this->assertTrue($db->snapshotWriteAttempted);
        $this->assertStringContainsString('UPDATE job_orders', implode("\n", $db->executedSql));
    }

    /**
     * @param array<string,mixed> $overrides
     * @return array<string,mixed>
     */
    private function package(array $overrides = []): array
    {
        return $overrides + [
            'package_id' => '11111111-1111-1111-1111-111111111111',
            'package_code' => 'ERP-ITEM-REV-A',
            'item_ref' => 'ITEM-1',
            'revision_ref' => 'A',
            'site_ref' => 'SITE-1',
            'lifecycle_status' => 'approved',
            'required_member_policy' => [],
            'manifest_json' => [],
            'manifest_hash_sha256' => null,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function approval(): array
    {
        return [
            'approval_id' => 'approval-1',
            'approver_id' => 'qa-lead',
            'approval_meaning' => 'engineering_release_approved',
            'approved_at' => '2026-05-31T00:00:00+00:00',
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function baseMembers(): array
    {
        return array_map(
            static fn (string $type): array => [
                'member_type' => $type,
                'member_ref' => strtoupper($type) . '-1',
                'member_revision' => 'A',
                'member_status' => 'released',
                'source_authority' => $type,
                'metadata' => [],
            ],
            [
                'item_revision',
                'bom',
                'work_definition',
                'operation',
                'operation_resource',
                'operation_material',
                'operation_output',
                'work_instruction',
                'control_plan',
                'inspection_plan',
            ]
        );
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function membersExcept(string $memberType): array
    {
        return array_values(array_filter(
            $this->baseMembers(),
            static fn (array $member): bool => $member['member_type'] !== $memberType
        ));
    }
}

final class FakeEngineeringReleaseConnection extends Connection
{
    /** @var list<string> */
    public array $executedSql = [];
    public bool $releaseUpdateAttempted = false;
    public bool $memberWriteAttempted = false;
    public bool $snapshotWriteAttempted = false;

    /**
     * @param array<string,mixed> $package
     * @param list<array<string,mixed>> $members
     * @param list<array<string,mixed>> $approvals
     */
    public function __construct(
        private array $package,
        private readonly array $members = [],
        private readonly array $approvals = []
    ) {}

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'FROM engineering_release_package')) {
            $row = $this->package;
            foreach (['required_member_policy', 'manifest_json', 'metadata'] as $field) {
                if (isset($row[$field]) && is_array($row[$field])) {
                    $row[$field] = json_encode($row[$field], JSON_THROW_ON_ERROR);
                }
            }
            return $row;
        }

        return null;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        if (str_contains($sql, 'FROM engineering_release_package_member')) {
            return $this->members;
        }
        if (str_contains($sql, 'FROM engineering_release_package_approval')) {
            return $this->approvals;
        }

        return [];
    }

    public function insertReturning(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'INSERT INTO engineering_release_package_member')) {
            $this->memberWriteAttempted = true;
            return ['member_id' => 'member-1'];
        }

        if (str_contains($sql, "lifecycle_status = 'released'")) {
            $this->releaseUpdateAttempted = true;
            $this->package['lifecycle_status'] = 'released';
            $this->package['manifest_hash_sha256'] = (string)$params[':manifest_hash'];
            $this->package['manifest_json'] = (string)$params[':manifest'];
            return [
                'package_id' => $this->package['package_id'],
                'package_code' => $this->package['package_code'],
                'lifecycle_status' => 'released',
                'manifest_hash_sha256' => (string)$params[':manifest_hash'],
                'released_at' => '2026-05-31T00:00:00+00:00',
            ];
        }

        if (str_contains($sql, 'INSERT INTO work_order_engineering_package_snapshot')) {
            $this->snapshotWriteAttempted = true;
            return ['snapshot_id' => 'snapshot-1'];
        }

        if (str_contains($sql, 'INSERT INTO order_engineering_package_snapshot')) {
            $this->snapshotWriteAttempted = true;
            return [
                'snapshot_id' => 'snapshot-1',
                'order_scope' => (string)$params[':order_scope'],
                'order_ref' => (string)$params[':order_ref'],
                'package_id' => (string)$params[':package_id'],
                'package_manifest_hash_sha256' => (string)$params[':manifest_hash'],
                'bound_at' => '2026-05-31T00:00:00+00:00',
            ];
        }

        return ['package_id' => $this->package['package_id'], 'package_code' => $this->package['package_code'], 'lifecycle_status' => $this->package['lifecycle_status']];
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->executedSql[] = $sql;
        return 1;
    }
}
