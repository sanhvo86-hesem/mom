# H2 — Validation Lifecycle

```
chapter_purpose: how HESEM moves regulated configuration / change
                 from idea to qualified, repeatable, evidence-bearing
                 production reality, per GAMP 5 + FDA CSA + Annex 15
owner_role:      Quality Lead with Compliance Lead and Validation Engineer
sources:         GAMP 5 Second Edition (2022), FDA CSA Final Guidance
                 (Sept 2022), EU GMP Annex 15 (2015), ICH Q9(R1) (2023),
                 ASTM E2500-13, PIC/S PI 011-3, IEEE 1012-2016
```

The validation lifecycle is the single discipline that turns a piece
of HESEM software into a regulated tool a customer can use without
fear of regulator action. It is the difference between an
informational dashboard and an authoritative system of record.

This chapter answers: what work the validation engineer does, in
what order, against what evidence, with what depth, with what
approvals, and how the discipline scales without becoming a paperwork
factory. It binds to root maturity (L4 / L5 / L6) so that no root
becomes regulated-trustworthy without traversing this lifecycle.

---

## 1. The risk-based principle (FDA CSA + GAMP 5)

Validation rigor MUST scale with risk. The regulator does not want
maximum testing for a low-risk dashboard; they want appropriate
testing. Two failure modes are equally bad:
- **Over-validation**: spending months testing a low-impact change,
  causing release-time delays, validation backlog, and engineer
  burnout — the GAMP 5 SE explicitly calls this out as a problem.
- **Under-validation**: shipping a high-risk change with insufficient
  evidence — leads to regulator action, recall, patient harm.

HESEM uses a 5-tier risk classification (per H9) and assigns a
validation depth per tier. Tier-1 (regulated decision impact, e.g.
batch release) gets full GAMP-5 V-model. Tier-5 (cosmetic UI text)
gets unscripted exploration with regression evidence only.

```
TIER  EXAMPLE                        VALIDATION DEPTH
1     batch release algorithm        full V-model + 100% requirement-trace
                                     + adversarial test + redundant review
2     authority delegation rule      V-model + requirement-trace + sample
                                     adversarial
3     workspace projection logic     scripted scenarios + smoke regression
4     dashboard layout / KPI panel   unscripted exploration + observability
5     copy / label change            change record + visual diff only
```

The tier is decided as part of H7 change control and frozen at the
moment of decision. Down-tier requires explicit Quality Lead
approval; up-tier may be self-imposed.

---

## 2. The validation V-model (GAMP 5 mapped to HESEM)

The V-model is the spine. Each left-leg artifact has a corresponding
right-leg verification.

```
URS  User Requirement Spec  ←------------------→  PQ  Performance Qual
   \\                                                    /
    FS  Functional Spec  ←------------------→  OQ  Operational Qual
     \\                                              /
      DS  Design Spec  ←------------------→  IQ  Installation Qual
       \\                                       /
        Build / configure / develop ----------→
```

### Per artifact (HESEM concrete shape)

```
URS    User Requirement Spec
       Owner:        Domain Lead (per affected PART_C)
       Substance:    capability statements ("system shall release
                     batch only when all critical attributes pass")
       Granularity:  one URS per workflow change or per regulated
                     capability
       Approval:     Quality Lead + Domain Lead
       Lives in:     authoritative URS root (per C7 doc lifecycle);
                     versioned; effectivity gated through D7
       RTM key:      URS-<workflow>-<seq>

FS     Functional Spec
       Owner:        Solution Architect / Lead Engineer
       Substance:    user-facing behavior implementing each URS
                     ("system shall reject the release attempt and
                     present banner X if any of [list] fails")
       Approval:     Quality Lead + Engineering Lead
       Lives in:     FS root + linked to URS by RTM
       Granularity:  one FS per URS or per cluster

DS     Design Spec
       Owner:        Lead Engineer
       Substance:    internal design decisions, integration points,
                     state machine paths, data flows
       Approval:     Engineering Lead
       Note:         Tier-3+ may compress DS into FS where appropriate

CONFIGURATION SPEC (where applicable)
       For SaaS / configuration-only changes, GAMP 5 SE explicitly
       allows a CS-only artifact in lieu of a DS

IQ     Installation Qualification
       Question:     was the system installed correctly per the DS?
       For HESEM:    deployment manifest verified; environment
                     variables match configuration baseline; required
                     services running; database migrations applied;
                     feature flags in declared state
       Evidence:     deployment_evidence row + signed manifest

OQ     Operational Qualification
       Question:     does the system operate per the FS across the
                     full intended operating range?
       For HESEM:    scripted scenario suite covering nominal +
                     boundary + invalid input + adversarial; 100%
                     pass for Tier-1/2, sample for Tier-3
       Evidence:     test_run row + linked scenario records

PQ     Performance Qualification
       Question:     does the system continuously deliver expected
                     performance under representative real load?
       For HESEM:    extended run with realistic data volume +
                     concurrency; observability captures latency
                     percentile + error budget
       Evidence:     pq_run row + telemetry archive + signoff
```

