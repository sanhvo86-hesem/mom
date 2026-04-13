<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use RuntimeException;

/**
 * Stateless policy service for offline issuance, upload validation, and online
 * finalization. Persistence belongs to command handlers; this class makes the
 * executable guards testable and shared.
 */
final class EqmsFormExecutionService
{
    /**
     * @param array<string, mixed> $templateRevision
     * @param array<string, mixed> $schemaVersion
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function buildIssuanceManifest(array $templateRevision, array $schemaVersion, array $request): array
    {
        $templateState = strtolower($this->requiredText($templateRevision, 'lifecycle_state'));
        $schemaState = strtolower($this->requiredText($schemaVersion, 'lifecycle_state'));
        if ($templateState !== 'released') {
            throw new RuntimeException('released_template_revision_required');
        }
        if ($schemaState !== 'released') {
            throw new RuntimeException('released_schema_version_required');
        }

        $deliveryMode = strtolower($this->requiredText($request, 'delivery_mode'));
        if (!in_array($deliveryMode, ['offline_excel', 'online'], true)) {
            throw new RuntimeException('unsupported_delivery_mode');
        }

        $manifest = [
            'manifest_version' => 1,
            'form_family_id' => $this->requiredText($templateRevision, 'frm_family_id'),
            'template_revision_id' => $this->requiredText($templateRevision, 'frm_template_revision_id'),
            'template_revision' => $this->requiredText($templateRevision, 'template_revision'),
            'template_checksum_sha256' => $this->requiredSha256($templateRevision, 'template_checksum_sha256'),
            'schema_version_id' => $this->requiredText($schemaVersion, 'frm_schema_version_id'),
            'schema_version' => $this->requiredText($schemaVersion, 'schema_version'),
            'delivery_mode' => $deliveryMode,
            'issued_record_id' => $this->requiredText($request, 'issued_record_id'),
            'allocation_id' => $this->requiredText($request, 'allocation_id'),
            'subject' => is_array($request['subject'] ?? null) ? $request['subject'] : [],
            'effectivity_context' => is_array($request['effectivity_context'] ?? null) ? $request['effectivity_context'] : [],
        ];

        $manifest['carrier_manifest_hash_sha256'] = $this->hash($manifest);
        return $manifest;
    }

    /**
     * @param array<string, mixed> $issuance
     * @param array<string, mixed> $carrierManifest
     * @param array<string, mixed> $submission
     * @param list<array<string, mixed>> $knownFingerprints
     * @return array<string, mixed>
     */
    public function validateSubmissionAttempt(
        array $issuance,
        array $carrierManifest,
        array $submission,
        array $knownFingerprints = [],
    ): array {
        $errors = [];
        $warnings = [];
        $issuanceState = strtolower($this->text($issuance['issuance_state'] ?? ''));
        if (in_array($issuanceState, ['voided', 'expired', 'superseded'], true)) {
            $errors[] = $this->error('issuance_not_accepting_submissions', 'Issuance is not accepting submissions.');
        }

        foreach (['allocation_id', 'issued_record_id', 'template_revision_id', 'schema_version_id'] as $key) {
            if ($this->text($issuance[$key] ?? '') !== $this->text($carrierManifest[$key] ?? '')) {
                $errors[] = $this->error($key . '_mismatch', 'Carrier manifest does not match server issuance.', ['field' => $key]);
            }
        }

        $serverManifestHash = $this->text($issuance['carrier_manifest_hash_sha256'] ?? '');
        $carrierManifestHash = $this->text($carrierManifest['carrier_manifest_hash_sha256'] ?? '');
        if ($serverManifestHash !== '' && $carrierManifestHash !== '' && !hash_equals($serverManifestHash, $carrierManifestHash)) {
            $errors[] = $this->error('carrier_manifest_hash_mismatch', 'Carrier manifest hash does not match issuance ledger.');
        }

        $originalHash = strtolower($this->text($submission['original_artifact_hash_sha256'] ?? ''));
        $payloadHash = strtolower($this->text($submission['canonical_payload_hash_sha256'] ?? ''));
        if (!$this->isSha256($originalHash)) {
            $errors[] = $this->error('original_artifact_hash_required', 'Original artifact SHA-256 hash is required.');
        }
        if (!$this->isSha256($payloadHash)) {
            $errors[] = $this->error('canonical_payload_hash_required', 'Canonical payload SHA-256 hash is required.');
        }

        $duplicate = $this->detectDuplicate($originalHash, $payloadHash, $knownFingerprints);
        if ($duplicate !== null) {
            $errors[] = $this->error('duplicate_submission', 'Duplicate submission detected.', ['duplicate' => $duplicate]);
        }

        return [
            'validation_state' => $errors === [] ? 'passed' : 'failed',
            'errors' => $errors,
            'warnings' => $warnings,
            'canonical_payload_hash_sha256' => $payloadHash,
            'original_artifact_hash_sha256' => $originalHash,
            'duplicate' => $duplicate,
        ];
    }

