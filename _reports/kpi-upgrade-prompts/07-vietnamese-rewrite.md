# 07 — Viết lại tiếng Việt chuyên gia cho tài liệu KPI

**Loại:** sửa nội dung tài liệu (không đổi số liệu). **Stage 6.**
**Tiên quyết:** prompt 02–05 xong (nội dung KPI đã ổn định).

## Vấn đề
ANNEX-122 và một số tài liệu KPI chứa tiếng Việt máy dịch hỏng nặng, ví dụ đã
thấy khi khảo sát: "Quyền / Đúng-đầu-tiên-time final phát hành", "trên / vượt
quá-tổng hợp", "nút thắt / điểm nghẽn" lặp máy móc, "người chịu trách nhiệm"
dùng máy móc thay cho "người phụ trách / chủ KPI". Đây là khe hở thể diện khi
khách hàng audit.

## Phạm vi
- `ANNEX-122` (toàn bộ §1–§9).
- `ANNEX-128` (phần văn bản, không đụng bảng matrix sinh tự động — bảng do
  audit script sinh; nếu bảng có chữ máy dịch thì sửa nguồn ở registry/ANNEX-122
  rồi regenerate, KHÔNG sửa tay bảng).
- `ANNEX-110` (Dashboard KPI Dictionary).
- Bảng KPI trong `WI-202`.
- Danh sách câu cần sửa lấy từ mục 5 báo cáo audit prompt 01.

## Quy tắc viết (theo memory `feedback_vietnamese_technical_writing`)
1. Đọc hiểu trọn đoạn → VIẾT LẠI như chuyên gia QA/vận hành xưởng cơ khí CNC
   trình bày cho kỹ sư và quản đốc. KHÔNG vá từng từ.
2. Thuật ngữ chuẩn ngành giữ tiếng Anh: OEE, FPY, DPMO, OTD, takt, gate, FAI,
   PPAP, CAPA, NCR, COPQ, WIP, DSO, MTBF, MTTR, TOC, BSC, Hoshin. Phần diễn
   giải xung quanh bằng tiếng Việt tự nhiên, đúng văn phong xưởng.
3. Thuật ngữ vận hành dịch chuẩn, nhất quán: bottleneck = "điểm thắt cổ chai"
   (chọn 1 cách, dùng xuyên suốt — không "nút thắt / điểm nghẽn"); owner KPI =
   "người phụ trách KPI" hoặc "chủ KPI"; first-time-right = "đạt ngay lần đầu";
   right-first-time = "đúng ngay lần đầu"; turnaround time = "thời gian quay
   vòng"; aging = "thời gian tồn đọng".
4. 3 vòng quét độc lập, iterate đến khi không còn câu máy dịch.
5. TUYỆT ĐỐI không đổi: mã KPI, target, ngưỡng, công thức, owner, số liệu —
   chỉ đổi câu chữ diễn giải.

## Tự phản biện bắt buộc
- Đọc lại từng đoạn: một quản đốc xưởng CNC đọc có hiểu ngay không?
- Có thuật ngữ nào dịch không nhất quán giữa 3 ANNEX không?
- Có vô tình đổi một con số/mã nào không? (so diff cẩn thận)
- Bảng matrix ANNEX-128 còn chữ máy dịch không → sửa nguồn rồi regenerate.

## Tình huống & cách xử lý
- Một câu vừa là định nghĩa KPI vừa máy dịch → viết lại nhưng giữ chính xác
  ngữ nghĩa định lượng; nếu nghi ngờ ý gốc, đối chiếu registry.
- ANNEX-128 sinh tự động chứa chữ xấu → sửa ở registry/ANNEX-122 (nguồn) →
  `php tools/scripts/kpi/audit-kpi-system-matrix.php` regenerate.

## Definition of Done
- Không còn câu tiếng Việt máy dịch trong ANNEX-122/-110/-128(văn bản)/WI-202.
- Thuật ngữ nhất quán toàn bộ tài liệu KPI.
- `git diff` xác nhận không số liệu/mã nào bị đổi.
- 3 audit script PASS (kết quả định lượng không đổi).
- Commit docs (`ALLOW_DOC_COMMIT=1`): `docs(kpi): expert Vietnamese rewrite`.
- Deploy xanh; verify Chrome đọc ANNEX-122 sạch.
