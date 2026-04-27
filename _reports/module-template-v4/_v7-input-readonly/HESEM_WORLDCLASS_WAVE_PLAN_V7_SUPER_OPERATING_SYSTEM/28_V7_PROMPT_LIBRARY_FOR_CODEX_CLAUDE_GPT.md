# 28 — Prompt Library for Codex, Claude and GPT
## Prompt use policy

Prompts must be repo-grounded. Every prompt must require: read `.ai/CONVENTIONS.md`, `.ai/repo-map.json`, `AGENTS.md`, HMV4 reports, then verify `git status` and `git log`. No prompt may ask an agent to touch forbidden files unless explicit approval is included.

## Prompt index

| Prompt | Purpose |
| --- | --- |
| V21 Integration Review | Use before all new slices. |
| Root Scope Contract | Use to define one root. |
| Slice Planning | Use after root contract. |
| Slice Implementation | Use only after approval. |
| QA Stabilization | Use after implementation. |
| Live API Graduation | Use for L3→L4. |
| Mutation Command Graduation | Use for L4→L5. |
| Validation Package | Use for regulated L5→L6. |
| Security/OT Review | Use before OT/edge/live integrations. |
| AI Skill Review | Use before enabling AI advisory skill. |
| Wave Gate Review | Use before moving wave. |
