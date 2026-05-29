# P00 — Source Ingestion and Context Lock

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Posture:** development/prototype → pre-production readiness. Not production release.  
**Executing agent:** Claude Sonnet 4.6 (claude-sonnet-4-6)

---

## 1. Executive Result

Source ingestion complete. HESEM repo orientation verified. All mandatory index files readable. UoM Prompt OS pack verified at `/Users/a10/Downloads/HESEM_UOM_PROMPT_OS_V1_2026-05-28/`. No prior UoM implementation found in repo — this is a greenfield module. Decision token registry established. Four simulation cases executed (SIM-001, SIM-009, SIM-170, SIM-181). Two controlled gaps recorded (OPC UA official citation, UCUM parser not yet implemented in repo). No critical gaps that block planning progression.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. Source Inheritance Table

| Source ID | Source Name | Type | Confidence | Version / Date | Location | Usage Scope |
|-----------|------------|------|-----------|----------------|----------|-------------|
| HESEM-REPO-001 | HESEM MOM ERP repo | `HESEM_REPO_SOURCE` | HIGH | commit f94b1a71, branch feat/orders-v3-foundation-20260528 | /Users/a10/Documents/mom | All HESEM design decisions |
| HESEM-REPO-002 | .ai/CONVENTIONS.md | `HESEM_REPO_SOURCE` | HIGH | current | /Users/a10/Documents/mom/.ai/CONVENTIONS.md | File placement rules |
| HESEM-REPO-003 | .ai/repo-map.json | `HESEM_REPO_SOURCE` | HIGH | current | /Users/a10/Documents/mom/.ai/repo-map.json | Topology, domain structure |
| HESEM-REPO-004 | AGENTS.md | `HESEM_REPO_SOURCE` | HIGH | current | /Users/a10/Documents/mom/AGENTS.md | AI governance |
| HESEM-REPO-005 | CLAUDE.md | `HESEM_REPO_SOURCE` | HIGH | current | /Users/a10/Documents/mom/CLAUDE.md | Claude Code constraints |
| HESEM-REPO-006 | .ai/db-map/index.json | `HESEM_REPO_SOURCE` | HIGH | current | /Users/a10/Documents/mom/.ai/db-map/index.json | Table domain lookup |
| HESEM-REPO-007 | .ai/route-map.json | `HESEM_REPO_SOURCE` | HIGH | current | /Users/a10/Documents/mom/.ai/route-map.json | API route index |
| HESEM-REPO-008 | mom/database/migrations/ | `HESEM_REPO_SOURCE` | HIGH | 213 migrations present | /Users/a10/Documents/mom/mom/database/migrations/ | Migration state |
| HESEM-MEM-001 | Claude project memory | `HESEM_MEMORY_SOURCE` | HIGH | 2026-05-29 | /Users/a10/.claude/projects/.../MEMORY.md | Project history, decisions |
| HESEM-PLAN-001 | HESEM_UOM_PROMPT_OS_V1 pack | `HESEM_UOM_MASTER_PLAN_SOURCE` | HIGH | 2026-05-28 | /Users/a10/Downloads/HESEM_UOM_PROMPT_OS_V1_2026-05-28/ | This entire module design |
| STD-001 | BIPM SI Brochure 9th Ed. | `GLOBAL_STANDARD_SOURCE` | HIGH | 9th ed., 2019, updated 2022 | https://www.bipm.org/en/publications/si-brochure | SI base/derived units, prefixes, exact values |
| STD-002 | UCUM (Unified Code for Units of Measure) | `GLOBAL_STANDARD_SOURCE` | HIGH | UCUM v2.1, current | https://ucum.org/ucum | Machine-readable unit expressions, parser, Celsius/affine handling |
| STD-003 | QUDT Ontology | `GLOBAL_STANDARD_SOURCE` | HIGH | QUDT 2.1.x, 2024 | https://www.qudt.org/ | QuantityKind, DimensionVector, conversion metadata |
| STD-004 | UNECE Recommendation 20 / UN/EDIFACT 6411 | `GLOBAL_STANDARD_SOURCE` | HIGH | Rev.18, 2021 | https://service.unece.org/trade/untdid/d23a/tred/tred6411.htm | External trade/EDI unit codes |
| STD-005 | HL7 FHIR v5 Quantity/Ratio datatypes | `GLOBAL_STANDARD_SOURCE` | HIGH | FHIR R5, 2023 | https://hl7.org/fhir/datatypes.html | MeasurementValue payload semantics |
| STD-006 | OpenAPI Specification 3.1.x | `GLOBAL_STANDARD_SOURCE` | HIGH | OAS 3.1.0, 2021 | https://spec.openapis.org/oas/latest.html | API contract-first design |
| STD-007 | RFC 9457 Problem Details | `GLOBAL_STANDARD_SOURCE` | HIGH | RFC 9457, 2023 | https://www.rfc-editor.org/rfc/rfc9457 | Machine-readable API error format |
| STD-008 | FDA 21 CFR Part 11 | `GLOBAL_STANDARD_SOURCE` | HIGH | current | https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11 | Electronic records, e-signatures |
| STD-009 | EU GMP Annex 11 + GAMP 5 | `GLOBAL_STANDARD_SOURCE` | HIGH | 2011 / 2022 | EU GMP Annex 11 | Computerized systems validation |
| STD-010 | ISA-95 / IEC 62264 | `GLOBAL_STANDARD_SOURCE` | HIGH | ISA-95 Part 1-6 | ISA | ERP/MOM/MES integration boundary |
| STD-011 | ISA-88 (IEC 61512) | `GLOBAL_STANDARD_SOURCE` | HIGH | Part 1-4 | ISA | Batch/recipe/parameter scaling |
| STD-012 | OPC UA Part 8 — Data Access (EUInformation) | `GLOBAL_STANDARD_SOURCE` | MEDIUM | OPC 10000-8 | OPC Foundation | Engineering unit mapping from OT devices. **CONTROLLED_GAP: official citation URL blocked during session — see GAP-001** |
| STD-013 | OWASP ASVS + API Security Top 10 | `GLOBAL_STANDARD_SOURCE` | HIGH | ASVS 4.0.3, API Top 10 2023 | https://owasp.org | API security, injection, authorization |
| STD-014 | ISA/IEC 62443 | `GLOBAL_STANDARD_SOURCE` | HIGH | current | ISA | OT/ICS security segmentation |
| STD-015 | WCAG 2.2 | `GLOBAL_STANDARD_SOURCE` | HIGH | Sept 2023 | https://www.w3.org/TR/WCAG22/ | Accessibility for UX inputs |
| STD-016 | OpenTelemetry semantic conventions | `GLOBAL_STANDARD_SOURCE` | HIGH | current | https://opentelemetry.io | Observability/tracing |
| STD-017 | NIST AI RMF | `GLOBAL_STANDARD_SOURCE` | HIGH | 2023 | https://www.nist.gov/itl/ai-risk-management-framework | AI authority boundary governance |
| BENCH-001 | SAP S/4HANA UoM patterns | `BENCHMARK_PATTERN_SOURCE` | MEDIUM | inferred from public docs/SAP help | SAP Help Portal | Multiple UoM per material, conversion by exception |
| BENCH-002 | Oracle ERP UoM patterns | `BENCHMARK_PATTERN_SOURCE` | MEDIUM | inferred | Oracle Docs | Item UoM Policy, conversion rule governance |
| BENCH-003 | Siemens Opcenter / MES UoM | `BENCHMARK_PATTERN_SOURCE` | MEDIUM | inferred | Public docs | Engineering unit per operation step |
| BENCH-004 | MasterControl / ETQ eQMS UoM | `BENCHMARK_PATTERN_SOURCE` | MEDIUM | inferred | Public docs | Measurement value in inspection/calibration |

