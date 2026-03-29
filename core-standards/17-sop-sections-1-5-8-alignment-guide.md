# 17. SOP Sections 1, 2, 3, 4, 5, 8 Alignment Guide

> Version: v1 | Date: 2026-03-27 | Owner: QMS Engineer

---

## 1. Mục tiêu

Tài liệu này khóa cách viết `Section 1, 2, 3, 4, 5, 8` để các phần này:

- không bị viết như phần mở đầu trang trí,
- không tách rời logic kiểm soát đã chốt ở `Section 6`,
- không tách rời trình tự thực thi đã chốt ở `Section 7`,
- không lặp thuật ngữ nửa Anh nửa Việt,
- không tạo ra vai trò, đầu vào hay ngoại lệ không tồn tại trong vận hành thật.

Nếu `Section 6` và `Section 7` là:
- `control architecture`,
- `operating sequence`,

thì `Section 1, 2, 3, 4, 5, 8` là:
- `operating frame`,
- `authority boundary`,
- `activation / exception logic`

được suy ra từ hai phần đó.

---

## 2. Nguyên tắc bất biến

1. Không viết `Section 1, 2, 3, 4, 5, 8` trước khi đã chốt xong logic thật của `Section 6` và `Section 7`.
2. Không dùng một bộ câu mô tả chung rồi thay danh từ hàng loạt giữa các SOP.
3. Mỗi phần phải trả lời đúng một câu hỏi vận hành riêng, không chồng chéo.
4. Bất kỳ vai trò, trigger, dữ liệu, hold point hay ngoại lệ nào nêu trong `Section 1, 2, 3, 4, 5, 8` đều phải truy ngược được về gate hoặc step thật.
5. Khi tài liệu chưa phát hành lần đầu, toàn bộ body vẫn giữ `V0`, không ghi note biên tập, note khác bản trước hay note benchmark.
6. Chuẩn hóa format và đồ họa có thể làm ở mức core-standard; nâng cấp nội dung của `Section 1, 2, 3, 4, 5, 8` phải làm theo từng SOP một, không batch cơ học.

---

## 3. Bản đồ phụ thuộc giữa các section

| Section | Câu hỏi phải trả lời | Phải suy ra từ đâu |
|---|---|---|
| 1. Mục đích | Quy trình này tồn tại để chặn rủi ro nào, tạo đầu ra nào, bảo vệ quyết định nào? | `focus`, gate cuối, bước cuối, failure mode bị chặn |
| 2. Phạm vi | Quy trình bắt đầu ở đâu, kết thúc ở đâu, bàn giao với SOP nào? | bước đầu, bước cuối, trigger, handoff, related SOP |
| 3. Thuật ngữ | Khái niệm vận hành nào người đọc bắt buộc phải hiểu đúng? | thuật ngữ xuất hiện thật trong gate/step |
| 4. Vai trò | Ai giữ cổng, ai làm, ai có quyền chặn, ai có quyền mở lại? | owner trong IG + vai trò bàn giao trong step |
| 5. Đầu vào/đầu ra | Cần gì để bắt đầu, tạo ra gì khi xong, điều kiện nào kích hoạt hoặc không cho đi tiếp? | trước IG1/B1, sau IG cuối/B cuối, trigger restart/change |
| 8. Ngoại lệ | Khi nào phải dừng, làm lại, revalidation, waiver hoặc escalation? | hold point, restart point, change point, release exception |

---

## 4. Quy tắc chi tiết theo section

### 4.1 Section 1 — Mục đích

Section 1 phải được viết sau khi đã trả lời được:

- gate nào đang bảo vệ quyết định quan trọng nhất,
- lỗi lớn nhất SOP này đang chặn là gì,
- đầu ra nào của SOP này quyết định downstream có được đi tiếp hay không.

Section 1 nên có:

- 1 câu mở đầu rất ngắn, mô tả cơ chế điều hành thực của SOP,
- 3 đến 5 bullet,
- mỗi bullet nói rõ một trong các trục sau:
  - chặn rủi ro nào,
  - khóa quyết định nào,
  - bảo đảm đầu ra nào,
  - nối sang downstream nào.

Section 1 không được:

- chỉ nói “thiết lập quy trình” mà không nói quy trình dùng để chặn cái gì,
- copy nguyên tiêu đề gate vào bullet,
- dùng câu rỗng như `nhằm nâng cao`, `góp phần bảo đảm`, `tăng cường phối hợp`.

Checklist bắt buộc:

- có nhắc tới rủi ro hoặc lỗi thật đang bị chặn,
- có nhắc tới đầu ra hoặc release state thật,
- đọc vào phải hiểu ngay SOP này khác SOP lân cận ở đâu.

### 4.2 Section 2 — Phạm vi

Section 2 phải bám:

- điểm bắt đầu vận hành thật ở step đầu,
- điểm kết thúc vận hành thật ở step cuối,
- các handoff sang SOP khác,
- các re-entry hoặc restart condition nếu SOP có.

`Có bao phủ` phải trả lời:

- SOP áp dụng cho loại job, loại dữ liệu, loại hoạt động hay loại sự kiện nào,
- các activity nào nằm bên trong phạm vi từ bước đầu tới bước cuối,
- các tình huống changeover, restart, transfer, partial release, waiver hoặc similar có nằm trong phạm vi hay không.

`Không thay thế / không được vượt quyền` phải trả lời:

- SOP lân cận nào đang giữ phần upstream hoặc downstream,
- quyết định nào SOP này không được phép tự hợp thức hóa,
- boundary nào phải đẩy sang SOP khác.

Section 2 không được:

- liệt kê tài liệu không liên quan chỉ để làm đầy mục,
- dùng “không thay thế” như danh sách link trang trí,
- bỏ sót phạm vi re-entry nếu Section 7 có restart, transfer, revalidation hoặc change path.

### 4.3 Section 3 — Thuật ngữ & nguyên tắc

Chỉ giữ các thuật ngữ thực sự cần để đọc đúng `Section 6` và `Section 7`.

Quy tắc bắt buộc:

- thường chỉ dùng `3–6` dòng,
- cột tên thuật ngữ phải theo mẫu `English term (thuật ngữ tiếng Việt chuẩn)`,
- nội dung định nghĩa phải mô tả cách dùng trong SOP này, không phải định nghĩa từ điển chung chung,
- sau khi đã định nghĩa, trong thân SOP ưu tiên dùng bản tiếng Việt đã chốt.

Không được:

- copy cả glossary hệ thống vào một SOP,
- tạo thuật ngữ không xuất hiện trong gate/step,
- viết kiểu `mixed source kiểm soát`, `job close tài chính`, `control plan tại point-of-use` nếu đã có bản tiếng Việt chuẩn,
- lặp ngoặc như `Epicor Kinetic (Epicor) (Epicor)`.

Checklist bắt buộc:

- từng thuật ngữ đều xuất hiện hoặc là tiền đề để hiểu gate/step,
- không có dòng thuật ngữ chỉ để giải thích cách viết tài liệu,
- thân SOP không lặp lại tiếng Anh nửa mùa cho cùng một khái niệm.

### 4.4 Section 4 — Vai trò, quyền hạn & RACI

Section 4 phải bám đúng authority thật của SOP.

Tối thiểu phải bao phủ:

- tất cả owner đang giữ IG trong `Section 6`,
- tất cả vai trò nhận hoặc bàn giao ở các bước quan trọng trong `Section 7`,
- vai trò có quyền `HOLD`, `RELEASE`, `REVALIDATE`, `ESCALATE`, `APPROVE EXCEPTION`.

Cho phép hai format:

1. Bảng 3 cột `Vai trò | Trách nhiệm chính | Quyền / điểm chặn`
2. Ma trận RACI khi SOP có nhiều giao diện liên phòng ban và matrix giúp nhìn authority rõ hơn

Nếu dùng RACI matrix, vẫn phải có cột hoặc mô tả thể hiện:

- ai có quyền chặn,
- ai có quyền gỡ hold,
- ai chỉ được consulted chứ không được release.

Section 4 không được:

- có vai trò “ma” không xuất hiện ở gate/step,
- dùng câu quyền hạn chung chung như `chịu trách nhiệm chung`,
- bỏ vai trò có quyền quyết định thật trong `Section 6`.

### 4.5 Section 5 — Đầu vào, đầu ra & điều kiện tiên quyết

Section 5 là phần tóm tắt `điều kiện mở quy trình` và `điều kiện hoàn tất`.

Phải suy từ:

- `IG1` và `B1`,
- gate cuối và bước cuối,
- trigger đổi trạng thái, restart, change, escalation trong quy trình.

Quy tắc viết:

- `Đầu vào bắt buộc`: dữ liệu, hồ sơ, nguồn lực hoặc decision phải có trước khi bước đầu được phép chạy,
- `Đầu ra bắt buộc`: output tạo ra khi SOP hoàn tất hoặc khi gate cuối đóng,
- `Điều kiện tiên quyết`: readiness condition trước khi bắt đầu,
- ô thứ tư dùng để mô tả `Trigger`, `Điều kiện kích hoạt`, hoặc `Điều kiện không cho phép chuyển bước` tùy nature SOP, nhưng phải gắn trực tiếp với control logic thật.

Không được:

- liệt kê input/output mơ hồ kiểu `theo yêu cầu`, `tài liệu liên quan`, `hồ sơ cần thiết`,
- ghi output không xuất hiện ở gate cuối hay step cuối,
- dùng trigger chung chung `khi cần`,
- bỏ qua trigger restart, transfer, waiver, complaint, change hoặc incident nếu SOP có flow tương ứng.

