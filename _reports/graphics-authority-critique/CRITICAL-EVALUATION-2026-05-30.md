# Phản biện kiến trúc Graphics Authority + ý tưởng "Lego SSOT"
## Đánh giá tính thực dụng — góc nhìn red team

**Ngày:** 2026-05-30
**Tư cách người viết:** phản biện (adversarial review), không phải người đề xuất ý tưởng.
**Cơ sở dữ liệu:** quét mã song song 3 hướng (dark-mode CSS, 8 tab đồ họa, hệ token/component), đọc `migration 148_graphics_authority_tables.sql`, `migration 255`, báo cáo `v3-G25c`, `CLAUDE.md`.
**Mục tiêu:** trả lời thẳng một câu hỏi — *Hệ thống này tạo ra giá trị tương xứng với chi phí, hay là một "thánh đường" governance đang ăn mòn thời gian lẽ ra dành cho tính năng QMS cốt lõi?*

> Lưu ý phương pháp: ở phiên này công cụ thực thi (Read/Bash) trả về rỗng ở bước xác minh cuối, nên các trích dẫn CSS/SQL dưới đây dựa trên kết quả quét đã thu được (có số dòng, trích nguyên văn). Mọi cáo buộc trong báo cáo đều gắn với bằng chứng cụ thể chứ không suy diễn.

---

## 0. Tóm tắt phán quyết (đọc cái này là đủ)

| Câu hỏi | Trả lời ngắn |
|---|---|
| Kiến trúc này có thực sự giúp ích không? | **Có — ở phần lõi. Không tương xứng — ở phần governance nặng.** |
| Lõi đáng giữ là gì? | Token catalog + CSS variable + luật no-hardcode + control-height 32px + master-density 2 núm + công cụ a11y/contrast. |
| Phần đang là chi phí chưa thu hồi? | 10 bảng governance (rollout/canary/waiver/experiment/theme_schedule/drift/lineage), scope 5 tầng, simulation_run như "bằng chứng" cho mọi edit. |
| Ý tưởng "Lego SSOT" (Build Packet/manifest) tôi nêu ở vòng trước? | **Đúng hướng nhưng dễ thành gold-plating nếu làm full ngay bây giờ.** Cần bản tối giản. |
| Bằng chứng kết tội mạnh nhất? | **Dark mode vẫn vỡ** dù có 10 bảng governance. Governance không bảo đảm đúng đắn. |
| Khuyến nghị một dòng | **Đông cứng tầng governance, dồn sức vào 3 gate CI rẻ + vá rò SSOT, hoãn Lego/manifest đến khi có tín hiệu nhu cầu thật.** |

---

## 1. Steelman — phải công nhận: hệ thống này giải quyết vấn đề CÓ THẬT

Một bản phản biện tử tế phải dựng phiên bản mạnh nhất của đối thủ trước khi đánh. Những giá trị sau là thật, đo được, và **nên giữ vô điều kiện**:

1. **No-hardcode + CSS variable.** Đây là lõi đúng. Đổi `brand.primary` một chỗ, ripple toàn UI. Chống "drift màu" — mỗi module một sắc xanh khác nhau — vốn là bệnh kinh điển của UI nhiều người/nhiều phiên AI sửa.
2. **Single control-height 32px + master-density 2 núm.** Triệt tiêu cả một lớp bug "toolbar lệch cao" (chip/nút/input mỗi thứ một chiều cao). Đây là quyết định kiến trúc tốt, rẻ, hiệu quả cao.
3. **`graphics_component_contract` whitelist token.** Ý tưởng "component chỉ được chỉnh đúng các token cho phép" là đúng (mô hình SLDS của Salesforce). Chống chỉnh bừa.
4. **An toàn đa phiên AI.** Token SSOT giúp nhiều phiên (Claude/Codex) không giẫm nhau về phong cách. Phù hợp đúng thực tế repo này.
5. **Khác biệt đúng ngành sản xuất.** `graphics_theme_schedule` (Andon day/night/maintenance-amber), color-mode `high-contrast` và `print` cho báo cáo ISO — đây là thứ hiếm và *đúng bối cảnh nhà máy*, không phải bắt chước web SaaS.
6. **Công cụ a11y/contrast.** Kiểm WCAG, mô phỏng mù màu — giá trị tuân thủ thật, đặc biệt cho doanh nghiệp hướng chứng nhận.

