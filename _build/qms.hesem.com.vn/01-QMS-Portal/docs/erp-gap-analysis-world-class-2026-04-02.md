# ERP Gap Analysis: World-Class Manufacturing ERP vs HESEM QMS Portal (229 Tables)

**Date:** 2026-04-02
**Method:** Cross-referenced SAP S/4HANA, Epicor Kinetic, IFS Cloud, and industry-standard ERP architectures against the current HESEM portal schema (45 migrations, ~229 tables).

**Follow-up implementation:** The schema has since been extended via migrations `046`-`068`; see `docs/erp-500plus-schema-expansion-2026-04-02.md` for the operationalized 500+ table roadmap and migration mapping.

---

## Current Coverage Summary

The HESEM portal already covers: core system, document management, forms, records, ERP master data (items, BOMs, routings), customers/sales, vendors/purchasing, inventory, production, quality (NCR, CAPA, FAI, SPC, FMEA), calibration, training/HR, audit/risk, finance, shipping/compliance, subcontracting/RMA, projects/KPI, MES (36+ tables), order management, exception management, supplier quality, quoting, evidence vault, customer portal, CNC programs, digital product passport, AI/predictive quality, FMEA/APQP/control plan, production dispatch, shift calendar, OQC/packing/outsource.

---

## GAP AREA A: Advanced Planning & Scheduling (APS)

**Priority: CRITICAL for CNC aerospace job shop**

APS goes beyond basic dispatch/shift scheduling. SAP APO and Siemens Opcenter APS use finite-capacity constraint-based scheduling with what-if scenarios. The current portal has `041_ai_predictive_quality_aps.sql` (6 tables) but likely lacks full finite-scheduling depth.

### Tables Needed (12)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `aps_planning_scenarios` | Named what-if scenarios (baseline, rush-order, maintenance-window) |
| 2 | `aps_demand_forecasts` | Demand signals: customer forecasts, blanket-order call-offs, MPS quantities |
| 3 | `aps_demand_forecast_lines` | Line-level detail per item/period/customer |
| 4 | `aps_capacity_buckets` | Time-phased capacity by work center (shifts x efficiency x availability) |
| 5 | `aps_constraint_resources` | Bottleneck machines/operators/tooling flagged as constraints (Theory of Constraints) |
| 6 | `aps_schedule_blocks` | Gantt blocks: job-op assigned to resource with start/end at minute resolution |
| 7 | `aps_schedule_conflicts` | Detected overloads, material shortages, tooling clashes per scenario |
| 8 | `aps_material_availability` | Projected available balance (PAB) per item/date, netting PO + WIP - demand |
| 9 | `aps_setup_matrices` | Sequence-dependent setup times between part families on each machine |
| 10 | `aps_pegging_links` | Supply-demand pegging: which PO/WIP satisfies which SO line |
| 11 | `aps_kpi_snapshots` | On-time %, utilization %, WIP value, lead-time per scenario snapshot |
| 12 | `aps_planning_horizons` | Frozen/slushy/free horizon definitions per planner group |

### Key Columns per Table

**aps_planning_scenarios:** `scenario_id, name, base_scenario_id, status (draft|published|archived), created_by, snapshot_at, is_baseline, locked_until`

**aps_demand_forecasts:** `forecast_id, scenario_id, customer_id, item_id, period_start, period_end, forecast_qty, actual_qty, confidence_pct, source (EDI|manual|AI)`

**aps_capacity_buckets:** `bucket_id, work_center_id, shift_id, date, available_minutes, allocated_minutes, efficiency_factor, maintenance_blocked_minutes, overtime_available`

**aps_constraint_resources:** `constraint_id, resource_type (machine|operator|tool), resource_id, max_capacity_per_day, is_bottleneck, drum_buffer_rope_priority, notes`

**aps_schedule_blocks:** `block_id, scenario_id, job_id, operation_id, resource_id, planned_start, planned_end, setup_minutes, run_minutes, status, sequence_position`

**aps_setup_matrices:** `matrix_id, resource_id, from_part_family, to_part_family, setup_minutes, tool_change_required, validated_date`

**aps_pegging_links:** `peg_id, demand_type (SO|forecast), demand_id, supply_type (PO|WIP|stock), supply_id, pegged_qty, date_needed, date_promised`

### Why Critical for CNC Aerospace

