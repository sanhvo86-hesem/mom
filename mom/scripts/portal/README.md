# Portal Script Modules

This folder contains the `portal.html` JavaScript split into functional modules.

Load order is required:

1. `01-data-config.js`
2. `02-state-auth-ui.js`
3. `03-editor-core.js`
4. `04-workflow-actions.js`
5. `05-workflow-panel.js`
6. `06-tiptap-pilot.js`
7. `90-qrcodegen.js`
8. `99-bootstrap.js`

## Module map

- `01-data-config.js`
  - Demo users, role map, categories, i18n dictionary, document tree helpers, low-level storage helpers.

- `02-state-auth-ui.js`
  - App state, authentication/session flow, permissions, sidebar/dashboard/document/admin rendering and handlers.

- `03-editor-core.js`
  - Rich editor engine: toolbar, commands, table/image/shape/chart features, source mode, find/replace, printing.

- `04-workflow-actions.js`
  - Edit lifecycle actions: start edit, submit/review/approve/reject, save draft, export/publish helpers.

- `05-workflow-panel.js`
  - Workflow panel rendering, version history UI, QR preview modal helper.

- `06-tiptap-pilot.js`
  - Feature-flagged Tiptap pilot adapter (dynamic loader + command bridge + safe fallback to legacy).

- `90-qrcodegen.js`
  - Standalone QR generator + `renderEnrollQR` implementation.

- `99-bootstrap.js`
  - Final bootstrap calls: `initLang()`, `initLogin()`, `checkSession()`.

## Notes

- Keep files in classic `<script src="...">` mode (not `type="module"`), because many handlers are used by inline `onclick`.
- Do not move bootstrap earlier than QR script if enroll flow relies on QR rendering at startup.
