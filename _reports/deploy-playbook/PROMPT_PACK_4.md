# PROMPT PACK 4 · Weeks W10 · W11 · W12

**Date range**: 18/07 → 01/08/2026.
**Phase coverage**: P4 — Wave 3 stabilize → Lessons learned → Handoff.
**Theme**: Close out the program. Institutionalize. Hand to BAU (business-as-usual).

---

## How to run this pack

Codex agent: read [SHARED_CONTEXT.md](SHARED_CONTEXT.md) first. Then fill:

```
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W10.html
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W11.html
mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W12.html
```

Do not modify files outside this scope. Follow SHARED_CONTEXT output rules.

---

## W10 — 18/07/2026 · Wave 3 stabilize + dashboard governance review (file: TRN-DEP-W10.html)

### Strategic intent

Wave 3 stabilizes; dashboard governance becomes the long-term mechanism (replaces
hypercare cadence). Kotter step 7 (sustain acceleration). ISO 9001:2015 §9.1
monitoring + §9.2 internal audit cycle setup. NIST 800-53 AU (audit & accountability)
+ AT-4 training record retention enforced. Gartner D&A 2023 dashboard governance
maturity check.

### Mandatory content per section

**SEC-COVER**: Frame as "the program shifts from sprint to marathon". Quick facts:
18/07/2026 · Thứ Bảy · Phase P4 · Pillar dash · Attendees ~30 (Wave 3 phòng heads
+ QMS + champion + dashboard widget owners) · Owner QMS_MGR.

### Objectives

- Wave 3 cohort Sev-1 = 0 streak ≥5 working days.
- Dashboard governance access review: 100% widget có owner role + access control verified.
- Refresh SLA ≥95% for KPI-DEP-05 (4 tuần liên tiếp).
- CAPA backlog ≤ 5 open; 0 overdue > 30 days.

### Section-specific

**SEC-PREP**:
- T-7 (Sat 11/7 W09 Wave 3 kickoff): dashboard widget owner list assembled.
- T-3 (Wed 15/7): each widget owner pre-fill access review form.
- T-1 (Fri 17/7): consolidated access review packet ready for QMS_MGR.
- T-0 (Sat 18/7 8:30): Steering Committee pre-meeting align decision.

**SEC-AGENDA**:
- 09:00–09:10 Wave 3 stabilize status (HR_MGR coordinator)
- 09:10–09:25 Dashboard widget governance review (one row per widget × 10 widgets)
- 09:25–09:35 KPI-DEP-05 refresh SLA 4-tuần snapshot
- 09:35–09:45 CAPA backlog triage + closure plan
- 09:45–09:55 Internal audit cycle năm 1 plan (ISO §9.2.2)
- 09:55–10:00 Preview W11 lessons learned

**SEC-SLIDES** (12 slides):
1. Wave 3 stabilize — Sev-1 streak 5-day counter
2. Wave 3 KPI snapshot (KPI-FLD-01, KPI-FLD-02 cho 15 user)
3. Dashboard widget inventory — 10 widget, owner, refresh cadence
4. Widget access review — user/role matrix (RBAC)
5. KPI-DEP-05 refresh SLA — 4 tuần liên tiếp
6. KPI-DEP-06 deployment frequency W07-W10 sparkline
7. KPI-DEP-07 MTTR rolling median
8. CAPA backlog — current state (table với owner + ETA)
9. CAPA closure plan — 4 tuần next
10. Internal audit cycle năm 1 — 4 quý lịch (ISO §9.2.2(a-f))
11. Audit log retention policy (NIST AU-11) — 5 năm
12. Preview W11 lessons learned agenda

**SEC-DECISIONS**:
1. Approve dashboard widget governance v1.0 (10 widget × access control)
2. Approve internal audit cycle năm 1 schedule (Q1 trong tháng 9, Q2 trong tháng 12, …)
3. Approve CAPA closure plan với 4-tuần horizon
4. Approve Wave 3 hypercare exit (cadence transition to weekly tier)

