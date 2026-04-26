# F9 — Frontend ↔ Backend Binding

```
chapter_purpose: master cross-reference table from each UI surface to
                 its backing API endpoints
owner_role:      API Lead with Frontend Lead (joint)
```

---

## 1. Purpose

This chapter is the master cross-reference: for every UI surface in
PART_F, which API endpoints in PART_E does it call. This is the
contract that tells:
- Frontend engineers what APIs to call
- Backend engineers what APIs the frontend depends on
- API Lead what backward-compat to maintain
- QA team what to test together

---

## 2. The binding pattern

For every surface, the binding lists:

```
Surface name
  → On render:           which APIs are called for initial load
  → On user action:       which APIs are called for each action
  → On background poll:   which APIs are called for live updates
  → On error:             how problem-detail is rendered
```

---

## 3. Worked examples

### Example 1 — NQCASE Workspace (WS-36)

```
NQCASE Workspace (existing HMV4 Slice 2 baseline)
  On render:
    → E5 Workspace Projection API (NQ Case projection)
    → E1.7 /can endpoint (to determine which actions to enable)
  On filter change:
    → E5 (with new filter)
  On row click:
    → Navigate to NQCASE Record Shell (F5)
  On bulk-action select:
    → E5 (multi-select handles)
    → On submit: E11.3 Bulk Operation API
  On background poll (every 30 seconds):
    → E5 (refresh)
```

### Example 2 — NQCASE Record Shell (F5 example)

```
NQCASE Record Shell
  On render:
    → E4 Record API for NQ Case (single record)
    → E1.7 /can endpoint
    → E6.2 Audit API (audit tab data)
    → E8.2 Evidence API (evidence tab data)
    → E3.3 Workflow API (transition history)
    → E9.1 AI Advisory API (NC similarity inline)
  On "Dispose - Reject" action:
    → E1.7 /can with action='dispose_reject'
    → E7.1 e-signature challenge initiate
    → User captures factors via E7.2
    → E7.3 compose envelope
    → E3.1 Workflow command submit (with envelope)
    → On success: refresh record (E4) with new ETag and state
    → On failure: render RFC 9457 problem detail
```

### Example 3 — BREL Release Wizard (F8 example, regulated)

```
BREL Release Wizard (Pharma vertical pack)
  Step 1 (Scope):
    → E4 Lot record + E5 release-readiness projection
    → E8.6 Evidence freshness query
  Step 2 (Evidence chain):
    → E8.2 Evidence API for required artifacts
    → Display per-evidence-class status
  Step 3 (Two-person e-signature):
    → E7.1 challenge initiate (factor_count=2, signers=2)
    → User 1 captures factors (E7.2)
    → User 2 captures factors (E7.2)
    → E7.3 compose envelope
  Step 4 (Submit):
    → E3.1 Workflow command BREL_APPROVE_RELEASE
    → On success: BREL state → released; lot status → released-for-shipment
    → DSCSA event published (E15.9)
    → Audit chain extension (E6 internal)
```

---

## 4. The full binding table

The full per-surface binding is large (40+ workspaces × multiple APIs
each). Rather than enumerate inline, the table lives at:

```
Per-domain bindings: in PART_C chapters under "APIs the domain exposes"
Per-API bindings:    in PART_E chapters under "Audience"
Cross-reference:     in PART_M (M9 cross-reference index)
```

This chapter establishes the pattern; the per-surface specifics live in
the source chapters.

---

## 5. Backward-compatibility discipline

When a backend API changes:
- Frontend Lead is notified via the API change announcement.
- Backward-compatible changes (additive): no frontend change required.
- Backward-incompatible changes: frontend updates planned per the API
  deprecation window (typically 6 months).

When a frontend surface needs a new backend capability:
- Frontend Lead opens an API request to API Lead.
- API change reviewed for breaking-change impact.
- New endpoint or new field added per OpenAPI 3.1.1 conventions.

---

## 6. Wave target

Bindings are documented per wave per slice. Existing HMV4 baseline
includes Slice 1 (Dispatch) and Slice 2 (NQCASE) bindings. New slices
add their bindings as they graduate per V3 RULE-1.

---

## 7. Decision phrase

```
F9_FRONTEND_BACKEND_BINDING_BASELINE_LOCKED
NEXT: F10_DESIGN_SYSTEM_AND_TOKENS.md
```
