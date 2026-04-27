# L1 — Human Authority Boundary (V10)

```
chapter_purpose:  define which regulated decisions humans MUST own even
                  if AI is more confident or faster; how the boundary is
                  enforced at three independent layers; how overrides are
                  captured to keep humans in genuine authority rather than
                  nominal authority; per-pack extensions through BD-36+;
                  edge cases, friction calibration, and failure modes
version:          V10
owner_role:       AI Lead with Compliance Lead and Quality Lead
sources:          EU AI Act 2024/1689 Art 14 (human oversight);
                  NIST AI RMF 1.0 GOVERN-2 + MANAGE-2.2;
                  NIST AI 600-1 GenAI profile §4 (human oversight);
                  FDA AI/ML SaMD Action Plan 2021 §C;
                  21 CFR 11.10(j) (electronic record accountability);
                  ISO/IEC 42001:2023 §8.4 (human oversight);
                  ISO 14971:2019 §7 risk control (human review);
                  ICH Q9(R1) §5 (quality risk management decision);
                  EU MDR 2017/745 Art 15 (PRRC accountability);
                  Anthropic + OpenAI red-team disclosures;
                  DeepMind AI safety taxonomy;
                  NIST AI 600-1 §5.2 (contestability + overrideability)
```

The Human Authority Boundary is the most important single rule in
HESEM's AI program. It states: **AI may never autonomously commit a
regulated decision, regardless of confidence, speed, cost, or
competitive pressure.** The boundary is not a posture choice; it is
enforced by three independent redundant layers, monitored continuously
in production, verified quarterly by red-team, and audited externally.
Any relaxation of the boundary requires a Class A change (H7) with
Compliance Lead + Quality Lead joint approval and is never permitted
during periods of regulatory scrutiny.

---

## 1. The boundary in plain language

The fundamental distinction separating AI-permitted activity from
AI-prohibited activity is not accuracy — it is authority.

```
AI MAY:                                    AI MAY NEVER:

Recommend N candidates                     Commit a regulated decision
Rank candidates by predicted outcome       Sign as a human approver
Score risk and surface the score           Alter or annotate an audit record
Cluster and summarize records              Adjust an evidence record value
Extract structured data from PDFs          Close a regulated workflow step alone
Draft text for human review                Bypass a workflow approval guard
Search and retrieve from corpus            Issue a command-bus mutation as
Translate (with reverse-translation          principal for any banned decision
  validation for regulated text)           Override a human override decision
Abstain ("I don't know") — this is         Escalate to autonomous action when
  always permitted and never penalized       confidence is high
Flag an anomaly or threshold breach        Perform a banned decision on behalf
Propose a question the human should ask     of a human who is "away" or "busy"
Score + calibrate + show uncertainty       Delegate a banned decision to another
                                             AI layer in a pipeline
```

Confidence is irrelevant to the boundary. If AI is 99.99% certain
that a lot should be released, the 21 CFR 211.192 batch release
decision is still a human decision, attributed to a human, signed
by a human. The boundary enforces **authority**, not accuracy. In
regulated manufacturing, the FDA, EMA, EU AI Act, and ISO 13485 all
require named human accountability for decisions with patient, consumer,
or environmental safety consequences. No AI-confidence level changes
this legal fact.

---

## 2. The 8 core banned regulated decisions (BD-1..BD-8)

The baseline set applies to all HESEM tenants regardless of vertical
pack, tier, or configuration. These 8 decisions meet all four criteria
for the banned set:
1. Required by regulation to be human-attributed.
2. Has direct potential for patient, consumer, or safety impact.
3. Cannot be confidently reversed by a subsequent action.
4. Has been a recurring failure mode in industry (multiple FDA 483s,
   EMA deficiency letters, ISO 13485 surveillance findings).

```
BD-1 — Batch / Lot Release for Shipment
  command:    BREL.approve_release; Pharma QP batch certification;
              MD device release; food lot release
  regulation: 21 CFR 211.192 (Pharma); EU GMP Annex 16 (QP); ISO
              13485 §8.3.4 (MD); 21 CFR 117.87 (Food)
  why banned: lot release is the last regulated barrier before unsafe
              product reaches patients or consumers. A false positive
              from AI (incorrect release recommendation) results in
              distributed unsafe product with no recall-recall barrier
              left. The FDA has cited AI-assisted auto-release in two
              recent 483 cycles.
  human path: BREL workspace → QP / Lot Release Manager e-sign →
              second-approver for Tier-1 lot (per H7 Class A)

BD-2 — Disposition of Nonconforming Material
  command:    NQCASE.dispose_accept; dispose_repair; dispose_scrap;
              dispose_return_to_vendor (RTV)
  regulation: 21 CFR 820.90 (MD); ISO 13485 §8.7; EU GMP 5.61;
              AS9100D §8.7 (Aero); IATF 16949 §8.7.1 (Auto)
  why banned: Accepting nonconforming material for use puts it into
              production. A false positive (AI recommends accept when
              material is actually non-conforming) propagates defects
              to product that may reach end users. Scrap decisions
              have financial irreversibility; incorrect scrap wastes
              material or, conversely, allows sub-standard material
              into the stream.
  human path: NQCASE workspace → QA reviewer e-sign → second sign
              where material class is safety-critical

BD-3 — CAPA Closure (including effectiveness verification)
  command:    CAPA.action_close; CAPA.effectiveness_pass
  regulation: 21 CFR 820.100 (MD); ISO 13485 §8.5.2; EU GMP §1.4
              CAPA element; IATF 16949 §10.2 (Auto)
  why banned: CAPA effectiveness verification confirms that a systemic
              problem no longer exists. An AI erroneously marking a CAPA
              effective perpetuates a systemic risk under the illusion
              it has been addressed. Regulators specifically verify that
              effectiveness checks are human-signed and evidence-backed.
  human path: CAPA workspace → Responsible Owner e-sign → QA
              independent verification e-sign

BD-4 — Controlled Document Release (Effectivity)
  command:    CDOC.release; version_increment; make_effective
  regulation: 21 CFR 820.40 (MD); ISO 13485 §4.2.4; EU GMP 4.1;
              AS9100D §7.5.3 (Aero); 21 CFR 117.315 (Food SSOPs)
  why banned: Releasing the wrong version of a work instruction,
              HACCP plan, or batch record template can instantly affect
              all running production against that procedure. Auto-release
              of a document that contains an error (introduced during
              AI-assisted drafting) would propagate that error to all
              subsequent manufacturing.
  human path: CDOC workspace → Author e-sign → Technical Reviewer
              e-sign → Release Authority e-sign

BD-5 — Engineering Change Order Approval
  command:    ECO.approve; design_change_approve
  regulation: 21 CFR 820.30(i) (MD design change); ISO 13485 §7.3.9;
              AS9100D §8.3.6 (Aero); IATF 16949 §8.3.6 (Auto)
  why banned: ECO approvals lock in design changes. An incorrectly
              approved ECO may introduce a safety issue into a cleared
              or approved product design. For Class III medical devices
              and DO-178C Level A software, even a minor software change
              can require new 510(k) or PMA supplement; autonomous ECO
              approval would remove the regulatory review barrier.
  human path: ECO workspace → Design Engineer e-sign → QA e-sign →
              Regulatory Affairs e-sign for scope-triggering changes

BD-6 — Training Record Certification / Qualification
  command:    TRAIN_RECORD.certify; operator_qualified
  regulation: 21 CFR 820.25 (MD); ISO 13485 §6.2; EU GMP 2.1;
              21 CFR 117.4 (Food HACCP team); AS9100D §7.2 (Aero)
  why banned: A falsely certified training record allows an untrained
              operator to perform a regulated procedure. If that procedure
              is a CCP monitoring check, QP batch review, or NADCAP
              special process, the result can be an undetected safety
              escape. Regulators specifically audit training qualification
              chains and require human-signed records.
  human path: TRAIN workspace → Training Supervisor e-sign → QA audit
              for regulated role qualifications

BD-7 — Supplier Qualification Decision
  command:    SUP_QUAL.qualify_decide; approved_supplier_list_add
  regulation: 21 CFR 820.50 (MD); ISO 13485 §7.4; EU GMP 7.1;
              IATF 16949 §8.4.1 (Auto); AS9100D §8.4.1 (Aero);
              21 CFR 1.500 FSVP (Food)
  why banned: Approving a supplier that should not be approved channels
              sub-standard or hazardous inputs into production. Food FSVP
              requires PCQI-signed hazard analysis before any foreign
              supplier is approved. Pharmaceutical active ingredient
              suppliers require GDPMD-equivalent verification. Aerospace
              NADCAP-required special processes require certified
              suppliers per AC7004 series.
  human path: Supplier workspace → Procurement + QA joint e-sign;
              for critical suppliers: PCQI / QP sign-off

BD-8 — Recall or Field Action Decision
  command:    RECALL.open; RECALL.escalate; field_corrective_action_open
  regulation: 21 CFR Part 806 (MD corrections); EU MDR Art 83-86
              (FSCA); 21 CFR §423 (Food RFR); 9 CFR 417 (USDA recall);
              NHTSA 49 CFR 573 (Automotive)
  why banned: A recall decision determines whether unsafe product is
              removed from the market. An AI that autonomously opens
              a recall (false positive) may cause unnecessary harm to
              manufacturer and supply chain. An AI that fails to open
              a recall when required (false negative) leaves unsafe
              product in consumers' hands. Either outcome is
              catastrophic and regulatory. The classification decision
              (Class I/II/III; voluntary vs mandatory) is a regulated
              determination requiring named human accountability.
  human path: Recall workspace → Recall Coordinator e-sign → Compliance
              Lead or QP / PRRC e-sign (BD-27 food / BD-8 generic)
```

