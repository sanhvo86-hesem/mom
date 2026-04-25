# ADR 0009: Graphics Authority no-hardcode rule

## Status

Accepted (2026-04-25)

## Context

The HESEM Operations Platform has a centralized **Graphics Authority**
governing all visual tokens (colors, font stacks, font sizes, spacing,
radius, shadows, motion durations). Authority sources:

- Backend: `graphics_token_catalog` + `graphics_token_value` PostgreSQL
  tables (migration `148_graphics_authority_tables.sql`)
- Legacy file: `mom/data/config/design-system-config.json`
- Frontend: `window.GraphicsAuthority.tokens.read('<token_key>')`
- For CSS: declared `css_variable` (e.g., `--brand-primary`)

CLAUDE.md mandates: "Never hardcode colors, font stacks, font sizes,
spacing, radius, shadows, motion durations, or any other visual token
in JS, inline style, or HTML."

Without enforcement:
- Visual drift (different shades of brand color across modules)
- Theme switches break (dark mode, density variants)
- Refactoring tokens requires per-file find-and-replace
- Brand changes require code change instead of token change

## Decision

**No hardcoded visual literals** in JS, inline HTML style, or template
files. All visual values must reference Graphics Authority tokens
(either via `var(--token-name)` in CSS or `GraphicsAuthority.tokens.read()`
in JS).

### Allowed locations for raw literals

Only these file types may contain raw hex/px/font literals:

- **Token files** (e.g., `mom/styles/module-template-v4.tokens.css`)
  — these define tokens; literals are the source of truth
- **Migration SQL** (e.g., `148_graphics_authority_tables.sql`) —
  database seed values
- **JSON design-system config** (e.g., `design-system-config.json`)
  — token registry
- **Comments and documentation** — illustrative

### Forbidden patterns in component files

| Pattern | Example | Where forbidden |
|---|---|---|
| Hex color | `#fff`, `#0c2d48` | All component CSS, all JS string concatenation, all inline HTML style |
| RGB/RGBA | `rgba(255,255,255,.5)` | Same |
| Inline px | `padding: 8px 12px` | Component CSS, inline HTML style, JS string |
| Inline rem/em | `font-size: 1rem` | Component CSS (acceptable in tokens file) |
| Font-family string | `font-family: "Roboto"` | Component CSS, inline HTML style, JS string |
| Motion duration | `transition: 250ms` | Same |

### Enforcement mechanisms

1. **Slice prompt safety check** — Every slice prompt includes
   `grep -nE '#[0-9a-fA-F]{6}\b' mom/scripts/portal/7?-module-template-v4-*.js`
   that fails if matches found.

2. **CI workflow** (when active) — Same grep guard as a CI step.

3. **PR review** — Visible literal in component code is a review block.

### Adding new tokens

1. Add row to `graphics_token_catalog` (via migration or admin UI)
2. Reference `css_variable` in component CSS or
   `GraphicsAuthority.tokens.read()` in JS
3. Document in `_reports/` and ADR if new token represents a design
   decision

## Consequences

### Positive
- Visual consistency across modules
- Theme switches work (dark mode, density)
- Brand changes via token, not code
- Easier to audit (single source of truth)

### Negative
- Per-token authoring overhead
- New violations possible in every slice; vigilance required
- Token names can proliferate; governance pressure

### Neutral
- Existing baseline `module-template-v4.css` had 19 violations as of
  2026-04-25; remediated via Slice 0.5 cleanup (see UPGRADE_PROMPT_PACK_2)

## Alternatives Considered

### Alternative 1: No enforcement
Trust developers. Rejected: drift inevitable; CLAUDE.md lesson learned.

### Alternative 2: Per-component theming
Each component owns its tokens. Rejected: design fragmentation; theme
switches harder.

### Alternative 3: Strict OnlyTokens — no fallback hex
Forbid even fallback `var(--x, #fff)` syntax. Rejected: token files
need fallback for graceful degradation.

## References

- `CLAUDE.md` "MANDATORY: Graphics Authority Link"
- `mom/data/config/design-system-config.json`
- `mom/api/migrations/148_graphics_authority_tables.sql`
- `mom/scripts/portal/00bb-graphics-authority.js`
- `_reports/module-template-v4/PARALLEL_RESEARCH_GRAPHICS_AUTHORITY_AUDIT.md`
- `_reports/module-template-v4/UPGRADE_PROMPT_PACK_2_PRESLICE_CLEANUP.md` B1

## History

- 2026-04-25: Proposed and Accepted (codifying existing CLAUDE.md rule)
- 2026-04-25: Slice 0.5 baseline CSS remediation completes (19 violations fixed)
