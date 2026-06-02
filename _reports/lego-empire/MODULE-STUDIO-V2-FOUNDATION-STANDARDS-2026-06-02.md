# Module Studio v2 — Foundation & Standards (world-class, normative)
**Date:** 2026-06-02 · **Status:** NORMATIVE — every v2 prompt (MSV2-1/2/3) MUST obey.
Authored after deep research of current (2025–2026) design-system literature & case
studies. This is the "chuẩn hoá từ đầu" backbone: it makes the upgrade logically sound,
SSOT, operationally compliant, fully backend-wired, with no code/graphics errors.

## Why this doc exists
The founder asked us NOT to just implement their bullet list, but to research the world
standard and design the system correctly. The single biggest finding that REVISES our
plan: **a theme must flow through a SEMANTIC token tier, not edit component/raw values
directly.** Spotify shipped primitive→component with no semantic layer and had to retrofit
one across the whole system during a rebrand. We will not repeat that. (Sources §9.)

## 1. Token architecture — THREE TIERS (mandatory, DTCG-aligned)
The W3C Design Tokens Community Group spec reached its **first stable version (2025.10)**.
Build on it (portable, no vendor lock-in). Adopt the industry-standard three-tier model
used by Adobe Spectrum, Salesforce Lightning, Material 3:

- **T1 Primitive (global / "ions")** — raw, context-free values: the full color ramp
  (`color.blue.500`), the spacing scale, radius scale, type scale, shadow set, durations.
  A *constrained palette*. **Components never consume these directly.**
- **T2 Semantic (alias / intent)** — references to primitives that carry MEANING:
  `color.bg.interactive`, `color.text.default`, `space.master`, `radius.card`,
  `control.height.standard`, `brand.primary`. **This is the theming layer.** A preset
  changes T2 (and the brand seed that derives the ramp), and the change propagates
  everywhere. THIS is what "apply a theme" means.
- **T3 Component** — per-component overrides that point at T2: `button.bg`,
  `kpi.value.color`. Only when a component genuinely needs to diverge.

**HESEM mapping & SSOT consequence:**
- `graphics_token_catalog` already holds keys spanning these tiers. v2 must make the tier
  EXPLICIT (tag each catalog token with `tier: primitive|semantic|component`).
- **A theme preset edits T2 semantic tokens + brand seed only** (it may set T1 if it
  ships a custom ramp, but the *intent* lives in T2). The preset's `overrides` JSONB bag
  is a T2/T3 override map. The preset editor (MSV2-1) groups attributes by T2 semantic
  category, NOT by raw hex pickers scattered everywhere.
- **Lego L0 splits into L0a Primitive + L0b Semantic** (MSV2-2). Component token edits
  (T3) live at L2. No surface edits the same token at two tiers.

## 2. Token naming taxonomy (EightShapes — normative)
All token keys follow **namespace · object · base · modifier**
(Nathan Curtis / EightShapes):
- **base** = category.concept.property (e.g. `color`, `space`, `radius`, `type`,
  `elevation`, `motion`).
- **object** = component/element when T3 (`button`, `kpi`, `toolbar`).
- **modifier** = variant/state/scale/mode (`hover`, `soft`, `on-dark`).
HESEM uses dot-notation (`brand.primary`, `space.master`, `status.danger.soft`,
`control.height.standard`). New tokens MUST fit this taxonomy + be registered in
`graphics_token_catalog` (with `css_variable` + `tier`) BEFORE any UI reads them
(CLAUDE.md Graphics Authority rule). No ad-hoc names.

