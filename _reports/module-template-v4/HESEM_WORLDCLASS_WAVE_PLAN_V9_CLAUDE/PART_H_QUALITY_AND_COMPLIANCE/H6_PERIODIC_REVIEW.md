# H6 — Periodic Review

```
chapter_purpose: scheduled review obligations that prove the system
                 stays in a validated state over time, with explicit
                 cadence, inputs, outputs, escalation paths
owner_role:      Quality Lead with Compliance Lead
sources:         EU GMP Annex 11 §11, ICH Q10 §3.2.4 management review,
                 ISO 9001 §9.3, IATF 16949 §9.3, ISO 13485 §5.6,
                 21 CFR 211.180(e) annual review of records,
                 SOC 2 access review TSC CC6.3
```

Periodic review is the disciplined re-look at things that don't
change in everyday work but accumulate drift: roles, accesses,
validation freshness, risk register, document effectivity, supplier
qualification, model performance. Without it, "validated" silently
becomes "stale-validated" and audits surface gaps that were latent
for months.

---

## 1. Review type catalog

```
TYPE                          CADENCE     SCOPE                            OWNER
Computerised system review    semiannual  per Annex 11 §11; per HESEM      Quality Lead
                              minimum     capability + tenant
Management review (QMS)        annual      ISO 9001 / IATF / ISO 13485      Quality Lead
                              minimum     §9.3 / §5.6
Validation freshness review    quarterly   per H2 §13 freshness floors       Validation Eng
Access review (privileged)     quarterly   per I8; SOC 2 CC6.3                Security Lead
Access review (standard)       semiannual  per tenant; per role              Security Lead
Risk register review           quarterly   per H9 + per ICH Q9               Quality Lead
Doc effectivity review          annual      every controlled doc; H7 input    Compliance Lead
Supplier qualification review  annual      every active supplier              Procurement Lead
Training matrix review         semiannual  per role × person × competency    Workforce Lead
SOP review                      per cycle   per SOP frequency                 Doc Owner
Calibration review              monthly     overdue + upcoming                Maintenance Lead
KPI / SLO review                monthly     per dashboard                     Domain Lead
Customer complaint trend        monthly     per pack                           Quality Lead
CAPA effectiveness review       monthly     overdue + closed cycles            Quality Lead
AI advisory KPI review          monthly     acceptance, drift, calibration    AI Lead
AI red-team posture             quarterly   per L4 cadence                    Security + AI Lead
Incident learning review        monthly     SEV-1+ from prior month           SRE Lead
Recall / vigilance trend        quarterly   per pack                           Quality Lead
Cybersecurity posture review    quarterly   ISO 27001 / SOC 2                  Security Lead
Privacy posture review          quarterly   GDPR / CCPA / PIPL                 Privacy Lead
Tenant regulatory profile       annual       per tenant; H1 §5                  Compliance Lead
```

The cadences above are floors; tenants may demand stricter cadence
through CSR (per H1 §7).

---

## 2. Per-review input contract

Each review type declares its inputs by class (per H4) so the system
can pre-stage the inputs automatically.

```
REVIEW                          INPUT CLASSES
Computerised system review       EC-1 (validation); EC-3 (telemetry);
                                  EC-4 (transactions delta); EC-8 (anchors);
                                  EC-16 (changes); EC-17 (incidents)
Management review                EC-13 NC + EC-14 CAPA trend;
                                  EC-20 complaint trend; EC-1 PQ summary;
                                  EC-3 KPI; EC-22 access stats;
                                  EC-15 risk delta
Validation freshness             EC-1 by capability; H2 §13 freshness
                                  floors
Access review (priv)              EC-22 priv access; EC-2 last sigs;
                                  current grants
Access review (std)               current grants by role; orphan accounts
Risk register review              EC-15 register snapshot;
                                  EC-13/EC-17 drivers
Doc effectivity                   EC-10 by domain; effectivity dates;
                                  next-review-due flags
Supplier qual review              C4 supplier scorecard; EC-13 supplier-
                                  attributed; EC-18 incoming-pass rate
Training matrix review            EC-11 + role × person matrix; expiring
                                  qualifications
SOP review                        EC-10 with next-review marker
Calibration review                EC-12 status; due / overdue
KPI / SLO                         M5 directory; current; trend
Complaint trend                   EC-20 per period; vigilance threshold
                                  hits
CAPA effectiveness                EC-14 effectiveness window data
AI KPI                            EC-25 advisory render counts; EC-24
                                  override rate; EC-23 freshness;
                                  drift sigs
AI red-team posture               EC-7; EC-23 model card status
Incident learning                 EC-17 per SEV; runbook coverage
Recall trend                      EC-21 per pack
Cyber posture                     I7 records; EC-27 pen-test; EC-32 SBOM;
                                  EC-33 vuln state
Privacy posture                   EC-30 ROPA; EC-31 DPIA; subject-rights
                                  metrics
Tenant regulatory                 H1 profile; deltas since prior review
```

Inputs are pulled via E8 (Evidence API) by the periodic-review job;
no manual collation. Missing inputs block review (cannot review what
you cannot see).

---

## 3. Per-review output contract

