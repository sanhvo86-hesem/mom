# Canonical Endpoint and Schema Catalog

Date: 2026-04-09
Purpose: target endpoint and table authority for backend redesign and schema normalization
Companion blueprint:

- `mom/docs/global-backend-standardization-blueprint-2026-04-09.md`

## How To Read This Catalog

### Standard endpoint classes

#### Lifecycle owner

Every lifecycle owner must expose:

- `GET /api/v1/<resource>`
- `GET /api/v1/<resource>/{id}`
- `POST /api/v1/<resource>`
- `PATCH /api/v1/<resource>/{id}`
- `POST /api/v1/<resource>/{id}:transition`
- `GET /api/v1/<resource>/{id}/timeline`
- `GET /api/v1/<resource>/{id}/attachments`
- `POST /api/v1/<resource>/{id}/attachments`

#### Contained child

Every contained child must expose:

- `GET /api/v1/<parent>/{parent_id}/<children>`
- `GET /api/v1/<parent>/{parent_id}/<children>/{child_id}`
- `POST /api/v1/<parent>/{parent_id}/<children>`
- `PATCH /api/v1/<parent>/{parent_id}/<children>/{child_id}`

Use `DELETE` only for non-governed draft/setup children.

### Minimum schema conventions

Every lifecycle owner table must include at least:

- `<entity>_id` UUID primary key
- `<entity>_number` or `<entity>_code`
- lifecycle status column
- `created_at`
- `updated_at`
- `row_version`
- organization scope fields
- `source_system`
- `source_record_id`

Contained children should include:

- `<child>_id`
- `<parent>_id`
- sequence/order field where needed
- timestamps
- `row_version`

## Foundation and Governance

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `organizations` | `org_organizations` | `organization_id`, `organization_code`, `organization_type`, `organization_status` | `POST /organizations/{organization_id}:activate`, `:deactivate`, `:reparent` |
| `plants` | `org_plants` | `plant_id`, `plant_code`, `plant_name`, `plant_status` | standard lifecycle owner only |
| `sites` | `org_sites` | `site_id`, `site_code`, `site_name`, `site_status` | standard lifecycle owner only |
| `warehouses` | `org_warehouses` | `warehouse_id`, `warehouse_code`, `warehouse_type`, `warehouse_status` | standard lifecycle owner only |
| `work-centers` | `org_work_centers` | `work_center_id`, `work_center_code`, `work_center_status` | `GET /work-centers/{work_center_id}/capacities` |
| `parties` | `party_master`, `party_roles`, `party_sites`, `party_contacts` | `party_id`, `party_code`, `party_type`, `party_status` | `POST /parties/{party_id}:assign-role`, `GET /parties/{party_id}/roles`, child endpoints for sites and contacts |
| `approval-groups` | `approval_groups`, `approval_group_members` | `approval_group_id`, `approval_group_code`, `approval_group_status` | `POST /approval-groups/{approval_group_id}:request`, `:decide` |
| `electronic-signatures` | `electronic_signatures` | `electronic_signature_id`, `signature_context`, `signed_at`, `signed_by` | `POST /electronic-signatures:sign` |
| `attachments` | `attachments`, `attachment_links` | `attachment_id`, `attachment_type`, `storage_uri` | `POST /attachments:upload`, `POST /attachments/{attachment_id}:link` |
| `code-sets` | `code_sets`, `code_set_values` | `code_set_id`, `code_set_code`, `value_code`, `value_status` | `GET /code-sets/{code_set_id}/values` |

