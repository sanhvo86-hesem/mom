# FORM REBUILD MASTER PLAN v2.1

## NGUYÊN TẮC
1. **1 tab nếu có thể** — chỉ tách tab khi ISO/AS bắt buộc hoặc dữ liệu quá rộng
2. **Lean & practical** — không field thừa, mỗi field phải phục vụ vận hành hoặc audit
3. **Design System v2.1** — wrap_text, no-indent, ALL-cell borders, logo mỗi visible tab

## PHÂN LOẠI 111 FORMS

### TYPE A: CHECKLIST / GATE (1 tab) — 38 forms
Pattern: Header → Ref → Checklist → Gate → Approval → Notice
Dùng cho: review, release, verification, audit

| Code | Title | Cols | Checklist items | Notes |
|------|-------|------|-----------------|-------|
| FRM-102 | Document Change Request | 40 | 0 (ref+gate only) | Merge Actions tab vào |
| FRM-104 | Document Deployment Checklist | 40 | 8 | Merge Actions tab vào |
| FRM-110 | M365 Configuration Checklist | 40 | 8 | Merge Actions tab vào |
| FRM-111 | Quarterly Access Review | 40 | 6 | Merge Findings tab vào |
| FRM-141 | IT Access Request | 40 | 0 | Ref+Gate+Approval only |
| FRM-163 | Configuration Audit Checklist | 40 | 8 | Merge Findings vào |
| FRM-202 | Contract Review Checklist | 40 | 12 | Ref→Eval→Gate→Approval |
| FRM-204 | Order Kickoff Checklist | 40 | 10 | 1 tab |
| FRM-206 | Job Completion Checklist | 40 | 10 | 1 tab |
| FRM-207 | Operational Risk Control Sheet | 40 | 8 | Risk matrix + gate |
| FRM-209 | High-Risk Job Readiness Review | 40 | 10 | 1 tab |
| FRM-212 | Customer Change Request | 40 | 6 | 1 tab |
| FRM-303 | DFM Review Checklist | 40 | 10 | CNC-specific items |
| FRM-304 | Semiconductor Part Classification | 40 | 8 | Semi-specific |
| FRM-305 | Inspection Program Release | 40 | 8 | 1 tab |
| FRM-403 | Outsourced Process Request | 40 | 6 | 1 tab |
| FRM-404 | Outsource Dispatch Checklist | 40 | 8 | 1 tab |
| FRM-406 | SCAR | 40 | 5 | Containment+CA |
| FRM-408 | Requirements Flow-Down | 56 | 10 | 1 tab |
| FRM-409 | Supplier Audit Checklist | 56 | 12 | 1 tab |
| FRM-411 | Outsource Incoming Verification | 40 | 8 | 1 tab |
| FRM-501 | Planning Release Checklist | 40 | 10 | 1 tab |
| FRM-511 | Setup & First-Piece Record | 40 | 10 | ✅ DONE |
| FRM-518 | Work Transfer Validation | 40 | 8 | 1 tab → merge Comparison |
| FRM-519 | Job Packet Pre-Run Verification | 40 | 8 | 1 tab |
| FRM-521 | Preventive Maintenance Checklist | 40 | 10 | 1 tab → merge Function Test |
| FRM-522 | Crash Report | 40 | 5 | Event+containment |
| FRM-654 | Customer Satisfaction Survey | 40 | 8 | Survey items |
| FRM-702 | Shipping Checklist | 40 | 10 | 1 tab |
| FRM-707 | Packaging Checklist | 40 | 10 | 1 tab |
| FRM-709 | Clean Packaging Checklist | 40 | 10 | Semi-specific |
| FRM-711 | Cleanliness Verification | 40 | 8 | Semi-specific |
| FRM-715 | Vacuum Clean Build & Bagging | 40 | 10 | Semi-specific |
| FRM-721 | FOD Line Clearance | 40 | 8 | 1 tab |
| FRM-803 | OJT Checklist | 40 | 8 | 1 tab |
| FRM-821 | Invoice Request | 40 | 0 | Ref+gate only |
| FRM-901 | Internal Audit Checklist | 40 | 12 | ISO clause-based |
| FRM-902 | Layered Process Audit | 40 | 10 | 1 tab |