---

## 3. Per-pack banned-decision extensions (BD-9..BD-36+)

The 8 baseline decisions form a floor. Each vertical pack adds
extensions specific to its regulatory framework. The combined set
is the operational banned-decision registry (BDR).

### J1 Pharmaceutical (BD-9..BD-12)

```
BD-9 — Annual Product Review (APR) / Annual Product Quality Review Signoff
  regulation: EU GMP §1.10.2; 21 CFR 211.180(e); ICH Q10 §3.2.2
  why: APR integrates batch data, complaints, deviations, stability
    data, and change control over a calendar year. Incorrect conclusion
    on process state could lead to missed process drift or systematic
    deviation. QP accountability under EU GMP is explicit.
  e-sig: QP (EU) or QA Director (US); second sign if adverse trend noted

BD-10 — Stability Data Conclusion (shelf life extension / revision)
  regulation: ICH Q1A-Q1E; 21 CFR 211.137/166
  why: Shelf life extension based on AI-trend-fitted data is advisory
    only. The conclusion that a product is stable to N months is a
    regulated claim on a marketed product. A false positive could mean
    patients receive degraded product.
  e-sig: QA / Regulatory Affairs + QP

BD-11 — Deviation Investigation Closeout
  regulation: EU GMP Annex 11 §13; 21 CFR 211.192; ICH Q9(R1) §5
  why: Closing a deviation investigation without a verified root cause
    allows the condition to recur. AI-suggested root cause is advisory;
    the qualified person must independently reach the root cause
    conclusion before closure.
  e-sig: QA Investigator + QA Manager (or QP for serious deviations)

BD-12 — Sterility Test Exception / Invalidation
  regulation: 21 CFR 211.167; USP <71>; EU Ph. Eur. 2.6.1
  why: Invalidating a failing sterility test requires documented
    investigation that the failure was a laboratory failure, not a
    manufacturing failure. Autonomous invalidation with no investigation
    would mask contaminated product.
  e-sig: QA Manager + QP; investigation record required
```

### J4 Medical Device (BD-13..BD-16)

```
BD-13 — Clinical Evaluation Report (CER) Signoff
  regulation: EU MDR 2017/745 Annex XIV; MDCG 2020-5/6/13; ISO 14155
  why: CER establishes the clinical benefit-risk balance for a device.
    AI-assisted literature search and safety data synthesis is advisory.
    The determination that benefit outweighs risk for a specific class
    is a clinical + regulatory conclusion requiring PRRC or clinical
    evaluator named responsibility.
  e-sig: Clinical Affairs Lead + PRRC (EU) or Regulatory Affairs (US)

BD-14 — PSUR / PMSR Conclusion (Medical Device)
  regulation: EU MDR Art 86; MDCG 2022-21; ISO 13485 §8.2.1
  why: PSUR conclusion on whether the benefit-risk profile remains
    favorable through the post-market surveillance period is a
    regulatory statement with direct market access implications.
    AI drafting of PSUR sections is advisory; the conclusion is human.
  e-sig: PRRC + QA Manager

BD-15 — Vigilance Reportability Decision
  regulation: EU MDR Art 87-88; EU IVDR Art 82-83; FDA 21 CFR 803;
              MDCG 2023-3 guidance
  why: Deciding whether a customer complaint, incident, or safety
    signal requires a vigilance report (MDR or SAE) has strict
    regulatory timelines (EU MDR: 24h for death / 2 days serious
    public health / 15 days serious incident; US MDR: 30 days).
    An AI false negative (decides not to report) can result in a
    PRRC criminal liability finding in the EU. An AI false positive
    (over-reports) burdens regulators. Neither is acceptable;
    human determination with PRRC sign is required.
  e-sig: PRRC + Vigilance Manager (for EU MDR reports)

BD-16 — Risk Acceptability Signoff (ISO 14971)
  regulation: ISO 14971:2019 §7; ISO/TR 24971:2020
  why: The conclusion that residual risk is acceptable per the
    manufacturer's risk acceptability criteria is the core safety
    claim on the device. AI risk scoring (probability × severity) is
    advisory. The acceptability decision — whether the benefit-risk
    ratio justifies the residual risk — is a human determination
    subject to ISO 14971 §7 and ultimately accountable to regulatory
    bodies under EU MDR Art 10.
  e-sig: Risk Manager + QA Director / PRRC
```

