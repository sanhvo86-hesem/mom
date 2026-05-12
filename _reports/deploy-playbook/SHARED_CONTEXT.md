# SHARED CONTEXT — included by every Codex prompt pack

The Codex author for any pack receives this file verbatim plus the 3 week
specifications from PROMPT_PACK_<N>.md.

## Repository facts

- Repo root: `/Users/a10/Documents/mom`
- Files to fill: `mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W##.html`
- DCC standard: `mom/contracts/objects/quality_improvement--document-control/dcc-document-header.standard.md`
- Sample peer for header pattern: `mom/docs/training/system-ops/02-Training-Ops/TRN-OPS-09.html`
- CSS classes available: `.card`, `.grid-2`, `.grid-3`, `.h2`, `.h3`, `.lead`, `.note`, `.note-blue`, `.note-green`, `.callout-warn`, `.badge`, `.role-chip`, `.table`, `.table-card`, `.mono`, `.tight`, `.pillar-grid`, `.pillar-card`, `.flow-step`, `.flowchart`, `.vflow`, `.vstep`, `.vnum`, `.metric-card`, `.gate-card`, `.gate-grid`

## 12-week schedule (final, do not change)

| W | Date | Day | Phase | Label | Attendees | Pillar |
|---|---|---|---|---|---|---|
| 0 | 14/05 | Thu | P0 | Pre-flight Steering nhỏ (no playbook file) | ceo + qa_manager + qms_engineer | gov |
| 1 | 16/05 | Sat | P0 | Công bố chính thức · MAN-001 + POL-QMS-001/002 hiệu lực | all_departments | gov+doc |
| 2 | 23/05 | Sat | P1 | Chốt sổ tay phòng ban + JD + RACI master | all_departments | doc+train |
| 3 | 30/05 | Sat | P2 | Pilot QA — Tuần 1 (dual-run SOP-605 + WI-201) | qa_team + champions | pilot |
| 4 | 06/06 | Sat | P2 | Pilot QA gate Go/No-Go cho Wave 2 | steering + champions | pilot |
| 5 | 13/06 | Sat | P3 | Wave 2 go-live — SCM + Sales | scm + sales + champions | golive |
| 6 | 20/06 | Sat | P3 | Wave 2 mid-review + Wave Production prep | steering + wave2 + wave-prod | golive |
| 7 | 27/06 | Sat | P3 | Wave Production go-live — Tuần 1 (PROD + ENG đồng thời) | production + engineering + hypercare | golive |
| 8 | 04/07 | Sat | P3 | Production hypercare — Tuần 2 | production + engineering + hypercare | golive |
| 9 | 11/07 | Sat | P3 | Wave 3 khởi động — HR / FIN / IT / EHS / Epicor | wave3-depts + champions | train |
| 10 | 18/07 | Sat | P4 | Wave 3 stabilize + dashboard governance review | wave3-depts + qms | dash |
| 11 | 25/07 | Sat | P4 | Lessons learned + tài liệu hậu triển khai | all_departments + steering | doc |
| 12 | 01/08 | Sat | P4 | Bàn giao chính thức · vận hành thường xuyên | steering + all_departments | gov |

## 7 trụ triển khai (pillars)

| Key | Title | Owner | Pass criterion |
|---|---|---|---|
| `gov` | Governance & gate | CEO / Steering | Quyết định Go/No-Go đã khóa |
| `doc` | Tài liệu & playlist | QMS Manager | Người dùng biết mở tài liệu nào trước |
| `m365` | M365 & truy cập | IT Manager | Truy xuất đúng người, đúng quyền |
| `train` | Đào tạo & Champion | HR / Dept Manager | Người dùng tự thao tác được |
| `pilot` | Pilot & xác nhận | Production / QA | Pilot không còn KPI đỏ |
| `golive` | Go-live & hypercare | Cutover Lead | Wave go-live ổn định |
| `dash` | Dashboard & bằng chứng | QMS / Data Owner | Sổ dashboard đăng tin |

## 22 gate codes

`P0-01..P0-05`, `P1-01..P1-04`, `P2-01..P2-04`, `P3-01..P3-04`, `P4-01..P4-04`.

