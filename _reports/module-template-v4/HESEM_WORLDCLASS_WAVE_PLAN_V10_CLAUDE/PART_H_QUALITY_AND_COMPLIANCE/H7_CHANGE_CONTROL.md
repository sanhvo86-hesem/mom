# H7 — Change Control

```
chapter_purpose: every change to a regulated configuration / process /
                 document / spec / model / schema flows through one
                 controlled lifecycle with proportional rigor and
                 explicit evidence
owner_role:      Engineering Lead with Quality Lead
sources:         EU GMP Annex 11 §10, EU GMP Chapter 1 §1.4 (PQS),
                 ICH Q10 §3.2.3, ISO 9001 §8.5.6,
                 IATF 16949 §8.5.6 + §8.5.6.1,
                 ISO 13485 §7.3.9 (design changes),
                 FDA CSA 2022 (change management),
                 GAMP 5 2nd ed. §7 (change management),
                 ITIL 4 change enablement practice,
                 SOC 2 CC8.1 (change management),
                 FDA Predetermined Change Control Plan draft 2023 (SaMD),
                 AS9100D §8.5.6, IATF 16949 §8.5.6,
                 21 CFR 820.70(b) (process changes),
                 CMMC Level 2 CM.2.061
```

Change control is the membrane between "what you proved is correct" and "what you
actually run." A regulated system that ships a change without traversing change
control is, by definition, unvalidated for the new state. The severity of the gap
scales with the criticality of the change: a UI typo fix that bypasses change
control is negligible; a batch release algorithm update that bypasses it is a
potential regulatory violation.

This chapter defines the scope, class taxonomy, lifecycle, impact analysis
substance, backward compatibility discipline, approval chain, pre-deploy readiness
gate, rollout patterns, special-case procedures, and failure modes. Every element
of this chapter applies regardless of how the change was initiated — engineering-
driven, incident-driven, regulatory-horizon-driven, or customer-driven.

---

## 1. Scope of change

### 1.1 Changes REQUIRING change control (≥ 25 categories)

The following change categories must traverse the H7 lifecycle. "Must" means a
change of this type deployed without a CR is a defect subject to retroactive
reconciliation and CAPA.

```
NO.  CATEGORY                          NOTES
───────────────────────────────────────────────────────────────────────────────
 1   Authoritative specification       URS, FS, DS, RTM change — regardless of
     (URS / FS / DS / RTM)             whether it drives an implementation change
                                        immediately or not
 2   Controlled SOP / WI / Form        Any content change; excludes typo correction
                                        in non-process text (Class F handles these)
 3   Process / workflow alteration     Any change to steps, sequence, actors,
                                        or decision branches in a regulated workflow
 4   State machine modification        Adding, removing, or renaming a state or
                                        transition in any regulated entity's lifecycle
 5   API contract change               Path, HTTP method, parameter, response schema,
                                        error codes, or semantics; additive changes
                                        still require CR (lighter class)
 6   Database schema migration         Column add / remove / rename / type change;
                                        table add / remove; index semantics;
                                        partitioning strategy
 7   Message / event payload change    Schema change to any RabbitMQ message or
                                        event payload consumed by a regulated consumer
 8   Data classification change        Reclassifying a field's sensitivity, PII flag,
                                        SPI flag, or evidence class
 9   Retention class change            Changing the evidence class or retention floor
                                        for an existing record type; per H5 floor rules
10   Security control change           RBAC role definition; ABAC policy rule; key
                                        algorithm or key rotation schedule; cipher
                                        suite; TLS version minimum
11   Network policy / firewall /       Allowing or blocking new traffic paths;
     region pinning                    changing data residency zone assignment;
                                        cross-border transfer rule
12   Cryptographic suite change        Hash algorithm; KDF; symmetric cipher; digital
                                        signature scheme for e-signatures
13   AI model promotion                Moving a model from shadow to advisory to
                                        mandatory mode (per L3 stage progression)
14   AI model update / retrain         New weights, hyperparameter change, training
                                        data scope change, label schema change
15   Vertical pack toggle /            Enabling or disabling a vertical pack for a
     sub-vertical risk class           tenant; changing a device risk class or
                                        sub-vertical designation
16   Tenant regulatory profile         Any change to active jurisdictions, CSR
     change                            overlays, device class, pack assignment;
                                        per H1 §5
17   Validation pack revision          Any change to a validation pack (VP-01..VP-16+)
                                        including scope, test cases, acceptance criteria
18   Audit chain anchor cadence        Changing the frequency or scope of the daily
                                        Merkle anchor job
19   CSR overlay change                Any change to a customer-specific requirement
                                        override ingested per H1 §7
20   Document template update          Where the template governs a regulated output
                                        (e.g., batch record template, NC form)
21   Calibration master / reference    Change to a reference standard, calibration
     standard                          procedure, or calibration interval for a
                                        regulated instrument
22   Supplier qualification status     Qualifying a new supplier; disqualifying an
     change                            active supplier; changing a supplier's approved
                                        scope or risk tier
23   Outsourced activity scope         Adding, removing, or changing scope of a
     (sub-processor / CMO)             sub-processor or contract manufacturer;
                                        DPA annex update required
24   Time source / clock authority     Change to NTP server, GPS synchronization
                                        source, or clock authority referenced in
                                        audit trail timestamps (21 CFR 11 impact)
25   Disaster recovery topology        Change to DR region, RTO/RPO targets, failover
                                        sequence, or backup schedule that affects
                                        validated system availability commitments
26   Third-party component upgrade     Library / dependency / container image update
                                        where the component is in scope of a validation
                                        pack (infrastructure components per GAMP 5
                                        Cat 1 are still tracked changes)
27   AI advisory boundary rule         Changing the conditions under which the AI
                                        may or may not render an advisory; banning
                                        a new decision type from AI advisory
28   Feature flag enabling on          Turning on a feature flag that gates regulated
     regulated capability              capability — the flag state change is itself
                                        a regulated change
───────────────────────────────────────────────────────────────────────────────
```

