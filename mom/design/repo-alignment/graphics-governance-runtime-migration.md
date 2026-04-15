
# Current MOM Alignment — Graphics Governance Migration

This pack was upgraded against the current known MOM authority model:

- Standard 36 is the production authority for frontend/runtime/module layout/template/block/API/gates/release evidence.
- Document Graphics Governance defines the graphics authority stack:
  Admin Appearance → Theme runtime → Shared tokens → Shared components → Bridge aliases → Module UI.
- Current runtime still shows browser-backed/local helper paths such as `hesem_layout_templates` and `hesem_module_template_binding`.
- Current runtime also shows a theme mismatch between Admin UI themes and Theme Manager presets.

Therefore this pack upgrades the original ZIP in seven ways:

1. Adds graphics-governance authority artifacts.
2. Splits canonical build packets from enriched annexes.
3. Adds theme compatibility matrix.
4. Adds visual debt observatory.
5. Adds runtime compliance beacon schema.
6. Adds backend graphics authority contract.
7. Extends the HTML authority with graphics-control-plane sections.

Drop-in guidance:

- Keep the original enriched artifacts for backward compatibility.
- Introduce `mom-design-canonical/` and `mom-design-graphics/` as new governance layers.
- Use `mom-design-repo-alignment/backend-graphics-authority-api-contract.json` as the handoff artifact for backend/API implementation.
