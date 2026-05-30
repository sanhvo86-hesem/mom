# P08 Audit Report

Prompt: P08
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P08 commit: 856c6c5512bb2e06700ec6683f612c72045e99fd
Decision token: UOM_V5_P08_CONTEXTUAL_CONVERSION_LOCKED

## Static Audit

- REPO_EVIDENCE: `ConversionEngine` checks contextual routes before rejecting Volume/Mass, Potency/Mass, or packaging policy conversions.
- REPO_EVIDENCE: Missing density context returns `UOM_CONTEXT_REQUIRED`.
- REPO_EVIDENCE: Missing or expired potency evidence returns `UOM_MISSING_ASSAY_EVIDENCE`.
- REPO_EVIDENCE: Missing or expired packaging policy returns `UOM_MISSING_PACKAGING_POLICY`.
- REPO_EVIDENCE: Contextual MEASVAL evidence includes route, source fields, and context-required marker.

## Governance Audit

- Density requires material/item/substance plus direct evidence or active registry row.
- Potency requires substance, assay method, potency value/unit, lot, certificate, expiry, and approver.
- Packaging requires item and packaging level, with optional site/supplier/customer and as-of date.
- No AI path creates or approves contextual conversion evidence.

## Cache/Staleness Audit

- Packaging resolution is as-of aware and rejects `effective_to <= as_of`.
- Density lookup prefers lot-specific rows and respects effective-to current date.
- No stale contextual conversion result is cached in P08.

## Hard Gate Result

P08 hard gates pass with warnings. The only full-suite failure is unrelated KPI registry count drift.
