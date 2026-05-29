# P13 — Frontend UX Specification (Control Center + Component Contract)

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P13 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the visual + interaction contract for the UoM Control Center admin surface and the QuantityInputWidget so every visual parameter resolves through the HESEM Graphics Authority and every interaction follows portal-wide conventions.

## 2. Component contract

### Layout

| Element | Token | Value |
|---|---|---|
| Control height (all interactive controls) | `control.height.standard` | 32px (`--o3-control-h-standard`) |
| Master gap (everywhere) | `space.master` | 8px (`--o3-space` / `--master-gap`) |
| Section gap (between panels) | `space.section` | 12px (`--o3-space-section` / `--section-gap`) |
| Master radius (controls) | `radius.master` | 4px (`--o3-radius`) |
| Card radius (containers) | `radius.card` | 8px (`--o3-radius-card`) |
| Pill radius (chips, badges) | `radius.pill` | 999px |
| Focus ring | `focus.ring` | 2px outline + brand colour |

### Typography

| Slot | Token |
|---|---|
| Sans body | `font.family.sans` |
| Mono numeric | `font.family.mono` |
| Title | `font.size.lg` |
| Body | `font.size.md` |
| Caption | `font.size.sm` |

### Colour

| Slot | Token |
|---|---|
| Brand primary | `brand-primary` |
| Border subtle | `border-subtle` |
| Text muted | `text-muted` |
| Error border | `border-error` |
| Error text | `text-error` |

### State-by-state

| State | Visible cue |
|---|---|
| Default | no extra outline; background per surface token |
| Hover (interactive) | background-elevated token |
| Focus | focus-ring outline |
| Disabled | opacity-disabled token + cursor:not-allowed |
| Loading | spinner-token; preserves space |
| Error | error border + inline error message |

## 3. Vietnamese-first labels

Every label is Vietnamese with full diacritics, English is the accessible name for screen reader / programmatic key.

Sample (Control Center):

| Tab | Label (vi) | Label (en) |
|---|---|---|
| Catalog | Bảng đơn vị | Unit Catalog |
| Kind | Loại đại lượng | Quantity Kind |
| Rule | Quy tắc chuyển đổi | Conversion Rule |
| Alias | Tên gọi & Bí danh | Name & Alias |
| External code | Mã ngoài | External Code |

Sample (form widget):

| Element | Label (vi) | Label (en) |
|---|---|---|
| Magnitude | Giá trị | Magnitude |
| Unit | Đơn vị | Unit |
| Preview | Kết quả xem trước | Preview Result |
| Convert button | Chuyển đổi | Convert |

## 4. Accessibility commitments

| WCAG axis | Implementation |
|---|---|
| Keyboard only | full tab traversal; Enter activates; Esc closes drawers |
| Focus visible | focus-ring on every element |
| Screen reader labels | `aria-label` on icon-only; `aria-describedby` for error |
| Contrast ratio | tokens deliver ≥ 4.5:1 text, ≥ 3:1 borders |
| Reduced motion | transitions check `prefers-reduced-motion`; disable opacity-transition |
| Touch target | 32px height + 8px padding → ≥ 44 × 44 effective |
| RTL | not required for vi locale; layout uses logical properties just in case |
| Dark mode | inherits portal dark theme via tokens |

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| UD-001 | Vietnamese-first labels with full diacritics | feedback_vietnamese_diacritics |
| UD-002 | No hex / px / font-family literals in JS — every value via GraphicsAuthority | CLAUDE.md graphics SSOT |
| UD-003 | Module Sample is the canonical SSOT for component visuals | CLAUDE.md graphics SSOT |
| UD-004 | Single 32px control-height — no sm/md/lg variants | CLAUDE.md control-height rule |
| UD-005 | One-knob master density — `space.master` controls 99% of gaps | CLAUDE.md master density rule |
| UD-006 | No Admin-only graphics tokens | CLAUDE.md no-Admin-graphics rule |
| UD-007 | Scrollbar = portal default | CLAUDE.md scrollbar rule |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | UG-001 | Module Sample doesn't yet render QuantityInputWidget | UI gardener add row to `00c-admin-appearance-module-sample.js` |
| medium | UG-002 | Composite-layout visual baselines for Control Center absent | snapshot after VRS-001 |
| low | UG-003 | RTL not exercised | future locale |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Token discipline | 10 |
| Vietnamese-first | 10 |
| A11y commitments | 10 |
| Sample reuse | 8 (UG-001) |
| Visual regression coverage | 5 (UG-002) |
| **Total** | **43 / 50** |

## 8. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/design-system/uom-measurement-conversion-v1/quantity-input-widget-contract.md` (P13 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p13-ux-authority-redteam.md` (P13 / 3)
- Companion: `mom/docs/design-system/uom-measurement-conversion-v1/ui-implementation-handoff.md` (IMPL-04 deliverable)
