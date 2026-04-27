# S3-01 — E4 Record API per Domain

```
prompt_id: S3-01    stream: 3    sequence: 1 of 12    effort: ~80 min
```

## Pre-flight reading

```
1. S3-00 stream master
2. V9: PART_E_API_CATALOG/E4_RECORD_API_PER_DOMAIN.md
3. Cross-refs: M3 root catalog (≥ 95 roots × per-domain);
   E0 conventions; E5 (projection alternative);
   F4 + F5 (UI consumers); H4 (audit emit per record);
   per pack J1-J5 (per-pack record families)
4. Standards: OpenAPI 3.1.1; RFC 9457; JSON Schema 2020-12;
   per pack regulator submission integrations (cross-link E15)
```

## Deliverable

```
PART_E_API_CATALOG/E4_RECORD_API_PER_DOMAIN.md
```

## Depth requirements

Each of 95 authoritative roots (per M3) gets its own Record API.
This chapter is the master contract + per-domain index. Per
record family:

```
- List endpoint (cursor pagination; per-family filter set;
  stable sort with id tiebreaker; cache headers per data
  class; rate-limit; SLO; per-pack overlay)
- Single-record endpoint (ETag returned for mutation; authority
  class header; per-tab fetch where supports record-shell)
- History / audit endpoint (per E6.2)
- Search endpoint (per family; per E5 §2.5 search)
- Bulk export (per E11.2; LRO per E13)
```

Per-family deep callouts (≥ 14 domain sections):
```
C1: Customer / Quote / SO / CPO / RMA / Forecast / Concession
C2: Item / BOM / Routing / Spec / ECO / DFMEA / PFMEA / DHF /
   HARA / SOUP / SBOM
C3: MPS / MRP / Schedule / APQP / AS9145
C4: PO / Supplier / SCAR / PSW / PPAP / FSVP / NADCAP cert
C5: Lot / Serial / Bin / Move / Adjust / DSCSA Trans / UDI /
   §204 KDE / Trace Chain / ITAR Item
C6: WO / Operation / Yield / SPC / EBR / EM Run / Media Fill /
   LPA / FAI / Service-Life-Limited / HACCP / CCP / Sanitation
C7: NC / CAPA / 8D / Audit / Doc Review / Inspection / Disposition
   / BREL / QP Decl / PRRC / APR / Stability / Deviation /
   Vigilance / PSUR / PMS / Risk / Recall / FSCA / FAR / RFR
C8: Genealogy Edge / BREL (cross-link C7) / Recall / Release Pkt /
   DSCSA Tx / Serial Unit / UDI / FMD / §204 / VIN
C9: Asset / PM Plan / MWO / Calibration / Eqp Qual / SLLP / AD /
   SB / Sterilizer / Pasteurizer / Thermal Val / EHS Incident
C10: Person / Skill / Training Plan / Training Record / Comp
   Matrix / Aseptic Qual / PCQI / ITAR PoR / NADCAP Auditor /
   QP / PRRC / DPO
C11: Cost Center / GL / Cost Roll / Std Cost / Variance /
   Inventory Valuation / COPQ
C12: Connector / Sub-Processor / DPA / EDI Tx / DSCSA Partner /
   GUDID Acct / Webhook Sub / Inbound Endpoint
C13: KPI Snapshot / Score / Advisory / Model / Override /
   Drift / Retraining / Red-Team / Data Product
C14: Tenant / Tenant Profile / Region Pinning / Sub-Processor
   List / DPA / ROPA / DPIA / DSAR / Identity / Audit Event /
   Audit Anchor / Pseudo Key / Hold / Retention Class /
   Banned-Decision Surface / FIPS Module
```

Per family: full per-endpoint contract per S3-00 + per S1-00 master.

## Required substance

≥ 9,000 words.

## Acceptance criteria

```
[ ] All 14 domain sections present
[ ] Per family: list + single + history + search + bulk
    endpoints documented
[ ] Per family per-pack overlay (J1..J5 callouts)
[ ] Per family cache header per data class
[ ] Per family field-level redaction per role
[ ] Per family SLO target per route
[ ] Cross-references resolve
[ ] No marketing
[ ] Decision phrase emitted
```

## Decision phrase

```
S3-01_E4_RECORD_PER_DOMAIN_DEEP_UPGRADE_COMPLETE
```

After: load `S3-02_E5_E6.md`.
