# HESEM FORM TEMPLATE BRIEF v1

## Mục tiêu
Tạo **Excel form** dùng trực tiếp để ghi dữ liệu, in A4 rõ ràng, header đồng bộ với SOP/WI/ANNEX của HESEM.

## Khoá bắt buộc
- Không đổi tên file/slug đã chốt.
- Header phải đồng bộ phong cách HESEM: navy `#0C2D48`, blue `#1565C0`, gold `#F9A825`.
- A4 printable, 1 page width, gridline off, margin gọn, footer có mã form và số trang.
- Chỉ ô màu xanh nhạt là ô nhập liệu.
- Không dùng ngôn ngữ giải thích rườm rà. Câu chữ ngắn, mệnh lệnh, rõ người dùng phải làm gì.
- Mỗi form phải có: reference block, gate/decision block, checklist/evidence block, action/escalation block, approval block.
- Nếu là form tác nghiệp ngoài xưởng: phải có job no / part no / rev / operation / shift / date / operator / QA hold logic.
- Không tạo layout đẹp nhưng khó nhập.
- Không dùng icon, shape, watermark gây nhiễu.

## Thiết kế
- Font: Segoe UI 9–11 pt; title 16 pt bold.
- Brand row navy nền trắng chữ.
- Meta box góc phải: mã, rev, effective date, owner, approver.
- Section header xanh đậm chữ trắng.
- Label ô: nền xám nhạt hoặc xanh bảng; input ô: xanh rất nhạt.
- Border mảnh, đều, chuyên nghiệp.
- Signature boxes đủ chỗ ký tay khi in.

## Sheet master phải có
1. MASTER-TEMPLATE
2. EXAMPLE-FRM-202
3. LISTS (hidden) cho dropdown

## Data validation
- PASS/HOLD/FAIL/NA
- APPROVED/REJECTED/CONDITIONAL/ON HOLD
- OPEN/IN PROGRESS/CLOSED/MONITORING
- LOW/MEDIUM/HIGH/CRITICAL

## Điều cấm
- Không tô quá nhiều màu.
- Không để text nhỏ khó in.
- Không merge tràn lan gây khó nhập.
- Không dùng bảng quá rộng vượt A4.
- Không nhắc “AI”, “generated”, “from merged document”.

## Locked rules inherited from document system
- Giữ cấu trúc thư viện hiện hành làm khung đích.
- Không dịch tên file/slug/mã tài liệu.
- Chỉ Việt hoá nội dung bên trong.
- Giọng văn ngắn, rõ, dùng để thi hành.
- Không meta text, không mùi AI.
- Form phải bám SOP/WI/ANNEX active, không tự bịa logic.
- Form phải có gate, owner, evidence, decision và approval khi cần.
- Không tạo chồng lấn giữa form này với form khác.
- Không duplicate dữ liệu nếu đã có SoR/SSOT trong Epicor/M365; chỉ ghi dữ liệu cần để ra quyết định và lưu bằng chứng.
- Print được, điền được, ai cầm vào cũng biết phải làm gì và phải ký/nhập gì.
- Thiết kế phải phù hợp mục tiêu ISO 9001:2015 (revision-ready) và sẵn sàng cho AS9100D ở mức thực tế HESEM.
