<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

/**
 * EmailIntakeWorkerAuthService — HMAC service auth for the local
 * Outlook worker.
 *
 * Token storage:
 *   We store the secret as `secret_hash = sha256(secret_bytes)`. Verifying
 *   an HMAC normally requires the raw secret, which we deliberately do
 *   NOT keep. To make signature verification still possible without
 *   storing plaintext we use a bearer-style scheme: the worker keeps the
 *   raw secret on disk (outside the webroot) and submits a derived
 *   `signature = hmac_sha256(sha256(secret), canonical)`. The server,
 *   which already has sha256(secret) = secret_hash, can recompute the
 *   same HMAC and compare.
 *
 *   That gives us:
 *     - No plaintext secret on the server.
 *     - Compromise of the DB ⇒ secret_hash leaks, but the raw secret on
 *       the worker is the recoverable credential; the hash alone is
 *       enough to forge HMACs against this service, so we still treat
 *       secret_hash as sensitive (admin-only read, never returned).
 *     - Worker rotation invalidates everything by regenerating
 *       sha256(new_secret).
 *
 * Required request headers from the worker:
 *   X-AEOI-Worker-Id        — public id (AIW-LOCAL-001 etc.)
 *   X-AEOI-Timestamp        — UNIX seconds (UTC)
 *   X-AEOI-Nonce            — random 16+ chars, unique per request
 *   X-AEOI-Body-SHA256      — hex sha256 of the raw request body
 *   X-AEOI-Signature        — base64 hmac_sha256(secret_hash, canonical)
 *
 * Canonical string:
 *   METHOD "\n" PATH "\n" TIMESTAMP "\n" NONCE "\n" BODY_SHA256
 *
 * @package MOM\Api\Services
 */
final class EmailIntakeWorkerAuthService
{
    private const TABLE             = 'email_intake_worker_token';
    private const MAX_TIME_SKEW_SEC = 300;            // 5 minutes
    private const NONCE_RING_SIZE   = 200;
    private const NONCE_RING_WINDOW = 600;            // remember nonces for 10 minutes
    private const TOKEN_BYTES       = 32;             // 256-bit secret

    public function __construct(private readonly Connection $db) {}

    // ── Admin CRUD ────────────────────────────────────────────────────────

    /** List worker tokens (NEVER returns secret or secret_hash). */
    public function listTokens(): array
    {
        return $this->db->query(
            'SELECT id, worker_id, worker_name, enabled, ip_allowlist,
                    last_used_at, last_used_ip,
                    created_at, created_by, updated_at, updated_by
               FROM ' . self::TABLE . '
              ORDER BY enabled DESC, lower(worker_id)'
        );
    }

    /**
     * Create a new worker token. Returns ['token' => array, 'secret' => string].
     * The raw secret is returned ONCE; the caller MUST display it to the
     * admin then discard it.
     */
    public function createToken(array $data, string $actor): array
    {
        $workerId = trim((string)($data['worker_id'] ?? ''));
        if ($workerId === '' || !preg_match('/^[A-Za-z0-9_\-]{3,80}$/', $workerId)) {
            throw new RuntimeException('worker_id must be 3-80 chars, alphanumeric / underscore / dash.');
        }

        $existing = $this->db->queryOne(
            'SELECT id FROM ' . self::TABLE . ' WHERE worker_id = :p_id',
            [':p_id' => $workerId]
        );
        if ($existing) {
            throw new RuntimeException('worker_id already exists. Use rotate instead.');
        }

        $secret     = $this->generateSecret();
        $secretHash = hash('sha256', $secret);
        $ipAllow    = $this->normaliseIpAllowlist($data['ip_allowlist'] ?? []);

        $row = $this->db->queryOne(
            'INSERT INTO ' . self::TABLE . '
                (worker_id, worker_name, secret_hash, enabled, ip_allowlist,
                 created_by, updated_by)
             VALUES (:p_id, :p_name, :p_hash, :p_enabled, :p_ip,
                     :p_actor, :p_actor)
             RETURNING id',
            [
                ':p_id'      => $workerId,
                ':p_name'    => trim((string)($data['worker_name'] ?? '')) ?: null,
                ':p_hash'    => $secretHash,
                ':p_enabled' => isset($data['enabled']) ? ($data['enabled'] ? 'true' : 'false') : 'true',
                ':p_ip'      => json_encode($ipAllow),
                ':p_actor'   => $actor,
            ]
        );

        $token = $this->getToken((int)$row['id']);
        return ['token' => $token, 'secret' => $secret];
    }

