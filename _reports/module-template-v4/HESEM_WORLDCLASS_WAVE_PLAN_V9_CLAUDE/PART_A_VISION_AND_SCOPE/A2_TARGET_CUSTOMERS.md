# A2 — Target Customers & Stakeholder Map

This chapter describes who HESEM is for. The plan is comprehensive only to
the degree that it serves the customers identified here. If the plan
includes a feature that does not serve any customer in this chapter, that
feature is out of scope.

---

## 1. Customer segmentation

HESEM serves three primary customer segments, each with distinct needs.

### Segment 1 — Mid-market discrete manufacturers

A "mid-market discrete manufacturer" produces physical goods (parts,
assemblies, finished products) with annual revenue between roughly $50
million and $5 billion. Examples: precision-machining suppliers, contract
electronics manufacturers, specialty plastics, metal fabrication, packaging
companies, contract food manufacturers.

These customers typically have:
- 100 to 5,000 employees
- 1 to 5 plants
- A fragmented IT stack (5 to 8 vendors)
- Annual IT spend on operations software of $500K to $5M
- Limited internal IT staff (often 5 to 30 people)
- Pressure from larger OEMs (in automotive: IATF 16949; in aerospace:
  AS9100; in medical: ISO 13485) to demonstrate quality discipline

For this segment, HESEM offers consolidation: replace the 5-8 vendors with
HESEM, reduce TCO by 30-50%, and provide unified evidence for OEM audits.

### Segment 2 — Enterprise regulated manufacturers

An "enterprise regulated manufacturer" produces in industries with formal
regulatory oversight: pharmaceuticals, medical devices, aerospace, food,
specialty chemicals. Annual revenue typically above $500 million, often
multinational.

These customers have:
- Formal validation programs (GAMP 5, ICH Q10, IATF 16949, AS9100)
- Multiple regulator relationships (FDA, EMA, PMDA, MFDS, MFDS, NB)
- Multi-site operations (often 10 to 100+ plants)
- Multi-region compliance (US, EU, JP, KR, regional variants)
- Existing major-vendor commitments (often SAP, Oracle, Veeva)
- Migration timelines of 3 to 7 years for any platform change
- Internal validation and IT teams of 100+ people

For this segment, HESEM offers depth: full vertical-pack compliance
(Pharma / Auto / Aero), customer-validation-leverage packs that reduce
their internal validation effort, multi-region deployment, and ITAR
compliance where applicable.

### Segment 3 — Growth-stage manufacturers (private-equity-owned, expanding)

A "growth-stage manufacturer" is one undergoing material expansion: adding
plants, adding products, entering new regulated markets, or being prepared
for sale or IPO. Revenue typically $100 million to $2 billion. Often owned
by a private-equity sponsor.

These customers have:
- Operational complexity outgrowing their starting stack
- 12-36 month investment horizons (PE firm exit pressure)
- Need for visibility and reporting beyond the current stack
- Willingness to consolidate when the consolidation pays back within 18
  months
- Tolerance for some disruption in service of consolidation gain

For this segment, HESEM offers speed: rapid implementation (4 to 8 months
vs the typical 18-36 months for full ERP+MES+QMS replacement), clear ROI
attribution, and dashboards that PE sponsors can use for due diligence.

---

## 2. Geographic priority

HESEM's geographic priority for the first three years:

```
Priority 1 (Year 1-2):    Vietnam (founder home market; pilot customers)
Priority 2 (Year 1-3):    Southeast Asia (Indonesia, Thailand, Malaysia,
                          Philippines, Singapore — manufacturing density)
Priority 3 (Year 2-3):    Japan, Korea (high standards, English-friendly
                          if Vietnamese vendor pursues)
Priority 4 (Year 2-4):    North America (largest TAM, mostly via partners)
Priority 5 (Year 3-5):    European Union (regulated demand, GDPR-driven
                          compliance pressure)
Priority 6 (Year 4+):     ANZ, India, Latin America (opportunistic)
```

This priority is not a contract; opportunistic deals outside this priority
are welcomed. But the platform's localization, regulatory pack readiness,
and customer-success staffing follow this priority.