### J2 Automotive (BD-17..BD-19)

```
BD-17 — PPAP Submission Authorization
  regulation: AIAG PPAP 4th Edition; customer-specific requirements
              per IATF 16949 §8.3.4.4; OEM CSRs
  why: PPAP submission represents the supplier's documented declaration
    to the customer that the manufacturing process can consistently
    produce parts meeting the design record. An erroneous submission
    (missing elements, wrong sample size) creates a contractual and
    quality liability. AI can extract and validate PPAP elements from
    documents but cannot make the submission commitment on the
    supplier's behalf.
  e-sig: Quality Engineer + Customer Quality Manager

BD-18 — Production Trial Run (PTR) Release
  regulation: AIAG-VDA APQP 2nd Edition §4.7; customer-specific
              requirements (Ford, GM, Stellantis, Toyota PTR rules)
  why: PTR release authorizes the first production-level run after
    tooling qualification. Releasing a PTR based on partial data (AI
    analysis of incomplete run data) could mean production tooling
    with unresolved critical-to-quality characteristics is declared
    production-ready.
  e-sig: Quality Engineer + Manufacturing Engineer + Customer Quality
         approval where CSR requires

BD-19 — Customer Notification of Deviation (CND)
  regulation: IATF 16949 §10.2.3; customer CSR deviation notification
              rules; per specific Ford Q1 / GM BIQS requirements
  why: CND notifies the OEM customer that a deviation from engineering
    or control plan specifications exists in shipped product. Failure
    to send a required CND is a contractual breach and potential recall
    liability. Sending an incorrect CND (wrong lot range, wrong
    deviation class) damages the customer relationship. AI can draft
    the CND but cannot send it.
  e-sig: Quality Manager + Customer Quality Manager
```

### J3 Aerospace (BD-20..BD-25)

```
BD-20 — First Article Inspection (FAI) Signoff per AS9102
  regulation: AS9102C (First Article Inspection); AS9100D §8.7;
              customer FAI requirements; NADCAP FAI witness where applic
  why: FAI certification states that the first production article
    meets 100% of the drawing requirements. A false positive from
    AI analysis of FAI data would certify a non-conforming first
    article, potentially establishing a non-conforming baseline for
    all subsequent parts.
  e-sig: Quality Engineer (AS9102 Form 1/2/3) + Quality Manager

BD-21 — Counterfeit Material Avoidance Attestation
  regulation: AS9120B; AS5553C; DFARS 252.246-7007 (CMDI clause);
              NASA-STD-6016
  why: Counterfeit avoidance attestation certifies that suspect/
    counterfeit material has not been incorporated. AI-18 can identify
    risk indicators but cannot provide the attestation. If counterfeit
    material enters flight hardware, the consequence is potential
    catastrophic failure.
  e-sig: Quality Engineer + Program Quality Manager;
         GIDEP submission (BD-22) if confirmed counterfeit

BD-22 — GIDEP Alert / Failure Experience Submission
  regulation: GIDEP Operating Procedures; DFARS 252.246-7007;
              AS5553C §4.7
  why: GIDEP submission is a government/industry database alert that
    affects other users of the same part. An incorrect GIDEP
    submission (false positive) damages a supplier's reputation
    industry-wide and cannot be undone quickly. An AI-generated draft
    requires human review and authorization before submission.
  e-sig: Quality Manager + Regulatory representative

BD-23 — Service-Life-Limited Part Disposition
  regulation: FAR 43.303; FAA AD series; EASA Part-145; AS9100D §8.7
  why: Life-limited parts have mandatory retirement lives. An AI that
    incorrectly calculates remaining life could result in a part
    remaining in service past its airworthiness limit — a catastrophic
    failure mode for flight safety.
  e-sig: Quality Engineer (life-limit calculation) + Part-145 certifying
         staff or DAR (design approval representative)

BD-24 — ITAR Controlled Access Grant (Deemed Export)
  regulation: 22 CFR Part 120-130 (ITAR); EAR 15 CFR 730-774;
              DDTC jurisdiction
  why: Granting a foreign national access to ITAR-controlled technical
    data is a deemed export. Unauthorized exports violate the Arms
    Export Control Act with criminal penalties. AI cannot determine
    with sufficient certainty whether a given disclosure constitutes
    a controlled export; the determination requires a legal + ITAR
    compliance review.
  e-sig: ITAR Compliance Officer + Legal Counsel (where required)

BD-25 — Airworthiness Directive Compliance Closure
  regulation: 14 CFR Part 39 (FAA); EASA Part-M; EASA AD series;
              CAA equivalents
  why: Closing an AD compliance record represents a declaration that
    mandatory airworthiness requirements have been completed. An AI
    that incorrectly marks an AD as complete without verified
    maintenance action evidence could lead to an aircraft remaining in
    service with an unaddressed airworthiness unsafe condition.
  e-sig: Part-145 Certifying Staff or Authorized Release Certificate
         holder; independent review for repetitive inspections
```

### J5 Food (BD-26..BD-28)

```
BD-26 — HACCP Plan Reauthorization / Critical Limit Change
  regulation: 21 CFR 117.170 (FSMA Part 117); Codex CXC 1-1969 §7;
              21 CFR 113.83 (LACF scheduled process change)
  why: See J5 §5 for full rationale. Critical limits are the primary
    defense against food safety hazards. AI-09 may suggest a CL may
    be unnecessarily tight; PCQI must review and initiate formal
    reanalysis before any change is made.
  e-sig: PCQI + second authorized food safety reviewer

BD-27 — FSMA Recall Classification (Class I/II/III)
  regulation: 21 CFR §7.40-7.59; FSMA §423 RFR; FSIS 9 CFR recall
  why: See J5 §5 for full rationale. Classification determines severity
    of public notification and regulatory response. Under- or over-
    classification both have serious consequences.
  e-sig: Recall Coordinator + PCQI (or Food Compliance Lead)

BD-28 — Food Contact Substance Regulatory Exception Approval
  regulation: 21 CFR 170-180 (FCN); EU 1935/2004; EU 10/2011
  why: See J5 §5 for full rationale. Unauthorized food contact material
    can migrate into food; regulatory determination requires documentary
    evidence and human legal / regulatory review.
  e-sig: Regulatory Affairs + QA Director
```

### Cyber / Privacy (BD-29..BD-32)

