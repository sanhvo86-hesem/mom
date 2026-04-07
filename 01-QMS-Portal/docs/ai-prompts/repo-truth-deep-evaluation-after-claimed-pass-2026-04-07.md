# Repo-truth deep evaluation after claimed PASS (2026-04-07)

## Bottom line

The pasted summary claims a full PASS state with `533/533 ready`, `0 partial`, and `OpenAPI 3.1.2`.

The currently verifiable public repo state does **not** support that claim yet.

## What the public repo currently shows

### 1. OpenAPI is still 3.1.1
The public `01-QMS-Portal/api/openapi.yaml` currently starts with:
- `openapi: "3.1.1"`

The file does already include:
- RFC 9457 `application/problem+json`
- governance approval-group routes
- `If-Match` and `ETag` semantics on the decision flow

So the contract hardening is real, but the version claim `3.1.2` is not yet reflected in the file that is publicly visible.

### 2. Manifest and quality report still disagree
The public `registry-manifest.json` currently shows:
- workflow bridge ready = `103`
- workflow bridge blocked = `12`
- ready entities = `425`
- partial entities = `108`

The public `registry-quality-report.json` currently shows:
- workflow bridge ready = `104`
- workflow bridge blocked = `11`
- ready entities = `425`
- partial entities = `108`
- publishability ready = `false`

So there is still **split-truth** between the two canonical registry artifacts.

### 3. Publication scope is still slice-scoped, not global
Both public registry artifacts still show:
- `slice_publication_pass = foundation_governance_contract_slice`

That means the publication truth is still centered on the Foundation Governance slice, not on a proven platform-global publishability state.

### 4. Public prompt lineage is incomplete/opaque
The public `01-QMS-Portal/docs/ai-prompts/` tree clearly shows the long Prompt 02 lineage, the Prompt 03 bundle, and `prompt-04-master-orchestrator-final-package-2026-04-06.md`.

However, Prompt 05 / Prompt 06 are not externally visible from that public tree baseline, so prompt lineage remains hard to verify from the repo alone.

### 5. Large artifacts are still hard to externally audit
`frontend-foundation-catalog.json` and `endpoint-catalog.json` are too large for normal GitHub web rendering. That is not a defect by itself, but it means a reviewer cannot easily verify readiness/publishability without smaller truth-summary artifacts.

## What is actually good

There has still been meaningful progress in the repo:
- governance routes exist in the public OpenAPI
- RFC 9457 problem responses are present
- conditional request semantics are documented for approval-group decisions
- the canonical registry artifacts share the same externally visible run ID and generatedAt timestamp
- the platform is far beyond the original Prompt 02 foundation-governance starting point

## Real remaining gaps to close

1. Make repo truth internally consistent across manifest, quality report, endpoint catalog, and frontend catalog.
2. Upgrade public OpenAPI truth from `3.1.1` to `3.1.2`.
3. Replace slice-scoped publication truth with either honest global publishability or an explicit global blocker ledger.
4. Close or truthfully ledger the remaining partial entities and bridge blockers.
5. Add compact, machine-readable summary artifacts so external reviewers can verify the repo without opening giant catalogs.
6. Add prompt-lineage index / publication-lineage index so the repo explains itself without relying on chat history.

## Conclusion

The repo is not in the claimed `533/533 ready, global PASS` state yet.

The right next move is **not** another planning package. The right next move is a strict execution prompt that forces:
- one publication authority,
- one truth verifier,
- one prompt-lineage index,
- small proof artifacts,
- and honest closure of the remaining publishability gaps.