### TYPE B: REPORT / EVENT (1 tab) — 15 forms
Pattern: Header → Ref → Text areas → Table → Gate → Approval
Dùng cho: NCR, CAPA, incidents, assessments

| Code | Title | Cols | Notes |
|------|-------|------|-------|
| FRM-121 | Context Analysis SWOT/PESTLE | 56 | 1 tab: matrix + actions |
| FRM-124 | Climate Change Assessment | 56 | 1 tab: assessment + actions |
| FRM-161 | ECR/ECO | 56 | 1 tab → merge ImplPlan |
| FRM-181 | Business Disruption Event Log | 56 | 1 tab → merge Recovery |
| FRM-402 | Supplier Evaluation Form | 56 | 1 tab: scoring + decision |
| FRM-514 | SMED Changeover Record | 56 | 1 tab → merge steps |
| FRM-651 | NCR Report | 40 | ✅ DONE (1 tab, merged ACTIONS) |
| FRM-652 | CAPA / 8D Report | 56 | 1 tab: 8D steps compact |
| FRM-653 | A3 PDCA Form | 56 | 1 tab: A3 layout |
| FRM-712 | Helium Leak Test Record | 40 | 1 tab |
| FRM-714 | Ultrasonic Cleaning Batch Record | 40 | 1 tab |
| FRM-801 | Training Plan | 56 | 1 tab → merge Targets |
| FRM-804 | Competence Assessment | 56 | 1 tab |
| FRM-808 | Performance Review | 56 | 1 tab → merge DevPlan |
| FRM-811 | Incident Report | 40 | 1 tab → merge Actions |
| FRM-911 | Management Review Minutes | 56 | 1 tab → merge Decisions |

### TYPE C: DATA LOG / REGISTER (1 tab) — 30 forms
Pattern: Operational data sheet với column headers + data rows
Không cần form face riêng — data log IS the form

| Code | Title | Cols | Notes |
|------|-------|------|-------|
| FRM-101 | Master Document Register | 56 | 1 tab data log |
| FRM-105 | Peer Review Log | 56 | 1 tab |
| FRM-106 | Pilot/Dry Run Log | 56 | 1 tab |
| FRM-122 | Interested Parties Register | 56 | 1 tab |
| FRM-123 | Interested Party Req. Register | 56 | 1 tab |
| FRM-125 | Customer CSR Register | 56 | 1 tab |
| FRM-131 | Risks & Opportunities Register | 56 | 1 tab |
| FRM-151 | Lessons Learned Register | 56 | 1 tab |
| FRM-162 | Change Impact Matrix | 56 | 1 tab |
| FRM-171 | Communication Plan & Log | 56 | 1 tab |
| FRM-201 | RFQ Register | 56 | 1 tab data log |
| FRM-205 | Job Dossier Evidence Index | 56 | 1 tab |
| FRM-211 | Complaint Log | 56 | 1 tab |
| FRM-213 | RMA Tracking Log | 56 | 1 tab |
| FRM-221 | Customer Property Register | 56 | 1 tab |
| FRM-401 | PO Exception Tracker | 56 | Rename from "PO Tracker" |
| FRM-405 | Supplier Scorecard | 56 | 1 tab: input+score |
| FRM-413 | HOLD & Disposition Log | 56 | 1 tab |
| FRM-502 | Daily Dispatch List | 56 | 1 tab |
| FRM-503 | WIP Aging Report | 56 | 1 tab |
| FRM-504 | Shift Handover Log | 56 | 1 tab |
| FRM-512 | Downtime Log | 56 | 1 tab |
| FRM-513 | Tool Life Log | 56 | 1 tab |
| FRM-523 | Tooling Register | 56 | 1 tab |
| FRM-524 | Machine History Log | 56 | 1 tab |
| FRM-525 | Gage & Measuring Equipment Register | 56 | 1 tab |
| FRM-601 | Calibration Log | 56 | 1 tab |
| FRM-602 | Gage Verification Log | 56 | 1 tab |
| FRM-642 | Final Inspection & CoC Register | 56 | 1 tab |
| FRM-643 | Safety/Special Char. Register | 56 | 1 tab |
| FRM-708 | Environment Log | 56 | 1 tab |
| FRM-713 | Cleanroom Entry & Gowning Log | 56 | 1 tab |
| FRM-802 | Attendance List | 56 | 1 tab |
| FRM-806 | Certification Tracking Log | 56 | 1 tab |
| FRM-812 | Lighting Log | 56 | 1 tab |

