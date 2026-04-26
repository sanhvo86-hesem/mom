# H3 — Audit Program

```
chapter_purpose: how HESEM handles internal audits, customer audits,
                 regulator inspections, certification surveillance,
                 with the same evidence pipeline serving every audit
                 type so customers and HESEM itself are always
                 audit-ready
owner_role:      Quality Lead with Compliance Lead
sources:         ISO 19011:2018, IATF 16949 §9.2, ISO 13485 §8.2.4,
                 21 CFR 211.180(e), 21 CFR 820.22, AS9101F, GAMP 5,
                 EU GMP Chapter 9, FDA QSIT, EMA inspection
                 procedures, NADCAP audit handbook
```

The audit program is the operational expression of "trust but
verify." It is the recurring discipline that proves the system,
not just promises it. HESEM is built so the same evidence pipeline
that serves day-to-day operations also serves audits — there is no
separate "audit prep" team, no quarterly scramble, no shadow archive.

---

## 1. Audit type taxonomy

```
TYPE                            FREQ        EXAMPLES                                AUTHORITY
Internal QMS audit              annual      ISO 9001 §9.2, ISO 13485 §8.2.4         Quality Lead
Internal process audit          per cycle   IATF VDA 6.3 process audits             Quality Lead
Internal product audit          per cycle   IATF VDA 6.5 product audits             Quality Lead
Internal supplier audit         per risk    SQM-driven                              Procurement Lead
Internal data integrity audit   semiannual  21 CFR 11 + Annex 11                    Compliance Lead
Customer audit                  on request  OEM / Prime / Brand                     CSM + Quality Lead
Notified Body audit             cycle       MDR/IVDR, ISO 13485                     Compliance Lead
Regulator inspection            unannounced FDA 483 / Form 482, EMA, NHTSA, FAA     Compliance Lead
Certification surveillance      annual      IATF / ISO 27001 / ISO 13485 / AS9100   Quality Lead
NADCAP accreditation            biennial    aerospace special process               Vertical Pack Lead
SOC 2 Type II                   annual      AICPA TSC, observation window 6-12mo    Security Lead
Self-assessment                 monthly     internal readiness ping                 Quality Lead
Vendor audit (HESEM as vendor)  on request  customer auditing HESEM                 CSM + Quality Lead
Sub-processor audit             per risk    cloud / DPA-listed sub-processor        Privacy Lead
Penetration test                annual+     I7 cadence                              Security Lead
Tabletop exercise               quarterly   I3 game day                             SRE Lead
```

---

## 2. The common audit lifecycle (D13 instantiation)

Every audit type follows the same lifecycle (per D13 audit-to-remediate),
parameterized by the specific authority:

```
P0  Audit triggered             scheduled / on-request / regulator-initiated
P1  Auditor onboarded            access provisioning per I8 §1; least-privilege
P2  Audit plan filed             scope, criteria, sample plan
P3  Pre-audit document review    audit pack assembled + reviewed
P4  Opening meeting              scope confirmed, schedule, escalation path
P5  Audit execution              evidence sampling per plan
P6  Daily debriefs               findings logged in real time
P7  Closing meeting              findings consolidated and presented
P8  Findings classification      Critical / Major / Minor / Observation
P9  Auditee response window      formal response per finding (typ 30 days)
P10 CAPA registration            each Major+ becomes a CAPA per D6
P11 Effectiveness window          measured for ≥1 cycle
P12 Audit close                  audit report signed; evidence archived
P13 Surveillance / re-audit      per cycle; verifies effectiveness
```

Every step emits evidence per H4. Steps P1, P5, P9 require e-sig
per E7.

---

## 3. Finding classification (every audit type)

```
SEVERITY        DEFINITION                                ACTION                     SLO
Critical        regulated decision compromised; product   immediate stop-shipment;   close ≤30d
                impact plausible                          recall consideration
Major           system non-conformance; control gap;      CAPA opened immediately;   close ≤90d
                effectiveness suspect                     interim mitigation
Minor           localized non-conformance; no system      CAPA opened; track          close ≤180d
                impact                                    effectiveness
Observation     opportunity for improvement; no failure   review at next periodic    next cycle
                of conformance
Best Practice   noted positive finding                     captured for sharing       n/a
```

Severity classification is itself a regulated decision — a
single-actor reduction from Major → Minor requires Quality Lead +
Compliance Lead joint signoff (per L1; this is BD-7 banned for AI).

---

## 4. Audit pack export

When an auditor schedules, HESEM produces a signed audit pack within
SLO (24h default; 4h for unannounced regulator inspection). The pack
is per-tenant, per-scope, per-time-window and is itself an evidence
artifact (signed, anchored).

