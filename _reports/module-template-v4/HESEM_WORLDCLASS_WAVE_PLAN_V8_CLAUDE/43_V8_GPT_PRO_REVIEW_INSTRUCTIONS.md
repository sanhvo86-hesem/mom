# 43 — V8 GPT Pro Review Instructions

```text
purpose:        Formal request to GPT Pro to review V8 (counter-iteration to V8's superset of V7)
predecessor:    V7 §29 (Claude Max adversarial review prompt)
v8_advance:     V8 produces structured ask + scope + format + comparison axes for GPT Pro V9
```

---

## 1. How to read V8

```yaml
read_order:
  1. README_START_HERE.md (orientation)
  2. 00_V8_MASTER_THESIS.md (premise + V7 acceptance + V8 binding pact)
  3. 01_V8_CAPABILITY_MATURITY_FORMALIZED.md (executable maturity ladder)
  4. 02_V8_INVARIANTS_AND_EXECUTABLE_CHECKS.md (12 invariants with mechanisms)
  5. 04_V8_AUTHORITY_LEDGER_NORMATIVE_MODEL.md (DDL + 11 axioms)
  6. 05_V8_OPERATIONAL_TRUTH_GRAPH_V8.md (V5+V7 unified + 18 axioms)
  7. 27_V8_WAVE_PLAN_REFINED.md (W0..W14 + 2 streams)
  8. 44_V8_SCORECARD_RESPONSE_TO_V7.md (V8 vs V7 axis-by-axis)
  9. 45_V8_ADVERSARIAL_FINDINGS_AGAINST_V7.md (V8's adversarial findings vs V7)

reading_time:
  comprehensive: 4-5 hours
  skim_for_gaps: 1 hour
  v9_counter_iteration: 8-12 hours of GPT Pro time
```

---

## 2. V8 explicit claims (challenge these)

```yaml
claim_1: V8 is engineering-substance binding superset over V7's operating-model superset over V5/V6
  evidence: file 00 §3 binding map (137 entries); files 01-42 each bind one or more V7 names
  challenge: identify any V7 name without a V8 binding entry

claim_2: V8 ships 18 datasets + 18 matrices (V7: 9+9) + 34 prompts (V7: 17)
  evidence: file 46 manifest
  challenge: identify any V7 dataset row V8 fails to absorb

claim_3: V8 fills 8 V7-underspecified axes + 12 V7-missing axes
  evidence: file 00 §4 + §5 with file references
  challenge: identify any V7 axis V8 fails to address

claim_4: V8 wave plan extends V7 with 2 new waves + 2 continuous streams
  evidence: file 27
  challenge: are W13 + W14 + CS-A + CS-B truly necessary or scope creep?

claim_5: V8 proposes 18 axioms (V5 14 + V8 4 new) + 11 Authority Ledger axioms = 29 truth conditions
  evidence: files 04 + 05
  challenge: identify counterexample to any axiom

claim_6: V8 produces 95-root catalog with cross-root DAG (~150 edges)
  evidence: files 11 + 7
  challenge: identify dependency edges V8 missed (incompleteness)

claim_7: V8 quantifies all key invariants with thresholds + escalations
  evidence: files 02 + 24 + 35
  challenge: identify any threshold without engineering justification
```

---

## 3. Adversarial review checklist for GPT Pro V9

```yaml
[ ] Is V8 claim_1 (binding superset) backed by file substance?
[ ] Are V8's 12 invariants truly executable (not aspirational)?
[ ] Is V8 OTG axiom set sound (no counterexamples)?
[ ] Are V8 SLO thresholds (file 24) achievable / engineering-justified?
[ ] Does V8 wave DAG (file 06) capture real dependencies?
[ ] Does V8 cross-root DAG (file 07) miss any edge?
[ ] Are V8 vertical packs (29-32) regulator-defensible?
[ ] Is V8 quantitative model (30) arithmetically consistent?
[ ] Does V8 risk register (35) capture top-N material risks?
[ ] Are V8 prompts (file 42) actionable by Codex without ambiguity?
[ ] Does V8 fill V7's underspecification (file 00 §4)?
[ ] Does V8 introduce real disciplines V7 omits (file 00 §5)?
```

---

## 4. Counter-iteration request

```yaml
GPT_Pro_V9_format_expected:
  - HESEM_WORLDCLASS_WAVE_PLAN_V9_GPTPRO/00_V9_THESIS.md
  - + delta files updating V8 sections
  - + GPT Pro's new ADRs (continue numbering)
  - + new open decisions
  - + V9-vs-V8 scorecard
  
constraints:
  - V9 should not undo V7's accepted strengths
  - V9 should not undo V8's added bindings unless flawed
  - V9 should be falsifiable in same way V8 is
  - V9 should add substance, not subtract
  - V9 should respect HESEM's pre-production status
```

V8 commits to producing V10 after V9 if V9 introduces real substance.

---

## 5. Decision phrase

```text
V8_GPT_PRO_REVIEW_INSTRUCTIONS_BASELINE_LOCKED
NEXT_FILE: 44_V8_SCORECARD_RESPONSE_TO_V7.md
```
