# L3 — AI Lifecycle (V10)

```
chapter_purpose:  govern how an AI feature moves from concept through
                  retirement; 9 stages S0..S8 + post-retirement S9;
                  stage gates with signed transitions; model card
                  contract; drift detection; retraining; PCCP for MD/
                  SaMD; per-stage KPIs; sub-processor lifecycle; per-
                  pack specifics; AI governance ledger; failure modes
version:          V10
owner_role:       AI Lead with Compliance Lead and Quality Lead
sources:          NIST AI RMF 1.0 GOVERN/MAP/MEASURE/MANAGE;
                  NIST AI 600-1 GenAI profile §3-5;
                  ISO/IEC 42001:2023 §8-10 (operation, evaluation,
                    improvement);
                  ISO/IEC 23894:2023 (AI risk management lifecycle);
                  FDA AI/ML SaMD Action Plan 2021 §D;
                  FDA Predetermined Change Control Plan draft 2023;
                  EU AI Act Art 9-15 (lifecycle obligations for
                    high-risk AI);
                  Anthropic Acceptable Use Policy;
                  Google PAIR + DeepMind responsibility playbooks;
                  MLOPS community practice (Sculley et al. 2015 +
                    Breck et al. 2017 ML test score)
```

The AI lifecycle is the rigorous counterpart to the H2 system
validation lifecycle, adapted for the peculiarities of machine learning
models: non-deterministic training, data dependence, drift, calibration,
abstention, and third-party model dependence. Every AI feature
enumerated in L2 traverses both H2 (general system validation) and L3
(AI-specific stages). The AI governance ledger records every stage
transition, gate evidence, and significant event throughout the
feature's life.

The lifecycle is not a compliance formality. Stages exist because each
one addresses a known class of AI failure that has caused real-world
harm in regulated industries: S2 prevents training data quality issues
that led to biased medical AI outcomes; S4 surfaces adversarial probes
before deployment; S5 compares AI predictions against human ground
truth before showing them to users; drift monitoring catches the silent
degradation that has caused multiple AI systems to fail in operation
without anyone noticing until a high-severity event.

---

## 1. Lifecycle stages (canonical)

```
S0   PRE-INCEPTION
     Purpose: feasibility study; determine whether an AI approach
              is appropriate for the problem; assess regulatory
              implications before investing in data collection.
     Key activities:
       - Problem statement drafted
       - Regulatory classification assessment: will this feature be
         high-risk under EU AI Act? SaMD-adjacent? PCCP-applicable?
       - Available data assessed: sufficient volume, quality, labels?
       - H7 CR opened to pursue feasibility
       - Alternatives considered: rules-based approach sufficient?
     Output: feasibility brief signed by AI Lead + Compliance Lead

S1   INCEPTION
     Purpose: formalize the problem definition, success criteria,
              risk class, and affected populations.
     Key activities:
       - Problem statement finalized (one clear, testable objective)
       - Success criteria: what acceptance rate, calibration, latency,
         and cost targets define success?
       - Risk class determined per HESEM Tier (per H9 mapping + EU AI
         Act classification); Tier-2 requires full L4 probe pack
       - Affected populations identified: which user roles, which
         products, which tenants, which patient/consumer populations
         (if safety-adjacent)?
       - NIST AI RMF MAP-1 documentation: intended uses, context,
         known risks, affected individuals
       - Feature governance contract (L2 §2) draft started
     Gate: S1→S2 signed by AI Lead + Quality Lead

S2   DATA ASSEMBLY
     Purpose: collect, document, and validate the training corpus;
              ensure lineage, PII safety, bias fairness, and quality.
     Key activities:
       - Training corpus defined: sources, time windows, size, labels
       - Data provenance record (EC-1): data lineage record with
         complete chain from raw source to training-ready dataset
       - License validation: every data source must have a compatible
         license for use in model training
       - PII screening: automated PII detection + human review for
         edge cases; personal data elements redacted or removed
       - Bias screening: representation analysis per protected
         attribute (facility, product line, supplier, operator role,
         region); imbalances documented and mitigated where feasible
       - Data quality assessment per ISO/IEC 5259-1:2024 dimensions:
         completeness, accuracy, consistency, timeliness, uniqueness
       - Held-out set and adversarial set constructed independently
         from training data (no contamination)
     Gate: S2→S3 signed by AI Lead + Privacy Lead + Compliance Lead

S3   MODEL BUILD
     Purpose: train, evaluate, calibrate, and document the model.
     Key activities:
       - Training run with locked hyperparameters and seed (for
         reproducibility)
       - Held-out evaluation: precision/recall/F1/AUC per class;
         calibration curve (ECE, Brier); per-slice fairness metrics
       - Calibration correction if ECE > target (temperature scaling
         or Platt scaling per L2 §4b)
       - Model card draft: all fields per L3 §3 governance contract
       - Abstention threshold calibrated on held-out set
       - Target SLO mapping (per M5): which SLO entries apply to
         this feature?
       - Interpretability assessment: can predictions be explained to
         a domain expert? Is explanation depth achievable per L2
         governance contract?
     Gate: S3→S4 signed by AI Lead + Validation Engineer

S4   INTERNAL RED-TEAM
     Purpose: adversarial testing before any production exposure.
     Key activities:
       - Full L4 probe pack executed against the candidate model:
         OWASP LLM Top 10 (for LLM features), classical ML probes,
         system-level probes per L4 §2
       - Probe count minimums per L4 §2.1 verified
       - Findings triaged by severity (SEV-1..SEV-OBS)
       - Remediation cycle: all SEV-1 findings closed; SEV-2 ≤ N
         (feature-class-specific) with compensating controls documented
       - Red-team report signed (EC-7): probes run, findings, resolutions
     Gate: S4→S5 signed by AI Lead + Security Lead
                [+ Compliance Lead for Tier-2 features]

S5   LIMITED DEPLOY (shadow mode)
     Purpose: compare AI predictions against actual human decisions
              on real production data, without showing advisories to
              users.
     Key activities:
       - Shadow inference: model scores production data; predictions
         stored but not displayed
       - Ground truth collection: actual human decisions recorded
         alongside AI predictions
       - Comparison: AI predictions vs human decisions over min N
         decisions or N days (feature-class-specific; Tier-2: min
         500 decisions or 30 days)
       - Calibration validation on real production data (may differ
         from held-out set)
       - Acceptance baseline established: what % of the time does
         the AI predict the same outcome the human chose?
       - Rollback plan tested: can the feature be disabled in < 5
         minutes without disrupting workflow?
     Gate: S5→S6 signed by AI Lead + Domain Lead + Quality Lead
                [+ Compliance Lead for Tier-2]

S6   ADVISORY DEPLOY (ramp)
     Purpose: progressive rollout with KPI gates; advisories shown
              to real users at increasing percentages.
     Ramp stages: 1% → 10% → 50% → 100% (Tier-1: 4 weeks total;
              Tier-2: 8 weeks total)
     Key activities per ramp step:
       - KPI gate verification per L2 §5
       - Rollback plan available at every step
       - Ramp pause triggers per L2 §5 monitored
       - User feedback collected (informal + structured)
     Gate: S6→S7 signed by AI Lead + SRE Lead (100% ramp + KPI green)

S7   STEADY STATE
     Purpose: continuous production monitoring; periodic review;
              retraining as triggered.
     Key activities:
       - Continuous KPI monitoring per L2 §6
       - Quarterly red-team per L4
       - Drift monitoring per §4 (all four drift types)
       - Retraining per §5 if triggered
       - Annual model card review and update (even if no retrain)
       - Quarterly AI governance ledger review
       - Sub-processor health tracking per §8

S8   DEPRECATION
     Purpose: controlled shutdown with evidence preservation and
              tenant communication.
     Procedure: per L2 §10 (T-90 through T+180 day retirement
              procedure)
     Gate: S7→S8 signed by AI Lead + Compliance Lead + Quality Lead

S9   POST-RETIREMENT
     Purpose: evidence preserved; historical advisories accessible.
     Key activities:
       - EC-23 (model card) retained per H5 (perpeptual)
       - EC-24 (override records) retained per H5 (perpetual)
       - EC-25 (advisory renders) retained per H5 (class-specific)
       - EC-7 (red-team reports) retained per H5 (7 years)
       - Replacement feature reference documented in governance ledger
       - Feature ID permanently retired; not reassigned
```

