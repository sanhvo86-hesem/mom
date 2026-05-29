<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\Uom\AffineConverter;
use MOM\Api\Services\Uom\ConversionEngine;
use MOM\Api\Services\Uom\ConversionRuleService;
use MOM\Api\Services\Uom\DensityContextualConverter;
use MOM\Api\Services\Uom\ExactLinearConverter;
use MOM\Api\Services\Uom\LogarithmicConverter;
use MOM\Api\Services\Uom\MeasurementValueFactory;
use MOM\Api\Services\Uom\QuantityKindService;
use MOM\Api\Services\Uom\UnitCatalogService;
use MOM\Api\Services\Uom\UomAliasResolutionService;
use MOM\Api\Services\Uom\UomException;
use MOM\Database\Connection;

/**
 * HESEM Measurement Intelligence — REST API Controller
 *
 * Exposes the UoM conversion engine and catalog via versioned REST endpoints.
 * All responses follow RFC 9457 Problem Details on error.
 *
 * Mounted at /api/v1/uom/
 *
 * Endpoints:
 *   POST   /api/v1/uom/convert              — convert a value between units
 *   GET    /api/v1/uom/units                — list active units (paginated)
 *   GET    /api/v1/uom/units/{code}         — unit detail
 *   GET    /api/v1/uom/kinds                — list quantity kinds
 *   GET    /api/v1/uom/rules                — list conversion rules
 *   POST   /api/v1/uom/aliases/resolve      — resolve alias → canonical code
 *   GET    /api/v1/uom/external-map/{sys}/{code} — resolve external code
 *   GET    /api/v1/uom/health               — engine health + catalog counts
 */
final class UomController extends BaseController
{
    private const PROBLEM_BASE_URI = 'https://hesemeng.com/errors/uom/';
    private const HUMAN_TITLES = [
        'UOM_KIND_MISMATCH'                        => 'Quantity Kind Mismatch',
        'UOM_UNIT_NOT_ACTIVE'                      => 'Unit Not Found or Inactive',
        'UOM_NO_CONVERSION_PATH'                   => 'No Conversion Path',
        'UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE'  => 'Currency Conversion Not Supported',
        'UOM_INVALID_MAGNITUDE'                    => 'Invalid Magnitude',
        'UOM_NEGATIVE_MAGNITUDE_FORBIDDEN'         => 'Negative Magnitude Not Allowed',
        'UOM_MAGNITUDE_OVERFLOW'                   => 'Magnitude Too Large',
        'UOM_EXTERNAL_CODE_UNKNOWN'                => 'Unknown External Unit Code',
        'UOM_RULE_NOT_ACTIVE'                      => 'Conversion Rule Not Active',
        'UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION' => 'Packaging Unit — No Physical Conversion',
    ];

    private function engine(): ConversionEngine
    {
        $db = Connection::getInstance();
        return new ConversionEngine(
            new QuantityKindService($db),
            new ConversionRuleService($db, $this->getRedis()),
            new MeasurementValueFactory()
        );
    }

    private function catalog(): UnitCatalogService
    {
        return new UnitCatalogService(Connection::getInstance());
    }

    private function aliasService(): UomAliasResolutionService
    {
        return new UomAliasResolutionService(Connection::getInstance(), $this->getRedis());
    }

    private function getRedis(): ?\Redis
    {
        try {
            if (class_exists(\Redis::class)) {
                $redis = new \Redis();
                $redis->connect('127.0.0.1', 6379);
                return $redis;
            }
        } catch (\Throwable) {
        }
        return null;
    }

    // ── POST /api/v1/uom/convert ─────────────────────────────────────────────