- CNC job shops have extreme sequence-dependent setups (fixture changes, tool preset, 5-axis calibration)
- Aerospace customers issue rigid promise dates with liquidated damages
- Bottleneck machines (5-axis, EDM, CMM) drive throughput -- constraint-based scheduling is essential
- ITAR/AS9100 require traceable planning decisions for counterfeit-part risk

---

## GAP AREA B: Warehouse Management System (WMS)

**Priority: HIGH for CNC aerospace**

The current portal has `warehouses`, `inventory_locations`, `lot_master`, `serial_master`, `inventory_transactions`. This is basic inventory, not WMS. SAP WM uses LAGP (storage bins), LQUA (quants), LTAK/LTAP (transfer orders). A CNC shop handling aerospace material certs needs bin-level traceability.

### Tables Needed (13)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `wms_zones` | Logical zones: receiving, quarantine, MRB, bonded/ITAR, raw, WIP, FG, shipping |
| 2 | `wms_storage_bins` | Physical bin addresses (aisle-bay-level-position) with capacity/weight limits |
| 3 | `wms_bin_contents` | Current quant in each bin (material + lot + serial + qty + status) |
| 4 | `wms_transfer_orders` | Move instructions: from-bin to-bin with reason code, priority |
| 5 | `wms_transfer_order_lines` | Line-level items in a transfer order |
| 6 | `wms_putaway_rules` | Rules engine: material-group X goes to zone Y, FIFO/FEFO/LIFO strategy |
| 7 | `wms_pick_lists` | Aggregated pick lists for job-kit, shipment, or wave |
| 8 | `wms_pick_list_lines` | Line-level picks with suggested bin, actual bin, picked qty |
| 9 | `wms_wave_plans` | Wave grouping: combine multiple SO/job-kits into one warehouse pass |
| 10 | `wms_cycle_count_plans` | ABC cycle-count schedules by zone or value class |
| 11 | `wms_cycle_count_results` | Count results with variance, adjusted qty, approval |
| 12 | `wms_quarantine_holds` | Material holds: reason (incoming-reject, shelf-life, ITAR-review), release authority |
| 13 | `wms_material_handling_units` | Pallet/container/tote tracking with nested hierarchy |

### Key Columns per Table

**wms_storage_bins:** `bin_id, zone_id, warehouse_id, aisle, bay, level, position, barcode, max_weight_kg, max_volume_m3, bin_type (rack|floor|cantilever), is_active, temperature_controlled`

**wms_bin_contents:** `content_id, bin_id, item_id, lot_id, serial_id, qty_on_hand, qty_allocated, uom, status (available|allocated|blocked|QC-hold), last_count_date`

**wms_transfer_orders:** `to_id, from_bin_id, to_bin_id, reason (putaway|pick|replenish|reclass|quarantine), priority, status (open|in_progress|confirmed), requested_by, confirmed_by, confirmed_at`

**wms_putaway_rules:** `rule_id, item_group, material_type, preferred_zone_id, strategy (FIFO|FEFO|closest_empty|same_lot), max_stack_height, requires_itar_zone, priority_order`

**wms_cycle_count_results:** `count_id, plan_id, bin_id, item_id, system_qty, counted_qty, variance_qty, variance_pct, adjuster_id, adjustment_posted, approved_by`

### Why Critical for CNC Aerospace

- AS9100 clause 8.5.4 requires preservation and identification of material at every storage point
- ITAR materials must be physically segregated in controlled-access zones
- Aerospace lot traceability demands bin-level genealogy (which bin held which heat-lot)
- Material shelf-life control (sealants, adhesives, coatings) requires FEFO enforcement
- Quarantine zones for incoming-inspection hold, MRB disposition, customer-return isolation

---

## GAP AREA C: Multi-Currency & International Trade

**Priority: HIGH for Vietnam-based CNC exporter**

The current finance module (4 tables in `015_finance.sql`) likely handles basic GL/AP/AR. A Vietnam-based manufacturer exporting to US/EU aerospace primes needs multi-currency, withholding tax, and customs/duty management.

### Tables Needed (11)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `fin_currencies` | Master list of active currencies (VND, USD, EUR, JPY, etc.) |
| 2 | `fin_exchange_rates` | Daily/period exchange rates with rate type (spot, budget, closing) |
| 3 | `fin_exchange_rate_types` | Rate type definitions (spot, contract, budget, revaluation) |
| 4 | `fin_multi_book_ledgers` | Parallel ledgers: local GAAP (VND), group reporting (USD), tax book |
| 5 | `fin_withholding_tax_codes` | WHT codes per country/vendor-type with rates and thresholds |
| 6 | `fin_customs_declarations` | Import/export customs entries with HS codes, duty amounts |
| 7 | `fin_customs_tariff_codes` | HS/HTS tariff code master with duty rates per country |
| 8 | `fin_letters_of_credit` | LC management: issuing bank, beneficiary, terms, draws, amendments |
| 9 | `fin_lc_draw_requests` | Draw-down requests against an LC with document set |
| 10 | `fin_realized_fx_gains` | Realized foreign-exchange gain/loss journal entries |
| 11 | `fin_country_tax_profiles` | Per-country tax rules: VAT rates, registration thresholds, filing periods |

