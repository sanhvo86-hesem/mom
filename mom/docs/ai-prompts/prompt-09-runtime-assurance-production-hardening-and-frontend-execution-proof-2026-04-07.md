# Prompt 09 — Runtime Assurance, Production Hardening, and Frontend Execution Proof
_Date: 2026-04-07_

You are working inside `sanhvo86-hesem/hesemqms`.

## Non-negotiable instruction

Do **not** trust prior PASS wording, prior chat summaries, or prior “ready” claims by themselves.

Your authority in this run is only:
1. the actual repo tree
2. the actual runtime behavior you can execute in this run
3. fresh proof artifacts generated in this run
4. code + tests + reports that can be committed and pushed

If a claim cannot be proved by **repo + runnable evidence**, do **not** claim it.

---

## Why this prompt exists

Assume Prompt 08 may have improved public-repo truth substantially.
That is necessary, but it is **not enough**.

The next highest-severity platform gap is now:

> **Static publication truth may exist without executable runtime truth.**

This prompt exists to close the gap between:
- registry / manifest / summary truth
and
- end-to-end runtime truth under real writes, workflow authority, concurrency, observability, and frontend consumption.

This is **not** a planning prompt.
It is an **implementation + runnable-proof prompt**.

---

## Treat the following as hypotheses, not facts, until you prove them in this run

These may have been claimed in prior runs:
- `publication-truth-summary.md` exists and is honest
- prompt lineage exists and is machine-verifiable
- `24/24` truth verifier passes
- `114/114` smoke passes
- platform is globally publishable
- entities are frontend-ready
- workflow bridges are all ready

Do not repeat those claims unless your runnable proof in this run supports them.

---

## Objective

Deliver a repo state where a skeptical reviewer can verify that the platform is not only publication-consistent, but also:
- runnable
- auditable
- concurrency-safe
- workflow-authoritative
- benchmarked honestly
- observability-capable
- frontend-consumable from canonical metadata

before broad frontend build-out.

---

## Hard boundaries

### You must not do these
- Do **not** write another giant architecture report.
- Do **not** widen scope into generic future planning.
- Do **not** create marketing summaries.
- Do **not** claim production readiness if proof is local-only or partial.
- Do **not** mark runtime green if collector/benchmark/e2e are not actually run.

### You must do these
- modify code where needed
- add or strengthen tests
- add or strengthen executable proof scripts
- generate fresh proof artifacts
- keep truth honest if anything remains incomplete

---

## Core mission

Close the remaining serious gaps across **seven** workstreams.

---

# Workstream A — Runnable end-to-end contract proof

Create a **real executable E2E contract suite** for the Foundation Governance slice and at least one cross-entity flow.

## Minimum flows to prove

1. register organization node
2. register party
3. register calendar
4. create approval group (or equivalent canonical write)
5. decision on approval group through the workflow authority path
6. list/read timeline or approval history with cursor semantics
7. fetch audit/evidence linkage for the created/modified records

If exact route names differ in repo truth, use the actual canonical routes.

## Required positive cases
- normal create/read/update/read sequence
- optimistic concurrency success with valid `If-Match`
- cursor-based list/timeline progression
- workflow state progression through the approved authority chain
- record creation followed by audit-trail verification

## Required negative cases
- stale `If-Match` / ETag mismatch
- self-approval prohibited
- unauthorized or insufficient-role action
- invalid workflow transition
- duplicate retry or duplicate submission behavior
- malformed request returning RFC 9457 problem detail

## Required proof artifacts
Create fresh artifacts under a compact, GitHub-reviewable path, e.g.:

- `_reports/runtime-assurance/e2e-contract-report.json`
- `_reports/runtime-assurance/e2e-contract-report.md`

These must include:
- `runtime_proof_run_id`
- `generatedAt`
- scenario list
- route/method exercised
- expected status
- actual status
- pass/fail
- trace id / correlation id if available
- entity ids created during the run

Static source inspection is not enough.
This must be runnable proof.

---

# Workstream B — Write-side truth, idempotency, and concurrency

The platform must prove that canonical writes are real and safe.

## Required outcomes

### B1. Canonical writes
For the internal/master-data commands involved in the slice, prove they perform canonical persistence, not stub/placeholder behavior.

### B2. Idempotency / duplicate protection
For create/command routes, implement or prove one of the following:
- existing idempotency-key handling
- safe dedupe contract
- duplicate write prevention by canonical natural key / command token

If repo architecture uses a different pattern, use that pattern — but it must be explicit and tested.

### B3. Optimistic concurrency
For mutable routes protected by `ETag` / `If-Match`, add proof that:
- valid token succeeds
- stale token fails deterministically
- response body and status are truthful
- retry behavior is safe

### B4. Transaction semantics
For critical write + workflow + audit paths, prove that failure does not leave a half-written canonical state.

Use actual PostgreSQL transaction boundaries that exist in repo, and strengthen them if needed.

