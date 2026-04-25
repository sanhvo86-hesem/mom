# Consolidated Risk Register — HESEM Operations Platform Frontend Program

**Generated**: 2026-04-25 (parallel strategic work, no GPT Pro input)
**Inputs**: Step 1–8 masters, V6–V19 reports, S13/S14/S18 reports, parallel research outputs (API readiness, Graphics Authority audit, vocabulary drift)

## Risk Categorization Legend

- **🔴 P1 Critical**: blocks Slice 3 if not addressed
- **🟠 P2 High**: should be addressed before Slice 5
- **🟡 P3 Medium**: tracked, address opportunistically before Slice 8
- **🟢 P4 Low**: monitor, no immediate action

## Architectural Risks

| ID | Risk | Severity | Source | Mitigation | Status |
|---|---|:---:|---|---|:---:|
| AR-01 | 14 UX domains regress into 14 backend silos if every slice inlines spine logic | 🟠 P2 | Step 1 sec 5.6 | Maintain spine-backed cross-cutting design; audit each new slice for spine misuse | OPEN |
| AR-02 | Hardcoded vs schema-driven runtime mismatch — repo still splits these | 🟠 P2 | Step 1 sec 4 | Migration pathway must be explicit per domain; track in module summaries | OPEN |
| AR-03 | Overlapping quality surfaces (EQMS, legacy quality, form-runtime) — convergence ownership unclear | 🟠 P2 | Step 1 + Step 2 | Per S16, NQCASE/CAPA/INSP all converge to EQMS-grade `/api/v1/eqms/*`; aliases per V20 plan | MITIGATED-AFTER-V20 |
| AR-04 | JSON→PostgreSQL cutover status opaque per domain | 🟡 P3 | Step 1 + repo state | Per-domain readiness audit before live integration | OPEN |
| AR-05 | EQMS shell internals maturity variance vs proposed `/ops` | 🟡 P3 | Step 1 + V7 | Bridge alias policy (canonical/keep_as_alias/redirect/internal) handles this | MITIGATED |
| AR-06 | 52 vs 51 root reconciliation deferred — could regress if Wave 2/3 reopens | 🟢 P4 | Step 1 sec 6.2-6.3, Step 2 sec 4 | Document deferral, keep 51 as Step 2+ working set | TRACKED |
| AR-07 | Vocabulary drift between Step 1-8 chats | 🟢 P4 | Multi-chat synthesis risk | Audited PARALLEL_RESEARCH_VOCABULARY_DRIFT_AUDIT.md → ZERO drift | RESOLVED |

## API & Backend Readiness Risks

| ID | Risk | Severity | Source | Mitigation | Status |
|---|---|:---:|---|---|:---:|
| API-01 | 0 of 18 Wave 1 roots are GREEN — none have full canonical CRUD + transitions | 🟠 P2 | API readiness matrix | Add 6 plural-form REST aliases (1-day each) → 6 → GREEN by Slice 5 | OPEN |
| API-02 | 6 Wave 1 roots (QUO, PO, IREV, PREC, LOT, MWO) have ZERO backend | 🟠 P2 | API readiness | Phase C of roadmap (Slice 13-18) requires parallel backend stream | OPEN |
| API-03 | EQMS canonical paths use singular form (`/eqms/ncr`) — Step 3 spec uses plural | 🟡 P3 | API readiness | Add REST alias in `mom/api/routes/rest-routes.php` per root | OPEN |
| API-04 | `workflow-tasks`, `work-inbox`, `webhook-subscriptions` spine families MISSING | 🟡 P3 | API readiness | Workflow approval is YES; tasks query missing — must build before user-task UIs | OPEN |
| API-05 | `notifications` family PARTIAL — service exists, no REST | 🟡 P3 | API readiness | Build `/api/v1/notifications` before Slice 5 | OPEN |
| API-06 | `evidence-records` legacy `/api/evidence`, no canonical v1 | 🟡 P3 | API readiness | Add canonical alias before audit-pack export becomes user-facing | OPEN |