### Stage risk profile by tier

Tier-2 features traverse the same stages but with higher evidence
requirements at each gate. The following summarizes tier-differentiated
requirements:

```
STAGE    TIER-1 STANDARD                    TIER-2 ADDITIONAL REQUIREMENT

S1       Problem statement; risk class      NIST AI RMF MAP-1 full completion;
                                            stakeholder impact assessment
                                            (which user populations are affected?)

S2       PII screen; bias check             Per-slice bias analysis with mitigation
                                            plan if imbalance found; ISO 5259 full
                                            report; dual custody for training data
                                            (two people confirm data scope)

S3       Held-out metrics; model card       Per-class fairness slices across ≥ 3
                                            protected attributes; adversarial set
                                            evaluation; interpretability demo

S4       Targeted probe pack                Full OWASP LLM Top 10 + classical ML +
         (abbreviated for Tier-1)           system probes (per L4 §2); Compliance
                                            Lead sign on gate

S5       Min 200 decisions or 14 days       Min 500 decisions or 30 days; explicit
         shadow                             ground truth comparison; Compliance
                                            Lead sign

S6       Ramp 1%/10%/50%/100% over          Same ramp; Tier-2 gate criteria stricter
         4 weeks                            per L2 §5; external RT before 50% ramp

S7       Semi-annual full red-team          Quarterly full red-team; concept drift
                                            monitored at higher frequency;
                                            annual external red-team

S8       Standard retirement procedure     Compliance Lead + Quality Lead must
                                           jointly confirm retirement criteria
                                           met; tenant communication 90 days
                                           prior mandatory
```

---

## 2. Stage gates (signed transitions)

Each stage transition requires specific evidence and named signers. The
governance ledger records every gate event with timestamps and evidence
references.

```
GATE      REQUIRED EVIDENCE                              SIGNERS

S0→S1     Feasibility brief; H7 CR reference             AI Lead +
                                                          Compliance Lead

S1→S2     Problem statement + success criteria;          AI Lead +
          risk class determination; NIST MAP-1 doc;       Quality Lead
          governance contract draft (≥ 20 fields started)

S2→S3     Data lineage (EC-1); PII screen results;        AI Lead +
          bias screen results; ISO 5259 data quality       Privacy Lead +
          report; held-out set construction record         Compliance Lead

S3→S4     Model card draft (all fields per §3);           AI Lead +
          held-out metrics vs target; calibration          Validation Eng
          curve (ECE + Brier); fairness assessment

S4→S5     Red-team report (EC-7): SEV-1 closed;           AI Lead +
          SEV-2 ≤ N with compensating controls             Security Lead +
                                                          [Compliance Lead
                                                           for Tier-2]

S5→S6     Shadow performance vs human baseline            AI Lead +
          acceptable; rollback plan tested; governance     Domain Lead +
          contract finalized (all 28 fields);              Quality Lead +
          calibration on production data validated         [Compliance Lead
                                                           for Tier-2]

S6→S7     100% ramp + KPI green for ≥ 14 days;           AI Lead +
          no open SEV-2; acceptance in target band         SRE Lead

S7→S8     Retirement criterion triggered; tenant          AI Lead +
          notification at T-90 completed; replacement      Compliance Lead +
          feature reference documented                     Quality Lead

S8→S9     T-0 shutdown complete; evidence retention       AI Lead +
          confirmed; T+90 dependency check passed          Compliance Lead
```

---

## 2b. Data assembly discipline (S2 expanded)

S2 is the highest-leverage stage for AI quality. Errors introduced
in data assembly compound through training and cannot be fully
corrected post-deployment. HESEM treats S2 as the most gate-intensive
stage.

### 2b.1 Training data sources approved for use

