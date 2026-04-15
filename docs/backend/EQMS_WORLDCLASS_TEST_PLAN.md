# EQMS World-Class Surface — Test Plan
**Date:** 2026-04-15  
**Author:** HESEM MOM AI Architect  
**Status:** Deliverable 5 of 6 from `eqms-worldclass-research-and-endpoint-plan.md`  
**Framework:** PHPUnit 11 (`mom/tests/`)  
**Coverage target:** 100% regulated state-transition paths; 80%+ line coverage on controllers

---

## Test Architecture

```
mom/tests/
├── Unit/
│   ├── Controllers/Eqms/
│   │   ├── EqmsBaseControllerTest.php
│   │   ├── EqmsComplaintsControllerTest.php
│   │   ├── EqmsDeviationControllerTest.php
│   │   ├── EqmsNcrControllerTest.php
│   │   ├── EqmsCapaControllerTest.php
│   │   ├── EqmsChangeControlControllerTest.php
│   │   ├── EqmsDocumentsControllerTest.php
│   │   ├── EqmsTrainingControllerTest.php
│   │   ├── EqmsAuditsControllerTest.php
│   │   ├── EqmsSuppliersControllerTest.php
│   │   ├── EqmsSupplierAuditsControllerTest.php
│   │   ├── EqmsRisksControllerTest.php
│   │   ├── EqmsCalibrationControllerTest.php
│   │   ├── EqmsLabInvestigationsControllerTest.php
│   │   ├── EqmsBatchReleaseControllerTest.php
│   │   ├── EqmsValidationControllerTest.php
│   │   ├── EqmsFieldActionsControllerTest.php
│   │   ├── EqmsGenealogyControllerTest.php
│   │   ├── EqmsInspectionControllerTest.php
│   │   └── EqmsSpcControllerTest.php
│   └── StateMachine/
│       └── EqmsStateMachineTest.php
├── Integration/
│   ├── EqmsWorkflowTest.php        -- end-to-end lifecycle per module
│   └── EqmsRegulatedActionsTest.php -- esig, optimistic lock, audit trail
└── Schema/
    └── Migration136SchemaTest.php  -- schema correctness
```

---

## Module 1 — Customer Complaints

### Unit: State Machine
| Test | Input | Expected |
|------|-------|----------|
| `testOpenTransitionFromDraft` | status=draft, action=open | status→open, 200 |
| `testInvalidTransitionBlockedWithConflict` | status=closed, action=open | 409 Conflict |
| `testCloseRequiresEsig` | action=close, no esig | 428 Precondition Required |
| `testCloseWithEsig` | action=close, valid esig | status→closed, 200 |
| `testEsigWrongPassword` | action=close, wrong password | 403 Forbidden |

### Unit: Concurrency
| Test | Input | Expected |
|------|-------|----------|
| `testVersionMismatchReturns412` | If-Match: "3", current version=5 | 412 Precondition Failed |
| `testMissingVersionReturns428` | No If-Match header | 428 Precondition Required |
| `testCorrectVersionSucceeds` | If-Match: "5", current version=5 | 200 |

---

## Module 2 — Deviations

### Unit: Classification Gate
| Test | Input | Expected |
|------|-------|----------|
| `testClassifyRequiresSeverityAndScope` | missing severity | 422 Unprocessable Entity |
| `testVoidRequiresEsig` | action=void, no esig | 428 |
| `testClosedDeviationIsImmutable` | PATCH on closed record | 409 |

---

## Module 3 — NCR / MRB

### Unit: Use-As-Is Gate (AS9100D)
| Test | Input | Expected |
|------|-------|----------|
| `testUseAsIsRequiresEngineeringJustification` | no engineering_justification | 422 |
| `testUseAsIsRequiresEsig` | no esig | 428 |
| `testCloseBlockedIfDispositionNotSet` | status=under_review, action=close | 409 |
| `testSetDispositionToUseAsIsWithJustificationAndEsig` | valid body+esig | status→closed, 200 |

---

## Module 4 — CAPA

### Unit: 10-State Machine
| Test | Precondition | Expected |
|------|-------------|----------|
| `testPlanActionsBlockedWithoutRootCause` | root_cause_description is null | 422 |
| `testSubmitApprovalRequiresEsig` | action=submit-approval | 428 without esig |
| `testCloseRequiresEsig` | action=close | 428 without esig |
| `testEffectivenessReviewToClosedPath` | full 10-state walk | state→closed, audit log has 10 events |

---

## Module 5 — Document Control

