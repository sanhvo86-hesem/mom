# CODEX MEGAPROMPT — Backend EQMS Plural-Form REST Aliases

> Paste the entire block below into Codex local with PHP/PostgreSQL backend
> awareness. Codex will create branch `codex/backend-eqms-aliases`, add 7
> EQMS plural-form REST aliases, and produce a report.
>
> If Codex asks for approval, paste:
> `Proceed with EQMS plural-form REST alias backend work.`

---

## ROLE & CONTEXT

You are Codex local with full repo authority on `sanhvo86-hesem/mom`.

You are adding **plural-form REST aliases** for 7 EQMS root resources so the HMV4 frontend can integrate using Step 3 frozen canonical paths. The existing controllers use SINGULAR form (`/api/v1/eqms/ncr`). Step 3 vocabulary uses PLURAL form (`/api/v1/nonconformance-cases`).

This unblocks the HMV4 fixture→live cutover for Slices 3-8 with **zero new business logic** — pure additive route registration plus thin GET-list wrapper methods.

This is **development/prototype work only**. Do NOT change EQMS business logic. Do NOT touch frontend.

## ABSOLUTE NON-NEGOTIABLES

```text
Do NOT modify any existing method on EQMS controllers.
You MAY add ONE additive method named `query()` to each of the 7 EQMS controllers below — that wrapper MUST delegate to the existing `search()` projection without inventing new query semantics.
Do NOT modify HMV4 frontend.
Do NOT change forbidden files.
Do NOT promote registries.
Do NOT change EQMS database schema.
```

## RESOLVED POLICY DECISIONS (locked from earlier review)

1. **GET vs POST for list**: ADD additive `query()` wrappers (not switch to `POST .../query`). Step 3 vocabulary mandates GET for list endpoints (per ADR-0002). Seven thin wrappers (~3 lines each) is the smaller cost.

2. **Comments/attachments**: Single `comments()` and `attachments()` methods exist (not split `_list`/`_create`). Use them for both GET and POST.

3. **Action methods**: camelCase `actionContain`, `actionInvestigate`, `actionClose`, etc. (NOT snake_case `action_contain`). Verify by grep before registering.

4. **Update verb**: Use `PATCH` (not `PUT`). The existing legacy alias also uses PATCH.

## PRE-FLIGHT (must all PASS or STOP)

```bash
git fetch origin
git checkout main
git pull --ff-only

git status --short
# Expected: empty

# Verify EQMS controllers exist
ls mom/api/controllers/Eqms*.php
# Expected: 7 controllers including EqmsNcrController, EqmsCapaController, EqmsDocumentsController, EqmsInspectionController, EqmsBatchReleaseController, EqmsEngineeringChangeController, EqmsTrainingController

# Verify route files
ls mom/api/routes/rest-routes.php mom/api/routes/eqms-quality-routes.php
# Expected: both exist

# Verify OpenAPI specs
ls mom/api/openapi.yaml mom/api/openapi-eqms-worldclass.yaml
# Expected: both exist

# Verify endpoint catalog
ls mom/data/registry/endpoint-catalog.json mom/data/registry/endpoint-catalog-index.json
# Expected: both exist

# Create branch
git checkout -b codex/backend-eqms-aliases
```

If any check fails, return `EQMS_ALIASES_PREFLIGHT_FAIL_<reason>` and stop.

## ALLOWED FILES

```text
mom/api/routes/rest-routes.php
mom/api/routes/eqms-quality-routes.php (only if needed for re-export)
mom/api/openapi.yaml
mom/data/registry/endpoint-catalog.json
mom/data/registry/endpoint-catalog-index.json
mom/api/controllers/EqmsNcrController.php           (additive query() only)
mom/api/controllers/EqmsCapaController.php          (additive query() only)
mom/api/controllers/EqmsDocumentsController.php     (additive query() only)
mom/api/controllers/EqmsInspectionController.php    (additive query() only)
mom/api/controllers/EqmsBatchReleaseController.php  (additive query() only)
mom/api/controllers/EqmsEngineeringChangeController.php (additive query() only)
mom/api/controllers/EqmsTrainingController.php      (additive query() only)
mom/tests/contract/EqmsPluralAliasTest.php (NEW — optional but recommended)
_reports/module-template-v4/S_BACKEND_EQMS_ALIASES_REPORT.md (NEW)
```

## FORBIDDEN

```text
Any HMV4 frontend file (mom/scripts/portal/7?-module-template-v4-*.js)
mom/portal.html
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
Modifying any existing method on the 7 EQMS controllers (only adding new query() is permitted)
Database schema changes (no new migrations in this slice)
Business logic changes
```