**SEC-GATE**: P4-01, P4-02. Use gate-library items #1, #5, #6, #7, #9.

Necessary (4):
- Wave 3 Sev-1 = 0 streak ≥5 working days
- 10 dashboard widget có owner + access control verified
- CAPA backlog ≤ 5 open
- KPI-DEP-05 refresh SLA ≥95% 4 tuần liên tiếp

Sufficient (4):
- Internal audit cycle năm 1 schedule signed by QMS_MGR + CEO
- KPI-FLD-01 ≥95% across all 80 users (all 3 waves combined)
- 0 CAPA quá 30 ngày
- Audit_events row `wave3_stabilize_complete`

**SEC-TASKS** (12+):
- Update dashboard widget config với access control (mỗi widget có role_required)
- Schedule Q1 internal audit (target tháng 9/2026)
- Update CAPA tracker với 4-tuần closure plan
- Wave 3 hypercare archive → ANNEX-117
- Refresh SLA monitoring continues weekly (KPI-DEP-05)
- Draft W11 lessons learned agenda + invite list

**SEC-NEXT-WEEK**: Preview W11 — Lessons learned + tài liệu hậu triển khai.
- Mon 20/7: lessons-learned facilitator workshop prep
- Tue 21/7: 11 phòng head submit "3 điều cần thay đổi" written form (Hofstede anonymous)
- Wed 22/7: QMS_ENG consolidate feedback
- Thu 23/7: draft lessons-learned report v0.9
- Fri 24/7: review packet ready
- Sat 25/7: W11 meeting

**SEC-DOCS**: ANNEX-110, ANNEX-113, ANNEX-117, ANNEX-119, WI-202, WI-901, TRN-DEP-W09 (history), TRN-DEP-W11 (preview).

**SEC-RISKS**:
- Wave 3 Sev-1 spike: small cohort but each issue has high blast radius (HR = payroll, FIN = invoicing, IT = access) → mitigation: dedicated hypercare 24/5 cho Wave 3 thêm tuần.
- Dashboard widget orphan: nếu owner = role bị reorg → mitigation: 2 widget per owner cap.
- CAPA backlog overflow: nếu Wave Production để lại 10+ CAPA → mitigation: triage Sev-1/Sev-2 close trước; Sev-3 defer to W11.
- Audit schedule conflict: Q1 audit overlap với month-end close → mitigation: Q1 audit week 2 of month, not week 4.
- Hofstede risk: phòng heads không willing to flag issues openly during W10 review → mitigation: anonymous pre-meeting form Tue 14/7.

---

## W11 — 25/07/2026 · Lessons learned + tài liệu hậu triển khai (file: TRN-DEP-W11.html)

### Strategic intent

Kotter step 8 (anchor in culture). Prosci Reinforcement phase. Lean Change
final retrospective canvas. ISO 9001:2015 §10.1 improvement (general) +
§10.3 continual improvement. Toyota lessons: blameless post-mortem; senior
listens, doesn't speak first; group consensus on top 5 changes.

### Mandatory content per section

**SEC-COVER**: Frame as "extract value from the experience". Quick facts:
25/07/2026 · Thứ Bảy · Phase P4 · Pillar doc · Attendees ~80 (all hands +
Steering) · Owner CEO opening + QMS_MGR facilitation.

### Objectives

- Lessons learned report v1.0 signed by Steering Committee.
- ≥10 controlled docs updated với revision +1 theo bài học.
- QR code refresh batch posted at 7 zone (factory floor).
- Training playlist v2 released — ≥3 mới video (record W08 hypercare moments).
- Top 5 systemic improvements identified + owner assigned (KPI-DEP-03 tracker).

### Section-specific

