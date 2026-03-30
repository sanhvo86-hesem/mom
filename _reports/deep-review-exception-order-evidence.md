---
title: "DEEP REVIEW: Exception Dashboard, Order Management, Evidence Management"
date: 2026-03-30
scope: Backend, Schema, Frontend, Logic, UX
status: implemented-and-audited
---

# DEEP REVIEW: Ba Module Loi - Ngoai Le, Don Hang, Chung Cu

## Muc luc

1. [BANG NGOAI LE (Exception Dashboard)](#1-bang-ngoai-le)
2. [QUAN LY DON HANG (Order Management)](#2-quan-ly-don-hang)
3. [QUAN LY CHUNG CU (Evidence Management)](#3-quan-ly-chung-cu)
4. [TICH HOP REV VAO PART](#4-tich-hop-rev-vao-part)
5. [BANG TONG HOP LOI VA DE XUAT](#5-bang-tong-hop)

---

## 1. BANG NGOAI LE (Exception Dashboard)

### 1.1 LOI BACKEND / LOGIC

#### BUG-EXC-01: `highPriority` tinh trung voi `total` (Severity: HIGH)
**File:** `14-exception-dashboard.js:550-551`
**Mo ta:** Bien `highPriority` cong tat ca cac exception type ngoai tru `overdue_capas`, `failed_uploads`, `orphan_links` - nghia la no gan nhu bang `total`. Dieu nay lam mat y nghia cua chi so "Uu tien cao".
**De xuat:**
```javascript
// CHI tinh cac nhom thuc su high-priority:
highPriority = Number(state.summary.overdue_allocations || 0)
  + Number(state.summary.wo_missing_evidence || 0)
  + Number(state.summary.program_mismatches || 0)
  + Number(state.summary.alarm_hotspots || 0)
  + Number(state.summary.launch_blocker_hotspots || 0)
  + Number(state.summary.overdue_orders || 0);
```
Loai bo cac nhom co severity thap hon (shadow_sync, primary_read_fallbacks, dpp_readiness_gaps, energy_tracking_gaps, cost_variance_risk) khoi highPriority.

#### BUG-EXC-02: Missing `break` trong `switch` cua exception_detail (Severity: CRITICAL)
**File:** `api.php:18626-18633`
**Mo ta:** Case `exception_dashboard` khong co `break` truoc case `exception_detail`. PHP switch fall-through se khien `exception_dashboard` chay tiep vao `exception_detail` truoc khi `api_json()` exit.
**De xuat:** Kiem tra tat ca cac case trong switch block nay, dam bao `api_json()` goi `exit()` noi bo hoac them `break` tuong minh.

#### BUG-EXC-03: `build_exception_dashboard_data()` load toan bo bundle moi lan (Severity: MEDIUM)
**File:** `api.php:18628`
**Mo ta:** Moi lan goi exception_dashboard deu doc lai toan bo `runtime_read_model_bundle(true)` bao gom orders, master-data, MES runtime - day la I/O nang. Voi auto-refresh 5 phut, day la bottleneck.
**De xuat:**
- Cache ket qua exception summary vao file tam `qms-data/cache/exception_summary.json` voi TTL 60 giay
- Chi rebuild khi cache expired hoac force-refresh

#### BUG-EXC-04: Pagination khong gioi han `per_page` hop ly (Severity: LOW)
**File:** `api.php:18639`
**Mo ta:** `per_page` gioi han 100, nhung export CSV goi `per_page: 1000` (JS line 754). Backend cho phep toi da 100 nhung frontend gui 1000 -> chi nhan duoc 100 items khi export.
**De xuat:**
- Tang gioi han backend len 500 cho export hoac them tham so `export=true` de bo pagination
- Hoac frontend goi nhieu trang roi merge truoc khi xuat CSV

#### BUG-EXC-05: `overdue_orders` thieu `scheduled_end` cho WO (Severity: MEDIUM)
**File:** `api.php:18690`
**Mo ta:** WO su dung `scheduled_end` thay vi `due_date`, nhung logic chi check `due_date`. WO khong co `due_date` se bi bo qua du da qua han `scheduled_end`.
**De xuat:**
```php
$due = (string)($ord['due_date'] ?? $ord['scheduled_end'] ?? '');
```

### 1.2 LOI DO HOA / UX

#### UX-EXC-01: Grid 3 cot voi 33 card gay overload visual (Severity: HIGH)
**Mo ta:** 33 exception card tren grid 3 cot = 11 hang, nguoi dung phai scroll rat nhieu. Cac card co count = 0 van chiem khong gian nhu card co count > 0.
**De xuat:**
- Them filter/tab phan nhom: "Tat ca", "San xuat (MES)", "Don hang", "Ho so", "He thong"
- Mac dinh an cac card co count = 0, them toggle "Hien tat ca"
- Sap xep card theo count giam dan de card can xu ly len dau

#### UX-EXC-02: Detail panel co dinh ben phai khong responsive (Severity: MEDIUM)
**Mo ta:** Layout `grid-template-columns: minmax(0,1.1fr) minmax(360px,.9fr)` khien detail panel co dinh 360px toi thieu tren mobile gay tran layout.
**De xuat:** Tren viewport < 1200px, chuyen detail panel thanh full-width phia duoi hoac dung modal overlay.

#### UX-EXC-03: Thieu severity indicator tren card (Severity: MEDIUM)
**Mo ta:** Moi card chi hien count, khong hien muc do nghiem trong. Count = 1 nhung critical khac hoan toan voi count = 50 nhung informational.
**De xuat:** Them severity badge (Critical / Warning / Info) hoac color-coded ring quanh count number.

#### UX-EXC-04: Export CSV thieu cot va encoding sai cho Excel (Severity: LOW)
**File:** `14-exception-dashboard.js:760-777`
**Mo ta:** CSV chi xuat 6 cot co ban. Thieu cac truong quan trong: severity, SLA deadline, owner_role, resolution_notes. BOM UTF-8 co nhung Excel co the khong hieu dung.
**De xuat:** Xuat XLSX thay vi CSV (dung SheetJS/xlsx library da co trong project) de giai quyet ca encoding va formatting.

#### UX-EXC-05: Khong co Deep Link den tung exception item (Severity: MEDIUM)
**Mo ta:** Khi click "Mo workspace" chi navigate den trang chung (forms, orders, mes) khong focus vao item cu the.
**De xuat:** Truyen query parameter `?highlight={id}` de workspace dich tu dong scroll va highlight item.

### 1.3 LOI THAO TAC

#### OP-EXC-01: Khong co bulk action tren exception items (Severity: HIGH)
**Mo ta:** Truong ca phai xu ly tung item mot. Voi 50+ items trong mot queue, day la thao tac khong hieu qua.
**De xuat:**
- Them checkbox de chon nhieu items
- Them bulk actions: "Assign to...", "Escalate", "Dismiss", "Export selected"

#### OP-EXC-02: Thieu ghi chu / comment tren exception (Severity: HIGH)
**Mo ta:** Khong co cach ghi nhan ly do da xu ly, tien trinh, hoac ghi chu cho ca tiep theo.
**De xuat:** Them truong "notes" per exception item voi audit trail: ai ghi, luc nao, noi dung gi.

#### OP-EXC-03: Thieu notification khi exception moi xuat hien (Severity: MEDIUM)
**Mo ta:** Chi co auto-refresh 5 phut. Neu exception critical xuat hien (alarm_hotspots, launch_blocker), phai doi toi 5 phut moi biet.
**De xuat:**
- Giam refresh interval xuong 60 giay cho cac nhom critical
- Tich hop LISTEN/NOTIFY cua PostgreSQL (da co migration 030) de push real-time
- Browser notification khi exception moi thuoc nhom critical

---

## 2. QUAN LY DON HANG (Order Management)

### 2.1 LOI BACKEND / SCHEMA

#### BUG-ORD-01: Status enum khong nhat quan giua backend va frontend (Severity: CRITICAL)
**File:** `OrderService.php:24-30` vs `09e-so-jo-wo-dashboard.js:16-42`
**Mo ta:**
- Backend `OrderService.php` dinh nghia: SO = `OPEN, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD`
- Frontend dinh nghia: SO = `draft, quoted, confirmed, in_production, shipped, closed, cancelled`
- Backend `OrderWorkflowService.php` dung lowercase: `draft, quoted, confirmed...`
- Day la 2 bo status HOAN TOAN KHAC NHAU. `OrderService.php` co the dang outdated hoac chua duoc cap nhat khi workflow service moi duoc tao.
**De xuat:**
- Xoa `SO_STATUSES`, `JO_STATUSES`, `WO_STATUSES` khoi `OrderService.php` vi chung khong duoc su dung trong logic filter (line 94 dung strtoupper nhung status thuc te la lowercase)
- Hoac cap nhat cho dung voi `OrderWorkflowService.php` va `so_jo_wo_config.json`
- Tao file `OrderStatusEnum.php` lam single source of truth

#### BUG-ORD-02: `listSalesOrders()` filter status dung `strtoupper()` sai (Severity: HIGH)
**File:** `OrderService.php:95`
**Mo ta:** Filter dung `strtoupper($so['status'])` nhung status luu trong JSON la lowercase (tu `OrderWorkflowService`). Neu frontend gui `status=draft`, backend se so sanh `DRAFT` vs `draft` -> khong match -> tra ve 0 results.
**De xuat:** Bo `strtoupper()`, so sanh truc tiep lowercase.

#### BUG-ORD-03: `order_so_create` thieu `break` / fall-through risk (Severity: HIGH)
**File:** `api.php:17262-17334`
**Mo ta:** Case `order_so_create`, `order_jo_create`, `order_wo_create` dung chung mot block. `api_json()` co goi `exit()` nen khong fall-through, NHUNG neu `api_json()` bi modify sau nay thi se la bug. Ngoai ra, WO create goi `mes_wo_transition_guard()` va neu no tra ve kq thi `api_json($launchGuard, 409)` nhung code van tiep tuc `save_orders_store($orders)` o line 17332 vi khong co `return` sau guard.
**De xuat:**
- Them `return` tuong minh sau moi `api_json()` call
- Hoac refactor sang early-return pattern

#### BUG-ORD-04: Race condition khi nhieu nguoi edit cung order (Severity: HIGH)
**File:** `api.php:17414, OrderWorkflowService.php:294`
**Mo ta:** `load_orders_store()` doc file JSON, edit, roi `save_orders_store()` ghi lai. Neu 2 request dong thoi:
1. User A doc orders.json (version 1)
2. User B doc orders.json (version 1)
3. User A ghi orders.json (version 2a)
4. User B ghi orders.json (version 2b) -> Mat thay doi cua User A
**De xuat:**
- Dung file locking: `flock()` khi doc va ghi
- Hoac them `_version` field va check optimistic locking khi save
- Long-term: migrate sang PostgreSQL transaction

#### BUG-ORD-05: `order_update_fields` khong kiem tra terminal status truoc khi edit (Severity: HIGH)
**File:** `api.php:17437-17445`
**Mo ta:** Backend chi kiem tra field co trong `EDITABLE_FIELDS` nhung khong check order co dang o terminal status (closed, cancelled, shipped, completed) hay khong. Logic terminal check nam trong `OrderWorkflowService.executeFieldEdit()` nhung neu ham do bi bypass thi field van duoc update.
**Kiem tra:** Xac nhan `executeFieldEdit()` co check terminal status. Neu co, day la acceptable, nhung nen them guard o API layer nua.

#### BUG-ORD-06: WO create khong ke thua `part_number`, `part_revision` tu parent JO (Severity: MEDIUM)
**File:** `api.php:17321-17328`
**Mo ta:** Khi tao WO moi, chi ke thua `jo_number` ma khong tu dong copy `part_number`, `part_revision`, `customer_id` tu parent JO. Dieu nay khien WO thieu thong tin truy xuat.
**De xuat:**
```php
$record['part_number']   = (string)($parentJo['part_number'] ?? '');
$record['part_revision'] = (string)($parentJo['part_revision'] ?? '');
$record['customer_id']   = (string)($parentJo['customer_id'] ?? '');
```

### 2.2 LOI DO HOA / UX

#### UX-ORD-01: Pipeline (Kanban) view drag-drop khong save (Severity: HIGH)
**File:** `09e-so-jo-wo-dashboard.js:494-499`
**Mo ta:** Drag-drop co event handler nhung chi goi `_pipelineStatus()` de map column sang status. Tuy nhien, `dragend` handler chi remove class `drag`, khong co logic goi API update status. Drop event goi `_api()` nhung destination status mapping sai - `_pipelineStatus()` map "completed" column sang "shipped" cho SO nhung khong phai tat ca SO completed deu la shipped.
**De xuat:**
- Xac nhan drop handler goi API dung
- Hien confirm dialog truoc khi thay doi status qua drag
- Disable drag cho items o terminal status

#### UX-ORD-02: Edit form gui TAT CA field thay vi chi field da thay doi (Severity: MEDIUM)
**File:** `09e-so-jo-wo-dashboard.js:464-467`
**Mo ta:** `_showEdit` collect tat ca field tu FormData roi gui len server. Backend `order_update_fields` chi process cac field co trong `EDITABLE_FIELDS` va skip cac field khong thay doi (line 17442), nhung van gui du lieu thua qua network.
**De xuat:** Frontend chi gui cac field co gia tri khac voi gia tri ban dau:
```javascript
var original = _selected.data || {};
fd.forEach(function(v,k){
  if(v === '' && (original[k] === null || original[k] === undefined)) return;
  if(String(v) === String(original[k] ?? '')) return;
  // ... chi them field thay doi vao changes
});
```

#### UX-ORD-03: Revision lookup khong filter theo `part_number` (Severity: HIGH)
**File:** `09e-so-jo-wo-dashboard.js:123`
**Mo ta:** Khi tao/edit JO, dropdown revision hien TAT CA revision cua moi part. Dung ra chi nen hien revision cua part da chon. Hien tai `_lookupRows('revisions')` tra ve toan bo `m.revisions` khong filter.
**De xuat:**
```javascript
if(kind==='revisions'){
  var selectedPart = form ? (form.querySelector('[name="part_number"]')?.value || '') : '';
  return (m.revisions||[])
    .filter(function(x){ return !selectedPart || x.part_number === selectedPart; })
    .map(function(x){ return { value:x.revision, label:x.revision, sub:(x.part_number||'')+' · '+(x.status||'') }; });
}
```
- Them event onChange tren part_number de reload revision dropdown

#### UX-ORD-04: Thieu hien thi `qty_good` va `qty_scrap` tren JO/WO detail (Severity: MEDIUM)
**Mo ta:** JO co field `qty_good`, `qty_scrap` tu auto-aggregate cua WO, nhung khong hien thi tren detail panel. Nguoi dung khong biet tien do san xuat.
**De xuat:** Them progress bar: `qty_good / qty_ordered` voi color indicator (xanh > 90%, vang > 70%, do < 70%).

#### UX-ORD-05: Thieu visual indicator cho ECR required fields (Severity: MEDIUM)
**File:** `OrderWorkflowService.php:155` vs `09e-so-jo-wo-dashboard.js:99`
**Mo ta:** Khi JO o trang thai post-release (released, active), edit `part_revision`, `material_spec`, `routing_id` yeu cau ECR. Nhung frontend khong hien canh bao nay truoc khi user bam Save.
**De xuat:**
- Hien icon canh bao ben canh ECR fields khi order o post-release status
- Hien dialog "Thay doi nay yeu cau ECR. Ban co muon tiep tuc?" truoc khi submit

### 2.3 LOI THAO TAC

#### OP-ORD-01: Khong the tao WO truc tiep tu WO list (Severity: MEDIUM)
**Mo ta:** Phai vao JO detail roi moi bam "+ Work Order". Khong co cach tao WO tu table view hoac pipeline view khi da biet JO number.

#### OP-ORD-02: Thieu duplicate/clone order (Severity: MEDIUM)
**Mo ta:** Khi co repeat order (cung part, cung customer), phai nhap lai tat ca thong tin. Nen co nut "Clone" de tao ban sao.

#### OP-ORD-03: Thieu batch status update (Severity: HIGH)
**Mo ta:** Khong the chon nhieu WO de chuyen trang thai dong loat. Truong ca phai click tung WO mot de update.

---

## 3. QUAN LY CHUNG CU (Evidence Management)

### 3.1 LOI BACKEND / SCHEMA

#### BUG-EVI-01: Hash algorithm khong nhat quan (Severity: MEDIUM)
**File:** `schema.sql:826` vs `schema.sql:3016`
**Mo ta:**
- `form_attachments.file_hash` dung SHA-512 (VARCHAR 128)
- `file_attachments.file_hash` dung SHA-256 (VARCHAR 128)
- Hai bang dung hai algorithm khac nhau nhung cung kich thuoc field.
**De xuat:** Chuan hoa sang SHA-256 hoac SHA-512 cho ca hai. SHA-256 du cho integrity check va nhanh hon.

#### BUG-EVI-02: Evidence SLA `due_soon` tinh sai khi timezone lech (Severity: MEDIUM)
**File:** `api.php:18734`
**Mo ta:** `remaining_hours` duoc tinh bang `strtotime()` voi server timezone. Neu server o UTC nhung user o UTC+7, SLA "con 2 gio" tren server thuc ra la "da qua han 5 gio" voi user.
**De xuat:** Luu `due_at` dang ISO 8601 voi timezone offset va de frontend tinh countdown theo local time.

#### BUG-EVI-03: `evidence_pack_export` khong check quyen (Severity: HIGH)
**File:** `api.php:18073`
**Mo ta:** Can xac nhan endpoint nay co `require_logged_in()` va check quyen `evidence_export` hoac tuong duong. Neu thieu, bat ky user nao cung co the export evidence pack.
**Kiem tra:** Doc ham `evidence_pack_export` de xac nhan access control.

#### BUG-EVI-04: Orphan links detection thieu reverse check (Severity: MEDIUM)
**Mo ta:** Exception `orphan_links` chi check evidence -> order direction. Khong check order -> evidence direction (order co link nhung evidence da bi xoa).
**De xuat:** Them reverse orphan check: scan `form_links` va verify `record_id` con ton tai trong allocation/entry store.

#### BUG-EVI-05: Evidence review khong enforce signing order (Severity: MEDIUM)
**Mo ta:** Multi-level approval (reviewer -> approver -> final approver) khong enforce thu tu. Approver co the ky truoc reviewer.
**De xuat:** Backend nen check `evidence_review_config.signing_order` va reject approval neu step truoc chua hoan thanh.

### 3.2 LOI DO HOA / UX

#### UX-EVI-01: Evidence checklist khong hien real-time progress (Severity: MEDIUM)
**Mo ta:** Checklist chi hien "da nop" hoac "chua nop", khong hien tien trinh review (dang cho review, da approve 1/3 chu ky...).
**De xuat:** Them progress indicator cho moi evidence item: submitted -> in_review -> approved (voi progress bar).

#### UX-EVI-02: Evidence pack view thieu preview anh / PDF (Severity: MEDIUM)
**Mo ta:** Nguoi dung phai download file de xem noi dung. Khong co inline preview cho PDF, hinh anh, hoac bang tinh.
**De xuat:** Tich hop PDF.js viewer cho PDF, image preview cho JPG/PNG, va table preview cho XLSX.

#### UX-EVI-03: Upload validator error message khong ro rang (Severity: LOW)
**File:** `10-upload-validator.js`
**Mo ta:** Khi file name sai quy cach ANNEX-137, thong bao loi chi noi "FAIL" khong giai thich cu the pattern nao sai.
**De xuat:** Hien pattern mau dung ben canh error message, highlight phan sai trong ten file.

### 3.3 LOI THAO TAC

#### OP-EVI-01: Khong the link evidence tu evidence view sang order (Severity: HIGH)
**Mo ta:** Chi co the link tu order detail -> evidence. Khong co huong nguoc lai (tu evidence/allocation view -> chon order de link). Dieu nay khien doc_controller phai navigate qua nhieu buoc.
**De xuat:** Them nut "Link to Order" trong evidence detail view voi searchable order picker.

#### OP-EVI-02: Thieu batch approve cho evidence (Severity: HIGH)
**Mo ta:** QA manager phai mo tung evidence, review, ky so, approve. Voi 50 evidence/ngay, day la 200+ click.
**De xuat:**
- Them "Approve all" cho cac evidence da review xong
- Hoac "Batch review" modal hien danh sach evidence cho phep ky so 1 lan cho nhieu evidence

#### OP-EVI-03: Thieu evidence template auto-attach (Severity: MEDIUM)
**Mo ta:** Khi tao WO moi voi FAI required, he thong khong tu dong tao allocation cho FRM-311 (FAI form). Phai lam thu cong.
**De xuat:** Dua vao `mes_evidence_gate_rules.json`, tu dong tao allocation khi WO duoc tao hoac chuyen sang `setup`.

---

## 4. TICH HOP REV VAO PART (Cai tien chinh)

### 4.1 Hien trang

Hien tai `part_number` va `part_revision` la 2 field doc lap trong JO:
- JO field: `part_number` (lookup: parts), `part_revision` (lookup: revisions)
- Revision lookup tra ve TAT CA revisions, khong filter theo part
- Khong co validation revision thuoc part da chon
- Master data luu rieng: `parts[]` va `revisions[]`

### 4.2 De xuat cai tien

#### REV-01: Cascading Part -> Revision Dropdown
**Scope:** Frontend `09e-so-jo-wo-dashboard.js`
**Chi tiet:**
1. Khi chon `part_number`, tu dong filter `revisions` dropdown chi hien revision cua part do
2. Tu dong chon revision moi nhat co status `released`
3. Auto-fill `part_description` va `material_spec` tu master data
4. Hien canh bao neu chon revision co status `superseded` hoac `draft`

```javascript
// Trong _hydrateCreateForm va _hydrateEditForm:
onSelect: function(item) {
  if(type === 'jo' && field.key === 'part_number') {
    // 1. Auto-fill description
    var desc = form.querySelector('[name="part_description"]');
    if(desc) desc.value = item.description || '';

    // 2. Reload revision dropdown filtered by selected part
    var revTarget = document.getElementById(_id + '-jo-part_revision');
    if(revTarget) {
      var filteredRevs = (m.revisions || [])
        .filter(function(r){ return r.part_number === item.value; })
        .map(function(r){ return { value: r.revision, label: r.revision, sub: r.status || '' }; });
      // Re-initialize SearchableInput with filtered data
      if(typeof SearchableInput === 'function') {
        new SearchableInput({ containerId: revTarget.id, ... dataSource: filteredRevs ... });
      }
      // Auto-select latest released revision
      var latestReleased = filteredRevs.find(function(r){ return r.sub === 'released'; });
      if(latestReleased) { /* set value */ }
    }
  }
}
```

#### REV-02: Backend Validation - Revision phai thuoc Part
**Scope:** `api.php:17454-17468` (da co nhung can strengthen)
**Chi tiet:** Logic hien tai da check, nhung can them:
1. Check revision status phai la `released` (khong cho phep `draft` hoac `superseded`)
2. Check `valid_from` va `valid_to` cua revision con hieu luc
3. Tra ve error message cu the: "REV-B is superseded. Current released revision is REV-C."

```php
if ($entity === 'jo') {
    $partNumber = trim((string)($preview['part_number'] ?? ''));
    $partRevision = trim((string)($preview['part_revision'] ?? ''));
    $matchedRev = null;
    foreach ($revisions as $revision) {
        if (!is_array($revision)) continue;
        if ((string)($revision['part_number'] ?? '') === $partNumber
            && (string)($revision['revision'] ?? '') === $partRevision) {
            $matchedRev = $revision;
            break;
        }
    }
    if (!$matchedRev) {
        api_json(['ok' => false, 'error' => 'revision_not_found_for_part',
            'message' => "Revision {$partRevision} not found for part {$partNumber}"], 422);
    }
    // NEW: Check revision status
    $revStatus = strtolower(trim((string)($matchedRev['status'] ?? '')));
    if ($revStatus !== 'released') {
        api_json(['ok' => false, 'error' => 'revision_not_released',
            'message' => "Revision {$partRevision} has status '{$revStatus}'. Only released revisions can be used."], 422);
    }
}
```

#### REV-03: Hien thi REV trong moi noi Part xuat hien
**Scope:** Toan bo frontend
**Chi tiet:** Hien tai nhieu noi chi hien `part_number` ma khong kem REV:
- Hierarchy tree node JO: hien `714-1101 / Rev.C` (DA CO - tot)
- Table view: cot "Customer / Part" hien part nhung thieu Rev o WO level
- Pipeline card: chi hien `operation_desc` cho WO, thieu part+rev context
- Exception dashboard: `wo_missing_evidence` detail chi hien `part_number part_revision` ghep chuoi, thieu dinh dang

**De xuat:** Tao ham `formatPartRev(part, rev)`:
```javascript
function _partRev(part, rev) {
  if (!part) return '-';
  return part + (rev ? ' Rev.' + rev : '');
}
```
Su dung nhat quan o tat ca noi hien thi.

#### REV-04: WO ke thua Part + Rev tu parent JO
**Scope:** Backend `api.php:17321-17328` va Frontend
**Chi tiet:** Da de cap o BUG-ORD-06. WO PHAI ke thua va hien thi Part + Rev tu parent JO. Dieu nay dam bao:
1. Truy xuat: biet WO san xuat part nao, rev nao
2. NC Program matching: NC program lookup can part + rev + operation
3. Evidence gate: FRM-311 (FAI) can biet part + rev de xac dinh scope
4. Material traceability: lot/heat phai match voi part + rev

#### REV-05: Schema - Them `effective_revision` vao WO
**Scope:** `database/migrations/010_production.sql` hoac migration moi
**Chi tiet:** Hien tai `job_orders` co `bom_revision_used` va `routing_revision_used` nhung khong co `part_revision` truc tiep. JSON store co nhung PostgreSQL schema thieu.
**De xuat:**
```sql
ALTER TABLE job_orders ADD COLUMN part_revision VARCHAR(20);
ALTER TABLE job_operations ADD COLUMN part_revision VARCHAR(20);
-- Index cho truy van theo part + revision
CREATE INDEX idx_job_orders_part_rev ON job_orders(item_id, part_revision);
```

---

## 5. BANG TONG HOP LOI VA DE XUAT

### 5.1 Phan loai theo muc do nghiem trong

| # | Module | Ma | Mo ta | Severity | Loai |
|---|--------|----|-------|----------|------|
| 1 | Order | BUG-ORD-01 | Status enum khong nhat quan | CRITICAL | Backend |
| 2 | Exception | BUG-EXC-02 | Missing break trong switch | CRITICAL | Backend |
| 3 | Order | BUG-ORD-02 | Filter status dung strtoupper sai | HIGH | Backend |
| 4 | Order | BUG-ORD-03 | WO create fall-through risk | HIGH | Backend |
| 5 | Order | BUG-ORD-04 | Race condition khi edit | HIGH | Backend |
| 6 | Order | BUG-ORD-05 | Thieu terminal status check | HIGH | Backend |
| 7 | Exception | BUG-EXC-01 | highPriority = total | HIGH | Logic |
| 8 | Order | UX-ORD-01 | Drag-drop khong save | HIGH | UX |
| 9 | Order | UX-ORD-03 | Revision khong filter theo part | HIGH | UX |
| 10 | Evidence | BUG-EVI-03 | Export thieu auth check | HIGH | Backend |
| 11 | Exception | OP-EXC-01 | Thieu bulk action | HIGH | Thao tac |
| 12 | Exception | OP-EXC-02 | Thieu ghi chu per exception | HIGH | Thao tac |
| 13 | Order | OP-ORD-03 | Thieu batch status update | HIGH | Thao tac |
| 14 | Evidence | OP-EVI-01 | Thieu reverse link | HIGH | Thao tac |
| 15 | Evidence | OP-EVI-02 | Thieu batch approve | HIGH | Thao tac |
| 16 | Exception | BUG-EXC-03 | Dashboard load nang | MEDIUM | Performance |
| 17 | Exception | BUG-EXC-05 | WO thieu scheduled_end | MEDIUM | Backend |
| 18 | Order | BUG-ORD-06 | WO khong ke thua part+rev | MEDIUM | Backend |
| 19 | Evidence | BUG-EVI-01 | Hash khong nhat quan | MEDIUM | Schema |
| 20 | Evidence | BUG-EVI-02 | SLA timezone sai | MEDIUM | Backend |
| 21 | Evidence | BUG-EVI-04 | Thieu reverse orphan check | MEDIUM | Logic |
| 22 | Evidence | BUG-EVI-05 | Signing order khong enforce | MEDIUM | Backend |
| 23 | Exception | UX-EXC-01 | 33 card overload | MEDIUM | UX |
| 24 | Exception | UX-EXC-02 | Detail panel responsive | MEDIUM | UX |
| 25 | Exception | UX-EXC-03 | Thieu severity indicator | MEDIUM | UX |
| 26 | Exception | UX-EXC-05 | Thieu deep link | MEDIUM | UX |
| 27 | Order | UX-ORD-02 | Edit gui tat ca field | MEDIUM | UX |
| 28 | Order | UX-ORD-04 | Thieu qty progress | MEDIUM | UX |
| 29 | Order | UX-ORD-05 | Thieu ECR warning | MEDIUM | UX |
| 30 | Evidence | UX-EVI-01 | Thieu review progress | MEDIUM | UX |
| 31 | Evidence | UX-EVI-02 | Thieu file preview | MEDIUM | UX |
| 32 | Exception | OP-EXC-03 | Thieu realtime notification | MEDIUM | Thao tac |
| 33 | Order | OP-ORD-01 | Thieu WO shortcut | MEDIUM | Thao tac |
| 34 | Order | OP-ORD-02 | Thieu clone order | MEDIUM | Thao tac |
| 35 | Evidence | OP-EVI-03 | Thieu auto-attach template | MEDIUM | Thao tac |

### 5.2 Thu tu uu tien thuc hien

**Phase 1 - Bug fix (1-2 ngay):**
1. BUG-ORD-01: Xoa/cap nhat status enum trong OrderService.php
2. BUG-ORD-02: Bo strtoupper trong filter
3. BUG-EXC-02: Them break/verify exit trong switch
4. BUG-EXC-05: Them scheduled_end fallback
5. BUG-ORD-06: WO ke thua part+rev tu JO
6. UX-ORD-03: Filter revision theo part (REV-01)

**Phase 2 - Security & Data integrity (2-3 ngay):**
7. BUG-ORD-04: File locking cho orders.json
8. BUG-EVI-03: Verify evidence_pack_export auth
9. BUG-ORD-03: Them explicit return sau api_json
10. REV-02: Backend validation revision status

**Phase 3 - UX improvements (3-5 ngay):**
11. UX-EXC-01: Filter/tab cho exception cards
12. BUG-EXC-01: Fix highPriority calculation
13. UX-ORD-05: ECR warning cho post-release fields
14. REV-03: Hien thi Part+Rev nhat quan
15. UX-EVI-01: Evidence review progress

**Phase 4 - Operational efficiency (5-7 ngay):**
16. OP-EXC-01: Bulk actions cho exception
17. OP-EXC-02: Notes per exception
18. OP-ORD-03: Batch status update
19. OP-EVI-02: Batch approve
20. OP-EVI-01: Reverse link tu evidence -> order

### 5.3 Tham chieu tieu chuan quoc te

| Yeu cau | Tieu chuan | Hien trang | Gap |
|---------|-----------|------------|-----|
| Truy xuat Part + Rev | AS9100D 8.5.2 | Co nhung khong nhat quan | REV-01 den REV-05 |
| Evidence retention | AS9100D 7.5.3.2 | Co policy nhung thieu enforcement | BUG-EVI-04 |
| Electronic signatures | 21 CFR Part 11 | Co e-signature nhung thieu signing order | BUG-EVI-05 |
| Exception escalation | ISO 9001 10.2 | Co SLA nhung thieu realtime notify | OP-EXC-03 |
| Change control (ECR) | AS9100D 8.5.6 | Backend co nhung frontend thieu warning | UX-ORD-05 |
| Status governance | AS9100D 8.1 | Co workflow service nhung enum khong khop | BUG-ORD-01 |
| Concurrent access | Data integrity | Khong co file locking | BUG-ORD-04 |

---

*Tai lieu nay la ket qua danh gia chuyen sau duoc thuc hien ngay 2026-03-30. Moi de xuat co code sample cu the va chi ro file/line can sua.*