    /**
     * Convert a value between units.
     *
     * Request body:
     * {
     *   "magnitude": "98.6",
     *   "from_unit": "degF",
     *   "to_unit": "Cel",
     *   "display_precision": 2,          // optional, default 6
     *   "rounding_policy": "ROUND_HALF_EVEN"  // optional
     * }
     *
     * Response 200:
     * {
     *   "ok": true,
     *   "result": "37.00",
     *   "from_unit": "degF",
     *   "to_unit": "Cel",
     *   "measval": { ... }
     * }
     */
    public function convert(): never
    {
        $user = $this->requireAuth();
        $body = $this->jsonBody();

        $magnitude = trim((string)($body['magnitude'] ?? ''));
        $fromUnit  = trim((string)($body['from_unit'] ?? ''));
        $toUnit    = trim((string)($body['to_unit']   ?? ''));

        if ($magnitude === '' || $fromUnit === '' || $toUnit === '') {
            $this->problemDetail(
                'UOM_MISSING_REQUIRED_FIELD',
                'Missing required field: magnitude, from_unit, and to_unit are required.',
                400
            );
        }

        $precision       = isset($body['display_precision']) ? (int)$body['display_precision'] : null;
        $roundingPolicy  = isset($body['rounding_policy']) ? (string)$body['rounding_policy'] : 'ROUND_HALF_EVEN';

        $context = [
            'actor_id'   => $user['user_id'] ?? null,
            'trace_id'   => $this->requestHeader('X-Trace-Id'),
            'request_id' => $this->requestHeader('X-Request-Id'),
            'domain'     => $body['domain'] ?? null,
            'item_id'    => $body['item_id'] ?? null,
        ];

        try {
            $result = $this->engine()->convert(
                $magnitude,
                $fromUnit,
                $toUnit,
                $precision,
                $roundingPolicy,
                $context
            );
        } catch (UomException $e) {
            $this->uomProblemDetail($e, '/api/v1/uom/convert');
        }

        $this->success([
            'result'    => $result['result'],
            'from_unit' => $result['from_unit'],
            'to_unit'   => $result['to_unit'],
            'measval'   => $result['measval'],
        ]);
    }

    // ── GET /api/v1/uom/units ────────────────────────────────────────────────

    public function listUnits(): never
    {
        $this->requireAuth();
        $limit    = max(1, min(200, (int)($this->query('limit')  ?? 50)));
        $offset   = max(0, (int)($this->query('offset') ?? 0));
        $kindCode = $this->query('kind');

        try {
            $result = $this->catalog()->listUnits($limit, $offset, $kindCode);
        } catch (UomException $e) {
            $this->uomProblemDetail($e, '/api/v1/uom/units');
        }

        $this->paginated('units', $result['items'], $result['total'], $offset, $limit);
    }

    // ── GET /api/v1/uom/units/{code} ─────────────────────────────────────────

    public function getUnit(string $code): never
    {
        $this->requireAuth();

        try {
            $unit = $this->catalog()->getUnit($code);
        } catch (UomException $e) {
            $this->uomProblemDetail($e, '/api/v1/uom/units/' . $code);
        }

        $this->success(['unit' => $unit]);
    }

    // ── GET /api/v1/uom/kinds ────────────────────────────────────────────────

    public function listKinds(): never
    {
        $this->requireAuth();
        $limit  = max(1, min(200, (int)($this->query('limit')  ?? 100)));
        $offset = max(0, (int)($this->query('offset') ?? 0));

        $dimOnly = $this->query('dimensionless_only');
        $filter  = $dimOnly !== null ? ($dimOnly === '1' || $dimOnly === 'true') : null;

        $result = $this->catalog()->listKinds($limit, $offset, $filter);
        $this->paginated('kinds', $result['items'], $result['total'], $offset, $limit);
    }

    // ── GET /api/v1/uom/rules ────────────────────────────────────────────────

    public function listRules(): never
    {
        $this->requireAuth();
        $limit    = max(1, min(200, (int)($this->query('limit')  ?? 50)));
        $offset   = max(0, (int)($this->query('offset') ?? 0));
        $fromUnit = $this->query('from_unit');
        $toUnit   = $this->query('to_unit');
        $kind     = $this->query('kind');
        $status   = $this->query('status') ?? 'approved';

        $result = $this->catalog()->listRules($limit, $offset, $fromUnit, $toUnit, $kind, $status);
        $this->paginated('rules', $result['items'], $result['total'], $offset, $limit);
    }