    /** Rotate the secret. Returns ['token' => ..., 'secret' => string]. */
    public function rotateToken(int $id, string $actor): array
    {
        $secret     = $this->generateSecret();
        $secretHash = hash('sha256', $secret);

        $this->db->execute(
            'UPDATE ' . self::TABLE . '
                SET secret_hash = :p_hash, nonce_history = :p_nonces,
                    updated_at = NOW(), updated_by = :p_actor
              WHERE id = :p_id',
            [
                ':p_hash'    => $secretHash,
                ':p_nonces'  => '[]',
                ':p_actor'   => $actor,
                ':p_id'      => $id,
            ]
        );

        $token = $this->getToken($id);
        return ['token' => $token, 'secret' => $secret];
    }

    public function disableToken(int $id, string $actor): array
    {
        $this->db->execute(
            'UPDATE ' . self::TABLE . '
                SET enabled = false, updated_at = NOW(), updated_by = :p_actor
              WHERE id = :p_id',
            [':p_actor' => $actor, ':p_id' => $id]
        );
        return $this->getToken($id);
    }

    public function enableToken(int $id, string $actor): array
    {
        $this->db->execute(
            'UPDATE ' . self::TABLE . '
                SET enabled = true, updated_at = NOW(), updated_by = :p_actor
              WHERE id = :p_id',
            [':p_actor' => $actor, ':p_id' => $id]
        );
        return $this->getToken($id);
    }

    public function updateTokenIpAllowlist(int $id, array $ips, string $actor): array
    {
        $this->db->execute(
            'UPDATE ' . self::TABLE . '
                SET ip_allowlist = :p_ip, updated_at = NOW(), updated_by = :p_actor
              WHERE id = :p_id',
            [
                ':p_ip'    => json_encode($this->normaliseIpAllowlist($ips)),
                ':p_actor' => $actor,
                ':p_id'    => $id,
            ]
        );
        return $this->getToken($id);
    }

