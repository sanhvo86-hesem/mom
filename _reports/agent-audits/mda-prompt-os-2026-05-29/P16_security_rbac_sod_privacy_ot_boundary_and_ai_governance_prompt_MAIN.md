# P16 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P16-CLAIM-001 | repo already carries identity SSOT and security-hardening migration evidence. | REPO_EVIDENCE | `.ai/USER_IDENTITY_SSOT.md`; `mom/database/migrations/111_security_hardening_indexes.sql`; `mom/database/migrations/112_security_hardening_constraints.sql` | High | parallel identity authority or weak constraints | keep identity writer allowlist and deny-by-default | verified |
| P16-CLAIM-002 | command and workflow specs already demand CSRF, SoD, and regulated signature checks. | REPO_EVIDENCE | `docs/backend/DOMAIN_COMMAND_SPEC.md`; `docs/backend/WORKFLOW_STATUS_UNIFICATION_SPEC.md` | High | security policy may split from execution policy | bind security to command layer | verified |
| P16-CLAIM-003 | prior prompts already separated OT adapters from governed business mutation. | REPO_EVIDENCE | `_reports/.../MDA_MACHINE_SIGNAL_TRUST_MODEL.md`; `_reports/.../P14_*` | High | edge data could mutate runtime truth directly | keep adapters event-only | verified |
| P16-CLAIM-004 | NIST CSF 2.0 and OPC UA still justify governance, authenticated sessions, and configurable secure profiles, not autonomous site policy choices. | CURRENT_OFFICIAL_REFERENCE | [NIST CSF](https://www.nist.gov/cyberframework); [OPC UA](https://opcfoundation.org/about/opc-technologies/opc-ua/) | High | overclaiming security guarantees | keep site policy explicit and deny-by-default | verified |
| P16-CLAIM-005 | AI must stay advisory-only for regulated release, hold override, shipment release, and CAPA closure. | REPO_EVIDENCE | `AGENTS.md`; prompt pack invariant rules | High | hidden autonomous mutation risk | carry AI boundary into permission and abuse-case artifacts | verified |

## Authority decisions

1. Permission is command-scoped with site and data-sensitivity conditions, not generic page access alone.
2. SoD is record-aware and action-aware; a valid role alone is insufficient when prior involvement conflicts.
3. OT devices and AI copilots can submit events, proposals, or scores, never governed release/disposition mutations.
4. Privacy follows minimum-necessary field access, export redaction, retention, and legal-hold rules.

## Repair pass applied in P16

1. Published `MDA_PERMISSION_MATRIX.csv` and `MDA_SOD_RULES.csv`.
2. Published `MDA_SECURITY_ABUSE_CASES.md`.
3. Locked privileged re-auth and replay-block requirements for regulated actions.
4. Carried AI autonomy ban into threat model and permission surfaces.

## Decision token

`P16_PASS_WITH_CONTROLLED_GAPS`
