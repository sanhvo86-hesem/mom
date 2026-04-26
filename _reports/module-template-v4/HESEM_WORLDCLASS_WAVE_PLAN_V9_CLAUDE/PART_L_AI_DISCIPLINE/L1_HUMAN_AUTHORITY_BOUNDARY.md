# L1 — Human Authority Boundary

```
chapter_purpose: define which regulated decisions humans MUST own
                 even if AI is more accurate; how the boundary is
                 enforced at three independent layers; how overrides
                 are captured to keep humans in real authority not
                 nominal authority
owner_role:      AI Lead with Compliance Lead
sources:         EU AI Act Art 14 (human oversight), NIST AI RMF
                 1.0 GOVERN-2 + MANAGE, FDA AI/ML SaMD Action Plan,
                 21 CFR 11.10(j) accountability, ISO/IEC 42001
                 §8 operational planning, ISO 14971 §7 risk control,
                 ICH Q9(R1) §5, Anthropic / OpenAI red-team practice
```

The Human Authority Boundary is the most important single rule in
HESEM's AI program. It states: **AI may never autonomously commit a
regulated decision**, no matter how confident, fast, or expensive
the alternative. The boundary is not a posture; it is enforced by
three independent layers, monitored continuously, and audited
externally.

---

## 1. Boundary in plain language

```
AI MAY                                 AI MAY NEVER
recommend N candidates                 commit a regulated decision
rank candidates                         sign as a human approver
score risk                              alter audit trail
cluster + summarize                     adjust evidence record
extract structured data                 close a regulated record alone
draft text for human review             bypass workflow guard
search + retrieve                       issue command-bus mutations as
                                        principal for banned decisions
translate                               override a human override
abstain ("I don't know")                escalate to autonomous action
                                        when confidence high
```

Confidence is irrelevant to the boundary. A 99.99%-confident AI is
still bound by it; the boundary is about **authority**, not
**accuracy**.

---

## 2. The 8 banned regulated decisions (BD-1..BD-8)

```
BD-1  Release a lot for shipment / batch release        BREL approve_release
                                                          + Pharma QP / MD release
BD-2  Approve disposition of nonconforming material      NQCASE dispose_*
                                                          (accept/repair/scrap/RTV)
BD-3  Close a CAPA (incl. effectiveness verification)    CAPA action_close +
                                                          effectiveness_pass
BD-4  Release a controlled document (effectivity)         CDOC release
BD-5  Approve an Engineering Change Order                  ECO approve
BD-6  Certify a training record / qualification             TRAIN_RECORD certify
BD-7  Qualify a supplier                                    SUP_QUAL qualify_decide
BD-8  Decide a recall or field action                       RECALL open / escalate
```

The set is not arbitrary. Each item is an irreversible regulated
decision that:
- Is required by regulation to be human-attributed (or QP/PRRC-
  attributed) — see H1 §4 mapping
- Has potential for patient / consumer / safety impact
- Cannot be confidently undone by a subsequent action
- Has been a frequent failure mode in industry (recurring 483 / EMA
  finding patterns)

---

## 3. Boundary extensions per vertical pack

The 8 baseline decisions are a floor. Vertical packs extend the list
when the vertical's regulator demands explicit human authorship
elsewhere:

```
PHARMA (J1)            BD-9  Annual Product Review signoff
                       BD-10 Stability data conclusion
                       BD-11 Investigation closeout (deviation)
                       BD-12 Sterility test exception
MED DEVICE (J4)        BD-13 Clinical evaluation signoff
                       BD-14 PSUR conclusion
                       BD-15 Vigilance reportability decision
                       BD-16 Risk acceptability signoff (ISO 14971)
AUTO (J2)              BD-17 PPAP submit
                       BD-18 Production Trial Run release
                       BD-19 Customer Notification of Deviation (CND)
AERO (J3)              BD-20 First Article Inspection signoff
                       BD-21 Counterfeit avoidance attestation
                       BD-22 GIDEP submission
                       BD-23 Service-Life-Limited part disposition
                       BD-24 ITAR access grant
                       BD-25 Airworthiness directive compliance
FOOD (J5)              BD-26 HACCP plan reauthorization
                       BD-27 FSMA recall classification
                       BD-28 Food contact substance exception
CYBER / PRIVACY        BD-29 Privileged access grant
                       BD-30 Encryption key export
                       BD-31 Subprocessor onboarding
                       BD-32 Cross-border transfer authorization
GENERAL                BD-33 Tenant offboarding
                       BD-34 Retention class change
                       BD-35 Audit chain anchor cadence change
                       BD-36 Banned-decision surface change (this list)
```

The list is exhaustive at this baseline. Additions / removals route
through H7 (Class A change). Removal requires Compliance Lead +
Quality Lead joint approval and never permits removal during a
period of high regulatory scrutiny.

---

## 4. The triple-defense architecture

A single layer of defense is insufficient because each layer has
known failure modes. HESEM uses three independent, redundant layers
each capable of stopping a banned decision alone.