    /**
     * @param array<string, mixed> $evidencePackage
     * @return array<string, mixed>
     */
    public function validateFinalEvidencePackage(array $evidencePackage): array
    {
        $artifacts = is_array($evidencePackage['artifacts'] ?? null) ? $evidencePackage['artifacts'] : [];
        $missing = [];
        foreach (['original', 'canonical_payload', 'readable_snapshot', 'hash_signature_manifest'] as $role) {
            if (!is_array($artifacts[$role] ?? null) && !($role === 'hash_signature_manifest' && is_array($artifacts['manifest'] ?? null))) {
                $missing[] = $role;
            }
        }

        $packageHash = $this->text($evidencePackage['package_hash_sha256'] ?? '');
        $manifestHash = $this->text($evidencePackage['manifest_hash_sha256'] ?? '');
        if (!$this->isSha256($packageHash)) {
            $missing[] = 'package_hash_sha256';
        }
        if (!$this->isSha256($manifestHash)) {
            $missing[] = 'manifest_hash_sha256';
        }

        return [
            'valid' => $missing === [],
            'missing' => $missing,
            'error_code' => $missing === [] ? null : 'manifest_incomplete',
        ];
    }

    /**
     * @param list<array<string, mixed>> $knownFingerprints
     * @return array<string, mixed>|null
     */
    private function detectDuplicate(string $artifactHash, string $payloadHash, array $knownFingerprints): ?array
    {
        foreach ($knownFingerprints as $row) {
            $type = strtolower($this->text($row['fingerprint_type'] ?? ''));
            $value = strtolower($this->text($row['fingerprint_value_sha256'] ?? ''));
            if ($type === 'artifact_hash' && $artifactHash !== '' && hash_equals($artifactHash, $value)) {
                return ['match_type' => 'artifact_hash', 'fingerprint' => $value, 'confidence' => 1.0] + $row;
            }
            if ($type === 'canonical_payload_hash' && $payloadHash !== '' && hash_equals($payloadHash, $value)) {
                return ['match_type' => 'canonical_payload_hash', 'fingerprint' => $value, 'confidence' => 1.0] + $row;
            }
        }
        return null;
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
     * @param array<string, mixed> $data
     */
    private function requiredSha256(array $data, string $key): string
    {
        $value = strtolower($this->requiredText($data, $key));
        if (!$this->isSha256($value)) {
            throw new RuntimeException($key . '_invalid');
        }
        return $value;
    }

    /**
     * @param array<string, mixed> $data
     * @return array{error_code: string, message: string, data: array<string, mixed>}
     */
    private function error(string $code, string $message, array $data = []): array
    {
        return ['error_code' => $code, 'message' => $message, 'data' => $data];
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
    private function ksortRecursive(array &$data): void
    {
        ksort($data);
        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->ksortRecursive($value);
            }
        }
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function isSha256(string $value): bool
    {
        return preg_match('/^[a-f0-9]{64}$/', $value) === 1;
    }
}