```
AUDIT PACK INVENTORY (per tenant + scope)

Quality system
  - QMS scope statement (current effective version)
  - Quality manual (current effective version)
  - Org chart with role / responsibility (RACI)
  - Process map with KPI ownership
  - Internal audit calendar (last 24mo + next 12mo)
  - Management review minutes (last 24mo)
  - Customer satisfaction summary (last 12mo)

Document and record control
  - Controlled document register (per H7)
  - Document change log per scope (last 24mo)
  - Record retention compliance attestation (per H5)
  - Record sample (auditor-selected) with audit trail

Validation evidence (per H2)
  - Validation Master Plan (current)
  - Validation index per regulated capability
  - IQ + OQ + PQ records for sampled capabilities
  - RTM extract for sampled URS
  - Validation summary reports for sampled releases

Change control (per H7)
  - Change registry for scope window
  - Selected change records (CR + impact + approval + closure)
  - Configuration baseline
  - Software / firmware version history

CAPA + complaint (per H8 + D12)
  - CAPA register for scope window
  - Selected CAPA records (problem statement → root cause →
    corrective + preventive actions → effectiveness)
  - Complaint trend + escalations
  - Recall log (where applicable)

Risk management (per H9)
  - Risk register (current)
  - Risk control verification sample
  - ICH Q9 / ISO 14971 file (where applicable)

Training (per D8)
  - Training matrix (current)
  - Training record sample
  - Competency assessment record sample

Calibration + maintenance (per C9 + D9)
  - Asset register
  - Calibration certificate sample
  - PM compliance summary

Inspection + product release (per D5 + D10)
  - Inspection plan + acceptance criteria
  - Recent NC + disposition records
  - Batch release records (Pharma) + signed certificate of analysis

Traceability (per D11)
  - Lot genealogy snapshot
  - Recall simulation evidence (where applicable; FDA expects)

Supplier management (per C4)
  - Supplier register + qualification status
  - Supplier audit / scorecard sample
  - Counterfeit prevention attestation (where applicable)

Information security (per I7)
  - ISO 27001 SoA (Statement of Applicability)
  - Risk treatment plan
  - Penetration test report (latest)
  - Vulnerability scan summary
  - Security incident log
  - Access review records

Cyber + product (where applicable)
  - SBOM (CycloneDX)
  - Coordinated Vulnerability Disclosure process (per FDA cyber)
  - SOUP / OTSS register (medical device per IEC 62304 §8)

Privacy (per I8 + GDPR)
  - ROPA (Records of Processing Activities)
  - DPIA where required
  - Sub-processor list with contracts
  - Breach log

AI (per L0..L5)
  - Model card per deployed AI feature
  - Red-team report sample
  - Override capture summary
  - AI governance ledger excerpt
  - Banned-decision violation log (expected: zero)

Per-vertical addendum
  - Pharma: APR (Annual Product Review) per product
  - MD: clinical evaluation report; PMS report; PSUR
  - Auto: PPAP per part number; layered process audit log
  - Aerospace: AS9102 FAI; NADCAP cert; counterfeit log; GIDEP records
  - Food: HACCP plan + verification record; FSMA traceability records

Trust + assurance
  - SOC 2 Type II report (post W12)
  - ISO 27001 cert (post W13)
  - SOC 1 if applicable
  - Bridge letter if SOC 2 has gap
```

The pack is delivered as a sealed archive: zip + manifest + signed
content hash. Auditors verify the hash against the audit_anchor table
to confirm tamper-free.

---

## 5. Calendar coordination

Multi-audit calendar maintained per tenant prevents audit-fatigue
(back-to-back audits with no preparation time). Coordination is
governed by:

```
- Minimum 14-day buffer between audits unless regulator-initiated
- Single audit-lead point of contact per tenant
- Auto-conflict alert when proposed audit overlaps another scope
- Quarterly preview to Compliance Lead 90 days ahead
- Resource reservation for QMS auditees during audit week
```

The calendar is itself an authoritative root and is published per
tenant (with role-based redaction).

---

## 6. Sampling plans

Auditors do not check everything; they sample. HESEM publishes its
sampling plans as part of the audit pack so auditors do not need to
"discover" them.

```
RECORD CLASS                    SAMPLE PLAN
Validation records              5% or 20 records (greater); covers all tiers
CAPA                            10% or 10 (greater); risk-weighted
Change records                  5% per impact tier
Training                        5% per role
Supplier qualification          high-risk supplier 100%; medium 20%; low 5%
Calibration                     critical instruments 100%; non-critical 20%
Lot release (Pharma)            10% or all batches with deviations
SaMD release (MD)               every regulated change
PPAP (Auto)                     every part number with revision
First Article (Aero)            every revision change
```

