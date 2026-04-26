# D13 — Audit to Remediate

```
workflow_id:    D13
workflow_name:  Audit to Remediate
owner_role:     Quality Lead with Compliance Lead
participants:   All audited Domain Leads, Vertical Pack Lead,
                Security Lead (info-security audit), Privacy
                Lead (privacy audit)
state_machines: SM-12 Audit Finding (primary; BD-12 audit-close
                banned for AI); SM-6 (CAPA cascade)
```

D13 is the user-facing workflow that operationalizes H3 (audit
program) per audit cycle. It begins at audit planning, goes through
finding → response → CAPA → effectiveness → close, with the same
shape regardless of audit type.

---

## 1. Purpose and boundary

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Audit planning + scoping               H3 program-level governance
Audit execution                          standalone CAPA cycle (D6)
Finding capture                          recall (D12)
Auditee response                         vendor SLA breach (per
CAPA cascade (D6)                          contract law)
Effectiveness verification
Finding closure
Audit report
Audit pack export integration (per H3)
Inspector portal integration (per H3 §7)
```

---

## 2. Trigger catalog

```
INTERNAL QMS AUDIT                    annual minimum per ISO 9001 §9.2
INTERNAL PROCESS AUDIT                  per IATF VDA 6.3 cycle
INTERNAL PRODUCT AUDIT                  per IATF VDA 6.5 cycle
INTERNAL DATA INTEGRITY AUDIT            semiannual per H3 §1
INTERNAL SUPPLIER AUDIT                  per supplier risk
CUSTOMER AUDIT                            on-request; per DPA
NOTIFIED BODY AUDIT                       per cycle (MDR / IVDR /
                                       ISO 13485)
REGULATOR INSPECTION                       FDA / EMA / NHTSA / FAA
                                       (often unannounced; 4h SLA
                                       per H3 §4)
CERTIFICATION SURVEILLANCE                 ISO 27001 / IATF / ISO
                                       13485 / AS9100 cycle
NADCAP AUDIT                                Aero per cycle
SOC 2 AUDIT                                  AICPA TSC; observation
                                       window
PRIVACY AUDIT (DPO / external)               per GDPR / regulatory
PEN-TEST                                      per I7 §8 cadence
SUPPLIER VENDOR AUDIT                          customer-initiated audit
                                       of HESEM-the-vendor
SUB-PROCESSOR AUDIT                            per L2 §8 + I8 + DPA
INSPECTOR READINESS DRILL                       quarterly per H3 §8
```

---

## 3. State machine SM-12 Audit Finding

```
STATES                          EVENTS / GUARDS              EVIDENCE
audit_planned                   plan_filed                    EC-22
audit_executing                  daily_debrief                  EC-22
finding_drafted                  classify_severity              EC-13
                                (Critical / Major / Minor /
                                Observation / Best-Practice;
                                per H3 §3)
finding_communicated             auditee_response_window         EC-22 + EC-2
                                (typ 30 days)
auditee_responded                root_cause_analysis +           EC-13 + EC-22
                                action_plan
capa_opened (cascade SM-6)       per H8 lifecycle                 EC-14
capa_in_progress                  per H8                            EC-14
effectiveness_window              measured per class                EC-14 + EC-3
                                (per H3 §3 + H8 §6)
effectiveness_verified            auditor_review                    EC-22
finding_closed                     close_signoff (BD-12 banned       EC-2 + EC-22
                                for AI for regulated;
                                Quality Lead + Compliance
                                Lead joint regulated)
audit_closed                       report_signed_off                  EC-2 + EC-22

HARD COUPLINGS
  SM-12 → SM-6 (every Major+ finding opens CAPA)
  SM-12 → SM-7 (audit may revise SOP per H7)
  SM-12 → SM-9 (audit may revise PM cycle)
  SM-12 → SM-13 (audit updates risk register per H9)
  SM-12 → C13 (AI-14 audit-finding severity suggestion advisory)
SOFT COUPLINGS
  SM-12 → SM-11 (audit may trigger recall consideration)
  SM-12 ← H1 §6 horizon scan (regulatory update may trigger
                              audit cycle change)
```

---

## 4. Step substance

### Step 1 — Audit planning

```
SUBSTANCE                       per H3 §2 lifecycle P0..P2;
                                scope (process / system / product /
                                supplier / regulatory framework);
                                criteria; team; sample plan
                                (per H3 §6); calendar coordination
                                (per H3 §5)
