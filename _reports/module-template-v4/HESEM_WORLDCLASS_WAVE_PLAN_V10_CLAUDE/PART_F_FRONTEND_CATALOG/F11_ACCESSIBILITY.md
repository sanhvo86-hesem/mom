# F11 — Accessibility

```
chapter_purpose: WCAG 2.2 Level AA compliance discipline for every
                 UI surface; complete success-criterion compliance
                 matrix; WAI-ARIA 1.2 per-pattern role catalog;
                 IEC 62366 usability engineering for J4 Medical
                 Device pack; EN 301 549 for EU commercial customers;
                 ADA/Section 508 for US regulated tenants; per-surface
                 technique catalog; automated + manual test matrix;
                 CI gate; annual audit cadence.
owner_role:      Frontend Lead with Quality Lead and Compliance Lead
standards:       WCAG 2.2 (W3C 2023-10-05), WAI-ARIA 1.2 (W3C 2023),
                 EN 301 549 v3.2.1 (ETSI 2021), ADA Title III,
                 Section 508 (Revised 2017), AODA (O.Reg 191/11),
                 IEC 62366-1:2015+AMD1:2020, ISO 14971:2019,
                 EAA (EU Directive 2019/882, enforcement Jun 2025)
```

WCAG 2.2 Level AA is the legal accessibility floor for HESEM across
the EU (EAA + EN 301 549), Canada (AODA), and US regulated tenants
(ADA Title III + Section 508). Selective WCAG 2.2 AAA criteria apply
for J4 Medical Device surfaces under IEC 62366 summative scope and for
J1 Pharma patient-instruction surfaces where EU MDR applies. This
chapter defines the exact compliance posture, per-criterion techniques,
per-surface ARIA patterns, test matrix, CI gate, and annual audit
cadence in sufficient detail to serve as the engineering source-of-truth.

---

## 1. Standards Baseline

### 1.1 WCAG 2.2 AA — Mandatory for All Surfaces

WCAG 2.2 (published 2023-10-05) supersedes WCAG 2.1 as the normative
standard. Every HESEM UI surface — portal, embedded portal, edge
gateway local UI, customer auditor portal, printed evidence export —
must satisfy all Level A and Level AA success criteria. There are no
surface-level exemptions. Third-party embedded widgets that cannot be
made conformant must be declared in the accessibility conformance
statement with documented compensatory controls.

WCAG 2.2 introduces eight new success criteria over 2.1:
- 2.4.11 Focus Not Obscured (Minimum) — AA
- 2.4.12 Focus Not Obscured (Enhanced) — AAA
- 2.5.7 Dragging Movements — AA
- 2.5.8 Target Size (Minimum) — AA
- 3.2.6 Consistent Help — AA
- 3.3.7 Redundant Entry — AA
- 3.3.8 Accessible Authentication (Minimum) — AA
- 3.3.9 Accessible Authentication (No Exception) — AAA

All eight are in scope. The four AAA criteria (2.4.12, 3.3.9, and the
targeted AAA items in §3 below) are additionally required for regulated
tenant surfaces.

### 1.2 WAI-ARIA 1.2 — Explicit Role Assignments

WAI-ARIA 1.2 (published 2023-06-06) is the normative ARIA specification.
Every custom component that is not a native HTML5 element must carry
an explicit ARIA role, accessible name, and (where applicable) state
and property attributes. Implicit ARIA semantics from host-language
elements are relied upon where they exist; ARIA overrides or supplements
where they do not. The rule "no ARIA is better than bad ARIA" applies:
a role assignment must be correct and complete, not approximate.

### 1.3 EN 301 549 v3.2.1 — EU Commercial Customers

EN 301 549 is the European harmonised standard cited by the Web
Accessibility Directive and the European Accessibility Act (EAA,
Directive 2019/882). The EAA began enforcement in June 2025 for all
products and services in scope. HESEM tenants in the EU market (all
J-class packs sold into EU member states) require EN 301 549 conformance.
EN 301 549 clause 9 maps directly to WCAG 2.2 AA; additional clauses
cover non-web software (clause 11), documentation (clause 12), and
support services (clause 13). The HESEM conformance statement for EU
tenants references EN 301 549 v3.2.1 and is updated with each major
product release.

### 1.4 ADA Title III + Section 508 — US Regulated Tenants

J4 (FDA GUDID), J5 (FSMA), and government-adjacent tenants in the US
must satisfy both ADA Title III (public accommodation — courts have
extended to web applications) and the Revised Section 508 Standards
(2017). Section 508 chapter 6 requires conformance to WCAG 2.0 AA at
minimum; HESEM targets WCAG 2.2 AA as a superset. The VPAT (Voluntary
Product Accessibility Template), Edition WCAG 2.2 format, is produced
annually for each product and provided to US regulated tenants as part
of the customer accessibility package.

### 1.5 AODA — Canadian Customers

The Accessibility for Ontarians with Disabilities Act (O.Reg 191/11)
requires WCAG 2.0 AA for web content accessible to the public and for
private-sector organizations above the employee threshold. HESEM satisfies
this by conforming to WCAG 2.2 AA as a superset. The AODA attestation
is included in the customer compliance package for Canadian tenants.

### 1.6 IEC 62366-1:2015 + AMD1:2020 — Medical Device Usability Engineering

J4 Medical Device pack surfaces that are part of the device's user
interface under IEC 62366 scope must undergo both formative and summative
usability testing as part of the Usability Engineering File (UEF).
IEC 62366 mandates a structured process: specification of intended users,
uses, and use environments; analysis of use-related risks (per ISO 14971);
formative evaluation at design checkpoints; summative evaluation prior
to regulatory submission. WCAG 2.2 AAA enhanced contrast and focus
criteria apply to these surfaces because the IEC 62366 summative test
population includes users with low vision operating in variable lighting
conditions (cleanrooms, surgical suites, warehouse receiving bays).

---

## 2. WCAG 2.2 AA Criterion Compliance Matrix

This section covers every applicable WCAG 2.2 Level A and AA success
criterion with the specific technique or techniques applied in HESEM.
Criteria marked (N/A) are not applicable to this application type with
the justification stated.

### Principle 1 — Perceivable

**1.1.1 Non-text Content (A)**
All informative images carry an `alt` attribute whose value conveys the
same meaning as the image. Decorative images carry `alt=""`. Inline SVG
icons used in controls carry a `<title>` element as the first child and
an `aria-labelledby` pointing to that title; when the icon is decorative
(accompanied by visible text), `aria-hidden="true"` is set instead. Data
visualisation SVGs (charts, diagrams) carry both a `<title>` (short
label) and a `<desc>` (data summary), with `role="img"` and
`aria-labelledby` referencing both. CAPTCHA (N/A — not used;
authentication is credential + biometric per 3.3.8).

**1.2.1 Audio-only and Video-only (Prerecorded) (A)**
Applies only to the Training module (TRAIN slice) and any onboarding
videos. Prerecorded audio-only content requires a text transcript.
Prerecorded video-only content requires either a text alternative or
audio description. All training videos carry VTT transcript files
stored alongside the asset in the content management system.

**1.2.2 Captions (Prerecorded) (A)**
All prerecorded video content with audio (training videos, recorded
webinars in knowledge base) carries synchronised closed captions. Auto-
generated captions (via transcription service) are produced automatically
at upload time; a manual review step is required before the video is
published, flagged as a checklist item in the content QA workflow.

