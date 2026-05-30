# P01 Adversarial Critique

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 38fd09e9700c48950b4a9d95af1f6f56a5286020

## Critique

- Metrologist: The matrix relies on NIST for SI and records gaps for UCUM/QUDT. This is not enough for final parser/catalog implementation; P06/P07 must either add official source artifacts or keep gaps blocking high-risk claims.
- MES architect: Vendor benchmark pages are high-level. They are sufficient for pattern extraction only, not for declaring HESEM equivalent capability.
- eQMS auditor: Part 11/Annex 11/GAMP are controlled gaps, so P14 must not claim validation readiness unless official source evidence or local controlled copies are present.
- Security engineer: OWASP/OT controls are not fully sourced under allowlist. P13 must use repo tests and allowed security references or record blockers.
- Data migration lead: SAP/Tulip reinforce that base unit and material/container records are distinct; P15 must not infer units from field names.
- UI accessibility reviewer: WCAG was not sourced directly due allowlist. P11 must test keyboard/error association regardless.
- SRE: OpenTelemetry official source was not opened. P13 still needs trace/metric evidence from implementation.
- Customer implementation lead: The matrix is a governance lock, not product proof. Later prompts must not quote it as runtime evidence.

## Decision

No P01-scoped defect requires repair. The correct conservative behavior is controlled-gap tagging for disallowed official domains.
