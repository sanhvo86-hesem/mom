# 09 — Kiem soat phien ban va quy trinh phe duyet

> Phien ban: V0 | Hieu luc: 2025-06-01 | Chu so huu: QMS Engineer

---

## 1. He thong danh so phien ban

### 1.1 Cac cap phien ban

| Phien ban | Trang thai | Y nghia | Vi du |
|-----------|-----------|---------|-------|
| V0 (Draft) | Ban nhap | Dang soan thao, chua phe duyet. Chi luu hanh noi bo nhom soan thao. | V0 |
| V0 (Published) | Phat hanh lan dau | Phe duyet lan dau va phat hanh chinh thuc. Day la phien ban dau tien co hieu luc. | V0 published |
| V1.x | Cap nhat nho | Sua loi chinh ta, dinh dang, bo sung nho KHONG thay doi logic quy trinh. | V1.1, V1.2, V1.3 |
| V2.0 | Cap nhat lon | Thay doi quy trinh, them/bot gate, thay doi vai tro, thay doi logic. | V2.0 |
| V3.0, V4.0... | Cap nhat lon tiep theo | Moi thay doi lon tang so chinh 1 don vi. | V3.0, V4.0 |

### 1.2 Quy tac danh so

- **So chinh** (major): Tang khi thay doi quy trinh, gate, vai tro, logic nghiep vu.
- **So phu** (minor): Tang khi sua loi nho, cap nhat dinh dang, bo sung thong tin khong anh huong van hanh.
- Moi lan tang so chinh, so phu ve 0. Vi du: V1.3 -> V2.0.
- KHONG dung so am, so thap phan nhieu cap (V1.2.3), hoac chu cai (V1a).

### 1.3 Phan biet cap nhat nho va lon

| Cap nhat nho (Minor — V1.x) | Cap nhat lon (Major — V2.0+) |
|-----------------------------|-------------------------------|
| Sua loi chinh ta, ngu phap | Thay doi quy trinh tong the |
| Cap nhat dinh dang, CSS | Them hoac bot gate/checkpoint |
| Bo sung ghi chu, lam ro noi dung | Thay doi vai tro chiu trach nhiem |
| Cap nhat lien ket tai lieu | Thay doi dieu kien PASS/FAIL |
| Sua ma bieu mau tham chieu | Thay doi he thong luu tru (Epicor, M365) |
| Them vi du minh hoa | Thay doi KPI muc tieu |
| Cap nhat thong tin lien he | Thay doi pham vi ap dung |

---

## 2. Quy trinh phe duyet tai lieu

### 2.1 Luong cong viec chinh

```
Draft -> Submit -> Cross-Review -> Approve/Reject -> Publish
  |                    |               |
  v                    v               v
Soan thao        Ra soat cheo    Phe duyet/Tu choi
(Document        (Peer           (QA Manager hoac
 Owner)          Reviewer)        cap tren)
```

### 2.2 Chi tiet tung buoc

#### Buoc 1: Draft (Soan thao)

| Hang muc | Chi tiet |
|----------|---------|
| Nguoi thuc hien | Document Owner |
| Hanh dong | Soan noi dung tai lieu theo cau truc chuan (xem 08-document-types.md) |
| Ho so | File nhap luu tai thu muc Draft tren SharePoint |
| Thoat | Gui DCR (Document Change Request) khi hoan thanh nhap |

#### Buoc 2: Submit (Gui yeu cau)

| Hang muc | Chi tiet |
|----------|---------|
| Nguoi thuc hien | Document Owner |
| Hanh dong | Dien FRM-102 Document Change Request |
| Noi dung DCR | Ly do thay doi, pham vi anh huong, tai lieu lien quan |
| Thoat | Chuyen DCR cho QMS Engineer |

#### Buoc 3: Cross-Review (Ra soat cheo)

| Hang muc | Chi tiet |
|----------|---------|
| Nguoi thuc hien | Peer Reviewer (do Document Owner hoac QMS Engineer chi dinh) |
| Yeu cau | Nguoi ra soat KHONG phai la nguoi soan thao |
| Hanh dong | Doc toan bo tai lieu, kiem tra noi dung, cross-reference, format |
| Thoi han | Toi da 3 ngay lam viec tu khi nhan |
| Ho so | Ghi ket qua vao FRM-105 Peer Review Log |
| Ket qua | PASS: chuyen phe duyet. FAIL: tra ve Document Owner sua. |

#### Buoc 4: Approve/Reject (Phe duyet / Tu choi)

| Hang muc | Chi tiet |
|----------|---------|
| Nguoi thuc hien | QA Manager (cho SOP, WI, ANNEX). CEO (cho Quality Manual). |
| Hanh dong | Xem xet tai lieu + ket qua cross-review |
| Quyet dinh | APPROVED: chuyen Publish. REJECTED: tra ve voi ly do. CONDITIONAL: phe duyet kem dieu kien. |
| Ho so | Chu ky tren DCR (FRM-102) |

