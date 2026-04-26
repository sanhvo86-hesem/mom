# F11 — Accessibility

```
chapter_purpose: WCAG 2.2 Level AA compliance discipline for every
                 UI surface; per-surface technique catalog;
                 assistive-technology test matrix; CI gate;
                 annual audit cadence; per-pack overlay (medical
                 device usability per IEC 62366)
owner_role:      Frontend Lead with Quality Lead
sources:         WCAG 2.2 (W3C 2023), WAI-ARIA 1.2, EN 301 549
                 (EU public sector accessibility), ADA + Section
                 508 (US), EAA (EU 2019/882, effective Jun 2025),
                 IEC 62366-1:2015 (medical device usability),
                 ISO 9241-171, AODA (Ontario)
```

WCAG 2.2 Level AA is the legal accessibility floor in the EU
(EAA + EN 301 549) and Canada (AODA), de-facto in the US for B2B
SaaS. HESEM honors it on every UI surface, with deeper IEC 62366
usability discipline for the Med Device pack.

---

## 1. Scope

```
EVERY UI SURFACE                portal, embedded portal, edge
                                gateway local UI, audit pack export,
                                customer auditor portal
EVERY USER PATH                  authenticated user (operator,
                                 supervisor, manager, admin),
                                 customer auditor, regulator
EVERY VIEWPORT                    desktop ≥ 1024px, laptop, tablet,
                                 mobile-responsive where applicable
EVERY THEME                       light + dark + density variants
EVERY LANGUAGE                    per F11 (i18n) + F12; LTR + RTL
PAPER OUTPUT                      printable evidence + audit pack
                                 readability for auditor
```

The scope includes the printed audit pack since auditors who request
hardcopy must still be able to read it.

---

## 2. The four WCAG principles applied

### 2.1 Perceivable

```
TEXT ALTERNATIVES                alt on images; transcript on audio /
                                 video; aria-label on icon-only
                                 controls; descriptive aria-labelledby
                                 on charts + dashboards
TIME-BASED MEDIA                  captions on training video; audio
                                 description optional but desirable
ADAPTABLE                         information presented in multiple
                                 forms — status conveyed by color +
                                 icon + text; meaning preserved when
                                 stylesheet stripped; sequence
                                 logical when read by AT
DISTINGUISHABLE                   color contrast 4.5:1 (normal text)
                                 / 3:1 (large text + UI components);
                                 NO information by color alone;
                                 background ≥ 3:1 separation;
                                 reflow at 320px width; text spacing
                                 adjustable; non-text elements ≥ 3:1
                                 contrast (focus indicator, icon,
                                 chart datapoint)
TARGET SIZE (2.5.8 + 2.5.5)       ≥ 24×24 CSS px for primary actions
                                 (WCAG 2.2 minimum); ≥ 44×44 desired
                                 (best practice; per Apple HIG)
PREFERS-REDUCED-MOTION             motion suppressed when user prefers
PREFERS-CONTRAST                   high-contrast mode honored
PREFERS-COLOR-SCHEME               dark mode honored
```

### 2.2 Operable

```
KEYBOARD ACCESSIBLE               every action achievable via keyboard
                                  alone; tab order logical; no
                                  keyboard trap (escape always works)
ENOUGH TIME                        no time-out without warning + user
                                  can extend; user can pause /
                                  stop / hide moving content
SEIZURES                          no flash > 3 Hz; threshold tested
NAVIGABLE                          skip links to main + nav + footer;
                                  page title unique + meaningful;
                                  focus visible always; multiple
                                  ways to find a page (search +
                                  nav + sitemap); link purpose clear
                                  in context; section headings
                                  describe content
INPUT MODALITIES                   click target ≥ minimum; pointer
                                  cancellation (release-cancel allowed);
                                  label + name match (visible label
                                  matches accessible name); motion
                                  actuation alternatives (no
                                  shake-to-undo as sole input);
                                  drag-only ops have non-drag alternative
                                  (WCAG 2.2 SC 2.5.7)
DRAGGING (WCAG 2.2 SC 2.5.7)        non-drag alternative provided for
                                  every drag-only operation
ACCESSIBLE AUTHENTICATION (WCAG
   2.2 SC 3.3.8)                    no pure cognitive function test
                                  (e.g., no recall puzzles); except
                                  recognition + alternatives;
                                  paste-allowed; password fields
                                  per practice
```

### 2.3 Understandable

