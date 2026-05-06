<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Encrypts and stores per-provider API keys for the translation admin module.
 *
 * Storage:
 *   - translation_credentials.ciphertext: libsodium secretbox(api_key, nonce, master_key)
 *   - translation_credentials.nonce:      24-byte random nonce per write
 *   - translation_credentials.key_fingerprint: sha256(api_key)[:32] hex,
 *     safe to display so admin can verify which key is loaded without ever
 *     revealing it.
 *
 * Master key:
 *   - Derived from APP_SECRET_KEY env var (must be >=32 raw bytes; we hash
 *     anything shorter to a stable 32-byte key).
 *   - Never written to disk by this service. If the env var is unset, every
 *     encrypt() call throws — the UI surfaces this as a setup banner.
 *
 * Threat model:
 *   - DB dump alone leaks nothing (no master key inside).
 *   - .env leak alone leaks nothing (no ciphertext inside).
 *   - Both leaked together: keys are recoverable. This is the standard
 *     envelope-encryption tradeoff and matches how API keys are typically
 *     handled in self-hosted apps.
 */
final class SecretVaultService
{
    private const NONCE_BYTES = 24; // SODIUM_CRYPTO_SECRETBOX_NONCEBYTES
    private const KEY_BYTES = 32;   // SODIUM_CRYPTO_SECRETBOX_KEYBYTES
    private const ENV_KEY = 'APP_SECRET_KEY';

    public function __construct(private readonly DataLayer $data) {}

    /**
     * Returns true if the master key is available. UI uses this to decide
     * whether to enable the API-key form or show a setup banner.
     */
    public function isReady(): bool
    {
        return $this->resolveMasterKey() !== null;
    }

    /**
     * Encrypt and persist an API key for a provider. Idempotent on
     * provider_key — replacing rotates the secret.
     *
     * @return array{fingerprint: string} for confirmation in UI
     */
    public function store(string $providerKey, string $apiKey, ?string $actor = null): array
    {
        $apiKey = trim($apiKey);
        if ($apiKey === '') {
            throw new RuntimeException('API key is empty.');
        }
        $masterKey = $this->resolveMasterKey();
        if ($masterKey === null) {
            throw new RuntimeException(
                'APP_SECRET_KEY is not configured. Set it in the environment before saving API keys.'
            );
        }
        if (!extension_loaded('sodium')) {
            throw new RuntimeException(
                'PHP sodium extension is required to store credentials. Install ext-sodium.'
            );
        }

        $nonce = random_bytes(self::NONCE_BYTES);
        $ciphertext = sodium_crypto_secretbox($apiKey, $nonce, $masterKey);
        $fingerprint = substr(hash('sha256', $apiKey), 0, 32);

        $existing = $this->data->query(
            'SELECT 1 FROM translation_credentials WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        if (is_array($existing) && count($existing) > 0) {
            $this->data->execute(
                'UPDATE translation_credentials
                    SET credential_kind = :p1,
                        ciphertext = :p2,
                        nonce = :p3,
                        key_fingerprint = :p4,
                        rotated_at = now(),
                        created_by = COALESCE(created_by, :p5),
                        updated_at = now()
                  WHERE provider_key = :p6',
                [':p1' => 'api_key', ':p2' => $ciphertext, ':p3' => $nonce, ':p4' => $fingerprint, ':p5' => $actor, ':p6' => $providerKey]
            );
        } else {
            $this->data->execute(
                'INSERT INTO translation_credentials
                    (provider_key, credential_kind, ciphertext, nonce, key_fingerprint, created_by)
                 VALUES (:p1, :p2, :p3, :p4, :p5, :p6)',
                [':p1' => $providerKey, ':p2' => 'api_key', ':p3' => $ciphertext, ':p4' => $nonce, ':p5' => $fingerprint, ':p6' => $actor]
            );
        }

        sodium_memzero($apiKey);

        return ['fingerprint' => $fingerprint];
    }

    /**
     * Decrypt and return the plaintext API key. Used ONLY at the moment a
     * provider script is spawned, never logged or returned through HTTP.
     */
    public function reveal(string $providerKey): ?string
    {
        $masterKey = $this->resolveMasterKey();
        if ($masterKey === null) {
            return null;
        }
        if (!extension_loaded('sodium')) {
            return null;
        }
        $rows = $this->data->query(
            'SELECT ciphertext, nonce
               FROM translation_credentials
              WHERE provider_key = :p1
                AND credential_kind = :p2',
            [':p1' => $providerKey, ':p2' => 'api_key']
        );
        if (!is_array($rows) || count($rows) === 0) {
            return null;
        }
        $row = $rows[0];
        $cipher = $this->normaliseBinary($row['ciphertext'] ?? null);
        $nonce = $this->normaliseBinary($row['nonce'] ?? null);
        if ($cipher === null || $nonce === null) {
            return null;
        }
        $plain = sodium_crypto_secretbox_open($cipher, $nonce, $masterKey);
        return $plain === false ? null : $plain;
    }

    /**
     * Public-safe info about a credential row. Never exposes ciphertext.
     *
     * @return array<string, mixed>|null
     */
    public function describe(string $providerKey): ?array
    {
        $rows = $this->data->query(
            'SELECT credential_kind, key_fingerprint, cli_binary_path, cli_auth_home_path,
                    cli_auth_subject, available_models, models_fetched_at,
                    last_test_at, last_test_status, last_test_message,
                    rate_limit_window, rotated_at, updated_at
               FROM translation_credentials
              WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        if (!is_array($rows) || count($rows) === 0) {
            return null;
        }
        $row = $rows[0];
        unset($row['ciphertext'], $row['nonce']); // defense in depth
        return $row;
    }

    public function delete(string $providerKey): bool
    {
        $affected = $this->data->execute(
            'DELETE FROM translation_credentials WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        return $affected > 0;
    }

    private function resolveMasterKey(): ?string
    {
        $raw = (string)(getenv(self::ENV_KEY) ?: '');
        if ($raw === '') {
            return null;
        }
        // Accept either raw 32+ bytes or any string we can hash to 32 bytes.
        // hash('sha256', $raw, true) gives exactly 32 raw bytes — stable
        // across processes, identical to a key that was generated as
        // sha256(secret) anywhere else.
        if (strlen($raw) >= self::KEY_BYTES) {
            // Already long enough; trim to exact size for consistency.
            return substr($raw, 0, self::KEY_BYTES);
        }
        return hash('sha256', $raw, true);
    }

    private function normaliseBinary(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (is_string($value)) {
            // pgsql may return bytea as either resource, hex-prefixed string,
            // or raw bytes depending on driver mode. Handle the common
            // \x-prefixed hex form explicitly.
            if (strncmp($value, '\\x', 2) === 0) {
                $hex = substr($value, 2);
                $bin = @hex2bin($hex);
                return $bin === false ? null : $bin;
            }
            return $value;
        }
        if (is_resource($value)) {
            $contents = stream_get_contents($value);
            return $contents === false ? null : $contents;
        }
        return null;
    }
}
