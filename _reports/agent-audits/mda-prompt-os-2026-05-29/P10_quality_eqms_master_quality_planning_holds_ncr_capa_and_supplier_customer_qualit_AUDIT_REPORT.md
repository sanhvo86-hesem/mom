# P10 Adversarial Audit

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P10-AUD-IQC-01 | Quality/Regulatory Lead | Can IQC fail still allow putaway? | hold policy must block inventory release. | P1 | `MDA_QUALITY_GATE_POLICY.csv` | Y | add explicit putaway block | low |
| P10-AUD-NCR-01 | External Auditor/Customer Auditor | Can NCR close without source trace and disposition? | audit defensibility would collapse. | P1 | `MDA_NCR_CAPA_LINKAGE_MODEL.md` | Y | enforce source linkage and close rule | low |
| P10-AUD-CAPA-01 | Quality Systems Lead | Can CAPA close without effectiveness? | systemic defects can recur silently. | P1 | `P10_MAIN` | Y | lock effectiveness verification rule | low |
| P10-AUD-HOLD-01 | Security/IAM/SoD Lead | Can same actor create failure and release hold? | SoD breach weakens quality authority. | P1 | `MDA_QUALITY_GATE_POLICY.csv` | Y | require governed override/e-sign separation | low |
| P10-AUD-AUD-01 | Customer Auditor | Can complaint/recall trace fail to find affected shipments? | customer containment becomes unreliable. | P1 | `MDA_NCR_CAPA_LINKAGE_MODEL.md` | Y | require backward/forward trace links | low |

## Re-audit conclusion

P1 defects identified in the fast adversarial pass are repaired in the output. Remaining work is physical hold unification and quality-order trigger consolidation.
