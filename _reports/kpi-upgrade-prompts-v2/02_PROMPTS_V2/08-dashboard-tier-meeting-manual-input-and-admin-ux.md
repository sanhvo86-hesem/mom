# 08 — Dashboard, tier meeting, manual input và Admin UX

**Loại:** sửa portal JS/backend/controller/docs nếu cần.  
**Mục tiêu:** Người dùng thấy đúng trạng thái KPI, nhập manual/counter metric có evidence, và dashboard phục vụ điều hành thực tế thay vì số rỗng.

## 1. Đọc trước

- `DashboardController.php`
- `KpiEngine.php`
- `00o-admin-kpi-registry.js`
- dashboard JS modules
- routes KPI input/catalog/trend/badges/scorecards
- WI-202
- gap reports.

## 2. Dashboard principles

Dashboard phải chia tầng:
- Executive: 12–18 KPI scorecard, không staged scoring.
- Daily operations: flow/quality/delivery blockers.
- Gate dashboard: pass/hold CDR.
- Role/JD: role measures, not company KPI.
- Data contract backlog: staged candidates.

Mỗi card hiển thị:
- value/status;
- calculation_status badge;
- min_sample/insufficient_data reason;
- owner;
- next action if red;
- counter-metric status;
- trend;
- source/evidence link;
- last calculated/input time.

## 3. Manual input UX

Cho manual/counter/gate metrics:
- form structured, không raw JSON;
- fields: period, value, unit, evidence_ref, breakdown/reason, entered_by, approver/status, note;
- validation numeric/unit/cadence;
- audit trail;
- status `pending_review`, `approved`, `rejected`, `superseded`;
- dashboard không dùng input pending cho reward.

Nếu route `kpi_input_save/list` đã có, harden theo trên. Nếu chưa đủ, bổ sung.

## 4. Counter metric UX

Counter-metric không được chỉ nằm trong JSON:
- hiển thị cạnh KPI chính;
- nếu KPI chính xanh nhưng counter đỏ → blocker badge;
- input endpoint rõ nếu manual;
- scorecard recognition blocked nếu counter red/pending/missing.

## 5. Admin Console UX

KPI Admin Console:
- no raw JSON;
- editable fields allowlist;
- formula/data_source/calculation_status read-only, đổi qua change-control;
- grouped library with filters process/category/tier/status/JD;
- staged red label “chưa đủ data contract”;
- manual badge “nhập tay có kiểm soát”;
- runtime badge “tính tự động”;
- draft add/retire does not become official silently;
- save requires reason.

## 6. Tier meeting integration

WI-202/dashboard:
- T1 daily: machine/cell issues, WIP, first-piece, safety.
- T2 production/quality: plan adherence, FAI, NCR, material.
- T3 management: OTD, constraint, CAPA, supplier, finance.
- Red KPI creates action item with owner/due date.
- Yellow triggers watch/containment.
- Grey insufficient data does not blame; creates data quality action.

## 7. API checks

Verify:
- `GET /api/kpi/catalog`
- `GET /api/kpi/<CODE>`
- `GET /api/kpi/trend`
- `GET /api/kpi/threshold_badges`
- `GET /api/kpi/jd_scorecards`
- `POST /api/kpi/<CODE>/input` or route equivalent.

Use current router conventions, not guessed REST path.

## 8. Tự phản biện

- CEO/operator có phân biệt số thật vs staged/manual không?
- Có cảnh báo data missing mà không tô đỏ sai không?
- Counter metric có thật sự visible không?
- Manual input có evidence/audit hay chỉ là nhập số?

## 9. Definition of Done

- Dashboard không hiển thị KPI staged như số thật.
- Manual/counter input có UX/evidence.
- Admin Console an toàn.
- WI-202 synced.
- Audit/guard + node/php checks PASS.
- Report `_reports/kpi/kpi-dashboard-manual-input-ux-<date>.md`.