### 1.2 Changes NOT requiring change control

The following are tracked via normal code review and version control but do not
require a formal CR:

- UI copy typo correction where the copy has no regulatory significance
- Internal test refactor that does not touch a regulated capability path
- Build pipeline cosmetic change (e.g., CI step rename)
- Code comment or docstring
- Local developer tooling
- Engineering handbook sections that are not controlled SOPs
- Logging verbosity adjustment (unless logs are evidence class EC-22)

The dividing line: would a customer auditor during a regulatory inspection want
to see a CR, IA, risk assessment, and approver signatures for this change? If the
answer is yes, it requires a CR.

---

## 2. Change class taxonomy

```
CLASS  NAME           DESCRIPTION                          CRITICAL THINKING    VERTICAL
                                                            REVIEW (CTR)         OVERLAY
───────────────────────────────────────────────────────────────────────────────────────────
A      Critical       Batch release algorithm; banned-      Mandatory;           Pharma: QP
                      decision surface; e-signature         full V-model per     sign-off
                      binding logic; retained evidence      H2; risk per H9;     MD: PRRC
                      class; regulated state machine        Class A impact        sign-off
                      transition; cryptographic suite       analysis peer-        Aero: DER
                                                            reviewed             / DAR
B      Major          Authority delegation rule; regulated  Mandatory;           Pharma: QP
                      workflow path; API contract           V-model OQ +         advisory
                      breaking change; AI model             sampled PQ;          MD: PRRC
                      promotion; retention class            risk per H9          advisory
                      change; tenant reg profile
C      Moderate       Workspace projection logic; KPI       CTR optional;        None
                      calculation; additive API change;     scripted OQ;
                      new evidence class (additive);        risk light-touch
                      non-regulated workflow step
D      Minor          Dashboard layout; non-regulated UI    CR + change          None
                      copy; non-regulated config            record only;
                                                            smoke regression
E      Emergency      Security patch for KEV / critical     At-deploy approval   Pharma:
                      CVE; SEV-1 safety hotfix              (Eng + Security);    retrospective
                                                            retroactive CTR +    QP sign
                                                            evidence ≤ 5 biz     ≤ 5 days
                                                            days
F      Doc-only       SOP wording without process change;   Review-only;         None
                      typo in regulated doc; metadata        doc lifecycle (D7)
                      correction                             is the spine
───────────────────────────────────────────────────────────────────────────────────────────
```

Class is decided at S1 of the H7 lifecycle (§3). Up-classing is permitted
unilaterally by any participant without requiring approval. Down-classing requires
Quality Lead AND Compliance Lead joint approval; the rationale is documented in the
CR and is subject to audit scrutiny. Down-classing under deadline pressure without
documented regulatory basis is a finding per H3.

Class E is not an exemption from rigor. The deployment proceeds to meet the SLA
(e.g., critical CVE patching within 24 hours), but the full paper trail follows
within 5 business days. A Class E CR that does not receive its retroactive CTR and
evidence within 5 business days is flagged as a breach and routes to H8 CAPA.

---

## 3. Change request lifecycle (S0..S12)

```
S0   TRIGGER
      Source: incident resolution (I3); audit finding (H3); regulatory update
      from horizon scan (H1 §6); CAPA corrective action (H8); customer request;
      engineering initiative; periodic review output (H6); vendor-driven infra
      change; AI model maturation (L3)

S1   CHANGE REQUEST OPENED
      CR record created (EC-16). Captures: title; description; scope (free text);
      whether the change affects a regulated capability (boolean); target tenant(s);
      source_event_id (linking to triggering event); urgency flag; initial class
      estimate; author

S2   CLASS DECIDED + CTR
      Change class finalized per §2. Down-class requires dual approval. If Class A
      or B: CTR outlined with scope, approach, expected test depth. CTR becomes a
      living document within the CR. For Class E: urgency rationale documented;
      retroactive CTR scheduled.

S3   IMPACT ANALYSIS
      Per §4. Outputs IA record (EC-16 sub-artifact) attached to CR. For Class A:
      IA must be peer-reviewed by an engineer not involved in the implementation
      and by the Quality Lead. IA is frozen after approval; amendments require
      a new IA version.

S4   RISK ASSESSMENT
      Per H9. Produces risk_record (EC-15) attached to CR. For Class A: FMEA-
      level analysis. For Class B: risk severity/probability matrix. For Class C:
      qualitative risk statement. Risk record links to any pre-existing risk
      register entries the change affects.

S5   APPROVAL ROUTING
      Per §6. CR enters the approval queue. Approvers receive notification with
      CR summary, IA link, risk record link, CTR link. Approvers may approve,
      withhold (with rationale), or request clarification. All approvals are
      e-signature events (EC-2). No approvals can be proxied without a formal
      delegation record.

S6   IMPLEMENTATION
      Code / config / document changes implemented in dev → test → pre-prod.
      Direct production changes (except Class E) are forbidden. Class E may
      deploy directly with at-deploy approval only; all other classes require
      pre-prod pass before production deploy.

S7   VALIDATION PER H2 LIFECYCLE
      Validation depth driven by change class + CTR. Class A: full V-model
      including IQ/OQ/PQ re-execution for affected capability. Class B: OQ +
      sampled PQ. Class C: scripted OQ (regression suite). Class D: smoke
      regression. Class F: review-only, no validation step.

S8   PRE-RELEASE READINESS REVIEW
      Cross-functional checkpoint. QM + Engineering Lead + SRE + Compliance Lead
      confirm all gates in §7 are green. Readiness confirmation is a formal
      attestation (EC-5 sub-type). For Class A: readiness review is a formal
      meeting with minutes.

S9   RELEASE
      Gated by readiness review attestation. Deployment follows the rollout
      pattern specified in the CR (per §8). The deployment event is logged with
      CR reference + deploying actor + timestamp.

S10  POST-RELEASE VERIFICATION
      Smoke tests run against production. Targeted observability checks (KPI
      burn rate, error rate, latency) verified within 4 hours of deployment.
      For Class A: extended monitoring window (configurable; default 72 hours)
      with auto-rollback trigger if error rate exceeds threshold.

S11  CLOSE
      All evidence consolidated: IA, risk record, CTR, validation summary,
      approvals, post-release verification. CR status set to CLOSED. Effectivity
      date confirmed. change_record (EC-16) anchored in Merkle chain (EC-12).
      All downstream records (H2 validation packs, H9 risk register) updated
      to reference the closed CR.

S12  EFFECTIVENESS REVIEW
      Per class schedule: Class A: 90 days post-release; Class B: 60 days;
      Class C: next regression cycle. Effectiveness review confirms the change
      achieved its stated intent without introducing regressions. Feeds H6 R14
      (CAPA effectiveness review) if the CR had a CAPA source.
```

