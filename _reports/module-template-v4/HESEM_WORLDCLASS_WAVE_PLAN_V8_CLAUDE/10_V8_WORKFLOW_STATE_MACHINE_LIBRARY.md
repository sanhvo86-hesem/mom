# 10 — V8 Workflow State Machine Library

```text
purpose:        Catalog all V8 state machines per file 01 §3 with formal YAML definitions
predecessor:    V5 file 01 §3 (8 coupled SMs) + V8 extensions for 14 SMs
v8_advance:     14 state machines with formal states, transitions, guards, obligations, emits, compensations
work_package:   WP-V8-SM (14 work packages, one per state machine)
owner:          Domain Lead per machine
estimate:       ~14 engineering-weeks across 14 machines (mostly W3-W6)
```

---

## 1. The 14 state machines

V5 file 01 §3 defined 8. V8 extends to 14:

```text
SM-1   Order machine            QUO/CPO/SO/INVOICE  (W5)
SM-2   Material machine         LOT/IREV/genealogy   (W5/W6/W7)
SM-3   Inspection machine       INSP/IQC/IPC/OQC/MRB (W3)
SM-4   NC + CAPA + SCAR machine NC/CAPA/SCAR         (W3)
SM-5   Document machine         CDOC/ECO             (W3)
SM-6   Release machine          BREL                 (W7)
SM-7   Maintenance machine      MWO/PMSCH            (W6)
SM-8   Equipment machine        EQP/CAL/SPC/FMEA/VAL (W6)
SM-9   Procurement machine      PO/RECEIPT/SCAR-link (W5)  ← V8 NEW
SM-10  Job/Work-order machine   JO/WO/OPER           (W5/W6) ← V8 NEW
SM-11  Training machine         TRAIN/CERT/COMP_MATRIX (W3) ← V8 NEW
SM-12  Complaint/Recall machine COMPLAINT/RECALL/SAFETY_REPORT (W7/W10) ← V8 NEW
SM-13  Calibration machine      CAL/MSA/GR&R         (W6) ← V8 NEW (was within SM-8 in V5)
SM-14  Validation machine       URS/RTM/IQ/OQ/PQ/VMP (W9) ← V8 NEW
```

---

## 2. Sample state machine definitions (excerpt; full in `data/workflow_state_machines_v8.json`)

### SM-4 NC + CAPA (excerpt)

```yaml
state_machine: sm4_nc
authority_root: NQCASE
states:
  - draft
  - open
  - in_investigation
  - in_disposition
  - dispositioned_accept
  - dispositioned_concession
  - dispositioned_rework
  - dispositioned_reject
  - awaiting_capa
  - closed
  - reopened
transitions:
  - id: nqcase.open
    from: draft
    to: open
    guards:
      - lot_exists
      - severity_set
      - reason_for_change_provided
    obligations:
      - reason_for_change
    emits:
      - workflow_event: nqcase.opened
      - audit_event: mutation
      - coupling: { target: lot.quarantine, rule: set_quarantined, payload: { lot_id, reason: nc_opened } }
  - id: nqcase.dispose_concession
    from: in_disposition
    to: dispositioned_concession
    guards:
      - mrb_quorum_met
      - concession_authorization_chain_complete
    obligations:
      - e_signature: { factor_count: 2, signers: 2, factors_per_signer: [password, totp], part11_compliant: true }
      - reason_for_change
    emits:
      - workflow_event: nqcase.dispositioned
      - audit_event: mutation
      - coupling: { target: cdoc.concession_required, rule: flag, payload: { case_id } }
  - id: nqcase.dispose_reject
    from: in_disposition
    to: dispositioned_reject
    guards:
      - mrb_quorum_met
    obligations:
      - e_signature: { factor_count: 2, signers: 2 }
      - reason_for_change
    emits:
      - workflow_event: nqcase.dispositioned
      - audit_event: mutation
      - coupling: { target: capa.required, rule: auto_create_or_assign, payload: { source_nc_id } }
      - coupling: { target: lot.disposition_state, rule: set, payload: { lot_id, state: rejected } }
  - id: nqcase.close
    from: awaiting_capa
    to: closed
    guards:
      - all_linked_capa_in_state(closed)
      - effectiveness_check_passed_or_scheduled
    obligations:
      - e_signature: { factor_count: 2, signers: 2 }
    emits:
      - workflow_event: nqcase.closed
      - audit_event: mutation

state_machine: sm4_capa
authority_root: CAPA
states:
  - draft
  - open
  - investigation_in_progress
  - root_cause_identified
  - corrective_action_in_progress
  - effectiveness_check_pending
  - closed
  - reopened
transitions:
  - id: capa.action_complete
    from: corrective_action_in_progress
    to: effectiveness_check_pending
    guards:
      - corrective_action_evidence_present
      - approver_authorized
    obligations:
      - e_signature: { factor_count: 2, signers: 2 }
    emits:
      - workflow_event: capa.action_completed
      - audit_event: mutation
      - coupling: { target: capa.effectiveness_check, rule: schedule, payload: { capa_id, due_at: NOW + INTERVAL '90 days' } }
  - id: capa.effectiveness_check_pass
    from: effectiveness_check_pending
    to: closed
    guards:
      - effectiveness_metric_threshold_met
    obligations:
      - e_signature: { factor_count: 2, signers: 2 }
    emits:
      - workflow_event: capa.closed_effectively
      - audit_event: mutation
  - id: capa.effectiveness_check_fail
    from: effectiveness_check_pending
    to: reopened
    guards:
      - effectiveness_metric_threshold_not_met
    obligations:
      - reason_for_change
    emits:
      - workflow_event: capa.reopened
      - audit_event: mutation
      - coupling: { target: capa.required, rule: new_corrective_action, payload: { source_capa_id } }
```

