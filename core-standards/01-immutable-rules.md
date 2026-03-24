# 01 — Quy tắc bất biến (Immutable Rules)

> Các quy tắc trong file này **KHÔNG BAO GIỜ** được vi phạm, bất kể hoàn cảnh nào.
> Vi phạm bất kỳ quy tắc nào dưới đây sẽ phá vỡ tính nhất quán của toàn bộ hệ thống QMS.

---

## A. Quy tắc tên file, đường dẫn, và mã nguồn

### A1. Tên file và thư mục — LUÔN LUÔN tiếng Anh

Tên file, tên thư mục, đường dẫn (path) **LUÔN LUÔN** là tiếng Anh — **KHÔNG BAO GIỜ** dịch sang tiếng Việt.

```
✅ sop-101-document-and-data-control.html
✅ wi-201-quality-gates-hold-points-and-release-execution.html
✅ 03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/

❌ sop-101-kiem-soat-tai-lieu-va-du-lieu.html
❌ 03-Tai-Lieu-Van-Hanh/01-Quy-Trinh/
```

### A2. Thuộc tính HTML — KHÔNG dịch

Các thuộc tính HTML sau **KHÔNG BAO GIỜ** được dịch:
- `href` — đường dẫn liên kết
- `class` — tên class CSS
- `id` — định danh phần tử
- `src` — đường dẫn tài nguyên
- `style` — thuộc tính CSS inline
- `data-*` — thuộc tính dữ liệu
- `name` — tên trường form
- `value` — giá trị ẩn của trường form (value hiển thị có thể dịch)

```html
✅ <a href="../sop-101-document-and-data-control.html" class="doc-link">
✅ <div id="docContent" class="doc-content">

❌ <a href="../sop-101-kiem-soat-tai-lieu.html" class="lien-ket-tai-lieu">
```

### A3. CSS và JavaScript — KHÔNG dịch

Toàn bộ nội dung trong thẻ `<style>` và `<script>` **KHÔNG BAO GIỜ** được dịch. Bao gồm:
- Tên biến CSS (`--navy`, `--blue`, `--gold`)
- Tên class (`.form-header`, `.doc-content`, `.callout`)
- Tên hàm JavaScript
- Comment trong code (giữ nguyên tiếng Anh)

---

## B. Viết tắt và thuật ngữ giữ nguyên tiếng Anh

### B1. Viết tắt — LUÔN giữ nguyên

Các viết tắt sau **LUÔN** giữ nguyên tiếng Anh trong mọi ngữ cảnh:

**Hệ thống quản lý:**
QMS, QA, QC, NCR, CAPA, DCR, SOP, WI, FRM, ANNEX, REC, RPT, CERT, ISO, AS9100D, PDCA

**Thương mại & chuỗi cung ứng:**
RFQ, PO, CSR, CoC, CoA, POD, BOM, Incoterms

**Chất lượng & đo lường:**
KPI, OTD, FPY, COPQ, MSA, SPC, IPQC, FAI, FMEA, PFMEA, CTQ, ALCOA, AQL

**Kỹ thuật & sản xuất:**
CNC, NC, DFM, CAM, CMM, 3D, ASME, ASTM, SMED, LOTO, MTTR

**Hệ thống thông tin:**
SSOT, SoR, RACI, RBAC, ERP, MES, PDF, M365

**Quản lý & vận hành:**
FIFO, FEFO, PDCA, SCAR, SBAR, TIMWOODS, SSCC

**Mã tài liệu:**
SOP-101, WI-201, FRM-301, ANNEX-111 — toàn bộ mã tài liệu giữ nguyên dạng gốc

### B2. Thuật ngữ ngành — giữ nguyên tiếng Anh

Các thuật ngữ ngành sau giữ nguyên tiếng Anh khi dùng trong văn bản tiếng Việt:
- **Sản xuất:** Setup, Traveler, Balloon
- **Phần mềm:** Epicor, SharePoint, M365, Zalo
- **Phương pháp:** Kaizen, Dreyfus, Pareto, Kolb
- **Vật liệu:** PEEK, Vespel, PTFE
- **Tiêu chuẩn:** SEMI

### B3. Nhãn metadata — giữ nguyên tiếng Anh

Các nhãn metadata trong header tài liệu sử dụng tiếng Việt theo quy ước đã chuẩn hóa:

| Nhãn hiển thị | Nội dung |
|----------------|----------|
| **Mã:** | Mã tài liệu (SOP-101, WI-201...) |
| **Phiên bản:** | V0, V1, V2... |
| **Ngày hiệu lực:** | Ngày hoặc "Theo quyết định ban hành" |
| **Chủ sở hữu:** | Phòng ban chịu trách nhiệm |
| **Phê duyệt:** | Người/chức vụ phê duyệt |

