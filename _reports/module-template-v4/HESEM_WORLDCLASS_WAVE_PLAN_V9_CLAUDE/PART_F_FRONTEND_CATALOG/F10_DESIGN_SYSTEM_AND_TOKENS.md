# F10 — Design System and Tokens

```
chapter_purpose: the visual language of HESEM; design tokens, components,
                 simulation discipline, no-hardcode rule
owner_role:      Frontend Lead with Designer
```

---

## 1. Purpose

The Design System is the visual language of HESEM. It ensures that
every surface uses consistent colors, fonts, spacing, motion, and
interaction patterns. The Graphics Authority (per existing repo
discipline in CLAUDE.md) is the source of truth.

---

## 2. The Graphics Authority (existing discipline)

Per CLAUDE.md:
- Backend authority: graphics_token_catalog + graphics_token_value
  tables.
- Legacy file authority: design-system-config.json (read via
  DesignTokenCatalogService).
- Frontend authority: window.GraphicsAuthority.tokens.read('<token_key>').
- For CSS: bind to css_variable declared in graphics_token_catalog
  (e.g., --brand-primary).

V9 ratifies this discipline.

---

## 3. The no-hardcode rule

No JS, inline style, or HTML may hardcode visual parameters (colors,
font stacks, font sizes, spacing, radius, shadows, motion durations).
All visual parameters resolve through the Graphics Authority.

Enforcement (per V8 file 13 carry-forward):
- Linter rejects hex colors in JS strings (outside graphics-authority
  module).
- Linter rejects pixel literals in JS strings (outside graphics-authority).
- Linter rejects raw font-family strings.
- Linter rejects motion durations in JS.

CI rejects builds that violate the no-hardcode rule.

---

## 4. The simulation discipline

Every "save" action in an admin graphics UI must flow through
GraphicsAuthority.preview.simulate(). This records evidence in the
graphics_simulation_run table.

V9 ratifies: every new edit widget MUST use ControlKit.* widget
factories — they already stage to the draft buffer and expose a
Simulate button. New widgets bypassing ControlKit are rejected.

---

## 5. Adding a new visual parameter

Process:
1. Add a row to graphics_token_catalog (via new migration or admin UI).
2. Declare the token_key in the appropriate
   graphics_component_contract.overridable_tokens array.
3. Add a renderer to PreviewScenes.renderers if the parameter needs its
   own scene.
4. UI module may now call GraphicsAuthority.tokens.read() on the new
   token_key.

---

## 6. Components inventory

The Design System provides reusable components:
- Buttons (primary, secondary, tertiary, destructive, icon-only)
- Form fields (text, number, date, dropdown, multi-select, file upload)
- Tables (sortable, filterable, paginated, multi-select)
- Cards, tiles, KPI displays
- Charts (line, bar, pie, scatter, heatmap, Gantt, tree)
- Drawers, dialogs, tooltips, popovers
- Toast notifications
- Progress indicators (step wizards, percent bars, spinners)
- Status badges, severity icons
- E-signature factor capture widgets
- Locale-aware date / number / currency displays

Each component is themed via tokens; each component is keyboard-accessible.

---

## 7. Per-tenant theme override

Customers may override tokens (e.g., for branding). Override stored in
graphics_token_override table. Audit chain captures every override
change. Simulation modal mandatory before commit.

---

## 8. Wave target

Design System foundations by W0.5; per-feature components per slice;
full coverage by W12.

---

## 9. Decision phrase

```
F10_DESIGN_SYSTEM_AND_TOKENS_BASELINE_LOCKED
NEXT: F11_ACCESSIBILITY.md
```