EVIDENCE                        plan_record (EC-22)
DECISION POINTS                 P1.1 scope expansion vs targeted
                                P1.2 unannounced vs announced
                                (regulator-initiated)
                                P1.3 third-party vs internal
                                P1.4 multi-tenant scope
                                (vendor audit)
EDGE CASES                       audit calendar conflict
                                (auto-detect per H3 §5);
                                customer-required audit beyond
                                cycle; regulator unannounced
                                inspection
```

### Step 2 — Audit execution

```
SUBSTANCE                       per H3 §2 P3..P7; auditor uses
                                audit pack (per H3 §4) +
                                inspector portal (per H3 §7);
                                document review + process
                                observation + interviews +
                                sampling per plan; daily debrief
                                with auditee
EVIDENCE                        execution_record (EC-22); per
                                auditor query log (EC-22 +
                                access_audit)
DECISION POINTS                 P2.1 scope adjustment during
                                audit (rare; documented)
                                P2.2 fast-escalation if Critical
                                potential
                                P2.3 sampling expansion if
                                pattern observed
EDGE CASES                       inspector finds out-of-scope
                                evidence (per legal review);
                                interview-based finding (no
                                document evidence) — discipline
                                still applies; system unavailability
                                during audit
```

### Step 3 — Finding identification

```
SUBSTANCE                       finding documented:
                                  nature (major / minor /
                                  observation / best practice;
                                  per H3 §3)
                                  affected process / area
                                  evidence (citations, examples,
                                  records)
                                  standard reference (clause /
                                  section)
                                  per pack: per applicable standard
                                  cycle (e.g., AS9100D §8.7
                                  for Aero); per regulator-
                                  specific format (FDA Form 483;
                                  EMA inspection report)
EVIDENCE                        finding_record (EC-13)
DECISION POINTS                 P3.1 severity classification
                                (regulated: BD-equivalent if
                                downgrade attempted)
                                P3.2 cluster vs single-instance
                                P3.3 systemic vs localized
EDGE CASES                       borderline classification
                                (auditee disputes); customer-
                                inspector classification stricter
                                than regulator-equivalent;
                                pattern-discovery during audit
                                widens scope
```

### Step 4 — Auditee response

```
SUBSTANCE                       Auditee Manager responds within
                                agreed time (typ 30 days for
                                Major+):
                                  acknowledge (or formally
                                  contest)
                                  containment action (immediate;
                                  per H8 §4)
                                  root cause analysis (per H8
                                  §3 depth)
                                  corrective action plan
                                  effectiveness measure +
                                  window (per H8 §6)
EVIDENCE                        response_record (EC-13 + EC-2);
                                cascade per H8 (EC-14)
DECISION POINTS                 P4.1 contest vs accept
                                P4.2 scope of containment
                                P4.3 ROOT CAUSE methodology
                                (5 Whys / Ishikawa / 8D /
                                FTA / TapRooT / FMEA-driven)
                                P4.4 systemic propagation
                                consideration (per H8 §8)
EDGE CASES                       auditee disagrees with finding
                                (formal dispute path);
                                response window expired
                                (auditor escalates; severity
                                upgraded);
                                response inadequate (re-respond
                                cycle)
```

### Step 5 — CAPA cascade (per D6 + H8)

```
SUBSTANCE                       per finding ≥ Minor: CAPA opened
                                in D6; per H8 lifecycle;
                                per H8 §1 trigger taxonomy
EVIDENCE                        CAPA cross-link (EC-14)
EDGE CASES                       single audit produces multiple
                                CAPAs (per H8 §8 systemic
                                cluster detection); cross-domain
                                CAPA scope; cross-tenant CAPA
                                (rare; per L2 §8 sub-processor)
```

### Step 6 — CAPA execution + effectiveness

```
SUBSTANCE                       per H8 lifecycle (D6); auditor
                                may re-engage at effectiveness
                                window (especially regulator
                                follow-up inspection)
EVIDENCE                        per H8 (EC-14 effectiveness
                                window data + EC-3 indicators)
EDGE CASES                       effectiveness fails first cycle
                                (per H8 §6 reopen + escalate);
                                cross-cutting issue requires
                                multi-finding-CAPA (rare;
                                explicit cluster CAPA)
```

### Step 7 — Effectiveness verification by auditor

```
SUBSTANCE                       auditor (or follow-up auditor)
                                verifies:
                                  corrective action implemented
                                  effectiveness demonstrated
                                  no recurrence in window
                                  prevention measures in place
                                per pack: regulator follow-up
                                inspection (FDA Form 483 response
                                cycle) where applicable
