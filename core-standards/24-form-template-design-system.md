# 24 - Form Template Design System

**Document Code:** CS-024
**Version:** 1.0
**Effective Date:** 2026-03-29
**Owner:** QMS Portal Development Team
**Classification:** Core Standard -- Mandatory
**Applies To:** All FRM-xxx online forms rendered in the HESEM QMS Portal

---

## 1. Purpose

This standard defines the visual design rules, component specifications, and interaction patterns for all online forms within the HESEM QMS Portal. It ensures a consistent, professional, and accessible user experience across every form type -- from inspection checklists to non-conformity reports to audit findings.

All form implementations must comply with this standard to maintain brand consistency, usability on shop-floor tablets, and print-to-PDF fidelity required for ISO 9001 / AS9100 controlled document compliance.

---

## 2. Scope

- **In scope:** All FRM-xxx online forms, the form builder output engine, form preview/demo pages, and any custom form developed for the QMS Portal.
- **Out of scope:** Excel-based offline forms (governed by CS-006), standalone HTML pages that are not forms, and third-party embedded widgets.
- **Reference implementation:** `FORM-DESIGN-SYSTEM-SPEC.css` in `01-QMS-Portal/styles/`
- **Demo reference:** `01-QMS-Portal/demos/form-ncr-demo.html` (FRM-631 NCR form)

---

## 3. Design Tokens

All visual properties are defined as CSS custom properties (tokens) on `:root`. Implementations must use these tokens -- never hard-coded values.

### 3.1 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--form-brand` | `#0c2d48` | Dark brand, section titles |
| `--form-primary` | `#1565c0` | Interactive elements, focus rings |
| `--form-primary-light` | `#dbeafe` | Selected states, badges |
| `--form-bg` | `#f8fafc` | Page background behind form |
| `--form-surface` | `#ffffff` | Card/section surface |
| `--form-surface-sunken` | `#f1f5f9` | Recessed field groups, read-only |

**Status colors:**

| Status | Token | Value | Usage |
|--------|-------|-------|-------|
| Success | `--form-success` | `#16a34a` | Pass, approved, valid |
| Warning | `--form-warning` | `#d97706` | Pending, attention needed |
| Error | `--form-error` | `#dc2626` | Fail, rejected, required |
| Info | `--form-info` | `#2563eb` | Informational callouts |

Each status color has a `-light` (background tint) and `-border` variant.

### 3.2 Typography Scale

Based on a 4px baseline grid using Major Second ratio (1.125).

| Token | Size | Usage |
|-------|------|-------|
| `--form-text-xs` | 11px | Micro labels, badges, helper text |
| `--form-text-sm` | 12px | Labels, captions, table headers |
| `--form-text-base` | 14px | Body text, input values |
| `--form-text-md` | 15px | Section titles |
| `--form-text-lg` | 18px | Form title |
| `--form-text-xl` | 24px | Page heading |

**Font stack:** Inter, -apple-system, Segoe UI, Noto Sans, Roboto, Arial, sans-serif
**Monospace:** JetBrains Mono, SF Mono, Cascadia Code, Consolas, monospace (for document codes, record IDs, dates)

### 3.3 Spacing Grid

4px base grid. All spacing uses multiples of 4px via `--form-space-{n}` tokens (1=4px through 16=64px).

### 3.4 Elevation Levels

| Level | Token | Usage |
|-------|-------|-------|
| 0 | none | Flat elements |
| 1 | `--form-shadow-xs` | Inputs at rest |
| 2 | `--form-shadow-sm` | Section cards |
| 3 | `--form-shadow-md` | Hover states, elevated cards |
| 4 | `--form-shadow-lg` | Form header, modals |
| Focus | `--form-shadow-focus` | 3px primary-color ring |

---

## 4. Form Structure

Every form follows this top-level structure:

```
Form Header Card
  Status/Progress Bar
Section 1 (card)
  Section Header (numbered badge + bilingual title)
  Section Body (field grid)
Section 2 (card)
  ...
Section N: Signatures (card)
  Signature Grid (3-column)
Action Bar (sticky bottom)
  [Secondary] [Ghost] ... [Primary]
```

The form container class is `.qf`, max-width 860px, centered.

### 4.1 Runtime Action Bar Rules

