<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use Throwable;

/**
 * Mode-aware identity (users) repository — the runtime gateway
 * implementing ADR-0013.
 *
 * Wraps two underlying stores:
 *   - JSON file via UserRepository                     (legacy, fading)
 *   - PostgreSQL `users` table via Connection          (target)
 *
 * Read and write behaviour is governed by data_collection_state.mode for
 * collection_key='users':
 *
 *   json_only         → read JSON; write JSON only
 *   shadow_write      → read JSON; write JSON, then mirror to PostgreSQL
 *                        via AuthUserShadowSyncService; record drift
 *   postgres_primary  → read PostgreSQL (fallback JSON on PG error);
 *                        write PostgreSQL, then best-effort mirror to JSON
 *   postgres_only     → read PostgreSQL; write PostgreSQL only; JSON ignored
 *
 * Every mutation is recorded in audit_event_chain. Drift detected during
 * shadow_write / postgres_primary is recorded in data_collection_drift.
 *
 * This class is intentionally focused on the `users` collection. Sister
 * collections (roles, role_permissions, user_doc_overrides) follow the
 * same pattern but live in their own repositories to keep audit-log
 * granularity sharp.
 */
final class IdentityRepository
{
    public const COLLECTION_KEY = 'users';

    public function __construct(
        private readonly Connection $db,
        private readonly UserRepository $jsonStore,
        private readonly AuthUserShadowSyncService $shadowSync,
        private readonly DataCollectionModeResolver $modeResolver,
        private readonly AuditChainService $audit,
    ) {
    }

    // ── Reads ──────────────────────────────────────────────────────────────

    public function findByUsername(string $username): ?array
    {
        $username = strtolower(trim($username));
        if ($username === '') {
            return null;
        }
        $mode = $this->modeResolver->modeFor(self::COLLECTION_KEY);

        return match ($mode) {
            DataCollectionModeResolver::MODE_JSON_ONLY,
            DataCollectionModeResolver::MODE_SHADOW_WRITE
                => $this->jsonStore->findByUsername($username),
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY
                => $this->readDb($username) ?? $this->jsonStore->findByUsername($username),
            DataCollectionModeResolver::MODE_POSTGRES_ONLY
                => $this->readDb($username),
            default => $this->jsonStore->findByUsername($username),
        };
    }

    /**
     * Return all active users in the canonical "users.json" shape so legacy
     * controllers can keep using the same array structure.
     *
     * @return list<array<string,mixed>>
     */
    public function listUsers(): array
    {
        $mode = $this->modeResolver->modeFor(self::COLLECTION_KEY);

        return match ($mode) {
            DataCollectionModeResolver::MODE_JSON_ONLY,
            DataCollectionModeResolver::MODE_SHADOW_WRITE
                => $this->jsonStore->listUsers(),
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY
                => $this->readAllFromDb() ?? $this->jsonStore->listUsers(),
            DataCollectionModeResolver::MODE_POSTGRES_ONLY
                => $this->readAllFromDb() ?? [],
            default => $this->jsonStore->listUsers(),
        };
    }

    // ── Writes ─────────────────────────────────────────────────────────────