## 3. Component model — atomic / level taxonomy (Lego L-layers)
Brad Frost's atomic design is the accepted mental model (labels are flexible; the
*hierarchy/dependency graph* is the point). HESEM Lego layers map cleanly:
- **L0 ions/tokens** → T1 primitive + T2 semantic (the two sub-levels above).
- **L1 atoms** → primitives (button, input, chip) — one token contract each.
- **L2 molecules** → components (toolbar, KPI tile, table, panel).
- **L3 organisms** → curated blocks (`graphics_block_contract`).
- **L4 templates** → archetypes / zone skeletons (`graphics_module_archetype`).
- **L5 pages** → assembled module manifest (`module_schema`).
Navigation MUST show the **dependency graph** (a component lists which tokens/level it
consumes — like Spectrum's token-usage view), not a flat dump. Don't be dogmatic about
exactly 6 boxes; group logically by dependency.

## 4. Theming = semantic aliasing + brand derivation (Spectrum/Marriott pattern)
A preset is "a brand seed + semantic overrides." Applying it flows brand decisions
through T2 aliases across all components (Spectrum alias tokens; Marriott multi-brand
case). Concretely for MSV2-1:
- Brand seed → derive the OKLCH ramp (hover/soft/strong) — reuse existing OKLCH helpers.
- Preset edits T2 semantic groups (color roles, surfaces, borders, text, density, radius,
  control, type scale, elevation, motion) — written to columns + `overrides` bag.
- Apply persists org-wide via the unified Phase-A authority (already shipped). No preset
  edits raw component CSS.

## 5. Schema-driven module = metadata ⟂ content (Retool/Budibase pattern)
Low-code builders separate **configuration metadata** (app/screen structure) from
**page content/data** — schema-driven render means schema changes need no UI code change.
This validates the founder's two-edit split (MSV2-3):
- **Module metadata**: id, title vi/en, subtitle, icon, route, roles, archetype,
  theme preset, domain, description → "✎ Sửa thông tin" modal.
- **Module content**: zones[] → blocks[] (+ slot data) → "🧩 Sửa nội dung" canvas editor,
  rendered by the schema-driven `HmBlockEngine` (no hardcoded layout).
Both halves are ONE `module_schema` record; the two editors edit disjoint halves. Validate
against `module.build-packet.schema.json` (P4 gate) before save.

## 6. Governance, versioning, lifecycle (enterprise standard)
World practice: **semantic versioning + changelog + deprecation schedule + PR-style
review + real-time compliance audit**. HESEM already has publish/stage/canary/rollback +
audit (Giao diện). v2 must align every authored object to this lifecycle:
- **Presets, blocks (L3), archetypes (L4), modules (L5)** each carry `status`
  (draft → published → deprecated) and a version integer (module_schema already versions;
  extend presets/blocks if needed). Deprecation is a status + a visible badge, never a
  silent delete.
- Mutations write `audit_events` (already enforced in the save services).
- The promote/rollback authority stays in Giao diện (templates/governance/advanced) — the
  authoring surfaces (Module Studio) never bypass it.

## 7. Accessibility — WCAG 2.2 AA baseline + APCA perceptual (hybrid)
Tham chiếu live audit (MSV2-3) MUST:
- Compute **WCAG 2.2 AA** (legal baseline: 4.5:1 normal, 3:1 large/UI) from the ACTUAL
  resolved `:root` token pairs now in effect — pass/fail per pair.
- ALSO show **APCA Lc** values (perceptual, the WCAG-3 direction) as guidance for dark
  mode / thin fonts. Hybrid: 2.2 for compliance, APCA to tune. (Do NOT claim WCAG 3 /
  APCA as compliance — it is still draft.)

## 8. Definition of Done (every prompt — non-negotiable)
"Không lỗi code hoặc đồ họa" + "kết nối backend đầy đủ" made concrete:
1. `node --check` clean on every JS file touched.
2. **Zero console errors** on the surface (verify via Chrome `read_console_messages onlyErrors`).
3. **Every interactive control tested in Chrome via code** (computed-style / DOM /
   round-trip — not screenshots-as-proof). Every button fires its handler exactly once
   (no duplicate-listener regressions).
4. **Full backend round-trip** for every mutation: the write hits the real action
   (`window.apiCall`, CSRF), the response is `ok`, and a re-read (`*_list`/`*_get`) shows
   the change persisted; for theme, reload shows org-wide effect.
5. **SSOT proof**: grep shows each attribute edited in exactly one surface/tier; no
   hardcoded hex/px authority in JS (color-input defaults are data, allowed); spacing
   8/12, control 32, radius 4/8/pill; brand resolves #0c4a6e by default.
6. **No graphics regression**: blocks render real content (not empty shells); the 5→new
   surfaces all paint; the gray portal divider + edge-to-edge intact.
7. Clean up test data; restore org theme to default after destructive theme tests.
8. Exec report in `_reports/lego-empire/exec/msv2-N-*.md` listing every button tested.

## 9. Sources (researched)
- W3C DTCG — first stable spec 2025.10: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/ · https://www.designtokens.org/
- Three-tier token architecture + Spotify lesson: https://designsystemproblems.com/token-management/token-tier-system/ · https://oboe.com/learn/advanced-design-engineering-and-systems-architecture-2hulw5/design-token-architecture-0
- Adobe Spectrum alias tokens / Marriott multi-brand: https://spectrum.adobe.com/page/design-tokens/ · https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676
- Salesforce Lightning styling hooks/tokens: https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/tokens_intro.htm
- Atomic design 2025 (ions/tokens layer, flexible): https://medium.com/design-bootcamp/atomic-design-in-2025-from-rigid-theory-to-flexible-practice-91f7113b9274 · https://atomicdesign.bradfrost.com/chapter-2/
- Token naming taxonomy (EightShapes namespace·object·base·modifier): https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676
- Governance/versioning/deprecation/compliance dashboards: https://miro.com/research-and-design/design-system-governance/ · https://www.uxpin.com/studio/blog/component-versioning-vs-design-system-versioning/
- Schema-driven low-code (metadata ⟂ content): https://medium.com/@kharshith53/designing-scalable-metadata-driven-uis-for-dynamic-data-systems-c0b3fb7271ce · https://docs.budibase.com/docs/component-schema
- WCAG 2.2 + APCA hybrid: https://humbldesign.io/blog-posts/color-accessibility-guide-wcag · https://git.apcacontrast.com/documentation/WhyAPCA.html