```
READABLE                           lang declared on <html> + per
                                  region; abbreviations expanded;
                                  unusual word definitions
PREDICTABLE                        navigation consistent across pages;
                                  same labels for same things;
                                  no auto-context-change without
                                  explicit user action
INPUT ASSISTANCE                    error identified + announced;
                                  labels + instructions associated;
                                  error suggestions; for legal /
                                  financial / data-modifying actions:
                                  reversible OR confirmation OR
                                  reviewable; redundant entry
                                  not required (WCAG 2.2 SC 3.3.7)
                                  consistent help (WCAG 2.2 SC 3.3.5)
```

### 2.4 Robust

```
COMPATIBLE                          semantic HTML preferred; ARIA where
                                  semantic insufficient; consistent
                                  across screen readers (NVDA, JAWS,
                                  VoiceOver, TalkBack); status messages
                                  announced via aria-live (WCAG SC
                                  4.1.3); name + role + value
                                  programmatically determinable
```

---

## 3. WCAG 2.2 specific updates (over 2.1)

```
SC 2.4.11 Focus Not Obscured (Min)        focus indicator must be
                                          at least partially visible
SC 2.4.12 Focus Not Obscured (Enh)         focus fully visible (AAA)
SC 2.5.7 Dragging Movements                non-drag alternative
SC 2.5.8 Target Size (Min)                  ≥ 24×24 CSS px
SC 3.2.6 Consistent Help                    help mechanism in same
                                          place across views
SC 3.3.7 Redundant Entry                    not required to re-enter
                                          info already provided
SC 3.3.8 Accessible Authentication (Min)    no cognitive test alone
SC 3.3.9 Accessible Authentication (Enh)    no cognitive function
                                          test even with alternatives
                                          (AAA)
```

---

## 4. Per-surface technique catalog

### 4.1 Dashboard (DL)
```
- Landmark <main> + <nav> + <aside>
- KPI tiles: aria-labelledby links headline + value + delta
- Color-coded delta + arrow icon + numeric label
- Drill-down via keyboard (Enter on focused tile)
- Skip link to main content
```

### 4.2 Module list (ML)
```
- Table semantic <table> with <thead> + <tbody> + scope
- Sortable columns: aria-sort=ascending/descending/none
- Filter chips: aria-pressed for toggle state
- Pagination: aria-label="page X of Y"
- Empty state: descriptive + actionable
- Keyboard navigation between rows + cells
```

### 4.3 Workspace (WS)
```
- Tabbed regions: role=tablist + role=tab + role=tabpanel
- Live data: aria-live=polite for non-critical; assertive for
  critical (e.g., regulated alert)
- Charts: data table fallback; aria-label summary
- Time-series: described tendency in text alongside chart
- Real-time refresh: not below 5 sec to avoid AT disruption
```

### 4.4 Authoritative Record (AR)
```
- Form fields: <label for="..."> always
- Required: aria-required="true"; visual asterisk + screen-reader
  text
- Inline error: aria-invalid + aria-describedby pointing to
  error message
- Sectioned form: <fieldset> + <legend> per section
- Save state: aria-live announces "saved" / "unsaved"
- Approve / sign action: confirmation pattern + reason text
  required (per L1 §6 friction calibration)
```

### 4.5 Action Console (AC)
```
- Real-time stream: aria-live=polite to announce arrivals
- Filter + acknowledge: keyboard-first
- Sound alert: optional + visual alert always
```

### 4.6 Drawers + Dialogs (per F7)
```
- Modal: role=dialog + aria-modal=true + aria-labelledby +
  aria-describedby
- Focus: trapped inside dialog; restored to trigger on close
- Close: ESC always; visible close button always
- Background: inert (focus + screen-reader cannot reach)
```

### 4.7 Sub-flow Wizards (per F8)
```
- Step indicator: aria-current="step"
- Step navigation: previous + next buttons; keyboard
- Validation per step: errors announced before navigation
- Complete state: progress + summary clear
```

### 4.8 Tables of regulated records
```
- Caption summarizing scope
- Headers (column + row scope)
- Filter state announced as live region update
- Bulk select: aria-checked tri-state for header
- Action menu per row: keyboard-discoverable
```

### 4.9 Charts (KPI dashboards)
```
- Title + summary as text near chart
- Data table fallback below or in expandable
- Color blind safe palette (no red-green sole distinction)
- Export to CSV / PDF available
- Keyboard navigation between data points
```

### 4.10 Edge gateway local UI
```
- Same WCAG floors as portal
- Touch-friendly target (≥ 44×44)
- High contrast mode for shopfloor lighting
- Glove mode (larger targets) toggleable
- Screen reader less common on shopfloor; visual alerts critical
```

---

## 5. Test matrix

