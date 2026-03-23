# Training Deep Pass - 2026-03-24

## Scope

- `10-Training-Academy`
- Script used: `tools/translate_batch1_system_docs_20260324.mjs`

## What was done

- Performed a deep refinement pass focused on visible mixed-language training and operations terminology.
- Applied multiple controlled reruns on text nodes only; `script`, `style`, and HTML comments remained protected.
- Used first-mention `Vietnamese (English)` only for terms still not broadly natural in Vietnamese web usage, such as `job shop`, `KPI gating`, `Right First Time`, `program release`, `dispatch packet`, `scorecard`, `coaching`, `mentoring`, `interlock`, `shadow board`, and `first article`.

## Net effect in this deep pass sequence

- Additional controlled replacements during the deep-pass reruns in this round: `8,347`
- High-impact groups normalized:
  - training labels: `Quiz`, `Assessment`, `Case`, `Key Points`, `Reasons`
  - operating phrases: `handoff`, `input/output`, `feedback`, `quote`, `dispatch plan`
  - learning-content terminology: `coaching`, `near-miss`, `mix-up`, `Hierarchy of Controls`, `Stop Work`, `Visual Management`
  - drill vocabulary: `Drill Pack`, `run drill`, `drill index`, title suffix `... Drill`, and generic remaining `drill`

## Visible-text spot audit after the deep pass

Audit method:
- strip `script/style/comments`
- strip HTML tags
- count only text visible to readers

Selected remaining visible English counts:
- `drill`: `8` hits across `6` files
- `module`: `12` hits across `4` files
- `role`: `11` hits across `10` files
- `flow`: `27` hits across `4` files
- `quote`: `4` hits across `4` files

Controlled first-mention English that still appears intentionally:
- `Job Shop`: `50` hits across `50` files
- `KPI gating`: `66` hits across `66` files
- `Right First Time`: `40` hits across `40` files

## Current quality status

- `10-Training-Academy` is now much closer to a real Vietnamese training corpus instead of a mixed Anh-Viet draft.
- The largest noisy cluster (`drill`) has been reduced sharply and is now limited to a small residual set.
- Remaining work is no longer broad-brush translation; it is mostly micro-cleanup of:
  - a few training labels and technical phrases
  - residual controlled English kept intentionally on first mention
  - a small number of naturalness tweaks in highly specialized pages