## Master Data

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `items` | `items`, `item_revisions`, `item_sites` | `item_id`, `item_code`, `item_status`, `item_type` | `POST /items/{item_id}:release`, `:supersede`; child revisions and sites |
| `boms` | `bill_of_materials`, `bom_lines` | `bom_id`, `bom_code`, `bom_status`, `item_id` | `POST /boms/{bom_id}:release`, `:copy-revision` |
| `routings` | `routings`, `routing_operations` | `routing_id`, `routing_code`, `routing_status`, `item_id` | `POST /routings/{routing_id}:release`, `:copy-revision` |
| `inspection-plans` | `inspection_plans`, `inspection_plan_characteristics` | `inspection_plan_id`, `inspection_plan_code`, `inspection_plan_status`, `inspection_stage` | `POST /inspection-plans/{inspection_plan_id}:release`; child characteristics |
| `control-plans` | `control_plans`, `control_plan_characteristics` | `control_plan_id`, `control_plan_code`, `control_plan_status` | `POST /control-plans/{control_plan_id}:release` |

## Commercial and CRM

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `customers` | `customer_master`, `customer_sites`, `customer_contacts` | `customer_id`, `customer_code`, `customer_status`, `party_id` | `POST /customers/{customer_id}:approve`, `:suspend`; child sites and contacts |
| `customer-purchase-orders` | `customer_purchase_orders`, `customer_purchase_order_lines`, `customer_po_revisions` | `customer_purchase_order_id`, `customer_po_number`, `customer_po_status`, `customer_id` | `POST /customer-purchase-orders`, `GET /customer-purchase-orders/{id}`, `POST /customer-purchase-orders/{id}:transition` with `acknowledge/confirm/cancel/close`; child lines |
| `customer-touchpoints` | `customer_touchpoints` | `customer_touchpoint_id`, `touchpoint_type`, `touchpoint_status`, `customer_id` | `POST /customer-touchpoints/{id}:complete`, `:escalate` |
| `quotes` | `quotes`, `quote_lines`, `quote_revisions` | `quote_id`, `quote_number`, `quote_status`, `customer_id` | `POST /quotes/{quote_id}:submit`, `:approve`, `:reject`, `:convert-to-sales-order`; child lines |
| `quote-effectiveness-reviews` | `quote_effectiveness_reviews` | `quote_effectiveness_review_id`, `quote_id`, `conversion_outcome`, `review_status` | `POST /quote-effectiveness-reviews/{id}:publish` |
| `sales-orders` | `sales_orders`, `sales_order_lines`, `sales_order_holds`, `sales_order_milestones` | `sales_order_id`, `sales_order_number`, `sales_order_status`, `customer_id`, `customer_purchase_order_id` | `POST /sales-orders/{id}:confirm`, `:release-to-production`, `:set-hold`, `:release-hold`, `:ship`, `:close`; child lines, holds, milestones |
| `contract-reviews` | `contract_reviews`, `contract_review_items` | `contract_review_id`, `sales_order_id`, `contract_review_status` | `POST /contract-reviews/{id}:submit`, `:approve`, `:reject` |

## Supplier, Procurement, and Procure-to-Pay

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `suppliers` | `supplier_master`, `supplier_sites`, `supplier_contacts` | `supplier_id`, `supplier_code`, `supplier_status`, `party_id` | `POST /suppliers/{id}:qualify`, `:suspend`; child sites and contacts |
| `approved-supplier-list` | `approved_supplier_list` | `approved_supplier_list_id`, `supplier_id`, `item_id`, `asl_status` | `POST /approved-supplier-list/{id}:approve`, `:suspend` |
| `supplier-scorecards` | `supplier_scorecards`, `supplier_scorecard_lines` | `supplier_scorecard_id`, `supplier_id`, `period_code`, `scorecard_status` | `POST /supplier-scorecards/{id}:publish` |
| `supplier-corrective-actions` | `supplier_corrective_actions` | `supplier_corrective_action_id`, `supplier_id`, `scar_number`, `scar_status` | `POST /supplier-corrective-actions/{id}:issue`, `:verify`, `:close` |
| `purchase-requisitions` | `purchase_requisitions`, `purchase_requisition_lines` | `purchase_requisition_id`, `purchase_requisition_number`, `purchase_requisition_status`, `requesting_org_unit_id` | `POST /purchase-requisitions/{id}:submit`, `:approve`, `:reject`, `:convert-to-purchase-order`; child lines |
| `purchase-orders` | `purchase_orders`, `purchase_order_lines` | `purchase_order_id`, `purchase_order_number`, `purchase_order_status`, `supplier_id` | `POST /purchase-orders/{id}:submit-approval`, `:approve`, `:send-to-supplier`, `:receive`, `:close`; child lines |
| `supplier-asns` | `supplier_asns`, `supplier_asn_lines` | `supplier_asn_id`, `supplier_asn_number`, `supplier_asn_status`, `purchase_order_id` | `POST /supplier-asns/{id}:acknowledge`, `:receive` |
| `purchase-receipts` | `purchase_receipts`, `purchase_receipt_lines` | `purchase_receipt_id`, `purchase_receipt_number`, `purchase_receipt_status`, `purchase_order_id`, `supplier_asn_id` | `POST /purchase-receipts/{id}:post`, `:send-to-inspection`, `:release-to-inventory`; child lines |
| `invoice-matches` | `invoice_matches`, `invoice_match_lines` | `invoice_match_id`, `invoice_match_status`, `purchase_order_id`, `purchase_receipt_id`, `ap_invoice_id` | `POST /invoice-matches/{id}:run`, `:approve-exception`, `:close` |

