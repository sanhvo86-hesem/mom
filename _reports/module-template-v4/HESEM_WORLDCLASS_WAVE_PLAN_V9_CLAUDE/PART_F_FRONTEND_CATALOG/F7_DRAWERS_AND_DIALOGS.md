# F7 — Drawers and Dialogs (NRD = Non-Routed Drawer)

```
surface_class:  NRD (Non-Routed Drawer + Dialog)
owner_role:     Per-domain lead with Frontend Lead
sources:        WAI-ARIA 1.2 dialog pattern, WCAG 2.2 SC 2.4.11
                Focus Not Obscured, Material Design + Apple HIG
                modal patterns, OWASP UI security
```

NRDs are transient UI surfaces — they appear, capture input or
display detail, then dismiss. They have no URL of their own (the
user is conceptually still on the parent surface). They carry every
high-friction interaction in the regulated UI: confirmations, error
detail, e-signature capture, reason-for-change capture, quick-edit,
linked records.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Confirmation dialog                    full-page surface (per F4)
Error dialog (RFC 9457 render)          authoritative record (per F5)
E-signature drawer (per E7)             action console (per F6)
Reason-for-change dialog                wizard (per F8)
Quick-edit drawer                        background notification (per
Detail drawer (hover / click)            in-app inbox)
Attachment drawer (E12)
Linked-records drawer
Help / glossary drawer
AI advisory drawer (per E9)
History / audit-trail drawer
Banned-decision warning dialog
Concession-addendum dialog (D5 + D7)
Per-pack drawer (PSUR section;
 APR section; FAI characteristic;
 PPAP element; HACCP CCP)
```

---

## 2. NRD types catalog

### 2.1 Confirmation dialog

```
PURPOSE                            "Are you sure?" before
                                  destructive / regulated action
PATTERN                            primary CTA + secondary cancel;
                                  destructive action red;
                                  regulated action requires reason
                                  text minimum length;
                                  per L1 §6 friction calibration
                                  for Tier-1 actions
A11Y (per F11)                       role=dialog + aria-modal=true;
                                  focus trapped + restored;
                                  ESC closes;
                                  per WCAG SC 2.4.11
EVIDENCE EMIT                       on confirm: per E3 envelope
                                  + reason text
```

### 2.2 Error dialog (RFC 9457 render)

```
PURPOSE                            render server problem-detail to
                                  user (per RFC 9457)
PATTERN                            title + status code + plain-
                                  language explanation +
                                  cause chain (where helpful) +
                                  suggested action;
                                  retry button if applicable;
                                  link to support
A11Y                                  aria-live=assertive for SEV-1
                                  errors;
                                  full focus management
EVIDENCE EMIT                       error_view (EC-22 sampled)
```

### 2.3 E-signature drawer

```
PURPOSE                            capture per E7 challenge factors
PATTERN                            per E7 obligation:
                                  manifestation text (per regulator
                                  + per language);
                                  factor inputs (TOTP / WebAuthn /
                                  HSM card) per AAL;
                                  reason-text (required for
                                  regulated);
                                  countdown to challenge expiry;
                                  per pack: QP / PRRC / DOA /
                                  ITAR person-of-record
A11Y                                  multi-step focus discipline;
                                  countdown announced via aria-
                                  live;
                                  hardware-token assist (per F11)
EVIDENCE EMIT                       per E7 signature_record
SPECIAL                              banned-decision: AI principal
                                  drawer rejected pre-emptively
                                  (per L1 §4)
```

### 2.4 Reason-for-change dialog

```
PURPOSE                            per Annex 11 §10 + per H7 +
                                  per L1 §6 friction calibration
PATTERN                            text area with minimum length
                                  (per quorum policy);
                                  optional dropdown of common
                                  reasons (per pack);
                                  per language localization
EVIDENCE EMIT                       reason_text (EC-22 +
                                  cross-link)
```

### 2.5 Quick-edit drawer

```
PURPOSE                            edit a few fields without full
                                  record shell (per F5)
PATTERN                            per-field validation;
                                  save calls E3 with ETag;
                                  cancel discards;
                                  unsaved-changes guard
EVIDENCE EMIT                       per E3 envelope
```

### 2.6 Detail drawer

```
PURPOSE                            show extended detail on hover /
                                  click without navigation
PATTERN                            non-modal slide-out;
                                  read-only;
                                  may include CTAs that escalate
                                  to full record shell (per F5)