State machine:

```
DRAFT → IMPACT_ANALYZED → RISK_ASSESSED → APPROVED →
IMPLEMENTING → IN_VALIDATION → READY_FOR_RELEASE → RELEASED →
POST_RELEASE_VERIFIED → CLOSED
                           ↘ REJECTED (at S5 if withheld without resolution)
                           ↘ WITHDRAWN (at any pre-release step)
                           ↘ ROLLED_BACK (from RELEASED if post-release check fails)
```

Transition guards:
- `DRAFT → IMPACT_ANALYZED`: IA record attached
- `IMPACT_ANALYZED → RISK_ASSESSED`: risk_record attached
- `RISK_ASSESSED → APPROVED`: all required approvals present (quorum met)
- `APPROVED → IMPLEMENTING`: no active blocking flags
- `IN_VALIDATION → READY_FOR_RELEASE`: all readiness gates green (§7)
- `RELEASED → ROLLED_BACK`: auto-triggered if post-release checks fail within
  monitoring window OR manually triggered by Engineering Lead

---

## 4. Impact analysis substance (Q1..Q22)

A complete impact analysis answers the following questions in writing. For Class A,
every question must be answered; for Class B, Q1–Q16 are required; for Class C,
Q1–Q10 are required. The IA record captures each answer with evidence references.

```
Q1    Which authoritative roots (H4 EC-1/EC-2) are touched by this change?
      List by entity type and scope. For each: is the change to schema,
      lifecycle, or content?

Q2    Which regulated workflows (per PART_D) are affected?
      List workflow IDs; for each: is the step added, modified, or removed?

Q3    Which APIs (per PART_E) are affected?
      Distinguish additive (new endpoint / field) from breaking (removed,
      renamed, schema-changed). For breaking changes: deprecation window plan.

Q4    Which frontend surfaces (per PART_F) are affected?
      User-visible vs. admin-only; regulated UI surfaces (batch record entry,
      e-signature prompt, calibration input) vs. non-regulated.

Q5    Which evidence classes (per H4 EC-1..EC-38) are created, modified,
      or deleted by the new behavior? For each: does the change affect the
      schema, the retention floor, or the WORM lock duration?

Q6    Which validation packs (per H2 VP-01..VP-16+) need re-execution?
      For each: full re-PQ vs. re-OQ vs. regression vs. no re-execution.
      Rationale required for each "no re-execution" decision.

Q7    Which retention floors are affected (per H5)?
      If retention class changes: longer-of rule assessment; legal memo
      required if floor shortens.

Q8    Which AI features (per L0..L5) are affected?
      For each: is the change to model weights, inference path, advisory
      boundary, training data, or evaluation criteria?

Q9    Which vertical packs (per PART_J) are in scope?
      For each in-scope pack: are pack-specific compliance requirements
      triggered (e.g., QP sign-off for Pharma, PRRC for MD)?

Q10   Which SLOs (per M5) are potentially affected?
      For each: is the change expected to improve, degrade, or have no
      impact on the SLO? Rationale required for "no impact" claim.

Q11   What database migrations or data backfills are required?
      For each migration: reversible vs. irreversible; estimated duration;
      online (zero-downtime) vs. offline; shadow-write phase required?

Q12   Which feature flags are involved?
      New flags: default state; per-tenant ramp plan; eventual removal
      date. Existing flags: does this change affect their semantics?

Q13   Which tenant profiles (per I8) are affected?
      For multi-tenant changes: are all tenants in scope, or only a
      subset? For subset: why are other tenants excluded?

Q14   Which open CAPA records or findings could be closed OR reopened by
      this change? For each: link the CAPA ID; explain the expected effect.

Q15   Which prior change requests does this supersede, extend, or depend on?
      For each: link CR ID; describe the relationship.

Q16   Reversibility and rollback plan.
      How to roll back if production failure is detected? Time estimate
      for rollback; data migration rollback steps; feature flag fallback.
      Has the rollback plan been dry-run tested? If not: when?

Q17   Customer notification requirements.
      Per DPA and H1 §3: which customers require advance notification?
      What is the required notification window for each? Is the notification
      scheduled?

Q18   Sub-processor or DPA downstream change?
      Does the change add, remove, or modify a sub-processor or data
      processor relationship listed in the DPA? If yes: DPA annex update
      required before release.

Q19   Schema / message / event backward compatibility window.
      For any breaking schema change: dual-publish window duration;
      consumer migration SLA; tombstone state retention period.

Q20   Risk-control coverage delta.
      Per H9 and ISO 14971 §10: does the change affect existing risk
      controls? Are new risk controls introduced? Are any risk controls
      removed or weakened?

Q21   ITAR / export control impact (Aero Pack tenants).
      Does the change affect ITAR-controlled records, access controls,
      or data residency assignments for export-controlled data?
      If yes: ITAR Compliance Officer must sign off before release.

Q22   Predetermined Change Control Plan (PCCP) scope check (MD Pack).
      For AI feature changes under an active PCCP: is this change within
      the authorized envelope? If yes: simplified CR path applicable.
      If outside envelope: full Class A path required + PCCP re-authorization.
```

