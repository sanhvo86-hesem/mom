# C9 — Maintenance & EHS (Environment, Health, Safety)

```
domain_code:    D-09
domain_name:    Maintenance & EHS
owner_role:     Maintenance Lead (with Quality Engineer for calibration, EHS Lead for incidents)
primary_state_machines: SM-7 Maintenance, SM-8 Equipment, SM-13 Calibration
```

---

## 1. Purpose

The Maintenance & EHS domain owns the upkeep of equipment and the
safety of personnel. Equipment cannot run without maintenance.
Maintenance evidence is part of the regulated record. EHS incidents must
be tracked per regulatory frame.

This domain is the bridge between IT and OT in much the same way as
Shopfloor, but viewed from the equipment lens rather than the operations
lens.

---

## 2. The roots within this domain

```
Equipment (EQP)              Every machine, tool, fixture identified.
Maintenance Work Order (MWO) The formal record of maintenance work done.
PM Schedule (PMSCH)          The calendar of preventive maintenance.
Calibration Record (CAL)      The record of measurement-system calibration.
Measurement System Analysis  Gauge R&R, bias, linearity, stability studies.
   (MSA / GR&R)
EHS Incident                 Any safety event (near-miss, injury, fatality).
Lockout / Tagout (LOTO)      The safety procedure for work on de-energized
                             equipment.
```

---

## 3. The capabilities within this domain

### CAP-C9-01 — Equipment Master

**Purpose.** Maintain the authoritative record of every machine, tool,
and fixture: identity, location, capability, ownership.

**Lifecycle.** Equipment record created at acquisition. State: active,
in-maintenance, calibration-due, calibration-overdue, decommissioned.

**Wave target.** L4 by W2; L5 by W2.

### CAP-C9-02 — Preventive Maintenance Schedule

**Purpose.** Schedule recurring maintenance based on calendar, runtime,
or condition.

**Lifecycle.** PM schedule defined per equipment. Triggers MWO
auto-create when due.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C9-03 — Maintenance Work Order

**Purpose.** Record the actual work done on equipment.

**Lifecycle (per state machine SM-7 MWO).** Scheduled → in-progress →
completed (or deferred / cancelled). Attached evidence (photos, parts
consumed, labor hours, observations).

**Wave target.** L4 by W6; L5 by W6.

### CAP-C9-04 — Calibration Management

**Purpose.** Schedule and capture calibration of measurement equipment.
Maintain traceability chain to national standards (NIST in US, NIM in
China, etc.).

**Lifecycle (per state machine SM-13).** Calibration scheduled →
in-progress → completed-passed (or completed-failed-OOT) →
re-calibrated (if OOT).

**Out-of-tolerance handling.** When calibration finds equipment was
OOT, the system flags all measurements made by that equipment since the
last passing calibration. Affected lots and inspections enter review.
NCs auto-created if quality decisions were affected.

**Wave target.** L4 by W6; L5 by W6.

### CAP-C9-05 — Measurement System Analysis (MSA)

**Purpose.** Per AIAG MSA 4th Edition, perform Gauge Repeatability and
Reproducibility studies, bias studies, linearity studies on measurement
equipment to ensure measurement quality.

**Lifecycle.** Study planned (per AIAG: 3 operators × 10 parts × 3
trials for GR&R). Executed. Computed (Repeatability, Reproducibility,
Part Variation, Total Variation, GRR/Tolerance percentage). Decision
(acceptable, marginal, unacceptable per AIAG criteria).

**Wave target.** L4 by W6; L5 by W6.

### CAP-C9-06 — Environment / Health / Safety Incident

**Purpose.** Capture every safety event (near-miss, injury, fatality,
environmental release, regulatory exceedance) with investigation and
corrective action.

**Lifecycle.** Incident reported. Triaged. Investigation. Root cause.
Corrective action. Closed. Reportable incidents (e.g., OSHA recordable)
also flow to regulatory reporting.

**Wave target.** L4 by W8; L5 by W8.

### CAP-C9-07 — Lockout / Tagout (LOTO)

**Purpose.** Track LOTO procedures for safe work on de-energized
equipment.

**Lifecycle.** LOTO request. Authorization. Lock applied. Work performed.
Lock removed. Verification.

**Wave target.** L4 by W8; L5 by W8.

### CAP-C9-08 — Reliability Analytics (advanced)

**Purpose.** Compute MTBF (Mean Time Between Failures), MTTR (Mean Time
To Repair), Weibull distributions for equipment reliability. Feed
predictive maintenance models.

**Wave target.** L4 by W10 (vertical pack expansion).

---

## 4. Workflows

Primary in: D9 Maintain to Restore.

Participant in: D5 Inspect to Disposition (when calibration triggers
inspection review), D10 Batch to Release (calibration evidence required),
D14 Validate to Qualify (equipment validation).

---

## 5. APIs

```
- Equipment API
- PM Schedule API
- MWO API
- Calibration API
- MSA API
- EHS Incident API
- LOTO API
- Reliability Analytics API (advanced)
```

---

## 6. Frontend surfaces

```
- Equipment Workspace + Record Shell
- PM Calendar Workspace
- MWO Workspace + Record Shell
- Calibration Workspace + Record Shell
- MSA Workspace
- EHS Incident Workspace + Record Shell
- LOTO Workspace
- Equipment Reliability Dashboard
```

---

## 7. Cross-cutting concerns

- C1 Audit chain on every MWO and CAL
- C2 E-signature on regulated CAL approvals
- C8 Observability per maintenance cycle
- C10 Retention: CAL records retained per regulatory class

---

## 8. Wave assignments

```
Equipment              L4 W2; L5 W2
PM Schedule             L4 W6; L5 W6
MWO                     L4 W6; L5 W6
Calibration             L4 W6; L5 W6
MSA / GR&R              L4 W6; L5 W6
EHS Incident            L4 W8; L5 W8
LOTO                    L4 W8; L5 W8
Reliability Analytics   L4 W10
```

---

## 9. Standards

```
- ISO 9001:2015 §7.1.5 (Monitoring and measurement resources)
- IATF 16949 §7.1.5
- AS9100D §7.1.5
- ISO/IEC 17025 (testing/calibration laboratories)
- AIAG MSA 4th Edition
- USP <1058> (Analytical instrument qualification; pharma)
- 21 CFR Part 211 §211.68 (Equipment; pharma)
- NADCAP CQI series (special process accreditation; aerospace)
- OSHA 29 CFR 1910.147 (LOTO; US safety)
- ISO 45001 (Occupational health and safety)
```

---

## 10. Boundary with adjacent domains

- D-02 Engineering: Routing references equipment families.
- D-03 Planning: Equipment availability windows respected in scheduling.
- D-05 Inventory: Spare parts inventory.
- D-06 Production: Equipment status drives operation eligibility.
- D-07 Quality: Calibration OOT triggers Quality review.
- D-08 Traceability: Calibration evidence required for BREL.

---

## 11. Decision phrase

```
C9_MAINTENANCE_EHS_BASELINE_LOCKED
NEXT: C10_WORKFORCE_TRAINING.md
```
