<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use PDO;
use RuntimeException;

/**
 * RBAC + governance service.
 *
 * Owns the cross-table queries that the GenericCrudController cannot answer:
 *   * effective permission resolution for a user (role × permission_catalog ×
 *     module_permission × document_permission_grant)
 *   * Separation-of-Duties pre-check before assigning a role
 *   * MFA factor admin operations (revoke, reset, recovery-code regenerate)
 *   * View-backed read endpoints (v_documents_in_force,
 *     v_document_pending_acknowledgement, v_portal_effective_layout,
 *     v_retention_due_for_disposal)
 *
 * Every mutation goes through the audit trail and DataLayer where the data
 * has both JSON and PG storage paths.
 *
 * @package MOM\Api\Services
 */
class RbacService
{
    private DataLayer $data;
    private Connection $db;

    public function __construct(DataLayer $data)
    {
        $this->data = $data;
        $portalRoot = dirname(__DIR__, 2);
        $config = (array)(require $portalRoot . '/database/config.php');
        $this->db = Connection::getInstance($config);
    }

    // ── User resolver ───────────────────────────────────────────────────────

    /** Resolve a username (file-backed session id) to the canonical users.user_id UUID. */
    public function resolveUserIdByUsername(string $username): string
    {
        if ($username === '') {
            return '';
        }
        $row = $this->db->queryOne(
            'SELECT user_id FROM users WHERE LOWER(username) = LOWER(:u) LIMIT 1',
            [':u' => $username]
        );
        return is_array($row) ? (string)$row['user_id'] : '';
    }

    // ── Effective permissions ───────────────────────────────────────────────