## Required proof artifacts
- `_reports/runtime-assurance/concurrency-and-idempotency-report.json`
- `_reports/runtime-assurance/concurrency-and-idempotency-report.md`

Include:
- isolation assumptions
- conflict scenario results
- duplicate scenario results
- rollback scenario results
- pass/fail by case

---

# Workstream C — Workflow authority must be real, not decorative

Approval decisions and state changes must be governed by the real workflow authority path.

## Requirements

1. approval decision must not bypass `WorkflowEngine` or canonical workflow authority
2. adapter behavior must be truthful:
   - no “non-fatal” success when engine rejected or did not run
   - no silent fallback that makes registry green while runtime is not authoritative
3. blocked workflow states must remain blocked until genuinely fixed
4. once fixed, runtime, endpoint catalog, frontend catalog, manifest, and quality report must all agree

## Required negative tests
- engine rejects transition
- invalid state mapping
- actor not allowed
- double decision / repeated transition

## Required proof artifacts
- `_reports/runtime-assurance/workflow-authority-proof.json`
- `_reports/runtime-assurance/workflow-authority-proof.md`

Must include:
- workflow path used
- pre-state
- requested action
- post-state
- actor identity used by runtime
- audit event ids / record ids
- whether engine path truly executed

---

# Workstream D — Audit trail, electronic signature, and record-link proof

This platform aims at serious ERP/MES/eQMS use.
Therefore audit and signing semantics must be proved by runnable evidence, not only schemas.

## Minimum requirements

### D1. Audit trail completeness
For at least the critical approval flow and one master-data write flow, prove capture of:
- actor identity
- action performed
- record type / record id
- before/after or equivalent change semantics
- timestamp
- correlation / request / trace id if architecture supports it

### D2. Signature manifestation / actor binding
Where approval/decision constitutes a signing action, prove that the signing actor is bound to the action and that the record linkage is preserved.

### D3. Signature/record linking
No detached signature record.
The runtime proof must show linkability from signed action to canonical record and back.

### D4. Security hygiene
Problem-detail responses and logs must not leak unsafe internals.

## Required artifacts
- `_reports/runtime-assurance/audit-and-signature-proof.json`
- `_reports/runtime-assurance/audit-and-signature-proof.md`

These must be small enough to inspect on GitHub.

---

# Workstream E — Observability must progress from file export to real OTLP path

If the platform claims serious runtime readiness, it must provide more than file-only export.

## Required work

### E1. Collector-backed profile
Add a real local observability profile, for example via:
- docker compose collector
- local OTLP collector profile
- or another explicit collector-backed path already used in repo

### E2. Instrument critical flows
At minimum instrument:
- HTTP request span for critical slice routes
- write-side command path
- workflow decision path
- error/problem-detail path

### E3. Correlation
Expose or persist enough correlation to connect:
- HTTP request
- trace/span
- audit event
- runtime report artifact

### E4. Truthfulness rule
If you cannot actually run a collector-backed path in this run, set status honestly, e.g.:
- `collector_backed = false`
- `observability_status = scaffold_only`

Do not claim collector-backed proof unless you actually produced it.

## Required artifacts
- `_reports/runtime-assurance/observability-proof.json`
- `_reports/runtime-assurance/observability-proof.md`

Must include:
- whether collector path actually ran
- trace/span ids or sample resource attributes
- emitted metric names
- log correlation proof
- exact status: `collector_backed`, `file_export_only`, or `scaffold_only`

---

# Workstream F — Benchmark charter must become honest and more meaningful

A single short stability probe is not enough.

## Required benchmark profiles
At minimum define and run as many as environment honestly allows:

1. `contract_smoke`
2. `stability_probe`
3. `read_mix`
4. `write_mix`
5. `read_write_mix`
6. `optimistic_concurrency_conflict`
7. `workflow_failure_rollback`

If any profile cannot run, mark it honestly as not executed.

## Hard rules
- use real relations/tables that actually exist
- no benchmark SQL pointing at missing schema/table names
- file names must match the actual run date / run id
- report freshness must be machine-verifiable, not hard-coded calendar logic

## Required benchmark outputs
- `_reports/runtime-assurance/benchmark-charter-report.json`
- `_reports/runtime-assurance/benchmark-charter-report.md`
- keep or regenerate any raw benchmark outputs the repo already uses

Each profile must record:
- benchmark name
- executed or skipped
- reason if skipped
- clients
- threads/jobs
- duration
- dataset size assumptions
- TPS or throughput
- latency avg / p95 / p99 if available
- error rate
- pass/fail status
- run id and generatedAt

### Honest naming rule
If the report content is from 2026-04-07, the filename must not pretend it is a 2026-04-05 run.

---

# Workstream G — Frontend execution proof, not only metadata closure

Even if catalogs say `ready`, frontend consumption must be proved.

## Your job
Prove that canonical metadata can drive a real frontend contract for at least:
- `governance.approval_group`
- one additional foundation entity (e.g. organization, party, or calendar) using the actual repo truth

