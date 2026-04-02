# 06 — Excel form design standards

> Version: V0 | Effective: 2025-06-01 | Owner: QMS Engineer
> Compiled from: CLAUDE-MAX-FORM-TEMPLATE-BRIEF-v1 + LEAN_FORM_SPECS

---

## 1. Purpose

- Unified layout, style and structure for all 111 HESEM Excel forms.
- Make sure all forms can be printed on A4/A3, filled out by hand or on a computer, and everyone who picks them up knows what to do.
- Synchronize header, color, font with current SOP/WI/ANNEX system.
- Ready for ISO 9001:2026 and AS9100D at HESEM practical level.

---

## 2. Form classification — 6 types

### 2.1 TYPE A: Checklist / Gate (38 forms)

**Standard structure:**

```
Header (brand row + tiêu đề)
Ref (2 dòng tối đa): Job/WO | Part/Rev + Date | Owner
Checklist (6-12 mục): # | Cat | Item | Criteria | Result | Owner
Gate = kết quả tổng hợp từ checklist (KHÔNG tách section gate riêng)
Approval (2 hoặc 3 cột): Prepared | Approved (| thêm cột nếu cần)
Notice
```

**Principle:**
- Gate does NOT have its own section — gate is the summary result from the checklist.
- Action tracker does NOT separate tabs — record directly in checklist if HOLD/FAIL.
- Ref fields maximum 4 fields (Job/WO, Part/Rev, Date, Owner).
- Checklist items: 6-12 items, each item has clear criteria and a dropdown Result box.

**List of TYPE A forms:**

| Code | Name | Ref fields | Number of check items | Approval |
|----|-----|-----------|-------------|----------|
| FRM-102 | Document Change Request | Job/Doc# + Date/Owner | 6 | 2-col |
| FRM-104 | Document Deployment Checklist | Doc# + Date/Owner | 6 | 2-col |
| FRM-110 | M365 Configuration Checklist | System + Date/Owner | 8 | 2-col |
| FRM-111 | Quarterly Access Review | Period + Date/Reviewer | 6 | 2-col |
| FRM-141 | IT Access Request | Requester + Date/Approver | 0 (ref+approval) | 2-col |
| FRM-163 | Configuration Audit Checklist | Job/WO + Date/Auditor | 8 | 2-col |
| FRM-202 | Contract Review Checklist | Customer+PO + Part/Rev | 12 | 3-col |
| FRM-204 | Order Kickoff Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-206 | Job Completion Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-207 | Operational Risk Control | Job/WO + Part/Rev | 8 | 2-col |
| FRM-209 | High-Risk Job Readiness | Job/WO + Part/Rev | 8 | 2-col |
| FRM-212 | Customer Change Request | Job/WO + Customer | 6 | 2-col |
| FRM-303 | DFM Review Checklist | Part/Rev + Customer | 10 | 3-col |
| FRM-304 | Semiconductor Part Classification | Part/Rev + Customer | 6 | 2-col |
| FRM-305 | Inspection Program Release | Part/Rev + Program | 6 | 2-col |
| FRM-403 | Outsourced Process Request | Job/WO + Supplier | 6 | 2-col |
| FRM-404 | Outsource Dispatch Checklist | Job/WO + Supplier | 6 | 2-col |
| FRM-406 | SCAR | Supplier + NCR ref | 5 | 2-col |
| FRM-408 | Requirements Flow-Down | PO# + Supplier | 8 | 2-col |
| FRM-409 | Supplier Audit Checklist | Supplier + Date | 10 | 2-col |
| FRM-411 | Outsource Incoming Verification | Job/WO + Supplier | 6 | 2-col |
| FRM-501 | Planning Release Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-511 | Setup & First-Piece Record | Job/WO+Machine + Part/Rev+Program | 10 | 3-col |
| FRM-518 | Work Transfer Validation | Job/WO + From/To machine | 6 | 2-col |
| FRM-519 | Job Packet Pre-Run Verification | Job/WO + Part/Rev | 6 | 2-col |
| FRM-521 | Preventive Maintenance Checklist | Machine + Date/Tech | 8 | 2-col |
| FRM-522 | Crash Report | Machine + Date/Operator | 5 | 2-col |
| FRM-654 | Customer Satisfaction Survey | Customer + Period | 6 | 2-col |
| FRM-702 | Shipping Checklist | Job/WO + Customer | 8 | 2-col |
| FRM-707 | Packaging Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-709 | Clean Packaging Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-711 | Cleanliness Verification | Job/WO + Part/Rev | 6 | 2-col |
| FRM-715 | Vacuum Clean Build & Bagging | Job/WO + Part/Rev | 8 | 2-col |
| FRM-721 | FOD Line Clearance | Area + Date/Operator | 6 | 2-col |
| FRM-803 | OJT Checklist | Trainee + Skill/Task | 6 | 2-col |
| FRM-821 | Invoice Request | Job/WO + Customer | 0 (ref only) | 2-col |
| FRM-901 | Internal Audit Checklist | Audit# + Scope/Date | 10 | 2-col |
| FRM-902 | Layered Process Audit | Area + Date/Auditor | 8 | 2-col |

