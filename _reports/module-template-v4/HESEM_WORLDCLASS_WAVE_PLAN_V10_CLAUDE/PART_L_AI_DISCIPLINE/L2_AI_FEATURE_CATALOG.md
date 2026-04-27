# L2 — AI Feature Catalog (V10)

```
chapter_purpose:  exhaustive inventory of every AI advisory feature
                  HESEM will deliver; per-feature governance contract
                  (25+ fields); RAG discipline; confidence thresholds;
                  deployment cadence; KPI catalog; per-pack overlay;
                  sub-processor governance; cost envelopes; retirement
version:          V10
owner_role:       AI Lead
sources:          NIST AI RMF 1.0 + 600-1 GenAI profile;
                  EU AI Act 2024/1689 Annex III high-risk list;
                  ISO/IEC 42001:2023 §9 (performance evaluation);
                  ISO/IEC 5259-1:2024 (data quality);
                  OWASP LLM Top 10 2024;
                  Anthropic + DeepMind responsible AI practice;
                  FDA AI/ML SaMD Action Plan 2021;
                  NIST AI 600-1 §5 (contestability, explainability)
```

The catalog is exhaustive at this baseline; every feature is a
regulated capability requiring a validated governance contract.
New features enter via H7 (Class A change) and must be approved
by AI Lead + Compliance Lead + Quality Lead before any implementation.
The catalog drives every downstream chapter: L3 lifecycle, L4
red-team, L5 prompt discipline, and tenant toggle surface in I8.

---

## 1. Feature inventory

```
ID      NAME                                      TIER  WAVE    BANNED?         EU AI ACT
AI-01   NC Similarity Clustering                   2     W6.5    none            limited risk
AI-02   CAPA Root-Cause Candidate Ranking           2     W6.5    none            limited
AI-03   CDOC Suggested Reviewer                     1     W6.5    none            minimal
AI-04   Predictive Maintenance ML                   2     W7      none            limited
AI-05   Complaint NLP Classification                2     W7      none            limited
AI-06   RAG-Powered SOP Search                      1     W7      none            minimal
AI-07   Generative Drafting (CAPA, complaint)       2     W7      none            limited
AI-08   Document Text Extraction (PDF/scan)         2     W7      none            limited
AI-09   Anomaly Detection (per equipment, per QC)   2     W7      none            limited
AI-10   Demand Forecast (advisory)                  1     W8      none            minimal
AI-11   Inspection Plan Suggestion                  2     W8      none            limited
AI-12   Yield Loss Driver Ranking                   2     W8      none            limited
AI-13   8D / RCA Whys Suggestion                   2     W8      none            limited
AI-14   Audit-Finding Severity Suggestion           1     W8      none            minimal
AI-15   FMEA Failure Mode Suggestion                1     W8      none            minimal
AI-16   Procurement RFQ Auto-Compose (advisory)     1     W9      none            minimal
AI-17   Supplier Scorecard Insight                  2     W9      none            limited
AI-18   Counterfeit Risk Indicator (Aero)           2     W10     none*           high (Annex III)
AI-19   Vigilance Reportability Suggestion (MD)     2     W10     BD-15 adjacent  high (Annex III)
AI-20   Recall Scope Suggestion                     2     W10     BD-8 adjacent   high (Annex III)
AI-21   APR / PSUR Section Drafting                 2     W11     none            limited
AI-22   Calibration OOT Risk Estimate               2     W8      none            limited
AI-23   Training Gap Detection                      1     W9      none            minimal
AI-24   Operator-on-Duty Skill Match                2     W9      none            limited
AI-25   Workorder Schedule Optimizer (advisory)     2     W9      none            limited
AI-26   Customer Sentiment from Complaints          1     W11     none            minimal
AI-27   Translation (regulated text)               1     W7      none            minimal**
AI-28   Citation-Grounded Draft Reply (D12)         2     W11     none            limited
AI-29   Outlier-Lot Detection (SPC + AI hybrid)     2     W8      none            limited
AI-30   GenAI Test Case Generator (CSA)             2     W12     none            limited
AI-31   Audit Pack Drafting                         1     W12     none            minimal
AI-32   Periodic-Review Brief Generator             1     W12     none            minimal
AI-33   Hazard Signal Clustering (Food HACCP)       2     W11     none            limited
AI-34   FSVP Gap Analyzer (Food)                    1     W11     none            minimal
AI-35   Complaint Codebook (MD-IMDRF)               2     W10     BD-15 adjacent  high (Annex III)
AI-36   Stability Trend Anomaly (Pharma)            2     W11     none            limited
```

`*` AI-18 cannot autonomously commit BD-21 (counterfeit attestation); provides
    risk indicator + evidence advisory only.
`**` AI-27 is minimal-risk for informational text; escalates to limited-risk
     when used on safety-critical labels; dual-translation + reverse-translation
     validation discipline applies.

Features adjacent to a banned decision (AI-19, AI-20, AI-35) must display the
BD-N disclosure in the advisory render (per L1 §10 element 9). The advisory
output is advisory_render (EC-25); the BD decision remains human (EC-24 if
human overrides or defers).

---

## 2. Per-feature governance contract

Every feature MUST declare all 28 fields before entering S5 (limited deploy
per L3). Incomplete governance contracts block the S4→S5 gate.

