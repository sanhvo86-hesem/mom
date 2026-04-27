# 35 — Full Wave Prompt Library
Mỗi wave có prompt khung để giao cho Codex/Claude/GPT. Phải thay placeholder bằng repo state thật và không được bỏ V21 guard.
## W0 — Phase 2 Integration Review & Repair
Stored prompt: `prompts/CODEX_W0_PROMPT.md`

```text
# CODEX W0 — Phase 2 Integration Review & Repair

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Stop implementation drift; verify current main/branch; repair Chromium baseline blocker

## Entry criteria
Uploaded source + repo state; no new slice

## Exit criteria
V21 reports created; stream matrix classified; blocker resolved or formally contained

## Required outputs
V21 current-main report, stream status matrix, Chromium repair plan, integration review

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING or BLOCKED_CROSS_BROWSER` unless evidence requires a stricter fail/block decision.
```

## W0.5 — Platform Substrate Hardening
Stored prompt: `prompts/CODEX_W0_5_PROMPT.md`

```text
# CODEX W0.5 — Platform Substrate Hardening

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Stabilize mandatory spines before more slices

## Entry criteria
W0 pass or approved repair path

## Exit criteria
Identity/workflow/evidence/API/data contracts/Graphics Authority baseline accepted

## Required outputs
Spine contracts, guard scripts, token governance, API contract template

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W0_5_PLATFORM_SUBSTRATE_ACCEPTED` unless evidence requires a stricter fail/block decision.
```

## W1 — HMV4 Foundation Productization
Stored prompt: `prompts/CODEX_W1_PROMPT.md`

```text
# CODEX W1 — HMV4 Foundation Productization

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Convert slice prototype mechanics into repeatable product factory

## Entry criteria
W0.5 accepted

## Exit criteria
Slice factory, fixtures, route parser, WS/AR templates, visual gates stable

## Required outputs
Slice factory, templates, QA harness, rollback scripts

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W1_SLICE_FACTORY_READY` unless evidence requires a stricter fail/block decision.
```

## W2 — Governed Record Factory
Stored prompt: `prompts/CODEX_W2_PROMPT.md`

```text
# CODEX W2 — Governed Record Factory

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Build reusable AR root shell factory for quality/ERP/MES records

## Entry criteria
W1 ready

## Exit criteria
Record shell, tabs, audit/evidence/signature placeholders repeatable

## Required outputs
AR template, root contract template, record shell tests

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W2_RECORD_FACTORY_READY` unless evidence requires a stricter fail/block decision.
```

## W3 — eQMS + Workforce + Maintenance Core
Stored prompt: `prompts/CODEX_W3_PROMPT.md`

```text
# CODEX W3 — eQMS + Workforce + Maintenance Core

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Graduate CAPA/CDOC/TRAIN/MWO/INSP workflow and evidence foundations

## Entry criteria
W2 ready

## Exit criteria
Core eQMS workflows fixture/E2E and selected live read-only APIs stable

## Required outputs
CAPA/CDOC/TRAIN/MWO/INSP reports

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W3_EQMS_CORE_READY` unless evidence requires a stricter fail/block decision.
```

## W4 — Live Read-Only API Graduation
Stored prompt: `prompts/CODEX_W4_PROMPT.md`

```text
# CODEX W4 — Live Read-Only API Graduation

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Turn selected roots from fixture to opt-in live read-only with fallback

## Entry criteria
W3 core stable

## Exit criteria
NQCASE/CAPA/CDOC/TRAIN/INSP read APIs contracted and observed

## Required outputs
OpenAPI, problem registry, live-vs-fixture reports

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W4_LIVE_READ_ONLY_READY` unless evidence requires a stricter fail/block decision.
```

## W4.5 — OTG Native Cutover
Stored prompt: `prompts/CODEX_W4_5_PROMPT.md`

```text
# CODEX W4.5 — OTG Native Cutover

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Make Operational Truth Graph an explicit product primitive

## Entry criteria
W4 ready

## Exit criteria
OTG nodes/edges/contracts and lineage browser prototype

## Required outputs
OTG schema, graph traversal tests, evidence lineage

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W4_5_OTG_NATIVE_READY` unless evidence requires a stricter fail/block decision.
```

## W5 — Core Transactional ERP/MOM
Stored prompt: `prompts/CODEX_W5_PROMPT.md`

```text
# CODEX W5 — Core Transactional ERP/MOM

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Implement SO/PO/JO/WO/INVTXN/SHIP/INVOICE/COST controlled flows

## Entry criteria
W4.5 ready

## Exit criteria
Transactional commands with workflow/audit/idempotency and rollback proof

## Required outputs
Command bus, API/event contracts, transaction tests

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W5_TRANSACTIONAL_CORE_READY` unless evidence requires a stricter fail/block decision.
```

