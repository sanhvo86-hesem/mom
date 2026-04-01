# 12. Instructions for building Section 6 (Internal control gate) & Section 7 (Detailed process)

> **Version:** v2 · **Date:** 2026-03-27 · **ISO:** 9001:2026 / AS9100D-ready

---

## 1. Core principles

Section 6 and Section 7 serve **two different questions**:

| Section | Questions to answer | Nature |
|---|---|---|
| **6. Internal Control Gateway (IG)** | Where is **HOLD / RELEASE**? Who has the right to open the gate? What conditions are required? | **Control architecture** |
| **7. Detailed process** | **In what order** does the actual work take place? Who does what, where, with what, how to hand over? | **Operating sequence** |

### 1.1 Immutable rules

1. **The number of IGs and the number of detailed steps are independent.**
2. **There is no rule that an SOP must have 5 gates or 5 steps.**
3. The only pairs that must match are:
   - **Number of flowchart steps in Section 7**
   - **Number of detailed step headings in Section 7**
4. An **IG can cover many detailed steps**.
5. A good SOP might have:
   - 4 IG and 9 steps
   - 6 IG and 12 steps
   - 7 IGs and 10 steps
   - 8 IGs and 14 steps
6. Do not finalize the IG number or step number before reading old documents and comparing official external sources.
7. Rewrites of Section 6 and Section 7 MUST comply with `13-sop-research-redraft-method.md`.

### 1.2 When are the 5 steps wrong?

Compressing an SOP to five steps usually creates one of the following errors:

- Combine multiple handovers from different roles into the same step.
- Combine `setup`, `prove-out`, `first-piece`, `FAI`, `release` into one ambiguous block.
- Loss of important status change points such as `HOLD`, `revalidation`, `move to next op`, `final release`.
- Create documents that are beautiful in form but weak in practical operation.

### 1.3 When to use 5 ports

Milestone 5 is **suitable for dashboards, executive summaries, high-level executive portals**, not to limit every operational SOP.

If you need a concise operating diagram in the portal, you can use 5 high-level portals. But in the implementation SOP, the number of IGs and the number of steps must be determined by **real operational risks**.

---

## 2. Section 6 — Internal control gateway (IG)

### 2.1 Definition

**IG** is the point where the process **is not allowed to proceed** without:

- correct input conditions,
- minimum proof correct,
- the right authority,
- clear `PASS / CONDITIONAL PASS / HOLD / FAIL` decision.

**No confusion:**

| Symbol | Meaning | Scope |
|---|---|---|
| **G0→G7** | System gates | Complete order lifecycle |
| **IG1, IG2...** | Internal control gate | Inside a specific SOP |

### 2.2 When to create an IG

Only create IG when there is an **actual opening point**. An IG is valid if all 4 elements are present:

1. There is a decision `HOLD / RELEASE`.
2. Have a clear owner.
3. Have measurable conditions.
4. There is minimal evidence or records to prove it.

### 2.3 When should NOT create IG

Don't turn every microoperation into a gate. Don't create IG if it's just:

- child operations in the same role,
- the action does not make a decision to open the gate,
- simple recording step,
- sub-check does not change job status.

### 2.4 Number of IGs

| SOP Type | Recommended actual IG range |
|---|---|
| Executive/corporate SOP | 4–6 |
| SOP engineering / release / quality gating | 5–7 |
| SOP CNC job-order / execution / shop-floor control | 5–8 |
| Final inspection/delivery/closeout SOP | 4–6 |

**Principle:** The number of IGs is not limited, but must be small enough to maintain control and large enough to not let control decisions slip away.

### 2.5 Required format

Section 6 **MUST** use **TABLE**, do not use `gate-card`, do not use `gate-grid`.

```html
<h2 class="h2" id="p6">6. Cổng kiểm soát, điểm dừng bắt buộc & KPI</h2>

<div class="table-card"><table class="table">
<colgroup>
  <col class="col-ig"/>
  <col class="col-desc"/>
  <col class="col-owner"/>
  <col class="col-hold"/>
  <col class="col-kpi"/>
</colgroup>
<thead><tr>
  <th>IG</th>
  <th>Cổng kiểm soát & mục tiêu</th>
  <th>Chủ trì</th>
  <th>Điểm dừng bắt buộc</th>
  <th>KPI / hồ sơ tối thiểu</th>
</tr></thead>
<tbody>
<tr>
  <td class="ig-center"><span class="step-tag">IG1</span></td>
  <td><b>Tên cổng</b><br/>Mục tiêu kiểm soát, phạm vi mở cổng, đầu ra mong đợi.</td>
  <td>Vai trò chủ trì</td>
  <td>Không được đi tiếp nếu chưa có điều kiện mở cổng đo được.</td>
  <td>100%, ≤ 24h, = 0 lỗi; FRM/WI/SOP tham chiếu khi cần.</td>
</tr>
</tbody>
</table></div>
```