The IA record (EC-16) is retained per the change_record retention floor
(supersession + 7 yr; GxP: product_life + 7 yr).

---

## 5. Backward compatibility discipline

Most regulated changes should be additive or feature-flagged. When a change is
genuinely breaking, the following disciplines apply by change category:

```
CATEGORY              DISCIPLINE
──────────────────────────────────────────────────────────────────────────────
API contract          Major version bump in path (e.g., /v1/ → /v2/).
breaking change       Six-month deprecation window minimum; old version returns
                      HTTP 200 with RFC 9457 Deprecation header including
                      sunset date. Per E0 deprecation policy. Consumers
                      notified via changelog and DPA notification if the API
                      is externally exposed.

Database schema       Shadow-write phase per B6 mode ladder (SHADOW_WRITE
change                before POSTGRES_PRIMARY). Read parity verified before
                      cutover. Cutover executed under CR. Old columns retained
                      for the deprecation window with `deprecated_at` marker.
                      Rollback plan must include column restoration script.

Event / message       Dual-publish window: new schema published alongside old
payload change        schema for a minimum of 2 sprint cycles. All regulated
                      consumers must migrate before old schema is withdrawn.
                      Old payload deprecated with explicit tombstone message.

State machine         Additive states (new state added) are allowed without
modification          dual-publish. Removed states require: (a) migration plan
                      mapping existing records in the removed state to a valid
                      successor state; (b) per-tenant reconciliation script;
                      (c) tombstone state retained in schema for the audit
                      window (minimum 7 years for regulated entities).

E-signature binding   NEVER breaking. Old e-signature bindings are preserved
                      permanently per 21 CFR 11.70 ("signatures shall not
                      be removed, transferred, or falsified"). The signing
                      algorithm may be upgraded, but the old binding record
                      is retained alongside the new one, not replaced.

Authority / RBAC      Old grants cannot be silently migrated to a new grant
rule change           set. Migration plan: explicit mapping of old role → new
                      role; orphan grants (no mapping) are revoked under a
                      signed revocation plan; affected users notified.

Retention class       Longer-of rule (H5 P2): floor can only be extended,
change                never silently shortened. Shortening requires: written
                      legal memo documenting regulatory justification; QP/RA
                      approval for Pharma/MD packs; H7 Class A CR regardless
                      of the magnitude of the shortening.

Controlled document   Doc revision is itself a regulated change. The D7 doc
revision              lifecycle manages the revision. The old version is
                      retained (WORM-class, EC-1) for the retention floor;
                      effectivity is explicitly transferred from old to new
                      version with a dual-sign event.
──────────────────────────────────────────────────────────────────────────────
```

---

## 6. Approval chain per class + per-pack overlay

### 6.1 Baseline approval chain

```
CLASS  REQUIRED APPROVERS                           SIGN ORDER     SELF-APPROVAL
───────────────────────────────────────────────────────────────────────────────────
A      Domain Lead, Engineering Lead, Quality        Parallel;      Not permitted;
       Lead, Compliance Lead, + pack role if         all required   additional
       pack-touched (QP/PRRC/Aero DER)                              independent
                                                                     approver required
B      Domain Lead, Engineering Lead, Quality        Parallel;      Not permitted
       Lead                                          all required
C      Domain Lead, Engineering Lead                 Parallel;      Not permitted
                                                     both required
D      Single approver (Doc Owner or Domain          Sole           Permitted if
       Lead)                                                        no regulated
                                                                     impact
E      Engineering Lead + Security Lead at-          Parallel at    Engineering Lead
       deploy; Quality Lead retroactive              deploy;        permitted for
       ≤ 5 business days                             sequential     deploy-time only
                                                     for retro
F      Doc Owner per D7 lifecycle                    Sole           Permitted
───────────────────────────────────────────────────────────────────────────────────
```

### 6.2 Quorum and withholding rules

- Any single approver may withhold approval for any class. Withholding requires
  a documented rationale entered in the CR.
- A withheld CR cannot proceed to S6 (Implementation).
- Withholding resolution paths: (a) the change is modified to address the concern
  and the approver un-withholds; (b) the withholding is escalated to the next
  management level for resolution; (c) the CR is withdrawn.
- There is no "override" mechanism for a withheld Class A or B CR. The concern
  must be resolved or the CR withdrawn.

### 6.3 AI-as-approver prohibition

