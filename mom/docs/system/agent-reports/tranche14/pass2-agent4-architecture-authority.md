# Pass 2 Agent 4 — Architecture / Data / Authority Audit
## WORLD-CLASS ZERO-TRUST SWARM CLOSURE TRANCHE 14

Worktree: `/Users/a10/Documents/mom-tranche14-integration`
Branch: `codex/tranche14-zero-trust-closure-20260414`

I audited the current integration branch state after implementation. I did not modify code.

## Evidence used

- `/Users/a10/Documents/mom-tranche14-integration/mom/api/services/OrderService.php:478-545`
- `/Users/a10/Documents/mom-tranche14-integration/mom/api/services/CustomerPurchaseOrderService.php:282-375`
- `/Users/a10/Documents/mom-tranche14-integration/mom/api/services/FinanceControlService.php:47-80, 114-137, 688-705`
- `/Users/a10/Documents/mom-tranche14-integration/mom/api/controllers/SchemaStudioController.php:5113-5158, 5546-5557`
- `/Users/a10/Documents/mom-tranche14-integration/mom/data/registry/schema-authority-summary.json:1-34`
- `/Users/a10/Documents/mom-tranche14-integration/mom/data/registry/system-contract-manifest.json:26-54`
- `/Users/a10/Documents/mom-tranche14-integration/mom/tests/Unit/Services/RegistryBootstrapPathTest.php:12-38`
- `/Users/a10/Documents/mom-tranche14-integration/mom/contracts/object-index.json:680-730, 845-955, 1240-1285`
- `/Users/a10/Documents/mom-tranche14-integration/mom/tools/contracts/generate_business_contract_bundle.py:573-583`

## Verification run

- `cd /Users/a10/Documents/mom-tranche14-integration/mom && composer test`
- `cd /Users/a10/Documents/mom-tranche14-integration/mom && composer check`

Current live-tree result:
- `composer test`: passed, `413` tests, `2394` assertions, `1` skipped.
- `composer check`: PHPStan passed with no errors, then PHPUnit passed with the same `413/2394/1` result.

## What is stronger now

- `SchemaStudioController` now labels the registry source as `mom/data/registry/table-registry.json`, which matches the actual runtime registry path used by `RegistryService`.
- `schema-authority-summary.json` now distinguishes registry publication count from schema snapshot count instead of collapsing them into one number.
- `system-contract-manifest.json` now publishes a coherent registry snapshot with `tableCount: 758` and `endpointCount: 4180`.
- `OrderService::createSalesOrder()` now rejects zero-value orders and can derive `total_value` from line data when it is omitted.
- `CustomerPurchaseOrderService` now carries `org_id` forward into the customer PO record, which improves multisite lineage.

## Findings

| Severity | Area | Current verified state | False / overstated claim | Code-fixable defect | Blocker class |
|---|---|---|---|---|---|
| P1 | Authority boundary / org scoping | `FinanceControlService` now enforces org-scoped period closes and memo posting, but `resolveOrgId()` still accepts `context['org_id']` and an explicit arg when session org is absent. Session wins, but caller-supplied org claims can still satisfy the boundary. | “Org scoping always comes only from the authenticated session” is false. | Tighten the org claim path so non-session callers cannot supply their own org identity unless they enter a dedicated system-job API. | Product decision for background/system callers. |
| P2 | Generated-artifact semantics | `object-index.json` now zeros `recommendedActions` for many governed resources, including quotes, credit/debit memos, and other financial objects. The generator still copies those lists from source contracts, so the publication change is real and not accidental noise. | “The object index still carries action guidance for downstream workflows” is no longer reliably true. | Restore the action lists from source contracts or explicitly remove the action-guidance contract from publication semantics. | Product decision if downstream UX/workflow tooling depends on those hints. |
| P2 | Repo hygiene / cleanup | Two generated JSON files are present in `mom/data/registry` but are untracked and unreferenced by the code paths I inspected: `api-params.json` and `schema-library.json`. | “All generated registry artifacts are accounted for” is false in the current worktree. | Either add them to the tracked publication set or ignore/remove them. | None beyond ownership/cleanup. |
| P2 | Partial publication gap | `schema-authority-summary.json` reports `table_count: 772`, `registry_table_count: 758`, and `registry_publication_state: registry_bootstrap_or_partial_publication_table_count_differs_from_schema_snapshot`. `system-contract-manifest.json` reports `tableCount: 758`, `endpointCount: 4180`, `warningCount: 3`, and `graphicsGovernanceReleaseBlocked: true`. | “The registry publication fully equals schema authority” is not true. | Close the remaining registry publication gap if full publication is the goal. | External/product sequencing for the remaining 14-table delta and graphics blockers. |
| P3 | Traceability / authority posture | The runtime still carries a mixed-authority posture overall; strong slices exist, but the platform does not yet prove uniform authority across every governed slice. | “Everything is authoritative-ready” would still be overstated. | Continue collapsing compatibility-first paths where the schema and migration path are ready. | Migration and rollout sequencing. |