## Planning and Production

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `forecasts` | `demand_forecasts`, `demand_forecast_lines` | `demand_forecast_id`, `forecast_number`, `forecast_status`, `customer_id` | `POST /forecasts/{id}:publish`, `:supersede` |
| `planning-scenarios` | `planning_scenarios`, `planning_scenario_kpis` | `planning_scenario_id`, `scenario_code`, `scenario_status` | `POST /planning-scenarios/{id}:run`, `:publish`, `:archive` |
| `planned-orders` | `planned_orders` | `planned_order_id`, `planned_order_number`, `planned_order_status`, `plan_type` | `POST /planned-orders/{id}:release`, `:cancel`, `:convert` |
| `capacity-buckets` | `capacity_buckets` | `capacity_bucket_id`, `bucket_date`, `work_center_id`, `bucket_status` | `POST /capacity-buckets/{id}:freeze`, `:reopen` |
| `schedule-slots` | `schedule_slots` | `schedule_slot_id`, `slot_status`, `resource_id`, `start_at`, `end_at` | `POST /schedule-slots/{id}:allocate`, `:lock`, `:release` |
| `jobs` | `job_orders` | `job_order_id`, `job_order_number`, `job_order_status`, `sales_order_id`, `item_id` | `POST /jobs/{id}:plan`, `:release`, `:start`, `:complete`, `:close` |
| `job-operations` | `job_operations` | `job_operation_id`, `job_order_id`, `operation_sequence`, `operation_status` | `POST /jobs/{job_order_id}/operations/{job_operation_id}:start`, `:complete`, `:hold` |
| `work-orders` | `manufacturing_work_orders` | `manufacturing_work_order_id`, `manufacturing_work_order_number`, `manufacturing_work_order_status`, `job_order_id` | `POST /work-orders/{id}:dispatch`, `:start`, `:complete`, `:close` |
| `dispatch-batches` | `dispatch_batches`, `dispatch_batch_lines` | `dispatch_batch_id`, `dispatch_batch_number`, `dispatch_batch_status` | `POST /dispatch-batches/{id}:release`, `:complete` |
| `labor-transactions` | `labor_transactions` | `labor_transaction_id`, `job_operation_id`, `labor_status`, `employee_id` | `POST /labor-transactions/{id}:approve` |
| `production-reports` | `production_reports` | `production_report_id`, `job_order_id`, `reported_at`, `report_status` | `POST /production-reports/{id}:post` |

