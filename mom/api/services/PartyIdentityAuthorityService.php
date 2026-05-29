<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Runtime guard helpers for P28 party/user/operator authority.
 *
 * The service is intentionally read/evaluate only in this slice. User identity
 * mutation remains owned by AuthUserShadowSyncService and v_user_canonical.
 */
final class PartyIdentityAuthorityService
{
    /**
     * @return array<string, mixed>
     */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'party_identity_authority',
            'readiness_state' => 'service_authority_partial',
            'identity_read_source' => 'v_user_canonical',
            'user_mutation_authority' => 'AuthUserShadowSyncService',
            'party_user_bridge_authority' => 'user_party_link',
            'party_profile_authority' => 'party_profile_extension',
            'customer_item_approval_authority' => 'customer_item_approval_authority',
            'supplier_process_approval_authority' => 'supplier_process_approval_authority',
            'duplicate_merge_remap_authority' => 'party_merge_remap_catalog',
            'direct_user_table_write_allowed' => false,
            'generic_crud_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $canonicalUser
     * @param list<array<string, mixed>> $qualifications
     * @param list<array<string, mixed>> $requirements
     * @return array<string, mixed>
     */
    public function evaluateOperatorReadiness(
        array $canonicalUser,
        array $qualifications,
        array $requirements,
        ?\DateTimeImmutable $at = null,
    ): array {
        $at ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $identity = $this->evaluateCanonicalUserStatus($canonicalUser);
        if ($identity['allowed'] !== true) {
            return $identity + [
                'gate' => 'operator_identity',
                'checked_at' => $at->format('c'),
            ];
        }

        $employeeId = trim((string)($canonicalUser['employee_id'] ?? ''));
        if ($employeeId === '') {
            return $this->blocked('employee_id_missing', 'Canonical user row has no employee_id.', [
                'gate' => 'operator_identity',
                'checked_at' => $at->format('c'),
            ]);
        }

        $failures = [];
        foreach ($requirements as $requirement) {
            if (!is_array($requirement)) {
                continue;
            }
            $match = $this->findQualification($employeeId, $qualifications, $requirement, $at);
            if (($match['allowed'] ?? false) !== true) {
                $failures[] = $match;
            }
        }

        if ($failures !== []) {
            return $this->blocked((string)($failures[0]['reason_code'] ?? 'operator_not_qualified'), 'Operator qualification gate failed.', [
                'gate' => 'operator_qualification',
                'employee_id' => $employeeId,
                'failures' => $failures,
                'checked_at' => $at->format('c'),
            ]);
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'operator_ready',
            'message' => 'Operator identity and qualification gates passed.',
            'employee_id' => $employeeId,
            'requirement_count' => count($requirements),
            'checked_at' => $at->format('c'),
        ];
    }

    /**
     * @param array<string, mixed> $link
     * @return array<string, mixed>
     */
    public function evaluateUserPartyLink(array $link, ?\DateTimeImmutable $at = null): array
    {
        $at ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $status = strtolower(trim((string)($link['link_status'] ?? '')));
        if ($status !== 'active') {
            return $this->blocked('user_party_link_not_active', 'User-party link is not active.', [
                'link_status' => $status,
                'checked_at' => $at->format('c'),
            ]);
        }

        return $this->evaluateEffectivity($link, 'user_party_link', $at);
    }

    /**
     * @param array<string, mixed> $approval
     * @return array<string, mixed>
     */
    public function evaluateSupplierProcessApproval(array $approval, ?\DateTimeImmutable $at = null): array
    {
        $at ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $status = strtolower(trim((string)($approval['approval_status'] ?? '')));
        if (!in_array($status, ['approved', 'conditional'], true)) {
            return $this->blocked('supplier_process_not_approved', 'Supplier process approval is not approved or conditional.', [
                'approval_status' => $status,
                'checked_at' => $at->format('c'),
            ]);
        }

        $effectivity = $this->evaluateEffectivity($approval, 'supplier_process_approval', $at);
        if ($effectivity['allowed'] !== true) {
            return $effectivity;
        }

        $expires = trim((string)($approval['certificate_expires_on'] ?? ''));
        if ($expires !== '') {
            $expiry = \DateTimeImmutable::createFromFormat('!Y-m-d', $expires, new \DateTimeZone('UTC'));
            if ($expiry instanceof \DateTimeImmutable && $expiry < $at->setTime(0, 0)) {
                return $this->blocked('supplier_certificate_expired', 'Supplier process certificate is expired.', [
                    'certificate_expires_on' => $expires,
                    'checked_at' => $at->format('c'),
                ]);
            }
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'supplier_process_approved',
            'message' => 'Supplier process approval gate passed.',
            'checked_at' => $at->format('c'),
        ];
    }