**SEC-PREP**:
- T-7 (Sat 18/7 W10): "3 điều cần thay đổi" form distributed to 11 phòng heads + 22 champion (anonymous via Microsoft Forms).
- T-3 (Wed 22/7): QMS_ENG aggregate feedback; identify top 5 themes by frequency.
- T-1 (Fri 24/7): draft lessons-learned report circulated; CEO reads.
- T-0 (Sat 25/7 8:30): Steering pre-meet to align on top 5.

**SEC-AGENDA**:
- 09:00–09:10 CEO opening — "what worked / what didn't" framing (blameless)
- 09:10–09:25 Top 5 systemic improvements walkthrough (QMS_MGR)
- 09:25–09:40 Each phòng head 90s: top 1 improvement we want (round-robin, Hofstede senior LAST)
- 09:40–09:50 Doc update plan — ≥10 doc revision +1
- 09:50–09:55 Training playlist v2 preview + release plan
- 09:55–10:00 Preview W12 final handoff

**SEC-SLIDES** (12 slides):
1. Lessons learned methodology — anonymous + structured (Lean Change canvas)
2. Top 5 themes from 33 submissions (table với frequency count)
3. Theme 1: [content per Codex] — root cause + action
4. Theme 2: [content per Codex]
5. Theme 3: [content per Codex]
6. Theme 4: [content per Codex]
7. Theme 5: [content per Codex]
8. Doc revision +1 plan — 10+ doc với owner + ETA (table)
9. QR code refresh batch — 7 zone × 3 zone sticker rev
10. Training playlist v2 — 3 video kế hoạch (script + record)
11. KPI sparkline final — full 11-week journey (KPI-FLD-01, KPI-FLD-02, KPI-DEP-03)
12. Preview W12 — bàn giao chính thức

**SEC-DECISIONS**:
1. Approve lessons-learned report v1.0 (signed by Steering)
2. Approve doc revision +1 plan (10+ doc)
3. Approve QR code refresh batch + posting schedule
4. Approve training playlist v2 release schedule

**SEC-GATE**: P4-03. Use gate-library items #4, #5, #7.

Necessary (4):
- Lessons learned report v1.0 signed by CEO + QMS_MGR + QA_MGR
- ≥10 doc identified for revision +1 với owner + ETA ≤30 ngày
- QR code refresh batch printed (≥21 sticker = 7 zone × 3)
- Training playlist v2 script approved (≥3 video)

Sufficient (4):
- 0 phòng head opposed lessons-learned report (consensus by silence + 1 written confirmation)
- 0 CAPA overdue > 30 days (clear blocker)
- Internal audit cycle năm 1 confirmed (booked in calendar)
- Audit_events row `lessons_learned_v1_signed`

**SEC-TASKS** (15+):
- Lessons-learned report v1.0 → archive ANNEX-119
- Doc revision +1 — assign 10 docs to owner with ETA
- QR code printing — IT_MGR coordinate, target Tue 28/7 posted
- Training playlist v2 video recording — schedule W11 weekend
- Update dashboard with KPI final sparkline (12 weeks)
- Send lessons-learned summary memo to all 80 employees by Mon 27/7
- Schedule W12 handoff ceremony

**SEC-NEXT-WEEK**: Preview W12 — Bàn giao chính thức.
- Mon 27/7: handoff memo draft
- Tue 28/7: QR code posted at 7 zone
- Wed 29/7: training playlist v2 recording day 1
- Thu 30/7: training playlist v2 recording day 2
- Fri 31/7: handoff package finalized
- Sat 1/8: W12 handoff ceremony

**SEC-DOCS**: WI-105, WI-202, ANNEX-114, ANNEX-117, ANNEX-119, all 27 controlled docs (chip list — comprehensive), TRN-DEP-W10 (history), TRN-DEP-W12 (preview).

