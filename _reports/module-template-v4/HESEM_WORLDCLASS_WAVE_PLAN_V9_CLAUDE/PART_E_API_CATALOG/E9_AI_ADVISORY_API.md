# E9 — AI Advisory API

```
api_family:     AI Advisory
owner_role:     AI Lead with Compliance Lead
scope:          Per-feature inference invocation; advisory rendering;
                override capture; per-feature governance ledger entry;
                model card + red-team retrieval; sub-processor
                routing; cost envelope enforcement; per-tenant kill
                switch; per-pack overlay
sources:        NIST AI RMF GOVERN/MAP/MEASURE/MANAGE; OWASP LLM
                Top 10 (2024); EU AI Act Art 13 (transparency) +
                Art 14 (oversight); FDA AI/ML SaMD; OpenAPI 3.1.1;
                RFC 9457; AsyncAPI 3.0; CloudEvents 1.0
```

The AI Advisory API is the runtime gateway for the 32 features in
L2. Every invocation passes through this API; every advisory render
emits EC-25; every override emits EC-24. The API is the L1
boundary in operation: AI principal cannot call paths that touch
banned decisions; triple defense (CI + runtime + offline) verifies.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Per-feature inference invocation       authority decision (E2)
Advisory rendering envelope             record persistence (E4)
Override capture                         workflow commit (E3)
Decision record retrieval                AI training pipeline (offline)
Per-feature KPI surface                   AI red-team execution (offline)
Model card retrieval                      AI lifecycle stage management
Red-team report retrieval                 (offline / governance)
Per-tenant feature toggle                 sub-processor onboarding
Per-tenant kill switch                    (per L2 §8)
Per-pack overlay (J1..J5)
Sub-processor routing
Cost envelope enforcement
RAG citation discipline (per L2 §3)
```

---

## 2. Endpoint inventory

### 2.1 Invoke advisory feature

```
PATH                              POST /v1/ai/feature/{feature_id}/
                                  invoke
PURPOSE                            submit input to AI feature;
                                  receive advisory
INPUT                              feature id (per L2 catalog);
                                  input refs (e.g., NC id, CAPA
                                  id, lot id);
                                  context (workspace, surface,
                                  tenant attributes);
                                  caller role (per E1 + E2);
                                  language preference;
                                  abstain-policy override (rare;
                                  per H7)
RESPONSE                            advisory_envelope:
                                  feature id; model name + version
                                  + model_card_id;
                                  trained_at timestamp;
                                  confidence score (0-1);
                                  abstain flag (per L2 §4);
                                  output payload (recommendation,
                                  ranked candidates, drafted
                                  text, etc.);
                                  citations (per L2 §3 RAG;
                                  resolvable via E8 / E5);
                                  counter-evidence (top reasons
                                  against);
                                  latency + cost-metric;
                                  model_card link;
                                  per-pack overlay flags
ERRORS                              401 unauth; 403 forbidden;
                                  403 banned-decision-attempted;
                                  404 feature-not-found;
                                  410 feature-deprecated /
                                  feature-killed;
                                  429 cost-envelope-exceeded;
                                  503 sub-processor-unavailable;
                                  503 freshness-stale (model
                                  card stale per L3 freshness)
IDEMPOTENCY                         recommended (idempotency-key);
                                  same input + same model →
                                  same advisory (deterministic
                                  per L2 §3 G10 for regulated)
SLO                                 per SLO-14:
                                  Tier-1 p95 < 200ms;
                                  Tier-2 LLM p95 < 2000ms
EVIDENCE EMIT                       advisory_render (EC-25);
                                  per L2 §6 KPIs
RATE LIMIT                          per identity + per tenant +
                                  per feature; per-tenant cost
                                  envelope (per L2 §9 + I6)
SPECIAL                              banned-decision check pre-
                                  emptive: AI principal denied
                                  for banned-feature-call (per
                                  L1 §4);
                                  abstention is a feature, not
                                  failure (per L2 §4);
                                  high confidence + counter-
                                  evidence presented per L1 §6
```

### 2.2 Capture human decision (override)

```
PATH                              POST /v1/ai/decision
PURPOSE                            record human decision after
                                  seeing advisory:
                                  agreed / disagreed / abstained
