# D6 — NC to CAPA (Nonconformance to Corrective and Preventive Action)

```
workflow_id:    D6
workflow_name:  NC to CAPA
owner_role:     Quality Lead
participants:   Engineering Lead, Procurement Lead, Production Lead, HR Lead, Compliance Lead
```

This is the densest workflow in HESEM. The NC-to-CAPA cycle is the
heart of regulated quality discipline. Every regulator (FDA, EMA, IATF,
NADCAP, ISO 13485 NB) examines it carefully during audit.

---

## 1. Purpose

NC to CAPA is the workflow that turns a discovered nonconformance into
a closed-loop corrective action with documented effectiveness. Without
it, problems recur; with it, they don't.

---

## 2. Trigger

A nonconformance is observed:
- Inspection failure (IQC, IPC, OQC)
- Customer complaint with quality root
- Audit finding
- Supplier delivery issue
- Internal observation by operator or supervisor
- Calibration out-of-tolerance affecting prior measurements
- SPC violation
- Field return / RMA

---

## 3. Actors

```
Discoverer (any role)        Reports the nonconformance
QA Engineer                  Investigates, classifies, dispositions
QA Manager                   Approves regulated transitions
Affected Domain Owner        Provides context and root-cause input
                              (Production, Engineering, Procurement, etc.)
CAPA Owner                   Designs and executes corrective action
Effectiveness Reviewer       Verifies effectiveness independently
Compliance Lead              Reviews regulated CAPA closures
```

---

## 4. Steps

### Step 1 — NC Opening

Discoverer opens an NC in HESEM. Required fields: severity (critical,
major, minor, cosmetic), affected lot or part, defect description,
discovery context. NC severity is frozen at creation time (escalation
requires formal review).

NC opening **triggers**:
- Lot quarantine (per coupling SM-4 → SM-2): the affected lot's
  quarantine_state is set to quarantined.
- Workspace notifications to QA team.
- Audit event recorded.

### Step 2 — NC Investigation

QA Engineer investigates: where did the defect come from, when, why,
what is the impact. Investigation may include:
- Reviewing inspection records and SPC trends
- Reviewing operator interviews
- Reviewing equipment calibration history
- Reviewing related NCs (similarity clustering — AI advisory in W6.5+)

### Step 3 — NC Disposition

QA Engineer (with QA Manager approval, two-person e-sign for regulated)
dispositions the NC:

- **Accept**: lot is acceptable as-is (rare; usually for cosmetic
  defects).
- **Concession**: lot is acceptable with documented exception
  (CDOC concession required).
- **Rework**: lot can be returned to spec via documented process
  (MWO or in-house WO created).
- **Reject**: lot cannot be saved; scrap or return to supplier.

Couplings on disposition:
- accept → if no other open NCs on lot, lot quarantine cleared.
- reject → CAPA auto-created (or manual CAPA assignment).
- rework → rework MWO scheduled.
- concession → CDOC concession requirement flagged.

### Step 4 — CAPA Creation (when applicable)

For NCs requiring corrective action:
- Critical / major NCs always require CAPA.
- Trend-based: 3 minor NCs of same defect mode in 30 days trigger
  CAPA.
- Customer complaints with quality root require CAPA.

CAPA is assigned to a CAPA Owner (typically a senior QE or domain
expert).

### Step 5 — CAPA Investigation (Root-Cause Analysis)

CAPA Owner conducts root-cause analysis. Methods:
- 5-Why
- Fishbone (Ishikawa) diagram
- Fault tree analysis
- 8D problem-solving (for automotive customers)
- Pareto on contributing factors

Output: documented root cause statement and contributing factors.

### Step 6 — Corrective Action Design

CAPA Owner designs corrective action:
- Address the immediate problem (containment).
- Address the root cause (corrective).
- Address potential recurrence (preventive).

Corrective action may include:
- Process change (ECO triggered to update routing or work instruction)
- Document update (CDOC revision through ECO)
- Equipment change (MWO or capital request)
- Training (training course update; mass training assignment)
- Supplier corrective action (SCAR if supplier-source)
- FMEA update (new failure mode added; control updated)
- SPC limits or rules updated

### Step 7 — Corrective Action Execution

Per the design, actions execute. Each action has its own owner and
deadline. Progress tracked in the CAPA record.

### Step 8 — Effectiveness Check Setup

When all corrective actions complete, CAPA transitions to
"effectiveness-check-pending." Effectiveness check criteria are
defined: typically zero recurrence of the original defect mode over 60
or 90 days. Threshold may be relative (e.g., 80% reduction in defect
rate) per CAPA owner judgment.

### Step 9 — Effectiveness Monitoring