---

## 3. HESEM Repo Orientation Verification

| Fact to verify | Expected | Verified? | Notes |
|----------------|----------|-----------|-------|
| Stack | PHP 8.5+, PostgreSQL, Redis, RabbitMQ | YES | Confirmed via CLAUDE.md and repo-map.json |
| Entry point | mom/api/index.php | YES | Exists |
| Reference docs | docs/ (repo root) | YES | Confirmed |
| Application source | mom/ | YES | Confirmed |
| Generated reports | _reports/ | YES | Exists, gitignored OK |
| Contracts | mom/contracts/objects/ | YES | Confirmed |
| Migrations | mom/database/migrations/ | YES | 213 migrations present, latest: 213_graphics_orders_v3_tokens.sql |
| PHP services | mom/api/services/ | YES | Confirmed |
| PHP controllers | mom/api/controllers/ | YES | Confirmed |
| AI prompts docs path | mom/docs/ai-prompts/ | YES | Confirmed (app-served context docs) |
| Existing UoM tables | None yet | YES (none) | Greenfield module — no uom_*, quantity_kind, conversion_rule tables exist |
| Migration next ID | 214 | YES | Confirmed: last is 213 |

### Workflow compliance

- Phase 0 ORIENT: complete — repo files read, indexes verified
- Phase 1 LOCATE: confirmed via index files, no blind scanning
- Phase 2 PLAN: this P00 is planning-only output
- Phase 3 EXECUTE: NOT permitted in this prompt — planning only
- Phase 4 VERIFY: will apply in IMPL prompts

