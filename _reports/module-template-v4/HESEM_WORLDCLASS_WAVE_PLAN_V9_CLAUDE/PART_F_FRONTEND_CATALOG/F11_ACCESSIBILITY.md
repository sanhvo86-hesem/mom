# F11 — Accessibility (WCAG 2.2 Level AA)

```
chapter_purpose: WCAG 2.2 AA compliance discipline for every UI surface
owner_role:      Frontend Lead
```

---

## 1. Purpose

WCAG 2.2 Level AA is the legal accessibility requirement in the EU and
Canada and the de-facto requirement in the US for B2B software. HESEM
honors WCAG 2.2 AA on every UI surface.

---

## 2. The four WCAG principles applied

### Perceivable
- Text alternatives for non-text content (alt attributes on images,
  transcripts on audio/video)
- Time-based media: captions, audio descriptions
- Adaptable: information presented in multiple forms (e.g., color +
  icon + text for status)
- Distinguishable: color contrast 4.5:1 (text), 3:1 (large text);
  no information conveyed by color alone

### Operable
- Keyboard accessible: every action achievable with keyboard alone
- Enough time: no time-out without warning; user can extend
- Seizures and physical reactions: no flash > 3Hz
- Navigable: skip links, page titles, focus visible
- Input modalities: no excess fine motor demand

### Understandable
- Readable: language declared in HTML lang attribute
- Predictable: navigation consistent; same labels for same things
- Input assistance: error identification clear; labels associated;
  error suggestions; error prevention for legal / financial /
  data-modification

### Robust
- Compatible with assistive technologies: ARIA where semantic HTML
  insufficient; consistent across screen readers (NVDA, JAWS,
  VoiceOver)

---

## 3. Discipline per surface

Every new UI surface (or change to an existing one):
- Authored with semantic HTML (headings hierarchy, landmarks, lists)
- ARIA roles and labels where semantic HTML is insufficient
- Keyboard-tested (no mouse): full coverage
- Focus visible (per ADR-0009 carry-forward in CLAUDE.md)
- Color contrast verified 4.5:1 / 3:1
- Screen-reader-tested (representative test on NVDA, JAWS, VoiceOver)
- Reduced motion respected (prefers-reduced-motion)
- Right-to-left layout supported (W10 vertical pack expansion)

---

## 4. CI gate

axe-core integration in CI. Threshold: zero serious + zero critical
violations. Build fails on violation.

Manual screen-reader testing per release on representative paths.

---

## 5. Annual audit

Annual third-party accessibility audit. Findings flow to CAPA (D6).

---

## 6. Wave target

WCAG 2.2 AA compliance discipline from W0 (existing HMV4 baseline). All
new surfaces must comply. Annual audit from W8.

---

## 7. Decision phrase

```
F11_ACCESSIBILITY_BASELINE_LOCKED
NEXT: F12_INTERNATIONALIZATION.md
```