**Tiểu kết:** lõi token + no-hardcode + density + a11y là một nền móng tốt. Tranh luận không nằm ở đây.

---

## 2. Phản biện — chỗ kiến trúc KHÔNG kéo nổi sức nặng của chính nó

### 2.1 "Governance để trưng bày": 10 bảng, mà dark mode vẫn vỡ

Đây là cáo buộc trung tâm. `migration 148` dựng một bộ máy đồ sộ:
- `graphics_simulation_run` — *"mọi edit phải preview, ghi lại làm bằng chứng"*.
- `graphics_rollout_scope` — draft → staged → canary → applied → rolled-back.
- `graphics_waiver_governance`, `graphics_governance_audit_log`, drift detector, lineage graph.

Vậy mà: rail admin trong dark mode hiện **xám trắng glassy** (`.nav-section`/`.admin-nav-group` dùng `rgba(255,255,255,.88)` cứng — `portal.main.css:97, 991`), và ô input cỡ chữ hiện **chữ trắng trên nền trắng** (inline `color:var(--text-primary,#0f172a)` ở `00d-admin-appearance-theme.js:230`, nền không lật theo dark).

Hệ quả logic không thể chối: **bộ máy governance chạy SONG SONG với CSS thật, chứ không CHẶN được lỗi render.** Nó kiểm "ai đổi gì, khi nào" — không kiểm "kết quả có đúng không". Một hệ thống thiết kế trưởng thành phải làm cho *trạng thái sai trở nên bất khả thi*; ở đây trạng thái sai vẫn tồn tại đầy đủ, bên cạnh một cuốn sổ cái ghi chép tỉ mỉ. Đó là dấu hiệu kinh điển của **governance theater** — nghi thức quản trị chạy trước nhu cầu.

### 2.2 SSOT bị rò: có tới ba nguồn sự thật song song

Khẩu hiệu là "SSOT, không hardcode frontend". Thực tế có **ba** nguồn:
1. `design-system-config.json` (file JSON authority).
2. `graphics_token_value` (bảng PostgreSQL).
3. **Literal cứng** nằm ngoài cả hai: `rgba(255,255,255,.88)` trong `portal.main.css`, `color`/`background` inline trong JS admin.

Chính bug hôm nay sinh ra từ nguồn thứ ba — thứ mà cả hai "SSOT" không hề biết tới. Tệ hơn, báo cáo `v3-G25c` tự thừa nhận: *"live delivery là JS direct-setProperty path; migration chỉ là governance registration; origin/main ở migration 212 còn 213–255 nằm trên các nhánh AI."* Nghĩa là **đường runtime và đường governance đã phân kỳ**: cái thực sự vẽ lên màn hình đi một đường, cái được "đăng ký SSOT" đi đường khác, và migration token còn chưa vào main. SSOT trên giấy, không phải trong thực thi. Đây là rủi ro nặng hơn cả việc không có SSOT — vì nó tạo *ảo giác an toàn*.

### 2.3 Độ phức tạp không tương xứng quy mô thực

Hệ thống mang dáng dấp một design-system SaaS đa khách hàng:
- `scope_type`: **user / role / environment / tenant / organization** (5 tầng phân giải).
- `color_mode`: light / dark / high-contrast / print / andon / colorblind-*.
- 19 component contract, 16 preview scene, bảng `experiment` (A/B), `theme_schedule`.

Trong khi thực tế (theo memory dự án): ERP **nội bộ một tenant**, 50–200 user, một tổ chức. `tenant`/`environment`/`experiment` là tính năng cho thứ **không** đa-tenant. Đây là YAGNI ở cấp kiến trúc: trả chi phí phức tạp hôm nay cho một kịch bản chưa (và có thể không bao giờ) xảy ra.

Chi phí ẩn nguy hiểm hơn: **ma sát cao đẻ ra shadow-hardcode.** Muốn thêm một token phải qua catalog + contract + (đôi khi) preview scene + migration. Khi quy trình quá nặng, người ta lách bằng inline style — *đúng như bug dark mode đang chứng minh*. Governance càng nặng, áp lực đi đường tắt càng lớn. Hệ thống đang tự sinh ra chính thứ nó cấm.