```
FIELD                        SUBSTANCE REQUIREMENT

feature_id                   Unique stable identifier (AI-NN) per §1 catalog.
                             Never reused on retirement.

feature_name                 Human-readable display name (≤ 80 chars).

intended_use                 Exact description of which regulated workflow step
                             benefits from the advisory; which decision it informs
                             (e.g., "assists the CAPA owner in identifying likely
                             root cause categories to investigate; does not replace
                             the human investigation").

out_of_scope_use             Explicit list of uses that are not permitted
                             (e.g., "must not be used to automate BD-3 CAPA
                             closure; must not be used on out-of-system records").

NIST_RMF_tier               1 / 2. No Tier-3 features are deployed. Assignment
                             based on proximity to banned decisions, safety
                             impact, and EU AI Act classification. See §§ 3 in L0.

EU_AI_Act_class              prohibited / high (Annex III) / limited / minimal.
                             If "high": Art 9-15 compliance obligations apply;
                             requires EU AI Act conformity assessment path.

GPAI_applicable              true/false: if the feature uses a general purpose
                             AI model (GPAI per EU AI Act Art 51+), additional
                             transparency obligations apply.

banned_decisions_adjacent    BD-N list (from L1 BDR) that this feature's output
                             feeds into, even though the feature itself does not
                             commit the decision. Any adjacent BD means:
                             (a) BD disclosure required in UI per L1 §10,
                             (b) higher friction calibration,
                             (c) stronger override rationale requirement.

data_provenance              Training data origin statement: dataset name, version,
                             time window, source organization, license, PII
                             screening outcome, bias screening outcome, data
                             quality score per ISO 5259 metrics.

data_lineage_evidence        EC-1 reference (reproducible data lineage record);
                             linkage to L3 S2 data assembly gate evidence.

known_failure_modes          At minimum 3 failure modes from literature + 3 from L4
                             red-team history. Must be specific to the feature, not
                             generic AI failures.

abstention_threshold         Confidence level below which the feature returns
                             "no answer found" and does not render an advisory.
                             Per §4: Tier-1 < 0.40; Tier-2 < 0.50.

display_threshold            Confidence level at or above which the advisory is
                             shown prominently (HIGH tier per §4).

acceptance_target            Target rate at which human users accept the advisory
                             without override. Used as KPI baseline; not a success
                             metric by itself (per Goodhart's law warning in §4).

override_target              Expected override rate and its acceptable band.
                             If override rate significantly exceeds target, this
                             indicates the advisory is not useful; if far below
                             (near-zero override rate), rubber-stamp risk.

calibration_target           ECE (Expected Calibration Error) and Brier score
                             target. Predicted confidence vs realized accuracy
                             must be within ±0.05 of calibration target.

freshness_floor              Maximum days since last red-team or model re-validation
                             before advisory enters "degraded mode" (shows caveat
                             banner). Tier-1: 180 days; Tier-2: 90 days; LLM-
                             backed: 60 days (prompt version or corpus can drift).

red_team_cadence             Per L4: Tier-1 semi-annual full pack + monthly targeted
                             refresh; Tier-2 quarterly full pack + monthly targeted;
                             on-event for any SEV finding against feature.

sunset_plan                  Explicit conditions under which the feature will be
                             retired (per §10): drift beyond repair, regulator scope
                             change, sub-processor end-of-life, cost envelope
                             exceeded, demand below floor.

on_failure_behavior          How the feature degrades when availability is impaired:
                             fail-closed (no advisory shown, neutral default),
                             degraded (reduced scope shown with caveat), or
                             fallback (rule-based advisory replaces ML).

human_review_path            The specific UI surface(s) and workflow step(s) where
                             the human reviews and may accept or override. Must map
                             to a declared UI surface (Part F catalog).

evidence_classes_emitted     Minimum: EC-25 (advisory_render) for every shown
                             advisory; EC-24 (override_record) for every override;
                             EC-23 (model_card) for deployed model;
                             EC-7 (red_team_record) per cycle;
                             EC-6 (retrain_record) per retraining event.

explanation_depth            Tier-1: minimum 1 rationale sentence + linked record.
                             Tier-2: minimum 3 rationale reasons + top counter-
                             evidence + linked record IDs. For LLM grounded: full
                             citation per G2.

ui_surface                   UI surface identifier per Part F catalog. Advisory
                             must be rendered on a declared surface; AI advisory
                             cannot be rendered in arbitrary UI locations.

i18n_languages               Supported display locales. Advisory text must be
                             available in all locales supported by the tenant.
                             Per AI-27 for regulated text: dual-translation
                             validation performed before locale activation.

accessibility                WCAG 2.2 AA conformance evidence for the advisory
                             component. Advisory panel must be keyboard-navigable;
                             confidence badge must have text alternative.

sub_processor                If model is hosted by third party: provider name,
                             model identifier, region, DPA addendum reference,
                             sub-processor listing in tenant DPA per BD-31.

data_residency               Region(s) where inference runs and where advisory
                             data is stored per B6 C5 region pinning. Must satisfy
                             tenant data residency requirement.

cost_envelope                Per-1,000-call cost ceiling (USD) as declared to I6.
                             Tier-1: ≤ $1.00 / 1K calls; Tier-2: ≤ $50 / 1K calls;
                             LLM dynamic routing: per cost-aware routing policy.
```

---

## 2b. Sample full governance contracts

The following governance contracts illustrate the 28-field standard for
selected features. Every feature in §1 must have a complete contract
before S5 deployment. The contracts below represent high-risk and
high-use features.

### AI-01 — NC Similarity Clustering

```
feature_id:             AI-01
feature_name:           NC Similarity Clustering
intended_use:           When a new nonconformance (NC) record is created
                        in the NQCASE workflow, suggest the 5 most
                        similar historical NC records, ranked by semantic
                        and structured similarity (root cause category,
                        affected product, defect type, process step).
                        Assists the investigator in identifying whether the
                        new NC is likely a recurrence of a known root cause,
                        reducing investigation time and improving CAPA
                        quality without removing the investigator's
                        independent analysis.
out_of_scope_use:       Must not be used to bypass independent investigation.
                        Must not auto-populate root cause fields. Must not
                        be used on NC records from other tenants.
NIST_RMF_tier:          2
EU_AI_Act_class:        limited risk (decision support in quality process)
GPAI_applicable:        false
banned_decisions_adjacent: BD-2 (NC disposition), BD-3 (CAPA close)
                        — advisory informs but does not commit either
data_provenance:        HESEM tenant NC record corpus; structured fields
                        (defect type, product family, process step) +
                        unstructured description text; time window: all
                        closed NC records for tenant; PII screen: NC records
                        may contain operator IDs (redacted from training
                        input); bias screen: per facility / product line
                        slice checked for representation imbalance
data_lineage_evidence:  EC-1 ref: DL-AI01-<version>
known_failure_modes:
  FM1: Similarity matching on text only, missing structured signal →
       irrelevant suggestions (different product, same description words)
  FM2: New failure mode with no historical parallel → zero useful
       suggestions (correct behavior: abstain or show no results)
  FM3: Over-reliance: investigator adopts first suggestion without
       validating → rubber-stamp pattern
  FM4: Corpus staleness: model trained before major product redesign →
       suggestions from obsolete product lines
abstention_threshold:   0.50 (Tier-2)
display_threshold:      0.75 (show HIGH confidence badge)
acceptance_target:      65–75% (investigator uses at least one suggestion)
override_target:        15–25% full override (accepts none of 5 suggestions)
calibration_target:     ECE ≤ 0.05; Brier ≤ 0.15
freshness_floor:        90 days
red_team_cadence:       Quarterly full pack; monthly targeted
sunset_plan:            If acceptance rate < 40% for 90 days → retirement
                        evaluation; replacement: vector similarity
                        service with better structured + semantic fusion
on_failure_behavior:    fail-closed (no suggestions shown; neutral default)
human_review_path:      NQCASE workspace → Investigation tab → Similarity
                        panel; investigator can expand each suggestion
evidence_classes_emitted: EC-25, EC-24, EC-23, EC-7, EC-6
explanation_depth:      3 top matching reasons per suggestion (structured
                        field match + semantic similarity description +
                        historical outcome)
ui_surface:             NQCASE Investigation Workspace (Part F catalog)
i18n_languages:         vi, en, ja, de, fr (initial release)
accessibility:          WCAG 2.2 AA; similarity panel keyboard-navigable;
                        confidence badge with text alt
sub_processor:          none (on-platform vector index)
data_residency:         per tenant region (B6 C5 pinning)
cost_envelope:          ≤ $0.50 per 1K calls
```

### AI-09 — Anomaly Detection (Equipment / QC / HACCP extension)

