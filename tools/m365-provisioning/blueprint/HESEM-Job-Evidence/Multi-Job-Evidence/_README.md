# Multi-Job-Evidence (v5 NEW axis) — cross-Job scope evidence

Real ops reveal ~25% of records span MULTIPLE Jobs/Parts/Suppliers:
- **CAPA root-cause that affected 5 Jobs** (e.g., supplier defect from heat-lot)
- **8D for field-failure** spanning 3 prior shipments
- **Banned-substance heat-lot trace** affecting 12 Jobs
- **Internal audit findings** referencing 5 Jobs
- **Cross-Job customer complaint** umbrella

**SSOT rule:** Parent record lives HERE (canonical). Children NCR/CAPA per Job
back-link via `ParentMultiJobID` metadata column on `NCR-Master-List` / `CAPA-Master-List`.

The 5 categories below each have unique IDs to keep cross-Job evidence
auditable as one chain.
