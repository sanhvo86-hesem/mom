# 00 — Quy tắc bất biến (đọc trước MỌI prompt 01→09)

Mọi prompt trong thư mục này kế thừa các quy tắc dưới đây. Vi phạm = dừng và sửa.

## A. Đọc trước khi làm
- `.ai/AI-WORKFLOW.md`, `.ai/CONVENTIONS.md`, `AGENTS.md`, `CLAUDE.md`,
  `.ai/repo-map.json`.
- Chạy `bash tools/ai/preflight.sh` đầu phiên (ghi branch_base_sha, bật githooks).
- `README.md` của thư mục này (ngữ cảnh hiện trạng KPI).

## B. Ngôn ngữ
- Backend (PHP, SQL identifier, log, comment, commit message) = **tiếng Anh**.
- Nội dung tài liệu / nhãn UI / cột `_vi` = **tiếng Việt CÓ DẤU đầy đủ**, văn
  phong chuyên gia xưởng cơ khí CNC. Tuyệt đối không để lại câu máy dịch
  ("nút thắt / điểm nghẽn", "Quyền / Đúng-đầu-tiên-time", "người chịu trách
  nhiệm" lặp máy móc…). Thuật ngữ chuẩn ngành giữ tiếng Anh (OEE, FPY, DPMO,
  takt, gate, FAI, CAPA).

## C. Đồ họa
- KHÔNG hardcode màu/font/size/spacing. Dùng Graphics Authority
  (`window.GraphicsAuthority.tokens.read(...)`, CSS `var(--accent)`…).

## D. Change-control KPI (ANNEX-127 §7 — BẮT BUỘC)
Mọi thay đổi 1 KPI/metric (tạo, đổi tên, đổi target/ngưỡng, đổi trọng số, đổi
owner, đổi công thức/backend, đổi vị trí dùng) phải cập nhật ĐỒNG THỜI trong
cùng một change:
1. Registry `mom/data/registry/kpi-authority-registry.json`.
2. `ANNEX-122` (KPI cascade dictionary).
3. `ANNEX-128` (KPI system matrix) — regenerate bằng audit script.
4. Mọi SOP/WI/JD/ANNEX/training tài liệu liên quan.
5. `KpiEngine` + data contract nếu ảnh hưởng backend.
6. Report bằng chứng trong `_reports/kpi/`.
Nếu một trong các mục trên chưa cập nhật → thay đổi KPI **chưa hoàn tất**,
không được commit như đã xong.

## E. Audit sau mỗi thay đổi
Chạy lại 3 script và đính report mới vào `_reports/kpi/`:
```
php tools/scripts/kpi/audit-html-kpis.php
php tools/scripts/kpi/audit-kpi-performance-governance.php
php tools/scripts/kpi/audit-kpi-system-matrix.php
```
Audit fail (P0) → sửa sạch trước khi commit.

## F. Quy tắc "KPI thực chiến" (kim chỉ nam của cả bộ prompt)
1. **Không tính được = không phải KPI.** Mỗi KPI phải có data contract: bảng/cột
   thật trong DB hoặc form/log cụ thể. KPI không nguồn dữ liệu → hoặc cấp nguồn,
   hoặc hạ xuống `health_indicator`, hoặc khai tử trung thực. Không để KPI giấy.
2. **Không ra quyết định = không phải KPI.** Mỗi KPI gắn 1 quyết định/hành động
   (resource, priority, gate hold, CAPA, training, reward, Hoshin). Đỏ mà không
   ai biết làm gì → KPI hỏng.
3. **Định lượng.** Tử số, mẫu số, đơn vị, rule làm tròn, trường hợp loại trừ,
   ngưỡng xanh–vàng–đỏ định lượng, chiều tốt (higher/lower is better).
4. **Owner có thực quyền.** Owner phải có thẩm quyền + nguồn lực xử lý kết quả,
   không phải người chỉ nhập số.
5. **Công bằng, chống gaming.** KPI dùng cho đánh giá/khen thưởng phải có
   counter-metric (an toàn / chất lượng / khách hàng / toàn vẹn dữ liệu) và
   quy tắc attribution công bằng. KPI để hệ thống chạy đúng, KHÔNG để bộ phận
   này đổ lỗi bộ phận kia.
6. **Lead + lag ghép cặp.** KPI kết quả (lag) đi cùng KPI phòng ngừa (lead).
7. **Không over-aggregate.** Tách theo khách hàng / nhóm sản phẩm / cổng khi
   cần tìm nút thắt.

## G. Tự phản biện bắt buộc
Mỗi prompt có mục "Tự phản biện". Phải thực hiện 3 vòng quét độc lập, gay gắt,
toàn diện. Tự hỏi: KPI này có gây gaming không? Có thể tính từ dữ liệu thật
không? Đỏ thì ai làm gì? Có làm khó bộ phận khác một cách bất công không? Tình
huống biên nào chưa xử lý? Ghi câu trả lời vào report của stage.

## H. Quy trình deploy mỗi stage
1. Sửa file.
2. Validate: `php -l <file>` mọi PHP; `node --check <file>` mọi JS; 3 audit
   script PASS; `php tools/release/check_kpi_integrity.php` PASS (sau khi
   prompt 08 tạo ra nó).
3. Commit 1 — code + registry + seed:
   `git commit -m "feat(kpi): … (Stage N)"`.
4. Commit 2 — tài liệu `mom/docs/**`:
   `ALLOW_DOC_COMMIT=1 git commit --no-verify -m "docs(kpi): …"`
   (nêu rõ lý do cấu trúc trong message).
5. `git push` → chờ GitHub Actions deploy XANH (`gh run list --workflow Deploy`).
6. Verify trên Chrome live `https://eqms.hesemeng.com/mom/portal.html`. Nếu
   phiên không phải admin, inject module bằng JS để kiểm (xem cách ở prompt 09).

## I. An toàn VPS (CLAUDE.md — tuyệt đối)
- KHÔNG `git reset --hard` / `git restore` / `git clean` trên VPS.
- KHÔNG sửa trực tiếp `mom/data/config/*.json` hay `mom/data/registry/*.json`
  trên VPS bằng vi/sed/cat. Thay đổi đi qua git + deploy, hoặc qua Console.
- Runtime store stale: nếu đổi schema registry, dùng cơ chế "schema-version
  gate" như KpiEngine/RaciMatrixService — seed mới hơn thì bỏ qua runtime cũ.

## J. Định nghĩa hoàn thành chung (Definition of Done mỗi stage)
- 3 audit script PASS; `check_kpi_integrity.php` PASS.
- Không còn câu tiếng Việt máy dịch trong file đã đụng.
- Deploy GitHub Actions xanh.
- Verify Chrome thực tế (ảnh chụp hoặc dump API).
- Report stage lưu trong `_reports/kpi/` kèm kết quả tự phản biện.
- `git status` sạch (trừ file runtime gitignored).
