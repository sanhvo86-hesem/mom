# 16 — AI Agent, Knowledge Copilot and Decision Intelligence Governance
## AI boundary

AI may summarize, search, explain, compare, detect missing evidence, draft reports and recommend next best action. AI may not execute regulated decisions, sign, release, disposition, approve CAPA, modify master data, or issue OT control commands without explicit human authority and command governance.

## AI capability classes

| Class | Allowed | Forbidden until approved |
| --- | --- | --- |
| RAG knowledge assistant | answer from controlled docs/reports with citations | invent policy or cite unavailable evidence |
| Evidence gap checker | identify missing required artifacts | change record state |
| Quality investigator assistant | summarize NQ/CAPA patterns | approve root cause or effectiveness |
| Planning advisor | suggest dispatch/schedule options | commit work order/dispatch mutation |
| Analytics explainer | explain OEE/SPC trends | change control limits without approval |
| Agentic workflow helper | draft command payload for human review | submit regulated command unattended |

## AI evidence requirements

- Intended-use statement per AI skill.
- RAG corpus authority map and freshness policy.
- Eval harness: factuality, citation coverage, refusal, uncertainty, adversarial prompts.
- Tool policy: allowed tools, denied tools, human approval boundaries.
- AI output audit: prompt, sources, model/version, user, action taken/not taken.
