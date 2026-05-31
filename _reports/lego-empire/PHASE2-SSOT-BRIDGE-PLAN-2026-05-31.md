# Lego Empire — Phase 2.2 SSOT Bridge Plan

**Date:** 2026-05-31
**Author:** Claude (Opus 4.8)
**Status:** Stage 0 SHIPPED + verified; Stages 1–3 REVISED (see §7) — awaiting go-ahead on the visual migration
**Predecessor:** `MASTER-STRATEGY-2026-05-31.md`, Phase 2.1 (PR #92, theme picker — shipped)

---

## §0. REVISION (2026-05-31, after implementation began) — read first

Two facts surfaced while building Stage 0 and **materially reshape this plan**:

1. **A curated L1→L4 Lego stack already exists** in the repo: L1 token → L2 `o3-*`
   component → **L3 block** (`00bc-block-registry.js` + `00bd-blockkit.js`, CI gate
   `check_graphics_block_registry.php`, migration 261) → **L4 archetype**
   (`00be-archetype-registry.js` + `00bf-archetypekit.js`, gate
   `check_graphics_archetype_registry.php`, migration 262). This is the intended
   SSOT *target*, and it is governed + class-only.

2. Therefore the original Stage 0 step **"backfill all ~196 Block-Engine catalog
   types into the L3 registry as `status:legacy`" is WRONG** — it would pollute the
   curated registry and violate its gate invariants (`composed_of` must reference
   real CSS classes; only 5 categories). **Dropped.**

**What shipped instead (Stage 0, PRs #95 + #96, verified live):** `window.Blocks`
— a render facade that dispatches **L3 BlockKit (published) → legacy Block Engine
(`BE.renderBlock`)** and is *read-only* over both registries (`list/has/meta/
source/coverage` union them; nothing is injected into 00bc). Live coverage:
`{ blockkitPublished: 6, engineCatalog: 174, total: 180 }`. Parity verified in
Chrome: `Blocks.render` is byte-identical to `BlockKit.render` for L3 keys and to
`BE.renderBlock` for engine keys. CI smoke `smoke-blocks-facade.mjs` gates it.

**Key vocabulary gap (why the deeper merge needs sign-off):** L3 blocks use *dotted*
keys (`kpi.grid`, `table.data`) while the Module Builder / 174 engine types use
*dashed* keys (`kpi-row`, `data-table`). They don't collide, so the facade's
L3-preference never fires for existing modules. Making existing modules render via
the cleaner L3 blocks (the real Stage 2) means mapping dashed→dotted **and changing
the visual output of every module using those types** — a per-block design decision
that converges on the parallel L4 effort. See §7 for the revised, sign-off-gated
approach.

---

## 1. The problem: two block systems, no single source of truth

The portal has **two parallel, unconnected block systems**:

| | **Block Engine** | **L3 BlockKit** |
|---|---|---|
| File | `mom/scripts/portal/00-block-engine.js` (~14.5k lines) | `00bc-block-registry.js` + `00bd-blockkit.js` (~18 KB) |
| Vocabulary | `BE.BLOCK_CATALOG` ≈ 196 types | 6 published blocks |
| API | `renderModuleFromSchema(container, schema)` → DOM | `BlockKit.render(key, slots)` → HTML string |
| Unit | atomic + composite renderers (`_renderBlockInner` switch) | composite L3 patterns (panel = head+body+actions) |
| Styling | historically inline-style; now shell-tokenized via `lego-shell.css` | **class-only** `o3-*` (orders-v3.css), zero inline literals |
| Governance | none (catalog is a code literal) | registry-of-record + CI gate (`check_graphics_block_registry.php`) + migration 261 mirror |
| Consumers | Module Builder, every authored module | Module Sample, orders-v3 surfaces |
| Theme | now via `schema.config.theme` → `LegoTheme` (PR #92) | inherits `o3-*` tokens (master density) |

They are **different abstractions, not duplicates of the same thing** — which is *why* a naive "delete one" merge is wrong. Block Engine is the rich module-authoring vocabulary; BlockKit is the governed, class-only, registry-first design layer. The SSOT goal is: **one registry of record, one render facade, one styling discipline (class-only + tokens)** — reached by *strangling* the Block Engine toward the BlockKit discipline, not by rewriting 196 renderers in a weekend.

---

## 2. Target end-state (the SSOT)

1. **One registry of record.** Every renderable block type — all ~196 — has a row in the governed registry (the `00bc` pattern + migration 261 mirror), declaring: `block_key`, category, status, `composed_of` classes, `slots`, `required_tokens`, `a11y_contract`. The CI gate enforces: a block ships only when `status='published'` AND every `composed_of` class exists AND it has a renderer.
2. **One render facade.** `window.Blocks.render(type, payload, ctx)` is the single entry point. It dispatches: BlockKit renderer if present → else Block Engine `_renderBlockInner`. Callers never branch on which system.
3. **One styling discipline.** Class-only + token-bound. No inline color/px literals in renderers (already enforced for new code by the XSS/`_safeColor` work; extend to a lint that flags inline style literals in renderers).
4. **One theme path.** `schema.config.theme` → `LegoTheme` scoped to the stage (shipped in 2.1). BlockKit `o3-*` already consumes the same master tokens, so a themed stage restyles both.

---

## 3. Strategy: strangler fig, not big-bang

We wrap the old system behind the new facade, register every type, then migrate renderers one category at a time — each migration is independently shippable and reversible, and the facade guarantees nothing breaks while a type is still on the legacy path.

### Stage 0 — Facade + registry backfill (1 PR, low risk, no behavior change)
- Add `window.Blocks` facade: `render(type, payload, ctx)`, `has(type)`, `list()`, `meta(type)`.
  - Dispatch order: (a) `BlockKit.get(type)` published + renderer → `BlockKit.render`; (b) else Block Engine `_renderBlockInner`/`renderModuleFromSchema` path.
  - Pure string output for (a); for (b) keep the existing DOM-mount contract via a thin adapter.
- **Backfill the registry** from `BE.BLOCK_CATALOG`: a generator script emits a registry row per catalog type with `status:'legacy'` (a new status the gate treats as "renderer = Block Engine, not yet class-only"). This makes the registry the catalog-of-record *immediately* without migrating any renderer.
- Gate change: `check_graphics_block_registry.php` accepts `status` ∈ {`published`,`legacy`,`draft`}; `legacy` rows skip the `composed_of`-class-exists check (they don't claim class-only yet) but MUST have a Block Engine catalog entry.
- **Exit criteria:** registry lists all ~196 types; `Blocks.render` round-trips every showcase block identically to today (re-run `smoke-lego-showcase.mjs` through the facade — byte-identical output).

### Stage 1 — Module Builder + showcase read the registry (1 PR)
- Module Builder library panel and Lego Showcase enumerate from `Blocks.list()` / registry metadata instead of `BE.BLOCK_CATALOG` directly. (Catalog becomes an implementation detail behind the registry.)
- No renderer changes. **Exit:** builder library + showcase visually unchanged; both now driven by the registry.

### Stage 2 — Migrate renderers category-by-category (N PRs, one per category)
Order by leverage (highest reuse first): **layout → display → feedback → navigation → input → chart → domain**.
For each type:
1. Rewrite its renderer to class-only `o3-*` (extract any inline literal into a token + `o3-*` rule in `orders-v3.css` or a new `lego-components.css` layer).
2. Flip its registry row `legacy → published`, fill `composed_of` + `required_tokens` + `a11y_contract`.
3. The facade now routes it through the published (class-only) path automatically.
4. Verify: smoke + XSS regression + Chrome render parity screenshot.
- Charts and domain blocks are the long tail; they can stay `legacy` indefinitely without blocking the SSOT — the registry already records them.

### Stage 3 — Retire the catalog literal (1 PR, after enough coverage)
- `BE.BLOCK_CATALOG` becomes a thin projection of the registry (generated), not a hand-maintained literal. New blocks are authored registry-first.
- **Exit:** adding a block = add a registry row + a class-only renderer; the gate enforces both.

---

## 4. Why this is safe

- **No flag day.** Every stage ships independently; the facade keeps both paths live throughout.
- **Reversible.** Each renderer migration is one type; revert is one row flip + one renderer revert.
- **Gated.** The existing CI gate (extended for `legacy` status) prevents a half-migrated block from shipping.
- **Parity-tested.** `smoke-lego-showcase.mjs` (161 blocks headless) + XSS regression + Chrome screenshots gate every stage.
- **Theme already unified** (2.1), so migration never has to also chase theming.

## 5. Effort & sequencing

| Stage | Scope | Risk | Shippable alone |
|---|---|---|---|
| 0 Facade + backfill | 1 PR + generator + gate tweak | low | ✅ |
| 1 Builder/showcase read registry | 1 PR | low | ✅ |
| 2 Renderer migration | ~7 PRs (per category) | medium, isolated | ✅ each |
| 3 Retire catalog literal | 1 PR | low (after coverage) | ✅ |

Stages 0–1 are the high-value, low-risk core and can proceed on approval. Stage 2 is incremental and can run as long as desired; Stage 3 is a cleanup once coverage is comfortable.

## 6. Recommendation (original — superseded by §7)

Proceed with **Stage 0 + Stage 1** next (facade, registry backfill, builder/showcase reading the registry) — this delivers the "one registry of record + one render facade" SSOT spine with no behavior change and full parity tests. Defer Stage 2 renderer migration to an approved, paced sequence (it touches visuals, so each category wants a Chrome sign-off). This matches the user's standing preference: redesign/derisk before invasive steps.

---

## §7. REVISED stages 1–3 (post-discovery, the actual path)

Stage 0 (facade) shipped. The remaining merge converges existing modules onto the
curated L3/L4 stack. It is intrinsically **visual** and **adjacent to a parallel
effort**, so it is sign-off-gated, not autonomous.

- **Stage 1 — equivalence map (low risk, no visual change).** Author a
  `BLOCK_L3_EQUIVALENCE` map (`kpi-row→kpi.grid`, `data-table→table.data`,
  `filter-bar→toolbar.filtered`, `card-container→panel.standard`,
  `empty→empty.state`, the shell → `shell.workspace`) as DATA only, plus a
  payload-adapter per pair (engine `config` → L3 `slots`). Ships behind a default-OFF
  flag (`Blocks.preferL3=false`). No module changes appearance yet. CI smoke extends
  to assert each adapter produces valid L3 slots.

- **Stage 2 — flip per block, with Chrome sign-off (visual).** For ONE block type at
  a time: turn the equivalence ON for that key so `Blocks.render(dashedKey)` routes to
  the L3 block via the adapter; render the Lego Showcase + a real module
  (M-lego-showcase, M2-orders) in Chrome; screenshot before/after; get explicit
  approval that the L3 look is acceptable; then ship. One PR per block (≈6 candidates
  that have L3 equivalents today). Blocks WITHOUT an L3 equivalent stay on the engine
  indefinitely — the facade already records them; no forced rewrite of 174 renderers.

- **Stage 3 — author new L3 blocks for high-value archetypes.** Where the engine has
  a popular type with no L3 equivalent (charts, kanban, gantt), author a real
  class-only L3 block (00bc row + 00bd renderer + o3-* CSS) following the gate, then
  add it to the equivalence map. This is genuine per-block design work, paced, and is
  the same direction the L4 archetype effort is going — coordinate to avoid collision
  on `00bc`/`00bd`/`orders-v3.css`.

**Why not autonomous:** Stage 2 changes how shipped modules look (the user's #1
concern is graphics quality) and touches files a parallel `codex/*` session may edit.
Each flip therefore wants an explicit visual OK. The facade (Stage 0) is the part that
makes all of this safe and incremental; it is done.
