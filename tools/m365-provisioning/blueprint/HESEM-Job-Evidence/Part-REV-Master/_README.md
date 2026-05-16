# Part-REV-Master — Engineering baseline per Part-Rev

Two key sub-roots:
1. **`{CustomerID}/{PartNo}/REV-{Rev}/`** — customer-keyed. Use when the drawing
   is customer IP (AMAT/LAM/ASML/TEL gives us their controlled drawing).
2. **`_HESEM-Owned-Parts/{PartNo}/REV-{Rev}/`** — HESEM-owned. Use for commodity
   parts, fasteners, in-house tooling parts, or standard parts that HESEM sells
   to multiple OEMs from one engineering baseline.

**Decision rule (v5):**
- Customer-IP drawing → customer-keyed tree
- HESEM-owned drawing → `_HESEM-Owned-Parts/`
- Customer customizes our standard part with their PN overlay → `_HESEM-Owned-Parts/`
  for engineering, customer-keyed for per-customer FAI/PCN/Cert

Seeded sample customer trees: AMAT, LAM, ASML, TEL (sample subfolders only).
Real instances created by PnP provisioner from PartNo registry.
