# PROMPT PACK 2 · Weeks W04 · W05 · W06

**Date range**: 06/06 → 20/06/2026.
**Phase coverage**: P2 (Pilot gate) → P3 (Wave 2 go-live + mid-review).
**Theme**: Lock pilot result, launch SCM/Sales wave, prep Wave Production.

---

## How to run this pack

Codex agent: read [SHARED_CONTEXT.md](SHARED_CONTEXT.md) first. Then fill these
**3 files**:

```
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W04.html
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W05.html
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W06.html
```

Do **not** touch any file outside this 3-file scope. Follow output rules in
SHARED_CONTEXT (Vietnamese with diacritics, role codes only, ≥3000 words/file,
no fabricated names).

---

## W04 — 06/06/2026 · Pilot QA gate Go/No-Go (file: TRN-DEP-W04.html)

### Strategic intent

The first **real gate** of the program. Lean Change "validated learning" check.
ITIL 4 Change Enablement Post-Implementation Review for the pilot. Kotter
step 6 (short-term wins) — celebrate or fail-forward publicly. ISO 9001:2015
§9.1.2 evaluation of compliance + §10.2 nonconformity & corrective action.

### Mandatory content per section

**SEC-COVER**: Frame as "first management decision under real data". Quick facts:
06/06/2026 · Thứ Bảy · Phase P2 · Pillars pilot · Attendees: Steering + champions (~16) · Owner CEO + QMS_MGR.

**SEC-OBJECTIVE**:
- Đóng pilot Tuần 2 (Mon 01/6 → Fri 05/6) hoặc justify extend.
- Wrong-revision drill executed Tue 02/6: ≥3 docs intentionally given wrong rev → champion QA caught ≥95%.
- QA độc lập 1 ngày (Thu 04/6): non-dual-run, no Sev-1/Sev-2 issue.
- Gate decision signed: Go (Wave 2 begins W05) / Conditional Go / No-Go.

**SEC-PREP** (T-7 = Thứ Bảy 30/5 sau họp W03):
- T-7: gate decision template prepared; PIR form drafted (ITIL 4 §5.1.7).
- T-3 (Tuesday 02/6 9:00 sau wrong-rev drill): IT_MGR + QMS_ENG verify drill log.
- T-1 (Friday 05/6 16:00): QA Manager pre-circulate gate evidence packet (8–10 pages).
- T-0 (Saturday 06/6 8:30): Steering Committee dry-run rehearsal 30'.

**SEC-AGENDA**:
- 09:00–09:05 CEO opening — frame decision space (Go / Conditional / No-Go)
- 09:05–09:20 QA Manager: 2-week pilot full data dump (KPI snapshot, issue log, drill results)
- 09:20–09:35 Lean Change retrospective — Insights / Options / Experiments W04 (Jason Little canvas)
- 09:35–09:45 PIR review (ITIL 4) — root cause of Sev-2 issues if any
- 09:45–09:55 Gate decision deliberation + sign-off
- 09:55–10:00 Preview W05 — Wave 2 go-live mechanics

**SEC-SLIDES**: 12 slides:
1. Recap 2 tuần pilot (W03 + Mon-Fri W04)
2. KPI-FLD-01 baseline → W04 (sparkline)
3. KPI-FLD-02 retrieval drill — 25+ lượt cộng dồn
4. KPI-TRN-01 QA team training completion
5. Issue log full — 12+ entries (table)
6. Issue severity breakdown + closure rate
7. Wrong-revision drill — 5 doc, champion catch rate
8. QA độc lập 1 ngày — Thursday 04/6 timeline + KPI
9. Lean Change Insights (3 phát hiện)
10. Lean Change Options (3 alternatives cho Wave 2)
11. PIR — root cause analysis cho Sev-2 nếu có
12. Gate decision matrix — Go / Conditional / No-Go criteria

**SEC-DECISIONS**:
1. Gate decision Pilot QA → Wave 2 (3 options trên slide 12)
2. Issue log closure plan — mỗi issue mở phải có owner + deadline
3. Lean Change experiment cho W05 (Wave 2 hypothesis)
4. Wave 2 attendee list confirmation (SCM + Sales = ~25 người)