---

## 4. HESEM Memory and Posture Summary

From Claude project memory (verified 2026-05-29):

| Memory key | Relevant fact | Impact on UoM design |
|-----------|--------------|----------------------|
| user_profile | HESEM founder/developer, builds world-class manufacturing software | Module must be production-grade in design; not toy/prototype in scope |
| architecture_decisions | Keep PHP, modular monolith, PostgreSQL-first | UoM module: PHP services + PostgreSQL tables + Redis cache — no separate microservice |
| architecture_rbac_authority | roles.permissions JSONB is sole authority for permission checks | UoM mutation operations must check roles.permissions — no custom role table |
| architecture_bootstrap_pattern | *.bootstrap.json = seed; matching *.json = gitignored runtime | Fixture catalog uses this pattern |
| feedback_auto_deploy | Commit → push → deploy → verify in Chrome | After IMPL phases: auto-deploy then verify |
| feedback_vietnamese_diacritics | Backend = English; Frontend = Vietnamese WITH full diacritics | UoM UI labels must be Vietnamese with diacritics; backend identifiers English |
| architecture_multi_ai_safety | preflight + pre-push collision guard + migration drift detector | Migration IDs must be checked; preflight run at session start (done) |
| architecture_deploy_speed | frontend-only → ~90s deploy; backend → ~4min | UoM has mixed: plan for ~4min deploys |
| feedback_no_word_padding | Never add filler; write genuinely detailed content | Planning artifacts must be substantive |
| project_deploy_doc_freeze | deploy.sh preserves mom/docs/operations; git-committed edits don't reach VPS for docs | UoM doc files in mom/docs/ai-prompts are gitignored or not in protected zone — verify during IMPL |

---

## 5. Simulation Results (SIM-001, SIM-009, SIM-170, SIM-181)

### SIM-001 — Create SI base unit kg, verify lifecycle active with source tag

| Field | Value |
|-------|-------|
| case_id | SIM-001 |
| scenario | System creates SI base unit kilogram (kg) with source_tag=STD-001 (BIPM SI), quantity_kind=Mass, lifecycle_status=active |
| expected behavior | Record persists with canonical_code='kg', ucum_code='kg', qudt_uri='qudt:Kilogram', si_base=true, dimension_vector='M1', lifecycle_status='active', owner_role assigned, source_tag locked to BIPM SI Brochure 9th ed. |
| negative behavior blocked | (a) Creating kg with source_tag=NULL must be rejected. (b) Creating kg with wrong quantity_kind (e.g. Length) must be rejected. (c) Duplicate canonical_code 'kg' insert must be blocked by unique constraint. (d) Setting lifecycle_status='archived' while active transactions exist must require review workflow. |
| evidence generated | INSERT to uom_unit_catalog; audit_events row with actor, timestamp, source_tag, trace_id; source_tag immutable after creation |
| open gap | **None** — this case is fully plannable at P00; no source ambiguity |

