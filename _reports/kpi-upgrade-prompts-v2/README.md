# KPI CNC Practical Upgrade Prompt Pack v2 — HESEM MOM

Ngày tạo: 2026-05-22  
Repo mục tiêu: `sanhvo86-hesem/mom`  
Mục tiêu: biến hệ KPI thành công cụ điều hành sản xuất CNC thật sự, không phải bộ chỉ số “làm cho có”.

## Điểm khác biệt của v2

Bộ prompt đính kèm ban đầu đã rất mạnh ở hướng “registry = SSOT, data contract, gate CDR, admin console, CI guard”. Tuy nhiên khi rà repo `main`, hệ thống đã đi xa hơn baseline cũ: registry đã có `schema_version`, danh sách runtime 28 mã, counter-metric riêng, KPI Admin Console, manual input endpoint và CI integrity guard. Vì vậy v2 **không yêu cầu Claude Code làm lại từ đầu**. V2 yêu cầu Claude Code:

1. Audit current state trước, không giả định baseline cũ còn đúng.
2. Gỡ các dấu hiệu drift còn sót: comment “33 KPI”, vùng ANNEX-122 §9 chưa chắc được regenerate, overlay console cho KPI mới có thể phá SSOT, min_sample guard có thể bỏ sót `percent`.
3. Graduate thêm KPI thật từ dữ liệu vận hành CNC, đặc biệt constraint/TOC, FAI/PPAP, control plan, IQC, MTBF/MTTR, cycle-time variance, repeat NCR, CAPA effectiveness, ship packet, promise-date risk.
4. Đưa KPI đi vào đời sống sản xuất: tier meeting, owner action, role measures, dashboard, manual/counter-metric data entry, gating CDR.
5. Không để KPI dùng cho thưởng/phạt nếu thiếu counter-metric, thiếu controllability hoặc thiếu evidence.

## Cách dùng nhanh với Claude Code

1. Giải nén zip vào repo hoặc thư mục làm việc.
2. Đưa Claude Code đọc theo thứ tự:
   - `04_CLAUDE_CODE/master-execution-instruction.md`
   - `02_PROMPTS_V2/00-ground-rules-v2.md`
   - `01_RESEARCH/00-repo-current-state-and-risks.md`
   - `01_RESEARCH/01-global-cnc-kpi-research.md`
3. Chạy prompt tuần tự từ `02_PROMPTS_V2/01...` đến `11...`.
4. Sau prompt 01, có thể chạy song song một số track theo `03_PARALLEL_TRACKS/README-parallel-plan.md`.

## Cấu trúc zip

| Thư mục | Nội dung |
|---|---|
| `00_ORIGINAL_UPLOADED_BASELINE/` | Bộ prompt gốc người dùng đã đính kèm, giữ nguyên để đối chiếu. |
| `01_RESEARCH/` | Nghiên cứu repo hiện tại + nghiên cứu vận hành CNC toàn cầu + thư viện KPI + risk register. |
| `02_PROMPTS_V2/` | Bộ prompt thực thi v2, đã điều chỉnh theo trạng thái repo hiện tại. |
| `03_PARALLEL_TRACKS/` | Cách chia việc để nhiều Claude Code sessions chạy song song an toàn. |
| `04_CLAUDE_CODE/` | Master instruction, validation checklist, DoD, quy ước commit/deploy. |
| `05_TEMPLATES/` | Template audit report, data contract, calculator spec, evidence checklist. |

## Nguyên tắc lõi

- Không tính được từ dữ liệu thật hoặc form/log được kiểm soát thì không gọi là KPI.
- KPI đỏ phải kéo một hành động vận hành cụ thể: hold gate, recovery plan, CAPA, training, resource escalation, change-control.
- KPI dùng cho thưởng/đánh giá phải có counter-metric và attribution rule.
- KPI job-shop CNC phải đủ lead + lag: plan/material/readiness trước, delivery/quality/cost sau.
- Đo theo điểm thắt cổ chai, không chỉ đo trung bình toàn xưởng.
- Không đẩy staged/manual KPI lên scorecard điều hành như thể có dữ liệu thật.
- Cấm hardcode số lượng KPI. Số lượng cuối là kết quả phân tích, không phải mục tiêu.

## Gợi ý thứ tự chạy

Tuần tự bắt buộc:
`00 → 01 → 02`

Sau `02`, có thể chạy song song:
- Track B: data contracts + runtime calculators.
- Track C: gate CDR + quality/customer escape.
- Track D: dashboard/admin console/manual input UX.
- Track E: JD/tier meeting/training/docs.

Sau song song, quay về tuần tự:
`09 CI guard → 10 Vietnamese/audit readiness → 11 final deploy/live verification`.

## Kết quả mong muốn cuối

- Registry là SSOT có đủ formula, thresholds, data_source, owner, action, counter_metric, calculation_status.
- ANNEX-122/127/128/129/110/WI-202/JD khớp registry.
- KpiEngine tính được những KPI runtime trọng yếu, còn KPI manual/staged có nhãn rõ.
- Admin Console không làm hỏng SSOT; chỉ sửa field được phép hoặc tạo change request.
- CI guard bắt drift thật, không hardcode “33 KPI”.
- Dashboard/Tier Meeting hiển thị action cụ thể, không chỉ hiển thị số.
- Có báo cáo trước/sau, gap còn lại và kế hoạch cấp nguồn dữ liệu.
