# 38 — Hard Case Playbook: AI, OT, e-Sign, Live API, Data Integrity
| Hard case | V7 decision | Evidence |
| --- | --- | --- |
| AI recommends CAPA closure | AI can summarize evidence gaps but cannot close CAPA; human owner submits command; e-sign if required | AI eval log + CAPA command audit |
| Operator completes WO on mobile while offline | Allow local draft only; final command requires sync validation, idempotency, server-side guards | draft log + server command acceptance/rejection |
| Machine telemetry contradicts operator entry | Create exception evidence; do not overwrite; require investigation workflow | EVID + NQCASE or DOWNTIME link |
| Live API unavailable during HMV4 preview | Fallback to fixture only if opt-in preview permits; show degraded posture | Problem detail + fallback audit |
| E-sign needed for release | Require identity challenge, signature meaning, record snapshot, immutable audit | ESIGN + AUDIT + BREL packet |
| Lot recall traversal | Use OTG edges from material receipt through production, inspection, release and shipment | lineage traversal report |
| OT write request from MES | Block by default; require 62443 zone/conduit, safety review, gateway, manual override | OT security approval package |
| Data product shows KPI drift | Trace to CDC contract and root events; data product cannot be authority | DQ report + lineage |
