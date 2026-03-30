# 27. ANNEX archetypes and QA guide

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Muc tieu

Tai lieu nay bo sung cho `08-document-types.md` de khoa `archetype` cho ANNEX.

ANNEX la tai lieu tham chieu co cau truc linh hoat, nhung khong duoc linh tinh.
Muc tieu:
- ANNEX la bang tra, matrix, method, map, spec hoac worked example;
- ANNEX khong bien thanh narrative SOP;
- ANNEX khong gianh viec voi WI;
- moi ANNEX chi giu mot domain logic ro rang.

---

## 2. Nguyen tac nen

1. ANNEX la tai lieu `lookup and control support`, khong phai tai lieu ke chuyen.
2. ANNEX phai co it nhat mot bang, matrix, map hoac block specification co cau truc.
3. ANNEX khong duoc dung de che mot SOP/WI chua viet xong.
4. Neu nguoi doc can lam theo tung buoc tai diem su dung, do la WI.
5. Neu tai lieu dang dinh nghia gate, role authority, boundary quy trinh cap he thong, do la SOP.
6. Published ANNEX header phai khoa o muc family, khong duoc chen archetype, series hoac domain vao subtitle:
   - subtitle bat buoc: `Tài liệu vận hành • Annex`;
   - meta labels bat buoc: `Mã`, `Phiên bản`, `Ngày hiệu lực`, `Chủ sở hữu`, `Phê duyệt`;
   - archetype nhu `Method`, `Rule-Pack`, `Dictionary`, `Specification` chi o core standard, decision log va working notes.
7. Header ANNEX phai tach rieng hai node: `<span class="doc-code">ANNEX-xxx</span>` va `<strong class="doc-name">Ten tai lieu</strong>`; portal runtime khong duoc ghep lai thanh mot chuoi plain text.

---

## 3. Bay ANNEX archetypes duoc phep

| Archetype | Dung cho | Dinh dang uu tien |
|---|---|---|
| `Matrix Annex` | RACI, authority, access, deputy, cross-reference | Bang 2 chieu |
| `Method Annex` | Sampling, formula, calculation, method logic, reaction method | Bang + cong thuc + vi du ngan |
| `Rule-Pack Annex` | Tap quy tac domain cu the | Danh sach quy tac + consequence |
| `Dictionary Annex` | KPI dictionary, data dictionary, term/code table | Lookup table |
| `Map/Topology Annex` | Process map, system topology, org map, route map | So do + legend + table |
| `Worked Example Annex` | Evidence pack mau, case minh hoa, sample packet | Example pack co giai thich |
| `Specification Annex` | Acceptance criteria, material/surface/package/spec limits | Bang parameter-target-method-source |

---

## 4. Matrix Annex

### Dung khi

- Vai tro x quyen.
- Role x gate.
- Department x interface.
- Deputy x absence coverage.

### Khong dung khi

- Can giai thich step thao tac.
- Can governance narrative dai.

### QA checklist

- Hang/cot co ro y nghia khong?
- Co mot nguon authority ro khong?
- Co can narrative dai hon 2-3 cau mo dan khong? Neu co, kha nang sai type.

---

## 5. Method Annex

### Dung khi

- AQL, MSA, SPC-lite, calculation rule, method decision tree.
- Phuong phap do/phan loai can cong thuc, bang tra, rule phan ung.

Template copy-paste mac dinh:
- `templates/annex-method-template.html`
- Template nay khoa method logic, formula/table, decision rule, vi du ngan va note quay ve WI/SOP khi can thao tac.
- Header published cua template van phai dung subtitle family-level, khong doi thanh `Method Annex`.

### Khong dung khi

- Step thao tac tai may/do ban.
- Acceptance target thuan tuy.

### QA checklist

- Co cong thuc, bang tra, sample input/output hoac decision rule khong?
- Co bi tron voi checklist thao tac khong?
- Co cho nguoi doc biet khi nao phai quay ve WI/SOP khong?

---

## 6. Rule-Pack Annex

### Dung khi

- Domain co nhieu quy tac dispatch, FIFO, packaging, receiving, FOD, governance rule.

### Cau truc toi thieu

Moi rule nen co:
- condition;
- action;
- owner hoac enforcing actor;
- consequence neu vi pham.