Over the effectiveness check window (typically 60-90 days), the system
tracks recurrence of the original defect mode. AI advisory may flag
similar new NCs.

### Step 10 — Effectiveness Decision

At the due date:
- **Effectiveness pass**: zero or below-threshold recurrence; CAPA
  Owner signs (e-sign); independent reviewer signs (two-person e-sign
  for regulated). CAPA transitions to "closed-effective."
- **Effectiveness fail**: recurrence exceeds threshold; CAPA reopens
  for new corrective action design.

### Step 11 — NC Closure

Once the parent NC's CAPAs are closed effectively (or scheduled
effectiveness check), NC transitions to "closed."

### Step 12 — Trend Analysis (continuous)

CAPA effectiveness data flows to the Quality Analytics dashboard. Trend
analysis identifies:
- Repeat issues (CAPAs that fail effectiveness)
- Defect mode patterns
- Cost of poor quality trends
- Supplier quality patterns

---

## 5. Decision points

```
DP1  NC severity classification:  critical / major / minor / cosmetic
DP2  Disposition:                 accept / concession / rework / reject
DP3  CAPA required?               always for critical / major; trend-based for minor
DP4  Root cause identified?       sufficient evidence to act
DP5  Corrective action scope:     immediate / root cause / preventive
DP6  Effectiveness pass?          recurrence vs threshold
DP7  CAPA close requires e-sign:  two-person for regulated
DP8  Trend escalation:            patterns demanding broader action?
```

---

## 6. Couplings to other workflows

```
- NC opening → lot quarantine (D5)
- NC dispose-reject → CAPA + SCAR (if supplier; D2)
- NC dispose-rework → MWO or shopfloor WO (D9 / D3)
- NC dispose-concession → CDOC concession (D7)
- CAPA root cause: process change → ECO (D7)
- CAPA root cause: training gap → TRAIN_COURSE update + assignments (D8)
- CAPA close (effective) → trends, KPIs (analytics)
```

---

## 7. Cross-domain footprint

This is the most cross-cutting workflow. Touches:
- D-07 Quality (primary)
- D-05 Inventory (quarantine)
- D-04 Procurement (SCAR)
- D-06 Production (rework, process change)
- D-02 Engineering (ECO, FMEA update)
- D-09 Maintenance (calibration root cause)
- D-10 Workforce (training root cause)

---

## 8. State machines

SM-4 NC + CAPA + SCAR (primary).

Coupled: SM-2 Material, SM-3 Inspection, SM-5 Document, SM-7
Maintenance, SM-11 Training.

---

## 9. Evidence captured

```
- NC record with severity, defect description, discoverer, disposition
- Multi-party investigation evidence
- Root-cause analysis documentation
- Corrective action design and execution records
- Effectiveness data (per-defect-mode recurrence over window)
- E-signatures on close (two-person for regulated)
- Audit chain extension at every state transition
```

This evidence is the heart of regulated audit. FDA, IATF, NADCAP, NB
auditors examine it carefully.

---

## 10. Regulatory considerations

```
- 21 CFR Part 211 + Part 820 (CAPA program for FDA-regulated)
- ICH Q10 + ICH Q9 (CAPA in pharmaceutical quality system)
- IATF 16949 §10 (Improvement; CAPA for automotive)
- AS9100D §10
- ISO 13485 §8 (med device CAPA)
- ISO 9001:2015 §10
- 21 CFR Part 11 (e-records / e-signatures on CAPA close)
```

---

## 11. Wave target

L4 by W3 (eQMS Core); L5 by W3. AI advisory enhancements (similarity,
root-cause ranking) in W6.5.

---

## 12. Failure modes and recovery

```
- Root cause not identified:        CAPA stays open with periodic
                                     review until evidence emerges
- Corrective action insufficient:    effectiveness fail; CAPA reopens
- Effectiveness check timing slip:   automated reminder; SLA tracker
- Repeat NC of same mode:            indicates broader issue;
                                     trend-CAPA escalation
- Supplier non-responsive on SCAR:   escalation per supplier agreement;
                                     possible disqualification
- E-sign session expiry:             prompt re-authentication; mutation
                                     not committed
```

---

## 13. AI advisory boundaries

AI in this workflow is advisory only:
- AI may suggest root cause categories from prior NCs (CAP-C13-05,
  CAP-C13-06).
- AI may rank candidate corrective actions.
- AI may draft initial CAPA report text.

AI may NOT:
- Close a CAPA (BD-3 banned).
- Sign as the human approver.
- Change the disposition without human authority.

---

## 14. Decision phrase

```
D6_NC_TO_CAPA_BASELINE_LOCKED
NEXT: D7_DOCUMENT_TO_RELEASE.md
```
