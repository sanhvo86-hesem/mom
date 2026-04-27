# 32 — Detailed Root Execution Catalog
File này là catalog thực thi sâu cho từng root. Mục tiêu: khi giao cho Codex/Claude/GPT, agent không chỉ biết “root này là gì” mà biết phải tạo artifact nào, command nào bị cấm, event/evidence nào phải có, test nào phải chạy, và rollback nào phải ghi.
## QUO — Quotation
| Field | Value |
| --- | --- |
| Domain | Commercial & Customer |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | convert customer demand into priced, approved commercial intent |
| Next gates | pricing authority, customer terms, approval workflow, SO conversion evidence |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/quotation/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/quotation/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/quotation/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| QUO_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| QUO_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| QUO_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| QUO_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| QUO_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| QUO_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| QUO_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | QUO_CREATED, QUO_STATE_CHANGED, QUO_EVIDENCE_ATTACHED, QUO_APPROVED, QUO_CLOSED |
| evidence | QUO_scope_contract, QUO_fixture_coverage, QUO_e2e_report, QUO_audit_event, QUO_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CPO — Customer Purchase Order
| Field | Value |
| --- | --- |
| Domain | Commercial & Customer |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | capture external customer commitment and reconcile to quotation/sales order |
| Next gates | PO validation, customer reference uniqueness, exception workflow |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/customer-purchase-order/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/customer-purchase-order/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/customer-purchase-order/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CPO_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CPO_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CPO_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CPO_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CPO_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CPO_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CPO_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CPO_CREATED, CPO_STATE_CHANGED, CPO_EVIDENCE_ATTACHED, CPO_APPROVED, CPO_CLOSED |
| evidence | CPO_scope_contract, CPO_fixture_coverage, CPO_e2e_report, CPO_audit_event, CPO_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## SO — Sales Order
| Field | Value |
| --- | --- |
| Domain | Commercial & Customer |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | authorized demand root driving planning, fulfillment and revenue evidence |
| Next gates | order line authority, promise date, allocation, change history |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/sales-order/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/sales-order/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/sales-order/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| SO_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SO_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SO_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SO_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SO_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SO_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SO_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | SO_CREATED, SO_STATE_CHANGED, SO_EVIDENCE_ATTACHED, SO_APPROVED, SO_CLOSED |
| evidence | SO_scope_contract, SO_fixture_coverage, SO_e2e_report, SO_audit_event, SO_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## PO — Purchase Order
| Field | Value |
| --- | --- |
| Domain | Procurement & Supplier Quality |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | supplier demand commitment, receiving and supplier quality linkage |
| Next gates | supplier authorization, item revision, receipt, change and close control |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/purchase-order/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/purchase-order/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/purchase-order/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| PO_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PO_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PO_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PO_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PO_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PO_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PO_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | PO_CREATED, PO_STATE_CHANGED, PO_EVIDENCE_ATTACHED, PO_APPROVED, PO_CLOSED |
| evidence | PO_scope_contract, PO_fixture_coverage, PO_e2e_report, PO_audit_event, PO_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## IREV — Item Revision
| Field | Value |
| --- | --- |
| Domain | Product Engineering |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | authoritative revision/effectivity model for production and quality records |
| Next gates | ECO linkage, effectivity, BOM/routing compatibility, release status |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/item-revision/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/item-revision/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/item-revision/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| IREV_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| IREV_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| IREV_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| IREV_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| IREV_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| IREV_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| IREV_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | IREV_CREATED, IREV_STATE_CHANGED, IREV_EVIDENCE_ATTACHED, IREV_APPROVED, IREV_CLOSED |
| evidence | IREV_scope_contract, IREV_fixture_coverage, IREV_e2e_report, IREV_audit_event, IREV_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## ECO — Engineering Change Order
| Field | Value |
| --- | --- |
| Domain | Product Engineering |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | controlled change authority over item, BOM, routing, drawing and quality plans |
| Next gates | impact analysis, approval, effective date, implementation verification |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/engineering-change-order/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/engineering-change-order/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/engineering-change-order/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| ECO_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ECO_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ECO_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ECO_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ECO_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ECO_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ECO_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | ECO_CREATED, ECO_STATE_CHANGED, ECO_EVIDENCE_ATTACHED, ECO_APPROVED, ECO_CLOSED |
| evidence | ECO_scope_contract, ECO_fixture_coverage, ECO_e2e_report, ECO_audit_event, ECO_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## JO — Job Order
| Field | Value |
| --- | --- |
| Domain | Shopfloor / MES Execution |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | production intent and WIP authorization for making product |
| Next gates | SO/MRP linkage, item revision, routing, material availability, release approval |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/job-order/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/job-order/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/job-order/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| JO_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| JO_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| JO_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| JO_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| JO_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| JO_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| JO_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | JO_CREATED, JO_STATE_CHANGED, JO_EVIDENCE_ATTACHED, JO_APPROVED, JO_CLOSED |
| evidence | JO_scope_contract, JO_fixture_coverage, JO_e2e_report, JO_audit_event, JO_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## WO — Work Order
| Field | Value |
| --- | --- |
| Domain | Shopfloor / MES Execution |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | operation-level work authorization and evidence capture |
| Next gates | operator/equipment eligibility, instruction version, completion evidence |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/work-order/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/work-order/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/work-order/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| WO_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WO_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WO_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WO_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WO_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WO_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WO_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | WO_CREATED, WO_STATE_CHANGED, WO_EVIDENCE_ATTACHED, WO_APPROVED, WO_CLOSED |
| evidence | WO_scope_contract, WO_fixture_coverage, WO_e2e_report, WO_audit_event, WO_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## DISP — Dispatch Target / Dispatch Board
| Field | Value |
| --- | --- |
| Domain | Planning & Scheduling |
| Authority class | workspace projection + root |
| Current maturity | 3 |
| Target wave | W0/W1 |
| Purpose | supervisor projection for prioritized work; no hidden mutation authority |
| Next gates | re-anchor links, no direct mutation, E2E, route WS attributes |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/dispatch-target-dispatch-board/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/dispatch-target-dispatch-board/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/dispatch-target-dispatch-board/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| DISP_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DISP_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DISP_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DISP_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DISP_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DISP_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DISP_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | DISP_CREATED, DISP_STATE_CHANGED, DISP_EVIDENCE_ATTACHED, DISP_APPROVED, DISP_CLOSED |
| evidence | DISP_scope_contract, DISP_fixture_coverage, DISP_e2e_report, DISP_audit_event, DISP_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## PREC — Purchase Receipt
| Field | Value |
| --- | --- |
| Domain | Inventory & Supplier Quality |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W5 |
| Purpose | receipt of supplier material with inspection and lot creation impact |
| Next gates | PO match, supplier lot, incoming inspection trigger, inventory transaction |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/purchase-receipt/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/purchase-receipt/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/purchase-receipt/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| PREC_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PREC_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PREC_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PREC_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PREC_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PREC_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PREC_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | PREC_CREATED, PREC_STATE_CHANGED, PREC_EVIDENCE_ATTACHED, PREC_APPROVED, PREC_CLOSED |
| evidence | PREC_scope_contract, PREC_fixture_coverage, PREC_e2e_report, PREC_audit_event, PREC_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## LOT — Lot
| Field | Value |
| --- | --- |
| Domain | Traceability / Serialization |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W7 |
| Purpose | material/product lot genealogy, status and containment authority |
| Next gates | lot status, genealogy edge, hold/release, split/merge audit |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/lot/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/lot/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/lot/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| LOT_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| LOT_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| LOT_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| LOT_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| LOT_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| LOT_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| LOT_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | LOT_CREATED, LOT_STATE_CHANGED, LOT_EVIDENCE_ATTACHED, LOT_APPROVED, LOT_CLOSED |
| evidence | LOT_scope_contract, LOT_fixture_coverage, LOT_e2e_report, LOT_audit_event, LOT_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## INSP — Inspection
| Field | Value |
| --- | --- |
| Domain | Quality / eQMS |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W3/W4 |
| Purpose | inspection plan execution and measured quality evidence |
| Next gates | sampling plan, measurement units, disposition, NC trigger |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/inspection/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/inspection/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/inspection/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| INSP_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INSP_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INSP_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INSP_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INSP_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INSP_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INSP_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | INSP_CREATED, INSP_STATE_CHANGED, INSP_EVIDENCE_ATTACHED, INSP_APPROVED, INSP_CLOSED |
| evidence | INSP_scope_contract, INSP_fixture_coverage, INSP_e2e_report, INSP_audit_event, INSP_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## NQCASE — Nonconformance Case
| Field | Value |
| --- | --- |
| Domain | Quality / eQMS |
| Authority class | authoritative root |
| Current maturity | 4 |
| Target wave | W0/W4 |
| Purpose | contain, investigate, disposition and link quality escapes |
| Next gates | read-only API stabilization, disposition command, CAPA link, e-sign boundary |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/nonconformance-case/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/nonconformance-case/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/nonconformance-case/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| NQCASE_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NQCASE_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NQCASE_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NQCASE_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NQCASE_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NQCASE_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NQCASE_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | NQCASE_CREATED, NQCASE_STATE_CHANGED, NQCASE_EVIDENCE_ATTACHED, NQCASE_APPROVED, NQCASE_CLOSED |
| evidence | NQCASE_scope_contract, NQCASE_fixture_coverage, NQCASE_e2e_report, NQCASE_audit_event, NQCASE_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CAPA — Corrective / Preventive Action
| Field | Value |
| --- | --- |
| Domain | Quality / eQMS |
| Authority class | authoritative root |
| Current maturity | 3 |
| Target wave | W0/W3 |
| Purpose | root-cause, action, verification and effectiveness control |
| Next gates | cause taxonomy, action owner, verification evidence, effectiveness timer |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/corrective-preventive-action/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/corrective-preventive-action/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/corrective-preventive-action/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CAPA_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAPA_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAPA_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAPA_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAPA_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAPA_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAPA_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CAPA_CREATED, CAPA_STATE_CHANGED, CAPA_EVIDENCE_ATTACHED, CAPA_APPROVED, CAPA_CLOSED |
| evidence | CAPA_scope_contract, CAPA_fixture_coverage, CAPA_e2e_report, CAPA_audit_event, CAPA_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## BREL — Batch Release / Product Release
| Field | Value |
| --- | --- |
| Domain | Traceability / Quality |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W7 |
| Purpose | release decision packet derived from genealogy, inspection, deviation and signoff evidence |
| Next gates | release checklist, review by exception, e-sign, hold clearance |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/batch-release-product-release/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/batch-release-product-release/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/batch-release-product-release/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| BREL_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| BREL_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| BREL_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| BREL_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| BREL_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| BREL_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| BREL_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | BREL_CREATED, BREL_STATE_CHANGED, BREL_EVIDENCE_ATTACHED, BREL_APPROVED, BREL_CLOSED |
| evidence | BREL_scope_contract, BREL_fixture_coverage, BREL_e2e_report, BREL_audit_event, BREL_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CDOC — Controlled Document
| Field | Value |
| --- | --- |
| Domain | Quality / eQMS |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W3 |
| Purpose | controlled SOP/work instruction/document lifecycle |
| Next gates | version/effective date, training impact, approval, archive, read acknowledgement |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/controlled-document/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/controlled-document/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/controlled-document/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CDOC_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CDOC_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CDOC_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CDOC_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CDOC_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CDOC_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CDOC_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CDOC_CREATED, CDOC_STATE_CHANGED, CDOC_EVIDENCE_ATTACHED, CDOC_APPROVED, CDOC_CLOSED |
| evidence | CDOC_scope_contract, CDOC_fixture_coverage, CDOC_e2e_report, CDOC_audit_event, CDOC_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## TRAIN — Training Record / Qualification
| Field | Value |
| --- | --- |
| Domain | Workforce / Quality |
| Authority class | workspace + authoritative record |
| Current maturity | 2 |
| Target wave | W0/W3 |
| Purpose | prove operator qualification and skill eligibility for work |
| Next gates | training matrix, course/evidence, exam, expiration, dispatch eligibility |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/training-record-qualification/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/training-record-qualification/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/training-record-qualification/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| TRAIN_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TRAIN_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TRAIN_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TRAIN_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TRAIN_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TRAIN_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TRAIN_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | TRAIN_CREATED, TRAIN_STATE_CHANGED, TRAIN_EVIDENCE_ATTACHED, TRAIN_APPROVED, TRAIN_CLOSED |
| evidence | TRAIN_scope_contract, TRAIN_fixture_coverage, TRAIN_e2e_report, TRAIN_audit_event, TRAIN_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## MWO — Maintenance Work Order
| Field | Value |
| --- | --- |
| Domain | Maintenance / EHS |
| Authority class | authoritative root |
| Current maturity | 1 |
| Target wave | W3 |
| Purpose | maintenance execution and asset readiness authority |
| Next gates | asset, PM plan, downtime impact, completion evidence, return-to-service |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/maintenance-work-order/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/maintenance-work-order/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/maintenance-work-order/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| MWO_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MWO_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MWO_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MWO_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MWO_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MWO_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MWO_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | MWO_CREATED, MWO_STATE_CHANGED, MWO_EVIDENCE_ATTACHED, MWO_APPROVED, MWO_CLOSED |
| evidence | MWO_scope_contract, MWO_fixture_coverage, MWO_e2e_report, MWO_audit_event, MWO_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## ITEM — Item Master
| Field | Value |
| --- | --- |
| Domain | Master Data |
| Authority class | dependency root |
| Current maturity | 1 |
| Target wave | W0.5/W5 |
| Purpose | core material/product identity across ERP/MES/eQMS |
| Next gates | unique identity, revision policy, UOM, classification, lifecycle |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/item-master/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/item-master/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/item-master/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| ITEM_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ITEM_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ITEM_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ITEM_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ITEM_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ITEM_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ITEM_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | ITEM_CREATED, ITEM_STATE_CHANGED, ITEM_EVIDENCE_ATTACHED, ITEM_APPROVED, ITEM_CLOSED |
| evidence | ITEM_scope_contract, ITEM_fixture_coverage, ITEM_e2e_report, ITEM_audit_event, ITEM_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CUST — Customer Master
| Field | Value |
| --- | --- |
| Domain | Master Data |
| Authority class | dependency root |
| Current maturity | 1 |
| Target wave | W0.5/W5 |
| Purpose | customer identity, terms, site and compliance attributes |
| Next gates | duplicate prevention, address/terms authority, sales linkage |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/customer-master/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/customer-master/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/customer-master/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CUST_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CUST_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CUST_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CUST_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CUST_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CUST_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CUST_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CUST_CREATED, CUST_STATE_CHANGED, CUST_EVIDENCE_ATTACHED, CUST_APPROVED, CUST_CLOSED |
| evidence | CUST_scope_contract, CUST_fixture_coverage, CUST_e2e_report, CUST_audit_event, CUST_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## SUP — Supplier Master
| Field | Value |
| --- | --- |
| Domain | Master Data / Supplier Quality |
| Authority class | dependency root |
| Current maturity | 1 |
| Target wave | W0.5/W5 |
| Purpose | supplier identity, qualification and risk status |
| Next gates | qualification, approved item/scope, risk, SCAR history |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/supplier-master/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/supplier-master/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/supplier-master/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| SUP_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SUP_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SUP_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SUP_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SUP_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SUP_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SUP_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | SUP_CREATED, SUP_STATE_CHANGED, SUP_EVIDENCE_ATTACHED, SUP_APPROVED, SUP_CLOSED |
| evidence | SUP_scope_contract, SUP_fixture_coverage, SUP_e2e_report, SUP_audit_event, SUP_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## EQP — Equipment / Asset
| Field | Value |
| --- | --- |
| Domain | Maintenance / MES |
| Authority class | dependency root |
| Current maturity | 1 |
| Target wave | W0.5/W6 |
| Purpose | machine/tool/asset identity for work eligibility and maintenance |
| Next gates | status, calibration, PM, zone/conduit, eligibility |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/equipment-asset/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/equipment-asset/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/equipment-asset/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| EQP_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EQP_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EQP_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EQP_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EQP_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EQP_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EQP_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | EQP_CREATED, EQP_STATE_CHANGED, EQP_EVIDENCE_ATTACHED, EQP_APPROVED, EQP_CLOSED |
| evidence | EQP_scope_contract, EQP_fixture_coverage, EQP_e2e_report, EQP_audit_event, EQP_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## MDEV — Measurement Device
| Field | Value |
| --- | --- |
| Domain | Quality / Metrology |
| Authority class | dependency root |
| Current maturity | 1 |
| Target wave | W0.5/W6 |
| Purpose | measurement device authority for inspection evidence |
| Next gates | calibration status, MSA, permitted measure types, traceability |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/measurement-device/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/measurement-device/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/measurement-device/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| MDEV_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MDEV_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MDEV_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MDEV_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MDEV_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MDEV_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MDEV_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | MDEV_CREATED, MDEV_STATE_CHANGED, MDEV_EVIDENCE_ATTACHED, MDEV_APPROVED, MDEV_CLOSED |
| evidence | MDEV_scope_contract, MDEV_fixture_coverage, MDEV_e2e_report, MDEV_audit_event, MDEV_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## TENANT — Tenant / Site
| Field | Value |
| --- | --- |
| Domain | Core Platform |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W0.5 |
| Purpose | multi-site configuration and data boundary |
| Next gates | tenant isolation, site hierarchy, feature flags, data partition |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/tenant-site/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/tenant-site/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/tenant-site/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| TENANT_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TENANT_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TENANT_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TENANT_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TENANT_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TENANT_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TENANT_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | TENANT_CREATED, TENANT_STATE_CHANGED, TENANT_EVIDENCE_ATTACHED, TENANT_APPROVED, TENANT_CLOSED |
| evidence | TENANT_scope_contract, TENANT_fixture_coverage, TENANT_e2e_report, TENANT_audit_event, TENANT_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## USER — User Identity
| Field | Value |
| --- | --- |
| Domain | Identity / Access |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W0.5 |
| Purpose | human and service identity authority |
| Next gates | authn, MFA policy, lifecycle, session |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/user-identity/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/user-identity/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/user-identity/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| USER_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| USER_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| USER_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| USER_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| USER_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| USER_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| USER_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | USER_CREATED, USER_STATE_CHANGED, USER_EVIDENCE_ATTACHED, USER_APPROVED, USER_CLOSED |
| evidence | USER_scope_contract, USER_fixture_coverage, USER_e2e_report, USER_audit_event, USER_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## ROLE — Role / Permission
| Field | Value |
| --- | --- |
| Domain | Identity / Access |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W0.5 |
| Purpose | role and action authorization authority |
| Next gates | least privilege, segregation-of-duties, object authorization |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/role-permission/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/role-permission/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/role-permission/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| ROLE_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROLE_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROLE_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROLE_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROLE_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROLE_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROLE_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | ROLE_CREATED, ROLE_STATE_CHANGED, ROLE_EVIDENCE_ATTACHED, ROLE_APPROVED, ROLE_CLOSED |
| evidence | ROLE_scope_contract, ROLE_fixture_coverage, ROLE_e2e_report, ROLE_audit_event, ROLE_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## POLICY — Policy Decision
| Field | Value |
| --- | --- |
| Domain | Identity / Access |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W0.5 |
| Purpose | policy-as-code for route/API/command/evidence decisions |
| Next gates | deny-by-default, explainability, audit |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/policy-decision/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/policy-decision/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/policy-decision/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| POLICY_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| POLICY_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| POLICY_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| POLICY_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| POLICY_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| POLICY_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| POLICY_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | POLICY_CREATED, POLICY_STATE_CHANGED, POLICY_EVIDENCE_ATTACHED, POLICY_APPROVED, POLICY_CLOSED |
| evidence | POLICY_scope_contract, POLICY_fixture_coverage, POLICY_e2e_report, POLICY_audit_event, POLICY_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## WFDEF — Workflow Definition
| Field | Value |
| --- | --- |
| Domain | Workflow Spine |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W1 |
| Purpose | state machine definition for governed roots |
| Next gates | states, transitions, guards, owners, version |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/workflow-definition/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/workflow-definition/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/workflow-definition/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| WFDEF_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFDEF_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFDEF_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFDEF_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFDEF_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFDEF_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFDEF_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | WFDEF_CREATED, WFDEF_STATE_CHANGED, WFDEF_EVIDENCE_ATTACHED, WFDEF_APPROVED, WFDEF_CLOSED |
| evidence | WFDEF_scope_contract, WFDEF_fixture_coverage, WFDEF_e2e_report, WFDEF_audit_event, WFDEF_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## WFEVT — Workflow Event
| Field | Value |
| --- | --- |
| Domain | Workflow Spine |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W1 |
| Purpose | immutable workflow transition evidence |
| Next gates | actor, from/to state, guard evidence, correlation id |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/workflow-event/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/workflow-event/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/workflow-event/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| WFEVT_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFEVT_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFEVT_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFEVT_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFEVT_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFEVT_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WFEVT_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | WFEVT_CREATED, WFEVT_STATE_CHANGED, WFEVT_EVIDENCE_ATTACHED, WFEVT_APPROVED, WFEVT_CLOSED |
| evidence | WFEVT_scope_contract, WFEVT_fixture_coverage, WFEVT_e2e_report, WFEVT_audit_event, WFEVT_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## EVID — Evidence Object
| Field | Value |
| --- | --- |
| Domain | Evidence Spine |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W1 |
| Purpose | attached proof, observation, file, measurement or execution evidence |
| Next gates | hash, source, retention, chain of custody |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/evidence-object/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/evidence-object/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/evidence-object/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| EVID_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVID_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVID_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVID_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVID_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVID_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVID_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | EVID_CREATED, EVID_STATE_CHANGED, EVID_EVIDENCE_ATTACHED, EVID_APPROVED, EVID_CLOSED |
| evidence | EVID_scope_contract, EVID_fixture_coverage, EVID_e2e_report, EVID_audit_event, EVID_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## ESIGN — Electronic Signature
| Field | Value |
| --- | --- |
| Domain | Evidence / e-Sign |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W3/W9 |
| Purpose | signature meaning and identity-bound approval evidence |
| Next gates | meaning, signer, challenge, record snapshot, audit |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/electronic-signature/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/electronic-signature/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/electronic-signature/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| ESIGN_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ESIGN_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ESIGN_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ESIGN_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ESIGN_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ESIGN_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ESIGN_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | ESIGN_CREATED, ESIGN_STATE_CHANGED, ESIGN_EVIDENCE_ATTACHED, ESIGN_APPROVED, ESIGN_CLOSED |
| evidence | ESIGN_scope_contract, ESIGN_fixture_coverage, ESIGN_e2e_report, ESIGN_audit_event, ESIGN_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## AUDIT — Audit Trail Event
| Field | Value |
| --- | --- |
| Domain | Evidence / Compliance |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W1 |
| Purpose | immutable trace of authoritative changes |
| Next gates | before/after, actor, timestamp, reason, correlation |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/audit-trail-event/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/audit-trail-event/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/audit-trail-event/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| AUDIT_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDIT_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDIT_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDIT_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDIT_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDIT_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDIT_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | AUDIT_CREATED, AUDIT_STATE_CHANGED, AUDIT_EVIDENCE_ATTACHED, AUDIT_APPROVED, AUDIT_CLOSED |
| evidence | AUDIT_scope_contract, AUDIT_fixture_coverage, AUDIT_e2e_report, AUDIT_audit_event, AUDIT_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## EVENT — Domain Event
| Field | Value |
| --- | --- |
| Domain | Event / Notification |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W1 |
| Purpose | publishable fact derived from authority roots |
| Next gates | schema, version, idempotency, replay |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/domain-event/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/domain-event/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/domain-event/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| EVENT_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVENT_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVENT_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVENT_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVENT_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVENT_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EVENT_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | EVENT_CREATED, EVENT_STATE_CHANGED, EVENT_EVIDENCE_ATTACHED, EVENT_APPROVED, EVENT_CLOSED |
| evidence | EVENT_scope_contract, EVENT_fixture_coverage, EVENT_e2e_report, EVENT_audit_event, EVENT_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## NOTIF — Notification
| Field | Value |
| --- | --- |
| Domain | Event / Notification |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W1 |
| Purpose | human/system notification tied to domain event |
| Next gates | recipient policy, template, escalation, audit |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/notification/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/notification/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/notification/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| NOTIF_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NOTIF_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NOTIF_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NOTIF_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NOTIF_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NOTIF_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| NOTIF_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | NOTIF_CREATED, NOTIF_STATE_CHANGED, NOTIF_EVIDENCE_ATTACHED, NOTIF_APPROVED, NOTIF_CLOSED |
| evidence | NOTIF_scope_contract, NOTIF_fixture_coverage, NOTIF_e2e_report, NOTIF_audit_event, NOTIF_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## APICON — API Contract
| Field | Value |
| --- | --- |
| Domain | Integration / Resilience |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W1 |
| Purpose | OpenAPI, schemas and compatibility authority |
| Next gates | contract diff, examples, problem details |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/api-contract/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/api-contract/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/api-contract/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| APICON_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APICON_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APICON_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APICON_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APICON_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APICON_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APICON_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | APICON_CREATED, APICON_STATE_CHANGED, APICON_EVIDENCE_ATTACHED, APICON_APPROVED, APICON_CLOSED |
| evidence | APICON_scope_contract, APICON_fixture_coverage, APICON_e2e_report, APICON_audit_event, APICON_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## DATACON — Data Contract
| Field | Value |
| --- | --- |
| Domain | Data Platform |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W4/W8 |
| Purpose | CDC/schema/data product contract |
| Next gates | schema version, lineage, DQ checks, owner |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/data-contract/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/data-contract/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/data-contract/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| DATACON_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DATACON_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DATACON_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DATACON_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DATACON_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DATACON_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DATACON_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | DATACON_CREATED, DATACON_STATE_CHANGED, DATACON_EVIDENCE_ATTACHED, DATACON_APPROVED, DATACON_CLOSED |
| evidence | DATACON_scope_contract, DATACON_fixture_coverage, DATACON_e2e_report, DATACON_audit_event, DATACON_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## OTGNODE — Operational Truth Graph Node
| Field | Value |
| --- | --- |
| Domain | Digital Thread |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W7 |
| Purpose | semantic object in operational truth graph |
| Next gates | node type, source authority, identity, validity |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/operational-truth-graph-node/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/operational-truth-graph-node/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/operational-truth-graph-node/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| OTGNODE_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGNODE_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGNODE_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGNODE_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGNODE_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGNODE_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGNODE_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | OTGNODE_CREATED, OTGNODE_STATE_CHANGED, OTGNODE_EVIDENCE_ATTACHED, OTGNODE_APPROVED, OTGNODE_CLOSED |
| evidence | OTGNODE_scope_contract, OTGNODE_fixture_coverage, OTGNODE_e2e_report, OTGNODE_audit_event, OTGNODE_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## OTGEDGE — Operational Truth Graph Edge
| Field | Value |
| --- | --- |
| Domain | Digital Thread |
| Authority class | platform root |
| Current maturity | 1 |
| Target wave | W7 |
| Purpose | typed relationship/action/evidence link between roots |
| Next gates | edge type, causality, timestamp, actor/source |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/operational-truth-graph-edge/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/operational-truth-graph-edge/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/operational-truth-graph-edge/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| OTGEDGE_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGEDGE_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGEDGE_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGEDGE_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGEDGE_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGEDGE_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OTGEDGE_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | OTGEDGE_CREATED, OTGEDGE_STATE_CHANGED, OTGEDGE_EVIDENCE_ATTACHED, OTGEDGE_APPROVED, OTGEDGE_CLOSED |
| evidence | OTGEDGE_scope_contract, OTGEDGE_fixture_coverage, OTGEDGE_e2e_report, OTGEDGE_audit_event, OTGEDGE_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## WCENTER — Work Center
| Field | Value |
| --- | --- |
| Domain | MES / Planning |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W6 |
| Purpose | capacity and equipment grouping for scheduling/execution |
| Next gates | calendar, eligible equipment, labor skill, constraints |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/work-center/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/work-center/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/work-center/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| WCENTER_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WCENTER_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WCENTER_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WCENTER_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WCENTER_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WCENTER_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| WCENTER_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | WCENTER_CREATED, WCENTER_STATE_CHANGED, WCENTER_EVIDENCE_ATTACHED, WCENTER_APPROVED, WCENTER_CLOSED |
| evidence | WCENTER_scope_contract, WCENTER_fixture_coverage, WCENTER_e2e_report, WCENTER_audit_event, WCENTER_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## ROUTE — Routing
| Field | Value |
| --- | --- |
| Domain | Product Engineering / MES |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W6 |
| Purpose | sequence of operations and standard times |
| Next gates | revision/effectivity, work center, instruction linkage |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/routing/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/routing/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/routing/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| ROUTE_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROUTE_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROUTE_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROUTE_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROUTE_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROUTE_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| ROUTE_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | ROUTE_CREATED, ROUTE_STATE_CHANGED, ROUTE_EVIDENCE_ATTACHED, ROUTE_APPROVED, ROUTE_CLOSED |
| evidence | ROUTE_scope_contract, ROUTE_fixture_coverage, ROUTE_e2e_report, ROUTE_audit_event, ROUTE_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## OPER — Operation Execution
| Field | Value |
| --- | --- |
| Domain | MES |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W6 |
| Purpose | step-level execution evidence and status |
| Next gates | start/stop, operator, equipment, parameter capture, exceptions |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/operation-execution/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/operation-execution/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/operation-execution/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| OPER_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OPER_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OPER_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OPER_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OPER_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OPER_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OPER_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | OPER_CREATED, OPER_STATE_CHANGED, OPER_EVIDENCE_ATTACHED, OPER_APPROVED, OPER_CLOSED |
| evidence | OPER_scope_contract, OPER_fixture_coverage, OPER_e2e_report, OPER_audit_event, OPER_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## TOOL — Tooling
| Field | Value |
| --- | --- |
| Domain | MES / Maintenance |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W6 |
| Purpose | tool status, calibration, usage and eligibility |
| Next gates | tool status, PM/calibration, assignment, lifecycle |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/tooling/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/tooling/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/tooling/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| TOOL_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TOOL_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TOOL_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TOOL_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TOOL_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TOOL_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| TOOL_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | TOOL_CREATED, TOOL_STATE_CHANGED, TOOL_EVIDENCE_ATTACHED, TOOL_APPROVED, TOOL_CLOSED |
| evidence | TOOL_scope_contract, TOOL_fixture_coverage, TOOL_e2e_report, TOOL_audit_event, TOOL_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CNC — Machine Program
| Field | Value |
| --- | --- |
| Domain | MES / OT |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W6 |
| Purpose | controlled machine program/version reference |
| Next gates | revision, checksum, machine eligibility, release approval |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/machine-program/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/machine-program/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/machine-program/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CNC_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CNC_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CNC_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CNC_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CNC_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CNC_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CNC_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CNC_CREATED, CNC_STATE_CHANGED, CNC_EVIDENCE_ATTACHED, CNC_APPROVED, CNC_CLOSED |
| evidence | CNC_scope_contract, CNC_fixture_coverage, CNC_e2e_report, CNC_audit_event, CNC_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## DOWNTIME — Downtime Event
| Field | Value |
| --- | --- |
| Domain | MES / OEE |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W6 |
| Purpose | loss event for OEE, maintenance and continuous improvement |
| Next gates | reason taxonomy, machine, start/end, approval |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/downtime-event/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/downtime-event/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/downtime-event/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| DOWNTIME_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DOWNTIME_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DOWNTIME_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DOWNTIME_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DOWNTIME_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DOWNTIME_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| DOWNTIME_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | DOWNTIME_CREATED, DOWNTIME_STATE_CHANGED, DOWNTIME_EVIDENCE_ATTACHED, DOWNTIME_APPROVED, DOWNTIME_CLOSED |
| evidence | DOWNTIME_scope_contract, DOWNTIME_fixture_coverage, DOWNTIME_e2e_report, DOWNTIME_audit_event, DOWNTIME_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## OEEVT — OEE Event
| Field | Value |
| --- | --- |
| Domain | Analytics / MES |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W8 |
| Purpose | availability, performance and quality event stream |
| Next gates | calculation contract, source mapping, traceability |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/oee-event/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/oee-event/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/oee-event/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| OEEVT_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OEEVT_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OEEVT_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OEEVT_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OEEVT_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OEEVT_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| OEEVT_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | OEEVT_CREATED, OEEVT_STATE_CHANGED, OEEVT_EVIDENCE_ATTACHED, OEEVT_APPROVED, OEEVT_CLOSED |
| evidence | OEEVT_scope_contract, OEEVT_fixture_coverage, OEEVT_e2e_report, OEEVT_audit_event, OEEVT_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## SPC — SPC Study / Control Chart
| Field | Value |
| --- | --- |
| Domain | Quality Engineering |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W8 |
| Purpose | statistical process control over measured characteristics |
| Next gates | rational subgroup, control limits, reaction plan, alarm event |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/spc-study-control-chart/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/spc-study-control-chart/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/spc-study-control-chart/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| SPC_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SPC_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SPC_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SPC_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SPC_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SPC_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SPC_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | SPC_CREATED, SPC_STATE_CHANGED, SPC_EVIDENCE_ATTACHED, SPC_APPROVED, SPC_CLOSED |
| evidence | SPC_scope_contract, SPC_fixture_coverage, SPC_e2e_report, SPC_audit_event, SPC_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CAL — Calibration Event
| Field | Value |
| --- | --- |
| Domain | Metrology |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W6 |
| Purpose | calibration history and device eligibility |
| Next gates | standard traceability, interval, result, due status |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/calibration-event/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/calibration-event/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/calibration-event/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CAL_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAL_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAL_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAL_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAL_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAL_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CAL_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CAL_CREATED, CAL_STATE_CHANGED, CAL_EVIDENCE_ATTACHED, CAL_APPROVED, CAL_CLOSED |
| evidence | CAL_scope_contract, CAL_fixture_coverage, CAL_e2e_report, CAL_audit_event, CAL_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## MSA — Measurement System Analysis
| Field | Value |
| --- | --- |
| Domain | Metrology / Quality |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W8 |
| Purpose | prove measurement system fitness |
| Next gates | gage R&R, bias/linearity/stability, acceptance |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/measurement-system-analysis/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/measurement-system-analysis/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/measurement-system-analysis/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| MSA_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MSA_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MSA_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MSA_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MSA_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MSA_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MSA_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | MSA_CREATED, MSA_STATE_CHANGED, MSA_EVIDENCE_ATTACHED, MSA_APPROVED, MSA_CLOSED |
| evidence | MSA_scope_contract, MSA_fixture_coverage, MSA_e2e_report, MSA_audit_event, MSA_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## FMEA — FMEA
| Field | Value |
| --- | --- |
| Domain | Quality Engineering |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | risk analysis linked to control plan and process change |
| Next gates | severity/occurrence/detection, action linkage, review |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/fmea/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/fmea/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/fmea/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| FMEA_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FMEA_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FMEA_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FMEA_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FMEA_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FMEA_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FMEA_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | FMEA_CREATED, FMEA_STATE_CHANGED, FMEA_EVIDENCE_ATTACHED, FMEA_APPROVED, FMEA_CLOSED |
| evidence | FMEA_scope_contract, FMEA_fixture_coverage, FMEA_e2e_report, FMEA_audit_event, FMEA_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CTRLPLAN — Control Plan
| Field | Value |
| --- | --- |
| Domain | Quality Engineering |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | inspection/control requirements derived from risk and design |
| Next gates | characteristics, frequency, method, reaction plan |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/control-plan/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/control-plan/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/control-plan/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CTRLPLAN_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CTRLPLAN_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CTRLPLAN_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CTRLPLAN_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CTRLPLAN_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CTRLPLAN_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CTRLPLAN_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CTRLPLAN_CREATED, CTRLPLAN_STATE_CHANGED, CTRLPLAN_EVIDENCE_ATTACHED, CTRLPLAN_APPROVED, CTRLPLAN_CLOSED |
| evidence | CTRLPLAN_scope_contract, CTRLPLAN_fixture_coverage, CTRLPLAN_e2e_report, CTRLPLAN_audit_event, CTRLPLAN_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## SCAR — Supplier Corrective Action
| Field | Value |
| --- | --- |
| Domain | Supplier Quality |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | supplier quality escape correction and effectiveness |
| Next gates | supplier scope, containment, corrective action, verification |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/supplier-corrective-action/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/supplier-corrective-action/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/supplier-corrective-action/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| SCAR_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SCAR_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SCAR_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SCAR_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SCAR_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SCAR_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SCAR_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | SCAR_CREATED, SCAR_STATE_CHANGED, SCAR_EVIDENCE_ATTACHED, SCAR_APPROVED, SCAR_CLOSED |
| evidence | SCAR_scope_contract, SCAR_fixture_coverage, SCAR_e2e_report, SCAR_audit_event, SCAR_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## MRB — Material Review Board
| Field | Value |
| --- | --- |
| Domain | Quality / Inventory |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W7 |
| Purpose | cross-functional disposition of nonconforming material |
| Next gates | quarantine, disposition, approvers, inventory transaction |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/material-review-board/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/material-review-board/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/material-review-board/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| MRB_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MRB_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MRB_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MRB_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MRB_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MRB_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MRB_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | MRB_CREATED, MRB_STATE_CHANGED, MRB_EVIDENCE_ATTACHED, MRB_APPROVED, MRB_CLOSED |
| evidence | MRB_scope_contract, MRB_fixture_coverage, MRB_e2e_report, MRB_audit_event, MRB_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## AUDPLAN — Audit Plan
| Field | Value |
| --- | --- |
| Domain | eQMS |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W9 |
| Purpose | internal/supplier/customer audit schedule and scope |
| Next gates | risk-based schedule, checklist, finding linkage |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/audit-plan/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/audit-plan/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/audit-plan/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| AUDPLAN_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDPLAN_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDPLAN_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDPLAN_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDPLAN_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDPLAN_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| AUDPLAN_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | AUDPLAN_CREATED, AUDPLAN_STATE_CHANGED, AUDPLAN_EVIDENCE_ATTACHED, AUDPLAN_APPROVED, AUDPLAN_CLOSED |
| evidence | AUDPLAN_scope_contract, AUDPLAN_fixture_coverage, AUDPLAN_e2e_report, AUDPLAN_audit_event, AUDPLAN_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## FINDING — Audit Finding
| Field | Value |
| --- | --- |
| Domain | eQMS |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W9 |
| Purpose | audit observation, severity and corrective path |
| Next gates | classification, due date, CAPA/SCAR linkage |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/audit-finding/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/audit-finding/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/audit-finding/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| FINDING_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FINDING_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FINDING_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FINDING_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FINDING_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FINDING_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FINDING_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | FINDING_CREATED, FINDING_STATE_CHANGED, FINDING_EVIDENCE_ATTACHED, FINDING_APPROVED, FINDING_CLOSED |
| evidence | FINDING_scope_contract, FINDING_fixture_coverage, FINDING_e2e_report, FINDING_audit_event, FINDING_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## RISK — Operational Risk
| Field | Value |
| --- | --- |
| Domain | eQMS / AI / Security |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W9 |
| Purpose | formal risk object across product/process/system/AI/security |
| Next gates | risk owner, score, control, residual risk, review |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/operational-risk/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/operational-risk/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/operational-risk/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| RISK_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| RISK_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| RISK_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| RISK_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| RISK_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| RISK_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| RISK_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | RISK_CREATED, RISK_STATE_CHANGED, RISK_EVIDENCE_ATTACHED, RISK_APPROVED, RISK_CLOSED |
| evidence | RISK_scope_contract, RISK_fixture_coverage, RISK_e2e_report, RISK_audit_event, RISK_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## COMPLAINT — Customer Complaint
| Field | Value |
| --- | --- |
| Domain | Quality / Customer |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | post-market or customer quality issue root |
| Next gates | intake, investigation, regulatory assessment, CAPA link |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/customer-complaint/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/customer-complaint/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/customer-complaint/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| COMPLAINT_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COMPLAINT_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COMPLAINT_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COMPLAINT_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COMPLAINT_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COMPLAINT_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COMPLAINT_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | COMPLAINT_CREATED, COMPLAINT_STATE_CHANGED, COMPLAINT_EVIDENCE_ATTACHED, COMPLAINT_APPROVED, COMPLAINT_CLOSED |
| evidence | COMPLAINT_scope_contract, COMPLAINT_fixture_coverage, COMPLAINT_e2e_report, COMPLAINT_audit_event, COMPLAINT_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## INVTXN — Inventory Transaction
| Field | Value |
| --- | --- |
| Domain | Inventory / Warehouse |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W5 |
| Purpose | stock movement ledger and quantity/status authority |
| Next gates | lot/status, source doc, posting rules, reconciliation |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/inventory-transaction/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/inventory-transaction/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/inventory-transaction/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| INVTXN_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVTXN_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVTXN_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVTXN_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVTXN_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVTXN_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVTXN_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | INVTXN_CREATED, INVTXN_STATE_CHANGED, INVTXN_EVIDENCE_ATTACHED, INVTXN_APPROVED, INVTXN_CLOSED |
| evidence | INVTXN_scope_contract, INVTXN_fixture_coverage, INVTXN_e2e_report, INVTXN_audit_event, INVTXN_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## SHIP — Shipment
| Field | Value |
| --- | --- |
| Domain | Fulfillment |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W5 |
| Purpose | shipping execution and customer delivery evidence |
| Next gates | release status, pick/pack, carrier, export/serialization |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/shipment/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/shipment/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/shipment/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| SHIP_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SHIP_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SHIP_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SHIP_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SHIP_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SHIP_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SHIP_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | SHIP_CREATED, SHIP_STATE_CHANGED, SHIP_EVIDENCE_ATTACHED, SHIP_APPROVED, SHIP_CLOSED |
| evidence | SHIP_scope_contract, SHIP_fixture_coverage, SHIP_e2e_report, SHIP_audit_event, SHIP_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## INVOICE — Invoice
| Field | Value |
| --- | --- |
| Domain | Finance / Commercial |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W5 |
| Purpose | commercial billing evidence linked to shipment/order |
| Next gates | SO/ship match, tax, approval, GL posting |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/invoice/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/invoice/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/invoice/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| INVOICE_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVOICE_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVOICE_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVOICE_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVOICE_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVOICE_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| INVOICE_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | INVOICE_CREATED, INVOICE_STATE_CHANGED, INVOICE_EVIDENCE_ATTACHED, INVOICE_APPROVED, INVOICE_CLOSED |
| evidence | INVOICE_scope_contract, INVOICE_fixture_coverage, INVOICE_e2e_report, INVOICE_audit_event, INVOICE_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## COST — Cost / Variance
| Field | Value |
| --- | --- |
| Domain | Finance / Cost |
| Authority class | authoritative root |
| Current maturity | 0 |
| Target wave | W8 |
| Purpose | standard/actual/WIP cost and variance analysis |
| Next gates | cost rollup, transaction inputs, approval, finance reconciliation |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/cost-variance/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/cost-variance/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/cost-variance/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| COST_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COST_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COST_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COST_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COST_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COST_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| COST_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | COST_CREATED, COST_STATE_CHANGED, COST_EVIDENCE_ATTACHED, COST_APPROVED, COST_CLOSED |
| evidence | COST_scope_contract, COST_fixture_coverage, COST_e2e_report, COST_audit_event, COST_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## MREC — Master Record / Master Batch Record
| Field | Value |
| --- | --- |
| Domain | Pharma Vertical |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | regulated master production/batch record template |
| Next gates | recipe, instructions, checks, approvals, effective date |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/master-record-master-batch-record/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/master-record-master-batch-record/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/master-record-master-batch-record/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| MREC_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MREC_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MREC_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MREC_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MREC_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MREC_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| MREC_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | MREC_CREATED, MREC_STATE_CHANGED, MREC_EVIDENCE_ATTACHED, MREC_APPROVED, MREC_CLOSED |
| evidence | MREC_scope_contract, MREC_fixture_coverage, MREC_e2e_report, MREC_audit_event, MREC_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CREC — Completed Record / eBR-eDHR
| Field | Value |
| --- | --- |
| Domain | Pharma / Med Device Vertical |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | executed manufacturing record for release review |
| Next gates | step evidence, exception review, signature, release packet |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/completed-record-ebr-edhr/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/completed-record-ebr-edhr/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/completed-record-ebr-edhr/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CREC_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CREC_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CREC_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CREC_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CREC_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CREC_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CREC_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CREC_CREATED, CREC_STATE_CHANGED, CREC_EVIDENCE_ATTACHED, CREC_APPROVED, CREC_CLOSED |
| evidence | CREC_scope_contract, CREC_fixture_coverage, CREC_e2e_report, CREC_audit_event, CREC_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## EBR — Electronic Batch Record
| Field | Value |
| --- | --- |
| Domain | Pharma Vertical |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | batch execution record governed by GMP controls |
| Next gates | recipe execution, deviations, calculations, review-by-exception |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/electronic-batch-record/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/electronic-batch-record/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/electronic-batch-record/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| EBR_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EBR_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EBR_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EBR_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EBR_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EBR_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EBR_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | EBR_CREATED, EBR_STATE_CHANGED, EBR_EVIDENCE_ATTACHED, EBR_APPROVED, EBR_CLOSED |
| evidence | EBR_scope_contract, EBR_fixture_coverage, EBR_e2e_report, EBR_audit_event, EBR_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## EDHR — Electronic Device History Record
| Field | Value |
| --- | --- |
| Domain | Medical Device Vertical |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | device history evidence from build to release |
| Next gates | serial/lot genealogy, inspections, signatures, DMR linkage |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/electronic-device-history-record/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/electronic-device-history-record/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/electronic-device-history-record/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| EDHR_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EDHR_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EDHR_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EDHR_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EDHR_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EDHR_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EDHR_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | EDHR_CREATED, EDHR_STATE_CHANGED, EDHR_EVIDENCE_ATTACHED, EDHR_APPROVED, EDHR_CLOSED |
| evidence | EDHR_scope_contract, EDHR_fixture_coverage, EDHR_e2e_report, EDHR_audit_event, EDHR_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## SERIAL — Serial Number
| Field | Value |
| --- | --- |
| Domain | Traceability / Aerospace / Med Device |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | unit-level identity and genealogy |
| Next gates | serialization policy, unique identity, configuration, service history |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/serial-number/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/serial-number/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/serial-number/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| SERIAL_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SERIAL_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SERIAL_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SERIAL_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SERIAL_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SERIAL_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| SERIAL_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | SERIAL_CREATED, SERIAL_STATE_CHANGED, SERIAL_EVIDENCE_ATTACHED, SERIAL_APPROVED, SERIAL_CLOSED |
| evidence | SERIAL_scope_contract, SERIAL_fixture_coverage, SERIAL_e2e_report, SERIAL_audit_event, SERIAL_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## APQP — APQP Program
| Field | Value |
| --- | --- |
| Domain | Automotive Vertical |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | advanced product quality planning program evidence |
| Next gates | phased gates, FMEA/control plan/PPAP linkage |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/apqp-program/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/apqp-program/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/apqp-program/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| APQP_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APQP_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APQP_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APQP_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APQP_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APQP_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| APQP_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | APQP_CREATED, APQP_STATE_CHANGED, APQP_EVIDENCE_ATTACHED, APQP_APPROVED, APQP_CLOSED |
| evidence | APQP_scope_contract, APQP_fixture_coverage, APQP_e2e_report, APQP_audit_event, APQP_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## PPAP — PPAP Package
| Field | Value |
| --- | --- |
| Domain | Automotive Vertical |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | production part approval package |
| Next gates | submission level, dimensional, material, capability evidence |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/ppap-package/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/ppap-package/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/ppap-package/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| PPAP_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PPAP_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PPAP_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PPAP_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PPAP_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PPAP_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| PPAP_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | PPAP_CREATED, PPAP_STATE_CHANGED, PPAP_EVIDENCE_ATTACHED, PPAP_APPROVED, PPAP_CLOSED |
| evidence | PPAP_scope_contract, PPAP_fixture_coverage, PPAP_e2e_report, PPAP_audit_event, PPAP_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## FAI — First Article Inspection
| Field | Value |
| --- | --- |
| Domain | Aerospace Vertical |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | first article verification package |
| Next gates | ballooned drawing, characteristic results, approvals |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/first-article-inspection/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/first-article-inspection/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/first-article-inspection/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| FAI_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FAI_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FAI_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FAI_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FAI_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FAI_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| FAI_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | FAI_CREATED, FAI_STATE_CHANGED, FAI_EVIDENCE_ATTACHED, FAI_APPROVED, FAI_CLOSED |
| evidence | FAI_scope_contract, FAI_fixture_coverage, FAI_e2e_report, FAI_audit_event, FAI_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## CONC — Concession / Deviation Permit
| Field | Value |
| --- | --- |
| Domain | Aerospace / Quality |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | authorized use-as-is/deviation from requirement |
| Next gates | customer/regulatory approval, expiration, affected lots |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/concession-deviation-permit/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/concession-deviation-permit/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/concession-deviation-permit/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| CONC_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CONC_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CONC_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CONC_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CONC_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CONC_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| CONC_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | CONC_CREATED, CONC_STATE_CHANGED, CONC_EVIDENCE_ATTACHED, CONC_APPROVED, CONC_CLOSED |
| evidence | CONC_scope_contract, CONC_fixture_coverage, CONC_e2e_report, CONC_audit_event, CONC_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.