    /**
     * Resolve the effective permission grants a user holds.
     *
     * @return array{
     *     user: array<string, mixed>,
     *     roles: array<int, array<string, mixed>>,
     *     module_permissions: array<int, array<string, mixed>>,
     *     document_grants: array<int, array<string, mixed>>,
     *     permission_codes: array<int, string>,
     *     mfa_compliance: array<string, mixed>|null,
     * }
     */
    public function effectivePermissionsForUser(string $userId): array
    {
        $user = $this->db->queryOne(
            'SELECT user_id, username, full_name, dept_code, primary_role_id, status
             FROM users WHERE user_id = :id LIMIT 1',
            [':id' => $userId]
        );
        if (!$user) {
            return [
                'user' => [],
                'roles' => [],
                'module_permissions' => [],
                'document_grants' => [],
                'permission_codes' => [],
                'mfa_compliance' => null,
            ];
        }

        $roles = $this->db->query(
            'SELECT r.role_id, r.role_code, r.role_label, r.role_label_vi,
                    r.dept_code, r.is_admin_tier, r.rank_level, r.icon_emoji,
                    r.badge_color_token, r.permissions, ur.assigned_at, ur.valid_to
             FROM user_roles ur
             JOIN roles r ON r.role_id = ur.role_id
             WHERE ur.user_id = :uid
               AND (ur.valid_to IS NULL OR ur.valid_to > now())
               AND (r.deleted_at IS NULL)
             ORDER BY r.rank_level ASC, r.role_code',
            [':uid' => $userId]
        );

        $modulePerms = [];
        if ($roles !== []) {
            $roleIds = array_column($roles, 'role_id');
            $placeholders = [];
            $params = [];
            foreach ($roleIds as $i => $rid) {
                $placeholders[] = ':r' . $i;
                $params[':r' . $i] = $rid;
            }
            $modulePerms = $this->db->query(
                'SELECT mp.module_permission_id, mp.role_id, mp.module_code,
                        mp.can_view, mp.can_create, mp.can_update, mp.can_delete,
                        mp.can_approve, mp.can_export, mp.scope, mp.notes,
                        mc.label AS module_label, mc.label_vi AS module_label_vi,
                        mc.icon_token AS module_icon_token
                 FROM module_permission mp
                 JOIN modules_catalog mc ON mc.module_code = mp.module_code
                 WHERE mp.role_id IN (' . implode(',', $placeholders) . ')
                   AND mp.deleted_at IS NULL
                   AND mc.is_active = TRUE
                 ORDER BY mc.sort_order, mc.module_code',
                $params
            );
        }

        $docGrants = $this->db->query(
            'SELECT grant_id, subject_type, subject_id, doc_pattern, action, effect,
                    reason, expires_at, granted_by, granted_at, is_emergency
             FROM document_permission_grant
             WHERE deleted_at IS NULL
               AND revoked_at IS NULL
               AND (expires_at IS NULL OR expires_at > now())
               AND (
                   (subject_type = :u_kind   AND subject_id = :u_id)
                OR (subject_type = :r_kind   AND subject_id = ANY(:r_ids))
                OR (subject_type = :d_kind   AND subject_id = :d_code)
               )
             ORDER BY effect DESC, granted_at DESC',
            [
                ':u_kind' => 'user',
                ':u_id'   => (string)($user['username'] ?? ''),
                ':r_kind' => 'role',
                ':r_ids'  => '{' . implode(',', array_map(static fn($r) => (string)$r['role_code'], $roles)) . '}',
                ':d_kind' => 'dept',
                ':d_code' => (string)($user['dept_code'] ?? ''),
            ]
        );

        $codes = [];
        foreach ($roles as $r) {
            $perms = is_array($r['permissions'] ?? null) ? $r['permissions'] : (array)json_decode((string)$r['permissions'], true);
            foreach ($perms as $code => $val) {
                // Strict bool true only — role.permissions JSONB stores both
                // permission flags AND metadata (icon emoji, color, level), so
                // truthy-coerce would incorrectly include 'icon' / 'color' keys.
                if ($val === true && is_string($code) && $code !== '' && !in_array($code, ['icon','color','label','dept','level'], true)) {
                    $codes[$code] = true;
                }
            }
        }
        foreach ($modulePerms as $mp) {
            foreach (['view','create','update','delete','approve','export'] as $verb) {
                if ((bool)($mp['can_' . $verb] ?? false)) {
                    $codes[$mp['module_code'] . '.' . $verb] = true;
                }
            }
        }

        $compliance = $this->db->queryOne(
            'SELECT compliance_state, active_factor_count, max_aal_achieved,
                    policy_required, policy_min_factors, policy_aal, grace_days
             FROM v_mfa_user_compliance WHERE user_id = :uid LIMIT 1',
            [':uid' => $userId]
        );

        return [
            'user' => $user,
            'roles' => $roles,
            'module_permissions' => $modulePerms,
            'document_grants' => $docGrants,
            'permission_codes' => array_values(array_keys($codes)),
            'mfa_compliance' => $compliance ?: null,
        ];
    }

    // ── Separation of Duties ────────────────────────────────────────────────

