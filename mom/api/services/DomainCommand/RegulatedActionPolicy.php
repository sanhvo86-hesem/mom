<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use Throwable;

final class RegulatedActionPolicy
{
    /**
     * @var array<string,array<string,mixed>>
     */
    private const POLICIES = [
        'ReleaseItemRevisionCommand' => [
            'root' => 'item_revision',
            'risk_class' => 'high',
            'signature_required' => true,
            'allowed_signature_meanings' => ['item_revision_release'],
        ],
        'CreateEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'risk_class' => 'medium',
            'signature_required' => false,
            'allowed_signature_meanings' => [],
        ],
        'AddPackageMemberCommand' => [
            'root' => 'engineering_release_package',
            'risk_class' => 'medium',
            'signature_required' => false,
            'allowed_signature_meanings' => [],
        ],
        'SubmitEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'risk_class' => 'high',
            'signature_required' => true,
            'allowed_signature_meanings' => ['engineering_package_submit'],
        ],
        'ApproveEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['engineering_package_approval'],
        ],
        'ReleaseEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['engineering_package_release'],
        ],
        'SupersedeEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['engineering_package_supersede'],
        ],
        'WithdrawEngineeringReleasePackageCommand' => [
            'root' => 'engineering_release_package',
            'risk_class' => 'high',
            'signature_required' => true,
            'allowed_signature_meanings' => ['engineering_package_withdraw'],
        ],
        'BindEngineeringPackageToWorkOrderCommand' => [
            'root' => 'work_order',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['work_order_engineering_package_bind'],
        ],
        'BindEngineeringPackageToJobOrderCommand' => [
            'root' => 'job_order',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['job_order_engineering_package_bind'],
        ],
        'BindEngineeringPackageToSalesOrderCommand' => [
            'root' => 'sales_order',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['sales_order_engineering_package_bind'],
        ],
        'ReleaseWorkOrderCommand' => [
            'root' => 'work_order',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['work_order_release'],
        ],
        'StartJobCommand' => [
            'root' => 'work_order',
            'risk_class' => 'high',
            'signature_required' => false,
            'allowed_signature_meanings' => [],
        ],
        'IssueMaterialToWorkOrderCommand' => [
            'root' => 'inventory_issue',
            'risk_class' => 'high',
            'signature_required' => false,
            'allowed_signature_meanings' => [],
        ],
        'LoadToolCommand' => [
            'root' => 'tooling',
            'risk_class' => 'high',
            'signature_required' => false,
            'allowed_signature_meanings' => [],
        ],
        'RecordInspectionResultCommand' => [
            'root' => 'inspection_result',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['inspection_result_record'],
        ],
        'CompleteOperationCommand' => [
            'root' => 'operation_execution',
            'risk_class' => 'high',
            'signature_required' => false,
            'allowed_signature_meanings' => [],
        ],
        'ApplyQualityHoldCommand' => [
            'root' => 'quality_hold',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['quality_hold_apply'],
        ],
        'ReleaseQualityHoldCommand' => [
            'root' => 'quality_hold',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['quality_hold_release'],
        ],
        'PostInventoryLedgerTransactionCommand' => [
            'root' => 'inventory_ledger',
            'risk_class' => 'critical',
            'signature_required' => true,
            'allowed_signature_meanings' => ['inventory_ledger_post'],
        ],
    ];

    /**
     * @param array<string,mixed> $entry
     * @return array<string,mixed>
     */
    public function requireForEntry(array $entry): array
    {
        $commandName = trim((string)($entry['command_name'] ?? ''));
        if (($entry['regulated_action'] ?? false) !== true) {
            return ['regulated' => false, 'command_name' => $commandName];
        }

        $policy = self::POLICIES[$commandName] ?? null;
        if (!is_array($policy)) {
            throw new DomainCommandException('regulated_action_policy_missing', 'Regulated command has no server-side regulated action policy.', 409, [
                'command_name' => $commandName,
            ]);
        }

        $policy = [
            'regulated' => true,
            'command_name' => $commandName,
            'root' => (string)($entry['root'] ?? $policy['root']),
            'site_applicability' => '*',
            'org_applicability' => '*',
            'sod_required' => true,
            'reauth_required' => true,
            'evidence_required' => true,
            'retention_days' => 3650,
            'validation_status' => 'pre_production_candidate',
        ] + $policy;
        $policy['policy_hash_sha256'] = $this->policyHash($policy);

        return $policy;
    }

    /**
     * @param array<string,mixed> $policy
     */
    public function assertMeaningAllowed(array $policy, string $meaning): void
    {
        $allowed = is_array($policy['allowed_signature_meanings'] ?? null) ? (array)$policy['allowed_signature_meanings'] : [];
        if (($policy['signature_required'] ?? false) !== true) {
            return;
        }
        if ($meaning === '' || !in_array($meaning, $allowed, true)) {
            throw new DomainCommandException('signature_meaning_not_allowed', 'Signature meaning is missing or not allowed for this regulated command.', 409, [
                'command_name' => (string)($policy['command_name'] ?? ''),
                'allowed_signature_meanings' => $allowed,
            ]);
        }
    }

    /**
     * @return array<string,array<string,mixed>>
     */
    public function all(): array
    {
        $out = [];
        foreach (self::POLICIES as $command => $policy) {
            $entry = ['command_name' => $command, 'root' => $policy['root'], 'regulated_action' => true];
            $out[$command] = $this->requireForEntry($entry);
        }

        return $out;
    }

    /**
     * @param array<string,mixed> $policy
     */
    public function policyHash(array $policy): string
    {
        unset($policy['policy_hash_sha256']);
        ksort($policy);

        try {
            return hash('sha256', json_encode($policy, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        } catch (Throwable $e) {
            throw new DomainCommandException('regulated_policy_hash_failed', 'Regulated action policy cannot be encoded.', 500, [], $e);
        }
    }
}
