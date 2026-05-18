# SITE 6 — HESEM-Internal-Workspace

Purview Information Barrier mode: **Open**.
Sensitivity label default: **HESEM-IP-Confidential** (encrypted; SG-ALL-HESEM).

ONE site with 16 dept libraries (NOT 16 separate sites — IB doesn't need to
segment between depts; only customer-keyed sites need IB Explicit).

Per dept: 2 buckets
  1-Private/  — SG-DEP-{Code} Edit; SG-DEP-EXEC Read; SG-ROLE-QMSDOCCONTROL Read
  2-Shared/   — SG-DEP-{Code} Edit; SG-ALL-HESEM Read
  Plus dept-bespoke top folders (tailored, per v9 research).
