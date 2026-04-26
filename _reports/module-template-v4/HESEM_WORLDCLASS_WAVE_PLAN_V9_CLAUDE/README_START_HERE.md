# HESEM WORLDCLASS WAVE PLAN V9 — README START HERE

```
package_name:    HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE
package_kind:    pure planning master (no code, no schemas, no DDL)
purpose:         comprehensive single source of truth for HESEM Operations Platform planning
                  — every workflow, every API, every endpoint, every front-end ↔ back-end
                  binding described as plain-language planning content so engineers can
                  later split work backend / frontend / data / AI / SRE without losing
                  any architectural or scope context.
predecessors:    V5 (Claude, May 2026), V7 (GPT Pro, April 2026), V8 (Claude, April 2026)
status:          development / prototype / pre-production-readiness
                  HESEM is NOT validated production. No production wording until
                  Wave 8 + customer cutover gate per V3 RULE-3.
generated_at:    2026-04-26
generated_by:    Claude Opus 4.7 (1M context, max thinking)
```

---

## 1. What changed from V8 to V9

V7 and V8 both began **leaking implementation detail into the plan** (SQL DDL,
JSON Schema, YAML state machines, code snippets). The user's feedback on V8 was
explicit:

> "tôi chưa muốn viết code mà là ở dạng kế hoạch thuần túy để sau này có thể chia
> xây backend frontend. chưa cần code."
>
> Translation: "I don't want code yet — pure planning so I can later split
> backend / frontend work. Don't write code yet."

V9 honors this. **V9 is pure planning prose**. There are no SQL CREATE TABLE
statements, no JSON Schema documents, no code samples. Every entity that V7/V8
expressed as code is now expressed as a plain-language description telling a
later engineer:

- **What** the entity is (purpose)
- **Why** it exists (rationale)
- **Who** owns it (role)
- **Which other entities** it relates to (connections)
- **When** it gets built (wave / phase)
- **What evidence** proves it works (acceptance — described, not coded)
- **What an engineer needs to know** before designing or implementing it

This gives you the complete picture so you can later say:
"The backend team picks up Parts B + E + I + M. The frontend team picks up
Parts F + B6. The data engineering team picks up Parts B5 + D + M2. The
quality / validation team picks up Parts H + J. The AI team picks up Part L."
And no one loses context.

---

## 2. Reading order (đọc theo thứ tự)

Anyone — human teammate or AI agent — engaging with this plan reads in this
order before doing any work:

```
1. README_START_HERE.md           ← this file
2. MASTER_OVERVIEW.md              ← bird's-eye view of entire plan + reading map
3. READING_DISCIPLINE.md           ← rules for AI prompt scoping; how to use this plan
4. PART_A (Vision & Scope)          ← what we are building and for whom
5. PART_B (Architecture Master)     ← how the system is structured
6. PART_C (Domain Capabilities)     ← what business capabilities exist
7. PART_D (Workflow Catalog)        ← what workflows the platform supports
8. PART_E (API Catalog)             ← every endpoint described
9. PART_F (Frontend Catalog)        ← every UI surface described
10. PART_G (Wave Plan)              ← phased delivery sequence
11. PART_H (Quality + Compliance)   ← regulated discipline
12. PART_I (Operations)             ← run-time behavior
13. PART_J (Vertical Packs)         ← regulated industry extensions
14. PART_K (Business Model)         ← commercial frame
15. PART_L (AI Discipline)          ← AI governance + AI prompt rules
16. PART_M (Reference)              ← glossary, indices, bibliography
```

For an AI agent given a specific task, see `READING_DISCIPLINE.md` for the
mandatory pre-flight before that agent writes any output.

---

## 3. Package layout (cấu trúc tài liệu)