### Key Columns per Table

**fin_exchange_rates:** `rate_id, from_currency, to_currency, rate_type_id, effective_date, rate, inverse_rate, source (central_bank|manual|API), locked`

**fin_multi_book_ledgers:** `ledger_id, ledger_name, currency_code, accounting_standard (VAS|IFRS|US_GAAP), is_primary, consolidation_entity, fiscal_year_start`

**fin_customs_declarations:** `declaration_id, direction (import|export), customs_office, declaration_number, hs_code, origin_country, destination_country, declared_value, duty_amount, vat_amount, status (draft|submitted|cleared|held), broker_id`

**fin_letters_of_credit:** `lc_id, lc_number, issuing_bank, advising_bank, beneficiary_id, currency, amount, expiry_date, latest_ship_date, tolerance_pct, status (draft|issued|amended|drawn|expired), linked_so_id`

### Why Critical for CNC Aerospace

- Vietnam manufacturers invoice in USD but pay local costs in VND -- FX exposure is constant
- Aerospace primes require LC/bank-guarantee for large tooling orders
- US ITAR exports require Export Control Classification Numbers (ECCN) linked to customs declarations
- Withholding tax on royalties/technical service fees paid to foreign tooling vendors
- Multi-book accounting mandatory: Vietnamese Accounting Standards (VAS) locally + IFRS for foreign parent/investor reporting

---

## GAP AREA D: Human Capital Management (HCM)

**Priority: HIGH for aerospace compliance**

Current portal has `013_training_hr.sql` (4 tables). AS9100/NADCAP require far more: operator qualification matrices, re-certification tracking, competency-based authorization.

### Tables Needed (14)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `hcm_employees` | Full employee master beyond basic user table (hire date, department, position, status) |
| 2 | `hcm_positions` | Position catalog with required skills, grade, reporting-to |
| 3 | `hcm_org_units` | Organizational hierarchy (company > division > department > section > team) |
| 4 | `hcm_skills_catalog` | Master list of skills/competencies (5-axis programming, CMM operation, NDT Level II) |
| 5 | `hcm_employee_skills` | Employee-skill matrix with proficiency level, assessed date, assessor |
| 6 | `hcm_certifications` | Certification types (NADCAP weld, FAA A&P, CNC operator Level 3, forklift) |
| 7 | `hcm_employee_certifications` | Employee cert instances with issue date, expiry, renewal-required flag |
| 8 | `hcm_qualification_requirements` | Operation/process X requires certification Y at level Z |
| 9 | `hcm_attendance_records` | Clock-in/out, overtime, leave records |
| 10 | `hcm_leave_balances` | Accrued/used/remaining leave by type (annual, sick, training) |
| 11 | `hcm_payroll_periods` | Payroll period definitions (monthly, bi-weekly) |
| 12 | `hcm_payroll_runs` | Payroll run header with gross/net/deductions/taxes per period |
| 13 | `hcm_payroll_lines` | Employee-level pay lines: base, overtime, allowances, deductions |
| 14 | `hcm_disciplinary_actions` | Disciplinary/corrective actions with evidence, linked to quality events |

### Key Columns per Table

**hcm_employee_skills:** `employee_skill_id, employee_id, skill_id, proficiency_level (1-5), assessed_by, assessed_date, next_assessment_due, evidence_doc_id, is_current`

**hcm_employee_certifications:** `emp_cert_id, employee_id, cert_id, cert_number, issued_date, expiry_date, issuing_body, status (active|expired|suspended|revoked), renewal_training_id, scanned_cert_doc_id`

**hcm_qualification_requirements:** `req_id, entity_type (operation|work_center|process), entity_id, cert_id, min_proficiency, is_mandatory, override_auth_level, itar_required`

**hcm_attendance_records:** `attendance_id, employee_id, date, clock_in, clock_out, shift_id, hours_regular, hours_overtime, status (present|absent|leave|travel), approved_by`

