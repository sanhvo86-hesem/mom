# HESEM V10 Deep Upgrade Prompt Pack

This pack contains the prompts to upgrade V9 (current state) to V10
(target: GPT Pro-equivalent depth + comprehensiveness across every
chapter).

## Why this pack exists

V9 is too shallow vs GPT Pro's output for a world-class
ERP+MOM+MES+eQMS plan. Each V9 chapter needs deeper specification:
concrete entity fields, complete state-machine transition tables,
full per-endpoint contracts, exhaustive per-step decision logic,
concrete failure modes, concrete KPIs with measurement, RACI per
process, cross-references inter-Part.

This pack is designed to run in 4 parallel streams. Each stream
produces output for a fresh agent context (no prior conversation
needed).

## Streams

```
STREAM 1   PLATFORM BACKBONE                 9 sub-prompts
           Architecture (Part B); cross-cutting domains
           (C12+C13+C14); core APIs (E0..E3, E14)

STREAM 2   DOMAINS + WORKFLOWS               14 sub-prompts
           Business domains (C1..C11);
           14 end-to-end workflows (D1..D14)

STREAM 3   APIS + FRONTEND                    12 sub-prompts
           Records / projections / events / integrations
           (E4..E13, E15);
           UI patterns + binding + a11y + i18n (F0..F12)

STREAM 4   COMPLIANCE + OPS + VERTICALS +     16 sub-prompts
           BUSINESS + REFERENCE
           Quality/Compliance (H); Operations (I);
           Vertical Packs (J); AI Discipline (L);
           Business (K); Reference (M)

CONSOLIDATOR                                    3 sub-prompts
           mid-cycle + final + V10 release notes
```

Total: 54 sub-prompts. Wall time: longest stream ~16 prompts ×
~80 min ≈ 21 hours focused work spread across days.

## Prompt structure

Every prompt is a self-contained `.md` file. An AI agent loads the
prompt, reads the listed pre-flight files, produces the deliverable,
and emits a decision phrase.

Each prompt file declares:
- Pre-flight reading (mandatory before output)
- Deliverable (which V9 chapters to upgrade; output paths)
- Depth requirements (specific elements that MUST be present)
- Anti-patterns (forbidden — no marketing language; no padding)
- Reference materials (industry standards; comparable plans)
- Acceptance criteria
- Decision phrase to emit on completion

## How to run

1. Open 4 fresh agent contexts (one per stream).
2. Feed each context the corresponding stream master + first
   sub-prompt for that stream.
3. Agent reads pre-flight files (V9 baseline + stream context),
   produces upgrade, writes back to V9 paths.
4. After each sub-prompt completes, feed the next sub-prompt in
   the same stream.
5. After all streams reach 50% completion, run consolidator
   sub-prompt 01 (mid-cycle reconciliation).
6. After all streams complete, run consolidator sub-prompt 02
   (final integration) then sub-prompt 03 (V10 release notes).

## Anti-patterns (across all prompts)

```
NO marketing language          "world-class", "robust",
                                "comprehensive", "best-in-class",
                                "industry-leading", "cutting-edge"
NO padding                     restated principles, summary
                                paragraphs, hollow bullets
NO empty section headers       section must have content
NO bullet-of-title-restatement
NO speculative content         no "may", "might", "could" without
                                concrete substance
NO future-tense road-mapping   keep concrete, declarative current
NO speculative numbers          if quoting a value, source it or
                                mark explicitly as estimate
NO Lorem-ipsum-style fillers
NO duplicated content from V9   if a section is good in V9, KEEP
                                IT; don't rewrite for sake of it
```

## Depth-floor per prompt

Each upgraded chapter MUST contain (where applicable):
- Concrete entity definitions with all fields enumerated in prose
- Per-state-machine transition table (every transition: source →
  event → guard → target → side-effect → evidence emit)
- Per-endpoint contract (path; method; request shape in prose;
  response shape; error catalog; idempotency rule; concurrency
  rule; RBAC; rate-limit; SLO; observability emit)
- Per-step decision logic (every actor; every input; every check;
  every output; every evidence emission)
- Failure modes with concrete recovery (not "investigate and fix")
- KPIs with concrete targets + measurement methodology
- RACI per process step
- Cross-references inter-Part (resolve to real chapters)
- Per-pack overlay where applicable (J1..J5 specifics)
- Standards citations with clause-level specificity
- Decision phrase

## Output paths

All upgrades write back to V9 location:
`_reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/`

This becomes V10 in-place. Final consolidator promotes the
directory to `HESEM_WORLDCLASS_WAVE_PLAN_V10/` once complete.

## Index

See `PROMPT_INDEX.md` for full list with file paths.

## Decision phrase

```
HESEM_V10_DEEP_UPGRADE_PROMPT_PACK_READY
```
