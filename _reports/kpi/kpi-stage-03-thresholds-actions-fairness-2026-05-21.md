# KPI Stage 03 — Thresholds, Action Rules, Counter-metrics, Fairness (2026-05-21)

**Prompt:** `_reports/kpi-upgrade-prompts/03-thresholds-actions-fairness.md`
**Kết quả:** Mỗi KPI thành tín hiệu ra quyết định công bằng — ngưỡng có căn cứ,
action rule khả thi, counter-metric chống gaming, quy kết công bằng.

## Việc đã làm

1. **`thresholds.basis`** cho 33 KPI — căn cứ ngưỡng X/V/Đ: benchmark ngành
   gia công CNC, scorecard CNC-EXEC-BSC-15-2026, hoặc cam kết hợp đồng khách.
2. **`formula.min_sample`** — KPI tỷ lệ có cỡ mẫu tối thiểu (OTD 5 lô,
   COMPLAINT_RATE 30 lô, FAI_FIRST_PASS 5, INVENTORY_ACCURACY 20 dòng…);
   dưới ngưỡng → "không đủ dữ liệu", không tô xanh/đỏ.
3. **`action_reference`** — mỗi KPI trỏ một đường leo thang khả thi: WI-202
   họp tầng (T1–T3), ANNEX-117 ma trận leo thang, SOP-902 xem xét lãnh đạo,
   hoặc CDR cổng G0–G7.
4. **`attribution_rule`** — quy kết công bằng: KPI đỏ tách breakdown theo
   nguyên nhân; phần do bộ phận khác chuyển về owner tương ứng.
5. **`counter_metric` reconcile** — 4 KPI `reward_eligible` (OTD,
   COMPLAINT_RATE, FINAL_RELEASE_RFT, GROSS_MARGIN_JOB_FAMILY) đều có
   counter là KPI governance thật chiều ngược. KpiEngine đảo precedence:
   registry là SSOT, thắng `metric_governance_overrides` cũ.
6. **`schema_version` 2→3**; KpiEngine `getMetricCatalog` trả thêm
   `action_reference`, `attribution_rule`.
7. **ANNEX-122** §4/§5/§6 regenerated — hiển thị căn cứ ngưỡng, tham chiếu
   hành động, quy kết công bằng, cờ gắn khen thưởng.
8. **ANNEX-127 §7.3** thêm 2 quy tắc: xanh bền vững ≥3 kỳ → ghi nhận đội;
   KPI đỏ tách breakdown trước khi quy trách nhiệm.
9. **ANNEX-129 §7** thêm 2 note: căn cứ ngưỡng định lượng + khen thưởng/
   cải tiến/khắc phục công bằng.
10. **ANNEX-128** regenerated. 3 audit PASS (0 P0/P1).

## Verify

- Deploy GitHub Actions: HEAD `7153493a` XANH.
- VPS live: `schema_version=3`; OTD có `thresholds.basis`/`action_reference`/
  `attribution_rule`/`min_sample=5`; 4 reward KPI có counter từ registry.

## Tự phản biện (3 vòng)

**Vòng 1 — Ngưỡng nào "đẹp ảo", gaming kiểu gì, counter chặn chưa?**
- OTD green ≥95%: gaming bằng dời ngày cam kết. `min_sample=5` chặn nhiễu lô
  nhỏ; counter COMPLAINT_RATE chặn "giao nhanh ẩu". Còn lỗ hổng "promise date
  revision" — chưa có metric `PROMISE_DATE_REVISION_RATE`, ghi finding prompt 04.
- CAL_COMPLIANCE 100%: không thể "đẹp ảo" — thiết bị quá hạn là nhị phân; an toàn.
- Aging (NCR/ECO/WIP/MASTER_DATA): đã đếm từ ngày MỞ → không thể hoãn đóng cho
  số đẹp. Ghi rõ trong `formula.exclusions` + `thresholds.basis`.
- QUOTE_HIT_RATE: gaming bằng chỉ chọn RFQ dễ — mẫu số CHỈ tính RFQ "đủ năng
  lực" (`qualified_flag`), đã ghi exclusion.

**Vòng 2 — KPI nào owner không kiểm soát mà vẫn reward_eligible?**
4 KPI reward đều cấp công ty, là kết quả đội/hệ thống — KHÔNG dùng cho cá nhân.
`attribution_rule` mỗi KPI tách phần ngoài tầm kiểm soát. RECORDABLE_INCIDENT_RATE
giữ `reward_eligible:false` (cổng an toàn, không bù điểm). 28 KPI department/
value_stream `reward_eligible:false` — chỉ theo dõi/leo thang, không gắn thưởng.
→ Không KPI nào reward_eligible mà thiếu counter hoặc ngoài tầm kiểm soát.

**Vòng 3 — Action rule khả thi? KPI nào gây 2 bộ phận đổ lỗi?**
- Mọi `action_reference` trỏ WI-202/ANNEX-117/SOP-902/CDR cổng — đều là cơ
  chế đã tồn tại, có người triệu tập và thẩm quyền.
- KPI rủi ro đổ lỗi chéo: OTD (PD↔SCM↔D-ENG), FAI_FIRST_PASS (D-ENG↔WKM↔QC),
  NCR_CLOSURE_AGING (QA↔phòng khắc phục), PLAN_ADHERENCE (PPL↔WKM/SCM),
  GROSS_MARGIN (FIN↔SCM↔D-PROD). Tất cả đã có `attribution_rule` tách nguyên
  nhân cụ thể.

## Finding chuyển tiếp

| # | Mô tả | Prompt |
|---|-------|--------|
| S03-01 | `action_reference` trỏ "CDR cổng Gx" nhưng chưa map mã CDR cụ thể trong ANNEX-121. | 05 |
| S03-02 | Counter-metric candidate (PROMISE_DATE_REVISION_RATE, SUPPLIER_IQC_PASS_RATE…) chưa là metric thật — cần data contract. | 04 |
| S03-03 | `attribution_rule` cần `breakdown` thật từ KpiEngine để tách nguyên nhân khi tính. | 04 |
| S03-04 | 11 P2 `LEGACY_ALIAS_USED` vẫn tồn. | 07 |

---
*Stage 03 hoàn tất. Tiếp theo: Prompt 04 — `04-data-contracts-and-compute.md`.*