### Why Critical for CNC Aerospace

- AS9100 clause 7.2 requires demonstrated competence for personnel affecting product quality
- NADCAP special processes (heat treat, NDT, welding) require named-operator qualification with periodic renewal
- ITAR requires citizenship/residency verification before access to controlled technical data
- Operator qualification matrix is audited by every aerospace customer (Boeing D6-82479, Airbus AQSF)
- Payroll integration needed for accurate labor-cost allocation to job orders

---

## GAP AREA E: Plant Maintenance / CMMS

**Priority: CRITICAL for CNC job shop**

Current portal has `012_calibration_equipment.sql` (5 tables) covering calibration. Plant maintenance goes far beyond: preventive/predictive maintenance, spare parts management, failure analysis, condition monitoring. SAP PM uses EQUI, IFLOT, AUFK, AFIH, MPLA.

### Tables Needed (15)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `pm_equipment_master` | Extended equipment record: serial, model, manufacturer, install date, criticality class |
| 2 | `pm_functional_locations` | Location hierarchy: plant > building > bay > machine-position |
| 3 | `pm_maintenance_plans` | Preventive maintenance plan definitions (time-based, counter-based, condition-based) |
| 4 | `pm_maintenance_plan_items` | Task lists within a PM plan (lubricate, inspect, replace belt, verify alignment) |
| 5 | `pm_work_orders` | Maintenance work orders (PM, corrective, emergency, project) |
| 6 | `pm_work_order_operations` | Operations within a maintenance WO with labor/parts/instructions |
| 7 | `pm_work_order_parts` | Spare parts consumed per maintenance WO |
| 8 | `pm_spare_parts_inventory` | Spare parts stock with min/max/reorder levels per equipment class |
| 9 | `pm_failure_codes` | Hierarchical failure code catalog: object > problem > cause > remedy (SAP pattern) |
| 10 | `pm_failure_history` | Failure events linked to equipment with failure code, downtime minutes, cost |
| 11 | `pm_condition_monitoring` | Sensor readings: vibration, temperature, spindle load, coolant pressure |
| 12 | `pm_condition_thresholds` | Alert thresholds per sensor/equipment triggering PM work orders |
| 13 | `pm_equipment_counters` | Runtime counters: spindle hours, cycle count, axis travel distance |
| 14 | `pm_reliability_metrics` | Calculated MTBF, MTTR, OEE per equipment over rolling periods |
| 15 | `pm_maintenance_budgets` | Annual/monthly maintenance budget vs actual per cost center/equipment class |

### Key Columns per Table

**pm_equipment_master:** `equipment_id, equipment_number, description, serial_number, manufacturer, model, install_date, warranty_expiry, criticality (A|B|C), functional_location_id, cost_center, status (active|inactive|decommissioned), replacement_value, image_url`

**pm_work_orders:** `wo_id, wo_number, wo_type (preventive|corrective|emergency|project|calibration), equipment_id, priority (1-5), status (planned|released|in_progress|completed|cancelled), requested_by, assigned_to, planned_start, planned_end, actual_start, actual_end, downtime_minutes, total_cost`

**pm_failure_codes:** `code_id, parent_code_id, level (object|problem|cause|remedy), code, description, equipment_class, is_active`

**pm_condition_monitoring:** `reading_id, equipment_id, sensor_type (vibration|temperature|spindle_load|coolant_pressure|power_draw), value, unit, timestamp, is_alarm, threshold_id`

**pm_reliability_metrics:** `metric_id, equipment_id, period_start, period_end, mtbf_hours, mttr_hours, oee_pct, availability_pct, failure_count, planned_downtime_hours, unplanned_downtime_hours`

### Why Critical for CNC Aerospace

- 5-axis CNC machines cost $500K-$2M each; unplanned downtime is catastrophic to throughput
- Spindle bearing failures, ball-screw wear, and axis backlash must be predicted via condition monitoring
- AS9100 clause 7.1.3 requires infrastructure maintenance; auditors check PM completion rates
- NADCAP heat-treat requires furnace PM records (thermocouple replacement, uniformity surveys)
- Spare parts for aerospace-grade machines have 8-16 week lead times; proactive inventory is mandatory
- OEE tracking (availability x performance x quality) is the primary KPI for CNC shop management

---

## GAP AREA F: Project Management

**Priority: MEDIUM for CNC job shop (HIGH if NPI-heavy)**

Current portal has `018_projects_kpi.sql` (6 tables). World-class ERP (SAP PS, IFS Projects) includes full WBS, earned value, resource leveling, and milestone billing.