## Inventory, Warehouse, Shipping, Transportation

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `inventory-lots` | `inventory_lots` | `inventory_lot_id`, `lot_number`, `lot_status`, `item_id` | `POST /inventory-lots/{id}:quarantine`, `:release`, `:scrap` |
| `serials` | `serial_master` | `serial_id`, `serial_number`, `serial_status`, `item_id` | `POST /serials/{id}:quarantine`, `:release` |
| `storage-bins` | `storage_bins` | `storage_bin_id`, `storage_bin_code`, `storage_bin_status`, `warehouse_id` | `POST /storage-bins/{id}:activate`, `:deactivate` |
| `bin-contents` | `bin_contents` | `bin_content_id`, `storage_bin_id`, `inventory_lot_id`, `content_status` | `POST /bin-contents/{id}:allocate`, `:release` |
| `handling-units` | `handling_units`, `handling_unit_items` | `handling_unit_id`, `handling_unit_code`, `handling_unit_status` | `POST /handling-units/{id}:seal`, `:move`, `:unpack` |
| `transfer-orders` | `transfer_orders`, `transfer_order_lines` | `transfer_order_id`, `transfer_order_number`, `transfer_order_status`, `from_bin_id`, `to_bin_id` | `POST /transfer-orders/{id}:confirm`, `:cancel`; child lines |
| `pick-lists` | `pick_lists`, `pick_list_lines` | `pick_list_id`, `pick_list_number`, `pick_list_status` | `POST /pick-lists/{id}:release`, `:confirm` |
| `pack-lists` | `pack_lists`, `pack_list_lines` | `pack_list_id`, `pack_list_number`, `pack_list_status`, `shipment_id` | `POST /pack-lists/{id}:complete` |
| `shipments` | `shipments`, `shipment_lines`, `shipment_packages` | `shipment_id`, `shipment_number`, `shipment_status`, `sales_order_id` | `POST /shipments/{id}:ready`, `:release`, `:dispatch`, `:deliver`, `:close` |
| `transportation-shipments` | `transportation_shipments`, `freight_quotes`, `freight_legs` | `transportation_shipment_id`, `transportation_shipment_number`, `transportation_shipment_status`, `shipment_id` | `POST /transportation-shipments/{id}:book`, `:handover`, `:confirm-delivery` |
| `freight-audits` | `freight_audits` | `freight_audit_id`, `freight_audit_status`, `transportation_shipment_id` | `POST /freight-audits/{id}:approve`, `:dispute`, `:close` |
| `customs-documents` | `customs_documents` | `customs_document_id`, `document_number`, `document_status`, `shipment_id` | `POST /customs-documents/{id}:submit`, `:clear` |

