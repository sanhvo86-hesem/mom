<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * Writes one row per AuthorizationKernel decision to auth_decision_event.
 *
 * Constraints:
 *   * Logging must NEVER affect the decision outcome — every Throwable is
 *     swallowed and emitted to error_log only.
 *   * Logging is silently a no-op when the DB is unavailable (JSON_ONLY mode,
 *     dev without Postgres, migration 185 not yet applied).
 *   * For performance, deny+stepup are always logged; allow is logged only when
 *     the permission is on the dangerous-allowlist or sampling is enabled.
 *     v1 logs *every* decision so the matrix admin dashboard has full visibility
 *     during rollout; the always-on can be downgraded to sampled later.
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class AuthDecisionLogger
{
    /** @var bool|null */
    private ?bool $tableAvailable = null;

    /** @var bool */
    private bool $disabled = false;

    public function record(array $user, string $permission, AuthDecision $decision, array $context = []): void
    {
        if ($this->disabled) {
            return;
        }
        if (!$this->ensureTable()) {
            return;
        }

        try {
            $conn = \portal_system_db_connection();
            if ($conn === null) {
                return;
            }

            $roles = is_array($user['roles'] ?? null) ? $user['roles'] : [];
            if (!$roles && isset($user['role'])) {
                $roles = [(string)$user['role']];
            }
            $rolesArr = array_values(array_unique(array_filter(array_map(
                static fn($r) => strtolower(trim((string)$r)),
                $roles
            ))));
            // Postgres TEXT[] literal
            $rolesPg = '{' . implode(',', array_map(
                static fn($r) => '"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $r) . '"',
                $rolesArr
            )) . '}';

            $userId = $user['id'] ?? ($user['user_id'] ?? null);
            $userId = (is_string($userId) && $userId !== '') ? $userId : null;
            $userIdValid = ($userId !== null && preg_match('/^[0-9a-f-]{36}$/i', $userId) === 1)
                ? $userId
                : null;

            $conn->execute(
                'INSERT INTO auth_decision_event
                    (user_id, actor_username, subject_role, subject_roles,
                     permission_code, route_action, resource_kind, resource_id,
                     decision, reason_code, current_aal, required_aal,
                     matched_grant, matched_deny, request_id, ip_addr, user_agent, extra)
                 VALUES
                    (:user_id, :actor_username, :subject_role, :subject_roles::text[],
                     :permission_code, :route_action, :resource_kind, :resource_id,
                     :decision, :reason_code, :current_aal, :required_aal,
                     :matched_grant, :matched_deny, NULL, :ip_addr, :user_agent, :extra::jsonb)',
                [
                    ':user_id'         => $userIdValid,
                    ':actor_username'  => self::clip((string)($user['username'] ?? ''), 80),
                    ':subject_role'    => self::clip($rolesArr[0] ?? '', 60),
                    ':subject_roles'   => $rolesPg,
                    ':permission_code' => self::clip($permission, 80),
                    ':route_action'    => self::clip((string)($context['route_action'] ?? ''), 120),
                    ':resource_kind'   => self::clip((string)($context['resource_kind'] ?? ''), 40),
                    ':resource_id'     => isset($context['resource_id']) ? (string)$context['resource_id'] : null,
                    ':decision'        => $decision->outcome,
                    ':reason_code'     => self::clip($decision->reason, 40),
                    ':current_aal'     => $decision->currentAal,
                    ':required_aal'    => $decision->requiredAal,
                    ':matched_grant'   => $decision->outcome !== 'deny' || $decision->reason === 'aal_insufficient'
                                              ? $decision->matchedPattern
                                              : null,
                    ':matched_deny'    => ($decision->isDeny() && $decision->reason === 'explicit_deny')
                                              ? $decision->matchedPattern
                                              : null,
                    ':ip_addr'         => self::clientIp(),
                    ':user_agent'      => self::clip((string)((isset($_SERVER) && is_array($_SERVER)) ? ($_SERVER['HTTP_USER_AGENT'] ?? '') : ''), 500),
                    ':extra'           => json_encode($context['extra'] ?? new \stdClass()) ?: '{}',
                ]
            );
        } catch (\Throwable $e) {
            // Audit failure must not break the request. If the table is missing
            // (migration 185 not applied) disable logging for this request.
            @error_log('[AuthDecisionLogger] insert failed: ' . $e->getMessage());
            if (str_contains($e->getMessage(), 'auth_decision_event')) {
                $this->tableAvailable = false;
                $this->disabled       = true;
            }
        }
    }

    private function ensureTable(): bool
    {
        if ($this->tableAvailable !== null) {
            return $this->tableAvailable;
        }
        $conn = \portal_system_db_connection();
        if ($conn === null) {
            return $this->tableAvailable = false;
        }
        try {
            $r = $conn->queryOne("SELECT to_regclass('public.auth_decision_event') AS reg");
            $this->tableAvailable = ($r && !empty($r['reg']));
        } catch (\Throwable $e) {
            @error_log('[AuthDecisionLogger] table probe failed: ' . $e->getMessage());
            $this->tableAvailable = false;
        }
        return $this->tableAvailable;
    }

    private static function clip(string $s, int $max): ?string
    {
        $s = trim($s);
        if ($s === '') {
            return null;
        }
        return mb_substr($s, 0, $max);
    }

    private static function clientIp(): ?string
    {
        if (!isset($_SERVER) || !is_array($_SERVER)) {
            return null;
        }
        $candidates = [
            $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
            $_SERVER['HTTP_X_REAL_IP']       ?? '',
            $_SERVER['REMOTE_ADDR']          ?? '',
        ];
        foreach ($candidates as $c) {
            $c = trim((string)$c);
            if ($c === '') continue;
            // X-Forwarded-For may be a list
            $first = trim(explode(',', $c)[0] ?? '');
            if (filter_var($first, FILTER_VALIDATE_IP) !== false) {
                return $first;
            }
        }
        return null;
    }
}