### 4.6 Section 8 — Ngoại lệ, thay đổi & làm lại

Section 8 phải được suy từ các điểm `HOLD / RESTART / REVALIDATE / EXCEPTION` thật.

Format chuẩn:

- bảng 5 cột:
  - `Tình huống`
  - `Quy tắc xử lý bắt buộc`
  - `Chủ trì`
  - `Người gỡ hold / phê duyệt tiếp`
- `Hồ sơ`

Chỉ cho phép thay bảng bằng bullet list khi đồng thời thỏa cả 4 điều kiện:

- SOP là governance hẹp, ít nhánh ngoại lệ và không phải flow transaction/shop-floor.
- Số tình huống thực tế ít, ổn định và không vượt quá mức cần theo dõi bằng bảng.
- Không có nhiều owner hoặc nhiều người gỡ hold khác nhau giữa các tình huống.
- Cách trình bày bullet không làm mất khả năng audit về quyết định, escalation và hồ sơ.

Nguồn scenario phải lấy từ:

- input thiếu hoặc sai,
- change sau release,
- restart sau hold hoặc sự cố,
- transfer giữa người/máy/cell,
- partial release / urgent request / waiver,
- system down / evidence conflict / data mismatch,
- situation đặc thù của SOP đó.

Section 8 không được:

- dùng scenario trang trí không xuất phát từ flow thật,
- viết label sai nghĩa hoặc dịch hỏng như `ngắt / nghỉ-kính / thủy tinh admin`,
- chỉ ghi hành động chung chung mà không nói ai gỡ hold,
- bỏ qua record cần lưu cho exception.

---

## 5. Dấu hiệu section đang viết sai hướng

Section 1 sai hướng khi:

- đọc xong vẫn không biết SOP đang chặn rủi ro gì,
- bullet nào cũng dùng được cho SOP khác.

Section 2 sai hướng khi:

- không thấy ranh giới bắt đầu/kết thúc,
- `Không thay thế` chỉ là danh sách link không liên quan tới handoff thật.

Section 3 sai hướng khi:

- thuật ngữ không xuất hiện trong flow,
- thân SOP dùng tiếng Anh khác với bản Việt đã chốt.

Section 4 sai hướng khi:

- owner giữ gate không có trong bảng vai trò,
- người có quyền chặn không được nêu rõ.

Section 5 sai hướng khi:

- input/output không map được vào flow,
- trigger không nói được vì sao SOP bắt đầu hoặc vì sao phải mở lại.

Section 8 sai hướng khi:

- ngoại lệ không chạm tới hold/restart/release thật,
- không chỉ ra ai quyết định và ai gỡ hold.

---

## 6. Checklist QA trước khi coi là đạt

- [ ] Section 1 nói đúng rủi ro bị chặn và đầu ra cần khóa.
- [ ] Section 2 bắt đầu và kết thúc đúng theo step đầu/cuối.
- [ ] Section 2 có nêu đúng SOP lân cận ở boundary thật.
- [ ] Section 3 chỉ giữ thuật ngữ thật sự dùng trong gate/step.
- [ ] Tên thuật ngữ đều theo mẫu `English (Việt)`.
- [ ] Thân SOP ưu tiên dùng tiếng Việt đã chốt ở Section 3.
- [ ] Mọi owner giữ gate trong Section 6 đều xuất hiện ở Section 4.
- [ ] Quyền chặn/gỡ hold trong Section 4 bám đúng logic Section 6.
- [ ] Section 5 phản ánh đúng input trước IG1/B1 và output sau gate cuối/B cuối.
- [ ] Section 5 không có box chung chung kiểu “khi cần”, “theo yêu cầu”.
- [ ] Section 8 bao phủ đủ các scenario hold/restart/change/waiver thật.
- [ ] Section 8 có rõ chủ trì, người gỡ hold và hồ sơ.
- [ ] Nếu Section 8 không dùng bảng 5 cột, đã có lý do rõ ràng theo rule governance hẹp và không làm mất trace quyết định.
- [ ] Không còn thuật ngữ nửa Anh nửa Việt, nhãn dịch hỏng hay dấu vết biên tập.

---

## 7. Quan hệ với các tài liệu core-standard khác

- Đọc cùng `07-content-writing-guide.md` để khóa giọng văn và quy tắc dùng thuật ngữ.
- Đọc cùng `12-sop-section-6-7-guide.md` để chốt đúng control architecture và flow.
- Đọc cùng `13-sop-research-redraft-method.md` để làm đúng trình tự nghiên cứu trước khi viết.
- Đọc cùng `16-sop-graphics-kpi-and-redraft-quality.md` để khóa KPI, hygiene bản nháp và QA kỹ thuật.