### RTM (Requirements Traceability Matrix)

Every regulated change holds an RTM that links each URS → FS → DS →
test case → evidence record. The RTM is itself an authoritative
record (versioned, effectivity-gated). 100% trace coverage is required
for Tier-1; degraded coverage with explicit risk acceptance allowed
for Tier-3+.

The RTM is the contract auditors test most. At any moment, picking
any URS line item must yield: which FS satisfies, which DS designs
it, which test verifies, which last-execution-record proves. If any
link is missing, the URS is flagged "trace gap" and the system is
considered un-validated for that capability.

---

## 3. CSA critical thinking (FDA 2022)

FDA CSA marks the move from "test everything always" to "think first,
then test what matters." The four CSA questions, asked in order,
before any test is written:

```
Q1. What is the intended use of the software?
Q2. What is the patient / consumer impact if it fails?
Q3. What controls (independent of the software) already mitigate?
Q4. What testing — least burdensome — actually reduces residual risk?
```

The output is a CSA Critical Thinking Record (CTR) — a one-page
document that justifies the test depth chosen. Auditors accept "we
chose minimal testing because Q3 mitigations covered it" if the
reasoning is documented and the controls are real.

HESEM persists the CTR alongside the change record (per H7). Without
a CTR, only Tier-1 default (full V-model) testing is allowed.

---

## 4. Computer System Validation lifecycle (full)

```
S0  Change request raised             per H7 change control
     |
S1  Risk classification               per H9 risk management
     |
S2  CSA Critical Thinking Record       per §3 above
     |
S3  URS draft + review                 per §2; gated by Quality Lead
     |
S4  FS draft + review
     |
S5  DS / CS draft + review (where applicable)
     |
S6  Test plan generated               per §5 below
     |
S7  Build / configure                 in dev environment
     |
S8  IQ in test environment
     |
S9  OQ in test environment
     |
S10 PQ in pre-prod environment
     |
S11 Validation summary report          consolidated evidence
     |
S12 Approval to release                Quality Lead + Compliance Lead
     |
S13 Production release                 effectivity gated by D7
     |
S14 Post-release monitoring            per H6 periodic review
```

Steps S3..S6 may parallelize for efficiency; never skip in regulated
work.

---

## 5. Test plan inventory

A complete test plan covers the following categories. Tier dictates
which are mandatory.

```
TEST CATEGORY                          T1  T2  T3  T4  T5
Requirement-traced scripted scenario    M   M   M   S   -
Boundary value analysis                 M   M   S   -   -
Invalid input rejection                 M   M   S   -   -
Negative testing                        M   M   S   -   -
Adversarial / attack testing            M   S   -   -   -
Concurrency + race condition            M   S   -   -   -
Idempotency replay                      M   M   S   -   -
Authorization matrix (RBAC/ABAC)        M   M   M   S   -
Tenant isolation cross-check            M   M   S   -   -
Audit chain anchor verification         M   M   S   -   -
Evidence emission verification          M   M   M   S   -
Recovery / failover                     M   M   -   -   -
DR drill (selective)                    M   -   -   -   -
Performance / load                      M   M   S   -   -
Soak (long-running)                     M   S   -   -   -
Localization / i18n                     M   S   S   -   -
Accessibility (WCAG 2.2 AA)             M   M   M   M   S
Visual regression                       M   M   M   M   M
AI advisory accuracy + abstention       M   M   -   -   -
Human-in-loop override capture          M   M   -   -   -
Dark mode / density variants            M   M   M   M   S
Mobile + small-screen                   M   M   M   S   -

Legend: M = Mandatory; S = Sample (representative subset);
        - = Not required but allowed
```

---

## 6. Test environment topology

```
DEV         engineer machines + dev cluster; throwaway evidence
TEST        IQ + scripted OQ environment; recorded evidence
PRE-PROD    PQ + soak + DR rehearsal; near-prod parity
PROD        live; smoke verifies post-deploy
SHADOW      AI features in shadow mode (predict but do not show)
              before they are promoted to advisory
```

