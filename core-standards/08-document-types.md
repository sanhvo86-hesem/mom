# 08 — Cau truc chuan theo loai tai lieu

> Phien ban: V0 | Hieu luc: 2025-06-01 | Chu so huu: QMS Engineer

---

## 1. SOP — Standard Operating Procedure (10 section)

Moi SOP cua HESEM PHAI co du 10 section theo thu tu sau. KHONG duoc bo section, KHONG duoc doi thu tu.

### Cau truc bat buoc

| Section | Tieu de | Noi dung chinh |
|---------|---------|---------------|
| 1 | Muc dich | 3-5 bullet, moi bullet bat dau bang dong tu |
| 2 | Pham vi | "Co bao phu" + "Khong thay the" |
| 3 | Thuat ngu & nguyen tac | Bang 2 cot: Thuat ngu \| Quy dinh su dung |
| 4 | Vai tro, quyen han & RACI | Bang 3 cot: Vai tro \| Trach nhiem \| Quyen/Diem chan |
| 5 | Dau vao, dau ra & dieu kien tien quyet | 4 field boxes: Input, Output, Prerequisites, Trigger |
| 6 | Cong kiem soat, diem dung bat buoc & KPI | Gate cards + KPI metrics table |
| 7 | Quy trinh chi tiet | Moi gate: h3 + mo ta + ul + note-soft + role-note |
| 8 | Ngoai le, thay doi & lam lai | Bulleted list: tinh huong + hanh dong + nguoi quyet dinh |
| 9 | He thong, ho so & du lieu | Table mapping: He thong -> Du lieu -> Trach nhiem -> Luu tru |
| 10 | Bieu mau, WI, SOP & JD lien ket | Bang ma tai lieu + ten + link |

### HTML skeleton

```html
<section id="s1-purpose" class="sop-section">
  <h2>1. Muc dich</h2>
  <ul>
    <li>Dong tu + noi dung...</li>
  </ul>
</section>

<section id="s2-scope" class="sop-section">
  <h2>2. Pham vi</h2>
  <div class="scope-in">
    <h3>Co bao phu</h3>
    <ul>...</ul>
  </div>
  <div class="scope-out">
    <h3>Khong thay the</h3>
    <ul>...</ul>
  </div>
</section>

<section id="s3-terms" class="sop-section">
  <h2>3. Thuat ngu & nguyen tac</h2>
  <table class="term-table">
    <thead><tr><th>Thuat ngu</th><th>Quy dinh su dung</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="s4-roles" class="sop-section">
  <h2>4. Vai tro, quyen han & RACI</h2>
  <table class="role-table">
    <thead><tr><th>Vai tro</th><th>Trach nhiem</th><th>Quyen / Diem chan</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="s5-io" class="sop-section">
  <h2>5. Dau vao, dau ra & dieu kien tien quyet</h2>
  <div class="io-grid">
    <div class="io-box io-input"><h4>Dau vao</h4><ul>...</ul></div>
    <div class="io-box io-output"><h4>Dau ra</h4><ul>...</ul></div>
    <div class="io-box io-prereq"><h4>Dieu kien tien quyet</h4><ul>...</ul></div>
    <div class="io-box io-trigger"><h4>Trigger</h4><ul>...</ul></div>
  </div>
</section>

<section id="s6-gates" class="sop-section">
  <h2>6. Cong kiem soat, diem dung bat buoc & KPI</h2>
  <div class="gate-card">
    <h3>G1 — Ten gate</h3>
    <p><strong>PASS:</strong> dieu kien</p>
    <p><strong>HOLD/FAIL:</strong> dieu kien</p>
    <p><strong>Vai tro:</strong> ai quyet dinh</p>
    <p><strong>Ho so:</strong> FRM-XXX</p>
  </div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Muc tieu</th><th>Do luong</th><th>Tan suat</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="s7-procedure" class="sop-section">
  <h2>7. Quy trinh chi tiet</h2>
  <h3>G1 — Ten gate</h3>
  <p>Mo ta ngan.</p>
  <ul>
    <li>Buoc 1...</li>
    <li>Buoc 2...</li>
  </ul>
  <div class="note-soft">Ghi chu bo sung.</div>
  <div class="role-note">Vai tro: ten vai tro</div>
</section>

<section id="s8-exceptions" class="sop-section">
  <h2>8. Ngoai le, thay doi & lam lai</h2>
  <ul>
    <li>Khi [tinh huong]: [vai tro] [hanh dong]. Ghi ly do vao [ho so].</li>
  </ul>
</section>

<section id="s9-systems" class="sop-section">
  <h2>9. He thong, ho so & du lieu</h2>
  <table class="system-table">
    <thead><tr><th>He thong</th><th>Du lieu</th><th>Trach nhiem</th><th>Luu tru</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="s10-links" class="sop-section">
  <h2>10. Bieu mau, WI, SOP & JD lien ket</h2>
  <table class="link-table">
    <thead><tr><th>Ma</th><th>Ten tai lieu</th><th>Lien ket</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>
```

