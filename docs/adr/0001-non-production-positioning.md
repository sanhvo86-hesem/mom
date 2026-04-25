# ADR 0001: Non-production positioning for slice work

## Status

Accepted (2026-04-25)

## Context

The HESEM Operations Platform frontend redesign is delivered as a
slice-based prototype program on top of the existing portal, using a
feature-flagged `module-template-v4` (HMV4) layer. The current portal
remains the production system; HMV4 is **not** production-ready and
must not be treated as such.

Confusion between "in development" and "production rollout" risks:
- Backend teams treating fixture endpoints as canonical
- QA teams expecting validation evidence under regulatory regimes
- Stakeholders demanding production SLAs for prototype slices
- Documents using "production go-live" wording inappropriately

Step 1-8 architectural masters and V6-V18 Codex execution packages all
operate under this assumption but did not formally codify it as a
governance rule.

## Decision

All HMV4 slice work is **development/prototype only** until explicit
production cutover is approved per a future ADR.

**Wording rules** (mandatory in all slice prompts and reports):

✅ Allowed:
- `development/prototype`
- `current portal safety`
- `pre-production readiness`
- `first-slice prototype`
- `limited Wave 1 implementation`

❌ Forbidden:
- `production go-live`
- `production cutover`
- `production release`
- `validated production system`

**Runtime posture** (mandatory):
- HMV4 inert by default (`window.HMV4_PREVIEW_ENABLED = false`)
- Fixture data only in `tests/fixtures/module-template-v4/`
- No live API integration in slice work
- No `mom/qms-data` registry promotion without explicit approval
- No current portal navigation switch

## Consequences

### Positive
- Clear separation between prototype and production
- Slice work can iterate fast without regulatory burden
- Feature flag posture prevents accidental production exposure

### Negative
- Live API integration deferred to a later phase, increasing migration risk
- Fixture data may diverge from real schema over time
- Stakeholders may grow impatient for visible production progress

### Neutral
- A future ADR will define the production cutover criteria
- Validation evidence track can begin parallel to slice work

## Alternatives Considered

### Alternative 1: Production-from-Slice-1
Treat each slice as a production rollout with regulatory validation
gate. Rejected: too risky for a clean-slate redesign; no slice could
ship until full Wave 1 validated.

### Alternative 2: Implicit dev posture (no formal rule)
Keep posture implicit in slice prompts. Rejected: invites wording drift
and stakeholder confusion; no enforcement mechanism.

## References

- `_reports/module-template-v4/` `NON_PRODUCTION_DELIVERY_POSITIONING.md` (V18 package)
- `STEP1_MASTER_CONTEXT.md` (Step 1 architecture)
- `_reports/module-template-v4/STRATEGIC_MASTER.md` Section 2.1
- `_reports/module-template-v4/EXECUTIVE_REVIEW_FOR_GPT_PRO.md`

## History

- 2026-04-25: Proposed and Accepted (codified during parallel strategic work session)
