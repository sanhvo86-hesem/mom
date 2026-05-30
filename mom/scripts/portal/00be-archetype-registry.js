/* ════════════════════════════════════════════════════════════════════════════
 * L4 Module Archetype Registry — runtime SSOT (Lego-SSOT)
 *
 * An ARCHETYPE is a complete module shell: an arrangement of L3 blocks into
 * named ZONES (header / body / aside). Building a module = pick an archetype,
 * declare which block fills each zone + the slot data, and ArchetypeKit (00bf)
 * renders the whole surface. This is the top of the Lego stack:
 *   L1 token → L2 component → L3 block → L4 archetype.
 *
 * Authored as a web-served JS module that assigns window.__HM_ARCHETYPE_REGISTRY__
 * (NOT data/config/*.json — nginx-403s that path; same lesson as 00bc). Load
 * AFTER 00bd-blockkit.js. The CI gate (check_graphics_archetype_registry.php)
 * parses this file; migration 262 (graphics_module_archetype) is the
 * governance/audit mirror for the multi-tenant SaaS direction.
 *
 * route_class maps to the HMV4 Wave-1 patterns (workspace projection /
 * authoritative record shell), so an HMV4 slice = an archetype instance.
 *
 * An archetype ships only when status='published' AND every zone's
 * allowed_blocks reference real published L3 blocks AND it has an ArchetypeKit
 * renderer — all enforced by the gate.
 * ════════════════════════════════════════════════════════════════════════════ */
window.__HM_ARCHETYPE_REGISTRY__ = {
  "$schema_version": "1.0.0",
  "authority": {
    "runtime_ssot": "mom/scripts/portal/00be-archetype-registry.js",
    "governance_mirror": "graphics_module_archetype (migration 262)",
    "renderer": "window.ArchetypeKit.render (mom/scripts/portal/00bf-archetypekit.js)",
    "block_layer": "mom/scripts/portal/00bc-block-registry.js",
    "gate": "mom/tools/release/check_graphics_archetype_registry.php"
  },
  "archetypes": [
    {
      "archetype_key": "workspace-projection",
      "display_name_en": "Workspace projection",
      "display_name_vi": "Phép chiếu workspace",
      "route_class": "workspace-projection",
      "status": "published",
      "_doc": "Read/triage surface: shell with tabs, a KPI summary band, a filtered toolbar, and a data table. The default shell for list/triage modules (dispatch board, intake queue, scorecards).",
      "zones": {
        "shell":  { "block": "shell.workspace", "required": true,  "desc": "Outer shell + title + tabs" },
        "kpis":   { "block": "kpi.grid",        "required": false, "desc": "Summary KPI band at top of body" },
        "toolbar":{ "block": "toolbar.filtered","required": false, "desc": "Filter/search/actions row" },
        "list":   { "block": "table.data",      "required": true,  "desc": "Primary data table" },
        "empty":  { "block": "empty.state",     "required": false, "desc": "Shown when list is empty" }
      },
      "zone_order": ["kpis", "toolbar", "list"],
      "required_blocks": ["shell.workspace", "table.data"],
      "forbidden_patterns": ["hand-written table markup", "inline toolbar HTML"],
      "a11y_contract": { "landmark": "region per zone; single h-level for shell title" }
    },
    {
      "archetype_key": "authoritative-record-shell",
      "display_name_en": "Authoritative record shell",
      "display_name_vi": "Khung hồ sơ thẩm quyền",
      "route_class": "authoritative-record",
      "status": "published",
      "_doc": "Single-record surface: shell + header toolbar (record actions) + a main panel (record body) + an aside panel (metadata/sidebar). The default for record modules (NCR case, CAPA, document record).",
      "zones": {
        "shell":  { "block": "shell.workspace", "required": true,  "desc": "Outer shell + record title" },
        "actions":{ "block": "toolbar.filtered","required": false, "desc": "Record action bar (approve/reject/…)" },
        "main":   { "block": "panel.standard",  "required": true,  "desc": "Primary record body panel" },
        "aside":  { "block": "panel.standard",  "required": false, "desc": "Metadata / related-info side panel" },
        "empty":  { "block": "empty.state",     "required": false, "desc": "Shown when record not found" }
      },
      "zone_order": ["actions", "main", "aside"],
      "required_blocks": ["shell.workspace", "panel.standard"],
      "forbidden_patterns": ["hand-written panel markup"],
      "a11y_contract": { "landmark": "main + complementary (aside); record title is the shell's accessible name" }
    }
  ]
};
