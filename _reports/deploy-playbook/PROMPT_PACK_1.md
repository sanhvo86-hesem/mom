# PROMPT PACK 1 · Weeks W01 · W02 · W03

**Date range**: 16/05 → 30/05/2026 (Saturdays).
**Phase coverage**: P0 (Pre-flight finish) → P1 (RACI freeze) → P2 (Pilot QA start).
**Theme**: Open the program, freeze handbooks/RACI, start QA pilot.

---

## How to run this pack

You are a Codex agent. Read [SHARED_CONTEXT.md](SHARED_CONTEXT.md) first (it
contains the schedule, KPI catalog, doc-code registry, gate boilerplate, and
framework citations all packs share). Then fill these **3 files**:

```
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W01.html
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W02.html
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W03.html
```

Each file has 12 sections marked with `<!-- TODO Codex W##/SEC-NAME: … -->`.
Fill every TODO, remove the orange `.pending-fill` warning block, and keep all
other HTML structure intact.

Do **not** modify any file outside this 3-file scope.

---

## W01 — 16/05/2026 · Công bố chính thức (file: TRN-DEP-W01.html)

### Strategic intent (Codex must convey)

Day 0 of the all-hands phase. Kotter step 3 (Vision) + step 4 (Communicate
vision). Prosci ADKAR Awareness + Desire activated for 80 employees.
ISO 9001:2015 §5.1.1(a–b) leadership commitment in public.

### Mandatory content per section

**SEC-COVER**: 2–3 sentences framing W01 as the program's vision-anchor moment.
Quick facts: 16/05/2026 · Thứ Bảy · Phase P0 · Pillars gov+doc · 80 attendees · Owner CEO.

**SEC-OBJECTIVE**: 4 SMART objectives. At minimum:
- MAN-001 + POL-QMS-001 + POL-QMS-002 reach `status='released'` with `effective_date=2026-05-16` in `dcc_document_header` by end of W01.
- 11 sổ tay phòng ban + 39 JD physically/digitally handed off; signed acknowledgement.
- Issue register opens with ≥1 dummy Sev-3 entry to prove the workflow.
- Awareness pulse: ≥80% attendees can name the 3 foundational documents (measured by 1-question quiz at end of meeting).

KPI baseline to capture at W01: KPI-FLD-01 (current state, pre-rollout), KPI-FLD-02 (baseline retrieval drill), KPI-DEP-01 (champion coverage = 0 → target by W02), KPI-DEP-05 (dashboard refresh baseline).