---

## 2. WI — Work Instruction (7 section)

WI la huong dan thao tac cu the, chi tiet hon SOP. Viet dang buoc-by-buoc.

### Cau truc bat buoc

| Section | Tieu de | Noi dung chinh |
|---------|---------|---------------|
| 1 | Muc dich | 2-3 bullet, mo ta WI nay giup gi |
| 2 | Pham vi & doi tuong ap dung | Ap dung cho ai, o dau, khi nao |
| 3 | Cong cu, vat tu & tai lieu can thiet | Danh sach cong cu, vat tu, tai lieu tham chieu |
| 4 | Dieu kien tien quyet | Dieu kien PHAI thoa man truoc khi bat dau |
| 5 | Cac buoc thuc hien | Step-by-step, moi buoc 1 hanh dong |
| 6 | Ho so & bang chung | Ho so nao can ghi, luu o dau |
| 7 | Tai lieu lien quan | Bang ma + ten + link |

### HTML skeleton

```html
<section id="wi-s1" class="wi-section">
  <h2>1. Muc dich</h2>
  <ul>...</ul>
</section>

<section id="wi-s2" class="wi-section">
  <h2>2. Pham vi & doi tuong ap dung</h2>
  <ul>...</ul>
</section>

<section id="wi-s3" class="wi-section">
  <h2>3. Cong cu, vat tu & tai lieu can thiet</h2>
  <table class="tool-table">
    <thead><tr><th>Hang muc</th><th>Mo ta</th><th>Ghi chu</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="wi-s4" class="wi-section">
  <h2>4. Dieu kien tien quyet</h2>
  <ul>
    <li>Dieu kien 1...</li>
  </ul>
</section>

<section id="wi-s5" class="wi-section">
  <h2>5. Cac buoc thuc hien</h2>
  <div class="step-block">
    <h3>Buoc 1: Ten buoc</h3>
    <p>Mo ta hanh dong cu the.</p>
    <div class="note-soft">Ghi chu (neu co).</div>
  </div>
  <!-- Lap lai cho cac buoc tiep theo -->
</section>

<section id="wi-s6" class="wi-section">
  <h2>6. Ho so & bang chung</h2>
  <table class="record-table">
    <thead><tr><th>Ho so</th><th>Noi dung</th><th>Luu tru</th><th>Trach nhiem</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="wi-s7" class="wi-section">
  <h2>7. Tai lieu lien quan</h2>
  <table class="link-table">
    <thead><tr><th>Ma</th><th>Ten tai lieu</th><th>Lien ket</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>
```

### Nguyen tac viet WI

- Moi buoc BAT DAU bang dong tu menh lenh: "Dat", "Mo", "Kiem tra", "Ghi", "Bao cao".
- Moi buoc chi 1 hanh dong. KHONG gop nhieu hanh dong.
- Neu buoc co dieu kien: viet "Neu [dieu kien], thi [hanh dong]."
- Neu buoc co canh bao: dung `<div class="note-warning">` truoc buoc.
- Ket thuc bang ho so can ghi + nguoi kiem tra.