**1.2.3 Audio Description or Media Alternative (Prerecorded) (A)**
For training videos where visual content is meaningful and not conveyed
by the dialogue, an extended audio description or a full text transcript
is provided. The decision is made per video during content QA.

**1.2.4 Captions (Live) (AA)**
Live streaming (N/A — HESEM does not broadcast live video). Real-time
process data in Action Consoles is text-based and does not require
captions.

**1.2.5 Audio Description (Prerecorded) (AA)**
Where a training or demo video's visual information is not fully
conveyed by the audio track, an audio description track is provided.
Content authors flag this requirement during the content QA workflow.

**1.3.1 Info and Relationships (A)**
Semantic HTML5 landmarks are used throughout: `<header>`, `<nav>`,
`<main>`, `<aside>`, `<footer>`. Data tables use `<table>`, `<thead>`,
`<tbody>`, `<th scope="col">`, `<th scope="row">`. Complex data tables
use `headers` and `id` attributes for cell-header association. Form
fields are associated with `<label for="...">` or `aria-labelledby`.
Groups of related fields are wrapped in `<fieldset>` with `<legend>`.
Required fields have `aria-required="true"` in addition to visual
indicators. Error messages are associated to fields via `aria-describedby`.
List structures use `<ul>` / `<ol>` / `<li>` or `role="list"` on
custom components. Status/severity badges combine text and icon so the
relationship is not color-only.

**1.3.2 Meaningful Sequence (A)**
The DOM reading order matches the visual presentation order. CSS grid
and flexbox are used for layout only — `order` property and CSS grid
`grid-area` placement are not used to create visual orders that differ
from DOM source order. Automated CI check (axe-core) detects
`aria-flowto` misuse. RTL layouts (for Arabic/Hebrew) are achieved via
`dir="rtl"` on `<html>` rather than CSS transforms, so DOM order is
always consistent with reading direction.

**1.3.3 Sensory Characteristics (A)**
No instruction in UI text references the position, size, shape, or
color of an element as the sole means of identification. "Click the
red button" is forbidden. All UI instructions use the programmatic label:
"Click the Approve button", "Select the option in the Status dropdown",
"Choose the item in the left panel". This is enforced via content review
in the copy guide (F10 design system writing standards).

**1.3.4 Orientation (A)**
No surface locks display orientation. The one exception is the OT
Operator Panel surface (ISA-101 compliant HMI view) which presents in
landscape only on dedicated shopfloor terminals — this is documented as
a justified exception under ISA-101 §5.3 (fixed-orientation industrial
displays). All other surfaces adapt to both portrait and landscape.

**1.3.5 Identify Input Purpose (AA)**
All user-input fields that collect personal information carry the
appropriate `autocomplete` attribute. Name fields: `name`, `given-name`,
`family-name`. Email: `email`. Phone: `tel`. Address: `street-address`,
`postal-code`, `country`. Username: `username`. Password: `current-password`
/ `new-password`. Date of birth: `bday`. This attribute is applied in
the HTML template for every controlled form surface; linting via
eslint-plugin-jsx-a11y checks autocomplete presence on input elements
matching name/email/tel/address patterns.

**1.4.1 Use of Color (A)**
Color is never the sole means of conveying information, indicating an
action, prompting a response, or distinguishing a visual element.
Status indicators use color plus a named icon plus a text label (e.g.,
Approved = green background + check-circle icon + "Approved" text).
Chart datasets use color plus pattern fill plus data labels. Diff
highlighting (added/removed lines) uses color plus +/- prefix characters.
Alert severity uses color plus severity-level text ("SEV-1") plus icon
shape. This is enforced by the Graphics Authority token system: status
tokens always emit all three components.

**1.4.2 Audio Control (A)**
No audio plays automatically on any surface. Notification sounds (if
enabled by user preference) can be disabled in user settings. This
control is persistent via user profile. (N/A for most surfaces — audio
is opt-in only.)

**1.4.3 Contrast (Minimum) (AA)**
All normal-size text (below 18pt / 14pt bold) must achieve a contrast
ratio of at least 4.5:1 against its background. Large text (18pt / 14pt
bold or larger) must achieve at least 3:1. The Graphics Authority token
system stores measured contrast ratios for each text/background token
pair. Tokens that fail 4.5:1 for normal text are rejected at the token
authoring stage. Dark mode token variants are independently validated.
Automated contrast checking runs in CI via axe-core and is complemented
by manual verification in the quarterly review cycle.

**1.4.4 Resize Text (AA)**
All text is sized in `rem` units. The base font size is set by
`html { font-size: 100%; }` (16px browser default). Users can increase
their browser's default font size; this scales all `rem`-based text.
At 200% browser zoom, the layout reflows to a single column without
horizontal scrolling and without loss of content or functionality.
Font-size tokens in the Graphics Authority catalog are all `rem`-based;
`px`-based font sizes in CSS are prohibited by the no-hardcode rule and
caught by CI linting.

**1.4.5 Images of Text (AA)**
Text is never rendered inside images except where the image itself is
the subject of the content (e.g., a screenshot showing a UI for training
purposes, in which case the surrounding text repeats the key information).
Charts and diagrams use SVG text elements (rendered as scalable vector
text), not rasterised text inside bitmap images. Logo images are SVG;
where a PNG is unavoidable (legacy tenant logo), the visible text in
the logo is repeated in the `alt` attribute.

**1.4.10 Reflow (AA)**
At a viewport width of 320 CSS pixels (equivalent to 400% zoom on a
1280px display), all content is presented in a single column without
horizontal scrolling. This is verified by automated Playwright tests
that resize the viewport to 320px and check for horizontal overflow via
`document.documentElement.scrollWidth > document.documentElement.clientWidth`.
Sticky headers remain within the viewport. Data tables scroll
horizontally within a scroll container that has `role="region"` and
`aria-label` describing the table, so the table is the scrollable unit
rather than the whole page.

**1.4.11 Non-text Contrast (AA)**
UI component boundaries (form field borders, button outlines, checkbox
borders), focus indicators, and informative graphical objects (chart
bars, line markers, icon shapes when used as sole content carriers)
must achieve a contrast ratio of at least 3:1 against adjacent colors.
The Graphics Authority token system tracks non-text contrast ratios for
component boundary tokens. Focus ring color is stored as token
`state-focus-ring-color` and is validated against both light and dark
mode backgrounds. Chart palette tokens are validated for 3:1 against
the chart canvas background.

**1.4.12 Text Spacing (AA)**
No content or functionality is lost when the following text spacing
properties are applied simultaneously via user stylesheet or browser
extension: line height to 1.5 times the font size; letter spacing to
0.12em; word spacing to 0.16em; spacing following paragraphs to 2em.
This is tested manually using a bookmarklet that injects these overrides
and visually verified across all surface types. Fixed-height containers
that clip text are prohibited; all containers use `min-height` with
`overflow: visible` or auto-expand to content.

**1.4.13 Content on Hover or Focus (AA)**
Tooltip and popover content that appears on hover or keyboard focus
meets three conditions: it is dismissable (pressing Escape hides it
without moving focus), hoverable (the pointer can move from the trigger
to the popup content without the content disappearing), and persistent
(it remains visible until the user moves focus or hover away, or
explicitly dismisses it). This is implemented in the shared Tooltip and
Popover components in the design system. Timed auto-dismiss tooltips
are not used for informational content.

### Principle 2 — Operable

