# Implementation Handoff Prompt Library — HESEM MDA V2

Use this after P26 if planning prompts are complete and the repo integration baseline allows runtime-changing work.

## General implementation rule

Never run implementation prompts before P00-P26 are complete and no P0/P1 gap is open. Each implementation wave must be isolated on its own `codex/...` branch and must follow AGENTS.md branch/commit/push discipline.

## Waves

- Wave 0: run `prompts/P27_implementation_wave0_authority_freeze_codex_prompt.md`
- Wave 1: run `prompts/P28_implementation_wave1_core_schema_command_spine_codex_prompt.md`
- Wave 2: run `prompts/P29_implementation_wave2_resource_readiness_gates_codex_prompt.md`
- Wave 3: run `prompts/P30_implementation_wave3_quality_inventory_traceability_codex_prompt.md`
- Wave 4: run `prompts/P31_implementation_wave4_ar_ui_observability_codex_prompt.md`
- Red-team: run `prompts/P32_external_redteam_buyer_regulated_operator_validation.md`
- Final: run `prompts/P33_final_synthesis_acceptance_rollforward_memory.md`

## Do not

- Do not merge directly to main.
- Do not start a later wave if prior wave lacks pass token.
- Do not hide failed full-suite tests; focused pass evidence is acceptable only with exact blocker records.
- Do not create migrations without checking highest existing number and branch collisions.
