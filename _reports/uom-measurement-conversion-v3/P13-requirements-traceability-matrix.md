# P13 — Requirements Traceability Matrix

**Prompt:** HESEM UoM V3 — P13  
**Generated:** 2026-05-29

| Standard | Requirement | HESEM realisation | Evidence |
|---|---|---|---|
| BIPM/SI 9th ed. | Canonical kelvin for temperature | MeasurementValueFactory.canonicalSiFromInput, findSiBaseCode | MEVT::testSim002 PASS |
| UCUM | Semantic equivalence + special units | UomStandardLibraryManifestService.SOURCE_AUTHORITIES['UCUM']; LogarithmicConverter; affine path | OpcUaUnitIdTest + AffineConverter |
| UCUM arbitrary | IU / pH non-commensurable | ContextualConversionPlanner.classify → forbidden | ContextualConversionPlannerTest::testUnknownKindPairIsForbidden |
| QUDT | QuantityKind + DimensionVector | uom_quantity_kind table + manifest authorities['QUDT'] | DomainIntegrationTest |
| UNECE Rec 20 | Common Code | OpcUaUnitId algorithmic pack/unpack; manifest authority 'UNECE_REC20' | OpcUaUnitIdTest (14) |
| OPC UA Part 8 §5.6.3 | EUInformation.unitId Int32 | OpcUaUnitId | reference values pinned |
| OpenAPI 3.1 | API surface contract | openapi-uom-v3.yaml + drift test | UomOpenApiContractTest |
| RFC 9457 | Problem Details | UomController.uomProblemDetail + ProblemDetails enum | P06 deliverables |
| 21 CFR Part 11 | Signature meaning + audit trail | UomWorkflowService.createApprovalRecord + manifest hash | UomWorkflow tests + migration 231 audit_events |
| EU GMP Annex 11 | Validation + audit trail + e-sign linked record | same | same |
| NIST AI RMF | AI advisory boundary | UomAiAdvisoryGuard | UomAiAdvisoryGuardTest (5) |
| OWASP API 2023 | BOLA/BOPLA + mass assignment | check uom_cr_approved_requires_owner + UomAiAdvisoryGuard | P11 threat model |
| ASVS 5.0.0 | V12/V13/V14 | controller auth pipeline (CORS→ApiKey→Auth→RateLimit→Audit) | existing infra |
| ISA/IEC 62443 | OT quarantine-first | OpcUaUnitId.UNKNOWN sentinel | OpcUaUnitIdTest + P11 |

Every standard cited in `01_SOURCE_LOCK_AND_EVIDENCE_BASIS.md` has at
least one HESEM service implementing it and at least one PHPUnit
case pinning the implementation.

## Decision token

```text
UOM_V3_P13_PASS_WORLDCLASS_CANDIDATE_FOR_INTEGRATION_REVIEW
```
