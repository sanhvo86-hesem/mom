<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * ApiKeyController - Manage API keys and generate JWT tokens.
 *
 * Admin-only endpoints for:
 *   - Creating API keys for external services
 *   - Revoking/listing API keys
 *   - Generating short-lived JWT tokens
 *
 * @package MOM\Api\Controllers
 * @since   2.1.0
 */
class ApiKeyController extends BaseController
{
    private string $keyFile;

    /**
     * Constructor must receive DataLayer, rootDir, and dataDir from the factory.
     * Parent constructor handles initialization.
     *
     * @param \MOM\Database\DataLayer $data    Shared data layer instance.
     * @param string                  $rootDir Absolute path to project root.
     * @param string                  $dataDir Absolute path to data directory.
     */
    public function __construct(\MOM\Database\DataLayer $data, string $rootDir, string $dataDir)
    {
        parent::__construct($data, $rootDir, $dataDir);
        $this->keyFile = $dataDir . '/config/api_keys.json';
    }

    /**
     * POST /api/auth/api-keys - Create a new API key.
     *
     * Body: { "name": "Epicor Integration", "scopes": ["read:orders","write:orders"], "expires_in_days": 365 }
     * Response: { "ok": true, "key_id": "...", "api_key": "mom_key_...", "scopes": [...] }
     *
     * IMPORTANT: The raw API key is only returned ONCE at creation time.
     */
    public function create(): void
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $name = trim($body['name'] ?? '');
        $scopes = $body['scopes'] ?? ['read:*'];
        $expiresInDays = (int)($body['expires_in_days'] ?? 365);

        if ($name === '') {
            $this->json(['ok' => false, 'error' => 'name_required'], 400);
        }

        // Generate API key
        $rawKey = 'mom_key_' . bin2hex(random_bytes(32));
        $keyId = 'key_' . bin2hex(random_bytes(8));
        $hashedKey = hash('sha256', $rawKey);
        $expiresAt = $expiresInDays > 0
            ? gmdate('c', time() + ($expiresInDays * 86400))
            : null;

        $keyRecord = [
            'key_id'     => $keyId,
            'name'       => $name,
            'hash'       => $hashedKey,
            'scopes'     => is_array($scopes) ? $scopes : [$scopes],
            'user_id'    => $body['user_id'] ?? 'api-service',
            'active'     => true,
            'created_at' => gmdate('c'),
            'created_by' => $user['username'] ?? 'system',
            'expires_at' => $expiresAt,
            'last_used'  => null,
        ];

        // Save to store
        $store = $this->loadStore();
        $store['keys'][] = $keyRecord;
        $this->saveStore($store);

        // Invalidate cache
        $this->invalidateCache();

        $this->json([
            'ok'      => true,
            'key_id'  => $keyId,
            'api_key' => $rawKey, // Only returned once!
            'name'    => $name,
            'scopes'  => $keyRecord['scopes'],
            'expires_at' => $expiresAt,
        ], 201);
    }

    /**
     * GET /api/auth/api-keys - List all API keys (hashes hidden).
     */
    public function list(): void
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $store = $this->loadStore();
        $keys = array_map(function (array $key): array {
            unset($key['hash']); // Never expose hash
            return $key;
        }, $store['keys'] ?? []);

        $this->json([
            'ok'    => true,
            'keys'  => array_values($keys),
            'count' => count($keys),
        ]);
    }

    /**
     * DELETE /api/auth/api-keys/{keyId} - Revoke an API key.
     */
    public function revoke(): void
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();

        $keyId = $_GET['key_id'] ?? $_GET['keyId'] ?? '';
        if ($keyId === '') {
            $this->json(['ok' => false, 'error' => 'key_id_required'], 400);
        }

        $store = $this->loadStore();
        $found = false;
        foreach ($store['keys'] ?? [] as &$key) {
            if (($key['key_id'] ?? '') === $keyId) {
                $key['active'] = false;
                $key['revoked_at'] = gmdate('c');
                $key['revoked_by'] = $user['username'] ?? 'system';
                $found = true;
                break;
            }
        }
        unset($key);

        if (!$found) {
            $this->json(['ok' => false, 'error' => 'key_not_found'], 404);
        }

        $this->saveStore($store);
        $this->invalidateCache();

        $this->json(['ok' => true, 'key_id' => $keyId, 'revoked' => true]);
    }

    /**
     * POST /api/auth/jwt - Generate a short-lived JWT token.
     *
     * Body: { "scopes": ["read:orders"], "expires_in_minutes": 60 }
     */
    public function generateJwt(): void
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();

        $jwtSecret = getenv('JWT_SECRET') ?: '';
        if ($jwtSecret === '') {
            $this->json(['ok' => false, 'error' => 'jwt_secret_not_configured'], 500);
        }

        $body = $this->jsonBody();
        $scopes = $body['scopes'] ?? ['read:*'];
        $expiresInMinutes = max(1, min(1440, (int)($body['expires_in_minutes'] ?? 60)));
        $subject = $body['subject'] ?? ($user['username'] ?? 'system');

        try {
            $config = \Lcobucci\JWT\Configuration::forSymmetricSigner(
                new \Lcobucci\JWT\Signer\Hmac\Sha256(),
                \Lcobucci\JWT\Signer\Key\InMemory::plainText($jwtSecret)
            );

            $now = new \DateTimeImmutable();
            $token = $config->builder()
                ->issuedBy('mom-portal')
                ->permittedFor('mom-api')
                ->identifiedBy(bin2hex(random_bytes(8)))
                ->issuedAt($now)
                ->canOnlyBeUsedAfter($now)
                ->expiresAt($now->modify("+{$expiresInMinutes} minutes"))
                ->relatedTo($subject)
                ->withClaim('scopes', $scopes)
                ->getToken($config->signer(), $config->signingKey());

            $this->json([
                'ok'         => true,
                'token'      => $token->toString(),
                'token_type' => 'Bearer',
                'expires_in' => $expiresInMinutes * 60,
                'scopes'     => $scopes,
            ]);
        } catch (\Throwable $e) {
            @error_log("[ApiKeyController] JWT generation error: {$e->getMessage()}");
            $this->json(['ok' => false, 'error' => 'jwt_generation_failed'], 500);
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private function loadStore(): array
    {
        if (!is_file($this->keyFile)) {
            return ['keys' => [], 'version' => '1.0'];
        }
        $raw = @file_get_contents($this->keyFile);
        $data = $raw !== false ? json_decode($raw, true) : null;
        return is_array($data) ? $data : ['keys' => [], 'version' => '1.0'];
    }

    private function saveStore(array $store): void
    {
        $dir = dirname($this->keyFile);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $encoded = json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $tmp = $this->keyFile . '.tmp';
        if (@file_put_contents($tmp, $encoded, LOCK_EX) !== false) {
            @rename($tmp, $this->keyFile);
        }
    }

    private function invalidateCache(): void
    {
        // If CacheService is available globally, invalidate
        // For now, rely on TTL-based cache expiry (5 min)
    }
}
