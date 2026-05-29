# P08 Adversarial Audit

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P08-AUD-ARC-01 | Chief Enterprise Architect | Is work center duplicated as equipment? | asset and structural scope could fork. | P1 | `P08_MAIN` | Y | separate Equipment from WorkCenter | low |
| P08-AUD-MNT-01 | Maintenance/Calibration Lead | Does PM really block release/start? | overdue PM can otherwise remain advisory only. | P1 | `MDA_MACHINE_READINESS_POLICY.csv` | Y | add hard PM gates | low |
| P08-AUD-QUAL-01 | Quality/Regulatory Lead | Does expired calibration block machine use? | stale calibration can silently pass if only header status checked. | P1 | `MDA_MACHINE_READINESS_POLICY.csv` | Y | add calibration validity gate | low |
| P08-AUD-OT-01 | Manufacturing/MES Architect | Are raw signal, derived event, and projection separated? | signal projections can become hidden authority. | P1 | `MDA_MACHINE_SIGNAL_TRUST_MODEL.md` | Y | define authority layers explicitly | low |
| P08-AUD-SHOP-01 | Shopfloor Supervisor | Can stale heartbeat still show running and allow start? | dashboard state can mislead dispatch. | P1 | `MDA_MACHINE_READINESS_POLICY.csv` | Y | gate on connectivity when required | low |

## Re-audit conclusion

P1 defects identified in the fast adversarial pass are repaired in the output. Remaining work is physical unification and command-surface implementation.