## Required proof modes
Use the strongest mode the repo supports:
1. existing frontend generator dry-run
2. generated screen contract bundle
3. metadata-to-component validator
4. snapshot proof of action/state/field packs consumed by UI config

## Must prove
- detail view field definitions are usable
- list/table field packs are usable
- action availability follows state and authority truth
- problem responses / conflict responses are surfaced in contract shape
- pagination/cursor semantics are usable by UI
- attachments/evidence/audit drawer linkage is explicit if these exist for the entity

## Required artifacts
- `_reports/runtime-assurance/frontend-execution-proof.json`
- `_reports/runtime-assurance/frontend-execution-proof.md`

These must show:
- entity key
- source metadata files used
- generated or validated screen pack name(s)
- actions available by state
- whether manual patching was required
- pass/fail by entity

If manual patching is required, mark the entity not fully generator-ready.

---

# Workstream H — One runtime-assurance verifier

Create one compact verifier script that checks whether runtime proof, benchmark proof, observability proof, and publication truth all line up.

Suggested location:
- `01-QMS-Portal/tools/verify_runtime_assurance.py`

## It must fail on these conditions
- proof artifacts missing
- mismatched `runtime_proof_run_id`
- stale artifacts mixed with fresh artifacts
- truth verifier green but e2e report absent
- smoke green but benchmark report absent when benchmark was claimed
- frontend-ready claimed but frontend execution proof absent
- collector-backed claimed but observability proof lacks collector evidence
- workflow-authoritative claimed but workflow proof shows bypass/fallback

## Optional but preferred
Output compact machine-readable summary to:
- `01-QMS-Portal/qms-data/registry/runtime-assurance-summary.json`
- `01-QMS-Portal/qms-data/registry/runtime-assurance-summary.md`

If you add these, they must stay small and GitHub-renderable.

---

## Standards and truth anchors

Use these standards only where they materially affect runtime contract and proof:

- OpenAPI Specification **3.1.2**
- RFC **9457** Problem Details
- JSON Schema **2020-12**
- OpenTelemetry semantic conventions
- PostgreSQL transaction isolation and locking semantics
- GraphQL Cursor Connections pagination discipline where applicable to opaque cursors
- ISA-95 for ERP ↔ MES boundary vocabulary and manufacturing-control integration language
- FDA **21 CFR Part 11** expectations for trustworthy electronic records and signatures
- EU GMP **Annex 11** expectations for computerized systems, lifecycle, risk, audit trail, signatures, security, and supplier oversight
- NIST AI RMF **1.0** if any AI-governed runtime behavior is involved

Do not write theory sections.
Use standards only to harden code, tests, and proof.

---

## Files you are allowed and expected to change

You may modify any necessary repo files, especially:
- `01-QMS-Portal/api/*`
- `01-QMS-Portal/tests/*`
- `01-QMS-Portal/tools/*`
- `01-QMS-Portal/qms-data/registry/*`
- `_reports/*`
- frontend generator/config files if they exist
- benchmark harness files
- observability config files

You may also update compact publication/runtime summaries if they need to reflect the new truth.

---

## Required output of this run

You must produce:

1. real code changes
2. real test/proof script changes
3. fresh runtime proof artifacts
4. fresh benchmark artifacts
5. fresh observability proof artifact
6. fresh frontend execution proof artifact
7. one runtime-assurance verifier
8. one concise execution report:
   - what changed
   - which workstreams truly passed
   - which did not
   - exact blockers, if any
9. commit and push all changes

Do not produce a giant essay.
Produce runnable proof.

---

## Acceptance criteria

This run is successful only if all of the following are true:

### Runtime proof criteria
- e2e contract suite runs and produces fresh artifact(s)
- canonical writes are proven on the critical slice
- concurrency / ETag behavior is proven with positive and negative cases
- workflow decisions are proven to go through the true authority chain
- audit/signature proof artifacts link actor ↔ action ↔ record truthfully

### Observability criteria
- observability status is truthful
- if collector-backed is claimed, proof artifact must show real collector-backed evidence
- trace/log/metric correlation is demonstrated for at least one critical flow

### Benchmark criteria
- benchmark artifact filenames and contents are date/run-id consistent
- no missing-table benchmark SQL remains in the executed profiles
- executed-vs-skipped status is explicit and honest

### Frontend proof criteria
- at least two entities have frontend execution proof
- metadata readiness without execution proof must not be called fully generator-ready

### Anti-false-green criteria
The run fails if:
- publication truth is green but runtime proof is missing
- smoke is green but critical e2e cases are not executed
- collector-backed is claimed without collector-backed evidence
- benchmark is described as production-like when it is only a small probe
- frontend-ready is claimed without frontend execution proof
- any summary file overstates reality

---

## Final instruction

Act like a release engineer, validation lead, and skeptical auditor at the same time.

The platform must now prove **runtime truth**, not only **repo truth**.
