# Platform-Wide Post Single-Schema Merge — Gap Matrix (2026-04-07)

## Use of this matrix

This matrix is not a planning wishlist.
It is a closure matrix for the next platform pass.
Every row below maps a public-repo fact into a concrete closure action.

| ID | Gap | Severity | Current evidence | Why it matters | Closure action | Done when |
|---|---|---|---|---|---|---|
| G1 | **Schema authority is implicit** | P1 | `database/` contains `schema.sql`, `canonical-erp-mes-eqms-7-layer-blueprint.sql`, `mes-schema-specification.sql`, and `build_schema_snapshot.php` side by side | Reviewers and generators can still infer different authorities | Add machine-readable `schema-authority.json` plus human-readable `schema-authority.md`; declare `schema.sql` executable SSOT and classify the others as reference/spec artifacts | Repo contains explicit schema authority artifacts and generators point to them |
| G2 | **Publication metrics still split** | P1 | Manifest reports `workflow_engine_bridge.ready = 103 / blocked = 12`; quality report reports `ready = 104 / blocked = 11` | Canonical metrics are still not canonical | Make manifest + quality report derive bridge counts from one function/orchestrator | Both artifacts report identical bridge metrics |
| G3 | **Publishability still false** | P1 | Quality report still shows `publishability_ready = false`, `frontend_partial_entities = 108`, `workflow_engine_bridge_blocked = 12` | Platform-global release claims are still premature | Close remaining partial entities / blocked bridges, or state them transparently in compact summaries | Publishability truth is either honestly false with exact blockers, or truly true |
| G4 | **533 entity vs 528 catalog record gap is unexplained** | P1 | Manifest says `frontend_foundation.entity_count = 533`; asset metadata says `frontend-foundation-catalog.json.records = 528`; quality report check `tables_have_fields` targets `528` | Reviewers cannot tell whether this is a bug or entity/table accounting logic | Add compact accounting artifact or regenerate assets so the distinction is explicit | Repo explains the delta in one small proof file |
| G5 | **Scope semantics are mixed** | P1 | Artifacts still say `slice_publication_pass = foundation_governance_contract_slice` while publishing platform-global numbers | Slice truth and platform truth are being conflated | Adopt `global_canonical_plus_slice_summary` model explicitly | Global summaries and slice summaries are separate and named clearly |
| G6 | **Compact proof package is missing** | P1 | `qms-data/registry/` public tree shows only large artifacts and no small summary files | Public review is slow and trust depends on narrative | Create `publication-truth-summary.md/json` and `foundation-governance-publication-summary.md/json` | Reviewer can validate status from GitHub web UI without loading 8–16 MB files |
| G7 | **OpenAPI patch-level lag** | P2 | `api/openapi.yaml` is still `openapi: "3.1.1"` | Not a feature blocker, but unnecessary drift after convergence | Upgrade to 3.1.2 if no semantic blocker exists | Spec header is 3.1.2 |
| G8 | **Contract/runtime convergence still needs one final sweep** | P1 | Public spec models Foundation/Governance behaviors, but platform-global publication still says review required | Future frontend and SDK work must trust one contract surface | Run one explicit contract convergence pass that aligns OpenAPI, runtime routes, endpoint catalog, and slice/global summaries | Spec/runtime/catalog no longer contradict one another |
| G9 | **Prompt authority is too diffuse** | P2 | `docs/ai-prompts` contains a long Prompt 02 cluster, multiple Prompt 03 files, and old Prompt 04 package | Future sessions can reopen stale workstreams and duplicate effort | Add `CURRENT-PLATFORM-AUTHORITY-2026-04-07.md` and prompt lineage/current-lane note | New sessions can identify the active lane in under 2 minutes |
| G10 | **Public reviewer ergonomics are weak** | P2 | `frontend-foundation-catalog.json` is too large for inline GitHub rendering | Review friction hides truth | Keep large canonical artifacts, but add compact summaries and accounting notes | Reviewer can validate headline truth from small renderable files |
| G11 | **Benchmark/smoke exist but are not yet platform-proof artifacts** | P2 | Public tree shows benchmark and smoke harnesses, but not a small current platform-level proof summary | Release claims are still artifact-heavy, not reviewer-friendly | Reference benchmark + smoke truth in compact summaries and current-authority docs | Proof posture is explicit and current |
| G12 | **Single-schema merge is not yet reflected in prompt lineage** | P2 | Public prompt tree has many historical files but no explicit post-merge reset doc | Teams can keep working from pre-merge assumptions | Add post-merge authority reset + runbook | Prompt lineage matches current repo phase |

## Priority order

### Must close before calling platform proof converged
- G1
- G2
- G3
- G4
- G5
- G6
- G8

### Strongly recommended in the same pass
- G7
- G9
- G10
- G11
- G12

## Short-form target state

The target state of the next pass is not “more documents”.
It is this:
- one schema authority,
- one publication authority,
- one reviewer-friendly truth package,
- one current prompt authority,
- one clear separation of platform-global and slice-specific proof.
