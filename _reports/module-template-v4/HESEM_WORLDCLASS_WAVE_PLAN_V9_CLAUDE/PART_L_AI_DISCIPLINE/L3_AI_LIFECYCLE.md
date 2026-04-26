# L3 — AI Lifecycle

```
chapter_purpose: how an AI feature is moved from idea to retirement,
                 with explicit gates, evidence, drift detection,
                 retraining discipline, and rollback paths
owner_role:      AI Lead with Compliance Lead
sources:         NIST AI RMF 1.0 GOVERN/MAP/MEASURE/MANAGE,
                 NIST AI 600-1 GenAI profile, ISO/IEC 42001 §9-10,
                 ISO/IEC 23894 risk management, FDA AI/ML SaMD
                 Predetermined Change Control Plan (2023 draft),
                 EU AI Act Art 9-15, Anthropic Acceptable Use,
                 Google PAIR + DeepMind responsibility playbooks
```

The AI lifecycle is the rigorous parallel to H2 validation lifecycle,
adapted for ML/AI peculiarities: training data, drift, calibration,
abstention, sub-processor dependence. AI features pass through both
H2 (general system validation) and L3 (AI-specific stages); the
ledger requires both.

---

## 1. Lifecycle stages (canonical)

```
S0   PRE-INCEPTION       feasibility study; H7 CR opens to pursue
S1   INCEPTION           problem statement, success criteria, risk
                          class (per L2 §2 + H9), affected populations
                          (NIST AI RMF MAP-1)
S2   DATA ASSEMBLY        training corpus selection; provenance;
                          license; PII screening; bias screening;
                          cardinality + balance; data quality (ISO
                          5259); data lineage record (EC-1)
S3   MODEL BUILD          training; held-out set; model card draft;
                          per-class fairness slice; calibration curve;
                          target SLO mapping (per M5)
S4   INTERNAL RED-TEAM    full L4 probe pack vs target; signed report;
                          remediation cycle until acceptable
S5   LIMITED DEPLOY        shadow mode in PROD: predict but do not show;
                          compare predictions vs human ground truth;
                          minimum N decisions or N days
S6   ADVISORY DEPLOY      ramp 1%/10%/50%/100% per L2 §5; per-ramp KPI
                          gate; rollback plan tested
S7   STEADY STATE          continuous KPI monitoring per L2 §6;
                          quarterly red-team per L4; per-cycle review;
                          retraining as triggered (§5)
S8   DEPRECATION          announce; default-off; opt-in window; stop;
                          evidence retention per H5
S9   POST-RETIREMENT       evidence retained; override + advisory record
                          retained perpetually; replacement reference
```

Tier-1 features may compress S4 (red-team) into a smaller probe pack
(per L4 §1); Tier-2 features traverse the full pack.

---

## 2. Stage gates (signed transitions)

Each transition between stages requires:

```
GATE                  REQUIRED EVIDENCE                       SIGNERS
S0→S1                 feasibility study; CR (H7)              AI Lead + Eng Lead
S1→S2                 problem + success + risk class           AI Lead + Quality Lead
S2→S3                 data lineage; PII clear; bias screened   AI Lead + Privacy Lead
                                                                + Compliance Lead
S3→S4                 model card draft; held-out metrics        AI Lead + Validation Eng
S4→S5                 red-team report; remediations closed       AI Lead + Security Lead
                                                                + Compliance Lead (T2)
S5→S6                 shadow performance vs baseline             AI Lead + Domain Lead +
                       acceptable; rollback plan tested          Quality Lead +
                                                                  Compliance Lead (T2)
S6→S7                 100% ramp + KPI green                       AI Lead + SRE Lead
S7→S8                 retirement criteria triggered                AI Lead + Compliance
                                                                   Lead + Quality Lead
S8→S9                 retirement procedure complete                AI Lead + Compliance
                                                                   Lead
```

Gate evidence persists in AI governance ledger (per L4 §2).

---

## 3. Model card contract (per deployed model)

```
FIELD                    SUBSTANCE
model_id                  semantic name + version (e.g. capa-rcr@2.4.1)
parent                    pre-training model + license
training_corpus           sources, time-window, size, license, PII
                          screen result, bias screen result
training_methodology      algorithm, hyperparameters, seed, compute
                          envelope, framework version
held_out_set              independent set; n; sourcing
adversarial_set           independent set; n; sourcing
metrics                   precision / recall / F1 / accuracy / AUC
                          per-class slice; per protected-attribute
                          slice; calibration ECE; Brier
fairness_assessment        per protected attribute (per ISO/IEC TR
                          24027 / 24368); mitigation if any
robustness_assessment      adversarial perturbation; OOD; invariance
intended_use               regulated decisions advisory contributes to
out_of_scope_use            safety-critical mis-use; banned decisions
known_failure_modes         literature + L4 red-team
override_expectation        where humans typically disagree + why
abstention_threshold       confidence floor for "no answer"
display_threshold          confidence floor for advisory render
deployment_envelope        per L2 §5; per-ramp gates
sub_processor               per L2 §8 (where applicable)
data_residency               region pinning (per B6 C5)
sustainability               training compute estimate (informational)
sunset_plan                  triggers + replacement path
freshness_floor              max age before degraded mode
red_team_cadence              per L4
governance_ledger_link        EC-23 reference; reviewable per E8
```