---

### 2.2 TYPE B: Report / Event (15 forms)

**Standard structure:**

```
Header (brand row + tiêu đề)
Ref (2-3 dòng): ID + Job/WO + Date + Source/Severity
Description (vùng nhập tự do, 3 dòng merge)
Disposition / Decision (2 dòng)
Approval (2 cột)
Notice
```

**Principle:**
- Containment table is NOT separate — included in description.
- The action tracker is NOT tabbed — record the action in the description or CAPA link.
- Description must be large enough to record event details.

**List of TYPE B forms:**

| Code | Name | Ref fields | Note |
|----|-----|-----------|---------|
| FRM-121 | Context Analysis SWOT/PESTLE | Period + Date | A4L |
| FRM-124 | Climate Change Assessment | Period + Date | 1 tab |
| FRM-161 | ECR/ECO | ECR# + Part/Rev + Date | 1 tab |
| FRM-181 | Business Disruption Event | Event# + Date | 1 tab |
| FRM-402 | Supplier Evaluation | Supplier + Date | 1 tab |
| FRM-514 | SMED Changeover Record | Machine+Job + Date | 1 tab |
| FRM-651 | NCR Report | NCR#+Job + Date+Source | 1 tab |
| FRM-652 | CAPA / 8D Report | CAPA#+NCR ref + Date | A4L |
| FRM-653 | A3 PDCA Form | Topic + Date | A3L |
| FRM-712 | Helium Leak Test Record | Job/WO + Part/Rev | 1 tab |
| FRM-714 | Ultrasonic Cleaning Batch | Batch# + Date | 1 tab |
| FRM-801 | Training Plan | Year + Dept | A4L |
| FRM-804 | Competence Assessment | Employee + Skills | 1 tab |
| FRM-808 | Performance Review | Employee + Period | 1 tab |
| FRM-811 | Incident Report | Incident# + Date | 1 tab |
| FRM-911 | Management Review Minutes | Date + Attendees | A4L |

---

### 2.3 TYPE C: Data Log / Register (30 forms)

**Standard structure:**

```
Header gọn (1 dòng title + 1 dòng subtitle, KHÔNG header 5 dòng đầy đủ)
Dòng tiêu đề cột
Dòng dữ liệu (mở rộng được)
```

**Principle:**
- Log form = operational data table. Minimum headers. Maximum data density.
- NO section header, gate, approval (log does not need line-by-line approval).
- Default format: A4L (landscape).
- Columns must be narrow enough to print on A4L, not oversized.

**List of TYPE C forms:**