For Class A and B changes, AI advisory output is permitted as additional context
(confidence-labeled per L1) but is explicitly forbidden as an approver or co-
approver. This applies regardless of model confidence level. The prohibition is
enforced at the approval workflow level: the e-signature panel does not accept
an AI-generated identity as a signing principal for Class A/B (BD-7 per L1).

### 6.4 Per-pack approval overlays

```
PACK          OVERLAY
──────────────────────────────────────────────────────────────────────────────
PHARMA        Class A and B changes touching batch release, DSCSA, or GxP
              validation packs: QP (Qualified Person) sign-off required.
              QP sign-off is a separate approval step after all baseline
              approvers have signed. Release without QP sign-off on Class A
              is a regulatory violation (EU GMP Annex 11 §10).
              For US-only Pharma tenants: Quality Assurance Director may
              fulfill the QP equivalent role.

MED DEVICE    Class A and B changes touching the DHF, DMR, software
              validation, risk management file, or clinical evaluation:
              PRRC (Person Responsible for Regulatory Compliance per EU MDR
              Art 15) must approve. PRRC approval documents that the change
              does not require a new conformity assessment.
              For SaMD with active PCCP: changes within the PCCP envelope
              use simplified Class C approval path; the PCCP compliance
              check is an additional gate G15b (§7).

AUTO (IATF)   Class A changes affecting PPAP-governed features or
              customer-facing measurement systems: Customer Representative
              sign-off or formal PPAP re-submission notification per OEM
              CSR (e.g., Ford CSR §9: Level 3 PPAP re-submission trigger).
              Determined at S2 via CSR impact assessment (Q9).

AERO          Class A changes affecting type design data, certification
              basis, or airworthiness-critical capability: DER (Designated
              Engineering Representative) or DAR (Designated Airworthiness
              Representative) approval required if FAA-certified; EASA Form 1
              or EASA authorized approver if EASA-regulated.
              ITAR-controlled changes (Q21): ITAR Compliance Officer sign-off.

FOOD          Class A changes to HACCP plan, verified-supplier list, or
              FSMA §204 traceability chain: Food Safety Manager sign-off.
              Annual HACCP reassessment (R10) may be triggered; if so, full
              HACCP team review required before the change can be classified
              as closed.
──────────────────────────────────────────────────────────────────────────────
```

---

## 7. Pre-deploy readiness gate (G1..G15)

A CR cannot transition from `READY_FOR_RELEASE` to `RELEASED` without all
applicable gates passing. Gates are evaluated automatically where possible;
gates marked (manual) require human attestation.

```
GATE  DESCRIPTION                                    APPLIES TO     AUTO?
──────────────────────────────────────────────────────────────────────────────────
G1    Impact analysis present and approved           All A/B/C      Manual
G2    Risk record attached and current               All A/B/C      Manual
G3    CTR present (A/B) or formally waived (C+)     A/B (req);     Manual
                                                      C (optional)
G4    Validation evidence per class and depth        All except F   Auto (H2 gate)
G5    RTM coverage ≥ 100% for Tier-1 capability      A/B (Tier-1)   Auto (RTM check)
G6    All required approvers signed (quorum met)     All            Auto (workflow)
G7    No regression failure in dependent capability  All except F   Auto (CI)
      tests within the change scope
G8    No SLO error budget burn that exceeds the      All            Auto (M5 check)
      release-blocking threshold per CS-A policy
G9    Merkle anchor current and unbroken             All            Auto (B6 check)
G10   Cross-tenant leakage test passed in pre-prod   All A/B/C      Auto (test suite)
G11   Rollback plan documented and dry-run           A/B            Manual attestation
      completed (or exception documented)
G12   Customer / tenant notification scheduled       A/B where      Manual
      (where DPA requires advance notice per Q17)    required
G13   Localization coverage confirmed for any        All user-      Auto (l10n check)
      user-visible string changes (per F11)          visible
G14   Accessibility check passed for Tier-1/2        User-visible   Auto (a11y scan)
      user-visible surfaces (per F10)                changes
G15   AI feature changes: model card current;        AI changes     Manual (AI Lead)
      red-team posture acceptable per L4; PCCP
      scope check completed (Q22) if MD Pack
──────────────────────────────────────────────────────────────────────────────────

Additional gates activated by vertical pack:
G15a  Pharma / MD: QP/PRRC sign-off received         A/B pack-      Manual
                                                      touched
G15b  MD Pack PCCP: change confirmed within          MD AI A/B      Manual (PRRC)
      authorized envelope (per Q22)
G15c  Aero Pack: DER/DAR approval received           A Aero         Manual
      (if airworthiness-critical)
G15d  ITAR: ITAR Compliance Officer sign-off         ITAR-tagged    Manual
      (if Q21 applies)
──────────────────────────────────────────────────────────────────────────────
```

If any gate flips from green to red post-deploy (within the post-release
monitoring window), the CR automatically transitions to `ROLLED_BACK` state
and the rollback plan (G11) is executed. Post-rollback, the CR is amended
with the rollback event and re-enters `IN_VALIDATION` to address the failure.

---

## 8. Rollout patterns

The rollout pattern is declared in the CR at S2 (change class decision) and is
part of the IA (Q12). Pattern selection is determined by the change class, risk
level, and affected tenant population.

