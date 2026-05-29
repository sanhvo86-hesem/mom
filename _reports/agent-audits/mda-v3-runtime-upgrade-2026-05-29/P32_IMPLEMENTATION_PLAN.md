# P32 Implementation Plan

## Scope

Implementation mode: `hybrid`.

P32 repairs the runtime gate layer for regulated workflow/status/approval/evidence/e-sign checks. It deliberately does not implement domain-specific release/merge/hold command handlers; those remain with P33, P34, P36, and P37 so command ownership stays domain-local.

## Files to edit

- `mom/database/migrations/236_regulated_command_evidence_policy.sql`
- `mom/api/services/RegulatedCommandEvidenceGateService.php`
- `mom/api/services/Evidence/ElectronicSignatureChallengeService.php`
- `mom/tests/Unit/Services/RegulatedCommandEvidenceGateServiceTest.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`
- P32 report artifacts under `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/`

## Files intentionally not edited

- UOM files, because another AI session is working there and P32 does not require them.
- User identity writer files, because `.ai/USER_IDENTITY_SSOT.md` blocks ad-hoc identity mutation.
- `mom/contracts/table-registry.json`, because it is generated and must be refreshed by a registry generation prompt, not hand-edited.
- SO/JO/WO, quality hold, inventory, and engineering business command handlers, because P33/P34/P36/P37 own those domain transaction paths.

## Runtime repair steps

1. Add a physical `regulated_command_policy` table for command-to-policy binding.
2. Add `regulated_command_policy_step` for approval steps, role expectations, evidence expectations, and SoD rule metadata.
3. Add `regulated_command_signature_event_link` for command-to-signature/challenge evidence linkage, with SHA-256 and same-actor constraints.
4. Seed active policies for `EngineeringReleasePackage.Release`, `ItemRevision.Release`, `QualityHold.Release`, and `PartyMerge.Apply`.
5. Add `RegulatedCommandEvidenceGateService` to evaluate signature meaning, signer identity, timestamp, record hash, SoD, re-auth challenge replay, audit store availability, approval policy completeness, and workflow/status parity.
6. Extend e-sign challenge allowed actions for regulated MDA commands.
7. Add unit-test coverage for all required P32 simulations.
8. Update governed entity registry and runtime proof matrix to reflect partial repair and remaining live-command gaps.

## Acceptance evidence

- PHP syntax checks pass on new and touched PHP files.
- Bulk `php -l` over services/controllers passes.
- Governed entity JSON parses.
- Direct service smoke proves allow path, SoD block, and replay block.
- Runtime authority audit remains JSON_ONLY, so no production/PostgreSQL-primary claim is made.

## Remaining implementation requirements

- P33 must wire canonical quality hold/NCR/MRB/CAPA/complaint/SCAR commands to this gate where regulated.
- P34 must wire engineering release and WO release/start gates to this policy/evidence spine.
- P36 must apply the same pattern to regulated inventory/cost adjustments.
- P37/P40 must add generated OpenAPI/Arazzo/status parity, telemetry, restore drill, and live PG command audit/evidence writes.
