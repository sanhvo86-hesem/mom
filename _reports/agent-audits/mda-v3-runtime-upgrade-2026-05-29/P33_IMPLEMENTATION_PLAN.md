# P33 Implementation Plan

## Scope

Implementation mode: `hybrid`.

P33 implements an additive canonical quality hold/case gate. It does not replace legacy OQC/IQC/NCR/MRB/CAPA/Complaint/SCAR controllers and does not claim the quality domain is runtime-complete.

## Files to edit

- `mom/database/migrations/237_canonical_quality_case_hold_authority.sql`
- `mom/api/services/CanonicalQualityCaseAuthorityService.php`
- `mom/tests/Unit/Services/CanonicalQualityCaseAuthorityServiceTest.php`
- `mom/api/services/Evidence/ElectronicSignatureChallengeService.php`
- `mom/api/controllers/GenericCrudController.php`
- `mom/contracts/governed-entities.json`
- `mom/contracts/governed-entities.yaml`
- `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_PROOF_MATRIX.csv`
- P33 report artifacts in `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/`

## Files intentionally not edited

- UOM files, because P33 has no measurement/UOM scope and another AI session is active there.
- Existing logistics, supplier, and customer portal mutation endpoints, because replacing those requires a domain command handler rollout and regression pass.
- `mom/contracts/table-registry.json`, because it is generated.
- Inventory ledger/cost posting handlers, because P36 owns ledger authority.

## Runtime repair steps

1. Add `quality_holds` as the canonical subject/source hold table.
2. Add `quality_order_trigger_ledger` to prevent duplicate quality orders from the same governed trigger.
3. Add `quality_case_trace_link` to hold complaint/NCR/CAPA/SCAR trace links outside freeform metadata.
4. Seed regulated command policies for use-as-is MRB, CAPA approval, critical SCAR issue, and complaint closure.
5. Add `CanonicalQualityCaseAuthorityService` for hold gate, failure containment plan, MRB use-as-is gate, SCAR supplier approval block, and complaint backward trace.
6. Add tests covering all required P33 simulations.
7. Add P33 tables/actions to governed registry, Generic CRUD fallback denylist, and runtime proof matrix.

## Acceptance evidence

- New service and test pass PHP syntax.
- Bulk service/controller PHP syntax passes.
- Governed entity JSON parses.
- Direct service smoke proves OQC containment, active hold block, SCAR supplier block, and complaint backward trace.
- Runtime authority audit still reports JSON_ONLY; no runtime-complete claim is made.

## Remaining implementation requirements

- P34 must make WO/release/start and shipment gates consume `quality_holds`.
- P36 must make putaway/issue/move/cost ledger commands consume `quality_holds`.
- P37/P40 must wire live PG command handlers, audit/evidence/outbox/signature links, generated status parity, telemetry, and restore drill.
