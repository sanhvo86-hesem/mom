/* ════════════════════════════════════════════════════════════════════════════
 * L3 Block Registry — runtime SSOT (Lego-SSOT)
 *
 * Authored as a web-served JS module (NOT data/config/*.json, which nginx 403s
 * because it holds runtime secrets). Assigns window.__HM_BLOCK_REGISTRY__ so
 * BlockKit (00bd) reads it synchronously — no fetch, no 403, no async race.
 *
 * This is the SINGLE authored runtime source. The CI gate
 * (check_graphics_block_registry.php) parses THIS file; migration 261
 * (graphics_block_contract) is the governance/audit mirror for the
 * multi-tenant SaaS direction.
 *
 * A block is a reusable cluster of L2 components (orders-v3 .o3-* classes) with
 * named data "slots". Building a module = assembling published blocks + filling
 * slots, never hand-writing component HTML. A block ships only when
 * status='published' AND every composed_of class exists AND it has a BlockKit
 * renderer (all enforced by the gate). Load BEFORE 00bd-blockkit.js.
 * ════════════════════════════════════════════════════════════════════════════ */
window.__HM_BLOCK_REGISTRY__ = {
  "$schema_version": "1.0.0",
  "authority": {
    "runtime_ssot": "mom/scripts/portal/00bc-block-registry.js",
    "governance_mirror": "graphics_block_contract (migration 261)",
    "renderer": "window.BlockKit.render (mom/scripts/portal/00bd-blockkit.js)",
    "css_layer": "mom/styles/orders-v3.css",
    "gate": "mom/tools/release/check_graphics_block_registry.php"
  },
  "blocks": [
    {
      "block_key": "toolbar.filtered",
      "display_name_en": "Filtered toolbar",
      "display_name_vi": "Thanh công cụ có lọc",
      "category": "layout",
      "status": "published",
      "composed_of": ["o3-toolbar", "o3-chip", "o3-btn"],
      "root_class": "o3-toolbar",
      "slots": {
        "filters": { "type": "chip[]", "required": false, "desc": "Filter chips (label + active state)" },
        "search": { "type": "bool|placeholder", "required": false, "desc": "Search input on the right" },
        "actions": { "type": "button[]", "required": false, "desc": "Action buttons (label + variant)" },
        "title": { "type": "string", "required": false, "desc": "Optional leading label" }
      },
      "variant_axes": { "density": ["standard"] },
      "required_tokens": ["control.height.standard", "spacing.md", "spacing.lg", "radius.card"],
      "a11y_contract": { "role": "toolbar", "keyboard": "chips and buttons are tab-focusable; search is a labelled input" }
    },
    {
      "block_key": "panel.standard",
      "display_name_en": "Standard panel",
      "display_name_vi": "Panel chuẩn",
      "category": "layout",
      "status": "published",
      "composed_of": ["o3-panel", "o3-btn"],
      "root_class": "o3-panel",
      "slots": {
        "title": { "type": "string", "required": true, "desc": "Panel header title" },
        "count": { "type": "string", "required": false, "desc": "Optional count badge in the head" },
        "actions": { "type": "button[]", "required": false, "desc": "Header action buttons" },
        "body": { "type": "html", "required": true, "desc": "Panel body content (often another block)" },
        "flush": { "type": "bool", "required": false, "desc": "Body has no padding (for tables)" }
      },
      "variant_axes": { "body": ["padded", "flush"] },
      "required_tokens": ["spacing.md", "spacing.lg", "radius.card", "colorsLight.bgSurface", "colorsLight.borderSubtle"],
      "a11y_contract": { "role": "region", "keyboard": "header actions tab-focusable; title is the region's accessible name" }
    },
    {
      "block_key": "kpi.grid",
      "display_name_en": "KPI tile grid",
      "display_name_vi": "Lưới ô KPI",
      "category": "display",
      "status": "published",
      "composed_of": ["o3-kpi-grid", "o3-kpi"],
      "root_class": "o3-kpi-grid",
      "slots": {
        "tiles": { "type": "kpi[]", "required": true, "desc": "Each tile: {label, value, sub?, tone?, clickable?}. tone in brand|success|warning|danger|info" }
      },
      "variant_axes": { "tone": ["brand", "success", "warning", "danger", "info"] },
      "required_tokens": ["spacing.lg", "radius.card", "colorsLight.bgSurface", "colorsLight.borderSubtle", "brand.primary"],
      "a11y_contract": { "role": "group", "keyboard": "clickable tiles are buttons (Enter/Space activate)" }
    },
    {
      "block_key": "table.data",
      "display_name_en": "Data table",
      "display_name_vi": "Bảng dữ liệu",
      "category": "display",
      "status": "published",
      "composed_of": ["o3-table-wrap", "o3-table"],
      "root_class": "o3-table-wrap",
      "slots": {
        "columns": { "type": "string[]", "required": true, "desc": "Header cell labels" },
        "rows": { "type": "cell[][]", "required": true, "desc": "Row data; each cell is html. Rows may carry {clickable, selected}" }
      },
      "variant_axes": { "row": ["default", "clickable", "selected"] },
      "required_tokens": ["spacing.sm", "spacing.md", "colorsLight.bgSurfaceAlt", "colorsLight.borderSubtle", "colorsLight.textPrimary"],
      "a11y_contract": { "role": "table", "keyboard": "clickable rows are activatable; header cells are th scope=col" }
    },
    {
      "block_key": "empty.state",
      "display_name_en": "Empty state",
      "display_name_vi": "Trạng thái rỗng",
      "category": "feedback",
      "status": "published",
      "composed_of": ["o3-empty"],
      "root_class": "o3-empty",
      "slots": {
        "icon": { "type": "string", "required": false, "desc": "Emoji or icon glyph" },
        "title": { "type": "string", "required": true, "desc": "Primary empty message" },
        "hint": { "type": "string", "required": false, "desc": "Secondary guidance line" }
      },
      "variant_axes": {},
      "required_tokens": ["spacing.lg", "spacing.3xl", "colorsLight.bgSurface", "colorsLight.borderSubtle"],
      "a11y_contract": { "role": "status", "keyboard": "n/a (informational)" }
    },
    {
      "block_key": "shell.workspace",
      "display_name_en": "Workspace shell",
      "display_name_vi": "Khung workspace",
      "category": "navigation",
      "status": "published",
      "composed_of": ["o3-shell", "o3-shell__topbar", "o3-shell__tabs", "o3-shell__tab", "o3-shell__body"],
      "root_class": "o3-shell",
      "slots": {
        "title": { "type": "string", "required": true, "desc": "Workspace title (topbar)" },
        "subtitle": { "type": "string", "required": false, "desc": "Topbar subtitle" },
        "tabs": { "type": "tab[]", "required": false, "desc": "Each tab: {label, active?, badge?}" },
        "body": { "type": "html", "required": true, "desc": "Active workspace content (often blocks)" }
      },
      "variant_axes": {},
      "required_tokens": ["control.height.standard", "spacing.md", "spacing.lg", "brand.primary", "colorsLight.borderSubtle"],
      "a11y_contract": { "role": "region", "keyboard": "tabs are a tablist (Arrow keys move, Enter selects)" }
    }
  ]
};