Mã tài liệu (SOP-101, WI-201, FRM-301, ANNEX-111) **LUÔN** giữ nguyên tiếng Anh.

---

## C. 23 Quy tắc khóa (Locked Rules)

Các quy tắc sau được khóa vĩnh viễn và áp dụng cho mọi tài liệu QMS:

### Cấu trúc & tổ chức

1. **Giữ cấu trúc thư viện hiện hành làm khung đích.** Không tự ý thay đổi cấu trúc thư mục đã thiết lập.

2. **Không đổi tên file/slug/mã tài liệu.** Mã tài liệu và tên file đã ban hành là cố định.

3. **Chỉ Việt hóa nội dung bên trong.** Tên file, thuộc tính HTML, CSS, JS giữ nguyên tiếng Anh.

4. **Chỉ giữ tên phòng ban, thuật ngữ, viết tắt khi thật sự cần.** Ưu tiên tiếng Việt cho nội dung, chỉ giữ tiếng Anh cho viết tắt và thuật ngữ không có tương đương chính xác.

### Chất lượng ngôn ngữ

5. **Ngôn ngữ phải ngắn, rõ, dùng để thi hành.** Không viết dài dòng, hàn lâm, hoặc mơ hồ.

6. **Không meta text, không "AI generated", không giải thích nguồn gốc tài liệu.** Tài liệu phải đọc như do chuyên gia QMS viết, không phải do máy sinh.

7. **Mỗi câu phải phục vụ vận hành thật.** Không viết câu "cho có", không thêm nội dung chỉ để lấp chỗ trống.

### Tính toàn vẹn nội dung

8. **Không cắt xén logic vận hành.** Khi biên tập, giữ nguyên toàn bộ logic nghiệp vụ — chỉ cải thiện ngôn ngữ.

9. **Form phải bám SOP/WI/ANNEX active, không tự bịa logic riêng.** Biểu mẫu là lớp ghi nhận dữ liệu cho quy trình đã định nghĩa.

10. **Phần thiếu mới được bổ sung từ thực hành quốc tế, nhưng phải hòa vào ngôn ngữ HESEM.** Không copy nguyên văn từ tiêu chuẩn hoặc tài liệu bên ngoài.

11. **Không để mất nội dung quan trọng do đơn giản hóa quá mức.** Đơn giản hóa ngôn ngữ, không đơn giản hóa nội dung.

### Phân loại tài liệu

12. **SOP là lớp điều hành; WI là hướng dẫn tại điểm dùng; ANNEX là rule-pack; FORM là nơi ghi dữ liệu/evidence/quyết định.**
    - SOP: quy trình cấp quản lý, logic ra quyết định, trách nhiệm
    - WI: hướng dẫn từng bước tại hiện trường, ai làm gì khi nào
    - ANNEX: tiêu chí, bảng tra, quy tắc tham chiếu
    - FORM: biểu mẫu ghi nhận dữ liệu, bằng chứng, quyết định

13. **Không để form chồng lấn trách nhiệm hoặc duplicate dữ liệu vô ích.** Mỗi trường dữ liệu chỉ ghi một lần tại nguồn phù hợp nhất.

14. **ANNEX thay REF cho tài liệu nội bộ hiệu lực.** Không dùng mã REF cho tài liệu tham chiếu nội bộ — dùng ANNEX.

### Đồng bộ hệ thống

15. **Đồ họa và logic phải đồng bộ toàn hệ thống.** Màu sắc, font, layout, mã tài liệu phải nhất quán từ SOP đến FORM.

16. **Form phải thể hiện gate, hold point, release logic, KPI, owner, approver khi cần.** Form không chỉ là bảng trống — phải phản ánh quy trình kiểm soát.

### Thực tiễn vận hành

17. **Phải đúng mô hình nhà máy CNC job order, dùng được ngoài hiện trường.** Tài liệu phải phù hợp với quy mô và đặc thù HESEM, không phải nhà máy lý tưởng.

18. **Ưu tiên chất lượng hơn số lượng.** Một tài liệu tốt hơn mười tài liệu hời hợt.

19. **Tên file vẫn là English slug.** Mọi tên file dùng kebab-case tiếng Anh, không dấu, không khoảng trắng.

20. **Không tạo mơ hồ khiến nhân viên không biết điền gì, ký gì, quyết gì.** Mỗi trường, mỗi ô ký phải rõ ràng: ai, gì, khi nào, tiêu chí gì.

21. **"Bơm sâu" là tăng chiều sâu chuyên môn và tính thực chiến, không phải thêm chữ cho dày.** Giá trị nằm ở độ sâu nội dung, không phải độ dài.

