# 30. WI-ANNEX translation, role and bundle rules

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Muc tieu

Tai lieu nay khoa:
- cach viet tieng Viet cho WI/ANNEX tai hien truong;
- ngoai le tieng Anh duoc giu;
- cach render role code, D-code va bundle;
- cach viet text machine-side sao cho doc duoc va khong lai Anh-Viet.

---

## 2. Nguyen tac ngon ngu

1. WI/ANNEX phuc vu van hanh that, khong phuc vu van phong mau me.
2. Uu tien tieng Viet van hanh ngan, ro.
3. Khong viet nua Anh nua Viet neu khong nam trong list ngoai le.
4. Ma, code, AI, application identifier, symbology, doi tuong ky thuat co the giu nguyen neu do la dang nhan dang chuan.
5. Header published cua WI/ANNEX khong duoc tron family voi archetype, domain hoac series code trong dong subtitle.
6. Meta labels cua WI/ANNEX phai dong nhat bang tieng Viet da khoa:
   - `Mã`
   - `Phiên bản`
   - `Ngày hiệu lực`
   - `Chủ sở hữu`
   - `Phê duyệt`
7. Ma tai lieu o header duoc giu dang code goc nhung phai render qua `.doc-code`; ten tai lieu giu font body/header chu, khong tron cung mot font code.

---

## 3. Ngoai le duoc giu tieng Anh

Mac dinh dung theo `03-language-and-translation.md` va `25-glossary-canonical-abbreviation-standard.md`.

Ngoai le dung thuong xuyen trong WI/ANNEX job-order CNC:
- `Setup`
- `Traveler`
- `FAI`
- `SPC`
- `Cpk`
- `MSA`
- `GS1-128`
- `SSCC`
- `SoR`
- `SSOT`
- `Program ID`, `Rev`, `ToolID`, `WCS`
- proper noun he thong/brand/standard

Neu mot term duoc giu tieng Anh, khong duoc viet lai theo kieu half-English:
- sai: `quick-check to decision ho so`
- dung: `kiem nhanh truoc khi mo gate`

---

## 4. Rule viet POU text

1. Dong tu menh lenh dung o dau cau.
2. Cau ngan.
3. Hien ro doi tuong:
   - part;
   - tool;
   - fixture;
   - lot;
   - label;
   - bag;
   - record.
4. Khong dung cum mo ho:
   - `bo phan lien quan`;
   - `nguoi phu trach`;
   - `system owner`;
   - `line manager`;
   - `tieu chuan yeu cau`.

---

## 5. Rule cho role code va D-code

### 5.1 Role code

- Header owner/approver phai dung role chip JD-linked.
- Trong body, lan dau co the dung `role chip + ten day du` neu can.
- Khong dung text tran thay cho role chip o owner cell, gate cell, hold/release cell.

### 5.2 D-code

- Dung D-code cho function/department boundary.
- Khong thay D-code cho base role.
- Vi du:
  - `D-ENG` cho engineering function;
  - `ENGM` cho engineering lead/manager.

### 5.3 Bundle

Bundle chi duoc dung khi da cong bo trong:
- registry;
- glossary bundle page;
- workbook.

Khong tu ghep bundle tam trong tai lieu phat hanh.

---

## 6. Rule viet section 3 va section link

WI/ANNEX neu co section term hay dictionary phai obey:
- `English term (viet chuan)` cho ten thuat ngu khi can.
- `meaning` canonical full-English nam trong glossary data, khong nhot lai vao moi file neu khong can.
- Section link phai dung ma tai lieu that, khong viet ten mo ho.

---

## 7. Rule cho machine-side phrases

Uu tien cach viet:
- `part dau`
- `kiem nhanh truoc Cycle Start`
- `giu lot`
- `dung may`
- `do lai dac tinh bi anh huong`
- `gan nhan truy xuat`

Khong viet:
- `first cut decision packet`
- `quick-check to decision`
- `restart boundary`
- `machine readiness governance`

Neu can bieu thi `why`, dung:
- `Ly do: ...`

---

## 8. Rule cho specification language

Trong Specification Annex, cho phep giu:
- ten parameter chuan;
- ky hieu do nham lan neu dich;
- unit;
- standard code.

Nhung phan mo ta van phai ro va nhat quan.
Vi du:
- `Ra`
- `Rz`
- `helium leak rate`
- `particle count`
- `Class`

Khong dich sai lam mat nghia ky thuat.

---

## 9. Rule chan residue va comment bien tap

Cam de lai trong WI/ANNEX phat hanh:
- `phase2f`, `phase3a`, `override dieu hanh`, `bo sung thuc chien`, `phase note`;
- placeholder rong;
- note migration noi bo;
- ly do AI rewrite.

Noi dung nay chi duoc giu trong report, commit log hoac working notes.

---

## 10. QA checklist

1. Con half-English khong can thiet khong?
2. Role/D-code/bundle co dung dung layer khong?
3. Co placeholder mo ho khong?
4. Co phase residue hay note bien tap khong?
5. Cau text co doc duoc tai hien truong khong?

---

## 11. Tai lieu doc cung

- `03-language-and-translation.md`
- `19-role-boundary-jd-linking-and-role-codes.md`
- `20-department-boundary-handbook-codes.md`
- `25-glossary-canonical-abbreviation-standard.md`
- `26-wi-archetypes-and-qa-guide.md`
- `27-annex-archetypes-and-qa-guide.md`
- `28-pou-visual-and-machine-side-rules.md`
