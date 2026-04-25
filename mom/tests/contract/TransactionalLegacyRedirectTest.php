<?php

declare(strict_types=1);

namespace Tests\Contract;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\OrderController;
use MOM\Api\Router;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionProperty;

require_once QMS_TEST_BASE_DIR . '/api/controllers/ExitException.php';
require_once QMS_TEST_BASE_DIR . '/api/controllers/BaseController.php';
require_once QMS_TEST_BASE_DIR . '/api/controllers/OrderController.php';

/**
 * Verifies legacy /api/orders/* routes point at ADR-0008 301 redirect handlers.
 */
final class TransactionalLegacyRedirectTest extends TestCase
{
    /**
     * @dataProvider redirectRoutes
     */
    public function testLegacyRouteTargetsRedirectHandler(
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
     * @dataProvider redirectMethodCases
     */
    public function testLegacyRedirectHandlerEmits301(
        string $handler,
        array $query,
        string $location
    ): void {
        $_GET = $query;
        $_POST = [];

        try {
            $this->controller()->{$handler}();
            $this->fail($handler . ' did not emit an API response');
        } catch (ExitException $e) {
            $this->assertSame(301, $e->getStatusCode());
            $this->assertSame($location, $e->getHeaders()['Location'] ?? null);
        }
    }

    public static function redirectRoutes(): array
    {
        return [
            ['GET', '/api/orders/sales', 'redirectLegacySalesOrders'],
            ['POST', '/api/orders/sales', 'redirectLegacySalesOrders'],
            ['GET', '/api/orders/sales/{soNumber}', 'redirectLegacySalesOrderDetail'],
            ['PUT', '/api/orders/sales/{soNumber}', 'redirectLegacySalesOrderDetail'],
            ['GET', '/api/orders/jobs', 'redirectLegacyJobOrders'],
            ['POST', '/api/orders/jobs', 'redirectLegacyJobOrders'],
            ['GET', '/api/orders/jobs/{joNumber}', 'redirectLegacyJobOrderDetail'],
            ['PUT', '/api/orders/jobs/{joNumber}', 'redirectLegacyJobOrderDetail'],
            ['GET', '/api/orders/work', 'redirectLegacyWorkOrders'],
            ['POST', '/api/orders/work', 'redirectLegacyWorkOrders'],
            ['GET', '/api/orders/work/{woNumber}', 'redirectLegacyWorkOrderDetail'],
            ['PUT', '/api/orders/work/{woNumber}', 'redirectLegacyWorkOrderDetail'],
        ];
    }

    public static function redirectMethodCases(): array
    {
        return [
            ['redirectLegacySalesOrders', [], '/api/v1/sales-orders'],
            ['redirectLegacySalesOrderDetail', ['soNumber' => 'SO-2026-0001'], '/api/v1/sales-orders/SO-2026-0001'],
            ['redirectLegacyJobOrders', [], '/api/v1/job-orders'],
            ['redirectLegacyJobOrderDetail', ['joNumber' => 'JOB-2026-0002'], '/api/v1/job-orders/JOB-2026-0002'],
            ['redirectLegacyWorkOrders', [], '/api/v1/work-orders'],
            ['redirectLegacyWorkOrderDetail', ['woNumber' => 'WO-2026-000003'], '/api/v1/work-orders/WO-2026-000003'],
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

    private function controller(): OrderController
    {
        $dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR, ['use_postgres' => false]);

        return new OrderController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR);
    }
}
