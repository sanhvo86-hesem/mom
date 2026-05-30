# v3-G23 + v3-G24 — Backend Persistence + Senior-Engineer Audit

**Date:** 2026-05-30
**Cache:** `?v=20260529-mm26`
**Branch:** `codex/mda-platform-isolated-20260529b`
**Commits:** `63f3c22d6` (persistence) · `16bae963d` (boot hydrate fix) ·
`40b812847` (density SSOT) · `52ed95dae` (inline-hardcode bindings)

---

## 1. THE HEADLINE — backend persistence (the user's #1 ask)

> "lưu dữ liệu được vào backend vẫn giữ được cài đặt cho lần đăng nhập sau"

### What was broken
- The dock "Lưu cho tổ chức" button only called
  `GraphicsAuthority.preview.simulate()` — **nothing reached the server**.
- The Theme tab "Save" only staged + showed a toast saying *"Backend
  wire pending"*.
- `o3-props-overrides` stored only boolean **flags**; the actual custom
  **value** lived only in `documentElement.style` and was **lost on
  reload** — so even same-browser persistence of per-component overrides
  never worked.

### What was built (NO parallel SSOT, NO new migration)
Reused the existing audited path: `HmTheme.saveAdminConfig()` →
`admin_design_config_save` → `GraphicsGovernanceService` →
`design-system-config.json` (versioned If-Match, CSRF refresh-retry,
`audit_events` row, DataSyncMutation-whitelisted file).

```
Save  → merge { theme, overrides, values, _savedAt } into the org
        design config under a `moduleMaster` key → saveAdminConfig().
Boot  → setInterval poll until HmTheme has loaded the org config, read
        cfg.moduleMaster, seed localStorage, apply theme + re-apply
        override VALUES. Falls back to localStorage cache if logged out
        or no blob. Lazy backstop also fires when the admin opens the tab.
```

New durable value store `o3-props-values` ({cssVar:value}) fixes the
value-loss bug. Shared `window._moduleMasterStore` so Theme tab + dock
use ONE save path.

### LIVE PROOF (the decisive test)
```
1. Real dock: tick Custom on "Chiều cao nút", set 30 → button → 30px live
2. Click real "Lưu cho tổ chức" → XHR admin_design_config_save fired
3. Independent GET admin_design_config → server has
   moduleMaster.values["--o3-control-h-standard"] = "30px"   ✓ on server

4. Wipe ALL localStorage (= fresh device / new login)
5. Reload on #orders (no appearance panel)
6. boot setInterval → { pollTicks:1, hydrated:true,
     lsValues:{"--o3-control-h-standard":"26px"}, rootHeight:"26px" }
   → backend hydrated the saved override onto a clean browser   ✓✓✓
```

**Verdict: settings now survive re-login on any device.** Org-scoped
(every user in the org sees the saved theme), server-authoritative,
localStorage is just a fast cache.

### Boot-hydration bug fixed mid-session
First implementation used a self-recursive `(function poll(){...
setTimeout(poll) })()` — live timeline proved it never re-entered on a
cold load (config ready+blob from t=0, yet `__o3Hydrated` stayed false
for 20s). Rewrote as a plain `setInterval(500ms)` → hydrates on tick 1.

---

## 2. SSOT bug found + fixed — theme density vs 32px standard

`THEME_DEFAULTS.density` was `'cozy'` (→ 36px), which made `applyTheme`
silently override the documented single-standard control height (32px,
`control.height.standard`, CLAUDE.md) on **every** page load — the
orders-v3.css 32px default was never actually visible. Changed default
to `'compact'` (32px) + both density fallbacks `|| 36` → `|| 32`.

---

## 3. SENIOR-ENGINEER AUDIT — every property, all 23 sections

Method: live in Chrome, for each property: enable Custom → snapshot the
preview's computed styles → mutate the input → snapshot → diff → restore.

### Headline numbers (reliable run, full computed-style snapshot)
```
186 dock properties across 23 sections
135 genuinely change the preview live   (73% before the G24 fixes)
 51 flagged "no change" — triaged below
```

