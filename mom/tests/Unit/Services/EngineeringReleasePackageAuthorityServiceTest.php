<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\EngineeringReleasePackageAuthorityService;
use PHPUnit\Framework\TestCase;

final class EngineeringReleasePackageAuthorityServiceTest extends TestCase
{
    private const HASH_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    private const HASH_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    public function testMissingInspectionPlanBlocksRelease(): void
    {
        $service = new EngineeringReleasePackageAuthorityService();

        $result = $service->evaluatePackageRelease($this->basePackage(), [
            $this->member('bom_version', 'bom_version', 'bomv-1', self::HASH_A),
            $this->member('work_definition_version', 'work_definition_version', 'wdv-1', self::HASH_A),
            $this->member('control_plan', 'control_plans', 'cp-1', self::HASH_A),
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('inspection_plan_missing', $result['reason_code']);
    }

    public function testNcChecksumMismatchBlocksRelease(): void
    {
        $service = new EngineeringReleasePackageAuthorityService();
        $members = $this->requiredMembers();
        $members[] = $this->member('nc_program', 'mes_nc_release_packages', 'nc-1', self::HASH_A) + [
            'actual_checksum_sha256' => self::HASH_B,
        ];

        $result = $service->evaluatePackageRelease($this->basePackage(), $members);

        $this->assertFalse($result['allowed']);
        $this->assertSame('nc_checksum_mismatch', $result['reason_code']);
    }

    public function testReleasedBomSupersedeRequiresSuccessorPackage(): void
    {
        $service = new EngineeringReleasePackageAuthorityService();

        $result = $service->evaluateReleasedPackageMutation(
            $this->basePackage(['package_status' => 'released', 'package_hash_sha256' => self::HASH_A]),
            $this->basePackage(['package_status' => 'released', 'package_hash_sha256' => self::HASH_A]),
            $this->requiredMembers(),
            [
                $this->member('bom_version', 'bom_version', 'bomv-2', self::HASH_B),
                $this->member('work_definition_version', 'work_definition_version', 'wdv-1', self::HASH_A),
                $this->member('control_plan', 'control_plans', 'cp-1', self::HASH_A),
                $this->member('inspection_plan', 'inspection_plan', 'ip-1', self::HASH_A),
            ],
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('released_package_member_mutation_requires_successor', $result['reason_code']);
    }

    public function testWorkOrderSnapshotStoresPackageHashes(): void
    {
        $service = new EngineeringReleasePackageAuthorityService();

        $snapshot = $service->buildWorkOrderSnapshot(
            'wo-1',
            $this->basePackage(['engineering_release_package_id' => 'pkg-1', 'package_hash_sha256' => self::HASH_A]),
            $this->requiredMembers(),
        );

        $this->assertSame('wo-1', $snapshot['work_order_id']);
        $this->assertSame('pkg-1', $snapshot['engineering_release_package_id']);
        $this->assertSame(self::HASH_A, $snapshot['package_hash_sha256']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $snapshot['member_manifest_hash_sha256']);
        $this->assertCount(4, $snapshot['member_manifest_json']);
    }

    public function testCustomerSpecificPackageRequiresCustomerApproval(): void
    {
        $service = new EngineeringReleasePackageAuthorityService();

        $result = $service->evaluatePackageRelease(
            $this->basePackage(['package_type' => 'customer_specific_release', 'customer_party_id' => 'customer-1']),
            $this->requiredMembers(),
            [],
        );

        $this->assertFalse($result['allowed']);
        $this->assertSame('customer_approval_missing', $result['reason_code']);
    }

    /**
     * @param array<string, mixed> $override
     * @return array<string, mixed>
     */
    private function basePackage(array $override = []): array
    {
        return $override + [
            'package_number' => 'ERP-1',
            'package_revision' => 'A',
            'package_status' => 'validated',
            'package_type' => 'manufacturing_release',
            'item_revision_id' => 'item-rev-1',
            'effective_from' => '2026-05-29T00:00:00Z',
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function requiredMembers(): array
    {
        return [
            $this->member('bom_version', 'bom_version', 'bomv-1', self::HASH_A),
            $this->member('work_definition_version', 'work_definition_version', 'wdv-1', self::HASH_A),
            $this->member('control_plan', 'control_plans', 'cp-1', self::HASH_A),
            $this->member('inspection_plan', 'inspection_plan', 'ip-1', self::HASH_A),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function member(string $type, string $table, string $id, string $hash): array
    {
        return [
            'member_type' => $type,
            'member_record_table' => $table,
            'member_record_id' => $id,
            'member_version_code' => '1',
            'member_hash_sha256' => $hash,
            'member_status' => 'released',
            'required_for_release' => true,
        ];
    }
}
