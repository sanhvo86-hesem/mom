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
        if (($this->targetConfig['direct_user_upload_allowed'] ?? false) === true) {
            throw new RuntimeException('SharePoint direct user upload is not allowed for controlled evidence.');
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

        $snapshotUri = trim((string)($snapshot['storage_uri'] ?? ''));
        if ($snapshotUri === '') {
            throw new RuntimeException('Publication requires a readable snapshot artifact.');
        }

        return [
            'target_type' => 'sharepoint_graph',
            'authority_role' => 'read_only_replica',
            'source_manifest_hash_sha256' => (string)($evidencePackage['manifest_hash_sha256'] ?? ''),
            'source_package_hash_sha256' => (string)($evidencePackage['package_hash_sha256'] ?? ''),
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
}
