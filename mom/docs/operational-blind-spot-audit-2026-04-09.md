# Operational Blind Spot Audit

Date: 2026-04-09

## Purpose

This audit answers a stricter question than schema or endpoint coverage:

- What can happen in real factory, warehouse, purchasing, quality, maintenance, EHS, and finance operations that the current backend still does not model tightly enough?
- Which of those blind spots can cause unsafe release, false inventory, duplicate documents, broken traceability, false-green dashboards, or audit failure?

The answer is now codified in:

- `mom/data/registry/operational-blind-spot-catalog.json`
- `mom/data/registry/operational-blind-spot-report.json`
- `mom/data/registry/wave0-governance-policy.json`

## Global operating logic used

The backend is evaluated against these operating realities:

- Lean systems must expose waste, delay, rework, and blocked flow, not hide them.
- MOM systems must treat execution gates as stateful control points, not UI hints.
- Quality, warehouse, production, finance, and maintenance must close the physical loop and the accounting loop together.
- Regulated records need authority checks, audit trails, operational checks, and exception evidence.

Reference basis:

- [NIST Lean and Process Improvement](https://www.nist.gov/mep/lean-and-process-improvement)
- [FDA Part 11 Scope and Application](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application)
- [Oracle Receiving](https://docs.oracle.com/cd/G49759_01/trans/G46465-01/using-receiving.pdf)
- [Dynamics 365 Quarantine Orders](https://learn.microsoft.com/en-us/dynamics365/supply-chain/inventory/quarantine-orders)
- [Dynamics 365 Asset Management Scheduling](https://learn.microsoft.com/en-us/dynamics365/supply-chain/asset-management/work-order-scheduling/schedule-work-orders)
- [OSHA Lockout/Tagout](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147)

## Highest-risk backend blind spots still exposed

### 1. Duplicate side effects are still not modeled tightly enough

Local evidence:

- `endpoint-catalog.json` currently advertises optimistic concurrency, but no idempotency markers are present on mutating contracts.

Operational risk:

- Retry storms can duplicate PO, SO, shipment, receipt, invoice, or inventory transactions.

### 2. Core enterprise objects still rely on weak lifecycle handling

Local evidence from `wave0-governance-report.json`:

- `generic_status_only_core_entities = 6`
- Affected core objects include `customers`, `vendors`, `hcm_employees`, `tms_shipments`, `ap_ar_invoices`, `fin_fixed_assets`

Operational risk:

- Critical status changes can occur without first-class guarded transitions.

### 3. Several core control points still have no explicit transition contract

Local evidence:

- `missing_transition_contracts_for_core_entities = 5`
- Missing contract examples: `crm_customer_touchpoints`, `ehs_incidents`, `inventory_transactions`, `qual_compliance_obligations`, `oqc_inspections`

Operational risk:

- Exception closure is not deterministic at customer care, EHS, inventory, compliance, and outgoing quality gates.

### 4. Real-world exception chains are still not first-class objects

Local evidence:

- `missing_canonical_resources = 24`
- Important gaps include `purchase-requisitions`, `supplier-asns`, `purchase-receipts`, `ipqc-inspections`, `fqc-inspections`, `inventory-items`, `stock-balances`, `customer-returns`, `work-orders`

Operational risk:

- The backend cannot yet govern full correction and closure loops across procure-to-pay, in-process quality, final release, and returns.

### 5. Blueprint-level exception concepts were not first-class enough

Local evidence from the canonical backend catalog:

- `deviation`, `concession`, `override`, `receipt_correction`, `credit_memo`, and `period_close` were not yet represented as explicit canonical design concepts before this audit.

Operational risk:

- The design can look complete while still failing real exception handling.

## What has now been tightened

- Wave 0 policy now requires exception coverage, override governance, and recovery model definitions.
- Real-world operational scenarios are now published as registry assets and must be verified during publication.
- Publication tooling now uses canonical registry path resolution on the critical path.
- Verification now checks both governance and operational blind-spot assets, not only endpoint/schema artifacts.

## What must enter the next remediation wave

### P1

- Add idempotency semantics for create and side-effect actions.
- Upgrade the 6 core `generic_status_only` entities to strong lifecycle contracts.
- Add missing transition contracts for the 5 core blind spots.
- Introduce first-class models for `purchase_requisitions`, `supplier_asns`, `purchase_receipts`, `ipqc_inspections`, `fqc_inspections`, `customer_returns`.

### P2

- Extend the canonical model to explicitly include `deviation`, `concession`, `override`, `receipt_correction`, `credit_memo`, and `period_close`.
- Add rule-based quarantine release, reverse transactions, offline replay handling, and job-heartbeat monitoring.

## Governing rule going forward

No new backend element should be accepted unless it answers all of these:

- Why does it exist operationally?
- Which KPI and gate does it control?
- What real-world exception can hit it?
- How is duplicate, delayed, partial, corrected, reversed, or overridden behavior handled?
- What audit evidence is generated automatically?
- If it is unused, why is it not quarantined or archived?
