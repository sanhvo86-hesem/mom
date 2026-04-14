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

    private readonly string $dataDir;

    public function __construct(?string $dataDir = null)
    {
        $base = $dataDir ?? (sys_get_temp_dir() . '/mom-audit-pack-exporter');
        $this->dataDir = rtrim(str_replace('\\', '/', $base), '/');
    }

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
        if ($evidencePackages === []) {
            $exceptions[] = [
                'exception_code' => 'evidence_package_required',
                'missing' => ['evidence_packages'],
            ];
        }

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
     * @param array<string, mixed> $scope
     * @param list<array<string, mixed>> $evidencePackages
     * @param list<array<string, mixed>> $auditEvents
     * @param list<array<string, mixed>> $changeAuthorities
     * @param list<array<string, mixed>> $genealogyLinks
     * @return array<string, mixed>
     */
    public function exportBundle(
        array $scope,
        array $evidencePackages,
        array $auditEvents = [],
        array $changeAuthorities = [],
        array $genealogyLinks = [],
    ): array {
        $manifest = $this->buildManifest($scope, $evidencePackages, $auditEvents, $changeAuthorities, $genealogyLinks);
        if (($manifest['export_state'] ?? '') !== 'ready') {
            return [
                'export_state' => 'failed',
                'error_code' => $manifest['error_code'] ?? 'audit_pack_incomplete',
                'audit_pack_manifest' => $manifest,
                'exceptions' => $manifest['exceptions'] ?? [],
            ];
        }

        $createdAt = $this->nowIso();
        $bundlePayload = [
            'bundle_version' => 1,
            'created_at' => $createdAt,
            'scope' => $manifest['scope'],
            'audit_pack_manifest' => $manifest,
            'evidence_packages' => $evidencePackages,
            'audit_events' => $auditEvents,
            'change_authorities' => $changeAuthorities,
            'genealogy_links' => $genealogyLinks,
            'integrity_contract' => [
                'hash_algorithm' => 'sha256',
                'self_hash_excludes' => ['package_hash_sha256'],
            ],
        ];
        $packageHash = $this->hash($bundlePayload);
        $packageUri = 'audit-packs/audit-pack-' . $packageHash . '.json';
        $bundle = $bundlePayload;
        $bundle['package_hash_sha256'] = $packageHash;

        $this->writeJsonFile($this->dataDir . '/' . $packageUri, $bundle);

        $receiptPayload = [
            'receipt_version' => 1,
            'receipt_type' => 'audit_pack_export_receipt',
            'exported_at' => $this->nowIso(),
            'package_uri' => $packageUri,
            'package_hash_sha256' => $packageHash,
            'manifest_hash_sha256' => (string)($manifest['manifest_hash_sha256'] ?? ''),
            'scope' => $manifest['scope'],
            'replay_hint' => 'read_export_by_package_hash_and_verify_self_hash',
        ];
        $receiptHash = $this->hash($receiptPayload);
        $receiptUri = 'audit-packs/receipts/audit-pack-' . $packageHash . '.receipt.json';
        $receipt = $receiptPayload;
        $receipt['receipt_hash_sha256'] = $receiptHash;
        $this->writeJsonFile($this->dataDir . '/' . $receiptUri, $receipt);

        return [
            'export_state' => 'ready',
            'package_uri' => $packageUri,
            'package_hash_sha256' => $packageHash,
            'manifest_hash_sha256' => (string)($manifest['manifest_hash_sha256'] ?? ''),
            'receipt_uri' => $receiptUri,
            'receipt_hash_sha256' => $receiptHash,
            'audit_pack_manifest' => $manifest,
            'bundle' => $bundle,
            'receipt' => $receipt,
        ];
    }

    /**
     * @param array<string, mixed> $manifest
     * @return array<string, mixed>
     */
    public function exportManifest(array $manifest): array
    {
        if (($manifest['export_state'] ?? '') !== 'ready') {
            return [
                'export_state' => 'failed',
                'error_code' => $manifest['error_code'] ?? 'audit_pack_incomplete',
                'audit_pack_manifest' => $manifest,
                'exceptions' => $manifest['exceptions'] ?? [],
            ];
        }

        $createdAt = $this->nowIso();
        $bundlePayload = [
            'bundle_version' => 1,
            'created_at' => $createdAt,
            'scope' => $manifest['scope'] ?? [],
            'audit_pack_manifest' => $manifest,
            'evidence_packages' => $manifest['evidence_packages'] ?? [],
            'audit_events' => $manifest['audit_timeline'] ?? [],
            'change_authorities' => $manifest['change_authorities'] ?? [],
            'genealogy_links' => $manifest['genealogy_links'] ?? [],
            'integrity_contract' => [
                'hash_algorithm' => 'sha256',
                'self_hash_excludes' => ['package_hash_sha256'],
                'source_manifest_hash_sha256' => (string)($manifest['manifest_hash_sha256'] ?? ''),
            ],
        ];
        $packageHash = $this->hash($bundlePayload);
        $packageUri = 'audit-packs/audit-pack-' . $packageHash . '.json';
        $bundle = $bundlePayload;
        $bundle['package_hash_sha256'] = $packageHash;

        $this->writeJsonFile($this->dataDir . '/' . $packageUri, $bundle);

        $receiptPayload = [
            'receipt_version' => 1,
            'receipt_type' => 'audit_pack_export_receipt',
            'exported_at' => $this->nowIso(),
            'package_uri' => $packageUri,
            'package_hash_sha256' => $packageHash,
            'manifest_hash_sha256' => (string)($manifest['manifest_hash_sha256'] ?? ''),
            'scope' => $manifest['scope'] ?? [],
            'replay_hint' => 'read_export_by_package_hash_and_verify_self_hash',
        ];
        $receiptHash = $this->hash($receiptPayload);
        $receiptUri = 'audit-packs/receipts/audit-pack-' . $packageHash . '.receipt.json';
        $receipt = $receiptPayload;
        $receipt['receipt_hash_sha256'] = $receiptHash;
        $this->writeJsonFile($this->dataDir . '/' . $receiptUri, $receipt);

        return [
            'export_state' => 'ready',
            'package_uri' => $packageUri,
            'package_hash_sha256' => $packageHash,
            'manifest_hash_sha256' => (string)($manifest['manifest_hash_sha256'] ?? ''),
            'receipt_uri' => $receiptUri,
            'receipt_hash_sha256' => $receiptHash,
            'audit_pack_manifest' => $manifest,
            'bundle' => $bundle,
            'receipt' => $receipt,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function readExport(string $packageHash): array
    {
        $hash = strtolower(trim($packageHash));
        if (!$this->isSha256($hash)) {
            throw new RuntimeException('invalid_audit_pack_hash');
        }

        $packageUri = 'audit-packs/audit-pack-' . $hash . '.json';
        $bundle = $this->readJsonFile($this->dataDir . '/' . $packageUri);
        $recordedHash = $this->text($bundle['package_hash_sha256'] ?? '');
        $hashPayload = $bundle;
        unset($hashPayload['package_hash_sha256']);
        $actualHash = $this->hash($hashPayload);
        if ($recordedHash !== $hash || $actualHash !== $hash) {
            throw new RuntimeException('audit_pack_hash_mismatch');
        }

        $receiptUri = 'audit-packs/receipts/audit-pack-' . $hash . '.receipt.json';
        $receipt = [];
        $receiptPath = $this->dataDir . '/' . $receiptUri;
        if (is_file($receiptPath)) {
            $receipt = $this->readJsonFile($receiptPath);
        }

        return [
            'export_state' => 'ready',
            'package_uri' => $packageUri,
            'package_hash_sha256' => $hash,
            'receipt_uri' => $receipt === [] ? null : $receiptUri,
            'receipt' => $receipt,
            'bundle' => $bundle,
            'integrity_status' => 'verified',
        ];
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
                'org_id' => $this->text($package['org_id'] ?? ''),
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
                'org_id' => $this->text($event['org_id'] ?? ''),
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

    /**
     * @param array<string, mixed> $data
     */
    private function writeJsonFile(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('audit_pack_export_directory_unavailable');
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $tmp = $path . '.tmp.' . bin2hex(random_bytes(4));
        if (@file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
            throw new RuntimeException('audit_pack_export_write_failed');
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('audit_pack_export_publish_failed');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function readJsonFile(string $path): array
    {
        if (!is_file($path)) {
            throw new RuntimeException('audit_pack_export_not_found');
        }
        $raw = file_get_contents($path);
        if (!is_string($raw)) {
            throw new RuntimeException('audit_pack_export_read_failed');
        }
        $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) {
            throw new RuntimeException('audit_pack_export_invalid_json');
        }
        return $decoded;
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }
}