INPUT                              advisory_id (from 2.1);
                                  outcome (agreed / disagreed /
                                  abstained);
                                  alternative chosen (where
                                  disagreed);
                                  rationale_text (mandatory ≥ N
                                  chars on disagree);
                                  elapsed time before decision;
                                  reviewer (where second-person);
                                  decision committed by E3
                                  command id (cross-link)
RESPONSE                            decision_record id
EVIDENCE EMIT                       decision_record (EC-24
                                  override_record on disagree);
                                  decision_metadata (EC-22)
SLO                                 < 250ms write
SPECIAL                              override is mandatory capture
                                  per L1 §5; bypass attempt
                                  rejected
```

### 2.3 Retrieve decision record

```
PATH                              GET /v1/ai/decision/{decision_id}
PURPOSE                            retrieve specific AI decision
                                  record
AUDIENCE                            compliance + AI governance +
                                  audit pack assembly
RESPONSE                            full record:
                                  advisory_render +
                                  decision_record +
                                  cross-link to E3 command +
                                  cross-link to model_card
EVIDENCE EMIT                       access_audit
```

### 2.4 List decisions for a record

```
PATH                              GET /v1/ai/decision/record/
                                  {root_kind}/{root_id}
PURPOSE                            all AI decisions linked to
                                  authoritative record
AUDIENCE                            record-shell UI;
                                  audit pack assembly
RESPONSE                             list: advisory + decision +
                                  per-feature label;
                                  pagination
EVIDENCE EMIT                       sampled access_audit
```

### 2.5 Per-feature KPI metrics

```
PATH                              GET /v1/ai/feature/{feature_id}/
                                  kpi
PURPOSE                            acceptance rate, override rate,
                                  abstention rate, calibration,
                                  drift signals, cost, freshness
                                  age (per L2 §6)
AUDIENCE                            AI Lead;
                                  governance review (H6);
                                  customer transparency
RESPONSE                             KPI envelope per period
                                  (daily / weekly / monthly)
EVIDENCE EMIT                       sampled access
SPECIAL                              KPI breach gates feature ramp
                                  per L3 §7
```

### 2.6 Model card retrieval

```
PATH                              GET /v1/ai/model/{model_id}/
                                  card
PURPOSE                            return model card per L3 §3
AUDIENCE                            compliance; regulator;
                                  customer DPO + Quality Lead;
                                  inspector portal
RESPONSE                             model card:
                                  parent + training corpus +
                                  methodology + held-out + adver-
                                  sarial set + metrics +
                                  fairness assessment +
                                  robustness assessment +
                                  intended use + out-of-scope +
                                  failure modes + override
                                  expectation + thresholds +
                                  freshness floor + sub-
                                  processor + retraining schedule
EVIDENCE EMIT                       access_audit
DEPRECATION                          per L3 retirement
```

### 2.7 Red-team report retrieval

```
PATH                              GET /v1/ai/feature/{feature_id}/
                                  redteam
PURPOSE                            quarterly red-team reports
                                  per L4
AUDIENCE                            Security + AI + Compliance
                                  Lead;
                                  regulator (with explicit DPA);
                                  customer (attestation only;
                                  not contents)
RESPONSE                             time-ordered red-team events;
                                  per cycle: probe pack version,
                                  finding count by severity,
                                  remediation status, deadline
EVIDENCE EMIT                       restricted_access (EC-22 +
                                  restricted flag)
SPECIAL                              restricted class per H4 §1;
                                  cross-tenant impossible
```

### 2.8 Per-tenant feature toggle

```
PATH                              POST /v1/ai/tenant/feature/
                                  {feature_id}
                                  GET  /v1/ai/tenant/feature/
PURPOSE                            tenant admin enables / disables
                                  feature within regulator floor
                                  (per L1 §9)
AUDIENCE                            tenant admin
PRECONDITIONS                       H7 Class A (regulated impact)
                                  or B per L3 §10 retirement
RESPONSE                             config snapshot id
ERRORS                              422 below_floor;
                                  403 not-tenant-admin
EVIDENCE EMIT                       config_change (EC-16)
```

### 2.9 Kill switch

```
PATH                              POST /v1/ai/feature/{feature_id}/
                                  kill
                                  POST /v1/ai/feature/{feature_id}/
                                  resume