```
APPROVED SOURCES (require EC-1 documentation):
  - HESEM tenant records within the tenant's own scope:
    NC records, CAPA records, complaint records, CCP monitoring
    records, maintenance logs, inspection records — all sourced
    from authenticated HESEM database exports
  - Public regulatory databases (MAUDE, GIDEP, EUDAMED public corpus,
    FDA 483 public database) — for feature-specific corpus extensions
  - Published and licensed scientific datasets (with explicit license
    compatibility review by Legal)
  - HESEM-aggregated cross-tenant data (opt-in only, anonymized, per
    tenant DPA addendum) for general improvement of shared models

RESTRICTED SOURCES (require Compliance Lead + Privacy Lead approval):
  - Third-party industry data consortiums: requires data sharing
    agreement review + DPA impact assessment
  - Synthetic data generated from production data: requires explicit
    privacy analysis (synthetic data may re-identify at high fidelity)

PROHIBITED SOURCES:
  - Data from tenants who have not opted in to cross-tenant use
  - Personal health information (PHI) in identifiable form
  - Biometric data without explicit consent
  - Data obtained through scraping without license
  - Data that encodes illegal discrimination signals
```

### 2b.2 PII screening methodology

```
AUTOMATED SCREENING:
  - Named entity recognition (NER) scan for: person names, email
    addresses, phone numbers, dates of birth, national ID numbers,
    medical record numbers, patient identifiers
  - Pattern matching: SSN, IBAN, card numbers, passport formats
  - Free-text medical content detector (PHI detector for complaint
    records and adverse event records)

HUMAN REVIEW:
  - 1% stratified sample reviewed by Privacy Lead
  - Edge cases flagged by NER and pattern matching: reviewed by
    Privacy Lead + Legal
  - False negative assessment: known PII examples injected to test
    scanner recall

REDACTION:
  - PII detected → replaced with category token [PERSON], [DATE], etc.
  - Medical identifiers → replaced with [PATIENT_ID]
  - Redaction is irreversible in training corpus; original data
    retained in production system under GDPR Art 89 research exemption
    (where applicable) or not used in training at all

DOCUMENTATION:
  EC-1 data lineage record includes: PII scanner version; scan
  date; count of redacted elements by category; human review
  completion date; Privacy Lead sign-off.
```

### 2b.3 Bias screening methodology

```
SLICE ANALYSIS:
  For each protected attribute applicable to the feature:
    - facility (geographic + operational variation)
    - product line / product family
    - supplier (for supply chain features)
    - shift (time-of-day; shift-specific patterns)
    - operator role (for workflow classification features)
    - region / regulatory jurisdiction (for compliance features)

  Compute: per-slice prevalence in training set vs expected
  prevalence in production; per-slice performance metric (precision
  or recall as appropriate) on held-out set.

IMBALANCE THRESHOLDS:
  Slice < 5% of total training set: underrepresented; flag for
  augmentation or oversampling consideration.
  Per-slice metric delta > 10pp from overall metric: flag for
  mitigation.

MITIGATION OPTIONS:
  - Oversampling underrepresented slices
  - Re-weighting training examples
  - Data augmentation (synthetic generation for underrepresented
    cases, with privacy review)
  - Stratified sampling at held-out set construction
  - Document residual imbalance as known failure mode in model card

DOCUMENTATION:
  Per-slice results table in EC-1 data lineage record. Mitigation
  measures applied documented. Residual imbalance acknowledged with
  operational guidance (e.g., "advisory may be less reliable for
  [facility X] which has < 50 historical records in training set").
```

---

## 3. Model card contract

Each deployed model version (including retrained models) must have a
current model card (EC-23) retained for the life of the feature and
afterward per H5. The model card is itself an authoritative record
under D7 version control.

```
FIELD                     SUBSTANCE

model_id                  Semantic name + version:
                          e.g., capa-rcr@2.4.1 (feature-name + semver)

parent                    Pre-training model name, organization, and
                          license; framework version + compute envelope
                          for fine-tuned models; "from scratch" with
                          algorithm name for custom models

training_corpus           Sources, time window, size, license, PII
                          screen outcome, bias screen outcome,
                          ISO 5259 data quality score; held-out set
                          size and sourcing; adversarial set size

training_methodology      Algorithm, hyperparameters (fully specified),
                          seed (for reproducibility), compute envelope
                          (GPU-hours + cloud provider + region), framework
                          version and hash

held_out_set              Independent set: n, sourcing description,
                          time window, contamination check result

adversarial_set           Independent adversarial challenge set: n,
                          sourcing, attack types included

metrics                   Precision / recall / F1 / accuracy / AUC per
                          class; calibration ECE + Brier; per-class
                          fairness slice (true positive rate per
                          protected attribute); per-slice metric delta
                          from overall performance

fairness_assessment       Per protected attribute (facility, product
                          line, supplier, region, shift, operator role);
                          methodology per ISO/IEC TR 24027 / TR 24368;
                          mitigation measures if any imbalances found
                          and not fully correctable

robustness_assessment     Adversarial perturbation (input noise, text
                          mutation, numeric jitter); OOD behavior;
                          invariance tests (e.g., same NC record with
                          different formatting → same prediction?)

intended_use              Exact regulated workflow step(s) this model
                          supports; Tier; EU AI Act class

out_of_scope_use          Safety-critical misuse scenarios; banned
                          decisions the model must never autonomously
                          commit; scope boundaries

known_failure_modes       Per governance contract (at minimum 3 from
                          literature + 3 from L4 red-team); updated
                          on each retraining

override_expectation      Types of cases where human judgment is
                          expected to diverge from AI (based on shadow
                          mode analysis); calibration of expectations
                          for override_correct_rate tracking

abstention_threshold      Confidence floor per L2 §4

display_threshold         Confidence floor per L2 §4

deployment_envelope       Per L2 §5 ramp; which tenants at which ramp %

sub_processor             Provider + model identifier + DPA addendum
                          ref (if applicable)

data_residency            Region list; cross-region restrictions

sustainability            Training compute estimate (CO2e if measurable;
                          informational only; not a gate criterion)

sunset_plan               Triggers + replacement path

freshness_floor           Maximum model age before degraded mode (per
                          L2 governance contract)

red_team_cadence          Per L4 (Tier-specific)

governance_ledger_link    AI governance ledger entry ID (EC-23 is
                          itself stored in the ledger)
```

---

## 3b. Model card governance in practice

The model card is not a static document; it evolves through the
feature's lifecycle. The following events each trigger a model card
update:

