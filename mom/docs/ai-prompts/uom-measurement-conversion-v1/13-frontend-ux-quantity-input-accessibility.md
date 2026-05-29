# P13 — Frontend UX, Quantity Input, Control Center, and Accessibility

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P12)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

UoM Control Center UI architecture specified. Quantity Input Widget contract defined. Alias review queue UI designed. Accessibility gates (WCAG 2.2) applied. Graphics Authority integration required for all visual tokens. Vietnamese UI labels with full diacritics specified. Fixture-first UI rendering mode defined.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. UI Surface Inventory

| Surface | Type | Route | Access role |
|---------|------|-------|-------------|
| UoM Control Center | Workspace (read-only Phase 1) | /portal#uom | UOM_STEWARD, ADMIN |
| Unit Catalog AR | Authoritative Record Shell | /portal#uom/units/{code} | UOM_STEWARD |
| Conversion Rule AR | Authoritative Record Shell | /portal#uom/rules/{code} | UOM_STEWARD, QUALITY_ENGINEER |
| Alias Review Queue | Workspace | /portal#uom/alias-queue | UOM_STEWARD |
| Impact Analysis Panel | Drawer (embedded in Rule AR) | — | UOM_STEWARD |
| Quantity Input Widget | Embedded component | In any form | Form user |
| Conversion Preview | Modal (embedded) | — | Any user |

---

## 3. Quantity Input Widget Contract

The `QuantityInputWidget` is the single component used across all HESEM forms for entering measured quantities. It replaces bare `<input type="number">` fields.

### HTML structure

```html
<div class="quantity-input-widget" 
     data-quantity-kind="ThermodynamicTemperature"
     data-allowed-units="Cel,[degF],K"
     data-default-unit="Cel"
     data-precision-scale="1"
     data-rounding-policy="ROUND_HALF_EVEN"
     role="group"
     aria-labelledby="qty-label-{id}">
  
  <label id="qty-label-{id}" class="quantity-label">
    Nhiệt độ <span class="unit-badge" aria-label="đơn vị đo">°C</span>
  </label>
  
  <div class="quantity-input-group">
    <input type="text" 
           class="quantity-magnitude-input"
           inputmode="decimal"
           pattern="^-?[0-9]+(\.[0-9]+)?$"
           aria-label="Giá trị"
           aria-describedby="qty-unit-{id} qty-warning-{id}"
           autocomplete="off" />
    
    <select class="quantity-unit-select" 
            aria-label="Đơn vị đo"
            id="qty-unit-{id}">
      <option value="Cel" selected>°C (độ C)</option>
      <option value="[degF]">°F (độ F)</option>
      <option value="K">K (kelvin)</option>
    </select>
  </div>
  
  <div class="quantity-conversion-preview" aria-live="polite">
    <!-- Real-time preview: "= 37.0 °C" when user types in °F -->
  </div>
  
  <div class="quantity-warning" role="alert" id="qty-warning-{id}">
    <!-- Validation errors, unit mismatch warnings -->
  </div>
  
  <input type="hidden" class="quantity-measval-json" name="{field_name}_measval" />
  <!-- Serialized MeasurementValue JSON submitted with form -->
</div>
```

### JavaScript behavior

```javascript
QuantityInputWidget.init({
  container: '#qty-{id}',
  quantityKindCode: 'ThermodynamicTemperature',
  allowedUnits: ['Cel', '[degF]', 'K'],
  defaultUnit: 'Cel',
  precisionScale: 1,
  roundingPolicy: 'ROUND_HALF_EVEN',
  fixtureMode: window.UOM_FIXTURE_MODE,  // from server config
  
  onValueChange: (measval) => {
    // Update hidden input with MeasurementValue JSON
    // Trigger real-time conversion preview via /api/v1/uom/convert
    // Validate against spec limits if provided
  },
  
  onUnitChange: (newUnit, oldUnit) => {
    // If value entered in oldUnit, convert to newUnit for display
    // Update conversion preview
  },
  
  onError: (problemDetail) => {
    // Display RFC 9457 error in quantity-warning div
    // If cross-kind error: show educational message in Vietnamese
  }
});
```

### Accessibility requirements (WCAG 2.2)

