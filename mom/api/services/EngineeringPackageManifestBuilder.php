<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * Builds a server-side immutable manifest from resolved package rows. Caller
 * hash fields are deliberately ignored and recomputed from canonical content.
 */
final class EngineeringPackageManifestBuilder
{
    /**
     * @param array<string,mixed> $package
     * @param list<array<string,mixed>> $members
     * @param list<array<string,mixed>> $approvals
     * @return array<string,mixed>
     */
    public function build(array $package, array $members, array $approvals = []): array
    {
        $manifest = [
            'schema_version' => 'engineering_release_package_manifest.v1',
            'package_id' => (string)($package['package_id'] ?? ''),
            'package_code' => (string)($package['package_code'] ?? ''),
            'item_ref' => (string)($package['item_ref'] ?? $package['item_id'] ?? ''),
            'revision_ref' => (string)($package['revision_ref'] ?? $package['part_revision'] ?? ''),
            'site_ref' => (string)($package['site_ref'] ?? $package['site_id'] ?? ''),
            'lifecycle_status' => (string)($package['lifecycle_status'] ?? 'draft'),
            'required_member_policy' => $this->sanitize($package['required_member_policy'] ?? []),
            'members' => $this->normalizeMembers($members),
            'approvals' => $this->normalizeApprovals($approvals),
            'built_at' => gmdate(DATE_ATOM),
        ];
        $manifest['manifest_hash_sha256'] = $this->hash($manifest);

        return $manifest;
    }

    /**
     * @param array<string,mixed> $manifest
     */
    public function hash(array $manifest): string
    {
        $copy = $manifest;
        unset($copy['manifest_hash_sha256'], $copy['built_at']);
        $stable = $this->sortRecursive($copy);

        return hash('sha256', json_encode($stable, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    /**
     * @param list<array<string,mixed>> $members
     * @return list<array<string,mixed>>
     */
    private function normalizeMembers(array $members): array
    {
        $normalized = [];
        foreach ($members as $member) {
            $normalized[] = [
                'member_type' => (string)($member['member_type'] ?? ''),
                'member_ref' => (string)($member['member_ref'] ?? ''),
                'member_revision' => (string)($member['member_revision'] ?? ''),
                'member_status' => strtolower(trim((string)($member['member_status'] ?? $member['lifecycle_status'] ?? ''))),
                'source_authority' => (string)($member['source_authority'] ?? ''),
                'metadata' => $this->sanitize($member['metadata'] ?? []),
            ];
        }

        usort($normalized, static function (array $a, array $b): int {
            return strcmp(
                (string)$a['member_type'] . '|' . (string)$a['member_ref'] . '|' . (string)$a['member_revision'],
                (string)$b['member_type'] . '|' . (string)$b['member_ref'] . '|' . (string)$b['member_revision']
            );
        });

        return $normalized;
    }

    /**
     * @param list<array<string,mixed>> $approvals
     * @return list<array<string,mixed>>
     */
    private function normalizeApprovals(array $approvals): array
    {
        $normalized = [];
        foreach ($approvals as $approval) {
            $normalized[] = [
                'approval_id' => (string)($approval['approval_id'] ?? ''),
                'approver_id' => (string)($approval['approver_id'] ?? ''),
                'approval_meaning' => (string)($approval['approval_meaning'] ?? 'engineering_release_approved'),
                'approved_at' => (string)($approval['approved_at'] ?? ''),
            ];
        }

        usort($normalized, static fn (array $a, array $b): int => strcmp((string)$a['approval_id'], (string)$b['approval_id']));

        return $normalized;
    }

    private function sanitize(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        unset(
            $value['manifest_hash'],
            $value['manifest_hash_sha256'],
            $value['caller_manifest_hash'],
            $value['package_manifest_hash']
        );

        return $this->sortRecursive($value);
    }

    private function sortRecursive(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }
        if (array_is_list($value)) {
            return array_map(fn (mixed $item): mixed => $this->sortRecursive($item), $value);
        }
        ksort($value);
        foreach ($value as $key => $item) {
            $value[$key] = $this->sortRecursive($item);
        }
        return $value;
    }
}
