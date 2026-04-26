# F7 — Drawers and Dialogs (NRD = Non-Routed Drawer)

```
surface_class:  NRD
owner_role:     Per-domain lead with Frontend Lead
```

---

## 1. Purpose

Drawers and Dialogs are transient UI surfaces — they appear, capture
input or display detail, then dismiss. They have no URL of their own
(they are non-routed); the user is conceptually "still on" the parent
surface.

---

## 2. Common types

```
- Confirmation Dialog            "Are you sure?" before destructive actions
- Error Dialog                    Render RFC 9457 problem detail to user
- E-Signature Drawer              Capture signature factors per challenge
- Reason-for-Change Dialog       Required prose justification per Annex 11
- Quick-Edit Drawer              Edit a few fields without full record shell
- Detail Drawer                   Show extended detail on hover or click
- Attachment Drawer               File upload + virus scan status
- Linked Records Drawer           Show related records without leaving
                                   parent
- Help Drawer                     Inline help, glossary, related docs
```

---

## 3. Discipline

NRD never has its own route. Closing the drawer returns the user to
the parent surface in its original scroll position and state.

NRD never mutates without going through E3.1 with proper Idempotency,
ETag, and signature handling. NRD is just a UI-side capture; the
mutation goes through Workflow API.

---

## 4. Wave target

NRD basics by W1 (existing HMV4 design system); per-feature NRDs as
features land.

---

## 5. Decision phrase

```
F7_DRAWERS_AND_DIALOGS_BASELINE_LOCKED
NEXT: F8_SUB_FLOW_WIZARDS.md
```
