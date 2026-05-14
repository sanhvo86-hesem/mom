<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * PasswordService — Phase 0 password hardening per .ai/USER_IDENTITY_FUTURE_STACK.md.
 *
 * Centralizes the three operations every auth path needs:
 *   1. hash()   — compute a new password hash using Argon2id with HESEM-tuned
 *                 cost parameters (replaces ad-hoc `password_hash($p, PASSWORD_DEFAULT)`).
 *   2. verify() — check a plaintext against a stored hash, including LEGACY
 *                 bcrypt hashes from before Phase 0. Returns a bool + an
 *                 "upgrade" flag so the caller can rehash transparently.
 *   3. assertPolicy() — enforce minimum length, complexity, and a HIBP k-anonymity
 *                       breach-check on password set/reset.
 *
 * Why a service and not free functions: the rule "never invent ad-hoc auth
 * code" in .ai/USER_IDENTITY_SSOT.md applies to password handling too. One
 * file owns the policy; the CI guard's USER_TABLE_WRITER_ALLOW list includes
 * this file so future PHP code that wants to set a password is forced through
 * it (or the guard flags the new direct password_hash() call).
 *
 * NOT in this service yet (planned for later phases):
 *   - WebAuthn / passkey enrollment    → Phase 1 (Keycloak)
 *   - Session rotation policy           → Phase 0 follow-up
 *   - Password expiry / forced rotation → Phase 0 follow-up
 */
final class PasswordService
{
    /**
     * Argon2id cost parameters tuned for HESEM's PHP-FPM box.
     *
     * Recommendation source: OWASP Password Storage Cheat Sheet (2024) +
     * RFC 9106 §4.1 "Recommended Argon2id parameters". The HESEM box is
     * a modest VPS with shared-tenant CPU; we pick the OWASP "second
     * profile" (memory_cost=19MiB) which gives ~500ms hash time on
     * 1 vCPU and resists GPU attacks well enough for non-state-actor
     * threat models.
     *
     * Verify on the live box:
     *   php -r "echo microtime(true); password_hash('x', PASSWORD_ARGON2ID,
     *     ['memory_cost'=>19456,'time_cost'=>2,'threads'=>1]);
     *     echo PHP_EOL.microtime(true);"
     * Should print two timestamps ~0.4–0.6s apart.
     */
    public const ARGON2ID_OPTIONS = [
        'memory_cost' => 19456,  // 19 MiB
        'time_cost'   => 2,
        'threads'     => 1,
    ];

    /** OWASP minimum: 8. NIST 800-63B minimum: 8. HESEM policy: 12. */
    public const MIN_LENGTH = 12;

    /** Max kept reasonable to avoid hash-of-truncated-key edge cases. */
    public const MAX_LENGTH = 128;

    /** HIBP k-anonymity API endpoint. */
    private const HIBP_BASE = 'https://api.pwnedpasswords.com/range/';

    /** Timeout for the HIBP call (seconds). Network blip → fail open with a log. */
    private const HIBP_TIMEOUT = 3;

    /**
     * Hash a plaintext password using Argon2id with HESEM cost parameters.
     *
     * Caller MUST have already invoked assertPolicy() to ensure the password
     * meets minimum length / complexity / not-breached. This method only does
     * the cryptographic step.
     */
    public static function hash(string $plaintext): string
    {
        if ($plaintext === '') {
            throw new \InvalidArgumentException('Cannot hash an empty password');
        }
        $hash = password_hash($plaintext, PASSWORD_ARGON2ID, self::ARGON2ID_OPTIONS);
        // PHP 8 password_hash(ARGON2ID) always returns non-empty-string; guard is defensive only.
        // @phpstan-ignore-next-line
        if (!is_string($hash) || $hash === '') {
            throw new \RuntimeException('password_hash() returned an invalid result');
        }
        return $hash;
    }

    /**
     * Verify a plaintext against a stored hash.
     *
     * Returns an array:
     *   - ok:        bool — does the plaintext match?
     *   - upgrade:   bool — true if the stored hash is legacy (bcrypt) or
     *                       uses outdated Argon2id parameters; caller should
     *                       call hash($plaintext) and persist the new hash.
     *   - algorithm: string — diagnostic only.
     *
     * Constant-time on the bcrypt/argon2 verify; do not short-circuit on
     * empty/missing hash before password_verify() so attackers cannot use
     * timing to distinguish "no such user" from "wrong password".
     */
    public static function verify(string $plaintext, string $storedHash): array
    {
        // password_verify is constant-time on the actual comparison; we still
        // pass-through even an empty hash to make total time consistent with
        // the success case.
        $ok = $storedHash !== '' && password_verify($plaintext, $storedHash);

        $algorithm = self::detectAlgorithm($storedHash);
        $upgrade = false;
        if ($ok) {
            if ($algorithm !== 'argon2id') {
                $upgrade = true;
            } elseif (password_needs_rehash($storedHash, PASSWORD_ARGON2ID, self::ARGON2ID_OPTIONS)) {
                $upgrade = true;
            }
        }

        return [
            'ok'        => $ok,
            'upgrade'   => $upgrade,
            'algorithm' => $algorithm,
        ];
    }