```
BD-29 — Privileged Access Grant (PAM)
  regulation: ISO/IEC 27001 A.9.4; SOC 2 CC6.3; CMMC AC.3.017
  why: Granting break-glass or privileged access to a system by AI
    without a quorum of human approvers bypasses the Principle of
    Least Privilege. An AI that grants access based on a request it
    cannot fully authenticate enables insider threat or credential
    compromise escalation.
  e-sig: Security Lead + System Owner (+ Tenant Admin for tenant scope)

BD-30 — Cryptographic Key Export / Escrow
  regulation: ISO/IEC 27001 A.10.1; FIPS 140-3; NIST SP 800-57
  why: Exporting a root key, CMK, or tenant encryption key enables
    decryption of all data protected by that key. This is a one-way
    risk event that cannot be undone if the key is compromised.
    Even for escrow purposes, key export requires multiple-custodian
    quorum under cryptographic key ceremony protocols.
  e-sig: Security Lead + Key Custodians (minimum 2-of-N quorum)

BD-31 — Sub-Processor / Third-Party AI Provider Onboarding
  regulation: GDPR Art 28; EU AI Act Art 28 (deployer obligations);
              HIPAA BAA requirement; NIS2 §21
  why: Onboarding a new sub-processor introduces data processing under
    the tenant's DPA scope without tenant consent. A sub-processor
    with inadequate security controls could expose regulated personal
    data, AI training data, or audit chain data. The DPA addendum
    requires human negotiation and legal review.
  e-sig: Privacy Lead + Legal Counsel + Compliance Lead

BD-32 — Cross-Border Personal Data Transfer Authorization
  regulation: GDPR Art 46 (SCC/BCR/adequacy decision); LGPD Art 33;
              PDPA Thailand; PIPL China Art 38-40
  why: Cross-border transfer of regulated personal data (PDMP, patient
    data, employee data) requires an appropriate transfer mechanism
    per each jurisdiction. An AI that routes data to a new region
    without a valid legal basis for transfer could generate a personal
    data breach notification obligation.
  e-sig: Privacy Lead + Legal Counsel (for new transfer mechanism);
         DPO notification where required by regulation
```

### General Operations (BD-33..BD-36)

```
BD-33 — Tenant Offboarding (data deletion / export authorization)
  regulation: GDPR Art 17 (erasure); CCPA / CPRA §1798.105; contract
              term + SLA offboarding clause; H5 retention floors
  why: Tenant offboarding initiates deletion of all tenant data or
    export to tenant and subsequent deletion. Erroneous triggering
    of offboarding for an active tenant is irrecoverable if WORM
    protections are bypassed. Per H5, certain data must be retained
    after offboarding for regulatory periods; autonomous deletion
    could violate those floors.
  e-sig: HESEM Account Manager + Compliance Lead + Tenant Admin (triple)

BD-34 — Retention Class Downgrade or Deletion-Window Shortening
  regulation: H5 retention catalog; per-pack regulatory retention
              floors (21 CFR 211.188: pharmaceutical 1 year / expiry;
              EU GMP II: 5+ years; FSMA §204: 2 years; AS9100: 10 years)
  why: Shortening the retention period for a record class below the
    regulatory floor can result in records being deleted before they
    are legally required to exist. An audit five years later may
    find no records and trigger enforcement action.
  e-sig: Compliance Lead + Legal Counsel + Data Governance Lead

BD-35 — Audit Chain Anchor Cadence Change
  regulation: H5 §4; 21 CFR 11.10(e) (audit trail); EU GMP Annex 11 §9
  why: The audit chain anchor cadence determines how frequently the
    WORM-anchored Merkle state is committed. Extending the cadence
    interval widens the window in which records could be tampered with
    before detection. Any change to this cadence must be a regulated
    decision with human accountability.
  e-sig: Security Lead + Compliance Lead

BD-36 — Modification of the Banned-Decision Registry (this list)
  regulation: HESEM governance; all standards listed above
  why: The BDR itself is a meta-regulated artifact. An AI that removes
    a banned decision from the list removes a regulatory protection
    without human authorization. Changes to the BDR are Class A
    changes under H7, requiring Compliance Lead + Quality Lead joint
    approval.
  e-sig: Compliance Lead + Quality Lead (Class A quorum per H7)
```

The registry is exhaustive at this baseline. Tenants may add to the
BDR per their internal QMS requirements. They cannot remove from the
baseline set.

---

## 4. The triple-defense architecture

A single enforcement layer is insufficient because each individual
layer has known failure modes. HESEM uses three fully independent
layers, each capable of blocking a banned-decision attempt by itself.
The three layers operate at different stages (build, runtime, audit)
ensuring that a defect in any one is compensated by the other two.

### 4.1 Layer 1 — CI / Static enforcement (build-time)

```
MECHANISM:
  All command-bus handler registrations are scanned by a CI policy
  tool at PR merge time. The tool maintains the BDR (BD-1..BD-36+)
  as a JSON artifact. For each banned-decision command, it verifies
  that no handler in the handler registration tree accepts a principal
  of type ai_advisory_annotation or any alias.

IMPLEMENTATION DETAILS:
  - Policy tool: HESEM-specific static analyzer, open to inspection
    in CI config (never closed-source)
  - BDR JSON is version-controlled; changes to BDR trigger CI policy
    rebuild
  - Scan coverage: command handlers + event-sourced aggregate
    apply() methods + direct mutation APIs
  - False-positive handling: known safe AI-principal paths are
    explicitly whitelisted with mandatory code-review approval

FAILURE MODES COVERED:
  - Developer refactor accidentally routes AI principal through
    banned-decision handler
  - New feature adds a new command that implements a banned decision
    without registering it in BDR

FAILURE MODES NOT COVERED:
  - Runtime composition where the command is constructed dynamically
    at runtime and bypasses the registered handler route
  - Sub-processor that operates outside HESEM command bus

EVIDENCE EMITTED: CI run artifact (pass/fail); policy run logs
```

### 4.2 Layer 2 — Runtime middleware (request-time)

```
MECHANISM:
  Every mutation routed through the HESEM API gateway and internal
  command bus passes through the AI Authority Middleware. The
  middleware:
    Step 1: Read actor.kind from the authenticated session token
            (human / ai_advisory / system / external_service)
    Step 2: Read the command type and look up BDR membership
    Step 3: If actor.kind ∈ {ai_advisory, ai_service_principal}
            AND command ∈ BDR → REJECT with RFC 9457 problem detail
              {type: "urn:hesem:forbidden:ai-banned-decision",
               status: 403,
               detail: "AI principal may not commit <BD-N>",
               instance: <request_id>}
    Step 4: Log the attempt to EC-22 (access audit record)
            regardless of outcome (pass or block)

IMPLEMENTATION DETAILS:
  - Middleware is a single synchronous chain position; cannot be
    bypassed by routing to a different API path
  - BDR membership cache TTL: 60 seconds (any BDR change takes
    effect within 1 minute in runtime)
  - Actor kind is immutable within a session token; AI actors
    cannot self-elevate to human kind mid-session

FAILURE MODES COVERED:
  - Dynamic composition where command type is determined at runtime
    (covered because actor.kind is checked, not the path)
  - Sub-process within HESEM that bypasses handler registration
    but uses the command bus

FAILURE MODES NOT COVERED:
  - Bug within the middleware itself
  - Infrastructure bypass (direct database write)
  - Sub-processor system operating outside the bus

EVIDENCE EMITTED: EC-22 (access_audit) per transaction
```

