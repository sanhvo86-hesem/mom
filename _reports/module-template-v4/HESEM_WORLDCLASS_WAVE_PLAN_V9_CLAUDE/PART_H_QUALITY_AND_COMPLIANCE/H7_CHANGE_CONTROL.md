# H7 — Change Control (Annex 11 §10)

```
chapter_purpose: every config / process / document / spec change
                 governed by ECO discipline
owner_role:      Engineering Lead with Quality Lead
```

---

## 1. ECO state machine

(Per SM-5 in B4 + per C2 CAP-C2-05 ECO Workflow)

```
draft → impact-analysis-in-progress → impact-analyzed → in-review →
approved → implementing → verified → closed
                                  ↘ rejected
```

---

## 2. Risk classification per change

```
Class A   Critical (regulated function change)        full IQ/OQ/PQ delta
Class B   Major (significant function change)         OQ delta + sample PQ
Class C   Minor (UI text, non-functional)              smoke test
Class D   Documentation only                           review only
Class E   Emergency (security patch)                   post-deploy validation
```

---

## 3. Approval chain per class

Per file 18 approval workflow (V8 carry-forward):
- Class A: Domain Lead + Engineering Lead + Quality Lead + Compliance Lead
- Class B: Domain Lead + Engineering Lead + Quality Lead
- Class C: Domain Lead + Engineering Lead
- Class D: single approver
- Class E: emergency post-action ADR

---

## 4. Backward compatibility discipline

- Breaking API changes require major version bump + 6-month deprecation
- Backward-incompatible schema changes via shadow-write phase
- Configuration changes require ECO with classification

---

## 5. Decision phrase

```
H7_CHANGE_CONTROL_BASELINE_LOCKED
NEXT: H8_CAPA_PROGRAM.md
```
