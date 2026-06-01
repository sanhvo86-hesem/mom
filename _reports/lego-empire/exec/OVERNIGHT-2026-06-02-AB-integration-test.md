# Module Studio — Overnight A↔B Integration + Exhaustive Chrome Test
**Date:** 2026-06-02 (overnight, founder asleep)
**Session:** A (frontend) — `32-module-studio.js`
**Mandate:** integrate A↔B, deep audit + adversarial critique, test every button in
Chrome, gather all bugs in one pass, fix in batch, repeat until zero defects; ensure
every frontend function works + connects backend + no hardcode; simulate create/edit/
delete for module, lego block, theme. No questions; report in the morning.

---

## Outcome: ✅ Module Studio fully functional, SSOT-pure, all flows verified live

Shipped 3 deploys this session (all green on CI + VPS):
- **v0.4.0** (#162) — A↔B integration: 3 surfaces (🧱 Lego / 📦 Modules / 🎨 Theme) wired to backend.
- **v0.4.1** (#163) — batch fixes from the full Chrome test pass (3 defects).
- **v0.4.2** (#164) — complete theme lifecycle: Delete button for non-builtin presets.

---

## Test method
Programmatic harness in the live page (computed-style + real API round-trips are
authoritative; screenshots are corroborating only — a known trap is the SPA
re-rendering between JS-render and screenshot). Every backend call uses the real
`window.apiCall` (CSRF-safe) / `fetch`, exactly the payloads the buttons build.

## Backend wiring — ALL VERIFIED OK (live VPS)
| Flow | Action | Result |
|---|---|---|
| Create module | `module_schema_save` | ok, v1, appears in list |
| List | `module_schema_list` (+`includeDeleted`) | `schemas[]`, 10 modules |
| Version history | `module_schema_versions` | populates on 2nd save (snapshot v1) |
| Rollback | `module_schema_restore_version` | ok, forward-only (v1→new v3) |
| Archive (soft-delete) | `module_schema_delete` | status→deleted, restorable |
| Restore | `module_schema_restore` | ok, back to active |
| Theme list | `graphics_theme_preset_list` | `presets[]`, brand #0c4a6e |
| Theme apply | `LegoTheme.applyTheme` | re-skins live (space 8→6, ctrl 32→28) |
| Theme clone | `graphics_theme_preset_save` | ok, clone appears |
| Theme delete | `graphics_theme_preset_delete` | ok, non-builtin removed |
| Block contract save | `graphics_block_contract_save` | ok (Author mode) |
| Simulate | `GraphicsAuthority.preview.simulate` | available |

## Render layer — ALL OK
3 surface tabs · Assemble/Author toggle · 182 library rows (L3/L4/Engine 174) ·
L3/L4/engine selection → inspector · Author edit fields (name + status + Save) ·
canvas preview · module table (10) · theme table (6 builtin) · live search filter.

## Defects found in the one test pass → all fixed (v0.4.1 + v0.4.2)
- **F-A [HIGH]** Duplicate event listeners. `render()` re-attached click/change/input
  on every nav-return (02-state-auth-ui re-invokes render), so one click fired N times
  → double POST (create/archive multiplied). Measured: 1 click = 5 apiCalls after 3
  remounts. **Fix:** `el.__msWired` guard → listeners attach exactly once per host node.
  **Verified:** after 4 mounts, 1 click = exactly 1 fetch.
- **F-B [SSOT]** `__btn--sm` hardcoded `height:24px`, violating single-standard 32px
  control height. **Fix:** drop height override → inherits `--o3-control-h-standard`;
  only padding/font tighten. **Verified:** all controls = 32px.
- **F-C [LOW]** "Làm mới" ignored the "show archived" checkbox. **Fix:** `incDelChecked()`
  helper; refresh + archive both respect it.
- **Theme lifecycle gap** Clone existed but no Delete in UI → orphan clone accumulation.
  **Fix (v0.4.2):** Delete button on non-builtin presets only (builtin protected),
  wired to the existing `graphics_theme_preset_delete`. Completes clone→delete.

## SSOT / no-hardcode compliance (verified)
- Spacing literals: only 8/12/0 (`--o3-space` / `--o3-space-section`). No off-grid.
- Control height: single 32px (`--o3-control-h-standard`) everywhere.
- Radius: 4/8/pill tokens. Colors: `--o3-*` tokens; brand resolves #0c4a6e (navy).
- Only raw hex literal is the preset brand swatch (`p.brand` is stored color DATA, not
  an authority token) — correct.
- Edge-to-edge (page gutter zeroed) + 1px gray left divider (portal|module) intact.

## Data hygiene
- Cleaned this session's own test pollution (theme clone `mstest-*` deleted).
- Left prior-session test modules (HydrateProbe / RawProbe / Persist Isolate / E2E
  Persist Test) untouched — created by Session B, not this session; the founder can
  archive them from the UI (📦 Modules → Archive) if desired. Did not delete data this
  session didn't create (data-ownership boundary).

## Known non-defects (explained, not bugs)
- `custom-mptgzzdi` (v2) shows 0 version snapshots — it reached v2 BEFORE the snapshot
  feature deployed; newly-saved modules snapshot correctly (verified).
- Archetype column "—" for older modules — they predate `moduleArchetype`; new modules
  set it on create.
- Trailing vertical space below short tables is normal table behavior (width:100%, no
  max-width cap, no artificial min-height) — not an orphan gutter.

## Follow-ups (non-blocking, for daylight)
- Create-module currently uses a native `prompt()` for the name; a proper inline form
  (archetype + theme picker) would be a nicer Author experience (wireframe had this).
- Author block edit covers name + status; richer contract editing (slots/tokens) is a
  future iteration.
- P0.B2 (cut `HmTheme.getDeep` fallback in 00bb) pending Session B confirming
  `graphics_token_value` is the sole authority.