**SEC-PREP** (T-7 / T-3 / T-1 / T-0): minimum 4 items per window. Examples:
- T-7: CEO speech draft reviewed by QMS_MGR; 11 sổ tay printed; 39 JD packets assembled; venue + AV check.
- T-3: rehearsal of CEO opening + QMS_MGR 10' overview; bilingual slide deck VN/EN locked; attendee list confirmed to 80.
- T-1: PRINT final agenda; champion candidate shortlist (per phòng); RACI master draft circulated for pre-read.
- T-0 (sáng họp, 30' trước): IT_MGR verify M365 access for all 10 phòng; QA_MGR pre-load 5 retrieval drill docs; CEO mic check.

**SEC-AGENDA**: 09:00–10:00. Include:
- 09:00–09:05 CEO opening (Kotter step 1 urgency)
- 09:05–09:15 QMS_MGR: MAN-001 walkthrough (10 slides)
- 09:15–09:25 QA_MGR: POL-QMS-001 + POL-QMS-002 (5 slides each)
- 09:25–09:35 Hand-off ceremony (CEO trao sổ tay cho 10 trưởng phòng)
- 09:35–09:45 Awareness quiz (1 question per attendee) + Q&A 1:1 với supervisor (collectivism per Hofstede)
- 09:45–09:55 Gate decision (P0-04 + P0-05) sign-off
- 09:55–10:00 Preview W02 + close

**SEC-SLIDES**: 12 slides minimum. Include:
1. "Vì sao chúng ta triển khai QMS lúc này" — business case (Kotter urgency)
2. MAN-001 scope + 7 pillars overview
3. POL-QMS-001 — Chính sách chất lượng (5 cam kết)
4. POL-QMS-002 — Mục tiêu chất lượng (smart targets)
5. 7 trụ triển khai · owner + pass criterion (table)
6. Lộ trình 12 tuần (timeline visualization)
7. Vai trò mỗi phòng ban (10 dept × 4 cột)
8. Champion là ai · trách nhiệm · backup
9. Cadence điều hành (Thứ Bảy 9:00 + daily standup)
10. Cách phản hồi (14 ngày cửa sổ feedback)
11. Issue register · 4 mức severity
12. Cam kết của Steering Committee (CEO + QMS_MGR + QA_MGR phát biểu cuối)

**SEC-DECISIONS**: 4 decisions minimum:
1. Hiệu lực MAN-001 (CEO ký)
2. Hiệu lực POL-QMS-001 (CEO ký)
3. Hiệu lực POL-QMS-002 (CEO ký)
4. Approve 14-day feedback window + escalation matrix

**SEC-GATE**: Use gate codes P0-04 + P0-05.
- Necessary (4): MAN-001 effective_date present, 11 sổ tay hand-off bằng chứng, 39 JD hand-off, Issue register table exists.
- Sufficient (4): Awareness quiz ≥80% correct, CEO speech delivered (recording archived), Audit_events row `deploy_program_start` written, Cadence dashboard widget shows W01 green.

**SEC-TASKS**: 12 tasks minimum, each with R/A/C/I role codes. Examples:
- Task 1: Insert deploy_program_start row vào audit_events — R: QMS_ENG, A: QMS_MGR, deadline 2026-05-16 17:00, evidence: `audit_events` table
- Task 2: Champion nomination form to 11 trưởng phòng — R: HR_MGR, A: QMS_MGR, deadline 2026-05-18, evidence: champions.json draft
- Task 3: RACI master pre-read distributed — R: QMS_ENG, A: QMS_MGR, deadline 2026-05-19, evidence: ANNEX-119 v0.9
- ... (continue to 12)

**SEC-NEXT-WEEK**: Preview W02. Each trưởng phòng prepare:
- Sổ tay phòng ban đã review + 2 chỉnh sửa proposed
- 3 JD đã đọc kỹ
- Champion candidate (1 primary + 1 backup) nominated by 2026-05-21

**SEC-DOCS**: openDoc chips for MAN-001, POL-QMS-001, POL-QMS-002, WI-105, WI-106, ANNEX-114, ANNEX-119, RACI-master-matrix, Authority-matrix, TRN-DEP-W02 (preview).

**SEC-RISKS**: 5 risks minimum. Must include:
- Hofstede risk: trưởng phòng không speak up trong all-hands → mitigation: anonymous feedback box + 1:1 với supervisor sau họp.
- Power-distance risk: CEO phát biểu sau → mọi người im → mitigation: CEO phát biểu đầu tiên, khẳng định explicit endorsement.
- AV/IT risk: M365 down trong họp → mitigation: PDF offline backup + IT trực phòng họp.

**SEC-LESSONS**: 3 empty blocks (Insights / Options / Experiments) with placeholder text "Điền sau cuộc họp 16/05/2026 bởi QMS_ENG".

---

## W02 — 23/05/2026 · Chốt sổ tay + JD + RACI master (file: TRN-DEP-W02.html)

### Strategic intent

Kotter step 5 (Empower broad action). Prosci Knowledge phase begins. ISO 9001:2015
§7.5.3 documented information frozen at V1.0; §5.3 roles/responsibilities locked.
NIST 800-53 CM-2 baseline configuration established.

### Mandatory content per section

**SEC-COVER**: Frame as the "knowledge freeze week" — by end of W02 every employee
knows which doc applies to their job.

**SEC-OBJECTIVE**: 4 SMART objectives:
- 11 sổ tay phòng ban ký V1.0 (effective_date = 2026-05-23) by 11 trưởng phòng.
- 39 JD ký V1.0 với signature `owner_role_code` + `approver_role_code` columns populated in dcc_document_header.
- RACI master v1.0 frozen — ≥95% cell sign-off across 39 JD × 7 pillars matrix.
- 11 champion + 11 backup nominated; bootcamp Session 1 completed (≥90% pass).

**SEC-PREP** (T-7 / T-3 / T-1 / T-0):
- T-7: collect feedback từ cửa sổ phản hồi 14 ngày (mở từ W01); QMS_ENG tổng hợp.
- T-3: rewrite sổ tay v0.9 → v1.0 với feedback đã merge; champion bootcamp module 1 ready.
- T-1: 11 sổ tay v1.0 in + bind; signature page chuẩn bị.
- T-0: 1 phòng họp + 1 bootcamp room set up song song.

**SEC-AGENDA**: 09:00–10:00:
- 09:00–09:10 Tổng quan feedback 14 ngày (QMS_MGR)
- 09:10–09:30 11 trưởng phòng ký sổ tay (3 phút/người, song song 2 bàn)
- 09:30–09:45 39 JD ký nhanh
- 09:45–09:55 RACI master walkthrough + ký bởi 11 trưởng phòng
- 09:55–10:00 Champion bootcamp announcement + preview W03

Champion bootcamp 10:00–12:00 (song song, không trong agenda chính):
- Session 1: WI-105 + WI-106 walkthrough (60 phút)
- Session 2: Retrieval drill thực hành (60 phút) — pass criterion: 5 lần tìm doc ≤3 phút median

**SEC-SLIDES**: 12 slides. Include:
1. Tổng quan 14 ngày feedback — 32 góp ý đã merge, 8 deferred (table)
2. Cấu trúc 11 sổ tay (template)
3. Sổ tay Sản xuất — điểm khác biệt
4. Sổ tay Kỹ thuật — điểm khác biệt
5. Sổ tay Chất lượng — điểm khác biệt
6. Sổ tay SCM — điểm khác biệt
7. Sổ tay Sales/CS — điểm khác biệt
8. RACI master matrix — 39 JD × 7 pillars (full screen)
9. RACI dispute resolution — escalation lên CEO trong 5 ngày làm việc
10. Champion bootcamp curriculum (2h)
11. Champion backup — vai trò + khi nào kích hoạt
12. KPI baseline tuần này — comparison với W01

**SEC-DECISIONS**: 4 decisions:
1. Approve 11 sổ tay V1.0 effective_date = 2026-05-23
2. Approve 39 JD V1.0
3. Approve RACI master v1.0
4. Approve champion + backup roster (22 người)

**SEC-GATE**: Use P1-01, P1-02. Gate condition library items #2, #3, #4, #9.
- Necessary: 11 sổ tay status='released', 39 JD status='released', RACI ≥95% sign-off, 22 champion nominated.
- Sufficient: champion bootcamp Session 1 pass rate ≥90%, retrieval drill median ≤3 phút, KPI-FLD-02 baseline measured, audit_events row `raci_v1_frozen`.

**SEC-TASKS**: 12+ tasks. Key:
- Update dcc_document_header.status = 'released' for 11 sổ tay
- Update dcc_document_header for 39 JD with owner + approver
- Insert RACI master matrix into ANNEX-119
- Set up champion bootcamp module 2 (for W03)
- Schedule pilot QA dual-run kickoff (W03 Monday)

**SEC-NEXT-WEEK**: Preview W03 — Pilot QA dual-run begins Monday 2026-05-25.
Champion QA need pre-read SOP-605 + WI-201 by Friday 2026-05-22. QA team 5 người
ready for daily standup.

**SEC-DOCS**: chips for sổ tay phòng ban (11), 39 JD, RACI-master-matrix, Authority-matrix, WI-105, ANNEX-119, TRN-DEP-W01 (history), TRN-DEP-W03 (preview).

**SEC-RISKS**:
- Collectivism risk: trưởng phòng không dare reject sổ tay nháp → mitigation: anonymous feedback collected pre-meeting.
- RACI ambiguity risk: 2 phòng claim same R → mitigation: dispute resolution path lên CEO trong 5 ngày.
- Bootcamp dropout: champion candidate không xuất hiện → mitigation: backup activate ngay; HR_MGR escalate.

---

## W03 — 30/05/2026 · Pilot QA Tuần 1 (file: TRN-DEP-W03.html)

### Strategic intent

Prosci Ability phase + Kotter step 5 in action. Lean Change Management
"experiment" canvas — pilot QA is hypothesis #1. ISO 9001:2015 §8.1 operational
planning + §9.1 monitoring activated. Lean Manufacturing "pilot one line first"
(Rother & Harris LEI 2001).

### Mandatory content per section

**SEC-COVER**: Frame as "first contact with reality" — QA team chạy thực 5 ngày
dual-run với hệ thống cũ. Phòng QA chỉ có 5 người; KPI bám sát hơn.

**SEC-OBJECTIVE**: 4 SMART:
- QA dual-run chạy ≥3 ngày trong tuần (Mon–Fri 25–29/5/2026).
- Issue log có ≥5 entries từ pilot, bất kể severity.
- Retrieval drill ≥10 lượt bởi champion QA, median ≤3 phút.
- Daily standup 15' mỗi sáng, attendance ≥90% (5/5 QA team + ≥1 champion).

**SEC-PREP**:
- T-7 (Thứ Bảy 23/5 sau họp W02): QA team đọc SOP-605 + WI-201; champion QA xem WI-105 + WI-106.
- T-3 (Thứ Tư 27/5 nếu late prep): IT_MGR verify M365 retrieval; QMS_ENG seed 5 test docs.
- T-1 (Thứ Sáu 22/5): pilot zone selected — IQC station; standup room booked.
- T-0 (Thứ Bảy 30/5 9:00): tổng kết tuần pilot, không phải prep cho lần đầu.

**SEC-AGENDA** (W03 họp Thứ Bảy 30/5 tổng kết tuần pilot Mon–Fri):
- 09:00–09:10 QA Manager báo cáo tuần pilot — KPI snapshot
- 09:10–09:20 Issue log review — 5+ entries (root cause analysis ngắn)
- 09:20–09:35 Retrieval drill kết quả (10 lượt, ai làm, thời gian từng lượt)
- 09:35–09:50 Lean Change retrospective — Insights / Options / Experiments (Jason Little canvas)
- 09:50–09:55 Preview W04 — gate Go/No-Go cho Wave 2
- 09:55–10:00 Action items + close

**SEC-SLIDES**: 10–12 slides:
1. Pilot QA Tuần 1 — recap mục tiêu
2. KPI snapshot (so sánh với baseline W02)
3. Issue log đầy đủ — bảng 5+ rows với severity + root cause
4. Retrieval drill — 10 lượt với median + outlier
5. Champion QA performance — primary + backup
6. Daily standup attendance — 5 ngày, 5 phòng
7. Lean Change Insights — 3 phát hiện lớn
8. Lean Change Options — 3 lựa chọn cho W04
9. Lean Change Experiments — hypothesis cho W04
10. Wrong-revision drill schedule cho W04
11. Risk: nếu W04 không pass gate, fallback plan
12. Preview W04 agenda

**SEC-DECISIONS**:
1. Approve issue log triage (mỗi issue có owner + deadline)
2. Approve Lean Change experiment cho W04 (hypothesis cụ thể)
3. Approve wrong-revision drill cho W04
4. Approve dual-run extend thêm tuần nếu KPI fail

**SEC-GATE**: P2-01. Gate conditions:
- Necessary: dual-run ≥3 ngày completed, issue log ≥5 entries, retrieval drill ≥10 lượt, daily standup ≥90%.
- Sufficient: KPI-FLD-02 median ≤180s, KPI-TRN-01 champion QA = 100%, audit_events `pilot_qa_week1_complete`.

**SEC-TASKS**: 10+ tasks:
- Triage issue log — assign owner per issue
- Schedule wrong-revision drill for Tuesday 02/06
- Draft gate decision form for W04
- QA champion submit retrieval drill raw data
- Update KPI-FLD-02 baseline với W03 data
- Lean Change canvas template archived for W04 use

**SEC-NEXT-WEEK**: W04 = pilot gate Go/No-Go. CEO + QMS_MGR + QA_MGR phải có
mặt. Decision: approve Wave 2 (SCM + Sales) bắt đầu W05 hay extend pilot. QA team
cần present KPI dashboard cuối tuần (Thứ Sáu 05/06).

**SEC-DOCS**: SOP-605, WI-201, WI-202, DRL-E2E, ANNEX-114, ANNEX-117, TRN-DEP-W02 (history), TRN-DEP-W04 (preview).

**SEC-RISKS**:
- Pilot dual-run mất quá nhiều thời gian QA team → workload risk; mitigation: limit pilot scope to IQC station only.
- Issue log nhỏ hơn dự kiến → có thể QA team không actively report; mitigation: incentive — 1 cup café/issue logged trong tuần đầu.
- Wrong-revision drill phát hiện rev mismatch lớn → emergency change; mitigation: ECAB trong 24h theo ITIL 4.

---

## Acceptance checklist for this pack

Codex must verify before reporting done:

- [ ] All 3 files (W01, W02, W03) have ≥3000 words content each
- [ ] Zero `<!-- TODO -->` markers remain
- [ ] Orange `.pending-fill` block removed from all 3 files
- [ ] All `openDoc('CODE')` chips use valid doc codes from the registry
- [ ] No employee names; only role codes
- [ ] All dates absolute (YYYY-MM-DD), no "tuần sau"
- [ ] Each gate section has BOTH necessary AND sufficient sub-tables
- [ ] Each RACI table has R/A/C/I cells populated for every row
- [ ] Vietnamese with diacritics (proper Unicode)
- [ ] At least 2 framework citations per file (e.g. Prosci ADKAR + ISO 9001 §x.x)