Per-week gate assignment is in `mom/data/config/deploy/program.bootstrap.json`
`weeks[*].gateCodes`. Authors MUST use these IDs verbatim in the gate section.

## 10 KPI IDs (with targets)

| ID | Label | Target | Source benchmark |
|---|---|---|---|
| KPI-FLD-01 | Định tuyến đúng thư mục | ≥95% | ISO 9001:2015 §7.5.3 · AIIM 2023 |
| KPI-FLD-02 | Thời gian tra cứu | ≤180s | ISO 9001:2015 §7.5.3 · McKinsey "Social Economy" |
| KPI-TRN-01 | Hoàn thành đào tạo | ≥90% | ISO 9001:2015 §7.2 · Prosci ADKAR ROI 2023 |
| KPI-DEP-01 | Phủ champion (primary+backup) | 100% | Prosci CMROI 2023 · WI-105 §4.2 |
| KPI-DEP-02 | Đóng issue đúng hạn | ≥95% | ITIL 4 Incident · Gartner ITSM 2023 |
| KPI-DEP-03 | Tỉ lệ thay đổi thất bại | ≤10% | DORA SoD 2024 |
| KPI-DEP-04 | Lead time thay đổi (ngày) | ≤10d | DORA SoD 2024 |
| KPI-DEP-05 | Refresh dashboard đúng hạn | ≥95% | Gartner D&A 2023 |
| KPI-DEP-06 | Tần suất phát hành (change/tuần) | ≥3 | DORA SoD 2024 |
| KPI-DEP-07 | MTTR Sev-1 (giờ) | ≤24h | DORA SoD 2024 · ITIL 4 |

## Doc code registry (resolved by `openDoc()`)

Required across all 12 weeks (use `<a onclick="openDoc('CODE')">`):

```
MAN-001 · POL-QMS-001 · POL-QMS-002
WI-103 · WI-104 · WI-105 · WI-106 · WI-201 · WI-202 · WI-302 · WI-519 · WI-701 · WI-901
SOP-201 · SOP-303 · SOP-401 · SOP-501 · SOP-605 · SOP-801
ANNEX-110 · ANNEX-113 · ANNEX-114 · ANNEX-117 · ANNEX-118 · ANNEX-119
RACI-master-matrix · Authority-matrix · DRL-E2E
```

Cross-reference: own playbook codes `TRN-DEP-W01..W12` (open via openDoc too).

## 10 reusable Go/No-Go gate conditions (boilerplate)

Authors MUST pick from this set when filling Section 7 of each playbook,
adapting the threshold to the week. The 10 conditions:

1. **Sev-1 issue count = 0** trong 5 ngày làm việc gần nhất (Sev-1 = production stop, customer impact, regulatory exposure per WI-106 §3). Evidence: `issues.json` filtered by `sev=1 AND status!='closed'`.
2. **Training completion ≥ 90%** of in-scope headcount, signed SOP-801 record. Evidence: `training_records` table; sample audit 10% match 100%.
3. **RACI sign-off ≥ 95%** by 11 trưởng phòng (≥11/11 cho R/A row). Evidence: ANNEX-114 với wet/e-signature timestamp.
4. **DCC header conformance = 100%** cho doc trong scope (doc_code, revision, effective_date, owner đầy đủ). Evidence: `php mom/tools/dcc-batch/audit.php`.
5. **Internal audit findings**: 0 Major, ≤ 3 Minor open. Major closed kèm effectiveness check (WI-105). Evidence: audit register trong ANNEX-119.
6. **KPI dashboard live & green 5 ngày liên tiếp**: lead time ≤72h, change-failure ≤15%, MTTR ≤24h. Evidence: `readiness.json` kpiValues snapshots.
7. **CAPA backlog ≤ 5 open**, không CAPA quá 30 ngày. W11/W12 cần **zero overdue**. Evidence: CAPA table.
8. **PIR signed** (Post-Implementation Review): QA Manager + zone supervisor ký; abandon-criterion explicitly checked "not triggered". Evidence: PIR form.
9. **Champion readiness**: ≥1 trained champion/zone với observed-task sign-off; backup nominated (no single-point-of-failure). Evidence: `champions.json`.
10. **Management approval logged**: CEO + QMS Manager wet/e-sig on gate decision form; minutes circulated trong 48h; dissent recorded với rationale (ISO 9001 §9.3.3). Evidence: `mgmt-reviews.json`.

