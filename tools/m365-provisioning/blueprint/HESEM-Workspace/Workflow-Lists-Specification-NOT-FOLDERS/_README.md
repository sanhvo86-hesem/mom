# Workflow-Lists — SharePoint LISTS (NOT folders)

**DO NOT CREATE FILES HERE.** This is documentation only.

The 16 Workflow-Lists are provisioned as SharePoint Lists by PnP PowerShell,
NOT as folders. Each List has metadata columns + lookups + Power Automate flow.

## 16 Workflow-Lists (v8.1)

| # | List | Canonical-Path target |
|---|---|---|
| 1 | Job-Master-List | Job-Dossier/{Cust}/{YYYY}/{JobNum}/ |
| 2 | Part-Master-List | Part-Master/{Cust}/{PartNo}/{Rev}/ |
| 3 | NCR-Master-List | Job-Dossier/.../10-Quality-Events/NCR/{NcrId}/ |
| 4 | CAPA-Master-List | Quality/CAPA-Master/{CapaId}/ |
| 5 | 8D-SCAR-Master-List | Quality/8D-SCAR-Master/{8dId}/ |
| 6 | ECO-Master-List | Part-Master/.../08-ECN-PCN-History/ECN-{Id}/ |
| 7 | PCN-Master-List | Customer-Account/.../PCN-Inbound + PCN-Outbound + Part-Master/.../08 |
| 8 | FAI-Master-List | Part-Master/.../07-FAI-Baseline + Job-Dossier/.../05-FAI-Execution |
| 9 | Customer-Audit-Master-List | Customer-Account/.../Audits/{YYYY}/ |
| 10 | Internal-Audit-Master-List | Quality/Internal-Audits/{YYYY}/ |
| 11 | Calibration-Due-List | Asset-Master/Gages/{Id}/02-Calibration/{YYYY}/ |
| 12 | PM-Schedule-Master | Asset-Master/Machines+Lines/{Id}/PM/{YYYY}/ |
| 13 | Cert-Expiry-Watch-90d | Training/Cert-Master-Register/ |
| 14 | Customer-Portal-Evidence-Log | PO-Index + Customer-Account master logs |
| 15 | Action-Tracker-Master | (cross-cutting) |
| 16 | Supplier-CMRT-Master-List | Supplier-Master/{Sup}/10-CMRT-EMRT/{YYYY}/ |

## Power Automate flow design
- Trigger: SharePoint file event OR Epicor webhook
- Idempotency: primary ID (NcrId, CapaId, FaiId, etc.)
- Failure: 3-retry then alert Action-Tracker-Master
- SLA: 5 min from file save to List update
- Job-Closure flow: Job-Dossier move to Archive → rewrite Canonical-Path on all linked Lists
