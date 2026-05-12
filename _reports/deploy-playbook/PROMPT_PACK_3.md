# PROMPT PACK 3 · Weeks W07 · W08 · W09

**Date range**: 27/06 → 11/07/2026.
**Phase coverage**: P3 — Wave Production go-live + Hypercare + Wave 3 kickoff.
**Theme**: The risk peak of the program. Shop floor change.

---

## How to run this pack

Codex agent: read [SHARED_CONTEXT.md](SHARED_CONTEXT.md) first. Then fill:

```
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W07.html
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W08.html
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W09.html
```

Do not touch files outside this scope. Follow SHARED_CONTEXT output rules.

---

## W07 — 27/06/2026 · Wave Production go-live Tuần 1 (file: TRN-DEP-W07.html)

### Strategic intent

The highest-risk wave: Sản xuất (11 zone × ~6 worker = 60+ people) + Kỹ thuật
(8 engineers) go-live ĐỒNG THỜI Mon 22/6. Toyota hypercare model (Liker 2021
Ch. 13) explicitly applies. Andon-cord empowerment + problem-of-the-day board
+ daily gemba walk × 7 zone. ISO 9001:2015 §8.5 production & service provision
+ §8.6 release of products. NIST 800-53 CM-3 change control enforced.

### Mandatory content per section

**SEC-COVER**: Frame as "the week that decides the program" — if Wave Production
survives, the rest is cleanup. Quick facts: 27/06/2026 · Thứ Bảy · Phase P3 ·
Pillar golive · Attendees: PROD + ENG + hypercare team + champion (~50) · Owner
PROD_DIR + ENG_MGR (CEO observes).

### SMART objectives

- Wave Production cutover Mon 22/6 5:00 hoàn tất trước ca A 7:00.
- 7 zone gemba walk 15' × 2 lượt/ngày × 5 ngày (Mon-Fri 22-26/6) — log full attendance.
- Job Order dossier đầu tiên (đơn hàng đầu tiên trong giai đoạn mới) pass đầy đủ — QA_MGR ký.
- Shift handover record (3 ca × 5 ngày = 15 lần) ≥90% completion.
- KPI đỏ = 0 hoặc có exception note ký bởi CEO.
- Andon-cord live test (≥1 lần thật trong tuần) — escalation đến QA_MGR ≤5 phút.
- Champion Production 11 zone present at zone 7:00 daily; backup verified.

### Mandatory per-section content

**SEC-PREP** (T-7 to T-0):
- T-7 (Sat 20/6 W06): Wave Production runbook v1.0 locked; champion roster locked; AV/IT/M365 access tested.
- T-3 (Tue 23/6 9:00 — sau ngày đầu cutover): rapid-fire reverse-PIR; adjust runbook v1.1 nếu cần (ITIL emergency change procedure).
- T-1 (Fri 26/6 16:00): full-week data assembled; gemba walk logs aggregated.
- T-0 (Sat 27/6 8:30): hypercare team aligns on Saturday meeting agenda; CEO briefing 5'.

**SEC-AGENDA**:
- 09:00–09:05 PROD_DIR opening — Wave 1 status header (1-slide go/no-go indicator)
- 09:05–09:15 Cutover Mon 22/6 5:00–7:00 timeline (CUTOVER_LEAD)
- 09:15–09:30 7 zone gemba walk recap — issues by zone
- 09:30–09:40 Job Order dossier đầu tiên — show full traceability
- 09:40–09:50 Andon-cord live test result + escalation timing
- 09:50–09:55 KPI Wave Production snapshot
- 09:55–10:00 Preview W08 hypercare cadence

**SEC-SLIDES** (12 slides — production-floor heavy):
1. Mon 22/6 cutover timeline 5:00→7:00 (Gantt)
2. 7 zone go-live status grid (zone × pass/fail)
3. Zone 1 (CNC machining) gemba issues
4. Zone 2 (Setup/programming) gemba issues
5. Zone 3 (IPQC in-process) gemba issues
6. Zone 4 (FAI first article) gemba issues
7. Zone 5 (Final QC + packing) gemba issues
8. Zone 6 (Shipping + CoC) gemba issues
9. Zone 7 (Tooling + maintenance) gemba issues
10. Job Order dossier đầu tiên — 8 cổng G0-G7 traceability
11. Andon-cord live test — when, what, escalation time
12. KPI Wave Production snapshot + W08 hypercare cadence preview