    /**
     * Persist or update one user. The caller passes the same array shape
     * used by users.json (username, name, password_hash, role, active,
     * dept, title, …).
     *
     * Returns the resolved mode under which the write executed (so callers
     * can decide whether to also call legacy `users_save()` themselves —
     * once every callsite is migrated, that branch disappears).
     */
    public function saveUser(
        array $user,
        string $actor,
        string $changeRef,
    ): string {
        $username = strtolower(trim((string)($user['username'] ?? '')));
        if ($username === '') {
            throw new \InvalidArgumentException('username_required');
        }
        $mode = $this->modeResolver->modeFor(self::COLLECTION_KEY);
        $jsonOk = false;
        $pgOk   = false;

        if (in_array($mode, [
            DataCollectionModeResolver::MODE_JSON_ONLY,
            DataCollectionModeResolver::MODE_SHADOW_WRITE,
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
        ], true)) {
            try {
                $this->jsonStore->updateUser($user);
                $jsonOk = true;
            } catch (Throwable $e) {
                if ($mode === DataCollectionModeResolver::MODE_JSON_ONLY) {
                    throw $e;
                }
                @error_log('[IdentityRepository] json write failed: ' . $e->getMessage());
            }
        }

        if (in_array($mode, [
            DataCollectionModeResolver::MODE_SHADOW_WRITE,
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
            DataCollectionModeResolver::MODE_POSTGRES_ONLY,
        ], true)) {
            try {
                $this->shadowSync->syncUser($user);
                $pgOk = true;
            } catch (Throwable $e) {
                if ($mode === DataCollectionModeResolver::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
                @error_log('[IdentityRepository] pg write failed: ' . $e->getMessage());
            }
        }

        $this->audit->record(
            eventType:     'identity_user_saved',
            aggregateType: 'identity.users',
            aggregateId:   $username,
            actorId:       null,
            actorName:     $actor,
            payload: [
                'mode'        => $mode,
                'json_ok'     => $jsonOk,
                'pg_ok'       => $pgOk,
                'change_ref'  => $changeRef,
                'role'        => (string)($user['role'] ?? ''),
                'dept'        => (string)($user['dept'] ?? ''),
                'active'      => (bool)($user['active'] ?? true),
            ],
        );

        if ($mode === DataCollectionModeResolver::MODE_SHADOW_WRITE) {
            $this->detectAndRecordDrift($username);
        }

        return $mode;
    }

    /**
     * Mark a user inactive. Mirrors the JSON-side `active=false` flip and
     * the DB-side `users.status='inactive'` + `user_roles.valid_to` close.
     */
    public function deactivateUser(
        string $username,
        string $actor,
        string $changeRef,
    ): string {
        $username = strtolower(trim($username));
        if ($username === '') {
            throw new \InvalidArgumentException('username_required');
        }
        $mode = $this->modeResolver->modeFor(self::COLLECTION_KEY);

        if (in_array($mode, [
            DataCollectionModeResolver::MODE_JSON_ONLY,
            DataCollectionModeResolver::MODE_SHADOW_WRITE,
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
        ], true)) {
            $existing = $this->jsonStore->findByUsername($username);
            if (is_array($existing)) {
                $existing['active']     = false;
                $existing['updated_at'] = gmdate('c');
                try {
                    $this->jsonStore->updateUser($existing);
                } catch (Throwable $e) {
                    @error_log('[IdentityRepository] json deactivate failed: ' . $e->getMessage());
                }
            }
        }

        if (in_array($mode, [
            DataCollectionModeResolver::MODE_SHADOW_WRITE,
            DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
            DataCollectionModeResolver::MODE_POSTGRES_ONLY,
        ], true)) {
            try {
                $this->shadowSync->deactivateUser($username);
            } catch (Throwable $e) {
                if ($mode === DataCollectionModeResolver::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
                @error_log('[IdentityRepository] pg deactivate failed: ' . $e->getMessage());
            }
        }

        $this->audit->record(
            eventType:     'identity_user_deactivated',
            aggregateType: 'identity.users',
            aggregateId:   $username,
            actorId:       null,
            actorName:     $actor,
            payload:       ['mode' => $mode, 'change_ref' => $changeRef],
        );

        return $mode;
    }

    // ── Drift detection (used during shadow_write / postgres_primary) ──────

    /**
     * Compare a single user record between JSON and PostgreSQL. If the
     * canonical projection differs, write one row to data_collection_drift.
     */
    public function detectAndRecordDrift(string $username): ?array
    {
        $jsonUser = $this->jsonStore->findByUsername($username);
        $pgUser   = $this->readDb($username);

        if ($jsonUser === null && $pgUser === null) {
            return null;
        }

        $jsonProjection = $this->canonicalProjection($jsonUser);
        $pgProjection   = $this->canonicalProjection($pgUser);
        $jsonSha = $jsonProjection !== null
            ? hash('sha256', json_encode($jsonProjection, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '')
            : null;
        $pgSha = $pgProjection !== null
            ? hash('sha256', json_encode($pgProjection, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '')
            : null;

        if ($jsonSha === $pgSha) {
            return null;
        }

        $direction = match (true) {
            $jsonProjection !== null && $pgProjection === null => 'json_only',
            $jsonProjection === null && $pgProjection !== null => 'pg_only',
            default                                            => 'mismatch',
        };

        $diff = $this->shallowDiff($jsonProjection ?? [], $pgProjection ?? []);
        try {
            $this->db->execute(
                'INSERT INTO data_collection_drift (
                     collection_key, detector, record_key,
                     json_sha256, pg_sha256, direction, diff_summary
                 ) VALUES (
                     :key, :detector, :record_key,
                     :json_sha, :pg_sha, :direction, CAST(:diff AS jsonb)
                 )',
                [
                    ':key'        => self::COLLECTION_KEY,
                    ':detector'   => 'IdentityRepository',
                    ':record_key' => $username,
                    ':json_sha'   => $jsonSha,
                    ':pg_sha'     => $pgSha,
                    ':direction'  => $direction,
                    ':diff'       => json_encode($diff, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}',
                ],
            );
            $this->db->execute(
                'UPDATE data_collection_state
                    SET last_drift_at = now(),
                        drift_count   = drift_count + 1
                  WHERE collection_key = :key',
                [':key' => self::COLLECTION_KEY],
            );
        } catch (Throwable $e) {
            @error_log('[IdentityRepository] drift recording failed: ' . $e->getMessage());
        }

        return [
            'direction'   => $direction,
            'json_sha256' => $jsonSha,
            'pg_sha256'   => $pgSha,
        ];
    }

    /**
     * Compute drift across the entire collection. Returns counts; rows
     * are persisted to data_collection_drift.
     *
     * @return array{checked:int, drift:int, json_only:int, pg_only:int, mismatch:int}
     */
    public function scanDrift(): array
    {
        $jsonStore = $this->jsonStore->loadStore() ?? ['users' => []];
        $jsonUsers = is_array($jsonStore['users'] ?? null) ? $jsonStore['users'] : [];
        $jsonByUsername = [];
        foreach ($jsonUsers as $u) {
            if (is_array($u) && isset($u['username'])) {
                $jsonByUsername[strtolower((string)$u['username'])] = $u;
            }
        }

        $pgUsernames = [];
        try {
            $rows = $this->db->query(
                'SELECT username FROM users WHERE source_system = :src',
                [':src' => 'AUTH_JSON'],
            );
            foreach ($rows as $r) {
                $pgUsernames[strtolower((string)($r['username'] ?? ''))] = true;
            }
        } catch (Throwable $e) {
            @error_log('[IdentityRepository] scanDrift pg list failed: ' . $e->getMessage());
        }

        $allUsernames = array_unique(array_merge(
            array_keys($jsonByUsername),
            array_keys($pgUsernames),
        ));

        $tally = [
            'checked' => 0, 'drift' => 0,
            'json_only' => 0, 'pg_only' => 0, 'mismatch' => 0,
        ];
        foreach ($allUsernames as $u) {
            $tally['checked']++;
            $d = $this->detectAndRecordDrift($u);
            if ($d === null) {
                continue;
            }
            $tally['drift']++;
            $tally[$d['direction']] = ($tally[$d['direction']] ?? 0) + 1;
        }
        return $tally;
    }

    // ── Internals ──────────────────────────────────────────────────────────

    private function readDb(string $username): ?array
    {
        try {
            $row = $this->db->queryOne(
                'SELECT u.username, u.full_name AS name, u.password_hash,
                        r.role_code AS role, u.status,
                        u.dept_code AS dept,
                        u.email AS personal_email,
                        u.metadata,
                        u.employee_id,
                        u.created_at, u.updated_at
                   FROM users u
                   LEFT JOIN user_roles ur
                          ON u.user_id = ur.user_id AND ur.valid_to IS NULL
                   LEFT JOIN roles r
                          ON ur.role_id = r.role_id
                  WHERE u.username = :username
                  LIMIT 1',
                [':username' => $username],
            );
        } catch (Throwable $e) {
            @error_log('[IdentityRepository] readDb failed: ' . $e->getMessage());
            return null;
        }
        if (!is_array($row)) {
            return null;
        }
        return $this->dbRowToUserShape($row);
    }

    /**
     * @return list<array<string,mixed>>|null
     */
    private function readAllFromDb(): ?array
    {
        try {
            $rows = $this->db->query(
                'SELECT u.username, u.full_name AS name, u.password_hash,
                        r.role_code AS role, u.status,
                        u.dept_code AS dept,
                        u.email AS personal_email,
                        u.metadata,
                        u.employee_id,
                        u.created_at, u.updated_at
                   FROM users u
                   LEFT JOIN user_roles ur
                          ON u.user_id = ur.user_id AND ur.valid_to IS NULL
                   LEFT JOIN roles r
                          ON ur.role_id = r.role_id
                  ORDER BY u.username',
            );
        } catch (Throwable $e) {
            @error_log('[IdentityRepository] readAllFromDb failed: ' . $e->getMessage());
            return null;
        }
        $out = [];
        foreach ($rows as $row) {
            $out[] = $this->dbRowToUserShape($row);
        }
        return $out;
    }

    /**
     * Cast a row from the users table back into the legacy users.json shape
     * that controllers expect.
     */
    private function dbRowToUserShape(array $row): array
    {
        $metadata = [];
        if (isset($row['metadata'])) {
            $decoded = is_string($row['metadata']) ? json_decode($row['metadata'], true) : $row['metadata'];
            if (is_array($decoded)) {
                $metadata = $decoded;
            }
        }

        return [
            'username'       => (string)($row['username'] ?? ''),
            'name'           => (string)($row['name'] ?? ''),
            'password_hash'  => (string)($row['password_hash'] ?? ''),
            'role'           => (string)($row['role'] ?? ''),
            'active'         => ((string)($row['status'] ?? 'active')) === 'active',
            'dept'           => (string)($row['dept'] ?? ''),
            'title'          => (string)($metadata['title'] ?? ''),
            'phone'          => (string)($metadata['phone'] ?? ''),
            'cccd'           => (string)($metadata['cccd'] ?? ''),
            'jd_code'        => (string)($metadata['jd_code'] ?? ''),
            'jd_title'       => (string)($metadata['jd_title'] ?? ''),
            'personal_email' => (string)($row['personal_email'] ?? ''),
            'employee_id'    => (string)($row['employee_id'] ?? ''),
            'mfa'            => ['enabled' => (bool)($metadata['mfa_enabled'] ?? false)],
            'role_source'    => is_array($metadata['role_source'] ?? null)
                                    ? $metadata['role_source'] : new \stdClass(),
            'created_at'     => isset($row['created_at']) ? (string)$row['created_at'] : null,
            'updated_at'     => isset($row['updated_at']) ? (string)$row['updated_at'] : null,
        ];
    }

    /**
     * Build the canonical subset of fields that MUST agree between JSON
     * and PostgreSQL. We deliberately exclude timestamps and free-text
     * fields that may legitimately differ in formatting (ISO-8601 vs
     * PostgreSQL output).
     *
     * @return array<string,mixed>|null
     */
    private function canonicalProjection(?array $user): ?array
    {
        if ($user === null) {
            return null;
        }
        $username = strtolower(trim((string)($user['username'] ?? '')));
        if ($username === '') {
            return null;
        }
        // employee_id is intentionally EXCLUDED from the canonical
        // projection because AuthUserShadowSyncService auto-derives it
        // when missing — comparing it would create false-positive drift
        // for legacy JSON rows. Identity is anchored on username (which
        // is the JSON file's primary key) and on the user-visible fields
        // a human admin actually cares about: name / role / dept /
        // active / password_hash.
        return [
            'username'      => $username,
            'name'          => trim((string)($user['name'] ?? $user['full_name'] ?? '')),
            'password_hash' => (string)($user['password_hash'] ?? ''),
            'role'          => strtolower(trim((string)($user['role'] ?? ''))),
            'active'        => (bool)($user['active'] ?? (($user['status'] ?? 'active') === 'active')),
            'dept'          => strtoupper(trim((string)($user['dept'] ?? $user['dept_code'] ?? ''))),
        ];
    }

    /**
     * @param array<string,mixed> $a
     * @param array<string,mixed> $b
     * @return array<string,array{json:mixed,pg:mixed}>
     */
    private function shallowDiff(array $a, array $b): array
    {
        $keys = array_unique(array_merge(array_keys($a), array_keys($b)));
        $diff = [];
        foreach ($keys as $k) {
            $va = $a[$k] ?? null;
            $vb = $b[$k] ?? null;
            if ($va !== $vb) {
                $diff[$k] = ['json' => $va, 'pg' => $vb];
            }
        }
        return $diff;
    }
}
