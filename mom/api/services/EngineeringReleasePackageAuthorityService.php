<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Runtime guard helpers for EngineeringReleasePackage authority.
 *
 * P30 physicalizes the package/member/binding proof. P31/P32 still own final
 * command envelopes, idempotency, outbox, problem details, and regulated e-sign.
 */
final class EngineeringReleasePackageAuthorityService
{
    /** @var list<string> */
    private const REQUIRED_RELEASE_MEMBERS = [
        'bom_version',
        'work_definition_version',
        'control_plan',
        'inspection_plan',
    ];

    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'engineering_release_package_authority',
            'readiness_state' => 'service_authority_partial',
            'package_authority' => 'engineering_release_package',
            'member_authority' => 'engineering_release_package_member',
            'approval_hook_authority' => 'engineering_release_package_approval',
            'release_binding_authority' => 'engineering_release_package_binding',
            'wo_snapshot_authority' => 'work_order_engineering_package_snapshot',
            'generic_crud_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $package
     * @param list<array<string, mixed>> $members
     * @param list<array<string, mixed>> $approvals
     * @return array<string, mixed>
     */
    public function evaluatePackageRelease(array $package, array $members, array $approvals = []): array
    {
        $state = strtolower(trim((string)($package['package_status'] ?? $package['status'] ?? 'draft')));
        if (!in_array($state, ['draft', 'validated', 'approved'], true)) {
            return $this->blocked('engineering_package_state_not_releasable', 'Engineering package is not in a releasable state.', [
                'package_status' => $state,
            ]);
        }

        if (trim((string)($package['item_revision_id'] ?? '')) === '') {
            return $this->blocked('engineering_package_item_revision_missing', 'Engineering package release requires an item revision.');
        }

        $byType = $this->indexMembersByType($members);
        foreach (self::REQUIRED_RELEASE_MEMBERS as $requiredType) {
            if (!isset($byType[$requiredType])) {
                return $this->blocked($requiredType . '_missing', 'Engineering package release requires a ' . $requiredType . ' member.');
            }
        }

        foreach ($members as $member) {
            if (!is_array($member)) {
                continue;
            }
            $memberType = strtolower(trim((string)($member['member_type'] ?? '')));
            $memberStatus = strtolower(trim((string)($member['member_status'] ?? $member['status'] ?? 'active')));
            if ((bool)($member['required_for_release'] ?? true) && !in_array($memberStatus, ['active', 'approved', 'released'], true)) {
                return $this->blocked('release_member_not_approved', 'Required package member is not active/approved/released.', [
                    'member_type' => $memberType,
                    'member_status' => $memberStatus,
                ]);
            }

            $hash = strtolower(trim((string)($member['member_hash_sha256'] ?? $member['checksum_sha256'] ?? '')));
            if ((bool)($member['required_for_release'] ?? true) && !$this->isSha256($hash)) {
                return $this->blocked('release_member_hash_invalid', 'Required package member must carry a SHA-256 hash.', [
                    'member_type' => $memberType,
                ]);
            }

            if (in_array($memberType, ['nc_program', 'nc_release_package'], true)) {
                $checksumResult = $this->evaluateNcChecksum($member);
                if ($checksumResult['allowed'] === false) {
                    return $checksumResult;
                }
            }
        }

        if ($this->isCustomerSpecific($package) && !$this->hasApprovedCustomerEvidence($members, $approvals)) {
            return $this->blocked('customer_approval_missing', 'Customer-specific engineering release requires approved customer evidence.');
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'engineering_package_release_ready',
            'package_hash_sha256' => $this->packageHash($package, $members),
            'member_manifest_hash_sha256' => $this->memberManifestHash($members),
        ];
    }

    /**
     * @param array<string, mixed> $member
     * @return array<string, mixed>
     */
    public function evaluateNcChecksum(array $member): array
    {
        $expected = strtolower(trim((string)($member['expected_checksum_sha256'] ?? $member['member_hash_sha256'] ?? $member['checksum_sha256'] ?? '')));
        $actual = strtolower(trim((string)($member['actual_checksum_sha256'] ?? $member['controller_checksum'] ?? '')));
        if ($expected !== '' && !$this->isSha256($expected)) {
            return $this->blocked('nc_expected_checksum_invalid', 'NC expected checksum must be SHA-256.');
        }
        if ($actual !== '' && !$this->isSha256($actual)) {
            return $this->blocked('nc_actual_checksum_invalid', 'NC actual/controller checksum must be SHA-256.');
        }
        if ($expected !== '' && $actual !== '' && !hash_equals($expected, $actual)) {
            return $this->blocked('nc_checksum_mismatch', 'NC program checksum mismatch blocks engineering release.', [
                'expected_checksum_sha256' => $expected,
                'actual_checksum_sha256' => $actual,
            ]);
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'nc_checksum_matched_or_not_applicable',
        ];
    }

    /**
     * @param array<string, mixed> $beforePackage
     * @param array<string, mixed> $afterPackage
     * @param list<array<string, mixed>> $beforeMembers
     * @param list<array<string, mixed>> $afterMembers
     * @return array<string, mixed>
     */
    public function evaluateReleasedPackageMutation(array $beforePackage, array $afterPackage, array $beforeMembers, array $afterMembers): array
    {
        $state = strtolower(trim((string)($beforePackage['package_status'] ?? $beforePackage['status'] ?? '')));
        if ($state !== 'released') {
            return [
                'allowed' => true,
                'status' => 'passed',
                'reason_code' => 'package_not_released',
            ];
        }

        foreach (['item_revision_id', 'package_hash_sha256', 'member_manifest_hash_sha256', 'effective_from'] as $field) {
            if (($beforePackage[$field] ?? null) !== ($afterPackage[$field] ?? null)) {
                return $this->blocked('released_package_mutation_requires_successor', 'Released engineering package is immutable; create a successor package instead.', [
                    'field' => $field,
                    'before' => $beforePackage[$field] ?? null,
                    'after' => $afterPackage[$field] ?? null,
                ]);
            }
        }

        if ($this->memberManifestHash($beforeMembers) !== $this->memberManifestHash($afterMembers)) {
            return $this->blocked('released_package_member_mutation_requires_successor', 'Released package member changes require a new package, not mutation.');
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'released_package_no_immutable_delta',
        ];
    }