Reviews produce structured outputs that feed downstream:

```
OUTPUT KIND                     ROUTES TO
Management decision              minutes (EC-10 doc); ratified at signoff
Action item / CAPA               H8 CAPA program (EC-14)
Risk register update             H9 (EC-15)
Change request                   H7 change control (EC-16)
Doc revision                     D7 doc lifecycle (EC-10)
Validation re-PQ trigger         H2 lifecycle (EC-1)
Training assignment              D8 training (EC-11)
Access revoke / rotate           I7 + I8 (EC-22 outcome)
Supplier rating delta            C4 supplier root
Tenant regulatory delta          per H1 §5; H7 if scope-affecting
Posture report                   audit pack (H3) + customer transparency
```

Every output carries the review_id so audit can trace from output
back to source. Outputs without traceability are rejected.

---

## 4. Review record substance

Each review produces a doc_record (EC-10) capturing:

```
review_id                       canonical id; tenant scope
review_type                     per §1
period_start / period_end        scope window
participants                    by role + name (RACI specifies who)
inputs_referenced               class × id list (resolvable per E8)
findings                        per finding: status + severity
decisions                       per decision: rationale + signoff
action_items                    per item: owner + due + expected evidence
signoffs                        ≥2 signers per Tier-1 review;
                                Quality Lead always signs
next_review_due                 deterministic from cadence + offset
```

The review record itself is regulated (per H7); changes after
signoff create a new revision.

---

## 5. Per-tenant cadence

Tenants in regulated industries may require stricter cadence than
HESEM defaults:

```
PHARMA (sterile)              Annex 11 review every 6 mo (HESEM default
                              already meets); QP-led every quarter
PHARMA (non-sterile)          Annex 11 every 12 mo permitted by some
                              Member States
MED DEVICE (Class III)        ISO 13485 management review annual;
                              risk file review per ISO 14971 update cycle
AUTO (IATF)                   IATF management review quarterly review of
                              CSR conformance
AERO                          AS9100 management review annual + NADCAP
                              cycle
US DEFENSE / CMMC             CMMC self-assessment annual; access review
                              monthly (privileged)
```

Per-tenant cadence is captured in the tenant regulatory profile
(per H1 §5) and feeds the periodic-review job.

---

## 6. The periodic-review job

```
J0  Nightly scan of next_review_due across all review types × tenants
J1  Items due in N days surfaced to owners via dashboard + email
J2  Items past due trigger SEV-3 if regulated; SEV-4 otherwise
J3  Pre-staging: inputs pulled per §2; missing inputs flagged
J4  Owners conduct review; produce outputs per §3
J5  Signoff routes outputs; review_id stamped on each output
J6  Anchor at next daily anchor cycle
J7  next_review_due updated; close
```

The job is itself a regulated capability (validation pack VP-periodic).

---

## 7. Failure modes

```
FM1   Review past due
      Recovery: SEV escalates per cadence; certifications at risk
              within 60d delay

FM2   Inputs unavailable at review time
      Recovery: review blocked; H8 CAPA on input pipeline

FM3   Findings without action items
      Recovery: review record rejected; resubmit with actionable
              outputs

FM4   Action item never closes
      Recovery: H8 systemic CAPA; SEV escalation per overdue duration

FM5   Reviewer signs without quorum
      Recovery: signature rejected (axiom B6); review remains open

FM6   Tenant cadence drift (faster cadence not honored)
      Recovery: H1 profile reconciliation; H8 CAPA;
              tenant-notification per DPA

FM7   AI KPI review skipped due to model deprecation
      Recovery: model card transition tracked; review still required
              for sunset window per L3 §1
```

---

## 8. Roles and authority (RACI)

```
Role                MGMT  CSV  VAL  ACC  RISK  DOC  SUPP  TRN  AI
Quality Lead         A     A    A    -    A     A    -    A    -
Compliance Lead      R     R    -    R    R     R    -    -    -
Engineering Lead     C     R    R    -    R     -    -    -    -
SRE Lead             C     C    C    -    C     -    -    -    -
Security Lead        C     -    -    A    R     -    -    -    R
Privacy Lead         C     -    -    R    C     -    -    -    -
Domain Lead          R     C    C    -    R     R    R    R    -
Procurement Lead     R     -    -    -    -     -    A    -    -
Workforce Lead       R     -    -    -    -     -    -    A    -
AI Lead              C     -    R    -    R     -    -    -    A
Vertical Pack Lead   R     R    C    -    R     R    -    -    -
```

---

## 9. Cross-references

- H1 §5 — tenant profile drives per-tenant cadence
- H2 §13 — validation freshness floors
- H3 — audit pack includes review records
- H4 — input class definitions
- H7 — change control consumed as input + emitted as output
- H8 — CAPA from review action items
- H9 — risk register reviewed
- I7 — security posture review
- I8 — access review
- L3 — AI KPI cadence
- M5 — SLO directory consumed
- D7 — doc effectivity reviewed
- D8 — training reviewed
- D9 — calibration + maintenance reviewed

---

## 10. Decision phrase

```
H6_PERIODIC_REVIEW_BASELINE_LOCKED
NEXT: H7_CHANGE_CONTROL.md
```