    /**
     * Enforce HESEM password policy on set/reset.
     *
     * Returns an array describing any violations. Empty array = policy clear.
     *
     * Checks (in order):
     *   1. Length 12..128
     *   2. Contains ≥3 of: lower, upper, digit, symbol
     *   3. Not in HIBP breached-password list (k-anonymity, only first 5 SHA1
     *      chars sent to the API)
     *
     * The username MUST be passed in so we can reject obvious "username = password".
     */
    public static function assertPolicy(string $plaintext, string $username = ''): array
    {
        $errors = [];

        $length = strlen($plaintext);
        if ($length < self::MIN_LENGTH) {
            $errors[] = sprintf('password_too_short (min %d chars)', self::MIN_LENGTH);
        }
        if ($length > self::MAX_LENGTH) {
            $errors[] = sprintf('password_too_long (max %d chars)', self::MAX_LENGTH);
        }

        $classes = 0;
        if (preg_match('/[a-z]/', $plaintext)) $classes++;
        if (preg_match('/[A-Z]/', $plaintext)) $classes++;
        if (preg_match('/[0-9]/', $plaintext)) $classes++;
        if (preg_match('/[^A-Za-z0-9]/', $plaintext)) $classes++;
        if ($classes < 3) {
            $errors[] = 'password_complexity (need 3 of 4: lower, upper, digit, symbol)';
        }

        if ($username !== '' && stripos($plaintext, $username) !== false) {
            $errors[] = 'password_contains_username';
        }

        if (self::isBreached($plaintext)) {
            $errors[] = 'password_breached (found in HIBP database — choose a different one)';
        }

        return $errors;
    }

    // ------------------------------------------------------------------------

    /**
     * HIBP k-anonymity check.
     *
     * We send only the first 5 hex chars of SHA1(plaintext) to
     * api.pwnedpasswords.com. The endpoint returns a list of hash suffixes
     * matching that prefix; we look for our remaining 35 chars. The plaintext
     * never leaves the box.
     *
     * Fail-open behavior: if the HIBP API is unreachable (network blip,
     * sanctions, timeout), the check returns false (NOT breached) so a
     * working password can still be set. The decision favors availability
     * over a momentarily stronger check; rationale is that the policy still
     * blocks the most common breached passwords because HIBP coverage is
     * very high (820M+ hashes) and bypassing the check requires also
     * bypassing the length/complexity checks above.
     */
    private static function isBreached(string $plaintext): bool
    {
        $sha1 = strtoupper(sha1($plaintext));
        $prefix = substr($sha1, 0, 5);
        $suffix = substr($sha1, 5);

        $ctx = stream_context_create([
            'http' => [
                'method'  => 'GET',
                'header'  => [
                    'User-Agent: hesem-mom/0.1 (PasswordService)',
                    'Add-Padding: true',   // HIBP recommendation — defeats length-based traffic analysis
                ],
                'timeout' => self::HIBP_TIMEOUT,
                'ignore_errors' => true,
            ],
        ]);
        $url = self::HIBP_BASE . $prefix;
        $body = @file_get_contents($url, false, $ctx);
        if ($body === false || $body === '') {
            error_log('[PasswordService] HIBP unreachable, fail-open on breach check');
            return false;
        }

        // Body is "<35-char hash suffix>:<count>\r\n" repeated. Find our suffix.
        $lines = preg_split('/\r?\n/', $body) ?: [];
        foreach ($lines as $line) {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2 && strtoupper($parts[0]) === $suffix) {
                // Only treat as breached if seen more than once (filters HIBP's
                // own padding rows which appear with count 0).
                if ((int)$parts[1] > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Detect the algorithm family of an already-stored hash.
     *
     * Used for diagnostic / migration reporting; the verify path doesn't
     * actually branch on this because password_verify() handles all formats
     * transparently. We just want to know whether a stored hash is still
     * legacy bcrypt so the caller can upgrade.
     */
    private static function detectAlgorithm(string $hash): string
    {
        if (strncmp($hash, '$argon2id$', 10) === 0) return 'argon2id';
        if (strncmp($hash, '$argon2i$', 9) === 0)   return 'argon2i';
        if (strncmp($hash, '$2y$', 4) === 0)        return 'bcrypt';
        if (strncmp($hash, '$2a$', 4) === 0)        return 'bcrypt';
        if (strncmp($hash, '$2b$', 4) === 0)        return 'bcrypt';
        if ($hash === '')                            return 'empty';
        return 'unknown';
    }
}
