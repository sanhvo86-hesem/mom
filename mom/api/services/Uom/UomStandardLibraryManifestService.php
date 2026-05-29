<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Standard Library Manifest registry (HESEM UoM V3 P01 deliverable).
 *
 * Mission
 * -------
 * A "standard conversion rule" — kg↔g, K↔°C, J↔kWh — is authoritative because
 * an international standards body (BIPM/SI, UCUM, QUDT, UNECE Rec 20, OPC UA
 * Part 8 …) says it is. Before V3, the only way to mark such a rule "approved"
 * was to UPDATE its `approved_by` column to the first user in the `users`
 * table. That impersonates a real human approver and was the exact pattern
 * the V3 hardening pack flagged as **HB-02**.
 *
 * The Standard Library Manifest replaces the impersonation:
 *   - A manifest names the authority (e.g. BIPM_SI) and cites its source.
 *   - A rule that wants `lifecycle_status='active'` without a human
 *     `approved_by` MUST reference a manifest row instead.
 *   - The Postgres CHECK constraint `uom_cr_approved_requires_owner`
 *     (migration 231) enforces this at the table level.
 *
 * Authority model — not yet pre-production, never to be called production:
 *   - `registerManifest` creates a `pending_review` row. Anyone may call.
 *   - `approveManifest` flips it to `active`. Today this requires a real
 *     UUID user; P11 (security/AI governance) will extend this with
 *     reviewer-role checks. AI cannot call this.
 *   - `linkRuleToManifest` binds an existing rule to an active manifest.
 */
final class UomStandardLibraryManifestService
{
    public const SOURCE_AUTHORITIES = [
        'BIPM_SI',
        'UCUM',
        'QUDT',
        'UNECE_REC20',
        'OPC_UA',
        'ISO',
        'IEC',
        'CIPM',
        'NIST',
        'ASTM',
        'HESEM_INTERNAL_STANDARD',
    ];

    public function __construct(private readonly Connection $db) {}

    /**
     * Register a new manifest. Returns the manifest row.
     *
     * @param array{
     *   manifest_code: string,
     *   title: string,
     *   title_vi?: string,
     *   description?: string,
     *   description_vi?: string,
     *   source_authority: string,
     *   source_citation_uri?: string,
     *   evidence_artifact_uri?: string,
     *   registered_by_actor: string,
     *   effective_from?: string,
     *   effective_to?: string|null,
     * } $input
     *
     * @throws UomException UOM_MANIFEST_INVALID_AUTHORITY  when authority not in catalog
     * @throws UomException UOM_MANIFEST_DUPLICATE          when manifest_code already exists
     */
    public function registerManifest(array $input): array
    {
        $this->validateAuthority($input['source_authority'] ?? '');

        $existing = $this->db->queryOne(
            'SELECT id FROM uom_standard_library_manifest WHERE manifest_code = :c',
            [':c' => $input['manifest_code'] ?? '']
        );
        if ($existing !== null) {
            throw new UomException(
                'UOM_MANIFEST_DUPLICATE',
                "Manifest code '{$input['manifest_code']}' already exists.",
                409
            );
        }

        $row = $this->db->queryOne(
            "INSERT INTO uom_standard_library_manifest (
                manifest_code, title, title_vi,
                description, description_vi,
                source_authority, source_citation_uri, evidence_artifact_uri,
                registered_by_actor, effective_from, effective_to,
                lifecycle_status
             ) VALUES (
                :mc, :ti, :tv,
                :de, :dv,
                :sa, :sc, :ev,
                :ra, COALESCE(:ef::date, CURRENT_DATE), :et::date,
                'pending_review'
             )
             RETURNING id, manifest_code, title, source_authority,
                       lifecycle_status, effective_from, effective_to,
                       registered_at",
            [
                ':mc' => $input['manifest_code'],
                ':ti' => $input['title'],
                ':tv' => $input['title_vi']             ?? null,
                ':de' => $input['description']          ?? null,
                ':dv' => $input['description_vi']       ?? null,
                ':sa' => $input['source_authority'],
                ':sc' => $input['source_citation_uri']  ?? null,
                ':ev' => $input['evidence_artifact_uri']?? null,
                ':ra' => $input['registered_by_actor'],
                ':ef' => $input['effective_from']       ?? null,
                ':et' => $input['effective_to']         ?? null,
            ]
        );

