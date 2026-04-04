# Order Management Redesign Spec 2026-03-31

## Scope

This redesign upgrades the HESEM order module across:

- runtime data model
- frontend operating workspace
- backend read model
- future PostgreSQL schema

## New data foundations

### Commercial foundations

- `customer_sites`
- `commercial_accounts`
- `incoterms`
- `payment_terms`
- `shipping_methods`
- `promise_policies`

### Engineering and production foundations

- `routing_library`
- `bom_library`
- `control_plans`
- `inspection_plans`
- `traveler_templates`
- `launch_gate_templates`

### Quality and fulfillment foundations

- `quality_gate_profiles`
- `customer_item_approvals`
- `supplier_process_approvals`
- `warehouse_locations`

## Runtime order model additions

### Sales Order

- `customer_site_id`
- `requested_date`
- `promise_date`
- `commit_date`
- `incoterm_code`
- `shipping_method_id`
- `payment_term_code`
- `contract_review_status`
- `fulfillment_status`
- `document_requirements`
- hold flags and shipping certificate requirements

### Job Order

- `release_target_date`
- `bom_id`
- `control_plan_id`
- `inspection_plan_id`
- `traveler_template_id`
- `engineering_release_status`
- `material_ready_status`
- `quality_plan_status`
- `source_inspection_status`
- `outside_processing_status`

### Work Order

- `dispatch_priority`
- `quality_gate_status`
- `first_piece_status`
- `handover_status`
- MES-derived launch gate summaries

## Read model outputs

Each SO/JO/WO now produces:

- `gate_cards`
- `exception_cards`
- `milestones`
- `operating.phase`
- `operating.health_band`
- `operating.readiness_score`
- `operating.blocked`
- `operating.completion_pct`
- `operating.late_days`

## Dashboard outcomes

The redesigned workspace should answer these questions quickly:

1. Which orders are at risk against promise/commit?
2. Which JOs are release-ready and which are blocked by engineering/master-data gaps?
3. Which WOs are blocked by MES gates, traceability, tooling, operator qualification, or connectivity?
4. Which shipment documents are still pending?
5. Where is the next action owner?

## Database migration added

`032_order_management_world_class_foundations.sql` adds:

- customer sites
- commercial accounts
- order holds
- order milestones
- order document requirements
- job release gates
- outside processing orders
- shipment releases
- collaboration events

## Design rule

The module must stay compatible with the current JSON-first runtime while shaping data exactly as a future ERP/MES/eQMS integrated system expects it.
