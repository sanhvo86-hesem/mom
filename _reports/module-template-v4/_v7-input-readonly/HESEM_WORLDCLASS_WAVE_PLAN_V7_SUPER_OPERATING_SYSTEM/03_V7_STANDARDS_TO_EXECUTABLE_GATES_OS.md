# 03 — Standards to Executable Gates Operating System
## Rule

Mọi standard trong V7 phải được chuyển thành artifact, owner, gate, evidence, test, rollback và stop rule. Tên standard không có giá trị nếu không tạo được merge gate.

## Standards-to-gates matrix

| Standard | Scope | Artifact | Owner | Gate | Test | Stop rule |
| --- | --- | --- | --- | --- | --- | --- |
| ISA-95 / IEC 62264 | ERP-MOM-MES boundary, activity models, information handoff | Domain ADR; root family map; interface catalog; event map | Architecture Owner + Domain Owner | Route/API/resource family obeys authority layer; no hidden workspace authority | route grammar test; contract review; command ownership review | No new slice if root authority cannot be named |
| ISA-88 | Batch process control, recipe/procedure/equipment models | Recipe model; master/control recipe; eBR/eDHR protocol | MES Architect + Validation Owner | No batch execution without recipe/equipment/procedure mapping | recipe version test; parameter bound test; step evidence test | Block batch feature if recipe identity/effective date missing |
| 21 CFR Part 11 | Electronic records and signatures for FDA-regulated contexts | Signature meaning registry; audit trail; record snapshot; identity proof | Quality/Regulatory Owner | No e-sign without signer identity, meaning, record snapshot and audit | e-sign challenge test; tamper/audit test; role authorization test | Disable e-sign launcher |
| EU GMP Annex 11 | Computerized systems validation, data integrity, supplier/backup/change controls | VMP; URS; RTM; IQ/OQ/PQ; periodic review; backup/restore test | Validation Owner | Regulated feature cannot graduate beyond maturity 5 without validation package | URS-to-test traceability; data integrity review; restore rehearsal | Remain pre-production readiness only |
| GAMP 5 2nd Edition | Risk-based validation and fit-for-intended-use computerized systems | Intended-use statement; GAMP category; risk assessment; validation plan | Validation Owner + Product Owner | Scope and testing proportional to product quality/patient/business risk | risk-class review; requirement-to-test matrix | No regulated mutation without intended-use |
| ISA/IEC 62443 | IACS/OT cybersecurity requirements, zones, conduits, lifecycle | OT zone/conduit model; threat model; remote-access policy | Security Owner + OT Owner | No direct app-to-machine control; no unsegmented OT traffic | zone boundary test; least privilege; audit; incident drill | Disable OT write path |
| OWASP ASVS 5.0 | Application security verification requirements | ASVS control map; auth/session/access/input/crypto/error test pack | Security Owner | No public API/UI path without ASVS baseline evidence | SAST/DAST; authz tests; secret scan; abuse-case tests | Block merge |
| OWASP API Security Top 10 | API abuse categories such as BOLA and broken auth | API threat model; object-level authorization matrix | API Owner + Security Owner | Every endpoint must prove tenant/object/action authorization | contract tests; negative auth tests; rate-limit tests | Endpoint remains unavailable |
| OpenAPI 3.2.0 | Standard, language-agnostic HTTP API description | OpenAPI contract; examples; schema; status codes | API Owner | No live API without contract and backward-compatibility policy | schema validation; contract diff; client mock test | Fixture fallback only |
| RFC 9457 | Problem Details machine-readable HTTP errors | Problem registry; error envelope examples | API Owner | Every non-2xx API error uses typed problem detail | negative endpoint tests; problem-code parse tests | Block endpoint graduation |
| OpenTelemetry semantic conventions | Common semantic attributes for traces/metrics/logs | Trace/span naming; metric catalog; dashboard; alert rule | SRE Owner | Every command/API/slice emits correlated trace/log/event evidence | trace propagation test; metric presence test | No release-readiness signoff |
| WCAG 2.2 | Accessible web content recommendations | A11y checklist; keyboard map; focus/contrast test | UX Owner | No screen passes without keyboard, focus-visible, tab semantics and contrast evidence | Playwright a11y; manual keyboard path | Block UI gate |
| NIST AI RMF | AI risk governance for trustworthy systems | AI intended-use; hazard log; eval harness; human authority boundary | AI Governance Owner | AI cannot execute regulated decision; advisory only until explicit approval | RAG eval; hallucination/error logging; refusal/uncertainty tests | Disable AI action path |
| DORA / SRE | Engineering delivery and reliability metrics | DORA dashboard; SLOs; error budgets; incident reviews | Platform Engineering Owner | No wave pass without delivery and reliability telemetry | lead-time/change-failure/recovery metrics; rollback rehearsal | Hold next wave |

## Gate execution model

Mỗi gate có ba trạng thái: `PASS`, `PASS_WITH_WARNINGS`, `FAIL_BLOCK_NEXT`. Warnings phải có owner, deadline, residual risk và explicit defer decision. Không được dùng “warning” để hợp thức hóa feature thiếu evidence.

## Regulated feature escalation

Feature bị coi là regulated nếu có thể ảnh hưởng đến product quality, patient/user safety, release/disposition, audit/e-sign, batch/device history, training qualification, supplier quality, hoặc data integrity. Regulated feature tối đa maturity 5 nếu chưa có validation package.