For draft-capable eQMS forms, the runtime action bar must follow this order:

`[Ghost] Hủy tạo form` -> `[Secondary] Lưu nháp` -> `[Primary] Gửi biểu mẫu`

Mandatory behavior:

1. `Hủy tạo form` is only available before first official submission.
2. `Hủy tạo form` must require a reason and must not hard-delete the issued record number.
3. `Lưu nháp` stores the working payload without changing the issued number.
4. `Gửi biểu mẫu` is the only action that creates the first official submission revision.
5. If the user attempts to open another link, switch tab, or refresh the portal while the form has unfinished changes, the system must block the transition and present three explicit choices: `Lưu nháp rồi tiếp tục`, `Rời đi không lưu`, `Ở lại để xử lý tiếp`.
6. The unsaved-data warning copy must explicitly instruct the user to save the draft before portal refresh, deployment reload, or any operation that may reload assets or pull updated content from Git.
7. Runtime HTML forms and template HTML editing sessions must both implement the same unsaved-data guard policy; no path may silently drop in-progress changes.

---

## 5. Header Design

The form header is a full-width dark card (brand gradient) containing:

| Zone | Content | Alignment |
|------|---------|-----------|
| Left | Company logo + "HESEM QMS" brand text | Left-aligned |
| Center | Form title in English (large) + Vietnamese subtitle (smaller, muted) | Centered |
| Right | Form code badge (monospace), revision label, record ID (amber highlight) | Right-aligned |

Below the header content, a **status stepper** shows form workflow stages (e.g., Draft -> In Review -> Approved -> Closed) with numbered step indicators. The current step uses a solid blue circle with a glow ring; completed steps use green.

### Header Rules

- Form code must use monospace font in a pill badge
- Record ID uses amber color to stand out as the unique identifier
- Vietnamese title uses reduced opacity for secondary emphasis
- The header prints as-is (colors preserved) for PDF output

---

## 6. Section Design

Each form section is a white card with these characteristics:

| Property | Value |
|----------|-------|
| Background | White (`--form-surface`) |
| Border | 1px solid `--form-border-light` |
| Border radius | 12px (`--form-radius-xl`) |
| Shadow | `--form-shadow-sm` on rest, `--form-shadow-md` on hover |
| Top accent line | 3px colored stripe per section category |
| Spacing | 24px bottom margin between sections |

### Section Header

- **Number badge:** Circular, 28px diameter, colored per section category (blue/red/amber/purple/green)
- **Title:** 15px bold in brand color
- **Subtitle:** Vietnamese translation, 12px gray
- **Collapse toggle:** Chevron icon on the right, rotates 90 degrees when collapsed
- **Keyboard accessible:** Enter/Space toggles collapse state

### Section Accent Colors

| Section Type | Accent Color | Badge Color |
|-------------|-------------|-------------|
| Identification/Info | Blue (`--form-primary`) | Blue background |
| Defect/Error | Red (`--form-error`) | Red background |
| Containment/Warning | Amber (`--form-warning`) | Amber background |
| Root Cause/Analysis | Purple (`#7c3aed`) | Purple background |
| Signatures/Approval | Green (`--form-success`) | Green background |

---

## 7. Field Types and Styling

### 7.1 Text Input

