# H7 — Change Control

```
chapter_purpose: every change to a regulated configuration / process /
                 document / spec / model / schema flows through one
                 controlled lifecycle, with proportional rigor and
                 explicit evidence
owner_role:      Engineering Lead with Quality Lead
sources:         EU GMP Annex 11 §10, EU GMP Chapter 1 §1.4 PQS,
                 ICH Q10 §3.2.3, ISO 9001 §8.5.6, IATF 16949 §8.5.6.1,
                 ISO 13485 §7.3.9 design changes, FDA CSA, GAMP 5
                 change management, ITIL 4 change enablement,
                 SOC 2 CC8.1, FDA Predetermined Change Control Plan
                 (2023 draft)
```

Change control is the membrane between "what you proved is correct"
and "what you actually run." A regulated system that ships a change
without traversing change control is, by definition, un-validated
for the new state. This chapter defines the lifecycle, classes,
gating, and integration with adjacent disciplines (validation, risk,
CAPA, periodic review).

---

## 1. Scope of change

What MUST go through change control:

```
- Authoritative spec (URS, FS, DS, RTM)
- Controlled SOP / WI / form
- Process / workflow alteration
- State machine (state add/remove/rename, transition change)
- API contract change (path, semantics, schema, error codes)
- Schema migration (DB / message / event payload)
- Data classification change
- Retention class change
- Security control change (RBAC role, ABAC rule, key rotation)
- Network policy / firewall / region pinning
- Cryptographic suite change
- AI model promotion (per L3 stages)
- Vertical pack toggle / sub-vertical risk class
- Tenant regulatory profile change (per H1 §5)
- Validation pack revision
- Audit chain anchor cadence
- Customer-specific requirement (CSR) overlay change
- Document template update where document is regulated
- Calibration master / reference standard
- Supplier qualification status change
- Outsourced activity scope (sub-processor, contract manufacturer)
- Time source / clock authority
```

What does NOT require change control (still tracked in code review):

```
- UI copy fix typo (Tier-5 with auto-CTR; no ECO record)
- Internal test refactor not touching regulated capability
- Build pipeline cosmetic
- Comment / docstring
- Local dev tool
- Engineering handbook (separate from regulated SOP)
```

The dividing line is: would a customer auditor want to see this? If
yes → change control.

---

## 2. Change class taxonomy

```
CLASS  NAME           EXAMPLE                              CRITICAL THINKING (CTR)
A      Critical       batch release algo; banned-decision   mandatory; full-V model
                      surface; e-sig binding                per H2; risk per H9
B      Major          authority delegation rule;             mandatory; V-model OQ +
                      regulated workflow path                sample PQ; risk per H9
C      Moderate       workspace projection logic;            CTR optional; scripted
                      KPI calculation                        OQ; risk light-touch
D      Minor          dashboard layout; non-regulated UI     change record only;
                      copy                                   smoke regression
E      Emergency      security patch; SEV-1 hotfix          post-deploy validation;
                                                             retroactive CTR within
                                                             5 business days
F      Doc-only       SOP wording without process change     review-only; doc lifecycle
                                                             (D7) is the spine
```

Class is decided at S1 of H2 §4 lifecycle. Up-class is permitted
unilaterally; down-class requires Quality Lead + Compliance Lead
joint approval (BD-equivalent for AI).

Class E (emergency) is not a way to bypass control. It defers the
paper but not the rigor. Within 5 business days, the change must
have a retroactive CTR + evidence — failure routes to H8 CAPA.

---

## 3. Change request lifecycle

```
S0   Idea raised
       triggered by: incident / audit finding / regulatory update /
       customer request / engineering / horizon scan (H1 §6)

S1   Change request opened (CR)
       captures: scope, rationale, regulated/non-regulated, target tenants

S2   Class decided + CTR (where applicable)
       per §2; documented in CR

S3   Impact analysis
       per §4; records affected capabilities, downstream couplings

S4   Risk assessment
       per H9; produces risk record (EC-15) attached to CR

S5   Approval routing per class
       per §6; decision logged with signatures (EC-2)

S6   Implementation
       in dev → test → preprod; never directly in prod (except E)

S7   Validation per H2 lifecycle
       depth driven by class + CTR

S8   Pre-release readiness review
       cross-functional checkpoint; QM + Eng + SRE + Compliance

S9   Release
       gated by validation summary, freshness, axioms, anchor

S10  Post-release verification
       smoke + targeted observability + KPI burn check

S11  Close
       evidence consolidated; effectivity confirmed; CR closed

S12  Effectiveness review
       per class; A: 90 d post-release; B: 60 d; C: regression cycle
```

State machine equivalent (per SM-5 / C2 CAP-C2-05 ECO):

