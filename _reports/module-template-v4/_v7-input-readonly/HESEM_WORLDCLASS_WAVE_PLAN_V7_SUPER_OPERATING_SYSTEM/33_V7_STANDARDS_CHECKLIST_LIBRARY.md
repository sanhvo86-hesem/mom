# 33 — Standards Checklist Library
Mỗi standard dưới đây là checklist thực thi. Không mark PASS nếu không có artifact/evidence tương ứng.
## ISA-95 / IEC 62264
| Dimension | Requirement |
| --- | --- |
| Scope | ERP-MOM-MES boundary, activity models, information handoff |
| Primary artifact | Domain ADR; root family map; interface catalog; event map |
| Owner | Architecture Owner + Domain Owner |
| Gate | Route/API/resource family obeys authority layer; no hidden workspace authority |
| Test | route grammar test; contract review; command ownership review |
| Stop rule | No new slice if root authority cannot be named |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## ISA-88
| Dimension | Requirement |
| --- | --- |
| Scope | Batch process control, recipe/procedure/equipment models |
| Primary artifact | Recipe model; master/control recipe; eBR/eDHR protocol |
| Owner | MES Architect + Validation Owner |
| Gate | No batch execution without recipe/equipment/procedure mapping |
| Test | recipe version test; parameter bound test; step evidence test |
| Stop rule | Block batch feature if recipe identity/effective date missing |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## 21 CFR Part 11
| Dimension | Requirement |
| --- | --- |
| Scope | Electronic records and signatures for FDA-regulated contexts |
| Primary artifact | Signature meaning registry; audit trail; record snapshot; identity proof |
| Owner | Quality/Regulatory Owner |
| Gate | No e-sign without signer identity, meaning, record snapshot and audit |
| Test | e-sign challenge test; tamper/audit test; role authorization test |
| Stop rule | Disable e-sign launcher |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## EU GMP Annex 11
| Dimension | Requirement |
| --- | --- |
| Scope | Computerized systems validation, data integrity, supplier/backup/change controls |
| Primary artifact | VMP; URS; RTM; IQ/OQ/PQ; periodic review; backup/restore test |
| Owner | Validation Owner |
| Gate | Regulated feature cannot graduate beyond maturity 5 without validation package |
| Test | URS-to-test traceability; data integrity review; restore rehearsal |
| Stop rule | Remain pre-production readiness only |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## GAMP 5 2nd Edition
| Dimension | Requirement |
| --- | --- |
| Scope | Risk-based validation and fit-for-intended-use computerized systems |
| Primary artifact | Intended-use statement; GAMP category; risk assessment; validation plan |
| Owner | Validation Owner + Product Owner |
| Gate | Scope and testing proportional to product quality/patient/business risk |
| Test | risk-class review; requirement-to-test matrix |
| Stop rule | No regulated mutation without intended-use |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## ISA/IEC 62443
| Dimension | Requirement |
| --- | --- |
| Scope | IACS/OT cybersecurity requirements, zones, conduits, lifecycle |
| Primary artifact | OT zone/conduit model; threat model; remote-access policy |
| Owner | Security Owner + OT Owner |
| Gate | No direct app-to-machine control; no unsegmented OT traffic |
| Test | zone boundary test; least privilege; audit; incident drill |
| Stop rule | Disable OT write path |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## OWASP ASVS 5.0
| Dimension | Requirement |
| --- | --- |
| Scope | Application security verification requirements |
| Primary artifact | ASVS control map; auth/session/access/input/crypto/error test pack |
| Owner | Security Owner |
| Gate | No public API/UI path without ASVS baseline evidence |
| Test | SAST/DAST; authz tests; secret scan; abuse-case tests |
| Stop rule | Block merge |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## OWASP API Security Top 10
| Dimension | Requirement |
| --- | --- |
| Scope | API abuse categories such as BOLA and broken auth |
| Primary artifact | API threat model; object-level authorization matrix |
| Owner | API Owner + Security Owner |
| Gate | Every endpoint must prove tenant/object/action authorization |
| Test | contract tests; negative auth tests; rate-limit tests |
| Stop rule | Endpoint remains unavailable |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## OpenAPI 3.2.0
| Dimension | Requirement |
| --- | --- |
| Scope | Standard, language-agnostic HTTP API description |
| Primary artifact | OpenAPI contract; examples; schema; status codes |
| Owner | API Owner |
| Gate | No live API without contract and backward-compatibility policy |
| Test | schema validation; contract diff; client mock test |
| Stop rule | Fixture fallback only |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## RFC 9457
| Dimension | Requirement |
| --- | --- |
| Scope | Problem Details machine-readable HTTP errors |
| Primary artifact | Problem registry; error envelope examples |
| Owner | API Owner |
| Gate | Every non-2xx API error uses typed problem detail |
| Test | negative endpoint tests; problem-code parse tests |
| Stop rule | Block endpoint graduation |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## OpenTelemetry semantic conventions
| Dimension | Requirement |
| --- | --- |
| Scope | Common semantic attributes for traces/metrics/logs |
| Primary artifact | Trace/span naming; metric catalog; dashboard; alert rule |
| Owner | SRE Owner |
| Gate | Every command/API/slice emits correlated trace/log/event evidence |
| Test | trace propagation test; metric presence test |
| Stop rule | No release-readiness signoff |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## WCAG 2.2
| Dimension | Requirement |
| --- | --- |
| Scope | Accessible web content recommendations |
| Primary artifact | A11y checklist; keyboard map; focus/contrast test |
| Owner | UX Owner |
| Gate | No screen passes without keyboard, focus-visible, tab semantics and contrast evidence |
| Test | Playwright a11y; manual keyboard path |
| Stop rule | Block UI gate |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## NIST AI RMF
| Dimension | Requirement |
| --- | --- |
| Scope | AI risk governance for trustworthy systems |
| Primary artifact | AI intended-use; hazard log; eval harness; human authority boundary |
| Owner | AI Governance Owner |
| Gate | AI cannot execute regulated decision; advisory only until explicit approval |
| Test | RAG eval; hallucination/error logging; refusal/uncertainty tests |
| Stop rule | Disable AI action path |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.

## DORA / SRE
| Dimension | Requirement |
| --- | --- |
| Scope | Engineering delivery and reliability metrics |
| Primary artifact | DORA dashboard; SLOs; error budgets; incident reviews |
| Owner | Platform Engineering Owner |
| Gate | No wave pass without delivery and reliability telemetry |
| Test | lead-time/change-failure/recovery metrics; rollback rehearsal |
| Stop rule | Hold next wave |
### Checklist
- [ ] Owner named and accepted.
- [ ] Artifact exists in correct repo/report location.
- [ ] Requirement mapped to root/wave.
- [ ] Positive test exists.
- [ ] Negative test exists.
- [ ] Evidence is reproducible.
- [ ] Rollback or disable path exists.
- [ ] Residual risk recorded if warning remains.
- [ ] Decision phrase included.
- [ ] Next wave cannot start if stop rule triggered.
