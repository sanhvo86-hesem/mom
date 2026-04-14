<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use MOM\Services\QuoteService;
use Throwable;

/**
 * Quote controller for HESEM MOM Portal.
 *
 * Provides API endpoints for quoting and estimation including
 * quote CRUD, status transitions, SO conversion, cycle-time
 * estimation, material cost estimation, and pipeline KPIs.
 *
 * Data stored in `data/quotes/` with quotes.json,
 * rate-cards.json, and material-templates.json.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class QuoteController extends BaseController
{
    /** @var QuoteService|null Lazy-loaded quote service. */
    private ?QuoteService $quoteSvc = null;

    private ?IdempotencyService $idempotencyService = null;

    /** @var array|null Cached quote access-control config. */
    private ?array $quoteConfig = null;

    // â”€â”€ Service Access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Get or create the QuoteService instance.
     *
     * @return QuoteService
     */
    private function quoteService(): QuoteService
    {
        if ($this->quoteSvc === null) {
            $this->quoteSvc = new QuoteService($this->dataDir);
        }
        return $this->quoteSvc;
    }

    private function idempotency(): IdempotencyService
    {
        if ($this->idempotencyService === null) {
            $this->idempotencyService = new IdempotencyService($this->dataDir);
        }

        return $this->idempotencyService;
    }

    /**
     * Load the quote access-control configuration.
     *
     * @return array<string, mixed>
     */
    private function loadQuoteConfig(): array
    {
        if ($this->quoteConfig !== null) {
            return $this->quoteConfig;
        }

        $configFile = $this->confDir . '/quote_config.json';
        $this->quoteConfig = $this->readJsonFile($configFile) ?? [
            'roles' => [
                'admin'          => ['qt_read', 'qt_write', 'qt_transition', 'qt_convert', 'qt_estimate'],
                'doc_controller' => ['qt_read', 'qt_write', 'qt_transition'],
                'sales'          => ['qt_read', 'qt_write', 'qt_transition', 'qt_convert', 'qt_estimate'],
                'quality'        => ['qt_read'],
                'production'     => ['qt_read', 'qt_estimate'],
                'engineering'    => ['qt_read', 'qt_estimate'],
                'viewer'         => ['qt_read'],
            ],
        ];

        return $this->quoteConfig;
    }

    /**
     * Check if the user has a specific quote permission.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return bool
     */
    private function hasQuotePermission(array $user, string $permission): bool
    {
        $role = (string)($user['role'] ?? 'viewer');
        if (in_array($role, ['ceo', 'it_admin', 'sales_manager', 'production_director'], true)) {
            return true;
        }
        $config = $this->loadQuoteConfig();
        $roles  = $config['roles'] ?? [];
        // Fail-closed: if role is not in config, default to viewer (least privilege)
        $perms  = $roles[$role] ?? ($roles['viewer'] ?? []);
        return in_array($permission, $perms, true);
    }

    /**
     * Require a quote permission, terminating with 403 if missing.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return void
     */
    private function requireQuotePermission(array $user, string $permission): void
    {
        if (!$this->hasQuotePermission($user, $permission)) {
            $this->error('forbidden', 403, "Missing permission: {$permission}");
        }
    }

    /**
     * Extract the acting username from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    private function parseIdempotencyKey(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_scalar($value)) {
            $this->error('invalid_idempotency_key', 400);
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (strlen($text) > 200 || preg_match('/^[A-Za-z0-9._:\-]+$/', $text) !== 1) {
            $this->error('invalid_idempotency_key', 400);
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function quoteConversionIdempotency(string $quoteId, string $poNumber, array $body, string $actorId): array
    {
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $this->parseIdempotencyKey($body['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($body['request_id'] ?? null);

        $fingerprint = [
            'command' => 'ConvertQuoteToSalesOrder',
            'quote_id' => $quoteId,
            'po_number' => $poNumber,
            'actor_id' => $actorId,
        ];

        if ($explicitKey !== null) {
            return [
                'scope_key' => implode('|', ['quote_conversion', $quoteId, $actorId]),
                'key' => $explicitKey,
                'key_source' => 'header_or_body',
                'mode' => 'client_token',
                'kind' => 'convert',
                'domain' => 'sales',
                'table' => 'quotes',
                'user_id' => $actorId,
                'fingerprint' => $fingerprint,
            ];
        }

        return [
            'scope_key' => implode('|', ['quote_conversion', $quoteId, $actorId]),
            'key' => 'drv-quote-convert-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:quote_conversion_retry_window',
            'mode' => 'derived_identity_window',
            'kind' => 'convert',
            'domain' => 'sales',
            'table' => 'quotes',
            'user_id' => $actorId,
            'ttl_seconds' => $this->idempotency()->retryWindowSeconds(),
            'fingerprint' => $fingerprint,
        ];
    }

    // â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET listQuotes â€” List quotes with optional filters.
     *
     * Query params:
     *   - status    (string, optional): draft, sent, accepted, rejected, expired.
     *   - customer  (string, optional): Customer name (partial match).
     *   - date_from (string, optional): YYYY-MM-DD.
     *   - date_to   (string, optional): YYYY-MM-DD.
     *   - offset    (int, optional)
     *   - limit     (int, optional)
     *
     * @return never
     */
    public function listQuotes(): never
    {
        $user = $this->requireAuth();
        $this->requireQuotePermission($user, 'qt_read');

        $filters = [];

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $customer = $this->query('customer');
        if ($customer !== null && $customer !== '') {
            $filters['customer'] = $customer;
        }

        $dateFrom = $this->query('date_from');
        if ($dateFrom !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
            $filters['date_from'] = $dateFrom;
        }

        $dateTo = $this->query('date_to');
        if ($dateTo !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
            $filters['date_to'] = $dateTo;
        }

        // COM-002: Add org/customer scoping filter
        $filters['org_id'] = $_SESSION['org_id'] ?? null;

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->quoteService()->listQuotes($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('quotes', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('quotes_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET detail â€” Single quote with line items.
     *
     * Query params:
     *   - id (string, required): Quote record ID or quote number.
     *
     * @return never
     */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireQuotePermission($user, 'qt_read');

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }

        $id = trim($id);

        try {
            $quote = $this->quoteService()->getDetail($id);
            if ($quote === null) {
                $this->error('not_found', 404, "Quote {$id} not found.");
            }

            // COM-002: Verify ownership before returning quote
            $sessionOrgId = $_SESSION['org_id'] ?? null;
            $quoteOrgId = $quote['org_id'] ?? null;
            if ($sessionOrgId !== null && $quoteOrgId !== null && $quoteOrgId !== $sessionOrgId) {
                $this->error('forbidden', 403, 'You do not have access to this quote.');
            }

            $this->success(['quote' => $quote]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('quote_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST create â€” Create a quote with header and line items.
     *
     * Body fields:
     *   - customer_id   (string, required)
     *   - customer_name (string, required)
     *   - contact_name  (string, optional)
     *   - contact_email (string, optional)
     *   - rfq_number    (string, optional)
     *   - valid_until   (string, optional, YYYY-MM-DD)
     *   - currency      (string, optional, default "USD")
     *   - notes         (string, optional)
     *   - line_items    (array, required): Array of line item objects.
     *     Each: part_id, description, qty, unit_price, material, operations[].
     *
     * @return never
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireQuotePermission($user, 'qt_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['customer_id', 'customer_name', 'line_items']);

        if (!is_array($body['line_items'] ?? null) || count($body['line_items']) === 0) {
            $this->error('missing_line_items', 400, 'At least one line item is required.');
        }

        $userId = $this->userId($user);

        try {
            $quote = $this->quoteService()->create([
                'customer_id'   => trim((string)($body['customer_id'] ?? '')),
                'customer_name' => trim((string)($body['customer_name'] ?? '')),
                'contact_name'  => trim((string)($body['contact_name'] ?? '')),
                'contact_email' => trim((string)($body['contact_email'] ?? '')),
                'rfq_number'    => trim((string)($body['rfq_number'] ?? '')),
                'valid_until'   => trim((string)($body['valid_until'] ?? '')),
                'currency'      => strtoupper(trim((string)($body['currency'] ?? 'USD'))),
                'notes'         => trim((string)($body['notes'] ?? '')),
                'lines'         => (array)($body['line_items'] ?? $body['lines'] ?? []),
            ], $userId);

            $this->auditLog('quote_create', [
                'quote_id'    => $quote['quote_id'] ?? '',
                'customer_id' => $body['customer_id'] ?? '',
                'line_count'  => count($body['line_items'] ?? []),
            ], $userId);

            $this->success(['quote' => $quote], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('quote_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST update â€” Update quote header or line items.
     *
     * Body fields:
     *   - id (string, required): Quote record ID.
     *   - Any updatable header fields and/or line_items array.
     *
     * @return never
     */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireQuotePermission($user, 'qt_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->quoteService()->update($id, $body, $userId);

            $this->auditLog('quote_update', [
                'quote_id' => $id,
                'fields'   => array_keys($body),
            ], $userId);

            $this->success(['quote' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('quote_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST transition â€” Quote status transition.
     *
     * Allowed transitions: draft -> sent -> accepted|rejected|expired.
     *
     * Body fields:
     *   - id        (string, required)
     *   - to_status (string, required)
     *   - comment   (string, optional)
     *
     * @return never
     */
    public function transition(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireQuotePermission($user, 'qt_transition');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id', 'to_status']);

        $id       = trim((string)($body['id'] ?? ''));
        $toStatus = strtolower(trim((string)($body['to_status'] ?? '')));
        $comment  = trim((string)($body['comment'] ?? ''));
        $userId   = $this->userId($user);

        try {
            // COM-003: Verify ownership before status transition
            $quote = $this->quoteService()->getDetail($id);
            if ($quote === null) {
                $this->error('not_found', 404, "Quote {$id} not found.");
            }

            $sessionOrgId = $_SESSION['org_id'] ?? null;
            $quoteOrgId = $quote['org_id'] ?? null;
            if ($sessionOrgId !== null && $quoteOrgId !== null && $quoteOrgId !== $sessionOrgId) {
                $this->error('forbidden', 403, 'You do not have access to this quote.');
            }

            $updated = $this->quoteService()->transition($id, $toStatus, $userId, $comment);

            $this->auditLog('quote_transition', [
                'quote_id'  => $id,
                'to_status' => $toStatus,
                'comment'   => $comment,
            ], $userId);

            $this->success(['quote' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('quote_transition_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST convertToSo â€” Convert an accepted quote to a Sales Order.
     *
     * Body fields:
     *   - id (string, required): Quote record ID (must be in 'accepted' status).
     *   - po_number (string, optional): Customer PO number.
     *
     * @return never
     */
    public function convertToSo(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireQuotePermission($user, 'qt_convert');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id       = trim((string)($body['id'] ?? ''));
        $poNumber = trim((string)($body['po_number'] ?? ''));
        $userId   = $this->userId($user);

        try {
            // COM-003: Verify ownership before conversion
            $quote = $this->quoteService()->getDetail($id);
            if ($quote === null) {
                $this->error('not_found', 404, "Quote {$id} not found.");
            }

            $sessionOrgId = $_SESSION['org_id'] ?? null;
            $quoteOrgId = $quote['org_id'] ?? null;
            if ($sessionOrgId !== null && $quoteOrgId !== null && $quoteOrgId !== $sessionOrgId) {
                $this->error('forbidden', 403, 'You do not have access to this quote.');
            }

            $idempotency = $this->quoteConversionIdempotency($id, $poNumber, $body, $userId);
            $execution = $this->idempotency()->execute($idempotency, function () use ($id, $poNumber, $userId): array {
                $result = $this->quoteService()->convertToSalesOrder($id, $poNumber, $userId);

                $this->auditLog('quote_convert_to_so', [
                    'quote_id'  => $id,
                    'so_number' => $result['so_number'] ?? '',
                    'recovered_existing_sales_order' => $result['recovered_existing_sales_order'] ?? false,
                ], $userId);

                return [
                    'status_code' => 200,
                    'payload' => [
                        'quote' => $result['quote'],
                        'so_number' => $result['so_number'],
                        'sales_order' => $result['sales_order'] ?? $result['so_record'] ?? [],
                    ],
                ];
            });

            $payload = $execution['payload'];
            $payload['idempotency'] = [
                'replayed' => $execution['replayed'],
                'stored_at' => $execution['stored_at'],
                'key_source' => (string)($idempotency['key_source'] ?? ''),
                'mode' => (string)($idempotency['mode'] ?? ''),
            ];

            $this->success($payload, $execution['status_code']);
        } catch (RecordConflictException $e) {
            $this->error('quote_conversion_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('convert_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST estimateCycleTime â€” Estimate CNC cycle time from parameters.
     *
     * Body fields:
     *   - material   (string, required): Material type (e.g. "6061-T6", "316SS").
     *   - operations (array, required): List of operations with type and parameters.
     *   - dimensions (object, optional): Part dimensions {length, width, height, diameter}.
     *   - complexity (string, optional): low, medium, high.
     *
     * @return never
     */
    public function estimateCycleTime(): never
    {
        $user = $this->requireAuth();
        $this->requireQuotePermission($user, 'qt_estimate');

        $body = $this->jsonBody();
        $this->requireFields($body, ['material', 'operations']);

        if (!is_array($body['operations'] ?? null) || count($body['operations']) === 0) {
            $this->error('missing_operations', 400, 'At least one operation is required.');
        }

        try {
            $estimate = $this->quoteService()->estimateCycleTime([
                'material'   => trim((string)($body['material'] ?? '')),
                'operations' => (array)($body['operations'] ?? []),
                'dimensions' => (array)($body['dimensions'] ?? []),
                'complexity' => strtolower(trim((string)($body['complexity'] ?? 'medium'))),
            ]);

            $this->success(['estimate' => $estimate]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('cycle_time_estimate_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST estimateMaterial â€” Estimate material cost from parameters.
     *
     * Body fields:
     *   - material_type (string, required): e.g. "6061-T6", "Ti-6Al-4V".
     *   - dimensions    (object, required): {length, width, height} or {diameter, length} in mm.
     *   - buy_to_fly    (float, optional): Buy-to-fly ratio (default 3.0).
     *   - qty           (int, optional): Quantity for volume pricing (default 1).
     *
     * @return never
     */
    public function estimateMaterial(): never
    {
        $user = $this->requireAuth();
        $this->requireQuotePermission($user, 'qt_estimate');

        $body = $this->jsonBody();
        $this->requireFields($body, ['material_type', 'dimensions']);

        if (!is_array($body['dimensions'] ?? null)) {
            $this->error('invalid_dimensions', 400, 'Dimensions must be an object.');
        }

        try {
            $estimate = $this->quoteService()->estimateMaterialCost([
                'material_type' => trim((string)($body['material_type'] ?? '')),
                'dimensions'    => (array)($body['dimensions'] ?? []),
                'buy_to_fly'    => (float)($body['buy_to_fly'] ?? 3.0),
                'qty'           => max(1, (int)($body['qty'] ?? 1)),
            ]);

            $this->success(['estimate' => $estimate]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('material_estimate_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET dashboard â€” Quote pipeline KPIs.
     *
     * Returns win rate, avg quote value, pipeline value, avg response time.
     *
     * @return never
     */
    public function dashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireQuotePermission($user, 'qt_read');

        try {
            $kpis = $this->quoteService()->getDashboardKpis();

            $this->success(['kpis' => $kpis]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('quote_dashboard_failed', 500, $e->getMessage());
        }
    }
}
