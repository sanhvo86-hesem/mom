# 42 — V8 Prompt Library Index

```text
purpose:        Carry V7 §28 §35 prompt library + V8 expansion to 32 prompts
predecessor:    V7 17 prompts (W0-W12 + slice factory + V21 coordinator)
v8_advance:     32 prompts; per-prompt acceptance criteria; per-prompt artifact targets
work_package:   WP-V8-PROMPT (per-prompt 0.25-0.5 wk; ~12 wk total)
owner:          Domain Lead per prompt
estimate:       per V7 + V8 incremental
```

---

## 1. Prompt index (32 prompts)

```text
prompts/
  CODEX_W0_V8.md                        Phase 2 integration coordinator
  CODEX_W0_5_V8.md                      Platform substrate hardening
  CODEX_W1_V8.md                        Slice factory productization
  CODEX_W2_V8.md                        Governed record factory
  CODEX_W3_V8.md                        eQMS + workforce + maintenance core
  CODEX_W4_V8.md                        Live read-only API graduation
  CODEX_W4_5_V8.md                      OTG native cutover
  CODEX_W5_V8.md                        Core transactional ERP/MOM
  CODEX_W6_V8.md                        MES/OT foundation
  CODEX_W6_5_V8.md                      AI advisory rollout
  CODEX_W7_V8.md                        Digital thread + release
  CODEX_W8_V8.md                        Analytics + SRE
  CODEX_W9_V8.md                        Compliance + validation closure
  CODEX_W10_V8.md                       Vertical packs
  CODEX_W11_V8.md                       Customer pilot
  CODEX_W12_V8.md                       Release candidate
  CODEX_W13_V8.md                       Multi-region + multi-jurisdictional (V8 NEW)
  CODEX_W14_V8.md                       Continuous improvement loop (V8 NEW)
  CODEX_SLICE_FACTORY_V8.md             per-slice template
  CODEX_ROOT_GRADUATION_V8.md           per-root L-promotion template
  CODEX_LIVE_API_GRADUATION_V8.md       per-slice Stage 2 template
  CODEX_MUTATION_GRADUATION_V8.md       per-mutation Stage 3 template
  CODEX_VALIDATION_PACKAGE_V8.md        per-root L6 promotion template
  CODEX_SECURITY_REVIEW_V8.md           STRIDE + LINDDUN review (CS-A periodic)
  CODEX_AI_REDTEAM_V8.md                quarterly red-team (CS-A periodic)
  CODEX_DR_DRILL_V8.md                  quarterly DR drill
  CODEX_MULTI_REGION_CUTOVER_V8.md      W13 cutover prompt
  CODEX_PERIODIC_REVIEW_V8.md           Annex 11 §11 + ICH Q10 mgmt review
  CODEX_VERTICAL_PACK_PHARMA_V8.md      W10 pharma adoption
  CODEX_VERTICAL_PACK_AUTO_V8.md        W10 auto adoption
  CODEX_VERTICAL_PACK_AERO_V8.md        W10 aero adoption
  CODEX_AUDIT_PACK_EXPORT_V8.md         per-tenant per-audit
  CLAUDE_ADVERSARIAL_REVIEW_V8.md       me reviewing my own V8 (or V9)
  GPT_PRO_REVIEW_REQUEST_V8.md          formal request to GPT Pro
```

Total: 34 prompts (15 wave + 13 task + 6 vertical/audit + 2 review).

---

## 2. Per-prompt structure (V7 §35 + V8 acceptance addition)

```yaml
each prompt has:
  goal
  preconditions (must be ratified before this prompt fires)
  required_reads: [.ai/AI-WORKFLOW.md, .ai/CONVENTIONS.md, .ai/repo-map.json, AGENTS.md, CLAUDE.md, V8 file index]
  allowed_files: [explicit list]
  forbidden_files: [explicit list per file 13]
  required_outputs: [explicit list of files at exact locations]
  required_guard_checks: [list of 7+ checks]
  acceptance_criteria: [explicit pass/fail rules per output]
  decision_phrase: [exact phrase from V8 file 27]
```

V8 advance: every prompt has explicit acceptance_criteria (V7 lacked).

---

## 3. Decision phrase

```text
V8_PROMPT_LIBRARY_INDEX_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: 34 prompt-authoring WPs
NEXT_FILE: 43_V8_GPT_PRO_REVIEW_INSTRUCTIONS.md
```
