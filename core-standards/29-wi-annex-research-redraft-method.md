# 29. WI-ANNEX research and redraft method

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Muc tieu

Tai lieu nay khoa phuong phap nghien cuu va viet lai WI/ANNEX theo tung tai lieu.

Muc tieu la chan 5 loi:
- viet lai WI hang loat theo mot khuon ma khong dua vao user that;
- de SOP logic, matrix hoac spec lot vao WI;
- de procedure narrative lot vao ANNEX;
- doan acceptance criteria khi nguon goc la customer spec hoac paid standard;
- sua hinh thuc truoc khi chot ranh gioi tai lieu.

---

## 2. Nguyen tac bat buoc

1. Moi WI/ANNEX phai duoc nghien cuu rieng.
2. Khong duoc dung 1 mau noi dung de ep ca 1 series.
3. Chuan hoa duoc phep o lop:
   - header;
   - HTML wrapper;
   - archetype QA;
   - visual rules;
   - role/bundle rule.
   Header normalization chi duoc dong vao:
   - title tag;
   - family subtitle;
   - meta labels;
   - `.doc-code` hook cho ma tai lieu;
   - UTF-8-safe text handling.
   Khong duoc nhan co hoi sua header de chen archetype, series hoac domain vao published subtitle.
4. Noi dung van hanh phai chot theo user, risk va evidence cua tung tai lieu.
5. Neu acceptance criteria khong co nguon chinh thuc, khong duoc tu dien so.

---

## 3. Trinh tu 8 buoc

### Buoc 1. Doc tai lieu cu

Doc it nhat:
- title;
- section/h2;
- links den SOP/WI/ANNEX/FRM;
- note hidden phase residue;
- phan nao dang lam viec cua SOP/WI/ANNEX khac.

### Buoc 2. Xac dinh user that

Phai tra loi:
- ai dung?
- dung o dau?
- dung khi nao?
- dung de ra quyet dinh gi?

### Buoc 3. Chot loai tai lieu

Chon:
- POU-WI;
- Gate-Execution WI;
- Control-Tower WI;
- Digital-Operation WI;
- hoac 1 trong 7 ANNEX archetype.

Neu khong ro, tam dung va tach boundary truoc.

### Buoc 4. Tach noi dung sai layer

Rut ra:
- gate definition/RACI/KPI definition -> SOP;
- matrix/method/spec/map/worked example -> ANNEX;
- step thao tac tai diem dung -> WI.

### Buoc 5. Nghien cuu nguon ben ngoai

Chi dung nguon chinh thong hoac nguon goc.

Bo benchmark toi thieu cho repo nay:

| Domain | Nguon uu tien | Y nghia su dung |
|---|---|---|
| QMS flexibility | ISO 9001:2015 official page | Xac nhan ISO yeu cau QMS controls va documented information, khong ep tao WI cho moi viec |
| Standardized work | IATF public OEM CSR documents | Xac nhan `what-how-why`, operator instruction, visual standard |
| Acceptance sampling | ISO 2859-1 official page + released internal controlled table | Khoa boundary AQL method vs WI execution va khong sao chep bang tra co ban quyen vao ANNEX |
| FAI | SAE AS9102 + IAQG official FAQ/forms | Khoa boundary cho WI-302 va form stack |
| Logistic label | GS1 Logistic Label Guideline + GS1 General Specifications + ISO/IEC 15416 official page | Khoa SSCC, GS1-128, placement, print quality logic va verification method cho linear symbol |
| Digital resilience | NIST SP 800-34 Rev.1 | Khoa BIA, contingency, recovery priorities, offline fallback logic |
| Media sanitization | NIST SP 800-88 Rev.2 | Khoa sanitization program, validation, storage media handling |
| Semiconductor safety/cleanliness | SEMI public standard pages, standard notices, customer specs | Khoa S2, purity/particle/surface/material context, khong tu doan acceptance limits |

### Buoc 6. Chot nguon acceptance criteria

Thu tu uu tien:
1. drawing/spec/PO/customer note;
2. released customer CSR;
3. official standard/public appendix;
4. approved processor or internal released specification annex.

Neu acceptance number nam trong paid standard khong public:
- khong doan;
- ghi ro `source-controlled requirement`;
- dua master limit vao Specification Annex sau khi owner cung cap nguon.

### Buoc 7. Viet lai

WI:
- viet cho user thuc thi;
- ngan, ro, co PASS/FAIL.

ANNEX:
- viet theo bang/matrix/spec/map;
- khong ke chuyen dai.

### Buoc 8. QA va release

Check:
- dung archetype chua?
- dung source chua?
- dung role/bundle chua?
- con phase residue khong?
- con duplicate/alias/fragment HTML khong?

---

## 4. Benchmark rules phai noi ro trong working notes

Nguoi sua phai luu ngoai than tai lieu:
- link nguon;
- ngay tra cuu;
- yeu to benchmark da dung;
- cho nao la fact;
- cho nao la suy luan noi bo.

Mau de nghi:
- `templates/wi-annex-research-working-notes-template.md`

Khong dua note bien tap va reasoning nay vao than WI/ANNEX phat hanh.

---

## 5. Rule suy luan tu benchmark

Duoc phep suy luan neu:
- nguon goc xac nhan huong dieu hanh;
- context HESEM can muc tieu noi bo chat hon;
- suy luan duoc danh dau ro trong working notes.

Khong duoc suy luan:
- acceptance numbers;
- mandatory fields cua standard/paper form;
- barcode symbology;
- sanitization/disposal claim;
- customer-specific release rules.

---

## 6. Rule thuc chien cho semiconductor/vacuum

1. Cleanroom/vacuum WI uu tien cao khi business target la semiconductor/vacuum.
2. Method va thao tac de o WI.
3. Surface/leak/cleanliness acceptance criteria de o Specification Annex.
4. Khong hardcode so leak/surface/particle neu nguon goc chua duoc release vao he thong.

---

## 7. Checklist hoan tat

1. Da doc tai lieu cu chua?
2. Da chot user that chua?
3. Da chot archetype chua?
4. Da tach sai-layer content chua?
5. Da dung nguon chinh thong ben ngoai chua?
6. Da xac nhan nguon acceptance criteria chua?
7. Da chay QA HTML/archetype/phase residue chua?

---

## 8. Tai lieu doc cung

- `13-sop-research-redraft-method.md`
- `26-wi-archetypes-and-qa-guide.md`
- `27-annex-archetypes-and-qa-guide.md`
- `28-pou-visual-and-machine-side-rules.md`
- `30-wi-annex-translation-role-bundle-rules.md`
- `templates/wi-annex-research-working-notes-template.md`