### 2.5A Rules for safe section replacement

- When updating Section 6, only change the content between `p6` and `p7`.
- Do not delete heading `p6` by mistake.
- Do not delete heading `p7` by mistake.
- If the old SOP has useful gate logic, you must retain the correct operating thinking before standardizing the table structure.

### 2.6 Rules for writing IG content

| Ingredients | Request |
|---|---|
| IG badges | `IG1`, `IG2`, `IG3`... continuously, starting from 1 |
| Port name | Must be an operating language, not ambiguous |
| Chair | The role has permission to hold/open ports |
| Stop | Specific, measurable, auditable |
| KPI | Has a numerical target or open/closed status |
| Profile | Only the minimum documents required to open the portal are listed

### 2.6A Real battle KPI

Each IG's KPIs should fall into one or more of the following groups:

- `Đúng ngay lần đầu` like `% receipt accepted without re-open`, `% setup release first-pass`.
- `Tốc độ phản ứng` like `≤ 30 phút`, `≤ 1 ca`, `≤ 24 giờ`.
- `Tính đầy đủ bằng chứng` like `100% hồ sơ đủ trường bắt buộc`, `0 lot không truy được`.
- `Hiệu lực containment` as `% suspect range được khoanh trong 1 giờ`.
- `Tính ổn định` like `Cpk tối thiểu`, `% on-time calibration`, `% action đóng đúng hạn`.

### 2.6B Benchmark and numerical threshold

Section 6 KPIs should not be written in a general descriptive style. Each KPI must indicate:

1. **Numerical threshold or SLA**: for example `>= 98%`, `<= 24 giờ`, `= 0 escape`.
2. **Standard data source**: ERP, MES, QMS register, calibration log, audit log, backup log...
3. **Reaction trigger**: no matter how much deviation, hold the gate, open escalation or open action.
4. **Basis for finalization**:
   - official external benchmark,
   - customer requirements / laws / technical standards,
   - or the internal target is designed to be stricter than the benchmark because of HESEM's risk level.

Do not copy external benchmark numbers into the SOP if they have not been converted into actual operating thresholds of HESEM.

### 2.6C Formula for writing KPI

Each KPI box should read one of the following formats:

- `Metric + threshold + trigger`
- `Metric + threshold + source + trigger`
- `Threshold 1 + threshold 2 + zero-defect / zero-escape rule`

Standard example:

- `100% contract review hoàn tất trước commit; mismatch sau commit = 0; ACK thay đổi khách hàng <= 1 ngày làm việc.`
- `Backup success >= 99%; restore test dữ liệu critical = 100% theo quý; failed restore không có action = 0.`
- `100% tín hiệu out-of-control phản ứng trước lot kế tiếp hoặc <= 1 giờ; đặc tính trọng yếu giữ Cpk/Ppk >= 1.33 hoặc có reaction plan được duyệt.`

Non-standard example:

- `Được kiểm soát tốt.`
- `Đúng hạn và đủ hồ sơ.`
- `Cải thiện liên tục.`

### 2.6D Starting KPI library by family

The thresholds below are actual starting points for writing new SOPs. Don't copy blindly; must adjust according to risk, customer requirements and HESEM capabilities.

| Family | Commonly used starting KPI |
|---|---|
| Contract review / quotation | `ACK <= 1 ngày làm việc`, `mismatch sau commit = 0`, `100% review trước commit` |
| Engineering release | `100% quyết định phát hành có approver + evidence`, `release sai revision = 0` |
| Receiving / material readiness | `dock-to-ready critical <= 24 giờ`, `supplier document escape = 0`, `100% cert trước setup` |
| Planning / dispatch | `schedule attainment >= 90%`, `0 job dừng vì thiếu readiness planning` |
| Setup / first-piece / FAI | `first-piece pass >= 95%`, `100% mở sản lượng có sign-off + data đo bắt buộc` |
| Production control / restart | `restart không re-authorization = 0`, `suspect range phải khoanh trước restart` |
| Final release / shipping | `document accuracy >= 99.5%`, `thiếu chứng từ bắt buộc = 0`, `100% release map đúng lot/sản phẩm` |
| Invoice / closeout | `first-time-right invoicing >= 98%`, `invoice <= 1 ngày làm việc sau ship release` |
| Access control | `cấp/đổi/thu hồi quyền <= 1 ngày làm việc`, `orphan account = 0`, `privileged review = 100% theo quý` |
| Backup / resilience | `backup success >= 99%`, `restore test = 100% theo chu kỳ`, `failed restore không có action = 0` |
| Records / retention / disposal | `SoR/SSOT xác định = 100%`, `duplicate live record = 0`, `sanitization compliance = 100%` |
| MSA / capability | `GRR < 10%` is good, `10–30%` is only used conditionally, `>30%` is not acceptable without rationale; `Cpk/Ppk >= 1.33` is a common reference threshold |