```
TRIGGER                              MODEL CARD UPDATE REQUIRED

New model version promoted (retrain)  New version created; prior version
                                       retained; EC-23 new version
                                       reference in governance ledger

Sub-processor model upgrade           parent field updated; metrics
                                       re-evaluated and updated

Calibration correction applied        calibration correction method
                                       added to training_methodology;
                                       new ECE/Brier values recorded

New known failure mode discovered     known_failure_modes field updated
(e.g., from red-team finding)         per L4 finding closure

Regulatory change affects             intended_use / out_of_scope_use
intended use interpretation           fields updated; Class B change (H7)

Fairness policy threshold change      fairness_assessment section
                                       updated with new thresholds and
                                       re-evaluated per-slice metrics

Feature scope change (new vertical    intended_use and deployment_
pack onboarded)                       envelope updated; Class B change

Annual review (no other change)       review_date + reviewer fields
                                       updated; affirm all fields current
```

Tenant DPO access to model cards via E8 is limited to: intended_use,
out_of_scope_use, known_failure_modes, fairness_assessment, sub_processor,
data_residency. Internal fields (training_methodology, hyperparameters,
compute envelope) are restricted to AI Lead + Security roles.

---

## 4. Drift detection (four types, all monitored)

Drift monitoring is a continuous background process in S7 (steady
state). All four drift types are monitored simultaneously because they
have different failure signatures.

### 4.1 Input Drift

```
DEFINITION: The statistical distribution of input features to the model
  changes relative to the training distribution.

CONSEQUENCE: The model is predicting on data that is structurally
  different from what it was trained on. Predictions may be less
  accurate even if the model itself hasn't changed.

EXAMPLES IN HESEM CONTEXT:
  - New product line introduces features unlike anything in the NC
    corpus (AI-01): similarity scores meaningless for new product NCs
  - New CCP instrument with higher precision than historical instruments
    changes the distribution of monitoring values (AI-09)
  - New customer with different complaint vocabulary (AI-05)

DETECTOR: Population Stability Index (PSI) per feature; Kolmogorov-
  Smirnov test for continuous features; chi-squared for categorical.
  PSI thresholds: < 0.10 = stable; 0.10–0.25 = monitor; > 0.25 = alert.

CADENCE: Daily computation; weekly trend review.
```

### 4.2 Output Drift

```
DEFINITION: The statistical distribution of the model's output
  (predictions, confidence scores) changes relative to the reference
  period.

CONSEQUENCE: Could indicate correct adaptation to input drift; could
  indicate model decay; requires investigation to distinguish.

DETECTOR: Same tools (PSI / KS) applied to prediction distributions.
  Separate detector for confidence score distribution (shift toward
  lower confidence = early warning of degradation).

CADENCE: Daily.
```

### 4.3 Acceptance-Rate Drift

```
DEFINITION: The rate at which human users accept the AI advisory
  changes in a sustained way beyond normal statistical variation.

CONSEQUENCE: Acceptance-rate drop could mean the model is wrong more
  often (output drift), or the user population changed (new users
  less familiar), or the workflow changed so the advisory is shown
  in less relevant contexts. Distinguishing these requires root cause
  analysis.

DETECTOR: Control chart (EWMA) on acceptance rate. Alert at >2σ
  deviation from reference period rate, sustained for 3+ days.

CADENCE: Daily monitoring; 7-day trend reviewed in AI KPI report.
```

### 4.4 Concept Drift

```
DEFINITION: The relationship between the input features and the
  correct label changes over time. This is the most dangerous type:
  the model's learned patterns are no longer predictive.

EXAMPLES IN HESEM CONTEXT:
  - A process change makes previously predictive features for
    yield loss irrelevant; new drivers not captured in training
    (AI-12 yield driver ranking)
  - Regulatory change changes what "reportable" means; model trained
    on pre-change cases may misclassify post-change cases (AI-19)
  - Allergen regulatory update adds sesame as the 9th major allergen;
    model trained before update doesn't recognize sesame (AI-33)

DETECTOR: Rolling F1 / precision-recall comparison against ground
  truth (where ground truth eventually becomes available; many HESEM
  decisions have retrospective confirmation). Rolling window: 90 days
  vs reference. Concept drift score = |current_F1 − reference_F1|.

CADENCE: Weekly to monthly per feature (depends on ground truth
  availability).
```

### 4.5 Drift escalation matrix

```
LEVEL  CONDITION                         ACTION
1      Any drift detector > 2σ           Alert to AI Lead; add to
                                          KPI watchlist; increase
                                          monitoring frequency
2      Sustained > 2σ for N days          Ramp freeze (if in S6);
       (Tier-1: 7d; Tier-2: 3d)          Schedule retraining
3      Breach of control band             Shadow mode: advisory hidden;
                                          investigation required before
                                          re-enable
4      Regulator-relevant gap             SEV-1; H8 CAPA; kill switch
       (e.g., AI-19 concept drift after   consideration; Compliance
       regulatory change)                 Lead + QP / PRRC notified
```

---

## 5. Retraining cycle

Retraining is triggered by conditions, not by calendar alone. The
procedure is itself a lifecycle event requiring governance.

```
TRIGGERS (any one triggers evaluation; team decides whether to retrain):
  - Quarterly default cadence: evaluate drift metrics; decide whether
    retraining is warranted
  - Drift Level 2+ per §4.5
  - Sub-processor model upgrade (comparative evaluation required)
  - Significant data corpus update (new product lines, new regulation)
  - Red-team finding requiring data-level fix
  - Regulatory horizon change per H1 §6 (e.g., new MDCG guidance)
  - Fairness regression detected (per-slice metric delta exceeds
    fairness policy tolerance)
  - override_correct_rate indicates model is systematically wrong
    (human overrides are correct > 75% of the time)

PROCEDURE:
  P0   Trigger logged in governance ledger with rationale
  P1   Retraining plan: scope (full retrain vs fine-tune vs
       calibration correction), baseline metrics, target metrics,
       success criteria, failure criteria, rollback plan
  P2   Data corpus refresh: lineage updated (EC-1 new version);
       PII screen + bias screen re-run on new data
  P3   Train candidate model with locked hyperparameters + new seed;
       held-out + adversarial evaluation; calibration
  P4   Red-team probe pack against candidate per L4 (abbreviated
       pack if minor fine-tune; full pack if major retrain)
  P5   Shadow deploy candidate alongside incumbent (S5 redux):
       same shadow-mode comparison; min N decisions or 14 days
  P6   Comparative evaluation: candidate vs incumbent on:
       - Held-out metrics: same direction or improved?
       - Shadow vs human decisions: candidate no worse than incumbent?
       - Calibration: candidate within ECE target?
       - Concept drift: candidate better on recent data?
  P7   Promotion decision:
       - Clearly better on ≥ 3/4 evaluation dimensions → promote
       - Inconclusive → extend shadow; investigate
       - Worse → reject candidate; investigate root cause
  P8   Promotion follows L2 §5 ramp (abbreviated: 10%/50%/100%
       over 1-2 weeks if incumbent already in S7)
  P9   Old model retained (EC-23 old version; EC-6 retraining record)
       per H5. Model version frozen in EC-25 advisory renders from
       prior period; retrospective reproducibility preserved.
  P10  Effectiveness verification 30–90 days post-promotion: are
       acceptance, calibration, and drift metrics better than
       pre-retraining reference?

APPROVAL:
  AI Lead + Domain Lead (all retraining events)
  + Compliance Lead (for Tier-2 features)
  + QP / PRRC (for Pharma / MD safety-adjacent features)

ROLLBACK:
  Automatic: KPI breach > 5pp acceptance rate drop in first 7 days
             → automatic rollback to prior model version
  Manual: human concern (AI Lead + Domain Lead jointly)
  Evidence: both automatic and manual rollback events stored in
            governance ledger with rationale
```