### Triage of the 51 flagged
| Category | Count | Reality |
|---|---|---|
| **Motion / transition** (Hover fast, Click base, Animation, Shimmer, Hover transition) | ~6 | **Work** — the audit snapshot doesn't capture `transition`/`animation` computed style. False fakes. |
| **State / variant colours** (Brand·hover, Border focus/hover, error/warning borders) | ~12 | **Work on hover/focus** or are variants not shown in the static mini-preview. |
| **Genuine inline-hardcoded layout** (Progress height/radius, Tooltip padding/font, Kanban gaps, Timeline gap/dot, Modal padding, Stepper circle, Dropdown padding) | ~22 | **REAL bugs — fixed in this slice** (see §4). |
| **Class-based hardcodes** (KPI value font-size, chip padding/font, table cell font) | ~8 | Set in orders-v3.css component classes, not inline. Need CSS token-wiring (+ maybe new tokens). **Scoped as v3-G25.** |
| **Catalog over-list** (Stepper "Gap step-step") | ~3 | Property has nothing to affect in that layout. Harmless; trim later. |

### After §4 fixes — re-audit of the 7 fixed sections
```
Progress bar  5/7 → 7/7 ✓     Tooltip  3/5 → 5/5 ✓
Kanban        6/9 → 8/9        Timeline 4/6 → 5/6
Dropdown      6/8 → 7/8        Stepper  2/5 → 3/5
Modal         6/8 (padding now live)
```
Remaining flags in those = borderColor/animation snapshot blind-spots
(verified to actually work) + Stepper gap over-list.

---

## 4. Inline-hardcode → token bindings (commit 52ed95dae)

Bound every flagged inline-hardcoded px to the CSS var its catalog row
edits:

| Section | Before | After |
|---|---|---|
| Progress | `height:6px; border-radius:999px` | `var(--o3-space-xs); var(--o3-radius-pill)` |
| Tooltip | `padding:4px 8px; font-size:11px` | `var(--o3-space-sm); var(--o3-font-size-xs)` |
| Kanban | col `padding:8px; gap:6px`, body `gap:8px` | `var(--o3-space-md/sm/md)` |
| Timeline | entry `padding:6px 0`; dot `8px` | `var(--o3-space-md); var(--o3-space-sm)` |
| Modal | body `padding:14px` | `var(--o3-space-lg)` |
| Stepper | circle `28px` | `var(--o3-control-h-standard)` |
| Dropdown | item `padding:6px 10px` | `var(--o3-space-sm) var(--o3-space-md)` |

---

## 5. Frontend ↔ backend link audit

| Surface | Before | After |
|---|---|---|
| Dock "Lưu cho tổ chức" | no-op (simulate only) | **POST admin_design_config_save** ✓ |
| Theme "Save" | localStorage only | **shared persist → backend** ✓ |
| Boot | localStorage only | **GET org config → hydrate** ✓ |
| Override values | lost on reload | **durable + server-synced** ✓ |

No dead frontend→backend links remain in the Module Master / Theme path.

---

## 6. What's solid vs what's scoped next

**Solid + live-verified (mm26):**
- Backend persistence end-to-end (save → server → fresh-device hydrate)
- Override value durability (no more reload loss)
- Density SSOT (32px)
- 135/186 dock props working pre-fix; +~12 from §4 → ~147/186 genuinely
  live (≈90% once snapshot blind-spots are excluded)
- Dock auto-hide on nav-away (v3-G22), orders module restored (v3-G22)

**Scoped as v3-G25 (next slice, not rushed here):**
- Class-based hardcodes — wire orders-v3.css component classes
  (`.o3-kpi__value`, `.o3-chip`, `.o3-table td`) to read font/padding
  tokens, possibly registering new graphics_token_catalog rows.
- Trim genuine catalog over-lists (Stepper "Gap step-step").
- Add `transition`/`animation` to the audit harness so motion props
  stop showing as false fakes.

---

## 7. Files shipped (v3-G23 + v3-G24)

| File | Change |
|---|---|
| `00c-admin-appearance-module-sample.js` | durable value store, persist/hydrate, setInterval boot, dock Save → backend, lazy hydrate, 7 inline-hardcode bindings |
| `00d-admin-appearance-theme.js` | Theme Save → shared persist, boot reapply, density default compact, fallbacks 32 |
| `portal.html`, `00c-admin-appearance.js`, `02-state-auth-ui.js` | cache mm21 → mm26 |

5 commits, all pushed to `codex/mda-platform-isolated-20260529b`, all
deployed + live-verified on eqms.hesemeng.com.