**SEC-RISKS**:
- Hofstede risk: phòng heads stay silent during open feedback → mitigation: anonymous pre-meeting form + 1:1 with supervisor.
- Face-saving risk: phòng head doesn't want to admit their phòng struggled → mitigation: blameless framing; CEO sets tone "we measure SYSTEM not PEOPLE".
- Doc revision overload: 10+ doc revision +1 in 30 days is heavy → mitigation: priority by ISO clause impact; defer cosmetic to year 2.
- QR code logistics: 7 zone × 3 = 21 sticker + adhesive + posting time → mitigation: IT_MGR + 2 production champion assigned Tue 28/7.
- Training playlist budget: video recording requires equipment + editor → mitigation: phone + free editor (DaVinci Resolve); senior champion as on-camera talent.

---

## W12 — 01/08/2026 · Bàn giao chính thức (file: TRN-DEP-W12.html)

### Strategic intent

The program formally hands over to BAU. Kotter step 8 fully realized. ISO 9001:2015
§9.3 management review inputs assembled. ITIL 4 transition to operational
management. NIST 800-53 baseline frozen for the year. Toyota: the program becomes
"the way we do things now" — institutionalization.

### Mandatory content per section

**SEC-COVER**: Frame as "the deploy program closes; the QMS is alive". Quick facts:
01/08/2026 · Thứ Bảy · Phase P4 · Pillar gov · Attendees: Steering + all 80
employees (final all-hands) · Owner CEO + QMS_MGR.

### Objectives

- Handoff memo signed by Steering Committee (CEO + QMS_MGR + QA_MGR + PROD_DIR + ENG_MGR).
- BAU owner accepts KPI ownership (KPI-FLD-01..KPI-DEP-07 ownership transfer documented).
- Cadence vận hành post-program published: weekly tier meeting (Thứ Bảy 9:00) + monthly mgmt review (last Thursday of month).
- Internal audit cycle năm 1 calendar booked: Q1 9/2026, Q2 12/2026, Q3 3/2027, Q4 6/2027.
- Champion roster transitions to "ongoing role" (not "deploy program role").

### Section-specific

**SEC-PREP**:
- T-7 (Sat 25/7 W11): handoff memo draft assembled.
- T-3 (Wed 29/7): KPI ownership transfer matrix drafted.
- T-1 (Fri 31/7): handoff package finalized — memo + KPI transfer + audit cycle calendar.
- T-0 (Sat 1/8 8:30): Steering pre-meet to align signature order.

**SEC-AGENDA** (FULL 60-PHÚT — final meeting of program):
- 09:00–09:05 CEO closing speech — Kotter step 8 anchor
- 09:05–09:15 12-week journey recap (QMS_MGR — KPI sparkline)
- 09:15–09:25 Handoff memo walkthrough + signature ceremony (5 Steering members ký live)
- 09:25–09:35 KPI ownership transfer — 10 KPI × BAU owner role
- 09:35–09:45 Internal audit cycle năm 1 — 4 quý confirmation
- 09:45–09:55 Champion recognition — each of 22 champion 30 giây thank-you
- 09:55–10:00 Closing — official program close + open BAU mode

**SEC-SLIDES** (12 slides):
1. 12-week journey timeline — visual recap
2. KPI sparkline 12 weeks — KPI-FLD-01, KPI-FLD-02, KPI-TRN-01 (3 charts)
3. KPI sparkline 12 weeks — KPI-DEP-01..05 (5 charts)
4. KPI sparkline 12 weeks — KPI-DEP-06 (deployment freq), KPI-DEP-07 (MTTR)
5. Wave breakdown — Wave 1 (QA pilot) + Wave 2 (SCM + Sales) + Wave Production + Wave 3
6. Issue closure stats — total issues opened, closed, by severity
7. CAPA stats — total opened, closed, rolling backlog
8. Doc revision activity — 27 docs effective + 10+ revision +1
9. Champion roster — 22 names with role + zone (anonymized to role codes)
10. KPI ownership transfer matrix — 10 KPI × BAU owner
11. Internal audit cycle năm 1 — 4 quý lịch
12. Cadence vận hành post-program — weekly tier + monthly mgmt review + quarterly audit

