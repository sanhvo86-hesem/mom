# KPI Stage 07 — Expert Vietnamese Rewrite (2026-05-22)

**Prompt:** `_reports/kpi-upgrade-prompts/07-vietnamese-rewrite.md`
**Kết quả:** Tài liệu KPI hết tiếng Việt máy dịch; thuật ngữ nhất quán.

## Việc đã làm

1. **ANNEX-122 §1/§2/§3/§7/§8** — 34 câu/cụm viết lại thành tiếng Việt chuyên
   gia xưởng CNC. §4/§5/§6/§9 là bảng sinh từ registry, đã sạch từ stage 02–05.
2. **ANNEX-110** — 1 cụm "nút thắt / điểm nghẽn" → "điểm thắt cổ chai".
3. **ANNEX-128** regenerate từ nguồn đã sạch. 3 audit PASS.
4. Thuật ngữ chuẩn hóa nhất quán:
   - bottleneck → "điểm thắt cổ chai" (bỏ "nút thắt / điểm nghẽn" máy dịch).
   - owner → "người phụ trách" (bỏ calo máy "người chịu trách nhiệm" lặp).
   - "Level 1/2/3" → "Lớp 1/2/3"; "Value-luồng" → "Luồng giá trị".
   - "Link to quyết định" → "Gắn với quyết định"; "One nguồn sự thật" →
     "Một nguồn sự thật duy nhất"; "trên / vượt quá-tổng hợp" → "Gộp số liệu
     quá mức"; "Data đóng băng / cut-off" → "Chốt số / cut-off".
   - Thuật ngữ ngành giữ tiếng Anh: OEE, FPY, OTD, FAI, CAPA, NCR, SoR/SSOT,
     RFT, escalation.
5. **TUYỆT ĐỐI không đổi** mã KPI, target, ngưỡng, công thức, owner — đã
   verify tập hợp token chữ-hoa và token số byte-identical trước/sau.

## Phát hiện hạ tầng (quan trọng) — S07-DEPLOY

`tools/vps-setup/scripts/deploy.sh` đặt `RUNTIME_DOC_DIRS=(mom/docs/operations …)`
và `PRESERVE_RUNTIME_DOCS=1`: trước `git reset --hard` nó `rsync -a --delete`
TOÀN BỘ cây `mom/docs/operations` ra tmp, sau reset `rsync` trả lại. Hệ quả:
**mọi commit chỉnh tài liệu dưới `mom/docs/operations` qua git KHÔNG bao giờ
deploy lên VPS** — VPS giữ nguyên bản trên ổ đĩa.

→ ANNEX-122 trên VPS đã đứng ở bản pre-Stage-02 suốt Stage 02–06; các thay
đổi ANNEX-122/127/128/129/110 của Stage 02–07 chưa từng lên live (chỉ
registry JSON deploy được vì nằm ngoài `docs/operations`).

**Khắc phục Stage 07:** đồng bộ 5 doc KPI lên VPS bằng `scp` bản git HEAD
(các file VPS chỉ là seed cũ, không có runtime mutation — KPI Console chưa
từng chạy trên VPS nên không mất gì). Sau scp, capture/restore của deploy sẽ
giữ đúng bản này. Đã dọn file rác AppleDouble `._*` do scp từ macOS sinh ra.

Cơ chế preserve này đúng cho doc do Console tái tạo (RACI Console sửa
ANNEX-121 tại VPS), nhưng chặn nhầm cả chỉnh sửa doc hợp lệ qua git. Đề
xuất sửa deploy.sh chỉ preserve doc thực sự lệch git HEAD — ghi nhận, ngoài
phạm vi Stage 07.

## Verify

- 3 audit PASS (0 P0); ANNEX-128 regenerate sạch.
- Deploy GitHub Actions HEAD `aaf436a3` XANH.
- VPS live ANNEX-122 (sau scp): fetch no-store — 0 dấu máy dịch, đủ 6 thuật
  ngữ chuyên gia (điểm thắt cổ chai, Luồng giá trị, Gắn với quyết định, Gộp
  số liệu quá mức, Chốt số / cut-off, Lớp 1 — Cấp công ty).

## Tự phản biện

- **Quản đốc CNC đọc hiểu ngay?** Có — §2/§3/§7/§8 đọc tự nhiên, không còn
  câu calque. Văn phong hướng kỹ sư/quản đốc.
- **Thuật ngữ nhất quán 3 ANNEX?** Có — "điểm thắt cổ chai" thống nhất ở
  ANNEX-122 và ANNEX-110; "người phụ trách" thay calque máy.
- **Có đổi số/mã nào không?** Không — verify token chữ-hoa + token số
  identical. `git diff` chỉ chạm câu chữ diễn giải.
- **ANNEX-128 còn chữ máy dịch?** Không — regenerate từ nguồn đã sạch.

## Finding chuyển tiếp

| # | Mô tả | Prompt |
|---|-------|--------|
| S07-DEPLOY | deploy.sh preserve toàn bộ `mom/docs/operations` → commit doc qua git không deploy. Stage 07 đã scp khắc phục 5 doc KPI; nên sửa deploy.sh diff-aware. | 09 |
| S07-01 | "tuổi tồn" (calque nhẹ của aging) còn ở ANNEX-110/WI-202 — giữ vì là thuật ngữ đã dùng nhất quán toàn repo, đổi riêng sẽ gây lệch. | — |

---
*Stage 07 hoàn tất. Tiếp theo: Prompt 08 — `08-ci-integrity-guard.md`.*