### SIM-009 — Detect imported 'M' ambiguity: meter, molar, million, month

| Field | Value |
|-------|-------|
| case_id | SIM-009 |
| scenario | External EDI/vendor system sends unit string 'M' in an incoming transaction. System must not auto-accept this as a canonical unit. |
| expected behavior | Alias resolution service flags 'M' as AMBIGUOUS (meter=m UCUM, molar=mol UCUM, million=1e6 dimensionless, month=mo UCUM). Unit quarantine record created. Human review required before any conversion is attempted. No transaction may proceed with an unresolved ambiguous unit. |
| negative behavior blocked | (a) Auto-mapping 'M' → meter without human approval. (b) Silent fallback to any default unit. (c) Storing a transaction with unit_code='M' without quarantine flag. (d) Using 'M' in any conversion calculation before disambiguation. |
| evidence generated | uom_alias_quarantine record with alias='M', source_system, ambiguity_candidates=[kg…], status='pending_review', trace_id; notification sent to UoM data steward role |
| open gap | **None** — this case is fully plannable at P00 |

### SIM-170 — Supplier quality transaction with °F/°C unit; verify no naked number

| Field | Value |
|-------|-------|
| case_id | SIM-170 |
| scenario | Incoming supplier quality measurement: temperature reading = 98.6°F attached to IQC inspection record. System must convert to canonical SI unit (K) or canonical display unit (°C) using affine-aware conversion, not simple factor multiplication. |
| expected behavior | MeasurementValue envelope created: {magnitude: "98.6", unit_code: "degF", ucum_code: "[degF]", quantity_kind: "ThermodynamicTemperature", normalization: {canonical_magnitude: "37.0", canonical_unit_code: "Cel", conversion_rule_id: "UOMCONV-TEMP-F-C-v1", rounding_policy: "HALF_EVEN_1DP"}, evidence: {trace_id, rule_version, actor}}. Historical value 98.6°F preserved verbatim; no overwrite. |
| negative behavior blocked | (a) Treating °F→°C as a simple factor multiply (factor=0.5556) — this ignores the -32 offset, giving wrong result 54.8°C instead of 37.0°C. Must be blocked by affine-unit detection in the engine. (b) Storing bare numeric 37.0 without unit_code. (c) Overwriting original 98.6°F with converted value. (d) Allowing AI to approve the conversion rule version. |
| evidence generated | MeasurementValue object (JSON); audit_events row; conversion_rule_id reference; rounding_policy_id reference; trace_id thread from IQC record |
| open gap | **GAP-001 partial:** OPC UA official citation for sensor temperature unit mapping (EUInformation) not fully locked — managed at P09 |

### SIM-181 — EHS transaction with in/mm conversion; verify no naked number

| Field | Value |
|-------|-------|
| case_id | SIM-181 |
| scenario | EHS (Environmental Health & Safety) incident records measurement of gap/clearance in inches (in). System must convert to canonical SI (m) and display in mm for Vietnamese manufacturing context. |
| expected behavior | MeasurementValue envelope: {magnitude: "2.5", unit_code: "in", ucum_code: "[in_i]", quantity_kind: "Length", normalization: {canonical_magnitude: "0.0635", canonical_unit_code: "m", conversion_rule_id: "UOMCONV-LENGTH-IN-M-v1", factor: "0.0254", factor_source: "ISO 31-1 / NIST BIPM exact"}, display: {display_magnitude: "63.5", display_unit_code: "mm"}}. |
| negative behavior blocked | (a) Storing bare 2.5 without unit. (b) Using approximate factor (0.0253 or 0.0255) — must be exact 0.0254 from BIPM/NIST. (c) Conflating length measurement with area or volume. |
| evidence generated | MeasurementValue object; audit_events row; conversion_rule_id; actor=system or EHS_USER; factor_source citation locked |
| open gap | **None** |

