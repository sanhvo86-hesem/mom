<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\EqmsReferenceController;
use MOM\Api\Controllers\ExitException;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

final class EqmsReferenceControllerSecurityTest extends TestCase
{
    public function testEmployeesReferenceRequiresDirectoryClearance(): void
    {
        $controller = $this->controller();

        try {
            $this->authorizeReferenceKey($controller, [
                'username' => 'quality-user',
                'role' => 'quality_engineer',
                'roles' => ['quality_engineer'],
            ], 'employees', 'em');
            $this->fail('Employees directory lookup should require elevated clearance.');
        } catch (ExitException $e) {
            $this->assertSame(403, $e->getStatusCode());
            $this->assertSame('forbidden', $e->getPayload()['error'] ?? null);
            $this->assertSame('employees', $e->getPayload()['reference_key'] ?? null);
        }
    }

    public function testUsersReferenceRequiresSearchForNonPrivilegedReader(): void
    {
        $controller = $this->controller();

        try {
            $this->authorizeReferenceKey($controller, [
                'username' => 'quality-user',
                'role' => 'quality_engineer',
                'roles' => ['quality_engineer'],
            ], 'users', '');
            $this->fail('Directory lookup without search should be rejected for non-privileged readers.');
        } catch (ExitException $e) {
            $this->assertSame(400, $e->getStatusCode());
            $this->assertSame('search_required', $e->getPayload()['error'] ?? null);
            $this->assertSame('users', $e->getPayload()['reference_key'] ?? null);
        }
    }

    public function testUsersReferenceAllowsSearchForEqmsReader(): void
    {
        $controller = $this->controller();

        $this->authorizeReferenceKey($controller, [
            'username' => 'quality-user',
            'role' => 'quality_engineer',
            'roles' => ['quality_engineer'],
        ], 'users', 'ng');

        $this->assertSame(25, $this->effectiveLimitForReferenceKey($controller, [
            'username' => 'quality-user',
            'role' => 'quality_engineer',
            'roles' => ['quality_engineer'],
        ], 'users', 100));
    }

    public function testUsersReferenceNoLongerExposesEmailInMetadataProjection(): void
    {
        $reflection = new ReflectionClass(EqmsReferenceController::class);
        $constant = $reflection->getReflectionConstant('ENTITY_SOURCES');
        $this->assertNotNull($constant);

        /** @var array<string, array<string, mixed>> $sources */
        $sources = $constant->getValue();
        $this->assertArrayHasKey('users', $sources);
        $this->assertStringNotContainsString('email', (string)($sources['users']['meta'] ?? ''));
    }

    private function controller(): EqmsReferenceController
    {
        $dataDir = (string) constant('QMS_TEST_DATA_DIR');
        $rootDir = (string) constant('QMS_TEST_ROOT_DIR');

        return new EqmsReferenceController(
            new DataLayer($dataDir, $rootDir),
            $rootDir,
            $dataDir
        );
    }

    /**
     * @param array<string, mixed> $user
     * @throws ExitException
     */
    private function authorizeReferenceKey(EqmsReferenceController $controller, array $user, string $key, string $search): void
    {
        $this->method($controller, 'authorizeReferenceKey')->invoke($controller, $user, $key, $search);
    }

    /**
     * @param array<string, mixed> $user
     */
    private function effectiveLimitForReferenceKey(EqmsReferenceController $controller, array $user, string $key, int $limit): int
    {
        return (int) $this->method($controller, 'effectiveLimitForReferenceKey')->invoke($controller, $user, $key, $limit);
    }

    private function method(object $target, string $name): ReflectionMethod
    {
        $method = new ReflectionMethod($target, $name);
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        return $method;
    }
}
