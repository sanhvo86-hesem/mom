# P1–P4 Live Audit Findings — 2026-06-01 (Chrome, eqms.hesemeng.com, logged in)

Method: click-through + computed-style probes + direct API calls + source trace.
Posture: record ALL first, root-cause, fix triệt để, then re-audit.

## CONFIRMED FINDINGS

### F1 [P4 · CRITICAL] Global sidebar re-skin (#126) is a NO-OP
- Real sidebar DOM: `aside#sidebar > nav#sidebar-nav > button.nav-item` + `.nav-section-title`.
- #126 in graphics-authority.css targets `.eqms-nav` / `.eqms-nav-item` / `.eqms-nav-group-label` / `.eqms-nav-toggle` — **zero such elements rendered** (that markup belongs to 40-eqms-shell.js, an unused shell in this portal view). `document.querySelectorAll('.eqms-nav-item').length === 0`.
- Effect: the entire P4 sidebar unification never applied to the live sidebar.
- ROOT FIX: rewrite the block to target the real `#sidebar-nav .nav-item` and override the CSS vars that portal.main.css (frozen) already consumes with fallbacks: `--nav-item-bg-active/-color-active/-border-active/-bg-hover/-color-hover/-border-hover`. No frozen-file edit; graphics-authority.css loads after portal.main.css.