#### Buoc 5: Publish (Phat hanh)

| Hang muc | Chi tiet |
|----------|---------|
| Nguoi thuc hien | QMS Engineer |
| Hanh dong | Chuyen tai lieu sang dinh dang phat hanh (HTML tren QMS site) |
| Kiem tra | Lien ket hoat dong, format dung, phien ban dung |
| Cap nhat | FRM-101 Master Document Register |
| Thong bao | Gui thong bao den cac bo phan lien quan |
| Huy bo ban cu | Danh dau phien ban cu la "Superseded" tren SharePoint |

### 2.3 Truong hop dac biet

| Tinh huong | Xu ly |
|-----------|-------|
| Tai lieu khan cap (an toan, phap luat) | CEO co the phe duyet truc tiep, bo qua cross-review. Ghi ly do vao DCR. Thuc hien cross-review bo sung trong vong 5 ngay. |
| Nguoi ra soat vang mat qua 3 ngay | Document Owner de xuat nguoi thay the. QMS Engineer chap thuan. |
| Phe duyet co dieu kien (CONDITIONAL) | Document Owner sua theo dieu kien trong vong 2 ngay. QMS Engineer xac nhan da sua. Khong can phe duyet lai. |
| Tu choi (REJECTED) | Document Owner sua theo gop y. Bat dau lai tu buoc Cross-Review. |

---

## 3. DCR — Document Change Request

### 3.1 Khi nao can DCR

| Tinh huong | Can DCR |
|-----------|---------|
| Tao tai lieu moi | CO |
| Cap nhat lon (Major) | CO |
| Cap nhat nho (Minor) | CO (don gian hoa: chi can 1 dong mo ta thay doi) |
| Sua loi chinh ta (< 5 cho) | KHONG (QMS Engineer tu sua va ghi log) |

### 3.2 Noi dung DCR (FRM-102)

| Field | Mo ta |
|-------|-------|
| Ma tai lieu | Ma tai lieu can thay doi |
| Phien ban hien tai | Phien ban dang co hieu luc |
| Phien ban de xuat | Phien ban moi sau thay doi |
| Ly do thay doi | Tai sao can thay doi (cu the, khong mo ho) |
| Pham vi anh huong | Nhung tai lieu/quy trinh nao bi anh huong |
| Hanh dong can thiet | Nhung viec can lam de trien khai thay doi |
| Nguoi de xuat | Ten + vai tro |
| Ngay de xuat | Ngay gui DCR |
| Nguoi phe duyet | QA Manager hoac CEO |
| Ket qua | APPROVED / REJECTED / CONDITIONAL |

---

## 4. Yeu cau ra soat cheo (Cross-Review)

### 4.1 Ai ra soat cho ai

| Loai tai lieu | Nguoi soan | Nguoi ra soat |
|--------------|-----------|--------------|
| SOP | Process Owner | QMS Engineer + 1 nguoi tu phong ban lien quan |
| WI | Team Lead / Engineer | 1 nguoi cung phong ban + QMS Engineer |
| ANNEX | Chuyen gia linh vuc | QMS Engineer |
| JD | HR Manager + Line Manager | QMS Engineer |
| Form (Excel) | Process Owner | QMS Engineer (kiem tra format + logic) |

### 4.2 Tieu chi ra soat

| # | Tieu chi | Kiem tra |
|---|---------|---------|
| 1 | Noi dung chinh xac ve mat ky thuat | Co phan anh dung thuc te van hanh khong? |
| 2 | Cau truc dung chuan | Dung 10 section (SOP), 7 section (WI)...? |
| 3 | Tu ngu nhat quan | PHAI/NEN/CO THE dung dung cap do? |
| 4 | Cross-reference chinh xac | Moi ma tai lieu dung, link hoat dong? |
| 5 | Khong trung lap noi dung | Khong duplicate thong tin da co trong tai lieu khac? |
| 6 | Vai tro nhat quan | Vai tro trong Section 4 xuat hien trong Section 7? |
| 7 | Gate ro rang | Moi gate co dieu kien PASS/FAIL cu the? |
| 8 | In duoc | Layout vua A4, khong tran? |
| 9 | Khong meta-text | Khong co "tai lieu nay nham muc dich..."? |
| 10 | Khong "AI" mention | Khong co "AI generated", "auto-generated"? |

---

## 5. Theo doi lich su thay doi (Revision History)

### 5.1 Vi tri

Moi tai lieu HTML co bang revision history o cuoi trang, trong `<footer>` hoac section rieng.

### 5.2 Cau truc bang

| Phien ban | Ngay | Nguoi thay doi | Mo ta thay doi | DCR # |
|-----------|------|---------------|---------------|-------|
| V0 | 2025-06-01 | Nguyen Van A | Phat hanh lan dau | DCR-001 |
| V1.1 | 2025-08-15 | Tran Van B | Sua loi chinh ta Section 3, cap nhat link Section 10 | DCR-015 |
| V2.0 | 2025-11-01 | Nguyen Van A | Them gate G4, thay doi vai tro QC Lead | DCR-042 |

