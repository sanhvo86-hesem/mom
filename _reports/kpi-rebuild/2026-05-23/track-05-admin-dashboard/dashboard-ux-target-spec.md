# Track 05 Dashboard UX Target Spec

Date: 2026-05-23

## UX Rule

Every KPI surface must tell the user whether a metric is runtime, manual-governed, staged, retired, gate-only, operating, health, or counter. A staged metric must never look like a green/red active scorecard metric.

## Implemented UX Changes

- Admin Console first screen is now a structured governance console with tabs instead of a single library-only surface.
- Metric cards still use the existing inline editor, but the editor exposes only allowed governance fields.
- Add metric is renamed to metric proposal and requires data-contract gap plus graduation condition.
- Staged/manual cards expose data-contract gap, graduation condition, and evidence source fields.
- Official, operating, gate, data-contract, counter, retired, and audit views are separated for scanning.
- JD renderer now reads `active_scorecard` when present and keeps `scorecard` as compatibility projection.
- JD renderer displays candidate bank context when supplied.
- JD renderer explicitly states scorecards are for coaching/OJT/calibration and not direct discipline from one metric.
- KPI badge and JD renderer styles now use CSS tokens instead of hardcoded color literals.

## Dashboard/API Display Rules

Official scorecard:

- Show only governance/official KPI rows.
- Display counter-metric next to any reward or scorecard metric.
- Display staged reward as an integrity failure, not as an active result.

Operating/daily/weekly:

- Operating metrics remain visible but separate from official scorecard.
- TOC/weekly views should use constraint, buffer, lost-hour, WIP, and escalation metrics as operating controls until runtime contracts are approved.

Gate G0-G7:

- Gate controls are grouped by gate.
- Linked CDR coverage is visible.
- Missing CDR should become a P1 finding.

Data contracts:

- Runtime metrics show runtime endpoint.
- Manual/staged metrics show input endpoint and no runtime endpoint.
- Staged metrics must carry gap/graduation text before the Console persists them as a new proposal.

No-data and insufficient-data:

- Runtime APIs continue to use grey/no-data behavior from `KpiEngine` when there is no usable sample.
- Staged metrics remain candidate/staged even if someone posts manual input.

## Remaining UX Risks

- The Admin Console now has the required tab structure, but a browser smoke test still depends on an authenticated local portal session.
- Drag/reorder for JD active/candidate measures was not implemented; this branch exposes summary and compatibility renderer only.
- The two staged reward-eligible metrics remain source-of-truth registry debt and should be corrected in KPI strategy/data-contract remediation.
