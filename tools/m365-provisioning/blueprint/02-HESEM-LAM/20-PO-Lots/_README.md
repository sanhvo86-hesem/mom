# 20-PO-Lots — per-lot dossier

Path: `20-PO-Lots/{YYYY}/{PO}/{LotID}/`

Each lot has the 11-folder common dossier + customer-delta:
  01-CofC, 02-MillCert-CMTR, 03-Dimensional-Report, 04-FAI-Lot-Specific,
  05-Surface-Finish-Ra-F19, 06-Cleanliness-Particle-F70,
  07-Special-Process-Certs, 08-Welding-Records-F78-F81,
  09-Helium-Leak-F1, 10-Packaging-Photos, 11-Shipping-CofO-Customs,
  12-Customer-Delta (AS9102-equiv (Lam-templated) + LAM-PCC-internal + Ra<=0.4um chamber + ASTM-E595)

Lifecycle states per lot:
  draft → internal-released → SI-signed (if SI part) → shipped → customer-accepted
       → SCAR-open (if rejected) → closed

A `_release-manifest.json` at the lot root contains modern-link references to
HESEM-Engineering/3-Released folders — NEVER copy files (single source of truth).