        return $row ?? [];
    }

    /**
     * Promote a manifest from pending_review → active.
     * Requires a real UUID approver. AI services MUST NOT call this.
     */
    public function approveManifest(string $manifestId, string $approverUserId): array
    {
        $current = $this->loadManifest($manifestId);

        if ($current['lifecycle_status'] === 'active') {
            return $current;
        }
        if (!in_array(
            $current['lifecycle_status'],
            ['draft', 'pending_review'],
            true
        )) {
            throw new UomException(
                'UOM_MANIFEST_INVALID_TRANSITION',
                "Manifest '{$manifestId}' lifecycle_status="
                . $current['lifecycle_status'] . " cannot transition to active.",
                422
            );
        }

        $row = $this->db->queryOne(
            "UPDATE uom_standard_library_manifest
                SET lifecycle_status = 'active',
                    approved_by      = :ap::uuid,
                    approved_at      = COALESCE(approved_at, now())
              WHERE id = :id
              RETURNING id, manifest_code, lifecycle_status, approved_by, approved_at",
            [':id' => $manifestId, ':ap' => $approverUserId]
        );

        return $row ?? [];
    }

    /**
     * Bind a conversion rule to a manifest. Rule must exist; manifest must
     * exist AND be `active`. The rule's `standard_library_manifest_id` is
     * set so the table-level CHECK constraint
     * `uom_cr_approved_requires_owner` is satisfied without an
     * `approved_by` impersonation.
     */
    public function linkRuleToManifest(string $ruleId, string $manifestId): array
    {
        $manifest = $this->loadManifest($manifestId);
        if ($manifest['lifecycle_status'] !== 'active') {
            throw new UomException(
                'UOM_MANIFEST_NOT_ACTIVE',
                "Manifest '{$manifestId}' is "
                . $manifest['lifecycle_status']
                . '; only an active manifest may sponsor a rule.',
                409
            );
        }

        $row = $this->db->queryOne(
            "UPDATE uom_conversion_rule
                SET standard_library_manifest_id = :mid::uuid,
                    updated_at                   = now()
              WHERE id = :rid::uuid
              RETURNING id, rule_code, standard_library_manifest_id, lifecycle_status",
            [':mid' => $manifestId, ':rid' => $ruleId]
        );

        if ($row === null) {
            throw new UomException(
                'UOM_RULE_NOT_FOUND',
                "Conversion rule '{$ruleId}' not found.",
                404
            );
        }
        return $row;
    }

    public function getManifestByCode(string $manifestCode): ?array
    {
        return $this->db->queryOne(
            'SELECT * FROM uom_standard_library_manifest WHERE manifest_code = :c',
            [':c' => $manifestCode]
        );
    }

    /**
     * @return list<array>
     */
    public function listActiveManifests(): array
    {
        return $this->db->query(
            "SELECT id, manifest_code, title, source_authority,
                    source_citation_uri, effective_from, effective_to
               FROM uom_standard_library_manifest
              WHERE lifecycle_status = 'active'
                AND (effective_to IS NULL OR effective_to > CURRENT_DATE)
              ORDER BY source_authority ASC, manifest_code ASC",
            []
        );
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private function validateAuthority(string $authority): void
    {
        if (!in_array($authority, self::SOURCE_AUTHORITIES, true)) {
            throw new UomException(
                'UOM_MANIFEST_INVALID_AUTHORITY',
                "source_authority '{$authority}' is not in the registered "
                . 'standards catalog. Allowed: '
                . implode(', ', self::SOURCE_AUTHORITIES),
                422
            );
        }
    }

    private function loadManifest(string $manifestId): array
    {
        $row = $this->db->queryOne(
            'SELECT id, manifest_code, lifecycle_status, approved_by, approved_at,
                    source_authority, effective_from, effective_to
               FROM uom_standard_library_manifest WHERE id = :id',
            [':id' => $manifestId]
        );
        if ($row === null) {
            throw new UomException(
                'UOM_MANIFEST_NOT_FOUND',
                "Manifest '{$manifestId}' not found.",
                404
            );
        }
        return $row;
    }
}
