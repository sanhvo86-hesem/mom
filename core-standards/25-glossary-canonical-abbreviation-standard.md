# 25 - Chuan glossary canonical va full-English cho abbreviation

> Phien ban: V1 | Hieu luc: 2026-03-30 | Chu so huu: QA / QMS

---

## 1. Muc dich

Tai lieu nay khoa chuan cho glossary/tu dien thuat ngu QMS khi tao moi, sua doi va audit du lieu. Muc tieu la:

- moi abbreviation deu co ten day du tieng Anh ro rang de nguoi doc hieu tan goc;
- khong de song song `ABBR` va `Full Term (ABBR)` nhu 2 canonical terms;
- giu nguyen JSON contract hien tai `{term, meaning, vi, def, ctx, rec, cat}` nhung khoa lai y nghia cua tung truong;
- cho phep role code / JD code tiep tuc ton tai trong glossary neu do la actor canonical da duoc cong bo.

---

## 2. Y nghia bat buoc cua tung truong

| Truong | Y nghia canonical | Bat buoc |
|---|---|---|
| `term` | Khoa tra cuu canonical duy nhat | Co |
| `meaning` | Ten day du tieng Anh cua `term` | Co |
| `vi` | Nhan tieng Viet chuan hoa de hien thi va tra cuu | Co khi da co nhan chuan |
| `def` | Dinh nghia van hanh ngan gon, neu diem kiem soat chinh | Co |
| `ctx` | Boi canh su dung trong HESEM | Nen co |
| `rec` | Ho so / bang chung lien quan | Nen co |
| `cat` | Nhom phan loai de loc va quan tri | Co |

Quy tac khoa cung:

- `meaning` khong con la "y nghia ngan" hay "mo ta ngan";
- `meaning` PHAI la full-English expansion hoac English canonical phrase;
- khong phat hanh term moi neu thieu `meaning`.

---

## 3. Canonical rule cho abbreviation

### 3.1 Neu `term` la abbreviation

- `meaning` PHAI la ten day du tieng Anh, vi du:
  - `OTD` -> `On-Time Delivery`
  - `FOD` -> `Foreign Object Debris / Foreign Object Damage`
  - `QA-01` -> `Quality Assurance / QMS Manager`
- `meaning` KHONG duoc lap lai chinh abbreviation, vi du:
  - sai: `OTD` -> `OTD`
  - sai: `QA-01` -> `QA-01`
- neu abbreviation co 2 nghia van hanh that su dang cung ton tai, duoc phep dung dual expansion co kiem soat bang slash trong `meaning`.

### 3.2 Canonical key

Voi cap `ABBR` va `Full Term (ABBR)`:

- `ABBR` PHAI la canonical term;
- `Full Term (ABBR)` chi duoc xem la alias de search, migration va audit;
- khong duoc tao moi `Full Term (ABBR)` thanh mot record canonical doc lap.

### 3.3 Query va hien thi

- nguoi dung PHAI tim thay term bang abbreviation, full English va tieng Viet;
- ket qua hien thi theo thu tu:
  - `term`
  - `meaning`
  - `vi`
  - `def / ctx / rec`

---

## 4. Role code / JD code trong glossary

Role code hoac JD code van duoc phep ton tai trong glossary neu da duoc cong bo va duoc dung lap lai trong tai lieu phat hanh.

Quy tac bat buoc:

- `term` giu dang role/JD code canonical, vi du `QA-01`, `PUR-02`, `EXE-01`;
- `meaning` PHAI la chuc danh tieng Anh day du;
- `vi` PHAI la ten vai tro tieng Viet chuan hoa;
- khong duoc de `meaning` trong dang code hoac code lap lai.

---

## 5. Nhom ngoai le va bucket audit

Khi audit glossary, PHAI tach rieng cac bucket sau:

- abbreviation thieu hoac weak full-English;
- alias dang `Full Term (ABBR)` da co canonical `ABBR`;
- alias dang `Full Term (ABBR)` chua co canonical `ABBR`;
- abbreviation dual meaning hop le dang slash;
- role code / JD code giu lai trong glossary;
- status words nhu `PASS`, `FAIL`, `REWORK`, `REJECT`.

Luu y:

- status words khong duoc xep chung voi abbreviation bucket de tranh validate sai;
- slash chi duoc dung cho dual meaning that su, khong dung tuy tien de "gop cho nhanh".

---

## 6. Rule tao term moi

Moi luong tao glossary term moi PHAI tuan thu:

1. chot `term` canonical;
2. nhap `meaning` la ten day du tieng Anh;
3. nhap `vi` la nhan tieng Viet chuan hoa;
4. viet `def` theo ngon ngu van hanh, khong lai Anh-Viet;
5. kiem tra xem term do co dang alias `Full Term (ABBR)` hay khong;
6. neu la abbreviation, xac nhan `meaning` khong lap lai code.

Khong duoc release glossary item moi neu vi pham bat ky diem nao ben tren.

---

## 7. Thuc thi tren portal va data remediation

Portal dictionary va API PHAI enforce cung mot rule:

- client-side validation;
- server-side validation;
- migration / remediation script de don du lieu cu;
- search normalization de query kieu `On-Time Delivery (OTD)` tra ve `OTD`.

Sau remediation:

- alias `Full Term (ABBR)` khong con la canonical row;
- du lieu glossary offline va du lieu portal PHAI dong bo cung mot nguon JSON/JS.
