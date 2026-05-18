# 00-Customer-Source-IP — READ-ONLY customer artifacts

Source: customer (ASML). Authoring authority: customer. HESEM custody only.

NO 3-state lifecycle here. Customer artifacts arrive pre-released from ASML
and become Read-Only controlled copies at HESEM. New revisions arrive as
NEW SIBLING folders, never overwriting prior.

Sub-zones:
  01-Drawings           — customer drawing PDF / DWG / DXF
  02-Models-3D          — STEP / IGES / Parasolid / MBD
  03-Specifications     — customer-controlled specs (GSA-Grade-1-2-4 + SEMI-F57-F70 + ISO-14644-5)
  04-ECN-Inbound        — engineering change notices received
  05-Customer-SQM-NDA-Vault — supplier quality manual (NDA-gated)

Permission: SG-CUSTOMER-ASML Read; Edit denied tenant-wide (Power Automate enforces).