## Quality and Compliance

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `inspection-lots` | `inspection_lots` | `inspection_lot_id`, `inspection_lot_number`, `inspection_lot_status`, `inspection_stage`, `source_type`, `source_id` | `POST /inspection-lots/{id}:start`, `:accept`, `:reject`, `:waive` |
| `inspection-results` | `inspection_results` | `inspection_result_id`, `inspection_lot_id`, `characteristic_code`, `result_status` | child resource under inspection lots |
| `incoming-inspections` | `incoming_inspections` | `incoming_inspection_id`, `incoming_inspection_number`, `incoming_inspection_status`, `purchase_receipt_id` | `POST /incoming-inspections/{id}:start`, `:accept`, `:reject`, `:waive` |
| `ipqc-inspections` | `ipqc_inspections` | `ipqc_inspection_id`, `ipqc_inspection_number`, `ipqc_inspection_status`, `job_operation_id`, `work_order_id` | `POST /ipqc-inspections/{id}:start`, `:accept`, `:reject`, `:hold-process` |
| `fqc-inspections` | `fqc_inspections` | `fqc_inspection_id`, `fqc_inspection_number`, `fqc_inspection_status`, `job_order_id`, `work_order_id` | Conditional alias only until a distinct finished-goods release gate exists; otherwise remain on canonical `oqc-inspections` |
| `oqc-inspections` | `oqc_inspections` | `oqc_inspection_id`, `oqc_inspection_number`, `oqc_inspection_status`, `shipment_id` | `POST /oqc-inspections/{id}:start`, `:accept`, `:reject`, `:release-shipment` |
| `nonconformances` | `nonconformances`, `nonconformance_links` | `nonconformance_id`, `nonconformance_number`, `nonconformance_status`, `source_type`, `source_id` | `POST /nonconformances/{id}:contain`, `:disposition`, `:launch-capa`, `:close` |
| `mrb-cases` | `mrb_cases`, `mrb_decisions` | `mrb_case_id`, `mrb_case_number`, `mrb_case_status`, `nonconformance_id` | `POST /mrb-cases/{id}:decide`, `:approve`, `:close` |
| `deviations` | `deviations` | `deviation_id`, `deviation_number`, `deviation_status`, `valid_from`, `valid_to` | `POST /deviations/{id}:submit`, `:approve`, `:expire`, `:close` |
| `concessions` | `concessions` | `concession_id`, `concession_number`, `concession_status`, `nonconformance_id` | `POST /concessions/{id}:approve`, `:expire` |
| `capa-cases` | `capa_cases`, `capa_actions`, `capa_effectiveness_reviews` | `capa_case_id`, `capa_case_number`, `capa_case_status`, `source_case_type`, `source_case_id` | `POST /capa-cases/{id}:assign`, `:implement`, `:verify-effectiveness`, `:close` |
| `customer-complaints` | `customer_complaints` | `customer_complaint_id`, `customer_complaint_number`, `customer_complaint_status`, `customer_id` | `POST /customer-complaints/{id}:acknowledge`, `:investigate`, `:close` |
| `first-article-inspections` | `first_article_inspections`, `first_article_results` | `first_article_inspection_id`, `first_article_number`, `first_article_status`, `job_order_id` | `POST /first-article-inspections/{id}:submit`, `:approve`, `:reject` |
| `spc-events` | `spc_events`, `spc_violations` | `spc_event_id`, `spc_status`, `work_center_id`, `item_id` | `POST /spc-events/{id}:acknowledge`, `:launch-investigation` |
| `quality-orders` | `quality_orders`, `quality_order_links` | `quality_order_id`, `quality_order_number`, `quality_order_status`, `case_type` | `POST /quality-orders/{id}:assign`, `:close` |

## Asset, Maintenance, Tooling, Calibration

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `assets` | `asset_master`, `asset_roles`, `asset_financial_links` | `asset_id`, `asset_number`, `asset_status`, `asset_type` | `POST /assets/{id}:capitalize`, `:activate`, `:retire`, `:dispose` |
| `equipment` | `equipment`, `equipment_capabilities` | `equipment_id`, `equipment_number`, `equipment_status`, `asset_id`, `work_center_id` | `POST /equipment/{id}:commission`, `:decommission`, `:place-under-maintenance` |
| `tools` | `tools`, `tool_life_limits`, `tool_locations` | `tool_id`, `tool_number`, `tool_status`, `tool_type`, `asset_id` | `POST /tools/{id}:issue`, `:return`, `:preset`, `:regrind`, `:retire` |
| `calibration-plans` | `calibration_plans`, `calibration_plan_items` | `calibration_plan_id`, `calibration_plan_code`, `calibration_plan_status`, `asset_id` | `POST /calibration-plans/{id}:schedule`, `:release` |
| `calibration-records` | `calibration_records` | `calibration_record_id`, `calibration_record_number`, `calibration_record_status`, `asset_id` | `POST /calibration-records/{id}:approve`, `:declare-out-of-tolerance`, `:close` |
| `oot-investigations` | `oot_investigations` | `oot_investigation_id`, `oot_investigation_number`, `oot_investigation_status`, `calibration_record_id` | `POST /oot-investigations/{id}:contain`, `:launch-ncr`, `:close` |
| `maintenance-plans` | `maintenance_plans`, `maintenance_plan_items` | `maintenance_plan_id`, `maintenance_plan_code`, `maintenance_plan_status`, `asset_id` | `POST /maintenance-plans/{id}:schedule`, `:release` |
| `maintenance-work-orders` | `maintenance_work_orders`, `maintenance_work_order_operations`, `maintenance_work_order_parts` | `maintenance_work_order_id`, `maintenance_work_order_number`, `maintenance_work_order_status`, `asset_id` | `POST /maintenance-work-orders/{id}:plan`, `:release`, `:start`, `:complete`, `:close` |
| `condition-readings` | `condition_readings` | `condition_reading_id`, `asset_id`, `reading_type`, `reading_status` | `POST /condition-readings/{id}:evaluate`, `:create-work-order` |
| `spare-parts` | `spare_parts_inventory` | `spare_part_id`, `item_id`, `spare_part_status`, `asset_class` | `POST /spare-parts/{id}:replenish`, `:reserve` |