### Tables Needed (10)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `prj_projects` | Project header: NPI program, tooling project, facility expansion, customer development |
| 2 | `prj_wbs_elements` | Work Breakdown Structure hierarchy (phase > work-package > activity) |
| 3 | `prj_milestones` | Key milestones with planned/actual dates, deliverables, customer gate reviews |
| 4 | `prj_resource_assignments` | People/machines assigned to WBS elements with planned hours |
| 5 | `prj_time_entries` | Actual time booked against WBS elements |
| 6 | `prj_cost_collections` | Actual costs collected per WBS (labor, material, subcontract, overhead) |
| 7 | `prj_earned_value_snapshots` | EVM data: PV, EV, AC, SPI, CPI per WBS per period |
| 8 | `prj_risks` | Project risks with probability, impact, mitigation, owner |
| 9 | `prj_change_requests` | Scope/schedule/budget change requests with approval workflow |
| 10 | `prj_milestone_billing` | Billing milestones tied to customer payment terms (PPAP gate, FAI approval, etc.) |

### Key Columns per Table

**prj_wbs_elements:** `wbs_id, project_id, parent_wbs_id, wbs_code, description, level, planned_start, planned_end, actual_start, actual_end, budget_hours, budget_cost, status (planned|active|complete|cancelled), responsible_id`

**prj_earned_value_snapshots:** `snapshot_id, wbs_id, period_date, planned_value, earned_value, actual_cost, schedule_variance, cost_variance, spi, cpi, eac, etc_remaining`

**prj_milestone_billing:** `billing_id, project_id, milestone_id, customer_id, invoice_amount, currency, billing_trigger (milestone_complete|date|gate_approval), invoice_id, status (pending|invoiced|paid)`

### Why Critical for CNC Aerospace

- New Part Introduction (NPI) projects span 6-18 months with APQP gates; need WBS tracking
- Customer programs (e.g., Boeing 787 nacelle bracket) require earned-value reporting
- Tooling/fixture development projects need budget tracking and milestone billing
- Facility/equipment expansion projects need project controls

---

## GAP AREA G: Customer Relationship Management (CRM)

**Priority: MEDIUM for CNC job shop**

The current portal has basic `customers` and `customer_sites` but no sales pipeline management. Epicor Kinetic includes a CRM module with leads, opportunities, and quoting integration.

### Tables Needed (10)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `crm_leads` | Inbound leads: trade-show contacts, RFQ inquiries, website forms |
| 2 | `crm_contacts` | Contact persons at customer/prospect companies (buyer, engineer, quality) |
| 3 | `crm_opportunities` | Sales opportunities with stage, value, probability, close date |
| 4 | `crm_opportunity_stages` | Pipeline stages: prospect > qualified > RFQ > quoted > negotiation > won/lost |
| 5 | `crm_activities` | Activities: calls, emails, meetings, site visits linked to contact/opportunity |
| 6 | `crm_campaigns` | Marketing campaigns: trade shows, email blasts, customer events |
| 7 | `crm_campaign_responses` | Responses/leads generated per campaign for ROI tracking |
| 8 | `crm_competitor_intel` | Competitor information per opportunity (competitor name, strengths, price intel) |
| 9 | `crm_customer_scorecards` | Customer health score: on-time delivery, quality PPM, revenue trend, relationship |
| 10 | `crm_territory_assignments` | Sales territory / account manager assignments |

### Key Columns per Table

**crm_opportunities:** `opp_id, customer_id, contact_id, stage_id, description, estimated_annual_revenue, estimated_margin_pct, probability_pct, expected_close_date, source (RFQ|referral|trade_show), owner_id, linked_quote_id, won_lost_reason`

**crm_activities:** `activity_id, activity_type (call|email|meeting|visit|task), contact_id, opportunity_id, subject, notes, scheduled_at, completed_at, assigned_to, follow_up_date`

### Why Critical for CNC Aerospace

- Aerospace sales cycles are 6-24 months; pipeline visibility is essential
- RFQ-to-quote conversion tracking feeds capacity planning
- Customer relationship health (delivery, quality, responsiveness) determines program awards
- Trade-show ROI and lead-source analysis drive marketing spend

---

## GAP AREA H: Transportation & Logistics (TMS)

**Priority: MEDIUM for CNC job shop (HIGH if direct export)**

Current portal has `016_shipping_compliance.sql` (4 tables). A full TMS manages carriers, freight rates, customs documentation, and shipment tracking.