- Height: 40px desktop, 44px tablet
- Padding: 8px 12px (desktop), 8px 16px (tablet)
- Border: 1px solid `--form-border` (#d1d5db)
- Border-radius: 6px
- Focus: Blue border + 3px focus ring
- Font size: 14px desktop, 16px tablet (prevents iOS zoom)

### 7.2 Number Input

Same as text input. Use `min`, `max`, `step` attributes for validation.

### 7.3 Date Input

Same as text input. Always set `type="date"` for native date pickers. Default to today's date where schema specifies `"default": "today"`.

### 7.4 Select Dropdown

Same base styling as text input, plus:
- Custom chevron icon via CSS background-image (SVG data URI)
- `appearance: none` for consistent cross-browser rendering
- Extra right padding (2.5rem) for chevron space

### 7.5 Textarea

- Same border/focus styling as text input
- Height: auto, min-height 80px
- Resize: vertical only
- Rows specified by schema (typically 3-4)

### 7.6 Checkbox and Radio

- 20px square/circle with `accent-color: var(--form-primary)`
- 40px minimum touch target via padding
- Label positioned to the right with 8px gap

### 7.7 Radio Cards (e.g., 6M Categories)

Visual alternative to plain radio buttons for categorical selections:
- 3-column grid (2-column on mobile)
- Each card: centered icon + label + Vietnamese sublabel
- Border: 2px solid light gray at rest
- Selected: Blue border + blue tint background + focus ring
- Keyboard navigable via standard radio group behavior

### 7.8 File Upload (Drag-Drop Zone)

- Dashed border (2px), 8px radius
- Upload icon + instructional text + file constraints hint
- Hover/dragover: Blue dashed border + blue tint background
- Hidden file input triggered programmatically

### 7.9 Signature Block

- Dashed border container with sunken background
- Title label (uppercase, bold, smaller font)
- Signature pad area (64-80px height, white background)
- Name + Role + Date inputs below (compact 32px height, centered text)
- Unsigned state must show the current logged-in account in Vietnamese, for example: `Người đăng nhập hiện tại: ...`
- Primary signing CTA must explicitly indicate the signer source, for example: `Người đăng nhập ký`

### 7.10 Lookup Input

- Standard text input with a search icon positioned at the right
- Icon is non-interactive (purely visual indicator)
- Helper text below explains the lookup behavior
- For `lookup_source: "company_users"`, the control must include a secondary shortcut button: `Dùng người đăng nhập`
- Person-selection fields for issuer/reviewer/approver must use company directory lookup, not free text and not workshop-only `operators`

### 7.11 Form Template Editing Entry Point

- Every eQMS form view must provide a visible `Chỉnh sửa mẫu form` entry point for authorized template editors.
- This action must open the version-controlled form builder inside the `Online Form` workspace, not redirect users to an unrelated module.
- Template editing and record editing are distinct actions:
  - `Chỉnh sửa mẫu form` = edit schema/template
  - `Chỉnh sửa có kiểm soát` = amend an issued record instance

---

## 8. Grid Layouts

### When to Use Each Layout

| Columns | Class | Use When |
|---------|-------|----------|
| 1 | default | Full-width textareas, descriptions, single selects |
| 2 | `.qf-grid--2` | Related short fields (part number + revision, date + shift) |
| 3 | `.qf-grid--3` | Three short fields (date + department + shift, quantities) |
| 2:1 | `.qf-grid--2-1` | Wide field + narrow field |
| Auto | `.qf-grid--auto` | Flexible column count based on content width |

### Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| > 1024px (Desktop) | Full grid columns as specified |
| 769-1024px (Tablet) | 3-column grids collapse to 2-column |
| <= 768px (Mobile) | All grids collapse to single column |

Gap: horizontal 16px, vertical 20px (matching `--form-field-gap`).

---

## 9. Bilingual Labels

All field labels must be bilingual. The design pattern is:

```
LABEL TEXT (English, uppercase, semibold, gray)   *
Vietnamese translation (sentence case, normal weight, lighter gray)
[input element]
```

### Rules

1. **Vietnamese is the primary display language** -- it appears directly above the input
2. **English label** is in uppercase, semibold, `--form-label-color`
3. **Vietnamese sublabel** uses `--form-text-xs`, `--form-text-tertiary`, sentence case
4. Required indicator (`*`) appears on the English label line in red
5. Section titles follow the same pattern: English title (bold) + Vietnamese subtitle (muted)

---

## 10. Color-Coded Fields

### 10.1 Severity Indicators

| Level | Color | Visual |
|-------|-------|--------|
| Minor | Green `#16a34a` | Green dot indicator |
| Major | Amber `#d97706` | Amber dot indicator |
| Critical | Red `#dc2626` | Red dot with glow ring |

A colored dot appears inside the severity select field that updates dynamically on selection change.

### 10.2 Defect Type Colors

| Type | Color Token |
|------|------------|
| Dimensional | Blue `#1565c0` |
| Surface | Amber `#d97706` |
| Material | Purple `#7c3aed` |
| Documentation | Gray `#64748b` |
| Process | Orange `#ea580c` |
| Other | Slate `#475569` |

The select text color changes to match the selected defect type.

### 10.3 Status Badges

Form status uses pill badges with background tint + text color:

| Status | Background | Text |
|--------|-----------|------|
| Draft | `#f3f4f6` | `#374151` |
| In Review | `--form-info-light` | `--form-info` |
| Approved | `--form-success-light` | `--form-success` |
| Rejected | `--form-error-light` | `--form-error` |
| Closed | `--form-surface-sunken` | `--form-text-tertiary` |

### 10.4 Disposition Options

Disposition dropdown options include leading Unicode icons for quick visual scanning.

---

## 11. Data Tables

For forms requiring tabular data entry (measurement tables, inspection rows):

- Wrapped in `.qf-table-wrap` with horizontal scroll for mobile
- Sticky header with sunken background
- Compact cell inputs (32px height, 4px 8px padding)
- Alternating row hover highlight
- Row numbers in a narrow left column
- Pass/Fail column uses green/red bold text (with red background tint for fail)
- "Add Row" button below table in primary-light style

---

## 12. Signature Blocks

### Layout

- 3-column grid on desktop, single column on mobile
- Each block contains: title, signature pad, name input, role input, date input

### Design

| Element | Style |
|---------|-------|
| Container | Dashed border, sunken background, 8px radius |
| Title | Uppercase, bold, 11px, `--form-text-secondary` |
| Signature pad | White background, 1px solid light border, 64-80px height |
| Input fields | Compact (32px), centered text, light border |

### Rules

- Signature blocks must never break across print pages (`break-inside: avoid`)
- All three roles must be present: Reporter, Inspector/Verifier, Approver
- Date fields use native date input type
- If the form schema defines issuer/reviewer/approver person fields, those fields and the signature blocks must stay logically aligned with the current authenticated user model

---

## 13. Action Bar

### Layout

- Fixed to viewport bottom on long forms (`position: fixed; bottom: 0`)
- Full-width white background with top border and upward shadow
- Inner content constrained to max-width 880px, centered

### Button Hierarchy

| Type | Class | Appearance | Usage |
|------|-------|-----------|-------|
| Primary | `.qf-btn--primary` | Solid green/blue, white text, min-width 160px | Submit, Approve |
| Secondary | `.qf-btn--secondary` | White with gray border | Save Draft, Cancel |
| Ghost | `.qf-btn--ghost` | Transparent, gray text | Clear, Reset |
| Danger | `.qf-btn--danger` | White with red border/text | Delete, Reject |

### Arrangement

```
[Secondary: Save Draft] [Ghost: Clear] ... spacer ... [Primary: Submit]
```

Left side: secondary and ghost actions. Right side: primary action (using flex spacer).

### Button Features

- Icon + text layout with 8px gap
- Hover: slight elevation (-1px translateY) and shadow increase
- Focus-visible: 2px solid outline with 2px offset
- All buttons include bilingual text (e.g., "Submit / Gui")

---

## 14. Validation States

### Field-Level States

| State | Border Color | Background | Message |
|-------|-------------|-----------|---------|
| Default | `--form-border` | White | None |
| Focus | `--form-border-focus` | White | None (focus ring) |
| Error | `--form-error` | `--form-error-light` | Red error message with icon |
| Warning | `--form-warning` | `--form-warning-light` | Amber warning message |
| Valid | `--form-success` | White | Optional green checkmark |
| Disabled | `--form-border-light` | `--form-surface-sunken` | Grayed out, `cursor: not-allowed` |

### Error Message Format

- Positioned directly below the input with 4px gap
- Red text, 11px, medium weight
- Includes a circular exclamation icon (SVG data URI) before the text
- Error messages are hidden by default; shown when `.is-error` class is added to `.qf-field`

### Validation Behavior

1. On submit: validate all required fields, add `.is-error` to empty ones
2. Scroll to and focus the first error field
3. If field is inside a collapsed section, expand that section first
4. Clear error state when user begins typing/selecting

---

## 15. Print / PDF Rules

### Page Setup

- Size: A4 portrait
- Margins: 12mm sides, 12-15mm top, 16-20mm bottom

### Print Behavior

| Element | Behavior |
|---------|----------|
| Action bar | Hidden |
| File upload zones | Hidden |
| Section toggles | Hidden; all sections forced open |
| Toolbar buttons | Hidden |
| Shadows | Removed |
| Borders | Simplified to 1px solid #ccc |
| Colors | Preserved via `print-color-adjust: exact` |
| Section cards | `break-inside: avoid` to prevent splitting |
| Signature grid | `break-inside: avoid` |
| Form header | `break-after: avoid` |

### Color Preservation

Use `-webkit-print-color-adjust: exact` and `print-color-adjust: exact` on all elements to ensure background colors and status indicators print correctly.

---

## 16. Accessibility (WCAG 2.1 AA)

### Requirements

| Criterion | Implementation |
|-----------|---------------|
| Color contrast | All text meets 4.5:1 minimum on its background |
| Focus indicators | 3px blue ring on all interactive elements |
| Keyboard navigation | Tab through fields; Enter/Space on section headers |
| Screen reader | Proper `<label>` associations, `aria-expanded` on collapsible sections |
| Form errors | Error messages linked to fields, first error receives focus |
| Touch targets | Minimum 40px desktop, 48px tablet (WCAG 2.5.8) |
| Motion | Animations use `prefers-reduced-motion` where applicable |

### Semantic HTML

- Use `<form>`, `<fieldset>`, `<label>`, `<select>`, `<input>`, `<textarea>` correctly
- Radio groups use `name` attribute for grouping
- Buttons have descriptive text (not just icons)
- File inputs use `.sr-only` class with visual drop zone

---

## 17. Mobile / Tablet Adaptation

### Tablet Overrides (max-width: 1024px)

| Property | Desktop | Tablet |
|----------|---------|--------|
| Input height | 40px | 44px |
| Input padding-x | 12px | 16px |
| Input font-size | 14px | 16px (prevents iOS zoom) |
| Label font-size | 12px | 13px |
| Field gap | 20px | 24px |

### Mobile Rules (max-width: 768px)

- All multi-column grids collapse to single column
- Form header switches to stacked layout (logo -> title -> doc info, all centered)
- Status stepper wraps with reduced gap
- Signature grid becomes single column
- Minimum touch target: 48px

---

## 18. Dark Mode (Optional)

When implementing dark mode, override the following token groups:

| Token Group | Dark Mode Value |
|------------|----------------|
| `--form-bg` | `#0f172a` |
| `--form-surface` | `#1e293b` |
| `--form-surface-sunken` | `#0f172a` |
| `--form-text` | `#e2e8f0` |
| `--form-text-secondary` | `#94a3b8` |
| `--form-border` | `#334155` |
| `--form-border-light` | `#1e293b` |

All status colors remain the same (they already have sufficient contrast on dark backgrounds). Use `@media (prefers-color-scheme: dark)` or a `.dark-mode` class toggle.

---

## 19. Do's and Don'ts

### Do

- Use the design tokens for all colors, spacing, and typography
- Keep labels above inputs (top-aligned)
- Use bilingual labels on every field
- Use section cards with numbered badges for visual hierarchy
- Use color-coded accents to differentiate section types
- Test print output before shipping any new form
- Provide keyboard navigation for all interactive elements
- Use the sticky action bar for forms longer than one viewport

### Don't

- Hard-code color values, font sizes, or spacing
- Place labels inline or to the left of inputs (breaks on mobile)
- Use more than 3 columns in any grid row
- Skip the Vietnamese translation on any label
- Use heavy drop shadows (prefer subtle, tonal elevation)
- Hide required field indicators
- Use custom scrollbars or non-standard form controls
- Allow sections to break across print pages without `break-inside: avoid`
- Use JavaScript frameworks or CDN dependencies in self-contained form demos

---

## 20. Template Catalog

Reusable form section templates are defined in:

- **Schema definitions:** `01-QMS-Portal/qms-data/online-forms/schemas/FRM-xxx.json`
- **CSS specification:** `01-QMS-Portal/styles/FORM-DESIGN-SYSTEM-SPEC.css`
- **Demo implementations:** `01-QMS-Portal/demos/form-*.html`

### Standard Section Types

| Section Type | Description | Example Forms |
|-------------|-------------|--------------|
| Identification | Product/job/customer fields | NCR, SCAR, Inspection |
| Measurement Table | Tabular data entry with pass/fail | First Article, In-Process |
| Defect Description | Defect type, severity, description | NCR, Customer Complaint |
| Containment/Disposition | Immediate actions, disposition decision | NCR, MRB |
| Root Cause (6M) | Radio card selection + description | NCR, CAPA, 8D |
| Corrective/Preventive Action | Action plan textareas | CAPA, NCR, Audit Finding |
| Signature Block | 3-column name/role/date grid | All forms |
| File Attachment | Drag-drop photo/document upload | NCR, Inspection, Audit |
| Checklist | Yes/No/NA checkbox rows | Audit, Process Verification |

---

## 21. Language and Diacritics Rules / Quy tắc ngôn ngữ và dấu

### 21.1 Mandatory Rule: Vietnamese Diacritics on Frontend

**ALL Vietnamese text displayed to users on the frontend MUST use proper Unicode diacritics (UTF-8).**

This is a non-negotiable requirement for professionalism and readability.

| Layer | Language | Diacritics | Example |
|-------|----------|-----------|---------|
| **Frontend HTML** | Vietnamese | ✅ REQUIRED | `Báo cáo không phù hợp` |
| **Frontend JS strings** | Vietnamese | ✅ REQUIRED | `_t('Kiểm soát chứng cứ', 'Evidence Control')` |
| **JSON label_vi fields** | Vietnamese | ✅ REQUIRED | `"label_vi": "Mã tài liệu"` |
| **JSON title_vi fields** | Vietnamese | ✅ REQUIRED | `"title_vi": "Nhật ký bàn giao ca"` |
| **CSS content/comments** | English | ❌ No diacritics | `/* Form builder canvas */` |
| **PHP backend code** | English | ❌ No diacritics | `$formCode = 'FRM-631';` |
| **SQL schema** | English | ❌ No diacritics | `CREATE TABLE ncr_records` |
| **Variable names** | English | ❌ No diacritics | `defect_description` |
| **API responses (keys)** | English | ❌ No diacritics | `{"status": "ok"}` |
| **Git commit messages** | English | ❌ No diacritics | `Fix NCR form validation` |

### 21.2 Correct vs Incorrect Examples

| ❌ WRONG (no diacritics) | ✅ CORRECT (with diacritics) |
|--------------------------|------------------------------|
| `Bao cao khong phu hop` | `Báo cáo không phù hợp` |
| `Thong tin nhan dang` | `Thông tin nhận dạng` |
| `Hanh dong ngan chan` | `Hành động ngăn chặn` |
| `Nguyen nhan goc` | `Nguyên nhân gốc` |
| `Chu ky` | `Chữ ký` |
| `Phong ban` | `Phòng ban` |
| `Kiem soat chung cu` | `Kiểm soát chứng cứ` |
| `Dien online` | `Điền online` |
| `Tai ve` | `Tải về` |
| `Luu nhap` | `Lưu nháp` |

### 21.3 Font Requirements

All frontend fonts MUST support Vietnamese Unicode characters. Approved font stacks:

```css
font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, 'Roboto', sans-serif;
```

Avoid: Monospace fonts without Vietnamese support, custom fonts not tested with dấu.

### 21.4 Encoding

- All HTML files: `<meta charset="UTF-8">`
- All JSON files: UTF-8 encoding (no BOM)
- All JS files: UTF-8 encoding
- PHP: `header('Content-Type: application/json; charset=utf-8')`
- Database: `charset = 'utf8'` in PostgreSQL connection

### 21.5 Bilingual Label Convention

Vietnamese is the PRIMARY language (displayed larger/bolder). English is SECONDARY (smaller, gray).

```html
<label class="qf-label">
  <span class="qf-label-vi">Mô tả khuyết tật</span>
  <span class="qf-label-en">Defect Description</span>
</label>
```

### 21.6 Module Naming Convention

| Module | Sidebar Label (VI) | Sidebar Label (EN) |
|--------|-------------------|-------------------|
| Dashboard | Tổng quan | Dashboard |
| Documents | Danh sách tài liệu | Documents |
| Order Management | Quản lý đơn hàng | Order Management |
| Evidence Control | Kiểm soát chứng cứ | Evidence Control |
| Admin | Quản trị hệ thống | Admin Panel |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-29 | QMS Portal Team | Initial release |
| 1.1 | 2026-03-29 | QMS Portal Team | Add Section 21: Language and Diacritics Rules |
