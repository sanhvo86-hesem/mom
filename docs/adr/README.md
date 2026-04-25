# Architecture Decision Records (ADR)

This directory holds the major architectural decisions for the HESEM
Operations Platform frontend redesign program (Wave 1 — module-template-v4
slice prototype).

Each ADR is **immutable once accepted**; supersession is via a new ADR.

## Index

| # | Title | Status | Date | Source |
|---|---|---|---|---|
| [0001](0001-non-production-positioning.md) | Non-production positioning for slice work | Accepted | 2026-04-25 | NON_PRODUCTION_DELIVERY_POSITIONING.md |
| [0002](0002-frozen-vocabulary.md) | Frozen vocabulary: 14 domains, 18 Wave 1 roots | Accepted | 2026-04-25 | STEP1_MASTER_CONTEXT.md |
| [0003](0003-route-grammar-ops-prefix.md) | Route grammar: `/ops` prefix, `/records/` for AR | Accepted | 2026-04-25 | STEP4_ROUTE_MASTER.md |
| [0004](0004-forbidden-file-list.md) | Forbidden file list (7 paths) | Accepted | 2026-04-25 | STEP6_HTML_MASTER.md / STEP8_PATCH_MASTER.md |
| [0005](0005-slice-based-prototype-cycle.md) | Slice-based prototype cycle (plan→approval→impl→QA) | Accepted | 2026-04-25 | STEP11_LIMITED_WAVE1_PLANNING_MASTER.md |
| [0006](0006-feature-flag-hmv4-preview.md) | Feature flag `HMV4_PREVIEW_ENABLED` (inert by default) | Accepted | 2026-04-25 | STEP7_IMPLEMENTATION_MASTER.md |
| [0007](0007-fixture-first-development.md) | Fixture-first development (no live API in slices) | Accepted | 2026-04-25 | PARALLEL_RESEARCH_API_READINESS_MATRIX.md |
| [0008](0008-eqms-plural-form-canonical-paths.md) | EQMS plural-form canonical paths (REST aliases) | Accepted | 2026-04-25 | UPGRADE_PROMPT_PACK_3_BACKEND_ALIGNMENT.md |
| [0009](0009-graphics-authority-no-hardcode.md) | Graphics Authority no-hardcode rule | Accepted | 2026-04-25 | CLAUDE.md |
| [0010](0010-bridge-alias-policy.md) | Bridge alias policy (4 states: canonical / keep_as_alias / redirect_then_deprecate / internal_only_bridge) | Accepted | 2026-04-25 | V18 NC slice / V20 Bridge alias correction note |

## Process

To add a new ADR:

1. Copy `template.md` to `<NNNN>-<short-title>.md` (next available number).
2. Fill in Status / Context / Decision / Consequences / Alternatives / References.
3. Add a row to this index table.
4. Open a PR for review. ADR status becomes `Accepted` after merge.
5. To revise an accepted ADR, create a new ADR with status `Supersedes ADR-NNNN` and update the old ADR's status to `Superseded by ADR-MMMM`.

## Format

All ADRs follow [adr.github.io](https://adr.github.io/) markdown format.