## EXPORT — Export Control Record
| Field | Value |
| --- | --- |
| Domain | Compliance / Aerospace |
| Authority class | vertical root |
| Current maturity | 0 |
| Target wave | W10 |
| Purpose | export-controlled item/user/shipment compliance evidence |
| Next gates | jurisdiction/classification, denied party, license, audit |
### Authority and UI posture
- Authoritative record route, if applicable: `/ops/records/export-control-record/{record_id}?tab=overview`.
- Workspace route, if applicable: `/ops/{domain}/{module}/{workspace_family}` and must declare `data-authority-class="projection"`.
- Collection route, if applicable, must not invent record IDs and must route to canonical AR shell.
- Any button that changes state must call Command Bus; no inline mutation, no direct service write, no hidden workspace authority.
### API/API-like surfaces
- L2: fixture contract only, stored under test fixtures.
- L3: UI reads fixture and passes route/authority/E2E checks.
- L4: `GET /api/v1/export-control-record/{id}` opt-in live read-only with fallback and RFC 9457 errors.
- L5: `POST /api/v1/export-control-record/{id}/commands/{command}` only after workflow/evidence/audit/idempotency contract.
### Candidate commands
| Command candidate | Default posture | Mandatory guards |
| --- | --- | --- |
| EXPORT_CREATE_DRAFT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EXPORT_ATTACH_EVIDENCE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EXPORT_REQUEST_REVIEW | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EXPORT_APPROVE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EXPORT_REJECT | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EXPORT_CLOSE | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
| EXPORT_REOPEN | disabled until L5 | policy + workflow state + evidence + audit + idempotency |
### Candidate events and evidence
| Type | Examples |
| --- | --- |
| events | EXPORT_CREATED, EXPORT_STATE_CHANGED, EXPORT_EVIDENCE_ATTACHED, EXPORT_APPROVED, EXPORT_CLOSED |
| evidence | EXPORT_scope_contract, EXPORT_fixture_coverage, EXPORT_e2e_report, EXPORT_audit_event, EXPORT_rollback_runbook |
### Test ladder
| Level | Promotion test |
| --- | --- |
| L1 | scope contract exists; owner and authority class named |
| L2 | fixture JSON parses; screen contract and degraded/conflict states exist |
| L3 | Playwright route/authority/tab/action-disabled assertions pass; forbidden diff guard passes |
| L4 | OpenAPI schema, RFC9457 problems, opt-in live read-only, fixture fallback tested |
| L5 | command bus, workflow guard, idempotency, audit/evidence, negative auth tests pass |
| L6 | intended use, risk, URS/RTM/IQ/OQ/PQ and validation report complete if regulated |
| L7 | tenant/site onboarding, vertical pack and SRE/support model complete |
### Rollback and stop rules
- L2/L3 rollback: remove fixture route or disable HMV4 flag; verify portal inert defaults.
- L4 rollback: disable live API opt-in and force safe fixture fallback.
- L5 rollback: compensating command or explicit no-reversal rule plus audit.
- Stop if record ID is fabricated, if workspace mutates, if live API defaults on, if audit/evidence missing, or if E2E cannot reproduce.