    public function getToken(int $id): array
    {
        $row = $this->db->queryOne(
            'SELECT id, worker_id, worker_name, enabled, ip_allowlist,
                    last_used_at, last_used_ip,
                    created_at, created_by, updated_at, updated_by
               FROM ' . self::TABLE . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
        if (!$row) {
            throw new RuntimeException('Worker token not found: ' . $id);
        }
        return $row;
    }

    // ── Verification ──────────────────────────────────────────────────────

    /**
     * Verify an inbound worker request. On success returns the worker row
     * (without secret_hash); on failure throws RuntimeException with a
     * code-style message.
     *
     * @param string                $method     HTTP method
     * @param string                $path       Request path including query string
     * @param string                $rawBody    Raw request body (may be empty)
     * @param array<string,string>  $headers    Lowercase-keyed header map
     * @param string                $remoteIp   Client IP
     */
    public function verifyRequest(
        string $method,
        string $path,
        string $rawBody,
        array  $headers,
        string $remoteIp
    ): array {
        $workerId  = $this->header($headers, 'x-aeoi-worker-id');
        $timestamp = $this->header($headers, 'x-aeoi-timestamp');
        $nonce     = $this->header($headers, 'x-aeoi-nonce');
        $bodyHash  = $this->header($headers, 'x-aeoi-body-sha256');
        $signature = $this->header($headers, 'x-aeoi-signature');

        if ($workerId === '' || $timestamp === '' || $nonce === '' || $bodyHash === '' || $signature === '') {
            throw new RuntimeException('worker_auth_missing_headers');
        }

        // Timestamp skew (anti-replay window)
        $ts = (int)$timestamp;
        $now = time();
        if ($ts <= 0 || abs($now - $ts) > self::MAX_TIME_SKEW_SEC) {
            throw new RuntimeException('worker_auth_timestamp_skew');
        }

        // Body integrity
        $computedBodyHash = hash('sha256', $rawBody);
        if (!hash_equals($computedBodyHash, strtolower($bodyHash))) {
            throw new RuntimeException('worker_auth_body_hash_mismatch');
        }

        // Look up worker (need full row including secret_hash + nonce_history)
        $row = $this->db->queryOne(
            'SELECT id, worker_id, worker_name, secret_hash, enabled,
                    ip_allowlist, nonce_history
               FROM ' . self::TABLE . ' WHERE worker_id = :p_id',
            [':p_id' => $workerId]
        );
        if (!$row) {
            throw new RuntimeException('worker_auth_unknown_worker');
        }
        if (!$row['enabled']) {
            throw new RuntimeException('worker_auth_disabled');
        }

        // IP allowlist
        $ipAllow = $this->jsonDecode($row['ip_allowlist'] ?? '[]');
        if (!empty($ipAllow) && !$this->ipMatchesAny($remoteIp, $ipAllow)) {
            throw new RuntimeException('worker_auth_ip_not_allowed');
        }

        // Verify signature using secret_hash as the HMAC key
        $canonical = $method . "\n" . $path . "\n" . $timestamp . "\n" . $nonce . "\n" . strtolower($bodyHash);
        $expected  = base64_encode(hash_hmac('sha256', $canonical, (string)$row['secret_hash'], true));
        if (!hash_equals($expected, $signature)) {
            throw new RuntimeException('worker_auth_invalid_signature');
        }

        // Replay protection (nonce ring per worker)
        $nonces = $this->jsonDecode($row['nonce_history'] ?? '[]');
        foreach ($nonces as $entry) {
            if (is_array($entry) && ($entry['n'] ?? null) === $nonce) {
                throw new RuntimeException('worker_auth_nonce_replay');
            }
        }

        // Append the new nonce, drop oldest if over capacity / expired
        $cutoff = $now - self::NONCE_RING_WINDOW;
        $nonces = array_values(array_filter(
            $nonces,
            static fn($e) => is_array($e) && isset($e['t']) && (int)$e['t'] >= $cutoff
        ));
        $nonces[] = ['n' => $nonce, 't' => $now];
        if (count($nonces) > self::NONCE_RING_SIZE) {
            $nonces = array_slice($nonces, -self::NONCE_RING_SIZE);
        }

        $this->db->execute(
            'UPDATE ' . self::TABLE . '
                SET nonce_history = :p_nonces,
                    last_used_at  = NOW(),
                    last_used_ip  = :p_ip
              WHERE id = :p_id',
            [
                ':p_nonces' => json_encode($nonces),
                ':p_ip'     => $remoteIp,
                ':p_id'     => (int)$row['id'],
            ]
        );

        return [
            'id'          => (int)$row['id'],
            'worker_id'   => (string)$row['worker_id'],
            'worker_name' => (string)$row['worker_name'],
        ];
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private function header(array $headers, string $name): string
    {
        return trim((string)($headers[strtolower($name)] ?? ''));
    }

    private function generateSecret(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(self::TOKEN_BYTES)), '+/', '-_'), '=');
    }

    private function normaliseIpAllowlist(mixed $val): array
    {
        if (!is_array($val)) {
            return [];
        }
        $out = [];
        foreach ($val as $ip) {
            $s = trim((string)$ip);
            if ($s === '') {
                continue;
            }
            // Accept either an IP or a CIDR; basic shape check.
            if (filter_var(explode('/', $s)[0], FILTER_VALIDATE_IP)) {
                $out[] = $s;
            }
        }
        return $out;
    }

    private function ipMatchesAny(string $ip, array $rules): bool
    {
        foreach ($rules as $rule) {
            if (str_contains($rule, '/')) {
                if ($this->cidrMatch($ip, $rule)) {
                    return true;
                }
            } elseif (hash_equals($rule, $ip)) {
                return true;
            }
        }
        return false;
    }

    private function cidrMatch(string $ip, string $cidr): bool
    {
        [$subnet, $maskStr] = array_pad(explode('/', $cidr, 2), 2, '32');
        $mask  = (int)$maskStr;
        $ipBin = @inet_pton($ip);
        $snBin = @inet_pton($subnet);
        if ($ipBin === false || $snBin === false || strlen($ipBin) !== strlen($snBin)) {
            return false;
        }
        $bytes = intdiv($mask, 8);
        $bits  = $mask % 8;
        if ($bytes > 0 && !hash_equals(substr($ipBin, 0, $bytes), substr($snBin, 0, $bytes))) {
            return false;
        }
        if ($bits === 0) {
            return true;
        }
        $maskByte = chr((~((1 << (8 - $bits)) - 1)) & 0xff);
        return (ord($ipBin[$bytes]) & ord($maskByte)) === (ord($snBin[$bytes]) & ord($maskByte));
    }

    private function jsonDecode(mixed $val): array
    {
        if (is_array($val)) {
            return $val;
        }
        if (!is_string($val) || $val === '') {
            return [];
        }
        $decoded = json_decode($val, true);
        return is_array($decoded) ? $decoded : [];
    }
}