### Unit: Checkout Lock
| Test | Input | Expected |
|------|-------|----------|
| `testDoubleCheckoutBlocked` | doc already checked out by user A, user B checks out | 409 |
| `testCheckinReleasesLock` | user A checks in | lock cleared, 200 |
| `testApproveRequiresEsig` | action=approve, no esig | 428 |
| `testSupersedeSetsSupersededStatus` | action=supersede, valid esig | old status=superseded, new version created |
| `testObsoleteRequiresEsig` | action=obsolete, no esig | 428 |
| `testControlledCopiesAuditTrail` | GET /controlled-copies | list with distribution log entries |

---

## Module 6 — Change Control (Formal)

### Unit: Approval Route Membership
| Test | Input | Expected |
|------|-------|----------|
| `testApproveByNonMemberBlocked` | user not in approval_route | 403 |
| `testApproveByMemberWithEsig` | valid member + esig | status→approved, 200 |
| `testCloseWithOpenTrainingImpact` | training tasks incomplete | 409 |
| `testDocumentsLinkReturnsLinkedDocs` | GET /documents-link | list of affected documents |

---

## Module 7 — Audits

### Unit: Close-with-Open-Findings Block
| Test | Input | Expected |
|------|-------|----------|
| `testCloseAuditBlockedWithOpenMajorFindings` | 1+ major findings status≠closed | 409 |
| `testIssueReportRequiresEsig` | action=issue-report, no esig | 428 |
| `testFindingStatusMachineEnforced` | invalid finding transition | 409 |

---

## Module 8 — Supplier Quality & Audits / SCAR

### Unit: SCAR Lifecycle
| Test | Input | Expected |
|------|-------|----------|
| `testIssueScarCreatesRecordAndLinksToAudit` | action=issue-scar | eqms_scar record created, audit.scar_ids updated |
| `testScarCloseAlwaysRequiresEsig` | action=close, no esig | 428 |
| `testDisqualifyRequiresQualityManagerRole` | user=engineer role | 403 |
| `testDisqualifyRequiresEsig` | quality_manager role but no esig | 428 |

---

## Module 9 — Risk Register / FMEA

### Unit: Residual Risk Gate
| Test | Input | Expected |
|------|-------|----------|
| `testAcceptResidualRiskHighScoreRequiresEsig` | score≥12, no esig | 428 |
| `testAcceptResidualRiskLowScoreNoEsig` | score<12, no esig | 200 |
| `testFmeaApproveRequiresEsig` | action=fmea-approve, no esig | 428 |
| `testRiskScoreGeneratedColumn` | INSERT with likelihood=4, severity=5 | risk_score=20 auto-computed |
| `testHeatmapEndpointGroupsByScore` | GET /heatmap | returns risk_score buckets |

---

## Module 10 — Calibration / MSA

### Unit: MSA Study Recording
| Test | Input | Expected |
|------|-------|----------|
| `testMsaStudyStoresGrrPercent` | body with grr_percent=8.5, ndc_count=7, passed=true | stored, 200 |
| `testMsaApproveRequiresEsig` | action=msa-approve, no esig | 428 |
| `testCalibrationApproveRequiresEsig` | action=approve, no esig | 428 |

---

## Module 11 — Lab Investigations (OOS/OOT)

### Unit: 2-Phase FDA Pattern
| Test | Input | Expected |
|------|-------|----------|
| `testPhase1ToPhase2Transition` | action=escalate-to-phase2 | status→phase2_investigation |
| `testCloseRequiresRootCauseAndConclusion` | missing root_cause | 422 |
| `testCloseRequiresLabErrorIdentified` | missing lab_error_identified | 422 |
| `testCloseRequiresEsig` | all fields present, no esig | 428 |

---

## Module 12 — Batch Release

### Unit: Release Package Aggregation
| Test | Input | Expected |
|------|-------|----------|
| `testReleasePackageAggregatesAllDomains` | GET /release-package/{id} | includes iqc, deviations, lab, calibration, capa sections |
| `testApproveReleaseAlwaysRequiresEsig` | no esig, any role | 428 |
| `testMarketShipRequiresPriorApproval` | status=pending_release (not approved) | 409 |
| `testMarketShipRequiresEsig` | approved status but no esig | 428 |
| `testHoldRecordLocksMarketShip` | status=on_hold | 409 |

---

## Module 13 — Validation Management

