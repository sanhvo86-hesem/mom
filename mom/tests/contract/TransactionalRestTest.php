<?php

declare(strict_types=1);

namespace Tests\Contract;

use MOM\Api\Controllers\OrderController;
use MOM\Api\Router;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionProperty;

require_once QMS_TEST_BASE_DIR . '/api/controllers/ExitException.php';
require_once QMS_TEST_BASE_DIR . '/api/controllers/BaseController.php';
require_once QMS_TEST_BASE_DIR . '/api/controllers/OrderController.php';

/**
 * Verifies canonical ADR-0008 plural-form SO/JO/WO REST routes.
 */
final class TransactionalRestTest extends TestCase
{
    /**
     * @dataProvider canonicalRoutes
     */
    public function testCanonicalRouteTargetsExistingOrderControllerMethod(
        string $httpMethod,
        string $path,
        string $handler
    ): void {
        $routes = $this->registeredRouteMap();

        $this->assertArrayHasKey($httpMethod, $routes);
        $this->assertArrayHasKey($path, $routes[$httpMethod]);
        $this->assertSame(OrderController::class, $routes[$httpMethod][$path]['class']);
        $this->assertSame($handler, $routes[$httpMethod][$path]['method']);
        $this->assertTrue(method_exists(OrderController::class, $handler), OrderController::class . '::' . $handler . '() missing');
    }

    /**
     * @dataProvider actionResolutionCases
     */
    public function testCanonicalRouteResolutionUsesPluralPattern(
        string $httpMethod,
        string $requestPath,
        string $expectedPattern,
        array $expectedParams
    ): void {
        $_GET = [];
        $_POST = [];
        $_SERVER['REQUEST_METHOD'] = $httpMethod;
        $_SERVER['REQUEST_URI'] = $requestPath;
        unset($_SERVER['PATH_INFO']);

        $resolved = $this->router()->resolve();

        $this->assertSame($httpMethod . ':' . $expectedPattern, $resolved['action']);
        $this->assertSame($expectedParams, $resolved['params']);
    }

    public static function canonicalRoutes(): array
    {
        return [
            ['GET', '/api/v1/sales-orders', 'listSalesOrders'],
            ['POST', '/api/v1/sales-orders', 'createSalesOrder'],
            ['GET', '/api/v1/sales-orders/{soNumber}', 'getSalesOrderDetailForPath'],
            ['PATCH', '/api/v1/sales-orders/{soNumber}', 'updateSalesOrderForPath'],
            ['POST', '/api/v1/sales-orders/{soNumber}:transition', 'transitionSalesOrder'],
            ['GET', '/api/v1/job-orders', 'listJobOrders'],
            ['POST', '/api/v1/job-orders', 'createJobOrder'],
            ['GET', '/api/v1/job-orders/{joNumber}', 'getJobOrderDetailForPath'],
            ['PATCH', '/api/v1/job-orders/{joNumber}', 'updateJobOrderForPath'],
            ['POST', '/api/v1/job-orders/{joNumber}:transition', 'transitionJobOrder'],
            ['GET', '/api/v1/work-orders', 'listWorkOrders'],
            ['POST', '/api/v1/work-orders', 'createWorkOrder'],
            ['GET', '/api/v1/work-orders/{woNumber}', 'getWorkOrderDetail'],
            ['PATCH', '/api/v1/work-orders/{woNumber}', 'updateWorkOrderForPath'],
            ['POST', '/api/v1/work-orders/{woNumber}:transition', 'transitionWorkOrder'],
        ];
    }

    public static function actionResolutionCases(): array
    {
        return [
            ['GET', '/api/v1/sales-orders/SO-2026-0001', '/api/v1/sales-orders/{soNumber}', ['soNumber' => 'SO-2026-0001']],
            ['PATCH', '/api/v1/job-orders/JOB-2026-0002', '/api/v1/job-orders/{joNumber}', ['joNumber' => 'JOB-2026-0002']],
            ['POST', '/api/v1/work-orders/WO-2026-000003:transition', '/api/v1/work-orders/{woNumber}:transition', ['woNumber' => 'WO-2026-000003']],
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
