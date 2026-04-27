# 19 — UX, Accessibility, Design System and Graphics Authority
## UX principle

The UI must teach authority. Users should immediately know whether they are in a workspace projection, authoritative record shell, collection, or shell landing. Visual beauty is subordinate to authority clarity, accessibility and safe action.

## Screen classes

| Class | Meaning | Mutation rule |
| --- | --- | --- |
| SH | Shell home | no root mutation |
| DL | Domain landing | no root mutation |
| ML | Module landing | no root mutation |
| WS | Workspace projection | no hidden mutation; re-anchor required |
| AR | Authoritative record shell | commands possible only through command bus |
| AC | Authoritative collection | bulk commands only if explicitly governed |

## Graphics Authority gate

- No hardcoded visual tokens in JS/HTML/inline style.
- All colors, spacing, type, radii, shadows and motion resolved by Graphics Authority or CSS variables.
- Every admin edit runs preview/simulation before commit.
- Diff review rejects raw hex, pixel literals and direct style mutation outside approved token path.

## WCAG 2.2 gate

- Keyboard navigation.
- Focus visible.
- Semantics for tabs, buttons, disabled states and alerts.
- Contrast and spacing.
- Error messages programmatically associated.
- No state hidden only in color.
- E2E accessibility assertions included in slice QA.