### 4.3 Layer 3 — Offline integrity audit (audit-time)

```
MECHANISM:
  A nightly (configurable to hourly for Tier-2 features) offline
  job scans the OTG event log for the prior period. It queries for:
    SELECT * FROM otg_events
    WHERE principal_kind = 'ai_advisory_annotation'
    AND event_subject IN (BDR command set)
  Expected result: zero rows.

  Any non-zero result triggers:
    - SEV-1 incident (per I3)
    - Scope halt: new mutations blocked on affected command scope
      until investigation complete
    - H8 CAPA: root cause analysis of how both Layer 1 and Layer 2
      were bypassed
    - Compliance Lead notification within 1 hour
    - Regulator notification if applicable per H1 §3 windows

IMPLEMENTATION DETAILS:
  - Job runs as a separate service principal with read-only access
    to the OTG event log
  - Job report is WORM-anchored in the audit chain
  - Job health is monitored: missed run → SEV-2 within the
    monitoring gap window
  - False positives (query returns rows that are benign) are
    investigated per SEV-1 discipline even if ultimately benign

FAILURE MODES COVERED:
  - Any combination of Layer 1 + Layer 2 bypasses, regardless of how
    the banned decision was committed
  - Infrastructure-level bypass (direct DB write still appears
    as an OTG event if OTG is written transactionally)

FAILURE MODES NOT COVERED:
  - Tampered OTG event log itself; the audit chain anchor detects
    this separately via Merkle inconsistency
  - Sub-processor operating entirely outside HESEM infrastructure

EVIDENCE EMITTED: nightly report (WORM-anchored); SEV-1 incident
                  if anomaly detected
```

### 4.4 Cross-layer monitoring

A lightweight detector continuously monitors the health of all three
layers:

```
DETECTION POINTS:
  - CI policy scan: last run timestamp + result; if CI has not run
    in > 24h on a protected branch → alert
  - Runtime middleware health probe: responds to /health endpoint;
    absence of heartbeat > 60s → SEV-2
  - Offline integrity job: last run timestamp; if > configured cadence
    × 1.5 → SEV-3 alert; scheduled maintenance window exempted
  - BDR version coherence: CI policy BDR and runtime BDR must match;
    mismatch → alert + deploy lockout

Any detector failure routes to SEV-2 minimum (not SEV-3) because
a failed detector removes a layer of defense, which is itself a
security event.
```

---

## 5. Override capture and evidence chain

Override capture exists for two independent purposes: regulatory
audit trail (regulators must see that humans actually exercised
authority, not just nominally approved AI output) and training signal
(override rate per feature is a leading indicator of AI quality).

```
EVENT                                    RECORD CREATED / STORED

Advisory shown to user (any feature)    EC-25 (advisory_render):
                                          advisory_id, model_id,
                                          model_version, feature_id,
                                          tenant_id, user_id,
                                          confidence_score, confidence_tier,
                                          top_rationale[], counter_evidence[],
                                          linked_record_ids[], prompt_version,
                                          timestamp, ai_principal_kind

Human agrees with advisory              No extra record required.
                                          EC-25 remains; decision
                                          record attributes human
                                          as principal (not AI).

Human disagrees with advisory           EC-24 (override_record):
                                          advisory_id (links to EC-25),
                                          feature_id, user_id,
                                          original_advisory,
                                          human_decision,
                                          rationale_text (mandatory;
                                            minimum 20 characters),
                                          elapsed_time_ms,
                                          second_reviewer_id (if quorum),
                                          timestamp

Human abstains (no AI consultation)    EC-25 with advisory_shown: false;
                                          human decision record does not
                                          reference an advisory; AI logs
                                          nothing

AI abstains (no answer found)           EC-25 with ai_abstained: true;
                                          abstain_reason logged; human
                                          proceeds without AI input;
                                          human decision record stands
                                          independently

Banned-decision attempt blocked         EC-22 (access_audit):
                                          outcome: blocked,
                                          actor_kind: ai_advisory,
                                          command: BD-N name,
                                          layer_blocked_at: 1/2/3,
                                          timestamp
```

Override rate per feature is computed daily:
  override_rate = count(EC-24 for feature) / count(EC-25 for feature where advisory_shown = true)

Target override rate bands are feature-specific (declared in L2
governance contract). Sustained override rate ≥ 25% triggers
shadow-mode + retraining review (per L3 §5).

Override directional correctness is monitored separately:
  - For decisions with eventual ground truth (e.g., root cause
    confirmed by investigation): was the human's override correct?
  - If human overrides turn out to be correct at high rate → the
    AI model is systematically wrong → retrain
  - If human overrides turn out to be wrong at high rate → possible
    rubber-stamp-then-override pattern; L6 (quality) investigation

---

## 6. Anti-rubber-stamp friction calibration

A nominally compliant human who clicks "approve" without reading is a
regulatory failure as serious as an autonomous AI commitment. The
Human Authority Boundary requires genuine exercise of judgment, not
mere signature presence. HESEM implements the following controls:

```
CONTROL                        IMPLEMENTATION                 VALIDATED BY

Rationale text requirement     Override + high-risk approvals   L4 probe
                               require free-text rationale;     (LLM09 overreliance
                               minimum 20 chars; typing rate    calibration probe)
                               monitored for paste-paste

Confidence transparency        Advisory always shows:           H3 audit of
                               - Confidence tier (HIGH/MED/LOW)  advisory renders
                               - Top 3 supporting reasons         (sample)
                               - Top 1-2 counter-reasons

Counter-evidence obligation    Every Tier-2 advisory must        L4 LLM09 probe
                               surface at least one reason       verifies this field
                               that argues against the           populated
                               recommendation

Time-on-task monitoring        Decision time for high-risk       Privacy-reviewed;
                               advisories is logged. Very short  data not used for
                               decisions (< 3s for T2) flagged   punishment, only
                               for periodic QA review            aggregate QA

Periodic paired review         1% of approved T2 advisories     H6 periodic review
                               are sampled and re-reviewed by    function
                               an independent reviewer.
                               Consistent agreement = normal;
                               consistent agreement with no
                               review time = suspect.

Quorum escalation              Any advisory where AI confidence  Automated; no
                               is LOW or where the feature's     human override
                               calibration_delta exceeds         of quorum trigger
                               threshold requires a second
                               human reviewer before commit

Session re-authentication      For BD-1 (batch release) and      E7 auth module
                               BD-15 (vigilance), the approval   integration
                               step requires fresh auth
                               (max session age before sign: 30
                               minutes; session age checked at
                               sign time)
```

Friction calibration is itself a validated capability. The calibration
tuning (text length, quorum thresholds, sample rates) is a Class B
change per H7, reviewed annually for effectiveness.

---

## 7. Banned-decision attempt logging

Every blocked attempt is treated as a security + compliance event,
not as a routine API error:

