# A6 — Out of Scope (what HESEM deliberately does NOT do)

This chapter is shorter than its predecessors but no less important. Many
software platforms fail not because they did the wrong thing but because
they did too many things. HESEM defines its boundary by saying explicitly
what it is not.

When a stakeholder asks "could HESEM do X for us?" and X is on this list,
the answer is "no, deliberately, because we want HESEM to do well the
things it does." HESEM is not a no-everything platform; HESEM is a
manufacturing-operations platform. The boundary is the focus.

---

## 1. Industries HESEM is not for

HESEM is for **manufacturers** — organizations that take physical inputs
and produce physical outputs through controlled processes. HESEM is not for:

- **Banking and financial services** (no manufacturing operations to govern)
- **Healthcare delivery** (hospitals, clinics — different regulatory frame)
- **Retail e-commerce** (no production; pure logistics)
- **Government / public administration** (different stakeholder model)
- **Pure software companies** (no physical production)
- **Pure services companies** (consulting, law, accounting)
- **Education** (different domain entirely)
- **Media / entertainment** (different production paradigm)
- **Real estate / construction** (project-based, not flow-based; could
  conceivably extend HESEM to construction in a far future, but explicitly
  not in V9 scope)

Within manufacturing, HESEM serves **discrete and process manufacturers**.
HESEM does not serve:

- **Continuous-process petrochemical refineries** at the deepest level
  (would require Distributed Control System integration HESEM does not
  prioritize; HESEM can integrate with refineries but not replace their
  DCS).
- **Mining and extraction** at the operations level (different domain).
- **Power generation** at the operations level (different domain).
- **Pure agriculture** (farming) at the operations level. (Food
  manufacturers post-harvest are in scope.)

---

## 2. Adjacent software systems HESEM does not replace

HESEM integrates with these systems via documented connectors but does
not replicate their depth:

### CAD and PLM systems

HESEM does not replace PTC Windchill, Siemens Teamcenter, Dassault
ENOVIA, or Arena PLM. HESEM integrates with these via Item Revision and
CAD Drawing Link records. The authoritative engineering specification
lives in PLM. HESEM owns the manufacturing application of the
specification.

### CRM (sales pipeline)

HESEM does not replace Salesforce, Microsoft Dynamics 365 CRM, HubSpot,
or any pipeline-management CRM. HESEM owns the operational customer
record (orders, complaints, shipments, invoices) but not the marketing
funnel, the sales pipeline, the contact database, or the marketing
automation.

### Primary financial system

HESEM does not replace SAP Finance, Oracle Financials, Microsoft
Dynamics GP, NetSuite Financials, QuickBooks, or any accounting
ledger. HESEM owns operational cost (cost of poor quality, variance,
inventory valuation) and integrates financial postings into the
customer's primary financial system via the GL Integration interface.

### Human Resources system

HESEM does not replace Workday, SAP SuccessFactors, BambooHR, ADP, or
any HR / HCM system. HESEM owns the User and Role records for
operational purposes (training, eligibility, audit) but not payroll,
benefits, recruiting, or performance management.

### Customer Support / Helpdesk

HESEM does not replace Zendesk, Freshdesk, ServiceNow ITSM, or
Salesforce Service Cloud. HESEM owns the operational complaint
(quality complaint, regulatory reportable, recall trigger) but not
the broader help-desk function (account questions, billing inquiries,
generic support).

### Direct CAD authoring

HESEM does not author CAD models. CAD authoring stays in SolidWorks,
CATIA, NX, Inventor, AutoCAD, or whichever tool the engineering team
uses. HESEM consumes the CAD output via the CAD Drawing Link record.

### Direct ERP modules HESEM does not replicate