## HCM, Qualification, Safety, and External Obligations

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `employees` | `employee_master` | `employee_id`, `employee_number`, `employment_status`, `party_id` | `POST /employees/{id}:hire`, `:activate`, `:suspend`, `:terminate` |
| `positions` | `positions` | `position_id`, `position_code`, `position_status` | standard lifecycle owner only |
| `skills` | `skills_catalog` | `skill_id`, `skill_code`, `skill_status` | standard lifecycle owner only |
| `employee-skills` | `employee_skills` | `employee_skill_id`, `employee_id`, `skill_id`, `qualification_status` | `POST /employee-skills/{id}:assess`, `:approve` |
| `certifications` | `certifications` | `certification_id`, `certification_code`, `certification_status` | standard lifecycle owner only |
| `employee-certifications` | `employee_certifications` | `employee_certification_id`, `employee_id`, `certification_id`, `certification_status`, `expiry_date` | `POST /employee-certifications/{id}:renew`, `:suspend`, `:revoke` |
| `qualification-requirements` | `qualification_requirements` | `qualification_requirement_id`, `entity_type`, `entity_id`, `qualification_status` | standard lifecycle owner only |
| `training-records` | `training_records` | `training_record_id`, `employee_id`, `training_status`, `training_due_date` | `POST /training-records/{id}:assign`, `:complete`, `:verify` |
| `incidents` | `safety_incidents` | `safety_incident_id`, `safety_incident_number`, `incident_status`, `incident_type`, `reported_at` | `POST /incidents/{id}:acknowledge`, `:investigate`, `:close` |
| `permits` | `permit_register` | `permit_id`, `permit_number`, `permit_status`, `permit_type`, `expiry_date` | `POST /permits/{id}:renew`, `:suspend`, `:expire` |
| `compliance-obligations` | `compliance_obligations` | `compliance_obligation_id`, `obligation_code`, `obligation_status`, `obligation_type`, `owner_id` | `POST /compliance-obligations/{id}:assign`, `:complete`, `:overdue`, `:close` |
| `safety-corrective-actions` | `safety_corrective_actions` | `safety_corrective_action_id`, `incident_id`, `action_status` | `POST /safety-corrective-actions/{id}:verify`, `:close` |
| `emergency-drills` | `emergency_drills` | `emergency_drill_id`, `drill_number`, `drill_status` | `POST /emergency-drills/{id}:schedule`, `:complete` |
| `five-s-audits` | `five_s_audits`, `five_s_audit_results` | `five_s_audit_id`, `five_s_audit_number`, `five_s_audit_status`, `area_id` | `POST /five-s-audits/{id}:publish`, `:launch-action` |