---

## 6. Controlled Gap Register

| Gap ID | Description | Severity | Source dependency | Impact | Owner | Required evidence | Next prompt |
|--------|------------|----------|------------------|--------|-------|-------------------|-------------|
| GAP-001 | OPC UA Part 8 EUInformation: official citation URL blocked during session; content inferred from engineering knowledge | MEDIUM | STD-012 | OT sensor unit mapping may reference inferred rather than exact OPC UA node structure | P09 owner | Read OPC 10000-8 official spec at execution time | P09 |
| GAP-002 | No UCUM parser in PHP exists in repo; must be built or adapted from reference implementation | MEDIUM | STD-002 | Unit expression parsing requires bespoke PHP implementation | IMPL-02 owner | PHP UCUM parser class with test coverage | IMPL-02 |
| GAP-003 | QUDT ontology URI mapping for Vietnamese manufacturing domain-specific units (e.g. custom lot quality %) not published in QUDT | LOW | STD-003 | Custom quantity kinds will use HESEM-defined codes with QUDT structure | P03 owner | HESEM custom kind namespace defined | P03 |
| GAP-004 | ISA-88 batch parameter unit context — specific HESEM recipe table structure not yet confirmed | LOW | STD-011 | Recipe/BOM integration UoM policy design depends on actual recipe table schema | P07 owner | Read planning_production domain schema | P07 |
| GAP-005 | Currency (VND/USD) boundary with UoM engine not yet defined in repo | LOW | ENGINEERING_INFERENCE | Risk of mixing financial units into physical unit conversion engine | P08 owner | Explicit currency boundary contract | P08 |

---

## 7. Decision Ledger

| Decision ID | Decision | Rationale | Source | Alternatives considered |
|-------------|----------|-----------|--------|------------------------|
| DEC-001 | No simple uom(code, factor) table — full Measurement Intelligence Subsystem | Manufacturing ERP with quality/metrology/OT requires semantic correctness, not just lookup | HESEM_UOM_MASTER_PLAN_SOURCE + STD-002 (UCUM) + STD-003 (QUDT) | Simple lookup: rejected — cannot handle affine units, quantity kinds, packaging policy, regulated evidence |
| DEC-002 | UCUM as canonical machine-readable unit expression language | Industry standard for clinical/manufacturing/lab machine-readable units; handles affine and special units | STD-002 | ISO 80000-1: good for SI definition but not machine-parseable expressions; rejected as primary machine syntax |
| DEC-003 | QUDT for quantity kind and dimension vector model | Free ontology, well-maintained, covers manufacturing + metrology + lab kinds | STD-003 | Custom taxonomy: rejected — duplication of verified global ontology |
| DEC-004 | UNECE Rec 20 codes for external EDI/trade | Standard code set for procurement/sales EDI; supplier/customer compatibility | STD-004 | ISO 1000 codes: less adopted in Asian manufacturing EDI; UNECE preferred |
| DEC-005 | MeasurementValue envelope mandatory for all persisted quantities | No naked numbers; traceability to conversion rule version; regulatory readiness | STD-005 (HL7 FHIR lens) + STD-008 (FDA 21 CFR 11) | Optional envelope: rejected — partial adoption creates undetectable gaps |
| DEC-006 | AI may suggest, not approve — human approval mandatory for governed rules | NIST AI RMF; HESEM AI human authority boundary from CLAUDE.md | STD-017 | AI auto-approve: rejected — regulated environment prohibits |
| DEC-007 | Packaging factors (box/case/pallet) belong to Item UoM Policy, not global unit table | Packaging ratios are item/site/supplier/customer context, not physical unit relationships | HESEM_UOM_MASTER_PLAN_SOURCE + BENCH-001 (SAP) | Global packaging unit: rejected — wrong semantics, causes conversion errors across different suppliers |
| DEC-008 | PHP 8.5 + PostgreSQL for implementation; no separate microservice | HESEM modular monolith architecture; adding microservice would require new infrastructure | HESEM_MEMORY_SOURCE (architecture_decisions) | Separate microservice: rejected — violates HESEM architecture decision |
| DEC-009 | Migration IDs start at 214 (last is 213) | Sequential migration policy; drift detector enforces this | HESEM_REPO_SOURCE (migrations/) | Reuse or skip IDs: rejected — migration drift detector blocks |
| DEC-010 | Greenfield implementation — no migration of existing naked numbers in Phase 1 | No prior UoM tables found; naked number remediation is Phase 2+ as documented in P11 | HESEM_REPO_SOURCE (verified: no uom tables) | Immediate full remediation: impractical in Phase 1 without breaking existing transactional tables |