```
draft → impact-analyzed → risk-assessed → approved →
implementing → in-validation → ready-for-release → released →
post-release-verified → closed
                                            ↘ rejected
                                            ↘ withdrawn
                                            ↘ rolled-back
```

---

## 4. Impact analysis substance

A complete impact analysis answers, in writing:

```
Q1   Which authoritative roots are touched?
Q2   Which workflows (per PART_D)?
Q3   Which APIs (per PART_E) — contract change vs additive?
Q4   Which frontend surfaces (per PART_F)?
Q5   Which evidence classes (per H4)?
Q6   Which validation packs need re-PQ vs re-OQ vs none?
Q7   Which retention floors affected (per H5)?
Q8   Which AI features (per L0..L5)?
Q9   Which vertical packs (per PART_J)?
Q10  Which SLOs (per M5)?
Q11  Which migrations / data backfills?
Q12  Which feature flags + rollout plan?
Q13  Which tenant profiles (per I8)?
Q14  Which CAPA / open findings affected (could close or reopen)?
Q15  Which prior CR did this change supersede or extend?
Q16  Reversibility: how to roll back if production-failure detected?
Q17  Customer notification windows (per DPA + H1 §3)?
Q18  Sub-processor or DPA-listed downstream change?
Q19  Schema / message / event compatibility window?
Q20  Risk-control coverage delta (per H9 + ISO 14971)?
```

The IA is itself an evidence artifact (EC-16). For Class A, IA is
peer-reviewed by an independent engineer + Quality Lead.

---

## 5. Backward compatibility discipline

Most regulated changes are additive or behind a feature flag. When a
change is genuinely breaking:

```
API contract            major version bump; 6-mo deprecation window;
                        old version returns RFC 9457 with sunset header;
                        per E0 deprecation policy

DB schema               shadow-write phase per data layer (B6 mode
                        ladder); read parity verified; cutover under
                        CR; rollback plan documented

Event payload           dual-publish window; consumers migrate; old
                        payload deprecated then removed

State machine           additive states allowed; removed states
                        require migration plan + per-tenant
                        reconciliation; tombstone state retained for
                        audit window

E-signature binding     never breaking; old bindings preserved per
                        21 CFR 11.70 forever

Authority rule          old grants migrated explicitly; orphan grants
                        revoked under signed plan

Retention class change  longer-of rule applies; never silently shorten;
                        written legal memo per pack

Document control        controlled doc revision is itself a regulated
                        change; D7 lifecycle handles
```

---

## 6. Approval chain per class

```
CLASS  APPROVERS                                 SIGN ORDER
A      Domain Lead, Eng Lead, Quality Lead,      parallel allowed;
       Compliance Lead, +QP/PRRC if pack-touched all required
B      Domain Lead, Eng Lead, Quality Lead       parallel
C      Domain Lead, Eng Lead                     parallel
D      single approver (Doc Owner)               sole
E      Eng Lead + Security Lead at deploy;       at-deploy plus
       Quality Lead retroactive within 5 days    retroactive
F      Doc Owner per D7                           sole
```

Quorum rule: any single approver may withhold for any class. The
withholding actor must record rationale; CR cannot proceed until
withholding is resolved or escalated to next-level approval.

Self-approval rule: if the change author is also an approver, an
additional independent approver of equal or higher level is required
(per Annex 11 §15 / 21 CFR 11.10(j) accountability).

AI-as-approver: forbidden for Class A/B (per L1 BD-7); permitted as
advisory only with confidence label.

---

## 7. Pre-deploy readiness gate

A CR cannot release without all gates green:

```
G1   IA complete and reviewed                       per §4
G2   Risk record attached and current                per H9
G3   CTR present (Class A/B/E) or waived (Class C+)  per §2
G4   Validation evidence per class                   per H2
G5   RTM coverage 100% (Tier-1 capability)           per H2 §2
G6   All approvers signed                            per §6
G7   No regression in dependent capability tests     auto check
G8   No SLO burn that would block release            per CS-A error budget
G9   Anchor freshness OK                              per B6
G10  No cross-tenant leakage in test                  tenant boundary check
G11  Rollback plan documented                         per §4 Q16
G12  Customer notice scheduled (where required)       per §4 Q17
G13  Localization coverage if user-visible            per F11
G14  Accessibility check pass (Tier-1/2 user-visible)  per F10
G15  AI feature only: model card current; red-team    per L3 + L4
       posture acceptable
```

The gate is automated where possible (G4-G15 mostly automated).
Gates G1-G3 require human attestation. CR rolls back if any gate
flips red post-deploy.

---

## 8. Rollout patterns