### 2.7 DO NOT do it

- ❌ Fixed 5 IGs for every SOP.
- ❌ Catch `số IG = số bước chi tiết`.
- ❌ Use `gate-card / gate-grid` for Section 6.
- ❌ Write stop points like "quality assurance", "according to requirements".
- ❌ Use an owner who does not have permission to open the port.

---

## 3. Section 7 — Detailed process

### 3.1 Definition

Section 7 describes the **actual work sequence**. This is where the SOP must indicate:

- who did it,
- where to work,
- made with what system/material/machine/tool,
- What to check?
- what to hand over,
- when to stop,
- When to return or revalidate.

### 3.2 Number of detailed steps

**Unlimited.** For real operating SOPs, the number of steps should be determined by the following factors:

- change roles,
- change area / cell / stage,
- change system status,
- change main resource (`machine`, `program`, `fixture`, `gage`, `material`),
- arise control decisions,
- generation of vital evidence/records,
- generates `revalidation`, `containment`, `handover`.

### 3.3 Recommended actual step range

| SOP Type | Recommended actual detailed step range |
|---|---|
| Executive/corporate SOP | 7–10 |
| SOP engineering / release / quality planning | 8–12 |
| SOP CNC job-order / machine execution / first-piece / transfer | 10–14 |
| SOP final inspection / shipment / closeout | 8–10 |

### 3.4 Required structure

Section 7 includes 2 parts:

1. **Overview flowchart**
2. **Step by step details**

```html
<h2 class="h2" id="p7">7. Quy trình chi tiết</h2>

<div class="flowchart">
  <div class="flow-step" style="border-color:rgba(21,101,192,0.28);background:linear-gradient(135deg,rgba(21,101,192,0.10) 0%, rgba(255,255,255,0.98) 64%);">
    <div class="flow-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</div>
    <div class="flow-text"><div class="flow-title">Tên bước 1</div></div>
  </div>
  <div class="flow-arrow" style="color:rgba(25,118,210,0.45)">→</div>
  <div class="flow-step" style="border-color:rgba(5,150,105,0.28);background:linear-gradient(135deg,rgba(5,150,105,0.10) 0%, rgba(255,255,255,0.98) 64%);">
    <div class="flow-num" style="background:linear-gradient(135deg,#059669,#10b981)">2</div>
    <div class="flow-text"><div class="flow-title">Tên bước 2</div></div>
  </div>
</div>

<h3>
  <span class="proc-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</span>
  Tên bước 1
</h3>
<p>Mô tả mục tiêu, phạm vi và đầu ra của bước.</p>
<ul class="tight">
  <li>Hành động cụ thể 1</li>
  <li>Hành động cụ thể 2</li>
</ul>
<div class="role-note"><b>Bàn giao bắt buộc:</b> ai giao gì cho ai.</div>
```

### 3.4A Rules for safe section replacement

- When updating Section 7, only change the content between `p7` and `p8`.
- Do not delete heading `p7` by mistake.
- Do not delete heading `p8` by mistake.
- If the old flow and detailed steps no longer reflect the actual operation, the entire section between `p7 → p8` must be deleted and completely rewritten.

### 3.5 Unique pairs must match

| Part | Rules |
|---|---|
| Flowchart Section 7 | The number of bubbles must match the number of detailed steps |
| Step-by-step details | Each step must have a corresponding heading |

**Note:** this rule is **not related** to the number of IGs in Section 6.

### 3.5A Flowchart graphics rules

- Bubble numbers in the flowchart must use the correct rotating color palette of `proc-num`.
- Do not let the same SOP have `proc-num` in many colors but the balloon flowchart only has one default color.
- There should be two layers of protection:
  - HTML generates inline styles for bubbles.
  - Global CSS has a fallback palette based on position so that old files or handwritten files do not lose color.
- With automatically generated SOP, inline styles should be generated simultaneously for `flow-step`, `flow-num` and `flow-arrow`.
- `.active` and `.critical` are auxiliary semantic classes; Do not change the serial number or break the color mapping according to the step index.
- When using the fallback palette in CSS, remember that `.flow-arrow` is located between `.flow-step`; The selector must correctly map the actual child position of `.flow-step`.

### 3.5B Minimum technical check for flowchart

Before being considered qualified, it must be confirmed at the same time:

1. `flow-num count = proc-num count`
2. The number of steps increases continuously from `1...n`
3. Each detailed step has a corresponding `h3`
4. With automatically generated SOP: each `flow-num` has an inline style
5. There is no SOP that falls back to a single bubble color just because of a missing inline style or missing CSS fallback

### 3.6 When to split into a new step