## W6 — MES/OT Foundation
Stored prompt: `prompts/CODEX_W6_PROMPT.md`

```text
# CODEX W6 — MES/OT Foundation

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Build operation execution, equipment, work center, routing and OT-safe edge model

## Entry criteria
W5 ready

## Exit criteria
MES execution roots and OT boundaries modeled, read/write control gated

## Required outputs
ISA-95/88 model, equipment/routing/operation packages

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W6_MES_OT_FOUNDATION_READY` unless evidence requires a stricter fail/block decision.
```

## W6.5 — AI Advisory Controlled Rollout
Stored prompt: `prompts/CODEX_W6_5_PROMPT.md`

```text
# CODEX W6.5 — AI Advisory Controlled Rollout

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Introduce AI copilot as advisory only with eval and risk controls

## Entry criteria
W6 foundation + AI risk package

## Exit criteria
AI can retrieve/explain/summarize; cannot execute regulated decisions

## Required outputs
AI eval harness, intended-use, tool policy, red-team report

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W6_5_AI_ADVISORY_READY` unless evidence requires a stricter fail/block decision.
```

## W7 — Digital Thread / Genealogy / Release
Stored prompt: `prompts/CODEX_W7_PROMPT.md`

```text
# CODEX W7 — Digital Thread / Genealogy / Release

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Connect lot/serial/inspection/NC/CAPA/MRB/release into release packet

## Entry criteria
W6.5 ready

## Exit criteria
Genealogy and release packet can prove make-to-release path

## Required outputs
Release packet, genealogy graph, containment workflow

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W7_DIGITAL_THREAD_RELEASE_READY` unless evidence requires a stricter fail/block decision.
```

## W8 — Analytics / Improvement / Reliability
Stored prompt: `prompts/CODEX_W8_PROMPT.md`

```text
# CODEX W8 — Analytics / Improvement / Reliability

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
CDC, lakehouse, OEE/SPC/cost and SRE telemetry mature

## Entry criteria
W7 ready

## Exit criteria
Quality/OEE/cost analytics from governed data contracts

## Required outputs
Data products, OTel dashboards, DORA/SLO dashboards

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W8_ANALYTICS_RELIABILITY_READY` unless evidence requires a stricter fail/block decision.
```

## W9 — Security / Validation / Compliance Closure
Stored prompt: `prompts/CODEX_W9_PROMPT.md`

```text
# CODEX W9 — Security / Validation / Compliance Closure

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Complete validation and security packages for regulated scope

## Entry criteria
W8 ready

## Exit criteria
VMP/URS/RTM/IQ/OQ/PQ, ASVS/API/62443 evidence accepted

## Required outputs
Validation package, security evidence, backup/restore rehearsal

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W9_COMPLIANCE_VALIDATION_READY` unless evidence requires a stricter fail/block decision.
```

## W10 — Vertical Packs
Stored prompt: `prompts/CODEX_W10_PROMPT.md`

```text
# CODEX W10 — Vertical Packs

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Package pharma, med device, automotive, aerospace, industrial variants

## Entry criteria
W9 ready

## Exit criteria
Vertical roots and templates defined with onboarding packs

## Required outputs
Pharma/med device/auto/aero pack docs and data contracts

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W10_VERTICAL_PACKS_READY` unless evidence requires a stricter fail/block decision.
```

## W11 — Customer Pilot / Pre-Production Readiness
Stored prompt: `prompts/CODEX_W11_PROMPT.md`

```text
# CODEX W11 — Customer Pilot / Pre-Production Readiness

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Prepare controlled pilot without calling it production

## Entry criteria
W10 ready

## Exit criteria
Pilot playbook, training, support, SRE, rollback and validation evidence ready

## Required outputs
Pilot checklist, site readiness, support runbook

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W11_PRE_PRODUCTION_READINESS_READY` unless evidence requires a stricter fail/block decision.
```

## W12 — Release Candidate / Scale Operating Model
Stored prompt: `prompts/CODEX_W12_PROMPT.md`

```text
# CODEX W12 — Release Candidate / Scale Operating Model

You are operating in `sanhvo86-hesem/mom`. Follow `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, and `CLAUDE.md` before any planning or edits.

## Goal
Build multi-site productization and enterprise support operating model

## Entry criteria
W11 ready

## Exit criteria
Scale governance, tenant onboarding, operations, support, financial model stable

## Required outputs
RC evidence book, commercial model, SRE/support model

## Required guard checks
- `git status --short`
- `git log --oneline --decorate -20`
- allowed/forbidden file review
- static syntax and JSON parse when applicable
- no fixture production load
- HMV4 inert default verification when HMV4 surface is involved
- E2E reality check
- contract/evidence/rollback report

## Decision phrase
End with exactly: `W12_PRODUCTIZED_OPERATING_MODEL_READY` unless evidence requires a stricter fail/block decision.
```
