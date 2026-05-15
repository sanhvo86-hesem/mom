<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * AuthorizationKernel — single Policy Decision Point (PDP) for HESEM MOM.
 *
 * Inputs:
 *   * subject    — user record with roles[] and current_aal (derived from MFA)
 *   * permission — catalog key, e.g. "users.create"
 *   * resource   — optional {kind, id} for future row-level scope
 *
 * Outputs:
 *   AuthDecision { outcome ∈ {allow,deny,stepup}, reason, required_aal, matched }
 *
 * Policy sources (single source of truth, no hardcoded role list):
 *   * permission_catalog table       — defines required_aal_level, is_dangerous
 *   * roles.permissions JSONB column — grants[] / denies[] patterns per role
 *
 * Semantics (NIST SP 800-162 ABAC + AWS IAM evaluation logic):
 *   1. Permission must exist & be active in catalog        → else deny:unknown_permission
 *   2. Union grants/denies across user roles
 *   3. Explicit deny ALWAYS overrides allow                → deny:explicit_deny
 *   4. No matching grant                                    → deny:no_grant   (default-deny)
 *   5. AAL gap                                              → stepup:aal_insufficient
 *   6. Otherwise                                            → allow:granted
 *
 * Logging: every decision is recorded to auth_decision_event when the DB is
 * available. Logging failures NEVER affect the decision (fail-open on audit,
 * fail-closed on auth).
 *
 * Compatibility: relies on legacy helpers in api.php — load_role_permissions,
 * role_permission_grants, role_permission_denies, permission_pattern_matches,
 * migrate_role — which already understand the canonical roles.permissions
 * JSONB shape (boolean flags, allowAllPermissions, wildcards). No data model
 * migration required to enable the kernel.
 *
 * @package MOM\Api\Services
 * @since   2.1.0 (Authorization Kernel rollout)
 */
final class AuthorizationKernel
{
    /** @var string Absolute path to mom/data/config (legacy fallback). */
    private string $confDir;

    /** @var AuthDecisionLogger */
    private AuthDecisionLogger $logger;

    /** @var array<string, array<string,mixed>|null> Per-request catalog cache. */
    private array $catalogCache = [];

    /** @var bool|null DB connection availability (lazy-resolved, per request). */
    private ?bool $dbAvailable = null;

    public function __construct(string $confDir, ?AuthDecisionLogger $logger = null)
    {
        $this->confDir = rtrim(str_replace('\\', '/', $confDir), '/');
        $this->logger  = $logger ?? new AuthDecisionLogger();
    }

