# Parallel Research: Graphics Authority Compliance Audit

**Generated**: 2026-04-25 (parallel research, no GPT Pro input)
**Purpose**: Verify HMV4 surfaces comply with `CLAUDE.md` Graphics Authority no-hardcode rule.

## Executive Verdict

**FAIL_BLOCK_NEXT**

Total violations: **19**, all in `mom/styles/module-template-v4.css`.
JavaScript files (70–73) and HTML template are **clean**.

> Per CLAUDE.md: "Hex colors in JS, '16px' string padding, inline font-family
> strings, and hardcoded motion durations in diff review will be rejected."

This is **not** a V18 NC slice issue — V18 only added JS in 72/73, which are
clean. The violations are in the **baseline CSS** that was added in Slice 1.

## Per-File Violations

### `mom/styles/module-template-v4.css` — 19 violations

| Line | Pattern | Code | Severity | Suggested fix |
|---:|---|---|---|---|
| 16 | `#fff` color | `color: #fff;` (`.hmv4-skip-link`) | Critical | `--hmv4-text-on-brand` |
| 37 | `#fff` color | `color: #fff;` (`.hmv4-top-shell-header`) | Critical | `--hmv4-text-on-brand` |
| 38 | `#fff` in color-mix | `color-mix(in srgb, var(--hmv4-brand), #fff 18%)` | Critical | `--hmv4-brand-tint-light` |
| 42 | rgba opacity | `background: rgba(255,255,255,.16)` | Medium | `--hmv4-overlay-white-light` |
| 44a | px padding | `padding: 8px 12px` | High | `--hmv4-space-2 --hmv4-space-3` |
| 44b | px width | `min-width: min(40vw, 420px)` | High | `--hmv4-search-max-width` |
| 44c | px radius | `border-radius: 999px` | High | `--hmv4-radius-pill` |
| 44d | rgba border | `border: 1px solid rgba(255,255,255,.25)` | Medium | `--hmv4-border-light-subtle` |
| 44e | rgba bg | `background: rgba(255,255,255,.12)` | Medium | `--hmv4-bg-white-subtle` |
| 44f | `#fff` color | `color: #fff` | Critical | `--hmv4-text-on-brand` |
| 45 | rgba placeholder | `color: rgba(255,255,255,.76)` | Medium | `--hmv4-text-placeholder-on-brand` |
| 55 | px font-size | `font-size: 12px` | High | `--hmv4-font-size-label` |
| 56 | px padding | `padding: 8px 10px` | High | `--hmv4-space-2 --hmv4-space-2-5` |
| 61 | px gap | `gap: 6px` | High | `--hmv4-space-1-5` |
| 62 | px margin | `margin-right: 6px` | High | `--hmv4-space-1-5` |
| 70 | px margin | `margin: 6px 0 0` | High | `--hmv4-space-1-5` |
| 79 | px gap | `gap: 4px` | High | `--hmv4-space-1` |
| 80 | px padding | `padding: 10px 12px` | High | spacing tokens |
| 89 | `#fff` color | `color: #fff` (`.hmv4-button--primary`) | Critical | `--hmv4-text-on-brand` |

## JavaScript & HTML PASS

- `70-module-template-v4-hydration.js` — clean
- `71-module-template-v4-routes.js` — clean
- `72-module-template-v4-bridge.js` — clean (V18 modifications)
- `73-module-template-v4-renderers.js` — clean (V18 NC renderer)
- `module-template-v4.html` — no inline visual literals

## Token Coverage Gap

5+ new tokens need to be added to `graphics_token_catalog`:

1. `--hmv4-text-on-brand` (white text on branded surface)
2. `--hmv4-radius-pill` (999px style)
3. `--hmv4-search-max-width` (420px)
4. `--hmv4-space-1-5` (6px — gap between space-1 and space-2)
5. `--hmv4-font-size-label` (12px)
6. 4 white-overlay opacity tokens (`--hmv4-overlay-white-light`, etc.)

## Remediation Plan

### Phase 1 — Token authoring (governance)
- Add 9 tokens to `graphics_token_catalog` via migration `149_hmv4_baseline_tokens.sql`
- Or via admin UI Graphics Authority panel
- Update `graphics_component_contract.overridable_tokens` for HMV4

### Phase 2 — CSS refactor (additive, low risk)
- Replace 19 hardcoded values in `mom/styles/module-template-v4.css`
- Re-grep with same patterns — expect 0 violations

### Phase 3 — Re-audit
- Run grep patterns again
- Confirm V18 + Slice 1 surfaces fully compliant
- Document in S20 audit report

## Impact on Slice 3+

Per CLAUDE.md, Graphics Authority violations are a release blocker. Since
this project is non-production, this is a **deferrable** but **must-fix**
item. Recommendation:

- Slice 3 (Training Matrix) MUST add `--hmv4-*` tokens for any new visual
  surface and avoid hardcoded values.
- A dedicated remediation slice (Slice "0.5") for the 19 baseline CSS
  violations should land before Slice 5 to keep the baseline clean.

## Severity Categorization

- **Critical (5)**: Hardcoded color in production-ready CSS — must fix
  before formal release
- **High (10)**: px values for layout/spacing — must fix to honor spacing
  scale
- **Medium (4)**: rgba opacity literals — should fix; tokens needed for
  consistency

## Decision

```
GRAPHICS_AUTHORITY_AUDIT_FAIL_NEEDS_REMEDIATION
```

The V18 NC code itself is compliant. The baseline CSS has pre-existing
violations from Slice 1 (or earlier) that should be fixed before Slice 3
release if Graphics Authority enforcement is to be maintained.