PURPOSE                            emergency disable / re-enable
                                  feature
AUDIENCE                            Compliance + AI + Security
                                  joint signoff (per L4 §6);
                                  tenant kill possible per
                                  scope
PRECONDITIONS                       red-team SEV-1 finding;
                                  hallucination event per L4 §3;
                                  cost envelope exhaustion;
                                  customer demand (transparent)
RESPONSE                             kill_event id
EVIDENCE EMIT                       kill_switch_event (per L4 §5
                                  ledger; multi-sig EC-2)
SLO                                 effect immediate; cache flush
                                  via CDC
SPECIAL                              quarterly kill-switch test per
                                  L4 §6
```

### 2.10 Banned-decision attempt log read (audit)

```
PATH                              GET /v1/ai/banned-attempts
PURPOSE                            view per L1 §7 logged
                                  banned-decision attempts
AUDIENCE                            AI + Security + Compliance
                                  Lead; regulator inspector
                                  (per scope)
RESPONSE                             time-ordered events:
                                  attempt by (principal),
                                  feature, target action,
                                  layer that blocked
                                  (CI / runtime / offline),
                                  outcome, scope
EVIDENCE EMIT                       restricted_access
EXPECTED COUNT                       0 per quarter (per SLO-22)
```

### 2.11 Sub-processor routing visibility

```
PATH                              GET /v1/ai/feature/{feature_id}/
                                  routing
PURPOSE                            return current routing of
                                  feature (in-house vs sub-
                                  processor; per L2 §8)
AUDIENCE                            tenant DPO; Compliance;
                                  inspector
RESPONSE                             routing details: provider,
                                  region pinning, contract
                                  status, last security review
                                  (per I7 §7);
                                  redacted per DPA
EVIDENCE EMIT                       access_audit
```

### 2.12 PCCP envelope (MD AI per FDA)

```
PATH                              GET /v1/ai/feature/{feature_id}/
                                  pccp
PURPOSE                            return PCCP envelope per L3 §6
                                  for SaMD AI features (J4)
AUDIENCE                            FDA + customer + Compliance
RESPONSE                             envelope: scope of allowed
                                  retraining + reporting category
                                  + envelope re-authorization
                                  date
EVIDENCE EMIT                       access_audit
SPECIAL                              MD pack only
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session per E1
2.1 INVOKE                        per E2 decision; banned-decision
                                  pre-emptive denial (per L1 §4)
                                  for AI principal calling
                                  banned-feature
2.2 OVERRIDE                       same as 2.1 + reason-text
2.5 / 2.6 / 2.7 GOVERNANCE        AI + Compliance + Security
                                  roles
2.7 RED TEAM                       restricted-access per H4 §1
2.8 / 2.9 GOVERNANCE                Compliance + Quality
2.10 AUDIT                          inspector / audit; restricted
2.12 PCCP (MD AI)                    Compliance + AI Lead
TENANT BOUNDARY                       per B6 C5; cross-tenant
                                  inference impossible
SUB-PROCESSOR                       per L2 §8 + I8;
                                  per-tenant DPA control
```

---

## 4. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class with feature
                                 + tenant + scope detail
RAG CITATION (per L2 §3)            every claim cites; ungrounded
                                 → abstain
PROMPT INJECTION DEFENSE             system prompt isolated;
                                 tenant content quarantined;
                                 OWASP LLM01 controls
OUTPUT SANITIZATION                  plain-text default; HTML
                                 escaped; URLs through redirector
DETERMINISM                            temperature 0 for regulated
                                 features (per L2 §3 G10)
CONFIDENCE CALIBRATION                 per L2 §6 monitored;
                                 calibration drift triggers L4
                                 + L3 §4
ABSTENTION                              feature, not failure
                                 (per L2 §4)
BANNED-DECISION                          per L1 §1 + §4 triple
                                 defense; pre-emptive denial at
                                 invoke + at validate
OBSERVABILITY                            per request: trace + tenant +
                                 feature + cost + outcome
COST ENVELOPE                            per L2 §9 + I6 SLO-18;
                                 breach gates ramp + may
                                 trigger degraded mode
CONTINUITY                                per advisory chain;
                                 advisory_render → human
                                 decision → E3 commit
TENANT BOUNDARY                            cross-tenant inference
                                 impossible; sub-processor
                                 region pinning honored
PII REDACTION                              advisory output redacts PII
                                 per role + per pack
DEPRECATION                                per E0 + per L3 retirement
RATE LIMITING                                per OWASP API4 + L2 §9
```

