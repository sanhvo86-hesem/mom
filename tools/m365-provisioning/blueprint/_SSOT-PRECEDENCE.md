# SSOT Precedence Rules (v10)

## R0 — Customer-source IP isolation

NO HESEM-IP under `{Customer}/00-Customer-Source-IP/`.
NO customer-source artifacts under `{Customer}/10-HESEM-Engineering/`.
Boundary is strict, enforced by Power Automate + sensitivity label default + DLP.

## R1 — New revision = new sibling

In `00-Customer-Source-IP/`, new rev = new sibling folder. Never overwrite,
never edit, never delete. Old rev remains discoverable forever.

## R2 — 3-Released is write-blocked

In `10-HESEM-Engineering/`, the `3-Released/` state is write-blocked after
Power Automate promotion. Only DCC-controlled superseding can replace it.

## R3 — Canonical compliance lives in QMS

ISO certs, RBA SAQ, CMRT, RoHS, REACH live ONCE at
`HESEM-Quality-QMS/01-Compliance-Canonical/`. Customer-spoke
`50-Compliance-CustomerSpecific/` is a MIRROR (pointer), not duplicate.

## R4 — Workflow-Lists are SharePoint Lists, not folders

L01-L17 (NCR, CAPA, SCAR, ECN, etc.) are SharePoint Lists. Per-record
evidence may live in a folder; the record-of-truth lives in the List.

## R5 — Dept-Private never holds customer-IP

DEP-{Code}/1-Private/ holds dept-internal drafts only. Customer-IP MUST
live under the appropriate customer-spoke site (not internal-workspace).

## R6 — Hub holds NO IP

HESEM-Hub is navigation only. Cross-customer KPI rollups must be aggregated
(no per-customer detail). HESEM-IP-Confidential is the maximum label here.

## R7 — Archive disposition is reviewer-gated

Purview disposition labels never auto-destroy. Manual disposition review
queue at `Archive/03-Disposition-Review-Queue/` and approved at
`Archive/04-Destroy-Approved-Queue/` before destruction.

## R8 — DKE for crown jewels only

`HESEM-Engineering-IP/01-Process-Recipes-Master-DKE/` is DKE-encrypted.
DKE breaks Copilot/search by design — reserved for source-of-truth
process recipes, CAD masters, special-process formulations.