    /**
     * @param array<string, mixed> $approval
     * @return array<string, mixed>
     */
    public function evaluateCustomerItemApproval(array $approval, ?\DateTimeImmutable $at = null): array
    {
        $at ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $status = strtolower(trim((string)($approval['approval_status'] ?? '')));
        if (!in_array($status, ['approved', 'conditional'], true)) {
            return $this->blocked('customer_item_not_approved', 'Customer item approval is not approved or conditional.', [
                'approval_status' => $status,
                'checked_at' => $at->format('c'),
            ]);
        }

        $effectivity = $this->evaluateEffectivity($approval, 'customer_item_approval', $at);
        if ($effectivity['allowed'] !== true) {
            return $effectivity;
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'customer_item_approved',
            'message' => 'Customer item approval gate passed.',
            'checked_at' => $at->format('c'),
        ];
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function evaluateRegulatedSod(array $context, ?\DateTimeImmutable $at = null): array
    {
        $at ??= new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $createdBy = trim((string)($context['created_by_party_id'] ?? ''));
        $approvedBy = trim((string)($context['approved_by_party_id'] ?? ''));
        if ($createdBy === '' || $approvedBy === '' || $createdBy !== $approvedBy) {
            return [
                'allowed' => true,
                'status' => 'passed',
                'reason_code' => 'sod_passed',
                'message' => 'Creator and approver are separated or not both present.',
                'checked_at' => $at->format('c'),
            ];
        }

        $exception = is_array($context['sod_exception'] ?? null) ? $context['sod_exception'] : [];
        if ($this->isValidSodException($exception, $createdBy, $at)) {
            return [
                'allowed' => true,
                'status' => 'passed_with_exception',
                'reason_code' => 'sod_exception_valid',
                'message' => 'SoD self-approval was allowed by a bounded exception.',
                'exception_id' => $exception['exception_id'] ?? null,
                'checked_at' => $at->format('c'),
            ];
        }

        return $this->blocked('sod_self_approval', 'Same party cannot create and approve a regulated release without a valid SoD exception.', [
            'created_by_party_id' => $createdBy,
            'approved_by_party_id' => $approvedBy,
            'checked_at' => $at->format('c'),
        ]);
    }

    /**
     * @param array<string, mixed> $mergeRequest
     * @param list<array<string, mixed>> $references
     * @return array<string, mixed>
     */
    public function planPartyMergeRemap(array $mergeRequest, array $references): array
    {
        $losingPartyId = trim((string)($mergeRequest['losing_party_id'] ?? ''));
        $survivingPartyId = trim((string)($mergeRequest['surviving_party_id'] ?? ''));
        if ($losingPartyId === '' || $survivingPartyId === '' || $losingPartyId === $survivingPartyId) {
            return $this->blocked('invalid_party_merge_pair', 'Party merge requires distinct losing and surviving party IDs.');
        }

        $catalog = [];
        $blocked = [];
        foreach ($references as $reference) {
            if (!is_array($reference)) {
                continue;
            }
            $table = trim((string)($reference['reference_table_name'] ?? $reference['table'] ?? ''));
            $pk = $reference['reference_pk_json'] ?? $reference['pk'] ?? null;
            $policy = strtolower(trim((string)($reference['remap_policy'] ?? 'requires_command')));
            if ($table === '' || $pk === null || $policy === 'unknown') {
                $blocked[] = [
                    'reason_code' => 'unmapped_reference',
                    'reference' => $reference,
                ];
                continue;
            }
            $catalog[] = [
                'losing_party_id' => $losingPartyId,
                'surviving_party_id' => $survivingPartyId,
                'reference_table_name' => $table,
                'reference_pk_json' => $pk,
                'remap_action' => $policy === 'read_only_evidence' ? 'skip' : 'apply',
                'remap_status' => 'planned',
            ];
        }

        if ($blocked !== []) {
            return $this->blocked('party_merge_unmapped_reference', 'Party merge has references without an explicit remap policy.', [
                'blocked_references' => $blocked,
                'planned_count' => count($catalog),
            ]);
        }

        return [
            'allowed' => true,
            'status' => 'planned',
            'reason_code' => 'party_merge_remap_planned',
            'message' => 'Party merge remap catalog is fully enumerated.',
            'planned_count' => count($catalog),
            'catalog_entries' => $catalog,
        ];
    }

    /**
     * @param array<string, mixed> $canonicalUser
     * @return array<string, mixed>
     */
    private function evaluateCanonicalUserStatus(array $canonicalUser): array
    {
        $userStatus = strtolower(trim((string)($canonicalUser['user_status'] ?? $canonicalUser['status'] ?? 'active')));
        if (in_array($userStatus, ['inactive', 'disabled', 'locked', 'suspended', 'terminated'], true)) {
            return $this->blocked('user_identity_inactive', 'User identity is not active.', [
                'user_status' => $userStatus,
            ]);
        }

        $employmentStatus = strtolower(trim((string)($canonicalUser['employment_status'] ?? 'active')));
        if (in_array($employmentStatus, ['inactive', 'terminated', 'separated', 'resigned', 'retired'], true)) {
            return $this->blocked('employment_not_active', 'Employment status is not active.', [
                'employment_status' => $employmentStatus,
            ]);
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => 'identity_active',
            'message' => 'Canonical user identity is active.',
        ];
    }

    /**
     * @param list<array<string, mixed>> $qualifications
     * @param array<string, mixed> $requirement
     * @return array<string, mixed>
     */
    private function findQualification(
        string $employeeId,
        array $qualifications,
        array $requirement,
        \DateTimeImmutable $at,
    ): array {
        $requiredType = trim((string)($requirement['qualification_type'] ?? 'skill'));
        $requiredCode = trim((string)($requirement['qualification_code'] ?? $requirement['skill_code'] ?? ''));
        foreach ($qualifications as $qualification) {
            if (!is_array($qualification)) {
                continue;
            }
            if ((string)($qualification['employee_id'] ?? '') !== $employeeId) {
                continue;
            }
            if (trim((string)($qualification['qualification_type'] ?? 'skill')) !== $requiredType) {
                continue;
            }
            $actualCode = trim((string)($qualification['qualification_code'] ?? $qualification['skill_code'] ?? $qualification['certification_code'] ?? ''));
            if ($actualCode !== $requiredCode) {
                continue;
            }
            if ((bool)($qualification['is_active'] ?? true) !== true) {
                return $this->blocked('qualification_inactive', 'Qualification is inactive.', ['qualification' => $qualification]);
            }
            $level = strtolower(trim((string)($qualification['qualification_level'] ?? $qualification['status'] ?? 'qualified')));
            if (in_array($level, ['expired', 'suspended', 'revoked', 'inactive'], true)) {
                return $this->blocked('qualification_not_valid', 'Qualification status is not valid.', ['qualification' => $qualification]);
            }
            $expiry = trim((string)($qualification['expiry_date'] ?? $qualification['expires_at'] ?? ''));
            if ($expiry !== '') {
                $expiryDate = \DateTimeImmutable::createFromFormat('!Y-m-d', substr($expiry, 0, 10), new \DateTimeZone('UTC'));
                if ($expiryDate instanceof \DateTimeImmutable && $expiryDate < $at->setTime(0, 0)) {
                    return $this->blocked('qualification_expired', 'Qualification has expired.', ['qualification' => $qualification]);
                }
            }
            return [
                'allowed' => true,
                'status' => 'passed',
                'reason_code' => 'qualification_matched',
                'qualification' => $qualification,
            ];
        }

        return $this->blocked('qualification_missing', 'Required qualification is missing.', [
            'requirement' => $requirement,
        ]);
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function evaluateEffectivity(array $record, string $gate, \DateTimeImmutable $at): array
    {
        $fromRaw = trim((string)($record['effective_from'] ?? ''));
        $toRaw = trim((string)($record['effective_to'] ?? ''));
        if ($fromRaw !== '') {
            try {
                $from = new \DateTimeImmutable($fromRaw);
            } catch (\Throwable) {
                return $this->blocked($gate . '_invalid_effective_from', 'Record effective_from is not parseable.', [
                    'effective_from' => $fromRaw,
                    'checked_at' => $at->format('c'),
                ]);
            }
            if ($from > $at) {
                return $this->blocked($gate . '_not_yet_effective', 'Record is not yet effective.', [
                    'effective_from' => $from->format('c'),
                    'checked_at' => $at->format('c'),
                ]);
            }
        }
        if ($toRaw !== '') {
            try {
                $to = new \DateTimeImmutable($toRaw);
            } catch (\Throwable) {
                return $this->blocked($gate . '_invalid_effective_to', 'Record effective_to is not parseable.', [
                    'effective_to' => $toRaw,
                    'checked_at' => $at->format('c'),
                ]);
            }
            if ($to <= $at) {
                return $this->blocked($gate . '_expired', 'Record effectivity has expired.', [
                    'effective_to' => $to->format('c'),
                    'checked_at' => $at->format('c'),
                ]);
            }
        }

        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => $gate . '_effective',
            'message' => 'Record is active and effective.',
            'checked_at' => $at->format('c'),
        ];
    }

    /**
     * @param array<string, mixed> $exception
     */
    private function isValidSodException(array $exception, string $actorPartyId, \DateTimeImmutable $at): bool
    {
        $status = strtolower(trim((string)($exception['status'] ?? '')));
        if ($status !== 'approved') {
            return false;
        }
        $approvedBy = trim((string)($exception['approved_by_party_id'] ?? ''));
        if ($approvedBy === '' || $approvedBy === $actorPartyId) {
            return false;
        }
        $expiresAt = trim((string)($exception['expires_at'] ?? ''));
        if ($expiresAt === '') {
            return false;
        }

        try {
            return new \DateTimeImmutable($expiresAt) > $at;
        } catch (\Throwable) {
            return false;
        }
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

if (!class_exists('MOM\\Api\\Services\\PartyIdentityAuthorityService', false)) {
    class_alias(PartyIdentityAuthorityService::class, 'MOM\\Api\\Services\\PartyIdentityAuthorityService');
}
