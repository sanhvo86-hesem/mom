<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use RuntimeException;

/**
 * Verifies that a release manifest is bound to the commit and change authority
 * that a deployment is about to promote.
 */
final class ReleaseManifestBindingVerifier
{
    /**
     * @param array<string, mixed> $manifest
     * @return array<string, mixed>
     */
    public function verify(array $manifest, string $expectedCommitSha, string $expectedAuthorityRef): array
    {
        $expectedCommitSha = strtolower($this->requiredSha($expectedCommitSha, 'expected_commit_sha'));
        $expectedAuthorityRef = $this->requiredText($expectedAuthorityRef, 'expected_change_authority_ref');

        $commitCandidates = array_values(array_filter([
            $this->text($manifest['source_ref']['commit_sha'] ?? null),
            $this->text($manifest['source_commit_sha'] ?? null),
            $this->text($manifest['validated_head'] ?? null),
            $this->text($manifest['promoted_commit_sha'] ?? null),
        ], fn(string $value): bool => $this->isSha1($value)));

        if ($commitCandidates === []) {
            throw new RuntimeException('release_manifest_commit_required');
        }
        if (!in_array($expectedCommitSha, array_map('strtolower', $commitCandidates), true)) {
            throw new RuntimeException('release_manifest_commit_mismatch');
        }

        $authorityCandidates = array_values(array_filter([
            $this->text($manifest['change_authority']['authority_ref'] ?? null),
            $this->text($manifest['change_authority_ref'] ?? null),
            $this->text($manifest['authority_ref'] ?? null),
        ], static fn(string $value): bool => $value !== ''));

        if ($authorityCandidates === [] || !in_array($expectedAuthorityRef, $authorityCandidates, true)) {
            throw new RuntimeException('release_manifest_change_authority_mismatch');
        }

        $manifestHash = strtolower($this->text($manifest['manifest_hash_sha256'] ?? $manifest['artifact_manifest_hash_sha256'] ?? null));
        if ($manifestHash !== '') {
            if (!$this->isSha256($manifestHash)) {
                throw new RuntimeException('release_manifest_hash_invalid');
            }
            if (!hash_equals($manifestHash, $this->recomputeManifestHash($manifest))) {
                throw new RuntimeException('release_manifest_hash_mismatch');
            }
        }

        return [
            'release_manifest_binding' => 'verified',
            'source_commit_sha' => $expectedCommitSha,
            'change_authority_ref' => $expectedAuthorityRef,
            'manifest_hash_sha256' => $manifestHash,
        ];
    }

    /**
     * @param array<string, mixed> $manifest
     */
    private function recomputeManifestHash(array $manifest): string
    {
        unset(
            $manifest['manifest_hash_sha256'],
            $manifest['artifact_manifest_hash_sha256'],
            $manifest['receipt_hash_sha256'],
            $manifest['intake_hash_sha256'],
        );
        $json = json_encode($manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        if (!is_string($json)) {
            throw new RuntimeException('release_manifest_hash_recompute_failed');
        }
        return hash('sha256', $json);
    }

    private function requiredText(string $value, string $field): string
    {
        $text = trim($value);
        if ($text === '') {
            throw new RuntimeException($field . '_required');
        }
        return $text;
    }

    private function requiredSha(string $value, string $field): string
    {
        $text = trim($value);
        if (!$this->isSha1($text)) {
            throw new RuntimeException($field . '_invalid');
        }
        return $text;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function isSha1(string $value): bool
    {
        return preg_match('/^[a-f0-9]{40}$/i', trim($value)) === 1;
    }

    private function isSha256(string $value): bool
    {
        return preg_match('/^[a-f0-9]{64}$/i', trim($value)) === 1;
    }
}
