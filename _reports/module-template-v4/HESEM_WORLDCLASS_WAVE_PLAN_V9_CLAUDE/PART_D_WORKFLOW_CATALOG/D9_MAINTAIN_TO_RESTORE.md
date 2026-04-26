# D9 — Maintain to Restore

```
workflow_id:    D9
workflow_name:  Maintain to Restore
owner_role:     Maintenance Lead
participants:   Production Lead, Quality Lead (calibration impact)
```

---

## 1. Purpose

Maintain to Restore is the workflow for keeping equipment running and,
when something goes wrong, getting it back to running per spec. It
includes preventive maintenance, corrective maintenance, calibration,
and out-of-tolerance impact handling.

---

## 2. Trigger

- PM Schedule due (calendar-based, runtime-based, or condition-based)
- Equipment failure observed
- Calibration due (equipment, measurement device, gage)
- Predictive maintenance advisory recommends action
- EHS incident requiring equipment review

---

## 3. Actors

```
PM Scheduler                  Manages PM calendar and triggers
Maintenance Tech              Performs the work
Calibration Tech              Performs calibration and MSA
Maintenance Planner           Plans and prioritizes work
Production Supervisor         Coordinates downtime
QA Engineer                   Handles OOT impact (calibration failures)
Operator                      Reports observed issues
```

---

## 4. Steps

### Step 1 — PM Trigger

PM Schedule reaches due date or runtime threshold. MWO (Maintenance
Work Order) auto-created.

Alternatively, an operator reports an issue (Andon or direct), which
generates a corrective MWO.

### Step 2 — MWO Planning

Maintenance Planner reviews the MWO. Schedules the work (often
coordinated with Production for scheduled downtime). Spare parts
identified and reserved.

### Step 3 — MWO Dispatch

Maintenance Tech is assigned. LOTO (Lockout/Tagout) procedure begins
if equipment must be de-energized.

### Step 4 — Maintenance Execution

Tech performs the work per work instruction. Captures evidence (parts
consumed, labor hours, observations, photos for high-value items).

### Step 5 — Calibration (when applicable)

For measurement equipment, calibration is performed. Reference
standards used; traceability chain documented.

Calibration result:
- **Pass**: equipment certified for continued use; next-due date set
- **Fail (OOT)**: out-of-tolerance triggers OOT impact handling

### Step 6 — Out-of-Tolerance Impact Handling

When calibration finds equipment was OOT:
- Identify all measurements made by this equipment since the last
  passing calibration
- Affected lots / inspections enter review
- NCs auto-created if quality decisions were affected
- Affected products may require investigation, retest, or recall
  initiation

### Step 7 — MWO Completion

Tech closes the MWO with completion evidence. Equipment status updated.

### Step 8 — Return to Service

For equipment requiring formal return-to-service (e.g., FAA Part 145
for aircraft engines):
- Final inspection
- QA sign-off
- Certificate of Return to Service

---

## 5. Decision points

```
DP1  PM trigger:           calendar / runtime / condition
DP2  Production downtime:   schedule with operations
DP3  LOTO required:        per equipment hazard analysis
DP4  Calibration result:   pass / fail / OOT
DP5  OOT impact scope:     which lots / inspections affected
DP6  Return-to-service:    QA sign-off required?
```

---

## 6. Cross-domain footprint

D-09 Maintenance (primary), D-06 Production (downtime coordination),
D-07 Quality (OOT impact, calibration), D-05 Inventory (spare parts).

---

## 7. State machines

SM-7 Maintenance, SM-13 Calibration, SM-8 Equipment.

---

## 8. Evidence captured

MWO record with parts, labor, observations. Calibration record with
reference standards, results, certificates. OOT impact records with
affected lots / inspections / NCs.

---

## 9. Wave target

L4 by W6; L5 by W6.

---

## 10. Failure modes

```
- Spare part unavailable:    expedite procurement; substitute if
                              authorized; defer if not safety-critical
- Calibration ref standard expired: invalid calibration; recall
                                     in-progress; new calibration
                                     required
- OOT impact too broad:       material recall consideration
- LOTO not properly applied:  safety incident; halt; investigation
```

---

## 11. Decision phrase

```
D9_MAINTAIN_TO_RESTORE_BASELINE_LOCKED
NEXT: D10_BATCH_TO_RELEASE.md
```