| Code | Name | Main column |
|----|-----|----------|
| FRM-101 | Master Document Register | Code, Title, Rev, Date, Owner, Status |
| FRM-105 | Peer Review Log | Doc#, Reviewer, Date, Result, Comments |
| FRM-106 | Pilot/Dry Run Log | Doc#, Date, Participants, Result, Issues |
| FRM-122 | Interested Parties Register | Party, Needs, Impact, Action |
| FRM-123 | Interested Party Req. Register | Party, Requirement, Source, Compliance |
| FRM-125 | Customer CSR Register | Customer, Requirement, Status, Evidence |
| FRM-131 | Risks & Opportunities Register | Risk/Opp, Likelihood, Impact, RPN, Action, Owner, Status |
| FRM-151 | Lessons Learned Register | Date, Job#, Lesson, Category, Action, Status |
| FRM-162 | Change Impact Matrix | Change#, Area, Impact, Severity, Action |
| FRM-171 | Communication Plan & Log | Topic, Audience, Method, Frequency, Owner |
| FRM-201 | RFQ Register | RFQ#, Customer, Part, Date, Status, Value |
| FRM-205 | Job Dossier Evidence Index | Job#, Document, Location, Status |
| FRM-211 | Complaint Log | Complaint#, Date, Customer, Description, Status, Action |
| FRM-213 | RMA Tracking Log | RMA#, Date, Customer, Part, Qty, Status |
| FRM-221 | Customer Property Register | Item, Customer, Received, Condition, Location, Status |
| FRM-401 | PO Exception Tracker | PO#, Supplier, Issue, Date, Status, Action |
| FRM-405 | Supplier Scorecard | Supplier, Quality%, Delivery%, Response, Score, Status |
| FRM-413 | HOLD & Disposition Log | Hold#, Date, Part, Qty, Reason, Disposition, Status |
| FRM-502 | Daily Dispatch List | Job#, Part, Qty, Machine, Priority, Status |
| FRM-503 | WIP Aging Report | Job#, Part, Age(days), Operation, Status |
| FRM-504 | Shift Handover Log | Date, Shift, Machine, Status, Issues, Handover |
| FRM-512 | Downtime Log | Date, Machine, Start, End, Duration, Category, Action |
| FRM-513 | Tool Life Log | Tool#, Machine, Part, Life(pcs), Replaced, Status |
| FRM-523 | Tooling Register | Tool#, Type, Machine, Location, Condition, Status |
| FRM-524 | Machine History Log | Date, Machine, Event, Action, Technician |
| FRM-525 | Gage & Measuring Equip Register | Gage#, Type, Range, Cal Due, Status |
| FRM-601 | Calibration Log | Gage#, Date, Source, Result, Next Due, Status |
| FRM-602 | Gage Verification Log | Gage#, Date, Check, Result, By |
| FRM-642 | Final Inspection & CoC Register | Job#, Date, Part, Result, CoC#, Shipped |
| FRM-643 | Safety/Special Char Register | Part, Char#, Description, Method, Frequency |
| FRM-708 | Environment Log | Date, Time, Temp, Humidity, Particle, By |
| FRM-713 | Cleanroom Entry & Gowning Log | Date, Time, Person, Gown#, Entry/Exit |
| FRM-802 | Attendance List | Date, Training, Attendee, Dept, Signature |
| FRM-806 | Certification Tracking Log | Employee, Cert, Issued, Expires, Status |
| FRM-812 | Lighting Log | Date, Area, Lux, Standard, Result, By |

---

### 2.4 TYPE D: Multi-tab ISO (8 forms)

**Principle:**
- Only use multi-tab when ISO/AS requires separation or the content is too large for 1 tab.
- 2-3 tabs maximum. Most old "multi-tab" forms now only need 1 tab in A4L/A3L format.

| Code | Name | Tab 1 | Tab 2 | Reason |
|----|-----|-------|-------|-------|
| FRM-132 | PFMEA Lite | PFMEA matrix (A3L) | — | 1 A3L tab is enough |
| FRM-133 | Control Plan | Control Plan (A3L) | — | 1 A3L tab is enough |
| FRM-302 | Setup Sheet | Setup (A3L) | Tool List (A4P) | 2 tabs: general setup + separate tool list |
| FRM-311 | FAI Report | FAI+Char (A4L) | Matl/Proc (A4P) | 2 tabs: AS9102 separation requirements |
| FRM-621 | AQL Inspection Record | Record (A4L) | — | 1 tab |
| FRM-631 | SPC/Process Capability | Data+Chart (A4L) | — | 1 tab |
| FRM-641 | Final Inspection Report | Report (A4L) | — | 1 tab |
| FRM-807 | Skills Matrix | Matrix (A3L) | — | 1 tab |

---

### 2.5 TYPE E: Print Labels (5 forms)

**Principle:**
- Fixed print size, suitable for label printers or cut from A4.
- Minimal content: only information needed for identification.

| Code | Name | Fields |
|----|-----|--------|
| FRM-703 | WIP Tag | Job#, Part/Rev, Qty, Operation, Status |
| FRM-704 | Part ID Label | Part#, Rev, Material, Lot# |
| FRM-705 | Location Label | Location, Rack/Bin, Content |
| FRM-706 | Shipping Label | Customer, PO#, Part, Qty, Ship Date |
| FRM-805 | Skill Level Certificate | Employee, Skill, Level, Issued, Expires |

