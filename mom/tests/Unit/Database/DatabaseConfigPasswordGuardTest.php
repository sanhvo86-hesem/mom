<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;
use RuntimeException;

final class DatabaseConfigPasswordGuardTest extends TestCase
{
    /** @var array<string, string|false> */
    private array $originalEnv = [];

    protected function setUp(): void
    {
        foreach ($this->envKeys() as $key) {
            $this->originalEnv[$key] = getenv($key);
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->originalEnv as $key => $value) {
            if ($value === false) {
                putenv($key);
                continue;
            }
            putenv($key . '=' . $value);
        }
    }

    public function testJsonOnlyProductionConfigBootsWithoutDbPassword(): void
    {
        $this->setEnv([
            'APP_ENV' => 'production',
            'USE_POSTGRES' => 'false',
            'SHADOW_WRITE' => 'false',
            'JSON_FALLBACK' => 'false',
            'DB_ALLOW_EMPTY_PASSWORD' => 'false',
            'DB_REQUIRE_PASSWORD' => null,
            'DB_PASSWORD' => null,
            'DB_PASS' => null,  // CI sets DB_PASS=test_password; clear it for json-only path
        ]);

        $config = $this->loadConfig();

        $this->assertFalse($config['use_postgres']);
        $this->assertSame('', $config['password']);
    }

    public function testPostgresProductionConfigStillRequiresDbPassword(): void
    {
        $this->setEnv([
            'APP_ENV' => 'production',
            'USE_POSTGRES' => 'true',
            'SHADOW_WRITE' => 'false',
            'JSON_FALLBACK' => 'true',
            'DB_ALLOW_EMPTY_PASSWORD' => 'false',
            'DB_REQUIRE_PASSWORD' => null,
            'DB_PASSWORD' => null,
            'DB_PASS' => null,
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('DB_PASSWORD (or legacy DB_PASS) environment variable is required');

        $this->loadConfig();
    }

    public function testLegacyDbPassFallbackIsAcceptedWhenDbPasswordNotSet(): void
    {
        // VPS setup scripts historically export DB_PASS (not DB_PASSWORD).
        // database/config.php must accept DB_PASS as a backward-compatible fallback
        // so that existing deployments work without silent password loss.
        $this->setEnv([
            'APP_ENV' => 'production',
            'USE_POSTGRES' => 'true',
            'SHADOW_WRITE' => 'false',
            'JSON_FALLBACK' => 'true',
            'DB_ALLOW_EMPTY_PASSWORD' => 'false',
            'DB_REQUIRE_PASSWORD' => null,
            'DB_PASSWORD' => null,        // primary not set
            'DB_PASS' => 'legacy-secret', // legacy alias IS set
        ]);

        $config = $this->loadConfig();

        $this->assertSame('legacy-secret', $config['password'],
            'DB_PASS should be accepted as fallback when DB_PASSWORD is absent');
    }

    public function testDbPasswordTakesPrecedenceOverDbPass(): void
    {
        // When both are set, DB_PASSWORD (primary) wins over DB_PASS (legacy).
        $this->setEnv([
            'APP_ENV' => 'testing',
            'USE_POSTGRES' => 'false',
            'SHADOW_WRITE' => 'false',
            'JSON_FALLBACK' => 'false',
            'DB_ALLOW_EMPTY_PASSWORD' => 'false',
            'DB_REQUIRE_PASSWORD' => null,
            'DB_PASSWORD' => 'primary-secret',
            'DB_PASS' => 'legacy-secret',
        ]);

        $config = $this->loadConfig();

        $this->assertSame('primary-secret', $config['password'],
            'DB_PASSWORD should take precedence over DB_PASS when both are set');
    }

    /**
     * @return array<string, mixed>
     */
    private function loadConfig(): array
    {
        $config = require QMS_TEST_BASE_DIR . '/database/config.php';
        $this->assertIsArray($config);

        return $config;
    }

    /**
     * @param array<string, string|null> $values
     */
    private function setEnv(array $values): void
    {
        foreach ($values as $key => $value) {
            if ($value === null) {
                putenv($key);
                continue;
            }
            putenv($key . '=' . $value);
        }
    }

    /**
     * @return list<string>
     */
    private function envKeys(): array
    {
        return [
            'APP_ENV',
            'USE_POSTGRES',
            'SHADOW_WRITE',
            'JSON_FALLBACK',
            'DB_ALLOW_EMPTY_PASSWORD',
            'DB_REQUIRE_PASSWORD',
            'DB_PASSWORD',
            'DB_PASS',
        ];
    }
}
