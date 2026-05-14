<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * PiiCryptoService — symmetric encrypt/decrypt for PII fields at rest.
 *
 * Phase 0 hardening per .ai/USER_IDENTITY_FUTURE_STACK.md.
 *
 * Threat model and honest assessment:
 *   This service encrypts values before they hit users.json / DB metadata.
 *   The encryption key lives on the SAME server in
 *   /var/www/data-private/secrets/cccd.key (root:www-data, 0440). So a
 *   full-server compromise gives an attacker both the ciphertext and the
 *   key — encryption does not protect against that scenario.
 *
 *   What this DOES protect:
 *   - Backup tape / off-server snapshot that includes users.json but
 *     NOT /var/www/data-private/secrets/. Attackers can't read CCCDs
 *     from the JSON snapshot alone.
 *   - Accidental disclosure of users.json content in logs / error
 *     traces / git commits. Encrypted values are inert without the key.
 *   - Developer-laptop checkout where users.json was once copied for
 *     debug. The plaintext CCCD is no longer in those files.
 *
 *   What this does NOT protect:
 *   - Server compromise (the key and data are co-located).
 *   - Operator with sudo access (they can read the key directly).
 *
 *   Proper key management (HashiCorp Vault / AWS KMS) is a Phase 1
 *   prerequisite tracked in .ai/USER_IDENTITY_FUTURE_STACK.md. Until
 *   that lands, the on-disk key approach is the realistic next step
 *   up from plaintext at rest.
 *
 * Cipher: libsodium crypto_secretbox (XSalsa20 + Poly1305 MAC).
 *   - 24-byte random nonce prepended to ciphertext.
 *   - Base64 envelope so the value remains JSON-safe.
 *   - Tagged "pii:v1:" prefix so verify+decrypt code can detect encrypted
 *     vs legacy plaintext values without misparsing.
 */
final class PiiCryptoService
{
    private const ENVELOPE_PREFIX = 'pii:v1:';
    private const KEY_PATH = '/var/www/data-private/secrets/cccd.key';

    private static ?string $cachedKey = null;

    /**
     * Encrypt a plaintext PII value. Returns the original value unchanged if
     * encryption is unavailable (sodium missing or key not readable) so the
     * caller can still persist a record — better to have plaintext PII than
     * to lose the field entirely. The audit log captures the fall-through.
     *
     * Empty string passes through (no point encrypting an empty value).
     */
    public static function encrypt(string $plaintext): string
    {
        if ($plaintext === '') return $plaintext;
        if (self::isEnvelope($plaintext)) return $plaintext;  // already encrypted

        $key = self::loadKey();
        if ($key === null) {
            error_log('[PiiCryptoService] key unavailable, persisting plaintext');
            return $plaintext;
        }

        try {
            $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
            $cipher = sodium_crypto_secretbox($plaintext, $nonce, $key);
            return self::ENVELOPE_PREFIX . base64_encode($nonce . $cipher);
        } catch (\Throwable $e) {
            error_log('[PiiCryptoService] encrypt failed: ' . $e->getMessage());
            return $plaintext;
        }
    }

    /**
     * Decrypt a stored value. Returns the original value unchanged if it
     * isn't an envelope (i.e. it's a legacy plaintext from before this
     * service was deployed) so reads continue to work during the migration
     * window. After all CCCDs are migrated, callers will see only envelopes.
     */
    public static function decrypt(string $stored): string
    {
        if ($stored === '') return $stored;
        if (!self::isEnvelope($stored)) return $stored;  // legacy plaintext

        $key = self::loadKey();
        if ($key === null) {
            error_log('[PiiCryptoService] key unavailable on decrypt');
            return $stored;  // surface envelope so the bug is visible
        }

        try {
            $payload = base64_decode(substr($stored, strlen(self::ENVELOPE_PREFIX)), true);
            if ($payload === false || strlen($payload) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + 1) {
                return $stored;
            }
            $nonce  = substr($payload, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
            $cipher = substr($payload, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
            $plain  = sodium_crypto_secretbox_open($cipher, $nonce, $key);
            if ($plain === false) {
                error_log('[PiiCryptoService] decrypt MAC failed');
                return $stored;
            }
            return $plain;
        } catch (\Throwable $e) {
            error_log('[PiiCryptoService] decrypt failed: ' . $e->getMessage());
            return $stored;
        }
    }

    /** Returns true if the value carries the encryption envelope. */
    public static function isEnvelope(string $value): bool
    {
        return strncmp($value, self::ENVELOPE_PREFIX, strlen(self::ENVELOPE_PREFIX)) === 0;
    }

    /** Lazy-load the 32-byte key from disk. Cached per-request. */
    private static function loadKey(): ?string
    {
        if (self::$cachedKey !== null) return self::$cachedKey;
        if (!is_readable(self::KEY_PATH)) {
            error_log('[PiiCryptoService] key not readable at ' . self::KEY_PATH);
            return null;
        }
        $raw = trim((string)@file_get_contents(self::KEY_PATH));
        $bytes = base64_decode($raw, true);
        if ($bytes === false || strlen($bytes) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
            error_log('[PiiCryptoService] key decode failed or wrong length');
            return null;
        }
        self::$cachedKey = $bytes;
        return self::$cachedKey;
    }
}