```
feature_id:             AI-09
feature_name:           Anomaly Detection (per equipment, per QC, HACCP
                        CCP extension per J5)
intended_use:           Statistical + ML anomaly detection on time-series
                        streams from: (a) equipment sensor data for
                        predictive quality signal; (b) QC measurement
                        data series per product per characteristic;
                        (c) HACCP CCP monitoring streams per J5 §6.
                        Surfaces drift, cyclic patterns, calibration
                        anomalies, and outlier-lot signals as advisories
                        to QA staff and PCQI. Does not trigger any
                        automated action; advisory only.
out_of_scope_use:       Must not be used to automatically hold lots.
                        Must not modify HACCP critical limits.
                        Must not classify a CCP excursion as in-spec.
NIST_RMF_tier:          2
EU_AI_Act_class:        limited risk
GPAI_applicable:        false
banned_decisions_adjacent: BD-26 (HACCP CL change) — if anomaly
                        pattern suggests CL review, advisory must
                        surface to PCQI; CL change is BD-26 human gate.
data_provenance:        Tenant instrument data streams (PI historian or
                        HESEM instrument integration per E15); QC records
                        (in-system); HACCP CCP monitoring records.
                        PII: no personal data in instrument streams;
                        operator ID on CCP monitoring records redacted
                        from feature input.
                        Bias: balance check per shift / per instrument /
                        per product to prevent shift-specific false-
                        positive bias.
data_lineage_evidence:  EC-1 ref: DL-AI09-<version>
known_failure_modes:
  FM1: Normal process variation flagged as anomaly after product change
       (concept drift after formulation change) → false alarm flood
  FM2: Seasonal / cyclical pattern misclassified as anomaly
       (HACCP temperature variation in summer vs winter) → noisy signal
  FM3: Sensor calibration drift → anomaly in sensor, not in process;
       AI flags anomaly that doesn't exist in actual product
  FM4: CCP false-positive cluster → PCQI investigates excessively;
       advisory suggests CL review (BD-26 gate) → rubber-stamp risk
       if PCQI accepts suggestion without verification
abstention_threshold:   0.50 (Tier-2)
display_threshold:      0.70
acceptance_target:      50–65% (anomaly leads to investigation action)
override_target:        20–35% (anomaly reviewed and dismissed as normal
                        variation)
calibration_target:     ECE ≤ 0.07 (sensor anomaly detection is inherently
                        harder to calibrate)
freshness_floor:        90 days; HACCP extension: 60 days (food regulatory
                        season sensitivity)
red_team_cadence:       Quarterly full; HACCP extension: separate quarterly
                        probe with FSMA-specific test scenarios
sunset_plan:            Replacement: more advanced process-aware anomaly
                        model; retirement if false-positive rate > 40%
                        sustained
on_failure_behavior:    fail-closed (no advisory); instrument monitoring
                        continues independently
human_review_path:      EMP Console (Food) / QC Dashboard / Equipment
                        Health Workspace; advisory card per anomaly event;
                        PCQI notification for HACCP CCP drift pattern
evidence_classes_emitted: EC-25, EC-24, EC-23, EC-7, EC-6, EC-38
explanation_depth:      Anomaly pattern description (drift/spike/cyclic/
                        calibration); statistical summary
                        (z-score / control chart position); time window;
                        projected impact on CCP compliance (HACCP
                        extension); historical similar patterns
ui_surface:             CCP Monitoring Console (J5) / QC Dashboard /
                        Equipment Health Workspace
i18n_languages:         vi, en, ja, de, fr
accessibility:          WCAG 2.2 AA; anomaly chart keyboard-navigable;
                        confidence badge with text alt
sub_processor:          none (on-platform ML inference)
data_residency:         per tenant region
cost_envelope:          ≤ $2.00 per 1K calls (streaming inference premium)
```

### AI-19 — Vigilance Reportability Suggestion (Medical Device)

```
feature_id:             AI-19
feature_name:           Vigilance Reportability Suggestion (MD + IVD)
intended_use:           When a customer complaint or incident record is
                        created or updated in the D12 workflow for a
                        Medical Device or IVD tenant, analyze the record
                        against EU MDR/IVDR vigilance criteria and FDA
                        21 CFR 803 reporting requirements. Provide an
                        advisory indicating whether the event may require
                        a vigilance report, the applicable reporting window
                        (EU MDR: 24h/2d/15d; FDA MDR: 30d; EU IVDR: 15d),
                        and the top 3 reasons for the suggestion. PRRC
                        (or Regulatory Affairs) reviews the advisory and
                        makes the reportability determination (BD-15).
out_of_scope_use:       Must not autonomously file a vigilance report.
                        Must not classify an event as non-reportable
                        without PRRC review (AI abstention ≠ human
                        determination of non-reportability). Must not
                        process records outside the tenant's registered
                        device scope.
NIST_RMF_tier:          2
EU_AI_Act_class:        high (Annex III — AI system for medical device
                        regulatory compliance decision support)
GPAI_applicable:        true (LLM component for complaint text analysis)
banned_decisions_adjacent: BD-15 (vigilance reportability decision);
                        AI-19 output feeds BD-15 decision;
                        BD-15 disclosure displayed on every AI-19
                        advisory per L1 §10 element 9
data_provenance:        Tenant complaint records (D12); historical
                        vigilance reports (for calibration); EU EUDAMED
                        event taxonomy; FDA MAUDE complaint coding
                        reference (anonymized public data). PII: complaint
                        records contain patient/user information;
                        de-identification applied before model input;
                        model does not store personal data.
data_lineage_evidence:  EC-1 ref: DL-AI19-<version>
known_failure_modes:
  FM1: Complex complaint scenario not in training distribution →
       low confidence → abstention (correct behavior); risk: PRRC
       interprets abstention as non-reportable signal (it is not)
  FM2: Advisory confidently suggests non-reportable when event
       IS reportable (false negative) → missed vigilance report →
       EU MDR Art 87 violation risk; PRRC criminal liability exposure
  FM3: Advisory confidently suggests reportable when event is NOT
       reportable (false positive) → PRRC over-reports →
       regulatory nuisance; burden on national competent authorities
  FM4: Multi-event cluster: individual events below threshold but
       cluster is reportable (periodic summary report) → feature
       does not currently cluster; gap documented
  FM5: IVDR vigilance window differs from MDR; model confuses
       MDR and IVDR rules for IVD devices → incorrect window
abstention_threshold:   0.55 (higher than standard Tier-2; regulatory
                        consequence of missed reportability too high)
display_threshold:      0.80
acceptance_target:      70–80% (PRRC uses AI assessment as starting
                        point, then verifies)
override_target:        15–25% PRRC overrides; override_correct_rate
                        tracked carefully
calibration_target:     ECE ≤ 0.04; Brier ≤ 0.12 (stricter for high-
                        risk EU AI Act classification)
freshness_floor:        60 days (MDCG guidance updates may change
                        criteria)
red_team_cadence:       Quarterly full; additional semi-annual
                        external for EU AI Act compliance
sunset_plan:            Any MDCG guidance change that materially
                        changes reportability criteria → retrain trigger
                        within 60 days or feature suspended
on_failure_behavior:    fail-closed + explicit notice: "AI suggestion
                        unavailable — PRRC review required without
                        AI input"; no degraded mode for this feature
                        (regulatory consequence too high for degraded
                        partial advisory)
human_review_path:      Complaint workspace D12 → Vigilance Assessment
                        panel → PRRC review task queue; PRRC e-sign
                        required for any BD-15 decision
evidence_classes_emitted: EC-25, EC-24, EC-23, EC-7, EC-6, EC-38
explanation_depth:      Tier-2 full: applicable regulation (MDR/IVDR/
                        21 CFR 803); relevant article/section;
                        3 supporting reasons; top counter-reason;
                        applicable reporting window with countdown;
                        BD-15 disclosure banner; PRRC action required
ui_surface:             D12 Complaint Workspace — Vigilance Assessment
                        Panel; PRRC Task Queue
i18n_languages:         vi, en, de, fr, nl, sv (EU competent authority
                        filing languages)
accessibility:          WCAG 2.2 AA; reporting window countdown
                        accessible to screen readers
sub_processor:          LLM provider (see §8); DPA addendum required;
                        no medical device complaint data stored by
                        provider beyond inference session
data_residency:         EU region for EU MDR tenants; US region for
                        FDA MDR tenants; no cross-region inference
                        for regulated medical device data
cost_envelope:          ≤ $25.00 per 1K calls (LLM inference +
                        MDR/IVDR corpus retrieval)
```

