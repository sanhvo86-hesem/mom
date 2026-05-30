# P15 Customer Onboarding Playbook

Posture: development/prototype -> pre-production readiness candidate.

## Steps

1. Data profiling: scan measurement-like fields and classify by evidence quality.
2. Unit policy workshop: confirm item base units, purchasing/sales/production/QC units, packaging, and supplier/customer display policies.
3. Supplier alias import: load external unit aliases into review, not automatic authority.
4. Pilot shadow mode: create proposed MEASVAL records only where source unit evidence is explicit.
5. Approval: metrology/quality owner reviews alias mappings, item policies, and contextual evidence.
6. Final adoption readiness: verify rollback, deviation log, PQ evidence, and training before any regulated runtime use.

## Non-Negotiable Rules

- Do not infer units from field names.
- Do not overwrite original historical fields.
- Do not convert IU, density, packaging, or temperature without contextual evidence.
- Do not use AI advisory output as approval authority.