### Tables Needed (10)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `tms_carriers` | Carrier master: DHL, FedEx, Maersk, local truckers with service levels |
| 2 | `tms_carrier_rates` | Contract/spot freight rates per lane (origin-destination-service-weight) |
| 3 | `tms_shipments` | Shipment header: SO linkage, carrier, tracking, ship date, delivery date |
| 4 | `tms_shipment_packages` | Package-level: weight, dimensions, contents, HU reference |
| 5 | `tms_tracking_events` | Tracking milestones: picked-up, in-transit, customs-hold, delivered |
| 6 | `tms_customs_documents` | Export/import documents: commercial invoice, packing list, CoO, AES/EEI |
| 7 | `tms_freight_invoices` | Carrier invoices for freight audit and payment |
| 8 | `tms_freight_claims` | Damage/loss claims against carriers |
| 9 | `tms_dangerous_goods` | DG declarations for chemicals/coatings/adhesives shipments |
| 10 | `tms_incoterms` | Incoterms master (FOB, CIF, DDP, EXW) linked to customer/PO defaults |

### Key Columns per Table

**tms_shipments:** `shipment_id, so_id, carrier_id, service_level, origin_warehouse_id, destination_address_id, ship_date, estimated_delivery, actual_delivery, tracking_number, freight_cost, incoterm, status (planned|shipped|in_transit|delivered|exception)`

**tms_customs_documents:** `doc_id, shipment_id, doc_type (commercial_invoice|packing_list|certificate_of_origin|AES_filing|ITAR_license), doc_number, issue_date, filed_with, status, document_url`

### Why Critical for CNC Aerospace

- ITAR-controlled parts require export licenses and AES filings before shipment
- Aerospace parts are high-value, low-weight; freight cost optimization matters less than compliance
- Customs delays on imported raw material (titanium, Inconel) directly impact production schedules
- Certificate of Origin required for duty-free treatment under trade agreements

---

## GAP AREA I: Product Lifecycle Management (PLM)

**Priority: HIGH for CNC aerospace**

The current portal has item_revisions and some change-related fields. Full PLM covers engineering change management (ECN/ECO), requirements traceability, and test plan management -- core to AS9100 design control.

### Tables Needed (12)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `plm_change_requests` | Engineering Change Request (ECR): problem statement, proposed solution, impact analysis |
| 2 | `plm_change_orders` | Engineering Change Order (ECO/ECN): approved changes with effectivity dates |
| 3 | `plm_change_order_lines` | Affected items/documents per ECO with disposition (use-as-is, rework, scrap) |
| 4 | `plm_change_review_board` | Change Review Board (CRB/CCB) membership and voting records |
| 5 | `plm_product_configurations` | Product configuration variants (customer-specific options, serial effectivity) |
| 6 | `plm_requirements` | Customer/regulatory requirements linked to product features |
| 7 | `plm_requirement_traces` | Traceability matrix: requirement --> design feature --> test case --> evidence |
| 8 | `plm_test_plans` | Test/validation plans with acceptance criteria |
| 9 | `plm_test_results` | Test execution results linked to test plans and serial/lot |
| 10 | `plm_design_reviews` | Design review records (PDR, CDR) with action items and decisions |
| 11 | `plm_deviation_permits` | Concession/deviation permits: use non-conforming material with customer approval |
| 12 | `plm_obsolescence_tracking` | Component obsolescence monitoring and last-time-buy decisions |

### Key Columns per Table

**plm_change_orders:** `eco_id, eco_number, ecr_id, title, description, change_type (design|process|material|document), priority (critical|major|minor), effectivity_type (date|serial|lot), effectivity_value, status (draft|review|approved|implemented|closed), approved_by, approved_date, customer_notification_required`

**plm_change_order_lines:** `line_id, eco_id, affected_entity_type (item|bom|routing|drawing|spec), affected_entity_id, old_revision, new_revision, disposition (use_as_is|rework|scrap|return), wip_impact_assessment, inventory_impact_qty`

**plm_requirement_traces:** `trace_id, requirement_id, design_feature_id, verification_method (test|analysis|inspection|demo), test_plan_id, test_result_id, status (open|verified|failed), verified_by`

**plm_deviation_permits:** `permit_id, ncr_id, item_id, deviation_type (concession|waiver|engineering_use_as_is), customer_approval_required, customer_approval_ref, qty_affected, serial_range, expiry_date, approved_by`

### Why Critical for CNC Aerospace

