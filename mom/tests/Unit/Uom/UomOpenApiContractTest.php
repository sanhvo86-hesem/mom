<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P06 — OpenAPI route drift contract test (HB-09).
 *
 * Walks `mom/api/routes/uom-routes.php` and `mom/api/openapi-uom-v3.yaml`
 * and fails if any registered `/api/v1/uom/*` route is missing from the
 * supplement. This is the V3-pack-required guard against
 * "route exists but is undocumented".
 *
 * Lives under tests/Unit deliberately — it is a static text scan that
 * does not need a running database or controller boot.
 */
final class UomOpenApiContractTest extends TestCase
{
    public function testEveryUomRouteAppearsInSupplementOpenApi(): void
    {
        $routesFile = dirname(__DIR__, 3) . '/api/routes/uom-routes.php';
        $openapi    = dirname(__DIR__, 3) . '/api/openapi-uom-v3.yaml';

        $this->assertFileExists($routesFile);
        $this->assertFileExists($openapi);

        $routesSource = file_get_contents($routesFile) ?: '';
        $openapiYaml  = file_get_contents($openapi)   ?: '';

        // Pull route paths out of `$router->get('/api/v1/uom/…'`.
        preg_match_all(
            '#\$router->\w+\(\s*\'(/api/v1/uom/[^\'\s]+)\'#',
            $routesSource,
            $matches
        );
        $routePaths = array_unique($matches[1] ?? []);
        $this->assertNotEmpty(
            $routePaths,
            'P06 route inventory empty — uom-routes.php scan failed.'
        );

        $missing = [];
        foreach ($routePaths as $rp) {
            // OpenAPI supplement starts paths at /uom/… (no /api/v1 prefix
            // because the supplement declares server base `/api/v1`).
            $needle = preg_replace('#^/api/v1#', '', $rp);
            // Normalise route placeholders {code} matches across both files.
            if (!str_contains($openapiYaml, $needle)) {
                $missing[] = $rp;
            }
        }

        $this->assertSame(
            [],
            $missing,
            'P06 OpenAPI drift — these UoM routes are undocumented: '
            . implode(', ', $missing)
        );
    }

    public function testProblemDetailsCatalogIncludesV3Codes(): void
    {
        $openapi = file_get_contents(
            dirname(__DIR__, 3) . '/api/openapi-uom-v3.yaml'
        ) ?: '';

        $v3Codes = [
            'UOM_CONTEXT_REQUIRED',
            'UOM_CONTEXT_RULE_NOT_EFFECTIVE',
            'UOM_POLICY_NOT_FOUND',
            'UOM_MANIFEST_INVALID_AUTHORITY',
            'UOM_MANIFEST_DUPLICATE',
            'UOM_MANIFEST_NOT_ACTIVE',
        ];
        foreach ($v3Codes as $code) {
            $this->assertStringContainsString(
                $code,
                $openapi,
                "P06 OpenAPI ProblemDetails enum must include '{$code}'."
            );
        }
    }
}
