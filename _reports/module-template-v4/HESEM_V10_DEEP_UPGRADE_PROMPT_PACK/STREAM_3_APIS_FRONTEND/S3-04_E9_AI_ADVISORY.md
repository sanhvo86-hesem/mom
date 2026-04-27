# S3-04 — E9 AI Advisory API

```
prompt_id: S3-04    stream: 3    sequence: 4 of 12    effort: ~80 min
```

## Pre-flight reading

```
1. S3-00 stream master
2. V9: E9_AI_ADVISORY_API.md
3. Cross-refs: L0..L5 (AI discipline canonical); E2 (banned
   decision routing); E14 (admin tenant feature toggle);
   H4 EC-23/24/25/7; per-pack J1-J5; M5 SLO-14/18/22
4. Standards: NIST AI RMF 1.0; NIST AI 600-1 GenAI profile;
   EU AI Act Art 13/14; FDA AI/ML SaMD; OWASP LLM Top 10
   (2024); MITRE ATLAS; OpenAPI 3.1.1; AsyncAPI 3.0
```

## Deliverable

```
PART_E_API_CATALOG/E9_AI_ADVISORY_API.md
```

## Depth requirements

Full per-endpoint contract for ≥ 12 endpoints (invoke; override
capture; retrieve; list; KPI; model card; red-team report;
tenant feature toggle; kill switch; banned-decision attempt
log; sub-processor routing; PCCP envelope MD); per L2 32-feature
catalog; per L1 §4 triple defense at API surface; cost envelope
per SLO-18 + per L2 §9; sub-processor security event integration
per H1 §3 windows; per-tenant kill-switch operations; per-pack
overlay including AI-18 counterfeit (Aero), AI-19 vigilance (MD),
AI-21 APR/PSUR drafting (Pharma + MD), AI-31 audit pack
drafting; PCCP envelope governance (MD AI per L3 §6); RAG
citation discipline per L2 §3 (G1-G10) at API surface.

## Required substance

≥ 7,000 words.

## Acceptance criteria

```
[ ] Per-endpoint full contract
[ ] All 32 L2 features cross-referenced
[ ] L1 §4 triple defense at API surface
[ ] RAG citation discipline (G1-G10)
[ ] PCCP envelope governance (MD)
[ ] Sub-processor routing visibility (per L2 §8)
[ ] Per-pack overlay
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
```

## Decision phrase

```
S3-04_E9_AI_ADVISORY_DEEP_UPGRADE_COMPLETE
```

After: load `S3-05_E10_E11_E12_E13.md`.