EVIDENCE                        verification_record (EC-22 +
                                EC-2)
DECISION POINTS                 P7.1 re-audit scope
                                P7.2 close vs reopen
                                P7.3 systemic propagation per
                                H8 §8
EDGE CASES                       auditor unavailable for follow-up
                                (delegation per H3 RACI);
                                regulator post-inspection
                                escalation; customer auditor
                                requires extended verification
```

### Step 8 — Finding closure

```
SUBSTANCE                       finding transitions to closed;
                                regulated tenant: Quality Lead +
                                Compliance Lead joint signoff
                                (BD-12 banned for AI);
                                per pack additional signoffs
                                (Pharma QP; MD PRRC;
                                Aero DOA representative;
                                Auto per OEM CSR)
EVIDENCE                        closure_record (EC-2 multi-sig);
                                cross-link to CAPA closure
                                (EC-14)
EDGE CASES                       cannot close without
                                effectiveness verification;
                                attempt-to-close via AI
                                rejected per L1 §6;
                                cross-pack-share findings
                                requiring multiple pack signoffs
```

### Step 9 — Audit report

```
SUBSTANCE                       final audit report:
                                  scope + criteria
                                  findings summary
                                  corrective actions taken
                                  effectiveness verification
                                  recommendations
                                  audit closure attestation
                                signed by Quality Lead +
                                lead auditor;
                                customer-facing version (where
                                customer audit) per DPA;
                                regulator-facing version (where
                                inspection) per H1 §3 + format;
                                per pack archived per H5
                                perpetual
EVIDENCE                        audit_report (EC-22 + EC-2);
                                cascading EC-14 CAPA closure
                                links
EDGE CASES                       customer-audit report
                                confidentiality vs vendor-side
                                attestation (CVLP);
                                regulator-required format (FDA
                                483 response;
                                MDR/IVDR-NB report)
```

---

## 5. Branches

```
INTERNAL QMS                     §4 default
INTERNAL PROCESS / PRODUCT        per IATF VDA 6.3 / 6.5
INTERNAL DATA INTEGRITY            per H3 §1; semiannual
INTERNAL SUPPLIER                  per supplier risk
CUSTOMER AUDIT                     scope per DPA
NB AUDIT (MD)                       per cycle
REGULATOR INSPECTION                FDA / EMA / NHTSA / FAA
                                  unannounced; 4h SLA
NADCAP                              Aero per cycle
SOC 2 / ISO 27001 / 13485           per cert cycle
PRIVACY AUDIT                        per GDPR / DPO
PEN-TEST                              per I7 §8
SUPPLIER VENDOR AUDIT                  customer auditing HESEM
                                   vendor
SUB-PROCESSOR AUDIT                    per DPA
INSPECTOR READINESS DRILL              quarterly
SELF-ASSESSMENT                          monthly
```

---

## 6. Cross-domain footprint

```
QUALITY (C7)                      primary
ALL other domains                 as audited
COMPLIANCE LEAD                    regulator-driven
SECURITY (cross)                    info-security audit
PRIVACY (cross)                     privacy audit
INTEGRATION (C12)                   sub-processor audit
ANALYTICS / AI (C13)                AI-14 severity suggestion;
                                  AI-31 audit-pack drafting
                                  (advisory only)
CORE (C14)                          tenant boundary + audit chain
                                  preserved during audit access
```

---

## 7. Pack overlays

```
PHARMA (J1)                      pre-FDA / EMA inspection drill;
                                 483 response cycle; APR + PSUR
                                 audit; QP-led periodic; aseptic
                                 line surveillance; DSCSA partner
                                 audit
AUTO (J2)                        IATF 16949 surveillance cycle;
                                 customer (OEM) audit per CSR;
                                 LPA self-audit feeds audit
                                 pipeline; PPAP-related audits
AERO (J3)                        AS9100 surveillance + AS9120B;
                                 NADCAP cycle (special process);
                                 customer prime audit (Boeing
                                 / Lockheed / Airbus / Raytheon);
                                 ITAR / CMMC self-assessment
MD (J4)                          NB audit (MDR / IVDR / ISO
                                 13485); FDA QSR + post-QMSR
                                 (2026); MDSAP single audit;
                                 PMS / PSUR audit; clinical
                                 evaluation audit