**2.1.1 Keyboard (A)**
Every function that can be performed via pointer can be performed via
keyboard alone. This includes: opening and closing drawers and dialogs,
activating tab panels, triggering bulk actions, sorting and filtering
data tables, submitting forms, signing records (e-signature flow), and
navigating paginated lists. Custom keyboard interactions follow ARIA
Authoring Practices Guide patterns. Arrow-key navigation within
composite widgets (data grids, tab lists, menus, trees) is implemented
per the roving tabindex pattern. Focus management is explicit for all
dynamic content changes.

**2.1.2 No Keyboard Trap (A)**
Focus can always leave any component or region using standard keys.
Modal dialogs implement a focus trap during the open state — this is
permitted and required by the ARIA `dialog` pattern — but the Escape
key always closes the dialog and returns focus to the trigger. There are
no custom components that permanently capture the Tab key without a
documented escape mechanism. Focus-trap implementations use a whitelist
approach: only focusable children of the modal root are included in the
trap cycle.

**2.1.4 Character Key Shortcuts (A)**
Single-character keyboard shortcuts (a–z, 0–9, punctuation) that are
active when focus is not inside a form field are subject to this
criterion. Where such shortcuts exist (e.g., "f" for filter, "s" for
sort in the Workspace projection), the user can: turn them off in the
keyboard shortcuts panel accessible from the Help menu; remap them to a
multi-key combination; or the shortcut activates only when a specific
widget has focus. The keyboard shortcut registry is part of the user
preferences API.

**2.2.1 Timing Adjustable (A)**
Session timeout is configured at the tenant level (default 30 minutes
of inactivity). When fewer than 5 minutes remain, a persistent warning
banner appears: "Your session will expire in {N} minutes. [Extend
Session]". The extend button resets the session timer. The countdown
timer in the banner updates every 30 seconds. Users with cognitive
or reading disabilities who need more time can contact their tenant
administrator to extend the session timeout up to the maximum permitted
by the tenant security policy. Screen readers announce the expiry warning
via `aria-live="assertive"` on the banner region.

**2.2.2 Pause, Stop, Hide (A)**
All surfaces that display automatically-updating content (live Action
Console event streams, real-time KPI dashboards, production order
progress bars) provide a Pause button that halts the auto-refresh
without navigating away from the surface. Paused state is clearly
indicated (button label changes to "Resume"; icon changes to play icon).
Animated decorative elements (loading spinners, progress animations)
respect `prefers-reduced-motion: reduce` and stop animating entirely
when that media query matches.

**2.3.1 Three Flashes or Below Threshold (A)**
No content flashes more than three times per second. This is verified
by visual inspection during manual review and by the Photosensitive
Epilepsy Analysis Tool (PEAT) for any new animated sequences introduced.
Automated notifications (toast messages appearing in rapid succession)
are rate-limited to maximum one visible toast at a time with a 300ms
queue delay between successive toasts.

**2.4.1 Bypass Blocks (A)**
A skip navigation link is the first focusable element in the DOM on
every page. Its visible text is "Skip to main content" and it targets
`#main-content` which is placed at the start of the `<main>` landmark.
In surfaces with a secondary navigation sidebar, a second skip link
"Skip to navigation" is provided. Skip links are visible on focus
(opacity: 1, position: fixed top-left) and hidden when not focused.
All primary page regions are wrapped in appropriate HTML5 landmark
elements to allow landmark-based navigation in screen readers.

**2.4.2 Page Titled (A)**
Every page carries a unique, descriptive `document.title`. The pattern
is: `{record identifier or surface name} — {module name} — HESEM
{tenant name}`. Examples: "NQ-2024-00123 — Nonconformance Record —
HESEM Medtech Corp", "Dispatch Board — Production — HESEM Medtech Corp".
The title is set by the HMV4 hydration script immediately upon route
resolution, before the surface renders, so screen reader users hear the
correct page identity at navigation time.

**2.4.3 Focus Order (A)**
The visual tab order matches the logical reading order across all
surfaces. Focus moves: (1) skip links, (2) global header controls,
(3) primary navigation, (4) main content area in document order.
Within complex surfaces (AR records with multiple sections), focus
order tracks section order top-to-bottom, within-section left-to-right
in LTR locales. Dialog focus order starts with the dialog's first
focusable element (typically the close button or the first form field,
depending on context). Focus order is validated in every Playwright E2E
session by driving keyboard navigation and asserting element sequence.