---

### 2.6 TYPE F: MSA / Statistical (3 forms)

**Principle:**
- The form contains many calculations, using Excel auto-calc formulas.
- Data entered into grid, results automatically calculate EV/AV/GRR%, bias, linearity, stability.

| Code | Name | Format | Note |
|----|-----|--------|---------|
| FRM-611 | GR&R Study | A4L | Data grid + auto-calc EV/AV/GRR% |
| FRM-612 | Bias/Linearity/Stability | A4L | Data grid + auto-calc |
| FRM-613 | Attribute MSA & CMM Qual | A4L | Data grid + auto-calc |

---

## 3. General design specifications

### 3.1 Fonts

| Purpose | Font | Size | Type |
|----------|------|----|------|
| Form title | Segoe UI | 16 pt | Bold |
| Section header | Segoe UI | 11 pt | Bold, white text |
| Cell label | Segoe UI | 9 pt | Regular |
| Input data | Segoe UI | 10 pt | Regular |
| Notice / footer | Segoe UI | 8 pt | Italic |

### 3.2 Standard color palette

| Ingredient | Color code | Describe |
|-----------|--------|-------|
| Brand row (brand line) | `#0C2D48` background, white text | Dark Navy, first line of the form |
| Accent blue | `#1565C0` | Used for accent lines and icons |
| Gold accent | `#F9A825` | Use moderation for special emphasis |
| Section header | Dark blue background, white text | Divide sections clearly |
| Label cells | Light gray `#F5F5F5` or table blue `#E8EAF6` | Description box, column title |
| Input cells | Very light blue `#E3F2FD` | User input box |
| Blank background | White `#FFFFFF` | Unused area |

### 3.3 Meta box (right corner of header)

Each form MUST have a meta box in the upper right corner containing:

| Field | For example |
|-------|-------|
| Form code | FRM-511 |
| Version | Rev 0 |
| Effective date | 2025-06-01 |
| Owner | Production Manager |
| Approver | QA Manager |

### 3.4 Layout and printing

- **Paper size:** A4 Portrait (default) or A4 Landscape / A3 Landscape (specified in catalog).
- **Width:** MUST fit 1 page horizontally. Do not allow horizontal overflow to page 2.
- **Gridlines:** OFF when printing. Use cell borders instead of gridlines.
- **Margins:** Compact — Top/Bottom: 1.5 cm, Left/Right: 1.0 cm.
- **Footer:** Form code + "Page X of Y" in the lower right corner.
- **Signature boxes:** Large enough to hand sign when printing (minimum 2.5 cm high, 5 cm wide).

### 3.5 Borders

- Use thin, even, professional borders.
- Border outside section: medium.
- DO NOT use thick borders widely.
- DO NOT leave blank cells without borders in the data area.

---

## 4. Sheet required in each Excel file

Each file `.xlsx` MUST have at least 3 sheets:

### Sheet 1: MASTER-TEMPLATE

- The main sheet contains a blank, ready-to-use form.
- Sheet name: `MASTER-TEMPLATE`
- This is the original. The user copies this sheet to fill in new data.

### Sheet 2: EXAMPLE-FRM-XXX

- The example sheet has filled out the form, helping users understand how to fill it out.
- Sheet name: `EXAMPLE-FRM-XXX` (replace XXX with form code, for example: `EXAMPLE-FRM-511`).
- Example data must be realistic, do not use "test", "abc", "xxx".

### Sheet 3: LISTS (hidden)

- Sheet contains list of values ​​for dropdown (Data Validation).
- Sheet name: `LISTS`
- Status: **Hidden** (hidden, users cannot see).
- Column A onwards: each column is a dropdown list.

---

## 5. Standard dropdown

The following dropdown lists MUST be consistent across all 111 forms:

### 5.1 Test results

```
PASS
HOLD
FAIL
NA
```

### 5.2 Approval decision

```
APPROVED
REJECTED
CONDITIONAL
ON HOLD
```

### 5.3 Item status

```
OPEN
IN PROGRESS
CLOSED
MONITORING
```

### 5.4 Severity/priority

```
LOW
MEDIUM
HIGH
CRITICAL
```

### 5.5 Additional dropdown by form type

