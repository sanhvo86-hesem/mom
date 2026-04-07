# Prompt 10 — Live Stack, HTTP/UI Black-Box Proof, Collector-Backed Observability, and Load Proof
_Date: 2026-04-07_

You are working inside `sanhvo86-hesem/hesemqms`.

## Non-negotiable instruction

Do **not** trust prior PASS wording by itself.
Your authority in this run is only:
1. the actual repo tree
2. the actual stack you can boot in this run
3. the actual HTTP/browser/runtime behavior you can execute in this run
4. fresh proof artifacts generated in this run
5. code + configs + tests + reports that are committed and pushed

If something is only true in service-level/unit-style proof but not yet true through a live server, do **not** claim it as deployment-grade truth.

---

## Why this prompt exists

Assume Prompt 09 materially improved runtime truth and service-level assurance.
Good.

But the remaining honest limitations are still severe:
- observability is `file_export_only`
- benchmark is only `stability_probe`
- E2E proof is still service-level, not true HTTP integration against a running server

This prompt exists to close the gap between:
- **runtime/service proof**
and
- **release-candidate local deployment proof**

This is **not** another planning prompt.
This is a **boot-the-stack + hit-the-stack + observe-the-stack + prove-the-UI** prompt.

---

## Objective

Deliver a repo state where a skeptical reviewer can:
- boot the local runtime stack
- hit real HTTP routes
- see real auth/session/CSRF/header semantics
- observe trace/log/metric flow through a live collector-backed path
- run browser/UI proof on at least the Foundation Governance slice
- inspect compact, fresh, machine-verifiable proof artifacts

before broad frontend build-out.

---

## Hard boundaries

### You must not do these
- Do **not** write another giant architecture report.
- Do **not** create fake green summaries.
- Do **not** claim production readiness from local-only evidence.
- Do **not** mark HTTP/UI proof green if you only invoked services in-process.
- Do **not** mark collector-backed green if telemetry never flowed through a collector.
- Do **not** describe a benchmark as production-like if it was only a tiny local probe.

### You must do these
- modify runtime code/config where needed
- add a bootable local stack profile
- add real HTTP black-box tests
- add real browser/UI proof
- add collector-backed observability config and proof
- strengthen benchmark charter
- generate fresh artifacts with one correlated run id
- keep all truth honest if anything still cannot be proved

---

# Workstream A — Bootable local stack

Create one canonical local runtime profile that can boot the slice end-to-end.

## Preferred implementation order
1. `docker compose` profile with app + db + otel collector (+ optional Jaeger/Tempo/Prometheus/Grafana or other local backend)
2. if Docker is not available, a documented fallback using:
   - real local DB
   - real PHP/web server
   - real collector process
3. if neither is executable in this run, wire the configs anyway but mark this workstream incomplete

## Minimum boot targets
- app/API server serving real HTTP routes
- canonical database used by the slice
- observability collector-backed ingestion path
- browser/UI test runner if repo already supports it

## Required deliverables
- canonical local stack config under repo (`docker-compose.*.yml`, `ops/local-runtime/*`, or equivalent)
- one boot script or make target
- one teardown/cleanup script or target

## Required proof artifacts
- `_reports/release-candidate/local-stack-boot-report.json`
- `_reports/release-candidate/local-stack-boot-report.md`

These must record:
- `release_candidate_run_id`
- `generatedAt`
- services booted
- ports/endpoints exposed
- boot success/failure
- healthcheck results
- exact command(s) used

---

# Workstream B — True HTTP black-box contract proof

Create **real HTTP integration tests** that hit the running stack.
Do not count direct service invocation as sufficient.

## Required routes/flows
Use the repo’s actual canonical routes, but at minimum prove live HTTP behavior for:
1. organization node registration/read
2. party registration/read
3. calendar registration/read
4. approval group create/read
5. approval decision via live workflow path
6. timeline/history list with cursor behavior
7. audit/evidence lookup for changed records

## Required positive cases
- create → read → mutate → read
- valid `If-Match` with matching `ETag`
- cursor progression through real HTTP responses
- workflow progression via live route
- audit linkage visible after write/decision

## Required negative cases
- missing session cookie
- missing CSRF header
- stale `If-Match`
- malformed payload returning RFC 9457 `application/problem+json`
- invalid transition
- self-approval blocked
- unauthorized actor blocked
- duplicate or replay attempt handled safely

## Security semantics that must be proved live
Because earlier repo history found OR-vs-AND drift in security modeling, you must prove at actual HTTP edge that write routes require the intended combination of controls, not only in OpenAPI text.