---

## 5b. Retraining quality gates (detailed)

The following quality gates apply at each step of the retraining
procedure per §5:

```
P3 TRAINING RUN QUALITY GATES:
  - Held-out F1 ≥ baseline × 0.95 (candidate must not be materially
    worse than incumbent on held-out set)
  - Calibration ECE ≤ incumbent ECE + 0.02 (candidate must not
    be materially less calibrated)
  - Per-slice fairness: no slice regression > 5pp vs incumbent
  - Training run is reproducible: given same seed + data + hyperparams,
    same results ±0.001 on deterministic features

P4 RED-TEAM QUALITY GATES (abbreviated for minor retrain):
  For fine-tune or calibration correction (not full retrain):
    - Run targeted probe set (≥ 20 probes per known failure mode)
    - Verify no regression on prior red-team findings (all prior
      SEV-2 findings must still be non-reproduced)
    - No new SEV-1 finding permitted
  For full retrain:
    - Full L4 probe pack per L4 §2
    - Same gate criteria as S4 → S5 transition

P5 SHADOW QUALITY GATES:
  - Shadow period: min 100 decisions (abbreviated retrain) or
    500 decisions (full retrain)
  - Shadow accuracy vs human ground truth: candidate ≥ incumbent
    accuracy on shadow period (if ground truth available synchronously)
    OR candidate acceptance_in_shadow ≥ incumbent_acceptance_in_shadow
    (if synchronous ground truth not available)
  - No SEV-1/2 finding from shadow period observations
  - Cost per call ≤ candidate cost_envelope declared in governance
    contract

P7 PROMOTION DECISION MATRIX:
  Dimension 1: Held-out F1 delta
    positive (better): strong promote signal
    −0 to −3pp: acceptable (noise); evaluate other dimensions
    < −3pp: reject unless compensated by very strong calibration gain

  Dimension 2: Shadow acceptance delta
    +5pp or more: strong promote signal
    0 to +5pp: acceptable
    negative: investigate before promoting

  Dimension 3: Calibration ECE delta
    improvement (lower ECE): promote signal
    degradation > 0.02: reject

  Dimension 4: Concept drift on recent data
    candidate better on recent data: strong promote signal
    (this is the primary metric for concept-drift-triggered retrains)

  Decision rule:
    ≥ 3 of 4 dimensions in favor of candidate: promote
    2 of 4 in favor, 2 neutral: extend shadow by 14 days; re-evaluate
    ≥ 1 dimension negative: reject; investigate
```

---

## 6. Predetermined Change Control Plan (PCCP) — FDA Medical Device

For SaMD-resident AI features in the Medical Device pack (J4) that
are or may become subject to FDA 510(k) or PMA clearance:

```
PCCP COMPONENTS (per FDA PCCP Draft Guidance 2023):

Predetermined Change Description:
  What specific types of changes to the algorithm are pre-authorized
  without requiring a new or supplemental submission?
  Examples of in-envelope changes:
    - Retraining on updated training dataset from the same
      data sources (no new data sources added)
    - Calibration corrections that maintain ECE within target
    - Minor architectural tuning that does not change intended use
  Examples of out-of-envelope changes:
    - New data sources not in original submission
    - Change in intended use or device population
    - Change in output type (e.g., from classification to regression)
    - Material performance improvement beyond stated bounds

Change Protocol:
  For each in-envelope change: simplified CR per H7 (Class C);
  validation against agreed metric ranges; governance ledger entry.
  For out-of-envelope changes: new or supplemental submission to FDA;
  full H7 Class A change process.

Performance Monitoring Plan:
  HESEM L3 drift monitoring (§4) + L2 KPI catalog (§6) provides the
  performance monitoring evidence stream required by the PCCP.
  FDA may request production performance data; HESEM governance ledger
  exports this per E8.

Methodology:
  PCCP covers AI-19, AI-35, and any other feature declared in the
  510(k) or PMA submission. PCCP version corresponds to governance
  ledger version; updates to PCCP require FDA acceptance of
  supplemental change.

PCCP Enrollment Gate (additional S3 deliverable for MD pack):
  Before entering S4, features in MD pack assess whether PCCP
  enrollment is required. If PCCP-applicable, the PCCP draft is
  submitted to FDA before S6 ramp begins.

EU AI Act SaMD overlap:
  EU AI Act Art 9 risk management + Art 15 accuracy requirements
  overlap with PCCP scope. HESEM maintains a mapping document
  showing how L3 lifecycle stages satisfy both FDA PCCP and EU AI
  Act obligations for the same feature.
```

---

## 6b. S7 steady-state monitoring cadence

S7 is not passive. The following activities run on fixed cadences
throughout the feature's steady-state operation:

```
DAILY:
  - KPI monitoring dashboard reviewed by AI Lead (or delegate):
    acceptance_rate, override_rate, abstention_rate, latency_p95,
    cost_per_1k, banned_decision_attempt (must be 0)
  - Drift scores updated for all four drift types
  - Sub-processor availability check

WEEKLY:
  - KPI trend review: 7-day rolling vs 30-day reference
  - Drift score review: escalation matrix applied per §4.5
  - Blocked-attempt review: were there any in the period?
  - Cost attribution per feature per tenant (for I6 reporting)

MONTHLY:
  - override_pattern_summary computed and stored in governance ledger
  - override_correct_rate computed (where ground truth is available)
  - Calibration re-assessed on last 30 days of production data
  - AI governance ledger: monthly summary entry per feature

QUARTERLY:
  - Full red-team per L4 cadence (Tier-2 quarterly; Tier-1 semi-annual)
  - Drift monitoring: concept drift assessment for features with
    retrospective ground truth
  - BDR review (per L1 §12.2) includes AI-in-scope features
  - Model card freshness check: has anything changed that requires
    model card update?
  - Sub-processor DPA review: is provider still in good standing?
  - Retraining decision: is a new retrain warranted based on quarterly
    drift assessment? Decision documented in governance ledger even
    if decision is "no retrain needed this quarter."

ANNUAL:
  - Full model card review and re-sign (even if no change)
  - External red-team for Tier-2 features
  - EU AI Act Art 14 compliance review for high-risk features
  - Per-pack regulatory horizon scan: are new regulations affecting
    intended use? (H1 §6 horizon scan inputs to this)
  - Fairness assessment refresh: has the user or product population
    changed such that bias screening should be re-run?
  - Annual training data review: is the training set still
    representative of current production data? Concept drift at
    annual scale?

ON-EVENT:
  - SEV-2+ finding: immediate actions per L4; governance ledger
    entry within 24h
  - Regulatory change: assess impact on intended_use within 30 days
  - Sub-processor change: per §7 sub-processor events
  - Tenant request for model card: fulfill via E8 within 10 business days
```

---

## 7. Sub-processor lifecycle integration

Third-party model providers introduce additional lifecycle dependencies:

```
PROVIDER UPGRADE (model version change):
  Treated as H7 Class B change.
  Mandatory comparative shadow (P5 of retraining procedure):
  incumbent vs provider-new version over same test window.
  If comparative evaluation passes: promote provider version.
  If fails: stay on prior provider version; notify provider; escalate
  if no compatible version available.
  Model card updated: parent field reflects new provider model version.

PROVIDER OUTAGE / DEGRADED SLA:
  on_failure_behavior per L2 governance contract activates.
  I3 incident opened if advisory SLO (per M5) is breached.
  Tenant notification if advisory unavailability exceeds DPA SLA.
  Fallback: rule-based advisory if on_failure_behavior = "fallback".

PROVIDER DEPRECATION:
  Minimum 12-month migration window upon provider announcement.
  Replacement provider evaluated through S1..S5 (abbreviated where
  existing feature governance artifacts are reusable).
  Tenant communication: T-90/T-60/T-30 days per L2 §10 procedure.
  If replacement not available by T-0: feature suspended (not retired;
  held for re-enablement when replacement is ready).

PROVIDER SECURITY EVENT:
  Per H1 §3 notification window analysis.
  BD-31 incident opened.
  Tenant notification per DPA.
  Feature suspended if the security event affects the confidentiality
  or integrity of tenant data in provider's systems.
  Feature re-enabled only after provider provides written confirmation
  of incident closure and control improvement.

PROVIDER BILLING CHANGE (cost envelope impact):
  I6 cost governance review triggered.
  If new cost exceeds feature's declared cost_envelope by > 20%:
  degraded mode activated + cost renegotiation.
  If cost cannot be brought within envelope: feature retirement
  evaluation (L2 §10 retirement criteria).

PROVIDER REGION CHANGE (data residency impact):
  Tenant data residency constraint re-validated per B6 C5 region
  pinning policy.
  If new provider region violates tenant data residency: feature
  suspended for that tenant until region resolution.
```

---

## 8. Per-pack lifecycle specifics

Beyond the baseline lifecycle, each pack adds requirements:

```
PHARMA (J1):
  Training corpus retention: FOREVER (pharmaceutical records
  retention per ICH Q10 §3.2.2 and EU GMP). Model card (EC-23)
  and training data lineage (EC-1) are never deleted.
  QP involvement: QP signs S5→S6 gate for any feature whose output
  informs a BD-9 (APR signoff) or BD-10 (stability conclusion).
  Stability trend features (AI-36): retrain cadence aligned with
  ICH Q1A study design intervals (not faster than allowed intervals
  would change conclusions).

MEDICAL DEVICE (J4):
  AI-19 and AI-35 (BD-15 adjacent): PRRC must sign S5→S6 gate.
  PCCP enrollment check per §6 at S3.
  Drift monitoring reports exported to PRRC on quarterly basis
  as PMS feedback per EU MDR Art 83.
  Retraining record (EC-6) retained as part of technical file
  per EU MDR Annex II.

AUTOMOTIVE (J2):
  Features supporting PPAP / PFMEA receive CSR overlay:
  specific OEM customers may require notification of model updates
  that affect PPAP-supporting features (per their CSR under IATF
  16949 §8.3.4.4). AI Lead maintains CSR-specific cadence records.
  Retraining within model envelope does not require customer
  notification; architectural change or feature scope change does.

AEROSPACE (J3):
  AI-18 (counterfeit risk indicator): GIDEP corpus must be
  refreshed at minimum every 7 days; a stale GIDEP corpus longer
  than 14 days triggers drift Level 2 even if model metrics are stable.
  Export control review at S2: does training data include ITAR-
  controlled technical data? If yes: additional data handling
  controls and ITAR compliance officer sign at S2 gate.

FOOD (J5):
  AI-33 (HACCP CCP anomaly): reanalysis triggered by seasonal
  process changes (e.g., summer temperature increase changes HACCP
  CCP monitoring baseline). Annual seasonal recalibration required
  in addition to standard retraining triggers.
  FSVP Gap Analyzer (AI-34): corpus must include current FSVP
  regulation text; a 21 CFR 1.500 regulatory update triggers
  retrain evaluation within 60 days.
```

---

## 9. AI governance ledger (operational)

The governance ledger is an authoritative record (per D7) that
accumulates every significant event across the full lifecycle. It is
the single source of truth for AI feature governance history.