Each environment has its own validation entry — i.e. an OQ test
record from DEV does NOT count as evidence; only TEST or PRE-PROD
runs do.

---

## 7. Validation packs per regulated capability

Each authoritative root gets a validation pack:

```
VP-batch-release            covers SM-10
VP-document-release         covers SM-7 + D7
VP-capa-closeout            covers SM-6 + D6
VP-recall                   covers SM-11 + D12
VP-validation-pq             covers SM-14 + D14 + this chapter (recursive!)
VP-edge-gateway-pq           covers C6
VP-ai-advisory-deployment    covers L3 + per-feature card
VP-tenant-region-pinning     covers I8 + B6 C5
VP-e-signature-flow          covers E7 + 21 CFR 11.50/11.70
VP-audit-anchor              covers B6 C1
... per regulated capability
```

A validation pack is itself an authoritative root. It has lifecycle
(draft → reviewed → approved → effective → superseded). It
references all other artifacts (URS, FS, DS, test runs, evidence)
through an RTM.

---

## 8. Validation in continuous delivery

Wave-by-wave delivery introduces a tension: you cannot stop the
release train, but you must produce regulated evidence per release.
HESEM resolves this with:

- **Pre-built test inventory**: every regulated change inherits the
  capability's existing test suite as baseline; the change adds
  delta tests.
- **Automated evidence capture**: every test run automatically
  writes to evidence_artifact (per H4) — no manual transcription.
- **Always-green main**: production must always be in a validated
  state; if main goes red, deploys halt until green (CS-A).
- **Per-deploy validation summary report**: auto-generated;
  signed by Quality Lead via E7; archived per H5.
- **Configurable cadence**: weekly default; daily when error budget
  permits; halted on SLO breach (per CS-A).

---

## 9. Periodic re-validation

Per H6 (periodic review):

```
Tier-1 capabilities    re-PQ annually OR after Tier-1 change
Tier-2 capabilities    re-PQ every 2 years OR after Tier-2 change
Tier-3 capabilities    spot-check every 3 years
Tier-4 capabilities    on-demand only
Tier-5 capabilities    rolled into next regression cycle
```

When a change "burns through" the periodic boundary, the periodic
review is fulfilled by the change validation evidence — no extra work.

---

## 10. Failure modes and recovery

Validation failure modes HESEM is built to detect and recover from:

```
FM1   Test scenario passes but evidence not written
      Recovery: pre-deploy gate refuses release if evidence row missing

FM2   Evidence written but RTM trace gap
      Recovery: pre-deploy RTM coverage check; missing trace blocks release

FM3   IQ passes in test, fails silently in prod (config drift)
      Recovery: post-deploy IQ smoke test; canary deploy halts on smoke fail

FM4   PQ telemetry shows slow degradation
      Recovery: SLO burn alerts; rollback or new validation per H7

FM5   Validation summary signed before all evidence captured
      Recovery: signer-bypass-check axiom (B6 OTG); reject signature

FM6   Post-deploy regression in capability not retested
      Recovery: every prod deploy runs full smoke regression for all
                Tier-1/2 capabilities; gate on green

FM7   Auditor finds untracked URS
      Recovery: H3 audit; H8 CAPA; H7 change to add URS

FM8   Same scenario passes in TEST, fails in PRE-PROD
      Recovery: do not promote to PROD; root-cause via I3 incident-style
```

---

## 11. Validation evidence (per H4)

Each lifecycle stage emits specific evidence classes:

```
S2 CTR              evidence_artifact (validation, ctr subtype)
S3 URS              doc_record (authoritative)
S4 FS               doc_record
S5 DS               doc_record
S6 Test plan        doc_record
S8 IQ               validation (iq subtype) + signature
S9 OQ               validation (oq subtype) + scripted_test_run rows
S10 PQ              validation (pq subtype) + telemetry archive
S11 Summary         doc_record (validation_summary) + signature
S12 Approval        signature (per E7)
S13 Effectivity     transaction (B7) + audit_anchor
S14 Post-release    periodic_review evidence as applicable
```

All evidence is WORM-retained per H5 floors:
```
GxP regulated         minimum 25 years (per Pharma + MD heuristic
                      contract with regulator)
Aerospace             airframe service life + 5 years
Auto                  product-life + 15 years (IATF base)
Food                  product-life + 2 years (HACCP base)
Cyber baseline        7 years (SOC 2 / ISO 27001)
```

---

## 12. Roles and authority (RACI)