```
STAGE                        RECORD FORMAT AND ROUTING

CI scan flags violation      PR/MR blocked; build artifact records
                              policy failure; engineering alert sent;
                              tracked in sprint backlog until resolved

Runtime middleware blocks    EC-22 (access_audit): actor, command,
                              principal_kind, blocked_layer, timestamp;
                              alert to AI Lead + Security Lead for
                              first occurrence per day per feature;
                              subsequent occurrences in 24h aggregated

Offline job detects          SEV-1 incident (I3); immediate scope halt;
                              EC-22 bundle; H8 CAPA opens automatically;
                              Compliance Lead + AI Lead notified within
                              1h; regulator notification per H1 §3 if
                              banned decision may have been committed

Quarterly review of log      Blocked-attempt pattern analysis:
                              - Is a feature repeatedly attempting
                                banned routes? → re-design review
                              - Are specific users driving attempts?
                                → training + UX review
                              - Is a sub-processor generating
                                attempts? → BD-31 re-evaluation
```

---

## 8. Edge cases at the boundary

The following are documented resolved edge cases; each represents a
real ambiguity that occurred in industry:

```
CASE                              RESOLUTION

Human approves by clicking         Friction calibration (§6) applies:
advisory recommendation without    rationale required; time logged;
reading; "approve" button          periodic paired review detects
requires no thought                pattern; this is a rubber-stamp
                                   pattern, not a boundary violation.
                                   The decision is human; the quality
                                   control is friction calibration.

Human instructs AI to "decide for  Request rejected at application
me" on a banned decision           layer: AI responds "I cannot commit
                                   this decision; I can provide a
                                   recommendation for your review."
                                   EC-25 records the advisory.

Two AI agents in a pipeline:        Regardless of chain depth, the
Agent A recommends; Agent B         actor.kind for the commit must be
reviews and "approves" a banned     human. The runtime middleware
decision                            checks actor.kind at the command
                                    boundary. An AI actor cannot
                                    impersonate a human actor.

AI advisory shown; human agrees     The decision is human. The EC-25
→ human commits decision            record documents AI input. No
                                    banned-decision violation; the
                                    human signed the commit.

AI auto-classifies incident         Permissible advisory activity
severity in a ticket                up to the point where severity
                                    drives a BD. E.g., AI classifying
                                    a complaint as "potentially
                                    reportable (AI-19)" is advisory.
                                    The reportability decision (BD-15)
                                    requires human re-confirmation.

AI finds no supplier qualification  AI abstains (EC-25 with abstained:
evidence and would normally         true). Human must then make the
recommend rejection (BD-7)          qualification decision without AI
                                    input. No commitment is blocked
                                    here; the abstention is correct
                                    behavior.

Tenant config allows AI to          Configuration not accepted: tenant
approve documents                   cannot configure below the floor.
                                    Configuration validator rejects
                                    the tenant's config attempt. Error
                                    logged per I8.

Emergency recall urgency; AI        Regulated decision path still human.
completes the classification        HESEM emergency path (per E7 +
while human is unavailable          Class E change in H7) enables a
                                    qualified substitute to sign within
                                    a shorter time window. AI advisory
                                    informs the substitute. AI does not
                                    sign.

AI updated mid-decision flow:       Decision uses the AI version frozen
user started a review session       at advisory render time (advisory_
with model v2.4.1; model            version captured in EC-25). No
upgraded to v2.4.2 mid-session      advisory recomputed mid-session.
                                    Model upgrade is Class B change
                                    (H7); session continuity is
                                    preserved.

Human approves with stale           E7 session re-authentication check
authentication token                at signature time: session age > 30
(walked away)                       minutes for BD-1/BD-15 requires
                                    re-auth. Stale token rejected; user
                                    re-authenticates and re-reviews.

AI training data included past      Training data provenance check (L3
human decisions; model has          S2 gate) removes prohibited training
"learned" specific human signer     data. Model cannot impersonate a
preferences                         human signer. Signer patterns are
                                    redacted from training data per
                                    privacy policy.

Vendor AI product integrated        Vendor AI operates as a sub-processor
via API claims it can make          (BD-31); the integration contract
regulated decisions in their        must include a representation that
system that feeds HESEM             vendor AI will not commit banned
                                    decisions in HESEM scope. Violation
                                    of this representation is a BD-31
                                    incident.

AI summary of batch data            The summary is advisory (EC-25).
shown in QP batch release screen    The QP's release act is human
                                    (BD-1). The workflow is designed
                                    so the summary aids review but
                                    cannot trigger the commit.

CAPA root cause suggested by AI     The suggestion is EC-25 advisory.
is added to the CAPA record         Investigation outcome + root cause
verbatim without investigation      determination is human (BD-3 closure).
                                    The rubber-stamp control (§6)
                                    requires rationale text from the
                                    CAPA owner affirming the root cause
                                    was verified.
```

---

## 9. Customer-side configuration of the boundary

Tenants operate within the following constraints:

```
CANNOT CONFIGURE (floor, enforced by validator + CI):
  - Removal of any BD-1..BD-36 from the operational BDR for their tenant
  - AI-as-principal for any banned decision
  - Reduction of mandatory rationale text below 20 characters
  - Elimination of counter-evidence display

CAN CONFIGURE (per tenant, per I8):
  - Addition of tenant-specific banned decisions (BD-37+) beyond baseline
  - Tightened friction: longer rationale, second-person quorum for any decision
  - Confidence threshold at which advisory is shown (≥ platform floor)
  - Per-feature kill switch (disable a feature entirely for their tenant)
  - Override-evidence requirement (can require more than minimum)
  - Which features are enabled by default at tenant activation

TENANT CONFIGURATION IS ITSELF REGULATED:
  Any change to a tenant's AI configuration is a Class B change per H7.
  The change is recorded in the AI governance ledger (L3 §10).
  Tenant Admin must e-sign the configuration change; Compliance Lead
  notification if the change affects a BD-adjacent feature.
```

---

## 10. End-user communication of AI advisory status

When any advisory is displayed in a HESEM UI surface:

```
MANDATORY DISPLAY ELEMENTS:
  1. Source badge: "AI Suggestion" + model display name + version
  2. Confidence tier: HIGH / MEDIUM / LOW / (hidden if NO-ANSWER)
  3. Rationale: top 3 supporting reasons (from EC-25 rationale array)
  4. Counter-evidence: at least 1 reason arguing against (for T2)
  5. Linked records: list of records AI considered (resolvable)
  6. Action options clearly labeled:
       [Accept] [Override] [Defer] [Recompute]
  7. Boundary disclosure: "This recommendation requires your review.
     The final decision is yours and will be attributed to you."
  8. For Pharma/MD: regulatory transparency text as required by
     EU AI Act Art 13 + FDA AI/ML Action Plan guidance

CONDITIONAL DISPLAY ELEMENTS:
  9. For Tier-2 advisory on banned-decision-adjacent workflow:
       [!] This decision cannot be made by AI. You are the decision maker.
  10. For LLM-grounded advisory: citation list with "view source" links
  11. For LOW confidence: orange banner "Low confidence — review with care"
  12. For NO-ANSWER: "No AI suggestion available. Proceed with your judgment."

PROHIBITED DISPLAY:
  - Any wording that implies AI is making the decision
  - Any wording that frames override as "correcting the AI"
    (it is not a correction; it is the human's authority)
  - Any UI that makes "Accept AI" the default button style
    (both Accept and Override must have equivalent visual weight)
```

