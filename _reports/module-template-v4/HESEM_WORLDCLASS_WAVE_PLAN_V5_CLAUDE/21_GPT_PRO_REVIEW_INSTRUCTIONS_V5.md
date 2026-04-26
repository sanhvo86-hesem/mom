# 21_GPT_PRO_REVIEW_INSTRUCTIONS_V5.md

## Purpose

This file is V5's formal request to GPT Pro to review V5 with the same rigor V4 reviewed V3.

V5 has accepted V4's strengths (per file 00 §1) and produced engineering substance V4 omitted. The expectation is **adversarial review**, not validation.

V5 specifically asks GPT Pro to attempt to falsify V5's claims, find gaps, and produce its own counter-iteration if warranted.

---

## Section 1 — How to read V5

### 1.1 File order

```text
00  Master Thesis                              READ FIRST  (premise)
01  Operating System Architecture deepened     READ SECOND (8 layers)
02  Authority + Truth Graph formal model       READ THIRD  (OTG normative spec)
03  Wave Plan V5 Refined                       READ FOURTH (14 waves)
04  Wave Pack Deep Dive W0-W4                  detailed per-wave
05  Wave Pack Deep Dive W5-W10                 detailed per-wave
06  MES/OT engineering depth                   ISA-95/88, edge gateway, OPC UA
07  Regulatory/validation depth                21 CFR 11, GAMP 5, validation
08  EQMS quality engineering                   coupled state machines
09  API contract factory                       OpenAPI 3.1.1, RFC 9457
10  Data engineering for digital thread        CDC, MV, search, time-series
11  AI engineering playbook                    NIST RMF + EU AI Act + RULE-2
12  Platform engineering & SRE                 IDP, observability, DORA
13  Security threat model & DevSecOps          STRIDE, ASVS 5.0, SLSA
14  Pharma vertical pack                       21 CFR 211, ICH Q, DSCSA, recall
15  Automotive vertical pack                   IATF 16949, APQP, PPAP, AS9145
16  Aerospace vertical pack                    AS9100D, AS9102, NADCAP, ITAR, DFARS
17  Business + economic model                  pricing, GTM, unit economics
18  Team topology + DORA                       team types, ways of working
19  Quantitative models                        capacity, latency, cost, probability
20  Risk register V5 formal                    30 risks + STRIDE + LINDDUN
21  GPT Pro review instructions V5             this file
22  Claude V5 scorecard answer                 V4-axis-scoring response
```

### 1.2 Reading time estimate

```text
Comprehensive review:           ~3-4 hours
Skim for gaps:                  ~1 hour
Specific claim verification:    ~30 min per claim
Producing V6 counter-iteration: ~6-10 hours of GPT Pro time
```

---

## Section 2 — V5 explicit claims (challenge these)

### Claim 1: V5 is engineering-substance-superset over V4

```text
V5 produces:
  - 8 layers + 12 cross-cuttings + 20 architectural coordinates
  - 8-class authority taxonomy (incl. policy_directive added)
  - 18 standard predicate types with cardinality
  - 14 axioms with online + offline integrity checks
  - Normative SQL schema (otg_node, otg_edge, otg_event, audit_chain_anchor)
  - 5 mandatory materialized views
  - 10-query catalog with latency budgets
  - 14 waves (vs V4's 11) with falsifiable per-wave gates
  - 290+ ADR titles with substance
  - DORA Elite-tier targets quantified
  - Per-vertical authority root + edge specifications
  - LINDDUN privacy + STRIDE security threat catalog
  - 30 formal risks with FMEA scoring

Challenge: identify any claim NOT backed by file substance.
```

### Claim 2: V5 wave plan is falsifiable

```text
Every wave has objective entry/exit criteria.
Every gate is mechanically verifiable.
Every per-slice graduation has explicit ADR template.
Every SLO has burn-rate alert + runbook reference.

Challenge: identify any wave gate that is subjective or unmeasurable.
```

### Claim 3: V5 absorbs V4's strengths

```text
V5 explicitly accepts (per file 00 §1):
  - V4's 5-layer model (refined to 8)
  - V4's 11 waves (extended to 14 with sub-waves)
  - V4's "one-line rule" methodology (kept)
  - V4's expert-lens framework (extended from 8 to 14)
  - V4's OTG sketch (formalized)
  - V4's pre-production wording discipline (kept)
  - V4's 8-banned-decisions (kept; promoted to RULE-2)
  - V4's 15-question checklist (kept)
  - V4's 8-standard-artifacts-per-wave (kept)
  - V4's wave stabilization gate (kept)
  - V4's three-stage slice graduation (kept)
  - V4's standard decision phrases (kept)
  - V4's forbidden-files frame (kept)

Challenge: identify any V4 strength V5 fails to credit.
```

### Claim 4: V5 fills V4's underspecified disciplines

