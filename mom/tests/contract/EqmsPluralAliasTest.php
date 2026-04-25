<?php

declare(strict_types=1);

namespace Tests\Contract;

use MOM\Api\Controllers\EqmsBatchReleaseController;
use MOM\Api\Controllers\EqmsCapaController;
use MOM\Api\Controllers\EqmsDocumentsController;
use MOM\Api\Controllers\EqmsEngineeringChangeController;
use MOM\Api\Controllers\EqmsInspectionController;
use MOM\Api\Controllers\EqmsNcrController;
use MOM\Api\Controllers\EqmsTrainingController;
use MOM\Api\Router;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionProperty;

/**
 * Verifies that EQMS plural-form aliases are registered against real controller
 * methods and resolve without being shadowed by generic detail routes.
 */
final class EqmsPluralAliasTest extends TestCase
{
    /**
     * @dataProvider aliasRoutes
     */
    public function testPluralAliasRouteTargetsExistingControllerMethod(
        string $httpMethod,
        string $path,
        string $controller,
        string $handler
    ): void {
        $routes = $this->registeredRouteMap();

        $this->assertArrayHasKey($httpMethod, $routes);
        $this->assertArrayHasKey($path, $routes[$httpMethod]);
        $this->assertSame($controller, $routes[$httpMethod][$path]['class']);
        $this->assertSame($handler, $routes[$httpMethod][$path]['method']);
        $this->assertTrue(method_exists($controller, $handler), $controller . '::' . $handler . '() missing');
    }

    /**
     * @dataProvider actionResolutionCases
     */
    public function testPluralAliasRouteResolutionIsNotShadowed(
        string $httpMethod,
        string $requestPath,
        string $expectedPattern
    ): void {
        $_GET = [];
        $_POST = [];
        $_SERVER['REQUEST_METHOD'] = $httpMethod;
        $_SERVER['REQUEST_URI'] = $requestPath;
        unset($_SERVER['PATH_INFO']);

        $resolved = $this->router()->resolve();

        $this->assertSame($httpMethod . ':' . $expectedPattern, $resolved['action']);
    }