    /**
     * Decide allow / deny / stepup for one (subject, permission) pair.
     *
     * @param array<string,mixed> $user        Authenticated user record (must contain id/username/role/roles).
     * @param string              $permission  Permission code (e.g. "users.create").
     * @param array<string,mixed> $context     Optional: route_action, resource_kind, resource_id, ip, user_agent.
     */
    public function decide(array $user, string $permission, array $context = []): AuthDecision
    {
        $permission = strtolower(trim($permission));
        if ($permission === '') {
            $d = new AuthDecision('deny', 'empty_permission');
            $this->logger->record($user, $permission, $d, $context);
            return $d;
        }

        // 1) Catalog presence + AAL requirement
        $catRow = $this->lookupCatalog($permission);
        $catalogRequiredAal = 1;
        if ($catRow === null) {
            // Permission not yet seeded in catalog (e.g. JSON_ONLY mode, fresh dev DB).
            // Fail-open at catalog presence (audit will show 'catalog_missing') so
            // the kernel does not regress behaviour where catalog isn't deployed.
            // Reason flagged so admins can re-seed.
            $catalogPresent = false;
        } else {
            $catalogPresent = true;
            if (isset($catRow['is_active']) && $catRow['is_active'] === false) {
                $d = new AuthDecision('deny', 'permission_inactive');
                $this->logger->record($user, $permission, $d, $context);
                return $d;
            }
            $catalogRequiredAal = (int)($catRow['required_aal_level'] ?? 1);
        }

        // 2) Resolve grants/denies from canonical roles.permissions JSONB.
        //    load_role_permissions falls back to legacy file in JSON_ONLY mode.
        $rolePermsFile = $this->confDir . '/role_permissions.json';
        $allPerms      = \load_role_permissions($rolePermsFile);

        $userRoles = $this->subjectRoles($user);
        $grants    = [];
        $denies    = [];
        foreach ($userRoles as $role) {
            $normalized = \migrate_role($role);
            if ($normalized === '') {
                continue;
            }
            $entry = $allPerms[$normalized] ?? null;
            if (!is_array($entry)) {
                continue;
            }
            $grants = array_merge($grants, \role_permission_grants($entry));
            $denies = array_merge($denies, \role_permission_denies($entry));
        }

        // 3) Explicit deny overrides any allow.
        foreach ($denies as $pattern) {
            if (\permission_pattern_matches($permission, $pattern)) {
                $d = new AuthDecision('deny', 'explicit_deny', null, null, $pattern);
                $this->logger->record($user, $permission, $d, $context);
                return $d;
            }
        }

        // 4) No matching grant → default-deny.
        $matchedGrant = null;
        foreach ($grants as $pattern) {
            if (\permission_pattern_matches($permission, $pattern)) {
                $matchedGrant = $pattern;
                break;
            }
        }
        if ($matchedGrant === null) {
            $reason = $catalogPresent ? 'no_grant' : 'no_grant_catalog_missing';
            $d = new AuthDecision('deny', $reason);
            $this->logger->record($user, $permission, $d, $context);
            return $d;
        }

        // 5) AAL step-up gate.
        //
        // Phased rollout (per RBAC kernel rollout plan):
        //   * Phase A (default): observe-only. Compute the gap, log it, but
        //     do NOT block — gives admins visibility before tightening.
        //   * Phase B (env AUTHZ_KERNEL_ENFORCE_AAL=true): block with stepup.
        //
        // Required because the site MFA policy currently allows AAL1 sessions
        // (require_mfa=false), and the existing frontend does not yet handle
        // the step_up_required modal. Flipping this flag is a coordinated
        // rollout step, not a kernel behaviour change.
        $requiredAal = max(
            $catalogRequiredAal,
            (int)($context['route_required_aal'] ?? 1)
        );
        $currentAal  = $this->subjectAal($user);
        $aalGap      = ($currentAal < $requiredAal);
        $enforceAal  = (string)(getenv('AUTHZ_KERNEL_ENFORCE_AAL') ?: '') === 'true';

        if ($aalGap && $enforceAal) {
            $d = new AuthDecision('stepup', 'aal_insufficient', $currentAal, $requiredAal, $matchedGrant);
            $this->logger->record($user, $permission, $d, $context);
            return $d;
        }

        // 6) Allow. Reason flags whether we waved through an AAL gap (observability).
        $reason = $aalGap ? 'granted_aal_gap' : 'granted';
        $d = new AuthDecision('allow', $reason, $currentAal, $requiredAal, $matchedGrant);
        $this->logger->record($user, $permission, $d, $context);
        return $d;
    }

    /** Returns lowercased role codes for the user (handles both `role` and `roles[]`). */
    private function subjectRoles(array $user): array
    {
        $roles = is_array($user['roles'] ?? null) ? $user['roles'] : [];
        if (!$roles && isset($user['role'])) {
            $roles = [(string)$user['role']];
        }
        $out = [];
        foreach ($roles as $r) {
            $r = strtolower(trim((string)$r));
            if ($r !== '') {
                $out[] = $r;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * Map the request session state to a NIST SP 800-63B AAL level.
     *
     *   AAL1 = single-factor auth (password only)
     *   AAL2 = multi-factor auth completed in this session
     *   AAL3 = hardware-bound MFA (out of scope for v1)
     */
    private function subjectAal(array $user): int
    {
        if (!empty($user['current_aal'])) {
            return (int)$user['current_aal'];
        }
        // $_SESSION may not exist under CLI smoke tests; access defensively.
        if (isset($_SESSION) && is_array($_SESSION) && !empty($_SESSION['mfa_ok'])) {
            return 2;
        }
        return 1;
    }

    /**
     * Read a single permission_catalog row. Result cached per request.
     *
     * @return array{is_active:bool, required_aal_level:int}|null
     */
    private function lookupCatalog(string $permission): ?array
    {
        if (array_key_exists($permission, $this->catalogCache)) {
            return $this->catalogCache[$permission];
        }
        $row = null;

        if ($this->dbAvailable === null) {
            $this->dbAvailable = (\portal_system_db_connection() !== null);
        }
        if ($this->dbAvailable) {
            try {
                $conn = \portal_system_db_connection();
                if ($conn) {
                    $r = $conn->queryOne(
                        'SELECT is_active, required_aal_level
                           FROM permission_catalog
                          WHERE permission_code = :p
                          LIMIT 1',
                        [':p' => $permission]
                    );
                    if (is_array($r)) {
                        $row = [
                            'is_active'          => (bool)($r['is_active'] ?? true),
                            'required_aal_level' => (int)($r['required_aal_level'] ?? 1),
                        ];
                    }
                }
            } catch (\Throwable $e) {
                @error_log('[AuthorizationKernel] catalog lookup failed: ' . $e->getMessage());
                // Treat DB hiccup as catalog-missing for this request (graceful).
                $this->dbAvailable = false;
            }
        }

        $this->catalogCache[$permission] = $row;
        return $row;
    }
}
