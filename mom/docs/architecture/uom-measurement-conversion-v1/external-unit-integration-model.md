# P09 — External Unit Integration Model (OT / Edge / Lab / EDI)

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P09 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the channels through which non-HESEM systems supply unit-bearing data — shop-floor OPC UA, edge / IoT gateways, laboratory LIMS, EDI partner exchanges — and the governed boundary at which they enter HESEM. Every channel either resolves to a canonical unit or queues for human triage; no channel may write to a regulated table with an unresolved unit.

## 2. Channels

| Channel | Source | Adapter | Authority |
|---|---|---|---|
| OPC UA streaming | shop-floor PLCs, MES gateway | `ExternalEngineeringUnitMapper::fromOpcUaUnitId` | OPC UA Part 8 EUInformation |
| OPC UA tag metadata bootstrap | engineering / OEM | seed migration | OPC UA Part 8 |
| Edge / IoT gateway | sensor concentrators (LoRaWAN, Modbus) | gateway emits canonical or supplier-namespaced unit; mapper resolves | gateway vendor |
| LIMS export | lab instrument software (Thermo, LabWare, ...) | LIMS adapter → `fromLims` | LIMS vendor + HESEM alias |
| EDI partner exchange | trade docs (X12, EDIFACT) | EDI adapter → `fromUnece` (Rec20) | UNECE Rec20 |
| Supplier portal upload | XLSX / CSV / API | upload adapter → supplier-scoped alias resolution | supplier (verified session) |
| Customer portal upload | quote / RFQ tools | upload adapter → customer-scoped alias resolution | customer (verified session) |
| Vendor proprietary tag | rare; namespace > 0 | SUPPLIER alias seeded per vendor | per-vendor agreement |

## 3. Adapter contract

Every external adapter must:

1. Resolve the inbound unit via the appropriate mapper method.
2. On failure, raise `UOM_EXTERNAL_CODE_UNKNOWN` (HTTP 422) and queue an alias quarantine row.
3. Never silently coerce, default, or fall through to "Unit unknown".
4. Persist the canonical_code on the source row alongside any raw foreign code.
5. Hand-off to `QualityMeasurementBridge` or analogous bridge before the source row is treated as authoritative.

## 4. UomAliasResolutionService — service spec for adapters

`UomAliasResolutionService::resolve($input, $scope, $supplierId?, $customerId?)`:

| Input | Validation |
|---|---|
| `$input` | trimmed; non-empty; max length 128 |
| `$scope` | enum `SYSTEM` / `SUPPLIER` / `CUSTOMER` / `LIMS` |
| `$supplierId` | required iff scope=SUPPLIER; verified against authenticated session |
| `$customerId` | required iff scope=CUSTOMER; verified against authenticated session |

Algorithm:

1. Canonical fast-path (input matches existing canonical_code, active).
2. Alias lookup ordered by scope priority `SUPPLIER → CUSTOMER → LIMS → SYSTEM`.
3. External code map for `(scope_to_system, input)`.
4. On miss → quarantine row + `UOM_EXTERNAL_CODE_UNKNOWN`.

Return shape:

```json
{
  "canonical_code": "<string>",
  "match_scope":    "CANONICAL|SUPPLIER|CUSTOMER|LIMS|SYSTEM|EXTERNAL_MAP",
  "match_revision": "<string|null>",
  "alias_id":       "<uuid|null>",
  "quarantine_id":  "<uuid|null>"
}
```

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| ED-001 | Every channel goes through a single adapter contract (resolve-or-quarantine) | UD-013 |
| ED-002 | Adapter must persist canonical_code; the foreign code may also be persisted as provenance | provenance |
| ED-003 | Supplier / customer scope requires authenticated session identity | RBAC SSOT |
| ED-004 | OPC UA namespace 0 mapped via external code map; namespace > 0 via SUPPLIER alias | AM-003 |
| ED-005 | EDI Rec20 mapping pinned to rev.17 | CL-002 |
| ED-006 | Edge gateway is treated as supplier with `supplier_id='HESEM_EDGE_GATEWAY'` | clarity |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | EG-001 | EDI integration not yet seeded in `uom_external_code_map` | first commercial EDI partner |
| medium | EG-002 | Customer portal upload adapter not yet wired through UomAliasResolutionService | follow-up |
| low | EG-003 | LIMS μm dispatch via quantity_kind hint requires adapter caller knowledge | document in adapter contracts |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Channel enumeration | 9 |
| Adapter contract clarity | 10 |
| Quarantine path safety | 10 |
| Authority discipline | 9 |
| **Total** | **38 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/backend/uom-measurement-conversion-v1/uom-alias-resolution-service-spec.md` (P09 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p09-external-unit-abuse-redteam.md` (P09 / 3)
