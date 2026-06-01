<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * Defines the minimum engineering artifacts required before a package can be
 * released for execution. Conditional requirements must be set by authoritative
 * package policy, not by caller-provided "ready" flags.
 */
final class RequiredMemberMatrix
{
    public const REQUIRED_BASE_TYPES = [
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
    ];

    public const CONDITIONAL_POLICY_FLAGS = [
        'nc_program' => 'cnc_required',
        'tool_requirement' => 'tool_required',
        'fixture_requirement' => 'fixture_required',
        'gage_requirement' => 'gage_required',
        'customer_approval' => 'customer_approval_required',
        'supplier_approval' => 'supplier_approval_required',
        'pfmea' => 'risk_pfmea_required',
    ];

    /**
     * @param array<string,mixed> $package
     * @return list<string>
     */
    public function requiredMemberTypes(array $package): array
    {
        $required = self::REQUIRED_BASE_TYPES;
        $policy = $this->policy($package);
        foreach (self::CONDITIONAL_POLICY_FLAGS as $memberType => $flag) {
            if ($this->truthy($policy[$flag] ?? $package[$flag] ?? false)) {
                $required[] = $memberType;
            }
        }

        return array_values(array_unique($required));
    }

    /**
     * @param array<string,mixed> $package
     * @param list<array<string,mixed>> $members
     * @return array{missing:list<string>,draft:list<array<string,string>>,present:list<string>}
     */
    public function evaluate(array $package, array $members): array
    {
        $required = $this->requiredMemberTypes($package);
        $present = [];
        $draft = [];

        foreach ($members as $member) {
            $type = (string)($member['member_type'] ?? '');
            if ($type === '') {
                continue;
            }
            $present[] = $type;
            $state = strtolower(trim((string)($member['member_status'] ?? $member['lifecycle_status'] ?? '')));
            if (!in_array($state, ['released', 'approved', 'active', 'effective'], true)) {
                $draft[] = [
                    'member_type' => $type,
                    'member_ref' => (string)($member['member_ref'] ?? ''),
                    'member_status' => $state,
                ];
            }
        }

        return [
            'missing' => array_values(array_diff($required, array_unique($present))),
            'draft' => $draft,
            'present' => array_values(array_unique($present)),
        ];
    }

    /**
     * @param array<string,mixed> $package
     * @return array<string,mixed>
     */
    private function policy(array $package): array
    {
        $policy = $package['required_member_policy'] ?? $package['policy'] ?? [];
        return is_array($policy) ? $policy : [];
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'required'], true);
    }
}
