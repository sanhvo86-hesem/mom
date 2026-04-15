
# Canonical vs Enriched Packet Split

This folder upgrades the old enriched-only packet model to a two-layer model aligned with current MOM authority:

- `module-build-packets/` keeps exactly the 30 canonical build-packet fields.
- `module-build-packets-annex/` keeps the 5 enriched planning/inventory fields:
  `moduleProfile`, `screenInventory`, `actionInventory`, `queryInventory`, `endpointInventory`.

Why this split exists:

1. The current enriched packets are excellent for reading and planning, but they mix production-law fields with derived inventory fields.
2. Current MOM authority requires a cleaner separation between executable authority and enriched documentation projections.
3. Runtime, Builder, CI and release evidence should validate the canonical packet first, then join annex/projection data when needed.

Migration rule:

- Treat `mom-design-enriched/module-build-packets/*.json` as backward-compatible planning packets.
- Treat `mom-design-canonical/module-build-packets/*.json` as the future production-law packet boundary.
- Treat `mom-design-canonical/module-build-packets-annex/*.json` as non-authoritative projections that remain useful for humans, generated docs and diagnostics.