    public static function aliasRoutes(): array
    {
        return [
            ['GET', '/api/v1/nonconformance-cases', EqmsNcrController::class, 'query'],
            ['POST', '/api/v1/nonconformance-cases', EqmsNcrController::class, 'create'],
            ['POST', '/api/v1/nonconformance-cases/{id}:contain', EqmsNcrController::class, 'actionContain'],
            ['POST', '/api/v1/nonconformance-cases/{id}:investigate', EqmsNcrController::class, 'actionInvestigate'],
            ['POST', '/api/v1/nonconformance-cases/{id}:close', EqmsNcrController::class, 'actionClose'],
            ['POST', '/api/v1/nonconformance-cases/{id}:reopen', EqmsNcrController::class, 'actionReopen'],
            ['GET', '/api/v1/nonconformance-cases/{id}', EqmsNcrController::class, 'detail'],
            ['PATCH', '/api/v1/nonconformance-cases/{id}', EqmsNcrController::class, 'update'],
            ['GET', '/api/v1/nonconformance-cases/{id}/audit', EqmsNcrController::class, 'audit'],
            ['GET', '/api/v1/nonconformance-cases/{id}/comments', EqmsNcrController::class, 'comments'],
            ['POST', '/api/v1/nonconformance-cases/{id}/comments', EqmsNcrController::class, 'comments'],
            ['GET', '/api/v1/nonconformance-cases/{id}/attachments', EqmsNcrController::class, 'attachments'],
            ['POST', '/api/v1/nonconformance-cases/{id}/attachments', EqmsNcrController::class, 'attachments'],

            ['GET', '/api/v1/capas', EqmsCapaController::class, 'query'],
            ['POST', '/api/v1/capas', EqmsCapaController::class, 'create'],
            ['POST', '/api/v1/capas/{id}:start-analysis', EqmsCapaController::class, 'actionStartAnalysis'],
            ['POST', '/api/v1/capas/{id}:close', EqmsCapaController::class, 'actionClose'],
            ['POST', '/api/v1/capas/{id}:cancel', EqmsCapaController::class, 'actionCancel'],
            ['GET', '/api/v1/capas/{id}', EqmsCapaController::class, 'detail'],
            ['PATCH', '/api/v1/capas/{id}', EqmsCapaController::class, 'update'],
            ['GET', '/api/v1/capas/{id}/audit', EqmsCapaController::class, 'audit'],
            ['GET', '/api/v1/capas/{id}/comments', EqmsCapaController::class, 'comments'],
            ['POST', '/api/v1/capas/{id}/comments', EqmsCapaController::class, 'comments'],
            ['GET', '/api/v1/capas/{id}/attachments', EqmsCapaController::class, 'attachments'],
            ['POST', '/api/v1/capas/{id}/attachments', EqmsCapaController::class, 'attachments'],

            ['GET', '/api/v1/controlled-documents', EqmsDocumentsController::class, 'query'],
            ['POST', '/api/v1/controlled-documents', EqmsDocumentsController::class, 'create'],
            ['POST', '/api/v1/controlled-documents/{id}:approve', EqmsDocumentsController::class, 'actionApprove'],
            ['POST', '/api/v1/controlled-documents/{id}:release', EqmsDocumentsController::class, 'actionRelease'],
            ['GET', '/api/v1/controlled-documents/{id}', EqmsDocumentsController::class, 'detail'],
            ['PATCH', '/api/v1/controlled-documents/{id}', EqmsDocumentsController::class, 'update'],
            ['GET', '/api/v1/controlled-documents/{id}/audit', EqmsDocumentsController::class, 'audit'],
            ['GET', '/api/v1/controlled-documents/{id}/comments', EqmsDocumentsController::class, 'comments'],
            ['POST', '/api/v1/controlled-documents/{id}/comments', EqmsDocumentsController::class, 'comments'],
            ['GET', '/api/v1/controlled-documents/{id}/attachments', EqmsDocumentsController::class, 'attachments'],
            ['POST', '/api/v1/controlled-documents/{id}/attachments', EqmsDocumentsController::class, 'attachments'],

            ['GET', '/api/v1/inspections', EqmsInspectionController::class, 'query'],
            ['POST', '/api/v1/inspections/{id}:flag-nonconformance', EqmsInspectionController::class, 'inprocessActionFlagNc'],

            ['GET', '/api/v1/batch-releases', EqmsBatchReleaseController::class, 'query'],
            ['POST', '/api/v1/batch-releases/{id}:approve-release', EqmsBatchReleaseController::class, 'actionApproveRelease'],
            ['POST', '/api/v1/batch-releases/{id}:market-ship', EqmsBatchReleaseController::class, 'actionMarketShip'],
            ['GET', '/api/v1/batch-releases/{id}', EqmsBatchReleaseController::class, 'detail'],

            ['GET', '/api/v1/engineering-changes', EqmsEngineeringChangeController::class, 'query'],
            ['POST', '/api/v1/engineering-changes', EqmsEngineeringChangeController::class, 'create'],
            ['GET', '/api/v1/engineering-changes/{id}', EqmsEngineeringChangeController::class, 'detail'],
            ['PATCH', '/api/v1/engineering-changes/{id}', EqmsEngineeringChangeController::class, 'update'],
            ['GET', '/api/v1/engineering-changes/{id}/audit', EqmsEngineeringChangeController::class, 'audit'],

            ['GET', '/api/v1/training-records', EqmsTrainingController::class, 'query'],
            ['POST', '/api/v1/training-records', EqmsTrainingController::class, 'create'],
            ['GET', '/api/v1/training-records/matrix', EqmsTrainingController::class, 'matrix'],
            ['GET', '/api/v1/training-records/curricula', EqmsTrainingController::class, 'curricula'],
            ['GET', '/api/v1/training-records/{id}', EqmsTrainingController::class, 'detail'],
            ['PATCH', '/api/v1/training-records/{id}', EqmsTrainingController::class, 'update'],
            ['GET', '/api/v1/training-records/{id}/audit', EqmsTrainingController::class, 'audit'],
        ];
    }

    public static function actionResolutionCases(): array
    {
        return [
            ['POST', '/api/v1/nonconformance-cases/NC-001:contain', '/api/v1/nonconformance-cases/{id}:contain'],
            ['POST', '/api/v1/capas/CAPA-001:start-analysis', '/api/v1/capas/{id}:start-analysis'],
            ['POST', '/api/v1/controlled-documents/CDOC-001:release', '/api/v1/controlled-documents/{id}:release'],
            ['POST', '/api/v1/batch-releases/BR-001:market-ship', '/api/v1/batch-releases/{id}:market-ship'],
            ['GET', '/api/v1/training-records/matrix', '/api/v1/training-records/matrix'],
            ['GET', '/api/v1/training-records/curricula', '/api/v1/training-records/curricula'],
        ];
    }

    /**
     * @return array<string, array<string, array{class: string, method: string}>>
     */
    private function registeredRouteMap(): array
    {
        $router = $this->router();
        $property = new ReflectionProperty(Router::class, 'restRoutes');

        return $property->getValue($router);
    }

    private function router(): Router
    {
        $dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR, ['use_postgres' => false]);
        $router = new Router($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR);
        $registerRoutes = require QMS_TEST_BASE_DIR . '/api/routes/rest-routes.php';
        $registerRoutes($router, QMS_TEST_DATA_DIR);

        return $router;
    }
}
