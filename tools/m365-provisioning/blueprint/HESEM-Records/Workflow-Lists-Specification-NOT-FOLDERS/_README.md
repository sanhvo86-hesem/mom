# Workflow-Lists — SharePoint LISTS, NOT folders

**DO NOT CREATE FILES HERE.** This is documentation only.

The 16 Workflow-Lists below are provisioned as SharePoint Lists by the
PnP PowerShell script (`Provision-HesemTenant.ps1`), NOT as folders. Each
List has metadata columns + lookups + permission scope per ANNEX-145 §5.

| List | Purpose | Canonical-Path target |
|---|---|---|
| NCR-Master-List | Cross-cut view of all NCR | Job-Dossiers/.../09-NCR-CAPA + Multi-Job-Evidence/01-CAPA-Cross-Job |
| CAPA-Master-List | All CAPA (NCR + audit + complaint sources) | Multi-Job-Evidence/01-CAPA-Cross-Job |
| 8D-SCAR-Master-List | Customer complaint chain | Job-Dossiers/.../11-Customer-Touchpoints + Multi-Job-Evidence/02-8D |
| ECO-Master-List | Engineering change order queue | QMS-Master/10-Change-Control |
| PCN-Master-List | Process change notice queue | Customer-Account/.../11-PCN + Part-REV-Master/.../07-PCN |
| Customer-Audit-Master-List | Audit cycle per customer | Customer-Account/.../06-Customer-Audit |
| Internal-Audit-Master-List | Internal audit | QMS-Master/03-Internal-Audit |
| Customer-Portal-Evidence-Log | Ariba/Coupa/myASML/TPS pull+push | PO-Index/.../00 + 09 |
| Action-Tracker-Master | All open actions | (cross-cutting) |
| Calibration-Due-List | Cal due 30/60/90 | Asset-Master/Gages/.../02-Cal-Cert |
| PM-Schedule-Master | PM due per machine | Asset-Master/Machines/.../04-PM-Records |
| Cert-Expiry-Watch-90d | Operator cert expiring | Training-Master/07-Cert-Master |
| Open-Concession-Deviation-Log | Active deviation requests | Job-Dossiers/.../11-Customer-Touchpoints |
| **FAI-Master-List (v5 NEW)** | All FAI for customer audit "show me FAI last 12 months" | Job-Dossiers/.../05-G4-FAI + Part-REV-Master/.../06-FAI-Baseline |
| **Job-Master-List (v5 NEW)** | All active Jobs cross-cut | Job-Dossiers/{YYYY}/{Job}/ |
| **Supplier-CMRT-Master-List (v5 NEW)** | CMRT annual roll-up | Supplier-Account/.../08-CMRT |

See ANNEX-145 §5 for column schema, lookups, validation, permission.
