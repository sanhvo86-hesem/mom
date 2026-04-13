<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Services\LocalStorageDriver;
use PHPUnit\Framework\TestCase;

if (!defined('QMS_TEST_BASE_DIR')) {
    define('QMS_TEST_BASE_DIR', dirname(__DIR__, 3));
}

require_once QMS_TEST_BASE_DIR . '/api/services/StorageService.php';

final class SecurityHardeningRegressionTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_security_regression_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testApiKeyMutationsRequireCsrfAndRestKeyIdAlias(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/ApiKeyController.php');

        $this->assertStringContainsString('public function create(): void', $source);
        $this->assertMatchesRegularExpression('/public function create\(\): void\s*\{.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertMatchesRegularExpression('/public function revoke\(\): void\s*\{.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertStringContainsString("\$_GET['key_id'] ?? \$_GET['keyId'] ?? ''", $source);
        $this->assertMatchesRegularExpression('/public function generateJwt\(\): void\s*\{.*?\$this->requireCsrf\(\);/s', $source);
    }

    public function testAiFeedbackWriteRequiresCsrfAndIdempotency(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/AiSchedulingController.php');

        $this->assertMatchesRegularExpression('/public function aiFeedbackSubmit\(\): never\s*\{.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertStringContainsString('aiFeedbackIdempotency', $source);
        $this->assertStringContainsString('$this->idempotency()->execute', $source);
    }

    public function testAiNaturalLanguageAndRcaWritesRequireCsrfAndScopedRoles(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/AiSchedulingController.php');

        $this->assertStringContainsString('private function aiReadRoles(): array', $source);
        $this->assertMatchesRegularExpression('/public function aiNlQuery\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertMatchesRegularExpression('/public function aiRcaAnalyze\(\): never\s*\{.*?\$this->requireAnyRole\(\$user,.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertStringContainsString('question_hash', $source);
    }

    public function testOperationalOverridesUseCanonicalElevatedRolesAfterPermissionGate(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/OperationalOverrideController.php');

        $this->assertStringContainsString('private function overrideElevatedRoles(): array', $source);
        $this->assertStringContainsString('admin_roles()', $source);
        $this->assertStringContainsString("'production_director'", $source);
        $this->assertStringContainsString("'cnc_workshop_manager'", $source);
        $this->assertStringContainsString('$this->userHasAnyRole($user, $this->overrideElevatedRoles())', $source);
        $this->assertMatchesRegularExpression('/public function createOverride\(\): never\s*\{.*?\$this->requireOverrideWrite\(\$user\);.*?\$this->requireElevatedRole\(\$user\);.*?\$this->requireCsrf\(\);/s', $source);
    }

    public function testFmeaAccessUsesMigratedRolesAndRoleBuckets(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/FmeaController.php');

        $this->assertStringContainsString('private function fmeaPermissionRoles(array $user): array', $source);
        $this->assertStringContainsString('migrate_role(strtolower(trim((string)$role)))', $source);
        $this->assertStringContainsString("\$roles[] = 'quality';", $source);
        $this->assertStringContainsString("\$roles[] = 'engineering';", $source);
        $this->assertStringContainsString("\$roles[] = 'production';", $source);
        $this->assertStringContainsString('$this->userHasAnyRole($user, $this->fmeaElevatedRoles())', $source);
    }

    public function testLocalStorageAllowsFirstWriteToNewSubdirectoryButRejectsTraversal(): void
    {
        $driver = new LocalStorageDriver($this->tmpDir);

        $this->assertTrue($driver->put('nested/new/file.txt', 'ok'));
        $this->assertSame('ok', $driver->get('nested/new/file.txt'));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Path traversal detected');
        $driver->put('../escape.txt', 'bad');
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
