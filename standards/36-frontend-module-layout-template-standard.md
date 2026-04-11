# 36 - Frontend Module Layout Template Standard

> Mandatory operating standard for every frontend module in the HESEM ERP, MOM, MES and eQMS platform.
> This file is the production authority for module layout, template selection, block composition, data binding, visual governance, accessibility, audit readiness and release evidence.

---

## 1. Status

| Field | Value |
|---|---|
| Effective date | 2026-04-11 |
| Scope | MOM portal, ERP/MES/eQMS runtime modules, Module Builder, Template Studio, online forms rendered inside portal, dashboards, shop-floor screens, admin screens |
| Authority | Required standard |
| Owner | HESEM Platform Architecture |
| Review cadence | Every release train, and immediately after any renderer, token, template, API registry or regulated workflow change |
| Supersedes for frontend runtime | Ad hoc frontend interpretation from `04-html-design-system.md`, `05-html-templates.md`, `24-form-template-design-system.md`, `30-hesem-design-system.md`, `32-module-architecture-v2.md`, `33-api-mapping-per-module.md`, `34-module-builder-architecture.md`, and `mom/docs/module-layout-template-design-system-v4.html` where those files conflict with this file |

This document does not delete the existing standards. It defines the authority map and the mandatory build rules so that every frontend developer can make the same decision without guessing.

---

## 2. Executive Verdict

The current module layout template documentation is broad and strategically strong, but it is not yet strong enough to be the only production source of truth for a world-class ERP/MOM/MES/eQMS frontend.

The main failure is not lack of ambition. The main failure is that baseline, partial implementation and future target are mixed together. A developer can read the current v4 document and still not know which rule is enforced today, which rule is a target for v4.5, which renderer wins, which token set wins, which template registry is machine-readable, and which gate blocks release.

Current quality score as a production SSOT:

| Area | Score | Reason |
|---|---:|---|
| Strategic coverage | 8/10 | Covers templates, tokens, themes, zones, forms, tables, dashboards, audit, print, and regulated patterns. |
| Runtime enforceability | 3/10 | Several core mechanisms are marked as spec target or partial: lifecycle hooks, event bus, JSON Schema validation, realtime, zone enforcement. |
| Single source of truth | 4/10 | Rules are split across standards, MOM docs, CSS, JS runtime, prompt files and registries. |
| Developer reproducibility | 4/10 | Different developers can still choose different renderers, token families, template interpretations, block states and QA gates. |
| Accessibility readiness | 5/10 | Documentation covers accessibility, but WCAG 2.2, APG keyboard contracts and automated gates are not fully enforced. |
| Regulated audit readiness | 6/10 | Part 11/audit patterns are present, but release evidence package and traceability gates are not mandatory for every module. |
| Visual/design system maturity | 6/10 | Strong token direction, but hardcoded styles, multiple token vocabularies, theme mismatch and inconsistent radius/density remain. |
| Overall | 5/10 | Good foundation, not yet production law. |

Production conclusion: current v4 is a powerful design dossier and roadmap. This file is the mandatory operating standard that converts it into a buildable, testable and auditable frontend rulebook.

---

## 3. Authority Hierarchy

When files disagree, apply this hierarchy.

1. `01-immutable-rules.md` wins for repository-wide immutable rules, language lock, naming lock and QMS governance.
2. This file wins for frontend module layout, template, block, renderer, token usage, module build packet, accessibility gate, QA gate and release evidence.
3. Business object contracts in `mom/contracts/objects/*/contract.json` win for business meaning, owner, lifecycle, workflow, invariants and regulated behavior.
4. Generated registries in `mom/data/registry/` win for current entity, field, endpoint, workflow, formula and validation availability.
5. Runtime implementation in `mom/scripts/portal/` and `mom/styles/` wins only for what is actually deployed, but runtime drift must be fixed back toward this standard.
6. `mom/docs/module-layout-template-design-system-v4.html` is the visual/template catalog and strategic reference. It is not production authority for any feature explicitly marked partial, target or future.
7. `standards/24-form-template-design-system.md` remains authority for standalone form structure where this file does not speak.
8. `standards/04-html-design-system.md`, `05-html-templates.md` and `11-html-structure-guide.md` remain authority for QMS document HTML/PDF style, not for portal module runtime layout.
9. Prompt files are execution guidance for AI or builder workflows. They are never production authority unless their rules are copied into a standard or a machine-readable gate.

Mandatory conflict rule: if a frontend decision cannot be resolved by this hierarchy, the module must not be released. Record the conflict in `31-core-standard-reconciliation-log.md` or a frontend exception register, then resolve it before production.

---

## 4. Implementation Status Labels

Every frontend specification, template, block, token and API rule must carry one of these labels.

