# 07 — Hướng dẫn viết nội dung tài liệu QMS

> Phiên bản: V0 | Hiệu lực: 2025-06-01 | Chủ sở hữu: QMS Engineer

---

## 1. Nguyên tắc viết

### 1.1 Nguyên tắc nền tảng

| # | Nguyên tắc | Giải thích |
|---|-----------|-----------|
| 1 | Câu ngắn, rõ ràng, dùng để thi hành | Mỗi câu tối đa 25 từ. Người đọc phải hiểu ngay phải làm gì. |
| 2 | Chủ ngữ + hành động + đối tượng | Luôn nêu rõ AI làm, làm GÌ, với CÁI GÌ. |
| 3 | Không dùng câu diễn giải mơ hồ | Không viết "nhằm đảm bảo", "góp phần nâng cao", "hướng tới mục tiêu". |
| 4 | Không meta-text | Không viết "tài liệu này nhằm mục đích...", "phần này mô tả...". |
| 5 | Không "AI generated" | Không ghi "được tạo bởi AI", "AI generated", "auto-generated". |
| 6 | Mỗi câu phải phục vụ vận hành thật | Xóa mọi câu không dẫn đến hành động hoặc quyết định cụ thể. |
| 7 | Một ý một câu | Không nhồi nhiều ý vào một câu bằng dấu phẩy liên tiếp. |
| 8 | Ưu tiên dạng liệt kê | Khi có 3 mục trở lên, dùng bullet hoặc bảng thay cho đoạn văn. |

### 1.2 Giọng văn

- Giọng mệnh lệnh, chuyên nghiệp, không suồng sã.
- Không dùng "bạn", "chúng ta", "mình".
- Dùng tên vai trò cụ thể: "QMS Engineer", "QC Inspector", "Production Planner".
- Khi nói chung, dùng "người thực hiện" hoặc "người được giao".

---

## 2. Cấu trúc câu lệnh

### 2.1 Cấu trúc đúng

Mỗi câu lệnh trong SOP/WI tuân theo pattern:

```
[Vai trò] + [hành động] + [đối tượng] + [điều kiện/thời điểm nếu có].
```

### 2.2 Ví dụ đúng vs sai

| Loại | Câu |
|------|-----|
| ĐUNG | QMS Engineer ra soat cau truc tai lieu truoc khi gui phe duyet. |
| SAI | Tai lieu nay duoc thiet ke de ho tro viec ra soat cau truc... |
| DUNG | Khong phat hanh tai lieu khi chua co ra soat cheo. |
| SAI | Nen dam bao rang tai lieu da duoc ra soat cheo truoc khi phat hanh. |
| DUNG | QC Inspector do 5 diem theo ban ve truoc khi chap nhan lo. |
| SAI | Viec do luong can duoc thuc hien mot cach can than de dam bao chat luong. |
| DUNG | Shift Leader dung may ngay khi phat hien phe pham lien tiep 3 chi tiet. |
| SAI | Trong truong hop phat hien su co, can xem xet viec dung may de xu ly. |

### 2.3 Quy tac viet lenh phu dinh

- Dung "KHONG" + dong tu: "Khong phat hanh khi chua co chu ky."
- Khong dung "Khong nen", "Can tranh" — qua yeu, khong rang buoc.

### 2.4 Quy tac viet dieu kien

- Dung "Khi" hoac "Neu" o dau cau cho dieu kien.
- "Khi NCR mo qua 5 ngay, QA Manager bao cao CEO."
- Khong dung "Trong truong hop", "Doi voi tinh huong" — dai va mo ho.

---

## 3. Tu ngu chuan — Muc do bat buoc

### 3.1 Ba cap do

| Tu khoa | Tieng Anh | Y nghia | Cach dung |
|---------|-----------|---------|-----------|
| **PHAI** | shall | Bat buoc thuc hien. Vi pham = non-conformance. | Dung cho yeu cau ISO, khach hang, luat. |
| **NEN** | should | Khuyen nghi manh. Cho phep ngoai le co ly do. | Dung cho best practice, khuyen nghi noi bo. |
| **CO THE** | may | Tuy chon. Nguoi thuc hien tu quyet dinh. | Dung cho phuong phap thay the, bo sung. |

### 3.2 Cach danh dau trong HTML

```html
<span class="req-tag shall">PHAI</span>
<span class="req-tag should">NEN</span>
<span class="req-tag may">CO THE</span>
```

### 3.3 Quy tac su dung

- Moi SOP PHAI co it nhat 1 yeu cau "PHAI" trong moi gate.
- KHONG dung "PHAI" cho muc khuyen nghi — se gay non-conformance khi audit.
- Khi khong chac chan muc do, mac dinh dung "NEN" va de QA Manager xac nhan nang cap.

---

