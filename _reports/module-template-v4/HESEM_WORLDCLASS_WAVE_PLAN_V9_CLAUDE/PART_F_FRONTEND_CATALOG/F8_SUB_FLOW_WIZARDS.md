# F8 — Sub-Flow Wizards (SFW)

```
surface_class:  SFW
owner_role:     Per-domain lead
```

---

## 1. Purpose

Sub-Flow Wizards are multi-step processes that span several screens
or stages. They guide the user through a complex sequence with
clear progress indication and the ability to save / resume.

---

## 2. Examples

```
- New Item Introduction Wizard         multi-step: identity → BOM → routing → FMEA → ECO
- Customer Onboarding Wizard           per phase P1-P8 (PART_K)
- Audit Pack Export Wizard             scope → period → regulator → compose → sign
- Tenant Provisioning Wizard           tenant identity → region → tier → vertical pack
- Validation Master Plan Wizard        scope → strategy → risk → URS → approval
- DR Drill Wizard                       scenario → planning → execution → reporting
- Recall Initiation Wizard             classification → scope → notification → tracking
- PPAP Submission Wizard (automotive)  18 elements → review → submit
```

---

## 3. Common pattern

Each Wizard:
- Header with progress steps (Step 3 of 7 visible)
- Each step is its own surface (data entry, review, confirmation)
- Save-and-resume per step
- Final review before submit
- Submission triggers one or more workflow commands
- Audit trail of wizard progression

---

## 4. Discipline

Like NRD, SFW eventually issues commands via E3.1 with proper
discipline. The wizard captures input; the mutation flows through
Workflow.

---

## 5. Backend bindings

Multiple APIs typically: per-step data validation may call various
Record / Authority / Validation APIs; final submit calls Workflow API
(E3.1) and possibly Bulk (E11.3) for multi-record commits.

---

## 6. Wave target

Per per-feature need. Most wizards by W3-W7. Customer Onboarding
Wizard by W11. Audit Pack Export Wizard by W7+W10.

---

## 7. Decision phrase

```
F8_SUB_FLOW_WIZARDS_BASELINE_LOCKED
NEXT: F9_FRONTEND_BACKEND_BINDING.md
```
