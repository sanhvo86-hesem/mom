<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

/**
 * UoM Measurement Intelligence API Routes (v1)
 *
 * All routes require authentication. Mounted at /api/v1/uom/.
 * Error responses conform to RFC 9457 Problem Details.
 *
 * See mom/api/controllers/UomController.php for implementation.
 * See mom/docs/ai-prompts/uom-measurement-conversion-v1/10-openapi-problem-details-event-contract.md
 * for the full OpenAPI specification.
 */
return static function (Router $router, string $dataDir): void {
    // Conversion engine
    $router->post('/api/v1/uom/convert',         UomController::class, 'convert');

    // Unit catalog
    $router->get('/api/v1/uom/units',             UomController::class, 'listUnits');
    $router->get('/api/v1/uom/units/{code}',      UomController::class, 'getUnit');

    // Quantity kinds
    $router->get('/api/v1/uom/kinds',             UomController::class, 'listKinds');

    // Conversion rules
    $router->get('/api/v1/uom/rules',             UomController::class, 'listRules');

    // Alias resolution
    $router->post('/api/v1/uom/aliases/resolve',  UomController::class, 'resolveAlias');

    // External code mapping (UNECE, OPC UA)
    $router->get('/api/v1/uom/external-map/{system}/{code}', UomController::class, 'resolveExternalCode');

    // Health / catalog stats
    $router->get('/api/v1/uom/health',            UomController::class, 'health');

    // Item UoM policy (ITUOM) — 8-level priority resolution
    $router->get('/api/v1/uom/item-policy/{item_id}',   UomController::class, 'getItemPolicy');
    $router->get('/api/v1/uom/item-packaging/{item_id}', UomController::class, 'getItemPackaging');
};