### 4.1 Layer 1 — CI / static (build-time)

```
Static rule: command handlers for any of BD-1..BD-N MUST NOT accept
ai_advisory_annotation as the principal.
Implementation: pre-merge check parses command bus registrations;
rejects if AI principal touches banned route.
Failure mode covered: developer mistake / refactor introduces the
ability accidentally.
Failure mode NOT covered: runtime composition bypassing the route.
```

### 4.2 Layer 2 — Runtime middleware (request-time)

```
Runtime rule: every mutation through workflow command bus passes
through an authority middleware. Middleware:
  - reads actor.kind (human / ai_service_principal / system)
  - reads command.banned_set membership (per registry)
  - rejects with RFC 9457 problem detail if AI on banned set
Failure mode covered: composition / runtime injection.
Failure mode NOT covered: bug in middleware itself.
```

### 4.3 Layer 3 — Offline integrity (audit-time)

```
Nightly job: scan OTG event log for transactions of subject =
banned-set committed by ai_advisory_annotation principal.
Expected count: 0.
Mismatch: SEV-1; halt new mutations on affected scope until
investigated; H8 systemic CAPA.
Failure mode covered: any combination of layer 1 + 2 escape.
Failure mode NOT covered: tampered log itself; audit chain anchor
detects this in turn.
```

The three layers are independent: layer 1 is built, layer 2 is run,
layer 3 is observed. A defect in any one is caught by the next.
Quarterly red-team verifies each layer independently.

### 4.4 Cross-layer monitoring

A small detector watches for:
- CI rule disabled / weakened in PR (rejected at PR time)
- Middleware health probe missing
- Offline job has not run within cadence

Detector failure routes to SEV-1.

---

## 5. Override capture

Even a Tier-1 advisory feature where AI is correct 99% of the time
must capture overrides. Two reasons:
- Auditor must see that humans actually exercise authority, not
  rubber-stamp.
- Overrides are training signal; high override rate may mean AI
  guidance is wrong.

```
WHEN ADVISORY SHOWN (EC-25)        record advisory_id, model_id,
                                    confidence, rationale
WHEN HUMAN AGREES                   no extra capture (implicit)
WHEN HUMAN DISAGREES                capture override_record (EC-24)
                                    with: alternative chosen,
                                    rationale_text (mandatory),
                                    elapsed time before decision,
                                    reviewer if any
WHEN HUMAN ABSTAINS                 capture: chose-no-AI rationale
WHEN AI ABSTAINS                    capture: AI returned no answer;
                                    human still decides; record what
                                    human chose
```

Override rate per feature is a top-3 KPI (per L3); ≥ 25% override
sustained → re-PQ + retraining trigger.

---

## 6. Human-in-loop quality

A nominal human in the loop who clicks "approve" without reading is
a regulatory failure (rubber-stamp pattern). HESEM resists this
through:

```
ANTI-RUBBER-STAMP CONTROLS

Friction calibrated to risk        Tier-1 decisions require explicit
                                    re-confirmation + reason text
                                    (≥ 30 chars); typing rate
                                    monitored
Confidence transparency             advisory shows confidence + top
                                    counter-evidence
Counter-evidence presentation       AI must surface the strongest
                                    evidence against its own
                                    recommendation
Time-on-task tracking                very short decision time on
                                    high-risk advisory flagged
Periodic-paired review              random sample of approvals
                                    re-reviewed by independent
                                    person; mismatch → discussion
Disagreement bonus                   override that turns out to be
                                    correct surfaces in dashboard
                                    (cultural reinforcement)
Quorum at risk                       Tier-1 + AI-disagreement triggers
                                    second human approver
```

The discipline is calibrated by the friction-vs-throughput tradeoff:
too-much friction → users develop muscle memory; too-little →
rubber-stamp. Calibration is itself a regulated capability with a
validation pack.

---

## 7. Banned-decision attempt logging

Even attempts that are blocked are logged:

```
EVENT                                   STORED AS
attempt blocked at layer 1 (CI)          PR / build artifact + alert
attempt blocked at layer 2 (runtime)     EC-22 access_audit + alert
                                          + outcome=blocked
attempt detected at layer 3 (offline)    SEV-1; EC-17 incident +
                                          EC-22 + scope halt
human override of AI on banned set        EC-24 override_record;
                                          treated as authoritative
                                          per AI advisory only
```

Quarterly review of blocked-attempt log identifies process gaps,
training needs, and possibly UI design issues.

---

## 8. Edge cases at the boundary