```text
V5 produces engineering substance for:
  1.  formal OTG axiom set + integrity checks
  2.  layer-pair contracts (what crosses each boundary)
  3.  per-cross-cutting per-layer ownership (12 × 8 = 96 cells)
  4.  per-slice maturity coordinate (3-axis cube)
  5.  edge gateway architecture (file 06 §5)
  6.  ISA-95 / ISA-88 mapping with B2MML
  7.  GAMP 5 Second Edition CSA-aligned validation
  8.  RFC 9457 problem-detail registry (40+ types)
  9.  Idempotency + ETag + If-Match + cursor pagination
  10. AsyncAPI 2.6 event surface
  11. CDC pipeline engineering (logical decoding)
  12. Materialized view refresh strategy
  13. Time-series at scale (TimescaleDB)
  14. Data contracts (consumer-driven)
  15. NIST AI RMF + EU AI Act + ISO 42001
  16. RAG citation + OWASP LLM Top 10
  17. Per-feature confidence + abstain rate
  18. ASVS 5.0 + LINDDUN + STRIDE per layer
  19. SLSA + SBOM + supply chain
  20. Per-vertical authority roots + audit packs
  21. Quantitative capacity / latency / cost models
  22. DORA Elite-tier with continuous measurement
  23. Per-tenant cost SLA + engineering absorption

Challenge: identify any underspecified V4 area V5 missed.
```

### Claim 5: V5 fills V4 missing disciplines

```text
V5 introduces (V4 absent):
  1.  Quantitative models (file 19)
  2.  Threat modeling (STRIDE, LINDDUN — file 13)
  3.  OWASP API + LLM + ML Top 10 mappings (files 13 + 11)
  4.  Data engineering deep dive (file 10)
  5.  MLOps + RAG + LLM safety (file 11)
  6.  DORA + SPACE measurement (file 18)
  7.  Decision quality methodology (per-decision ADR template, file 04)
  8.  Change management + risk classification (file 07 §11)
  9.  Business + economic model (file 17)
  10. Team Topologies framework (file 18)
  11. Capacity planning (files 12 + 19)
  12. Cost engineering across waves (file 19)
  13. Customer success metrics (file 17 §11)
  14. Cross-jurisdictional regulatory crosswalk (files 7+14+15+16)

Challenge: identify any missing-discipline V5 still misses.
```

---

## Section 3 — Specific challenge questions for GPT Pro

### CQ-1: Does V5 over-engineer the 14-wave structure?

V4's 11 waves may be sufficient. V5's W0.5 + W4.5 + W6.5 split adds 3 more waves. Does this create unnecessary process overhead, or does it correctly externalize hidden dependencies?

```text
Pro candidates:
  - hidden dependencies become explicit (positive)
  - team can focus on substrate without business-feature pressure (positive)
  - sub-waves are smaller; lower fail-blast (positive)
Con candidates:
  - more wave boundaries = more decision phrases = more bureaucracy (negative)
  - sub-waves may not be "sub" — they are full waves disguised
  - 14 waves vs 11 = 27% more gate ceremony
```

### CQ-2: Is OTG canonical-as-Postgres correct, or should HESEM ship with native graph DB from day one?

V5 ADR-0050 says Postgres is canonical; Neo4j only if Q1/Q6 fail. GPT Pro: is this risk-aware or premature optimization avoidance?

```text
Pro candidates:
  - leverages existing operational maturity
  - avoids premature ops cost
  - SQL ecosystem support (dbt, ETL, etc.)
Con candidates:
  - graph queries are awkward in SQL even with adjacency table
  - performance ceiling lower than Neo4j/TigerGraph
  - migration later costs more than building right first
```

### CQ-3: Is "AI advisory only, never autonomous" too conservative?

RULE-2 forbids AI from committing 8 regulated decisions. Some of those (CDOC release for non-controlled docs?) might be safe to automate. GPT Pro: is V5 sacrificing too much value for safety, or is the line drawn correctly?

```text
Pro of strictness (V5's stance):
  - regulatory clarity
  - customer trust
  - avoids worst-case (catastrophic AI decision)
Con of strictness:
  - human bottleneck on routine decisions
  - lost productivity
  - competitor ships autonomous AI; HESEM looks slow
```

### CQ-4: Is per-tenant cost SLA + engineering absorption sustainable?

ADR-0265 commits HESEM to absorb per-tenant cost overruns. GPT Pro: does this scale economically, or does it create incentive misalignment (customers push expensive queries)?

### CQ-5: Are vertical packs correctly scoped?

V5 splits Pharma + Auto + Aero into separate files (14, 15, 16). Med Device + Food sub-packs deferred. GPT Pro: are these the right priorities? Should Med Device be elevated given EU MDR enforcement?

### CQ-6: Is 252 eng-weeks realistic?

File 19 §1.3 calculates 252 eng-weeks total. GPT Pro: does this match V4's "2-3 years to world-class"? Is V5 underestimating any wave?

### CQ-7: Are vertical pack ADRs sufficient for first sale?

GPT Pro: simulate a Pharma customer audit (FDA inspector arrives Day 1 of customer go-live). Does file 14 produce enough evidence to pass an inspection? If not, what's missing?

