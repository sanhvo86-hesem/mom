<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

/**
 * Fail-closed policy for legacy mutation surfaces that used to write files/JSON.
 *
 * These endpoints may stay available for read/import compatibility, but they
 * must not remain an authoritative write path for governed records.
 */
final class LegacyWriteSurfacePolicy
{
    /**
     * @return array{allowed: bool, status: int, error_code: string, message: string, canonical_path: string, surface: string, operation: string}
     */
    public function assess(string $surface, string $operation): array
    {
        $surface = $this->normalize($surface);
        $operation = $this->normalize($operation);

        return [
            'allowed' => false,
            'status' => 410,
            'error_code' => $this->errorCode($surface),
            'message' => $this->message($surface),
            'canonical_path' => $this->canonicalPath($surface),
            'surface' => $surface,
            'operation' => $operation,
        ];
    }

    private function errorCode(string $surface): string
    {
        return match ($surface) {
            'document_files' => 'canonical_document_command_required',
            'online_form_json' => 'canonical_form_command_required',
            'evidence_vault_json' => 'canonical_evidence_command_required',
            'product_passport_json' => 'canonical_genealogy_command_required',
            default => 'canonical_control_plane_command_required',
        };
    }

    private function message(string $surface): string
    {
        return match ($surface) {
            'document_files' => 'Document writes must use the canonical Document Control command path; legacy HTML/archive mutation is read-only compatibility.',
            'online_form_json' => 'Form issuance, submission, draft, and record-number writes must use the canonical Form/Evidence command path; legacy JSON mutation is read-only compatibility.',
            'evidence_vault_json' => 'Evidence writes and links must use canonical issuance/submission/finalization and typed evidence-link commands; legacy vault JSON mutation is read-only compatibility.',
            'product_passport_json' => 'Genealogy and product-passport writes must use the canonical digital-thread command path; legacy passport JSON mutation is read-only compatibility.',
            default => 'Governed writes must use canonical control-plane commands; legacy mutation surface is read-only compatibility.',
        };
    }

    private function canonicalPath(string $surface): string
    {
        // document_files is the file-backed authoring surface; the actual
        // REST endpoints are wired under `/api/v1/eqms/control-plane/documents/*`
        // (see mom/api/routes/eqms-control-plane-routes.php lines 15-23 and
        // docs/standards/37-document-translation-publication-workflow.md §9.1.2).
        return match ($surface) {
            'document_files' => '/api/v1/eqms/control-plane/documents/*',
            'online_form_json' => '/api/v1/eqms/control-plane/commands',
            'evidence_vault_json' => '/api/v1/eqms/control-plane/commands',
            'product_passport_json' => '/api/v1/eqms/genealogy/commands',
            default => '/api/v1/eqms/control-plane/commands',
        };
    }

    private function normalize(string $value): string
    {
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9_]+/', '_', $value) ?? '';
        return trim($value, '_');
    }
}
