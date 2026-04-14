<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use RuntimeException;

/**
 * Builds deterministic release governance payloads without writing artifacts
 * into controlled source by default.
 */
final class ReleaseGovernanceBuilder
{
    /**
     * @param list<string> $trackedFiles
     * @return array<string, mixed>
     */
    public function buildManifest(array $trackedFiles, array $context): array
    {
        $payload = [
            'artifact_type' => 'release_manifest',
            'schema_version' => '1.0.0',
            'generated_at' => $this->generatedAt($context),
            'source_ref' => [
                'repository' => $this->text($context['repository'] ?? 'sanhvo86-hesem/mom'),
                'branch' => $this->required($context, 'branch'),
                'commit_sha' => $this->required($context, 'commit_sha'),
            ],
            'change_authority' => [
                'required' => true,
                'authority_ref' => $this->required($context, 'change_authority_ref'),
                'authority_state' => $this->text($context['change_authority_state'] ?? 'released'),
            ],
            'controlled_source' => [
                'file_count' => count($trackedFiles),
                'tracked_files_hash_sha256' => hash('sha256', implode("\n", $this->normalizeFiles($trackedFiles))),
            ],
            'boundary_policy' => [
                'portal_first' => true,
                'record_centric' => true,
                'sharepoint_authority_role' => 'read_only_publication_only',
                'runtime_artifacts_in_controlled_source' => 'blocked',
            ],
        ];

        $payload['manifest_hash_sha256'] = $this->payloadHash($payload);
        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPromotionReceipt(array $manifest, array $context): array
    {
        $payload = [
            'artifact_type' => 'promotion_receipt',
            'schema_version' => '1.0.0',
            'generated_at' => $this->generatedAt($context),
            'manifest_hash_sha256' => $this->required($manifest, 'manifest_hash_sha256'),
            'promoted_commit_sha' => $this->required($manifest['source_ref'] ?? [], 'commit_sha'),
            'target_environment' => $this->required($context, 'target_environment'),
            'promotion_state' => $this->text($context['promotion_state'] ?? 'promoted'),
            'promoted_by' => $this->text($context['promoted_by'] ?? 'automation'),
            'rollback_ref' => $this->text($context['rollback_ref'] ?? ''),
        ];

        $payload['receipt_hash_sha256'] = $this->payloadHash($payload);
        return $payload;
    }

    /**
     * @param list<string> $changedFiles
     * @return array<string, mixed>
     */
    public function buildReverseSyncIntake(array $changedFiles, array $context): array
    {
        $payload = [
            'artifact_type' => 'reverse_sync_intake',
            'schema_version' => '1.0.0',
            'generated_at' => $this->generatedAt($context),
            'source_environment' => $this->required($context, 'source_environment'),
            'source_commit_sha' => $this->text($context['source_commit_sha'] ?? ''),
            'intake_state' => $this->text($context['intake_state'] ?? 'quarantined_pending_review'),
            'changed_file_count' => count($changedFiles),
            'changed_files_hash_sha256' => hash('sha256', implode("\n", $this->normalizeFiles($changedFiles))),
            'portal_intake_required' => true,
        ];

        $payload['intake_hash_sha256'] = $this->payloadHash($payload);
        return $payload;
    }

    /**
     * @param list<string> $files
     * @return list<string>
     */
    private function normalizeFiles(array $files): array
    {
        $normalized = [];
        foreach ($files as $file) {
            $path = trim(str_replace('\\', '/', (string)$file), '/');
            if ($path !== '') {
                // CTRL-011: Reject paths with traversal
                if (preg_match('/\.\./', $path) || str_starts_with($path, '/')) {
                    throw new RuntimeException("Invalid tracked file path: $path");
                }
                $normalized[] = $path;
            }
        }
        sort($normalized);
        return $normalized;
    }

    private function generatedAt(array $context): string
    {
        $value = $this->text($context['generated_at'] ?? '');
        return $value !== '' ? $value : gmdate('c');
    }

    private function required(array $data, string $key): string
    {
        $value = $this->text($data[$key] ?? '');
        if ($value === '') {
            throw new RuntimeException($key . '_required');
        }
        return $value;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function payloadHash(array $payload): string
    {
        $copy = $payload;
        unset($copy['manifest_hash_sha256'], $copy['receipt_hash_sha256'], $copy['intake_hash_sha256']);
        $json = json_encode($copy, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        if (!is_string($json)) {
            throw new RuntimeException('release_governance_hash_failed');
        }
        return hash('sha256', $json);
    }
}