```
NO.  PATTERN              USE CASE / TRIGGER                  CONTROLS
──────────────────────────────────────────────────────────────────────────────
1    Big bang             Low-risk Class D/F changes; doc-     CR + smoke regression;
                          only or non-regulated config         no ramp needed; immediate
                                                               rollback by re-deploy

2    Feature flag         Additive code behind a flag; any     Per-tenant ramp: 0% →
     per-tenant ramp      Class C where gradual exposure       pilot → 25% → 100%;
                          is desired                           ramp gates per SLO burn
                                                               rate; flag default = OFF

3    Canary               Class B changes to high-traffic      1% → 10% → 50% → 100%
                          paths; validated performance         ramp; auto-rollback
                          impact unknown before release        if error rate > threshold
                                                               in any ramp segment

4    Shadow               Read-only new path operating in      N days shadow window;
                          parallel to existing path;           deterministic output
                          validate output equivalence          comparison per session;
                          before cutover                       cutover only after
                                                               equivalence confirmed

5    Dark launch          Code deployed; capability disabled   Observability / telemetry
                          in UI; telemetry and integration     verified live; no user-
                          paths verified in production         visible impact; enables
                                                               emergency turn-on

6    Per-tenant override  Pilot with one or more consenting    Explicit consent recorded
                          tenants before general rollout;      in DPA addendum; pilot
                          useful for high-impact changes       scope documented in CR;
                          with regulated implications          pilot tenant signs off
                                                               before general release

7    AI shadow mode       AI model computes prediction but     N sessions shadow;
                          does not display advisory; output    output logged per EC-25;
                          compared against human decisions     per L3 S5 requirements;
                                                               human performance
                                                               baseline established

8    Blue-green           Full environment swap; used for      Identical blue and green
                          database-affecting or infra          environments; health
                          changes where in-place update        check passes before
                          is too risky                         DNS flip; blue retained
                                                               ≥ 2 hours post-flip
                                                               for instant rollback

9    Ring / cohort        Segment tenants by regulatory risk   Tier ordering: sandbox
     rollout              tier; lowest-risk tenants first;     → non-regulated tenants
                          regulated tenants last              → regulated tenants;
                                                               regression observed
                                                               between tiers

10   Hotfix straight-     Class E only; CVE/SEV-1 SLA          At-deploy approval;
     to-production        demands immediate production          monitoring window 24h;
                          deployment                           retroactive CTR ≤ 5 days
──────────────────────────────────────────────────────────────────────────────
```

Class A changes default to canary or feature-flag per-tenant ramp + blue-green
for DB changes. Big-bang rollout of a Class A change requires explicit written
rationale from the Engineering Lead documenting why graduated rollout is not
feasible.

---

## 9. Special-case changes

### 9.1 Security hotfix (Class E)

**Trigger**: CVE in the KEV (Known Exploited Vulnerabilities) catalog; or internal
vulnerability assessment identifying CVSS ≥ 7.0 actively exploitable in HESEM's
deployed configuration.

**SLA by severity**:
- KEV + CVSS critical (≥ 9.0): 24 hours from confirmed exploitability
- CVSS high (7.0–8.9): 72 hours
- CVSS medium (4.0–6.9) + high business impact: 14 days

**Path**: Emergency CR opened with Class E; Engineering Lead + Security Lead approve
at-deploy. Deployment proceeds. Within 5 business days: CTR written; validation
evidence (smoke + targeted security test) captured; Quality Lead retroactively
signs. SBOM (EC-32) updated to reflect patched component version. Vuln advisory
record (EC-33) closed.

**Customer notification**: per DPA and H1 §3 — if the vulnerability affected
customer data or regulated capability, notification within the contractual window.

### 9.2 Predetermined Change Control Plan (PCCP) — FDA SaMD

**Applicability**: MD Pack tenants with AI-enabled SaMD that has a cleared or
approved PCCP as part of the 510(k) or De Novo submission.

**What a PCCP authorizes**: a pre-defined envelope of model updates (e.g., periodic
retraining with new labeled data from the same distribution, within defined
performance bounds) that do not require a new conformity assessment submission,
provided the post-change performance remains within the PCCP-specified acceptance
criteria.

**HESEM implementation**:
- The active PCCP is stored as a controlled document (EC-1) linked to the tenant's
  regulatory profile
- Each AI model update is checked against the PCCP envelope at S2 (Q22 in IA)
- In-envelope changes use Class C approval path + G15b gate (PRRC confirmation
  that the change is within envelope)
- Out-of-envelope changes revert to Class A + full MD Pack approval chain +
  PRRC assessment of whether a new submission is required
- The PCCP document itself is subject to periodic re-authorization per FDA guidance

### 9.3 Regulatory horizon change

**Trigger**: H1 §6 horizon scan identifies a new regulation, amended regulation,
or new guidance document that affects one or more tenants.

**Path**: Compliance Lead opens a scope CR. Q9 impact analysis determines which
tenants are in scope. Q6 determines which validation packs require updates. The
change may cascade to: new retention floors (H5), new evidence classes (H4),
updated RACI (PART_H), updated review types (H6), new audit checklist sections
(H3). The scope CR covers all cascaded changes as a single controlled event.

Tenant regulatory profiles are updated per H1 §5 with a formal re-validation event.
Tenant notifications are issued per the notification window (H1 §3).

### 9.4 Vendor-driven infrastructure change

**Trigger**: cloud provider deprecation notice; operating system end-of-support;
mandatory library update for security; breaking change in a cloud-managed service.

**Classification**: treated as a regulated change because the infrastructure layer
is within scope of the HESEM validation boundary (GAMP 5 Cat 1). The fact that the
change is driven externally does not exempt it from control.

**Path**: Class B or A depending on whether the infra component is within a
validation pack (most are). IA includes Q26 (third-party component upgrade). Sub-
processor DPA list is reviewed (Q18) if the change involves a cloud service that
is listed as a sub-processor. Tenants are notified per DPA notification schedule
if the change could affect system availability or validated state.