---

## 3. Industry priority

HESEM's industry priority:

```
First commercial focus:        Discrete manufacturing (electronics, precision parts,
                              consumer durables) — broad applicability of W1-W7

Second commercial focus:       Pharmaceutical (Pharma vertical pack via W10) —
                              high-margin, regulated, validation-leverage matters

Third commercial focus:        Automotive Tier 1-2 (Auto vertical pack) —
                              IATF 16949 demand high in SEA

Fourth commercial focus:       Medical device (Med Device vertical pack) —
                              ISO 13485, EU MDR, FDA QSR

Fifth commercial focus:        Aerospace (Aero vertical pack) —
                              AS9100, NADCAP, FAA / EASA, ITAR (US-only for ITAR)

Sixth commercial focus:        Food and beverage (Food vertical pack) —
                              FSMA, HACCP, lower margin but volume
```

Each vertical pack is described in PART_J.

---

## 4. The personas (people who use or buy HESEM)

### Buyer personas (decide to acquire HESEM)

| Persona | Typical title | What they need from HESEM |
|---|---|---|
| The Operations VP | VP Operations / COO | Single platform reduces complexity; on-time delivery improves; cost of poor quality drops |
| The Quality Director | VP Quality / CQO | Closed-loop quality (NC → CAPA → CDOC → train); audit-pack on demand; supplier scorecard |
| The IT Director | VP IT / CIO | Vendor consolidation; integration burden reduced; modern stack; vendor neutrality |
| The CFO | CFO | TCO reduction (30-50%); CAC/LTV math works; cap-ex shifts to op-ex |
| The PE sponsor | Operating Partner / Senior Director | EBITDA improvement via cost-of-quality and operations efficiency; visibility for diligence |

### User personas (use HESEM daily)

| Persona | Typical title | What they do in HESEM |
|---|---|---|
| The Operator | Production Operator | Open work order; follow instruction; complete steps; report defects |
| The Lead Operator | Team Lead / Foreman | Dispatch jobs; resolve floor issues; sign off shifts |
| The Inspector | QC Inspector | Inspection sampling; AQL decisions; raise NCs |
| The QA Engineer | Quality Engineer | Investigate NCs; root-cause analysis; design CAPAs; verify effectiveness |
| The Document Controller | Document Control Specialist | Author, review, and release controlled documents |
| The Production Planner | Master Scheduler / MRP Lead | MPS, MRP, capacity planning, dispatch |
| The Maintenance Tech | Maintenance Technician | Execute MWOs; calibrate equipment; report equipment status |
| The Maintenance Planner | Maintenance Planner | Schedule PM; manage spare parts; analyze reliability |
| The Buyer | Procurement Specialist / Buyer | Issue POs; manage suppliers; chase deliveries |
| The Supplier Quality Engineer | SQE | Manage SCARs; qualify suppliers; PPAP submissions |
| The Document Approver | QA Manager / Director | Approve documents; sign e-signatures; manage release |
| The Auditor | Internal Auditor | Conduct audits; raise findings; verify CAPAs |
| The Operator-Trainer | Training Coordinator | Manage training courses; track competency; certify |
| The Plant Manager | Plant Manager | Monitor floor; resolve escalations; sign off shift handovers |
| The Quality Director | VP Quality | Oversee quality program; review trends; sign release |
| The Regulatory Lead | Regulatory Affairs | Submit to regulators; respond to inspections; manage submissions |
| The Validation Engineer | Validation Engineer / CSV | Author URS, IQ, OQ, PQ; manage validation lifecycle |

### Stakeholder personas (governance, oversight, audit)

| Persona | Typical title | Their stake in HESEM |
|---|---|---|
| The Customer Auditor | OEM Quality Auditor | Demands quality evidence and process discipline of supplier |
| The Regulator | FDA / EMA / IATF / NADCAP Inspector | Requires audit pack on inspection; expects 21 CFR Part 11 / Annex 11 / IATF 16949 / AS9100 compliance |
| The Notified Body | EU Med Device NB / EASA / FAA Reviewer | Reviews validation, conformity assessment, certification |
| The Insurance Carrier | Product Liability Carrier | Wants documented quality discipline before underwriting |
| The Investor / Board | Board Director | Wants operations transparency, EBITDA improvement, and risk reduction |

