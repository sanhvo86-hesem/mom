<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use RuntimeException;

/**
 * Builds a complete immutable evidence package.
 *
 * A finalized package must contain:
 * - original artifact
 * - canonical structured payload
 * - readable snapshot
 * - hash manifest
 * - publication state record
 */
final class EvidencePackageBuilder
{
    private const PUBLICATION_STATES = ['pending', 'queued', 'publishing', 'published', 'failed', 'retry_scheduled', 'dead_letter', 'withdrawn', 'superseded'];

    public function __construct(
        private readonly ImmutableStorageAdapter $storage,
    ) {
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function build(array $input): array
    {
        $subjectType = $this->requiredString($input, 'subject_type');
        $subjectId = $this->requiredString($input, 'subject_id');
        $canonicalPayload = $input['canonical_payload'] ?? null;
        if (!is_array($canonicalPayload)) {
            throw new RuntimeException('canonical_payload must be an array.');
        }

        $artifacts = [];
        $original = $this->storeOriginal($input, $subjectType, $subjectId);
        $artifacts['original'] = $original;

        $canonicalJson = $this->canonicalJson($canonicalPayload);
        $artifacts['canonical_payload'] = $this->storage->putBytes(
            $this->logicalName($subjectType, $subjectId, 'canonical_payload.json'),
            $canonicalJson,
        );

        $snapshotBytes = $this->readableSnapshotBytes($input, $canonicalPayload);
        $artifacts['readable_snapshot'] = $this->storage->putBytes(
            $this->logicalName($subjectType, $subjectId, 'readable_snapshot.html'),
            $snapshotBytes,
        );

        $manifest = [
            'manifest_version' => 1,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'created_at' => $this->nowIso(),
            'actor_id' => (string)($input['actor_id'] ?? ''),
            'source' => is_array($input['source'] ?? null) ? $input['source'] : [],
            'signature_events' => is_array($input['signature_events'] ?? null) ? $input['signature_events'] : [],
            'publication_state' => $this->publicationState($input),
            'artifacts' => [
                'original' => $this->artifactManifest($artifacts['original']),
                'canonical_payload' => $this->artifactManifest($artifacts['canonical_payload']),
                'readable_snapshot' => $this->artifactManifest($artifacts['readable_snapshot']),
            ],
        ];
        $manifestJson = $this->canonicalJson($manifest);
        $manifestHash = hash('sha256', $manifestJson);
        $manifest['manifest_hash_sha256'] = $manifestHash;

        $artifacts['manifest'] = $this->storage->putBytes(
            $this->logicalName($subjectType, $subjectId, 'manifest.json'),
            $this->canonicalJson($manifest),
        );

        $packageHash = hash('sha256', implode('|', [
            $artifacts['original']['sha256'],
            $artifacts['canonical_payload']['sha256'],
            $artifacts['readable_snapshot']['sha256'],
            $manifestHash,
        ]));

        return [
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'package_hash_sha256' => $packageHash,
            'manifest_hash_sha256' => $manifestHash,
            'canonical_payload_hash_sha256' => $artifacts['canonical_payload']['sha256'],
            'readable_snapshot_hash_sha256' => $artifacts['readable_snapshot']['sha256'],
            // Backward-compatible alias for migration 103 callers.
            'snapshot_hash_sha256' => $artifacts['readable_snapshot']['sha256'],
            'manifest' => $manifest,
            'artifacts' => $artifacts,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array{storage_adapter: string, storage_uri: string, sha256: string, size_bytes: int}
     */
    private function storeOriginal(array $input, string $subjectType, string $subjectId): array
    {
        if (is_string($input['original_path'] ?? null) && trim((string)$input['original_path']) !== '') {
            return $this->storage->putFile(
                $this->logicalName($subjectType, $subjectId, basename((string)$input['original_path'])),
                (string)$input['original_path'],
            );
        }

        if (is_string($input['original_bytes'] ?? null)) {
            return $this->storage->putBytes(
                $this->logicalName($subjectType, $subjectId, 'original.bin'),
                (string)$input['original_bytes'],
            );
        }

        throw new RuntimeException('Evidence package requires original_path or original_bytes.');
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $canonicalPayload
     */
    private function readableSnapshotBytes(array $input, array $canonicalPayload): string
    {
        if (is_string($input['readable_snapshot_html'] ?? null) && trim((string)$input['readable_snapshot_html']) !== '') {
            return (string)$input['readable_snapshot_html'];
        }

        $escaped = htmlspecialchars($this->canonicalJson($canonicalPayload), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return '<!doctype html><meta charset="utf-8"><title>Evidence Snapshot</title><pre>' . $escaped . '</pre>';
    }

    /**
     * @param array<string, mixed> $artifact
     * @return array<string, mixed>
     */
    private function artifactManifest(array $artifact): array
    {
        return [
            'storage_adapter' => $artifact['storage_adapter'],
            'storage_uri' => $artifact['storage_uri'],
            'sha256' => $artifact['sha256'],
            'size_bytes' => $artifact['size_bytes'],
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function publicationState(array $input): array
    {
        if (is_array($input['publication_state'] ?? null)) {
            $state = $input['publication_state'];
        } else {
            $state = [
                'state' => 'pending',
                'target_type' => (string)($input['publication_target'] ?? 'sharepoint_graph'),
                'authority_role' => 'read_only_replica',
            ];
        }

        $publicationState = strtolower(trim((string)($state['state'] ?? 'pending')));
        if (!in_array($publicationState, self::PUBLICATION_STATES, true)) {
            throw new RuntimeException('Invalid publication_state.state for evidence package.');
        }

        $authorityRole = strtolower(trim((string)($state['authority_role'] ?? 'read_only_replica')));
        if ($authorityRole !== 'read_only_replica') {
            throw new RuntimeException('Evidence package publication state must be a read-only replica.');
        }

        if ($this->boolValue($state['direct_user_upload'] ?? $input['direct_user_upload'] ?? false)) {
            throw new RuntimeException('Evidence package cannot represent direct user upload to publication target.');
        }

        $state['state'] = $publicationState;
        $state['authority_role'] = $authorityRole;
        return $state;
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

    /**
     * @param array<string, mixed> $data
     */
    private function canonicalJson(array $data): string
    {
        $this->ksortRecursive($data);
        return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function ksortRecursive(array &$data): void
    {
        ksort($data);
        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->ksortRecursive($value);
            }
        }
    }

    /**
     * @param array<string, mixed> $input
     */
    private function requiredString(array $input, string $key): string
    {
        $value = $input[$key] ?? null;
        if (!is_scalar($value) || trim((string)$value) === '') {
            throw new RuntimeException($key . ' is required.');
        }
        return trim((string)$value);
    }

    private function logicalName(string $subjectType, string $subjectId, string $suffix): string
    {
        return $subjectType . '_' . $subjectId . '_' . $suffix;
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