## STEP 1 — Inspect existing route patterns

```bash
# Read existing routes structure
cat mom/api/routes/rest-routes.php | head -80
cat mom/api/routes/eqms-quality-routes.php | head -50

# Find existing EQMS singular routes for one root (use as reference)
grep -n "/api/v1/eqms/ncr" mom/api/routes/*.php

# Identify routing helper signature
grep -nE '\$router->(get|post|patch|put|delete)' mom/api/routes/eqms-quality-routes.php | head -10
```

Note the exact registration syntax (closure vs `[Class::class, 'method']` vs string `Class@method`). Match it for the new aliases.

## STEP 2 — Verify controller method names

For each of the 7 controllers, list public methods to verify the names you'll reference:

```bash
for ctrl in EqmsNcrController EqmsCapaController EqmsDocumentsController \
            EqmsInspectionController EqmsBatchReleaseController \
            EqmsEngineeringChangeController EqmsTrainingController; do
  echo "=== $ctrl ==="
  grep -nE 'public function (search|create|detail|update|audit|comments|attachments|relationships|signatures|export|action[A-Z][a-zA-Z]+)\(' mom/api/controllers/$ctrl.php
  echo ""
done
```

Record the exact method names per controller. If a method doesn't exist on a particular controller (e.g., `action_close` vs `actionClose` vs `closeCase`), use the actual name. Do NOT register routes pointing to non-existent methods.

## STEP 3 — Add `query()` wrappers (ONE per controller)

For each of the 7 EQMS controllers, append (do NOT modify existing) one new public method:

```php
/**
 * Plural-form GET-list wrapper. Delegates to existing search().
 *
 * Added 2026-04-25 per ADR-0008 (EQMS plural-form canonical paths).
 * Frontend HMV4 uses /api/v1/<plural-resource> via this wrapper;
 * legacy /api/v1/eqms/<singular>/search continues to serve POST-body
 * filtered queries.
 */
public function query(Request $request): JsonResponse
{
    return $this->search($request);
}
```

Adapt the `Request`/`JsonResponse` types and the return path to whatever the controller's existing `search()` actually returns. If `search()` is a different signature (no Request param, etc.), adapt the wrapper accordingly.

Add the method JUST BEFORE the closing `}` of the controller class. Do NOT touch any other line.

## STEP 4 — Add plural REST aliases in `rest-routes.php`

Find a clean section (or create a new comment block) and append:

```php
// ─────────────────────────────────────────────────────────────────
// EQMS plural-form REST aliases (ADR-0008, 2026-04-25)
// Frontend HMV4 (Step 3 vocabulary) uses these canonical paths.
// Existing /api/v1/eqms/<singular> paths remain live.
// ─────────────────────────────────────────────────────────────────

// NQCASE → /api/v1/nonconformance-cases
$router->get   ('/api/v1/nonconformance-cases',                  [EqmsNcrController::class, 'query']);
$router->post  ('/api/v1/nonconformance-cases',                  [EqmsNcrController::class, 'create']);
$router->get   ('/api/v1/nonconformance-cases/{id}',             [EqmsNcrController::class, 'detail']);
$router->patch ('/api/v1/nonconformance-cases/{id}',             [EqmsNcrController::class, 'update']);
$router->get   ('/api/v1/nonconformance-cases/{id}/audit',       [EqmsNcrController::class, 'audit']);
$router->get   ('/api/v1/nonconformance-cases/{id}/comments',    [EqmsNcrController::class, 'comments']);
$router->post  ('/api/v1/nonconformance-cases/{id}/comments',    [EqmsNcrController::class, 'comments']);
$router->get   ('/api/v1/nonconformance-cases/{id}/attachments', [EqmsNcrController::class, 'attachments']);
$router->post  ('/api/v1/nonconformance-cases/{id}/attachments', [EqmsNcrController::class, 'attachments']);
$router->post  ('/api/v1/nonconformance-cases/{id}:contain',     [EqmsNcrController::class, 'actionContain']);
$router->post  ('/api/v1/nonconformance-cases/{id}:investigate', [EqmsNcrController::class, 'actionInvestigate']);
$router->post  ('/api/v1/nonconformance-cases/{id}:close',       [EqmsNcrController::class, 'actionClose']);
$router->post  ('/api/v1/nonconformance-cases/{id}:reopen',      [EqmsNcrController::class, 'actionReopen']);

// CAPA → /api/v1/capas
$router->get   ('/api/v1/capas',                                 [EqmsCapaController::class, 'query']);
$router->post  ('/api/v1/capas',                                 [EqmsCapaController::class, 'create']);
$router->get   ('/api/v1/capas/{id}',                            [EqmsCapaController::class, 'detail']);
$router->patch ('/api/v1/capas/{id}',                            [EqmsCapaController::class, 'update']);
$router->get   ('/api/v1/capas/{id}/audit',                      [EqmsCapaController::class, 'audit']);
$router->get   ('/api/v1/capas/{id}/comments',                   [EqmsCapaController::class, 'comments']);
$router->post  ('/api/v1/capas/{id}/comments',                   [EqmsCapaController::class, 'comments']);
$router->get   ('/api/v1/capas/{id}/attachments',                [EqmsCapaController::class, 'attachments']);
$router->post  ('/api/v1/capas/{id}/attachments',                [EqmsCapaController::class, 'attachments']);
// (action verbs per Step 2 CAPA state machine; verify against EqmsCapaController)
$router->post  ('/api/v1/capas/{id}:start-analysis',             [EqmsCapaController::class, 'actionStartAnalysis']);
$router->post  ('/api/v1/capas/{id}:close',                      [EqmsCapaController::class, 'actionClose']);
$router->post  ('/api/v1/capas/{id}:cancel',                     [EqmsCapaController::class, 'actionCancel']);

// CDOC → /api/v1/controlled-documents
$router->get   ('/api/v1/controlled-documents',                  [EqmsDocumentsController::class, 'query']);
$router->post  ('/api/v1/controlled-documents',                  [EqmsDocumentsController::class, 'create']);
$router->get   ('/api/v1/controlled-documents/{id}',             [EqmsDocumentsController::class, 'detail']);
$router->patch ('/api/v1/controlled-documents/{id}',             [EqmsDocumentsController::class, 'update']);
$router->get   ('/api/v1/controlled-documents/{id}/audit',       [EqmsDocumentsController::class, 'audit']);
$router->get   ('/api/v1/controlled-documents/{id}/comments',    [EqmsDocumentsController::class, 'comments']);
$router->post  ('/api/v1/controlled-documents/{id}/comments',    [EqmsDocumentsController::class, 'comments']);
$router->get   ('/api/v1/controlled-documents/{id}/attachments', [EqmsDocumentsController::class, 'attachments']);
$router->post  ('/api/v1/controlled-documents/{id}/attachments', [EqmsDocumentsController::class, 'attachments']);
$router->post  ('/api/v1/controlled-documents/{id}:approve',     [EqmsDocumentsController::class, 'actionApprove']);
$router->post  ('/api/v1/controlled-documents/{id}:release',     [EqmsDocumentsController::class, 'actionRelease']);

// INSP → /api/v1/inspections (unifies iqc + inprocess)
$router->get   ('/api/v1/inspections',                           [EqmsInspectionController::class, 'query']);
$router->post  ('/api/v1/inspections',                           [EqmsInspectionController::class, 'create']);
$router->get   ('/api/v1/inspections/{id}',                      [EqmsInspectionController::class, 'detail']);
$router->patch ('/api/v1/inspections/{id}',                     [EqmsInspectionController::class, 'update']);
$router->get   ('/api/v1/inspections/{id}/audit',                [EqmsInspectionController::class, 'audit']);
$router->post  ('/api/v1/inspections/{id}:flag-nonconformance',  [EqmsInspectionController::class, 'actionFlagNonconformance']);

// BREL → /api/v1/batch-releases
$router->get   ('/api/v1/batch-releases',                        [EqmsBatchReleaseController::class, 'query']);
$router->get   ('/api/v1/batch-releases/{id}',                   [EqmsBatchReleaseController::class, 'detail']);
$router->post  ('/api/v1/batch-releases/{id}:approve-release',   [EqmsBatchReleaseController::class, 'actionApproveRelease']);
$router->post  ('/api/v1/batch-releases/{id}:market-ship',       [EqmsBatchReleaseController::class, 'actionMarketShip']);

// ECO → /api/v1/engineering-changes
$router->get   ('/api/v1/engineering-changes',                   [EqmsEngineeringChangeController::class, 'query']);
$router->post  ('/api/v1/engineering-changes',                   [EqmsEngineeringChangeController::class, 'create']);
$router->get   ('/api/v1/engineering-changes/{id}',              [EqmsEngineeringChangeController::class, 'detail']);
$router->patch ('/api/v1/engineering-changes/{id}',              [EqmsEngineeringChangeController::class, 'update']);
$router->get   ('/api/v1/engineering-changes/{id}/audit',        [EqmsEngineeringChangeController::class, 'audit']);

// TRAIN → /api/v1/training-records
$router->get   ('/api/v1/training-records',                      [EqmsTrainingController::class, 'query']);
$router->post  ('/api/v1/training-records',                      [EqmsTrainingController::class, 'create']);
$router->get   ('/api/v1/training-records/{id}',                 [EqmsTrainingController::class, 'detail']);
$router->patch ('/api/v1/training-records/{id}',                 [EqmsTrainingController::class, 'update']);
$router->get   ('/api/v1/training-records/{id}/audit',           [EqmsTrainingController::class, 'audit']);
// Matrix and curricula sub-resources (verify methods exist):
$router->get   ('/api/v1/training-records/matrix',               [EqmsTrainingController::class, 'matrix']);
$router->get   ('/api/v1/training-records/curricula',            [EqmsTrainingController::class, 'curricula']);
```