FOOD (J5)                        FSMA Foreign Supplier Verification
                                 audit; GFSI audit (BRCGS / SQF /
                                 FSSC 22000 / IFS); HACCP
                                 surveillance; FSMA §204
                                 readiness audit
```

---

## 8. KPIs

```
- Audit findings per audit type
- Findings by severity distribution
- Findings recurrence rate
- CAPA cycle time post-finding
- Effectiveness pass rate
- Per-pack regulator finding rate (target downward)
- Audit pack export SLA adherence (per H3 SLO-15)
- Inspector readiness drill compliance (quarterly)
- Customer audit pass rate
- Per-tenant audit-event count (transparency in CVLP)
- Recurring findings (clusters; H8 systemic trigger)
- Cycle compliance per cert (IATF / ISO 13485 / AS9100 /
  NADCAP / SOC 2 / ISO 27001)
```

---

## 9. Failure modes + recovery

```
FM1   Finding contested
      Recovery: formal dispute resolution; per H3 §10 process;
              Compliance Lead arbiter

FM2   CAPA not effective at first cycle
      Recovery: per H8 §6 reopen; severity escalate;
              re-RC analysis

FM3   Repeat finding (cycle-over-cycle same)
      Recovery: per H8 §8 systemic CAPA;
              Compliance Lead intervention;
              senior management review

FM4   Audit closure missed (cycle deadline)
      Recovery: certification at risk;
              emergency assessment; H6 escalation per H3
              §11

FM5   Critical finding (regulator-equivalent)
      Recovery: per H1 §3 immediate response;
              certification pause possible;
              senior leadership + customer + regulator
              communication

FM6   AI auto-closes a regulated finding (BD-12 attempt)
      Recovery: per L1 §4 triple defense;
              SEV-1; H8 systemic CAPA on AI boundary

FM7   Severity downgraded under pressure
      Recovery: per L4 § decision integrity probe;
              independent review of severity matrix;
              per pack regulator escalation

FM8   Auditor query escapes tenant scope
      Recovery: BD-equivalent breach;
              SEV-1 per B6 C5;
              regulator notification per H1 §3;
              H8 systemic on auditor portal scoping

FM9   Effectiveness verification fudged
      Recovery: data integrity SEV;
              H8 systemic CAPA;
              audit chain anchor re-verification

FM10  Customer audit reveals previously-undisclosed sub-
      processor
      Recovery: DPA amendment; per H7 governance;
              tenant communication; H8 systemic

FM11  Multiple-tenant cross-cutting finding (vendor-side)
      Recovery: vendor-CAPA per H8 §9;
              cross-tenant communication per DPA window
```

---

## 10. Roles and authority (RACI)

```
ACTION              QA   AUDITOR  AUDITEE  COMP  SEC  PRIV  CSM  AI
Plan                 A   R        C        C     -    -     C    -
Execute              R   A        R        -     C    C     -    -
Finding capture      R   A        C        -     -    -     -    R(AI-14
                                                                  advisory)
Severity classify    A   A        -        A     -    -     -    -
                                            (BD-12)
Auditee response     -   -        A        C     -    -     -    -
CAPA cascade         R   -        R        C     -    -     -    -
Effectiveness       R   A         R        C     -    -     -    -
Close (regulated)    A   A        -        A     -    -     -    -
                                            (BD-12)
Report               A   R        C        A     -    -     R    R(AI-31
                                                                  advisory)
Customer comms       -   -        -        C     -    -     A    -
Regulator comms      -   -        -        A     -    -     -    -
```

---

## 11. Cross-references

- D6 (NC to CAPA) — CAPA cascade
- D12 (Complaint to Recall) — recall consideration from audit
- C7 (Quality) — primary
- E3 + E5 + E7 + E8 — APIs + auditor portal
- F4 + F5 + F6 — UI surfaces
- H1 §3 — regulator notification
- H3 — audit program (canonical)
- H4 — finding (EC-13) + audit_record
- H5 — perpetual retention
- H6 — periodic review consumes findings
- H7 — audit may trigger CR
- H8 — CAPA (canonical)
- L1 — BD-12 (audit close)
- L2 — AI-14 severity suggestion; AI-31 audit pack drafting
- M3 — root catalog (Audit Plan, Audit Run, Finding)
- M4 — SM-12

---

## 12. Decision phrase

```
D13_AUDIT_TO_REMEDIATE_BASELINE_LOCKED
NEXT: D14_VALIDATE_TO_QUALIFY.md
```