### F2 [P4] Sidebar active state is half-hardcoded → mismatched gradient on non-blue themes
- portal.main.css L102: `.nav-item.active{background:var(--nav-item-bg-active, linear-gradient(135deg, color-mix(brand-2 88%/black) , var(--brand-light,#3b82f6)))}` + `box-shadow:0 14px 24px rgba(21,101,192,.18)` (hardcoded blue shadow).
- LegoTheme.applyTheme updates `--brand-2` (dark stop follows theme) but NOT `--brand-light` (=#1e88e5 from hesem-design-tokens.css). On slate theme → gradient slate(#334155)→#1e88e5 = gray-to-blue mismatch. Shadow stays blue always.
- Same hardcode reused by `.admin-tab-v2.active` (portal.main.css L994/996).
- ROOT FIX: define `--nav-item-bg-active` (theme-aware, derived from --o3-brand), `--nav-item-color-active`, `--nav-item-border-active`, `--nav-item-bg/color/border-hover`, and a theme-aware shadow in graphics-authority.css :root.

### F3 [Builder · graphics — the "cấp 1 / thô kệch" clutter] Canvas block faces dump internal taxonomy
- On the KPI Row canvas card the face shows: `📝 Manual`, `📐 12/6/12/12` (column spans), `⚠ 1`, `👁 Glance`, `🎬 observe`, `📡 status`, `🤝 optional`, `🖐 default`, `🕸 observe`, `🧠 cross-functional`.
- This raw block-engine metadata (lifecycle/intent/governance/spans) is redundant with the Properties inspector (General/Data/Style/Events) and is the primary source of the unprofessional look.
- ROOT FIX: suppress/collapse the meta-chip strip on the canvas block face (keep title + subtitle + actual rendered content). Move taxonomy to inspector only, or behind a hidden "dev info" toggle.

### F4 [Builder · minor] off-grid block padding + stale saved gap
- `.mb-block-card` inner padding `10px 0px` (should be 8). Gap dropdown shows `16px` for saved modules (default for NEW is 8 since #125, but existing modules not migrated). offgrid radii in canvas = 0 (good).

### F5 [Theme · SSOT conflict] default loaded brand ≠ Lego preset default
- Page loads `--o3-brand = --brand-2 = #0c4a6e` (from admin theme-manager config / design-system-config).
- Lego preset "HESEM mặc định" brand = `#1565c0` (DB graphics_theme_preset, is_default).
- Two authorities disagree; picking the "default" preset visibly jumps the brand. Investigate which is SSOT; reconcile.

### F6 [Builder landing · data clutter] 9 identical "New Module /new-module" junk rows in "Your Modules".

## CONFIRMED WORKING (no action)
- W1 P3 backend: GET graphics_theme_preset_list → 200, 6 published presets from Postgres (hesem-default 8/8/4/32, brand #1565c0). POSTGRES_ONLY.
- W2 P2 palette: unified Block Library, VN/EN names + icons + green **SSOT** badge on KPI Row. Categories with counts (Layout 15/Data 25/Form 17/Chart 18/Action 13/Media…).
- W3 Builder Properties inspector: General/Data/Style/Events, VI/EN title+subtitle, Visible/Lock toggles — clean & functional.
- W4 LegoTheme v1.3.0: applyTheme/loadPresets/setCardRadius present; theme switch updates --o3-brand + --brand-2 live.
- W5 Builder landing + canvas: page padding 0, max-width none (edge-to-edge), control radii 4, container radii 8, canvas offgrid radii 0.
- W6 Builder chrome recolors with theme (violet hero, P1 #108).

## ADMIN GRAPHICS PLANE — audited (all render OK)
- P3 Theme Template editor: renders full VN form (gap 8 / bo ngoài 8 / bo trong 4 / control 32), brand swatch = DB #1565c0; Simulate applies preset live + toast "✅ Đang mô phỏng theme trực tiếp"; all _admTp* fns present; GraphicsAuthority.preview.simulate + PreviewScenes present.
- #128 Module Master "Shell · Sidebar": .o3-shell__rail sample correct (active brand-soft + 3px brand left accent, 32px, 8/8 grid) — but its note claimed the global sidebar was already re-skinned (FALSE, see F1/F8 → fixed).
- P2 unified catalog "Catalog Block (hợp nhất)": 177 blocks render with badges (Engine 173, L3 3, SSOT 1 — staged-migration state, expected).
- Module Master buttons measured 32px (correct); F7 was only the descriptive text.
- Console: no JS errors from P1–P4 code (only pre-existing registry-empty warnings from QEH/SQ/DPP, unrelated).

## NEW FINDINGS (admin/source pass)
### F7 [stale text] module-sample.js L42-43 said "control.height.standard (36px)" — actual = 32px. → FIXED (32px, ref migration 230).
### F9 [hardcode] block-engine.js had 46 off-grid px literals; the off-grid component GAPs (gap:10/14/18px) survived #120/#124 (which only fixed radii). → FIXED the gaps (10→--o3-space, 14/18→--o3-space-section); left intra-text 2px micro-gaps. Residual off-grid PADDINGs (12px 14px, 22px, 14px 16px, 24px 26px…) remain — documented, lower-risk, niche renderers; defer to a focused pass with per-block visual verify.

## FIXES APPLIED (branch codex/audit-fixes-20260601, from origin/main)
- **F1+F2+F8 sidebar** — graphics-authority.css: replaced the no-op `.eqms-nav*` block with real selectors `#sidebar`/`#sidebar-nav .nav-item`; defined theme-aware `--nav-item-*` override vars (kills the hardcoded #1e88e5 light-stop + blue glow); active = brand-soft fill + brand text + `inset 3px 0 0 var(--o3-brand)` accent (matches .o3-shell__rail + makes F8's note true); snapped padding/gap to 8/12; unified .admin-tab-v2.active shadow. No frozen-file edit (portal.main.css untouched; we only set the vars it already reads + higher-specificity rules).
- **F3 builder declutter** — 31-module-builder.js `_ensureBuilderStyles`: hide the experimental round overlays `.mb-r3-block-aura/.mb-r4-block-prime/.mb-r5-block-chipline` on the canvas block face (the 6+ taxonomy emoji chips = the "cấp 1" noise). Kept the functional intel strip (binding · spans · warnings) + real content. Live-verified clean. Reversible CSS, no logic change.
- **F7** — module-sample text 36px→32px (VN+EN).
- **F9 gaps** — block-engine.js component gaps snapped to tokens.

## DEFERRED (documented, need decision / higher risk)
- **F5 theme-authority divergence** — RESOLVED (founder chose #0c4a6e as canonical, 2026-06-01). Re-pointed the HESEM-family presets (hesem-default / industrial-dense / comfortable) #1565c0→#0c4a6e in 3 places: migration 264 (UPDATE graphics_theme_preset, idempotent), 00bg-lego-theme.js THEMES + fallback, DesignTokenCatalogService.php builtinThemePresets + defaults. Distinct presets (shop-floor teal, violet, slate) untouched. Now picking "HESEM mặc định" no longer jumps the brand; sidebar active fill + text both resolve to the #0c4a6e family.
- **F4 block padding 10px / saved gap 16** — minor; offer to migrate existing modules' gap 16→8.
- **F6 9 junk "New Module" rows** — data cleanup, not code.
- **F9 residual off-grid paddings** — niche block renderers; focused pass with per-block verify.

## RE-AUDIT (after deploy — PR #130 merged 046d1c4d7, deploy 26745049459 success) ✅
- **F1/F2/F8 sidebar — VERIFIED LIVE**: active `.nav-item` now bg=brand-soft (rgb 224,242,254), `background-image:none` (gradient gone), color=brand, `box-shadow: inset 3px 0 0 brand` (hardcoded blue glow gone), padding-left 8 / gap 8 / radius 4 (on-grid). Visual: clean brand-soft pill + brand text + 3px left accent — matches the o3-shell contract. Switching Lego preset recolours the active bg.
  - NOTE surfaced: the active TEXT/accent resolves to the admin-config brand #0c4a6e while the bg (brand-soft) follows the Lego :root authority — the F5 divergence. Default state still looks unified (both #0c4a6e family); only diverges when Lego presets are switched. Documented; not a regression.
- **F3 builder declutter — VERIFIED LIVE**: `.mb-r3-block-aura/.mb-r4-block-prime/.mb-r5-block-chipline` = display:none; intel strip kept (flex); zero noise taxonomy chips visible. Block face = header + Manual/spans/⚠ + real KPI content. Professional.
- **Console — VERIFIED**: no JS errors/exceptions after fixes.
- F7 / F9 shipped in the same build (static, correct-by-construction).