### AI-18 — Counterfeit Risk Indicator (Aerospace)

```
feature_id:             AI-18
feature_name:           Counterfeit Risk Indicator (Aerospace)
intended_use:           When an aerospace procurement record or receiving
                        inspection is created for an electronic or
                        electromechanical part, evaluate the counterfeit
                        risk by cross-referencing: (a) GIDEP alert corpus
                        for the part number and manufacturer; (b) supplier
                        sourcing characteristics (authorized distributor
                        vs independent distributor vs broker); (c) visual
                        inspection anomaly features from uploaded
                        component images; (d) historical counterfeit
                        pattern database (AS5553 reference cases).
                        Surfaces a risk indicator (HIGH / MEDIUM / LOW)
                        with supporting evidence. BD-21 (counterfeit
                        attestation) remains human.
out_of_scope_use:       Must not autonomously quarantine or reject parts.
                        Must not make final counterfeit determination.
                        ITAR-controlled components: advisory rendered only
                        to cleared personnel (per BD-24 scope control).
                        Multi-modal image analysis: must not store images
                        longer than session unless tenant opts in.
NIST_RMF_tier:          2
EU_AI_Act_class:        high (Annex III — critical infrastructure supply
                        chain; aerospace safety implications)
GPAI_applicable:        false (specialized classification model, not GPAI)
banned_decisions_adjacent: BD-21 (counterfeit attestation); BD-7
                        (supplier qualification); BD-22 (GIDEP submission)
                        — AI-18 HIGH finding may trigger BD-22 evaluation;
                        that evaluation is human
data_provenance:        GIDEP public alert database (accessed via API;
                        refreshed weekly); AS5553 counterfeit case studies
                        (public); historical tenant receiving inspection
                        records (aggregated, de-identified for cross-
                        tenant model learning where tenant opts in);
                        component image corpus from public CALCE + DFARS
                        counterfeit report databases.
                        ITAR: GIDEP data containing export-controlled
                        technical details is not included in cross-tenant
                        training.
data_lineage_evidence:  EC-1 ref: DL-AI18-<version>
known_failure_modes:
  FM1: Counterfeit passes visual inspection (sophisticated forgery) →
       AI-18 image analysis misses it → false LOW → flight safety risk
  FM2: Legitimate part from non-standard supply chain flagged as
       HIGH → unnecessary quarantine; supplier relationship damage
  FM3: GIDEP corpus out of date (refresh lag) → known counterfeit
       part not in corpus → missed alert
  FM4: ITAR component in advisory scope → advisory shown to
       non-cleared personnel → export control violation risk
abstention_threshold:   0.55
display_threshold:      0.75
acceptance_target:      60–70% (receiving engineer uses indicator
                        as part of inspection decision)
override_target:        20–30%
calibration_target:     ECE ≤ 0.06; high emphasis on false-negative
                        minimization (missed counterfeit > costly)
freshness_floor:        60 days (GIDEP corpus must be current)
red_team_cadence:       Quarterly full; ITAR boundary probes semi-
                        annual; image adversarial probes quarterly
sunset_plan:            GIDEP API deprecated → rebuild corpus; if
                        AS5553C major revision changes detection model
                        → retrain
on_failure_behavior:    degraded (GIDEP text-only if image analysis
                        unavailable; still surfaces GIDEP alerts)
human_review_path:      Receiving Inspection Workspace (J3) →
                        Counterfeit Risk Panel; Quality Engineer review
                        + BD-21 sign for attestation
evidence_classes_emitted: EC-25, EC-24, EC-23, EC-7, EC-6, EC-38
explanation_depth:      GIDEP alert match (title, date, alert number);
                        supplier sourcing risk factors; image anomaly
                        description (if image submitted); AS5553
                        reference case (if matched); ITAR clearance
                        check status displayed before rendering to user
ui_surface:             Aerospace Receiving Inspection Workspace;
                        Counterfeit Risk Panel
i18n_languages:         en, de, fr (GIDEP is English-primary)
accessibility:          WCAG 2.2 AA; risk indicator badge with text
                        alternative; image anomaly description
                        available as text overlay
sub_processor:          Image analysis model hosted on-platform
                        (no third-party for ITAR component images)
data_residency:         US region for ITAR components; EU region
                        allowed for EAR-99 non-ITAR parts
cost_envelope:          ≤ $10.00 per 1K calls (multi-modal image
                        analysis premium)
```

---

## 3. RAG and grounded-LLM discipline

Features using LLM grounded against HESEM corpus (AI-06, AI-07, AI-13,
AI-21, AI-26, AI-28, AI-30, AI-31, AI-32, AI-33, AI-34) must satisfy
the following 10 grounding rules (G1–G10):