22. **Phải phù hợp mục tiêu ISO 9001:2015 và sẵn sàng cho AS9100D ở mức thực tế HESEM.** Không đặt thanh quá cao đến mức không triển khai nổi, cũng không hạ quá thấp.

23. **Khi thiết kế form phải nhìn vào product safety, traceability, external providers, evidence discipline, human factors, operational risk nếu form đó liên quan.** Form là lớp cuối cùng bắt rủi ro — phải thiết kế có chủ đích.

---

## D. Thương hiệu và đồ họa

### D1. Brand Colors

| Tên | Mã hex | Biến CSS | Dùng cho |
|-----|--------|----------|----------|
| Navy | `#0C2D48` | `--navy` | Tiêu đề, heading, header |
| Blue | `#1565C0` | `--blue` | Link, accent chính |
| Light Blue | `#E3F2FD` | `--blue-l` | Nền note, highlight nhẹ |
| Gold | `#F9A825` | `--gold` | Border accent, callout |
| Light Gold | `#FFF8E1` | `--gold-l` | Nền callout |
| Ink | `#212529` | `--ink` | Text chính |
| Red | `#E03131` | `--red` | Cảnh báo, lỗi |
| Green | `#2F9E44` | `--green` | Thành công, approved |

**Quy tắc:** Không dùng màu tùy ý ngoài bảng trên. Mọi tài liệu phải dùng đúng palette này.

### D2. Print Layout

| Thuộc tính | Giá trị |
|------------|---------|
| Khổ giấy | A4 (mặc định), A3 (bảng lớn) |
| Font | Segoe UI hoặc tương đương |
| Font size gốc | 14px |
| Line height | 1.6 |
| Tràn bảng | **KHÔNG** — mọi bảng phải vừa khổ giấy |
| Màu loè loẹt | **KHÔNG** — chỉ dùng palette đã định nghĩa |
| Page break | `page-break-inside: avoid` cho mọi block |

### D3. Header tài liệu

Mọi tài liệu HTML **PHẢI** có header chuẩn gồm:
- **Brand row:** Logo HESEM + tên công ty
- **Title block:** Mã tài liệu + tên tài liệu
- **Meta box:** Mã, Phiên bản, Ngày hiệu lực, Chủ sở hữu, Phê duyệt

Footer phải có số trang và nhận diện tài liệu.

---

## E. Single Source of Truth (SSOT)

### E1. Phân tầng hệ thống

| Hệ thống | Vai trò | Loại dữ liệu |
|-----------|---------|---------------|
| **Epicor** | System of Record (SoR) | Giao dịch ERP: đơn hàng, sản xuất, kho, tài chính |
| **M365 (SharePoint)** | Single Source of Truth (SSOT) | Tài liệu QMS, hồ sơ kiểm soát, chính sách |
| **Excel (Forms)** | Gate / Evidence / Decision layer | Biểu mẫu ghi nhận, checklist, log quyết định |

### E2. Quy tắc không trùng lặp

- **Không duplicate dữ liệu giữa các hệ thống.** Mỗi data point chỉ có một nguồn chính thức.
- Epicor là nguồn cho dữ liệu giao dịch — không copy vào SharePoint.
- SharePoint là nguồn cho tài liệu — không lưu bản copy trên ổ cá nhân.
- Form Excel chỉ ghi dữ liệu mà SOP/WI yêu cầu — không thêm trường ngoài phạm vi.

### E3. Liên kết hệ thống

- Tài liệu HTML trên web tham chiếu đến form bằng link download
- Form Excel tham chiếu ngược về SOP/WI/ANNEX bằng mã tài liệu
- Portal (`portal.html`) là điểm truy cập trung tâm cho toàn bộ hệ thống

---

## F. Kiểm tra tuân thủ

Trước khi hoàn thành bất kỳ tài liệu nào, kiểm tra:

- [ ] Tên file là English slug, kebab-case, không dấu
- [ ] Thuộc tính HTML (href, class, id, src) không bị dịch
- [ ] CSS/JS nguyên bản, không dịch
- [ ] Viết tắt giữ nguyên tiếng Anh
- [ ] Mã tài liệu giữ nguyên (SOP-101, WI-201, FRM-301, ANNEX-111)
- [ ] Brand colors đúng palette
- [ ] In được A4/A3, không tràn bảng
- [ ] Font Segoe UI
- [ ] Header đúng cấu trúc chuẩn
- [ ] Không meta text, không "AI generated"
- [ ] Mỗi câu phục vụ vận hành thật
- [ ] Form bám SOP/WI/ANNEX, không tự bịa logic
- [ ] Không duplicate dữ liệu giữa các hệ thống

---

> **Cập nhật lần cuối:** 2026-03-24
> **Áp dụng:** Toàn bộ tài liệu QMS — HESEM ENGINEERING
