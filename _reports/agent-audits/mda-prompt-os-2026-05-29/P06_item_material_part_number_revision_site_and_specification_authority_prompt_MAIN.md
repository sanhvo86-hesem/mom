# P06 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P06-CLAIM-001 | Canonical `item`, `item_revision`, `item_site`, `item_attr`, `item_spec`, `lot_policy`, `serial_policy`, and `shelf_life_policy` already exist physically. | REPO_EVIDENCE | `mom/database/migrations/073_canonical_master_data_core.sql` | High | P06 could overdesign target tables that already exist | anchor the item backbone to migration 073 | verified |
| P06-CLAIM-002 | Legacy `items` and `item_revisions` still hold many commercial, procurement, planning, quality, and traceability fields that are not yet fully migrated into canonical profiles. | REPO_EVIDENCE | `mom/database/migrations/006_erp_master_data.sql` | High | item authority could ignore runtime-critical legacy fields | model them as compatibility bridges, not hidden truth | verified |
| P06-CLAIM-003 | Current contract authority names item master as `inventory_logistics.inventory-items` with compatibility alias to live `master_data.items.*`. | REPO_EVIDENCE | `mom/contracts/objects/inventory_logistics--inventory-items/contract.json` | High | changing names or routes prematurely would break registry truth | preserve compatibility alias semantics | verified |
| P06-CLAIM-004 | Sales/JO/WO readiness already requires engineering release evidence and released BOM/routing/control-plan/inspection-plan package. | REPO_EVIDENCE | `docs/backend/WORKFLOW_STATUS_UNIFICATION_SPEC.md` | High | item release could be defined without downstream execution gates | keep released revision tied to engineering-ready package | verified |
| P06-CLAIM-005 | Trusted release packet logic already treats `part_number`, `part_revision`, `lot_number`, and `serial_number` as immutable release identifiers. | REPO_EVIDENCE | `mom/api/services/TrustedReleaseRecordService.php` | High | snapshot immutability could be underspecified | align P06 release model to immutable execution snapshots | verified |
| P06-CLAIM-006 | P05 left customer-item approval and supplier-process approval as open dependencies for item authority. | REPO_EVIDENCE | `_reports/agent-audits/mda-prompt-os-2026-05-29/P05_party_customer_supplier_employee_operator_and_user_authority_prompt_GAP_AND_REPAIR_LEDGER.csv` | High | P06 could assume these approvals already exist | keep them explicit as controlled dependencies | verified |
| P06-CLAIM-007 | `base_uom_code` on canonical item references `uom(uom_code)`, but UOM runtime authority remains an earlier unresolved gap and must not be silently re-decided here. | REPO_EVIDENCE | `mom/database/migrations/073_canonical_master_data_core.sql`; `_reports/.../MDA_CONTROLLED_GAP_LEDGER.csv` | High | P06 could conflict with another AI's UOM work and create divergence | consume UOM as dependency only in this branch | verified |
| P06-CLAIM-008 | Existing runtime and registry evidence is enough to define Item/Revision/Site/Spec authority without editing UOM logic. | INFERENCE | repo evidence above plus user branch-scope instruction | Medium | incomplete field model | keep UOM fields as reference-only dependency and controlled conflict note | verified |

## Backbone decisions

1. `Item` is the enterprise identity and classification root: part number, base UOM reference, family/class/category, and default traceability-policy references live here.
2. `ItemRevision` is the technical/released meaning root: drawing link, material/spec baseline, effectivity, approval state, and release immutability live here.
3. `ItemSite` is the local operational profile: planning, warehouse default, procurement mode, local storage handling, local quality and cost parameters belong here or on its child profiles, not on the enterprise item header.
4. `ItemSpec` is a revision child. Released revisions cannot have direct spec edits; change requires ECO/change package and a new released revision.
5. drawing revision is linked evidence, not the same object as item revision. A drawing may revise independently, but a released item revision must pin which released drawing/doc revision it used.

## Canonical object package

| Object | Class | Current physical lane | Authority decision |
| --- | --- | --- | --- |
| `Item` | `lifecycle_owner` | canonical `item` + legacy `items` | enterprise identity root |
| `ItemRevision` | `lifecycle_owner` | canonical `item_revision` + legacy `item_revisions` | released technical meaning root |
| `ItemSite` | `contained_child` with governed state | canonical `item_site` | site-local configuration authority |
| `ItemVariant` | `contained_child` | canonical `item_variant` | option/config variant child |
| `ItemAttribute` | `contained_child` | canonical `item_attr` | non-governed extensible attributes, never release gates unless promoted |
| `ItemSpec` | `contained_child` | canonical `item_spec` | governed revision-level spec authority |
| `LotPolicy` / `SerialPolicy` / `ShelfLifePolicy` | `reference_master` | canonical tables | traceability-policy references |
| `ItemCustomerCrossRef` | target addition / compatibility bridge | legacy `customer_part_number` fields | versioned customer PN/rev mapping with effectivity |
| `ItemSupplierCrossRef` | target addition / compatibility bridge | legacy `manufacturer_part_number` and vendor references | versioned supplier PN/rev mapping with effectivity |
| `ItemSubstitutionRule` | target addition / compatibility bridge | legacy `substitute_item_id` and BOM substitute fields | governed substitute approval object |
| `ItemPlanningProfile` / `ItemProcurementProfile` / `ItemManufacturingProfile` / `ItemQualityProfile` / `ItemStorageProfile` / `ItemCostProfile` | target normalized profiles | legacy `items` field clusters + site settings | staged normalization; no false claim that they already exist physically |