**IMPORTANT**: Before registering each route, RE-VERIFY that the target method exists on the controller (Step 2 grep output). If a method doesn't exist (e.g., `EqmsBatchReleaseController` lacks `create`), DO NOT register that route. Note in report what was skipped.

For action verbs that DO exist but with a different name than my guess (e.g., `actionContain` vs `containCase` vs `contain`), use the actual name.

## STEP 5 — Validate alias-to-canonical equivalence

Start the dev server:

```bash
php -S 127.0.0.1:8090 -t mom &
sleep 2
```

For each EQMS root, query both singular and plural and verify response shape matches:

```bash
# NQCASE
curl -s 'http://127.0.0.1:8090/api/v1/eqms/ncr/search' -X POST -H 'Content-Type: application/json' -d '{}' | jq -c '.[0].id // .id // .data.id'
curl -s 'http://127.0.0.1:8090/api/v1/nonconformance-cases' | jq -c '.[0].id // .id // .data.id'
# Expected: same id (or both null/empty if dataset empty)

# Repeat for capas, controlled-documents, inspections, batch-releases, engineering-changes, training-records
```

If responses differ, the wrapper or routing is broken. Investigate before continuing.

Note: live server may return 401 if auth middleware blocks unauthenticated calls. In that case, document this in report and rely on PHPUnit contract tests for equivalence verification.

## STEP 6 — Update OpenAPI spec

Edit `mom/api/openapi.yaml` to add the plural paths under the existing structure. Use `description: "Plural-form alias for /api/v1/eqms/<singular>. Canonical per ADR-0008."` so reviewers see the lineage.

If the spec is too large to extend manually, add a top-level note pointing to the plural alias section in `mom/api/routes/rest-routes.php` and let the endpoint catalog regen pick up the routes.

## STEP 7 — Regenerate endpoint catalog

```bash
php tools/scripts/ai-index/generate.php --verbose
# OR
composer --working-dir=mom run ai:index
```

Verify catalogs include the new aliases:

```bash
grep -c '/api/v1/nonconformance-cases' mom/data/registry/endpoint-catalog.json
grep -c '/api/v1/capas' mom/data/registry/endpoint-catalog.json
# Expected: > 0 for each
```

## STEP 8 — Add contract test

Create `mom/tests/contract/EqmsPluralAliasTest.php`:

```php
<?php
namespace Tests\Contract;

use PHPUnit\Framework\TestCase;

/**
 * Verifies that EQMS plural-form aliases return the same data as the
 * singular /api/v1/eqms/<root> equivalents. Per ADR-0008.
 */
class EqmsPluralAliasTest extends TestCase
{
    /** @dataProvider aliasPairs */
    public function testPluralAliasMatchesSingular(string $plural, string $singular): void
    {
        // Use existing test helper to invoke routes (adapt to repo's test
        // infrastructure — e.g., via a Slim/Laravel/custom test request).
        $pluralResponse = $this->request('GET', $plural);
        $singularResponse = $this->request('POST', $singular . '/search', '{}');

        $this->assertSame(200, $pluralResponse->getStatusCode());
        // Loose shape comparison: top-level array length, keys
        $pa = json_decode((string) $pluralResponse->getBody(), true);
        $sa = json_decode((string) $singularResponse->getBody(), true);
        $this->assertSame(
            isset($pa[0]) ? array_keys($pa[0]) : [],
            isset($sa[0]) ? array_keys($sa[0]) : []
        );
    }

    public static function aliasPairs(): array
    {
        return [
            ['/api/v1/nonconformance-cases',  '/api/v1/eqms/ncr'],
            ['/api/v1/capas',                 '/api/v1/eqms/capa'],
            ['/api/v1/controlled-documents',  '/api/v1/eqms/documents'],
            ['/api/v1/inspections',           '/api/v1/eqms/iqc'],
            ['/api/v1/batch-releases',        '/api/v1/eqms/batch-release'],
            ['/api/v1/engineering-changes',   '/api/v1/eqms/engineering-change'],
            ['/api/v1/training-records',      '/api/v1/eqms/training'],
        ];
    }

    private function request(string $method, string $url, ?string $body = null) { /* adapt to repo test infra */ }
}
```