HESEM does not replicate:
- Tax engine depth (HESEM does not calculate Vietnamese VAT,
  US sales tax, EU VAT, or any other jurisdiction tax engine; HESEM
  integrates with Avalara, Vertex, or the customer's ERP tax module).
- Multi-currency accounting depth (HESEM defers to the customer's
  primary financial system for currency translation and reporting).
- Multi-entity consolidation accounting (HESEM defers to the customer's
  primary financial system).
- Asset depreciation accounting (HESEM owns equipment as an
  operational record but not as a depreciable asset; that lives in
  the financial system).

---

## 3. Capabilities HESEM does not autonomously execute

Per V3 RULE-2 and PART_L, HESEM's AI never autonomously executes any of
the eight banned regulated decisions:

```
1. Release a lot for shipment
2. Approve a disposition of nonconforming material
3. Close a CAPA
4. Release a controlled document
5. Approve an Engineering Change Order
6. Certify a training record
7. Qualify a supplier
8. Decide a recall or field action
```

HESEM AI may:
- Recommend
- Rank candidates
- Score risk
- Cluster similar records
- Surface anomalies
- Draft text for human review
- Extract structured data from free text
- Search and retrieve

But the eight regulated decisions remain in human authority. This is not
a future capability HESEM might add; it is a permanent boundary.

---

## 4. Implementation patterns HESEM does not adopt

HESEM does not adopt:

- **Single-user-shared-credential design** (every action has a
  per-user identity; no shared accounts in production).
- **Hidden mutation in workspaces** (workspaces never mutate; only
  authoritative record shells and action consoles do).
- **Direct database access from frontend** (frontend talks only to API;
  API talks to database).
- **No-code / drag-and-drop workflow modification by end users**
  (workflow changes go through Engineering Change Order discipline).
- **Closed proprietary protocols** (HESEM uses OPC UA, MQTT Sparkplug,
  OpenAPI 3.1.1, etc. — open standards exclusively).
- **Tenant data shared across customers** (per-tenant isolation
  enforced by row-level security plus middleware).
- **Synchronous coupling between domains** (events flow
  asynchronously between domains via the Event Bus).
- **Configuration that bypasses workflow discipline** (configuration
  changes are themselves controlled by the same workflow system).

---

## 5. Vendor relationships HESEM does not build

HESEM does not seek to be:

- **A reseller of cloud infrastructure** (HESEM runs on AWS, Azure, GCP,
  or on-premise but does not resell those services).
- **A reseller of third-party software** (HESEM may include connector
  packs but does not resell SAP licenses, Salesforce licenses, etc.).
- **A primary integrator** (HESEM partners with system integrators for
  customer implementations but does not become one).
- **A regulatory consultancy** (HESEM produces validation evidence and
  provides Customer Validation Leverage Pack but does not author
  customer-side validation strategy).

---

## 6. Future capabilities deliberately deferred

These capabilities are valuable but explicitly deferred beyond V9 scope:

```
- Native CAD / PLM authoring (always integrated, never owned by HESEM)
- Native financial accounting general ledger (always integrated)
- Native HR / payroll (always integrated)
- Native marketing / sales pipeline CRM (always integrated)
- Native field service management (HESEM owns warranty / complaint;
  field service stays in dedicated FSM tool)
- Native logistics (TMS — Transport Management System) depth (HESEM
  owns shipment as evidence; TMS depth integrated)
- Native warehouse robotics control (HESEM owns warehouse task; robotics
  integration via OPC UA and partner connectors)
- Native demand forecasting at retail SKU level (HESEM owns operational
  demand planning; consumer-demand forecasting integrated from third-party)
- Blockchain-based audit anchor (RFC 3161 timestamping is sufficient;
  blockchain considered a customer-specific add-on per pack ADR if needed)
- Real-time digital twin physics simulation (HESEM owns operational digital
  thread; physics simulation integrates with Siemens / Ansys / Dassault)
```

These deferrals are not "never" — they are "not now, not in V9."

---

## 7. The discipline of "no"

The hardest part of building HESEM is saying "no" to good ideas that don't
fit the scope. Every "yes" to an out-of-scope feature dilutes the
in-scope features. Every "yes" to an adjacent domain extends the
attack surface, the validation surface, the integration surface, and
the support surface.

HESEM's strategic posture is **deep, not wide**: deep in the 14 domains,
deep in the 18 standards, deep in vertical packs, but tightly bounded to
manufacturing operations.

This discipline is the user's responsibility, the product lead's
responsibility, and every contributor's responsibility. When in doubt,
the answer is "no, that is out of scope; if it becomes important, we'll
add it via ratified ADR; for now we focus."

---

## 8. Decision phrase

```
A6_OUT_OF_SCOPE_BASELINE_LOCKED
PART_A_COMPLETE
NEXT: PART_B_ARCHITECTURE_MASTER/B0_PART_B_OVERVIEW.md
```
