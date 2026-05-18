# 00-Customer-Source-IP — READ-ONLY customer artifacts

Source: customer (AMAT). Authoring authority: customer. HESEM custody only.

NO 3-state lifecycle here. Customer artifacts arrive pre-released from AMAT
and become Read-Only controlled copies at HESEM. New revisions arrive as
NEW SIBLING folders, never overwriting prior.

Sub-zones:
  01-Drawings           — customer drawing PDF / DWG / DXF
  02-Models-3D          — STEP / IGES / Parasolid / MBD
  03-Specifications     — customer-controlled specs (AMAT-0250-xxxxx + IEST-STD-CC1246)
  04-ECN-Inbound        — engineering change notices received
  05-Customer-SQM-NDA-Vault — supplier quality manual (NDA-gated)

Permission: SG-CUSTOMER-AMAT Read; Edit denied tenant-wide (Power Automate enforces).
