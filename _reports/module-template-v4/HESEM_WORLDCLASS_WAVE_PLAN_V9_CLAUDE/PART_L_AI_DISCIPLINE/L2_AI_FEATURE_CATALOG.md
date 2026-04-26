# L2 — AI Feature Catalog

```
chapter_purpose: every AI feature HESEM will deliver, with risk class,
                 intended use, banned-decision avoidance, evidence
                 emission, KPI, deployment cadence, retirement plan
owner_role:      AI Lead
sources:         NIST AI RMF 1.0 + 600-1 GenAI profile, EU AI Act
                 Annex III high-risk list, FDA AI/ML SaMD Action Plan,
                 ISO/IEC 42001 §9 performance evaluation, ISO/IEC
                 5259 data quality, OWASP LLM Top 10 2024, Anthropic
                 + DeepMind responsible AI practice
```

The catalog is exhaustive at this baseline; new features added via
H7 (Class A change). Each feature is a regulated capability with a
validation pack (per H2). The catalog is read by every other Part L
chapter (L3 lifecycle, L4 red-team, L5 prompt discipline) and by
tenants making feature-toggle decisions (per I8).

---

## 1. Feature inventory (initial 32)

```
ID      NAME                                    TIER  WAVE   BANNED?       EU AI ACT
AI-01   NC Similarity Clustering                 2    W6.5   none           limited risk
AI-02   CAPA Root-Cause Candidate Ranking         2    W6.5   none           limited
AI-03   CDOC Suggested Reviewer                   1    W6.5   none           minimal
AI-04   Predictive Maintenance ML                  2    W7     none           limited
AI-05   Complaint NLP Classification               2    W7     none           limited
AI-06   RAG-Powered SOP Search                      1    W7     none           minimal
AI-07   Generative Drafting (CAPA, complaint)      2    W7     none           limited
AI-08   Document Text Extraction (PDF/scan)        2    W7     none           limited
AI-09   Anomaly Detection (per equipment, per QC)  2    W7     none           limited
AI-10   Demand Forecast (advisory)                 1    W8     none           minimal
AI-11   Inspection Plan Suggestion                  2    W8     none           limited
AI-12   Yield Loss Driver Ranking                   2    W8     none           limited
AI-13   8D / RCA Whys Suggestion                    2    W8     none           limited
AI-14   Audit-Finding Severity Suggestion           1    W8     none           minimal
AI-15   FMEA Failure Mode Suggestion                1    W8     none           minimal
AI-16   Procurement RFQ Auto-Compose (advisory)     1    W9     none           minimal
AI-17   Supplier Scorecard Insight                  2    W9     none           limited
AI-18   Counterfeit Risk Indicator (Aero)           2    W10    none*          high (ANNEX III)
AI-19   Vigilance Reportability Suggestion (MD)     2    W10    BD-15 forbid   high
AI-20   Recall Scope Suggestion                     2    W10    BD-8 forbid    high
AI-21   APR / PSUR Section Drafting                 2    W11    none           limited
AI-22   Calibration OOT Risk Estimate               2    W8     none           limited
AI-23   Training Gap Detection                      1    W9     none           minimal
AI-24   Operator-on-Duty Skill Match                2    W9     none           limited
AI-25   Workorder Schedule Optimizer (advisory)     2    W9     none           limited
AI-26   Customer Sentiment from Complaints           1    W11    none           minimal
AI-27   Translation (regulated text)                 1    W7     none           minimal**
AI-28   Citation-Grounded Draft Reply (D12)          2    W11    none           limited
AI-29   Outlier-Lot Detection (SPC + AI hybrid)     2    W8     none           limited
AI-30   GenAI Test Case Generator (CSA)             2    W12    none           limited
AI-31   Audit Pack Drafting                         1    W12    none           minimal
AI-32   Periodic-Review Brief Generator              1    W12    none           minimal
```