## Graphics Authority & Compliance Risks

| ID | Risk | Severity | Source | Mitigation | Status |
|---|---|:---:|---|---|:---:|
| GA-01 | 19 hardcoded values in `mom/styles/module-template-v4.css` | 🔴 P1 | Graphics Authority audit | Add 9 tokens to `graphics_token_catalog`; refactor 19 CSS rules; re-audit | OPEN |
| GA-02 | New slices may add fresh hardcoded values | 🟠 P2 | CLAUDE.md rule | CI grep guard for `#[0-9a-f]{6}` and `\d+px"` in JS (draft); enforce in PR review | DRAFTED |
| GA-03 | V18 NC renderer/bridge JS itself is CLEAN | 🟢 P4 | Audit | Continue pattern in Slice 3+ | RESOLVED |

## Implementation Pattern Risks

| ID | Risk | Severity | Source | Mitigation | Status |
|---|---|:---:|---|---|:---:|
| IM-01 | Fixture timing — V13 lesson: must copy inline JSON to `window.*_PROJECTION` BEFORE hydration | 🟠 P2 | V13 stabilization | Document pattern in fixture template; CI test fixture page rendering | OPEN |
| IM-02 | Bridge alias invention hazard — `ncr` without context could fabricate IDs | 🟠 P2 | V18 lesson | Constrained in V18 (`unmapped_needs_decision`); pattern enforced in V20 | MITIGATED |
| IM-03 | E2E node_modules cleanup — must `rm -rf` after every run | 🟢 P4 | V14/V18 | Documented in commit plan + CI workflow | MITIGATED |
| IM-04 | 5 fixture states (current/conflict/partial-access/degraded/empty) — must propagate to every WS slice | 🟡 P3 | V14 stabilization + V18 NC | V20 prompt enforces; checklist in slice planning | OPEN |
| IM-05 | Authority class data-attrs (`data-route-class`, `data-authority-class`, etc.) — must be on every slice shell | 🟡 P3 | Step 5 + V18 | E2E asserts these; enforced in V20 | OPEN |

## Process Risks

| ID | Risk | Severity | Source | Mitigation | Status |
|---|---|:---:|---|---|:---:|
| PR-01 | Multiple parallel Codex sessions produce duplicate reports (S18 vs S19 numbering) | 🟡 P3 | Session log | Standardize: prompt template name = report file name; enforce in V20 | DRAFTED |
| PR-02 | `_reports/` was historically ignored — audit trail not visible on GitHub | 🟢 P4 | REPORT_PERSISTENCE_DECISION | Whitelisted `_reports/module-template-v4/` (this session); committed | RESOLVED |
| PR-03 | 4+ codex branches with overlapping work | 🟡 P3 | Branch landscape | One branch per slice; PR each slice; close stale branches | OPEN |
| PR-04 | V14 QA fixes are not split into separate commits — consolidated in `a5f4d3c7` | 🟢 P4 | S14 commit plan | Acceptable for non-production; rebase/split optional later | TRACKED |
| PR-05 | V13/V14/V18 commits NOT yet pushed to GitHub | 🟢 P4 | Session state | Pushed `codex/second-slice-planning-from-dispatch-qa` this session | RESOLVED |

## Quality / Testing Risks

| ID | Risk | Severity | Source | Mitigation | Status |
|---|---|:---:|---|---|:---:|
| QA-01 | All 23 E2E tests are functional/unit; no axe-core a11y suite | 🟡 P3 | V18 QA report | Add axe-core integration; or keep manual a11y matrix | OPEN |
| QA-02 | No visual regression suite (screenshot comparison) | 🟡 P3 | V18 QA report | Add Percy / Chromatic / Playwright screenshot diff before Slice 8 | OPEN |
| QA-03 | No performance baseline (HMV4 vs current portal) | 🟡 P3 | Step 8 deferred | Lighthouse run at end of Slice 5 | OPEN |
| QA-04 | E2E only on Chromium; no Firefox or WebKit | 🟡 P3 | V18 playwright config | Add cross-browser CI matrix when Slice 5 lands | OPEN |
| QA-05 | No load test on portal.html with HMV4 enabled | 🟢 P4 | Step 8 deferred | Defer until live API integration phase | TRACKED |
| QA-06 | No security review pass on HMV4 surface | 🟠 P2 | Step 8 deferred | Run `/security-review` skill against V13/V14/V18 commits before Slice 5 | OPEN |