```
HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
  README_START_HERE.md
  MASTER_OVERVIEW.md
  READING_DISCIPLINE.md
  PART_A_VISION_AND_SCOPE/         (vision, North Star, domain scope, customers, standards)
  PART_B_ARCHITECTURE_MASTER/      (8 layers, authority model, OTG, state machines, data flow,
                                    cross-cutting concerns, deployment, integration, observability)
  PART_C_DOMAIN_CAPABILITIES/      (per-domain capability description; what each domain owns)
  PART_D_WORKFLOW_CATALOG/         (per-workflow description; "order to cash", "NC to CAPA", etc.)
  PART_E_API_CATALOG/              (per-API-family description; every endpoint listed + described)
  PART_F_FRONTEND_CATALOG/         (per-UI-surface description; every workspace + record shell + dialog
                                     + drawer + wizard + their backend bindings)
  PART_G_WAVE_PLAN/                (phased delivery: W0 → W14 + 2 continuous streams)
  PART_H_QUALITY_AND_COMPLIANCE/   (regulatory landscape, validation lifecycle, audit, evidence,
                                     retention, periodic review, change control, CAPA, risk)
  PART_I_OPERATIONS/               (deployment, observability, incident, DR, capacity, cost,
                                     security ops, tenant ops)
  PART_J_VERTICAL_PACKS/           (Pharma, Automotive, Aerospace, Med Device, Food)
  PART_K_BUSINESS/                 (pricing, GTM, partner, funding, customer success)
  PART_L_AI_DISCIPLINE/            (AI governance, banned decisions, AI feature catalog,
                                     AI lifecycle, red team, AI prompt discipline)
  PART_M_REFERENCE/                (glossary, root catalog, state-machine directory,
                                     SLO directory, risk register, decision phrases,
                                     standards directory, references)
```

Each Part is a folder. Each folder begins with an overview file (e.g.
`PART_B_ARCHITECTURE_MASTER/B0_ARCHITECTURE_OVERVIEW.md`) that orients the
reader before the chapter files.

---

## 4. Discipline contract (kỷ luật cho AI và con người)

Every contributor — human or AI — accepts these rules before producing any
content related to HESEM:

```
RULE 1.   Read MASTER_OVERVIEW.md and READING_DISCIPLINE.md before any task.
RULE 2.   Identify the Part/Chapter your current task falls under; do not
          spread the work across unrelated Parts.
RULE 3.   When a topic could fit in multiple Parts, follow the explicit
          owner reference in the existing chapter; do not duplicate.
RULE 4.   Never produce code (SQL DDL, JSON Schema, YAML, source files)
          inside V9. V9 is planning text only. Code goes in `mom/...` and
          its placement is referenced from V9, not embedded.
RULE 5.   Cite the V9 Part/Chapter your work updates or extends.
RULE 6.   When you discover a gap, do not fill it inline; open a planning
          gap entry in PART_M for ratification.
RULE 7.   No production wording. HESEM is pre-production-readiness until
          Wave 8 + cutover gate.
RULE 8.   Honor V3 RULE-1..RULE-8 (slice graduation, AI banned decisions,
          eight standard artifacts, wave gate, 15-question checklist,
          naming convention, read-only graduation, frozen forbidden files).
```

---

## 5. How V9 differs from V7 and V8 in style

| Aspect | V7 (GPT Pro) | V8 (Claude) | V9 (Claude) |
|---|---|---|---|
| Style | Code-flavored prose with snippets | Code + binding artifacts | Pure planning prose |
| SQL DDL | Sketch | Normative | Description of what the table should hold (no DDL) |
| JSON Schema | None | Full | Description of the envelope's required fields and meaning |
| Code samples | Some | Some | None |
| Workflow definition | YAML | YAML | Plain-language transition description |
| API definition | OpenAPI fragment | OpenAPI fragment | Plain-language endpoint description with method, purpose, audience, success result, failure modes |
| Frontend ↔ backend | Implicit | Implicit | **Explicit per surface, per binding, in PART_F + PART_E** |
| Coverage philosophy | Sample | Comprehensive bindings | Comprehensive plain-language inventory |
| Engineer hand-off | Engineers must derive details | Engineers cherry-pick from code | Engineers receive a complete map; implementation is theirs to design |

V9 is bigger in surface area but contains zero code. It is the fully scoped
master plan from which Wave-by-Wave detailed plans (Part G) and per-task AI
prompts derive.

---

## 6. Status of related packages

```
V5_CLAUDE        committed in repo (commit 79b29e15)        kept; superseded by V9 in style
V7_GPTPRO        in /tmp + _v7-input-readonly (not in repo) kept as input reference
V8_CLAUDE        committed in repo (commit b0d64701)        kept; superseded by V9 in style
V9_CLAUDE        in progress (this package)                  authoritative planning master
```

V9 supersedes V8 as the planning master because V8 mixed planning with
code-flavored artifacts. V8 remains in the repo for reference and history.

---

## 7. Decision phrase

```
V9_README_BASELINE_LOCKED
NEXT: read MASTER_OVERVIEW.md
```
