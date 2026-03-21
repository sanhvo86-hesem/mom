# HESEM QMS — Phase 2G Portal Metadata Harmonization Note

## What changed
- Filled missing document descriptions for active codes that were still blank in portal metadata.
- Added folder descriptions for major system, organization, and training branches that were previously generic or empty.
- Introduced `doc_owner_overrides.json` so portal scan can display more realistic owners for handbooks and selected organization documents.

## Intent
Improve search relevance, preview quality, and owner visibility without exposing retired content or changing document authority rules.

## Guardrails
- Exact code owner overrides win over path-prefix overrides.
- Prefix overrides are limited to broad training branches where filename prefixes are too coarse.
- Fallback ownership still comes from the existing `derive_owner()` logic in `api.php`.