    /**
     * @return array<int, array<string, mixed>>
     */
    public function sodConflictsForRoleAddition(string $userId, string $newRoleId): array
    {
        return $this->db->query(
            'SELECT c.conflict_id, c.severity, c.label, c.label_vi, c.rationale,
                    c.compliance_refs, ra.role_code AS existing_role_code,
                    rb.role_code AS new_role_code
             FROM role_sod_conflict c
             JOIN user_roles ur
               ON (ur.role_id = c.role_a_id OR ur.role_id = c.role_b_id)
             JOIN roles ra ON ra.role_id = ur.role_id
             JOIN roles rb ON rb.role_id = :new_role
             WHERE ur.user_id = :uid
               AND c.is_active = TRUE
               AND c.deleted_at IS NULL
               AND (
                   (c.role_a_id = ur.role_id AND c.role_b_id = :new_role)
                OR (c.role_b_id = ur.role_id AND c.role_a_id = :new_role)
               )',
            [':uid' => $userId, ':new_role' => $newRoleId]
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function currentSodViolations(): array
    {
        return $this->db->query(
            "SELECT c.conflict_id, c.severity, c.label, c.label_vi,
                    c.rationale, c.compliance_refs,
                    ura.user_id, u.username, u.full_name,
                    ra.role_code AS role_a_code, rb.role_code AS role_b_code
             FROM role_sod_conflict c
             JOIN user_roles ura ON ura.role_id = c.role_a_id
             JOIN user_roles urb ON urb.role_id = c.role_b_id AND urb.user_id = ura.user_id
             JOIN roles ra ON ra.role_id = c.role_a_id
             JOIN roles rb ON rb.role_id = c.role_b_id
             JOIN users u ON u.user_id = ura.user_id
             WHERE c.is_active = TRUE
               AND c.deleted_at IS NULL
               AND (ura.valid_to IS NULL OR ura.valid_to > now())
               AND (urb.valid_to IS NULL OR urb.valid_to > now())
             ORDER BY
                 CASE c.severity WHEN 'block' THEN 0 WHEN 'warn' THEN 1 ELSE 2 END,
                 u.username, c.label"
        );
    }

    // ── Role assignment with SoD pre-check ──────────────────────────────────

    /**
     * @return array<string, mixed>  {ok:bool, role_id, conflicts?, audit_event_id?}
     */
    public function assignRole(string $userId, string $roleId, string $actorUserId, ?string $reason = null, bool $waiveSod = false): array
    {
        $conflicts = $this->sodConflictsForRoleAddition($userId, $roleId);
        $blockers = array_values(array_filter($conflicts, static fn($c) => ($c['severity'] ?? '') === 'block'));

        if ($blockers !== [] && !$waiveSod) {
            return ['ok' => false, 'error' => 'sod_block', 'conflicts' => $conflicts];
        }
        if ($conflicts !== [] && $waiveSod && ($reason === null || strlen(trim($reason)) < 10)) {
            return ['ok' => false, 'error' => 'sod_waiver_reason_required', 'conflicts' => $conflicts];
        }

        $this->db->transactional(function () use ($userId, $roleId, $actorUserId): void {
            $this->db->execute(
                'INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by, valid_from)
                 VALUES (:uid, :rid, now(), :actor, now())
                 ON CONFLICT (user_id, role_id) DO UPDATE
                   SET assigned_at = EXCLUDED.assigned_at,
                       assigned_by = EXCLUDED.assigned_by,
                       valid_to    = NULL',
                [':uid' => $userId, ':rid' => $roleId, ':actor' => $actorUserId]
            );
        });

        $this->writeAudit('rbac.role.assign', 'user', $userId, $actorUserId, [
            'role_id' => $roleId,
            'sod_conflicts' => $conflicts,
            'waive_sod' => $waiveSod,
            'reason' => $reason,
        ]);

        return ['ok' => true, 'role_id' => $roleId, 'conflicts' => $conflicts];
    }

    /**
     * @return array<string, mixed>
     */
    public function revokeRole(string $userId, string $roleId, string $actorUserId, ?string $reason = null): array
    {
        $this->db->execute(
            'UPDATE user_roles SET valid_to = now()
             WHERE user_id = :uid AND role_id = :rid AND (valid_to IS NULL OR valid_to > now())',
            [':uid' => $userId, ':rid' => $roleId]
        );
        $this->writeAudit('rbac.role.revoke', 'user', $userId, $actorUserId, [
            'role_id' => $roleId,
            'reason' => $reason,
        ]);
        return ['ok' => true, 'role_id' => $roleId];
    }

    // ── MFA admin ───────────────────────────────────────────────────────────

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listFactorsForUser(string $userId): array
    {
        return $this->db->query(
            'SELECT factor_id, factor_type, factor_label, status, aal_level,
                    last_used_at, last_used_ip, enrolled_at, activated_at,
                    revoked_at, revoke_reason
             FROM mfa_factor
             WHERE user_id = :uid AND deleted_at IS NULL
             ORDER BY enrolled_at DESC',
            [':uid' => $userId]
        );
    }

    public function revokeFactor(string $factorId, string $actorUserId, string $reason): array
    {
        if (strlen(trim($reason)) < 10) {
            return ['ok' => false, 'error' => 'revoke_reason_required'];
        }
        $row = $this->db->queryOne(
            "UPDATE mfa_factor
                SET status        = 'revoked',
                    revoked_at    = now(),
                    revoked_by    = :actor::uuid,
                    revoke_reason = :reason
              WHERE factor_id = :fid::uuid AND status = 'active'
              RETURNING factor_id, user_id, factor_type, status",
            [':actor' => $actorUserId, ':reason' => $reason, ':fid' => $factorId]
        );
        if (!$row) {
            return ['ok' => false, 'error' => 'factor_not_active_or_missing'];
        }
        $this->writeAudit('mfa.factor.revoke', 'user', (string)$row['user_id'], $actorUserId, [
            'factor_id' => $factorId,
            'factor_type' => $row['factor_type'],
            'reason' => $reason,
        ]);
        return ['ok' => true, 'factor' => $row];
    }

    public function resetAllFactors(string $userId, string $actorUserId, string $reason): array
    {
        if (strlen(trim($reason)) < 10) {
            return ['ok' => false, 'error' => 'reset_reason_required'];
        }
        $rows = $this->db->query(
            "UPDATE mfa_factor
                SET status        = 'revoked',
                    revoked_at    = now(),
                    revoked_by    = :actor::uuid,
                    revoke_reason = :reason
              WHERE user_id = :uid::uuid AND status IN ('active','pending_verify','locked')
              RETURNING factor_id, factor_type",
            [':actor' => $actorUserId, ':reason' => $reason, ':uid' => $userId]
        );
        $this->writeAudit('mfa.factor.reset_all', 'user', $userId, $actorUserId, [
            'revoked_count' => count($rows),
            'reason' => $reason,
        ]);
        return ['ok' => true, 'revoked_count' => count($rows), 'factors' => $rows];
    }

    // ── View-backed read endpoints ──────────────────────────────────────────

    /**
     * @return array<int, array<string, mixed>>
     */
    public function documentsInForce(int $limit = 200, int $offset = 0): array
    {
        return $this->db->query(
            'SELECT * FROM v_documents_in_force ORDER BY effective_from DESC NULLS LAST LIMIT :l OFFSET :o',
            [':l' => max(1, min(500, $limit)), ':o' => max(0, $offset)]
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function documentsPendingAckForUser(string $userId, int $limit = 100): array
    {
        return $this->db->query(
            'SELECT doc_id, doc_type, title, title_vi, current_rev,
                    effective_from, due_at, due_state
             FROM v_document_pending_acknowledgement
             WHERE user_id = :uid::uuid
             ORDER BY due_at ASC NULLS LAST LIMIT :l',
            [':uid' => $userId, ':l' => max(1, min(500, $limit))]
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function retentionDueForDisposal(int $limit = 200, bool $excludeBlocked = false): array
    {
        $sql = 'SELECT * FROM v_retention_due_for_disposal';
        if ($excludeBlocked) {
            $sql .= ' WHERE hold_blocks_disposal = FALSE';
        }
        $sql .= ' ORDER BY due_at ASC LIMIT :l';
        return $this->db->query($sql, [':l' => max(1, min(500, $limit))]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function effectiveLayoutForUser(string $userId): ?array
    {
        return $this->db->queryOne(
            'SELECT * FROM v_portal_effective_layout WHERE user_id = :uid::uuid LIMIT 1',
            [':uid' => $userId]
        ) ?: null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function accessReviewProgress(): array
    {
        return $this->db->query(
            'SELECT * FROM v_access_review_campaign_progress
             ORDER BY scheduled_for DESC NULLS LAST LIMIT 50'
        );
    }

    // ── Audit helper ────────────────────────────────────────────────────────

    /**
     * @param array<string, mixed> $payload
     */
    private function writeAudit(string $eventType, string $aggregateType, string $aggregateId, string $actorUserId, array $payload): void
    {
        try {
            $this->db->execute(
                "INSERT INTO audit_events
                    (event_id, event_type, aggregate_type, aggregate_id, actor_id, payload, recorded_at)
                 VALUES
                    (uuid_generate_v4(), :ev, :at, :aid, NULLIF(:actor, '')::uuid, :payload::jsonb, now())",
                [
                    ':ev' => $eventType,
                    ':at' => $aggregateType,
                    ':aid' => $aggregateId,
                    ':actor' => $actorUserId,
                    ':payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}',
                ]
            );
        } catch (\Throwable $e) {
            @error_log('[RbacService] audit write failed: ' . $e->getMessage());
        }
    }
}