## Finance and Treasury

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `ap-invoices` | `ap_invoices`, `ap_invoice_lines` | `ap_invoice_id`, `invoice_number`, `ap_invoice_status`, `supplier_id`, `currency_code` | `POST /ap-invoices/{id}:match`, `:approve`, `:post`, `:pay`, `:close` |
| `ar-invoices` | `ar_invoices`, `ar_invoice_lines` | `ar_invoice_id`, `invoice_number`, `ar_invoice_status`, `customer_id`, `currency_code` | `POST /ar-invoices/{id}:post`, `:collect`, `:close` |
| `period-closes` | `period_close_controls`, `period_close_steps` | `period_close_id`, `period_code`, `close_status`, `ledger_scope` | `POST /period-closes/{id}:prepare`, `:close`, `:reopen` |
| `backdate-exceptions` | `backdate_exceptions` | `backdate_exception_id`, `exception_status`, `ledger_scope`, `requested_posting_date`, `expires_at` | `POST /backdate-exceptions/{id}:approve`, `:expire`, `:close` |
| `credit-memos` | `credit_memos`, `credit_memo_lines` | `credit_memo_id`, `memo_status`, `invoice_scope`, `original_invoice_ref` | `POST /credit-memos/{id}:approve`, `:post`, `:settle`, `:void` |
| `debit-memos` | `debit_memos`, `debit_memo_lines` | `debit_memo_id`, `memo_status`, `invoice_scope`, `original_invoice_ref` | `POST /debit-memos/{id}:approve`, `:post`, `:settle`, `:void` |
| `journal-entries` | `journal_entries`, `journal_entry_lines` | `journal_entry_id`, `journal_entry_number`, `journal_entry_status`, `ledger_id` | `POST /journal-entries/{id}:post`, `:reverse` |
| `fixed-assets` | `fixed_assets` | `fixed_asset_id`, `asset_number`, `fixed_asset_status`, `asset_id` | `POST /fixed-assets/{id}:capitalize`, `:depreciate`, `:retire` |
| `depreciation-runs` | `depreciation_runs`, `depreciation_run_lines` | `depreciation_run_id`, `depreciation_run_number`, `depreciation_run_status`, `period_code` | `POST /depreciation-runs/{id}:run`, `:post`, `:reverse` |
| `bank-reconciliations` | `bank_reconciliations` | `bank_reconciliation_id`, `bank_reconciliation_number`, `bank_reconciliation_status`, `cash_account_id` | `POST /bank-reconciliations/{id}:match`, `:approve`, `:close` |
| `revenue-schedules` | `revenue_schedules`, `revenue_schedule_lines` | `revenue_schedule_id`, `revenue_schedule_number`, `revenue_schedule_status` | `POST /revenue-schedules/{id}:recognize`, `:close` |
| `budgets` | `budget_versions`, `budget_lines` | `budget_version_id`, `budget_version_code`, `budget_status` | `POST /budgets/{id}:submit`, `:approve`, `:freeze` |
| `cost-rollups` | `standard_cost_rollups`, `standard_cost_rollup_lines` | `standard_cost_rollup_id`, `cost_rollup_number`, `cost_rollup_status` | `POST /cost-rollups/{id}:run`, `:publish` |

## Integration Resilience

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `reconciliation-exceptions` | `mes_erp_reconciliation_exceptions` | `reconciliation_id`, `exception_status`, `sync_domain`, `detected_at`, `severity` | `POST /reconciliation-exceptions/{id}:acknowledge`, `:retry`, `:compensate`, `:close` |

## Release Truth Snapshots

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `inventory-balance-snapshots` | `inventory_balance_snapshot` | `inventory_balance_snapshot_id`, `warehouse_id`, `item_site_id`, `snapshot_at` | read-only projection |
| `production-bom-snapshots` | `production_order_bom_snapshot` | `production_order_bom_snapshot_id`, `production_order_id`, `frozen_at` | read-only projection |
| `production-route-snapshots` | `production_order_route_snapshot` | `production_order_route_snapshot_id`, `production_order_id`, `frozen_at` | read-only projection |
| `mes-oee-snapshots` | `mes_oee_snapshots` | `snapshot_id`, `equipment_id`, `snapshot_date`, `shift_code` | read-only projection |
| `plant-performance-snapshots` | `plant_performance_snapshots` | `plant_performance_snapshot_id`, `org_site_id`, `snapshot_at` | read-only projection |