**SEC-GATE**: P2-02, P2-03, P2-04. Use gate-library items #1, #6, #8, #10.

Necessary (5):
- Pilot dual-run ≥3 ngày Tuần 1 + ≥3 ngày Tuần 2 (≥6 days total)
- Issue log có ≥10 entries; 0 Sev-1 mở
- Wrong-revision drill executed; champion catch rate ≥95%
- QA độc lập 1 ngày completed; 0 Sev-1, 0 Sev-2
- PIR form completed and signed by QA_MGR + champion QA primary

Sufficient (5):
- KPI-FLD-02 retrieval median ≤180s averaged over 25+ lượt
- KPI-TRN-01 = 100% QA team
- CAPA backlog ≤ 5 mở; mỗi CAPA có owner + deadline ≤30 ngày
- CEO + QMS_MGR wet/e-signature on gate-decision form
- Audit_events row `pilot_qa_gate_<decision>` written (decision = go|cond|nogo)

**SEC-TASKS**: 12+ tasks. Include:
- If GO: trigger W05 prep (SCM + Sales onboarding kickoff Monday 08/6)
- If CONDITIONAL: list 3–5 specific conditions to close before W05
- If NO-GO: revert to W03 cadence, extend pilot 1 week
- Update KPI dashboard with W04 final values
- Send gate decision memo to all 80 employees by Sunday 07/6
- Archive PIR form + Lean Change canvas in ANNEX-119

**SEC-NEXT-WEEK**: Preview W05 conditional on Go decision.
- Mon 08/6: SCM + Sales onboarding kickoff (10:00, 25 attendees)
- Tue 09/6: Champion SCM + Sales OJT begins
- Wed 10/6: M365 access verification for SCM + Sales
- Thu 11/6: Severity board live for SCM + Sales
- Fri 12/6: Pre-go-live readiness check

**SEC-DOCS**: ANNEX-114, ANNEX-117, ANNEX-118, SOP-605, WI-201, WI-202, SOP-401, SOP-201, WI-701, TRN-DEP-W03 (history), TRN-DEP-W05 (preview).

**SEC-RISKS**:
- Gate gridlock risk: Steering không đồng thuận → mitigation: tie-break rule (CEO + ⅔ Steering = Go); document trong agenda.
- Hofstede face-saving: QMS_MGR ngại No-Go → mitigation: blameless-postmortem framing (W11 lessons-learned); senior speak LAST.
- Wave 2 ready risk: SCM + Sales chưa nominate champion → emergency activation backup; HR_MGR escalate.
- KPI manipulation: drill data quá đẹp → audit by champion backup independent re-run.

---

## W05 — 13/06/2026 · Wave 2 go-live SCM + Sales (file: TRN-DEP-W05.html)

### Strategic intent

First real go-live with shop-floor-adjacent operations (SCM = procurement +
warehouse + import/export; Sales = customer service + estimator + sales).
Lean Manufacturing "copy-exactly" pattern — replicate pilot QA learnings to a
larger but lower-risk team. Toyota hypercare (modified for admin teams) for 5
business days. ISO 9001:2015 §8.4 control of externally-provided processes (SCM)
and §8.2 customer-related processes (Sales).

### Mandatory content per section

**SEC-COVER**: Frame as "the first wave that touches money" — SCM controls inbound
materials, Sales controls outbound revenue.

**SEC-OBJECTIVE**:
- SCM (5 phòng: Mua hàng, Kho, XNK) + Sales (CS + Estimator) go-live Monday 15/6.
- Daily command center 8:30 mỗi sáng (15 phút).
- Severity board cập nhật real-time; 0 Sev-1 mở cuối tuần.
- Champion SCM + Sales pass OJT — ký xác nhận.
- KPI-FLD-01, KPI-FLD-02, KPI-TRN-01 đo cho Wave 2 cohort (25 người).

