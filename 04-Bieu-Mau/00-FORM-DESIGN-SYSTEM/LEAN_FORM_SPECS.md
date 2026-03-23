# LEAN FORM SPECIFICATIONS — 111 FORMS
## Nguyên tắc: Job # là chìa khóa. Không field thừa. Không section thừa.

---

## TYPE A: CHECKLIST / GATE — 1 TAB

### Pattern chung:
```
Header
Ref (2 rows max): Job/WO | Part/Rev + Date | Owner
Checklist (6-12 items): # | Cat | Item | Criteria | Result | Owner
Approval (2-col): Prepared | Approved
Notice
```
**KHÔNG CÓ**: Gate section riêng (gate = kết quả tổng hợp từ checklist),
Action tracker riêng (ghi trực tiếp trong checklist nếu HOLD/FAIL)

| Code | Title | Ref fields | Check items | Approval | Notes |
|------|-------|-----------|-------------|----------|-------|
| FRM-102 | Document Change Request | Job/Doc# + Date/Owner | 6: scope, impact, review, test, approve, deploy | 2-col | |
| FRM-104 | Document Deployment Checklist | Doc# + Date/Owner | 6: distribute, train, remove old, verify, confirm, close | 2-col | |
| FRM-110 | M365 Configuration Checklist | System + Date/Owner | 8: permissions, sharing, retention, backup, security, DLP, audit, close | 2-col | |
| FRM-111 | Quarterly Access Review | Period + Date/Reviewer | 6: user list, permissions, departures, excess, action, close | 2-col | |
| FRM-141 | IT Access Request | Requester + Date/Approver | 0 (ref+approval only) | 2-col | Simplest form |
| FRM-163 | Configuration Audit Checklist | Job/WO + Date/Auditor | 8: drawing rev, BOM, program, tooling, setup, routing, ECO, close | 2-col | |
| FRM-202 | Contract Review Checklist | Customer+PO + Part/Rev | 12: commercial(3), technical(4), quality(2), capacity(3) | 3-col: Sales/Eng/QA | Key form |
| FRM-204 | Order Kickoff Checklist | Job/WO + Part/Rev | 8: drawing, material, routing, tooling, outsource, schedule, dossier, release | 2-col | |
| FRM-206 | Job Completion Checklist | Job/WO + Part/Rev | 8: all ops done, inspection pass, CoC, packing, ship docs, dossier, close, lessons | 2-col | |
| FRM-207 | Operational Risk Control | Job/WO + Part/Rev | 8: risk items with severity/probability/control | 2-col | |
| FRM-209 | High-Risk Job Readiness | Job/WO + Part/Rev | 8: capability, tooling, material, inspection, outsource, contingency, approval, release | 2-col | |
| FRM-212 | Customer Change Request | Job/WO + Customer | 6: scope, impact, feasibility, cost, approval, implement | 2-col | |
| FRM-303 | DFM Review Checklist | Part/Rev + Customer | 10: tolerance, GD&T, material, surface, clean, machine, fixture, tool, outsource, feasibility | 3-col: Sales/Eng/QA | |
| FRM-304 | Semiconductor Part Classification | Part/Rev + Customer | 6: cleanliness class, vacuum compat, material restrict, special process, marking, packaging | 2-col | Semi-specific |
| FRM-305 | Inspection Program Release | Part/Rev + Program | 6: program verified, fixture OK, gage OK, first run OK, results match, release | 2-col | |
| FRM-403 | Outsourced Process Request | Job/WO + Supplier | 6: process spec, supplier qualified, lead time, requirements flowdown, acceptance, approval | 2-col | |
| FRM-404 | Outsource Dispatch Checklist | Job/WO + Supplier | 6: parts counted, spec attached, requirements noted, packaging OK, transport, receipt confirm | 2-col | |
| FRM-406 | SCAR | Supplier + NCR ref | 5: problem desc, containment, root cause, corrective action, verification | 2-col | |
| FRM-408 | Requirements Flow-Down | PO# + Supplier | 8: drawing, spec, material, process, inspection, cert, packaging, special requirements | 2-col | |
| FRM-409 | Supplier Audit Checklist | Supplier + Date | 10: QMS, process control, inspection, cal, NCR handling, training, traceability, records, facility, conclusion | 2-col | |
| FRM-411 | Outsource Incoming Verification | Job/WO + Supplier | 6: visual, dimensional, cert match, spec match, qty match, accept/reject | 2-col | |
| FRM-501 | Planning Release Checklist | Job/WO + Part/Rev | 8: drawing, material, routing, tooling, outsource, schedule, capacity, release | 2-col | |
| FRM-511 | Setup & First-Piece Record | Job/WO+Machine + Part/Rev+Program | 10: setup baseline, fixture, tools, offsets, gages, dims, surface, GD&T, abnormal, run decision | 3-col: Setup/QA/Sup | ✅ DONE |
| FRM-518 | Work Transfer Validation | Job/WO + From/To machine | 6: setup match, first piece match, capability match, operator qualified, approval, release | 2-col | |
| FRM-519 | Job Packet Pre-Run Verification | Job/WO + Part/Rev | 6: drawing match, program match, tooling match, routing match, material match, release | 2-col | |
| FRM-521 | Preventive Maintenance Checklist | Machine + Date/Tech | 8: lubrication, spindle, axis, coolant, safety, electrical, geometric, release | 2-col | |
| FRM-522 | Crash Report | Machine + Date/Operator | 5: event description, damage assessment, containment, root cause, corrective action | 2-col | |
| FRM-654 | Customer Satisfaction Survey | Customer + Period | 6: quality, delivery, communication, responsiveness, value, overall | 2-col | |
| FRM-702 | Shipping Checklist | Job/WO + Customer | 8: qty match, inspection pass, CoC, labeling, packaging, shipping docs, customs, release | 2-col | |
| FRM-707 | Packaging Checklist | Job/WO + Part/Rev | 8: clean, wrap, cushion, label, box, weight, documents, seal | 2-col | |
| FRM-709 | Clean Packaging Checklist | Job/WO + Part/Rev | 8: cleanroom gown, clean surface, clean wrap, particle check, double bag, label, seal, log | 2-col | Semi |
| FRM-711 | Cleanliness Verification | Job/WO + Part/Rev | 6: visual clean, particle count, residue test, rinse test, UV check, accept/reject | 2-col | Semi |
| FRM-715 | Vacuum Clean Build & Bagging | Job/WO + Part/Rev | 8: clean verify, glove protocol, bagging material, vacuum seal, label, leak check, log, release | 2-col | Semi |
| FRM-721 | FOD Line Clearance | Area + Date/Operator | 6: tools accounted, parts accounted, debris removed, surfaces clean, FOD-free verified, release | 2-col | |
| FRM-803 | OJT Checklist | Trainee + Skill/Task | 6: demo by trainer, practice, supervised work, independent work, assessment, certification | 2-col | |
| FRM-821 | Invoice Request | Job/WO + Customer | 0 (ref fields only: amount, terms, PO ref, approval) | 2-col | |
| FRM-901 | Internal Audit Checklist | Audit# + Scope/Date | 10: per ISO clause (context, leadership, planning, support, operation, performance, improvement, findings summary, conclusion, follow-up) | 2-col | |
| FRM-902 | Layered Process Audit | Area + Date/Auditor | 8: 5S, WI compliance, gage current, first piece, SPC, NCR handling, safety, conclusion | 2-col | |

