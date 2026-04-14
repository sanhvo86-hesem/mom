# Tranche 13 Unresolved Backlog Ledger

Date: 2026-04-14

This ledger resolves the six first-pass agent reports against current code, tests, generated artifacts, and local verifier output. Default disposition for code-fixable items is `FIX_NOW`.

## Ledger

| Item | Source prompt / tranche / doc | Original expected outcome | Current verified status | Evidence | Why still open | Code-fixable now | Action required in this run |
|---|---|---|---|---|---|---|---|
| Runtime registry path drift | Tranche 12 registry blocker, commit `a42f0d16`, Agents 1/4/6 | Generated registry artifacts are available to runtime and publication tools | `FIX_NOW` | Bootstrap files exist under root `data/registry`; runtime and publication tools resolve `mom/data/registry`; `verify_publication_truth.py` fails Gate A on missing `mom/data/registry/*` | Artifact location and consumed runtime location disagree | Yes | Align generated registry publication and runtime lookup to the same canonical path |
| Bootstrap registry artifact reproducibility | Commit `a42f0d16`, `tools/registry/generate-registry-from-ai-index.py` | Committed bootstrap artifacts are reproducible from the checked-in generator | `FIX_NOW` | Generator documents output to `mom/data/registry`, but committed artifacts landed in root `data/registry`; field shapes differ from generator output | Source/generated relationship is not reproducible | Yes | Regenerate or relocate artifacts with one controlled generator path and remove the stale location |
| Publication truth full closure | Prior publication truth prompts, `verify_publication_truth.py` | Full publication artifact set passes all gates | `STILL_OPEN_AND_UNACCEPTABLE` pre-implementation | Gate A fails on many missing artifacts; dry-run orchestrator is not proof; real schema refresh fails on missing registry inputs | Required registry source set is incomplete in the consumed path | Partly | Close path drift first, then rerun generators and classify remaining blockers with evidence |
| Metadata-only blocker families | `canonical_publication_orchestrator.py`, Agent 6 | Generator closes timestamp, operation, execution status, planning, resource, traceability metadata gaps | `FIX_NOW` pre-implementation | Agent 6 reports generator-automatable blockers still stop because registry inputs are absent | Mechanical closure cannot run until registry inputs are aligned | Yes | Restore the consumed registry inputs and rerun the mechanical publication path where safe |
| DB_PASSWORD-only blocker claim | Tranche 12 pass-2 notes | Schema publication blocked only by DB credential | `INVALID_CLAIM` | Current exercised failure reaches missing registry inputs before credentials are decisive | Root cause changed after bootstrap artifact landing | No | Correct docs so registry input/path drift is the current blocker |
| Runtime authority aggregate overconfidence | Agent 4 | Health surface should not hide partial or compatibility-only authority slices | `FIX_NOW` | `RuntimeAuthorityService` reports slice states, but aggregate labels remain coarse; HealthController surfaces broad status | Slice truth is present but not summarized strictly enough | Yes | Add explicit mixed-authority summary/degraded slices to health/runtime authority proof |
| Repo hygiene: tracked ignored/local artifacts | Tranche 13 repo hygiene rule, local `git ls-files` checks | Source tree excludes OS/editor/runtime/temp debris | `FIX_NOW` | Tracked `.DS_Store`, local settings, log/pid files, `mom/docs/tmp/*`, and `.tmp-benchmark-schema.sql` are present | These are source-control pollution and reproducibility noise | Yes | Remove tracked debris and extend ignore rules for `.pid` / temp schema artifacts |
| Ignored runtime residue from verification runs | Agent 6, local `git status --ignored=matching` | Verification outputs do not masquerade as source authority | `FIX_NOW` | Local ignored outputs appeared under `mom/data/registry`, schema-studio generated dirs, and modified schema summary after verifier runs | Local generated residue can confuse audits | Yes | Clean or regenerate intentionally; do not commit accidental residue |
| Attachment contract semantics | Orchestrator blocker classes, Agents 3/6 | Attachment semantics are governed by domain contract | `PRODUCT_DECISION_REQUIRED` | Classified as manual semantic contract | Needs product/domain owner | No | Keep explicit product-decision blocker |
| Work-instruction signal semantics | Orchestrator blocker classes, Agents 3/6 | Work-instruction signal semantics are governed | `PRODUCT_DECISION_REQUIRED` | Classified as manual semantic contract | Needs product/domain owner | No | Keep explicit product-decision blocker |
| Formula / aggregate contract semantics | Orchestrator blocker classes, Agents 3/6 | Formula/aggregate contract semantics are governed | `PRODUCT_DECISION_REQUIRED` | Classified as manual semantic contract | Needs product/domain owner | No | Keep explicit product-decision blocker |
| Full admin-tab authoritative persistence migration | Admin-tab tranche docs, Agents 1/6 | Admin control plane is fully backend-authoritative | `PRODUCT_DECISION_REQUIRED` | Alias/direct-write issues are closed; deeper migration scope remains broad | Requires product/architecture decision | No | Do not fake completion |

## Blocked external

No active external-only blocker is accepted before implementation. The previous `DB_PASSWORD` blocker is not the first failure in the current tree.

## Product decisions

- Attachment contract semantics.
- Work-instruction signal semantics.
- Formula / aggregate contract semantics.
- Full admin-tab authoritative persistence migration scope.
- Multisite/site-scoped readiness thresholds.