### 9.5 Historical data correction

**Trigger**: a data quality issue is found in historical records (wrong value
written, migration introduced a systematic error, calibration offset discovered
retrospectively).

**WORM constraint**: historical evidence artifact records are WORM-locked and
cannot be edited. The correction mechanism is:
1. A data_correction record is created as a new evidence artifact, linked to the
   original record via `corrects_record_id`
2. The data_correction record carries the correct value, the reason for correction,
   evidence of the error, and the approval signatures
3. The data_correction is subject to the same retention floor as the original record
4. API consumers that need the correct value read through the correction layer:
   `GET /api/v1/evidence/{id}?apply_corrections=true`
5. The original record is never deleted; it is retained with its error as a
   permanent audit artifact with `correction_id` reference

This is a Class A or B change depending on whether the correction affects a
batch release, regulated decision, or risk assessment. The CR must document the
root cause and a CAPA (H8) for the process that allowed the error.

### 9.6 Regulated configuration change

**Definition**: a tenant-level configuration change whose effect is regulated —
for example, activating the IATF 16949 pack on a tenant; switching a device from
Class II to Class III risk classification; enabling ITAR controls; changing the
applicable jurisdiction list.

**Path**: automatically classified as Class A regardless of how trivial the
configuration change appears. The configuration flag controls entire regulatory
obligation sets; a one-click change can trigger a cascade of retention floor
changes, validation re-execution obligations, and approval chain expansions. Full
Class A lifecycle including QA impact analysis (Q16 on reversibility is critical
— can the tenant revert the config if the implications are larger than expected?)
and the appropriate pack sign-off (§6.4).

### 9.7 AI model continuous training update

**Trigger**: scheduled retraining cycle per L3 §6, or drift detection event per
L3 §7.

**Path**: if a PCCP is active and the retrain is within envelope → §9.2 simplified
path. If no PCCP or out-of-envelope: Class B CR with AI Lead as required approver
and L3 stage progression documented. Model card (EC-23) is updated. The retrain
evidence (EC-10) is attached. Shadow mode period (rollout pattern 7) is required
before promotion to advisory mode. Override rate (EC-24) monitoring window applies
post-promotion.

---

## 10. KPIs

```
KPI-CC-01  Change throughput by class
           Definition: count of CRs closed per class (A/B/C/D/E/F) per month
           Purpose: operational sizing; signals if Class D/F changes are
                    incorrectly absorbing Class A/B scope
           Target: no prescribed target; monitored for class distribution
                   anomalies (e.g., Class C as % of total rising while
                   regulated capability changes increase)

KPI-CC-02  Change cycle time by class
           Definition: median calendar days from S1 (CR opened) to S11
                       (CR closed) per class
           Target: Class A ≤ 90 days; Class B ≤ 60 days; Class C ≤ 30 days;
                   Class D ≤ 14 days; Class E ≤ 5 days (retroactive CTR)
           Alert: Class A > 120 days → Quality Director review (backlog risk)

KPI-CC-03  Impact analysis completeness rate
           Definition: % of Class A/B CRs where IA answers all required
                       questions (Q1–Q20 for A; Q1–Q16 for B) as verified
                       by peer review
           Target: 100%
           Alert: any miss → CAPA on IA process discipline

KPI-CC-04  Gate failure rate per gate
           Definition: % of CRs where each readiness gate (G1..G15) was
                       initially failed and required remediation before
                       re-check passed
           Target: monitored; no absolute target; upward trend in any
                   gate signals process gap
           Alert: G4 (validation evidence) failure rate > 10% → H8 CAPA

KPI-CC-05  Emergency CR retroactive CTR compliance rate
           Definition: % of Class E CRs that received retroactive CTR
                       and evidence within 5 business days
           Target: 100%
           Alert: any miss → immediate SEV-2 escalation + CAPA

KPI-CC-06  Rollback rate
           Definition: % of released CRs that transitioned to ROLLED_BACK
                       within the post-release monitoring window
           Target: ≤ 2% for Class A/B; any rollback triggers post-mortem
           Alert: Class A rollback → mandatory post-mortem per I3 format

KPI-CC-07  Effectiveness review completion rate
           Definition: % of Class A/B CRs that completed the effectiveness
                       review within the scheduled window (90 days for A;
                       60 days for B)
           Target: 100%
           Alert: < 90% → H8 CAPA; overdue effectiveness reviews surfaced
                  in H6 R14

KPI-CC-08  Class downgrade rate
           Definition: count of Class A→B or B→C downgrades per quarter;
                       % that had documented dual-approval justification
           Target: 100% of downgrades have documented justification
           Alert: any undocumented downgrade → audit finding
```

---

## 11. Failure modes