---

## 5. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
ai/feature-not-found                   404
ai/feature-deprecated                   410     per L2 §10
ai/feature-killed                        503     kill switch active
ai/banned-decision-attempted             403     L1 BD-N triple
                                              defense
ai/confidence-below-threshold             204     advisory abstained
                                              (no result; per L2 §4)
ai/cost-envelope-exceeded                  429     per L2 §9 + I6
ai/sub-processor-unavailable               503     per L2 §2
                                              on_failure_behavior
ai/freshness-stale                          503     model card / red-team
                                              freshness floor breached
                                              (per L3 §1)
ai/calibration-drift                         503     drift level 4 triggered
                                              kill switch
ai/red-team-block                            503     SEV-1 red-team finding
                                              gates feature
ai/override-bypass-attempt                   422     attempt to commit
                                              advisory-disagreed without
                                              override (per L1 §5)
ai/tenant-feature-disabled                    404     per I8
ai/below-floor-config                          422     tenant attempted to
                                              relax floor (per L1 §9)
ai/restricted-access                            403     red-team / cyber
ai/cross-tenant-attempt                         403     SEV-1 BD-equivalent
ai/pccp-out-of-envelope                          422     retraining outside
                                              authorized envelope
                                              (per L3 §6)
ai/manifestation-not-localized                  410     per F12;
                                              English fallback per
                                              tenant config
```

---

## 6. SLO + budget

```
2.1 invoke (Tier-1) p95            < 200ms (per SLO-14)
2.1 invoke (Tier-2 LLM) p95          < 2000ms (per SLO-14)
2.1 error rate                        < 0.5%
2.2 override capture                   < 250ms write
2.3 retrieve                            < 250ms
2.4 list                                 < 300ms
2.5 KPI                                   < 500ms
2.6 model card                             < 250ms (cached)
2.7 red-team                                < 300ms
2.8 toggle                                  < 500ms write
2.9 kill                                     immediate effect
2.10 audit log                                < 300ms
2.11 routing                                  < 250ms
2.12 PCCP                                      < 500ms
COST                                            per L2 §9 envelope
                                          (target ≤ $0.001 / call
                                          Tier-1; ≤ $0.05 Tier-2)
```

---

## 7. Wave target

```
W6.5      L4 substrate; first features (AI-01 / AI-02 /
          AI-03) shadow mode (per L3 S5)
W7        L5 advisory deployment (per L3 S6 ramp);
          override capture mandatory; KPI live
W8        AI-04 / AI-05 / AI-06 / AI-07 / AI-08 / AI-09 /
          AI-10 added; cost envelope enforcement
W9        AI-11..AI-17 added; supplier insight + RFQ
          drafting
W10       AI-18..AI-22 added; per-pack overlays GA;
          counterfeit indicator (Aero); vigilance
          reportability suggestion (MD); recall scope
          suggestion (Pharma + MD)
W11       AI-26 sentiment + AI-28 customer reply;
          AI-21 APR / PSUR drafting
W12       AI-30 GenAI test case generator (CSA);
          AI-31 audit pack drafting; AI-32 periodic
          review brief
W12+      PCCP envelope active (J4 MD AI features);
          per L3 §6
```

---

## 8. Per-pack overlays

```
PHARMA (J1)                      AI-21 APR drafting (advisory;
                                 QP signs); deviation-trend
                                 detection (extended AI-09);
                                 stability data anomaly (extended
                                 AI-09); ICSR coding suggestion
AUTO (J2)                        warranty-signal correlation;
                                 PPAP-attribute extraction
                                 (extended AI-08); layered audit
                                 prompt generator
AERO (J3)                        AI-18 counterfeit risk indicator;
                                 AS9102 first-article auto-bubble
                                 (extended AI-08); GIDEP search
                                 (extended AI-06); ITAR
                                 scoping check (advisory)
