# Registry Artifact Segmentation Benchmark - 2026-04-14

## Issue

The Data Schema control plane flagged `large_registry_artifacts` because
`mom/data/registry/system-contract-runtime-projections.json` exceeded 10 MB.
The previous posture relied on a manual warning: use careful edit discipline,
segmented reads, revision-guarded saves, and targeted rebuilds. That was not
enough operational proof because the artifact itself did not expose a segment
manifest or checksum guard.

## External Benchmark

- Microsoft Azure Blob Storage documents optimistic concurrency with ETags and
  `If-Match`; stale writes fail with HTTP 412 instead of silently overwriting a
  newer object. Source: https://learn.microsoft.com/en-us/azure/storage/blobs/concurrency-manage
- Google Cloud Storage request preconditions use generation/metageneration and
  ETag criteria; mismatches fail with 412, while freshness checks can return
  304 instead of downloading an unchanged large object. Source:
  https://docs.cloud.google.com/storage/docs/request-preconditions
- Google Cloud Storage warns that ranged reads can become corrupt if the object
  changes between reads and recommends preconditions to pin the object version.
  Source: https://docs.cloud.google.com/storage/docs/consistency
- SAP RAP/OData optimistic concurrency requires clients to send the current ETag
  on modifying operations. Source:
  https://help.sap.com/docs/abap-cloud/abap-rap/optimistic-concurrency-control

## Applied Pattern

The local equivalent is not cloud object storage, but the control-plane risk is
the same: a large generated object must not be consumed or rewritten as an
unguarded monolith.

Implemented guardrails:

- Generate a sidecar segment manifest:
  `mom/data/registry/system-contract-runtime-projections-segments.json`.
- Generate bounded section files under:
  `mom/data/registry/system-contract-runtime-projections.segments/`.
- Record `sourceSha256`, source size, per-segment size, per-segment checksum,
  record counts, read profiles, and targeted rebuild policy.
- Treat the full file as rebuild/proof authority and the segment manifest as
  the safe read/edit discipline proof.
- Data Schema now validates the sidecar against the full artifact checksum and
  every segment checksum before clearing the operational risk.

## Acceptance Evidence

The risk is considered closed only when all are true:

- `system-contract-runtime-projections.json` exists.
- `system-contract-runtime-projections-segments.json` source checksum matches
  the full artifact.
- All segment files exist and match recorded checksums.
- The largest segment is smaller than the full artifact.
- Data Schema reports `artifactAccess.largeArtifactRiskCount = 0`.
- Data Schema reports at least one segmented artifact with status `ready`.