**2.4.4 Link Purpose (In Context) (A)**
All links are meaningful either in isolation or together with their
programmatic context (surrounding paragraph, list item, table cell,
or `aria-label` / `aria-labelledby` override). Generic link text ("Click
here", "Learn more", "View") is prohibited. Where a repeated link pattern
appears (e.g., "View" links in each row of a data table), each link
carries `aria-label="View {record identifier}"` so the accessible name
is unique and descriptive in isolation.

**2.4.6 Headings and Labels (AA)**
Every major section of every surface is introduced by a heading at the
appropriate level. Heading levels are not skipped (no jump from `<h2>` to
`<h4>`). The top-level page heading is always `<h1>` and matches the
surface or record name. Section headings within a surface are `<h2>`;
sub-sections `<h3>`; nested sub-sections `<h4>`. Form field labels are
descriptive: "Nonconformance Description" not "Description"; "Assigned
Inspector" not "Inspector". The heading structure is verified in manual
review by inspecting the heading outline in the browser accessibility
tree.

**2.4.7 Focus Visible (AA)**
All interactive elements display a clearly visible focus indicator.
The focus ring is implemented via the CSS `:focus-visible` pseudo-class
(to avoid showing focus rings on mouse-click for sighted users) and
`:focus` as a fallback for browsers that do not support `:focus-visible`.
Focus ring specification: `outline: 2px solid var(--state-focus-ring-color);
outline-offset: 2px;`. The `--state-focus-ring-color` token achieves at
least 3:1 contrast against the adjacent background in both light and
dark themes (per 1.4.11). Focus rings are never suppressed with
`outline: none` without a complete custom replacement.

**2.4.11 Focus Not Obscured (Minimum) (AA — WCAG 2.2 new)**
When any component receives keyboard focus, it is not entirely hidden
behind sticky headers, fixed footers, or sticky section titles. Sticky
headers use `position: sticky; top: 0;` with a `z-index` managed by the
stacking context layer system. When a focused element scrolls into view,
`scroll-margin-top` is set to the height of all sticky headers above it,
so the focused element is always at least partially visible. This value
is computed dynamically on layout change and stored as a CSS custom
property `--sticky-header-height` on `<html>`.

**2.4.12 Focus Not Obscured (Enhanced) (AAA — targeted for regulated surfaces)**
On J4 Medical Device and J1 Pharma surfaces in IEC 62366 summative
scope, the focused element must be fully visible — not just partially.
`scroll-margin-top` is increased by an additional 8px buffer on these
surfaces so the focus ring's `outline-offset: 2px` is fully clear of
the sticky header edge.

**2.5.3 Label in Name (A)**
The accessible name of every interactive element must contain the
visible label text as a substring. Where a visible button reads "Submit",
`aria-label="Submit"` is permitted but `aria-label="Confirm form
submission"` is not — it obscures the match. Where icon-only buttons
have no visible text, the `aria-label` is the canonical action name that
a sighted user would also use to describe the button. This is verified
by axe-core rule `label-content-name-mismatch` in CI.

**2.5.4 Motion Actuation (A)**
No functionality depends exclusively on device motion (shake, tilt).
Device motion input (if ever supported, e.g., for OT gesture panels) must
have a single-pointer or keyboard alternative. Motion actuation can be
disabled in accessibility settings. At present no HESEM surface uses
device motion as an input mechanism; this criterion is satisfied by
absence and documented as such in the conformance statement.

**2.5.7 Dragging Movements (AA — WCAG 2.2 new)**
Every operation that can be performed by dragging has an equivalent
single-pointer (click/tap) alternative. The Workspace Kanban view
(production order drag-between-lanes) provides: a "Move to" context
menu accessible via right-click or a "..." button on the card, with
lane options listed as clickable menu items. The Dashboard widget
reorder (drag-to-reorder panels) provides an "Edit layout" mode with
up/down arrow buttons per panel. Drag-and-drop file attachment in
AR records is accompanied by a "Browse files" button that opens the
file picker. This criterion is verified in the per-surface keyboard
test checklist.

**2.5.8 Target Size (Minimum) (AA — WCAG 2.2 new)**
All interactive targets meet a minimum size of 24×24 CSS pixels,
exclusive of spacing. Spacing between adjacent targets counts toward
the 24px offset requirement as defined by the SC. The primary target
size goal for all surfaces is 44×44 CSS pixels (matching Apple HIG
and Android accessibility guidelines). ISA-101 OT Operator Panel
surfaces, which are used with gloved hands on touchscreens, require a
minimum of 44×44 CSS pixels with at least 8px spacing between targets.
Target sizes are enforced via the design system's interactive element
tokens (`--component-touch-target-min-size`), which are set per surface
density variant.

### Principle 3 — Understandable

**3.1.1 Language of Page (A)**
The `<html>` element carries the `lang` attribute set to the BCP-47
language tag for the active locale. This is set by the i18n service
(F12) at session initialization and updated on locale switch without a
page reload. Examples: `lang="en-US"`, `lang="vi"`, `lang="de-DE"`,
`lang="ar"` (with `dir="rtl"` also set). Screen readers use this
attribute to select the correct speech engine and pronunciation rules.

**3.1.2 Language of Parts (AA)**
In multilingual content where a passage is in a language different from
the primary page language (e.g., a regulatory document excerpt in
French within an English-locale portal, or an Arabic product name in a
Vietnamese-locale tenant), the `lang` attribute is set on the element
containing the different-language passage. This is enforced by the
content authoring guide and verified by content QA for structured
document types.

**3.2.1 On Focus (A)**
No context change (navigation, form submission, dialog opening) occurs
as a result of a component receiving focus. Focus events are used only
to reveal focus indicators and trigger hover-equivalent tooltip display.
No `focus` event handler calls navigation functions, form submission
functions, or dialog-open functions. This is verified by axe-core
and by manual keyboard testing.

**3.2.2 On Input (A)**
No context change occurs automatically when a user changes the value of
a UI component unless the user has been advised of the behavior
beforehand. Select dropdowns that navigate (e.g., a locale switcher
or module jumper) include a "Go" button or apply automatically but with
a prior notice. Filter controls in data tables update results
automatically but do not navigate away from the current surface.
Auto-save in AR record surfaces saves silently (announced via
`aria-live="polite"` in a status region) without navigating or
reloading.

**3.2.6 Consistent Help (AA — WCAG 2.2 new)**
The help mechanism (question-mark icon button opening contextual help
drawer) is located in the same position on every surface: upper-right
corner of the main content area, immediately before the user account
menu in tab order. The keyboard shortcut for help (`Shift+?`) is
consistent across all surfaces. The help icon is accompanied by a
visible label "Help" on surfaces with sufficient header width and by
`aria-label="Help"` on narrower viewports. This position is defined
in the SH Shell pattern (F1) and enforced by the shared shell component.

**3.3.1 Error Identification (A)**
When a form submission fails validation, each field in error is identified
in text. The error message is: (1) displayed adjacent to the field,
(2) associated to the field via `aria-describedby`, (3) announced to
screen reader users via focus management (focus moved to the first
error field or to an error summary at the top of the form), and (4) not
communicated by color alone (the field border changes color AND an error
icon appears AND the error text is displayed). `aria-invalid="true"` is
set on each invalid field.

**3.3.2 Labels or Instructions (A)**
Every form field has a visible label that is always displayed (not just
as placeholder text — placeholders disappear on input and have
insufficient contrast). Fields with format requirements (date format,
length limits, allowed characters) carry visible instruction text
displayed below the field label. Instructions for complex inputs (e-
signature PIN, certificate upload) are displayed before the control, not
after. `aria-required="true"` is set on required fields; `aria-describedby`
links the instruction text to the field.

**3.3.7 Redundant Entry (AA — WCAG 2.2 new)**
In multi-step wizards, information already entered by the user in a
prior step is not requested again unless: (a) re-entry is essential
(e.g., confirming a password), or (b) the information is in a different
context that warrants re-confirmation. Wizard state carries all entered
values forward; the summary step displays entered values for review,
not re-entry. Auto-populate from user profile is used where applicable
(signing name, email, department). This is enforced in the WZ wizard
pattern specification (F8).

**3.3.8 Accessible Authentication (Minimum) (AA — WCAG 2.2 new)**
Authentication does not require a cognitive function test such as
memorizing a code, solving a puzzle, or transcribing characters unless
an alternative is provided. HESEM authentication: primary login uses
credential (username + password with paste allowed) or SSO; two-factor
uses TOTP code or push notification (recognition-based, not recall-
based); e-signature PIN is a numeric entry where the PIN was set by the
user (recall is permitted for authentication purposes per SC exception;
paste is allowed). No CAPTCHA requiring image transcription is used;
where bot protection is needed, invisible behavioral analysis is used.

### Principle 4 — Robust

**4.1.1 Parsing (A) (Obsolete in WCAG 2.2)**
This criterion was removed in WCAG 2.2 as it is superseded by HTML
Living Standard and modern browser parsing behaviour. HESEM generates
valid HTML5 via server-side templates; automated W3C validator checks
run in CI as code quality (not WCAG) gates.

**4.1.2 Name, Role, Value (A)**
Every user interface component has a programmatically determinable name,
role, and (where applicable) state, property, and value. Native HTML
elements satisfy this natively. Custom components use explicit ARIA
roles, `aria-label` or `aria-labelledby` for name, and state attributes
(`aria-expanded`, `aria-selected`, `aria-checked`, `aria-current`,
`aria-pressed`, `aria-disabled`, `aria-invalid`) managed in sync with
visual state. No ARIA attribute is set to a value that contradicts the
visual state.

**4.1.3 Status Messages (AA)**
Status messages that are not part of a focus change (e.g., "Changes
saved", "3 items updated", "Error loading records") are programmatically
determinable through role or property so they can be announced by
assistive technology without receiving focus. Implementation: success
and info messages use `role="status"` with `aria-live="polite"`.
Error and urgent messages use `role="alert"` with `aria-live="assertive"`.
Toast notification containers are persistent in the DOM (empty when no
toast is displayed) so the live region is registered with the AT before
content is injected.

---

## 3. Selective WCAG 2.2 AAA (Regulated Tenant Surfaces)

The following AAA criteria are required for surfaces in IEC 62366
summative test scope (J4 Medical Device) and for EU MDR patient-
instruction surfaces in the J1 Pharma pack. They are optional-but-
targeted for all other surfaces.

### 3.1 1.4.6 Enhanced Contrast (AAA)

Normal text must achieve 7:1 contrast ratio against its background.
Large text must achieve 4.5:1. This applies to all J4 Medical Device
surfaces in the IEC 62366 summative test scope. The Graphics Authority
token catalog maintains a separate token namespace prefix `j4-` for
Medical Device-specific token overrides. These tokens are active only
when the tenant's `pack_flags` include `J4_MD=true` and the surface's
feature flag `J4_ENHANCED_CONTRAST=true` is active. Contrast ratios are
measured and stored in `graphics_token_value` alongside each token.

### 3.2 2.4.12 Focus Not Obscured (Enhanced) (AAA)

All regulated surfaces (J4 MD, J1 Pharma) ensure the focused element
is entirely visible — no portion of the focused element or its focus
ring is covered by any sticky UI element. Implementation: `scroll-margin-top`
and `scroll-margin-bottom` are computed as the full height of all sticky
headers and footers plus 8px, applied to all focusable elements within
these surfaces via a CSS custom property derived from layout measurement.

### 3.3 2.5.6 Concurrent Input Mechanisms (AAA)

All surfaces support concurrent use of pointer, keyboard, and touch
input without requiring a mode switch or producing conflicts. A user
can operate a form by keyboard and then click a field with the mouse
without the keyboard mode being disrupted. Touch-then-keyboard is
equally supported. This is the baseline behaviour of standard HTML
form controls and is preserved by the HESEM component library by
avoiding any "mode detection" logic that would disable one input
modality in favour of another.

---

## 4. WAI-ARIA 1.2 Patterns Per Surface

### 4.1 Workspace Projection (WS)

The primary data grid in the Workspace Projection pattern carries
`role="grid"` on the containing element. The grid must expose accurate
counts via `aria-rowcount` (total rows in the dataset, including
unloaded rows in virtual-scroll mode) and `aria-colcount` (total
columns). Each row element carries `role="row"` and `aria-rowindex`
(1-based, reflecting the row's position in the full dataset, not just
the visible window — critical for virtual scrolling where DOM rows are
recycled). Each cell carries `role="gridcell"` or `role="columnheader"`.

Sortable column headers carry `aria-sort="ascending"`, `"descending"`,
or `"none"` updated synchronously when the user activates the sort.
When a sort is applied, an `aria-live="polite"` region announces
"{column name} sorted ascending" or "{column name} sorted descending".

Row selection: each row carries `aria-selected="true"` or `"false"`.
The column header checkbox (for bulk select all) uses `aria-checked`
with tri-state: `"true"` (all selected), `"false"` (none), `"mixed"`
(some). The bulk action toolbar, which appears when rows are selected,
carries `aria-label="Bulk actions — {N} items selected"` updated
dynamically via JavaScript as the selection count changes.

Virtual scrolling: the Intersection Observer that triggers data loading
is paired with a loading announcement injected into an `aria-live="polite"`
region: "Loading more records" on start, "N records loaded, {total}
total" on completion.

### 4.2 Authoritative Record Shell (AR) Tabs

The AR record's primary tab strip carries `role="tablist"` with
`aria-label="{record type} sections"` (e.g., "Nonconformance record
sections"). Each tab button carries `role="tab"`, `aria-selected="true"
/ "false"`, `aria-controls="{panelId}"`, and `id="{tabId}"`. The
associated panel carries `role="tabpanel"`, `aria-labelledby="{tabId}"`,
and `tabindex="0"` so it is focusable when active. Inactive panels
carry `hidden` (not just CSS `display: none`) to remove them from the
accessibility tree.

Tab keyboard interaction: Left/Right arrow keys move between tabs
(roving tabindex); Enter/Space activates the focused tab; Home/End move
to the first/last tab. Tab key moves focus out of the tab list into the
active panel's content.

Lazy-loaded tab content: when tab content loads asynchronously, focus
remains on the activated tab during loading. An `aria-busy="true"`
attribute is set on the panel during load and removed on completion.
A loading announcement is made via `aria-live="polite"`.

### 4.3 Non-Record Drawers (NRD)

Every drawer rendered as a modal dialog carries `role="dialog"`,
`aria-modal="true"`, `aria-labelledby="{drawer-title-id}"`, and
`aria-describedby="{drawer-description-id}"` (where a description
paragraph exists). The drawer title element carries the matching `id`.

On open: focus is moved to the first focusable element inside the
drawer — either the close button (for information drawers) or the first
form field (for edit drawers). A focus trap prevents Tab and Shift+Tab
from leaving the drawer while it is open. The focus trap implementation
uses a whitelist of natively focusable elements and respects
`tabindex="-1"` and `disabled` attributes.

On close: focus returns to the trigger element that opened the drawer.
If the trigger element no longer exists in the DOM (e.g., a row was
deleted), focus falls back to the nearest logical ancestor. The return-
focus target is stored when the drawer opens.

Background inertness: when the drawer is open, the `inert` attribute
is set on all DOM siblings of the drawer root, preventing pointer and
keyboard interaction with background content and hiding it from the
accessibility tree. This uses the native `inert` attribute (broadly
supported as of 2023) with a polyfill for legacy environments.

### 4.4 Sub-Flow Wizards (WZ)

The wizard container carries `role="region"` with a dynamic
`aria-label="Step {N} of {M}: {step_title}"` that updates as the user
progresses. The step indicator (visual stepper component at the top)
carries `aria-current="step"` on the indicator dot or label for the
current step and no `aria-current` on other steps.

Step content area: carries `aria-live="polite"` so that when the step
changes, the arrival of new content is announced. Focus is explicitly
moved to the step's heading element when a step transition occurs,
ensuring screen reader users hear the new step heading without waiting
for the live region announcement.

Step validation errors: when the user attempts to proceed and there
are validation errors in the current step, errors are announced via
`aria-live="assertive"` in an error summary region before focus is
moved to the first error field. The error summary lists all errors with
links to the affected fields.

Summary step: the wizard's final summary step renders all user-entered
values as a definition list (`<dl>`) with `<dt>` for field names and
`<dd>` for values. Screen readers can navigate this list directly.

### 4.5 Action Consoles (AC)

The console container carries `role="form"` (for consoles that accept
filter inputs) with `aria-label="{console name}"`. The event stream
region carries `aria-live="polite"` for normal priority events and
`aria-live="assertive"` for SEV-1 critical alerts. `aria-atomic="false"`
(the default) is used so each new event is announced individually rather
than re-announcing the full stream.

The event list is marked up as a `<ul>` with `<li>` per event. Each
event item includes: timestamp (`<time datetime="ISO8601">`), severity
badge with `aria-label`, event description, and an Acknowledge button
with `aria-label="Acknowledge: {event description}"` to ensure the
action is meaningful in the absence of visual row context.

Acknowledge confirmation: after acknowledgement, `role="status"` with
`aria-live="polite"` announces "Acknowledged: {event ID}".

### 4.6 Bulk Action Result Chips

When a bulk action completes (e.g., "Approve 12 selected records"), a
result chip appears carrying `role="status"` and `aria-live="polite"`.
The chip text reads "{N} records approved. [View details]". The chip
auto-dismisses after 8 seconds; if dismissed while focused, focus
returns to the bulk action trigger. The live region container persists
in the DOM so screen readers have already registered it before content
is injected.

### 4.7 Long-Running Operation Progress (LRO)

Progress indicators for long-running operations (data exports, batch
uploads, report generation) carry `role="progressbar"`, `aria-valuenow`
(current percentage, 0–100), `aria-valuemin="0"`, `aria-valuemax="100"`,
and `aria-label="{operation name} progress"`. When the operation is
indeterminate, `aria-valuenow` is omitted and `aria-label` reads
"{operation name} — in progress". Completion is announced via an
`aria-live="assertive"` region: "{operation name} complete. [Download
result]" or "{operation name} failed. {error summary}."

### 4.8 Toast Notifications

Toast containers are persistent, empty `<div>` elements at the end of
the `<body>`, registered with screen readers before any toast is shown.
SEV-1 critical toasts: `role="alert"`, `aria-live="assertive"`,
`aria-atomic="true"`. Informational and success toasts: `role="status"`,
`aria-live="polite"`, `aria-atomic="true"`. Each toast includes a
visible close button with `aria-label="Dismiss: {toast message}"`.
Auto-dismiss delay: 8 seconds for info, no auto-dismiss for errors.

---

## 5. IEC 62366 Usability Engineering (J4 Medical Device Pack)

### 5.1 Intended Use and User Population

IEC 62366 requires specification of the intended users, uses, and use
environments. For J4 Medical Device surfaces:

- Intended users: quality engineers, production supervisors, regulatory
  affairs managers, device history record reviewers. May include users
  with low vision, colour deficiency, or motor impairments. May operate
  in variable lighting (cleanrooms: 500–1000 lux; receiving bay: 300
  lux; office: 300–500 lux).
- Intended uses: creating and reviewing device history records,
  nonconformance cases, corrective actions, batch records, and label
  inspection records.
- Use environment: primarily desktop workstations; occasionally tablets
  on the production floor. Indirect contact with the medical device
  (software is used to manage device production records, not to operate
  the device itself — this affects the IEC 62366 application scope
  determination).

### 5.2 Formative Usability Testing

Formative testing occurs at each major sprint boundary where a J4-
relevant surface has been modified. Protocol:

- Participants: minimum 5 representative users per session, recruited
  from the target population (quality engineers + production supervisors
  at customer sites or equivalent personas). At least one session per
  sprint boundary includes a participant with a visual impairment.
- Method: unmoderated remote sessions via Lookback (screen recording +
  think-aloud with observer). Task scenarios are scripted and
  standardised per the UEF task library.
- Core task set for formative sessions: (1) create a nonconformance
  case from a production order; (2) attach photographic evidence to
  an existing case; (3) complete the e-signature flow for corrective
  action approval; (4) locate and review an LRO progress indicator for
  a batch processing job; (5) acknowledge a SEV-1 action console alert.
- Output: use error log entries in the IEC 62366 format (task, user
  action, observed outcome, deviation from expected). Each use error
  is rated by severity (safety-critical / performance-critical /
  inconvenient). Root cause is attributed to one of: labelling
  deficiency, training gap, UI affordance failure, or environmental
  factor.
- Disposition: UI affordance failures with severity ≥ performance-
  critical generate UX deficiency tickets that are remediated before
  the next sprint boundary.

### 5.3 Summative Usability Testing

Summative testing is conducted once per device integration, prior to
regulatory submission. Protocol:

- Participants: minimum 15 representative users, stratified by role
  (quality engineer, production supervisor, regulatory affairs manager),
  site type (contract manufacturer, OEM, in-house), and accessibility
  need.
- Method: moderated in-person or synchronous remote sessions. A written
  test protocol is authored, reviewed by the Quality Lead, and frozen
  before testing begins.
- Task set: same core tasks as formative plus additional edge-case
  scenarios identified in formative sessions. Tasks are presented
  without assistance; the moderator observes and records but does not
  guide.
- Pass/fail criteria per task:
  - Critical tasks (e-signature, evidence attachment, alert
    acknowledgement): ≥ 95% task completion rate; any use error during
    a critical task is individually reviewed.
  - Error recovery: for tasks where an error occurs, the user must
    self-recover within 2 attempts without moderator assistance.
  - Satisfaction: System Usability Scale (SUS) score ≥ 68 (industry
    average; target ≥ 75 for IEC 62366 summative contexts).
- Output: summative test report authored per IEC 62366 §5.9. Included
  in the Usability Engineering File.

### 5.4 Use Error Analysis and Risk Integration

Each use error identified in formative or summative testing is entered
into the use error log, which is part of the UEF. For each use error:
1. Describe the task, the user's action, and the deviation from the
   expected outcome.
2. Identify the root cause category (UI labelling, information
   architecture, feedback mechanism, environmental).
3. Assess whether the use error could lead to a hazardous situation
   per ISO 14971 §4.
4. If a hazardous situation is identified, define the harm scenario,
   estimate probability and severity, and calculate residual risk per
   ISO 14971 §6.
5. Define the risk control measure (UI change, training, labelling,
   or acceptance of residual risk with documented justification).
6. Re-test after risk control implementation (formative iteration).

Residual use errors that cannot be eliminated by UI design are
documented in the risk management file with acceptance rationale per
ISO 14971 §7. These are not CAPA items — they are accepted residual
risks with documented controls.

### 5.5 Usability Engineering File (UEF) Structure

The UEF for each J4 device integration contains:
- Intended use and user specification
- Use environment specification
- Known use problems (from prior versions, field complaints, literature)
- Task and use error analysis
- Usability testing protocols (formative and summative)
- Test reports
- Risk control summary
- Residual risk acceptance documentation

The UEF is maintained in the quality management system (document
reference: QMS-UEF-{device-code}) and reviewed at each design change.

---

## 6. Per-Pattern Technique Catalog

### 6.1 Shell Navigation (SH)

- Primary navigation landmark: `<nav role="navigation" aria-label="Main
  navigation">`. Where a secondary navigation exists (module-level
  sidebar), it carries `aria-label="Module navigation"`.
- Active page indicator: the nav item for the currently active route
  carries `aria-current="page"`.
- Skip navigation link: `<a href="#main-content" class="skip-nav">Skip
  to main content</a>` as the first child of `<body>`. Visible on
  `:focus-visible`. The `#main-content` target is the `<main>` element.
- Mobile hamburger button: `<button aria-expanded="false"
  aria-controls="primary-nav-menu" aria-label="Open navigation menu">`.
  `aria-expanded` updates to `"true"` when the menu is open. The menu
  element carries `id="primary-nav-menu"`.
- Keyboard behavior: all nav items are natively focusable links or
  buttons. No custom key handlers on the nav container. Submenus open
  on Enter/Space and close on Escape, returning focus to the parent
  item.

### 6.2 Dashboard and Module List (DL/ML)

- Dashboard KPI tiles: each tile is a `<section>` with `aria-labelledby`
  pointing to the tile's heading. The heading identifies the metric:
  "Open Nonconformances". The value, trend indicator, and delta are
  within the section so they are associated programmatically.
- Data tables: semantic `<table>` with `<caption>` describing scope,
  `<thead>`, `<tbody>`, `<th scope="col">` for column headers, and
  `<th scope="row">` for row-level identifiers where applicable.
- Sort: column header sort buttons carry `aria-sort` updated on
  activation. Sort change is announced via an `aria-live="polite"`
  region adjacent to the table.
- Filter chips: each chip is `<button aria-pressed="true/false">
  {filter name}</button>`. Active state is communicated by `aria-pressed`
  and by the visual chip style.
- Pagination control: `aria-label="Pagination"` on the container.
  Current page button carries `aria-current="page"`. Previous/next
  buttons have `aria-label="Previous page"` / `"Next page"`. Disabled
  state (at first/last page) uses `disabled` attribute.
- Empty state: `<p role="status">No records found. {action suggestion.}</p>`.

### 6.3 Workspace Projections (WS)

- Virtual scrolling: recycled row elements update `aria-rowindex` as
  they are repositioned. `aria-rowcount` reflects the full server-side
  count received from the API response `meta.total_count`.
- Row selection announcement: when a row is selected via keyboard
  (Space), an `aria-live="polite"` region announces "{record ID}
  selected. {N} total selected."
- Bulk toolbar: appears above the grid when ≥1 row is selected.
  `aria-label` is dynamically updated: "Bulk actions — {N} items
  selected". The toolbar is the next focus destination after the last
  column header and before the first data row in tab order.
- Column reorder: drag-to-reorder columns has a non-drag alternative
  via the column configuration panel (accessible via the column header
  context menu, keyboard-reachable via the "..." button in each header).

### 6.4 Authoritative Record Shell (AR)

- Tab panel lazy load: when a tab activates and its content loads
  asynchronously, `aria-busy="true"` is set on the panel during load.
  On completion, `aria-busy` is removed and focus remains on the tab
  button (not moved into the panel, to avoid disrupting orientation).
  A status announcement "Section loaded" is injected via `aria-live=
  "polite"`.
- Audit trail infinite scroll: as additional audit events load, a
  "Loading more events" announcement is made via `aria-live="polite"`.
  On completion: "{N} more events loaded."
- Auto-save status: a persistent `<output aria-live="polite"
  role="status">` element at the bottom of the form shows "Unsaved
  changes" / "All changes saved" / "Saving..." and is announced on
  state change.
- E-signature flow: the PIN input carries `type="password"` and
  `aria-label="Electronic signature PIN"`. The quorum progress
  indicator (for multi-signatory records) carries `role="progressbar"`
  with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="{required
  signatures}"`, and `aria-label="Signatures received: {N} of
  {required}"`.

### 6.5 Non-Record Drawers (NRD)

- Focus trap: implemented via a `focustrap` utility that intercepts
  Tab and Shift+Tab when focus is inside the drawer. Focusable elements
  are identified via the selector `a[href]:not([disabled]),
  button:not([disabled]), input:not([disabled]), select:not([disabled]),
  textarea:not([disabled]), [tabindex]:not([tabindex="-1"])`.
- Escape key: `keydown` listener on `document` (not the drawer) so
  Escape works regardless of which element inside the drawer is focused.
  Escape closes the drawer and returns focus to the documented return-
  focus target.
- `inert` attribute: set on `document.body` children that are not the
  drawer root and not the toast container. Removed on close.
- Drawer type-specific return-focus:
  - List-row action drawer: return focus to the action trigger button
    in the row.
  - Record-level drawer: return focus to the button that opened it.
  - Global settings drawer: return focus to the settings icon button
    in the shell header.

### 6.6 Sub-Flow Wizards (WZ)

- Step validation: validation errors in the current step are announced
  before focus is moved. Sequence: (1) `aria-live="assertive"` region
  announces "3 errors in this step"; (2) 100ms delay; (3) focus moved
  to the first error field. The delay prevents the assertive announcement
  from being interrupted by the focus movement.
- Summary step: all user-entered values are rendered in a `<dl>` with
  `<dt>` (field name) and `<dd>` (user value). Screen readers can
  navigate the list with the list-navigation shortcut. Empty optional
  fields show "Not provided" in `<dd>` rather than being omitted.
- Wizard progress: the step indicator aria-label updates on each step:
  `aria-label="Step 2 of 5: Evidence Attachment"`. This is announced
  when focus arrives in the new step's heading.

---

## 7. Test Matrix

### 7.1 Automated CI Testing

**axe-core in Playwright E2E suite**
- File: `tests/e2e/module-template-v4-axe.spec.ts`
- Scope: all HMV4 surfaces rendered with fixture data in Chromium
- Threshold: zero violations at impact level `critical` or `serious`
  required to pass the CI gate
- Violations at impact `moderate` or `minor` are reported as warnings
  and tracked in the accessibility backlog but do not fail the gate
- Configuration: axe rules `color-contrast`, `label`, `image-alt`,
  `button-name`, `link-name`, `duplicate-id-active`, `focus-trap`,
  `landmark-one-main`, `region` are enabled at `critical` impact;
  full rule set enabled at `serious` impact
- Regression: axe results are stored per run; any new violation
  (even at `moderate`) compared to the previous baseline generates a
  warning annotation in the PR
- False positive management: documented axe rule disables require a
  comment citing the specific reason and a link to the tracking ticket;
  blanket `axe.configure({ rules: [{ id: '*', enabled: false }] })`
  is prohibited

**HTML validity**
- W3C Nu HTML Checker runs on each rendered surface snapshot
- Fatal parsing errors fail the CI gate; warnings are reported

**Contrast ratio check**
- Computed style contrast ratios for text/background token pairs are
  validated via Puppeteer's `getComputedStyle` in the design system
  token test suite (not part of the HMV4 spec files but linked as a
  dependency gate)

### 7.2 Manual Screen Reader Testing

Quarterly cadence; triggered immediately after any major surface change.

| Assistive Technology | Browser | Platform | Tester |
|---|---|---|---|
| NVDA 2024.x | Chrome (latest) | Windows 11 | Frontend QA |
| JAWS 2024.x | Chrome (latest) | Windows 11 | Frontend QA |
| VoiceOver | Safari (latest) | macOS Sequoia | Frontend QA |
| VoiceOver | Safari (iOS 17) | iPhone 15 | Frontend QA |
| TalkBack (Android 14) | Chrome (latest) | Pixel 8 | Frontend QA |

Test paths per surface: (1) Navigate to surface using AT; (2) Read all
visible content in order; (3) Complete the primary action (create/edit/
approve); (4) Navigate table/grid with AT; (5) Open and close a drawer;
(6) Complete a wizard to the summary step; (7) Trigger and read a form
validation error.

### 7.3 Manual Keyboard Testing

Bi-annual cadence; triggered after any keyboard interaction change.

All surfaces are tested with keyboard-only navigation. Test checklist:
- [ ] All interactive elements reachable via Tab
- [ ] Shift+Tab moves focus in reverse order
- [ ] Enter/Space activates buttons and links
- [ ] Arrow keys navigate composite widgets (grids, tabs, menus)
- [ ] Escape closes modals, drawers, menus, tooltips
- [ ] Focus visible on every interactive element
- [ ] Focus not obscured behind sticky headers
- [ ] Skip link appears on first Tab press and works correctly
- [ ] Wizard can be completed keyboard-only
- [ ] E-signature flow completes keyboard-only
- [ ] Bulk actions accessible keyboard-only

### 7.4 Manual Zoom Testing

Bi-annual cadence; triggered after any layout change.

- 200% zoom at 1280px viewport: all content readable; no horizontal
  scroll; all controls operable; no content clipped.
- 400% zoom (reflow at 320px viewport width equivalent): single-column
  layout; no horizontal scroll; all content accessible; sticky headers
  remain within viewport; data tables scroll horizontally within their
  own container.

### 7.5 Dark Mode and High Contrast

Quarterly cadence.

- System dark mode (`prefers-color-scheme: dark`): all text/background
  contrast ratios re-validated; focus rings visible; status icons
  visible.
- Windows High Contrast / Forced Colors mode: all interactive elements
  visible; focus indicators visible (browser renders its own high-
  contrast focus ring; custom focus ring must not be suppressed);
  content not lost.

### 7.6 Mobile and Tablet

Quarterly cadence.

- iOS 17 Safari on iPhone 15: touch target sizes ≥ 44×44; pinch-zoom
  not prevented; VoiceOver with Safari as above.
- Android 14 Chrome on Pixel 8: touch target sizes ≥ 44×44; TalkBack
  as above.

### 7.7 Annual Third-Party Audit

- Scope: every primary user path in the HESEM portal; each enabled
  J-class pack's primary surfaces.
- Auditor: accredited third-party firm (e.g., Deque Systems, Level
  Access, or Knowbility). Firm must hold CPACC, WAS, or equivalent
  accreditation.
- Deliverable: full audit report with severity-ranked findings (Critical,
  Major, Minor), WCAG 2.2 AA conformance statement per surface, and a
  Voluntary Product Accessibility Template (VPAT) in WCAG 2.2 format
  and EN 301 549 self-assessment format for EU tenants.
- Remediation: Critical findings → remediated within 14 days of report;
  Major → within 60 days; Minor → scheduled in next sprint backlog.
  All Critical and Major findings route to CAPA per H8.
- Evidence: audit report and VPAT retained per H4 evidence class EC-1
  (validation subtype: accessibility audit); signed by Quality Lead
  per H7.
- Tenant-facing: VPAT and EN 301 549 self-assessment included in the
  customer accessibility package in the Customer Validation Lifecycle
  Portal (CVLP); updated within 30 days of audit completion.

### 7.8 Per-Pack J4 IEC 62366 Usability Testing

- Formative: at each sprint boundary where a J4-relevant surface has
  changed. Protocol as defined in §5.2.
- Summative: once per device integration, prior to regulatory submission.
  Protocol as defined in §5.3.
- Evidence: test reports included in the UEF (QMS-UEF-{device-code});
  summary findings linked to H4 evidence class EC-1 (subtype: IEC 62366
  usability test).

---

## 8. CI Gate Specification

```
GATE NAME              hmv4-accessibility-gate
TRIGGER                every PR targeting main that touches any file
                       matching mom/scripts/portal/7*.js,
                       mom/styles/module-template-v4*,
                       mom/templates/module-template-v4/**,
                       tests/e2e/module-template-v4*.spec.ts
PASS CONDITION         axe-core: 0 critical violations, 0 serious
                       violations across all HMV4 surface snapshots
FAIL CONDITION         any critical or serious axe-core violation;
                       any new violation compared to baseline
                       (regression detection)
EXEMPTION PROCESS      pre-approved exemptions only; each exemption
                       requires: axe rule ID, affected element selector,
                       reason (must be specific — e.g., "third-party
                       component; vendor ticket #1234 open"), tracking
                       ticket reference, and Quality Lead approval.
                       No blanket exemptions.
EXEMPTION FORMAT       axe.configure({ rules: [{ id: 'rule-name',
                       selector: '.specific-selector', enabled: false }] })
                       with JSDoc comment linking to exemption record
MODERATE/MINOR         reported as PR annotation warnings; do not fail
                       gate; tracked in accessibility backlog with SLA
                       (Moderate: next sprint; Minor: within 90 days)
PRE-PRODUCTION GATE    full axe-core scan + manual keyboard sample +
                       manual SR sample required before W1 gate sign-off
PER-WAVE              comprehensive axe-core + manual SR + manual
                       keyboard at W1, W4, W6, W8 milestones
PER-PACK              pack-specific manual review at each pack GA
```

---

## 9. Evidence Emission

```
EVIDENCE ARTIFACT             CLASS        SUBTYPE           SIGNER
Automated CI scan run log     EC-1         a11y-ci           CI system
Manual screen reader report   EC-1         a11y-manual-sr    Frontend QA
Manual keyboard test report   EC-1         a11y-manual-kb    Frontend QA
Annual audit report           EC-1         a11y-audit        Quality Lead
VPAT (per product)            EC-1         a11y-vpat         Quality Lead
EN 301 549 self-assessment    EC-1         a11y-en301549     Compliance Lead
Findings CAPA records         EC-14        CAPA              Quality Lead
Customer VPAT delivery        CVLP entry   —                 CSM
IEC 62366 formative report    EC-1         iec62366-form     Quality Lead
IEC 62366 summative report    EC-1         iec62366-summ     Quality Lead
UEF document                  controlled   QMS-UEF-{code}    Quality Lead
```

All EC-1 evidence is linked to the corresponding surface audit trail
via the `audit_evidence` schema. CAPA records reference the source
audit finding ID per H8 §4.

---

## 10. Failure Modes and Recovery

| ID | Failure Mode | Detection | Recovery |
|---|---|---|---|
| FM-A11-01 | PR introduces serious axe-core violation | CI gate fails | Engineer remediates; re-run CI; QA reviews fix |
| FM-A11-02 | New surface deployed without accessibility review | Pre-release readiness gate H7 | Surface blocked from W1 gate until review complete |
| FM-A11-03 | Annual audit overdue | H6 operational health surfaces gap | H8 CAPA; certification at risk for EU tenants; CSM notified |
| FM-A11-04 | Customer-reported accessibility failure post-release | CSM escalation | H8 CAPA; tenant communication; hotfix if Critical |
| FM-A11-05 | IEC 62366 summative test missed (J4) | UEF review; regulatory submission checklist | Device integration blocked; J4 pack cannot ship; H8 CAPA |
| FM-A11-06 | Screen reader regression undiscovered for one quarter | Next quarterly manual review | Root cause: insufficient coverage; H8 CAPA on test matrix; increase frequency to bi-monthly for affected surface |
| FM-A11-07 | Graphics Authority token change breaks contrast ratio | Automated contrast check in token test suite | Token change rejected at PR gate; re-validation required before merge |
| FM-A11-08 | axe-core exemption scope creep | Exemption audit in quarterly review | Exemptions without valid justification or open vendor ticket revoked; violations remediated |

---

## 11. Roles and Responsibilities (RACI)

```
Role                   Author  Review  CI-Gate  Annual  Pack-Test  CAPA
Frontend Lead          A       A       A        R       R          R
Quality Lead           C       C       C        A       C          A
Compliance Lead        C       C       C        A       C          C
Engineering Lead       R       C       R        C       C          C
Vertical Pack Lead     C(pack) C(pack) C        R(pack) A(pack)    C
Domain Lead            R       R       —        —       —          —
External Auditor       —       —       —        R       —          —
Customer (DPO/QA)      I       —       —        I       —          —
IEC 62366 Study Dir.   —       —       —        —       A(J4)      —
```

A = Accountable, R = Responsible, C = Consulted, I = Informed.

---

## 12. Cross-References

- F0 — Part F pattern catalog (surface definitions)
- F1 — Shell and navigation patterns (SH skip links, landmark nav)
- F2 — Dashboard patterns (DL KPI tile ARIA)
- F3 — Module list patterns (ML table ARIA, sort, pagination)
- F4 — Workspace projections (WS grid ARIA, virtual scroll)
- F5 — Authoritative record shells (AR form ARIA, e-sig)
- F6 — Action consoles (AC live region, alert acknowledge)
- F7 — Drawers and dialogs (NRD focus trap, inert, return-focus)
- F8 — Sub-flow wizards (WZ step management, validation)
- F9 — Frontend-backend binding (live data announced via aria-live)
- F10 — Design system tokens (Graphics Authority; contrast validation)
- F12 — Internationalization (lang attribute, RTL, multilingual content)
- H4 — Evidence emission (EC-1 accessibility evidence class)
- H7 — Pre-release readiness gate (accessibility sign-off)
- H8 — CAPA routing (accessibility findings)
- J4 — Medical Device pack (IEC 62366 UEF, ISO 14971)
- ADR-0009 — Graphics Authority no-hardcode rule (contrast enforcement)

---

```
S3-12_F11_ACCESSIBILITY_DEEP_UPGRADE_COMPLETE
```
