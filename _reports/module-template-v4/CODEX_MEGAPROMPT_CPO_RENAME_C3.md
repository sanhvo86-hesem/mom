# CODEX MEGAPROMPT — CPO Canonical Path Rename (Stream C.3)

> Approval: `Proceed with CPO canonical path rename.`
> Branch: `codex/backend-cpo-rename`

---

## ROLE & CONTEXT

You are Codex local with PHP backend authority. Stream C.1 (EQMS plural aliases) and Stream C.2 (transactional REST) are merged. Stream C.3 = CPO canonical path rename.

Per `_reports/module-template-v4/PARALLEL_RESEARCH_API_READINESS_MATRIX.md` and ADR-0008:
- Current: `/api/v1/commercial/customer-purchase-orders` (under /commercial/ namespace, non-canonical)
- Step 3 frozen canonical: `/api/v1/customer-purchase-orders` (no /commercial/ prefix)

This megaprompt adds canonical routes that delegate to existing CustomerPurchaseOrderController, plus 301 redirects from the legacy `/commercial/` paths.

**Pre-production**. Additive only. No business logic change.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT change CustomerPurchaseOrderController logic.
Do NOT touch frontend.
Do NOT change forbidden files.
Do NOT add PUT update verb (legacy never had it; out of scope per Q2 resolution).
You MAY add additive listCustomerPurchaseOrders() wrapper if missing.
```

## PRE-FLIGHT

```bash
git fetch origin && git checkout main && git pull --ff-only
git status --short  # Expected empty
ls mom/api/controllers/CustomerPurchaseOrderController.php
grep -nE "/api/v1/commercial/customer-purchase-orders" mom/api/routes/*.php
grep -cE "/api/v1/customer-purchase-orders[^/]" mom/api/routes/*.php  # Expected: 0 (path doesn't exist yet at canonical)
git checkout -b codex/backend-cpo-rename
```

If fail → `CPO_RENAME_PREFLIGHT_FAIL_<reason>`.

## ALLOWED

```text
mom/api/routes/rest-routes.php
mom/api/controllers/CustomerPurchaseOrderController.php (additive wrappers only)
mom/api/openapi.yaml
mom/data/registry/endpoint-catalog.json
mom/data/registry/endpoint-catalog-index.json
mom/tests/contract/CpoRenameTest.php (NEW)
_reports/module-template-v4/S_BACKEND_CPO_RENAME_REPORT.md (NEW)
```

## FORBIDDEN

```text
HMV4 frontend, forbidden file list per CLAUDE.md/ADR-0004
Modifying any existing CustomerPurchaseOrderController method
Database schema
PUT update verb (deferred per ADR rationale)
```

## STEP 1 — Inspect controller

```bash
grep -nE "^    public function" mom/api/controllers/CustomerPurchaseOrderController.php
# Expected methods (verify): list, detail, create, transition (or similar)
```

## STEP 2 — Add canonical routes

Append to `mom/api/routes/rest-routes.php`:

```php
// ─────────────────────────────────────────────────────────────────
// CPO canonical plural-form path (ADR-0008, Stream C.3, 2026-04-25)
// Mirrors EQMS plural-alias pattern. /api/v1/commercial/customer-purchase-orders
// remains live and emits 301 redirect to canonical (Step 3).
// ─────────────────────────────────────────────────────────────────

$router->get   ('/api/v1/customer-purchase-orders',                          [CustomerPurchaseOrderController::class, 'listCustomerPurchaseOrders']);
$router->post  ('/api/v1/customer-purchase-orders',                          [CustomerPurchaseOrderController::class, 'createCustomerPurchaseOrder']);
$router->get   ('/api/v1/customer-purchase-orders/{customerPoId}',           [CustomerPurchaseOrderController::class, 'getCustomerPurchaseOrder']);
$router->post  ('/api/v1/customer-purchase-orders/{customerPoId}:transition',[CustomerPurchaseOrderController::class, 'transitionCustomerPurchaseOrder']);
```

If method names differ (e.g., `query`, `detail`, `create`, `transition`), use the actual names from Step 1 grep.

If `listCustomerPurchaseOrders` doesn't exist, add a thin additive wrapper:

```php
public function listCustomerPurchaseOrders(Request $request): JsonResponse
{
    return $this->query($request);  // Or whatever the existing list method is
}
```

## STEP 3 — Add 301 redirects from legacy

Append to `mom/api/routes/core-routes.php` (or wherever legacy /commercial/ routes live):

```php
// Legacy /api/v1/commercial/customer-purchase-orders → 301 → canonical
// Per ADR-0008. Future ADR will deprecate legacy path entirely.

$router->get  ('/api/v1/commercial/customer-purchase-orders', function() {
    return redirect_301('/api/v1/customer-purchase-orders');
});
$router->get  ('/api/v1/commercial/customer-purchase-orders/{id}', function($id) {
    return redirect_301('/api/v1/customer-purchase-orders/' . $id);
});
$router->post ('/api/v1/commercial/customer-purchase-orders', function() {
    return redirect_301('/api/v1/customer-purchase-orders');
});
$router->post ('/api/v1/commercial/customer-purchase-orders/{id}:transition', function($id) {
    return redirect_301('/api/v1/customer-purchase-orders/' . $id . ':transition');
});
```

Adapt `redirect_301` to existing helper. Look at how transactional REST C.2 implemented redirects:

```bash
grep -nE "redirect_301|301" mom/api/routes/core-routes.php | head -10
```

## STEP 4 — Validate

```bash
php -S 127.0.0.1:8090 -t mom &
SERVER=$!; sleep 2

curl -sI 'http://127.0.0.1:8090/api/v1/customer-purchase-orders' | head -3
curl -sI 'http://127.0.0.1:8090/api/v1/commercial/customer-purchase-orders' | head -3  # expect 301
# Compare detail endpoints if test data exists

kill $SERVER
```

## STEP 5 — Update OpenAPI + regen catalog

Edit `mom/api/openapi.yaml`. Add:

```yaml
/api/v1/customer-purchase-orders:
  get:
    summary: List customer purchase orders (canonical path per ADR-0008)
    tags: [transactional-orders]
    responses:
      '200':
        description: Customer PO collection
/api/v1/customer-purchase-orders/{customerPoId}:
  get:
    summary: Get customer purchase order detail (canonical path per ADR-0008)
    parameters:
      - in: path
        name: customerPoId
        required: true
        schema: { type: string }
    responses:
      '200':
        description: Customer PO detail
```

Regen catalog:
```bash
php tools/scripts/ai-index/generate.php --verbose || composer --working-dir=mom run ai:index
grep -c "/api/v1/customer-purchase-orders" mom/data/registry/endpoint-catalog.json  # Expected: > 0
```

## STEP 6 — Contract test

Create `mom/tests/contract/CpoRenameTest.php`:

```php
<?php
namespace Tests\Contract;

use PHPUnit\Framework\TestCase;

class CpoRenameTest extends TestCase
{
    public function testCanonicalListReturns200(): void
    {
        $resp = $this->request('GET', '/api/v1/customer-purchase-orders');
        $this->assertSame(200, $resp->getStatusCode());
    }

    public function testLegacyPathRedirects301(): void
    {
        $resp = $this->request('GET', '/api/v1/commercial/customer-purchase-orders', null, ['follow_redirects' => false]);
        $this->assertSame(301, $resp->getStatusCode());
        $location = $resp->getHeader('Location')[0] ?? '';
        $this->assertStringContainsString('/api/v1/customer-purchase-orders', $location);
        $this->assertStringNotContainsString('/commercial/', $location);
    }

    private function request(string $method, string $url, ?string $body = null, array $opts = []) { /* adapt */ }
}
```

## STEP 7 — Run PHPUnit

```bash
cd mom
./vendor/bin/phpunit --testdox 2>&1 | tail -10
```

## STEP 8 — Generate report + commit

`_reports/module-template-v4/S_BACKEND_CPO_RENAME_REPORT.md` mirroring EQMS aliases report style.

```bash
git add mom/api/routes/rest-routes.php \
        mom/api/routes/core-routes.php \
        mom/api/controllers/CustomerPurchaseOrderController.php \
        mom/api/openapi.yaml \
        mom/data/registry/endpoint-catalog.json \
        mom/data/registry/endpoint-catalog-index.json \
        mom/tests/contract/CpoRenameTest.php \
        _reports/module-template-v4/S_BACKEND_CPO_RENAME_REPORT.md

git commit -m "feat(api): rename CPO canonical path to /api/v1/customer-purchase-orders (Stream C.3)

Adds canonical /api/v1/customer-purchase-orders routes delegating to
existing CustomerPurchaseOrderController. Legacy
/api/v1/commercial/customer-purchase-orders emits 301 redirects.

Per ADR-0008. PUT update deferred (legacy never had it; separate
ticket if/when frontend needs CPO edit flow)."

git push -u origin codex/backend-cpo-rename
```

## DECISION

```text
CPO_RENAME_PASS_READY_FOR_REVIEW
CPO_RENAME_PASS_WITH_WARNINGS
CPO_RENAME_FAIL_BLOCK_NEXT
```