### 5.3 Quy tac ghi

- Ghi moi lan thay doi, ke ca cap nhat nho.
- Mo ta thay doi cu the: ghi section nao, thay doi gi. KHONG ghi "cap nhat noi dung".
- Moi dong co so DCR tuong ung (tru sua loi chinh ta nho).
- Giu toan bo lich su, KHONG xoa dong cu.

---

## 6. Luu tru ho so (Record Retention)

### 6.1 Thoi gian luu tru

| Loai ho so | Thoi gian luu tru | Ghi chu |
|-----------|-------------------|---------|
| Tai lieu QMS hien hanh (SOP, WI, ANNEX) | Vinh vien (tren QMS site) | Phien ban hien tai luon truy cap duoc |
| Tai lieu QMS het hieu luc (Superseded) | Toi thieu 7 nam | Luu tru tren SharePoint Archive |
| DCR (FRM-102) | Toi thieu 7 nam | Luu kem tai lieu tuong ung |
| Peer Review Log (FRM-105) | Toi thieu 7 nam | Luu kem tai lieu tuong ung |
| Ho so san xuat (Job records) | Toi thieu 10 nam hoac theo yeu cau khach hang | Theo hop dong |
| Ho so dao tao (Training records) | Toi thieu 5 nam sau khi nhan vien nghi viec | Theo luat lao dong |
| Ho so kiem dinh (Calibration) | Toi thieu 7 nam | Theo ISO 10012 |
| Ho so audit (Internal/External) | Toi thieu 7 nam | Theo ISO 9001 |

### 6.2 Hinh thuc luu tru

| He thong | Loai ho so | Dinh dang |
|----------|-----------|-----------|
| QMS Site (web) | Tai lieu hien hanh | HTML |
| SharePoint — QMS Records | Tai lieu goc, DCR, review log | PDF (tu HTML) |
| SharePoint — Archive | Tai lieu het hieu luc | PDF |
| Epicor | Ho so san xuat, job records | Du lieu he thong |
| Local backup | Sao luu toan bo | Theo quy dinh IT |

### 6.3 Huy ho so

- Chi huy ho so khi het thoi gian luu tru BAT BUOC.
- QMS Engineer lap danh sach ho so can huy, QA Manager phe duyet.
- Ghi nhan vao FRM-101 Master Document Register.
- KHONG tu y huy ho so khi chua co phe duyet.

---

## 7. Trang thai tai lieu

### 7.1 Cac trang thai

| Trang thai | Ma mau | Y nghia |
|-----------|--------|---------|
| Draft | Vang | Dang soan thao, chua co hieu luc |
| In Review | Cam | Dang ra soat cheo hoac cho phe duyet |
| Approved | Xanh la | Da phe duyet, chua phat hanh |
| Published | Xanh duong | Da phat hanh, dang co hieu luc |
| Superseded | Xam | Het hieu luc, da co phien ban moi thay the |
| Obsolete | Do | Bi huy bo, khong con su dung |

### 7.2 Chuyen doi trang thai

```
Draft ----submit----> In Review
In Review --reject--> Draft (tra ve sua)
In Review --approve-> Approved
Approved --publish--> Published
Published --new rev-> Superseded (phien ban cu)
Published --cancel--> Obsolete (bi huy)
```

### 7.3 Quy tac

- Tai noi lam viec chi duoc su dung tai lieu trang thai **Published**.
- Tai lieu **Superseded** va **Obsolete** PHAI ghi ro "KHONG CON HIEU LUC" tren trang dau.
- QMS Engineer kiem tra hang thang: khong co tai lieu Draft qua 30 ngay chua submit.
- QMS Engineer kiem tra hang thang: khong co tai lieu In Review qua 10 ngay chua phe duyet.

---

## 8. So do tong the quy trinh

```
                    +----------+
                    |  Trigger |
                    | (DCR,    |
                    | new doc, |
                    | audit    |
                    | finding) |
                    +----+-----+
                         |
                         v
                    +----------+
                    |  DRAFT   |
                    | (Owner   |
                    |  soan)   |
                    +----+-----+
                         |
                    +----v-----+
                    |  SUBMIT  |
                    | (FRM-102)|
                    +----+-----+
                         |
                    +----v-----+
                    |  CROSS-  |
                    |  REVIEW  |
                    | (FRM-105)|
                    +----+-----+
                         |
                    +----v-----+
              +-----|  APPROVE |-----+
              |     | (QA Mgr) |     |
              |     +----------+     |
              v                      v
        +-----------+          +-----------+
        | APPROVED  |          | REJECTED  |
        +-----------+          | (tra ve   |
              |                |  Draft)   |
              v                +-----------+
        +-----------+
        | PUBLISH   |
        | (QMS Eng) |
        +-----+-----+
              |
              v
        +-----------+
        | PUBLISHED |
        | (hieu luc)|
        +-----------+
```
