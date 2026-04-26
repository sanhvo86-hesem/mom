# D13 — Audit to Remediate

```
workflow_id:    D13
workflow_name:  Audit to Remediate
owner_role:     Quality Lead
participants:   All other domain leads as audited
```

---

## 1. Purpose

Audit to Remediate is the workflow from raising an audit finding (during
internal or external audit) through corrective action close. It is how
the organization learns from audits.

---

## 2. Trigger

- Internal audit per scheduled program (per ISO 9001 §9.2 minimum
  annually)
- External audit by certification body (IATF 16949 surveillance, AS9100,
  ISO 13485, NADCAP)
- Regulator inspection (FDA, EMA, NB)
- Customer audit (OEM, prime, regulator)
- Voluntary self-assessment

---

## 3. Actors

```
Auditor (internal or external)   Conducts the audit
Auditee (audited party)          Provides records and explanations
Auditee Manager                   Owns response to findings
QA Lead                           Owns the audit program
QA Approver                       Approves CAPA closure
Compliance Lead                   Reviews regulated audits
```

---

## 4. Steps

### Step 1 — Audit Planning

QA Lead schedules audit per program:
- Process audit (per IATF VDA 6.3)
- System audit (per ISO 9001 §9.2)
- Product audit
- Compliance audit per regulatory framework

Audit scope, criteria, and team defined.

### Step 2 — Audit Execution

Auditor conducts audit per agreed methodology:
- Document review
- Process observation
- Personnel interviews
- Sampling

### Step 3 — Finding Identification

When auditor identifies a nonconformance, finding is recorded in HESEM:
- Nature of finding (major / minor / observation)
- Affected process or area
- Evidence (citations, examples)
- Standard reference (which clause / section violated)

### Step 4 — Auditee Response

Auditee Manager responds within agreed time:
- Acknowledge finding
- Containment action (immediate)
- Root cause analysis
- Corrective action plan
- Effectiveness measurement plan

### Step 5 — CAPA Generation

Each finding generates a CAPA (D6 NC to CAPA workflow). Linked to the
finding for traceability.

### Step 6 — CAPA Execution

Per D6, CAPA executes through investigation, corrective action, and
effectiveness check.

### Step 7 — Effectiveness Verification by Auditor

Auditor (or follow-up auditor) verifies:
- Corrective action implemented
- Effectiveness demonstrated
- No recurrence in window

### Step 8 — Finding Closure

Finding transitions to "closed" once verified. Audit closure depends on
all findings being closed.

### Step 9 — Audit Report

Final audit report issued with:
- Findings summary
- Corrective actions taken
- Effectiveness verification
- Recommendations

---

## 5. Decision points

```
DP1  Audit type / scope
DP2  Finding severity classification
DP3  Containment action sufficient?
DP4  Root cause analysis adequate?
DP5  Corrective action effective?
DP6  Finding closure verification
```

---

## 6. Cross-domain footprint

D-07 Quality (primary). All other domains as audited.

---

## 7. State machines

SM-4 NC + CAPA (audit findings flow through CAPA).

---

## 8. Evidence captured

Audit plan, audit records, findings with evidence, auditee responses,
CAPAs (linked), effectiveness data, audit reports.

---

## 9. Regulatory considerations

```
- ISO 9001:2015 §9.2 (Internal audit)
- ISO 13485 §8.2.4 (Med device internal audit)
- IATF 16949 §9.2.2 (Automotive audit)
- AS9100D §9.2
- 21 CFR Part 211 §211.180 (Pharma quality unit)
- IATF 16949 audit cycle (3-year certification, annual surveillance)
- ISO 13485 NB audit cycle
- AS9100 IAQG / OASIS audit cycle
```

---

## 10. Wave target

L4 by W7; L5 by W7.

---

## 11. Failure modes

```
- Finding contested:           formal dispute resolution
- CAPA not effective:           reopen with revised scope
- Repeat finding:               escalation to senior management
- Audit closure missed:         deferred per agreement; risk register
                                  entry
- Critical finding:             may pause certification; immediate action
```

---

## 12. Decision phrase

```
D13_AUDIT_TO_REMEDIATE_BASELINE_LOCKED
NEXT: D14_VALIDATE_TO_QUALIFY.md
```