MD (J4)                          AI-19 vigilance reportability
                                 suggestion (PRRC signs);
                                 clinical-eval lit search;
                                 PSUR section drafting
                                 (extended AI-21); complaint
                                 IMDRF coding (extended AI-05);
                                 PCCP envelope per AI feature
FOOD (J5)                        HACCP plan critical-control
                                 suggestion; FSMA traceability
                                 gap analyzer; complaint
                                 adulteration signal
```

---

## 9. Failure modes (operational)

```
FM1   Hallucination in production
      Behavior: per L4 §3 SEV-1; kill switch (per 2.9);
              advisory hidden; fix or retire
      Recovery: per RB-INC-020; H8 systemic CAPA

FM2   Cost envelope breached
      Behavior: 429 ai/cost-envelope-exceeded
      Recovery: per L2 §9 degraded mode; per I6
              classification

FM3   Sub-processor outage
      Behavior: 503 ai/sub-processor-unavailable
      Recovery: per L2 §2 on_failure_behavior;
              degraded mode; per I3

FM4   Drift level 4 triggered
      Behavior: 503 ai/calibration-drift
      Recovery: kill switch (per L4 §6);
              retraining or retire

FM5   AI principal attempts banned action
      Behavior: 403 ai/banned-decision-attempted
      Recovery: per L1 §4 triple defense;
              SEV-1 if pattern

FM6   Override capture bypassed
      Behavior: 422 ai/override-bypass-attempt
      Recovery: per L1 §5 mandatory; H8 systemic on UX

FM7   Model card freshness expired
      Behavior: 503 ai/freshness-stale
      Recovery: per L3 §1 freshness floor;
              advisory disabled until refresh

FM8   Red-team SEV-1 finding active
      Behavior: 503 ai/red-team-block
      Recovery: per L4 §4 remediation;
              feature blocked until close

FM9   Cross-tenant inference attempt
      Behavior: 403; SEV-1
      Recovery: per B6 C5; H8 systemic

FM10  PCCP envelope exceeded (MD AI)
      Behavior: 422 ai/pccp-out-of-envelope
      Recovery: per L3 §6;
              new submission required;
              promotion blocked

FM11  Tenant disables feature mid-flow
      Behavior: 404 ai/tenant-feature-disabled
      Recovery: graceful UI degrade; existing
              advisories retained perpetually
              (per H5)
```

---

## 10. Roles and authority (RACI)

```
ENDPOINT             AI    COMP  SEC  TENANT  CALLER  AUDITOR
2.1 invoke           A     -     -    R       R       -
2.2 override         A     -     -    R       R       -
2.3 retrieve         A     R     -    R       R       R
2.4 list             A     R     -    R       R       R
2.5 KPI              A     C     -    R       -       R
2.6 model card       A     A     -    R       -       R
2.7 red-team         R     R     A    -       -       R
                                                     (per H3 §7)
2.8 toggle           A     A     -    A       -       -
2.9 kill             A     A     A    R       -       -
                     (joint signoff; per L4 §6)       (tenant
                                                      kill scope)
2.10 banned-attempt  A     R     A    -       -       R
2.11 routing         A     R     C    R       -       R
2.12 PCCP            A     A     -    R       -       R
```

---

## 11. Cross-references

- B6 — RBAC + tenant boundary
- E0 — API conventions
- E1 — identity (caller + AI principal)
- E2 — authority decision (banned-decision routing)
- E3 — workflow command consumes advisory
- E5 — workspace projection consumed (RAG)
- E6 — audit chain
- E8 — evidence (model card + red-team via 2.6/2.7)
- E10 — notification on kill / drift event
- E15 — sub-processor integration
- F1..F8 — UI patterns rendering advisories
- F11 + F12 — a11y + i18n
- H1 §3 — regulator notification on kill / cyber
- H4 — EC-23 model card; EC-24 override; EC-25 advisory_render;
  EC-7 red-team
- H5 — perpetual retention (AI ledger)
- H6 — periodic AI KPI review
- H7 — feature add/change
- H8 — CAPA from red-team / drift
- L0..L5 — full AI discipline
- M5 — SLO-14 + SLO-18 + SLO-22
- M9 — cross-reference

---

## 12. Decision phrase

```
E9_AI_ADVISORY_API_BASELINE_LOCKED
NEXT: E10_NOTIFICATION_API.md
```
