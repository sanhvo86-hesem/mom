# OVERWRITE MANIFEST — 2026-04-08 R14 SERIOUS

Root folder in this zip:
- `qms.hesem.com.vn/`

Primary changed files:
- `01-QMS-Portal/scripts/portal/00-block-engine.js`
- `01-QMS-Portal/scripts/portal/31-module-builder.js`
- `01-QMS-Portal/docs/module-builder-ultra-round14-serious-2026-04-08.md`
- `01-QMS-Portal/release/module-builder-ultra-round14-serious-manifest-2026-04-08.json`
- `01-QMS-Portal/release/module-builder-ultra-round14-serious-smoke-2026-04-08.json`
- `01-QMS-Portal/release/module-builder-ultra-round14-sample-runtime-design-2026-04-08.json`

Release intent:
- move focus from builder chrome decoration to runtime module presentation
- make presentation controls actually affect module runtime render
- persist presentation settings in schema
- provide runtime previews inside builder

Overwrite instructions:
1. Extract zip.
2. Copy folder `qms.hesem.com.vn/` over your local/server root.
3. Hard refresh browser (`Ctrl+F5`).
4. Test runtime presentation on both a new module and an existing module.

Minimum validation after overwrite:
- change preset and verify preview changes
- save module and reopen
- verify header style changes
- verify tabs style changes
- verify card style changes
- verify table style changes