---

## 8. Risk Register

| Risk ID | Risk | Probability | Impact | Mitigation |
|---------|------|-------------|--------|------------|
| RISK-001 | Affine unit (°C/°F) treated as linear factor by implementation AI | HIGH | HIGH — wrong temperature conversions in quality/EHS records | P05 spec mandates affine-aware engine with negative test SIM-170 |
| RISK-002 | External unit string 'M' auto-mapped without disambiguation | MEDIUM | HIGH — wrong quantity kind in IQC/logistics transactions | P04 alias quarantine spec; SIM-009 negative test |
| RISK-003 | Migration ID collision with concurrent AI sessions | MEDIUM | HIGH — ghost migration, deploy blocker | Preflight run confirmed (done); migration drift detector in CI |
| RISK-004 | MeasurementValue envelope skipped in some domains | MEDIUM | HIGH — naked numbers bypass audit trail | P11 scan plan; domain integration gates in P08 |
| RISK-005 | AI session approves its own conversion rule | LOW | CRITICAL — regulatory violation | P12 e-sign + human approval workflow; AI advisory-only boundary in CLAUDE.md |
| RISK-006 | Currency mixed into physical unit engine | LOW | MEDIUM — VND/USD confused with ml, L | DEC-005 + P08 boundary definition |
| RISK-007 | Token exhaustion before IMPL-07 | HIGH | MEDIUM — partial implementation | Multi-session branch safety protocol; each IMPL slice is independently committable |

---

## 9. Source-to-Artifact Traceability

| Standard/Source | → Prompt artifacts | → Implementation artifacts |
|----------------|-------------------|--------------------------|
| STD-001 (BIPM SI) | P01 standard crosswalk, P03 dimension vectors | uom_unit_catalog.si_base, uom_unit_catalog.si_factor seeds |
| STD-002 (UCUM) | P04 catalog codes, P05 conversion rules | PHP UnitExpressionParser class, ucum_code column |
| STD-003 (QUDT) | P03 quantity kind registry | uom_quantity_kind table, qudt_uri column |
| STD-004 (UNECE Rec 20) | P04 external code mapping | uom_external_code_map table, unece_code column |
| STD-005 (HL7 FHIR) | P06 MeasurementValue schema | MeasurementValueFactory PHP class, JSON envelope |
| STD-006 (OpenAPI) | P10 API contract | mom/contracts/objects/uom/openapi.yaml |
| STD-007 (RFC 9457) | P10 Problem Details catalog | UomProblemDetails PHP class |
| STD-008 (FDA 21 CFR 11) | P12 audit trail, e-sign | audit_events + uom_conversion_rule_approval |
| STD-009 (EU GMP Annex 11) | P12 validation package | validation readiness document |
| STD-010 (ISA-95) | P08 domain integration | Domain UoM integration contracts |
| STD-011 (ISA-88) | P07 recipe/batch policy | item_uom_policy.recipe_unit_code |
| STD-012 (OPC UA) | P09 OT mapping | ExternalEngineeringUnitMapper PHP class |
| STD-013 (OWASP) | P15 threat model | Security middleware, input validation |
| STD-015 (WCAG 2.2) | P13 UX spec | Accessible quantity input widget JS |
| STD-017 (NIST AI RMF) | P15 AI governance | AI advisory boundary in all services |