```
ENTRY KINDS:

model_lifecycle_event
  Content: stage transition (S0→S1 etc.), gate evidence refs,
           signer IDs, timestamps, feature_id, model_version
  Evidence class: EC-23 (model card version is one such event)

model_card_revision
  Content: changed fields, prior values, new values, rationale,
           signer, timestamp

red_team_event
  Content: cycle ID, target feature_id, probe pack version, probe
           count, finding count by severity, next scheduled date
  Evidence class: EC-7

finding_event
  Content: finding ID, probe category, description, evidence,
           severity, status, remediation deadline, owner

remediation_event
  Content: finding ID, actions taken, timestamps, verification
           re-probe outcome, closer identity

drift_event
  Content: drift type, drift score, escalation level, threshold,
           action taken, timestamp

retraining_decision
  Content: trigger, plan summary, candidate vs incumbent comparison,
           promotion decision, approvers, timestamps
  Evidence class: EC-6

override_pattern_summary
  Content: feature, period, acceptance_rate, override_rate,
           override_correct_rate, calibration_delta; prepared
           monthly for L2 §6 KPI review
  Evidence class: monthly report (not EC-24 directly)

sub_processor_event
  Content: provider, event type (upgrade/outage/deprecation/security),
           action taken, tenant impact, resolution timestamps

banned_decision_attempt_event
  Content: per L1 §7 format; cross-reference from L1 to ledger

LEDGER ACCESS:
  Write: Compliance + Security + AI Lead roles only
  Read: above roles + tenant DPO (tenant-scoped entries only)
  Anchor: daily Merkle anchor per H5 audit chain

LEDGER EXPORT:
  Via E8 (evidence API): compliance artifacts for regulatory
  submission, external audit, tenant transparency requests.
  Subset export available per time range + feature scope.
```

---

## 9b. AI governance ledger — full entry specifications

The governance ledger stores structured entries across 8 entry kinds.
The following specifies the schema for each entry kind:

### model_lifecycle_event entry
```
{
  entry_kind:        "model_lifecycle_event",
  entry_id:          UUID,
  feature_id:        "AI-NN",
  model_version:     "semantic.version",
  stage_from:        "S0".."S8",
  stage_to:          "S1".."S9",
  gate_evidence_refs: [EC-1_ref, EC-7_ref, ...],
  signers: [
    {user_id, role, timestamp, signature_ref}
  ],
  notes:             freetext (≤ 500 chars),
  governance_ledger_version: integer
}
```

### drift_event entry (with detailed alerting rules)
```
{
  entry_kind:     "drift_event",
  entry_id:       UUID,
  feature_id:     "AI-NN",
  model_version:  "semantic.version",
  drift_type:     "input" | "output" | "acceptance_rate" | "concept",
  drift_metric:   "PSI" | "KS" | "EWMA" | "rolling_F1",
  drift_score:    float,
  threshold:      float,
  escalation_level: 1 | 2 | 3 | 4,
  action_taken:   "watchlist" | "ramp_freeze" | "shadow_mode" |
                  "sev1_incident" | "kill_switch",
  notes:          freetext,
  timestamp:      ISO-8601
}

Alert routing per escalation level:
  Level 1: AI Lead email + KPI dashboard update
  Level 2: AI Lead + Quality Lead Slack alert + calendar block for
           retraining planning session
  Level 3: AI Lead + Compliance Lead + SRE page + feature advisory
           hidden with user notification
  Level 4: AI Lead + Compliance Lead + Security Lead + SEV-1 PagerDuty
           + H8 CAPA auto-opened
```

### retraining_decision entry
```
{
  entry_kind:          "retraining_decision",
  entry_id:            UUID,
  feature_id:          "AI-NN",
  incumbent_model:     "semantic.version",
  candidate_model:     "semantic.version",
  trigger_type:        "quarterly" | "drift_L2+" | "sub_processor_upgrade" |
                       "corpus_update" | "red_team_finding" | "regulatory_horizon" |
                       "fairness_regression" | "override_correct_rate",
  comparative_evaluation: {
    held_out_F1_delta:       float,  // candidate - incumbent
    shadow_vs_human_delta:   float,
    calibration_ECE_delta:   float,
    concept_drift_delta:     float
  },
  decision:            "promote" | "extend_shadow" | "reject",
  decision_rationale:  freetext,
  approvers: [
    {user_id, role, timestamp}
  ],
  ec6_ref:             "EC-6 retraining record reference"
}
```

---

## 10. Failure modes

```
FM1 — Stage gate skipped (e.g., S5 shadow mode omitted for speed)
  Detection: Governance ledger missing S4→S5 gate record; deploy
             CI gate checks for signed transition before S6 enable
  Severity: SEV-2 (regulatory process violation)
  Recovery: Feature disabled; retroactive gate evidence required;
            H8 CAPA on lifecycle process compliance

FM2 — Drift monitoring not instrumented
  Detection: Governance ledger gap: no drift_event for > 14 days
             on an S7 feature; AI Lead daily dashboard shows missing
  Severity: SEV-3
  Recovery: Instrument drift monitoring; SEV-3 incident; H8 CAPA
            on monitoring infrastructure

FM3 — Retraining candidate worse than incumbent
  Detection: P6 comparative evaluation; candidate rejected at P7
  Severity: Not a failure per se; correct behavior; document and
            investigate data or objective
  Recovery: Root cause of regression investigated; data corpus
            or training approach revised; retrain re-attempted

FM4 — Model card stale (not updated after retrain)
  Detection: model_card freshness field vs last retrain date;
             CI deploy gate refuses if card older than retrain
  Severity: SEV-3 (evidence gap)
  Recovery: Model card updated; H8 CAPA on update discipline

FM5 — Sub-processor model upgrade not announced (behavior shifts)
  Detection: Drift monitoring (§4) detects output distribution
             shift correlated with provider release date
  Severity: SEV-3 (change without governance)
  Recovery: Freeze ramp; H7 Class B retro-CR; comparative shadow;
            provider notification requirement added to DPA if absent

FM6 — Tenant feature toggle changed without governance record
  Detection: I8 toggle change is itself a regulated change; missing
             record detected by governance ledger gap check
  Severity: SEV-3
  Recovery: Toggle documented retroactively; H8 CAPA on toggle
            governance discipline

FM7 — PCCP envelope exceeded without submission
  Detection: Change type classifier at H7 CR identifies out-of-
             envelope change; governance ledger records classification
  Severity: SEV-2 (regulatory submission required; not completed)
  Recovery: Rollback to in-envelope version; FDA supplemental
            submission prepared; Compliance Lead + Regulatory
            Affairs notified; halt promotion of out-of-envelope
            version until submission accepted

FM8 — Bias regression on retrain (new data introduces imbalance)
  Detection: S4 probe pack: fairness slice analysis; S3→S4 gate
             requires fairness assessment
  Severity: SEV-2 if bias delta > policy tolerance
  Recovery: Candidate rejected; root cause in data composition;
            mitigation applied; re-evaluated before S4 gate retry

FM9 — Override_correct_rate misinterpreted (overrides correct;
       team treats as problem with users, not model)
  Detection: Monthly override_pattern_summary in ledger; if
             override_correct_rate > 75% for 2+ months: retrain
             trigger per §5
  Severity: SEV-5 initially; escalates if unaddressed
  Recovery: Model is wrong; retrain; stop optimizing user
            override behavior before fixing model

FM10 — Evidence retention class changed for AI records
  Detection: H5 + H7 governance; class change requires Class A
             change that Compliance Lead reviews; H3 audit checks
  Severity: SEV-2 if retention shortened below regulatory floor
  Recovery: Retention class restored; records that were deleted
            during gap investigated for regulatory impact
```

