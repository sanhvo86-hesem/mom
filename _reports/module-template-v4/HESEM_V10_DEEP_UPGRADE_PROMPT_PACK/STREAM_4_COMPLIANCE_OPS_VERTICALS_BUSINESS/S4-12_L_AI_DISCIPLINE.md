# S4-12 — L0..L5 AI Discipline (Consolidated)

```
prompt_id: S4-12    stream: 4    sequence: 12 of 16    effort: ~80 min
```

## Pre-flight
S4-00; V9: PART_L_AI_DISCIPLINE/L0..L5; cross-refs B2 + B6
+ E2 + E9 + E14; H1 §4 (clauses); H4 EC-7/23/24/25; M5
SLO-14/18/22; per-pack J1-J5

Standards exhaustive:
NIST AI RMF 1.0 (GOVERN/MAP/MEASURE/MANAGE) + NIST AI 600-1
(GenAI profile); ISO/IEC 42001:2023; ISO/IEC 23894:2023;
ISO/IEC 25059:2023; ISO/IEC 5259 series; EU AI Act 2024/1689
+ Annex III; FDA AI/ML SaMD Action Plan + PCCP draft 2023;
21 CFR 11.10(j); EU MDR Art 15 (PRRC); ICH Q9(R1) + ISO 14971
(safety-critical AI); MITRE ATLAS; OWASP LLM Top 10 (2024);
Anthropic + OpenAI red-team disclosures; DeepMind safety
taxonomy

## Deliverable
PART_L_AI_DISCIPLINE/L0_PART_L_OVERVIEW.md
PART_L_AI_DISCIPLINE/L1_HUMAN_AUTHORITY_BOUNDARY.md
PART_L_AI_DISCIPLINE/L2_AI_FEATURE_CATALOG.md
PART_L_AI_DISCIPLINE/L3_AI_LIFECYCLE.md
PART_L_AI_DISCIPLINE/L4_AI_RED_TEAM.md
PART_L_AI_DISCIPLINE/L5_AI_PROMPT_DISCIPLINE.md

## Depth requirements

L0 Overview: orientation; reading order; cross-references

L1 — Human Authority Boundary:
- Plain-language framing
- 8 banned-decisions (BD-1..BD-8) — exhaustive
- Per-pack BD extensions ≥ 28 (BD-9..BD-36+ per V9)
- Triple defense (CI / runtime / offline) — concrete
- Override capture EC-24
- Anti-rubber-stamp friction calibration
- Banned-decision attempt logging
- Edge cases at boundary (≥ 12)
- Customer-side configuration (cannot relax floor)
- Communication to end users (per L2 §10 → L1)
- Failure modes ≥ 10
- RACI

L2 — AI Feature Catalog:
- Inventory ≥ 32 features (AI-01..AI-32+) per V9 baseline
- Per-feature governance contract (≥ 25 fields)
- RAG citation discipline (G1..G10)
- Confidence + abstention thresholds per Tier
- Per-feature deployment cadence per L3
- Per-feature KPI catalog (≥ 12 KPIs per feature)
- Per-pack overlay (per pack-specific AI feature extensions)
- Sub-processor / hosting (per L2 §8 + I8 + DPA)
- Cost governance per L2 §9 + I6
- Retirement / sunset

L3 — AI Lifecycle:
- 9 stages S0..S9
- Stage gates with signed transitions
- Model card contract
- Drift detection (input / output / acceptance / concept)
- Retraining cycle
- Predetermined Change Control Plan PCCP (FDA MD draft 2023)
- Per L3 KPI per stage
- Sub-processor lifecycle integration
- Per-pack specifics (Pharma APR / PSUR; MD vigilance / PCCP;
  Auto / Aero / Food specifics)
- AI governance ledger (operational)
- Failure modes ≥ 10

L4 — AI Red-Team:
- Cadence (Tier-1 semiannual; Tier-2 quarterly; on-event)
- Probe pack (OWASP LLM Top 10; classical ML; system probes)
- Severity classification (SEV-1..SEV-OBS)
- Remediation discipline (DETECT → triage → contain → fix →
  verify → close)
- AI governance ledger continuation
- Kill-switch operations (per L4 §6)
- Per-pack red-team extensions
- External red-team (annual)
- Failure modes ≥ 10

L5 — AI Prompt Discipline:
- 3-layer (CONTEXT / SCOPE / CHECK)
- Per task class (T1-T15) reading list
- Allowed / forbidden file lists per task
- Decision phrase per task
- 7 mandatory elements of a HESEM AI prompt
- Anti-patterns enforcement
- Worked example (good vs bad prompt)

## Required substance
L0: ≥ 1,500; L1: ≥ 8,000; L2: ≥ 7,500; L3: ≥ 7,000;
L4: ≥ 7,000; L5: ≥ 5,000 words

## Acceptance criteria
```
[ ] L1 BD-1..BD-N + ≥ 28 pack extensions; triple defense
    concrete
[ ] L2 ≥ 32 features with full governance contract
[ ] L3 9 stages + signed gates + drift + retraining + PCCP
[ ] L4 OWASP LLM Top 10 + classical ML + system probes;
    severity ladder; kill-switch ops
[ ] L5 3-layer + T1-T15 + 7 mandatory elements
[ ] All cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted (per chapter + cumulative)
```

## Decision phrase
```
S4-12_L_AI_DISCIPLINE_DEEP_UPGRADE_COMPLETE
```

After: load S4-13_K_BUSINESS.md.
