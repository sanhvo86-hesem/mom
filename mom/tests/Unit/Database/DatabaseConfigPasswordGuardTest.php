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
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('DB_PASSWORD environment variable is required');

        $this->loadConfig();
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
        ];
    }
}