If the real contract is:
- session cookie **AND** CSRF header,
then prove both are required.

If the real contract differs, prove the actual enforced behavior and update truth artifacts accordingly.

## Required proof artifacts
- `_reports/release-candidate/http-blackbox-report.json`
- `_reports/release-candidate/http-blackbox-report.md`

Each case must record:
- route/method
- request headers relevant to auth/concurrency
- expected status
- actual status
- response content-type
- whether RFC 9457 payload was returned when expected
- `etag_seen`
- `if_match_used`
- pass/fail

---

# Workstream C — Browser/UI execution proof

The repo already shows browser automation/playwright-style scaffolding.
Use it.

## Minimum browser/UI scope
Prove at least these live UI flows against the running stack:
1. `governance.approval_group`
2. one additional foundation entity (`foundation.organization`, `foundation.party`, or `foundation.calendar`) using actual repo truth

## Must prove in browser
- list view loads from real endpoint
- detail view loads from real endpoint
- field definitions render from canonical metadata without silent hand-patching
- action availability changes with real state/authority
- conflict/problem responses surface in actual UI flow
- audit/evidence drawer or equivalent linkage is reachable if supported

## Required artifacts
- `_reports/release-candidate/browser-ui-proof.json`
- `_reports/release-candidate/browser-ui-proof.md`
- small screenshot set under `_reports/release-candidate/screenshots/`

Each proven flow must include:
- entity key
- page/screen proven
- metadata source files used
- actions exercised
- state before/after
- whether manual patching was required
- screenshot paths
- pass/fail

If manual patching was required, mark the entity not fully generator-ready.

---

# Workstream D — Collector-backed observability

Move observability from `file_export_only` to a real local collector-backed proof path.

## Required work
1. add or wire a real OTLP collector profile
2. emit telemetry from the live app stack to that collector
3. prove correlation across:
   - HTTP request
   - trace/span
   - application log(s)
   - audit/event record(s)
   - proof artifact(s)

## Minimum instrumentation to prove live
- inbound HTTP span for at least two critical routes
- write-side command path
- workflow decision path
- error/problem-detail path

## Required proof artifacts
- `_reports/release-candidate/collector-observability-proof.json`
- `_reports/release-candidate/collector-observability-proof.md`

They must record:
- collector mode actually used
- whether OTLP export actually occurred
- trace ids / span ids seen
- emitted metric names
- log correlation evidence
- resource/service attributes
- pass/fail

## Truthfulness rule
If you cannot get a collector-backed path running in this run, do **not** claim success.
Mark explicitly:
- `collector_backed = false`
- `observability_status = file_export_only` or `scaffold_only`

But the target of this prompt is to **actually run collector-backed proof**.

---

# Workstream E — Live benchmark and soak charter

The benchmark must move beyond a tiny stability probe.

## Required benchmark profiles
Run as many of these as the environment honestly allows, preferably all:
1. `contract_smoke_http`
2. `read_mix_http`
3. `write_mix_http`
4. `read_write_mix_http`
5. `optimistic_concurrency_conflict`
6. `workflow_failure_rollback`
7. `short_soak`

You may use a mixed approach if justified:
- HTTP-level load for route behavior
- DB-level load where necessary
- but all executed profiles must be clearly labeled

## Hard rules
- no fake table names
- no legacy stale filenames
- filenames/content/run ids must align
- executed vs skipped must be explicit
- local-only benchmark must not be described as production-like

## Required artifacts
- `_reports/release-candidate/live-benchmark-report.json`
- `_reports/release-candidate/live-benchmark-report.md`

Each profile must record:
- benchmark name
- layer (`http`, `service`, `db`)
- executed/skipped
- reason if skipped
- concurrency/users/threads/jobs
- duration
- TPS/throughput
- latency avg/p95/p99 if available
- error rate
- retry/conflict counts if relevant
- pass/fail

---

# Workstream F — Failure injection, rollback, and recovery truth

A release candidate for ERP/MES/eQMS cannot stop at happy-path proof.

## Required scenarios
Prove at least these with the live stack:
1. workflow transition failure does not leave half-written canonical state
2. stale concurrency token does not corrupt state
3. duplicate/replay attempt does not create duplicate canonical effects
4. collector unavailable or delayed path does not falsely mark collector-backed proof green
5. if app/server process restarts during a failed operation, canonical state remains truthful after recovery

