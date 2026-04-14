# Tranche 13 - Agent 3 Pass 2 Vendor Benchmark Red-Team

Date: 2026-04-14

Scope note: official vendor sources were used whenever possible. Critical Manufacturing, ETQ, and MasterControl are outside the root AGENTS allowlist for this repo, so their official domains were used only because this tranche explicitly required vendor benchmark refresh. That is a policy conflict, and it is stated here rather than hidden.

## Bottom Line

The registry, hygiene, and proof-layer work materially improved honesty, auditability, and failure visibility. It did **not** materially improve product-level parity against SAP Digital Manufacturing, Siemens Opcenter APS, Siemens Opcenter Quality, Critical Manufacturing, ETQ, or MasterControl.

What improved:
- runtime authority now distinguishes mixed authority from strict authority
- canonical registry overlays now prefer controlled contract metadata instead of trusting one source blindly
- publication truth checks now fail fast when required artifacts are missing
- dry-run publication output now says `DRY-RUN (NOT VERIFIED)` instead of pretending to pass

What did **not** change:
- no APS solver appeared
- no supplier portal appeared
- no enterprise data platform appeared
- no native SPC cockpit appeared
- no eBR/eDHR workflow appeared
- no suite-level EQMS cohesion appeared

## Proof-Layer Delta

### Evidence that the work is more honest

- `mom/api/services/RegistryService.php:185-214` now merges runtime registry data with controlled contract registry data, and `:217-491` preserves controlled metadata when runtime metadata is empty or partial.
- `mom/api/services/CanonicalManufacturingSpineService.php:415-491` now overlays runtime and contract registry tables instead of assuming one path is authoritative.
- `mom/api/services/RuntimeAuthorityService.php:75-108` now reports `non_authoritative_slices`, `mixed_authority`, and `strict_authority_ready`.
- `mom/api/controllers/HealthController.php:263-273` now surfaces `runtime_authority_strict` separately from the older, more permissive runtime authority signal.
- `mom/tools/registry/verify_publication_truth.py:106-159` now exits early when required publication artifacts are missing, instead of letting later gates imply trust.
- `mom/tools/registry/canonical_publication_orchestrator.py:906-918` now prints `DRY-RUN (NOT VERIFIED)` and returns cleanly in dry-run mode.
- `mom/tools/registry/generate_operational_blind_spot_report.py:39-42` now refuses to run without its required inputs.

### Evidence that the proof layer is still incomplete

- `python3 mom/tools/registry/verify_publication_truth.py` still reports `missing_count=39` required artifacts and skips publication-dependent gates.
- `mom/api/controllers/HealthController.php:270-272` still computes `runtime_authority` from `authority['ok']` and idempotency status, so a consumer that ignores `runtime_authority_strict` can still overread the payload.
- `mom/api/services/RuntimeAuthorityService.php:89-108` still returns `ok => $degraded === []`, which can be true while `mixed_authority` is also true. That is honest only if downstream consumers read the stricter fields.

## Vendor Red-Team

### SAP Digital Manufacturing

Table stakes:
- MOM execution
- operator guidance and work instructions
- skills and certification control
- planning/execution coordination

Differentiators:
- closed-loop resource planning
- dispatch and monitoring
- cloud delivery on SAP BTP
- top-floor to shop-floor coordination