**SEC-PREP** (T-7 = 06/6 W04 day; T-3 = Tue 09/6; T-1 = Fri 12/6; T-0 = Sat 13/6):
- T-7: Wave 2 attendee list confirmed (25); champion roster locked; M365 routing rules updated.
- T-3: champion bootcamp Module 2 done; standup room booked (8:30 daily); severity board template seeded.
- T-1: pre-go-live readiness check (10 items); M365 access spot-check 5 random users; rollback procedure rehearsed.
- T-0: CEO + QMS_MGR brief at standup; champion SCM + Sales handover briefing.

**SEC-AGENDA** (Sat 13/6 9:00 — first weekly review after Mon go-live):
- 09:00–09:10 SCM Manager báo cáo Mon-Fri (5 ngày đầu)
- 09:10–09:20 Sales Manager báo cáo
- 09:20–09:30 KPI snapshot Wave 2 cohort
- 09:30–09:45 Issue log Wave 2 (target ≥8 entries from 5 ngày)
- 09:45–09:55 Champion OJT pass/fail decision (5 champion = 100%)
- 09:55–10:00 Preview W06 — Wave Production prep

**SEC-SLIDES**: 12 slides:
1. Wave 2 go-live recap — Mon 15/6 cutover timeline
2. SCM 3 phòng KPI snapshot
3. Sales 2 phòng KPI snapshot
4. Issue log full table — 8+ entries với severity + owner
5. Severity board screenshot (severity board cập nhật)
6. Champion SCM Mua hàng OJT pass card
7. Champion SCM Kho OJT pass card
8. Champion SCM XNK OJT pass card
9. Champion Sales CS OJT pass card
10. Champion Sales Estimator OJT pass card
11. M365 retrieval drill 5 random Wave 2 users — pass rate
12. Preview W06: Wave Production prep agenda

**SEC-DECISIONS**:
1. Approve Champion Wave 2 OJT pass status (5/5 hoặc less)
2. Approve issue log triage (mỗi issue có owner + deadline)
3. Approve continuation Wave 2 hypercare another week
4. Approve Wave Production runbook draft v0.9 (lock target W06)

**SEC-GATE**: P3-01. Use gate-library items #1, #2, #5, #9, #10.

Necessary (5):
- Wave 2 cohort headcount = 25 đã onboarded (M365 access verified)
- 5 champion (SCM 3 + Sales 2) OJT pass — primary + backup
- Daily standup attendance ≥90% × 5 ngày
- Severity board updated daily; 0 Sev-1 outstanding
- Issue log có ≥5 entries trong tuần

Sufficient (5):
- KPI-FLD-01 ≥90% (target ≥95% by W06)
- KPI-FLD-02 retrieval median ≤180s — 10+ drill lượt with Wave 2 users
- KPI-TRN-01 = 100% Wave 2 cohort
- KPI-DEP-01 champion coverage = 100% (5 primary + 5 backup)
- Audit_events row `wave2_week1_pass` written

**SEC-TASKS**: 12+ tasks. Include:
- Lock Wave Production runbook v1.0 by Wed 17/6
- Schedule Wave Production champion bootcamp (Production = 11 người, Eng = 8 người)
- Update CAPA register với Wave 2 issue closures
- Send Wave 2 hypercare status memo to all 80 employees
- Prepare Lean Change canvas for W06 review

**SEC-NEXT-WEEK**: Preview W06 — Wave Production prep + Wave 2 mid-review.
Production + Engineering phải đến với:
- Sổ tay + JD đã đọc 100%
- Champion + backup nominated
- 7 zone gemba walk schedule cho hypercare

**SEC-DOCS**: SOP-401, WI-701, SOP-201, ANNEX-114, ANNEX-117, ANNEX-118, SOP-605 (xref pilot), TRN-DEP-W04 (history), TRN-DEP-W06 (preview), TRN-DEP-W07 (next wave heads-up).