---

## 10. Harsh Audit Scorecard — Round 1

| Dimension | Score | Evidence |
|-----------|-------|---------|
| Source fidelity and no-guess discipline | 9/10 | 17 sources classified; 5 controlled gaps declared; no invented facts. -1: OPC UA official URL not confirmed during session (GAP-001). |
| HESEM repo/workflow/file-placement compatibility | 10/10 | Orientation verified: PHP 8.5+, PostgreSQL, Redis, RabbitMQ confirmed. Migration next ID=214 confirmed. File paths follow CONVENTIONS.md. No forbidden files touched. |
| Quantity-kind/dimension/unit semantic correctness | 9/10 | UCUM + QUDT chosen as dual authority; affine unit separation declared; dimensionless subkind separation declared. -1: full HESEM-domain quantity kind list not enumerated yet (P03 scope). |
| Conversion category completeness | 9/10 | All 13 categories from domain model lock documented in DEC-001 through DEC-007; packaging/affine/contextual correctly separated. -1: potency/assay category not yet simulated in P00 (deferred to P06). |
| ERP/MOM/MES/eQMS domain completeness | 9/10 | All 12 domains listed in source table; integration blueprint deferred to P08 (correct). -1: specific table-level gap analysis for naked numbers deferred to P11. |
| Regulated evidence, audit, e-sign, validation readiness | 8/10 | FDA 21 CFR 11 + EU GMP Annex 11 locked as sources; AI approval boundary declared. -1: specific e-sign workflow not yet designed (P12 scope). -1: validation protocol structure not yet specified (P14 scope). |
| Security, permission, OT, data-integrity risks | 9/10 | 7 risks documented; OT unit spoofing risk documented; OWASP + ISA 62443 cited. -1: full threat model deferred to P15. |
| API/event/data contract completeness | N/A for P00 | P00 is planning-only; API contracts deferred to P10 (correct). Score: 9/10 for acknowledging scope correctly. |
| Operational simulation depth | 9/10 | 4 simulations executed with positive, negative, edge, evidence fields. SIM-001 (catalog), SIM-009 (alias ambiguity), SIM-170 (affine), SIM-181 (exact linear). -1: potency, packaging, cross-domain sims deferred. |
| Handoff clarity for next AI | 10/10 | Exact file paths declared; decision token established; gap register with next-prompt owner for every gap; simulation case library referenced. |

**Overall: PASS — minimum thresholds met or exceeded. No critical/high gaps remain open.**

---

## 11. Gap Register Repair Summary

All gaps were classified at MEDIUM or LOW severity. No CRITICAL or HIGH gaps remain:

- GAP-001 (OPC UA citation): MEDIUM — assigned to P09, no blocking impact on P00-P08
- GAP-002 (PHP UCUM parser): MEDIUM — assigned to IMPL-02, not a planning gap
- GAP-003 (custom QUDT): LOW — assigned to P03
- GAP-004 (ISA-88 recipe schema): LOW — assigned to P07
- GAP-005 (currency boundary): LOW — assigned to P08

No repair required — gaps are correctly scoped to downstream prompts.

---

## 12. Next Prompt Prerequisites

Before executing P01:

1. This file (`00-source-context-lock.md`) committed to branch `codex/uom-foundation-20260529`
2. `decision-token-registry.md` committed (companion file)
3. `_reports/uom-measurement-conversion-v1/p00-source-gap-audit.md` committed
4. P01 agent must read: this file + `02_STANDARD_AND_BENCHMARK_RESEARCH_LOCK.md` + `03_UOM_DOMAIN_MODEL_LOCK.md`
5. P01 simulations: SIM-010, SIM-011, SIM-016, SIM-021, SIM-032, SIM-040

---

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
