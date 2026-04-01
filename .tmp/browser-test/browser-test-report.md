# Browser Test Report

Date: 2026-04-01
Workspace: C:\Users\TEST4\qms.hesem.com.vn
Test environment: local temp data copy under .tmp\browser-test\qms-data

## Verified

- Login with temporary admin account on isolated test server succeeded.
- Admin tab `Nhập tay vận hành` rendered successfully in browser.
- Admin tab `Nguồn dữ liệu` rendered successfully in browser.
- Manual create modals exposed manual number fields:
  - SO: `so_number`
  - JO: `jo_number`
  - WO: `wo_number`
- Frontend save flow for data source config worked:
  - `connect_timeout` changed from `5` to `6`
  - save bar appeared
  - save persisted to backend
  - config restored back to `5`
- Manual order roundtrip worked through backend API in browser session:
  - `SO-MANUAL-1775036333`
  - `JO-MANUAL-1775036333`
  - `WO-MANUAL-1775036333`
- Manual order roundtrip also worked through the actual frontend modal submit flow:
  - `SO-UIMODAL-1775036506`
  - `JO-UIMODAL-1775036506`
  - `WO-UIMODAL-1775036506`

## Browser Evidence

- Manual runtime screenshot: `admin-manual-runtime.png`
- Data sources screenshot: `admin-data-sources.png`

## Notes

- Testing used a temporary copied `qms-data` store to avoid modifying real runtime data.
- Temporary local servers were stopped after verification.