### 2.4 Mâu thuẫn nội tại: cái nôi của chuẩn lại vi phạm chuẩn

Luật tối cao là "không hardcode frontend". Nhưng **Module Master** — catalog component được tôn là SSOT của thành phần tái dùng — lại được viết bằng **27 hàm JS hardcode** (`00c-admin-appearance-module-sample.js`, mỗi component một function trả HTML + danh sách token). Catalog Lego không phải dữ liệu => không query được, không tự kiểm, không tự sinh. Nơi định nghĩa chuẩn lại là nơi vi phạm tinh thần chuẩn. Đây không chỉ là chi tiết xấu xí — nó là lý do AI/CI hiện **không** "đọc danh sách Lego" được, mà phải đọc code (đúng vấn đề bạn muốn xóa).

### 2.5 Bằng chứng chi phí biên: câu chuyện v3-G25c

Báo cáo `v3-G25c` là một case study vô tình rất đắt giá cho bên phản biện. Tóm tắt cái đã xảy ra:
- 5 "dock knob" (chỉnh cỡ giá trị KPI, padding/cỡ chữ/độ đậm chip, cỡ chữ cell bảng) hóa ra là **no-op suốt nhiều slice (G19→G24)** vì giá trị bị hardcode trong CSS class, ngoài tầm với của các pass binding inline.
- Để 5 cái nút này thực sự chạy: phải thêm `migration 255` + 5 token chuyên dụng + một harness probe vá lỗi `transition:all` (đọc computed-style bắt nhầm giá trị cũ) + điều tra một file CSS bị CORS chặn enumeration.

Tức là: **gần một slice công + một migration + một cuộc điều tra kỹ thuật** chỉ để 5 cái nút chỉnh font trong một tab admin — thứ gần như không ai dùng hằng ngày — hoạt động đúng. Đây là tín hiệu chi phí biên cực cao so với giá trị tạo ra. Nếu mỗi tính năng cỡ "5 cái nút" đều tốn ngần ấy, thì hệ thống đang tiêu hóa năng lực phát triển nhanh hơn nó trả lại.

### 2.6 Nghịch lý cố hữu của chính ý tưởng "Lego" (tự phản biện đề xuất vòng trước)

Tôi phải đánh cả đề xuất của chính mình ở lượt trước (Build Packet/manifest):
- **UI nghiệp vụ hiếm khi lắp trọn từ block cố định.** Truy xuất lô, NCR, CAPA, MES operator station... có bố cục và tương tác đặc thù. Ép mọi thứ vào block dẫn tới một trong hai kết cục xấu: hoặc block phình ra vô số biến thể (mất tính "Lego", thành "mọi thứ cho mọi người"), hoặc module bị bóp méo cho vừa block (mất phù hợp nghiệp vụ — đuôi vẫy chó).
- **Chi phí duy trì một design-system thật sự rất lớn.** Carbon (IBM), Fiori (SAP), Atlassian DS tiêu tốn hàng chục kỹ-sư-năm và *vẫn* phải chừa "escape hatch". Một founder + các phiên AI khó duy trì tham vọng tương đương; nguy cơ là một hệ thống nửa vời — đủ nặng để cản, chưa đủ hoàn chỉnh để thay thế việc viết tay.
- **Manifest thêm một lớp gián tiếp.** Sau khi có Build Packet, sửa một module nhỏ phải đụng: manifest + định nghĩa block + token. Với module đơn giản, việc này **chậm hơn** viết thẳng HTML đã bind class. Lego chỉ thắng khi độ lặp đủ cao để khấu hao lớp gián tiếp đó.

---

## 3. Những câu hỏi thực dụng nhức nhối (chưa được trả lời)

Giá trị của governance phụ thuộc hoàn toàn vào các câu trả lời sau — và hiện chưa rõ:

