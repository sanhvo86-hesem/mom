# F6 — Action Consoles

```
surface_class:  AC
owner_role:     Per-domain lead
```

---

## 1. Purpose

Action Consoles are bulk-action surfaces. When a user needs to perform
the same action on many records (e.g., reassign 50 NCs, approve 100
training records, close 30 work orders), an Action Console is the
appropriate surface.

---

## 2. Examples

```
- NQCASE Bulk Reassignment Console
- CAPA Bulk Effectiveness Check Initiation
- Training Bulk Assignment Console
- Inventory Bulk Cycle Count Adjustment
- Equipment Bulk Calibration Schedule Adjustment
- ECO Bulk Approval (when policy permits multi-approval)
- Document Bulk Withdrawal
```

---

## 3. Common pattern

Each Action Console:
- Is launched from a workspace with a multi-row selection.
- Confirms the scope (which records will be acted on).
- Confirms the action (what will happen).
- Captures the bulk authority (e-signature when required).
- Submits the bulk command via Bulk API (E11.3).
- Reports per-record result (HTTP 207 Multi-Status).
- Returns to the originating workspace with results visible.

---

## 4. Backend bindings

- Workspace selection (E5)
- /can endpoint (E1.7) for permission check
- E-Signature API (E7) when obligated
- Bulk Operation API (E11.3) for submission

---

## 5. Cross-cutting concerns

- C5 Idempotency (per-record key in bulk payload)
- C2 E-signature (when regulated)
- C7 Problem-detail per failed record

---

## 6. Wave target

L4 by W5; L5 by W5.

---

## 7. Decision phrase

```
F6_ACTION_CONSOLES_BASELINE_LOCKED
NEXT: F7_DRAWERS_AND_DIALOGS.md
```