Adapt `request()` to whatever request helper exists in `mom/tests/`. If unfamiliar, look at any existing contract test for reference.

## STEP 9 — Run PHPUnit

```bash
cd mom
./vendor/bin/phpunit --testdox
```

If the new contract test errors due to test infra mismatch, document and skip the test (mark as `@skip`) rather than block the slice.

## STEP 10 — Generate report

Create `_reports/module-template-v4/S_BACKEND_EQMS_ALIASES_REPORT.md`:

```markdown
# Backend EQMS Plural-Form REST Aliases Report

## Summary
- ~91 plural-form routes registered across 7 EQMS roots
- 7 additive `query()` wrapper methods added to controllers
- OpenAPI spec extended
- Endpoint catalog regenerated

## Branch and working tree
- Branch: codex/backend-eqms-aliases
- Base: origin/main

## Routes added (count + per-root breakdown)
| Root | Plural path | Routes added | Methods skipped (and why) |
|---|---|---:|---|
| NQCASE | /api/v1/nonconformance-cases | 13 | (list any) |
| CAPA   | /api/v1/capas | 12 | |
| CDOC   | /api/v1/controlled-documents | 11 | |
| INSP   | /api/v1/inspections | 6 | |
| BREL   | /api/v1/batch-releases | 4 | |
| ECO    | /api/v1/engineering-changes | 5 | |
| TRAIN  | /api/v1/training-records | 7 | |

## Controller wrappers added
- EqmsNcrController::query() — delegates to search()
- ... (7 total)

## Validation
### Alias vs canonical response equivalence
- (per-root verdict, with auth-blocked notes if any)

### OpenAPI spec
- (paths added under what section)

### Endpoint catalog regeneration
- (count of new entries verified)

### PHPUnit
- (existing test count, new contract test count, pass/fail/skip)

## Rollback notes
git revert <this-commit> reverts cleanly because all changes are additive.

## Remaining warnings
- (auth blocks during curl smoke; recommend PHPUnit auth bypass)
- (any methods skipped because controller method doesn't exist)
- (BatchRelease lacks create()? document)

## Decision
EQMS_ALIASES_PASS_READY_FOR_REVIEW
EQMS_ALIASES_PASS_WITH_WARNINGS
EQMS_ALIASES_FAIL_BLOCK_NEXT
```

## STEP 11 — Commit and push

```bash
git add mom/api/routes/rest-routes.php \
        mom/api/controllers/Eqms*.php \
        mom/api/openapi.yaml \
        mom/data/registry/endpoint-catalog.json \
        mom/data/registry/endpoint-catalog-index.json \
        mom/tests/contract/EqmsPluralAliasTest.php \
        _reports/module-template-v4/S_BACKEND_EQMS_ALIASES_REPORT.md

git commit -m "feat(api): add EQMS plural-form REST aliases (ADR-0008)

Adds plural-form REST routes for 7 Wave 1 EQMS roots so HMV4 frontend
can integrate via Step 3 frozen canonical paths. All routes delegate
to existing controllers; zero business logic change.

Roots: NQCASE, CAPA, CDOC, INSP, BREL, ECO, TRAIN.
Each controller gains one additive query() wrapper for GET-list.
Existing singular paths (/api/v1/eqms/<root>) remain live.
Per ADR-0008."

git push -u origin codex/backend-eqms-aliases
```

## ROLLBACK PROCEDURE

```bash
# Local
git checkout main
git branch -D codex/backend-eqms-aliases

# After push
git push origin --delete codex/backend-eqms-aliases

# Or revert the commit on remote
git revert <commit-sha> -m 1 && git push
```

Because all changes are additive (new routes, new wrappers, no schema), revert is clean.

## DECISION PHRASE OUTPUT

Return ONE of:

```text
EQMS_ALIASES_PASS_READY_FOR_REVIEW
EQMS_ALIASES_PASS_WITH_WARNINGS
EQMS_ALIASES_FAIL_BLOCK_NEXT
```
