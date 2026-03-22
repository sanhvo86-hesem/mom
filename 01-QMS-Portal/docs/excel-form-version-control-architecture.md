# Excel Form Version Control Architecture

Date: 2026-03-22

## Why this model

The portal now manages Excel forms with a document-control model aligned to common enterprise practice:

1. Keep one canonical live workbook at the controlled public path.
2. Use check-out / draft upload before review.
3. Require submit-for-review before release.
4. Keep released history immutable outside web root.
5. Allow authenticated download of both the current release and approved obsolete versions.

This follows the direction used by Microsoft document libraries (check-out, check-in, approval, version history, restore) and spreadsheet-governance guidance such as ICAEW's recommendation to maintain regular backup and version control, and to manage access levels.

## Reference direction

- Microsoft Support: check out, check in, or discard changes in a library
- Microsoft Support: require approval and draft-item security in a library
- Microsoft Support: view version history and restore a previous version
- ICAEW: maintain regular backup and version control, and manage access levels for spreadsheets

## Adopted workflow

For `.xlsx`, `.xlsm`, `.xls`, and `.csv` forms registered in `form_control_registry.json`:

1. Baseline `V0` stays at the canonical live path under `04-Bieu-Mau/...`.
2. Starting a new revision creates a workflow state entry only. No live file is overwritten.
3. Uploading a draft stores the binary in private runtime data under `qms-data-private/form-workflow/<CODE>/files/...`.
4. Submitting for review promotes the working binary from `DRAFT` to `INREVIEW`.
5. Approval copies the reviewed binary to the canonical live path and archives the previous live release as an immutable obsolete version in private runtime storage.
6. Reject moves the in-review binary back to draft.
7. Delete draft removes only working copies and restores the released state.

## Storage rules

- Live current release: web root, canonical form path.
- Working draft / in-review files: private runtime data, outside web root.
- Obsolete approved history: private runtime data, outside web root.
- Metadata and history: `state.json` and `manifest.json` per form in private runtime data.

The workbook binary is not rewritten to inject release metadata. Version control is handled by sidecar metadata plus immutable archived binaries.

## API and UI touchpoints

- Backend workflow helpers: `01-QMS-Portal/form_workflow.php`
- Main API actions: `01-QMS-Portal/api.php`
- Viewer / download actions: `01-QMS-Portal/scripts/portal/02-state-auth-ui.js`
- Workflow actions: `01-QMS-Portal/scripts/portal/04-workflow-actions.js`
- Version history panel: `01-QMS-Portal/scripts/portal/05-workflow-panel.js`

## Operational notes

- Current release downloads use `api.php?action=doc_stream`.
- Historical workbook downloads use `api.php?action=form_version_stream`.
- After first released revision beyond `V0`, the registry entry is upgraded from `v0_registry_checksum_control` to `private_archive_release_control`.
- This model assumes runtime private data is preserved across deploys. Do not delete `qms-data-private` if you need form history.

## Smoke test outcome

Validated in isolated local runtime on `FRM-101`:

- `V0 -> V0.1`: start revision, upload draft, submit review, approve, current download, obsolete download.
- `V0.1 -> V0.2 draft`: upload draft, submit review, reject, discard draft, restore released state.

Observed result:

- current live release advanced correctly,
- obsolete release remained downloadable,
- draft cleanup did not damage the released workbook,
- registry revision advanced to `V0.1`,
- registry control model changed to `private_archive_release_control`.
