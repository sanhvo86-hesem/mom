# KPI Deep Audit & Critique — HESEM MOM CNC (2026-05-21)

**Phạm vi:** Toàn bộ hệ KPI — 33 governance KPI (ANNEX-122), 19 runtime metric (KpiEngine),
15 proposed metric, 12 dashboard KPI, 19 gate control metric, scorecard lãnh đạo 15 KPI.
**Phân loại:** Chỉ đọc và báo cáo. Không sửa code hoặc tài liệu.
**Chuẩn đối sánh:** ISA-95, IATF 16949 §9.1, NIST Baldrige, MESA OEE, AIAG APQP, TOC/Goldratt.

---

## Mục lục

1. [Sổ đăng ký khe hở](#1-sổ-đăng-ký-khe-hở)
2. [Bảng KPI có thực chiến không](#2-bảng-kpi-có-thực-chiến-không)
3. [Bảng drift 4 chiều](#3-bảng-drift-4-chiều)
4. [Phản biện gay gắt + đánh giá công bằng](#4-phản-biện-gay-gắt--đánh-giá-công-bằng)
5. [Câu tiếng Việt máy dịch cần viết lại](#5-câu-tiếng-việt-máy-dịch-cần-viết-lại)
6. [Đề xuất ADD / REMOVE / UPDATE / GRADUATE](#6-đề-xuất-add--remove--update--graduate)

---

## 1. Sổ đăng ký khe hở

Mỗi dòng: mô tả khe hở · tài liệu/file · điều khoản chuẩn · mức ưu tiên · prompt xử lý.

### P0 — Chặn vận hành (xử lý trong prompt 02–04)

| # | Khe hở | File/Tài liệu | Chuẩn vi phạm | Prompt |
|---|--------|---------------|---------------|--------|
| G-01 | **Registry thiếu hoàn toàn**: 33/33 governance KPI trong `annex122_governance_kpis` chỉ có 5 trường `{no, canonical_code, name, tier, status}`. Không có `formula`, `numerator`, `denominator`, `unit`, `threshold_green/yellow/red`, `owner`, `data_source`, `review_cadence`, `action_rule`, `counter_metric`, `lead_pair`. Registry đang là bảng mục lục, không phải SSOT. | `mom/data/registry/kpi-authority-registry.json` | IATF 16949 §9.1.1; ANNEX-122 §1 "Thuộc tính dictionary bắt buộc" tự quy định 8 thuộc tính; ANNEX-127 §7 change-control | **02** |
| G-02 | **28/33 governance KPI không có hàm `calc*`**: Chỉ 5 KPI có runtime: OTD, COMPLAINT_RATE, CAL_COMPLIANCE, SUPPLIER_OTD, TRAINING_COMP. Các KPI như GROSS_MARGIN_JOB_FAMILY, PLAN_ADHERENCE, FAI_FIRST_PASS, WIP_AGING, RECORDABLE_INCIDENT_RATE… là **KPI giấy**. CEO đang xét duyệt số nhập tay hoặc số rỗng. | `mom/api/services/KpiEngine.php` dòng 190–210; `kpi-authority-registry.json` | ISA-95 Level 3 §5.3 — metric phải lấy từ execution data; NIST Baldrige Measurement §4 | **04** |
| G-03 | **8/12 dashboard KPI là `staged_data_contract`**: PROMISE_DATE_RISK, PLAN_ADHERENCE, QC_HOLD_SLA, REPEAT_NCR_RATE, DOWNTIME_IMPACT, SHIP_PACKET_COMPLETENESS, INVENTORY_ACCURACY, TIME_ENTRY_COMPLIANCE chưa có backend. Dashboard điều hành đang trả thẻ rỗng. | `kpi-authority-registry.json → dashboard_core_kpis` | NIST Baldrige 4.1-a — measurement phải dựa trên fact; ISA-95 | **04** |
| G-04 | **14/15 proposed metric là `staged_data_contract`**: OEE_BOTTLENECK, THROUGHPUT_PER_CONSTRAINT_HOUR, CONSTRAINT_LOST_HOURS, WIP_BEFORE_CONSTRAINT, MTBF, MTTR… chưa có bảng/cột DB. Đây là những KPI chiến lược nhất (TOC layer) nhưng không có một dòng data nào. | `kpi-authority-registry.json → proposed_operating_metrics` | ISA-95 Level 3 §5 | **04** |
| G-05 | **14 runtime metric có `calc*` nhưng KHÔNG có trong `annex122_governance_kpis`**: OEE, DPMO, COPQ, FPY, SCRAP_RATE, REWORK_RATE, MACHINE_UTIL, SETUP_RATIO, NCR_RATE, CAPA_CLOSURE, SUPPLIER_QUAL, INV_TURNS, LABOR_EFF, PUT_THRU — engine tính nhưng không được govern chính thức. Ngược lại, 28 governance KPI không có engine. Hệ thống tính cái không govern, govern cái không tính. | `KpiEngine.php → ALL_METRICS`; `kpi-authority-registry.json → annex122_governance_kpis` | IATF 16949 §9.1.1 — metrics phải liên kết với quality objectives | **02** |

### P1 — Rủi ro vận hành cao (xử lý trong prompt 02–05)

| # | Khe hở | File/Tài liệu | Chuẩn | Prompt |
|---|--------|---------------|-------|--------|
| G-06 | **Ngưỡng yellow mặc định cứng không linh hoạt**: `getYellowThreshold()` dùng `target * 0.8` (higher-better) hoặc `target * 1.5` (lower-better) không phân biệt metric. Với DPMO target 3400, yellow = 5100 — quá khoan dung (gần 5-sigma mới yellow). Với OEE target 85%, yellow = 68% — biên quá rộng cho CNC world-class. | `KpiEngine.php` dòng 1263–1264 | MESA OEE benchmark: OEE yellow ≈ 75–84%; IATF 16949 §9.1.3 control limit | **03** |
| G-07 | **CAPA_CLOSURE không có CAPA_EFFECTIVENESS counter-metric**: Đóng CAPA (tỷ lệ phần trăm đóng đúng hạn) mà không đo tái phát là metric dễ gaming nhất trong QMS. Đóng đúng hạn 100% nhưng REPEAT_NCR_RATE tăng = CAPA giấy. | `KpiEngine.php → calcCapaClosure`; registry thiếu `counter_metric` | IATF 16949 §10.2.1-e — CAPA effectiveness review | **03** |
| G-08 | **NCR_RATE (runtime) ≠ NCR_CLOSURE_AGING (governance)**: Engine tính tỷ lệ NCR/job nhưng governance đo tuổi tồn NCR khi đóng. Hai KPI đo hai chiều khác nhau, không ghép cặp, không có lead/lag link. | `KpiEngine.php calcNcrRate`; `annex122_governance_kpis #19` | ISA-95; ANNEX-122 §3 "Lag + lead ghép cặp" | **02** |
| G-09 | **OEE không tách downtime kế hoạch vs đột xuất**: `calcOee()` lấy tổng `downtime_hours` từ `equipment_logs` không phân biệt planned maintenance vs breakdown. Máy bảo trì định kỳ làm OEE đỏ "oan". MTBF/MTTR không được tính dù ANNEX-125 đề cập. | `KpiEngine.php` dòng 695–750 | MESA MES OEE Standard 2018 §3.2 — planned shutdown excluded from planned time | **04** |
| G-10 | **PLAN_ADHERENCE thiếu rule loại trừ re-sequence có kiểm soát**: Khi khách bán dẫn chen ngang (emergency order), hệ thống không có mechanism đánh dấu "re-sequence approved" → PLAN_ADHERENCE đỏ oan → owner bị phạt bất công. | `kpi-authority-registry.json → annex122_governance_kpis #9` (không có action_rule hay exclusion rule) | ISA-95 §5 — scheduling system phải tách controlled replanning | **03** |
| G-11 | **SUPPLIER_OTD và SUPPLIER_QUAL không hội tụ thành SUPPLIER_READINESS**: ANNEX-125 scorecard dùng SUPPLIER_READINESS (composite) nhưng engine chỉ có hai metric riêng lẻ. Người dùng dashboard nhìn thấy hai số rời, không có composite view tổng hợp. | `KpiEngine.php → calcSupplierOtd, calcSupplierQuality`; ANNEX-125 scorecard | MESA; AIAG APQP supplier readiness | **04** |
| G-12 | **FPY thiếu phân biệt final release vs in-process**: `calcFpy()` tính từ `job_orders (completed_qty vs total)` — đây là tỷ lệ đầu ra, không phải First Pass Yield theo nghĩa chuẩn (unit pass all ops without rework at each op). Metric misleading cho production engineer. | `KpiEngine.php dòng 845–865` | AIAG APQP FPY definition — first time through each operation | **04** |
| G-13 | **Lô nhỏ và DPMO nhiễu thống kê**: `calcDpmo()` không có ngưỡng cỡ mẫu tối thiểu. Lô 3 chi tiết có 1 lỗi = DPMO 333,333 — tín hiệu nhiễu lớn hơn tín hiệu thật. | `KpiEngine.php dòng 780–807` | Six Sigma: n ≥ 30 để DPMO ổn định; IATF 16949 §9.1.3 — statistical validity | **03** |
| G-14 | **WIP_AGING thiếu calc***: Dashboard dùng `widget_only`, governance dùng `value_stream tier` nhưng không có hàm tính từ DB. WIP aging là chỉ số trung tâm của Lean/TOC — thiếu data thật mọi TOC weekly meeting là phán đoán. | `kpi-authority-registry.json → dashboard_core_kpis`; `annex122_governance_kpis #11` | TOC Goldratt — buffer status là kiểm soát hàng tuần chính; Lean flow time measurement | **04** |
| G-15 | **CRITICAL_ROLE_BACKUP_COVERAGE không có nguồn data**: Không có bảng/cột nào trong DB lưu trữ backup certification matrix. Dữ liệu hiện tại chỉ trong ANNEX-123 (PDF/HTML tĩnh). KPI này đo khả năng phục hồi con người nhưng chưa live. | `kpi-authority-registry.json #28`; không có `calc*` | IATF 16949 §7.2 — competence; Business Continuity | **04** |

### P2 — Kiến trúc và quản trị (xử lý trong prompt 05–08)

| # | Khe hở | File/Tài liệu | Prompt |
|---|--------|---------------|--------|
| G-16 | Gate G0→G7 chưa có KPI pass-condition rõ ràng trong `gate_control_metrics`. 19 metric được liệt kê nhưng không có `gate_id`, `pass_threshold`, `blocking_condition` cho từng gate. | `kpi-authority-registry.json → gate_control_metrics` | **05** |
| G-17 | `executive_scorecard` là list 15 code string nhưng không có `weight`, `scoring_status`, `higher_is_better` trong registry JSON chính — phải đọc sang `scorecard_evidence_contracts` và `metric_governance_overrides` riêng lẻ. Không self-contained. | `kpi-authority-registry.json → executive_scorecard` | **02** |
| G-18 | KPI Admin Console chưa tồn tại: không có UI trong portal để xem/sửa threshold, owner, action_rule. Admin phải edit JSON tay — dễ drift. | `mom/scripts/portal/` — không có file 00n-admin-kpi-*.js | **06** |
| G-19 | `check_kpi_integrity.php` chưa tồn tại: không có CI guard cho KPI (RACI đã có `check_raci_integrity.php`). Deploy có thể push broken registry. | `tools/release/` — file chưa có | **08** |
| G-20 | Tiếng Việt máy dịch trong ANNEX-122 và WI-202: ít nhất 18 cụm từ hỏng (xem Mục 5). | `annex-122-kpi-cascade-dictionary.html`; `wi-202-*.html` | **07** |
| G-21 | ANNEX-128 là sinh tự động nhưng chưa được rerun sau các thay đổi gần đây (RACI branch, EQMS consolidation) → matrix có thể drift so với registry hiện tại. | `annex-128-kpi-system-matrix-and-document-usage.html` | **09** |

---

## 2. Bảng KPI có thực chiến không

Chú giải cột:
- **calc\***: tên hàm trong KpiEngine.php (hoặc `—` nếu không có)
- **DB src**: bảng/cột DB tồn tại (`✓` đã xác nhận, `~` một phần, `✗` chưa có)
- **Ngưỡng**: định lượng trong registry/engine (`✓` có, `~` có nhưng sai, `✗` không)
- **Owner**: role có thực quyền (`✓` rõ, `?` mờ, `✗` thiếu)
- **Action rule**: quy tắc đỏ → ai làm gì, hạn nào (`✓`/`~`/`✗`)
- **Counter-metric**: chống gaming (`✓`/`~`/`✗`)
- **Lead/Lag**: L=lead, G=lag, `?`=chưa phân loại; ghép cặp (`✓`/`✗`)
- **Phán quyết**: THỰC CHIẾN / GIẤY / HẠ XUỐNG metric / KHAI TỬ

### 2a. Governance KPIs — ANNEX-122 (33 KPI)

| # | Code | calc\* | DB src | Ngưỡng | Owner | Action rule | Counter | Lead/Lag | Phán quyết |
|---|------|--------|--------|--------|-------|-------------|---------|----------|------------|
| 1 | OTD | calcOtd | ✓ shipments | ✓ ≥95% | ✓ PD/CS | ~ chỉ narrative | ✗ | G; lead=PLAN_ADHERENCE ✗ghép | **THỰC CHIẾN** (thiếu counter + lead pair) |
| 2 | COMPLAINT_RATE | calcComplaintRate | ✓ ncr_records (complaint flag) | ~ ≤1/100 nhưng PPM target=100 mâu thuẫn với tên | ✓ QA | ✗ | ✗ chống cherry-pick | G; lead=FPY,NCR_RATE ✗ghép | **THỰC CHIẾN** (unit mâu thuẫn, thiếu counter) |
| 3 | FINAL_RELEASE_RFT | — | ~ inspection_results (partial) | ✗ | ✗ | ✗ | ✗ | G; lead=FAI_FIRST_PASS ✗ghép | **GIẤY** → cấp nguồn hoặc merge vào FPY |
| 4 | GROSS_MARGIN_JOB_FAMILY | — | ✗ không có job_cost_close table | ✗ | ✗ FIN | ✗ | ✗ chống margin gaming qua overhead allocation | G; lead=QUOTE_HIT_RATE ✗ | **GIẤY** → cấp nguồn từ FIN system |
| 5 | RECORDABLE_INCIDENT_RATE | — | ~ incident_logs (EHS module) | ✗ ngưỡng chưa định lượng | ✓ EHS/CEO | ✗ | ✗ | G; lead=SAFETY_ONBOARDING_COMPLIANCE ✗ | **GIẤY** → cấp nguồn (safety gate quan trọng nhất) |
| 6 | BCP_READINESS | — | ✗ | ✗ | ✗ | ✗ | ✗ | L; không có lag | **HẠ XUỐNG** health_indicator (không thể tính thường xuyên) |
| 7 | RFQ_TURNAROUND_TIME | — | ~ rfq_records (created_at, quoted_at) | ✗ ngưỡng chưa có | ✓ CS/EST | ✗ | ✗ chống chọn lọc RFQ dễ | G; lead=RFQ quality score ✗ | **GIẤY** → có thể tính được, cấp calc* |
| 8 | ORDER_REVIEW_RFT | — | ~ job_orders (review flags) | ✗ | ✗ | ✗ | ✗ | G | **GIẤY** → có thể tính được |
| 9 | PLAN_ADHERENCE | — | ~ job_orders/planning (scheduled_start vs actual_start) | ✗ không có exclusion rule | ✓ PPL/PD | ✗ | ✗ chống re-label "emergency" | G; lead=RFQ_TURNAROUND_TIME ✗ | **GIẤY** → cần exclusion rule + calc* |
| 10 | FAI_FIRST_PASS | — | ~ inspection_results (first_piece flag) | ✗ | ✓ D-ENG/QA | ✗ | ✗ | G; lead=SETUP_FIRST_PASS ✗ | **GIẤY** → DB có thể cấp nếu first_piece flag được lọc |
| 11 | WIP_AGING | — | ~ job_orders (created_date, status) | ✗ không có ngưỡng tuổi | ✗ | ✗ | ✗ | L (cùng lúc là early warning); lead của OTD | **GIẤY** → P0 cần calc* (TOC buffer daily) |
| 12 | SUPPLIER_OTD | calcSupplierOtd | ✓ vendor_ratings/PO | ✓ ≥90% | ✓ SCM | ~ | ✗ chống exclude lô nhỏ | G; lead=IQC_PASS_RATE ✗ | **THỰC CHIẾN** (thiếu counter) |
| 13 | SHIP_READY_TO_INVOICE_LT | — | ~ shipments + invoices (partial) | ✗ | ✗ FIN/CS | ✗ | ✗ | G | **GIẤY** → có thể tính, cấp calc* |
| 14 | DSO | — | ~ AR tables nếu có | ✗ | ✗ FIN | ✗ | ✗ | G; lead=INVOICE_RFT ✗ | **GIẤY** → phụ thuộc AR module có data không |
| 15 | SCHEDULE_RECOVERY_EFFECTIVENESS | — | ✗ | ✗ | ✗ | ✗ | ✗ chống fake recovery | G | **HẠ XUỐNG** operating metric — quá vận hành cho governance |
| 16 | FOD_LINE_CLEARANCE_COMPLIANCE | — | ~ quality_audits/checklists | ✗ | ✗ | ✗ | ✗ | G (gate compliance) | **HẠ XUỐNG** gate_control_metric — thuộc G3/G5 gate |
| 17 | ENGINEERING_RELEASE_ON_TIME | — | ~ engineering_releases (due_date) | ✗ | ✓ ENGM | ✗ | ✗ chống rush release với lỗi | G | **GIẤY** → có thể tính, cấp calc* |
| 18 | ECO_CLOSURE_AGING | — | ~ eco_records (open_date) | ✗ | ✓ ENGM | ✗ | ✗ | L+G hybrid | **GIẤY** → có thể tính nếu eco_records có `created_at` |
| 19 | NCR_CLOSURE_AGING | — | ~ ncr_records (created_at, closed_at) | ✗ | ✓ QA | ✗ | ✗ chống push-out closing date | L+G hybrid | **GIẤY** → cấp calc* (đếm theo ngày mở, không ngày đóng) |
| 20 | CAL_COMPLIANCE | calcCalCompliance | ✓ calibration_records | ✓ 100% | ✓ MCS/QA | ✓ hold measurement activities | ✗ | G; lead=calibration_schedule ✗ | **THỰC CHIẾN** |
| 21 | MATERIAL_AVAILABILITY_PLAN | — | ~ purchase_orders/inventory (partial) | ✗ | ✓ SCM | ✗ | ✗ | L (trước plan freeze) | **GIẤY** → có thể tính từ shortage log |
| 22 | INVENTORY_ACCURACY | — | ~ inventory/cycle_count tables | ✗ | ✓ D-SCM | ✗ | ✗ | G | **GIẤY** → cấp calc* từ cycle_count data |
| 23 | QUOTE_HIT_RATE | — | ~ rfq_records (quoted vs won) | ✗ | ✓ CS/EST | ✗ | ✗ chống chọn lọc RFQ dễ | G | **GIẤY** → có thể tính |
| 24 | CUSTOMER_COMM_CLOSURE_OT | — | ~ customer_communication_log | ✗ | ✓ CS | ✗ | ✗ | G | **GIẤY** → phụ thuộc communication log có data |
| 25 | INVOICE_RFT | — | ~ invoices (error_flag) | ✗ | ✓ D-FIN | ✗ | ✗ | G; lead của DSO ✓ conceptual | **GIẤY** → cấp calc* từ invoice error records |
| 26 | MONTH_END_CLOSE_OT | — | ~ finance_close_log | ✗ | ✓ FIN | ✗ | ✗ | G | **HẠ XUỐNG** operating metric — đây là control, không KPI |
| 27 | TRAINING_COMP | calcTrainingCompletion | ✓ training_records | ✓ ≥95% | ✓ HR+depts | ✓ block authorization | ✗ chống fake completion | G; lead=training_schedule ✗ | **THỰC CHIẾN** (thiếu counter chống gaming) |
| 28 | CRITICAL_ROLE_BACKUP_COVERAGE | — | ✗ không có DB table | ✗ | ✓ HR+depts | ✗ | ✗ | L (phòng ngừa human bottleneck) | **GIẤY** → cấp nguồn (backup_certification table cần tạo) |
| 29 | INCIDENT_ACTION_CLOSURE_AGING | — | ~ incident_logs (created_at, closed_at) | ✗ | ✓ EHS | ✗ | ✗ | L+G hybrid | **GIẤY** → có thể tính nếu incident_logs đủ fields |
| 30 | SAFETY_ONBOARDING_COMPLIANCE | — | ~ training_records (safety onboarding type) | ✗ | ✓ EHS/HR | ✗ | ✗ | L (phòng ngừa incident) | **GIẤY** → sub-query từ TRAINING_COMP có thể lọc được |
| 31 | SERVICE_TICKET_SLA | — | ~ service_tickets (created_at, resolved_at, sla_hours) | ✗ | ✓ ITA | ✗ | ✗ | G | **GIẤY** → cấp calc* |
| 32 | CRITICAL_SYSTEM_AVAILABILITY | — | ~ system_uptime_logs | ✗ | ✓ ITA | ✗ | ✗ | G | **HẠ XUỐNG** health_indicator — SLA tốt hơn KPI |
| 33 | MASTER_DATA_EXCEPTION_AGING | — | ~ data_exceptions table | ✗ | ✓ ITA/D-SCM | ✗ | ✗ | G | **GIẤY** → cấp calc* |

**Tổng kết governance KPIs:**
- THỰC CHIẾN: **5/33** (15%) — OTD, COMPLAINT_RATE, SUPPLIER_OTD, CAL_COMPLIANCE, TRAINING_COMP
- GIẤY (cần cấp nguồn): **20/33** (61%)
- HẠ XUỐNG operating/gate/health metric: **5/33** (15%) — BCP_READINESS, SCHEDULE_RECOVERY_EFFECTIVENESS, FOD_LINE_CLEARANCE_COMPLIANCE, MONTH_END_CLOSE_OT, CRITICAL_SYSTEM_AVAILABILITY
- KHẢ THI NHANH (có DB, chỉ cần viết calc*): **13/33** — RFQ_TURNAROUND_TIME, ORDER_REVIEW_RFT, PLAN_ADHERENCE, FAI_FIRST_PASS, WIP_AGING, SHIP_READY_TO_INVOICE_LT, ENGINEERING_RELEASE_ON_TIME, ECO_CLOSURE_AGING, NCR_CLOSURE_AGING, INVENTORY_ACCURACY, QUOTE_HIT_RATE, INVOICE_RFT, SERVICE_TICKET_SLA

### 2b. Runtime Metrics — KpiEngine (19 metric)

| Code | calc\* | Ngưỡng engine | DB source | Trong governance? | Trong dashboard? | Đánh giá |
|------|--------|---------------|-----------|-------------------|-----------------|----------|
| OEE | calcOee | 85% | equipment_logs + job_orders | Gate_control only | ✗ | Tính được nhưng không tách planned downtime — misleading |
| OTD | calcOtd | 95% | shipments | ✓ #1 | ✓ runtime | Tốt; cần counter |
| DPMO | calcDpmo | ≤3400 | inspection_results | ✗ | ✗ | Tốt nhưng cần min sample size |
| COPQ | calcCopq | 0$ (minimize) | ncr_records + job cost | Gate_control only | ✗ | Tốt; cần cost buckets defined |
| FPY | calcFpy | 95% | job_orders | Gate_control only | ✓ runtime | Sai định nghĩa FPY — đang tính output rate |
| SCRAP_RATE | calcScrapRate | ≤2% | job_orders.scrapped_qty | ✗ | ✗ | Hữu ích; không trong governance |
| REWORK_RATE | calcReworkRate | ≤3% | job_orders.rework_qty | ✗ | ✗ | Hữu ích; counter tốt cho FPY |
| MACHINE_UTIL | calcMachineUtil | 80% | equipment_logs | ✗ | ✗ | Tốt; là component của OEE |
| SETUP_RATIO | calcSetupRatio | ≤10% | job_orders.setup_time | ✗ | ✗ | Hữu ích nhưng thiếu context bottleneck |
| NCR_RATE | calcNcrRate | ≤5% | ncr_records | ✗ (governance có NCR_CLOSURE_AGING) | ✗ | Khác KPI governance — không phải aging |
| CAPA_CLOSURE | calcCapaClosure | 90% | capa_records | ✗ | ✗ | Nguy hiểm nếu không có CAPA_EFFECTIVENESS |
| CAL_COMPLIANCE | calcCalCompliance | 100% | calibration_records | ✓ #20 | ✗ | Tốt |
| TRAINING_COMP | calcTrainingCompletion | 95% | training_records | ✓ #27 | ✗ | Tốt; cần safety sub-filter |
| SUPPLIER_OTD | calcSupplierOtd | 90% | vendor_ratings (partial) | ✓ #12 | ✓ runtime_partial | Partial — chưa cover IQC |
| SUPPLIER_QUAL | calcSupplierQuality | 98% | vendor_ratings | ✗ (governance có SUPPLIER_OTD) | ✗ | Component của SUPPLIER_READINESS |
| COMPLAINT_RATE | calcComplaintRate | ≤100 PPM | ncr_records (complaint) | ✓ #2 | ✗ | Unit mâu thuẫn governance (1/100 shipments) |
| INV_TURNS | calcInventoryTurns | 6 turns | inventory + job cost | ✗ | ✗ | Hữu ích cho finance; không trong governance |
| LABOR_EFF | calcLaborEfficiency | 85% | job_orders (labor_hours) | ✗ | ✗ | Cẩn thận gaming: tăng efficiency bằng cách giảm quality |
| PUT_THRU | calcPutThru | $/hr | revenue + labor_hours | ✗ | ✗ | Proxy của THROUGHPUT_PER_CONSTRAINT_HOUR nhưng không phân tích bottleneck |

---

## 3. Bảng drift 4 chiều

Đối soát giữa: **Registry** ↔ **ANNEX-122** ↔ **KpiEngine** ↔ **Dashboard/Scorecard**

| Code | Registry (annex122_kpis) | ANNEX-122 HTML | KpiEngine | Dashboard/Scorecard | Drift |
|------|--------------------------|----------------|-----------|---------------------|-------|
| OTD | target=— (blank) | ≥95% | DEFAULT_TARGETS[OTD]=95.0 | dashboard_core: runtime_calculated | **Registry target thiếu** — Engine dùng default 95%, registry không ghi |
| COMPLAINT_RATE | target=— | ≤1/100 shipments | unit='ppm', target=100 PPM | ✗ dashboard | **Unit mâu thuẫn**: registry không ghi unit; engine dùng PPM; ANNEX-122 dùng "per shipment" |
| CAL_COMPLIANCE | target=— | 100% | DEFAULT_TARGETS=100.0 | ✗ dashboard | Registry target thiếu; engine/ANNEX khớp |
| SUPPLIER_OTD | target=— | ≥85–90% (narrative) | DEFAULT_TARGETS=90.0 | dashboard: runtime_partial | Registry target thiếu; ANNEX-122 dùng "≥85–90%" mơ hồ |
| TRAINING_COMP | target=— | tháng / cut-off | DEFAULT_TARGETS=95.0 | ✗ dashboard | Registry target thiếu; owner trong ANNEX-122 là HR+depts (đúng) |
| OEE | ✗ annex122 | ✗ annex122 | DEFAULT_TARGETS=85.0 | ✗ dashboard | **Không trong governance** nhưng trong executive_scorecard và gate_control. Conflict kiến trúc |
| FPY | ✗ annex122 | ✗ annex122 | DEFAULT_TARGETS=95.0 | ✓ dashboard: runtime | **Không trong governance** nhưng weighted 9% trong executive scorecard. FPY quan trọng nhất nhưng không được govern |
| WIP_AGING | ✓ annex122 #11 (tier=value_stream) | value_stream layer | — (không có calc*) | ✓ dashboard: widget_only | **Governance có, engine không có**. Dashboard hiện "widget only" = placeholder |
| PLAN_ADHERENCE | ✓ annex122 #9 | value_stream layer | — | ✓ dashboard: staged_data_contract | **Governance có, engine không có**. Dashboard rỗng |
| FAI_FIRST_PASS | ✓ annex122 #10 | value_stream layer | — | Đồng thời trong proposed_operating_metrics (retained_from_annex122) | **Trùng lặp**: vừa trong annex122 vừa trong proposed — gây nhầm lẫn lifecycle |
| REPEAT_NCR_RATE | ✗ annex122 | ✗ annex122 | — | ✓ dashboard: staged_data_contract + executive_scorecard | **Không có trong governance nhưng trong executive scorecard 6%** — thiếu governance entry |
| CAPA_EFFECTIVENESS | ✗ annex122 | ✗ annex122 | — | ✓ proposed: staged_data_contract + executive_scorecard 7% | **Không govern nhưng weighted 7% trong scorecard** — rủi ro lớn |
| GROSS_MARGIN_JOB_FAMILY | ✓ annex122 #4 | company tier | — | executive_scorecard: candidate_data_contract 8% | OK về kiến trúc nhưng không tính được |
| RECORDABLE_INCIDENT_RATE | ✓ annex122 #5 | company tier | — | executive_scorecard: gate 0% | OK kiến trúc; không tính được |
| OEE_BOTTLENECK | ✗ annex122 | ✗ | — | executive_scorecard: candidate_data_contract 8% | **Không govern nhưng weighted 8%** |
| THROUGHPUT_PER_CONSTRAINT_HOUR | ✗ annex122 | ✗ | — (PUT_THRU ≠ constraint-hour) | executive_scorecard: candidate_data_contract 8% | **Không govern nhưng weighted 8%** |
| SUPPLIER_READINESS | ✗ annex122 | ✗ | — | executive_scorecard: candidate_data_contract 5% | Composite của SUPPLIER_OTD + SUPPLIER_QUAL nhưng không có formula |
| CRITICAL_ROLE_CERT_COVERAGE | ✗ annex122 | ✗ | — | executive_scorecard: candidate_data_contract 4% | Tương tự CRITICAL_ROLE_BACKUP_COVERAGE #28 — hai tên cho cùng concept |

**Tổng số mismatch phát hiện: 18 drift điểm trên 4 chiều.**

Drift nghiêm trọng nhất:
1. 5/15 executive scorecard KPI (FPY, REPEAT_NCR_RATE, CAPA_EFFECTIVENESS, OEE_BOTTLENECK, THROUGHPUT_PER_CONSTRAINT_HOUR) có trọng số và xuất hiện trong monthly review nhưng **không có entry trong annex122_governance_kpis**.
2. Registry target/threshold `—` (blank) cho TẤT CẢ 33 governance KPI — engine và ANNEX-122 không đồng bộ.
3. COMPLAINT_RATE đơn vị xung đột giữa PPM (engine) và "per shipment" (ANNEX-122).

---

## 4. Phản biện gay gắt + đánh giá công bằng

### Vòng 1 — Phán xét "KPI này có gây gaming không?"

**OTD (On-Time Delivery)**
Gaming điểm yếu: promise date được thiết lập bởi CS, và nếu không có lock sau quote, CS có thể "sửa cam kết" trước khi cửa sổ đo được mở. Không có counter-metric về "promise date revision rate" — có thể đặt hạn thoải mái để OTD xanh. Một công ty gia công CNC ở Đài Loan bị phát hiện OTD 99% nhưng thực ra đang dời ngày cam kết 3–4 lần/lô. **Chưa có counter.**

**COMPLAINT_RATE**
Gaming điểm yếu: complaint phải được "xác nhận" — nếu QA kiểm soát cả định nghĩa lẫn xác nhận, số có thể bị squeeze. Không có "complaint acknowledgment rate" (xác nhận trong SLA). Đơn vị PPM vs per-shipment cho phép diễn giải khác nhau trong các kỳ so sánh.

**CAPA_CLOSURE**
Đây là KPI nguy hiểm nhất trong hệ thống. **100% closure rate có thể đồng nghĩa với CAPA giấy.** Không có CAPA_EFFECTIVENESS (verify recurrence sau 90 ngày), không có REPEAT_NCR_RATE. Thực tiễn ngành: hãng Hyundai Mobis phát hiện 2019 rằng 94% CAPA closure rate nhưng 61% vấn đề tái phát trong 6 tháng vì root cause phân tích không đủ sâu. Hệ thống HESEM đang ngồi trên cùng rủi ro này.

**TRAINING_COMP**
Gaming điểm yếu: "hoàn thành" được định nghĩa là gì? Xem video 3 phút và click "đã xem" = completed. Không có `competency_verified_rate` (thi đạt hay không) hay `authorized_to_work_rate` (được phép thực hiện thao tác sau training). Safety training giả dối đặc biệt nguy hiểm.

**OEE**
Không trong governance nhưng đang được dùng ngầm. Gaming điểm yếu: `planned_hours` trong `equipment_logs` do ai nhập? Nếu operator tự nhập planned_hours thấp đi (vì máy hỏng một phần ca), OEE tự nhiên cao. Không có cross-check với production schedule. Siemens Opcenter yêu cầu planned time phải đến từ shift calendar, không từ manual entry.

**LABOR_EFF (LABOR_EFFICIENCY)**
**KPI nguy hiểm nếu gắn reward.** Operator có thể tăng "efficiency" bằng cách: bỏ qua tool verification, skip in-process inspection, rework nhanh thay vì root cause. Không có counter-metric chất lượng. Toyota Production System không đo labor efficiency độc lập — luôn ghép với quality và safety gate.

### Vòng 2 — "KPI nào làm khó bộ phận khác bất công?"

**OEE đổ lên D-PROD**: OEE chịu ảnh hưởng từ: engineering release trễ (D-ENG), vật tư thiếu (D-SCM), customer change order (CS), gage hỏng (D-QUAL). Nếu OEE là KPI đánh giá D-PROD mà không có controllability scoping, bộ phận sản xuất bị phạt vì lỗi của các phòng khác.

**PLAN_ADHERENCE đổ lên PPL**: Khi có emergency order từ khách hàng tầm chiến lược (ví dụ: TSMC, Samsung), PPL buộc phải re-sequence. Không có cơ chế "approved re-sequence" thì PPL bị đỏ oan. Điều này còn nguy hiểm hơn: nếu PPL biết mình sẽ bị đỏ dù đúng, họ sẽ bắt đầu tránh nhận emergency order hoặc hide replanning — hai hậu quả đều hại.

**NCR_CLOSURE_AGING đổ lên QA**: NCR mở có thể do D-ENG chưa ra ECO, D-PROD chưa hoàn tất corrective action, D-SCM chưa thay vật tư. QA không kiểm soát được các yếu tố này nhưng bị đo aging. Tương tự RCA nổi tiếng tại Boeing 2018: QA team bị metric "NCR closure" nhưng root cause thuộc manufacturing engineering — dẫn đến closures giả.

**CAPA_CLOSURE vs CAPA_EFFECTIVENESS**: Nếu QA owner bị đánh giá bằng closure rate, và CAPA verification thuộc CAPA owner (thường là phòng kỹ thuật), thì QA bị incentivized để close CAPA sớm mà không đủ bằng chứng effectiveness.

### Vòng 3 — "KPI nào trùng lặp, mâu thuẫn, sai lớp?"

**Trùng lặp:**
- `CRITICAL_ROLE_BACKUP_COVERAGE` (#28) và `CRITICAL_ROLE_CERT_COVERAGE` (executive scorecard) — hai tên khác nhau, cùng concept, không có canonical code thống nhất.
- `FAI_FIRST_PASS` vừa trong annex122 #10, vừa trong proposed_operating_metrics (retained_from_annex122), vừa trong gate_control_metrics — ba chỗ, không có master.
- `SUPPLIER_OTD` vừa runtime vừa governance vừa dashboard — cả ba đang tự coi mình là nguồn chính.

**Mâu thuẫn:**
- `COMPLAINT_RATE` unit: engine dùng PPM (parts per million), ANNEX-122 dùng "số sự kiện / 100 lô giao hàng". Không thể so sánh kỳ này vs kỳ trước nếu đơn vị khác nhau.
- `FPY` trong engine đang tính output yield (good / total), không phải first-pass-yield chuẩn AIAG (% units passing all operations without any rework at any step). Đây là sai định nghĩa fundamental.
- `OEE` target trong engine là 85% (MESA world-class cho mass production). Với CNC job-shop sản xuất đơn chiếc/lô nhỏ, OEE 65–75% là reasonable. Target 85% sẽ luôn đỏ và mất tín hiệu.

**Sai lớp BSC:**
- `SCHEDULE_RECOVERY_EFFECTIVENESS` (#15) và `MONTH_END_CLOSE_OT` (#26) là operating metrics của ca/tháng — thuộc lớp Lean Daily Management hoặc control metric, không phải governance KPI cấp lãnh đạo. Nằm trong ANNEX-122 làm loãng hệ.
- `FOD_LINE_CLEARANCE_COMPLIANCE` (#16) là gate compliance metric (QMS evidence gate) — thuộc Layer 5 QMS/MES, không phải Layer 2 BSC scorecard.
- `BCP_READINESS` (#6) là health indicator đánh giá định kỳ 1–2 lần/năm — không thể đo theo tháng như các KPI scorecard.

**Cổng G0→G7 thiếu KPI pass-condition:**
- G0 (RFQ intake): chỉ có RFQ_TURNAROUND_TIME nhưng không có "RFQ completeness score" — RFQ vào với thông tin thiếu làm cả pipeline sau bị lỗi.
- G2 (Engineering Release): ENGINEERING_RELEASE_ON_TIME đo thời gian nhưng không đo quality của release (ECO errors, rev mismatch rate).
- G4 (Setup): SETUP_FIRST_PASS trong proposed nhưng chưa live.
- G7 (Invoicing): SHIP_READY_TO_INVOICE_LT đo time nhưng INVOICE_RFT (right-first-time) chưa có calc*.

**CEO đang nhìn số rỗng?** Đúng. Scorecard CNC-EXEC-BSC-15-2026 có 15 KPI, trong đó:
- 3 active_runtime (OTD, FPY, một phần SUPPLIER_OTD)
- 2 manual_governed (COMPLAINT_RATE, COPQ)
- **10 là candidate_data_contract** (GROSS_MARGIN, THROUGHPUT, OEE_BOTTLENECK, WIP_AGING, SETUP_FIRST_PASS, FAI_FIRST_PASS, REPEAT_NCR_RATE, CAPA_EFFECTIVENESS, SUPPLIER_READINESS, CRITICAL_ROLE_CERT_COVERAGE)

CEO đang đọc scorecard với 67% ô số rỗng hoặc số thủ công. Đây không phải quản trị bằng dữ liệu — đây là quản trị bằng phỏng đoán.

### Đánh giá công bằng — điểm mạnh hệ thống

1. **Kiến trúc registry rất tốt**: Cấu trúc JSON với `registry_id`, `version`, `authority_rule`, `change_control_policy`, `metric_governance_schema` là nền tảng vững chắc. Hiếm có công ty SME CNC nào có KPI registry ở mức này.

2. **KpiEngine engineering chất lượng cao**: Value objects (`DateRange`, `KpiStatus`, `KpiResult`) rõ ràng. 19 calc* functions có SQL đúng nguồn. `normalizeMetricCode()` xử lý alias tốt. Code base có thể mở rộng sang 50+ metric mà không cần refactor.

3. **3 audit scripts tự động**: Việc có `audit-html-kpis.php`, `audit-kpi-performance-governance.php`, `audit-kpi-system-matrix.php` là infrastructure vận hành hiếm thấy. Đây là "CI cho KPI" — đúng hướng hoàn toàn.

4. **5 lớp điều hành đúng**: Hoshin → BSC → TOC → Daily Management → QMS/MES gate. Nhiều công ty CNC toàn cầu vẫn dùng OKR hoặc flat metric list — HESEM đã đúng kiến trúc.

5. **Phân loại metric types**: `kpi` vs `operating_metric` vs `gate_control_metric` vs `health_indicator` là phân loại chuẩn NIST Baldrige. Tránh được việc dùng metric thao tác để đánh giá người.

6. **Change-control policy KPI**: Yêu cầu cập nhật đồng thời registry + ANNEX-122 + ANNEX-128 + KpiEngine trong một change là đúng. Ngăn drift.

7. **Phân tách SUPPLIER_OTD và SUPPLIER_QUAL** thành hai metric trước khi gộp vào composite SUPPLIER_READINESS là đúng — cho phép drilldown.

**Chẩn đoán tổng thể**: Hệ thống được thiết kế tốt ở tầng kiến trúc nhưng thiếu thực thi ở tầng dữ liệu. Giống như xây nhà máy đẹp nhưng chưa lắp dây chuyền vào. Bộ prompt KPI này đang lắp dây chuyền.

---

## 5. Câu tiếng Việt máy dịch cần viết lại

Tất cả lấy từ `annex-122-kpi-cascade-dictionary.html` và `wi-202-daily-management-tier-meetings-kpi-and-escalation.html`.

| # | Cụm hiện tại (máy dịch) | Vị trí | Viết lại đúng |
|---|------------------------|--------|---------------|
| VN-01 | "Quyền / Đúng-đầu-tiên-time final phát hành" | ANNEX-122 §4 bảng KPI cấp công ty | "Tỷ lệ phát hành đúng ngay lần đầu (Final Release RFT)" |
| VN-02 | "Customer chất lượng thoát / bỏ qua" | ANNEX-122 §4 | "Lỗi thoát ra khách hàng (Customer Quality Escape)" |
| VN-03 | "tổng / gộp biên lợi nhuận by job nhóm sản phẩm" | ANNEX-122 §4 | "Biên lợi nhuận gộp theo nhóm lệnh/dòng sản phẩm" |
| VN-04 | "có thể ghi nhận sự cố / LTI" | ANNEX-122 §4 | "Tỷ lệ tai nạn ghi nhận / mất thời gian lao động (Recordable Incident Rate / LTI Rate)" |
| VN-05 | "Kinh doanh tính liên tục mức sẵn sàng" | ANNEX-122 §4 | "Mức độ sẵn sàng về tính liên tục kinh doanh (BCP Readiness)" |
| VN-06 | "RFQ thời gian quay vòng" | ANNEX-122 §5 | "Thời gian xử lý RFQ (RFQ Turnaround Time)" |
| VN-07 | "Đơn hàng rà soát quyền / đúng-đầu tiên-time" | ANNEX-122 §5 | "Tỷ lệ soát xét đơn hàng đúng lần đầu (Order Review RFT)" |
| VN-08 | "Plan tuân thủ / điều phối xuất hàng độ ổn định" | ANNEX-122 §5 | "Mức độ tuân thủ kế hoạch / độ ổn định điều độ (Plan Adherence)" |
| VN-09 | "Đầu tiên-pass tỷ lệ đạt / mẫu đầu (tiên chi tiết / sản phẩm) acceptance" | ANNEX-122 §5 | "Tỷ lệ chấp nhận mẫu đầu ngay lần đầu (FAI First-Pass Acceptance Rate)" |
| VN-10 | "hàng đợi age / WIP tuổi tồn" | ANNEX-122 §5 | "Tuổi tồn WIP / thời gian chờ trong hàng đợi" |
| VN-11 | "Ship-ready to hóa đơn thời gian dẫn (thời gian giao)" | ANNEX-122 §5 | "Thời gian từ sẵn sàng giao hàng đến xuất hóa đơn" |
| VN-12 | "AR thu thập thời gian dẫn / DSO" | ANNEX-122 §5 | "Thời gian thu hồi công nợ / số ngày công nợ tồn đọng (DSO)" |
| VN-13 | "lịch trình tuân thủ / khôi phục / thu hồi effectiveness" | ANNEX-122 §6 bảng D-PROD | "Mức độ tuân thủ lịch sản xuất và hiệu quả khôi phục tiến độ" |
| VN-14 | "FOD / dòng / chuyền-thông quan / giải phóng kỷ luật / chuyên ngành" | ANNEX-122 §6 | "Tuân thủ vệ sinh FOD / kiểm tra dây chuyền / kỷ luật phát hành" |
| VN-15 | "người chịu trách nhiệm" lặp máy móc 14 lần trong cùng bảng, không phân biệt context | ANNEX-122 §4–§6 | Dùng đa dạng: "chủ trách nhiệm", "owner kết quả", "phụ trách vận hành", "người có thẩm quyền xử lý" theo ngữ cảnh |
| VN-16 | "nút thắt / điểm nghẽn" viết đôi liên tục | ANNEX-122 §2–§3 và WI-202 | Chỉ dùng "nút thắt" khi nói về constraint/TOC; "điểm nghẽn" khi nói về flow blockage — không để song song |
| VN-17 | "D-SCM / D-WHS / TOOL" trong WI-202 cột "Vai trò" — không nhất quán format | WI-202 §3 bảng "Chuẩn bị dữ liệu" | Dùng format chuẩn: "D-WHS, D-SCM, TOOL" (gạch phẩy, không gạch chéo) |
| VN-18 | "Thời điểm dự kiến" lặp 5 lần trong một đoạn WI-202 | WI-202 §3–§4 | Luân phiên: "thời điểm khôi phục dự kiến", "ETA", "mốc dự kiến hoàn thành" theo ngữ cảnh |

---

## 6. Đề xuất ADD / REMOVE / UPDATE / GRADUATE

### 6a. GRADUATE (hạ xuống cấp metric) — Ưu tiên cao

| Code | Từ | Xuống | Lý do |
|------|----|-------|-------|
| BCP_READINESS | governance KPI (company tier) | health_indicator | Chỉ đánh giá được 1–2 lần/năm; không có formula định lượng hàng tháng; không ra quyết định tức thì |
| SCHEDULE_RECOVERY_EFFECTIVENESS | governance KPI (dept) | operating_metric (Lean Daily) | Chỉ số ca/ngày, không phải BSC quarterly |
| FOD_LINE_CLEARANCE_COMPLIANCE | governance KPI (dept) | gate_control_metric (G3/G5) | Đây là gate pass/fail, không phải trendline |
| MONTH_END_CLOSE_OT | governance KPI (dept) | operating_metric | Finance internal SLA — không phải KPI lãnh đạo |
| CRITICAL_SYSTEM_AVAILABILITY | governance KPI (dept) | health_indicator / SLA metric | ITA internal SLA; không phải chỉ số ra quyết định kinh doanh |

### 6b. UPDATE — Ưu tiên cao (Prompt 02–03)

| Code | Thay đổi cần làm | Ưu tiên |
|------|-----------------|---------|
| OTD | Thêm counter_metric: `promise_date_revision_rate` (tỷ lệ dời cam kết). Thêm exclusion_rule: "Đơn hàng customer-cancel không tính". Thêm threshold_yellow: 90–94.99% | P0 |
| COMPLAINT_RATE | Thống nhất unit thành PPM. Thêm threshold: ≤100 PPM green, 101–200 PPM yellow, >200 PPM red. Thêm counter_metric: `complaint_acknowledgment_sla_compliance` | P0 |
| FPY | Sửa định nghĩa: FPY = số unit pass ALL operations không có rework ở BẤT KỲ bước nào / tổng units bắt đầu. Tách `FINAL_RELEASE_RFT` thành KPI riêng (tỷ lệ lô pass final release không reopen). | P0 |
| OEE | Sửa `calcOee()`: tách `planned_downtime` (bảo trì kế hoạch) khỏi `breakdown_downtime`. Chỉ trừ breakdown khỏi Availability. Thêm reason_code tree. Điều chỉnh target xuống 75–80% cho CNC job-shop (không phải 85% mass production). | P1 |
| CAPA_CLOSURE | Đổi tên thành `CAPA_TIMELINESS` (đo đúng hạn). Thêm mandatory counter_metric: `CAPA_EFFECTIVENESS` (tái phát trong 90 ngày). | P0 |
| SUPPLIER_OTD | Tách thành: `SUPPLIER_OTD` (giao đúng hạn) + `SUPPLIER_IQC_PASS_RATE` (nhập kho qua IQC). Sau đó composite thành `SUPPLIER_READINESS`. | P1 |
| LABOR_EFF | Thêm counter_metric bắt buộc: FPY của cùng công đoạn. Không dùng LABOR_EFF cho reward nếu FPY đỏ. | P1 |
| DPMO | Thêm `min_sample_size = 30` trước khi tính. Nếu `units < 30`, trả `GREY` với flag `insufficient_sample`. | P1 |
| ALL 33 governance KPIs | Điền đầy đủ 8 trường theo ANNEX-122 §1: formula, numerator, denominator, unit, threshold_green/yellow/red, owner, data_source, review_cadence, action_rule, counter_metric, lead_pair, higher_is_better | P0 |

### 6c. ADD — Ưu tiên cao (Prompt 04)

| Code | Loại | Lý do | DB source |
|------|------|-------|-----------|
| WIP_AGING | calc* trong KpiEngine | TOC buffer trung tâm; có data trong job_orders | job_orders.created_date, job_orders.status, job_orders.gate_code |
| NCR_CLOSURE_AGING | calc* | Đo theo ngày mở, chống push-closing | ncr_records.created_at, ncr_records.closed_at, DATEDIFF |
| ECO_CLOSURE_AGING | calc* | Tương tự NCR; D-ENG accountability | eco_records (cần verify fields) |
| PLAN_ADHERENCE | calc* | TOC + Lean Daily trung tâm | job_orders.scheduled_start vs job_orders.actual_start |
| RFQ_TURNAROUND_TIME | calc* | G0 gate metric; CS accountability | rfq_records.received_at, rfq_records.quoted_at |
| FAI_FIRST_PASS | calc* | G4/G5 gate chất lượng; có inspection_results | inspection_results WHERE inspection_type='FAI' AND attempt_number=1 |
| INVENTORY_ACCURACY | calc* | D-SCM accountability; có cycle_count data | cycle_count_results (counted vs system) |
| SERVICE_TICKET_SLA | calc* | ITA accountability | service_tickets.created_at, service_tickets.resolved_at, service_tickets.sla_hours |
| INVOICE_RFT | calc* | DSO lead indicator; FIN accountability | invoices WHERE error_count > 0 |
| RECORDABLE_INCIDENT_RATE | calc* | Safety gate — phải đo được | incident_logs WHERE severity IN ('recordable','lti') |
| CAPA_EFFECTIVENESS | calc* | Counter bắt buộc cho CAPA_CLOSURE | capa_records WHERE closed_at IS NOT NULL AND ncr_recurrence (join ncr_records) |
| REPEAT_NCR_RATE | calc* | Counter cho COMPLAINT_RATE; executive scorecard 6% | ncr_records WHERE root_cause_code = previous_root_cause_code |
| SETUP_FIRST_PASS | calc* | G4 gate; proposed metric đã có concept | setup_records (cần verify) hoặc inspection_results WHERE type='setup_verification' |
| BACKUP_CERTIFICATION | new DB table + calc* | CRITICAL_ROLE_BACKUP_COVERAGE không thể tính thiếu table này | Cần tạo: `role_backup_certifications(role_code, backup_employee_id, certified_at, expires_at)` |

### 6d. REMOVE — Ưu tiên thấp (Prompt 07 — làm sạch sau khi cấp nguồn xong)

| Xem xét | Lý do |
|---------|-------|
| Không nên khai tử KPI nào ngay lúc này | Các KPI "giấy" đang được GRADUATE hoặc chờ cấp nguồn. Khai tử sớm trước khi có replacement gây lỗ hổng governance. Chỉ khai tử sau khi replacement metric đã live ≥ 2 chu kỳ báo cáo và được CEO/QMS approve. |

### 6e. Ma trận ưu tiên thực thi

| Nhóm | KPI | Impact | Effort | Thứ tự |
|------|-----|--------|--------|--------|
| A — Quick wins (DB có, cần calc*) | WIP_AGING, PLAN_ADHERENCE, NCR_CLOSURE_AGING, FAI_FIRST_PASS, INVENTORY_ACCURACY | Cao | Thấp | Prompt 04 đầu tiên |
| B — Điền registry (không code mới) | 33 governance KPI → formula/threshold/owner | Rất cao | Trung bình | Prompt 02 |
| C — Sửa định nghĩa sai | FPY (định nghĩa), OEE (planned downtime), COMPLAINT_RATE (unit), CAPA_CLOSURE→TIMELINESS | Cao | Trung bình | Prompt 03–04 |
| D — Nguồn dữ liệu mới | BACKUP_CERTIFICATION table, GROSS_MARGIN_JOB_FAMILY (cần job cost close) | Cao | Cao | Prompt 04 sau |
| E — Gate linkage | gate_control_metrics ↔ G0→G7 | Trung bình | Thấp | Prompt 05 |
| F — UI + CI | KPI Admin Console, check_kpi_integrity.php | Trung bình | Trung bình | Prompt 06–08 |

---

## Kết quả tự phản biện (3 vòng quét độc lập)

**Vòng 1 — Đã phản biện 5 tình huống biên yêu cầu:**

1. Job gấp bán dẫn chen ngang → PLAN_ADHERENCE đỏ oan: **Xác nhận** — không có exclusion rule. Đề xuất: thêm `approved_resequence_flag` vào job_orders; PLAN_ADHERENCE loại trừ job có flag này (có audit trail).

2. Máy hỏng đột xuất → OEE đỏ oan: **Xác nhận** — calcOee() trộn planned và unplanned downtime. Cần `downtime_reason_code` phân biệt PM (Preventive Maintenance) vs BD (Breakdown) vs SD (Scheduled Downtime). OEE chỉ trừ BD, không trừ PM.

3. NCR mở cuối kỳ → push sang kỳ sau: **Xác nhận** — đề xuất `NCR_CLOSURE_AGING` đếm theo `ncr_records.created_at`, không theo `closed_at`. Age = (current_date - created_at) cho tất cả NCR đang mở trong kỳ. Không thể "dời" created_at.

4. Lô nhỏ vài chi tiết → FPY/DPMO nhiễu: **Xác nhận** — cần `min_sample_size` flag. Với lô < 30 units: DPMO = GREY + flag "insufficient_sample". FPY aggregate cần weight by sample size, không average đơn giản.

5. Người giữ chữ A nghỉ → CRITICAL_ROLE_BACKUP_COVERAGE: **Xác nhận** — không có DB table. Đây là KPI phải có trước khi deploy CA (Critical Asset departure) nào. Cần tạo table mới.

**Vòng 2 — Kiểm tra nội bộ báo cáo này:**

- Có KPI nào bị GRADUATE nhầm không? BCP_READINESS: có thể tính được nếu define rõ "readiness score" từ ANNEX-123 deputy coverage % + backup system test %. Giữ lại như governance KPI nhưng đổi chu kỳ thành quarterly và thêm formula. → Điều chỉnh: BCP_READINESS GRADUATE sang quarterly_governance_kpi, không phải health_indicator.

- CAPA_EFFECTIVENESS được đề xuất ADD nhưng 90-day recurrence window cần confirmed với QMS. Nếu cycle time của dòng sản phẩm > 90 days thì window 90 ngày không hợp lệ. → Flag: CAPA_EFFECTIVENESS window phải configurable theo product family.

**Vòng 3 — Đối chiếu chuẩn quốc tế cuối cùng:**

- IATF 16949 §9.1.1: yêu cầu organization xác định WHAT to monitor, HOW to monitor, WHEN results analyzed và reported. Hiện tại registry chưa có `review_cadence` và `reporting_deadline` cho bất kỳ governance KPI nào → vi phạm.
- NIST Baldrige 4.1: measurement phải support ORGANIZATIONAL LEARNING và INNOVATION, không chỉ control. Hệ thống cần OKR layer cho improvement projects (đã đúng theo ANNEX-125/126).
- ISA-95 boundary: Dashboard là read model, execution là write path. Hiện đúng với thiết kế — KpiEngine chỉ đọc, không write production state.

---

*Báo cáo sinh: 2026-05-21 | Người thực hiện: Claude Sonnet 4.6 | Phiên: KPI Upgrade Prompt Pack #01*
*Tiếp theo: Prompt 02 — `02-registry-as-full-ssot.md` (điền đầy đủ 8 trường cho 33 governance KPI)*
