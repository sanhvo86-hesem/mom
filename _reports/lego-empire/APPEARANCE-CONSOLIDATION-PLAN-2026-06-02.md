# Appearance (Giao diện) → Module Studio — SSOT Consolidation Plan
**Date:** 2026-06-02 · **Status:** PROPOSAL — awaiting founder approval before any code change

## Audit result — what the 8 Appearance tabs actually do
(`00c-admin-appearance.js` 5379 lines + `-module-sample.js` 2729 + `-theme.js` 619)

| Tab | Does | Write-path | Verdict vs Module Studio |
|---|---|---|---|
| **templates** (Mẫu bố cục) | Template registry lifecycle: Preview/Save draft/Validate/Impact/**Publish/Stage/Canary/Apply globally/Rollback** | `_admGraphicsTemplateAction()` (authority-gated) + draft cache | **UNIQUE** — MS has no template governance |
| **module-sample** (Module Master) | Showcase of every component **+ token-editing DOCK** (per-property Custom override → edit value → Save) | `HmTheme.saveAdminConfig()` (org design config) | Showcase overlaps MS Lego, but **the token-edit dock is unique** (MS Lego is read-only/select) |
| **theme** (Theme) | Global knobs: mode/color/typography/density/motion + preset picker | `HmTheme.saveAdminConfig()` | **Partial overlap** w/ MS Theme — but DIFFERENT write-path (`graphics_theme_preset_save`) → **real SSOT issue** |
| **accessibility** (Trợ năng) | WCAG AA contrast checker + colour-blind sim + checklist | read-only | UNIQUE |
| **analytics** (Xuất & Phân tích) | Health score + token export (CSS/SCSS/JS) + specimen/palette/motion catalog | read-only/export | UNIQUE |
| **governance** (Quản trị tuân thủ) | Standard-36 compliance matrix + drift detector + release blockers + audit history | read-only | UNIQUE |
| **advanced** (Nâng cao) | Changeset/release dashboard + waiver workflow + draft cache import/export (+ dup Publish/Apply/Rollback) | `_admGraphicsTemplateAction()` + local cache | mostly UNIQUE (release ops) |
| **standard** (Chuẩn thiết kế) | Embedded design-standard reference doc | read-only | UNIQUE |

## KEY FINDING (changes the approach)
The "duplication" the founder sees is **mostly superficial naming**. Functionally:
- **Token editing is NOT duplicated** — only Module Master's dock + the Theme tab edit tokens.
  Module Studio's Lego/Theme are read-only display + preset list. So **deleting those tabs now = real regression** (lose all token editing + Simulate/Publish).
- **The ONE genuine SSOT violation is the theme write-path split:** Appearance Theme writes
  `HmTheme.saveAdminConfig()` (org design config JSON); Module Studio Theme writes
  `graphics_theme_preset_save` (preset table). Two paths can disagree. **This must be reconciled first.**
- The other 5 tabs (templates, accessibility, analytics, governance, advanced, standard) are **unique
  authority/reference surfaces** with no Module Studio equivalent.

## Target end-state (matches the LOCKED architecture: Theme / Module Studio / Governance)
- **Module Studio** = authoring surface: **Lego** (blocks + absorbed token-edit dock) · **Modules** (CRUD) · **Theme** (global knobs + preset mgmt, ONE write-path).
- **Governance** (rebranded Appearance) = deep authority admin: templates registry lifecycle + Standard-36 governance + advanced release/waiver/audit. Grouped to ~2 tabs.
- **Reference** = read-only: accessibility + analytics + standard → one "Tham chiếu/QA" surface (in Module Studio or Governance).
Net: 8 tabs → ~3 surfaces, every feature in exactly ONE place, zero regression.

## Sequenced plan (each step = 1 PR, verified in Chrome, no regression)
**Phase A — reconcile theme write-path (SSOT-critical, FIRST).**
- A1 (investigate): map exactly how `HmTheme.saveAdminConfig()` vs `graphics_theme_preset_save` differ
  and whether applying a preset already flows to the same authority. May need Session B (backend).
- A2: unify so "Apply preset" in Module Studio == the global theme write (one authority). Verify a
  preset apply and a Theme-tab edit converge on the same stored values.

**Phase B — absorb editing into Module Studio (reuse, don't rewrite).**
- B1: surface the existing Module Master token dock inside MS Lego Author mode (reuse
  `window._renderAdmModuleSampleHtml` / its dock + `persistModuleMaster` + Simulate). MS Lego gains
  real token editing with the SAME write-path.
- B2: surface the global Theme knobs (mode/color/typo/density/motion) inside MS Theme surface
  (reuse `window._renderAdmThemeHtml` logic).

**Phase C — remove the now-true duplicates from Appearance.**
- C1: after B1/B2 verified, delete `module-sample` + `theme` tabs from Appearance (or redirect to MS).

**Phase D — rebrand + slim Appearance → Governance.**
- D1: group remaining tabs (templates+advanced → "Phát hành/Quản trị"; governance → "Tuân thủ";
  accessibility+analytics+standard → "Tham chiếu"). Appearance title → "Quản trị đồ họa & Phát hành".

## Risks / notes
- The dock + theme renderers are large (2729 + 619 lines). Plan **reuses** them via their existing
  global render fns, not rewrites, to avoid losing behaviour.
- Phase A is the deepest (two write-paths) and may require backend (Session B) coordination.
- Templates/governance/advanced are the live authority control plane — must NOT be touched except
  regrouping; their `_admGraphicsTemplateAction` write-path stays intact.

## What I need from the founder
1. Approve target end-state (Theme/Module Studio/Governance) + the A→B→C→D order?
2. Where should the read-only Reference (accessibility/analytics/standard) live — inside Module Studio
   as a 4th surface, or under Governance?
3. OK to coordinate Phase A with the backend (Session B) for the theme write-path unification?
