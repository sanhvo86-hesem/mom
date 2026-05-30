# P01 Audit Report

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 38fd09e9700c48950b4a9d95af1f6f56a5286020

## Audit Findings

- REPO_EVIDENCE: P01 touched only `_reports/uom-v5/`.
- GLOBAL_STANDARD: Matrix separates physical SI authority, parser/expression authority, semantic ontology, trade code mapping, OT engineering-unit mapping, API errors, validation, security, accessibility, and AI governance.
- GLOBAL_STANDARD: Vendor benchmarks support base UoM plus alternative/contextual UoM policies; none justify global packaging or density guesses.
- CONTROLLED_GAP_STANDARD_RECHECK_REQUIRED: Several standards named by the pack require official recheck when repo policy allows those domains or source PDFs are added locally.

## Mandatory Questions

1. Multi-site/supplier/language risk: matrix assigns supplier/customer/site policy to P12/P15 and external aliases to P06.
2. Factor-only risk: matrix explicitly blocks factor-only use for affine/log/contextual units.
3. Naked number risk: FHIR-style pattern and P09/P11 gates require value plus unit/system/code/precision.
4. Canonical/quarantine bypass: UNECE/OPC UA/Tulip/SAP patterns reinforce external-code mapping and quarantine.
5. AI authority: NIST AI RMF and scope contract support advisory-only AI; P04/P14 must enforce.
6. Permission bridge: P01 records regulated approval sources but does not fix permissions; P04 owns.
7. Schema/service drift: P01 does not inspect repo drift; P02/P03 own.
8. Cache stale risk: P01 records observability/security standards; P03/P13 own runtime proof.
9. Rollback: report-only rollback is clear.
10. Replay evidence: P09/P14 own replay proof.

## Gate Result

PASS_WITH_WARNINGS. Controlled gaps are explicit and do not require P01 to block, because no disallowed-source claim was used as final authority.