**SEC-RISKS**:
- Customer order disruption: Sales CS confused during transition → mitigation: dual-system fallback 1 tuần; CS hotline 24/5.
- Inventory accuracy: Kho count mismatch when switching systems → mitigation: cycle count Sunday before go-live; reconciliation Mon 8:00.
- Supplier impact: SCM Mua hàng PO format change → mitigation: top 10 supplier notified W04; format guide attached.
- Hofstede risk: Sales CS không speak up about confused customers → anonymous customer feedback box.

---

## W06 — 20/06/2026 · Wave 2 mid-review + Wave Production prep (file: TRN-DEP-W06.html)

### Strategic intent

Two parallel agendas: (1) close out Wave 2 hypercare (Sev-1 = 0 streak ≥ 5 days),
(2) lock Wave Production runbook + rollback. Wave Production = Sản xuất +
Kỹ thuật ĐỒNG THỜI = highest risk wave. ITIL 4 Change Enablement: this is a
"major change" requiring CAB review + emergency change procedure pre-tested.
Lean Manufacturing copy-exactly pattern: take Wave 2 learnings, formalize SOP
for Wave Production.

### Mandatory content per section

**SEC-COVER**: Frame as "lock-and-load week" — Wave 2 confidence built, Wave
Production guns loaded. CEO + QMS_MGR + QA_MGR + PROD_DIR + ENG_MGR all in.

**SEC-OBJECTIVE**:
- Wave 2 mid-review: Sev-1 = 0 for ≥5 consecutive days; Sev-2 có workaround ổn định.
- Wave Production runbook v1.0 lock (ANNEX-114 amendment + ANNEX-118 hypercare playbook).
- Rollback trigger đã test thật (not just dry-run) — bằng chứng trong audit_events.
- Approve Wave Production go-live for W07 Mon 22/6 → Tue 23/6.
- Champion Production (11 zone × 1 + 1 backup = 22 people) + champion Engineering (8) nominated and bootcamp-passed.

**SEC-PREP** (T-7 = 13/6 W05; T-3 = Wed 17/6; T-1 = Fri 19/6; T-0 = Sat 20/6):
- T-7: Wave 2 hypercare data collection cadence locked; Wave Production runbook v0.9 ready for CAB review.
- T-3 (Wed 17/6): CAB convene 16:00 — runbook v1.0 sign-off (ITIL 4 §5.1.7); rollback trigger live test scheduled Thu 18/6.
- T-1 (Fri 19/6): rollback test executed; result archived; PIR form drafted; champion Production + Engineering bootcamp Session 2 complete.
- T-0 (Sat 20/6 8:30): Steering pre-meeting 30' to align decision space.

**SEC-AGENDA**:
- 09:00–09:10 Wave 2 mid-review (SCM_MGR + SALES_MGR)
- 09:10–09:20 Wave 2 KPI snapshot + Sev-1/Sev-2 trend
- 09:20–09:35 Wave Production runbook v1.0 walkthrough (PROD_DIR + ENG_MGR)
- 09:35–09:45 Rollback test result presentation (QMS_ENG)
- 09:45–09:55 Gate decision Wave Production go-live (CEO + QMS_MGR + QA_MGR)
- 09:55–10:00 Preview W07 — go-live mechanics

**SEC-SLIDES**: 12 slides:
1. Wave 2 hypercare exit criteria — 5 ngày Sev-1 = 0 streak (sparkline)
2. Wave 2 Sev-2 closure timeline
3. Wave 2 KPI final — KPI-FLD-01, KPI-FLD-02, KPI-TRN-01 W02-W06 sparkline
4. Wave Production runbook v1.0 — 7-zone cutover map
5. Wave Production runbook v1.0 — timeline Mon-Tue cutover hours
6. Rollback trigger conditions (4 conditions để trigger rollback)
7. Rollback test result Thu 18/6 — duration + recovery state
8. Champion Production roster — 11 primary + 11 backup (22 total)
9. Champion Engineering roster — 8 primary + 8 backup
10. Andon-cord escalation tree (Toyota shusa model)
11. Daily gemba walk schedule — 7 zone × 15 phút × 2 lượt/ngày
12. Wave Production gate criteria preview