- AS9100 clause 8.3 (Design and Development) requires full change control with customer notification
- Boeing D6-82479 and Airbus AQSF audit engineering change management rigorously
- Configuration management per AS9100 clause 8.1.2 requires serial/lot effectivity tracking
- Deviation/concession permits are daily reality in CNC aerospace (out-of-tolerance features)
- Obsolescence management critical for long-lifecycle aerospace programs (20-40 year aircraft life)
- Requirements traceability matrix is a PPAP/APQP deliverable

---

## GAP AREA J: Business Intelligence / Data Warehouse

**Priority: MEDIUM (HIGH if customer dashboards required)**

The current portal has KPI tables in `018_projects_kpi.sql`. A proper BI layer uses dimensional modeling (star schema) with fact and dimension tables, ETL tracking, and KPI snapshots.

### Tables Needed (12)

| # | Table Name | Purpose |
|---|-----------|---------|
| 1 | `bi_dim_date` | Date dimension: day, week, month, quarter, year, fiscal period, is_workday |
| 2 | `bi_dim_customer` | Customer dimension: slowly-changing with industry, tier, region |
| 3 | `bi_dim_item` | Item/product dimension: commodity group, material type, make/buy |
| 4 | `bi_dim_work_center` | Work center dimension: department, machine type, cost rate |
| 5 | `bi_dim_employee` | Employee dimension: role, department, skill level, shift |
| 6 | `bi_fact_production` | Production fact: job-op, qty good/scrap, hours, cost by date/machine/operator |
| 7 | `bi_fact_quality` | Quality fact: inspection results, NCR count, DPMO, PPM by date/item/customer |
| 8 | `bi_fact_delivery` | Delivery fact: promised vs actual ship date, OTIF, backlog by customer/item |
| 9 | `bi_fact_financial` | Financial fact: revenue, cost, margin by customer/item/period |
| 10 | `bi_etl_run_log` | ETL execution log: source, start, end, rows extracted/loaded, errors |
| 11 | `bi_kpi_definitions` | KPI catalog: name, formula, target, unit, frequency, owner |
| 12 | `bi_kpi_snapshots` | Periodic KPI values: actual vs target with trend direction |

### Key Columns per Table

**bi_fact_production:** `fact_id, date_key, work_center_key, employee_key, item_key, job_id, operation_seq, qty_produced, qty_scrapped, qty_reworked, setup_hours, run_hours, labor_cost, material_cost, overhead_cost`

**bi_fact_quality:** `fact_id, date_key, item_key, customer_key, inspection_type, qty_inspected, qty_accepted, qty_rejected, ncr_count, capa_count, dpmo, first_pass_yield_pct`

**bi_kpi_snapshots:** `snapshot_id, kpi_id, period_date, actual_value, target_value, prior_period_value, trend (improving|declining|stable), status (green|yellow|red), notes`

**bi_etl_run_log:** `run_id, etl_job_name, source_table, target_table, started_at, completed_at, rows_extracted, rows_loaded, rows_rejected, status (success|warning|failed), error_message`

### Why Critical for CNC Aerospace

- Aerospace customers (Boeing, Airbus, Safran) require supplier scorecards: OTD, PPM, DPMO
- Customer portal dashboards need pre-aggregated data (not real-time OLTP queries)
- Management needs OEE, throughput, backlog, and margin dashboards refreshed daily
- AS9100 clause 9.1 requires analysis and evaluation of data -- BI layer enables this systematically
- ETL tracking ensures data integrity for audit-grade reporting

---

## PRIORITY SUMMARY

| Gap Area | Priority | Est. Tables | Rationale |
|----------|----------|-------------|-----------|
| A. APS (Advanced Planning & Scheduling) | CRITICAL | 12 | Bottleneck scheduling drives throughput in job shops |
| E. Plant Maintenance / CMMS | CRITICAL | 15 | $500K-$2M machines require predictive maintenance |
| B. WMS (Warehouse Management) | HIGH | 13 | AS9100 traceability + ITAR zone segregation |
| C. Multi-Currency & International Trade | HIGH | 11 | Vietnam exporter: VND/USD dual-book, customs, LC |
| D. HCM (Human Capital Management) | HIGH | 14 | Operator qualification matrix required by every audit |
| I. PLM (Product Lifecycle Management) | HIGH | 12 | Engineering change control is core AS9100 requirement |
| F. Project Management | MEDIUM | 10 | NPI programs need WBS and earned-value tracking |
| G. CRM | MEDIUM | 10 | Long sales cycles need pipeline visibility |
| H. TMS (Transportation & Logistics) | MEDIUM | 10 | ITAR export compliance, customs document management |
| J. BI / Data Warehouse | MEDIUM | 12 | Customer scorecards, management dashboards, audit data |