    /**
     * @param array<string, mixed> $package
     * @param list<array<string, mixed>> $members
     * @return array<string, mixed>
     */
    public function buildWorkOrderSnapshot(string $workOrderId, array $package, array $members): array
    {
        $packageHash = strtolower(trim((string)($package['package_hash_sha256'] ?? '')));
        if (!$this->isSha256($packageHash)) {
            $packageHash = $this->packageHash($package, $members);
        }

        return [
            'work_order_id' => $workOrderId,
            'engineering_release_package_id' => (string)($package['engineering_release_package_id'] ?? $package['package_id'] ?? ''),
            'package_hash_sha256' => $packageHash,
            'member_manifest_hash_sha256' => $this->memberManifestHash($members),
            'member_manifest_json' => $this->normalizedMemberManifest($members),
            'freeze_reason' => 'work_order_release',
        ];
    }

    /**
     * @param list<array<string, mixed>> $members
     */
    public function memberManifestHash(array $members): string
    {
        return hash('sha256', json_encode($this->normalizedMemberManifest($members), JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /**
     * @param array<string, mixed> $package
     * @param list<array<string, mixed>> $members
     */
    private function packageHash(array $package, array $members): string
    {
        $payload = [
            'package_number' => (string)($package['package_number'] ?? $package['package_id'] ?? ''),
            'package_revision' => (string)($package['package_revision'] ?? ''),
            'item_revision_id' => (string)($package['item_revision_id'] ?? ''),
            'effective_from' => (string)($package['effective_from'] ?? ''),
            'member_manifest_hash_sha256' => $this->memberManifestHash($members),
        ];

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /**
     * @param list<array<string, mixed>> $members
     * @return list<array<string, string>>
     */
    private function normalizedMemberManifest(array $members): array
    {
        $manifest = [];
        foreach ($members as $member) {
            if (!is_array($member)) {
                continue;
            }
            $manifest[] = [
                'member_type' => strtolower(trim((string)($member['member_type'] ?? ''))),
                'member_record_table' => strtolower(trim((string)($member['member_record_table'] ?? ''))),
                'member_record_id' => trim((string)($member['member_record_id'] ?? '')),
                'member_version_code' => trim((string)($member['member_version_code'] ?? '')),
                'member_hash_sha256' => strtolower(trim((string)($member['member_hash_sha256'] ?? $member['checksum_sha256'] ?? ''))),
            ];
        }

        usort($manifest, static fn (array $a, array $b): int => ($a['member_type'] . $a['member_record_table'] . $a['member_record_id']) <=> ($b['member_type'] . $b['member_record_table'] . $b['member_record_id']));

        return $manifest;
    }

    /**
     * @param list<array<string, mixed>> $members
     * @return array<string, array<string, mixed>>
     */
    private function indexMembersByType(array $members): array
    {
        $indexed = [];
        foreach ($members as $member) {
            if (!is_array($member)) {
                continue;
            }
            $type = strtolower(trim((string)($member['member_type'] ?? '')));
            if ($type !== '' && !isset($indexed[$type])) {
                $indexed[$type] = $member;
            }
        }

        return $indexed;
    }

    /**
     * @param array<string, mixed> $package
     */
    private function isCustomerSpecific(array $package): bool
    {
        if (strtolower(trim((string)($package['package_type'] ?? ''))) === 'customer_specific_release') {
            return true;
        }

        return trim((string)($package['customer_party_id'] ?? $package['customer_id'] ?? '')) !== '';
    }

    /**
     * @param list<array<string, mixed>> $members
     * @param list<array<string, mixed>> $approvals
     */
    private function hasApprovedCustomerEvidence(array $members, array $approvals): bool
    {
        foreach ($members as $member) {
            if (!is_array($member)) {
                continue;
            }
            $type = strtolower(trim((string)($member['member_type'] ?? '')));
            $status = strtolower(trim((string)($member['member_status'] ?? $member['approval_status'] ?? '')));
            if ($type === 'customer_approval' && in_array($status, ['active', 'approved', 'conditional', 'released'], true)) {
                return true;
            }
        }
        foreach ($approvals as $approval) {
            if (!is_array($approval)) {
                continue;
            }
            $type = strtolower(trim((string)($approval['approval_type'] ?? '')));
            $status = strtolower(trim((string)($approval['approval_status'] ?? '')));
            if ($type === 'customer' && in_array($status, ['approved', 'conditional'], true)) {
                return true;
            }
        }

        return false;
    }

    private function isSha256(string $hash): bool
    {
        return preg_match('/^[a-f0-9]{64}$/', strtolower($hash)) === 1;
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

if (!class_exists('MOM\\Api\\Services\\EngineeringReleasePackageAuthorityService', false)) {
    class_alias(EngineeringReleasePackageAuthorityService::class, 'MOM\\Api\\Services\\EngineeringReleasePackageAuthorityService');
}