```
TEST                                  CADENCE             METHOD
Automated axe-core CI                  per PR              fail on
                                                            serious + critical
Lighthouse                              per PR              warning
ASLint / pa11y                           weekly              dashboard
Manual keyboard                          per release         representative paths
Manual screen reader                     per release         NVDA + JAWS + VoiceOver
Manual high-contrast mode                per release         visual review
Manual reduced motion                    per release         video toggle
Manual zoom 200%                          per release         representative paths
Mobile + tablet                           per release         touch targets
Annual third-party audit                 annual              accredited firm
Per-pack usability (IEC 62366; MD)         per device         summative test
Multi-cultural review (RTL,                quarterly per
   non-Latin)                              language ramp
```

---

## 6. CI gate

```
THRESHOLD                       0 serious + 0 critical axe-core findings
                                 0 axe-core regression compared to baseline
PR EXIT                          fail PR on regression
EXEMPTION                        pre-approved + ticketed exemption
                                 (e.g., third-party widget); never
                                 for new code
PRE-PRODUCTION CHECK              full a11y scan part of W1 gate
PER-RELEASE                       Lighthouse + axe-core + manual sample
PER-WAVE                           comprehensive per W1, W4, W6, W8
PER-PACK                            pack-specific manual review at GA
```

---

## 7. Annual audit

```
SCOPE                             every primary user path; every pack
                                  enabled
AUDITOR                            accredited third-party (e.g.,
                                  Deque, Level Access, Knowbility)
DELIVERABLE                        report; severity-ranked findings
ROUTE TO CAPA                      every Major+ → CAPA per H8
EVIDENCE                            retained per H4 + H5 (a11y_audit
                                  EC sub-type if needed)
TENANT-FACING                       attestation + summary in CVLP
```

---

## 8. Per-pack overlay

```
MED DEVICE (J4)                  IEC 62366 usability engineering
                                  per device; formative + summative
                                  testing; UEF (Usability
                                  Engineering File) per device;
                                  feeds risk file (ISO 14971)
PHARMA (J1)                       multi-language label rendering;
                                  EU + ROW
AUTO (J2)                         per-OEM CSR may demand a11y
AERO (J3)                         per FAA ADA-equivalent; per
                                  contractor accessibility clauses
FOOD (J5)                          consumer-facing label (per FALCPA
                                  / EU 1169/2011) — different layer
GOVT / PUBLIC SECTOR              EN 301 549 (EU); ADA + Section
                                  508 (US); CALACT; AODA
SOVEREIGN                          per agreement
```

---

## 9. Evidence emission (per H4)

```
EVIDENCE                              CLASS
Automated CI scan run                  EC-1 validation subtype a11y
Manual review record                   EC-1 validation subtype a11y
Annual audit report                    EC-1 + signed by Quality Lead
                                       (per H7)
Findings + remediation                 EC-14 CAPA
Customer-facing attestation             part of CVLP; per H2 §14
```

---

## 10. Failure modes

```
FM1   Regression introduces serious finding
      Recovery: PR fails; engineer remediates; review

FM2   New surface skipped a11y review
      Recovery: pre-release readiness gate per H7; cannot ship

FM3   Annual audit overdue
      Recovery: H6 surfaces; H8 CAPA; certification at risk
              for tenants requiring third-party attestation

FM4   Customer-side a11y findings (post-release)
      Recovery: per CSM; per H8 CAPA; tenant communication

FM5   IEC 62366 summative test missed (MD pack)
      Recovery: device cannot ship per pack; per J4 + H8
              CAPA

FM6   Screen reader regression undiscovered for one cycle
      Recovery: manual cadence increased; H8 CAPA on test
              matrix coverage
```

---

## 11. Roles and authority (RACI)

```
Role                  AUTHOR  REVIEW  CI-GATE  ANNUAL  PACK  CAPA
Frontend Lead         A       A       A        R       R     R
Quality Lead          C       C       C        A       C     A
Compliance Lead       C       C       C        A       C     C
Engineering Lead      R       C       R        C       C     C
Vertical Pack Ld      C(pack) C(pack) C        R(pack) A(pack) C
Domain Lead           R       R       -        -       -     -
External Auditor      -       -       -        R       -     -
Customer (DPO + Quality) I    -       -        I       -     -
```

---

## 12. Cross-references

- F0 — pattern catalog (per surface)
- F1..F8 — per-pattern accessibility considerations
- F9 — frontend-backend binding (announce server-state changes)
- F10 — design system tokens drive contrast + size
- F12 — i18n + RTL
- H4 — a11y_audit evidence
- H7 — pre-release a11y gate
- H8 — CAPA path
- J4 — IEC 62366 overlay
- M9 — cross-reference

---

## 13. Decision phrase

```
F11_ACCESSIBILITY_BASELINE_LOCKED
NEXT: F12_INTERNATIONALIZATION.md
```
