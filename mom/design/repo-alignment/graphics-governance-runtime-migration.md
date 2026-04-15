
# Current MOM Alignment — Graphics Governance Migration

This pack was upgraded against the MOM authority model and the drift that was present when the pack was imported:

- Standard 36 is the production authority for frontend/runtime/module layout/template/block/API/gates/release evidence.
- Document Graphics Governance defines the graphics authority stack:
  Admin Appearance → Theme runtime → Shared tokens → Shared components → Bridge aliases → Module UI.
- The original import audit found browser-backed/local helper paths such as `hesem_layout_templates` and `hesem_module_template_binding`; current runtime must keep them purged or limited to migration/preview evidence, never production authority.
- The original import audit found a theme mismatch between Admin UI themes and Theme Manager presets; current runtime must keep Admin-selectable themes runtime-supported and validator-checked.

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
- Do not read this migration note as live production state. The current production state is verified by `mom/tools/design/validate-frontend-contracts.mjs`, `mom/tools/registry/verify_publication_truth.py`, the backend graphics governance registry and release-candidate proof.
