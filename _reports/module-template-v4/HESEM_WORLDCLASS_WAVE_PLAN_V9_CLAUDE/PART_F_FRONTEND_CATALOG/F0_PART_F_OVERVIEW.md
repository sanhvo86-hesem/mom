# PART_F — FRONTEND CATALOG — Overview

Part F describes every UI surface HESEM renders to humans. Where Part E
describes APIs (the machine-facing edge), Part F describes what people
see and interact with.

This Part has 13 chapters: this overview plus 12 frontend chapters.

---

## 1. The 12 frontend chapters

```
F1   Shell and Navigation         (the chrome around all surfaces)
F2   Dashboard List Screens       (DL surfaces; dashboards, scorecards)
F3   Module List Screens          (ML surfaces; module-level lists)
F4   Workspace Projections        (WS surfaces; the most numerous)
F5   Authoritative Record Shells  (AR surfaces; record detail)
F6   Action Consoles              (AC surfaces; bulk-action consoles)
F7   Drawers and Dialogs          (NRD surfaces; non-routed transient UI)
F8   Sub-Flow Wizards             (SFW surfaces; multi-step processes)
F9   Frontend ↔ Backend Binding   (per-surface to API mapping)
F10  Design System and Tokens    (the visual language)
F11  Accessibility (WCAG 2.2 AA) (the discipline)
F12  Internationalization        (i18n + l10n discipline)
```

---

## 2. Per-chapter shape

Each frontend chapter follows the same shape:

```
1.  Surface class identity and overview
2.  Inventory of surfaces in this class (list of named surfaces)
3.  Per-surface description
4.  The data each surface displays (in plain words)
5.  The actions each surface offers (in plain words)
6.  The backend bindings (which APIs from PART_E)
7.  The cross-cutting concerns most relevant
8.  Wave target
9.  Decision phrase
```

---

## 3. Surface classes

HESEM uses 9 surface classes per the V7-carry-forward route grammar
(B1 + B6):

```
SH    Shell (the application chrome)
DL    Dashboard List
ML    Module List
WS    Workspace (projection-based)
AR    Authoritative Record Shell
AC    Action Console (bulk operations)
ERD   External Read (read-only embed of external content)
NRD   Non-Routed Drawer (transient dialog or drawer)
SFW   Sub-Flow Wizard (multi-step process)
```

The discipline (per B6 C1, C8): **WS surfaces never mutate**. Only AR
and AC may issue mutation commands. NRD and SFW execute through AR /
AC.

---

## 4. Per-surface description format

Each surface in Part F is described with:

- **Surface name** (canonical)
- **Surface class** (one of the 9)
- **Domain owner** (which PART_C chapter)
- **Purpose** (what the surface enables)
- **Data displayed** (in plain words; references PART_E projection or record APIs)
- **Actions offered** (in plain words; references workflow API E3 or E4)
- **Disabled controls** (when actions are forbidden by Authority Ledger)
- **Cross-references** (to PART_C capability, PART_D workflow,
   PART_E API)
- **Wave target**

---

## 5. The frontend ownership model

```
F1 Shell                       Frontend Lead (Platform Lead reviewer)
F2-F8 (per-surface chapters)  Per-domain lead
F9 Frontend ↔ Backend         API Lead + Frontend Lead joint
F10 Design System              Frontend Lead with Designer
F11 Accessibility              Frontend Lead
F12 i18n / l10n                Frontend Lead with Localization Lead
```

---

## 6. Reading order

```
F0  this overview            (3 min)
F1  Shell and Navigation     (8 min)
F2  Dashboard List Screens   (8 min)
F3  Module List Screens      (8 min)
F4  Workspace Projections    (15 min — the most numerous)
F5  Authoritative Record Shells (15 min — the most regulatory-critical)
F6  Action Consoles          (5 min)
F7  Drawers and Dialogs      (5 min)
F8  Sub-Flow Wizards         (8 min)
F9  Frontend ↔ Backend       (10 min — cross-reference master)
F10 Design System            (8 min)
F11 Accessibility            (8 min)
F12 i18n / l10n              (5 min)
```

Total: ~1.5 hours for full Part F absorption.

---

## 7. Decision phrase

```
PART_F_OVERVIEW_BASELINE_LOCKED
NEXT: F1_SHELL_AND_NAV.md
```
