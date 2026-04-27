# 17 — Security, Privacy, Safety and OT Threat Model
## Security principle

Manufacturing software security is not only web security. It combines tenant isolation, object authorization, regulated data integrity, e-sign, OT segmentation, supply-chain security, incident response and safety boundaries.

## Threat categories

| Category | Example | Required control |
| --- | --- | --- |
| BOLA/object authorization | user reads other tenant/site NQCASE | tenant/site/object/action policy tests |
| Unauthorized mutation | workspace triggers hidden state change | authority ledger + command bus |
| E-sign compromise | signature captured without meaning | Part 11 signature challenge + audit |
| Fixture/live mixup | fixture JS loaded in portal | grep guard + inert flags |
| OT lateral movement | app bridges into PLC network | 62443 zones/conduits + gateway |
| Data integrity loss | silent overwrite of inspection result | immutable audit + evidence hash |
| AI prompt injection | doc instructs AI to ignore policy | RAG/tool guard + source trust |
| Supply-chain compromise | dependency/tooling tampered | SBOM + lockfile + CI scanning |

## Security gates

- ASVS baseline for UI/API.
- API Top 10 negative tests for every live endpoint.
- Secrets scan.
- Dependency/SBOM scan.
- OTel logs/traces without leaking sensitive values.
- Backup/restore and incident drill for regulated data.
- OT zone/conduit review before any edge write.
