<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

use RuntimeException;

/**
 * Builds a human-readable, hash-verifiable audit pack manifest.
 */
final class AuditPackExporter
{
    private const REQUIRED_EVIDENCE_ARTIFACTS = [
        'original',
        'canonical_payload',
        'readable_snapshot',
        'hash_signature_manifest',
    ];

    /**
     * @param array<string, mixed> $scope
     * @param list<array<string, mixed>> $evidencePackages
     * @param list<array<string, mixed>> $auditEvents
     * @param list<array<string, mixed>> $changeAuthorities
     * @param list<array<string, mixed>> $genealogyLinks
     * @return array<string, mixed>
     */
    public function buildManifest(
        array $scope,
        array $evidencePackages,
        array $auditEvents = [],
        array $changeAuthorities = [],
        array $genealogyLinks = [],
    ): array {
        $scopeType = $this->requiredText($scope, 'scope_type');
        $scopeRef = $this->requiredText($scope, 'scope_ref');

        $exceptions = [];
        foreach ($evidencePackages as $idx => $package) {
            $missing = $this->missingPackageArtifacts($package);
            if ($missing !== []) {
                $exceptions[] = [
                    'exception_code' => 'evidence_package_incomplete',
                    'package_index' => $idx,
                    'missing' => $missing,
                ];
            }
        }

        $manifest = [
            'manifest_version' => 1,
            'scope' => [
                'scope_type' => $scopeType,
                'scope_ref' => $scopeRef,
            ],
            'created_at' => $this->nowIso(),
            'evidence_packages' => $this->summarizePackages($evidencePackages),
            'audit_timeline' => $this->summarizeAuditEvents($auditEvents),
            'change_authorities' => $changeAuthorities,
            'genealogy_links' => $genealogyLinks,
            'exceptions' => $exceptions,
            'readability_index' => [
                'sections' => [
                    'executive_summary',
                    'record_identity',
                    'evidence_packages',
                    'audit_timeline',
                    'change_authority',
                    'publication_and_retention',
                    'genealogy_trace',
                    'exceptions',
                ],
            ],
        ];

        $manifest['manifest_hash_sha256'] = $this->hash($manifest);
        $manifest['export_state'] = $exceptions === [] ? 'ready' : 'failed';
        $manifest['error_code'] = $exceptions === [] ? null : 'audit_pack_incomplete';

        return $manifest;
    }

    /**
     * @param array<string, mixed> $package
     * @return list<string>
     */
    public function missingPackageArtifacts(array $package): array
    {
        $artifacts = is_array($package['artifacts'] ?? null) ? $package['artifacts'] : [];
        $missing = [];
        foreach (self::REQUIRED_EVIDENCE_ARTIFACTS as $role) {
            if ($role === 'hash_signature_manifest') {
                if (!is_array($artifacts['hash_signature_manifest'] ?? null) && !is_array($artifacts['manifest'] ?? null)) {
                    $missing[] = $role;
                }
                continue;
            }
            if (!is_array($artifacts[$role] ?? null)) {
                $missing[] = $role;
            }
        }

        foreach (['package_hash_sha256', 'manifest_hash_sha256'] as $hashKey) {
            if (!$this->isSha256($this->text($package[$hashKey] ?? ''))) {
                $missing[] = $hashKey;
            }
        }

        return $missing;
    }

    /**
     * @param list<array<string, mixed>> $packages
     * @return list<array<string, mixed>>
     */
    private function summarizePackages(array $packages): array
    {
        $out = [];
        foreach ($packages as $package) {
            $out[] = [
                'subject_type' => $this->text($package['subject_type'] ?? ''),
                'subject_id' => $this->text($package['subject_id'] ?? ''),
                'package_hash_sha256' => $this->text($package['package_hash_sha256'] ?? ''),
                'manifest_hash_sha256' => $this->text($package['manifest_hash_sha256'] ?? ''),
                'publication_state' => $package['manifest']['publication_state'] ?? $package['publication_state'] ?? [],
                'missing' => $this->missingPackageArtifacts($package),
            ];
        }
        return $out;
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return list<array<string, mixed>>
     */
    private function summarizeAuditEvents(array $events): array
    {
        $out = [];
        foreach ($events as $event) {
            $out[] = [
                'recorded_at' => $this->text($event['recorded_at'] ?? $event['occurred_at'] ?? ''),
                'event_type' => $this->text($event['event_type'] ?? ''),
                'aggregate_type' => $this->text($event['aggregate_type'] ?? ''),
                'aggregate_id' => $this->text($event['aggregate_id'] ?? ''),
                'actor_id' => $this->text($event['actor_id'] ?? $event['actor_ref'] ?? ''),
                'event_hash_sha256' => $this->text($event['event_hash'] ?? $event['event_hash_sha256'] ?? ''),
            ];
        }
        usort($out, static fn(array $a, array $b): int => strcmp($a['recorded_at'], $b['recorded_at']));
        return $out;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function requiredText(array $data, string $key): string
    {
        $value = $this->text($data[$key] ?? '');
        if ($value === '') {
            throw new RuntimeException($key . '_required');
        }
        return $value;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function hash(array $payload): string
    {
        $this->ksortRecursive($payload);
        return hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /**
     * @param array<string, mixed> $data
     */
    private function ksortRecursive(array &$data, int $depth = 0): void
    {
        if ($depth > 10) {
            return; // CTRL-020: Stop recursion at depth 10 to prevent DoS
        }
        ksort($data);
        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->ksortRecursive($value, $depth + 1);
            }
        }
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function isSha256(string $value): bool
    {
        return preg_match('/^[a-f0-9]{64}$/', strtolower($value)) === 1;
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