(Similar full YAML definitions for SM-1 through SM-14 in `data/workflow_state_machines_v8.json`.)

---

## 3. State machine completeness rules

```yaml
SM-COMPLETENESS-1: Every state must be reachable from a designated start state (no orphan states)
SM-COMPLETENESS-2: Every state must have ≥1 outbound transition OR be marked terminal
SM-COMPLETENESS-3: Every transition must have non-empty guards OR explicit zero_guard_justification
SM-COMPLETENESS-4: Every regulated transition must have e_signature obligation per validation_scope
SM-COMPLETENESS-5: Every transition must emit ≥1 workflow_event AND audit_event
SM-COMPLETENESS-6: For every transition with rollback_model='compensating_command', there must be a compensating transition that returns to the prior state
SM-COMPLETENESS-7: Coupling targets must exist (i.e. coupling.target.lot must reference an actual coupling rule for SM-2)

verification: scripts/verify_state_machine_v8.py validates all SM-COMPLETENESS-* rules
```

---

## 4. Coupling matrix (V5 file 01 §3 §1.1 carry-forward + V8 formalization)

V8 ships couplings as data in `data/sm_couplings_v8.json` so engineers can later code coupling resolvers without ambiguity.

```yaml
coupling_format:
  trigger_state_machine: <sm_id>
  trigger_transition: <transition_id>
  target: <state_machine.aspect>          # e.g. lot.quarantine_state
  rule: <rule_id>                          # e.g. set_quarantined
  payload_template: { ... }
  ai_advisory_allowed: false               # AI may NEVER trigger couplings autonomously
  failure_policy: { on_target_failure: rollback_origin }
```

---

## 5. Work packages

```yaml
WP-V8-SM-1   Order machine YAML + tests       (W5, 1 wk)
WP-V8-SM-2   Material machine YAML + tests    (W5/W6, 1 wk)
WP-V8-SM-3   Inspection machine YAML + tests  (W3, 1 wk)
WP-V8-SM-4   NC + CAPA + SCAR YAML + tests    (W3, 1.5 wk)
WP-V8-SM-5   Document/ECO YAML + tests        (W3, 1 wk)
WP-V8-SM-6   Release/BREL YAML + tests        (W7, 1.5 wk)
WP-V8-SM-7   Maintenance YAML + tests         (W6, 1 wk)
WP-V8-SM-8   Equipment YAML + tests           (W6, 1 wk)
WP-V8-SM-9   Procurement YAML + tests         (W5, 1 wk)
WP-V8-SM-10  Job/WO YAML + tests              (W5/W6, 1.5 wk)
WP-V8-SM-11  Training YAML + tests            (W3, 0.5 wk)
WP-V8-SM-12  Complaint/Recall YAML + tests    (W7/W10, 1 wk)
WP-V8-SM-13  Calibration YAML + tests         (W6, 0.5 wk)
WP-V8-SM-14  Validation YAML + tests          (W9, 1 wk)
total: ~14 wk
```

---

## 6. Decision phrase

```text
V8_WORKFLOW_STATE_MACHINE_LIBRARY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-SM-1..14
NEXT_FILE: 11_V8_DOMAIN_AND_ROOT_CATALOG_v8.md
```