Template copy-paste mac dinh:
- `templates/annex-rule-pack-template.html`
- Template nay khoa `Rule ID`, `Condition`, `Action`, `Owner`, `Consequence`, khong cho ANNEX tro thanh procedure step-by-step.
- Header published cua template van phai dung subtitle family-level, khong doi thanh `Rule-Pack Annex`.

### QA checklist

- Co rule numbering ro khong?
- Co action/consequence ro khong?
- Co dang trut vao do ca procedure step-by-step khong?

---

## 7. Dictionary Annex

### Dung khi

- KPI dictionary.
- Metadata/data field list.
- SSCC data dictionary.
- Code mapping.

### QA checklist

- Co khoa lookup ro khong?
- Co dinh nghia tung field/code ro khong?
- Co them governance narrative khong can thiet khong?

---

## 8. Map/Topology Annex

### Dung khi

- Org chart.
- Site/library topology.
- CNC operating model.
- Process map.

### QA checklist

- Co so do/legend/bang giai nghia khong?
- Co ro `what is mapped` va `what is not mapped` khong?
- Co bi bien thanh handbook ke chuyen khong?

---

## 9. Worked Example Annex

### Dung khi

- Example evidence pack.
- Poka-yoke example library.
- Sample shipment packet.

### QA checklist

- Co danh dau ro day la `example`, khong phai rule goc khong?
- Co tieu chi de nguoi doc biet khi nao noi dung chi mang tinh minh hoa khong?

---

## 10. Specification Annex

### Dung khi

- Surface finish.
- Vacuum compatibility.
- Packaging class requirements.
- Leak acceptance criteria.
- Cleanliness thresholds.

### Quy tac quan trong

1. Spec table la noi dat `parameter`, `target`, `tolerance`, `unit`, `method`, `source`.
2. Neu so lieu goc nam trong customer spec, drawing, PO, paid standard hoac processor cert, ANNEX phai dan nguon do, khong duoc tu doan so.
3. WI chi nhac lai nguong toi thieu can thao tac, khong duoc tro thanh noi chua master acceptance criteria.

Template copy-paste mac dinh:
- `templates/annex-specification-template.html`
- Template nay khoa bang `parameter-target-tolerance-unit-method-source` va note `source-controlled requirement` khi so lieu goc chua duoc release vao he thong.
- Header published cua template van phai dung subtitle family-level, khong doi thanh `Specification Annex`.

### QA checklist

- Co bang parameter-target-method-source khong?
- Co don vi do va nguon goc khong?
- Co nhot method step-by-step vao ANNEX nay khong?

---

## 11. Canonical location va duplicate rule

1. ANNEX moi phai song tai `series-folder` chinh thuc.
2. Khong tao ban root duplicate cho cung basename.
3. Neu can backward compatibility, chi duoc dung alias co kiem soat tam thoi va phai co backlog de xoa.
4. Canonical path uu tien:
   - path nam trong subfolder chuc nang;
   - file co wrapper HTML day du;
   - file co header/meta hop le;
   - file co noi dung moi nhat da duoc QA.

---

## 12. Ranh gioi ANNEX - WI - SOP

| Noi dung | SOP | WI | ANNEX |
|---|---|---|---|
| Authority/quyen giu cong | Yes | No | Matrix support only |
| Step thuc thi | No | Yes | No |
| Formula/bang tra/spec | No | No | Yes |
| Example packet | No | Han che | Yes |
| Topology/map | Han che | No | Yes |

---

## 13. QA gate truoc phat hanh

Truoc khi release ANNEX, phai tra loi duoc:

1. Archetype nao?
2. Co bang/matrix/spec/map ro rang chua?
3. Co phan narrative nao dang lam viec cua SOP/WI khong?
4. Co duplicate basename hay alias cu khong?
5. Co link sang SOP/WI/FRM dung boi canh su dung khong?
6. Co wrapper HTML day du, title/header/meta va anchor on dinh khong?

---

## 14. Tai lieu doc cung

- `08-document-types.md`
- `11-html-structure-guide.md`
- `26-wi-archetypes-and-qa-guide.md`
- `29-wi-annex-research-redraft-method.md`
- `30-wi-annex-translation-role-bundle-rules.md`
- `templates/annex-method-template.html`
- `templates/annex-rule-pack-template.html`
- `templates/annex-specification-template.html`
