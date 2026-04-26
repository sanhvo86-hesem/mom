# 26 — V8 Design System and Graphics Authority

```text
purpose:        Bind V7 §19 prose + existing repo Graphics Authority to executable hardening
predecessor:    V7 §19 + repo CLAUDE.md "MANDATORY: Graphics Authority Link" + ADR-0009
v8_advance:     Token registry hardening + ControlKit ratification + WCAG 2.2 AA tooling
work_package:   WP-V8-UX (4 work packages)
owner:          Frontend Lead + Design Lead
estimate:       ~4 engineering-weeks (W0.5 + ongoing)
```

---

## 1. Existing primitives (already in repo, V8 ratifies)

```text
graphics_token_catalog table       (migration 148)
graphics_token_value table
DesignTokenCatalogService          (PHP)
window.GraphicsAuthority.tokens    (JS, in 00bb-graphics-authority.js)
PreviewScenes simulation modal     (in HmTheme.saveAdminConfig flow)
```

V8 ADR-V8-UX-001: All existing Graphics Authority primitives RATIFIED for HMV4 from W0.5.

---

## 2. Six screen classes (V7 §19 carry-forward)

```text
SH  Shell                no mutation
DL  Dashboard List       no mutation
ML  Module List          no mutation
WS  Workspace            no mutation; re-anchor required for projection refresh
AC  Action Console       bulk commands governed
AR  Authoritative Record commands via command bus only
ERD External Read         read-only embed (e.g. Power BI iframe)
NRD Non-Routed Drawer     transient UI; never mutates
SFW Sub-Flow Wizard       multi-step; emits commands per step
```

V8 mutation enforcement linter LINT-V8-005 (file 02 INV-2): every mutation handler must check X-HESEM-Surface-Class header.

---

## 3. No-hardcode rule (CLAUDE.md alignment)

```yaml
forbidden_patterns_in_js: (per file 13)
  - HARDCODED_HEX_IN_JS
  - HARDCODED_PX_IN_JS
forbidden_patterns_in_css:
  - HARDCODED_HEX_IN_CSS  (outside graphics-authority injected stylesheets)
  - HARDCODED_FONT_FAMILY_IN_CSS
  
mandatory_pattern: every visual literal resolves through GraphicsAuthority.tokens.read()

ci_check: scripts/no_hardcode_scan_v8.py
required_check: yes (BLOCK)
```

---

## 4. Simulation modal mandatory

Every "save" action in admin graphics UI MUST flow through `GraphicsAuthority.preview.simulate()`. Records `graphics_simulation_run` row as evidence (V5 ADR-0009 carry-forward).

V8 enforcement: `tests/v8/ux/test_simulation_required.spec.ts` asserts no admin save bypasses simulation.

---

## 5. WCAG 2.2 AA tooling

```yaml
ci_check: axe-core via @axe-core/playwright
threshold: zero serious + zero critical violations per render
manual_review: per release (NVDA + JAWS + VoiceOver sample paths)
exception_workflow: ADR per exception with rationale + sunset date
```

---

## 6. ControlKit factory ratification

```yaml
existing: ControlKit.* widget factories already stage to draft buffer + Simulate button
V8_ratification: every new edit widget MUST use ControlKit.*; no direct HmTheme.saveAdminConfig
linter: LINT-V8-UX-001 detects forbidden direct save
```

---

## 7. Per-tenant theme override audit

When tenant overrides graphics tokens:

```yaml
override_record:
  - tenant_id
  - token_key
  - old_value
  - new_value
  - changed_by
  - changed_at
  - simulate_run_id (mandatory)
storage: graphics_token_override_v8 table + audit_event in OTG
WORM: not required (non-regulated UX); standard retention
```

---

## 8. Work packages

```yaml
WP-V8-UX-1: Token registry hardening + ratification ADR             (W0.5, 0.5 wk)
WP-V8-UX-2: No-hardcode linter + CI integration                     (W0.5, 1 wk)
WP-V8-UX-3: WCAG 2.2 AA tooling + exception workflow                (W4, 1.5 wk)
WP-V8-UX-4: Per-tenant theme override audit                          (W2, 1 wk)
total: 4 wk
```

---

## 9. Decision phrase

```text
V8_DESIGN_SYSTEM_AND_GRAPHICS_AUTHORITY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-UX-1..4
NEXT_FILE: 27_V8_WAVE_PLAN_REFINED.md
```