```
PATTERN              USE CASE                                  CONTROLS
Big bang             low-risk doc-only / Class D                CR + smoke
Feature flag         additive code; safe behind flag             per-tenant ramp;
                                                                 ramp gate per SLO
Canary               gradual % rollout                           1%/10%/50%/100%
                                                                 with auto rollback
Shadow               read-only behind real path; verify           N days; compare
                                                                 outputs deterministically
Dark launch          ship code; no UI; verify telemetry          observability check
Per-tenant override  pilot with consenting tenant                 explicit DPA addendum
AI shadow            AI predicts but does not show                per L3 S5
Blue-green           DB / infra change                            health check + flip
```

Rollout pattern is part of the CR. Class A defaults to canary or
feature-flag with per-tenant ramp; bigbang requires explicit
rationale.

---

## 9. Special-case changes

```
SECURITY HOTFIX (Class E)
  Trigger: CVE / KEV affecting HESEM dependency
  SLA: patch within window per CVSS + KEV (e.g., critical: 24h)
  Path: emergency CR; deploy with at-deploy approval; retroactive
  CTR + evidence within 5 business days
  Notification: customers per DPA; H1 §3 if regulator requires

PREDETERMINED CHANGE CONTROL PLAN (FDA 2023 draft, MD)
  For SaMD with planned modifications (e.g., periodic AI retraining)
  Pre-authorize change envelope at submission time
  Each in-envelope change uses simplified CR + verifies envelope
  Envelope re-authorization on cycle

REGULATORY HORIZON UPDATE
  Trigger: H1 §6 horizon scan finds new applicability
  Path: scope CR opened; impact across all tenants in scope;
  staged ramp respecting existing tenants

VENDOR-DRIVEN INFRA CHANGE
  Cloud provider deprecation, breaking-change in dependency
  Treated as regulated change since infra is part of validated
  state; tenants notified; sub-processor list updated

DATA CORRECTION
  Found-bad-data discovered post-write
  Cannot edit historical records (WORM); add reversal
  transaction per saga compensation; document in CR;
  audit anchor preserved

REGULATED CONFIGURATION CHANGE
  Tenant flips a flag whose effect is regulated (e.g., switch on
  ITAR control)
  Treated as Class A; must traverse full lifecycle; not one-click
```

---

## 10. Failure modes

```
FM1   Change goes live without CR
      Recovery: SEV-1 if regulated capability; back-fill CR with
              retrospective IA + risk; H8 systemic CAPA on process

FM2   IA understates impact; capability silently broken
      Recovery: rollback per plan; widen IA scope per delta;
              H8 CAPA; post-mortem per I3

FM3   Approver signs without read
      Recovery: signature attestation requires confirmation
              checkpoint; H8 CAPA on attestation discipline

FM4   Class downgraded under deadline pressure
      Recovery: H3 audit catches; H8 systemic;
              compliance leadership review

FM5   Rollback plan untested
      Recovery: pre-release readiness rejects CR until rollback
              dry-run captured

FM6   Effectiveness review skipped
      Recovery: CR not fully closed; periodic review (H6)
              surfaces; H8 CAPA

FM7   Hotfix never receives retroactive CTR
      Recovery: blocking flag prevents next deploy until satisfied;
              SEV escalates per overdue duration

FM8   Backward-incompat change rolled out without sunset
      Recovery: rollback; sunset path defined; H8 systemic;
              customer communication
```

---

## 11. Roles and authority (RACI)

```
Role                IA  CTR RISK APP IMPL VAL  REL EFF
Domain Lead         R   C   R    A   C    C    -   R
Engineering Lead    A   R   C    A   A    A    A   C
Quality Lead        C   A   A    A   -    A    A   A
Compliance Lead     C   A   A    A   -    -    A   A
Validation Eng      R   R   -    -   -    R    -   R
SRE Lead            C   -   C    -   -    -    A   -
Security Lead       C   -   C    -   -    -    -   -
Privacy Lead        C   -   C    -   -    -    -   -
QP / PRRC           C   -   C    A   -    -    A   C
AI Lead             C   C   R    A   -    R    -   R
Vertical Pack Lead  R   C   R    A   -    R    -   R
```

---

## 12. Cross-references

- H1 §6 — horizon scan triggers regulatory CRs
- H2 — validation lifecycle invoked per CR
- H3 — audit pack consumes change records
- H4 — change_record (EC-16) class
- H5 — retention class changes governed here
- H6 — periodic review consumes CR data + emits CRs
- H8 — CAPA findings produce CRs; CRs feed CAPA effectiveness
- H9 — risk file updated per CR
- L3 — AI model promotions are CRs
- E0 — API deprecation policy
- B6 — schema mode ladder
- D7 — controlled doc lifecycle
- I3 — incident-driven emergency CRs
- I7 — security CRs
- C2 — ECO state machine
- M9 — cross-reference index

---

## 13. Decision phrase

```
H7_CHANGE_CONTROL_BASELINE_LOCKED
NEXT: H8_CAPA_PROGRAM.md
```