```
Role                     URS  FS   DS   IQ   OQ   PQ   SUMMARY  RELEASE
Domain Lead              R    C    C    -    -    -    C        -
Solution Architect       C    R    R    C    C    C    C        -
Quality Lead             A    A    A    A    A    A    A        A
Compliance Lead          C    C    -    -    -    -    A        A
Engineering Lead         C    A    A    R    R    R    R        R
Validation Engineer      R    R    -    R    R    R    R        -
SRE Lead                 -    -    -    R    -    R    C        C
QP / PRRC (per pack)     -    -    -    -    -    -    A (Pharma/MD) A
Auditor (internal)       -    -    -    I    I    I    I        I
Customer auditor (ext)   -    -    -    -    -    -    I        I

R = Responsible (does the work); A = Accountable (signs off);
C = Consulted; I = Informed
```

---

## 13. Validation evidence freshness propagation

Per OTG axiom A18: stale validation evidence auto-demotes the affected
root's maturity level. This is the bidirectional safety net that
prevents validation rot. Concretely:

- Every validated capability declares its evidence floor (last-PQ-age
  must be ≤ N days where N depends on tier).
- Background reconciler scans nightly; if floor breached, root
  maturity downgrades from L6 to L5 and the affected workflow surfaces
  a "re-validate" banner.
- Downgraded roots cannot serve regulated-mutation paths (e.g., batch
  release, document approval) until re-PQ closes the gap.
- Evidence freshness is itself published via E8 freshness query so
  customers can audit before relying on a regulated capability.

---

## 14. Customer Validation Leverage Pack

Per release, HESEM ships a Customer Validation Leverage Pack (CVLP)
that customers can use to reduce their internal validation effort:

- Platform IQ template (vendor-side) with environment baseline
- Platform OQ evidence per slice + RTM extract
- Platform PQ continuous monitoring evidence (latency / error
  budget snapshot for affected capabilities)
- Design History File excerpt for the slice
- SBOM (CycloneDX) + signed artifact attestations
- Penetration test report (latest by I7 cadence)
- SOC 2 Type II report (post W12)
- ISO 27001 certificate (post W13)
- ISO 13485 certificate where applicable (post per-pack)
- Mapping table: customer URS placeholder → vendor-validated capability
- List of customer-side validation gaps with templates the customer
  must complete (e.g., site-specific URS, local OQ for printer/scanner)

The CVLP is the operational expression of the "validate once at
vendor, leverage many times at customers" principle. Each customer
auditor that signs HESEM's vendor pack collapses ~70% of customer-side
validation effort.

---

## 15. Anti-patterns (to be rejected)

- **Test theater**: writing tests with no requirement trace just to
  meet a coverage number
- **Validation by export**: dumping CSV reports as "evidence" without
  RTM linkage
- **Down-tiering by velocity pressure**: classifying a regulated
  change as Tier-3 to skip rigor because deadline
- **Stale test environment**: running OQ against a TEST env that has
  drifted from PROD in unrecorded ways
- **Single-eyed signoff**: one person playing both author + approver
  for high-risk change
- **Evidence without timestamp authority**: relying on local clocks
  for ordering instead of audit chain anchor
- **Validation summary written before tests run**: future-dated
  signatures (axiom violation; B6)
- **Forgotten capabilities**: a capability with no validation pack
  treated as "validated by default" because it has been live a long
  time
- **Implicit re-use**: assuming a capability validated 2 years ago
  is still valid without freshness check (per §13)

CI / static analysis catches some (RTM gap, future-dated signature);
H3 audit catches others (down-tiering, stale env); H8 CAPA closes
the loop.

---

## 16. Cross-references

- H1 §4 (regulation-to-component map) — entries citing H2 use the
  lifecycle defined here
- H3 (audit program) — verifies validation discipline
- H4 (evidence taxonomy) — evidence classes consumed here
- H5 (retention) — retention floors for validation evidence
- H6 (periodic review) — periodic re-validation cadence
- H7 (change control) — entry point into this lifecycle
- H8 (CAPA) — when validation finds non-conformance
- H9 (risk management) — drives tier classification at S1
- D14 (validate to qualify workflow) — the user-facing workflow shell
- L3 (AI lifecycle) — AI features additionally undergo L3 stages
- M5 (SLO directory) — PQ measures against SLOs
- M7 (decision phrases) — signoff phrase per stage

---

## 17. Decision phrase

```
H2_VALIDATION_LIFECYCLE_BASELINE_LOCKED
NEXT: H3_AUDIT_PROGRAM.md
```
