# Excel Form Version Control Architecture

Date: 2026-03-25

## Purpose

This note defines the boundary between controlled source, runtime workflow data, released form files, and evidence for Excel-form control in the HESEM portal.

## Source and runtime boundary

### Controlled source

These artifacts belong to the SharePoint-synced source tree and Git-controlled source path defined in [ANNEX-136](../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html) and [WI-107](../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-107-sharefile-git-cpanel-sync.html):

- PHP/JS/HTML source that implements the form workflow
- released form definitions and source templates
- source-controlled configuration that is approved to move through Git and deployment

### Runtime workflow data

These artifacts are runtime data and must stay under server/runtime control, not in the SharePoint source library and not in Git source history:

- `01-QMS-Portal/qms-data/form-workflow/<CODE>/files/...`
- `01-QMS-Portal/qms-data/form-workflow/<CODE>/state.json`
- `01-QMS-Portal/qms-data/form-workflow/<CODE>/manifest.json`
- archived binaries created by runtime workflow actions
- review-state payload created by the live system

## Adopted workflow

For `.xlsx`, `.xlsm`, `.xls`, and `.csv` forms registered in `form_control_registry.json`:

1. Baseline `V0` stays at the canonical controlled live path under `04-Bieu-Mau/...`.
2. Starting a new revision creates workflow state only; it does not overwrite the released live file.
3. Uploading a draft stores the binary in runtime data under `01-QMS-Portal/qms-data/form-workflow/<CODE>/files/...`.
4. Submitting for review promotes the working binary from `DRAFT` to `INREVIEW`.
5. Approval copies the reviewed binary to the canonical live path and archives the previous live release in runtime storage.
6. Reject moves the in-review binary back to draft.
7. Delete draft removes only working copies and restores the released state.

## Storage rules

- Live current release: canonical controlled form path under `04-Bieu-Mau/...`
- Working draft / in-review files: `01-QMS-Portal/qms-data/form-workflow/...`
- Obsolete approved history: `01-QMS-Portal/qms-data/form-workflow/...`
- Source code and released schema definitions: SharePoint-synced source tree + Git
- Deployment evidence: `10-QMS-Source-Control/03-Server-Deploy-Receipts/{YYYY}/`
- Source promotion evidence: `10-QMS-Source-Control/02-Release-Manifests/{YYYY}/`

## Operational rule

The workbook binary is not rewritten to inject release metadata. Version control is handled by:

- source control for code and approved source definitions
- runtime state for draft/in-review/archive workflow payload
- controlled live release at the form path

## API and UI touchpoints

- Backend workflow helpers: `01-QMS-Portal/form_workflow.php`
- Main API actions: `01-QMS-Portal/api.php`
- Viewer / download actions: `01-QMS-Portal/scripts/portal/02-state-auth-ui.js`
- Workflow actions: `01-QMS-Portal/scripts/portal/04-workflow-actions.js`
- Version history panel: `01-QMS-Portal/scripts/portal/05-workflow-panel.js`

## Evidence expectations

Every production release that changes Excel-form workflow behavior must have:

- approved source change / manifest in `10-QMS-Source-Control/02-Release-Manifests/{YYYY}/`
- deploy receipt in `10-QMS-Source-Control/03-Server-Deploy-Receipts/{YYYY}/`
- reverse-sync close-out if any hotfix originated on the server

## References

- [ANNEX-136](../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html)
- [WI-107](../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-107-sharefile-git-cpanel-sync.html)
- [WI-101](../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-101-digital-online-forms-and-approvals.html)
- [SOP-104](../../03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html)