```
G1 — GROUND EVERY CLAIM
  LLM output must cite the HESEM corpus record or authoritative
  document that supports each factual claim. A claim without a
  citation is not permitted in an advisory render.
  Enforcement: output parser validates citation presence before
  advisory is stored in EC-25.

G2 — CITATION RECORDS
  Every advisory_render (EC-25) carries a citation_ids[] array
  of resolvable record references. Each reference resolves via E8
  to the actual document version that was in the corpus at advisory
  time. Audit trail: advisory → citation → document version.

G3 — UNGROUNDED → ABSTAIN
  If the LLM cannot find corpus support for a query, the advisory
  returns "no answer found in available records" rather than
  generating a plausible-sounding answer. This is an abstention
  (EC-25 with ai_abstained: true), not a failure.

G4 — CONFIDENCE PER CITATION
  Each citation carries a retrieval relevance score. Advisory
  aggregates per-citation scores into an overall confidence value.
  Confidence is degraded when citations are of low relevance,
  when citations are from old document versions, or when the
  corpus search did not return results above a threshold.

G5 — CITATION FRESHNESS
  If the cited document has been superseded per D7 (document
  effectivity system), the advisory marks the claim as
  "source may be outdated — based on [version N]; current
  version is [version M]." Human reviewer is alerted.
  Stale citations count negatively in calibration score.

G6 — CITATION SCOPE
  Citations must be within the tenant's document scope. AI-06
  (SOP Search) and AI-07 (drafting) use only tenant-authorized
  corpus; cross-tenant citation is a security violation (OWASP
  LLM06 analog for the HESEM data layer).

G7 — PROMPT INJECTION DEFENSE
  System prompts include explicit injection guard instructions.
  User-supplied content is quarantined in a separate context
  window from the system prompt. Retrieved corpus content is
  treated as data, not instruction. Per OWASP LLM01.
  Red-team probe: 50 direct + 100 indirect injection attempts
  per feature per cycle (per L4 §2.1 LLM01 probe counts).

G8 — OUTPUT SANITIZATION
  LLM output is rendered as plain text by default; no HTML/JS
  execution. URLs in LLM output are rewrapped through the HESEM
  internal redirector before display to prevent open-redirect
  or phishing via AI-generated URLs. Templates remain
  parameterized; no LLM-generated code is executed. Per OWASP LLM02.

G9 — PROMPT VERSION CONTROL
  System prompts are versioned artifacts; changes are H7 Class B+.
  Each advisory_render (EC-25) captures the prompt_version used
  at render time. A regulatory reviewer can retrieve the exact
  system prompt version used for any advisory by querying EC-25.

G10 — DETERMINISM FOR REGULATED FEATURES
  Regulated grounded features (those used in ISO 13485 or FSMA
  contexts) use temperature = 0. The same query against the same
  corpus snapshot must yield the same advisory. This is required
  for reproducibility during audit: "if we re-ran this advisory
  under the same conditions, would we get the same answer?"
  Stochastic features (e.g., brainstorming) are not used in
  regulated decision support paths.
```

---

## 4. Confidence tiers and abstention behavior

```
TIER-1 FEATURES:

  HIGH (confidence ≥ 0.85):
    Advisory shown prominently with "AI suggests" label;
    confidence badge = green HIGH; rationale (≥ 1 sentence);
    linked records shown.

  MEDIUM (0.60 ≤ confidence < 0.85):
    Advisory shown with yellow MEDIUM badge; rationale shown;
    counter-evidence shown if any; caveat: "Moderate confidence —
    verify against source records."

  LOW (0.40 ≤ confidence < 0.60):
    Advisory available behind "Show AI suggestion" toggle; banner:
    "Low confidence — review with care." Acceptance rate KPI
    still tracked.

  NO-ANSWER (confidence < 0.40):
    Advisory not shown. EC-25 stored with ai_abstained: true.
    Human proceeds without AI input. No badge shown; neutral default
    state displayed.

TIER-2 FEATURES:

  HIGH (confidence ≥ 0.85): same as Tier-1 HIGH but also requires
    counter-evidence display (mandatory for Tier-2).

  MEDIUM (0.60 ≤ confidence < 0.85): same as Tier-1 MEDIUM but:
    rationale ≥ 3 reasons; counter-evidence ≥ 1 reason; friction
    calibration: rationale text required from human if accepting.

  LOW (0.50 ≤ confidence < 0.60): same as Tier-1 LOW but also
    triggers automatic quorum escalation (second reviewer required).

  NO-ANSWER (confidence < 0.50): same abstention behavior.

ABSTENTION IS A FEATURE:
  Engineers and product teams are evaluated on calibration quality,
  not on minimizing abstention rates. An LLM that abstains when
  uncertain is more useful than one that generates a confident but
  incorrect advisory. KPIs (§6) include calibration_delta as a
  primary metric alongside acceptance_rate.
```

---

## 4b. Confidence calibration methodology

HESEM AI features are required to be calibrated: when a feature outputs
a confidence score of 0.85, approximately 85% of those advisories should
be accepted as correct by human reviewers. Systematic overconfidence
(advisory says 0.90, but only 60% of the time the human agrees) is a
governance failure mode as significant as low accuracy.

```
CALIBRATION MEASUREMENT:
  Expected Calibration Error (ECE):
    Divide confidence scores into N buckets (e.g., 0.5-0.6, 0.6-0.7 ...).
    For each bucket: |mean(confidence_in_bucket) - accuracy_in_bucket|
    ECE = weighted average over buckets.
    Target: ECE ≤ 0.05 for Tier-1; ECE ≤ 0.07 for Tier-2 except
            AI-19 (ECE ≤ 0.04 per governance contract).

  Brier Score:
    Mean squared error of (predicted_probability - actual_outcome).
    Combines calibration and discrimination in one metric.
    Target: per governance contract field calibration_target.

CALIBRATION CORRECTION:
  If ECE > target after deployment ramp, temperature scaling or Platt
  scaling may be applied as post-hoc calibration without requiring full
  retraining. This is classified as a Class C change per H7 (minor
  calibration tuning). Calibration correction must be validated on a
  held-out set before deployment and logged in the AI governance ledger.

CALIBRATION FOR LLM FEATURES:
  LLM features do not always produce numerical confidence scores.
  For these features, calibration is measured as: does the advisory
  marked "HIGH" by the RAG system turn out to be correct more often
  than one marked "MEDIUM"? Threshold validity is tested using the
  same bucket method applied to the implicit confidence tiers. Ground
  truth is collected retrospectively where available.

ANTI-GOODHART PROTECTION:
  Acceptance rate is tracked but is NOT the optimization target for
  model training. Models are trained to minimize loss on held-out
  ground truth, not to maximize acceptance rate. Any request to
  "increase acceptance rate" by widening confidence display thresholds
  is rejected as a governance anti-pattern; the correct path is to
  improve the model on its actual task objective.
```

---

## 5. Per-feature deployment cadence (per L3 lifecycle)

```
TIER-1 FEATURES:
  S1..S5 target: 2 weeks
  S6 advisory ramp: 1% → 10% → 50% → 100% over 4 weeks
  Ramp gate criteria per step:
    1%:  acceptance ≥ 70% of target + no SEV-1/2 in window
    10%: acceptance ≥ 80% of target + override < 40% of band
    50%: acceptance ≥ target + cost in envelope + calibration delta < 0.05
    100%: acceptance in target band + KPI stable for 7 days

TIER-2 FEATURES:
  S1..S5 target: 4 weeks
  S6 advisory ramp: 1% → 10% → 50% → 100% over 8 weeks
  Ramp gate criteria per step:
    1%:  acceptance ≥ 60% of target + no SEV-1/2 + calibration measured
    10%: acceptance ≥ 75% + override not climbing + red-team posture acceptable
    50%: acceptance ≥ target + override in target band + cost in envelope
    100%: acceptance in target band + KPI green for 14 days + no open SEV-2

RAMP PAUSE TRIGGERS (any of the following):
  - SEV-2+ finding opened against the feature
  - Acceptance rate drops > 10pp below target
  - Override rate exceeds target band for 3 consecutive days
  - Cost per call exceeds envelope × 1.5
  - Calibration delta exceeds 0.08
  - Sub-processor SLA breach affecting feature availability

ROLLBACK:
  Ramp can be reversed at any step. Reversal records in AI governance
  ledger. Rollback to shadow mode (S5) requires AI Lead + Quality Lead
  sign; rollback to offline (below S5) requires Compliance Lead also.
```

