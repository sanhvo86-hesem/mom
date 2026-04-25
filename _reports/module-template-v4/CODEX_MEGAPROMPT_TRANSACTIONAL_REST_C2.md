# CODEX MEGAPROMPT — Transactional REST Formalization (Stream C.2)

> Paste into Codex local with PHP backend awareness. Codex creates branch
> `codex/backend-transactional-rest`, formalizes canonical REST routes for
> SO/JO/WO and adds 301 redirects from legacy `/api/orders/*` paths.
>
> Approval phrase: `Proceed with transactional REST formalization (SO/JO/WO).`

---

## ROLE & CONTEXT

You are Codex local with PHP/PostgreSQL backend authority on `sanhvo86-hesem/mom`.

Per `_reports/module-template-v4/PARALLEL_RESEARCH_API_READINESS_MATRIX.md`,
SO/JO/WO have legacy `/api/orders/*` paths but Step 3 vocabulary mandates
plural canonical paths under `/api/v1/...`. This megaprompt adds the
canonical REST routes (delegating to existing OrderController) and 301
redirects from legacy paths, **preparing Phase B (Slices 9-12)** for live
data integration.

EQMS plural aliases (Stream C.1) already merged into main at commit
`d21d6462`. This is the parallel transactional equivalent.

This is **development/prototype** backend work — additive, no business
logic changes.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT change OrderController business logic.
Do NOT modify forbidden files.
Do NOT modify HMV4 frontend.
Do NOT modify EQMS controllers (they were Stream C.1's scope).
You MAY add additive thin wrapper methods on OrderController if needed
  for plural-form path differentiation (e.g., listSalesOrders if missing).
You MAY add 301 redirect handlers for legacy paths.
```

## RESOLVED POLICY DECISIONS (from earlier review)

1. **Path params**: `OrderController` uses `{soNumber}`, `{joNumber}`, `{woNumber}` not `{id}`. Verify by grep before adding routes.
2. **Transition method**: `OrderController::transition` reads `order_type` from JSON body and accepts `so`/`jo`/`wo` (NOT `sales`/`job`/`work`). Add 3 thin wrapper methods (`transitionSalesOrder`, `transitionJobOrder`, `transitionWorkOrder`) so the route can derive type from URL and forward to existing `transition()` with proper body or via wrapper logic.
3. **Missing methods**: `listWorkOrders` and `getWorkOrderDetail` may not exist on OrderController. Add them as thin pass-throughs to the existing query/projection logic.
4. **Update verb**: PATCH (not PUT). Match the EQMS aliases convention.
5. **Forbidden constraint relaxed**: OrderController CAN be modified for additive thin wrappers ONLY. Existing methods unchanged.

## PRE-FLIGHT (must all PASS or STOP)

```bash
git fetch origin
git checkout main
git pull --ff-only

git status --short
# Expected: empty

# Verify EQMS alias merge already happened
grep -c "/api/v1/nonconformance-cases" mom/api/routes/rest-routes.php
# Expected: > 0

# Verify OrderController exists
ls mom/api/controllers/OrderController.php
# Expected: exists

# Inspect existing methods
grep -nE "public function (list|get|create|update|transition).*(Sales|Job|Work)Order" mom/api/controllers/OrderController.php

# Inspect legacy routes
grep -nE "/api/orders/(sales|jobs|work)" mom/api/routes/*.php

# Verify transition signature
grep -nE "public function transition" mom/api/controllers/OrderController.php
# Read 5 lines above and below to understand body parsing

# Branch
git checkout -b codex/backend-transactional-rest
```

If fail, return `TRANSACTIONAL_REST_PREFLIGHT_FAIL_<reason>` and stop.

## ALLOWED FILES

```text
mom/api/routes/rest-routes.php
mom/api/routes/core-routes.php (for legacy 301 redirects)
mom/api/controllers/OrderController.php (additive wrapper methods only)
mom/api/openapi.yaml
mom/data/registry/endpoint-catalog.json
mom/data/registry/endpoint-catalog-index.json
mom/tests/contract/TransactionalRestTest.php (NEW)
mom/tests/contract/TransactionalLegacyRedirectTest.php (NEW)
_reports/module-template-v4/S_BACKEND_TRANSACTIONAL_REST_REPORT.md (NEW)
```

## FORBIDDEN

```text
Any HMV4 frontend file
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
Modifying any existing OrderController method
Existing EQMS controllers
Database schema (no new migrations)
```

## STEP 1 — Inspect OrderController

```bash
echo "=== OrderController public methods ==="
grep -nE "^    public function" mom/api/controllers/OrderController.php

echo ""
echo "=== Existing route registrations ==="
grep -nE "OrderController::class|OrderController@" mom/api/routes/*.php

echo ""
echo "=== transition() body parsing ==="
sed -n '/public function transition/,/^    }/p' mom/api/controllers/OrderController.php | head -40
```

Record:
- Existing methods (e.g., `listSalesOrders`, `getSalesOrderDetail`, `createSalesOrder`, `updateSalesOrder`, `transition`)
- Missing methods (e.g., `listWorkOrders`, `getWorkOrderDetail`)
- Legacy paths (e.g., `/api/orders/sales/{soNumber}`)
- Path param naming (`{soNumber}` vs `{id}`)

## STEP 2 — Add additive wrapper methods to OrderController

Append (just before closing `}` of class, do NOT modify existing methods):

```php
/**
 * Plural-form GET-list wrapper for work orders (ADR-0008 transactional REST).
 * Delegates to whatever projection method backs work-order list (e.g., search()).
 */
public function listWorkOrders(Request $request): JsonResponse
{
    // If a generic listOrders($type) exists, use it. Otherwise call search() with
    // a type filter. Adapt to actual OrderController internals.
    return $this->search($request->merge(['order_type' => 'wo']));
    // OR if search doesn't exist:
    // return $this->listOrders('wo', $request);
}

public function getWorkOrderDetail(Request $request, string $woNumber): JsonResponse
{
    // Delegate to whatever method backs SO/JO detail
    return $this->getOrderDetail('wo', $woNumber, $request);
}

/**
 * Type-binding wrappers for transitions, so canonical routes don't have to
 * pass order_type in body.
 */
public function transitionSalesOrder(Request $request, string $soNumber): JsonResponse
{
    return $this->transition($request->merge(['order_type' => 'so', 'order_number' => $soNumber]));
}

public function transitionJobOrder(Request $request, string $joNumber): JsonResponse
{
    return $this->transition($request->merge(['order_type' => 'jo', 'order_number' => $joNumber]));
}

public function transitionWorkOrder(Request $request, string $woNumber): JsonResponse
{
    return $this->transition($request->merge(['order_type' => 'wo', 'order_number' => $woNumber]));
}
```

Adapt the `Request`/`JsonResponse` types to whatever the controller's existing methods use. If `Request` doesn't have `merge()`, use a different shape — read 1-2 existing methods to mirror.

If the controller already has `listWorkOrders` and `getWorkOrderDetail`, skip those wrappers and only add the transition type-binding wrappers.

## STEP 3 — Add canonical REST routes

Append to `mom/api/routes/rest-routes.php`:

```php
// ─────────────────────────────────────────────────────────────────
// Transactional plural-form REST routes (ADR-0008, Stream C.2, 2026-04-25)
// SO / JO / WO. Delegates to existing OrderController + thin wrappers.
// Legacy /api/orders/{sales,jobs,work}/* paths emit 301 redirects.
// ─────────────────────────────────────────────────────────────────

// Sales Orders
$router->get   ('/api/v1/sales-orders',                          [OrderController::class, 'listSalesOrders']);
$router->post  ('/api/v1/sales-orders',                          [OrderController::class, 'createSalesOrder']);
$router->get   ('/api/v1/sales-orders/{soNumber}',               [OrderController::class, 'getSalesOrderDetail']);
$router->patch ('/api/v1/sales-orders/{soNumber}',               [OrderController::class, 'updateSalesOrder']);
$router->post  ('/api/v1/sales-orders/{soNumber}:transition',    [OrderController::class, 'transitionSalesOrder']);

// Job Orders
$router->get   ('/api/v1/job-orders',                            [OrderController::class, 'listJobOrders']);
$router->post  ('/api/v1/job-orders',                            [OrderController::class, 'createJobOrder']);
$router->get   ('/api/v1/job-orders/{joNumber}',                 [OrderController::class, 'getJobOrderDetail']);
$router->patch ('/api/v1/job-orders/{joNumber}',                 [OrderController::class, 'updateJobOrder']);
$router->post  ('/api/v1/job-orders/{joNumber}:transition',      [OrderController::class, 'transitionJobOrder']);

// Work Orders
$router->get   ('/api/v1/work-orders',                           [OrderController::class, 'listWorkOrders']);
$router->post  ('/api/v1/work-orders',                           [OrderController::class, 'createWorkOrder']);
$router->get   ('/api/v1/work-orders/{woNumber}',                [OrderController::class, 'getWorkOrderDetail']);
$router->patch ('/api/v1/work-orders/{woNumber}',                [OrderController::class, 'updateWorkOrder']);
$router->post  ('/api/v1/work-orders/{woNumber}:transition',     [OrderController::class, 'transitionWorkOrder']);
```

Verify each method name exists on OrderController. Skip + document any that doesn't.

## STEP 4 — Add 301 redirects from legacy paths

Append to `mom/api/routes/core-routes.php` (or wherever legacy `/api/orders/*` aliases live):

```php
// Legacy /api/orders/{type}/* paths now redirect to canonical /api/v1/<type>-orders/*
// Per ADR-0008. Will be deprecated in a future ADR.

$router->get   ('/api/orders/sales',           function() { return redirect_301('/api/v1/sales-orders'); });
$router->get   ('/api/orders/sales/{id}',      function($id) { return redirect_301('/api/v1/sales-orders/' . $id); });
$router->post  ('/api/orders/sales',           function() { return redirect_301('/api/v1/sales-orders'); });

$router->get   ('/api/orders/jobs',            function() { return redirect_301('/api/v1/job-orders'); });
$router->get   ('/api/orders/jobs/{id}',       function($id) { return redirect_301('/api/v1/job-orders/' . $id); });
$router->post  ('/api/orders/jobs',            function() { return redirect_301('/api/v1/job-orders'); });

$router->get   ('/api/orders/work',            function() { return redirect_301('/api/v1/work-orders'); });
$router->get   ('/api/orders/work/{id}',       function($id) { return redirect_301('/api/v1/work-orders/' . $id); });
$router->post  ('/api/orders/work',            function() { return redirect_301('/api/v1/work-orders'); });
```

Adapt `redirect_301` to whatever helper the repo uses (Slim, Laravel, custom). Read existing redirect handlers if any:

```bash
grep -nE "(redirect|301)" mom/api/routes/*.php mom/api/middleware/*.php 2>/dev/null | head -10
```

If no helper exists, write a minimal one returning a Response with `Location` header and 301 status.

## STEP 5 — Validate (live curl)

```bash
php -S 127.0.0.1:8090 -t mom &
SERVER=$!
sleep 2

# Canonical paths
echo "=== /api/v1/sales-orders ==="
curl -sI 'http://127.0.0.1:8090/api/v1/sales-orders' | head -3

echo "=== /api/v1/job-orders ==="
curl -sI 'http://127.0.0.1:8090/api/v1/job-orders' | head -3

echo "=== /api/v1/work-orders ==="
curl -sI 'http://127.0.0.1:8090/api/v1/work-orders' | head -3

# Legacy paths (expect 301)
echo "=== /api/orders/sales (expect 301) ==="
curl -sI 'http://127.0.0.1:8090/api/orders/sales' | head -3

echo "=== /api/orders/jobs (expect 301) ==="
curl -sI 'http://127.0.0.1:8090/api/orders/jobs' | head -3

kill $SERVER
```

If responses are 401 (auth blocked), that's acceptable — document and rely on PHPUnit contract tests.

## STEP 6 — Update OpenAPI spec

Edit `mom/api/openapi.yaml`. Add plural canonical paths under existing structure. If spec is too large for manual edit, document the new paths as a new section block:

```yaml
# Transactional plural-form canonical paths (ADR-0008, Stream C.2)
paths:
  /api/v1/sales-orders:
    get:
      summary: List sales orders
      tags: [transactional-orders]
      responses:
        '200':
          description: Sales order collection
  /api/v1/sales-orders/{soNumber}:
    get:
      summary: Get sales order detail
      ...
  # ... etc for /api/v1/job-orders, /api/v1/work-orders
```

## STEP 7 — Regenerate endpoint catalog

```bash
php tools/scripts/ai-index/generate.php --verbose
# OR
composer --working-dir=mom run ai:index

# Verify
grep -c "/api/v1/sales-orders\|/api/v1/job-orders\|/api/v1/work-orders" mom/data/registry/endpoint-catalog.json
# Expected: > 0
```

## STEP 8 — Add contract tests

Create `mom/tests/contract/TransactionalRestTest.php`:

```php
<?php
namespace Tests\Contract;

use PHPUnit\Framework\TestCase;

/**
 * Verifies canonical REST plural-form routes for SO/JO/WO are reachable
 * and return same shape as legacy /api/orders/* paths.
 */
class TransactionalRestTest extends TestCase
{
    /** @dataProvider canonicalRoutes */
    public function testCanonicalListReturnsCollection(string $url): void
    {
        $resp = $this->request('GET', $url);
        $this->assertSame(200, $resp->getStatusCode());
        $body = json_decode((string) $resp->getBody(), true);
        $this->assertIsArray($body);
    }

    public static function canonicalRoutes(): array
    {
        return [
            ['/api/v1/sales-orders'],
            ['/api/v1/job-orders'],
            ['/api/v1/work-orders'],
        ];
    }

    private function request(string $method, string $url, ?string $body = null) { /* adapt to repo test infra */ }
}
```

Create `mom/tests/contract/TransactionalLegacyRedirectTest.php`:

```php
<?php
namespace Tests\Contract;

use PHPUnit\Framework\TestCase;

class TransactionalLegacyRedirectTest extends TestCase
{
    /** @dataProvider redirectPairs */
    public function testLegacyPathRedirects301(string $legacy, string $canonical): void
    {
        $resp = $this->request('GET', $legacy, null, ['follow_redirects' => false]);
        $this->assertSame(301, $resp->getStatusCode());
        $location = $resp->getHeader('Location')[0] ?? '';
        $this->assertStringContainsString($canonical, $location);
    }

    public static function redirectPairs(): array
    {
        return [
            ['/api/orders/sales',     '/api/v1/sales-orders'],
            ['/api/orders/jobs',      '/api/v1/job-orders'],
            ['/api/orders/work',      '/api/v1/work-orders'],
        ];
    }

    private function request(string $method, string $url, ?string $body, array $opts = []) { /* adapt to repo test infra */ }
}
```

## STEP 9 — Run PHPUnit

```bash
cd mom
./vendor/bin/phpunit --testdox 2>&1 | tail -30
```

Mark new contract tests as `@skip` if test infrastructure can't easily invoke routes — document in report.

## STEP 10 — Generate report + commit

Create `_reports/module-template-v4/S_BACKEND_TRANSACTIONAL_REST_REPORT.md` (mirror EQMS aliases report style).

```bash
git add mom/api/routes/rest-routes.php \
        mom/api/routes/core-routes.php \
        mom/api/controllers/OrderController.php \
        mom/api/openapi.yaml \
        mom/data/registry/endpoint-catalog.json \
        mom/data/registry/endpoint-catalog-index.json \
        mom/tests/contract/TransactionalRestTest.php \
        mom/tests/contract/TransactionalLegacyRedirectTest.php \
        _reports/module-template-v4/S_BACKEND_TRANSACTIONAL_REST_REPORT.md

git commit -m "feat(api): formalize transactional REST canonical paths (Stream C.2)

Canonical /api/v1/{sales-orders,job-orders,work-orders} routes added,
delegating to OrderController + 5 thin wrapper methods (type-binding
transitions + work-order list/detail).

Legacy /api/orders/{sales,jobs,work}/* paths emit 301 redirects.

Per ADR-0008. Phase B (Slices 9-12) live data integration prereq."

git push -u origin codex/backend-transactional-rest
```

## ROLLBACK

```bash
git checkout main
git branch -D codex/backend-transactional-rest
git push origin --delete codex/backend-transactional-rest
```

Or revert: `git revert <commit> -m 1 && git push`.

All changes are additive (new routes, new wrapper methods, new redirect handlers, new tests). Pure rollback restores prior state cleanly.

## DECISION PHRASE OUTPUT

```text
TRANSACTIONAL_REST_PASS_READY_FOR_REVIEW
TRANSACTIONAL_REST_PASS_WITH_WARNINGS
TRANSACTIONAL_REST_FAIL_BLOCK_NEXT
```