**SEC-DECISIONS**:
1. Approve Wave Production continuation into W08 hypercare (or escalate)
2. Approve runbook v1.1 amendment if needed (ITIL normal change → emergency if Sev-1)
3. Approve daily gemba cadence continuation
4. Approve any exception note on red KPI (CEO ký)

**SEC-GATE**: P3-03. Use gate-library items #1, #2, #5, #6, #9, #10.

Necessary (6):
- Wave Production cutover completed by 7:00 Mon 22/6 (5-7/6 window)
- 7 zone gemba walk logs exist for 5 days × 2 lượt/day = 10 walks/zone × 7 zone = 70 walks total
- Job Order dossier đầu tiên signed by QA_MGR (full G0-G7 cổng traceability)
- Shift handover record ≥90% for 15 ca (3 × 5 ngày)
- Champion Production present at zone 7:00 every day (11 zone × 5 ngày = 55 instances, ≥90%)
- 0 Sev-1 in week — OR exception note signed by CEO if Sev-1 occurred

Sufficient (5):
- Andon-cord live test executed, escalation to QA_MGR ≤5 phút
- KPI-FLD-01 ≥90% Wave Production cohort (60+ people)
- KPI-DEP-07 MTTR ≤24h for any Sev-1 that occurred
- CAPA backlog ≤ 5 mở; CAPA Wave Production có owner + ETA
- Audit_events row `wave_production_week1_<go|cond>` written

**SEC-TASKS**: 15+ tasks. Include:
- W08 hypercare cadence published (gemba walks continue)
- Problem-of-the-day board reset for W08
- Andon-cord posters refresh batch
- Shift handover template review (if ≥1 ca handover incomplete)
- Job Order dossier audit by QA — sample 10% of Mon-Fri JO
- Engineering CAD/CAM dual-system → check if can switch off old by W08 end
- Update KPI dashboard daily during hypercare
- Schedule Wave 3 (HR/FIN/IT/EHS/Epicor) champion bootcamp W08

**SEC-NEXT-WEEK**: Preview W08 — Production hypercare Tuần 2.
- Continue 7 zone gemba 2 lượt/ngày
- Target: Sev-1 = 0 streak ≥5 ngày liên tiếp (exit criterion)
- W08 Saturday gate: nếu Sev-1 = 0 streak đạt → hypercare officially closes Tue 7/7
- Wave 3 champion bootcamp Tue 30/6 14:00

**SEC-DOCS**: SOP-501, WI-519, SOP-303, WI-302, ANNEX-114, ANNEX-117, ANNEX-118, WI-201, WI-202, TRN-DEP-W06 (history), TRN-DEP-W08 (preview), TRN-DEP-W09 (Wave 3 heads-up).