## Current architecture read

### Canonical model

The canonical spine is strong but still bounded. The repo now has a coherent core identity model, and the publication layer is more explicit about what is registry publication versus schema authority. That said, the canonical enterprise model is still narrower than a full end-to-end ERP+MOM+MES+EQMS contract.

### Authority boundaries

The best boundary in this tranche is the generic CRUD guard and the current authority reporting model. The remaining weak point is org identity resolution in finance control. It is already better than a raw free-for-all, but it is not yet strict enough for a zero-trust multitenant posture if non-session callers are allowed.

### Digital thread and traceability

The publication plane and the registry path are now aligned better than before, and the schema/manifest artifacts tell a more honest story about registry versus schema authority. Traceability remains a staged capability, not a universal end-to-end guarantee across every event family.

### Planning-to-execution

Order value derivation is now less fragile, and customer purchase orders retain org lineage. That is a real improvement for planning-to-execution consistency and multisite traceability. The remaining gap is that finance authority and some broader planning semantics still rely on caller context rather than a stricter claim path.

### Trusted records

The release/close controls are materially stronger than a plain CRUD record model. The remaining issue is not whether the records exist, but whether the authority path for creating them is sufficiently strict in every caller mode.

### Generated artifacts

The registry publication now looks internally coherent, but the object-index semantic erosion and the untracked generated JSON files are real hygiene concerns. Those are not cosmetic in a zero-trust closure run, because they affect what downstream consumers believe to be the contract surface.

### Multisite readiness

`org_id` propagation into customer purchase orders is the right direction. The remaining blocker is the finance-control fallback path that still allows caller-provided org identity in the absence of session claims.

## False or overstated claims that should not survive pass 2

- “Org-scoped finance control is session-only.” It is not yet.
- “Generated contract guidance is unchanged.” It is not; `recommendedActions` are now empty in many published object-index entries.
- “Every generated registry artifact is tracked or intentionally ignored.” That is not true while `api-params.json` and `schema-library.json` remain untracked and unreferenced.
- “Registry publication equals schema authority.” It does not; the summary explicitly says the registry is still a partial publication.

## Code-fixable defects

1. Harden `FinanceControlService::resolveOrgId()` so only authenticated session claims can satisfy governed org-scoped actions, unless a dedicated system-job path is intentionally added.
2. Decide whether `object-index.json` should keep `recommendedActions` as contract guidance. If yes, restore them from the source contracts/generator.
3. Classify `mom/data/registry/api-params.json` and `mom/data/registry/schema-library.json` as tracked publication outputs or ignored build debris.

## External / product blockers

- The remaining 14-table gap between registry publication and schema snapshot is a product/migration sequencing issue, not a local refactor.
- Any broader expansion of the canonical enterprise model beyond the current backbone needs a scope decision, not just code churn.
- Full multisite hardening for finance and governance needs a strict claim model for system callers.

## Final verdict

The branch is materially stronger than before:
- the schema/registry path is more honest,
- the order and customer PO flows are less brittle,
- the current test and static-analysis suite are green.

What still blocks true world-class positioning is not compile health; it is authority strictness and publication hygiene. The finance org-resolution fallback and the stray generated artifacts are the two cleanest code-fixable issues left in this pass, while the registry-versus-schema delta remains an explicit product/migration blocker.