---

## 3. ANNEX — Phu luc tham chieu (Rule-pack format)

ANNEX la tai lieu tham chieu chua quy tac, bang, phuong phap, ma tran. Cau truc linh hoat theo noi dung.

### Thanh phan bat buoc

| Thanh phan | Mo ta | Bat buoc |
|-----------|-------|---------|
| iso-map | Bang lien ket clause ISO 9001/AS9100D | PHAI |
| Sections | Cac phan noi dung, danh so | PHAI |
| Tables | Bang du lieu, quy tac, ma tran | PHAI (toi thieu 1) |
| Header (meta) | Ma, rev, hieu luc, owner | PHAI |

### Cac dang ANNEX

| Dang | Vi du | Dac diem |
|------|-------|---------|
| Reference data | ANNEX-302 Approved Materials List | Bang danh sach, co filter |
| Matrix | ANNEX-120 Authority Matrix | Bang 2 chieu: vai tro x quyen |
| Method | ANNEX-601 AQL Method Reference | Quy trinh tinh toan, bang tra |
| Rules | ANNEX-501 Dispatch Capacity WIP Rules | Dieu kien + hanh dong |
| Map | ANNEX-106 ISO 9001 Matrix Full | Clause -> tai lieu -> trach nhiem |
| Topology | ANNEX-133 M365 Site Topology | Cau truc thu muc, site, library |

### HTML skeleton

```html
<section id="annex-iso-map" class="annex-section">
  <h2>Lien ket ISO</h2>
  <table class="iso-map">
    <thead><tr><th>Clause</th><th>Yeu cau</th><th>Tai lieu lien quan</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="annex-s1" class="annex-section">
  <h2>1. Ten phan</h2>
  <!-- Noi dung: bang, danh sach, quy tac -->
</section>
```

### Nguyen tac viet ANNEX

- KHONG viet dang tuong thuat. Dung bang va danh sach.
- Moi bang PHAI co header ro rang.
- Ghi nguon/can cu cho moi quy tac (ISO clause, tieu chuan, yeu cau khach hang).
- Dat ten section theo noi dung, khong theo so thu tu co dinh.

---

## 4. JD — Job Description (6 section)

### Cau truc bat buoc

| Section | Tieu de | CSS class | Noi dung |
|---------|---------|-----------|---------|
| 1 | Muc dich & su menh | `jd-purpose`, `jd-mission` | 2-3 cau: vi tri nay ton tai de lam gi |
| 2 | Trach nhiem chinh | `resp-table` | Bang: STT \| Trach nhiem \| Tan suat \| Ho so |
| 3 | Tham quyen | `auth-grid` | Bang: Quyet dinh \| Pham vi \| Gioi han \| Bao cao cho |
| 4 | Nang luc yeu cau | `comp-grid` | Bang: Nang luc \| Muc do (Dreyfus) \| Bat buoc/Uu tien |
| 5 | Nguoi du phong | `backup-card` | Card: Vai tro du phong + dieu kien kich hoat |
| 6 | Tai lieu lien quan | `link-table` | Bang ma + ten + link |

### HTML skeleton