**SEC-DECISIONS**:
1. Approve Wave Production runbook v1.0 lock (lock = no edits without CAB)
2. Approve rollback trigger v1.0 (4 conditions in slide 6)
3. Approve Wave Production go-live Mon 22/6 (or defer to Mon 29/6)
4. Approve champion roster Wave Production (30 people total)
5. Approve hypercare team composition (QA_MGR + QMS_ENG + 2 production champion)

**SEC-GATE**: P3-02. Use gate-library items #1, #4, #5, #7, #8, #10.

Necessary (5):
- Wave 2 Sev-1 = 0 for ≥5 consecutive working days (5-7/6 → 13-19/6)
- Wave 2 Sev-2 có workaround ổn định (mỗi Sev-2 mở có workaround + ETA ≤7 ngày)
- Wave Production runbook v1.0 status='released' trong dcc_document_header (ANNEX-114 amendment)
- Rollback test executed Thu 18/6 (audit_events row exists)
- Champion Production + Engineering nominated (30 people, bootcamp passed ≥90%)

Sufficient (5):
- CAB approval logged (ITIL 4 §5.1.7) for runbook lock
- CAPA backlog ≤ 5 mở; 0 overdue
- KPI dashboard 5 days green (KPI-DEP-03 change failure ≤10%, KPI-DEP-04 lead time ≤10d, KPI-DEP-05 refresh ≥95%)
- PIR form W05-W06 signed (QA_MGR + champion)
- CEO + QMS_MGR + QA_MGR + PROD_DIR + ENG_MGR signed gate-decision form

**SEC-TASKS**: 12+ tasks. Include:
- Trigger Wave Production cutover Mon 22/6 5:00 (1h before first shift)
- Daily gemba walk schedule published 7 zones × 2 lượt
- Andon-cord posters printed + posted W07 Monday morning
- Problem-of-the-day board template seeded
- Production runbook v1.0 archive in ANNEX-114
- Wave 2 hypercare officially closed; cadence → weekly tier

**SEC-NEXT-WEEK**: Preview W07 — Wave Production go-live Tuần 1.
Mon 22/6 5:00 cutover begin; daily gemba 15' × 7 zone; daily standup 8:30 enlarged.
Champion Production phải ở zone của mình lúc 7:00 (1h trước ca A). All 80 employees
receive Wave Production go-live memo Sunday evening.

**SEC-DOCS**: ANNEX-114, ANNEX-117, ANNEX-118, SOP-501, WI-519, SOP-303, WI-302, WI-202, TRN-DEP-W05 (history), TRN-DEP-W07 (preview), TRN-DEP-W08 (heads-up hypercare).

**SEC-RISKS**:
- Wave 2 Sev-1 spike at end of week → defer Wave Production 1 week.
- Rollback test fail → ECAB convene; mitigation: pre-staged dual-system fallback for 24h.
- Champion Production absence (vacation, illness) → backup activation, but 22 backups = 11 zones × 2 = 0 SPOF.
- Production worker pushback (Hofstede high power-distance, low desire to change SOPs they've used 10 years) → mitigation: Toyota Kata coaching cadence; senior production technician = mentor pair with each champion.
- Engineering CAD/CAM workflow disruption → mitigation: 1 week dual-CAD (old + new) for Mon-Fri W07.

---

## Acceptance checklist for this pack

- [ ] All 3 files (W04, W05, W06) have ≥3000 words content each
- [ ] Zero `<!-- TODO -->` markers remain
- [ ] Orange `.pending-fill` block removed
- [ ] All `openDoc('CODE')` chips use valid doc codes
- [ ] Role codes only (no names)
- [ ] All dates absolute YYYY-MM-DD
- [ ] Gate sections have Necessary + Sufficient sub-tables
- [ ] RACI tables have R/A/C/I cells for every row
- [ ] Vietnamese with diacritics
- [ ] At least 2 framework citations per file
- [ ] W04 explicitly handles 3 gate outcomes (Go / Conditional / No-Go)
- [ ] W05 includes Lean Manufacturing copy-exactly pattern
- [ ] W06 includes ITIL CAB process + rollback test evidence
