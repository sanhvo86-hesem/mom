# P40 Multi-Role Adversarial Audit

## Verdict

P40 is acceptable as a controlled frontend projection-safety slice. It is not a deployed operator UI proof because no browser component was wired and no VPS/Chrome smoke was run in this prompt.

## Findings

- Source authority: workspaces are explicitly classified as projection-only through route grammar and policy anchors.
- Runtime bypass: Generic CRUD cannot mutate P40 tables; workspace actions return disabled decisions for unsafe action classes.
- Operator safety: stale projections disable transitions and releases with explicit reasons.
- Quality containment: record shells expose audit/evidence and command re-anchor links; quality hold release cannot execute from workspace projection.
- Financial/inventory correctness: offline completion is a candidate only and cannot set `committed_to_authority=true` in the P40 queue table.
- Security/SoD: P40 does not bypass P39/P32; record shell commands must still route through governed command/evidence gates.
- Migration/cutover: migration 243 is additive and does not alter existing UI routes.
- UI evidence: controller action endpoints exist, but browser component wiring is open.
- Auditor defensibility: all P40 service decisions include deterministic evidence hashes; persistence is still pending.

## Repairs Applied Before Handoff

- Added explicit `/ops/ar/{root}/{id}` and `/ops/ws/{workspace}` classification.
- Added disabled action reason payload for workspace mutation and stale projection.
- Added offline candidate payload hash and `committed_to_authority=false`.
- Added unknown alias hard denial so frontend cannot infer record IDs.
- Added P40 tables to Generic CRUD hard-stop and governed entity registry.