## Command catalog

| Command | Owner | Target | Preconditions | Result |
| --- | --- | --- | --- | --- |
| `CreateItem` | item master command service | `Item` | unique part number, base UOM reference exists, class/type valid | enterprise item root created |
| `CreateItemRevision` | engineering command service | `ItemRevision` | item exists, revision code unique | draft revision created |
| `SubmitItemRevision` | engineering command service | `ItemRevision` | required spec/doc package attached | approval workflow begins |
| `ApproveItemRevision` | engineering/quality approval service | `ItemRevision` | released evidence package complete, SoD satisfied | approval state set |
| `ReleaseItemRevision` | engineering release command service | `ItemRevision` | approved revision, released drawing/doc, downstream package gates met by policy | released revision effective |
| `SupersedeItemRevision` | engineering release command service | `ItemRevision` | successor released/effective, no illegal overlap | current released rev closed |
| `ObsoleteItem` | item master command service | `Item` | no future operational eligibility or explicit exception plan | item retired |
| `ConfigureItemSite` | planning/procurement/inventory command service | `ItemSite` | site exists, no local conflicts | local site profile updated |
| `AddItemSpec` | engineering/quality command service | `ItemSpec` | revision draft/editable, range valid | spec row added |
| `AddCustomerCrossRef` | commercial engineering command service | `ItemCustomerCrossRef` | item exists, customer approval basis exists | effectivity-based customer mapping added |
| `AddSupplierCrossRef` | procurement engineering command service | `ItemSupplierCrossRef` | item exists, supplier approved for scope | effectivity-based supplier mapping added |
| `ApproveSubstitution` | engineering/quality/commercial command service | `ItemSubstitutionRule` | substitute basis, customer/site/supplier scope approved | substitution released |
| `ChangeTraceabilityPolicy` | engineering/inventory quality command service | policy refs | no illegal retroactive impact on open stock/WIP | new policy via revision/site change package |

## Gates

- Do not use an item in SO/JO/WO/PO/shipment if the relevant item header or required revision is not in an allowed state.
- `ReleaseItemRevision` must fail if drawing/document evidence is missing, if spec set is incomplete for the item risk class, or if downstream release package policy says BOM/routing/control-plan/inspection-plan are mandatory and not released.
- `CreatePO` and receipt release must fail if supplier cross-reference or approval is expired for the relevant item/process scope.
- material issue and completion must fail when lot/serial/shelf-life policy is violated.
- shipment must fail when customer-specific label/certificate/packaging requirements are missing for the effective customer/item mapping.

## Immutability rules

1. Released revision rows are immutable for material grade, drawing reference, spec bounds, customer revision mapping baseline, and traceability-policy meaning.
2. Changes after release must go through new revision/effectivity or controlled supersede package.
3. Historical transactions snapshot part number, revision, lot, serial, packaging, and released evidence package; they must not re-resolve live item master later.

## Cross-reference and site rules

- `ItemCustomerCrossRef` and `ItemSupplierCrossRef` are effectivity-based objects. Customer or supplier part number/revision changes create new rows; they never overwrite old transactional meaning.
- enterprise item header must not absorb all site-local MRP, storage, QA, procurement, or cost settings.
- site-level profiles inherit enterprise defaults only as seed values; runtime commands read the site-effective value.

## Data quality rules

- duplicate part number normalized by trim + casefold is blocked
- missing base UOM reference is blocked at create-time, but UOM authority itself stays out-of-scope here
- lower spec limit greater than upper limit is blocked
- substitute item use without approved scope is blocked
- traceability policy and item flags must not contradict each other
- cost rollup cannot use draft BOM or unreleased revision

## Scope boundary for concurrent AI safety

Per user instruction in this session, P06 does not modify or re-decide UOM implementation. UOM fields are cataloged only as consumed references so the item backbone can proceed without colliding with another AI branch.

## Repair pass applied in P06

1. Resolved item-vs-revision-vs-drawing ambiguity by separating enterprise identity, released technical meaning, and document evidence.
2. Moved planning/procurement/storage/cost behavior out of the enterprise item header conceptually and into site/profile authority, while still honoring current legacy storage.
3. Made customer/supplier cross-reference versioning explicit so future prompts do not overwrite historical transaction meaning.
4. Contained UOM within a scoped dependency instead of silently reopening the unresolved authority conflict.

## Final re-audit result

P06 leaves no new hidden authority or silent mutation lane. Remaining gaps are migration/profile-implementation gaps and the inherited UOM dependency boundary, all treated as controlled and non-blocking for `P07`.

## Decision token

`P06_PASS_WITH_CONTROLLED_GAPS`