## Required artifacts
- `_reports/release-candidate/failure-recovery-proof.json`
- `_reports/release-candidate/failure-recovery-proof.md`

These must record pre-state, injected failure, post-state, rollback outcome, and pass/fail.

---

# Workstream G — One release-candidate verifier

Create one compact verifier that checks the entire local proof package.

Suggested locations:
- `01-QMS-Portal/tools/verify_release_candidate.py`
- plus optional wrapper script / make target

## It must fail on these conditions
- stack boot artifact missing or stale
- HTTP black-box artifact missing
- browser/UI proof missing
- collector-backed claimed without collector evidence
- benchmark claimed but no fresh live benchmark artifact exists
- runtime proof green but HTTP proof absent
- metadata-ready claimed but browser proof absent for proven entities
- mismatched run ids across release-candidate artifacts
- stale summary mixed with fresh proof artifacts

## Preferred outputs
- `01-QMS-Portal/qms-data/registry/release-candidate-summary.json`
- `01-QMS-Portal/qms-data/registry/release-candidate-summary.md`

Keep them small, GitHub-renderable, and brutally honest.

---

# Workstream H — Prompt lineage and scope honesty

If you update lineage artifacts, keep them compact and factual.
Do not create a new giant narrative.

The summary must distinguish clearly between:
- repo truth
- service-level runtime truth
- live HTTP truth
- browser/UI truth
- collector-backed observability truth
- local benchmark truth

Do not collapse them into one generic PASS statement.

---

## Standards and truth anchors

Use standards only where they materially harden code, tests, and proof:
- OpenAPI Specification **3.1.2**
- RFC **9457** Problem Details
- JSON Schema **2020-12**
- OpenTelemetry Collector / OTLP semantics
- PostgreSQL transaction isolation and retry semantics
- GraphQL Cursor Connections discipline where applicable to opaque cursor behavior
- FDA **21 CFR Part 11** expectations for trustworthy electronic records/signatures
- EU GMP **Annex 11** expectations for computerized systems, audit trail, signatures, validation, and operational control

Do not write theory sections.
Apply standards only where they change implementation or proof.

---

## Files you are allowed and expected to change

You may modify any necessary repo files, especially:
- `01-QMS-Portal/api/*`
- `01-QMS-Portal/tests/*`
- `01-QMS-Portal/tools/*`
- `01-QMS-Portal/qms-data/registry/*`
- `_reports/*`
- browser/playwright configs and tests
- local stack / docker compose / bootstrap scripts
- benchmark harness files
- observability configs

You may update compact truth summaries if and only if they reflect the real proof generated in this run.

---

## Required output of this run

You must produce:
1. real stack/config changes
2. real HTTP black-box tests
3. real browser/UI proof
4. real collector-backed observability proof if achievable
5. stronger live benchmark artifacts
6. failure/recovery proof artifacts
7. one release-candidate verifier
8. one concise execution report describing:
   - what changed
   - which workstreams truly passed
   - which did not
   - exact blockers if any remain
9. commit and push all changes

Do not produce a giant essay.
Produce runnable release-candidate proof.

---

## Acceptance criteria

This run is successful only if all of the following are true:

### Live stack criteria
- local stack boots from a documented canonical command/path
- healthcheck passes for the live app stack

### HTTP proof criteria
- black-box HTTP tests execute against a running server
- real auth/session/CSRF semantics are proved at the edge
- `ETag` / `If-Match` behavior is proved at the edge
- RFC 9457 responses are proved at the edge

### Browser/UI criteria
- at least two entity flows are proved through browser/UI automation
- screenshots and compact proof artifacts are generated fresh
- manual patching is disclosed if needed

### Observability criteria
- collector-backed proof is generated, or the run honestly fails this workstream
- trace/log/metric correlation is demonstrated for at least one critical live flow

### Benchmark criteria
- benchmark artifacts are fresh and run-id/date consistent
- executed vs skipped is explicit
- no benchmark over-claims are made

### Anti-false-green criteria
The run fails if:
- service-level proof is presented as live HTTP proof
- browser proof is absent but frontend execution is called release-ready
- collector-backed is claimed without collector evidence
- benchmark is described as production-like when it is only local/stability scope
- any compact summary overstates reality

---

## Final instruction

Act like a release engineer, validation lead, SRE, and skeptical auditor at the same time.

The next bar is no longer “the slice is internally coherent.”
The next bar is:

> **Can a reviewer boot it, hit it, observe it, stress it, and watch the UI behave truthfully on a live local stack?**

That is what you must prove now.
