# M04 Compliance Conflict and Gap Ledger

Generated: 2026-04-27T11:46:27Z

- Gate matrix rows: 822
- Standards rows: 20
- Regulated action rows: 835
- Validation roadmap rows: 45
- Rows with missing owner/gate/evidence/stop-rule flags: 6

## High-control conclusions

- E-sign controls remain blocked unless signature meaning, signer role, SoD and evidence snapshot are explicit.
- Validation posture is planning/pre-production-readiness only; no validated-system claim is made.
- Standards are converted into artifact/owner/gate/evidence/test/restriction/stop-rule rows.
- Rows missing owner or gate are retained as controlled gaps and promoted to M05 repair backlog.

## Sample missing-control rows

1. `standards` root/action `` / `D09 accessibility checklist and screen export` flags: owner_missing. Source: D_FRONTEND_AI_UX/D09_ACCESSIBILITY_SECURITY_PERMISSION_QA_EXPORT/D09_STANDARDS_TRACEABILITY.csv#row-2
2. `standards` root/action `` / `D09 permission/security matrix` flags: owner_missing. Source: D_FRONTEND_AI_UX/D09_ACCESSIBILITY_SECURITY_PERMISSION_QA_EXPORT/D09_STANDARDS_TRACEABILITY.csv#row-3
3. `standards` root/action `` / `D09 API/workflow gap backlog` flags: owner_missing. Source: D_FRONTEND_AI_UX/D09_ACCESSIBILITY_SECURITY_PERMISSION_QA_EXPORT/D09_STANDARDS_TRACEABILITY.csv#row-4
4. `standards` root/action `` / `D09 QA/export backlog` flags: owner_missing. Source: D_FRONTEND_AI_UX/D09_ACCESSIBILITY_SECURITY_PERMISSION_QA_EXPORT/D09_STANDARDS_TRACEABILITY.csv#row-5
5. `standards` root/action `` / `AI surfaces` flags: owner_missing. Source: D_FRONTEND_AI_UX/D09_ACCESSIBILITY_SECURITY_PERMISSION_QA_EXPORT/D09_STANDARDS_TRACEABILITY.csv#row-6
6. `standards` root/action `` / `regulated roots` flags: owner_missing. Source: D_FRONTEND_AI_UX/D09_ACCESSIBILITY_SECURITY_PERMISSION_QA_EXPORT/D09_STANDARDS_TRACEABILITY.csv#row-7