### Unit: Protocol Approval Gate
| Test | Input | Expected |
|------|-------|----------|
| `testProtocolApproveRequiresEsig` | action=protocol-approve, no esig | 428 |
| `testExecutionSummaryRequiresEsig` | action=generate-summary, no esig | 428 |
| `testTraceMatrixLinksRequirementsToProtocols` | GET /trace-matrix/{projectId} | all requirements have at least one protocol linked |

---

## Module 14 — Field Actions / Recall

### Unit: Launch Gate (FDA/EU MDR)
| Test | Input | Expected |
|------|-------|----------|
| `testLaunchRequiresEsig` | action=launch, no esig | 428 |
| `testLaunchEmitsCriticalUrgencyEvent` | valid launch | domain_outbox_events has CRITICAL urgency record |
| `testCloseRequiresEsig` | action=close, no esig | 428 |
| `testFreezeAfterLaunch` | PATCH on launched record non-action field | 409 |

---

## Module 15 — Genealogy / Traceability

### Unit: Freeze Gate
| Test | Input | Expected |
|------|-------|----------|
| `testFreezeTraceReportRequiresQualityManagerRole` | user=engineer | 403 |
| `testFreezeTraceReportRequiresEsig` | quality_manager, no esig | 428 |
| `testFrozenRecordBlocksAllMutations` | PATCH/DELETE on frozen record | 409 |
| `testFreezeEmitsFrozenEvent` | valid freeze | `eqms.genealogy.frozen` in domain_outbox_events |

---

## Cross-Cutting Tests

### Integration: Audit Trail Immutability
| Test | Description | Expected |
|------|-------------|----------|
| `testAuditEventCannotBeDeleted` | DELETE on eqms_audit_events row | trigger raises exception, 0 rows deleted |
| `testAuditEventCannotBeUpdated` | UPDATE on eqms_audit_events row | trigger raises exception, 0 rows changed |
| `testEveryStateTransitionCreatesAuditEvent` | Walk complaint through all states | N audit events = N transitions |

### Integration: Electronic Signature Uniqueness
| Test | Description | Expected |
|------|-------------|----------|
| `testSignatureStoredWithHashedPassword` | Valid esig close | eqms_electronic_signature_event.password_hash is bcrypt, never plaintext |
| `testDuplicateSignatureForSameActionBlocked` | Second esig for same entity+action | 409 or 422 (idempotency guard) |

### Integration: Optimistic Lock Workflow
| Test | Description | Expected |
|------|-------------|----------|
| `testConcurrentUpdateRace` | Two clients read version=3, both PATCH | First succeeds, second gets 412 |

### Integration: Export Job Async
| Test | Description | Expected |
|------|-------------|----------|
| `testExportReturns202WithJobId` | POST /export on any module | 202 + job_id UUID |
| `testExportJobStoredInTable` | After POST /export | eqms_export_jobs row with status=queued |

---

## Schema Test: Migration 136

| Test | Check | Expected |
|------|-------|----------|
| `testRiskScoreIsGeneratedColumn` | INSERT likelihood/severity, SELECT risk_score | auto-computed |
| `testAuditEventsImmutabilityTrigger` | UPDATE/DELETE eqms_audit_events | exception raised |
| `testEqmsExportJobsTableExists` | SELECT 1 FROM eqms_export_jobs LIMIT 1 | no error |
| `testPartialIndexesExist` | SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_eqms_%' | ≥15 partial indexes |
| `testForeignKeyConstraints` | INSERT child without parent | FK violation |
| `testUuidPrimaryKeys` | INSERT without id | auto gen_random_uuid() fills id |

---

## Test Execution Commands

```bash
# Run all EQMS unit tests
./vendor/bin/phpunit --testdox tests/Unit/Controllers/Eqms/

# Run all integration tests
./vendor/bin/phpunit --testdox tests/Integration/EqmsWorkflowTest.php

# Run schema tests (requires test DB)
./vendor/bin/phpunit --testdox tests/Schema/Migration136SchemaTest.php

# Run full EQMS suite with coverage
./vendor/bin/phpunit --coverage-html _reports/coverage/eqms/ tests/Unit/Controllers/Eqms/ tests/Integration/
```

---

## Regulatory Test Evidence Requirements

For FDA 21 CFR Part 11 / GAMP 5 IQ/OQ/PQ audit readiness, test results must be:
- Run against a **tagged release** (not a working branch)
- Output exported to `_reports/release-candidate/eqms-test-evidence-YYYY-MM-DD.xml`
- Signed off with a passing CI run hash stored in `mom/release/`
- At minimum: all esig tests, all state-machine transition tests, all audit-immutability tests must be GREEN before any production deployment of batch release or validation management modules