A11Y                                  semantic heading hierarchy;
                                  preview-only; not announced as
                                  modal
```

### 2.7 Attachment drawer

```
PURPOSE                            file upload (per E12) +
                                  virus scan status display +
                                  metadata
PATTERN                            drag-and-drop + browse;
                                  pre-flight rejection (size,
                                  mime, region pinning);
                                  upload progress;
                                  scan status polling;
                                  per-pack content inspection
                                  (e.g., ITAR keyword;
                                  biocompatibility parse)
EVIDENCE EMIT                       upload_event (per E12)
```

### 2.8 Linked-records drawer

```
PURPOSE                            show related records without
                                  leaving parent
PATTERN                            tabbed sub-sections per
                                  related-record kind;
                                  per-link freshness indicator
                                  (per F4 + F5);
                                  cross-domain navigation aware
                                  (no cross-tenant leakage per
                                  B6 C5)
A11Y                                  proper landmark + heading;
                                  keyboard navigable
```

### 2.9 Help / glossary drawer

```
PURPOSE                            inline help, glossary, related
                                  docs (per D7)
PATTERN                            search;
                                  per-pack knowledge base;
                                  language per F12;
                                  links to controlled docs
EVIDENCE EMIT                       help_view (EC-22 sampled)
```

### 2.10 AI advisory drawer

```
PURPOSE                            present AI advisory per E9
                                  with confidence + citations +
                                  counter-evidence
PATTERN                            per L1 §10 communication:
                                  source ("AI suggestion" with
                                  model name + version);
                                  confidence (high / medium / low
                                  per L2 §4);
                                  rationale (top reasons);
                                  counter-evidence (top reasons
                                  against);
                                  linked evidence (records the AI
                                  considered);
                                  action options (approve /
                                  override / defer / ask AI to
                                  recompute);
                                  disclosure that user owns
                                  decision (per L1 §1)
EVIDENCE EMIT                       advisory_render (EC-25);
                                  on disagree: override capture
                                  (EC-24)
SPECIAL                              banned-decision: AI cannot
                                  commit; UI clearly shows
                                  human-only path
```

### 2.11 History / audit-trail drawer

```
PURPOSE                            show audit trail per record
                                  (per E6.2)
PATTERN                            time-ordered events with
                                  filters; per-event detail click
                                  (drill into E6.1)
A11Y                                  table semantics; sortable
                                  columns
```

### 2.12 Banned-decision warning dialog

```
PURPOSE                            inform user about banned-decision
                                  context (per L1 §1 + §10)
PATTERN                            shown when AI suggests something
                                  related to banned-set;
                                  emphasizes human authority;
                                  no AI auto-commit;
                                  per pack: BD-N specific
                                  vocabulary
A11Y                                  prominent; high-contrast;
                                  cannot be dismissed without
                                  acknowledgment
```

### 2.13 Concession-addendum dialog

```
PURPOSE                            capture concession evidence per
                                  D5 + D7
PATTERN                            scope (lot / quantity / period);
                                  rationale text;
                                  customer-acceptance reference;
                                  multi-party signoff path (per
                                  E7)
EVIDENCE EMIT                       concession_addendum (EC-10)
```

### 2.14 Per-pack drawers

```
PHARMA (J1)                      PSUR section drawer;
                                 APR section drawer;
                                 deviation drawer (per SM-DEV);
                                 stability pull drawer
AUTO (J2)                        PPAP element drawer (per of 18);
                                 LPA finding drawer;
                                 8D step drawer (per D1-D8)
AERO (J3)                        FAI characteristic drawer;
                                 NADCAP cert drawer;
                                 counterfeit suspect drawer;
                                 ITAR access drawer
MD (J4)                          DHF section drawer;
                                 vigilance event drawer;
                                 risk-control drawer
FOOD (J5)                        HACCP CCP excursion drawer;
                                 §204 KDE drawer;
                                 sanitation finding drawer
```

---

## 3. Discipline

```
NO ROUTE                          NRD never has its own URL;
                                 closing returns to parent
                                 surface in original state
                                 + scroll position
ATOMIC INTERACTION                 single coherent task;
                                 if multi-step, escalate to
                                 wizard (per F8)
NO DIRECT MUTATION                  always goes through E3 with
                                 idempotency + ETag + signature
                                 (per F9 binding)