```html
<section id="jd-s1" class="jd-section">
  <div class="jd-purpose">
    <h2>1. Muc dich</h2>
    <p>Vi tri nay chiu trach nhiem...</p>
  </div>
  <div class="jd-mission">
    <p><strong>Su menh:</strong> Mo ta ngan su menh cua vi tri.</p>
  </div>
</section>

<section id="jd-s2" class="jd-section">
  <h2>2. Trach nhiem chinh</h2>
  <table class="resp-table">
    <thead><tr><th>#</th><th>Trach nhiem</th><th>Tan suat</th><th>Ho so</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Noi dung trach nhiem</td><td>Hang ngay</td><td>FRM-XXX</td></tr>
    </tbody>
  </table>
</section>

<section id="jd-s3" class="jd-section">
  <h2>3. Tham quyen</h2>
  <div class="auth-grid">
    <table>
      <thead><tr><th>Quyet dinh</th><th>Pham vi</th><th>Gioi han</th><th>Bao cao cho</th></tr></thead>
      <tbody>...</tbody>
    </table>
  </div>
</section>

<section id="jd-s4" class="jd-section">
  <h2>4. Nang luc yeu cau</h2>
  <div class="comp-grid">
    <table>
      <thead><tr><th>Nang luc</th><th>Muc do (Dreyfus)</th><th>Bat buoc / Uu tien</th></tr></thead>
      <tbody>...</tbody>
    </table>
  </div>
</section>

<section id="jd-s5" class="jd-section">
  <h2>5. Nguoi du phong</h2>
  <div class="backup-card">
    <p><strong>Du phong chinh:</strong> Ten vai tro</p>
    <p><strong>Dieu kien kich hoat:</strong> Khi nguoi giu vi tri vang mat tren 1 ngay lam viec.</p>
    <p><strong>Pham vi du phong:</strong> Toan bo / Chi cac muc uu tien cao.</p>
  </div>
</section>

<section id="jd-s6" class="jd-section">
  <h2>6. Tai lieu lien quan</h2>
  <table class="link-table">
    <thead><tr><th>Ma</th><th>Ten tai lieu</th><th>Lien ket</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>
```

### Nguyen tac viet JD

- Trach nhiem viet dang bang, KHONG viet doan van.
- Moi dong trach nhiem co tan suat (Hang ngay / Hang tuan / Hang thang / Khi can).
- Auth-grid ghi ro gioi han: "Duoc duyet PO duoi $5,000" thay vi "Duoc duyet PO".
- Nang luc dung thang Dreyfus 5 bac: Novice, Advanced Beginner, Competent, Proficient, Expert.

---

## 5. Department Handbook (6 section)

### Cau truc bat buoc

| Section | Tieu de | Noi dung |
|---------|---------|---------|
| 1 | Tong quan phong ban | Su menh, muc tieu, vi tri trong to chuc |
| 2 | Pham vi chuc nang | Cac chuc nang chinh phong ban dam nhan |
| 3 | So do to chuc | Cay to chuc (org-tree) cua phong ban |
| 4 | Quy trinh chinh | Danh sach SOP chinh phong ban so huu hoac tham gia |
| 5 | KPI phong ban | Bang KPI: chi so, muc tieu, do luong, tan suat |
| 6 | Lien ket SOP/WI/Form | Bang ma tai lieu lien quan |

### HTML skeleton

```html
<section id="dept-s1" class="dept-section">
  <h2>1. Tong quan phong ban</h2>
  <div class="dept-overview">
    <p><strong>Su menh:</strong> ...</p>
    <p><strong>Bao cao cho:</strong> ...</p>
    <p><strong>So nhan su:</strong> ...</p>
  </div>
</section>

<section id="dept-s2" class="dept-section">
  <h2>2. Pham vi chuc nang</h2>
  <ul>
    <li>Chuc nang 1</li>
    <li>Chuc nang 2</li>
  </ul>
</section>

<section id="dept-s3" class="dept-section">
  <h2>3. So do to chuc</h2>
  <div class="org-tree">
    <!-- Cau truc cay to chuc -->
  </div>
</section>

<section id="dept-s4" class="dept-section">
  <h2>4. Quy trinh chinh</h2>
  <table>
    <thead><tr><th>SOP</th><th>Ten</th><th>Vai tro phong ban</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="dept-s5" class="dept-section">
  <h2>5. KPI phong ban</h2>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Muc tieu</th><th>Do luong</th><th>Tan suat</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="dept-s6" class="dept-section">
  <h2>6. Lien ket SOP/WI/Form</h2>
  <table class="link-table">
    <thead><tr><th>Ma</th><th>Ten tai lieu</th><th>Lien ket</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>
```

---

## 6. Training Module — C01 den C19 (6 section)

### Cau truc bat buoc