Sampling logic is reproducible: same inputs (scope window + criteria)
yield same sample. This is critical for re-audit traceability.

---

## 7. Real-time evidence access

Auditors get a read-only, scoped, time-bounded portal account during
the audit. Through this account they can:

- Browse the audit pack
- Drill into any sampled record
- Verify audit trail freshness against current time
- Pull additional evidence on request (live, not pre-staged)

Every auditor query is itself audited (per B6 audit chain). At audit
close, the auditor query log is appended to the audit record so the
auditor's path through the data is preserved.

---

## 8. Inspector readiness drills

Quarterly internal drill simulates a regulator inspection:

- Random scope picked by Compliance Lead
- Audit pack assembled cold against the SLO
- Findings disposition exercised
- CAPA workflow walked
- Effectiveness loop simulated

The drill produces an evidence artifact (per H4: drill subtype) and
identifies process gaps before a real inspector finds them.

---

## 9. Multi-tenant audit design

A customer audit of HESEM-the-vendor is different from a regulator
audit of HESEM-the-customer's-tenant. Both are supported:

```
SCOPE                          AUDITED ENTITY              EVIDENCE SCOPE
Vendor audit                   HESEM platform               platform-wide
                                                             (cross-tenant evidence
                                                             redacted)
Tenant audit                   one tenant's data + ops      single-tenant only
Sub-tenant scope               specific facility / line     filtered by tenant
                                                             attribute
Regulator vendor inspection    HESEM platform               vendor-level + sample
                                                             from tenants who
                                                             consented
Vertical pack inspection       per-pack evidence            scoped by tenant ×
                                                             pack
```

Cross-tenant data leakage during audit is the most severe failure
mode (BD-equivalent). Every audit access enforces tenant boundary
per B6 C5.

---

## 10. Findings register and trend

Findings register is a permanent record across audits. Trend analysis:

- Recurring finding patterns flagged and routed to H8 systemic CAPA
- Quarterly heatmap by clause / process / tenant / pack
- Annual management review consumes the trend per ISO 9001 §9.3

The pattern detector itself is an analytics view (per C13) and is
operated by AI advisory (Tier-2 per L2; advisory only, never
auto-classifies).

---

## 11. Failure modes and recovery

```
FM1   Audit pack assembly fails to meet SLO
      Recovery: pre-staged template + nightly delta build; SLO-burn
                page Compliance Lead

FM2   Sampled record missing audit trail (data integrity gap)
      Recovery: trigger I3 SEV-1 incident; H8 CAPA; halt new mutations
                in affected scope until verified

FM3   Auditor finds same finding 3rd time
      Recovery: systemic CAPA (per H8); root-cause review at management
                review

FM4   Customer auditor accesses cross-tenant data
      Recovery: BD-equivalent breach; immediate access revoke;
                I3 SEV-1; tenant notification

FM5   Surveillance audit timing missed
      Recovery: certification at risk; emergency assessment requested;
                Quality Lead + Compliance Lead direct CEO

FM6   CAPA effectiveness window expires without verification
      Recovery: finding re-opens; severity escalates one tier
```

---

## 12. Roles and authority (RACI)

```
Role                       Internal  Customer  Regulator  Cert Body  Pen Test
Quality Lead               A         A         R          A          C
Compliance Lead            R         R         A          R          R
Security Lead              C         C         C          C          A
Privacy Lead               C         C         C          C          C
Domain Lead (per scope)    R         R         R          R          C
Vertical Pack Lead         R (pack)  R (pack)  R (pack)   R (pack)   C
Engineering Lead           C         C         C          C          R
SRE Lead                   C         C         C          C          C
CSM (Customer Success)     -         R         I          -          -
Auditor                    I         R         R          R          R
```

---

## 13. Cross-references

- H1 §3 — regulator notification windows that audits trigger
- H2 — validation evidence audited here
- H4 — audit_record evidence class definition
- H5 — audit pack retention floor
- H6 — periodic review consumed in audit pack
- H7 — change control as audit input
- H8 — CAPA generated by findings
- D13 — workflow that operationalizes this chapter
- E8 — Evidence API used to assemble pack
- L4 — AI red-team report included in audit pack
- M9 — cross-reference index

---

## 14. Decision phrase

```
H3_AUDIT_PROGRAM_BASELINE_LOCKED
NEXT: H4_EVIDENCE_TAXONOMY.md
```
