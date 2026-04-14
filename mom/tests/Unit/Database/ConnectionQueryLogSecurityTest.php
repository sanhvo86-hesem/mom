<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class ConnectionQueryLogSecurityTest extends TestCase
{
    private string $tmpFile;

    protected function setUp(): void
    {
        $this->tmpFile = sys_get_temp_dir() . '/mom_query_log_' . bin2hex(random_bytes(4)) . '.jsonl';
    }

    protected function tearDown(): void
    {
        if (is_file($this->tmpFile)) {
            unlink($this->tmpFile);
        }
    }

    public function testQueryLogRedactsBindValuesBeforeMemoryAndFileLogging(): void
    {
        $connection = $this->newConnectionForLogTest();
        $this->invokeLogQuery($connection, [
            ':password' => 'super-secret',
            ':email' => 'operator@example.com',
            ':work_order' => 'WO-12345',
        ]);

        $memoryLog = $connection->getQueryLog();
        $fileLog = (string)file_get_contents($this->tmpFile);
        $serializedMemory = json_encode($memoryLog, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        self::assertIsString($serializedMemory);
        self::assertStringNotContainsString('super-secret', $serializedMemory);
        self::assertStringNotContainsString('operator@example.com', $serializedMemory);
        self::assertStringNotContainsString('WO-12345', $serializedMemory);
        self::assertStringNotContainsString('super-secret', $fileLog);
        self::assertStringNotContainsString('operator@example.com', $fileLog);
        self::assertStringNotContainsString('WO-12345', $fileLog);
        self::assertStringContainsString('[redacted]', $serializedMemory);
        self::assertStringContainsString('sha256_12', $serializedMemory);
    }

    private function newConnectionForLogTest(): Connection
    {
        $reflection = new ReflectionClass(Connection::class);
        /** @var Connection $connection */
        $connection = $reflection->newInstanceWithoutConstructor();

        $config = $reflection->getProperty('config');
        $config->setValue($connection, [
            'log_queries' => true,
            'slow_query_ms' => 0,
            'log_file' => $this->tmpFile,
        ]);

        $queryLog = $reflection->getProperty('queryLog');
        $queryLog->setValue($connection, []);

        return $connection;
    }

    /**
     * @param array<string, mixed> $params
     */
    private function invokeLogQuery(Connection $connection, array $params): void
    {
        $reflection = new ReflectionClass($connection);
        $method = $reflection->getMethod('logQuery');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }
        $method->invoke($connection, 'SELECT * FROM users WHERE email = :email', $params, microtime(true) - 1.0);
    }
}