## Compliance / Regulatory Risks

| ID | Risk | Severity | Source | Mitigation | Status |
|---|---|:---:|---|---|:---:|
| RG-01 | All HMV4 surfaces are read-only — disposition/CAPA/e-sign disabled | 🟢 P4 | Step 8 design | Maintained in V13/V14/V18; enforced in V20 | RESOLVED |
| RG-02 | Live API integration will surface 21 CFR Part 11 e-sign flow needs | 🟡 P3 | Step 1 sec 5.6 | When live e-sign added (Slice 6+ likely), full e-sign UX must be designed | OPEN |
| RG-03 | DCC controlled documents have header/locale standards (per CLAUDE.md) | 🟢 P4 | CLAUDE.md DCC section | Audit existing tools/dcc-batch + 11-dcc-header-renderer; not in HMV4 scope | TRACKED |
| RG-04 | No formal validation evidence for HMV4 changes | 🟡 P3 | Non-production positioning | Pre-production posture defers this; evidence track pre-release | TRACKED |

## Scaling / Technology Risks

| ID | Risk | Severity | Source | Mitigation | Status |
|---|---|:---:|---|---|:---:|
| SC-01 | Vanilla JS modular design — could become unwieldy after 6+ AR shells | 🟡 P3 | Step 7 implementation | Re-evaluate at Slice 8 inflection point; React/Vue framework decision | OPEN |
| SC-02 | Module-template-v4 fixture data becomes stale vs schema | 🟡 P3 | Step 8 implementation | Fixture validation script in CI; alert on schema drift | OPEN |
| SC-03 | Portal.html structural changes could break HMV4 insertion points | 🟡 P3 | Step 8 patch design | Document insertion-point dependency; update Step 8 master if portal changes | OPEN |
| SC-04 | 18 slices × ~1 week = 4-5 months for Wave 1 frontend | 🟡 P3 | Roadmap | Acceptable timeline; backend stream parallel | ON-TRACK |

## Risk Heatmap Summary

| Severity | Count | Top items |
|:---:|---:|---|
| 🔴 P1 | **1** | GA-01 (CSS hardcoded values) |
| 🟠 P2 | **9** | API-01, API-02, AR-01, AR-02, AR-03, GA-02, IM-01, IM-02, QA-06 |
| 🟡 P3 | **17** | (most operational mitigations) |
| 🟢 P4 | **8** | (resolved or tracked) |

## Top 3 Action Items Before Slice 3 Approval

1. **🔴 GA-01**: Decide whether to include the 19 baseline CSS fixes in the V20
   slice scope (recommended: yes, as a pre-slice cleanup) or defer to a
   dedicated "Slice 0.5 cleanup". Without this, every slice inherits the
   non-compliant baseline.
2. **🟠 API-03/01**: Coordinate with backend team on REST alias creation for
   Slice 4-8 EQMS roots (NQCASE, CAPA, CDOC, INSP, BREL, ECO, TRAIN). 7
   aliases × 1 day each = 1.5 weeks of backend work, parallelizable.
3. **🟠 QA-06**: Run security review (e.g., the `/security-review` skill) on
   V13/V14/V18 commits before Slice 5. Output should be a security report
   archived in `_reports/`.

## Decision

```
RISK_REGISTER_BASELINE_ESTABLISHED
TOP_PRIORITY_GA-01_CSS_TOKEN_REMEDIATION
```

GPT Pro should review this register and rank items. Items already RESOLVED
or MITIGATED need confirmation only.