## Framework citations (use specific source, not "best practice")

- ISO 9001:2015 — Annex SL clauses §4–§10; cite clause number explicitly when used
- Prosci ADKAR — *Best Practices in Change Management* 12th ed. (2023); Hiatt 2006
- Kotter — *Leading Change* 2nd ed. (2012); 8-step model
- DORA — *State of DevOps Report 2024* (dora.dev); Forsgren et al. *Accelerate* (2018)
- ITIL — *ITIL 4 Managing Professional: Create, Deliver and Support* (AXELOS 2019), Change Enablement §5.1.7
- Lean Change — Jason Little, *Lean Change Management* (2014); leanchange.org
- Toyota — Liker *The Toyota Way* 2nd ed. (2021), Ch. 13 (chief engineer / shusa); Ohno *Toyota Production System* (1988)
- NIST — *SP 800-53 Rev. 5* (Sept 2020) CM, AT, AU families
- CMMI — *CMMI for Development v2.0* (CMMI Institute 2018)
- Hofstede — Hofstede Insights *Country Comparison — Vietnam* (PDI 70, IDV 20, UAI 30, LTO 57); *Cultures and Organizations* 3rd ed. (2010)
- Lean Manufacturing — Rother & Harris *Creating Continuous Flow* (LEI 2001); Womack & Jones *Lean Thinking* 2nd ed. (2003); Rother *Toyota Kata* (2009)

## Vietnam-specific cultural notes (apply throughout)

- **W1 kickoff (high power-distance)**: CEO speaks first and explicitly endorses;
  silence from top reads as disapproval; seat by rank; bilingual VN/EN slides
  with VN primary.
- **W2–W3 feedback collection (collectivism)**: avoid open-floor Q&A on
  sensitive topics; use anonymous written cards or 1:1 with direct supervisor;
  champion network (in-group) is more reliable than individual whistleblowers.
- **W6, W7, W11 post-incident reviews (face-saving)**: frame as team-learning
  ("what did our process miss?") never individual blame; senior speaks LAST to
  avoid anchoring; circulate draft minutes for written confirmation before
  publishing.

## Output format (every section)

Each `<section class="card" id="sec-...">` must end up with:

1. The `<h2>` heading already present.
2. Real content replacing every `<!-- TODO Codex … -->` marker.
3. ZERO `<!-- TODO -->` left in the file.
4. No Lorem Ipsum or placeholder text.
5. Concrete numbers and doc/role codes throughout — no hand-waving.
6. The orange `.pending-fill` warning block at the top of `<div class="doc-content">`
   MUST be removed once all sections are filled.

## Forbidden patterns

| Phrase / pattern | Why forbidden | Fix |
|---|---|---|
| "đảm bảo chất lượng" without metric | Vague | "Sev-1 issue count = 0" hoặc tương đương |
| "tuân thủ đầy đủ" without checklist | Vague | "RACI ký ≥95% bởi 11 trưởng phòng" |
| "tuần sau" / "sớm nhất" | Not actionable | Absolute date (e.g. 2026-06-13) |
| Tên người cụ thể | RACI is role-based | Role code (PROD_DIR, QA_MGR, …) |
| English-only content | Frontend is VN | Vietnamese with diacritics |
| "Trưởng phòng" without diacritics | Per CLAUDE.md memory | "Trưởng Phòng" |
| Generic Prosci/DORA mention | Must cite | Explicit framework + year + which clause |

## Length floor

| Section | Min word count |
|---|---|
| Cover | 100 |
| Objective + KPI baseline | 200 |
| Prep checklist | 300 (4 windows × 4+ items) |
| Agenda | 200 |
| Slides (12 blocks) | 800 |
| Decisions | 250 |
| Gate (Necessary + Sufficient) | 400 |
| Tasks (RACI table) | 400 |
| Next-week preview | 250 |
| Docs links | 80 |
| Risks + escalation | 350 |
| Lessons-learned scaffold | 100 |
| **Total per file** | **≥ 3,000** |

Below the floor = rejected.