## 4. Quy tac noi dung SOP — 10 section

### Section 1: Muc dich

- 3-5 bullet points.
- Moi bullet bat dau bang **dong tu** (Thiet lap, Kiem soat, Dam bao, Quy dinh, Ngan ngua).
- KHONG bat dau bang danh tu ("Quy trinh nay...", "Tai lieu nay...").

**Vi du:**
```
- Thiet lap quy trinh kiem soat tai lieu tu tao moi den phe duyet.
- Dam bao moi tai lieu phat hanh deu co ra soat cheo.
- Ngan ngua su dung tai lieu het hieu luc tai noi lam viec.
```

### Section 2: Pham vi

Chia thanh 2 phan ro rang:

**Co bao phu:**
- Liet ke cac doi tuong, quy trinh, khu vuc ap dung.

**Khong thay the:**
- Liet ke cac tai lieu/quy trinh KHONG nam trong pham vi SOP nay.

**Vi du:**
```
Co bao phu:
- Tat ca tai lieu QMS noi bo: SOP, WI, ANNEX, FRM, JD.
- Tai lieu goc tu khach hang khi duoc noi bo hoa.

Khong thay the:
- SOP-104 (bao mat du lieu va IP).
- Quy trinh kiem soat ban ve khach hang do Engineering quan ly.
```

### Section 3: Thuat ngu & nguyen tac

Bang 2 cot:

| Thuat ngu | Quy dinh su dung |
|-----------|-----------------|
| DCR | Document Change Request — yeu cau thay doi tai lieu chinh thuc |
| SoR | System of Record — he thong luu tru goc (Epicor hoac M365) |
| SSOT | Single Source of Truth — nguon du lieu duy nhat duoc cong nhan |

- Chi liet ke thuat ngu DUNG TRONG SOP NAY.
- KHONG copy toan bo glossary he thong vao moi SOP.

### Section 4: Vai tro, quyen han & RACI

Bang 3 cot:

| Vai tro | Trach nhiem | Quyen / Diem chan |
|---------|------------|------------------|
| QMS Engineer | Ra soat cau truc, kiem tra cross-ref | Quyen tu choi phat hanh neu thieu cross-review |
| QA Manager | Phe duyet tai lieu cap SOP | Diem chan: Khong phe duyet = khong phat hanh |
| Document Owner | Soan thao, cap nhat, theo doi hieu luc | Chiu trach nhiem noi dung chinh xac |

- Cot "Quyen / Diem chan" rat quan trong — cho biet ai co quyen DUNG quy trinh.

### Section 5: Dau vao, dau ra & dieu kien tien quyet

4 field boxes:

| Box | Noi dung |
|-----|---------|
| **Dau vao** | Tai lieu nao can co truoc khi bat dau quy trinh nay |
| **Dau ra** | San pham/ho so nao duoc tao ra khi hoan thanh |
| **Dieu kien tien quyet** | Dieu kien nao PHAI thoa man truoc khi bat dau |
| **Trigger** | Su kien nao kich hoat quy trinh nay |

### Section 6: Cong kiem soat, diem dung bat buoc & KPI

**Gate cards:**

Moi gate la 1 card chua:
- Ten gate (vi du: G1 — Kiem tra cau truc)
- Dieu kien PASS
- Dieu kien HOLD/FAIL
- Vai tro quyet dinh
- Ho so ghi nhan

**KPI metrics:**

| KPI | Muc tieu | Do luong | Tan suat |
|-----|---------|---------|---------|
| Thoi gian phe duyet tai lieu | <= 5 ngay lam viec | Ngay tu submit den approve | Hang thang |
| Ti le tai lieu het hieu luc con luu hanh | 0% | So tai lieu het hieu luc / tong | Hang quy |

### Section 7: Quy trinh chi tiet

Moi gate co:
- `<h3>` — Ten gate
- Mo ta ngan (1-2 cau)
- `<ul>` — Cac buoc thuc hien
- `<div class="note-soft">` — Ghi chu bo sung (neu co)
- `<div class="role-note">` — Vai tro chiu trach nhiem

**Vi du:**
```html
<h3>G2 — Ra soat cheo</h3>
<p>Nguoi duoc chi dinh ra soat cheo kiem tra noi dung va cross-reference.</p>
<ul>
  <li>Doc toan bo tai lieu, doi chieu voi SOP/WI lien quan.</li>
  <li>Kiem tra moi lien ket noi bo con hoat dong.</li>
  <li>Ghi nhan ket qua vao FRM-105 Peer Review Log.</li>
</ul>
<div class="note-soft">Thoi gian ra soat cheo: toi da 3 ngay lam viec.</div>
<div class="role-note">Vai tro: Peer Reviewer (do Document Owner chi dinh)</div>
```

