# KPI Upgrade — Tổng kết toàn chương trình (2026-05-22)

**Chương trình:** `_reports/kpi-upgrade-prompts/` — 10 stage (00→09).
**Mục tiêu:** Biến hệ KPI HESEM MOM từ "KPI giấy" thành **KPI thực chiến** —
tính từ dữ liệu thật, có ngưỡng định lượng, gắn quyết định, công bằng,
chống gaming, bảo vệ cổng G0→G7.

## Trước / Sau

| Hạng mục | Trước (Prompt 01 audit) | Sau (Stage 09) |
|----------|-------------------------|----------------|
| Registry mỗi governance KPI | 5 trường (`no, code, name, tier, status`) | **22 trường** đầy đủ máy đọc được |
| 33 governance KPI — runtime | ~5 (15%) có `calc*` | **14** `runtime_calculated` |
| 33 governance KPI — còn lại | ~28 KPI giấy mập mờ | **18 staged_data_contract + 1 manual**, trạng thái trung thực |
| KPI mập mờ (không rõ tính kiểu gì) | nhiều | **0** |
| `schema_version` | không có | **5** + schema-version gate |
| Ngưỡng định lượng + căn cứ | hầu như không | 33/33 có `thresholds` + `basis` |
| Counter-metric chống gaming | không | 4/4 KPI `reward_eligible` có counter thật |
| Gate metric ↔ CDR G0–G7 | không liên kết | **21 gate metric** trỏ `linked_cdr`, đủ 8 cổng |
| Tài liệu KPI tiếng Việt | nhiều câu máy dịch | viết lại chuyên gia, thuật ngữ nhất quán |
| Console quản trị KPI | không có | **KPI Admin Console** trong portal |
| CI guard chống drift KPI | không có | **check_kpi_integrity.php** trong deploy.yml |
| `runtime_calculated_metrics` | 19 mã | **28 mã** |

## Việc đã làm theo stage

- **01** — Deep audit: 21 khe hở (5 P0), bảng "KPI thực chiến", drift 4 chiều.
- **02** — Registry thành SSOT đầy đủ: 33 governance KPI đủ schema; `schema_version`.
- **03** — Ngưỡng + căn cứ + action reference + attribution rule + counter-metric;
  `min_sample`; quy tắc khen thưởng công bằng vào ANNEX-127/129.
- **04** — 9 KPI graduate → `runtime_calculated` với `calc*` thật; cổng
  insufficient-data (GREY thay vì đỏ giả khi nguồn rỗng).
- **05** — 21 gate metric liên kết CDR G0→G7; +2 metric mới (B8, D11).
- **06** — KPI Admin Console: service + controller + module portal + overlay
  runtime + schema-version gate.
- **07** — Viết lại tiếng Việt chuyên gia ANNEX-122/110; phát hiện + khắc phục
  S07-DEPLOY (deploy.sh đóng băng doc operations).
- **08** — `check_kpi_integrity.php` CI guard (7 nhóm P0); drift-tested.
- **09** — Re-audit toàn hệ + verify + tổng kết (tài liệu này).

## Trạng thái re-audit cuối (2026-05-22)

- 3 audit script (`audit-html-kpis`, `audit-kpi-performance-governance`,
  `audit-kpi-system-matrix`): **PASS, 0 P0**.
- `check_kpi_integrity.php`: **PASSED, 0 P0, 23 P1** (advisory).
- Catalog VPS live: schema v5, 76 metric, **0 metric thiếu `calculation_status`**.
- 7 KPI runtime tính được trên VPS; trả GREY "insufficient_data" trung thực
  vì DB prototype rỗng — KHÔNG tô đỏ/xanh giả.
- ANNEX-122 live: 33 dòng `data-kpi-code`, 21 dòng gate, badge runtime, tiếng
  Việt sạch.

## Drift đã đóng

- Registry ↔ ANNEX-122: §4/§5/§6 sinh trực tiếp từ registry, guard P0 canh.
- Gate metric ↔ CDR: 21 metric có `linked_cdr` hợp lệ ANNEX-121.
- runtime_calculated ↔ KpiEngine: guard P0 canh mã phải có `calc*`.
- counter_metric: registry là SSOT, thắng legacy overrides.

