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

        $payload = $this->submissionPayload($submission);
        $schema = $this->schemaFromIssuance($issuance);
        $validationRules = $this->rulesFromIssuance($issuance);
        $canonicalPayload = [];
        if ($payload !== null) {
            $canonicalPayload = $this->canonicalizePayload($payload);
            $serverPayloadHash = $this->hash($canonicalPayload);
            if ($payloadHash !== '' && $this->isSha256($payloadHash) && !hash_equals($serverPayloadHash, $payloadHash)) {
                $errors[] = $this->error(
                    'canonical_payload_hash_mismatch',
                    'Canonical payload hash must be computed by the server from parsed submission payload.',
                );
            }
            $payloadHash = $serverPayloadHash;
        } elseif ($schema !== [] || $validationRules !== []) {
            $errors[] = $this->error('canonical_payload_required', 'Parsed canonical payload is required for server-authoritative validation.');
        }

        foreach ($this->validatePayloadAgainstSchema($canonicalPayload, $schema, $validationRules) as $error) {
            $errors[] = $error;
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
            'canonical_payload' => $canonicalPayload,
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
     * @param array<string, mixed> $submission
     * @return array<string, mixed>|null
     */
    private function submissionPayload(array $submission): ?array
    {
        foreach (['canonical_payload', 'parsed_payload', 'payload'] as $key) {
            if (is_array($submission[$key] ?? null)) {
                return $submission[$key];
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $issuance
     * @return array<string, mixed>
     */
    private function schemaFromIssuance(array $issuance): array
    {
        foreach (['json_schema', 'schema', 'schema_payload'] as $key) {
            $value = $issuance[$key] ?? null;
            if (is_array($value)) {
                return $value;
            }
            if (is_string($value) && trim($value) !== '') {
                $decoded = json_decode($value, true);
                return is_array($decoded) ? $decoded : [];
            }
        }

        return [];
    }

    /**
     * @param array<string, mixed> $issuance
     * @return array<string, mixed>
     */
    private function rulesFromIssuance(array $issuance): array
    {
        foreach (['validation_rules', 'canonicalization_rules'] as $key) {
            $value = $issuance[$key] ?? null;
            if (is_array($value)) {
                return $value;
            }
            if (is_string($value) && trim($value) !== '') {
                $decoded = json_decode($value, true);
                return is_array($decoded) ? $decoded : [];
            }
        }

        return [];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function canonicalizePayload(array $payload): array
    {
        $canonical = $payload;
        $this->ksortRecursive($canonical);
        return $canonical;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $schema
     * @param array<string, mixed> $rules
     * @return list<array{error_code: string, message: string, data: array<string, mixed>}>
     */
    private function validatePayloadAgainstSchema(array $payload, array $schema, array $rules): array
    {
        if ($payload === [] && $schema === [] && $rules === []) {
            return [];
        }

        $errors = [];
        $required = [];
        if (is_array($schema['required'] ?? null)) {
            $required = array_merge($required, array_values($schema['required']));
        }
        if (is_array($rules['required_fields'] ?? null)) {
            $required = array_merge($required, array_values($rules['required_fields']));
        }

        foreach (array_unique(array_filter(array_map(fn(mixed $field): string => $this->text($field), $required))) as $field) {
            if (!array_key_exists($field, $payload) || $payload[$field] === null || $payload[$field] === '') {
                $errors[] = $this->error('required_field_missing', 'Required field is missing from canonical payload.', [
                    'field_path' => $field,
                ]);
            }
        }

        $properties = is_array($schema['properties'] ?? null) ? $schema['properties'] : [];
        foreach ($properties as $field => $definition) {
            if (!is_string($field) || !array_key_exists($field, $payload) || !is_array($definition)) {
                continue;
            }
            $type = $this->text($definition['type'] ?? '');
            if ($type === '' || $this->jsonTypeMatches($payload[$field], $type)) {
                continue;
            }
            $errors[] = $this->error('field_type_mismatch', 'Canonical payload field type does not match issued schema.', [
                'field_path' => $field,
                'expected_type' => $type,
            ]);
        }

        return $errors;
    }

    private function jsonTypeMatches(mixed $value, string $type): bool
    {
        return match ($type) {
            'string' => is_string($value),
            'number' => is_int($value) || is_float($value),
            'integer' => is_int($value),
            'boolean' => is_bool($value),
            'array' => is_array($value) && array_is_list($value),
            'object' => is_array($value) && !array_is_list($value),
            'null' => $value === null,
            default => true,
        };
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
        return preg_match('/^[a-f0-9]{64}$/', $value) === 1;
    }
}