```
FM1   Change deployed to production without a CR
      Prevention: deployment pipeline checks for CR reference + APPROVED status
                  before release gating; check runs in CI/CD
      Detection:  deployment event in audit log without CR reference;
                  anchor reconciliation detects unexpected production change
      Recovery:   SEV-1 if regulated capability; retroactive CR opened;
                  IA and risk assessment completed; H8 systemic CAPA on
                  deployment gate process

FM2   Impact analysis understates scope; capability silently degraded post-deploy
      Prevention: IA peer review for Class A; automated regression test suite;
                  G7 gate
      Recovery:   Rollback per plan; widen IA scope; re-validate affected
                  capability; H8 CAPA on IA thoroughness; post-mortem per I3

FM3   Approver signs without reading (rubber stamp)
      Prevention: Attestation checkbox in approval UI; for Class A, the
                  approval UI requires the approver to explicitly navigate
                  to the IA and risk record before the sign button is active
      Recovery:   Subsequent audit finding; H8 CAPA on approval culture;
                  re-training for the approver on regulated approval obligations

FM4   Class downgraded under deadline pressure without dual approval
      Detection:  H3 audit review of class decision rationale; periodic
                  review of class distribution anomalies (KPI-CC-08)
      Recovery:   Re-class to correct class; full lifecycle re-executed from
                  S3 onward for the affected scope; H8 systemic CAPA;
                  compliance leadership review

FM5   Rollback plan untested and fails in production
      Prevention: G11 gate requires rollback dry-run attestation for Class A/B
      Recovery:   Manual recovery by engineering; RCA on rollback failure;
                  H8 CAPA; rollback procedure re-written and tested before
                  next Class A/B release

FM6   Effectiveness review skipped or never completed
      Prevention: CR cannot reach CLOSED without effectiveness review sign-off
                  for Class A/B (enforced by state machine guard)
      Recovery:   CR remains in POST_RELEASE_VERIFIED; H6 R14 surfaces;
                  H8 CAPA

FM7   Class E hotfix never receives retroactive CTR within 5 days
      Prevention: Blocking flag set at deploy time; CI/CD pipeline rejects
                  next deploy from the same engineering team if blocking flag
                  is active
      Recovery:   SEV-2 escalation; CTR completed as soon as personnel
                  available; H8 CAPA on emergency change discipline

FM8   Breaking API change released without deprecation window
      Prevention: API contract diff check in CI/CD (G3 for API changes);
                  schema compatibility tool runs before release
      Recovery:   Rollback or emergency fix deploy; RFC 9457 sunset headers
                  retroactively applied; customer / integration notification;
                  H8 CAPA on API governance

FM9   Retention class shortened without legal memo
      Prevention: Change control requires legal_memo_id reference when
                  proposed_retention_floor < current_retention_floor
      Recovery:   Restore original floor; H8 CAPA; legal review;
                  no deletion of records affected by erroneous shortening

FM10  Pack sign-off (QP/PRRC/DER) missed at release
      Prevention: G15a/G15b/G15c gates are hard stops in release pipeline
                  for pack-touched Class A/B changes
      Recovery:   Roll back; obtain sign-off; re-release; H8 CAPA;
                  for Pharma: QP retrospective release document if product
                  already shipped
```

---

## 12. Roles and authority (RACI)

```
FUNCTION          DL   EL   QL   CL   ValE  SRE  SecL  PL   QP   AIL  VPL
─────────────────────────────────────────────────────────────────────────────
Scope decision     R    C    C    C    -     -    C     -    -    -    R
Class decision     R    R    A    A    C     -    C     -    C    C    R
Impact analysis    R    A    C    C    R     C    C     C    C    C    R
Risk assessment    R    C    A    R    -     -    C     C    C    R    R
IA peer review     -    R    A    -    R     -    -     -    -    -    -
Approval (A)       A    A    A    A    -     -    -     -    A    A    A
Approval (B)       A    A    A    -    -     -    -     -    C    A    A
Approval (C)       A    A    -    -    -     -    -     -    -    C    R
Approval (D)       A    -    -    -    -     -    -     -    -    -    -
Validation         R    R    A    -    A     -    -     -    -    R    R
Readiness review   R    A    A    A    R     R    R     -    A    R    R
Release            -    A    A    A    -     A    -     -    -    -    -
Post-release ver.  R    A    A    -    R     A    -     -    -    R    -
Effectiveness rev. R    R    A    A    R     -    -     -    C    R    R
─────────────────────────────────────────────────────────────────────────────
DL=Domain Lead, EL=Eng Lead, QL=Quality Lead, CL=Compliance Lead,
ValE=Validation Engineer, SRE=SRE Lead, SecL=Security Lead,
PL=Privacy Lead, QP=Qualified Person/PRRC/DER (pack-specific),
AIL=AI Lead, VPL=Vertical Pack Lead
```

---

## 13. Cross-references

- **H1 §6** — horizon scan is a primary CR trigger source
- **H2** — validation lifecycle is invoked at S7; CTR depth per H2 tier
- **H3** — audit pack consumes all change records; audit types include
  change control compliance check
- **H4** — change_record (EC-16) class definition; all evidence produced by
  H7 is classified per H4
- **H5** — retention class changes governed here; H5 P8 mandates H7 CR for
  any retention floor reduction
- **H6** — periodic reviews (H6) consume CRs as input (R01, R02, R06); reviews
  emit CRs as output
- **H8** — CAPA findings produce CRs (H8 corrective action often requires a
  system change); CRs route to H8 for effectiveness tracking
- **H9** — risk assessment at S4 invokes H9; risk register updated post-change
- **L3** — AI model promotion and retraining are CRs; PCCP mechanics
- **E0** — API deprecation policy governs backward compatibility discipline
- **B6** — schema mode ladder governs DB schema migration safety
- **D7** — controlled document revision lifecycle handles Class F
- **I3** — incident resolution produces Class E / B CRs
- **I7** — security vulnerability management produces Class E CRs
- **C2** — ECO state machine aligns with H7 lifecycle for engineering changes
- **M5** — SLO directory checked at G8; SLO impact analyzed at Q10
- **M9** — cross-reference index links all H7 consumers

---

## 14. Decision phrase

```
S4-04_H6_H7_DEEP_UPGRADE_COMPLETE
```

After: load S4-05_H8_H9.md.