| Section | Tieu de | Noi dung |
|---------|---------|---------|
| 1 | Thong tin trien khai | Doi tuong, thoi luong, dieu kien tham gia, hinh thuc |
| 2 | Muc luc nhanh | Danh sach cac phan trong module |
| 3 | Noi dung ly thuyet | Cac section kien thuc, bang, hinh anh |
| 4 | Vi du thuc te | Case study, tinh huong thuc te tai HESEM |
| 5 | Bai tap thuc hanh | Bai tap, tinh huong, cau hoi kiem tra |
| 6 | Checklist danh gia | Checklist de danh gia nguoi hoc dat/chua dat |

### HTML skeleton

```html
<section id="train-s1" class="train-section">
  <h2>1. Thong tin trien khai</h2>
  <table class="deploy-info">
    <tr><th>Doi tuong</th><td>...</td></tr>
    <tr><th>Thoi luong</th><td>... gio</td></tr>
    <tr><th>Dieu kien</th><td>...</td></tr>
    <tr><th>Hinh thuc</th><td>Truc tiep / Online / Tu hoc</td></tr>
    <tr><th>Danh gia</th><td>Quiz + OJT checklist</td></tr>
  </table>
</section>

<section id="train-s2" class="train-section">
  <h2>2. Muc luc nhanh</h2>
  <ol>
    <li><a href="#train-s3-1">Phan 1: ...</a></li>
    <li><a href="#train-s3-2">Phan 2: ...</a></li>
  </ol>
</section>

<section id="train-s3" class="train-section">
  <h2>3. Noi dung ly thuyet</h2>
  <div id="train-s3-1">
    <h3>3.1 Ten phan</h3>
    <p>Noi dung...</p>
  </div>
</section>

<section id="train-s4" class="train-section">
  <h2>4. Vi du thuc te</h2>
  <div class="case-study">
    <h3>Tinh huong 1</h3>
    <p><strong>Boi canh:</strong> ...</p>
    <p><strong>Van de:</strong> ...</p>
    <p><strong>Giai phap:</strong> ...</p>
    <p><strong>Ket qua:</strong> ...</p>
  </div>
</section>

<section id="train-s5" class="train-section">
  <h2>5. Bai tap thuc hanh</h2>
  <div class="exercise">
    <h3>Bai tap 1</h3>
    <p>Yeu cau: ...</p>
    <p>Tai lieu can: ...</p>
    <p>Thoi gian: ... phut</p>
  </div>
</section>

<section id="train-s6" class="train-section">
  <h2>6. Checklist danh gia</h2>
  <table class="eval-checklist">
    <thead><tr><th>#</th><th>Tieu chi</th><th>Dat</th><th>Chua dat</th><th>Ghi chu</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Tieu chi 1</td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
</section>
```

### Nguyen tac viet Training Module

- Noi dung ly thuyet viet ngan, tap trung vao "can biet de lam" KHONG phai "can biet de biet".
- Vi du thuc te PHAI lay tu boi canh HESEM (gia cong CNC, semiconductor parts, ISO 9001).
- Bai tap thuc hanh PHAI lam duoc tai noi lam viec voi tai lieu va cong cu hien co.
- Checklist danh gia bam sat nang luc can dat, dung thang Dreyfus lam tham chieu.

---

## 7. Bang tom tat so sanh

| Dac diem | SOP | WI | ANNEX | JD | Dept HB | Training |
|----------|-----|----|-------|----|---------| ---------|
| So section | 10 | 7 | Linh hoat | 6 | 6 | 6 |
| Gate/checkpoint | Co | Khong | Khong | Khong | Khong | Co (checklist) |
| RACI | Co (Section 4) | Khong | Khong | Co (Section 3) | Khong | Khong |
| KPI | Co (Section 6) | Khong | Khong | Khong | Co (Section 5) | Khong |
| Step-by-step | Co (Section 7) | Co (Section 5) | Khong | Khong | Khong | Co (Section 5) |
| iso-map | Khong | Khong | Co | Khong | Khong | Khong |
| Bang du lieu | Co | Co | PHAI co | Co | Co | Co |
| Lien ket tai lieu | Co (Section 10) | Co (Section 7) | Co | Co (Section 6) | Co (Section 6) | Khong |
