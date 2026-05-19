<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\ErrorCodeRegistryService;
use Throwable;

/**
 * Error Code Registry — bilingual error catalogue.
 *
 * Public endpoints (no auth) let any frontend module fetch the operator-
 * facing message for a canonical code. Admin endpoints (admin role only)
 * let an operator curate the catalogue from the IAM Console Error Codes
 * tab.
 *
 * Mounted under /api/v1/error-codes (public) and
 * /api/v1/admin/error-codes (admin) — see mom/api/routes/core-routes.php.
 *
 * Backed by ErrorCodeRegistryService + migration 192.
 *
 * @since 4.3.0
 */
final class ErrorCodeRegistryController extends EqmsBaseController
{
    private function service(): ErrorCodeRegistryService
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new ErrorCodeRegistryService($this->data);
        }
        return $svc;
    }

    // ── Public read API (any caller may fetch error messages) ───────────────

    /**
     * GET /api/v1/error-codes
     *
     * Returns the full active catalogue. Frontend modules call this once on
     * boot and cache locally so they can expand any code returned by other
     * API responses into a human-readable bilingual message.
     */
    public function listPublic(): never
    {
        // No auth: any logged-in user can read; even anonymous callers may
        // need the catalogue to display login errors with the right text.
        $rows = $this->service()->listAll(true);
        $this->success(['error_codes' => $rows]);
    }

    /**
     * GET /api/v1/error-codes/{code}
     *
     * Single-code lookup. 404 when the code is unknown or retired so the
     * caller can fall back to a generic message and a console.warn.
     */
    public function getPublic(): never
    {
        $code = (string)$this->requirePathId('code', 'code');
        $row = $this->service()->find($code);
        if ($row === null) {
            $this->error('error_code_not_found', 404, "Unknown error code: $code");
        }
        $this->success(['error_code' => $row]);
    }

    // ── Admin CRUD (admin role only) ─────────────────────────────────────────

    /**
     * GET /api/v1/admin/error-codes?domain=&active_only=
     * Returns the full catalogue (including retired rows) for the admin UI.
     */
    public function listAdmin(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $activeOnly = ($this->query('active_only') ?? '') === '1';
        $rows = $this->service()->listAll($activeOnly);
        $this->success([
            'error_codes' => $rows,
            'grouped_by_domain' => $this->service()->groupedByDomain(),
        ]);
    }

    /**
     * POST /api/v1/admin/error-codes
     * Body: {code, domain, http_status, title_vi, title_en?, description_vi?, hint_vi?, severity?, is_active?}
     */
    public function upsert(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $row = $this->service()->upsert($body, $this->adminActor($user));
        if ($row === null) {
            $this->error('error_code_upsert_failed', 422, 'code, domain and title_vi are required.');
        }
        $this->success(['error_code' => $row]);
    }

    /**
     * PUT /api/v1/admin/error-codes/{code}
     * Same body as POST upsert.
     */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $code = (string)$this->requirePathId('code', 'code');
        $body = $this->jsonBody();
        $body['code'] = $code;
        $row = $this->service()->upsert($body, $this->adminActor($user));
        if ($row === null) {
            $this->error('error_code_update_failed', 422, 'domain and title_vi are required.');
        }
        $this->success(['error_code' => $row]);
    }

    /**
     * POST /api/v1/admin/error-codes/{code}/activate    → is_active=true
     * POST /api/v1/admin/error-codes/{code}/deactivate  → is_active=false
     * Preferred over hard DELETE when the code may still appear in archived
     * audit events.
     */
    public function activate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $code = (string)$this->requirePathId('code', 'code');
        $ok = $this->service()->setActive($code, true, $this->adminActor($user));
        if (!$ok) {
            $this->error('error_code_activate_failed', 422, 'Activate failed.');
        }
        $this->success(['code' => $code, 'is_active' => true]);
    }

    public function deactivate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $code = (string)$this->requirePathId('code', 'code');
        $ok = $this->service()->setActive($code, false, $this->adminActor($user));
        if (!$ok) {
            $this->error('error_code_deactivate_failed', 422, 'Deactivate failed.');
        }
        $this->success(['code' => $code, 'is_active' => false]);
    }

    /**
     * DELETE /api/v1/admin/error-codes/{code}
     * Hard delete. Prefer deactivate() for codes that may appear in audit history.
     */
    public function delete(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $code = (string)$this->requirePathId('code', 'code');
        $ok = $this->service()->delete($code, $this->adminActor($user));
        if (!$ok) {
            $this->error('error_code_delete_failed', 422, 'Delete failed.');
        }
        $this->success(['deleted' => true, 'code' => $code]);
    }

    private function adminActor(array $user): string
    {
        return (string)($user['username'] ?? $user['name'] ?? 'admin');
    }
}