---

## 6. Per-feature KPI catalog

The following KPIs are monitored for every deployed feature:

| KPI | Measurement | Cadence | Owner | Alert Threshold |
|---|---|---|---|---|
| acceptance_rate | count(accepted advisories) / count(advisories shown) | Daily | AI Lead | < target − 10pp |
| override_rate | count(EC-24) / count(EC-25 shown) | Daily | AI Lead | > target + 10pp |
| abstention_rate | count(EC-25 abstained) / total advisory attempts | Daily | AI Lead | Monitored; alert if sudden spike |
| calibration_delta | |ECE_predicted − ECE_realized| | Weekly | AI Lead | > 0.05 |
| latency_p95 | 95th percentile advisory response time | Real-time | SRE | Per M5 SLO-14 |
| cost_per_1k_calls | USD cost per 1,000 advisory calls | Daily | AI Lead | > cost_envelope × 1.1 |
| freshness_age | Days since last red-team or model validation | Daily | AI Lead | > freshness_floor |
| red_team_open_findings | Count of open L4 findings by severity | Weekly | Security | SEV-1: 0; SEV-2: 0 after 24h |
| drift_score | PSI / KS stat for input + output drift | Weekly | AI Lead | Per L3 §4 thresholds |
| banned_decision_attempt | Count of blocked BD-adjacent attempts per feature | Continuous | Security | > 0: immediate alert |
| override_correct_rate | % of overrides that were subsequently confirmed correct | Monthly | AI Lead | < 40%: retrain signal |
| SLO_burn | Error budget burn rate for AI-related SLOs | Real-time | SRE | Yellow: 2% daily; Red: 5% daily |

KPI breach behavior is feature-class-specific:
- SEV-1/2 finding: immediate kill-switch consideration (per L4 §6)
- acceptance_rate breach: ramp freeze + shadow mode review
- calibration_delta > 0.10: mandatory retrain trigger
- cost_per_1k > envelope × 2.0: feature suspended for tenant until cost resolved

### KPI behavioral rules

```
ACCEPTANCE RATE INTERPRETATION:
  acceptance_rate is NOT a success metric on its own. A feature with
  100% acceptance could be perfectly calibrated or could be rubber-
  stamped. Acceptance rate is useful ONLY in combination with:
  - calibration_delta (is the advisory actually correct when accepted?)
  - override_correct_rate (when humans override, are they right?)
  - time-on-task (are approvals happening at a reasonable pace?)

  Target acceptance rate ranges are set based on the expected human
  judgment contribution. For AI-01 (NC clustering), 65–75% is expected
  because similar NCs are sometimes genuinely new problems. For AI-06
  (SOP search), 80–90% acceptance is expected because search results
  are either right or not found.

OVERRIDE_CORRECT_RATE TRACKING:
  For decisions with eventual ground truth (CAPA root causes confirmed
  by investigation; vigilance reports confirmed by regulator response;
  recall scope confirmed by recovered units), HESEM tracks whether the
  human's override decision was ultimately correct:
    override_correct_rate = correct_overrides / total_overrides
  If override_correct_rate < 35%: humans are overriding good AI
    advice → investigate rubber-stamp-override pattern
  If override_correct_rate > 75%: humans are consistently right
    to override → model is underperforming → retrain trigger

DRIFT SCORE ESCALATION:
  L3 §4 defines 4 drift levels. Drift score per feature is the
  maximum of input_drift_score, output_drift_score, and
  concept_drift_score. The following actions apply:
  Level 1 (>2σ): KPI watchlist entry; daily monitoring
  Level 2 (sustained >2σ for N days): ramp freeze; retrain scheduled
  Level 3 (breach control band): shadow mode; advisory hidden;
    review before re-enabling
  Level 4 (regulator-relevant gap): SEV-1; kill switch consideration;
    H8 CAPA

BANNED_DECISION_ATTEMPT ZERO-TOLERANCE:
  This KPI must be 0 at all times. Any non-zero value triggers
  immediate SEV-1 regardless of feature tier or context. No exception
  for "test" or "development" environments that share production OTG.
```

---

## 7. Per-pack AI feature overlay

Each vertical pack extends the baseline feature catalog with pack-specific
features and governance requirements.

### J1 — Pharmaceutical

```
AI-21 APR / PSUR Section Drafting:
  Extended in Pharma to cover Annual Product Quality Review (APQR) per
  EU GMP §1.10.2 and 21 CFR 211.180(e). AI-21 in Pharma generates
  draft APQR sections (batch summary, stability summary, complaints
  summary, deviation/CAPA summary, change control summary). Output is
  a draft with citations from HESEM records. QP reviews, amends, and
  signs. BD-9 (APR signoff) is human.
  Governance addition: training corpus includes stability station data
  only for the tenant's own products; cross-product learning requires
  explicit data governance approval.

AI-36 Stability Trend Anomaly (extension of AI-09):
  Monitoring stability station data for anomalous trends (rate of
  change faster than expected from ICH Q1A model; inflection points
  in degradation curves). Advisory only; BD-10 (shelf life conclusion)
  remains human.
  Red-team extension: probe for false negatives (trend missed) and
  false positives (trend flagged when within ICH model).

Deviation Trend Detection (extension of AI-09):
  Clustering of deviation records by root cause category over time;
  detects patterns that individually seem minor but collectively
  indicate systemic risk (per ICH Q9(R1) §4). Advisory to QA
  Manager for systemic CAPA consideration (BD-3 remains human).
```

### J2 — Automotive

```
Warranty Signal Correlation:
  Correlates warranty claim data (field returns) with production
  lot / supplier / process window to identify systemic causes.
  Extension of AI-02 (CAPA root-cause ranking) using warranty data.
  Advisory to Customer Quality Manager; BD-19 (CND) remains human.

PPAP Element Extraction (extension of AI-08):
  Extracts dimensional, functional, and material test data from
  PDF PPAP submissions and maps to PPAP element requirements per
  AIAG PPAP 4th Edition. Identifies missing elements.
  Advisory; BD-17 (PPAP submission authorization) remains human.

Layered Process Audit Prompt Generator (extension of AI-15):
  Generates LPA question sets based on historical NC patterns for
  a given process. Reduces LPA design time. Advisory only; LPA
  execution is human.

AI-12 Yield Loss Driver (Automotive extension):
  Extended to include IATF 16949 §10.2 8D integration: for yield
  losses above threshold, auto-opens an 8D record with preliminary
  team suggestions. BD-2 (disposition) and BD-3 (CAPA close)
  remain human.
```

### J3 — Aerospace

```
AI-18 Counterfeit Risk Indicator:
  Governance extension for ITAR/EAR materials: the advisory
  output may include information subject to export control
  (e.g., part characteristics). Sub-processor must be ITAR-
  reviewed before onboarding (BD-24 applies to sub-processor
  access to ITAR-sensitive data). Advisory render scope is
  limited to cleared personnel per ITAR role.

AS9102 FAI Auto-Bubble (extension of AI-08):
  Extracts and cross-references balloon-numbered drawing callouts
  against CMM measurement data for First Article Inspection.
  Identifies measurement gaps vs drawing callouts.
  Advisory; BD-20 (FAI signoff) remains human.

GIDEP Search Integration (extension of AI-06):
  Extends SOP search to include GIDEP alert corpus. Surfaces
  alerts matching part number, manufacturer, or hazard type
  relevant to current procurement. Advisory; BD-22 (GIDEP
  submission) remains human.
```