## Audit, Improvement, and Operational Excellence

| Resource | Target tables | Minimum key columns | Required extra endpoints/actions |
|---|---|---|---|
| `audits` | `audits` | `audit_id`, `audit_number`, `audit_status`, `audit_type` | `POST /audits/{id}:schedule`, `:start`, `:issue-findings`, `:close` |
| `audit-findings` | `audit_findings` | `audit_finding_id`, `audit_id`, `finding_status`, `severity_code` | `POST /audit-findings/{id}:assign-action`, `:close` |
| `audit-actions` | `audit_actions` | `audit_action_id`, `audit_finding_id`, `action_status` | `POST /audit-actions/{id}:verify`, `:close` |
| `risk-register` | `risk_register` | `risk_id`, `risk_number`, `risk_status`, `risk_type` | `POST /risk-register/{id}:treat`, `:accept`, `:close` |
| `management-reviews` | `management_reviews`, `management_review_inputs` | `management_review_id`, `management_review_number`, `management_review_status` | `POST /management-reviews/{id}:issue-actions`, `:close` |
| `improvement-projects` | `improvement_projects` | `improvement_project_id`, `improvement_project_number`, `improvement_project_status` | `POST /improvement-projects/{id}:approve`, `:complete`, `:close` |
| `kaizen-events` | `kaizen_events` | `kaizen_event_id`, `kaizen_event_number`, `kaizen_event_status` | `POST /kaizen-events/{id}:approve`, `:complete` |
| `andon-events` | `andon_events` | `andon_event_id`, `andon_event_number`, `andon_event_status` | `POST /andon-events/{id}:acknowledge`, `:resolve`, `:close` |
| `gemba-walks` | `gemba_walks`, `gemba_walk_observations` | `gemba_walk_id`, `gemba_walk_number`, `gemba_walk_status` | `POST /gemba-walks/{id}:publish`, `:launch-action` |

## Schema Rules That Must Be Applied Across This Catalog

### 1. No lifecycle owner without a lifecycle field

If a resource has:

- workflow
- transitions
- approvals
- close/release/start/complete actions

then it must have:

- explicit lifecycle field
- explicit status set

### 2. No major enterprise object should remain `generic_status_only`

This catalog assumes explicit lifecycle orchestration for:

- customer
- supplier
- employee
- asset
- sales order
- purchase order
- job
- work order
- shipment
- inspection
- NCR
- CAPA
- incident
- AP invoice

### 3. Parent-child boundaries must be explicit

A child table should not be treated as an independent workflow unless there is a true business reason.

Examples:

- `quote_lines` are children, not independent lifecycle owners
- `inspection_results` are children of `inspection_lots`
- `purchase_receipt_lines` are children of `purchase_receipts`

### 4. Domain actions must own side effects

Use explicit actions instead of plain status change for:

- inventory moves
- financial postings
- procurement approvals
- shipment release
- quality disposition
- capitalization/depreciation

## Migration Priorities Derived From This Catalog

### P0

- introduce missing lifecycle fields and transition contracts
- create canonical resources missing entirely:
  - `customer-purchase-orders`
  - `purchase-requisitions`
  - `supplier-asns`
  - `purchase-receipts`
  - `ipqc-inspections`
  - `fqc-inspections`
  - `assets`
  - `incidents`
  - `compliance-obligations`

### P1

- split `ap_ar_invoices` into `ap_invoices` and `ar_invoices`
- retire ambiguous WO ownership by separating manufacturing, maintenance, and service work orders cleanly
- unify transportation and shipping under linked but non-duplicative shipment models

### P2

- convert this catalog into domain OpenAPI specs
- generate JSON Schema components and migration stubs
- produce compatibility map from current endpoints to target endpoints

## Bottom Line

This catalog is the target backend API/schema authority.

The next implementation step should not be random table patching.

It should be:

1. adopt these canonical resources
2. repair lifecycle authority
3. map current tables/endpoints to target resources
4. implement migration waves in dependency order
