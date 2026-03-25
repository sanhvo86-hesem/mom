# HESEM QMS - Server Delivery Rollout Baseline V1

Date: 2026-03-25

## Purpose

Lock the production delivery baseline for document and form releases that move through:

- SharePoint-synced local source
- Git remote history
- server deployment
- deploy evidence and reverse-sync control

## Required delivery chain

1. Approved source change exists.
2. Release manifest is created in `10-QMS-Source-Control/02-Release-Manifests/{YYYY}/`.
3. Server pulls the approved commit/tag.
4. Smoke checks are executed.
5. Deploy receipt is stored in `10-QMS-Source-Control/03-Server-Deploy-Receipts/{YYYY}/`.
6. If any hotfix happens on the server, it must be closed through `10-QMS-Source-Control/04-Reverse-Sync-Intake/{YYYY}/`.

## Minimum checklist

1. MIME type is correct for `.xlsx`, `.xlsm`, `.xls`.
2. Workbook response header is `Content-Disposition: attachment`.
3. `X-Content-Type-Options: nosniff` is present.
4. Reverse proxy or CDN does not strip attachment headers.
5. No rewrite sends workbooks to inline preview.
6. Portal and internal HTML links resolve to the active workbook release.
7. No operational link points back to retired FRM HTML pages.
8. Deploy receipt and smoke evidence are filed after release.
9. Reverse-sync close-out exists for every server-originated hotfix.

## Minimum evidence

- release manifest
- pull/deploy receipt
- header capture for one workbook download
- one click test from portal
- one click test from SOP/WI/Manual link
- confirmation that downloaded file opens in desktop Excel
- reverse-sync record when applicable

## References

- [ANNEX-132](../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-132-m365-records-flow-approval-sharing-and-exception-control.html)
- [ANNEX-136](../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html)
- [WI-107](../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-107-sharefile-git-cpanel-sync.html)