- All labels use `<label>` with `for` or `aria-labelledby`
- Unit selector: keyboard navigable; `aria-label` in Vietnamese
- Error messages: `role="alert"` with `aria-live="polite"`
- Conversion preview: `aria-live="polite"` (not assertive — not urgent)
- Color is NOT the only indicator of error state (border + icon + text)
- Input accepts decimal point (`.`) and comma (`,`) — normalize to `.` before processing
- Scientific notation display: `1.00×10⁻⁷` — uses `<sup>` with `aria-label="10 mũ âm 7"`

---

## 4. UoM Control Center Workspace

### Information architecture

```
UoM Control Center [/portal#uom]
├── Summary tiles: total active units, pending aliases, recent rule changes
├── Tab: Đơn vị đo (Units)
│   ├── Filter: by quantity_kind, lifecycle_status, source_tag
│   ├── List: canonical_code | display_symbol | display_name_vi | quantity_kind | status
│   └── Row click → Unit AR drawer
├── Tab: Loại đại lượng (Quantity Kinds)
│   ├── Hierarchy tree: SI base → derived → HESEM custom
│   └── Row click → Kind detail drawer
├── Tab: Quy tắc chuyển đổi (Conversion Rules)
│   ├── Filter: category, lifecycle_status, risk_level
│   ├── List: rule_code | from → to | category | status | approved_by
│   └── Row click → Rule AR drawer
└── Tab: Hàng chờ bí danh (Alias Queue)
    ├── Badge: count of pending_review items
    ├── List: alias_string | source_system | candidates | ai_confidence | status
    └── Row click → Review modal
```

### Graphics Authority integration (mandatory)

All visual tokens must be fetched from `window.GraphicsAuthority.tokens.read()`:
- `--uom-status-active-color` → token: `uom_status_active`
- `--uom-status-draft-color` → token: `uom_status_draft`
- `--uom-risk-regulated-badge-bg` → token: `uom_risk_regulated`
- `--uom-alias-pending-indicator` → token: `uom_alias_pending`

These tokens must be added to `graphics_token_catalog` table via migration before being used in JS. No hardcoded hex colors in any UoM JS file.

---

## 5. Alias Review Queue UI

```
Pending alias: 'M' from VENDOR_EDI
├── Aliases matches: 
│   ├── m (Length, meter) — UCUM — confidence AI: 0.45
│   ├── mol/L (Molarity) — UCUM — confidence AI: 0.35  
│   └── {million} (dimensionless 1e6) — UCUM — confidence AI: 0.20
├── Context hint: "Transaction type: procurement, material: Steel Rod"
├── AI note: "Xem xét loại đại lượng từ ngữ cảnh giao dịch: khối lượng → 'kg'? Đây là trường hợp không chắc chắn, cần xem xét thủ công."
├── Human action:
│   ├── [Chấp nhận: m (mét)] → creates alias 'M'→'m', source_system=VENDOR_EDI
│   ├── [Chấp nhận: mol/L] → creates alias 'M'→'mol/L' with context_scope=LAB
│   ├── [Từ chối] → quarantine.status = 'rejected', reason required
│   └── [Thêm thông tin] → add note, escalate to expert
└── After action: audit_event(UOM_ALIAS_APPROVED or UOM_ALIAS_REJECTED)
```

---

## 6. Vietnamese UI Label Requirements

All UI text must use Vietnamese with full diacritics:

| Concept | Vietnamese label |
|---------|----------------|
| Unit of Measure | Đơn vị đo lường |
| Quantity Kind | Loại đại lượng |
| Conversion Rule | Quy tắc chuyển đổi |
| Alias Queue | Hàng chờ bí danh |
| Approve | Phê duyệt |
| Reject | Từ chối |
| Active | Đang hoạt động |
| Draft | Bản nháp |
| Deprecated | Đã lỗi thời |
| Retired | Đã ngưng sử dụng |
| Pending review | Đang chờ xét duyệt |
| Regulated | Có kiểm soát |
| Cross-kind blocked | Bị chặn do khác loại đại lượng |

---

## 7. Audit Scorecard — P13

| Dimension | Score | Evidence |
|-----------|-------|---------|
| WCAG 2.2 compliance | 9/10 | aria-label, aria-live, role=alert, color not sole indicator, keyboard nav |
| Graphics Authority | 10/10 | No hardcoded hex; all tokens via GraphicsAuthority.tokens.read() |
| Vietnamese diacritics | 10/10 | All UI labels specified with full diacritics |
| No hidden mutation | 10/10 | Widget emits value object only; mutation routes through form submit → command |
| Fixture mode | 10/10 | window.UOM_FIXTURE_MODE controls live vs fixture data |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
