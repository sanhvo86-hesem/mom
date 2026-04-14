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

        $this->assertStringContainsString('private function aiFeedbackRoles(): array', $source);
        $this->assertMatchesRegularExpression('/public function aiFeedbackSubmit\(\): never\s*\{.*?\$this->requireAnyRole\(\$user, \$this->aiFeedbackRoles\(\)\);.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertMatchesRegularExpression('/public function aiFeedbackSubmit\(\): never\s*\{.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertStringContainsString('aiFeedbackIdempotency', $source);
        $this->assertStringContainsString('$this->idempotency()->execute', $source);
        $this->assertStringContainsString("strlen(\$text) < 16 || strlen(\$text) > 128", $source);
    }

    public function testAiNaturalLanguageAndRcaWritesRequireCsrfAndScopedRoles(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/AiSchedulingController.php');

        $this->assertStringContainsString('private function aiReadRoles(): array', $source);
        $this->assertMatchesRegularExpression('/public function aiNlQuery\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertMatchesRegularExpression('/public function aiRcaAnalyze\(\): never\s*\{.*?\$this->requireAnyRole\(\$user,.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertStringContainsString('question_hash', $source);
    }

    public function testAiDocumentSummarizeRequiresScopedRoleCsrfAndContentHashAudit(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/AiSchedulingController.php');

        $this->assertMatchesRegularExpression('/public function aiDocumentSummarize\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);.*?\$this->requireCsrf\(\);/s', $source);
        $this->assertStringContainsString('$this->jsonBody(256 * 1024)', $source);
        $this->assertStringContainsString('content_too_large', $source);
        $this->assertStringContainsString('content_sha256', $source);
    }

    public function testAiReadSurfacesRequireScopedRolesAndScopedMetrics(): void
    {
        $controller = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/AiSchedulingController.php');
        $pipeline = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/services/AiPredictionPipeline.php');

        $this->assertMatchesRegularExpression('/public function aiModelList\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);/s', $controller);
        $this->assertMatchesRegularExpression('/public function listPredictions\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);/s', $controller);
        $this->assertMatchesRegularExpression('/public function getSpcAnomalies\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);/s', $controller);
        $this->assertMatchesRegularExpression('/public function getToolWearPredictions\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);/s', $controller);
        $this->assertMatchesRegularExpression('/public function getDashboard\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);/s', $controller);
        $this->assertMatchesRegularExpression('/public function aiDashboard\(\): never\s*\{.*?\$this->requireAiReadAccess\(\$user\);/s', $controller);
        $this->assertStringContainsString('SELECT COUNT(*) FROM production_schedule_slots {$scheduleWhere}', $controller);
        $this->assertStringContainsString('return $rowPlant === $plantId;', $controller);
        $this->assertStringNotContainsString("return \$rowPlant === '' || \$rowPlant === \$plantId;", $controller);
        $this->assertStringContainsString('$canViewModelInternals = $this->userHasAnyRole($user, admin_roles())', $controller);
        $this->assertStringContainsString('unset($row[\'training_data_source\'], $row[\'config\'], $row[\'metadata\']);', $controller);
        $this->assertStringContainsString('p.plant_id = :mtta_plant_id', $pipeline);
    }

    public function testCanonicalEvidenceFinalizationRequiresControlledRole(): void
    {
        $controller = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/EqmsControlPlaneController.php');

        $this->assertStringContainsString('private function evidenceFinalizationRoles(): array', $controller);
        $this->assertMatchesRegularExpression('/public function finalizeEvidencePackage\(\): never\s*\{.*?\$this->requireAnyRole\(\$user, \$this->evidenceFinalizationRoles\(\)\);.*?\$this->requireCsrf\(\);/s', $controller);
    }

    public function testEvidenceIdempotencyUsesPlatformKeyContract(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/EvidenceController.php');

        $this->assertStringContainsString("strlen(\$text) < 16 || strlen(\$text) > 128", $source);
        $this->assertStringContainsString("preg_match('/^[A-Za-z0-9._\\-]+$/', \$text)", $source);
        $this->assertStringNotContainsString("preg_match('/^[A-Za-z0-9._:\\-]+$/', \$text)", $source);
    }

    public function testExceptionAndOrderGenericUpdatesRejectUngovernedFields(): void
    {
        $exceptions = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/ExceptionController.php');
        $orders = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/OrderController.php');

        $this->assertStringContainsString('private const GOVERNED_EXCEPTION_FIELDS', $exceptions);
        $this->assertStringContainsString('private function guardedExceptionUpdate', $exceptions);
        $this->assertStringContainsString('exception_transition_required', $exceptions);
        $this->assertStringContainsString('unknown_exception_update_field', $exceptions);
        $this->assertStringContainsString('private const JO_UPDATE_FIELDS', $orders);
        $this->assertStringContainsString('private const WO_UPDATE_FIELDS', $orders);
        $this->assertStringContainsString('private function guardedOrderChanges', $orders);
        $this->assertStringContainsString('unknown_order_update_field', $orders);
    }

    public function testOrderScheduleCompatibilityAliasesUseExistingSchedulingController(): void
    {
        $routes = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/routes/operations-routes.php');

        $this->assertStringContainsString("'order_schedule_get'      => [AiSchedulingController::class, 'getSchedule']", $routes);
        $this->assertStringContainsString("'order_schedule_slot'     => [AiSchedulingController::class, 'createSlot']", $routes);
        $this->assertStringContainsString("'order_schedule_update'   => [AiSchedulingController::class, 'updateSlot']", $routes);
        $this->assertStringContainsString("'order_capacity_heatmap'  => [AiSchedulingController::class, 'getCapacityHeatmap']", $routes);
        $this->assertStringContainsString("'order_promise_suggest'   => [AiSchedulingController::class, 'suggestPromiseDate']", $routes);
        $this->assertStringNotContainsString("[OrderController::class, 'getSchedule']", $routes);
        $this->assertStringNotContainsString("[OrderController::class, 'createScheduleSlot']", $routes);
        $this->assertStringNotContainsString("[OrderController::class, 'updateScheduleSlot']", $routes);
    }

    public function testOrderHoldReleaseRequiresSourceOrderWritePermissionBeforeMutation(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/OrderController.php');

        $this->assertMatchesRegularExpression('/public function releaseHold\(\): never\s*\{.*?\$permission = match \(\$orderType\).*?\'so\' => \'so_write\'.*?\'jo\' => \'jo_write\'.*?\'wo\' => \'wo_write\'.*?\$this->requireOrderPermission\(\$user, \$permission\);.*?\$h\[\'released\'\]\s+= true;/s', $source);
        $this->assertStringContainsString('hold_order_type_invalid', $source);
    }

    public function testScheduleSlotWritesValidateDatesTimesAndPriority(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/controllers/AiSchedulingController.php');

        $this->assertStringContainsString('private function requireScheduleDate(string $date', $source);
        $this->assertStringContainsString('private function requireScheduleTimeRange(string $startTime, string $endTime)', $source);
        $this->assertMatchesRegularExpression('/public function createSlot\(\): never\s*\{.*?\$this->requireScheduleDate\(\$date\);.*?\$this->requireScheduleTimeRange\(\$startTime, \$endTime\);.*?invalid_priority/s', $source);
        $this->assertMatchesRegularExpression('/public function updateSlot\(\): never\s*\{.*?requireScheduleDate.*?requireScheduleTimeRange.*?invalid_priority/s', $source);
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