---

## 11. Failure modes

```
FM1 — AI principal accidentally added to banned route (code regression)
  Detection: Layer 1 catches at CI (most likely); Layer 2 at runtime;
             Layer 3 in nightly audit
  Severity: SEV-1 if reaches production; SEV-3 if caught at CI
  Recovery: Immediate rollback of PR; root cause in CI policy + H8 CAPA;
            check whether any banned decision was committed in window;
            notify Compliance Lead; if committed, regulator notification
            per H1 §3

FM2 — Override-capture record not created (UI bug suppresses EC-24)
  Detection: EC-24 rate drops statistically vs EC-25 rate for a feature;
             Layer 3 nightly integrity check on override rate
  Severity: SEV-3 (regulatory evidence gap)
  Recovery: Bug fix in UI; backfill attempt for uncaptured overrides
            from session logs where available; H8 CAPA on EC-24
            evidence capture discipline

FM3 — Systematic rubber-stamp pattern (very fast approvals)
  Detection: Time-on-task monitoring in §6; paired review surfaces;
             L4 overreliance probe (LLM09)
  Severity: SEV-4 (quality issue, not immediate safety)
  Recovery: Friction calibration review per §6; UX redesign;
            targeted training for affected users;
            H8 CAPA if systematic

FM4 — AI confidence calibration drift (feature is overconfident)
  Detection: Calibration delta per L3 §4 drift monitoring
  Severity: SEV-5 if calibration delta < 10%; SEV-3 if > 20%
  Recovery: Retrain trigger per L3 §5; feature confidence display
            updated with caveat; friction temporarily increased

FM5 — Tenant configures below floor (configuration bypass)
  Detection: Configuration validator rejects; if not: Layer 2 runtime
             enforces regardless; Layer 3 detects discrepancy
  Severity: SEV-2 (compliance violation for tenant)
  Recovery: Configuration rollback; tenant notification + remediation;
            H8 CAPA on configuration validator

FM6 — Banned-decision registry (BDR) change without proper change control
  Detection: BDR version check in CI policy; H7 change record required;
             H3 audit detects stale or inconsistent BDR
  Severity: SEV-2 (removes a regulatory protection without authorization)
  Recovery: BDR rollback; H7 Class A change opened retroactively;
            Compliance Lead + Quality Lead joint review

FM7 — Vertical pack BDR extension not loaded when pack is enabled
  Detection: Pack toggle automatically loads pack BD extension; if not:
             Layer 2 runtime does not enforce pack-specific BDs; H6
             periodic review checks coherence
  Severity: SEV-3 per missing BD
  Recovery: Pack extension loaded immediately; retroactive check on
            any decisions made during the gap period; H8 CAPA

FM8 — Override evidence (EC-24) lost in disaster recovery event
  Detection: H5 WORM + backup integrity checks; restore + reconcile
             per I4 backup recovery runbook
  Severity: SEV-3 (evidence integrity question for affected period)
  Recovery: Restore from most recent WORM backup; reconcile against
            OTG event log; document gap in incident record per I3

FM9 — AI agent in autonomous pipeline reaches banned route via plugin
  Detection: Layer 2 middleware: agent actor.kind = ai_service_principal
             → blocked; Layer 3 if somehow passed
  Severity: SEV-1 if reaches commit; SEV-3 if blocked
  Recovery: Plugin allowlist policy review; BD-31 (sub-processor
            onboarding) re-evaluated for offending integration;
            H8 CAPA on agent plugin governance

FM10 — Human approval with stale authentication token (session timeout)
  Detection: E7 session age check at signature time; token rejected
             before commit; user sees re-auth prompt
  Severity: SEV-5 (user friction, not a safety issue; decision not
             committed with stale token by design)
  Recovery: User re-authenticates; review resumes; no H8 CAPA unless
            session management failure was a bug (not user behavior)

FM11 — Sub-processor AI system commits banned decision outside HESEM bus
  Detection: Layer 3 offline audit + upstream reconciliation; may not
             be detected until integration audit or tenant complaint
  Severity: SEV-1 if banned decision committed
  Recovery: Immediate sub-processor integration halt; BD-31 incident;
            H8 CAPA; regulator notification per H1 §3 if applicable;
            legal review of DPA / integration agreement
```

---

## 12. BDR governance and audit cycle

The banned-decision registry is a living document governed by the same
change control discipline as the most critical product documents.

### 12.1 Change classification for BDR modifications

```
ADD a new banned decision (new BD-N):
  → Class A change per H7 (Compliance Lead + Quality Lead joint approval)
  → Rationale required: which regulation demands human attribution?
    which industry incident prompted this addition? what is the
    harm model if AI committed this autonomously?
  → Vertical pack extensions: pack lead + QP / PRRC proposes;
    Compliance Lead + Quality Lead approves
  → CI policy BDR JSON updated in same PR as change record; no
    separate deployment allowed

REMOVE a banned decision:
  → Class A change per H7 (requires external regulatory counsel review
    for any baseline BD-1..BD-8; Compliance Lead + Quality Lead + Legal)
  → Removal of a pack extension also Class A
  → Cannot be performed during a period of active regulatory inspection,
    Warning Letter response, or post-incident corrective action where the
    BD is implicated
  → Mandatory review: does removing this BD change the EU AI Act risk
    class of any feature? If yes, re-classification required.

MODIFY a banned decision's scope:
  → Class B change per H7 if scope is narrowed (safer direction)
  → Class A if scope is broadened (adds new commands to the banned set)

CONFIGURATION CHANGE for tenant (add tenant-specific BD):
  → Class B change per H7; tenant AI governance record updated;
    Tenant Admin e-sign; Compliance Lead notification
```

### 12.2 BDR quarterly review

The full BDR is reviewed quarterly as part of the H6 periodic review:

```
AGENDA ITEMS:
  - New regulations in the horizon scan (H1 §6): do any require new BDs?
  - Industry incidents in the period: did any AI autonomous action in
    the industry create a safety event that our BDR doesn't cover?
  - OWASP LLM Top 10 + MITRE ATLAS updates: do any new attack patterns
    touch banned-decision boundaries?
  - Override rate analysis per BD-adjacent feature: if overrides are
    uniformly low for a feature adjacent to a BD, is the human actually
    reviewing or rubber-stamping?
  - Blocked attempt log: what patterns emerged in the period?
  - Sub-processor changes: did any new sub-processor introduce
    AI capabilities that touch BD routes?

OUTPUT: signed BDR review record (EC-14 equivalent in AI governance
        ledger); action items opened as H7 CRs if changes needed
```

### 12.3 Cross-tenant BDR baseline protection