**SEC-DECISIONS**:
1. Approve handoff memo v1.0 (signed by 5 Steering members)
2. Approve KPI ownership transfer matrix (10 KPI to BAU)
3. Approve internal audit cycle năm 1 calendar
4. Approve cadence vận hành post-program (weekly + monthly + quarterly)
5. Approve champion roster transition to "ongoing role"

**SEC-GATE**: P4-04. Use gate-library items #4, #5, #10.

Necessary (4):
- Handoff memo signed by 5 Steering members (CEO + QMS_MGR + QA_MGR + PROD_DIR + ENG_MGR)
- KPI ownership transfer matrix — 10 KPI có BAU owner role
- Internal audit cycle năm 1 — 4 quý booked in calendar (cal events exist)
- Cadence vận hành published (memo to all 80 employees)

Sufficient (3):
- 0 unresolved gate disagreement (Steering consensus)
- 0 CAPA overdue (full clearance for program close)
- Audit_events row `deploy_program_handoff_complete`

**SEC-TASKS** (10+):
- Archive 12 playbook docs into ANNEX-119 reference set
- Update dashboard with "BAU mode" toggle
- Send handoff announcement to all 80 employees Mon 3/8
- Champion roster — update champions.json with "ongoing" status (not "deploy")
- Schedule first BAU weekly tier meeting Sat 8/8 (post-program)
- Schedule first monthly mgmt review Thu 27/8
- Archive program audit_events log
- Update `currentPhase` in program.json → "BAU"

**SEC-NEXT-WEEK**: Preview "Week 13" — first BAU week. Same cadence (Saturday 9:00)
but no longer a deploy program meeting; now it's the standing weekly tier meeting.
Agenda template = WI-202 (daily management tier meetings) — KPI review, issue
escalation, decision log.

**SEC-DOCS**: WI-202, WI-901, ANNEX-119, MAN-001, POL-QMS-001, POL-QMS-002, all 12 TRN-DEP-Wnn playbooks (chip list).

**SEC-RISKS**:
- BAU rebound: cadence falls off within 4 weeks → mitigation: CEO commits to attending first 4 weekly tier meetings.
- KPI ownership ambiguity: BAU owner not clear who owns KPI-DEP-06 (deployment frequency) → mitigation: matrix in slide 10 names role code explicitly.
- Audit cycle slippage: Q1 audit gets pushed because of month-end close → mitigation: schedule in week 2 of month (not week 4).
- Champion attrition: 22 champion is a lot to sustain; some leave/transfer → mitigation: champion role becomes part of JD (annual KPI for champion role).
- Hofstede risk: BAU mode loses CEO active presence → mitigation: monthly mgmt review keeps CEO engaged.

**SEC-LESSONS**: Final block — fully filled with retrospective from 12 weeks. Include:
- Insights: 5 systemic patterns observed (from W11 themes)
- Options: what we chose NOT to do (and why)
- Experiments: what we'll try in BAU (year-2 hypothesis)

---

## Acceptance checklist for this pack

- [ ] All 3 files (W10, W11, W12) ≥3000 words each
- [ ] Zero `<!-- TODO -->` remain
- [ ] Orange `.pending-fill` removed
- [ ] All openDoc() chips valid; W12 includes chip for all 12 TRN-DEP-Wnn playbooks
- [ ] Role codes only
- [ ] Absolute dates
- [ ] Gate sections Necessary + Sufficient
- [ ] RACI cells populated
- [ ] Vietnamese with diacritics
- [ ] At least 2 framework citations/file
- [ ] W10 covers dashboard governance + internal audit cycle setup
- [ ] W11 covers Hofstede-aware lessons-learned process
- [ ] W12 covers KPI ownership transfer + BAU cadence + handoff signatures