Repo matches:
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html`
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html`
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html`
- `mom/api/services/TrustedReleaseRecordService.php`

Repo gaps:
- no live operator cockpit
- no closed-loop resource orchestration engine
- no runtime workforce integration comparable to SAP's suite depth

False parity risk:
- stronger evidence handling is not the same as SAP DM-class orchestration
- the new strict authority flag should not be misread as SAP-grade scheduling or execution breadth

Official sources used:
- https://www.sap.com/products/scm/digital-manufacturing.html
- https://www.sap.com/products/scm/digital-manufacturing/features.html
- https://help.sap.com/doc/5796094639494b0d8524485c77e71a1b/latest/en-US/SAP_DMC_Operations_Guide_enUS.pdf
- https://help.sap.com/doc/13c9f83611f94a5ab2c94f23cacfc217/latest/en-US/SAP_DMC_FSD_enUS.pdf

Assessment after implementation:
- materially stronger on proof and trustworthiness
- not materially stronger on SAP DM positioning

### Siemens Opcenter APS

Table stakes:
- planning and scheduling
- BOM and material planning
- MTO/MTS support
- what-if sequencing

Differentiators:
- finite-capacity scheduling
- multi-horizon planning and sequencing
- constraint modeling
- bottleneck awareness

Repo matches:
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html`
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md`
- `mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md`

Repo gaps:
- no APS solver
- no sequencer workspace
- no what-if optimizer

False parity risk:
- controlled snapshots and planning tables are still not an APS engine
- the proof-layer upgrade does not create constraint optimization

Official sources used:
- https://plm.sw.siemens.com/en-US/opcenter/products/aps/advanced-scheduling/
- https://static.sw.cdn.siemens.com/siemens-disw-assets/public/51YxjmmJUynYnLYQD4yVGB/en-US/Siemens%20SW%20Production%20planning%20in%20a%20complex%20supply%20chain%20E-Book.pdf
- https://static.sw.cdn.siemens.com/siemens-disw-assets/public/4LThJGql1ue6mJNHAUcQhG/en-US/Siemens%20SW%20What%E2%80%99s%20new%20in%20Opcenter%20APS%202304%20Fact%20Sheet.pdf

Assessment after implementation:
- no material position change
- honesty improved because the repo still has no optimizer and no solver

### Siemens Opcenter Quality / QC / Supplier Quality

Table stakes:
- inspection plan management
- incoming inspection
- SPC
- nonconformance handling
- supplier quality workflows

Differentiators:
- inspection planning for complex products
- supplier assessment portal
- cloud QMS cohesion
- APQP-oriented quality planning

Repo matches:
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html`
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html`
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html`
- `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html`
- `mom/api/services/ApqpPpapService.php`

Repo gaps:
- no native supplier portal
- no automatic inspection-plan derivation
- no verified SPC cockpit

False parity risk:
- PPAP, receiving, SCAR, and NCR/CAPA adjacency are a good base, but they are not Opcenter Quality depth
- the proof-layer work does not create a quality cloud suite

Official sources used:
- https://plm.sw.siemens.com/en-US/opcenter/quality/
- https://plm.sw.siemens.com/en-US/products/opcenter/quality/inspection-plan-management/
- https://plm.sw.siemens.com/en-us/products/opcenter/quality/quality-control/
- https://plm.sw.siemens.com/en-US/products/opcenter/quality/supplier-assessment-portal/

Assessment after implementation:
- no material position change
- no new false parity claims introduced in this area

### Critical Manufacturing

Table stakes:
- enterprise manufacturing data platform
- canonical data model
- event-centric capture
- genealogy / production history

Differentiators:
- enterprise data platform framing
- unified namespace support
- canonical data model across sites
- multi-site analytics positioning

Repo matches:
- `mom/docs/canonical-erp-mes-eqms-7-layer-schema-map-2026-04-05.md`
- `mom/docs/canonical-vs-hesem-schema-world-evaluation-2026-04-06.md`
- `mom/api/services/TrustedReleaseRecordService.php`
- `mom/api/services/CanonicalManufacturingSpineService.php`

Repo gaps:
- no production enterprise data platform
- no event broker or ingestion layer
- no genealogy explorer product

False parity risk:
- the new canonical registry overlay is helpful, but it is still not a manufacturing data platform
- the improved authority reporting should not be mistaken for cross-site platform parity

Official sources used:
- https://www.criticalmanufacturing.com/mes-for-industry-4-0/the-data-platform-for-manufacturers/
- https://www.criticalmanufacturing.com/mes-for-industry-4-0/apps/genealogic/
- https://www.criticalmanufacturing.com/insights/mes-industry-4-0-summit/enterprise-data-platform-uns-powering-multi-site-analytics-with-a-canonical-data-model/
- https://www.criticalmanufacturing.com/mes-for-industry-4-0/unified-namespace/

Assessment after implementation:
- slightly stronger on canonical truth and genealogy credibility
- not materially stronger on platform breadth

### ETQ

Table stakes:
- supply chain quality
- PPAP
- receiving inspection
- SCAR
- supplier rating
- document control
- training
- CAPA