## Khe hở còn lại + đề xuất kỳ sau

| # | Khe hở | Đề xuất |
|---|--------|---------|
| R-01 | 18 governance KPI còn `staged_data_contract` — cần bảng nguồn mới hoặc tích hợp Epicor (RFQ_TURNAROUND_TIME, FAI_FIRST_PASS, FINAL_RELEASE_RFT…). | Cấp data contract theo logic Stage 04; ưu tiên KPI điều hành. |
| R-02 | DB prototype gần rỗng — KPI runtime trả "insufficient_data". | Khi có dữ liệu vận hành thật, KPI tự hiện số; không cần sửa code. |
| R-03 | `calcOee` query bảng `equipment_logs` KHÔNG tồn tại → OEE luôn fail. | Sửa nguồn sang `mes_machine_state_events`/`downtime_event`. |
| R-04 | Proposed metric TOC (OEE_BOTTLENECK, THROUGHPUT_PER_CONSTRAINT_HOUR) + MTBF/MTTR chưa graduate. | Cần constraint register + machine-event aggregation. |
| R-05 | `deploy.sh` đóng băng toàn bộ `mom/docs/operations` — commit doc qua git không deploy (S07-DEPLOY). | Sửa deploy.sh chỉ preserve doc thực sự lệch git HEAD. |
| R-06 | 11 P2 `LEGACY_ALIAS_USED` ở ANNEX-120/120B/121. | Dọn alias cũ (CCR…) sang mã canonical. |
| R-07 | 3 KPI staged (GROSS_MARGIN, RECORDABLE_INCIDENT_RATE, FAI_FIRST_PASS) vẫn trong executive scorecard. | Graduate hoặc đánh dấu rõ "candidate" trên scorecard CEO. |

## Tự phản biện cuối

**Hệ KPI giờ có thúc đẩy "làm thật" không?**
Có, ở tầng cấu trúc. Mỗi KPI có công thức định lượng, ngưỡng có căn cứ
benchmark, owner có thực quyền, action rule trỏ CDR/SOP/WI, attribution rule
tách nguyên nhân để không đổ lỗi sai. 14 KPI tính tự động từ DB; 18 KPI còn
lại được đánh dấu trung thực "chưa có data contract" thay vì giả vờ có số —
CEO biết rõ đâu là số thật.

**Còn KPI nào là khẩu hiệu không?**
Không còn KPI mập mờ — mọi KPI có `calculation_status` rõ ràng. 18 KPI
`staged` chưa phải khẩu hiệu: chúng có công thức + nguồn ứng viên + lộ trình
graduate; chỉ chờ data contract. Rủi ro thật: nếu data contract không bao
giờ được cấp, chúng đọng mãi ở staged — guard P1 + Console phơi bày điều này
để quản trị buộc phải quyết.

**Còn KPI nào có thể bị gaming?**
Đã chặn phần lớn: aging đếm từ ngày MỞ (chống dồn-đóng); `min_sample` chống
nhiễu lô nhỏ; counter-metric cho mọi KPI reward; QUOTE_HIT_RATE mẫu số chỉ
RFQ đủ năng lực. Rủi ro còn lại: OTD vẫn có thể bị "dời ngày cam kết" —
counter `PROMISE_DATE_REVISION_RATE` mới là khái niệm, chưa thành metric
thật (cần Stage 04-logic kỳ sau). OEE nhập tay `planned_hours` có thể bị
chỉnh — cần lấy từ shift calendar thay vì manual entry.

**Đánh giá tổng thể:** Hệ KPI đã chuyển từ "đẹp kiến trúc, rỗng vận hành"
sang "khung thực chiến hoàn chỉnh, đang chờ dữ liệu". Phần còn thiếu là DỮ
LIỆU VẬN HÀNH THẬT, không phải thiết kế — đó là việc của giai đoạn đưa hệ
vào production, không phải của bộ prompt này.

---
*Chương trình KPI Upgrade hoàn tất 10/10 stage. Người thực hiện: Claude
Sonnet 4.6. Bằng chứng: `_reports/kpi/kpi-stage-0X-*.md` (01→08) + tài liệu này.*