### J4 — Medical Device

```
AI-19 Vigilance Reportability Suggestion:
  Extended governance for IVD IVDR (EU IVDR 2017/746) in addition
  to MDR: vigilance windows differ (IVDR: 15-day serious incident
  for IVD). Feature must declare both MDR and IVDR window logic
  in intended_use field. PRRC scope includes IVD PRRC equivalent.
  Training corpus must include both MDR and IVDR cases and must
  not mix window thresholds.

AI-35 Complaint Coding (MD-IMDRF):
  Classifies complaint records using IMDRF Medical Device Problem
  Codes (MDPCs) and Event Type codes. Assists complaint management
  team in standardizing codes for reporting to FDA MAUDE and EU EUDAMED.
  Adjacent to BD-15 (vigilance reportability); coding advisory
  informs but does not determine reportability.
  Red-team extension: test for MDPC code assignment errors on
  ambiguous complaint text; measure false negative rate for
  potentially reportable events.

Clinical Evaluation Lit Search (extension of AI-06):
  Retrieves and summarizes literature relevant to clinical
  evaluation per MDCG 2020-5. Advisory draft of literature
  summary sections. BD-13 (CER signoff) remains human.
  Training corpus: PubMed + MEDLINE + tenant's clinical data
  (where applicable). PII screening: de-identified patient
  data only.
```

### J5 — Food

```
AI-33 Hazard Signal Clustering (HACCP):
  Extension of AI-09 anomaly detection to HACCP CCP monitoring
  streams and food safety complaint clusters. Per J5 §6 (AI-09
  food extension). Advisory surfaces drift patterns in CCP
  measurements; complaint rate anomalies; EMP zone 1 positive
  clustering. BD-26 (HACCP plan CL change) remains human.

AI-34 FSVP Gap Analyzer:
  Reviews FSVP records (AR-J5-016) for completeness against
  21 CFR 1.500 requirements. Surfaces: suppliers with overdue
  re-evaluation; suppliers with missing hazard analysis; food
  categories without verification activity defined.
  Advisory to PCQI; BD-7 (supplier qualification) remains human.

Complaint Adulteration Signal (extension of AI-05):
  NLP classification of complaint records for adulteration
  signals (illness, foreign body, unusual taste/odor correlated
  with production lot). Adjacent to BD-27 (recall classification)
  and BD-8 (recall decision). Advisory only; BD-27 gate requires
  human Recall Coordinator + PCQI e-sign.
```

---

## 8. Sub-processor and third-party AI model governance

For features where the model is hosted by a third party:

```
ONBOARDING REQUIREMENTS (BD-31):
  - Sub-processor DPA addendum signed and documented before any
    tenant data is transmitted to the provider
  - Provider AI policy reviewed: does provider train on customer
    data by default? If yes: data use restriction in DPA required
  - Sub-processor listed in tenant's DPA register before feature
    activation for that tenant
  - ITAR-reviewed for aerospace features that involve export-
    controlled technical data (per BD-24)
  - Cross-border transfer mechanism documented per BD-32 (SCCs
    or adequacy decision per provider region)

ONGOING GOVERNANCE:
  Provider model upgrade:
    → Treated as H7 Class B change
    → Comparative shadow deployment per L3 §5 P5 before promotion
    → Model card updated; EC-23 new version created
    → Ramp gate re-run if acceptance behavior changes materially

  Provider outage or degraded performance:
    → on_failure_behavior activates per governance contract
    → I3 incident opened if advisory SLO breached
    → Tenant notification per DPA SLA

  Provider security event (data breach, unauthorized access):
    → H1 §3 notification window analysis
    → BD-31 incident opened; sub-processor DPA violation review
    → Tenant notification per DPA requirements
    → Feature may be suspended pending investigation

  Provider termination / end-of-life announcement:
    → 12-month sunset plan activated
    → Replacement provider evaluated through L3 S1..S5
    → Tenant communication at T-90, T-60, T-30 days
    → Feature disabled at T-0 unless replacement available

PROVIDER SELECTION CRITERIA:
  - ISO/IEC 27001 or SOC 2 Type II certification
  - Data residency options matching tenant regions
  - Zero training-on-customer-data by default
  - Audit rights per GDPR Art 28(3)(h)
  - Incident notification within 72h (matching GDPR DPA requirement)
```

---

## 9. Cost governance

Cost envelopes per feature class are declared in governance contracts
and tracked per I6:

```
TIER-1 FEATURES:
  Cost ceiling: ≤ $1.00 per 1,000 advisory calls (average)
  Degraded mode trigger: cost ≥ $2.00 per 1K calls
  Examples: AI-03 (suggested reviewer), AI-06 (RAG search) using
  smaller embedding model; cached retrieval for repeat queries.

TIER-2 FEATURES:
  Cost ceiling: ≤ $50.00 per 1,000 advisory calls (average)
  Degraded mode trigger: cost ≥ $100 per 1K calls
  Examples: AI-19 (vigilance, requires LLM reasoning + MDR corpus
  retrieval), AI-18 (counterfeit, multi-modal image + datasheet
  analysis).

LLM-BACKED FEATURES (RAG + generative):
  Cost-aware routing policy:
    - Check embedding cache before retrieval: if corpus hasn't
      changed, serve cached embedding
    - Route to smaller model for low-complexity queries (detected
      by query classifier); larger model for complex synthesis
    - Static answer for top-K repeated query patterns
      (FAQ-style cache with TTL = 24h)
    - Batch advisory rendering for non-time-critical features
      (e.g., AI-31 audit pack drafting can be queued)

COST SLO (per M5 SLO-18):
  AI cost per tenant per month must not exceed budget envelope
  agreed in tenant tier. Breach → I6 throttle table applies:
  Watch → Warning → Throttle → Breach.
  Regulated paths (batch release, vigilance advisories) are exempt
  from throttling; cost overage for exempt paths is HESEM-absorbed
  per I6 regulated absorption category.

QUARTERLY OPTIMIZATION REVIEW:
  Per I6 §5: quarterly AI cost analysis by feature × tenant.
  Items analyzed:
  - Feature with highest cost-per-acceptance (low acceptance, high cost)
  - Feature with high abstention rate (cost incurred for no advisory shown)
  - LLM model version cost delta (newer models may be cheaper)
  - Cache hit rate per feature (improving cache improves cost)
  - Tenant tier cost vs billing (confirm cost attribution accuracy)
```

---

## 10. Feature retirement and sunset

Features retire when any retirement criterion in the governance contract
is triggered:

```
RETIREMENT CRITERIA (any triggers retirement evaluation):
  - Model drift exceeds repair threshold per L3 §4
  - Regulator changes scope such that feature cannot operate compliantly
  - Sub-processor terminates or becomes unsupportable
  - Cost envelope exceeds sustainable level with no optimization path
  - Acceptance rate sustained below floor (advisory is not used)
  - Replacement feature is fully validated and superior

RETIREMENT PROCEDURE:
  T-90 days: Retirement announcement to AI Lead + affected tenants.
             Feature remains on by default; tenants can request
             early disable.

  T-60 days: Advisory shown by default is disabled; feature moved
             to opt-in. Tenants who need it for ongoing workflows
             can opt in explicitly (logged per I8).

  T-30 days: New predictions stop. Existing advisory renders (EC-25)
             already stored remain accessible and unaffected.
             Pending advisory-dependent workflows get "no suggestion
             available" treatment.

  T-0:       Feature disabled for all tenants. Model card (EC-23)
             retained per H5. Override (EC-24) and advisory (EC-25)
             records retained per H5 retention class (perpetual for
             EC-24; per-class for EC-25).

  T+90:      Verify no dependent capability failure (automated check
             of dependent workflow steps).

  T+180:     Retirement evidence archived in AI governance ledger.
             Feature ID retired and not reassigned.
```

---

## 11. Failure modes

```
FM1 — Feature deployed without all 28 governance fields
  Detection: S4→S5 gate check; governance contract validator
  Recovery: Deployment blocked; governance contract completed;
            H8 CAPA on governance review process

FM2 — RAG citation broken (source document removed from corpus)
  Detection: Citation validator in advisory_render pipeline marks
             stale/broken citation; advisory render shows "source outdated"
  Recovery: Corpus re-index; advisory re-scored; if systematically
            broken, retrain trigger per L3 §5; H8 CAPA on corpus
            maintenance

FM3 — Acceptance KPI sustained breach (advisory not used)
  Detection: Daily KPI alert; ramp pause per §5
  Recovery: Advisory hidden; root cause: is feature misaligned with
            user workflow? retrain? UI redesign? per L4 red-team
            overreliance probe analysis

FM4 — Override rate spike (users consistently not accepting)
  Detection: Daily KPI; override_rate > target + 10pp for 3 days
  Recovery: Shadow mode for re-evaluation; L4 targeted probe;
            retrain trigger per L3 §5 if model quality issue

FM5 — LLM hallucination in production (claim not in corpus)
  Detection: Citation validator (G2) should catch; if escapes:
             user feedback or H3 audit sample
  Recovery: Kill-switch; SEV-1; H8 CAPA; L4 full red-team
            re-probe (LLM06 + LLM02 set)

FM6 — Sub-processor outage
  Detection: Feature availability monitoring; SLO burn alert
  Recovery: on_failure_behavior activates; I3 incident; tenant
            notification per DPA; consider failover provider if
            available

FM7 — Cost envelope breach for a tenant
  Detection: I6 daily cost tracking; alert at envelope × 1.1
  Recovery: Degraded mode (lower cost path) + alert; if exceeds
            envelope × 2.0: feature suspended for that tenant until
            cost issue resolved

FM8 — Banned-decision adjacent advisory triggers misuse
  Detection: L1 Layer 2 blocks commit attempt; EC-22 logs it;
             L1 Layer 3 detects if committed
  Recovery: Per L1 §4 triple-defense; H8 CAPA; BD disclosure
            UI element review

FM9 — Tenant disables feature mid-period (incomplete workflow)
  Detection: Feature toggle is regulated change per I8; logged;
             dependent workflow steps receive "no suggestion available"
  Recovery: Graceful degrade; no impact on completed advisories;
            audit log maintained

FM10 — Sub-processor model upgrade not announced; behavior shifts
  Detection: Drift monitoring (L3 §4) detects output distribution shift;
             calibration delta spike; acceptance rate change
  Recovery: Freeze ramp; H7 Class B retro-CR; shadow comparison
            between pre/post upgrade model behavior
```

---

## 12. Roles and authority (RACI)

```
Role              CATALOG  ADD-FEAT  DEPLOY-RAMP  KPI  RETIRE  SUNSET
AI Lead           A        A         R            A    A       A
Compliance Lead   A        A         A            C    A       A
Security Lead     C        A         C            C    C       C
Quality Lead      A        A         A            C    A       A
Engineering Lead  C        R         R            C    R       R
SRE Lead          —        C         R            R    C       C
Privacy Lead      C        A         C            C    C       C
Vertical Pack Ld  C(pack)  A(pack)   C            C    C       C
Domain Lead       C        C         C            R    C       C
QP / PRRC         —        C(pack)   A(pack)      C    A(pack) C
Tenant Admin      I        —         I            I    I       I
End User          I        —         —            —    —       I
```

---

## 13. Cross-references

| Document | Relevance |
|---|---|
| L0 | Part overview; Tier definitions; regulatory alignment summary |
| L1 | BDR referenced in every governance contract; adjacent BDs declared |
| L3 | Lifecycle stages; deployment cadence in detail; retraining cycle |
| L4 | Red-team probe pack per feature; kill-switch operations |
| L5 | Prompt discipline for LLM-backed features |
| H1 §4 | Regulatory clauses; EU AI Act obligations per class |
| H2 | Validation lifecycle; AI feature validation is parallel to H2 |
| H4 | EC-6 (retrain), EC-7 (red-team), EC-23 (model card), EC-24 (override), EC-25 (advisory render), EC-38 (AI advisory generic) |
| H5 | Retention floors for AI evidence classes |
| H7 | Change classification for feature add / retire / configure |
| H9 | Risk class → Tier assignment |
| I6 | Cost envelopes; AI cost governance |
| I7 | Security operations; sub-processor DPA governance |
| I8 | Tenant feature toggles; per-tenant BDR extensions |
| M5 | SLO directory: AI latency and cost SLOs |
| M9 | Cross-reference index |

---

## 14. Feature lifecycle checklist (pre-deployment gate summary)

Before any AI feature may enter S5 (limited deploy per L3):

```
[ ] Governance contract complete: all 28 fields populated and reviewed
[ ] Data lineage record (EC-1) created and signed by AI Lead + Privacy Lead
[ ] PII screen passed: no unredacted personal data in training input
[ ] Bias screen passed: per-slice metrics acceptable per fairness policy
[ ] Model card (EC-23) drafted: held-out metrics, fairness, known FMs
[ ] S4 red-team completed: all SEV-1 findings closed; SEV-2 ≤ N
[ ] Shadow deployment plan approved: rollback plan tested in staging
[ ] UI surface registered in Part F catalog
[ ] Banned-decision adjacency: BD disclosure element configured in UI
[ ] Sub-processor DPA addendum executed (if applicable)
[ ] Data residency validated against tenant configuration
[ ] i18n: all tenant languages supported or fallback documented
[ ] Accessibility: WCAG 2.2 AA conformance test passed
[ ] Cost envelope declared in I6 budget tracking
[ ] Kill switch configured and tested in staging environment
[ ] Alert routing: KPI breach alerts routed to AI Lead + SRE
```

This checklist is enforced by the S4→S5 gate (per L3 §2). A PR
enabling S5 deployment is blocked by CI if any checklist item is
absent from the governance ledger.

---

## 15. Decision phrase

```
L2_AI_FEATURE_CATALOG_V10_LOCKED
NEXT: L3_AI_LIFECYCLE.md
```