Differentiators:
- integrated QMS suite breadth
- document-control-triggered training tasks
- supplier quality module depth
- connected change management

Repo matches:
- `mom/api/services/ApqpPpapService.php`
- `mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html`
- `mom/docs/operations/sops/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html`
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html`
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html`
- `mom/docs/operations/sops/06-SOP-600/sop-606-ncr-capa-and-ipqc-reaction.html`

Repo gaps:
- no one-platform QMS shell
- no supplier portal collaboration layer
- no runtime training orchestration tied to document revision changes

False parity risk:
- controlled SOPs and evidence records are not the same as an ETQ-class suite
- the proof-layer changes do not create automated QMS connectivity

Official sources used:
- https://www.etq.com/supply-chain-quality/
- https://www.etq.com/document-control/
- https://www.etq.com/change-management/
- https://www.etq.com/platform/
- https://www.etq.com/corrective-action-management/

Assessment after implementation:
- no material position change
- the repo is more honest about its quality backbone than before

### MasterControl

Table stakes:
- document control
- training management
- CAPA
- audits
- production records
- batch/device history records

Differentiators:
- automatic routing and training task triggering on revision changes
- connected closed-loop quality
- eBR/eDHR depth
- review-by-exception execution

Repo matches:
- `mom/docs/operations/sops/08-SOP-800/sop-801-competence-training-and-certification.html`
- `mom/docs/operations/sops/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html`
- `mom/docs/operations/sops/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html`
- `mom/api/services/TrustedReleaseRecordService.php`

Repo gaps:
- no connected suite for document control, training, CAPA, and audit
- no automatic training orchestration on document revision changes
- no eBR/eDHR authoring/review surface

False parity risk:
- better release provenance does not equal MasterControl-class connected quality
- the new publication truth gating is about honesty, not suite parity

Official sources used:
- https://www.mastercontrol.com/ppc/document-control-software/
- https://www.mastercontrol.com/quality/document-control-software/revision-management-software/
- https://www.mastercontrol.com/manufacturing/
- https://www.mastercontrol.com/quality/quality-assurance/training/
- https://courses.mastercontrol.com/resources/Guide_to_Learning_Services.pdf

Assessment after implementation:
- no material position change
- proof-layer trust improved, but suite cohesion is still missing

## New False-Parity Risk Introduced By This Tranche

There is one local risk worth calling out plainly:

- `HealthController` now exposes `runtime_authority_strict` in `mom/api/controllers/HealthController.php:270-272`, but older consumers can still read `runtime_authority` and treat `ok` as full authority. That is not a vendor-parity issue, but it is a code/doc drift risk if the health payload is summarized too aggressively.

This is the sort of drift that can create false confidence in closure docs, even when the underlying proof layer is more honest.

## Tests / Verification

Ran successfully:
- `php -l` on `mom/api/controllers/HealthController.php`
- `php -l` on `mom/api/services/RegistryService.php`
- `php -l` on `mom/api/services/RuntimeAuthorityService.php`
- `php -l` on `mom/api/services/CanonicalManufacturingSpineService.php`
- `php -l` on `mom/api/services/VpsService.php`
- `python3 -m py_compile` on:
  - `mom/tools/registry/canonical_publication_orchestrator.py`
  - `mom/tools/registry/verify_publication_truth.py`
  - `mom/tools/registry/generate_operational_blind_spot_report.py`
  - `tools/registry/generate-registry-from-ai-index.py`
- `python3 mom/tools/registry/canonical_publication_orchestrator.py --dry-run`

Skipped or blocked:
- `vendor/bin/phpunit` could not be run in this worktree because the `vendor/` tree is absent here
- `python3 mom/tools/registry/verify_publication_truth.py` exposed 39 missing required publication artifacts, so publication-dependent gates remain unproven

## Final Verdict

The tranche 13 implementation made the repo more truthful, more explicit about authority boundaries, and less likely to overstate publication status. It did **not** close the product gaps that separate this repo from SAP DM, Siemens APS, Siemens Quality, Critical Manufacturing, ETQ, or MasterControl.

Most important remaining issue:
- the repo still needs publication artifacts and/or a fully closed proof pipeline before any closure doc should read as fully verified

Most important improvement:
- mixed authority is now visible instead of being hidden behind a single optimistic health signal