1. **Ai dùng tab đồ họa này, và bao lâu một lần?** Nếu chỉ founder thỉnh thoảng chỉnh theme → toàn bộ rollout/canary/waiver/experiment/audit-trail là thừa. Bằng chứng/đối soát chỉ đáng giá khi có *nhiều người chỉnh thường xuyên và cần truy trách nhiệm*.
2. **Tần suất đổi token thực tế?** Nếu vài tháng một lần → `simulation_run` "ghi bằng chứng mọi edit" là sổ sách không ai đọc.
3. **Opportunity cost — đòn mạnh nhất.** Tính năng QMS nào đang bị trì hoãn vì thời gian đổ vào graphics governance? Với một ERP đang xây, mỗi giờ cho cơ sở hạ tầng theme là một giờ không dành cho NCR/CAPA/traceability — thứ trực tiếp tạo giá trị cho nhà máy.
4. **Đích đến là nội bộ hay SaaS thương mại?** Đây là biến quyết định (xem mục 6). Nó lật ngược phán quyết về "over-engineering".

---

## 4. Phán quyết phân tầng — giữ gì, đóng băng gì, cắt gì

| Thành phần | Giá trị thật | Chi phí duy trì | Khuyến nghị |
|---|---|---|---|
| Token catalog + CSS variable + no-hardcode | Cao | Thấp | **GIỮ (lõi)** |
| Control-height 32px + master-density 2 núm | Cao | Rất thấp | **GIỮ** |
| Công cụ a11y / contrast WCAG | Cao | Thấp | **GIỮ — biến thành CI check** |
| `design-system-config.json` (JSON authority) | Cao | Thấp | **GIỮ làm SSOT runtime DUY NHẤT** |
| `graphics_token_value` (PG) trên đường runtime | Trung bình | Cao | **GỠ khỏi runtime** — để PG cho audit/đọc thôi, giảm rò SSOT |
| Module Master (showcase) | Cao | TB | **GIỮ — nhưng dữ-liệu-hóa nhẹ** |
| `component_contract` (whitelist token) | Cao | TB | **GIỮ** |
| rollout / canary / experiment / theme_schedule / waiver / lineage / drift (bộ 10 bảng) | Thấp *hiện tại* | Cao | **ĐÓNG BĂNG** — đã build thì để đó, đừng đầu tư thêm, đừng bắt mọi edit đi qua |
| scope hierarchy 5 tầng | Thấp | Cao | **RÚT GỌN về 1–2 tầng** (org, tùy chọn role) |
| Build Packet / manifest đầy đủ | *Tiềm năng* | Rất cao | **HOÃN** đến khi đạt ngưỡng kích hoạt (mục 5) |
| Dark-mode parity check | Cao | Rất thấp | **THÊM MỚI** (chặn đúng bug hôm nay) |

Triết lý xếp hạng: **đầu tư vào GATE (rẻ, làm trạng thái sai bất khả thi) thay vì GOVERNANCE LEDGER (đắt, chỉ ghi sổ sau khi sự đã rồi).**

---

## 5. Đề xuất thay thế: "SSOT tối giản + gate rẻ" thay cho "Lego cathedral"

### 5.1 Ba gate CI rẻ giải ~80% giá trị mà governance nặng đang hứa

1. **No-hardcode mở rộng** (đã có grep hex/px trong JS) → quét thêm: inline `style="...color/background..."` trong JS, và `rgba(255,255,255,...)`/màu cứng trong CSS module. Đây là gate đã bắt được bug hôm nay nếu tồn tại.
2. **Dark-mode parity** → mọi token màu phải có `default_dark`; mọi class surface (`#sidebar`, `.admin-nav-panel`, `.nav-section`, `.admin-nav-group`...) phải có override dark. Rẻ, chặn đúng lớp bug đang xảy ra.
3. **Contrast WCAG tự động** → chạy trên các cặp text/surface; fail thì chặn merge. Tận dụng đúng công cụ a11y đã viết, nhưng đặt nó vào *đường chặn* thay vì *tab để xem*.

Ba gate này là cơ chế an toàn thật (chặn trạng thái sai), trong khi 10 bảng governance chỉ là cơ chế ghi nhận (mô tả trạng thái sai sau khi đã xảy ra).

### 5.2 "Lego" mức nhẹ — đủ dùng, không cathedral

- **Thư viện class CSS đã bind token** (orders-v3.css đã gần đạt: 0 hardcode, mọi thứ qua CSS var). Đây *đã là* Lego ở tầng phù hợp: lắp bằng cách dùng class, không bằng cách dựng manifest.
- **Một trang showcase data-driven** (Module Master đọc từ `component_contract` thay vì 27 hàm JS). Đủ để AI/người "thấy có Lego nào", không cần Build Packet.
- **KHÔNG** manifest/rollout/canary cho mỗi module ở giai đoạn này.