```
EDGE CASE                                RESOLUTION
AI advisory + human one-click approve     friction calibration per §6
                                          ensures real review
AI proposes; human delegates to AI        delegation forbidden for
                                          banned set (per L1); error
                                          on attempt
AI proposes; another AI second-checks     not human authority;
                                          rejected
Human approves AI-suggested batch         human signs the release;
                                          AI advisory recorded as
                                          input (EC-25); not
                                          banned-decision violation
AI auto-classifies severity in ticket     OK (advisory) until severity
                                          drives a banned action; at
                                          that point human re-confirms
AI returns no answer; human decides       OK; abstention is feature
                                          (per §6)
AI finds counterfeit risk in supplier      AI surfaces; human qualifies
                                          decision (BD-7) is
                                          human-only; AI advisory
                                          captured
Tenant configures lower friction          floor protected; tenant
                                          cannot configure below
                                          regulator floor
Emergency requires fast decision           regulated decision still
                                          human; emergency-class
                                          signing path defined per E7
                                          but is human path
Outage; AI unavailable                    no impact on human authority;
                                          decision proceeds without AI
                                          (advisory degraded)
AI updated mid-decision flow              decision uses AI version
                                          frozen at advisory render
                                          time (per L3 model card)
Human signs after walking away             session re-auth required for
                                          high-risk decisions per E7
```

---

## 9. Customer-side configuration

Tenants can NOT relax the 8+ baseline. Tenants CAN:

- Tighten (add to BD set per their internal QMS)
- Choose Tier-2 or Tier-3 features to disable for their tenant
- Configure double-quorum where regulator floor is single-quorum
- Tighten friction calibration

Tenant choice surface (per I8):
```
Per-feature kill switch (default on / off per feature)
Per-feature friction tier
Override-evidence requirement (text length, second person)
AI confidence threshold at which advisory is shown
Banned-decision signing quorum
```

Tenant configurations are themselves regulated changes (per H7).

---

## 10. Communication to end users

When an advisory is shown:

```
- Source ("AI suggestion", with model name + version)
- Confidence (per L2 thresholds: high / medium / low)
- Rationale (top reasons, in user language)
- Counter-evidence (top reasons against)
- Linked evidence (records the AI considered)
- Action options (approve / override / defer / ask AI to recompute)
- Disclosure that the user, not AI, owns the decision
- For Pharma/MD: regulator-required transparency text
```

For LLM-grounded advisory (RAG), every claim has citation.
Ungrounded answer is replaced with "no answer found" (per L2 §3).

---

## 11. Failure modes

```
FM1   AI principal accidentally added to banned route
      Recovery: Layer 1 catches at build; if escapes, Layer 2 catches
              at runtime; if both escape, Layer 3 nightly catches;
              SEV escalation per §4.

FM2   Override-capture skipped (human disagrees but no record)
      Recovery: UI form blocks proceed-without-rationale; refusal
              event logged; H8 CAPA on UX gap.

FM3   Rubber-stamp pattern (very fast approvals)
      Recovery: friction-calibration audit per §6; training; UX
              redesign if pattern persists.

FM4   AI confidence calibration drift
      Recovery: per L3 §4 drift; retraining (per L3 §5) triggered.

FM5   Tenant configures below floor
      Recovery: configuration validator rejects; floor enforced as
              regulated invariant.

FM6   Banned set extension proposed without proper change
      Recovery: per H7 §6 quorum; H3 audit catches stale list.

FM7   Vertical pack extension forgotten when pack enabled
      Recovery: pack toggle adds extensions automatically; periodic
              review (H6) verifies coherence.

FM8   Override evidence loss in DR
      Recovery: per H5 + I4 backup integrity; restore + reconcile.

FM9   AI agent in autonomous chain reaches banned route via plugin
      Recovery: plugin allowlist excludes banned routes; plugin
              acquisition is itself BD-extended (BD-31 sub-processor).

FM10  Human approval but with stale auth token
      Recovery: E7 signature verification rejects; user re-auth.
```

---

## 12. Roles and authority (RACI)

```
Role                 BOUND-LIST  TRIPLE-DEF  OVERRIDE  REVIEW  RED-TEAM
AI Lead              R           R           R          R       R
Compliance Lead      A           A           A          A       C
Security Lead        C           A           C          C       A
Engineering Lead     C           R           C          C       C
Quality Lead         A           C           A          A       C
Vertical Pack Lead   R(pack)     C           C          R(pack) C
QP / PRRC            A(pack)     -           -          C       -
Tenant Admin         I           -           I          C       -
End User             -           -           -          I       -
```

---

## 13. Cross-references

- L0 — chapter overview
- L2 — feature catalog (each feature declares its banned-decision
  posture)
- L3 — lifecycle (override-capture KPI per stage)
- L4 — red-team (verifies triple-defense)
- L5 — prompt discipline (CI checks for boundary in code review)
- H1 §4 — clauses naming AI human-oversight requirements
- H4 — override_record (EC-24) + advisory_render (EC-25) classes
- H7 §6 — quorum rules consistent with this chapter
- H9 — risk class drives Tier
- B6 — RBAC + OTG axiom enforcement substrate
- F1..F12 — UI rendering of advisory + counter-evidence
- I7 — security; runtime middleware
- M9 — cross-reference index

---

## 14. Decision phrase

```
L1_HUMAN_AUTHORITY_BOUNDARY_BASELINE_LOCKED
NEXT: L2_AI_FEATURE_CATALOG.md
```