| Context | Value |
|-----------|---------|
| Disposition (NCR) | USE AS IS / REWORK / SCRAP / RETURN TO SUPPLIER / MRB |
| Shift | DAY / NIGHT / A / B / C |
| Cleanliness class | CLASS 100 / CLASS 1000 / CLASS 10000 / STANDARD |
| Risk level (FMEA) | 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 / 10 |

---

## 6. Prohibition

| # | Prohibition | Reason |
|---|---------|-------|
| 1 | Don't add too many colors | Distracting, difficult to print, and unprofessional |
| 2 | Do not leave text smaller than 8pt | Unreadable when printed |
| 3 | Do not merge cells excessively | Causes difficulty in data entry, copying, errors when filtering |
| 4 | Do not let the board exceed A4 width | Must be able to print on 1 page horizontally |
| 5 | Do not prompt "AI", "generated", "from merged document" | Form is an official document, the origin of creation is not recorded |
| 6 | Do not use icons, shapes, or watermarks that cause interference | Keep the layout clean and professional |
| 7 | Does not create a beautiful layout but is difficult to enter | Prioritize usability first, beauty later |
| 8 | Do not duplicate existing data in Epicor/M365 | Record only the data needed to make decisions and save evidence |
| 9 | Do not create overlap between this form and other forms | Each form has a purpose, no overlapping scope |
| 10 | Do not make up logic that is not in SOP/WI/ANNEX | The form MUST follow the active process |

---

## 7. File naming rules

### 7.1 Patterns

```
FRM-XXX_Description_With_Underscores.xlsx
```

**For example:**
- `FRM-511_Setup_And_First_Piece_Record.xlsx`
- `FRM-651_NCR_Report.xlsx`
- `FRM-101_Master_Document_Register.xlsx`

### 7.2 Rules

- Form codes are always capitalized: `FRM-XXX`.
- Underscore `_` between words in the description.
- No Vietnamese accents in the file name.
- No spaces in the file name.
- The extension is always `.xlsx`.

### 7.3 Storage folder

```
04-Bieu-Mau/
├── 01-FRM-100/     ← Foundation & Document Control (FRM-1xx)
├── 02-FRM-200/     ← Sales & Customer (FRM-2xx)
├── 03-FRM-300/     ← Engineering (FRM-3xx)
├── 04-FRM-400/     ← Supply Chain (FRM-4xx)
├── 05-FRM-500/     ← Production (FRM-5xx)
├── 06-FRM-600/     ← Quality & Inspection (FRM-6xx)
├── 07-FRM-700/     ← Warehouse & Packaging (FRM-7xx)
├── 08-FRM-800/     ← HR, Training & Finance (FRM-8xx)
└── 09-FRM-900/     ← Audit & Improvement (FRM-9xx)
```

---

## 8. Additional rules for factory operations form

Forms used outside the factory (TYPE A related to production) MUST have the following fields in the Ref block:

| Field | Obligatory | Note |
|-------|---------|---------|
| Job No / WO | RIGHT | Job code from Epicor |
| Part No | RIGHT | Detailed code |
| Rev | RIGHT | Drawing version |
| Operation | SHOULD | Current cause |
| Shift | SHOULD | Shift |
| Date | RIGHT | Implementation date |
| Operator | RIGHT | Implementer |
| QA Hold logic | MUST (if there is a gate) | Conditions for stopping/holding goods |

---

## 9. Rules inherited from the document system

- Keep the current library structure as the target framework.
- Do not translate file names, slugs, and document codes into Vietnamese.
- Only Vietnameseize the content inside the form.
- The tone is short, clear, used for execution. No meta text.
- Form MUST follow SOP/WI/ANNEX active, do not make up logic.
- Form MUST have gate, owner, evidence, decision and approval as needed.
- The design MUST be ISO 9001:2026 compliant and AS9100D ready.

---

## 10. Lean summary

| Index | Old | New | Reduce |
|--------|-----|------|------|
| Total visible tabs | ~200+ | 111 (1 tab/form) | -50% |
| Average Ref fields | 8-16 | 2-4 | -65% |
| Average Sections | 5 | 3 | -40% |
| Forms has its own Gate section | 38 | 0 (gate = checklist result) | -100% |
| Forms has its own Action tab | 40+ | 0 (action in form or CAPA link) | -100% |