### 5.3 Ngưỡng kích hoạt nâng cấp lên full Lego (tránh quyết định cảm tính)

Chỉ đầu tư Build Packet/manifest/rollout khi đạt **ít nhất một** mốc:
- Có **>10 module mới** chia sẻ cùng một pattern bố cục (độ lặp đủ để khấu hao lớp gián tiếp).
- Có **team frontend ≥3 người** hoặc nhiều phiên AI đồng thời chỉnh UI thường xuyên (cần truy trách nhiệm thật).
- Chuyển hướng **bán SaaS đa-tenant** (lúc đó scope/tenant/rollout trở thành nền móng, không còn là gold-plating).

Trước các mốc đó: full Lego là YAGNI.

---

## 6. Rủi ro của chính bản phản biện này (trung thực hai chiều)

Bên phản biện cũng phải tự phản biện:

- **Nếu roadmap là SaaS thương mại đa-tenant**, thì rất nhiều thứ tôi gọi là "over-engineering" trở thành "đặt nền sớm đúng đắn": scope hierarchy, tenant, rollout/canary, experiment, theme_schedule đều là tính năng sản phẩm bán được. Khi đó phán quyết đảo chiều — và việc *đã* build sẵn lại là lợi thế. **Đây là biến quyết định duy nhất có thể lật toàn bộ kết luận.**
- **Tôi có thể đang đánh giá thấp giá trị "kỷ luật" của governance nặng** trong môi trường nhiều AI hay đổi: đôi khi sổ cái audit chính là thứ cứu một lần overwrite mất dữ liệu (repo này đã từng mất user `ianr` vì `git reset --hard`). Nếu graphics state cũng từng bị mất tương tự, audit-trail có giá trị bảo hiểm thật.
- **"Đông cứng" không phải miễn phí:** một hệ thống nửa-vời bị bỏ giữa chừng có thể gây nhầm lẫn (người mới không biết phần nào còn sống). Nếu chọn đóng băng, phải *ghi rõ ranh giới* phần đang dùng vs phần ngủ đông.

---

## 7. Kết luận

- **Kiến trúc này có giúp ích không?** Có — phần lõi (token + no-hardcode + 32px/master-density + a11y) là tài sản thật, đáng giữ và đáng dựa vào để xây tiếp. Không tương xứng — phần governance 10 bảng + scope 5 tầng + tham vọng full Lego/manifest, *ở quy mô và mục tiêu hiện tại*.
- **Bằng chứng:** dark mode vẫn vỡ dù có đủ bộ governance (mục 2.1); SSOT rò ba nguồn và runtime phân kỳ với migration (2.2); chi phí biên cực cao qua case v3-G25c (2.5).
- **Khuyến nghị hành động (theo thứ tự):**
  1. Vá hai bug dark mode (rẻ, đúng, thấy ngay) + bump cache + verify Chrome.
  2. Dồn công vào **3 gate CI** (no-hardcode mở rộng, dark-mode parity, contrast) — đây mới là "cơ chế an toàn" thật.
  3. Vá rò SSOT: chọn **một** đường runtime (JSON authority), đẩy PG về vai trò audit.
  4. **Đóng băng** tầng governance nặng; ghi rõ ranh giới sống/ngủ.
  5. **Hoãn** Build Packet/manifest đến khi chạm ngưỡng kích hoạt (mục 5.3).
- **Biến cần bạn xác nhận để chốt phán quyết:** sản phẩm này là **ERP nội bộ một tenant** hay **nền tảng SaaS đa-tenant sẽ bán**? Câu trả lời quyết định việc tầng governance nặng là "nợ kỹ thuật" hay "nền móng sớm".

---

*Báo cáo này cố ý đứng về phía hoài nghi để cân lại lực hấp dẫn tự nhiên của việc "đã xây thì xây cho hoành tráng". Nó không phủ nhận chất lượng kỹ thuật của những gì đã làm — nó chất vấn sự tương xứng giữa chi phí và nhu cầu thực tế ở thời điểm hiện tại.*