---

## 5. Customer journey from awareness to expansion

### Awareness

The customer becomes aware of HESEM through:
- Industry events (Pharma trade shows, IATF events, MES conferences, AME conferences)
- Content marketing (regulatory whitepapers, calculators, industry reports)
- Reference from existing customers
- Reference from partner consulting firms
- Search (when researching consolidation alternatives)

### Evaluation

The customer evaluates HESEM through:
- Discovery call with HESEM CSM and product
- Vendor demo with their own data (sandbox tenant)
- Customer reference calls (with explicit customer consent)
- Free assessment tools (e.g., "How ready is your QMS for IATF audit?")
- Proof-of-concept proposal

### Decision

The customer decides through:
- Statement of Work review and negotiation
- Validation scoping (regulated only)
- Tier and pricing finalization
- Vertical pack add-on selection
- Implementation timeline commitment

### Implementation (4-26 weeks depending on tier and vertical)

The customer implements through:
- Phase P1 Discovery (1-2 weeks)
- Phase P2 Validation Scoping (2-4 weeks; regulated only)
- Phase P3 Tenant Provisioning (1-2 weeks)
- Phase P4 Master Data Migration (2-6 weeks)
- Phase P5 Configuration (2-8 weeks)
- Phase P6 Pilot Operation (4-12 weeks)
- Phase P7 Pre-Production Cutover (2-4 weeks)
- Phase P8 Steady State (ongoing)

(See PART_I and the customer-onboarding chapter for full description.)

### Expansion

The customer expands through:
- Adding more users
- Adding more sites
- Adding more vertical packs
- Adding partner connectors
- Adding AI advisory features (post-W6.5)

### Renewal

Annually, the customer renews. Renewal includes:
- Quarterly Business Review (QBR) with the CSM
- Annual SLA review and customer health score
- Tier or feature change negotiation
- Multi-year commitment offers if applicable

---

## 6. Stakeholder map for HESEM internal team

The HESEM internal team has the following stakeholders, each with their
relationship to V9:

| Internal stakeholder | Their use of V9 |
|---|---|
| CTO | Architecture review (PART_B); wave plan (PART_G) |
| Product Lead | Vision (PART_A); capability catalog (PART_C); business model (PART_K) |
| Engineering Lead | Architecture (PART_B); capability (PART_C); workflow (PART_D); API (PART_E); frontend (PART_F); wave plan (PART_G) |
| QA Lead | Quality posture (PART_H); evidence taxonomy (PART_M) |
| Compliance Lead | Standards (PART_A4); regulatory (PART_H); vertical packs (PART_J) |
| Security Lead | Security threat model (PART_I7); cross-cutting concerns (PART_B6) |
| SRE Lead | Operations (PART_I); observability (PART_B9 or PART_I2); SLOs (PART_M4) |
| Data Platform Lead | Data flow (PART_B5); data products (PART_C13); CDC (PART_I) |
| AI Lead | AI discipline (PART_L) |
| CSM Lead | Customer onboarding (PART_I8); business (PART_K); customer journey (this chapter) |
| FinOps Lead | Cost governance (PART_I6); per-tenant cost (PART_K) |
| Vertical Pack Leads | One per pack (PART_J chapters) |
| Frontend Lead | Frontend catalog (PART_F); design system (PART_F10) |
| Backend Lead | API catalog (PART_E); workflow (PART_D); data model (PART_C, M) |
| Validation Engineer | Validation lifecycle (PART_H2); validation evidence (PART_H4) |

Each stakeholder is the named owner for the Parts they primarily care about.
Ownership does not mean exclusive editing rights — every contributor honors
the discipline in READING_DISCIPLINE — but it does mean primary
accountability and reviewer of that Part.

---

## 7. Decision phrase

```
A2_TARGET_CUSTOMERS_BASELINE_LOCKED
NEXT: A3_DOMAIN_SCOPE.md
```
