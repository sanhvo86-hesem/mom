<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Standard Library Manifest registry (HESEM UoM V3 P01 deliverable).
 *
 * The manifest model replaces legacy seed impersonation for standard UoM
 * conversions. P04 locks activation behind a real active UUID user, the
 * canonical roles.permissions RBAC grant, explicit signature meaning, and an
 * append-only audit event. AI/service/system actors are not approval authority.
 */
final class UomStandardLibraryManifestService
{
    public const APPROVE_PERMISSION = 'uom.standard_library_manifest.approve';

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

    private const ALLOWED_STANDARD_RULE_CATEGORIES = [
        'exact_linear',
        'defined_linear',
        'affine',
        'dimensionless_strict',
        'ratio',
    ];

    private const CONTEXT_REQUIRED_RULE_CATEGORIES = [
        'density_based',
        'potency_assay',
        'packaging_policy',
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
                ':tv' => $input['title_vi'] ?? null,
                ':de' => $input['description'] ?? null,
                ':dv' => $input['description_vi'] ?? null,
                ':sa' => $input['source_authority'],
                ':sc' => $input['source_citation_uri'] ?? null,
                ':ev' => $input['evidence_artifact_uri'] ?? null,
                ':ra' => $input['registered_by_actor'],
                ':ef' => $input['effective_from'] ?? null,
                ':et' => $input['effective_to'] ?? null,
            ]
        );

        return $row ?? [];
    }

    public function approveManifest(
        string $manifestId,
        string $approverUserId,
        ?string $signatureMeaning = null,
        ?string $traceId = null
    ): array {
        $current = $this->loadManifest($manifestId);

        if ($current['lifecycle_status'] === 'active') {
            return $current;
        }
        if (!in_array($current['lifecycle_status'], ['draft', 'pending_review'], true)) {
            throw new UomException(
                'UOM_MANIFEST_INVALID_TRANSITION',
                "Manifest '{$manifestId}' lifecycle_status="
                . $current['lifecycle_status'] . " cannot transition to active.",
                422
            );
        }

        $actor = $this->loadManifestApprovalActor($approverUserId);
        $this->assertSignatureMeaning($signatureMeaning);
        $before = $this->manifestAuditSnapshot($current);

        $row = $this->db->queryOne(
            "UPDATE uom_standard_library_manifest
                SET lifecycle_status = 'active',
                    approved_by      = :ap::uuid,
                    approved_at      = COALESCE(approved_at, now())
              WHERE id = :id
              RETURNING id, manifest_code, lifecycle_status, approved_by,
                        approved_at, source_authority, source_citation_uri,
                        evidence_artifact_uri, effective_from, effective_to",
            [':id' => $manifestId, ':ap' => $approverUserId]
        );

        $after = $row ?? [];
        $this->writeAudit(
            'uom.standard_library_manifest.approve',
            'uom_standard_library_manifest',
            $manifestId,
            $actor,
            [
                'permission' => self::APPROVE_PERMISSION,
                'source_authority' => (string)($current['source_authority'] ?? ''),
                'before' => $before,
                'after' => $this->manifestAuditSnapshot($after),
                'signature_meaning' => trim((string)$signatureMeaning),
                'trace_id' => $this->traceId($traceId),
            ]
        );

        return $after;
    }

    public function linkRuleToManifest(
        string $ruleId,
        string $manifestId,
        string $actorUserId,
        ?string $traceId = null
    ): array {
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
        if (!$this->isCurrentlyEffective($manifest)) {
            throw new UomException(
                'UOM_MANIFEST_NOT_EFFECTIVE',
                "Manifest '{$manifestId}' is not effective on the current date.",
                409
            );
        }

        $actor = $this->loadManifestApprovalActor($actorUserId);
        $before = $this->loadRuleForManifestLink($ruleId);
        $this->assertRuleCanUseStandardManifest($before);

        $row = $this->db->queryOne(
            "UPDATE uom_conversion_rule
                SET standard_library_manifest_id = :mid::uuid
              WHERE id = :rid::uuid
              RETURNING id, rule_code, category, context_required,
                        standard_library_manifest_id, lifecycle_status",
            [':mid' => $manifestId, ':rid' => $ruleId]
        );

        if ($row === null) {
            throw new UomException(
                'UOM_RULE_NOT_FOUND',
                "Conversion rule '{$ruleId}' not found.",
                404
            );
        }

        $this->writeAudit(
            'uom.standard_library_manifest.link_rule',
            'uom_conversion_rule',
            $ruleId,
            $actor,
            [
                'permission' => self::APPROVE_PERMISSION,
                'source_authority' => (string)($manifest['source_authority'] ?? ''),
                'manifest_id' => $manifestId,
                'manifest_code' => (string)($manifest['manifest_code'] ?? ''),
                'before' => $this->ruleAuditSnapshot($before),
                'after' => $this->ruleAuditSnapshot($row),
                'trace_id' => $this->traceId($traceId),
            ]
        );

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
                AND effective_from <= CURRENT_DATE
                AND (effective_to IS NULL OR effective_to > CURRENT_DATE)
              ORDER BY source_authority ASC, manifest_code ASC",
            []
        );
    }

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
                    source_authority, source_citation_uri, evidence_artifact_uri,
                    effective_from, effective_to
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

    /**
     * @return array{
     *   user_id: string,
     *   username: string,
     *   full_name: string,
     *   role_code: string,
     *   user_status: string
     * }
     */
    private function loadManifestApprovalActor(string $actorUserId): array
    {
        if (!$this->isUuid($actorUserId)) {
            throw new UomException(
                'UOM_MANIFEST_AI_OR_SYSTEM_ACTOR_FORBIDDEN',
                'Manifest approval requires a real UUID user actor.',
                403
            );
        }

        $actor = $this->db->queryOne(
            'SELECT user_id, username, full_name, role_code, user_status
               FROM v_user_canonical
              WHERE user_id = :uid::uuid
              LIMIT 1',
            [':uid' => $actorUserId]
        );
        if ($actor === null) {
            throw new UomException(
                'UOM_MANIFEST_APPROVER_NOT_FOUND',
                "Manifest approver '{$actorUserId}' was not found in v_user_canonical.",
                404
            );
        }
        if (($actor['user_status'] ?? '') !== 'active') {
            throw new UomException(
                'UOM_MANIFEST_APPROVER_INACTIVE',
                "Manifest approver '{$actorUserId}' is not active.",
                403
            );
        }
        if ($this->looksLikeSystemActor((string)($actor['username'] ?? ''))) {
            throw new UomException(
                'UOM_MANIFEST_AI_OR_SYSTEM_ACTOR_FORBIDDEN',
                'AI, bot, service, and system actors cannot approve UoM manifests.',
                403
            );
        }

        if (!$this->actorHasPermission($actorUserId, (string)($actor['role_code'] ?? ''))) {
            throw new UomException(
                'UOM_MANIFEST_APPROVE_FORBIDDEN',
                "Actor '{$actorUserId}' does not hold " . self::APPROVE_PERMISSION . '.',
                403
            );
        }

        return [
            'user_id' => (string)$actor['user_id'],
            'username' => (string)($actor['username'] ?? ''),
            'full_name' => (string)($actor['full_name'] ?? ''),
            'role_code' => (string)($actor['role_code'] ?? ''),
            'user_status' => (string)($actor['user_status'] ?? ''),
        ];
    }

    private function actorHasPermission(string $actorUserId, string $primaryRoleCode): bool
    {
        $roles = $this->db->query(
            "SELECT role_code, permissions
               FROM roles
              WHERE is_active = TRUE
                AND role_code = NULLIF(:primary_role, '')
              UNION
             SELECT r.role_code, r.permissions
               FROM user_roles ur
               JOIN roles r ON r.role_id = ur.role_id
              WHERE ur.user_id = :uid::uuid
                AND (ur.valid_to IS NULL OR ur.valid_to > now())
                AND r.is_active = TRUE",
            [
                ':uid' => $actorUserId,
                ':primary_role' => $primaryRoleCode,
            ]
        );

        $grants = [];
        $denies = [];
        foreach ($roles as $role) {
            $permissions = $this->decodePermissions($role['permissions'] ?? null);
            $grants = array_merge($grants, $this->permissionList($permissions['permissions'] ?? []));
            $denies = array_merge($denies, $this->permissionList($permissions['denies'] ?? []));

            if (($permissions['allowAllPermissions'] ?? false) === true) {
                $grants[] = '*';
            }
            foreach ($permissions as $code => $enabled) {
                if ($enabled === true && is_string($code) && str_contains($code, '.')) {
                    $grants[] = $code;
                }
            }
        }

        foreach (array_unique($denies) as $pattern) {
            if ($this->permissionPatternMatches(self::APPROVE_PERMISSION, $pattern)) {
                return false;
            }
        }
        foreach (array_unique($grants) as $pattern) {
            if ($this->permissionPatternMatches(self::APPROVE_PERMISSION, $pattern)) {
                return true;
            }
        }
        return false;
    }

    private function loadRuleForManifestLink(string $ruleId): array
    {
        $row = $this->db->queryOne(
            'SELECT id, rule_code, category, context_required,
                    standard_library_manifest_id, lifecycle_status
               FROM uom_conversion_rule
              WHERE id = :rid::uuid',
            [':rid' => $ruleId]
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

    private function assertRuleCanUseStandardManifest(array $rule): void
    {
        $category = (string)($rule['category'] ?? '');
        if ((bool)($rule['context_required'] ?? false)
            || in_array($category, self::CONTEXT_REQUIRED_RULE_CATEGORIES, true)
        ) {
            throw new UomException(
                'UOM_MANIFEST_RULE_CONTEXT_REQUIRED',
                "Rule '{$rule['rule_code']}' requires contextual governance and cannot be sponsored by a standard library manifest.",
                409
            );
        }
        if (!in_array($category, self::ALLOWED_STANDARD_RULE_CATEGORIES, true)) {
            throw new UomException(
                'UOM_MANIFEST_RULE_CATEGORY_NOT_ALLOWED',
                "Rule '{$rule['rule_code']}' category '{$category}' is not standard-library-manifest eligible.",
                409
            );
        }
    }

    private function assertSignatureMeaning(?string $signatureMeaning): void
    {
        if (trim((string)$signatureMeaning) === '') {
            throw new UomException(
                'UOM_MANIFEST_SIGNATURE_MEANING_REQUIRED',
                'Manifest approval requires explicit signature meaning.',
                422
            );
        }
    }

    private function isCurrentlyEffective(array $row): bool
    {
        $today = new \DateTimeImmutable('today');
        $from = new \DateTimeImmutable((string)($row['effective_from'] ?? 'today'));
        if ($from > $today) {
            return false;
        }
        if (($row['effective_to'] ?? null) === null || (string)$row['effective_to'] === '') {
            return true;
        }
        return new \DateTimeImmutable((string)$row['effective_to']) > $today;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodePermissions(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @return list<string>
     */
    private function permissionList(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }
        $out = [];
        foreach ($raw as $permission) {
            $permission = strtolower(trim((string)$permission));
            if ($permission !== '') {
                $out[] = $permission;
            }
        }
        return $out;
    }

    private function permissionPatternMatches(string $permission, string $pattern): bool
    {
        $permission = strtolower(trim($permission));
        $pattern = strtolower(trim($pattern));
        if ($pattern === '*' || $permission === $pattern) {
            return true;
        }
        if (str_ends_with($pattern, '.*')) {
            return str_starts_with($permission, substr($pattern, 0, -1));
        }
        return false;
    }

    private function isUuid(string $value): bool
    {
        return preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $value
        ) === 1;
    }

    private function looksLikeSystemActor(string $username): bool
    {
        return preg_match('/^(ai|bot|svc|service|system)[._-]/i', $username) === 1;
    }

    private function traceId(?string $traceId): string
    {
        $traceId = trim((string)$traceId);
        return $traceId !== '' ? $traceId : 'uom-manifest-' . gmdate('YmdHis');
    }

    /**
     * @param array<string, mixed> $actor
     * @param array<string, mixed> $payload
     */
    private function writeAudit(
        string $eventType,
        string $aggregateType,
        string $aggregateId,
        array $actor,
        array $payload
    ): void {
        $payload['actor'] = [
            'user_id' => $actor['user_id'] ?? '',
            'username' => $actor['username'] ?? '',
            'role_code' => $actor['role_code'] ?? '',
        ];
        $this->db->execute(
            "INSERT INTO audit_events (
                event_type, aggregate_type, aggregate_id,
                actor_id, actor_name, payload, metadata, recorded_at
             ) VALUES (
                :event_type, :aggregate_type, :aggregate_id,
                :actor_id::uuid, :actor_name, :payload::jsonb,
                :metadata::jsonb, now()
             )",
            [
                ':event_type' => $eventType,
                ':aggregate_type' => $aggregateType,
                ':aggregate_id' => $aggregateId,
                ':actor_id' => (string)($actor['user_id'] ?? ''),
                ':actor_name' => (string)($actor['username'] ?? ''),
                ':payload' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
                ':metadata' => json_encode([
                    'source' => self::class,
                    'prompt' => 'UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCK',
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
            ]
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function manifestAuditSnapshot(array $row): array
    {
        return [
            'id' => $row['id'] ?? null,
            'manifest_code' => $row['manifest_code'] ?? null,
            'lifecycle_status' => $row['lifecycle_status'] ?? null,
            'approved_by' => $row['approved_by'] ?? null,
            'approved_at' => $row['approved_at'] ?? null,
            'source_authority' => $row['source_authority'] ?? null,
            'source_citation_uri' => $row['source_citation_uri'] ?? null,
            'evidence_artifact_uri' => $row['evidence_artifact_uri'] ?? null,
            'effective_from' => $row['effective_from'] ?? null,
            'effective_to' => $row['effective_to'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function ruleAuditSnapshot(array $row): array
    {
        return [
            'id' => $row['id'] ?? null,
            'rule_code' => $row['rule_code'] ?? null,
            'category' => $row['category'] ?? null,
            'context_required' => $row['context_required'] ?? null,
            'standard_library_manifest_id' => $row['standard_library_manifest_id'] ?? null,
            'lifecycle_status' => $row['lifecycle_status'] ?? null,
        ];
    }
}