`*` AI-18 cannot autonomously commit BD-21; it provides risk indicator only.
`**` AI-27 is minimal-risk if used in non-safety-critical text;
     becomes limited if safety-critical labels are translated;
     dual-translation + reverse-translation discipline applies.

`-` features that touch a banned decision are explicitly listed
   (BD-N) and the advisory is bound by L1.

---

## 2. Per-feature governance contract

Each feature MUST declare:

```
FIELD                       SUBSTANCE
feature_id                  per §1
intended_use                what regulated decision benefits
out_of_scope_use            what users must NOT use this for
NIST_RMF_tier                1 / 2 / 3 (HESEM has no Tier-3)
EU_AI_Act_class             prohibited / high / limited / minimal /
                             GPAI
banned_decisions_avoided     BD-N list this feature might touch
data_provenance              training data origin + license + PII
                             screening result
data_lineage_evidence        EC-1 reference; reproducible
known_failure_modes          per red-team + literature
abstention_threshold         confidence below which "no answer"
display_threshold           confidence above which advisory shows
acceptance_target            target rate at which humans accept (KPI)
override_target              expected override rate (KPI)
calibration_target           predicted vs realized confidence delta
freshness_floor              max days since last red-team / re-train
                             before degraded mode
red_team_cadence             per L4 (Tier-1 semi-annual; Tier-2
                             quarterly; on-event)
sunset_plan                  retirement triggers + replacement path
on_failure_behavior          fail-closed (no advisory) vs degraded
                             (smaller scope) vs fallback (rules)
human_review_path             where in UI human re-confirms
evidence_classes_emitted      EC-23 (model card) EC-25 (advisory render)
                             EC-24 (override) EC-7 (red-team)
                             EC-6 (retraining, AI-specific)
explanation_depth             feature- and tier-specific
ui_surface                    where rendered (per Part F catalog)
i18n_languages                supported locales (per F11)
accessibility                 WCAG 2.2 AA conformance evidence
sub_processor                  if model hosted by 3rd party (per DPA)
data_residency                 per B6 C5 region pinning
cost_envelope                  per-1k-call cost ceiling per I6
```

Without all fields, the feature cannot enter S5 limited deployment
(per L3).

---

## 3. RAG and grounded-LLM discipline

Features AI-06, AI-07, AI-13, AI-21, AI-26, AI-28, AI-30, AI-31, AI-32
use LLM grounded against HESEM corpus. Discipline:

```
G1   GROUND every claim
       LLM may not output a fact unless cited from HESEM corpus
       (CDOC + tenant docs + structured records).
G2   CITATION RECORDS
       Every advisory_render (EC-25) carries citation IDs;
       resolvable by E8.
G3   UNGROUNDED → ABSTAIN
       LLM that cannot find supporting evidence returns
       "no answer found" rather than hallucinating.
G4   CONFIDENCE PER CITATION
       Citation has a relevance score; advisory aggregates per claim.
G5   CITATION FRESHNESS
       If citation source has been superseded (per D7 effectivity),
       advisory marks claim "may be outdated".
G6   CITATION SCOPE
       Citations must be in tenant scope; cross-tenant citation
       forbidden.
G7   PROMPT INJECTION DEFENSE
       LLM prompts include explicit anti-injection guidance;
       tenant content quarantined from system prompt; per OWASP
       LLM01 controls.
G8   OUTPUT SANITIZATION
       LLM output rendered as plain text by default; no HTML/JS
       execution; URLs rewrapped through redirector; per OWASP
       LLM02.
G9   PROMPT VERSION
       System prompts versioned; changes are H7 Class B+;
       advisory_render captures prompt_version.
G10  DETERMINISM
       Where regulated, temperature = 0; same input + corpus snapshot
       yields same advisory; reproducibility for audit.
```

---

## 4. Confidence + abstention thresholds (per feature class)

```
TIER  HIGH (≥)   MEDIUM           LOW              NO-ANSWER
1     0.85       0.60-0.85        0.40-0.60        < 0.40
2     0.85       0.60-0.85        0.50-0.60        < 0.50
3     n/a (no Tier-3 features deployed)
```

