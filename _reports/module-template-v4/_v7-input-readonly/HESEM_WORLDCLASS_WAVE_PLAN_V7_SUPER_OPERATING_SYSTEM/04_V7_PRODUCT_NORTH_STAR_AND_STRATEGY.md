# 04 — Product North Star and Multi-Horizon Strategy
## North Star

HESEM Operations Platform trở thành hệ điều hành vận hành nhà máy: mỗi customer demand, engineering change, material movement, operator action, inspection result, nonconformance, CAPA, maintenance event, release decision và AI recommendation đều có authority, evidence, lineage, workflow, policy và observability.

## Horizon model

| Horizon | Time posture | Goal | Non-negotiable proof |
| --- | --- | --- | --- |
| H0 Current Portal Safety | Now | Không phá portal hiện hữu, giữ HMV4 inert | Forbidden diff + inert flags + rollback |
| H1 Pre-production Readiness | W0-W4 | Slice factory + read-only live APIs + eQMS roots | E2E, OpenAPI, problem details, QA reports |
| H2 Controlled Mutation | W5-W7 | ERP/MOM/MES commands có audit/workflow/idempotency | Command bus tests + evidence spine |
| H3 Validation & Productization | W8-W12 | Regulated validation, vertical packs, SRE, onboarding | Validation package + SLO/DORA + support model |

## Product pillars

- Authority-first UX: mọi workspace chỉ là projection, record shell mới là authority.
- Evidence-first quality: mọi decision có evidence object và audit event.
- Contract-first backend: không API/live mutation nếu không có OpenAPI/problem/event/data contract.
- Human-authority AI: AI tư vấn, giải thích, kiểm tra thiếu evidence; không tự quyết định regulated actions.
- OT-safe MES: app không ghi trực tiếp vào machine/PLC; edge gateway theo zone/conduit và read/write policy.

## Strategic KPIs

| KPI | Definition | Target by wave |
| --- | --- | --- |
| Root maturity coverage | % roots đạt target maturity theo wave | W4: quality roots L4; W7: genealogy roots L5; W12: selected vertical L7 |
| Evidence completeness | % commands/records có audit/evidence/trace ids | W5: 95% controlled commands; W9: 100% regulated scope |
| Contract coverage | % live APIs có OpenAPI + RFC9457 + tests | W4: selected roots 100%; W8: all active APIs |
| Validation readiness | % regulated features có intended use + risk + RTM | W9: all regulated scope |
| Reliability telemetry | % API/commands traced via OTel semantics | W8: all active flows |
