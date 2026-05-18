# SITE — HESEM-ASML customer spoke

Purview Information Barrier mode: **Explicit**.
IB segment: `SG-CUSTOMER-ASML` (Entra attribute or group-MemberOf).
Sensitivity label default: **Customer:ASML-Confidential** (encrypted; SG-CUSTOMER-ASML only).

Portal channel: **SupplierNet-SupplierIdentities**
Cleanliness regime: **GSA-Grade-1-2-4 + SEMI-F57-F70 + ISO-14644-5**
FAI template: **AS9102-equiv + GSA-grade-release audit**

10 zones (top level under this site):
  00-Customer-Source-IP          — READ-ONLY customer artifacts (drawings, 3D, specs, ECN-in, customer SQM)
  10-HESEM-Engineering           — HESEM-authored derivatives, 3-state lifecycle
  20-PO-Lots                     — per-lot 11-folder dossier + customer-delta
  30-SCAR-8D                     — D0-D8 milestones
  40-Customer-Audits             — audit findings + CAPA
  50-Compliance-CustomerSpecific — mirror of canonical compliance docs
  60-Scorecards                  — customer-issued scorecards
  70-ECN-Acknowledgements        — Power Automate List handoff
  80-Portal-Exports              — docs exported from SupplierNet-SupplierIdentities
  90-Inbox                       — hash-archived raw inbound (chain of custody)

Rule R0: NO HESEM-IP under 00-Customer-Source-IP. NO customer-source artifacts
under 10-HESEM-Engineering. The boundary is strict and audited.

Rule R1: New customer revision = new sibling folder under 00-Customer-Source-IP
(never overwrite, never edit, never delete).

Rule R2: HESEM-Engineering 3-Released folders are write-blocked after Power
Automate promotion; only DCC superseding can replace them.