---

## TYPE B: REPORT / EVENT — 1 TAB

### Pattern chung:
```
Header
Ref (2-3 rows): ID + Job/WO + Date + Source/Severity
Description (free text area, 3 rows merged)
Disposition / Decision (2 rows)
Approval (2-col)
Notice
```
**KHÔNG CÓ**: Separate containment table (gộp vào description),
Separate action tracker tab (ghi action trong description hoặc link CAPA)

| Code | Title | Ref fields | Sections | Notes |
|------|-------|-----------|----------|-------|
| FRM-121 | Context Analysis SWOT/PESTLE | Period + Date | Ref + SWOT matrix + PESTLE matrix + Actions | A4L 1 tab |
| FRM-124 | Climate Change Assessment | Period + Date | Ref + Assessment + Actions | 1 tab |
| FRM-161 | ECR/ECO | ECR# + Part/Rev + Date | Ref + Change desc + Impact + Implementation + Approval | 1 tab |
| FRM-181 | Business Disruption Event | Event# + Date | Ref + Event desc + Impact + Recovery + Lessons | 1 tab |
| FRM-402 | Supplier Evaluation | Supplier + Date | Ref + Scoring table (6 criteria) + Decision + Approval | 1 tab |
| FRM-514 | SMED Changeover Record | Machine+Job + Date | Ref + Steps table (internal/external) + Time summary | 1 tab |
| FRM-651 | NCR Report | NCR#+Job + Date+Source | Ref + Description + Containment(5 items) + Disposition + Approval | 1 tab ✅ |
| FRM-652 | CAPA / 8D Report | CAPA#+NCR ref + Date | Ref + 8D steps compact (D1-D8 in text areas) + Approval | 1 tab A4L |
| FRM-653 | A3 PDCA Form | Topic + Date | Ref + A3 layout (Plan/Do/Check/Act quadrants) | 1 tab A3L |
| FRM-712 | Helium Leak Test Record | Job/WO + Part/Rev | Ref + Test setup + Results table + Accept/Reject | 1 tab |
| FRM-714 | Ultrasonic Cleaning Batch | Batch# + Date | Ref + Process params + Results + Accept/Reject | 1 tab |
| FRM-801 | Training Plan | Year + Dept | Ref + Plan table (topic/audience/date/status) | 1 tab A4L |
| FRM-804 | Competence Assessment | Employee + Skill | Ref + Assessment criteria + Decision | 1 tab |
| FRM-808 | Performance Review | Employee + Period | Ref + KPI review + Development plan + Approval | 1 tab |
| FRM-811 | Incident Report | Incident# + Date | Ref + Event desc + Investigation + Actions + Approval | 1 tab |
| FRM-911 | Management Review Minutes | Date + Attendees | Ref + Input summary + Decisions + Actions | 1 tab A4L |

