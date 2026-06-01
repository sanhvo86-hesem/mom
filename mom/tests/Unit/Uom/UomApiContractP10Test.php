<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use PHPUnit\Framework\TestCase;

final class UomApiContractP10Test extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__, 3);
    }

    public function testSimP1004EveryUomRouteExistsInOpenApi(): void
    {
        $routes = (string)file_get_contents($this->root . '/api/routes/uom-routes.php');
        $openApi = (string)file_get_contents($this->root . '/api/openapi.yaml');
        preg_match_all("/['\"](\\/api\\/v1\\/uom[^'\"]+)['\"]/", $routes, $matches);

        $this->assertNotEmpty($matches[1]);
        foreach (array_unique($matches[1]) as $route) {
            $openApiPath = preg_replace('/\\{[^}]+\\}/', '{param}', $route);
            $spec = preg_replace('/\\{(code|system|item_id)\\}/', '{param}', $openApi);
            $this->assertStringContainsString((string)$openApiPath, $spec, "OpenAPI missing {$route}");
        }
    }

    public function testSimP1001ProblemDetailsShapeIncludesTraceCodeAndRemediation(): void
    {
        $controller = (string)file_get_contents($this->root . '/api/controllers/UomController.php');

        foreach (['type', 'title', 'status', 'detail', 'instance', 'trace_id', 'code', 'field_errors', 'remediation'] as $field) {
            $this->assertStringContainsString("'" . $field . "'", $controller);
        }
    }

    public function testSimP1002UnauthorizedApproveRuleIsNotExposedAsUomApiRoute(): void
    {
        $routes = (string)file_get_contents($this->root . '/api/routes/uom-routes.php');

        $this->assertStringNotContainsString('/api/v1/uom/rules/approve', $routes);
        $this->assertStringNotContainsString('/api/v1/uom/rules/activate', $routes);
    }

    public function testSimP1003NoMutationEndpointWithoutIdempotencyContract(): void
    {
        $controller = (string)file_get_contents($this->root . '/api/controllers/UomController.php');

        $this->assertStringContainsString('Idempotency-Key', $controller);
        $this->assertStringContainsString('idempotency_key', $controller);
    }

    public function testSimP1005AliasAmbiguousStructuredResultIsDocumented(): void
    {
        $openApi = (string)file_get_contents($this->root . '/api/openapi.yaml');

        $this->assertStringContainsString('ambiguous', $openApi);
        $this->assertStringContainsString('quarantine_id', $openApi);
    }

    public function testEventContractRegistryContainsRequiredUomEvents(): void
    {
        $json = json_decode(
            (string)file_get_contents($this->root . '/data/registry/uom-event-contracts.json'),
            true,
            flags: JSON_THROW_ON_ERROR
        );

        foreach ([
            'uom.rule.submitted',
            'uom.rule.approved',
            'uom.rule.activated',
            'uom.alias.quarantined',
            'uom.measval.created',
            'uom.policy.changed',
        ] as $event) {
            $this->assertArrayHasKey($event, $json['events']);
            $this->assertSame(1, $json['events'][$event]['version']);
        }
    }
}
