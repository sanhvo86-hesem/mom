# Connected Governance Readiness - Tranche 7

**Declared:** 2026-04-13
**Scope:** One backend slice connecting controlled revision release, site rollout, training obligation, execution entitlement, production history, and trusted release packet proof.

## Evidence-backed Controls

| Readiness area | Verified evidence | Current posture |
|---|---|---|
| Controlled revision authority | `ConnectedGovernanceService` releases a controlled revision into site rollout state and creates/updates a training obligation through repository methods. | Partial production-ready slice; full document lifecycle remains outside this tranche. |
| Site-by-site rollout | Rollout records carry company/legal entity/plant/site scope, effective window, rollout state, operation/resource/item scope, and source authority metadata. Execution entitlement enforces `effective_from <= now < effective_to`. | Stronger multisite shape for this slice; no claim of full multisite platform rollout. |
| Training linkage | Released revision creates training obligation with role, qualification code, due date, and supersession metadata. | Runtime proof exists for configured obligations; full HCM/training matrix authority is deferred. |
| Execution entitlement | Shopfloor production report submission is gated when a matching rollout exists and blocks inactive/site-mismatched rollout or missing/expired qualification. | Backend invariant exists for one execution action. |
| Audit/provenance | Entitlement decisions and revision/obligation events are emitted into the manufacturing event backbone with correlation and assertion references. Provenance event write failure fails the governed mutation closed. | Queryable through production history; not a full validated Part 11 package. |
| Trusted packet linkage | Production history summaries surface `connected_governance` and `qualification_gate` references so trusted release packets can carry revision/assertion proof. | Structured packet proof exists for the governed execution event path. |
| Observability | Runtime authority includes `connected_governance`; service probe reports backend mode and counters for releases, obligations, checks, blocks, allows, lag, packet blockers, and provenance event failures. | Slice is measurable locally; no external OpenTelemetry collector proof. |
| Registry/schema proof | Migrations `105` and `106` are reflected in `schema.sql`, schema authority summaries, table registry, governance overlay, system-contract artifacts, doctor report, simulator report, and publication proof. | Generated artifacts align with current workspace. |

## SSDF-Relevant Evidence

- Changes are covered by focused PHPUnit tests and broader backend/data-schema/registry smoke tests.
- Repository boundaries isolate persistence from service invariants.
- Deterministic denial reason codes are tested for missing qualification, expired qualification, site-not-adopted, future rollout, and expired rollout cases.
- Entitlement decision payloads carry explicit `connected_governance_decision.v1` schema metadata.
- Generated authority artifacts were rebuilt through the existing publication pipeline rather than hand-edited as runtime truth.

## OT / 62443-Relevant Evidence

- The execution-critical action fails closed when a configured controlled rollout is not adopted or the actor lacks current qualification proof.
- The execution-critical action also fails closed when a rollout is not yet effective or has expired.
- The existing assigned-operator guard remains in force before connected governance checks.
- Runtime probe and counters expose degraded/fallback backend mode instead of hiding compatibility-only state.
- The slice preserves legacy operation when no controlled rollout is configured, preventing a surprise production halt during staged rollout.

## Part 11-Relevant Evidence

- Release packet/provenance evidence is structured and reproducible from canonical manufacturing events.
- Entitlement decisions include actor, action, revision, obligation, assertion, scope, request/correlation, and source metadata.
- Missing provenance event persistence is not silently ignored for connected-governance release and entitlement mutations.
- Released trusted packets remain immutable through the tranche 6 release record repository behavior.

## Explicit Gaps

- No live validation protocol, formal Part 11 validation package, or electronic-signature ceremony expansion was completed here.
- No full document-control workflow redesign was performed.
- No full training LMS/HCM integration was completed.
- No live PostgreSQL concurrency/failover test was run in this workspace.
- No external OpenTelemetry collector/exporter proof is claimed.
