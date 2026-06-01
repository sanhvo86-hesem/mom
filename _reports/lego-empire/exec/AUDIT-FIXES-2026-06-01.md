# Exec · Audit nghiêm khắc + fix toàn bộ (Session A frontend)
### 2026-06-01

## Audit đa chiều các deliverable đã ship → 4 vấn đề + fix
1. **Search box Module Studio không wire** (UX bug — input decorative, không lọc). FIX: thêm `input` listener lọc live row library theo query, không re-render (giữ focus). `32-module-studio.js`.
2. **Module Studio không reachable + self-height** (mount inert; height:100% cần parent có chiều cao). FIX: (a) min-height:calc(100vh-130px) cho root để render đúng trong page container; (b) wire `window.ModuleStudio.render(tdp)` vào trang 'template-demo' (`02-state-auth-ui.js:3433`) — AN TOÀN: thay render DEMO M2-orders (không đụng builder 18K dòng), có fallback về demo/legacy nếu shell thiếu.
3. **Rename leftover** "Master Module Template" (4 chỗ) trong `DEMO-gpt-blueprint.js` (dead code, không load) → đổi "Module Studio" cho nhất quán.
4. (kiểm) isSsot dead-code: đã sạch từ v0.2; token-purity: 0 raw-hex; syntax 3 file OK.

## Sweep tìm-hết-lỗi (1 lượt trước deploy)
- node --check 32/02/DEMO OK; 0 "Master Module Template" còn lại; ModuleStudio wired; search listener present; no raw-hex.

## Verify live (1 lượt sau deploy)
- Bấm nav "Module Studio" → shell render trong page (3 cột, min-height đầy, search lọc, drill-down L3/L4).
- Regression check: brand #0c4a6e / control 32 / section 12 vẫn đúng (sau nhiều session deploy khác); console sạch.

## A11y follow-up (không chặn scaffold)
- Library rows + mode dùng div/button click — nên thêm role/keyboard nav (treegrid/tablist) ở bản hoàn thiện.
