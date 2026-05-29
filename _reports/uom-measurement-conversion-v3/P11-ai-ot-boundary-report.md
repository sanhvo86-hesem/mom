# P11 — AI / OT Boundary Report

**Prompt:** HESEM UoM V3 — P11  
**Generated:** 2026-05-29

## AI boundary — never an authority

`UomAiAdvisoryGuard` declares:

```php
public const AI_ACTOR_KINDS = ['ai-llm','ai-classifier','ai-anomaly-detector','ai-suggester'];
public const FORBIDDEN_OPERATIONS_FOR_AI = [
  'manifest.approve','manifest.linkRule',
  'rule.submitForReview','rule.approve','rule.esign','rule.deprecate',
  'alias.approveResolution',
];
```

The controller invokes
`UomAiAdvisoryGuard::assertNotAi($actorKind, $operation)` before any
authority-mutating call. AI principals raise `UOM_AI_AUTHORITY_FORBIDDEN`
with HTTP 403. AI is still permitted to record advisory rows via
`UomWorkflowService::recordAiAdvisory` (suggestion-only).

5 contract tests pin the guard:

```
$ composer --working-dir=mom run test -- --filter UomAiAdvisoryGuard
.....                                                               5 / 5 (100%)
OK (5 tests, 8 assertions)
```

## OT boundary — quarantine first

`OpcUaUnitId::packCommonCode` returns `-1` (UNKNOWN sentinel) for any
input that does not satisfy the UNECE Rec 20 Common Code grammar.
Consumers MUST treat `-1` as quarantine — never as authority. The
behaviour is locked by `OpcUaUnitIdTest::testUnknownCodeReturnsMinusOne`
(P04) and re-pinned in `UomAdversarialConversionTest::testOpcUaUnknownReturnsQuarantineSentinel`
(P07).

External-code mapping (`ExternalEngineeringUnitMapper`) follows the
same posture for non-OPC systems (UNECE, EDI, supplier aliases).

## Decision token

```text
UOM_V3_P11_PASS_SECURITY_AI_OT_OBSERVABILITY
```