---

## TYPE C: DATA LOG / REGISTER — 1 TAB

### Pattern chung:
```
Header (compact: title row + subtitle only, NO full 5-row header)
Column headers
Data rows (expandable)
```
**Log forms = operational data sheets. Minimal header. Maximum data density.**
**KHÔNG CÓ**: Section headers, Gate, Approval (logs don't need approval per entry)

| Code | Title | Format | Key columns (lean) |
|------|-------|--------|-------------------|
| FRM-101 | Master Document Register | A4L | Code, Title, Rev, Date, Owner, Status |
| FRM-105 | Peer Review Log | A4L | Doc#, Reviewer, Date, Result, Comments |
| FRM-106 | Pilot/Dry Run Log | A4L | Doc#, Date, Participants, Result, Issues |
| FRM-122 | Interested Parties Register | A4L | Party, Needs, Impact, Action |
| FRM-123 | Interested Party Req. Register | A4L | Party, Requirement, Source, Compliance |
| FRM-125 | Customer CSR Register | A4L | Customer, Requirement, Status, Evidence |
| FRM-131 | Risks & Opportunities Register | A4L | Risk/Opp, Likelihood, Impact, RPN, Action, Owner, Status |
| FRM-151 | Lessons Learned Register | A4L | Date, Job#, Lesson, Category, Action, Status |
| FRM-162 | Change Impact Matrix | A4L | Change#, Area, Impact, Severity, Action |
| FRM-171 | Communication Plan & Log | A4L | Topic, Audience, Method, Frequency, Owner |
| FRM-201 | RFQ Register | A4L | RFQ#, Customer, Part, Date, Status, Value |
| FRM-205 | Job Dossier Evidence Index | A4L | Job#, Document, Location, Status |
| FRM-211 | Complaint Log | A4L | Complaint#, Date, Customer, Description, Status, Action |
| FRM-213 | RMA Tracking Log | A4L | RMA#, Date, Customer, Part, Qty, Status |
| FRM-221 | Customer Property Register | A4L | Item, Customer, Received, Condition, Location, Status |
| FRM-401 | PO Exception Tracker | A4L | PO#, Supplier, Issue, Date, Status, Action |
| FRM-405 | Supplier Scorecard | A4L | Supplier, Quality%, Delivery%, Response, Score, Status |
| FRM-413 | HOLD & Disposition Log | A4L | Hold#, Date, Part, Qty, Reason, Disposition, Status |
| FRM-502 | Daily Dispatch List | A4L | Job#, Part, Qty, Machine, Priority, Status |
| FRM-503 | WIP Aging Report | A4L | Job#, Part, Age(days), Operation, Status |
| FRM-504 | Shift Handover Log | A4L | Date, Shift, Machine, Status, Issues, Handover |
| FRM-512 | Downtime Log | A4L | Date, Machine, Start, End, Duration, Category, Action |
| FRM-513 | Tool Life Log | A4L | Tool#, Machine, Part, Life(pcs), Replaced, Status |
| FRM-523 | Tooling Register | A4L | Tool#, Type, Machine, Location, Condition, Status |
| FRM-524 | Machine History Log | A4L | Date, Machine, Event, Action, Technician |
| FRM-525 | Gage & Measuring Equip Register | A4L | Gage#, Type, Range, Cal Due, Status |
| FRM-601 | Calibration Log | A4L | Gage#, Date, Source, Result, Next Due, Status |
| FRM-602 | Gage Verification Log | A4L | Gage#, Date, Check, Result, By |
| FRM-642 | Final Inspection & CoC Register | A4L | Job#, Date, Part, Result, CoC#, Shipped |
| FRM-643 | Safety/Special Char Register | A4L | Part, Char#, Description, Method, Frequency |
| FRM-708 | Environment Log | A4L | Date, Time, Temp, Humidity, Particle, By |
| FRM-713 | Cleanroom Entry & Gowning Log | A4L | Date, Time, Person, Gown#, Entry/Exit |
| FRM-802 | Attendance List | A4L | Date, Training, Attendee, Dept, Signature |
| FRM-806 | Certification Tracking Log | A4L | Employee, Cert, Issued, Expires, Status |
| FRM-812 | Lighting Log | A4L | Date, Area, Lux, Standard, Result, By |

---

## TYPE D: MULTI-TAB (ISO/AS bắt buộc) — 2-3 tabs

| Code | Title | Tab 1 | Tab 2 | Tab 3 | Reason |
|------|-------|-------|-------|-------|--------|
| FRM-132 | PFMEA Lite | PFMEA matrix (A3L) | — | — | 1 tab đủ nếu A3L |
| FRM-133 | Control Plan | Control Plan (A3L) | — | — | 1 tab đủ nếu A3L |
| FRM-203 | Job Tracking Sheet | Track (A4L) | — | — | 1 tab: milestones gộp vào |
| FRM-208 | Daily Tier Meeting | Tier+KPI (A4L) | — | — | 1 tab gộp |
| FRM-301 | Costing Sheet | Cost (A4L) | — | — | 1 tab: cost lines gộp |
| FRM-302 | Setup Sheet | Setup (A3L) | Tool List (A4P) | — | 2 tabs: setup quá rộng + tool list riêng |
| FRM-306 | Eng Release & Baseline | Gate (A4L) | — | — | 1 tab gộp |
| FRM-311 | FAI Report | FAI+Char (A4L) | Matl/Proc (A4P) | — | 2 tabs: AS9102 requires separation |
| FRM-621 | AQL Inspection Record | Record (A4L) | — | — | 1 tab |
| FRM-631 | SPC/Process Capability | Data+Chart (A4L) | — | — | 1 tab |
| FRM-641 | Final Inspection Report | Report (A4L) | — | — | 1 tab |
| FRM-807 | Skills Matrix | Matrix (A3L) | — | — | 1 tab |
| FRM-809 | Skills & KPI Matrix | Matrix (A3L) | — | — | 1 tab |

**Kết quả: Hầu hết "multi-tab" cũ giờ chỉ cần 1 tab format lớn hơn (A4L/A3L)**

---

## TYPE E: PRINT LABELS — 1 TAB

| Code | Title | Fields (lean) |
|------|-------|--------------|
| FRM-703 | WIP Tag | Job#, Part/Rev, Qty, Operation, Status |
| FRM-704 | Part ID Label | Part#, Rev, Material, Lot# |
| FRM-705 | Location Label | Location, Rack/Bin, Content |
| FRM-706 | Shipping Label | Customer, PO#, Part, Qty, Ship Date |
| FRM-805 | Skill Level Certificate | Employee, Skill, Level, Issued, Expires |

---

## TYPE F: MSA / STATISTICAL — 1 TAB

| Code | Title | Format | Notes |
|------|-------|--------|-------|
| FRM-611 | GR&R Study | A4L | Data grid + auto-calc EV/AV/GRR% |
| FRM-612 | Bias/Linearity/Stability | A4L | Data grid + auto-calc |
| FRM-613 | Attribute MSA & CMM Qual | A4L | Data grid + auto-calc |

---

## TỔNG KẾT TINH GỌN

| Metric | Cũ | Mới | Giảm |
|--------|-----|------|------|
| Tổng visible tabs | ~200+ | **111** (1 tab/form) | **-50%** |
| Ref fields trung bình | 8-16 | **2-4** | **-65%** |
| Sections trung bình | 5 | **3** | **-40%** |
| Forms có Gate section riêng | 38 | **0** (gate = checklist result) | **-100%** |
| Forms có Action tab riêng | 40+ | **0** (action trong form hoặc link CAPA) | **-100%** |
