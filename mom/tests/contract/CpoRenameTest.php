<?php

declare(strict_types=1);

namespace Tests\Contract;

use MOM\Api\Controllers\CustomerPurchaseOrderController;
use MOM\Api\Controllers\ExitException;
use MOM\Api\Router;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionProperty;

require_once QMS_TEST_BASE_DIR . '/api/controllers/ExitException.php';
require_once QMS_TEST_BASE_DIR . '/api/controllers/BaseController.php';
require_once QMS_TEST_BASE_DIR . '/api/controllers/CustomerPurchaseOrderController.php';

/**
 * Verifies CPO canonical path routes (ADR-0008, Stream C.3).
 *
 * Canonical:  /api/v1/customer-purchase-orders
 * Legacy:     /api/v1/commercial/customer-purchase-orders → 301 redirect
 */
final class CpoRenameTest extends TestCase
{
    /**
     * @dataProvider canonicalRoutes
     */
    public function testCanonicalRouteTargetsRealHandler(
        string $httpMethod,
        string $path,
        string $handler
    ): void {
        $routes = $this->registeredRouteMap();

        $this->assertArrayHasKey($httpMethod, $routes, "No routes for method {$httpMethod}");
        $this->assertArrayHasKey($path, $routes[$httpMethod], "Canonical route {$httpMethod} {$path} not registered");
        $this->assertSame(CustomerPurchaseOrderController::class, $routes[$httpMethod][$path]['class']);
        $this->assertSame($handler, $routes[$httpMethod][$path]['method']);
        $this->assertTrue(
            method_exists(CustomerPurchaseOrderController::class, $handler),
            CustomerPurchaseOrderController::class . '::' . $handler . '() missing'
        );
    }

    /**
     * @dataProvider legacyRedirectRoutes
     */
    public function testLegacyRouteTargetsRedirectHandler(
        string $httpMethod,
        string $path,
        string $handler
    ): void {
        $routes = $this->registeredRouteMap();

        $this->assertArrayHasKey($httpMethod, $routes, "No routes for method {$httpMethod}");
        $this->assertArrayHasKey($path, $routes[$httpMethod], "Legacy route {$httpMethod} {$path} not registered");
        $this->assertSame(CustomerPurchaseOrderController::class, $routes[$httpMethod][$path]['class']);
        $this->assertSame($handler, $routes[$httpMethod][$path]['method']);
        $this->assertTrue(
            method_exists(CustomerPurchaseOrderController::class, $handler),
            CustomerPurchaseOrderController::class . '::' . $handler . '() missing'
        );
    }

    /**
     * @dataProvider redirectMethodCases
     */
    public function testLegacyRedirectHandlerEmits301(
        string $handler,
        array $query,
        string $location
    ): void {
        $_GET  = $query;
        $_POST = [];

        try {
            $this->controller()->{$handler}();
            $this->fail("{$handler} did not emit an API response");
        } catch (ExitException $e) {
            $this->assertSame(301, $e->getStatusCode());
            $this->assertSame($location, $e->getHeaders()['Location'] ?? null);
        }
    }

    public static function canonicalRoutes(): array
    {
        return [
            ['GET',  '/api/v1/customer-purchase-orders',                           'listPurchaseOrders'],
            ['POST', '/api/v1/customer-purchase-orders',                           'createPurchaseOrder'],
            ['GET',  '/api/v1/customer-purchase-orders/{customerPoId}',            'getPurchaseOrder'],
            ['POST', '/api/v1/customer-purchase-orders/{customerPoId}:transition', 'transitionPurchaseOrder'],
        ];
    }

    public static function legacyRedirectRoutes(): array
    {
        return [
            ['GET',  '/api/v1/commercial/customer-purchase-orders',                           'redirectLegacyListCustomerPurchaseOrders'],
            ['POST', '/api/v1/commercial/customer-purchase-orders',                           'redirectLegacyCreateCustomerPurchaseOrder'],
            ['GET',  '/api/v1/commercial/customer-purchase-orders/{customerPoId}',            'redirectLegacyGetCustomerPurchaseOrder'],
            ['POST', '/api/v1/commercial/customer-purchase-orders/{customerPoId}:transition', 'redirectLegacyTransitionCustomerPurchaseOrder'],
        ];
    }

    public static function redirectMethodCases(): array
    {
        return [
            ['redirectLegacyListCustomerPurchaseOrders',   [],                                '/api/v1/customer-purchase-orders'],
            ['redirectLegacyCreateCustomerPurchaseOrder',  [],                                '/api/v1/customer-purchase-orders'],
            ['redirectLegacyGetCustomerPurchaseOrder',     ['customerPoId' => 'CPO-2026-001'], '/api/v1/customer-purchase-orders/CPO-2026-001'],
            ['redirectLegacyTransitionCustomerPurchaseOrder', ['customerPoId' => 'CPO-2026-001'], '/api/v1/customer-purchase-orders/CPO-2026-001:transition'],
        ];
    }

    /**
     * @return array<string, array<string, array{class: string, method: string}>>
     */
    private function registeredRouteMap(): array
    {
        $router   = $this->router();
        $property = new ReflectionProperty(Router::class, 'restRoutes');

        return $property->getValue($router);
    }

    private function router(): Router
    {
        $dataLayer      = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR, ['use_postgres' => false]);
        $router         = new Router($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR);
        $registerRoutes = require QMS_TEST_BASE_DIR . '/api/routes/rest-routes.php';
        $registerRoutes($router, QMS_TEST_DATA_DIR);

        return $router;
    }

    private function controller(): CustomerPurchaseOrderController
    {
        $dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR, ['use_postgres' => false]);

        return new CustomerPurchaseOrderController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR);
    }
}