### CQ-8: Is V5's positioning vs V4 correct?

V5 calls itself "engineering substance superset". GPT Pro: is this self-positioning accurate, or is V5 actually a different document type (closer to "implementation playbook")?

### CQ-9: Does V5 maintain V3's discipline (RULE-1 to RULE-8 per `HESEM_MERGED_WAVE_PLAN_V3/11_DISCIPLINE_RULES.md`)?

GPT Pro: is V5 consistent with V3's discipline rules, or has V5 quietly diverged?

### CQ-10: Where would V5 fail in real customer deployment?

GPT Pro: simulate a real mid-market customer onboarding HESEM through Wave 1-4. What breaks? Where does V5 over-promise vs operational reality?

---

## Section 4 — Adversarial review checklist for GPT Pro

```text
[ ] Does any V5 file contain unverifiable claims?
[ ] Does any axiom (file 02 §2) have a counterexample?
[ ] Does any state machine (files 01, 03, 06, 08) have a deadlock or unreachable state?
[ ] Does any SLO target (files 12, 19) lack engineering justification?
[ ] Does any per-wave decision phrase admit multiple interpretations?
[ ] Does any OpenAPI fragment (file 09) violate OpenAPI 3.1.1?
[ ] Does any CDC + MV claim (file 10) ignore failure modes?
[ ] Does any ML model description (file 11) skip bias / fairness?
[ ] Does any vertical pack file (14, 15, 16) miss a regulatory authority?
[ ] Does the quantitative model (file 19) have arithmetic errors?
[ ] Does the risk register (file 20) miss a top-10 risk?
[ ] Does any cross-reference (file Xxx → file Yyy) point to a wrong location?
```

---

## Section 5 — Counter-iteration request

If GPT Pro produces a V6 counter-iteration:

```text
Format expected:
  - HESEM_WORLDCLASS_WAVE_PLAN_V6_GPTPRO/00_V6_THESIS.md
  - + delta files updating specific V5 sections
  - + GPT Pro's new ADRs (continue numbering from ADR-0292)
  - + new open decisions
  - + delta wave plan if applicable

Constraints:
  - V6 should not undo V4's accepted strengths
  - V6 should not undo V5's added depth unless flawed
  - V6 should be falsifiable in same way V5 is
  - V6 should add substance, not subtract
  - V6 should respect HESEM's pre-production status
```

V5 commits to producing V7 after V6 if V6 introduces real substance.

---

## Section 6 — Scope of expected GPT Pro feedback

```text
HIGH-PRIORITY feedback we want:
  - missing engineering substance
  - wrong architecture decisions
  - underspecified components
  - regulatory gaps
  - quantitative errors
  - adversarial threat model gaps
  - economic model errors

LOWER-PRIORITY feedback:
  - typos / grammar
  - file count / formatting preferences
  - "consider also" suggestions without engineering substance
```

---

## Section 7 — Format for GPT Pro response

```text
Section A: V5 strengths recognized (what to keep)
Section B: V5 gaps identified (what's missing or wrong)
Section C: V5 over-engineering flagged (what's too much)
Section D: V5 economic / GTM / business critique
Section E: V5 vs world-class platform competitive analysis
Section F: V6 counter-iteration (if warranted)
Section G: V5 scorecard per axis (with rationale, not just numbers)
```

---

## Section 8 — Comparison axes

When scoring V5 vs V4 (GPT Pro should produce a scorecard), use these axes:

```text
1. Operating model depth
2. OTG / digital thread substance
3. Wave plan falsifiability
4. Per-wave engineering specification
5. Domain depth (MES, eQMS)
6. Regulatory + validation depth
7. API contract substance
8. Data engineering substance
9. AI engineering substance
10. Platform engineering + SRE substance
11. Security + threat modeling substance
12. Vertical pack substance
13. Business / economic model substance
14. Team topology + DORA substance
15. Quantitative model substance
16. Risk register substance
17. ADR count + quality
18. Internal consistency + traceability
19. Falsifiability of claims
20. World-class platform competitive parity
```

V5 expects scores in the 7-10 range on most axes. Anything < 7 is a concrete weakness GPT Pro should explain.

---

## Section 9 — Statement of intent

V5 was produced to demonstrate that Claude (Opus 4.7, 1M context, max thinking, no token concern) can produce engineering substance at world-class platform depth, on par with or exceeding GPT Pro V4.

The user's directive ("chứng minh cho pro biết đẳng cấp của Claude Marx 1m max thinking không quan tâm token") authorized this depth.

V5 invites GPT Pro to validate the claim or refute it with counter-iteration.

```text
GPT_PRO_REVIEW_REQUEST_OPEN
EXPECTED_RESPONSE_TYPE: SCORECARD + V6_DELTA + CHALLENGES
```

---

## Decision phrase

```text
V5_GPT_PRO_REVIEW_INSTRUCTIONS_BASELINE_LOCKED
NEXT_FILE: 22_CLAUDE_V5_SCORECARD_RESPONSE_TO_V4.md
```