KEYBOARD-FIRST                       full coverage per F11;
                                 ESC closes; tab order logical
ACCESSIBLE                            WCAG 2.2 AA per F11;
                                 SC 2.4.11 focus visible
RESTORATION                            on close: focus returns to
                                 trigger element;
                                 parent state preserved
NESTED-DIALOG DISCIPLINE              avoid; if needed, prior
                                 dialog dimmed inert
TENANT BOUNDARY                         no cross-tenant data
                                 (per B6 C5)
PII REDACTION                          per role; drawer respects
                                 visible-field policy
I18N                                     per F12;
                                 RTL layout where applicable
RESPONSIVE                                mobile + tablet support
                                 (drawer becomes full-screen)
DARK MODE                                  per design tokens (per
                                 F10)
DENSITY                                    per design tokens
PERFORMANCE                                  open / close < 100ms;
                                 no layout thrash
```

---

## 4. Cross-cutting concerns

```
PROBLEM DETAILS RENDERING        per RFC 9457; cause chain
                                 expandable; technical detail
                                 collapsed by default
LIVE-DATA UPDATE                  drawer subscribes to E3 / E5
                                 events;
                                 conflict-detection on save
                                 (ETag mismatch → re-load)
A11Y (per F11)                    role=dialog + aria-modal=true
                                 + aria-labelledby +
                                 aria-describedby + focus trap +
                                 focus restore;
                                 background inert
I18N (per F12)                     drawer content localized;
                                 RTL layout; per-pack vocabulary
DESIGN TOKENS (per F10)            no hardcoded colors / sizes /
                                 spacing
EVIDENCE EMIT                       per drawer type
DEPRECATION                          drawer retirement is H7 Class
                                 B+ per ADR-0009
```

---

## 5. Per-tier UX

```
CORE / PRO TIER                  baseline NRD experience;
                                 per pack
ENTERPRISE                         per CSR overlay (custom
                                 manifestations; reason-text
                                 patterns)
SOVEREIGN                          ITAR-aware drawers (segregated
                                 storage region; person-of-record
                                 verification)
PILOT                               full feature; logging more
                                 verbose
```

---

## 6. Failure modes

```
FM1   Drawer trapped focus (escape disabled)
      Recovery: per F11 mandatory ESC;
              CI a11y check per I1

FM2   Drawer mutation bypassing E3
      Recovery: code review;
              CI lint;
              per F9 binding validation

FM3   Cross-tenant data leak in detail / linked drawer
      Recovery: per B6 C5; SEV-1; H8 systemic

FM4   AI advisory drawer rendered without override-capture
      Recovery: per L1 §5; H8 systemic

FM5   E-sig drawer expires mid-fill
      Recovery: per E7 §1.1 challenge expiry;
              re-initiate

FM6   Cancel discards unsaved with no warning
      Recovery: unsaved-changes guard mandatory

FM7   Drawer translation missing
      Recovery: per F12; English fallback per
              regulator allow

FM8   Drawer uses hardcoded color (Graphics Authority bypass)
      Recovery: per F10 + ADR-0009;
              CI lint;
              re-tokenize
```

---

## 7. Wave target

```
W1        baseline NRD (existing HMV4 design system);
          confirmation, error, attachment, help
W3        e-signature + reason-for-change drawers
          (regulated)
W4        quick-edit + detail + linked-records
W5        history / audit-trail drawer
W7        AI advisory drawer (per L2 features ramping)
W8        banned-decision warning + concession-addendum
          per regulated
W10       per-pack drawers (J1..J5)
W12       sovereign region UI variants
```

---

## 8. Cross-references

- F0 — pattern catalog
- F4 + F5 + F6 — parent surfaces invoking drawers
- F8 — wizard (multi-step alternative)
- F9 — frontend↔backend binding (E3 + E5 + E7)
- F10 — design tokens
- F11 — accessibility (canonical)
- F12 — i18n
- E3 + E7 + E8 + E9 + E12 — APIs invoked
- H4 — evidence emit
- L1 §1 + §6 + §10 — banned-decision boundary + friction +
  AI communication
- L2 §4 — confidence threshold
- M9 — cross-reference

---

## 9. Decision phrase

```
F7_DRAWERS_AND_DIALOGS_BASELINE_LOCKED
NEXT: F8_SUB_FLOW_WIZARDS.md
```