---

## 11. Roles and authority (RACI)

```
Role             S1   S2   S3   S4   S5   S6   S7   S8   S9
AI Lead          A    A    A    A    A    A    A    A    A
Compliance Lead  C    A    C    A    A    A    C    A    A
Privacy Lead     C    A    C    C    —    —    —    C    C
Security Lead    C    C    C    A    C    C    C    C    C
Quality Lead     A    C    C    C    A    A    A    A    C
Domain Lead      R    R    R    C    A    A    R    R    C
Engineering Lead C    C    A    C    C    R    C    C    C
SRE Lead         —    —    —    —    R    A    A    —    —
Validation Eng   —    —    A    C    R    R    R    C    C
Vertical Pk Ld   R(p) R(p) C    C    R(p) C    C    C    C
QP / PRRC        —    —    —    —    —    A(p) C    C    C
Tenant Admin     —    —    —    —    —    I    I    I    I
```

R = Responsible, A = Accountable, C = Consulted, I = Informed, (p) = pack-scoped

---

## 12. Cross-references

| Document | Relevance |
|---|---|
| L0 | AI principles; Tier definitions |
| L1 | Banned decisions enforced at every gate; override evidence |
| L2 | Feature catalog; governance contract fields; deployment cadence |
| L4 | Red-team at S4 and quarterly in S7 |
| L5 | Prompt discipline; governance ledger prompts |
| H2 | General validation lifecycle; L3 is AI-specific parallel |
| H4 | EC-1, EC-6, EC-7, EC-23, EC-24, EC-25, EC-38 evidence classes |
| H5 | Retention floors; AI evidence retained perpetually (EC-24) or per class |
| H6 | Quarterly drift + KPI review as part of H6 periodic review |
| H7 | Change classification: retrain = Class B; provider upgrade = Class B; PCCP = Class A for out-of-envelope |
| H8 | CAPA from lifecycle findings; FM log entries |
| H9 | Risk class → Tier assignment |
| I3 | Incident escalation from SEV-1/2 lifecycle events |
| I6 | Cost envelopes; provider billing change triggers |
| I8 | Tenant toggles as regulated changes |
| M5 | SLO directory: AI latency and availability SLOs |
| M6 | Risk register: AI-related systemic risks |
| M9 | Cross-reference index |

---

## 12b. Lifecycle stage completion certificate

Upon completing each stage, a lifecycle stage completion certificate
is stored in the governance ledger. This is not a separate document;
it is the governance ledger entry for the stage gate event. The
certificate must contain:

```
certificate_for:     stage gate event ID
feature_id:          AI-NN
stage_transition:    S(N) → S(N+1)
completion_date:     ISO-8601
gate_criteria_met:   [ ] All criteria checked against governance contract

EVIDENCE BUNDLE (list of all evidence refs for this gate):
  [ ] Problem statement / feasibility brief (S0→S1 only)
  [ ] EC-1 data lineage (S2→S3)
  [ ] PII screen results (S2→S3)
  [ ] Bias screen results (S2→S3)
  [ ] Model card (EC-23) (S3→S4)
  [ ] Held-out metrics table (S3→S4)
  [ ] Red-team report (EC-7) (S4→S5)
  [ ] Shadow evaluation report (S5→S6)
  [ ] Rollback test evidence (S5→S6)
  [ ] 100% ramp KPI report (S6→S7)
  [ ] Retirement criteria documentation (S7→S8)

SIGNERS:
  [ ] {role: "AI Lead", user_id: ..., timestamp: ...}
  [ ] {role: "Compliance Lead", user_id: ..., timestamp: ...}
  (+ additional per §2 gate table)

exceptions_noted:     freetext or NONE
```

This format ensures every gate is machine-parseable for audit
purposes: a compliance officer running a governance check can
programmatically verify that all required gate evidence refs are
present and all required signers have signed, without reading
narrative text.

---

## 13. Lifecycle health indicators (summary dashboard)

The AI Lead uses the following aggregated indicators to assess the
overall health of the AI feature fleet in S7:

```
INDICATOR                    HEALTHY          WARNING         CRITICAL

Features in S7 with no open  100%             < 95%           < 90%
SEV-2+ findings

Features in S7 with current  100%             < 98%           < 95%
model card (within freshness
floor)

Features with concept drift  0                1-2             > 2
Level 3+

Features with overdue        0                1               > 1
red-team cycle

Features where override_     ≥ 40%            30–40%          < 30%
correct_rate is tracked      (well-calibrated) (borderline)   (model systematically wrong)

Average calibration ECE      < 0.05           0.05–0.08       > 0.08
across fleet

Features with cost > 1.5x    0                1               > 1
envelope
```

This dashboard is reviewed by AI Lead + Compliance Lead monthly and
as part of the quarterly H6 periodic review. Consistent CRITICAL
status on any indicator triggers a H8 CAPA for the AI program overall.
When multiple indicators are in CRITICAL state simultaneously, the
Compliance Lead convenes an AI program health review meeting within
10 business days.

---

## 14. Decision phrase

```
L3_AI_LIFECYCLE_V10_LOCKED
NEXT: L4_AI_RED_TEAM.md
```
