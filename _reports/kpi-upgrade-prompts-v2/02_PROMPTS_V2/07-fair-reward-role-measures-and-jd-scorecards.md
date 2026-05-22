# 07 — Công bằng, khen thưởng, role measures và JD scorecards

**Loại:** sửa registry + ANNEX-127/-129 + JD/WI-202 + dashboard scorecard nếu cần.  
**Mục tiêu:** KPI thúc đẩy cải tiến, không đổ lỗi; role measures giúp đào tạo và review đúng vai trò nhưng không biến thành “bảng phạt”.

## 1. Đọc trước

- `01_RESEARCH/04-anti-gaming-risk-register.md`
- registry `performance_governance_policy`, `jd_kpi_scorecards`, role/position metrics
- ANNEX-127/-129
- 8–12 JD
- WI-202
- Gap report prompt 01/02.

## 2. Chuẩn hóa rule khen thưởng

Trong ANNEX-127/-129 và registry, viết rõ:

1. KPI đỏ không tự động phạt cá nhân.
2. Đỏ kích hoạt root cause, containment, CAPA/kaizen, đào tạo, resource review.
3. Ghi nhận/thưởng chỉ xét theo bundle cân bằng.
4. Bị block nếu safety/customer/data-integrity/gate bypass mở.
5. Chỉ reward KPI có:
   - owner kiểm soát được hoặc attribution tách nguyên nhân;
   - counter-metric;
   - evidence;
   - không staged;
   - min_sample nếu tỷ lệ;
   - review/calibration.
6. Discipline chỉ áp dụng cho hành vi kiểm soát được: giả dữ liệu, bypass gate, unsafe act, không tuân thủ lặp lại sau coaching.

## 3. Attribution rule

Mỗi KPI rewardable/scorecard phải có:
- `attribution_rule`;
- breakdown nguyên nhân;
- owner action vs contributor action;
- rule loại trừ/conditional cho customer change, approved rush order, supplier delay, machine failure, engineering defect, QA hold hợp lệ.

## 4. Role measures trong JD

Với mỗi JD:
- giữ 3–5 measure trọng yếu;
- mapping tới canonical KPI nếu có;
- nếu chỉ là role measure, ghi rõ “Role Performance Measures”;
- có evidence/cadence/owner review;
- không dùng từ “KPI công ty” nếu không official KPI;
- không có measure mâu thuẫn safety/quality/delivery.

Ví dụ:
- CNC Operator: first-piece compliance, scrap/rework attributable, 5S/FOD, time entry, safety.
- Setup tech: setup first-pass, setup doc quality, setup time variance, first-piece defects.
- CAM: program FPY, release on time, post-release revision count.
- QC: inspection RFT, FAI cycle time, escaped inspection defect.
- Planner: plan adherence, WIP aging, recovery effectiveness.
- SCM: supplier OTD/quality, material availability, cert completeness.

## 5. JD scorecard schema

Nếu `jd_kpi_scorecards` tồn tại:
- mỗi item có weight;
- tổng weight hợp lý;
- no staged official score unless manual-governed;
- counter_code hiển thị;
- rationale rõ;
- không quá nhiều items;
- threshold link từ registry.

## 6. WI-202 tier meeting

Update WI-202:
- T1/T2/T3 review KPI nào;
- KPI đỏ thì action owner + due date;
- không blame trong tier meeting;
- escalation criteria;
- counter-metric review cùng KPI chính;
- rule for insufficient data/manual pending.

## 7. Dashboard/Console

- Scorecard UI show counter-metric and blocker status.
- Staged/manual badge rõ.
- Role scorecard không trộn với executive scorecard.
- Có note “không dùng một KPI đơn lẻ để phạt/thưởng”.

## 8. Tự phản biện

- Có KPI nào owner không kiểm soát nhưng reward_eligible true?
- Có KPI nào có thể làm bộ phận khác bị đỏ oan?
- Role measures có quá nhiều hoặc đo việc không quan trọng?
- Có counter nào chỉ là câu khẩu hiệu không đo được?

## 9. Definition of Done

- Governance policy rõ và nhất quán.
- JD scorecards gọn, đúng role.
- WI-202 có action/tier rõ.
- Audit/guard PASS.
- Report `_reports/kpi/kpi-fair-reward-role-measures-<date>.md`.