Model card is versioned with the model. Each version is itself an
authoritative record (per D7) and is published per tenant who has
the feature enabled.

---

## 4. Drift detection

Four drift types, all monitored:

```
INPUT DRIFT
  metric: per-feature distribution shift vs training reference
  detector: PSI / KS test / Wasserstein per feature; aggregated
  cadence: daily; alert at threshold
  meaning: world has changed; predictions may degrade

OUTPUT DRIFT
  metric: prediction distribution shift vs reference
  detector: same statistical tools applied to outputs
  cadence: daily
  meaning: model output mass moving; could mean correct response to
           input drift, or model decay

ACCEPTANCE-RATE DRIFT
  metric: rolling acceptance % vs target band
  detector: control chart on acceptance rate
  cadence: daily; weekly trend
  meaning: humans relying on advisory less; possibly degraded utility

CONCEPT DRIFT
  metric: prediction vs realized ground truth (where ground truth
          eventually becomes available, e.g. retrospectively-known
          NC root cause)
  detector: rolling F1 vs baseline
  cadence: weekly to monthly per feature
  meaning: relationship between input and label is shifting; this is
           the most dangerous type
```

Each drift triggers escalation:

```
LEVEL    THRESHOLD                ACTION
1        statistical >2σ           alert; investigation; KPI watchlist
2        sustained >2σ for N days  freeze ramp; schedule retraining
3        breach control band         shadow mode; advisory hidden
4        regulator-relevant gap     SEV-1; H8 CAPA; possibly kill switch
```

---

## 5. Retraining cycle

```
TRIGGERS
  Quarterly default cadence
  Drift detection level 2+
  Sub-processor model upgrade
  Significant data corpus update
  Red-team finding requiring data fix
  Regulatory horizon change (per H1 §6)

PROCEDURE
  P0  Trigger logged
  P1  Retraining plan: scope, baseline metrics, target metrics,
       success / fail criteria, rollback plan
  P2  Data corpus refresh; lineage updated; PII + bias rescreen
  P3  Train new candidate; held-out + adversarial evaluation
  P4  Red-team probe pack against candidate (per L4)
  P5  Shadow deploy candidate alongside incumbent (S5 redux)
  P6  Comparative metrics over min N decisions or N days
  P7  Promotion decision: candidate clearly better → promote;
       inconclusive → continue shadow; degrade → reject
  P8  Promotion follows L2 §5 ramp
  P9  Old model retained per H5 (model_card + EC-6 retraining record)
  P10 Effectiveness verification 30-90 days post-promotion

APPROVAL
  AI Lead + Domain Lead [+ Compliance Lead for Tier-2]
  Pharma / MD: QP / PRRC informed if affects safety advisories

ROLLBACK
  Automatic on KPI breach > 5% in first 7 days
  Manual on human concern (signed by AI Lead + Domain Lead)
```

---

## 6. Predetermined Change Control Plan (FDA-style; for MD pack)

For SaMD-resident AI in Med Device pack (per J4):

```
- Pre-authorize change envelope at submission (defining what
  retraining is allowed without new submission)
- Each retraining within envelope uses simplified CR (per H7)
- Each envelope-retrained release re-validates against agreed metric
  ranges
- Envelope re-authorization on cycle (typ 12-24 months)
- Out-of-envelope change requires new regulator submission
```

PCCP is itself a regulated authoritative record retained per H5.

---

## 7. Lifecycle gates and KPIs (cross-cutting)

```
GATE  CHECK                                 KPI BAR
S2→S3 PII clear; bias clear; license clean   per Privacy Lead
S3→S4 held-out F1 + calibration              feature-specific minima
S4→S5 red-team SEV-1 closed; SEV-2 ≤ N        per L4 §5 + remediations
S5→S6 shadow precision ≥ baseline             ≥ baseline + improved
                                              calibration
S6 ramp 1%   acceptance ≥ 70% of target        + override < 50% of band
S6 ramp 10%  acceptance ≥ 90% of target        + override < band
S6 ramp 50%  acceptance ≥ target               + cost in envelope
S6 ramp 100% acceptance in target band          + steady-state KPI
S7 quarterly red-team; drift level ≤ 1; KPI green
S8 retirement criteria: any of triggers in L2 §10
```

---

## 8. Sub-processor lifecycle integration

Where the model is hosted by a third party:

```
PROVIDER UPGRADE         treated as Class B change (H7)
                          + comparative shadow (per §5 P5)
PROVIDER OUTAGE          on_failure_behavior per L2 §2;
                          incident per I3
PROVIDER DEPRECATION     12-month sunset; replacement path
                          identified; tenant communication
PROVIDER SECURITY EVT    per H1 §3 + I3
PROVIDER BILLING CHANGE  per I6 cost governance review
PROVIDER REGION CHANGE   tenant region pinning re-verified
```

---

## 9. Pharma / MD / Auto / Aero specifics

Beyond baseline:

```
PHARMA   APR / PSUR drafting features (AI-21, AI-32) require QP
         signature path (BD-9 / BD-10 in extension list);
         training corpus retention forever (regulated)
MD       AI-19 vigilance reportability features require PRRC
         signature path; PCCP if applicable
AUTO     AI features supporting PPAP / PFMEA receive customer-
         specific requirement overlay; CSR may demand stricter cadence
AERO     AI-18 counterfeit indicator needs GIDEP integration evidence;
         export-control review per ITAR before sub-processor onboard
FOOD     HACCP-supporting AI features must not autonomously advance
         CCPs; advisory only (BD-26)
```

---

## 10. AI governance ledger (operational)

The ledger is itself an authoritative root with a state machine:

```
ENTRY KIND                       SUBSTANCE
model_lifecycle_event             S-stage transition with signers
model_card_revision                version delta
red_team_event                    L4 cycle entry
drift_event                       per §4
retraining_decision                per §5
override_pattern_summary           periodic (per L2 §6)
sub_processor_change                per §8
banned_decision_attempt              per L1 §7 (cross-reference)
```

Ledger is exposed read-only via E8 to tenant DPOs. Anchored daily.
Restricted (Compliance + Security + AI roles only for write).

---

## 11. Failure modes

```
FM1   Stage skipped (e.g., S5 shadow)
      Recovery: gate evidence absent; release blocked at L2 ramp
              gate; H8 systemic CAPA on process

FM2   Drift unmonitored
      Recovery: ledger gap detector pages AI Lead; SEV-3;
              instrument feature

FM3   Retraining fails to improve
      Recovery: candidate rejected; investigation per L4;
              data corpus + objective re-examined

FM4   Model card stale
      Recovery: deploy gate refuses; freshness alert; H8 CAPA

FM5   Sub-processor change unannounced
      Recovery: behavior shift detection (§4); freeze; H7 retro-CR

FM6   Tenant feature toggled without record
      Recovery: I8 toggle is itself a regulated change; missing
              record halts toggle

FM7   PCCP envelope exceeded
      Recovery: rollback; new regulator submission; halt promotion

FM8   Bias regression on retrain
      Recovery: candidate rejected at S4; mitigation; rerun;
              cannot promote without resolution

FM9   Override rate misinterpreted (overrides correct → ignored)
      Recovery: override directionality KPI: % overrides that turn
              out correct; if high, retrain

FM10  Evidence retention shortened by class change
      Recovery: H5 + H7 governance; class change cannot shorten
              for AI evidence
```

---

## 12. Roles and authority (RACI)

```
Role             S1  S2  S3  S4  S5  S6  S7  S8
AI Lead          A   A   A   A   A   A   A   A
Compliance Lead  C   A   C   A   A   A   C   A
Privacy Lead     C   A   C   C   -   -   -   C
Security Lead    C   C   C   A   C   C   C   C
Quality Lead     A   C   C   C   A   A   A   A
Domain Lead      R   R   R   C   A   A   R   R
Engineering Lead C   C   A   C   C   R   C   C
SRE Lead         -   -   -   -   R   A   A   -
Validation Eng   -   -   A   C   R   R   R   C
Vertical Pack Ld R(p) R(p) C  C   R(p) C  C  C
QP / PRRC (pack) -   -   -   -   -   A(p) C  C
Tenant Admin     -   -   -   -   -   I   I   I
```

---

## 13. Cross-references

- L0 — overview
- L1 — banned decisions enforced at every stage
- L2 — feature catalog with deployment cadence
- L4 — red-team protocol
- L5 — prompt discipline at gates
- H2 — validation lifecycle (general)
- H4 — EC-6 retraining; EC-23 model card; EC-7 red-team
- H5 — retention floors (perpetual for AI evidence)
- H6 — periodic AI KPI review
- H7 — class B+ change for retraining + sub-processor
- H8 — AI-related CAPAs
- H9 — risk class
- I3 — incident; AI failure escalation
- I6 — cost envelope
- I8 — tenant toggles + DPA
- M5 — SLO directory; AI-feature SLOs
- M6 — risk register
- M9 — cross-reference

---

## 14. Decision phrase

```
L3_AI_LIFECYCLE_BASELINE_LOCKED
NEXT: L4_AI_RED_TEAM.md
```