Behavior:

```
HIGH      advisory shown prominently; "AI suggests" + rationale +
          counter-evidence + linked records
MEDIUM    advisory shown with explicit confidence badge + caveat
LOW       advisory available behind "show AI suggestion" toggle;
          banner "low confidence — review with care"
NO-ANSWER advisory not shown; AI logs "abstained" per EC-25;
          human proceeds without AI input
```

Abstention is a feature, not a failure. Engineers MUST be evaluated
on abstention rate, not only acceptance rate (Goodhart's law: pure
acceptance KPI incentivizes hallucination).

---

## 5. Per-feature deployment cadence

Per L3 lifecycle stages S1..S8:

```
TIER-1   S1..S5 in 2 weeks; S6 advisory deployment ramp 1%/10%/50%/100%
         over 4 weeks; S7 steady-state monitoring
TIER-2   S1..S5 in 4 weeks; S6 advisory deployment ramp 1%/10%/50%/100%
         over 8 weeks; S7 steady-state with higher monitoring
         frequency
```

Ramp cannot proceed unless:
- Acceptance KPI is in target band
- Override rate not climbing
- Red-team posture acceptable
- No SEV-2+ open against feature
- Calibration within tolerance

---

## 6. Per-feature KPI catalog

```
KPI                            FREQ      OWNER       TARGET BAND
acceptance_rate                 daily     AI Lead     [target ± 5pp]
override_rate                   daily     AI Lead     [≤ target]
abstention_rate                 daily     AI Lead     monitored
calibration_delta               weekly    AI Lead     |delta| < 0.05
latency_p95                     real-time SRE         per per SLO M5
cost_per_call                    daily     AI Lead     ≤ envelope
freshness_age                   daily     AI Lead     < floor
red_team_open_findings           weekly    Security    0 SEV-1; ≤ N SEV-2
drift_score                     weekly    AI Lead     under threshold
recurring_failure_pattern        monthly   AI Lead     < N per period
banned_decision_attempt          continuous Security    0
override_repeat_pattern         monthly   AI Lead     < N per period
KPI_SLO_burn                     real-time SRE         green / yellow /
                                                       red
```

KPI breach behavior is feature-class-specific (kill switch, ramp
freeze, advisory hidden).

---

## 7. Vertical-pack-specific AI features

### J1 Pharma
- AI-21 APR section drafting (advisory; QP signs)
- AI-32 Periodic-review brief
- Specialized: deviation-trend detection (extension of AI-09)
- Specialized: stability data anomaly (extension of AI-09)

### J2 Auto
- Specialized: warranty signal correlation
- Specialized: PPAP attribute extraction (extension of AI-08)
- Specialized: layered audit prompt generator

### J3 Aerospace
- AI-18 counterfeit risk indicator
- Specialized: AS9102 first-article auto-bubble (extension of AI-08)
- Specialized: counterfeit-Pareto by supplier
- Specialized: GIDEP search (extension of AI-06)

### J4 Med Device
- AI-19 vigilance reportability suggestion (advisory; PRRC signs)
- Specialized: clinical eval lit search
- Specialized: PSUR section drafting (extension of AI-21)
- Specialized: complaint codingMD-IMDRF (extension of AI-05)

### J5 Food
- Specialized: HACCP plan critical-control suggestion
- Specialized: FSMA traceability gap analyzer
- Specialized: complaint adulteration signal

Pack features inherit baseline governance + add pack-specific
banned decisions per L1 §3 vertical-pack extensions.

---

## 8. Sub-processor / hosting

Some AI features rely on third-party model hosts (LLM providers).
Per H1 + GDPR + DPA:

```
- Sub-processor listed in tenant DPA before activation
- DPA addendum signed per pack
- Cross-border transfer + region pinning honored (per B6 C5)
- Provider-side incident triggers tenant notification (per H1 §3)
- Model upgrade by provider treated as Class B change (per H7)
- Provider access scope: zero training-on-customer-data unless
  explicit DPA addendum
- Audit pack export requires provider-side attestation
```

---

## 9. Cost governance

Per-feature cost envelopes per I6:

```
TIER-1    target ≤ $0.001 per call avg; degraded mode if ≥ 2x
TIER-2    target ≤ $0.05 per call avg; degraded mode if ≥ 2x
LLM features  cost-aware routing (cache hits, smaller-model fallback,
              static answer for top-K patterns)
```

Cost SLO breach (per M5) freezes ramp and may toggle degraded mode.

---

## 10. Retirement / sunset

Features retire when:

```
- Replaced by superior model per L3 §5 retraining
- Drift exceeds repair (per L3 §4)
- Regulator changes scope (per H1 §6 horizon)
- Cost envelope unsustainable
- Customer demand falls below floor
- Sub-processor terminates / unsupported
```

Retirement procedure:

```
T-90 d   announce retirement to AI Lead + tenants
T-60 d   stop showing advisory by default; opt-in only
T-30 d   stop new predictions; existing advisories retained
T-0      feature disabled; model card retained per H5;
         override + advisory record retained perpetually
T+90 d   verify no dependent capability failure
T+180 d  retirement evidence archived
```

---

## 11. Failure modes

```
FM1   Feature deployed without all governance fields
      Recovery: pre-S5 gate rejects; H8 CAPA on process

FM2   RAG citation broken (source removed)
      Recovery: advisory marked outdated; sweep finds + reanchors;
              fix source or retire

FM3   Acceptance KPI breaches
      Recovery: advisory hidden; investigate via L4 + L3 §4

FM4   Override-rate spike
      Recovery: shadow-mode for re-evaluation; retrain trigger

FM5   Hallucination in production
      Recovery: kill-switch; SEV-1; H8 CAPA + L4 red-team probe

FM6   Sub-processor outage
      Recovery: feature degrades (per on_failure_behavior); SLO
              burn alert; tenant notification

FM7   Cost envelope breach
      Recovery: degraded mode + alert; possibly suspend feature
              for affected tenant

FM8   Banned-decision attempt blocked
      Recovery: per L1 §4 layers + §7 logging

FM9   Tenant disables feature mid-period
      Recovery: graceful degrade + audit log; no impact on
              already-completed advisories

FM10  Model upgrade by provider not announced
      Recovery: monitoring detects behavior shift; freeze; H7
              Class B handling
```

---

## 12. Roles and authority (RACI)

```
Role             CATALOG  ADD-FEAT  DEPLOY-RAMP  KPI  RETIRE
AI Lead          A        A         R            A    A
Compliance Lead  A        A         A            C    A
Security Lead    C        A         C            C    C
Quality Lead     A        A         A            C    A
Engineering Lead C        R         R            C    R
SRE Lead         -        C         R            R    C
Vertical Pack Lead C(pack) A(pack)  C            C    C
Domain Lead      C        C         C            R    C
Tenant Admin     I        -         I            I    I
End User         I        -         -            -    I
```

---

## 13. Cross-references

- L0 — overview
- L1 — banned decisions
- L3 — lifecycle stages used here
- L4 — red-team cadence + posture
- L5 — prompt discipline applied to LLM features
- H1 §4 — clauses on AI transparency + oversight
- H2 — validation lifecycle for AI features
- H4 — AI evidence classes (EC-6, EC-7, EC-23, EC-24, EC-25)
- H7 — feature add/change Class A
- H9 — risk class drives Tier
- I6 — cost envelopes
- I7 — security incl. sub-processor controls
- I8 — tenant feature toggles
- M5 — SLO directory
- M9 — cross-reference index

---

## 14. Decision phrase

```
L2_AI_FEATURE_CATALOG_BASELINE_LOCKED
NEXT: L3_AI_LIFECYCLE.md
```
