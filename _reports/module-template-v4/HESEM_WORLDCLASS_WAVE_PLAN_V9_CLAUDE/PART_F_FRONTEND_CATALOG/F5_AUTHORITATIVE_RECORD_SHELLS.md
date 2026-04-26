# F5 — Authoritative Record Shells

```
surface_class:  AR
owner_role:     Per-domain lead
```

---

## 1. Purpose

Authoritative Record Shells are the per-record detail surfaces. They
display the full state of one specific authoritative record and offer
the actions (commands) that can be performed on it. These are the only
surfaces (along with AC and SFW) that may issue mutation commands.

---

## 2. Inventory of record shells

There is one Record Shell per resource family — approximately 95 total
across HESEM (per the root catalog in PART_M2). Each follows a common
pattern.

---

## 3. Common record shell pattern

Every Record Shell has:

### Header
- Record identifier (canonical id, sometimes a human-readable code)
- Record state (per state machine, with visual indicator)
- Owner / responsible party
- Last updated timestamp
- ETag (used internally for If-Match)
- Quick-action buttons (per current state and Authority Ledger entry)
- Authority class indicator
- Fresh / stale indicator (when projection-derived data shown)

### Tabs
Standard tabs across most record shells:
- **Overview**: summary fields and quick-view
- **Detail**: full field set
- **History / Audit**: audit trail (E6)
- **Linked**: related records (parents, children, peers)
- **Activity**: workflow events history (E3.3)
- **Evidence** (regulated): attached evidence records
- **Signatures** (regulated): captured signatures

Plus per-resource-family-specific tabs:
- For LOT: Genealogy tab (tree visualization)
- For BREL: Release Packet tab (assembled evidence)
- For FMEA: Structure Tree tab (failure mode hierarchy)
- For CAPA: Effectiveness tab (recurrence tracking)
- For NQCASE: Disposition tab (MRB linkage if applicable)
- For ECO: Impact Analysis tab
- For Equipment: Calibration tab + MWO tab + OEE tab
- For Training Course: Audience tab + Compliance tab

### Action area
- Per-state contextual actions (e.g., "Submit for Review," "Approve,"
  "Reject," "Reassign," "Close")
- Disabled state with tooltip when forbidden by Authority Ledger /
  guards
- Confirmation dialog before destructive actions (NRD)
- E-signature capture flow (NRD) for regulated transitions

---

## 4. Action submission flow

When user clicks an action button:
1. Frontend calls /can endpoint (E1.7) to verify permission and
   obligation requirements.
2. If e-signature obligated: launch E-signature challenge (E7) in NRD.
3. Capture signature factors per challenge.
4. Compose command envelope.
5. Submit via Workflow API (E3.1) with Idempotency-Key, If-Match,
   signature envelope.
6. On success: refresh record shell with new state, new ETag.
7. On failure: surface RFC 9457 problem-detail with localized title and
   detail.

---

## 5. Backend bindings

- Record APIs (E4) for the record itself.
- Workflow API (E3) for command submission.
- Audit API (E6) for the History tab.
- Evidence API (E8) for the Evidence tab.
- E-Signature API (E7) for action obligation flow.
- AI Advisory API (E9) for embedded advisory features.

---

## 6. Cross-cutting concerns

All 12 cross-cutting concerns apply heavily to Record Shells. The most
critical:
- C1 Audit chain (every action produces audit event)
- C2 E-signature (regulated actions)
- C5 Idempotency (every mutation)
- C6 Concurrency (ETag / If-Match)
- C7 Problem details (every failure)
- C12 Accessibility (record shells must be keyboard-navigable)

---

## 7. Wave target

Record Shells graduate per their root capability. Existing HMV4 baseline
includes NQCASE record shell (Slice 2). Most others by W3-W7.

---

## 8. Decision phrase

```
F5_AUTHORITATIVE_RECORD_SHELLS_BASELINE_LOCKED
NEXT: F6_ACTION_CONSOLES.md
```