Multiple tenants share the HESEM platform infrastructure. The BDR
baseline (BD-1..BD-36) applies to all tenants. Tenant A cannot
configure the BDR in a way that weakens tenant B's protections (which
would never be an option anyway, as each tenant's configuration is
scoped). The platform-level enforcement (Layers 1-3) applies uniformly
across all tenants regardless of tenant configuration.

Tenant-additive extensions (BD-37+) are scoped to the tenant that
defined them; they do not affect other tenants. This is enforced by
tenant scope in the runtime BDR lookup.

### 12.4 Integration with EU AI Act high-risk AI obligations

For HESEM AI features classified as high-risk under EU AI Act Annex III
(AI-18, AI-19, AI-20 as the highest-concern examples):

```
Article 14 — Human oversight measures:
  Obligation: high-risk AI systems must be designed so that natural
  persons can effectively oversee the system's operation.
  HESEM implementation: BD-N prevents commitment; override capture
  (EC-24) provides evidence of oversight; friction calibration
  prevents nominal compliance; time-on-task monitoring detects
  failure to exercise genuine oversight.

Article 13 — Transparency and provision of information:
  Obligation: high-risk AI systems must be transparent and provide
  sufficient information to deployers and users.
  HESEM implementation: advisory display elements (§10) include model
  source, confidence, rationale, counter-evidence, and linked records.
  EC-25 advisory_render stores all these fields for retrospective audit.

Article 15 — Accuracy, robustness, cybersecurity:
  Obligation: designed to achieve appropriate levels of accuracy +
  resilient to errors + resistant to adversarial inputs.
  HESEM implementation: L4 red-team quarterly for high-risk features;
  LLM08 probe specifically tests BD bypass; calibration drift monitoring
  per L3 §4; kill-switch per L4 §6 as resilience control.

Article 9 — Risk management:
  Obligation: establish, implement, document, and maintain a risk
  management system for high-risk AI.
  HESEM implementation: per-feature risk class assignment (L2 §2);
  model card risk section (L3 §3); red-team findings as risk events
  (L4 §2); PCCP for SaMD-adjacent (L3 §6).
```

---

## 13. Relationship between BDR and OTG axiom enforcement (B6)

The Operational Truth Graph (OTG, per B6) records every state
transition in the HESEM domain model as an immutable event. The BDR
and the OTG work together as complementary enforcement mechanisms:

```
OTG AXIOM A7 (Human-attributed commitment):
  Any command that mutates a regulated workflow step must carry a
  human principal ID in its causal chain. The OTG enforcer validates
  this axiom at write time.

BDR + OTG INTERACTION:
  When Layer 2 (runtime middleware) blocks a banned-decision attempt
  by an AI principal, no OTG event is written for that attempt
  (the mutation never proceeds to the event writer).

  When Layer 2 erroneously allows an AI principal to commit a banned
  decision (a rare worst-case failure), the OTG event IS written with
  principal_kind = ai_advisory_annotation. Layer 3 (nightly audit)
  queries OTG for exactly this condition.

  The Merkle anchor on the OTG chain means the event cannot be
  retroactively altered to change the principal. If an AI commit
  happened, it remains detectable. This is the core integrity property
  that makes Layer 3 trustworthy.

OTG AXIOM A2 (Monotonic authority):
  Authority cannot be delegated downward without explicit human re-
  attribution. This means an AI cannot "borrow" a human principal's
  authority to commit a banned decision on the human's behalf unless
  the human explicitly creates a new commit event with their own token.
  Token borrowing is not possible in the HESEM identity model (per B6
  + E7): each command carries the principal from the authenticated
  session at commit time.
```

---

## 14. RACI

```
Role                 REGISTRY  TRIPLE-DEF  OVERRIDE   QA-REVIEW  RT-VERIFY
AI Lead              R         R           R           R          R
Compliance Lead      A         A           A           A          C
Security Lead        C         A           C           C          A
Engineering Lead     C         R           C           C          C
Quality Lead         A         C           A           A          C
Privacy Lead         C         C           C           C          C
Vertical Pack Lead   R (pack)  C           C           R (pack)   C
QP / PRRC            A (pack)  —           —           C          —
Tenant Admin         I         —           I           C          —
End User             —         —           I           I          —
External Red-Team    —         —           —           —          R
```

R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## 13. Cross-references

| Document | Relevance |
|---|---|
| L0 | Chapter overview and principles |
| L2 | Each feature declares its banned-decision posture; catalog reads L1 BDR |
| L3 | Stage gates verify L1 enforcement at each lifecycle transition |
| L4 | Triple-defense verified quarterly; LLM08 probe specifically tests BD routes |
| L5 | Every prompt to AI agents includes L1 as a reading requirement |
| H1 §4 | Regulatory clauses naming human oversight for each BD |
| H3 §4 | Audit pack includes BDR compliance evidence |
| H4 | EC-22 access audit, EC-24 override, EC-25 advisory render, EC-38 AI advisory |
| H5 | Override records (EC-24) retained perpetually; advisory renders (EC-25) per class |
| H7 §6 | Class A quorum for BDR changes; Class B for feature + friction calibration |
| H8 | CAPA from triple-defense findings, rubber-stamp patterns, sub-processor breaches |
| H9 | Risk class determines Tier (Tier-1/Tier-2); Tier drives red-team cadence |
| B6 | RBAC + ABAC substrate; actor.kind sourced from B6 identity layer |
| E7 | Electronic signature + session re-authentication integration |
| I3 | Incident escalation from SEV-1 banned-decision breach |
| I7 | Security operations: runtime middleware monitoring + CSPM coverage |
| I8 | Tenant configuration constraints + per-feature kill switch |
| M9 | Cross-reference index |

---

## 14. Enforcement verification schedule

The Human Authority Boundary enforcement posture is verified on the
following schedule, producing evidence retained per H5 and referenced
in the quarterly H6 periodic review:

```
FREQUENCY    ACTIVITY                                    EVIDENCE CLASS

Daily        Layer 3 offline audit job result            WORM audit log + EC-22
Weekly       Blocked-attempt count review                AI governance ledger
Monthly      Override-rate per feature vs target band    L2 KPI report
Quarterly    Full triple-defense red-team probe           EC-7 (red-team record)
             (including LLM08 per L4 §2.1)
Quarterly    BDR governance review (§12.2)               AI governance ledger entry
             and industry incident scan
Quarterly    Friction calibration quality review          H6 review record
             (time-on-task aggregates; paired review
             findings)
Annual       External red-team (Tier-2 features)          Independent RT report
Annual       EU AI Act Article 14 compliance review        Compliance record
             for high-risk AI features
On-event     Triggered by any SEV-1/2 finding             H8 CAPA + I3 incident
```

This schedule ensures the boundary is not treated as a one-time design
decision but as a continuously verified property of the platform.

---

## 15. Decision phrase

```
L1_HUMAN_AUTHORITY_BOUNDARY_V10_LOCKED
NEXT: L2_AI_FEATURE_CATALOG.md
```