**Total new tables across all gap areas: ~119**

This would bring the portal from 229 to approximately 348 tables, which aligns with a mid-tier manufacturing ERP. For reference:
- SAP S/4HANA Manufacturing: 800+ active tables across PP/QM/PM/MM/SD/FI/CO/PS/HCM
- Epicor Kinetic: 400-500 tables for discrete manufacturing
- IFS Cloud: 600+ tables across ERP/EAM/FSM

---

## IMPLEMENTATION ROADMAP

### Phase 1 -- Immediate (enables production optimization)
- **E. Plant Maintenance / CMMS** (15 tables) -- machine uptime is revenue
- **A. APS** (12 tables) -- finite scheduling eliminates bottleneck guessing

### Phase 2 -- Near-term (enables compliance depth)
- **I. PLM** (12 tables) -- engineering change control for AS9100
- **D. HCM** (14 tables) -- operator qualification matrix for NADCAP
- **B. WMS** (13 tables) -- bin-level traceability for audits

### Phase 3 -- Growth enablers
- **C. Multi-Currency** (11 tables) -- international trade expansion
- **H. TMS** (10 tables) -- export compliance automation
- **F. Project Management** (10 tables) -- NPI program controls

### Phase 4 -- Strategic advantage
- **G. CRM** (10 tables) -- sales pipeline management
- **J. BI / Data Warehouse** (12 tables) -- customer scorecard dashboards

---

## SOURCES

- [SAP S/4HANA MM Tables](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-members/general-tables-useful-in-the-sap-s4hana-module-mm/ba-p/13974210)
- [SAP PP Order Tables](https://unogeeks.com/sap-pp-order-tables/)
- [SAP Production Order Tables (AUFK, AFVC, AFFL, AFRU)](https://sap4tech.net/sap-production-order-tables/)
- [SAP QM Tables Overview](https://www.scribd.com/document/396008962/Sap-Qm-Tables)
- [SAP QM Tables (QALS, QAVE)](https://www.tcodesearch.com/sap-tables/QALS)
- [SAP PM Tables Overview](https://www.scribd.com/document/454944718/USEFUL-TABLES-IN-SAP-PM)
- [SAP WM Tables](https://marchukan.com/sap-wm-tables/)
- [SAP HCM PA Tables](https://saphrcompendium.wordpress.com/functional/general-studies/pa-tables/)
- [Epicor ERP Database Table Overview](https://www.scribd.com/document/410847183/Epicor-Table-ERP)
- [Epicor Kinetic Schema CHM](https://www.epiusers.help/t/download-epicor-10-2-kinetic-chm-schema/49603)
- [IFS ERP Modules List](https://www.astracanyon.com/blog/ifs-erp-modules-list)
- [IFS Cloud Modules (Novacura)](https://www.novacura.com/ifs-modules/)
- [IFS Database Tables/Schema](https://community.ifs.com/insights-business-reporter-and-analysis-models-eoi-51/list-of-tables-and-schema-of-ifs-erp-database-34845)
- [CRM Database Schema](https://www.dragonflydb.io/databases/schema/crm)
- [APS Overview (Siemens)](https://www.sw.siemens.com/en-US/technology/advanced-planning-scheduling-aps/)
- [WMS Bin & Zone Topology](https://sgsystemsglobal.com/glossary/warehouse-locations-bin-zone-topology/)
- [Data Warehouse Star Schema for ERP](https://ecosire.com/blog/data-warehouse-star-schema-erp)
- [Aerospace ERP Requirements (ProShop)](https://proshoperp.com/industries/aerospace/)
- [Aerospace ERP AS9100/ITAR/NADCAP (PowerShop)](https://powershoperp.com/blog/best-aerospace-erp-software-2025)
- [ERP + QMS Integration (advancedmanufacturing.org)](https://www.advancedmanufacturing.org/industries/aerospace-defense/breaking-down-a-d-barriers-with-an-integrated-erp-qms/article_cf093ac6-b23d-4b7b-8f61-12add900c0e4.html)
- [Multi-Currency ERP (Dynamics GP)](https://learn.microsoft.com/en-us/dynamics-gp/financials/multicurrencymanagement)
- [TMS Features (Freightify)](https://freightify.com/blog/tms-features)