| Label | Meaning | Release use |
|---|---|---|
| `ENFORCED NOW` | Implemented in runtime and checked by tests or release review. | Allowed in production. |
| `PARTIAL` | Some runtime support exists, but coverage is incomplete or not gated. | Allowed only with explicit module-level mitigation. |
| `TARGET` | Intended future architecture, not implemented enough for production. | Not allowed as a production assumption. |
| `REFERENCE` | Useful pattern, benchmark or example. | Cannot be cited as a release requirement unless converted to `ENFORCED NOW`. |
| `DEPRECATED` | Superseded or misleading. | Must not be used for new work. |

The current v4 document contains several `TARGET` runtime items. Those items must not be used as if they were production contracts.

---

## 5. External Baseline Used

The rules in this document are self-contained. External sources were used as benchmark input only.

| Source | Why it matters for HESEM |
|---|---|
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Current accessibility baseline for web content across desktops, mobile, kiosks and tablets. W3C advises using WCAG 2.2 when updating policies. |
| [WAI-ARIA APG Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Required keyboard and focus behavior for modal dialogs. |
| [WAI-ARIA APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) | Required keyboard model for interactive data grids and layout grids. |
| [Design Tokens Community Group Format](https://www.designtokens.org/tr/drafts/format/) | Preview reference for machine-readable token interchange direction. Do not treat the preview draft as direct production authority. |
| [Material Design 3 Design Tokens](https://m3.material.io/foundations/design-tokens/overview) | Token-driven visual system and dynamic theming benchmark. |
| [IBM Carbon Data Table](https://carbondesignsystem.com/components/data-table/usage/) | Enterprise data table benchmark: sizing, toolbar, selection, batch action, pagination and accessibility expectations. |
| [SAP Fiori floorplan guidance](https://www.sap.com/design-system/fiori-design-web/v1-136/page-types/floorplans/when-to-use-which-floorplan) | Enterprise floorplan taxonomy for list report, analytical list page, worklist, object page, wizard and overview page. |
| [Microsoft Power Apps model-driven apps](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/model-driven-app-overview) | Data-model-driven application consistency, forms, views, charts, dashboards, security roles and ALM. |
| [MDN CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) | Component-level responsiveness by container, needed for reusable blocks across zones. |
| [21 CFR Part 11](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11) | Regulated electronic record and electronic signature baseline for eQMS behavior. |

---

## 6. Critical Audit of Current State

### 6.1 What is strong

- The platform has the right direction: workflow-first modules, schema-driven rendering, design tokens, density/dark-mode layers, Module Builder, Template Studio and API mapping.
- `mom/docs/module-layout-template-design-system-v4.html` is unusually broad: 123 template claims, 34 module claims, 95+ block claims, visual themes, zone architecture, smart scroll, forms, data visualization, audit and print rules.
- `mom/styles/hesem-design-tokens.css` has a clear token-first intent and explicitly rejects random hardcoded colors.
- `mom/data/modules/M2-orders.json` and `mom/data/modules/M4-purchasing.json` show the right schema direction: module metadata, `templateId`, tabs, blocks, API bindings and actions.
- `mom/contracts/objects/*/contract.json` and generated registries provide a strong base for contract-first frontend generation.

### 6.2 P0 gaps

| Gap | Evidence | Required correction |
|---|---|---|
| No single frontend authority map | `standards/README.md` currently focuses on QMS document standards, while v4 layout standard is in `mom/docs/` and not clearly promoted as production authority. | Use this file as the frontend authority and link it from `standards/README.md`. |
| Baseline and target are mixed | v4 Section 35 states lifecycle hooks, event bus, ResizeObserver, IntersectionObserver, ErrorBoundary, WebSocket and JSON Schema validation are target or partial. | Every section must be labeled `ENFORCED NOW`, `PARTIAL`, `TARGET`, `REFERENCE` or `DEPRECATED`. |
| Renderer duplication | `00-block-engine.js` and `01-module-router.js` both render schema paths. | One canonical renderer must own module schema rendering. Other renderers must delegate to it. |
| Template ID is not fully enforced | Module JSON can define `templateId`, but router behavior can still render blocks linearly without enforcing template zones. | Runtime must validate `templateId`, template registry, allowed zones, allowed blocks and fallback behavior. |
| No machine-readable template registry | v4 claims 123 templates, but a canonical JSON registry with version, owner, zones, blocks, density and adoption is not enforced. | Create and gate `mom/design/template-registry.json` or equivalent. |
| Block schema coverage is incomplete | v4 documents only a subset of schemas while claiming 95+ block types. | Every block type must have a schema, state contract, ARIA contract, keyboard contract and test. |
| Token vocabularies conflict | Old standards use `--navy`, `--blue`, `--form-*`, `--brand`, `--gray-*`, while runtime uses `--hds-*`. | Establish a single frontend token namespace and legacy alias map. |
| Hardcoded style still exists | Inline `style=`, raw colors and runtime CSS patches exist in templates, portal scripts and styles. | New frontend module code must fail token lint unless exception is logged. |
| Accessibility is not gated | WCAG and APG behavior are documented unevenly, and automated keyboard/focus/axe gates are not mandatory. | WCAG 2.2 AA and APG component maps must be release blockers. |
| Vietnamese UI language drift | Some frontend/demo/admin strings are unaccented. | All rendered Vietnamese strings, including demo/fallback/error strings, must have accents. |
| Regulated release evidence is not mandatory | Audit and Part 11 rules exist as pattern guidance, but evidence package is not required per release. | Every regulated module release must include traceability and evidence package. |

### 6.3 P1 gaps

- Density exists, but there is no mandatory mapping by role, device, environment and task risk.
- Dark mode is still partly a repair layer for hardcoded light styles, not a clean theme contract.
- Data table rules are too weak for ERP/MES scale: missing standard for virtualization, selection, inline edit, batch actions, keyboard grid, export provenance and server filtering.
- Industrial UX patterns are incomplete: Andon, downtime, OEE, SPC, machine state, lot genealogy, scanner flow, offline sync conflict and shift handover need fixed templates.
- API mapping is stale relative to generated registries in some areas. Registry must win.
- Print/export is strong for documents and forms, but weak for dashboard/report modules.
- Visual theme count and runtime theme presets do not match.

### 6.4 P2 gaps

- Typography lacks operational rules for numeric alignment, bilingual wrapping, truncation, error-copy length and dense manufacturing tables.
- Radius, elevation and card styling drift across CSS files.
- Prompt documents contain good rules but are not production standards.
- Many governance lists are human-readable only and cannot block release automatically.

---

## 7. Non-Negotiable Frontend Rules

1. Every module MUST be contract-first. No frontend module may invent an entity, endpoint, field, workflow state, role, status, reason code or audit event.
2. Every module MUST have a module build packet before implementation.
3. Every module MUST have `templateId`; every `templateId` MUST exist in the approved template registry.
4. Every block MUST be allowed in its zone by the template registry.
5. Every block MUST have a machine-readable block contract.
6. Every screen MUST define loading, empty, error, permission-denied, readonly, dirty, saving, saved and conflict states.
7. Every mutation MUST define validation, concurrency, permission, audit and rollback behavior.
8. Every regulated mutation MUST require reason code where required by process and MUST write immutable audit event server-side.
9. Every e-signature action MUST use server timestamp, authenticated identity, meaning of signature and signed record hash or equivalent tamper-evident reference.
10. Every permission-sensitive UI MUST fail closed at API level. CSS hiding is not security.
11. Every UI string rendered to Vietnamese users MUST have full Vietnamese accents.
12. Every color, shadow, radius, font size, spacing value and z-index MUST come from approved tokens unless an exception is logged.
13. Frontend module UI MUST NOT scale font size by viewport width. Responsiveness changes layout and density, not arbitrary font scaling.
14. Letter spacing for runtime UI text MUST be `0`, unless a tokenized icon/font system requires otherwise and has an approved accessibility exception.
15. Cards, buttons, inputs, modals and panels MUST NOT exceed 8px radius unless the component contract explicitly defines a tokenized pill variant for status chips.
16. No decorative orbs, bokeh blobs, arbitrary gradients or marketing hero patterns are allowed in operational ERP/MES/eQMS modules.
17. Data grids MUST follow an approved keyboard model before they are used for interactive editing or selection.
18. Modals MUST trap focus, restore focus on close and prevent interaction with background content.
19. Drag/drop MUST have keyboard alternative.
20. Any AI-assisted UI element MUST expose confidence, source, user override path and auditability where it affects regulated or operational decisions.
21. Every module release MUST pass the QA gate matrix in this file.

---

## 8. Module Build Packet

Every new or changed module MUST have a build packet. It can be JSON, Markdown with front matter, or another approved machine-readable format, but it must contain the following fields.

| Field | Required | Rule |
|---|---|---|
| `moduleId` | Yes | Stable ID. Must match route and module registry. |
| `moduleName` | Yes | User-facing Vietnamese name must have accents. |
| `route` | Yes | Must be unique and permission-checked. |
| `domain` | Yes | ERP, MOM, MES, eQMS, admin, reporting or cross-domain. |
| `criticality` | Yes | `low`, `medium`, `high`, `regulated`, `shopfloor-critical`. |
| `ownerTeam` | Yes | Team accountable for code and release. |
| `processOwner` | Yes | Business owner accountable for process correctness. |
| `primaryEntity` | Yes | Must exist in generated entity registry. |
| `contractRefs` | Yes | Business object contract paths and registry references. |
| `templateId` | Yes | Must exist in approved template registry. |
| `templateVersion` | Yes | Must be pinned. Floating latest is prohibited in production. |
| `screens` | Yes | List, detail, form, dashboard, board, operator, report or admin. |
| `blocks` | Yes | Block IDs, types, versions, zones, data sources and permissions. |
| `apiBindings` | Yes | Endpoints from registry only. |
| `workflow` | If applicable | States, transitions, actors, guards, hold/release rules. |
| `permissions` | Yes | Roles, field locks, action locks, data masking and negative tests. |
| `audit` | Yes | Events, evidence, retention, e-signature and correction model. |
| `i18n` | Yes | Vietnamese UI strings and allowed English locked terms. |
| `responsive` | Yes | Desktop, tablet, mobile, kiosk/shop-floor and print behavior. |
| `accessibility` | Yes | WCAG 2.2 AA and APG component mappings. |
| `performance` | Yes | Budgets for first render, data refresh, chart render and interaction latency. |
| `qa` | Yes | Required gates, evidence paths and owner. |
| `traceability` | Yes | Requirement to contract to endpoint to UI block to test to evidence. |

Minimum packet shape:

```json
{
  "moduleId": "M2-orders",
  "route": "/mom/orders",
  "domain": "MOM",
  "criticality": "regulated",
  "ownerTeam": "Platform",
  "processOwner": "Production Planning",
  "primaryEntity": "order",
  "contractRefs": ["mom/contracts/objects/order/contract.json"],
  "templateId": "T-order-list-object-page",
  "templateVersion": "1.0.0",
  "screens": [
    {
      "screenId": "orders.list",
      "type": "list-report",
      "blocks": ["orders.filter", "orders.table", "orders.kpi"]
    }
  ],
  "apiBindings": [
    {
      "endpointId": "orders.list",
      "purpose": "Read paged orders",
      "method": "GET"
    }
  ],
  "qa": {
    "requiredGates": ["schema", "token", "api-contract", "a11y", "keyboard", "visual", "audit"],
    "evidencePath": "mom/docs/evidence/M2-orders/"
  }
}
```

---

## 9. Template Registry Contract

Every approved template MUST be represented in a machine-readable registry.

Required template fields:

| Field | Rule |
|---|---|
| `templateId` | Stable ID. Use a descriptive domain alias, not only `T01`. |
| `legacyCode` | Optional legacy `T01` to `T123` code if needed. |
| `name` | User-facing Vietnamese name with accents. |
| `version` | Semantic version. Breaking layout changes require major version. |
| `status` | `approved`, `draft`, `deprecated`, `retired`. Only `approved` can be used in production. |
| `owner` | Accountable owner. |
| `moduleArchetype` | One of the approved archetypes in Section 10. |
| `zones` | Ordered zone definitions. |
| `allowedBlocks` | Block types allowed by zone. |
| `defaultDensity` | Density allowed for primary device. |
| `supportedDensities` | Explicit list. |
| `themePolicy` | Light, dark, high-contrast, night-shift, print support. |
| `responsivePolicy` | Breakpoints and container-query rules. |
| `scrollPolicy` | Sticky, independent scroll, overflow and scroll restoration behavior. |
| `a11yPolicy` | Landmark, heading, focus order and APG patterns. |
| `printPolicy` | Printable, export-only or not-printable. |
| `adoption` | Modules currently using the template. |
| `evidence` | Screenshots, keyboard proof, responsive proof and design review link. |

Template registry rules:

- A module cannot use an unregistered template.
- A developer cannot create a template inside a module file.
- A template cannot allow a block type that lacks a block contract.
- Template fallback MUST be explicit. Silent fallback to a generic template is allowed only for preview, never production.
- Retired templates cannot be used by new modules.
- Deprecated templates require migration plan and deadline.

---

## 10. Approved Module Archetypes

Every screen MUST belong to one archetype. This prevents freeform page design.

| Archetype | Use case | Required zones |
|---|---|---|
| `list-report` | Search, filter, compare and act on many records. | Header, filter, main table, action bar, footer/pagination. |
| `analytical-list` | KPI-driven analysis with chart and table together. | Header, visual filter, chart-area, main table, action bar. |
| `object-page` | View or edit one business object with related sections. | Header, summary/KPI, tabs or anchor nav, main, sidebar, footer actions. |
| `transactional-form` | Create or update governed data. | Header, workflow/status, main form, validation summary, action bar. |
| `approval-queue` | Review many pending decisions. | Header, filter, queue list, detail preview, decision actions. |
| `exception-hub` | Investigate alerts, NCRs, CAPA, deviations or blocked work. | Header, severity/KPI, filter, main list, detail, evidence/sidebar. |
| `operator-execution` | Point-of-use execution on shop floor. | Task header, instruction, scan/input, status, large actions, escalation. |
| `shopfloor-board` | Large-display machine/cell/line status. | KPI/status, machine grid, alert rail, event ticker. |
| `planning-board` | Schedule, capacity, Gantt or dispatch. | Filter, timeline/grid, resource sidebar, conflict panel, action bar. |
| `control-tower` | Cross-module operational overview. | KPI row, map/flow/chart, exception list, drilldown, refresh status. |
| `evidence-workspace` | Attachments, signatures, record review, audit package. | Record header, evidence list, viewer, signature/audit, actions. |
| `admin-studio` | Configure templates, tokens, roles, registries. | Navigation, editor canvas, inspector, preview, validation panel. |
| `mobile-scanner` | Barcode/QR-driven mobile work. | Scan area, result card, next action, offline status, error recovery. |
| `document-view` | QMS document or print artifact inside portal. | Document header, body, index/sidebar, print/export actions. |

Freeform module layouts are prohibited. If a new archetype is needed, add it here first with zones, states, accessibility, responsive and QA rules.

---

## 11. Zone Rules

Approved zones:

| Zone | Purpose | Must contain | Must not contain |
|---|---|---|---|
| `header` | Module identity, route context, object title, status, global actions. | H1, breadcrumb or route context, status if relevant. | Dense tables, large charts, unbounded filter groups. |
| `kpi-bar` | Fast summary of state, risk, progress, count or quality metric. | 2 to 8 KPI blocks, clear units, timestamp if live. | Long copy, editable forms. |
| `filter` | Query controls and saved views. | Search/filter controls, reset/apply, saved view if needed. | Record edit fields unrelated to filtering. |
| `main` | Primary work surface. | Table, form, chart, board, instruction, viewer or object sections. | Duplicate navigation. |
| `sidebar` | Secondary context, evidence, inspector, related objects. | Context cards, audit summary, attachments, help or inspector. | Primary destructive actions unless mirrored in action bar. |
| `footer` | Pagination, save state, final actions, legal/export metadata. | Pagination or persistent action state. | New content sections. |
| `tabs` | Object-page or section navigation. | Accessible tabs or anchors. | Hidden business steps that should be workflow states. |
| `chart-area` | Primary chart or analytical view. | Chart, legend, filters, annotations. | Decorative charts without decision purpose. |

Zone behavior:

- Every zone MUST have a landmark or accessible label when it is not visually obvious.
- Zone order MUST match keyboard and reading order.
- Sticky zones MUST not obscure focus at 200% or 400% zoom.
- Independent scroll zones MUST preserve context and expose visible scroll affordance.
- Zone-level density is allowed only if the template registry permits it.
- Zone-level token override is allowed only through token cascade, not inline style.

---

## 12. Block Contract

Every block type MUST have a contract before production use.

Required fields:

| Field | Rule |
|---|---|
| `blockType` | Stable type name. |
| `version` | Semantic version. |
| `owner` | Maintainer. |
| `allowedZones` | Explicit zones. |
| `propsSchema` | JSON Schema or equivalent. |
| `dataSourceSchema` | Endpoint, query, variables, refresh and cache model. |
| `eventContract` | Events emitted and accepted. |
| `stateContract` | Loading, empty, error, readonly, disabled, dirty, saving, saved, conflict, permission-denied. |
| `permissionContract` | Visible, enabled, masked and denied behavior. |
| `a11yContract` | Role, name, description, focus, keyboard, live region. |
| `responsiveContract` | Container behavior, min/max dimensions, overflow. |
| `themeContract` | Tokens used and contrast rules. |
| `printExportContract` | Print, PDF, CSV, XLSX or not applicable. |
| `testIds` | Stable `data-testid` naming. |
| `qaEvidence` | Required screenshots and tests. |

Universal block rules:

- Block IDs MUST be stable and unique within a module.
- Block display title MUST be Vietnamese with accents unless it is a locked English term.
- Blocks MUST not directly query unknown endpoints.
- Blocks MUST not mutate global DOM outside their container.
- Blocks MUST not inject unscoped CSS.
- Blocks MUST not use raw `innerHTML` with untrusted data.
- Blocks MUST render useful empty, error and permission-denied states.
- Blocks MUST support reduced motion.
- Blocks with live data MUST show freshness timestamp and stale state.
- Blocks with AI-generated suggestions MUST show source, confidence and override path.

---

## 13. Component Rules

### 13.1 Buttons and actions

- Primary action: one per action area unless the screen is a decision matrix with explicit mutually exclusive decisions.
- Destructive action: always secondary visual priority until confirmation; requires reason for regulated records.
- Icon-only button: requires accessible name and tooltip.
- Disabled button: must expose reason in helper text or tooltip if user can fix it.
- Loading action: must preserve button width and prevent layout shift.

### 13.2 Forms

- Every input MUST have visible label.
- Required state MUST be visible and programmatic.
- Error MUST include field location, reason and recovery action.
- Regulated fields MUST expose provenance: source, timestamp, actor and calculation if derived.
- Cross-field validation MUST appear in both field context and validation summary.
- Lookup fields MUST define source entity, display field, search behavior, permission masking and no-result state.
- Draft forms MUST support recovery after refresh if the process permits drafts.
- Conflict resolution MUST show server value, user value, timestamp and allowed action.

### 13.3 Data grids

- Use data grid for interactive tabular work; use document table only for static print-like content.
- Grid MUST define row size, column types, sorting, filtering, pagination or virtualization, selection, batch action and export behavior.
- Header row and data row density MUST match.
- Interactive grid MUST implement APG grid keyboard behavior or use a proven grid library with equivalent behavior.
- Selection MUST expose checked, unchecked and indeterminate states where select-all exists.
- Server-backed grid MUST define query variables, paging model, stale data behavior and retry behavior.
- Export MUST include filter provenance, column list, timestamp, user identity and data scope.
- Inline edit MUST define validation, dirty state, save model, conflict model and audit event.

### 13.4 Modals, drawers and popovers

- Modal dialogs MUST trap focus and restore focus to the invoker.
- Background content MUST be inert while a modal is open.
- Escape behavior MUST be defined.
- Unsaved changes MUST block accidental close.
- Drawers are for contextual work. They cannot hide required primary workflow steps.
- Popovers cannot contain critical irreversible actions.

### 13.5 Toasts and alerts

- Toasts are for transient feedback, not permanent error records.
- Critical errors MUST remain visible until resolved or dismissed intentionally.
- Alert severity MUST use color, text and icon together.
- Live region behavior MUST match severity.

### 13.6 Cards and panels

- Cards are for repeated items or bounded records, not whole page sections.
- Do not put cards inside cards.
- Card radius MUST use approved token and must not exceed 8px.
- Dense operational pages should prefer tables, lists and split panes over decorative cards.

### 13.7 Charts and industrial data visualization

- Every chart MUST answer an operational question.
- Chart color MUST not be the only carrier of meaning.
- SPC charts MUST show control limits, rule violations and sample size.
- OEE charts MUST define availability, performance, quality and time window.
- Pareto charts MUST show cumulative line and category contribution.
- Gantt/timeline MUST expose current time, conflicts, capacity and dependency if relevant.
- Tooltips MUST be keyboard accessible or mirrored in data table/detail panel.
- Live charts MUST expose refresh interval and stale state.
- 3D, glass, blur or digital-twin graphics are allowed only when they reduce diagnosis time or spatial understanding. They are prohibited as decoration in regulated work screens.

---

## 14. Visual Design Rules

### 14.1 Token model

Frontend runtime uses a single token model:

1. Primitive tokens: raw palette, type scale, spacing scale, radius scale, motion duration, z-index scale.
2. Semantic tokens: surface, text, border, action, status, severity, risk, quality, machine state.
3. Component tokens: button, input, grid, card, modal, chart, navigation, toast.
4. Context tokens: density, dark mode, high contrast, night shift, print, shop-floor.
5. Zone tokens: template-approved overrides only.

Raw CSS values are allowed only in token source files or approved reset/normalization code.

### 14.2 Color

- Use semantic tokens, not raw color names.
- Status color meanings are fixed: success/pass/released, warning/hold, danger/fail/blocked, info/reference, neutral/inactive.
- Alarm severity MUST use text and icon in addition to color.
- The UI must not be dominated by one hue family. Operational software needs neutral structure plus strong semantic signals.
- Purple-heavy, decorative gradient, beige/brown, dark-blue-only and orange/brown-only themes are prohibited for production modules unless approved for a specific branded non-operational surface.
- High-contrast mode MUST not be an afterthought. It is a first-class theme.

### 14.3 Typography

- Use the approved type scale. Do not create per-module font sizes.
- Runtime UI text letter spacing is `0`.
- Do not use viewport-width font sizing.
- Numeric data in grids, KPIs and charts SHOULD use tabular numbers.
- Long Vietnamese labels MUST wrap without clipping.
- Truncation requires tooltip or detail access.
- Error copy must be direct: what failed, why, what to do next.

### 14.4 Spacing, density and radius

- Spacing uses token steps only.
- Density MUST be chosen by role, device and task:
  - `compact`: desktop power user, dense planning, data review.
  - `default`: general office workflows.
  - `comfortable`: touch/tablet, training, mixed user skill.
  - `shopfloor`: gloves, kiosk, large display, operator execution.
- Touch targets MUST be at least 44px on touch contexts.
- Desktop compact controls must still preserve readable focus, hit area and error affordance.
- Cards, buttons, inputs, panels and modals use radius token with maximum 8px.
- Elevation is functional: overlay, sticky, active drag or modal. It is not decoration.

### 14.5 Motion

- Motion must communicate state, continuity or hierarchy.
- Reduced motion preference MUST be honored.
- Blinking is prohibited except for safety-critical alarm states with reduced-motion alternative.
- Loading skeletons must be stable and must not shift layout.

---

## 15. Responsive and Container Rules

- Use container queries for reusable blocks that can live in different zones.
- Use viewport breakpoints for app shell and route-level layout only.
- Every block MUST define minimum supported width.
- Overflow behavior MUST be explicit.
- Horizontal scroll is allowed for data grids only when columns require it and sticky identifiers remain visible.
- At 320px width, the user must still complete the primary task or receive a clear unsupported-device message if the task is legally or operationally unsafe on that device.
- At 400% zoom, focus must not be obscured by sticky headers or action bars.
- Tablet/kiosk layouts MUST define orientation behavior.
- Shop-floor screen must be readable at the expected viewing distance.

---

## 16. Accessibility and Human Factors

Accessibility baseline:

- WCAG 2.2 AA is mandatory for all production frontend modules.
- APG patterns are mandatory for dialog, grid, tabs, menu, tree, combobox, accordion, disclosure and toolbar.
- Keyboard-only completion of the primary task is mandatory unless the task inherently requires hardware such as scanner or machine input; in that case an accessible alternative or documented operational exception is required.

Required rules:

- One visible page H1 per screen.
- Focus order follows visual and task order.
- Focus indicator must be visible against all supported themes.
- Modal focus is trapped and restored.
- Status messages use live regions.
- Error messages are associated with inputs by programmatic relationship.
- Icon-only controls have accessible names.
- Color is never the only indicator.
- Drag/drop has keyboard alternative.
- Timeouts warn users and allow extension where process permits.
- Re-authentication must preserve entered data where legally allowed.
- Scanner flows must handle mis-scan, duplicate scan, unknown code, permission denied and offline state.
- Shop-floor UI must support gloves/touch, glare, distance, noise and interruption.

---

## 17. API and Data Binding

Rules:

- UI can call only endpoints present in the generated endpoint registry or an approved contract file.
- If `33-api-mapping-per-module.md` conflicts with generated registry, generated registry wins.
- Every read endpoint binding must define loading, empty, error, stale and retry behavior.
- Every mutation binding must define payload, validation, server errors, concurrency, retry, rollback and audit.
- Every mutation must carry a concurrency mechanism where the backend supports it: `rowVersion`, ETag, revision, timestamp or equivalent.
- Frontend must not trust client-side validation alone.
- Field visibility and masking must follow permission contract.
- Calculated fields must show source or formula reference when used for regulated decisions.
- Cached data must show freshness and invalidation rule.
- Offline-capable modules must define queue, retry, conflict, user feedback and audit behavior before release.

---

## 18. Security, Audit and Regulated Behavior

For eQMS and regulated MOM/MES workflows:

- Audit trail is append-only. Corrections create new events and reference original events.
- The UI must never offer edit/delete on audit trail events.
- Electronic signature must capture signer identity, meaning, timestamp, record reference and reason where required.
- E-sign failure must show actionable recovery without losing entered data.
- Records under approval, released state or retention lock must be readonly unless a controlled change process is started.
- Permission-denied state must be clear and must not reveal masked confidential data.
- Exported evidence must include export timestamp, user, filters, record scope and version.
- Print artifacts must include document title, record ID, revision/version, page number where applicable and printed/exported timestamp.
- Regulated screens must support 60-second audit retrieval: from visible record to audit evidence package within 60 seconds during an audit drill.

---

## 19. Industrial MES Patterns

Required MES/shop-floor behaviors:

- Machine state uses fixed semantic states: running, idle, setup, maintenance, blocked, alarm, offline, unknown.
- Andon/alert severity must include priority, age, owner, escalation and acknowledgement state.
- Downtime capture must support reason code, start, end, actor, machine, order, lot/serial and correction path.
- OEE display must define time window and formulas.
- SPC display must define sample, control limits, rule violations and disposition path.
- Lot/serial traceability must show upstream/downstream links and evidence.
- Operator execution must show current step, prerequisites, expected input, allowed action, hold condition and escalation.
- Shift handover must show open exceptions, WIP, machine status, quality holds and pending approvals.
- Offline or network-degraded mode must be visible, not hidden.

---

## 20. Naming Standard for Frontend Runtime

| Item | Pattern |
|---|---|
| Module ID | `M<number>-<kebab-domain>` or approved registry ID. |
| Screen ID | `<moduleId>.<screen-name>` |
| Template ID | `T-<archetype>-<domain>-<variant>` plus optional legacy code. |
| Block ID | `<moduleId>.<screen>.<block-purpose>` |
| Event name | `<moduleId>:<object>:<verb>` |
| CSS class | Prefix runtime classes with `hds-`, `hm-`, `tpl-`, `zone-` or approved namespace. |
| Data test ID | `<moduleId>.<screen>.<component>.<purpose>` |
| Local storage key | `hesem:<domain>:<feature>:<scope>` unless legacy migration requires current key. |
| Audit event | `<domain>.<object>.<action>.<result>` |
| Endpoint alias | Must match generated registry alias. |

Forbidden:

- Generic IDs such as `table1`, `form2`, `newBlock`, `customWidget`.
- Module-specific unscoped global class names.
- New localStorage keys without owner and migration rule.
- English-only Vietnamese user-facing labels unless locked exception.

---

## 21. QA Gate Matrix

All production frontend module changes must pass these gates.

| Gate | Required evidence | Blocking |
|---|---|---|
| Authority check | Module build packet references this file and relevant contracts. | Yes |
| Schema validation | Module schema, template registry and block contracts validate. | Yes |
| API contract | Every endpoint binding exists in registry and has error/concurrency behavior. | Yes |
| Token lint | No unapproved raw color, spacing, radius, shadow, font size or z-index. | Yes |
| Inline style scan | No module-level inline style except approved dynamic CSS variable assignment. | Yes |
| Vietnamese diacritic scan | Rendered Vietnamese strings have full accents. | Yes |
| Accessibility automated | axe or equivalent automated scan for all key screens. | Yes |
| Keyboard walkthrough | Primary task can be completed by keyboard. | Yes |
| APG pattern tests | Dialog, grid, tabs, combobox, menu and tree follow expected keyboard behavior where used. | Yes |
| Responsive screenshots | 320, 640, 768, 1024, 1280, 1440 widths and required kiosk/tablet views. | Yes |
| Zoom/reflow | 200% and 400% checks for task completion and focus visibility. | Yes |
| Theme matrix | Light, dark, high contrast and context themes where supported. | Yes |
| Density matrix | Compact/default/comfortable/shopfloor as applicable. | Yes |
| Visual regression | Screenshot diff for approved routes. | Yes |
| Performance | First render, interaction, grid and chart budgets recorded. | Yes |
| Permission negative test | Hidden, disabled, denied and masked cases tested. | Yes |
| Audit evidence | Audit event sample, e-sign sample if applicable, export/print proof. | Yes for regulated |
| Traceability | Requirement to contract to endpoint to block to test to evidence matrix. | Yes for regulated/high criticality |
| Release manifest | Version, changed files, migrations, known exceptions and rollback. | Yes |

No gate can be waived silently. Waiver requires owner, risk, scope, expiration and compensating control.

---

## 22. Definition of Done for Any Frontend Module

A frontend module is done only when all statements below are true.

1. Module build packet exists.
2. Primary entity exists in generated registry.
3. Business contract references are linked.
4. `templateId` exists in template registry.
5. Template version is pinned.
6. Every screen has an approved archetype.
7. Every zone is valid.
8. Every block is allowed in its zone.
9. Every block has a contract.
10. Every API binding exists in registry.
11. Every mutation has validation, permission, concurrency and audit behavior.
12. Every regulated decision has reason/signature rule where required.
13. Every UI state is implemented: loading, empty, error, permission-denied, readonly, dirty, saving, saved, conflict.
14. Every user-facing Vietnamese string has accents.
15. No raw visual value is introduced outside token source.
16. No unsafe `innerHTML` is used with untrusted data.
17. Keyboard primary path is verified.
18. Modal/dialog focus is verified where applicable.
19. Data grid keyboard model is verified where applicable.
20. Responsive screenshots are captured.
21. Dark/high-contrast behavior is verified where supported.
22. Print/export proof exists where supported.
23. Permission negative test exists.
24. Audit evidence exists for regulated flows.
25. Traceability matrix exists for regulated/high-criticality modules.
26. Known exceptions are logged with expiry.
27. Release manifest is updated.

---

## 23. Migration Plan from Current State

### Wave 1: Authority and inventory

- Add this file to `standards/README.md`.
- Mark v3 layout template document as deprecated or historical.
- Add status labels to v4 sections: `ENFORCED NOW`, `PARTIAL`, `TARGET`, `REFERENCE`, `DEPRECATED`.
- Inventory current module schemas. Mark missing 34-module coverage as `not_started`, `partial` or `implemented`.

### Wave 2: Machine-readable contracts

- Create template registry.
- Create block catalog and block schemas for every claimed block type.
- Create frontend naming lint rules.
- Create token alias map from legacy tokens to frontend runtime tokens.

### Wave 3: Renderer convergence

- Choose one canonical renderer.
- Make router delegate to canonical renderer.
- Enforce template zones and allowed blocks at render time.
- Add fail-fast validation for missing template, missing block schema and invalid zone.

### Wave 4: QA automation

- Add schema validation command.
- Add token/raw-style lint.
- Add Vietnamese diacritic scan for frontend strings.
- Add Playwright screenshots and keyboard flows.
- Add accessibility automation and APG interaction tests.
- Add regulated evidence package generation.

### Wave 5: Visual modernization

- Convert dark mode from repair layer to semantic theme.
- Replace hardcoded CSS with tokens.
- Lock density by role/device/task.
- Add industrial chart and shop-floor pattern templates.
- Add container-query based block responsiveness.

---

## 24. What Must Not Happen

- Do not call the current v4 document complete until its runtime targets are implemented and gated.
- Do not add another long frontend guide outside the authority hierarchy.
- Do not allow two renderers to produce different UI from the same schema.
- Do not accept screenshots as proof if schema, API, accessibility and audit gates fail.
- Do not allow beautiful dashboards that hide stale data, missing permissions, broken audit trail or inaccessible keyboard paths.
- Do not use decorative design trends where operators need speed, accuracy and traceability.
- Do not let prompt checklists replace specifications and tests.

---

## 25. Final Rule

The standard of success is not that the UI looks modern. The standard of success is that a qualified developer can start from the same business contract, choose the same template, place the same blocks, bind the same APIs, pass the same gates and produce the same operationally safe module without private interpretation.

If a frontend rule is not in this document, a linked contract, a generated registry, or a gated runtime schema, it is not production law.