### TYPE D: MULTI-TAB (ISO/AS bắt buộc) — 8 forms
Chỉ tách tab khi dữ liệu PHẢI ở format khác hoặc tiêu chuẩn yêu cầu

| Code | Title | Tabs | Reason |
|------|-------|------|--------|
| FRM-132 | PFMEA Lite | 2: PFMEA(A3L) + Actions(A4P) | PFMEA matrix quá rộng cho 1 tab |
| FRM-133 | Control Plan | 2: Plan(A3L) + RevHistory(A4P) | Control Plan quá rộng |
| FRM-203 | Job Tracking Sheet | 2: Track(A4L) + Milestones(A4P) | Job traveler + milestones |
| FRM-208 | Daily Tier Meeting Log | 2: Tier(A4L) + KPI(A4P) | Meeting log + KPI metrics |
| FRM-301 | Costing Sheet | 2: Cost(A4L) + CostLines(A4P) | Costing requires detail lines |
| FRM-302 | Setup Sheet | 2: Setup(A3L) + ToolList(A4P) | CNC setup quá rộng + tool list riêng |
| FRM-311 | FAI Report | 3: FAI(A4L) + CharResults(A4L) + MatlProc(A4P) | AS9102 requires 3 forms |
| FRM-621 | AQL Inspection Record | 1: Record(A4L) | Wide format but 1 tab |
| FRM-631 | SPC/Process Capability | 2: DataLog(A4L) + Charts(A4L) | Data + statistical charts |
| FRM-641 | Final Inspection Report | 1: Report(A4L) | Wide but 1 tab |
| FRM-807 | Skills Matrix | 1: Matrix(A3L) | Wide matrix |
| FRM-809 | Skills & KPI Matrix | 1: Matrix(A3L) | Wide matrix |

### TYPE E: PRINT LABELS/TAGS (1 tab) — 5 forms
Fixed layout, print-only

| Code | Title | Cols | Notes |
|------|-------|------|-------|
| FRM-703 | WIP Tag | 40 | Print label |
| FRM-704 | Part ID Label | 40 | Print label |
| FRM-705 | Location Label | 40 | Print label |
| FRM-706 | Shipping Label | 40 | Print label |
| FRM-805 | Skill Level Certificate | 40 | Print certificate |

### TYPE F: MSA / STATISTICAL (specialized) — 3 forms
Calculation-heavy, specific layout

| Code | Title | Tabs | Notes |
|------|-------|------|-------|
| FRM-611 | GR&R Study Form | 1: Study(A4L) | Data grid + auto-calc |
| FRM-612 | Bias/Linearity/Stability | 1: Study(A4L) | Data grid + auto-calc |
| FRM-613 | Attribute MSA & CMM Qual | 1: Study(A4L) | Data grid + auto-calc |

## TAB CONSOLIDATION SUMMARY

| From (old tabs) | To (new) | Savings |
|-----------------|----------|---------|
| 2 tabs → 1 tab | 68 forms | -68 tabs removed |
| 3 tabs → 1 tab | 8 forms | -16 tabs removed |
| 3 tabs → 2 tabs | 5 forms | -5 tabs removed |
| 4 tabs → 2 tabs | 3 forms | -6 tabs removed |
| Keep as-is | 27 forms | 0 |
| **TOTAL** | **111 forms** | **-95 tabs eliminated** |

## EXECUTION ORDER
1. Wave 1: TYPE A checklist forms (38 forms) — biggest batch, proven pattern
2. Wave 2: TYPE B report forms (15 forms)
3. Wave 3: TYPE C data logs (30 forms) — different pattern, wider format
4. Wave 4: TYPE D multi-tab (8 forms) — most complex
5. Wave 5: TYPE E labels + TYPE F statistical (8 forms)
