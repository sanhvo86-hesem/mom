<?php

declare(strict_types=1);

namespace MOM\Services\Publication;

use RuntimeException;

/**
 * SharePoint publication adapter boundary.
 *
 * This adapter models SharePoint as a read-only publication target only. It is
 * deliberately not an acceptance/finalization path and exposes no direct user
 * upload method.
 */
final class SharePointPublicationAdapter
{
    /**
     * @param array<string, mixed> $targetConfig
     */
    public function __construct(
        private readonly array $targetConfig,
    ) {
        if ($this->boolConfig('direct_user_upload_allowed')) {
            throw new RuntimeException('SharePoint direct user upload is not allowed for controlled evidence.');
        }
        $targetUrl = trim((string)($this->targetConfig['sharepoint_url'] ?? $this->targetConfig['site_url'] ?? ''));
        if ($targetUrl !== '') {
            $this->validateSharePointUrl($targetUrl);
        }
    }

    /**
     * @param array<string, mixed> $evidencePackage
     * @return array<string, mixed>
     */
    public function buildPublicationRequest(array $evidencePackage): array
    {
        $manifest = is_array($evidencePackage['manifest'] ?? null) ? $evidencePackage['manifest'] : [];
        $artifacts = is_array($evidencePackage['artifacts'] ?? null) ? $evidencePackage['artifacts'] : [];
        $snapshot = is_array($artifacts['readable_snapshot'] ?? null) ? $artifacts['readable_snapshot'] : [];
        $publicationState = is_array($manifest['publication_state'] ?? null) ? $manifest['publication_state'] : [];
        $authorityRole = strtolower(trim((string)($publicationState['authority_role'] ?? 'read_only_replica')));
        if ($authorityRole !== 'read_only_replica' || $this->boolValue($publicationState['direct_user_upload'] ?? false)) {
            throw new RuntimeException('Publication manifest must describe a read-only replica and no direct user upload.');
        }

        $snapshotUri = trim((string)($snapshot['storage_uri'] ?? ''));
        if ($snapshotUri === '') {
            throw new RuntimeException('Publication requires a readable snapshot artifact.');
        }
        $manifestHash = trim((string)($evidencePackage['manifest_hash_sha256'] ?? ''));
        $packageHash = trim((string)($evidencePackage['package_hash_sha256'] ?? ''));
        if (!$this->sha256($manifestHash) || !$this->sha256($packageHash)) {
            throw new RuntimeException('Publication requires valid evidence package and manifest hashes.');
        }

        return [
            'target_type' => 'sharepoint_graph',
            'authority_role' => 'read_only_replica',
            'source_manifest_hash_sha256' => $manifestHash,
            'source_package_hash_sha256' => $packageHash,
            'source_snapshot_uri' => $snapshotUri,
            'sharepoint' => [
                'site_id' => (string)($this->targetConfig['site_id'] ?? ''),
                'drive_id' => (string)($this->targetConfig['drive_id'] ?? ''),
                'folder_path' => (string)($this->targetConfig['folder_path'] ?? ''),
                'read_only' => true,
            ],
            'manifest' => $manifest,
        ];
    }

    private function boolConfig(string $key): bool
    {
        return $this->boolValue($this->targetConfig[$key] ?? false);
    }

    private function boolValue(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1;
        }
        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 't', 'yes', 'y'], true);
        }
        return false;
    }

    private function sha256(string $value): bool
    {
        return preg_match('/^[a-f0-9]{64}$/', $value) === 1;
    }

    /**
     * FOUND-005 FIX: Validate SharePoint URL to prevent SSRF attacks
     */
    private function validateSharePointUrl(string $url): void
    {
        $parsed = parse_url($url);
        if ($parsed === false || empty($parsed['scheme']) || empty($parsed['host'])) {
            throw new RuntimeException('invalid_sharepoint_url_format');
        }

        // SharePoint URLs must use HTTPS
        if ($parsed['scheme'] !== 'https') {
            throw new RuntimeException('sharepoint_url_must_use_https');
        }

        // Block private IP ranges
        $ip = gethostbyname($parsed['host']);
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            throw new RuntimeException('sharepoint_url_resolves_to_private_address');
        }
    }
}