Must be separated into separate steps if there is one of the following signs:

1. Change the host role.
2. Change the data source or standard system.
3. Change machine/jig/program/measuring method.
4. Initiate or terminate an individual quality control.
5. There is actual handover between the parties.
6. Has score `HOLD / review / approval / revalidation`.
7. There is a risk window that needs to be determined `last-known-good` or `suspect range`.

### 3.7 DO NOT do it

- ❌ Flowchart 5 steps but detailed section 9 steps.
- ❌ Combine `setup`, `prove-out`, `first-piece`, `FAI`, `release` into a single step.
- ❌ Write steps like "follow regulations".
- ❌ Mound the number of steps for a beautiful layout.
- ❌ Make Section 7 follow the correct IG number.

---

## 4. Mapping between Section 6 and Section 7

### 4.1 Mapping rules

Each SOP must have mapping thinking as follows:

- **Section 6** = control by **gate opening point**
- **Section 7** = description according to **execution workflow**

So:

- one IG can cover many steps,
- multiple steps can go to the same IG,
- an SOP can still use few IGs but many detailed steps if the process has many internal handovers,
- only when the process is really very short will the number of IGs and the number of steps be accidentally equal.

### 4.2 Good mapping example

| IG | Port target | The detailed step is usually under this gate |
|---|---|---|
| IG1 | Correct input key | B1 receives, B2 reviews the request |
| IG2 | Baseline / route / package ready | B3 release package, B4 resource planning |
| IG3 | Readiness in the field | B5 material/tool/fixture/gage ready, B6 setup ready |
| IG4 | Prove the process before running it in series | B7 prove-out, B8 first-piece / FAI |
| IG5 | Batch control | B9 production execution, B10 in-process reaction / revalidation |
| IG6 | Final release | B11 final inspection + ship release |
| IG7 | Closeout | B12 shipment close + costing + learn-back |

### 4.3 Signs of bad mapping

- 5 IGs and 5 iterations with identical names.
- IG is just a shortened copy of procedure heading.
- There are no separate steps for `handover`, `revalidation`, `containment`, `closeout`.

---

## 5. Reference model for CNC job-order

HESEM **does not use the 5-port / 5-step limit** for CNC job-order SOP.

### 5.1 Default reference datum

For end-to-end CNC job-order SOPs or SOPs with multiple handovers between Engineering, Planning, QA, Setup, Machining, QC and Shipping:

- **Good reference IG:** `6–7`
- **Detailed steps for good reference:** `10–14`

### 5.2 Background recommendation model

The current reference model of the core standard is:

- **7 Internal Gates**
- **12 detailed steps**

For full details, see file:

- `core-standards/reference/cnc-job-order-reference-model.md`

### 5.3 Meaning of the 7/12 model

This model allows to separate:

- request lock,
- lock baseline package,
- readiness of materials/tools/machines/jigs,
- setup & prove-out,
- first-piece / FAI,
- Run a series with a reaction plan,
- final release and closeout.

This is a much more suitable level of decay for job-shop CNC than the mechanical compression 5/5 model.

---

## 6. Checklist before submitting SOP

### 6.1 Section 6

- [ ] Use IG table, do not use gate-card/gate-grid
- [ ] IG number is determined by the process, no hard number is applied
- [ ] Each IG has an owner, holding points, KPI/minimum profile
- [ ] Do not use vague words for the gate opening condition
- [ ] KPIs in each IG have real numbers/SLA, not just descriptions

### 6.2 Section 7

- [ ] There is a flowchart at the beginning of section 7
- [ ] Flowchart steps = detailed steps
- [ ] Detailed steps are not forced by IG number
- [ ] There are enough steps for setup, prove-out, first-piece, release, reaction, closeout when needed by SOP
- [ ] There is clear handover at the points where roles are changed
- [ ] Bubble flowchart has the correct color step by step, does not fall to a default color

### 6.3 Overall logic

- [ ] Section 6 answers the control question correctly
- [ ] Section 7 correctly answers the operational question
- [ ] SOP is not "beautiful for presentation" but lacks implementation logic

---

## 7. Anti-patterns need to be blocked at the core standard level

1. Homogeneous `IG = step`.
2. Homogeneous `số gate dashboard = số gate trong SOP`.
3. Use 5 steps for every process to easily build a flowchart.
4. Use the same phrase for gate name and step name without different operational meanings.
5. Ignore `revalidation`, `containment`, `work transfer`, `closeout`.

---

## 8. Standard conclusions apply

From **2026-03-27**, HESEM's core standard applies clearly as follows:

- **Unlimited number of internal control ports.**
- **Unlimited number of detailed process steps.**
- **It is strictly forbidden to mechanically press the IG number with detailed step numbers.**
- **CNC job-order SOP must be modeled according to actual operations, not according to the formal layout.**