    // ── POST /api/v1/uom/aliases/resolve ─────────────────────────────────────

    /**
     * Resolve an alias string to a canonical unit code.
     *
     * Request body:
     * {
     *   "alias": "KGM",
     *   "context_scope": "SYSTEM",
     *   "supplier_id": null
     * }
     *
     * Response 200: { "ok": true, "canonical_code": "kg" }
     */
    public function resolveAlias(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();

        $alias   = trim((string)($body['alias']         ?? ''));
        $scope   = trim((string)($body['context_scope'] ?? 'SYSTEM'));
        $suppId  = isset($body['supplier_id']) ? (string)$body['supplier_id'] : null;

        if ($alias === '') {
            $this->error('missing_alias', 400, 'alias field is required');
        }

        try {
            $canonical = $this->aliasService()->resolve($alias, $scope, $suppId);
        } catch (UomException $e) {
            $this->uomProblemDetail($e, '/api/v1/uom/aliases/resolve');
        }

        $this->success(['canonical_code' => $canonical]);
    }

    // ── GET /api/v1/uom/external-map/{system}/{code} ─────────────────────────

    public function resolveExternalCode(string $system, string $code): never
    {
        $this->requireAuth();

        try {
            $row = $this->catalog()->resolveExternalCode($system, $code);
        } catch (UomException $e) {
            $this->uomProblemDetail($e, '/api/v1/uom/external-map/' . $system . '/' . $code);
        }

        $this->success(['mapping' => $row]);
    }

    // ── GET /api/v1/uom/health ───────────────────────────────────────────────

    public function health(): never
    {
        $this->requireAuth();
        $db = Connection::getInstance();

        $unitCount = (int)$db->queryScalar(
            "SELECT COUNT(*) FROM uom_unit_catalog WHERE lifecycle_status = 'active'"
        );
        $kindCount = (int)$db->queryScalar('SELECT COUNT(*) FROM uom_quantity_kind');
        $ruleCount = (int)$db->queryScalar(
            "SELECT COUNT(*) FROM uom_conversion_rule WHERE lifecycle_status = 'approved'"
        );

        $this->success([
            'engine'  => 'hesem-measurement-intelligence',
            'version' => '1.0.0',
            'catalog' => [
                'active_units'    => $unitCount,
                'quantity_kinds'  => $kindCount,
                'approved_rules'  => $ruleCount,
            ],
            'precision' => [
                'bcmath_scale'    => 30,
                'rounding_default'=> 'ROUND_HALF_EVEN',
            ],
        ]);
    }

    // ── RFC 9457 Problem Details helper ──────────────────────────────────────

    /**
     * Emit a RFC 9457 Problem Details response for a UoM domain exception.
     */
    private function uomProblemDetail(UomException $e, string $instance): never
    {
        $code   = $e->problemCode;
        $title  = self::HUMAN_TITLES[$code] ?? str_replace('_', ' ', ucfirst(strtolower($code)));
        $status = $e->getHttpStatus();

        $this->json([
            'type'         => self::PROBLEM_BASE_URI . $code,
            'title'        => $title,
            'status'       => $status,
            'detail'       => $e->getMessage(),
            'instance'     => $instance,
            'problem_code' => $code,
        ], $status);
    }

    /**
     * Emit a RFC 9457 Problem Details response for a non-UoM error.
     */
    private function problemDetail(string $code, string $detail, int $status): never
    {
        $this->json([
            'type'         => self::PROBLEM_BASE_URI . $code,
            'title'        => str_replace('_', ' ', ucfirst(strtolower($code))),
            'status'       => $status,
            'detail'       => $detail,
            'problem_code' => $code,
        ], $status);
    }
}