### Section 8: Ngoai le, thay doi & lam lai

- Bulleted list cac tinh huong ngoai le.
- Moi bullet ghi: tinh huong + hanh dong + nguoi quyet dinh.

**Vi du:**
```
- Khi tai lieu khan cap (an toan, phap luat): CEO co the phe duyet
  ngay, bo qua buoc ra soat cheo. Ghi ly do vao DCR.
- Khi nguoi ra soat cheo vang mat qua 3 ngay: Document Owner de xuat
  nguoi thay the, QA Manager chap thuan.
```

### Section 9: He thong, ho so & du lieu

Bang mapping:

| He thong | Du lieu | Trach nhiem | Luu tru |
|----------|--------|------------|---------|
| SharePoint | Tai lieu QMS goc (PDF) | QMS Engineer | QMS Records Site |
| Epicor | So lieu san xuat | Production Planner | Job Module |
| Power BI | Dashboard KPI | QMS Engineer | QMS Dashboard |

### Section 10: Lien ket

Bang ma tai lieu + ten + link:

| Ma | Ten tai lieu | Lien ket |
|----|-------------|---------|
| SOP-102 | Quality Policy, Objectives & Context | [Link] |
| WI-102 | SharePoint Record Sites & Permissions | [Link] |
| FRM-101 | Master Document Register | [Link] |
| FRM-102 | Document Change Request | [Link] |
| ANNEX-106 | ISO 9001 Matrix Full | [Link] |

---

## 5. Quy tac dac biet theo loai tai lieu

### 5.1 WI (Work Instruction)

- Viet theo dang **buoc-by-buoc** (step 1, step 2...).
- Moi buoc bat dau bang dong tu menh lenh.
- Moi buoc chi 1 hanh dong. KHONG gop nhieu hanh dong vao 1 buoc.
- Co hinh anh / so do neu buoc phuc tap.
- Ket thuc bang: ho so can ghi + nguoi kiem tra.

### 5.2 ANNEX

- Viet dang **rule-pack**: bang, dieu kien, quy tac.
- KHONG viet dang tường thuat.
- Moi bang PHAI co header ro rang va ghi chu nguon.
- Dung `iso-map` de lien ket clause ISO.

### 5.3 JD (Job Description)

- Trach nhiem viet dang bang, khong viet doan van.
- Moi dong trach nhiem co: noi dung + tan suat + ho so lien quan.
- Phan tham quyen (auth-grid) ghi ro: duoc quyet dinh gi, den muc nao.

### 5.4 Form (Excel)

- Chi co ten cot, label ngan, dropdown.
- KHONG viet giai thich dai trong form.
- Giai thich nam trong SOP/WI tuong ung, KHONG nam trong form.

---

## 6. Kiem tra truoc khi phat hanh

Truoc khi gui tai lieu de phe duyet, kiem tra:

| # | Hang muc | Kiem tra |
|---|---------|---------|
| 1 | Moi cau co chu ngu ro rang | Khong co cau bi dong khong ro ai lam |
| 2 | Moi gate co dieu kien PASS/FAIL | Khong co gate mo ho |
| 3 | Moi vai tro trong Section 4 xuat hien trong Section 7 | Khong co vai tro "ma" |
| 4 | Moi form/WI lien ket ton tai | Khong co lien ket chet |
| 5 | Khong co meta-text | Xoa het "tai lieu nay nham muc dich..." |
| 6 | Khong co "AI", "generated" | Kiem tra toan van ban |
| 7 | Tu khoa PHAI/NEN/CO THE dung dung cap do | QA Manager xac nhan |
| 8 | Thuat ngu nhat quan voi Glossary | Khong dung 2 tu cho 1 khai niem |
| 9 | A4 printable | In thu, kiem tra layout |
| 10 | Cross-reference chinh xac | Moi ma tai lieu dung va link hoat dong |

---

## 7. Tu ngu cam su dung

| Cam | Thay bang |
|-----|----------|
| "Tai lieu nay nham muc dich..." | (Xoa, bat dau bang noi dung thuc.) |
| "Nhu da de cap o tren..." | (Xoa hoac ghi lai noi dung cu the.) |
| "Can luu y rang..." | (Viet thang noi dung can luu y.) |
| "Mot cach tong quat..." | (Xoa, viet cu the.) |
| "Co the noi rang..." | (Xoa, khang dinh truc tiep.) |
| "Duoc tao boi AI" | (KHONG BAO GIO dung.) |
| "Generated", "auto-generated" | (KHONG BAO GIO dung.) |
| "Ban", "chung ta", "minh" | Dung ten vai tro cu the. |
| "Nen dam bao rang..." | Dung "PHAI" hoac "NEN" + hanh dong cu the. |
| "Trong truong hop" | Dung "Khi" hoac "Neu". |