**SEC-RISKS**:
- Sev-1 strike on Day 1: production halt — mitigation: rollback trigger conditions pre-set; dual-system fallback ≤2h.
- Operator pushback / silent non-compliance: shop floor culture (Hofstede high power-distance; workers don't openly disagree but quietly use old method) — mitigation: champion physical presence 1h/zone/day; senior technician pair; anonymous complaint channel.
- Andon-cord misuse: workers afraid to pull (face-saving) — mitigation: CEO public endorsement at Mon 22/6 5:30 briefing: "pull andon = good worker, not bad worker"; +1 first puller recognized publicly Saturday.
- Engineering CAD lockout: new CAM/NC system reject CAD format → emergency export script ready; ENG_MGR escalation tree.
- KPI red on Day 1: pre-define "exception note" template so red ≠ panic, red = documented + signed.

**SEC-LESSONS**: 3 empty Lean Change canvas blocks (Insights / Options / Experiments) with placeholder text "Điền sáng thứ Hai 29/6 bởi QMS_ENG + PROD_DIR".

---

## W08 — 04/07/2026 · Production hypercare Tuần 2 (file: TRN-DEP-W08.html)

### Strategic intent

The "stabilize" week — Wave Production cohort transitions from "everyone on
their toes" to "rhythm of business". Toyota Kata coaching cadence (Rother 2009)
becomes the daily mechanism. Hypercare exit criterion = Sev-1 = 0 streak ≥5
ngày. If achieved, hypercare officially closes Tue 7/7. ISO 9001:2015 §9.1.3
analysis & evaluation feeds back into runbook v1.x.

### Mandatory content per section

**SEC-COVER**: Frame as "exit hypercare gracefully" — the goal is calm, not
heroics. Quick facts: 04/07/2026 · Thứ Bảy · Phase P3 · Pillar golive ·
Attendees ~60 (PROD + ENG + hypercare team) · Owner PROD_DIR + QA_MGR (hypercare
co-leads).

### Objectives

- Sev-1 streak ≥5 consecutive working days for Wave Production cohort
- Problem-of-the-day board closure rate ≥95% within 24h
- KPI-FLD-01 ≥95% Wave Production cohort
- KPI-DEP-07 MTTR Sev-1 ≤24h (rolling 4-week median)
- Andon-cord usage: ≥1 successful pull/day where escalation closed properly

### Section-specific

**SEC-PREP**:
- T-7 (Sat 27/6 W07): hypercare exit criteria public; problem-of-the-day cadence locked.
- T-3 (Wed 1/7): mid-hypercare check; QA_MGR pulse to 11 zone champion.
- T-1 (Fri 3/7): hypercare exit decision packet drafted.
- T-0 (Sat 4/7 8:30): exit decision pre-meeting align.

**SEC-AGENDA**:
- 09:00–09:10 Hypercare Tuần 2 recap (PROD_DIR)
- 09:10–09:20 Sev-1 streak status (board screenshot + KPI sparkline)
- 09:20–09:35 Problem-of-the-day board — closure analytics
- 09:35–09:45 Andon-cord usage pattern (Toyota Kata insight)
- 09:45–09:55 Hypercare exit decision (CEO + QMS_MGR + PROD_DIR)
- 09:55–10:00 Preview W09 Wave 3 kickoff

**SEC-SLIDES** (12 slides):
1. Hypercare Tuần 2 — daily Sev-1 timeline
2. Sev-1 streak status — 5-day rolling counter
3. Problem-of-the-day board — total entries, closure rate
4. Top 5 problem categories — root cause grouped
5. Andon-cord usage — count/day, average resolution time
6. KPI-FLD-01 sparkline W03-W08
7. KPI-FLD-02 retrieval median W03-W08
8. KPI-DEP-07 MTTR rolling median
9. Champion Production performance scorecard (11 zone)
10. Shift handover record completion rate (3 ca × 10 ngày)
11. Hypercare exit checklist — 6 criteria
12. W09 Wave 3 kickoff preview

**SEC-DECISIONS**:
1. Hypercare exit Wave Production: Go (close hypercare) / Stay (extend 1 week)
2. Cadence post-hypercare: continue daily gemba? → reduce to bi-daily?
3. Wave 3 (HR/FIN/IT/EHS/Epicor) go-live date confirmation
4. CAPA backlog Wave Production triage

**SEC-GATE**: P3-03 continued (hypercare exit). Use gate-library items #1, #6, #7, #8, #10.

Necessary (5):
- Sev-1 = 0 for ≥5 consecutive working days
- Problem-of-the-day closure rate ≥95% within 24h
- Andon-cord ≥1 successful use/day with escalation closed
- Champion Production OJT pass — 11 primary signed (≥10/11 with backup activation if 1 absent)
- Shift handover record ≥90% for 15 ca

Sufficient (4):
- KPI-FLD-01 ≥95% for Wave Production cohort (60+ people)
- KPI-DEP-07 MTTR Sev-1 ≤24h rolling median
- CAPA backlog ≤ 5 open; 0 overdue >30 ngày
- PIR (post-implementation review) form signed by QA_MGR + PROD_DIR + 11 champion

**SEC-TASKS** (12+):
- Close hypercare command center Tue 7/7 (if exit Go)
- Transition to weekly tier meeting cadence
- Archive hypercare data into ANNEX-117 evidence
- Update WI-519 với 3 bài học (revision +1 if needed)
- Wave 3 champion bootcamp logistics: room, materials, 5 person × 2 slot
- Prepare W09 Wave 3 onboarding deck

**SEC-NEXT-WEEK**: Preview W09 — Wave 3 (HR/FIN/IT/EHS/Epicor) kickoff.
- Mon 6/7: champion bootcamp Module 1 (HR + FIN + IT + EHS + Epicor = 5 phòng = 10 người + 10 backup)
- Tue 7/7: hypercare officially closes (if exit gate passed)
- Wed 8/7: Wave 3 docs hand-off ceremony (smaller, mini all-hands)
- Thu 9/7: Wave 3 M365 access verification
- Fri 10/7: pre-Wave-3-go-live readiness check

**SEC-DOCS**: SOP-501, WI-519, ANNEX-117, ANNEX-110, WI-201, WI-202, TRN-DEP-W07 (history), TRN-DEP-W09 (preview).

**SEC-RISKS**:
- Champion burnout: 11 zone champion + backup pushed hard 2 tuần — mitigation: explicit thank-you + 1 day comp-off after hypercare closes.
- Premature exit: Sev-1 streak reset on day 4 → reset 5-day clock; document carefully.
- Wave 3 prep neglect: hypercare so intense, Wave 3 prep lags → mitigation: HR_MGR + FIN_MGR + IT_MGR + EHS_MGR + EPICOR_ADMIN have separate cadence Tue + Thu.
- Andon-cord overuse: not every problem warrants andon → coaching by champion; senior technician mentor.
- Continuity risk: if PROD_DIR or ENG_MGR off, 2-deep coverage required.

---

## W09 — 11/07/2026 · Wave 3 khởi động (file: TRN-DEP-W09.html)

### Strategic intent

The final wave — support functions: HR / FIN / IT / EHS / Epicor admin (5 phòng).
Smaller cohort (~15 people) but business-critical. Wave 3 kickoff parallel with
Wave Production transitioning OUT of hypercare. ISO 9001:2015 §7.1 resources +
§7.4 communication anchored. Prosci ADKAR Knowledge phase activated for Wave 3
cohort. NIST 800-53 AT-2/AT-3 training records become evidence.

### Mandatory content per section

**SEC-COVER**: Frame as "the program now covers the whole company". Quick facts:
11/07/2026 · Thứ Bảy · Phase P3 · Pillar train · Attendees: 5 Wave 3 phòng heads
+ 10 champion + 10 backup + Steering = ~30 · Owner HR_MGR (Wave 3 coordinator).

### Objectives

- 5 phòng (HR / FIN / IT / EHS / Epicor) go-live Mon 13/7 — admin function, low shop-floor risk.
- 10 champion + 10 backup nominated (2 per phòng); bootcamp passed.
- Wave Production Sev-1 = 0 streak achievement (W08 carry-over verified).
- Issue closure on time ≥95% (KPI-DEP-02 measured for first time at this scale).

### Section-specific

**SEC-PREP**:
- T-7 (Sat 4/7 W08): hypercare exit (Tue 7/7); Wave 3 prep begins.
- T-3 (Wed 8/7): docs hand-off ceremony scheduled; M365 access provisioned.
- T-1 (Fri 10/7): pre-go-live check Wave 3 — IT_MGR confirm all 15 users have access.
- T-0 (Sat 11/7 9:00): Wave 3 kickoff itself.

**SEC-AGENDA** (Sat 11/7 Wave 3 kickoff):
- 09:00–09:05 CEO opening — Wave 3 (Kotter step 6 short-term wins)
- 09:05–09:15 5 phòng heads each speak 2': vai trò trong QMS (HR_MGR, FIN_MGR, IT_MGR, EHS_MGR, EPICOR_ADMIN)
- 09:15–09:25 Champion bootcamp summary + champion roster reveal (10 + 10)
- 09:25–09:35 Wave Production hypercare closure status (PROD_DIR brief, 10')
- 09:35–09:45 Wave 3 cadence published — daily standup, weekly tier meeting
- 09:45–09:55 Issue register Wave 3 opened
- 09:55–10:00 Preview W10 stabilize

**SEC-SLIDES** (12 slides):
1. Wave 3 cohort — 5 phòng × ~3 người/phòng (table)
2. HR Manager — vai trò + JD chính (WI-103)
3. FIN Manager — vai trò + JD chính (WI-104)
4. IT Manager — vai trò + JD chính (WI-103 + WI-104)
5. EHS Manager — vai trò + JD chính (SOP-801)
6. Epicor Admin — vai trò + ANNEX-113
7. Champion roster Wave 3 — 10 primary + 10 backup
8. Wave 3 doc hand-off — 5 sổ tay + 12 JD (table)
9. M365 access verification — 15 users provisioned
10. Wave Production hypercare exit status (carry-over from W08)
11. Cadence post-go-live — daily 8:30 standup, weekly Saturday review
12. W10 stabilize preview

**SEC-DECISIONS**:
1. Approve Wave 3 cohort onboarded (15 users M365 + sổ tay + JD)
2. Approve Wave 3 champion roster (20 people)
3. Confirm Wave Production hypercare officially closed Tue 7/7
4. Approve Wave 3 cadence (daily standup + weekly tier)

**SEC-GATE**: P3-04. Use gate-library items #2, #3, #9, #10.

Necessary (4):
- 5 Wave 3 phòng heads onboarded (M365 + sổ tay + JD ký)
- 10 primary + 10 backup champion nominated; bootcamp pass ≥90%
- Wave Production Sev-1 = 0 streak verified end of W08 (carry-over)
- Issue register Wave 3 opened; cadence published

Sufficient (4):
- KPI-DEP-02 issue closure on time ≥95% for prior wave (Wave 2)
- KPI-TRN-01 ≥90% for Wave 3 cohort within 7 days of go-live (by 18/7)
- CAPA backlog ≤ 5 open across all waves
- Audit_events row `wave3_kickoff_complete`

**SEC-TASKS** (12+):
- Issue register Wave 3 entries — at least 3 dummy Sev-3 to validate workflow
- Schedule M365 access spot-check Wave 3 users by Mon 13/7
- Champion bootcamp Module 2 scheduled Wed 15/7 (Wave 3)
- Wave Production hypercare archive into ANNEX-117 (PIR + lessons)
- Wave 3 sổ tay status='released' update in dcc_document_header (5 docs)
- Wave 3 JD status='released' (12 JD)

**SEC-NEXT-WEEK**: Preview W10 — Wave 3 stabilize + dashboard governance review.
- Wave 3 cohort daily standup Mon-Fri
- Dashboard governance access review (5 phòng = 5 widget owner)
- W10 Saturday meeting: Wave 3 Sev-1 status + dashboard widget sign-off
- KPI Wave 3 baseline measured

**SEC-DOCS**: WI-103, WI-104, SOP-801, ANNEX-113, ANNEX-110, WI-201, WI-202, TRN-DEP-W08 (history), TRN-DEP-W10 (preview), TRN-DEP-W11 (lessons learned heads-up).

**SEC-RISKS**:
- Support function complacency: HR/FIN/IT/EHS thinking "we're not factory floor" → mitigation: explicit business case — payroll error trong FIN = production hold; IT access fail = production stop.
- Epicor Admin SPOF: only 1 epicor_admin role exists currently — mitigation: backup must be pre-trained on 80% of admin tasks before W09.
- HR sensitive data leak: training records contain personal data → mitigation: HR_MGR review record retention policy (NIST 800-53 AT-4) before go-live.
- EHS legal exposure: SOP-801 covers safety; non-compliance = legal — mitigation: EHS_MGR pre-meeting with legal counsel; ANNEX-113 update.
- Hypercare-Wave-3 collision: PROD_DIR + ENG_MGR exhausted from W07-W08 → mitigation: HR_MGR own W09 coordination; PROD_DIR + ENG_MGR observers only.

---

## Acceptance checklist for this pack

- [ ] All 3 files (W07, W08, W09) ≥3000 words each
- [ ] Zero `<!-- TODO -->` remain
- [ ] Orange `.pending-fill` removed
- [ ] All openDoc() chips valid
- [ ] Role codes only
- [ ] Absolute dates
- [ ] Gate sections Necessary + Sufficient
- [ ] RACI cells populated
- [ ] Vietnamese with diacritics
- [ ] At least 2 framework citations/file
- [ ] W07 covers Toyota shusa + andon-cord protocol
- [ ] W08 covers hypercare exit criteria + Toyota Kata coaching
- [ ] W09 covers Wave 3 onboarding + Wave Production carry-over
