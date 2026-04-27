# C11 — Finance

**Version:** V10 Deep Upgrade  
**Prompt source:** S2-06_C10_C11_WORKFORCE_FINANCE  
**Supersedes:** V9 C11_FINANCE.md  

---

## 1. Domain Purpose and Boundaries

C11 owns the financial perspective of manufacturing operations. HESEM is not a financial system of record — the customer's primary ERP (SAP FI/CO, Oracle Financials, NetSuite, Dynamics 365 Finance) holds that authority. C11's scope is: the operational costs incurred in production, the valuation of in-process and on-hand inventory, cost variances that signal process problems, and the Cost of Poor Quality (COPQ) that connects the quality domain to financial consequences.

C11 posts GL transactions to the customer's primary financial system rather than maintaining its own general ledger. The posting interface is the integration boundary; HESEM is the source of the manufacturing cost data.

**Domain boundaries:**

| Boundary | C11 owns | C11 consumes | C11 produces |
|---|---|---|---|
| Upstream | — | WO completions + labor hours from C6; Material consumption from C5; PO receipt costs from C4; NC/CAPA/scrap events from C7 | — |
| Downstream | — | — | GL postings to customer's primary financial system; COPQ reports to C7 management review; Inventory valuation to balance sheet integration; Variance reports to operations management |
| Excluded | Accounts payable, accounts receivable, payroll, tax filing — those stay in the customer's primary financial system | — | — |

---

## 2. Resource Families

**Cost Center**

| Field | Type | Notes |
|---|---|---|
| cost_center_id | UUID PK | |
| cost_center_code | VARCHAR(20) | mapped to customer's external financial system code |
| cost_center_name | VARCHAR(100) | |
| site_id | UUID FK | |
| type | ENUM | production, quality, maintenance, overhead, admin |
| gl_cost_center_ref | VARCHAR(30) | customer's GL cost center code (SAP, Oracle, etc.) |
| budget_period | VARCHAR(10) | YYYY or YYYY-MM |
| budget_amount | DECIMAL(18,2) | |
| currency | VARCHAR(3) | ISO 4217 |
| active | BOOLEAN | |
| parent_cost_center_id | UUID FK | nullable — for hierarchy |

**GL Account**

| Field | Type | Notes |
|---|---|---|
| gl_account_id | UUID PK | |
| account_code | VARCHAR(20) | |
| account_name | VARCHAR(100) | |
| account_type | ENUM | inventory_asset, wip_asset, cogs, labor_expense, overhead_expense, variance, copq |
| normal_balance | ENUM | debit, credit |
| external_account_ref | VARCHAR(30) | customer's chart of accounts code |
| currency | VARCHAR(3) | |
| active | BOOLEAN | |

**GL Posting**

| Field | Type | Notes |
|---|---|---|
| gl_posting_id | UUID PK | |
| posting_date | DATE | |
| period | VARCHAR(7) | YYYY-MM |
| document_type | ENUM | inventory_receipt, consumption, labor, overhead_allocation, wip_adjustment, variance_settlement, cogs_recognition, scrap_write_off |
| reference_id | UUID | source transaction (wo_id, stock_move_id, etc.) |
| reference_type | VARCHAR(40) | |
| debit_account_id | UUID FK | |
| credit_account_id | UUID FK | |
| amount | DECIMAL(18,4) | |
| currency | VARCHAR(3) | |
| exchange_rate | DECIMAL(14,8) | to functional currency |
| functional_amount | DECIMAL(18,4) | |
| cost_center_id | UUID FK | |
| description | VARCHAR(200) | |
| status | ENUM | draft, posted, reversed |
| reversed_by | UUID FK | nullable |
| reversal_reason | TEXT | |
| external_posting_ref | VARCHAR(60) | reference returned by target GL system |
| posted_to_external_at | TIMESTAMPTZ | |

**Standard Cost**

| Field | Type | Notes |
|---|---|---|
| std_cost_id | UUID PK | |
| item_id | UUID FK | |
| bom_revision_id | UUID FK | |
| routing_id | UUID FK | |
| effective_from | DATE | |
| effective_to | DATE | nullable |
| material_cost | DECIMAL(18,6) | per unit of measure |
| labor_cost | DECIMAL(18,6) | per unit — from routing labor hours × labor rate |
| machine_cost | DECIMAL(18,6) | per unit — from routing machine hours × machine rate |
| overhead_cost | DECIMAL(18,6) | per unit — from overhead absorption rate × base |
| total_cost | DECIMAL(18,6) | computed sum |
| currency | VARCHAR(3) | |
| cost_roll_id | UUID FK | which cost roll generated this |
| approved_by | UUID FK | |
| approved_at | TIMESTAMPTZ | |

**Cost Roll**

| Field | Type | Notes |
|---|---|---|
| cost_roll_id | UUID PK | |
| roll_name | VARCHAR(60) | e.g. "FY2026 Standard Cost Roll" |
| effective_from | DATE | |
| site_id | UUID FK | |
| status | ENUM | in_progress, simulated, approved, active, superseded |
| items_rolled | INTEGER | |
| approved_by | UUID FK | |
| approved_at | TIMESTAMPTZ | |
| simulation_variance_summary | JSONB | preview of cost changes before activation |

**Actual Cost**

| Field | Type | Notes |
|---|---|---|
| actual_cost_id | UUID PK | |
| wo_id | UUID FK | |
| period | VARCHAR(7) | YYYY-MM |
| material_cost_actual | DECIMAL(18,6) | sum of all component lots consumed × lot actual cost |
| labor_cost_actual | DECIMAL(18,6) | sum of labor_hours × person labor rate |
| machine_cost_actual | DECIMAL(18,6) | sum of machine_hours × equipment run rate |
| overhead_cost_actual | DECIMAL(18,6) | absorbed based on actual base (labor or machine hours) |
| total_cost_actual | DECIMAL(18,6) | |
| total_cost_standard | DECIMAL(18,6) | from std_cost at WO creation |
| total_variance | DECIMAL(18,6) | actual − standard |
| currency | VARCHAR(3) | |
| status | ENUM | in_progress, closed |
| closed_at | TIMESTAMPTZ | |

**WIP Cost**

| Field | Type | Notes |
|---|---|---|
| wip_cost_id | UUID PK | |
| wo_id | UUID FK | |
| snapshot_at | TIMESTAMPTZ | |
| operations_completed | INTEGER | |
| operations_total | INTEGER | |
| completion_pct | DECIMAL(5,2) | |
| material_cost_to_date | DECIMAL(18,6) | |
| labor_cost_to_date | DECIMAL(18,6) | |
| machine_cost_to_date | DECIMAL(18,6) | |
| overhead_to_date | DECIMAL(18,6) | |
| wip_balance | DECIMAL(18,6) | total cost incurred for in-progress WO |
| currency | VARCHAR(3) | |

**Variance**

| Field | Type | Notes |
|---|---|---|
| variance_id | UUID PK | |
| wo_id | UUID FK | |
| period | VARCHAR(7) | |
| variance_type | ENUM | material_price, material_usage, labor_rate, labor_efficiency, machine_rate, machine_efficiency, overhead_absorption, scrap |
| standard_value | DECIMAL(18,6) | |
| actual_value | DECIMAL(18,6) | |
| variance_amount | DECIMAL(18,6) | actual − standard (unfavorable = positive for cost) |
| variance_pct | DECIMAL(8,4) | |
| item_id | UUID FK | |
| cost_center_id | UUID FK | |
| currency | VARCHAR(3) | |

**Inventory Valuation**

| Field | Type | Notes |
|---|---|---|
| inv_val_id | UUID PK | |
| item_id | UUID FK | |
| lot_id | UUID FK | nullable — lot-level for FIFO/LIFO |
| valuation_date | DATE | |
| valuation_method | ENUM | fifo, lifo, weighted_average, standard_cost |
| on_hand_qty | DECIMAL(18,6) | |
| unit_cost | DECIMAL(18,6) | |
| total_value | DECIMAL(18,6) | |
| currency | VARCHAR(3) | |
| cost_layer_date | DATE | nullable — for FIFO/LIFO layer tracking |

**COPQ — Cost of Poor Quality**

| Field | Type | Notes |
|---|---|---|
| copq_id | UUID PK | |
| period | VARCHAR(7) | YYYY-MM |
| site_id | UUID FK | |
| cost_center_id | UUID FK | |
| copq_category | ENUM | internal_failure, external_failure, appraisal, prevention |
| cost_element | ENUM | scrap, rework, reinspection, warranty_return, complaint_resolution, audit_labor, capa_labor, inspection_labor, calibration_cost, training_cost |
| source_record_type | VARCHAR(40) | e.g. 'yield_record', 'nc', 'capa', 'inspection' |
| source_record_id | UUID | |
| amount | DECIMAL(18,4) | |
| currency | VARCHAR(3) | |
| labor_hours | DECIMAL(10,4) | nullable |
| labor_rate | DECIMAL(14,4) | |

**Tax / Sales-Tax Record**

| Field | Type | Notes |
|---|---|---|
| tax_record_id | UUID PK | |
| transaction_id | UUID | SO or PO line |
| transaction_type | ENUM | sale, purchase |
| jurisdiction | VARCHAR(60) | country / state / province |
| tax_code | VARCHAR(20) | |
| taxable_amount | DECIMAL(18,4) | |
| tax_rate | DECIMAL(8,6) | |
| tax_amount | DECIMAL(18,4) | |
| currency | VARCHAR(3) | |
| tax_authority_ref | VARCHAR(60) | |
| transaction_date | DATE | |

**Currency Conversion Record**

| Field | Type | Notes |
|---|---|---|
| fx_rate_id | UUID PK | |
| from_currency | VARCHAR(3) | |
| to_currency | VARCHAR(3) | |
| rate_date | DATE | |
| rate_type | ENUM | spot, period_average, budget, closing |
| rate | DECIMAL(14,8) | |
| source | VARCHAR(60) | e.g. ECB, Bloomberg, manual |

**Withholding Tax Record**

| Field | Type | Notes |
|---|---|---|
| wht_record_id | UUID PK | |
| vendor_id | UUID FK | |
| jurisdiction | VARCHAR(60) | |
| payment_date | DATE | |
| gross_amount | DECIMAL(18,4) | |
| withholding_rate | DECIMAL(8,6) | |
| withheld_amount | DECIMAL(18,4) | |
| certificate_number | VARCHAR(40) | |
| currency | VARCHAR(3) | |

---

## 3. Capabilities

### CAP-C11-01 — Cost Center Master Lifecycle

Cost Centers are the organizational unit for cost accumulation. They map 1:1 to external GL cost center codes in the customer's financial system. The hierarchy supports parent-child rollups for plant-level and enterprise-level reporting. Cost center budgets are entered per period and compared against actual costs in the variance dashboard. Creating, modifying, or deactivating a cost center requires Finance Lead authorization; deactivating a cost center with open WOs blocks the deactivation until those WOs are closed and costs settled.

### CAP-C11-02 — Standard Cost Authoring and Effectivity

Standard costs are authored at the item-revision × BOM revision × routing level. Cost components:

- **Material cost:** rolled up from the BOM by recursively summing child item standard costs × required quantities, including scrap factor. If a child item has no approved standard cost, the roll fails with an itemized list of missing costs.
- **Labor cost:** routing operations × standard labor hours × labor rate per skill/work center. Labor rates are defined per work center and skill combination, updated annually.
- **Machine cost:** routing operations × standard machine hours × machine run rate per equipment class.
- **Overhead cost:** absorbed using the cost center's absorption base (labor hours, machine hours, or material cost) × overhead rate. Rates are set per cost center per period.

The Cost Roll process simulates the impact of all pending BOM/routing changes before activation. The simulation produces a variance summary comparing new vs. current standard costs across all affected items. Finance Lead reviews and approves the simulation; activation sets effective_from on all new Standard Cost records and effective_to on the prior version. Historical standard costs are retained for variance analysis against actual costs incurred in prior periods.

### CAP-C11-03 — Actual Cost Capture per WO

Actual costs accumulate on the WO as production events occur:

- **Material consumption:** at each WO operation, consumed lots are valued at their received cost (for purchased material) or at the child WO's actual cost (for internally produced sub-assemblies). FIFO/LIFO/weighted-average cost layer selection follows the inventory valuation method configured for the site.
- **Labor:** WO operation labor hours × the hourly labor rate for the operator's job grade and site. Labor hours are pulled from C6 WO Operation actual_labor_hrs.
- **Machine:** WO operation machine hours × machine run rate for the equipment.
- **Overhead:** absorbed at the WO operation level based on the cost center's absorption rate × the operation's actual base (labor or machine hours, per configuration).

When the WO is completed, the Actual Cost record is closed, total_cost_actual is finalized, and the variance against total_cost_standard is computed. GL postings are generated for: debit WIP (material, labor, overhead as incurred), credit Inventory when WO closes (completed goods at actual cost), and variance accounts.

### CAP-C11-04 — WIP Cost Roll

WIP balance is computed from open WOs at any point in time. The WIP snapshot captures: cost incurred to date (material consumed + labor logged + machine hours + overhead absorbed) vs. total expected cost (standard cost × planned qty). WIP is reported on the balance sheet integration as a current asset. The system produces a WIP aging report showing WOs by age and dollar balance, flagging WOs open > 30 days as potential cost recognition issues.

Period-end WIP roll: at period close, the system takes a point-in-time WIP snapshot for all open WOs, posts a WIP balance to the GL, and records the snapshot for subsequent comparison to the next period's WIP balance (to compute the WIP change for the P&L).

### CAP-C11-05 — Variance Analysis (Price, Usage, Rate, Efficiency)

Variances are computed per WO per cost element at WO close:

| Variance Type | Formula | Signal |
|---|---|---|
| Material price | (actual_unit_cost − standard_unit_cost) × actual_qty | Supplier price drift or emergency sourcing |
| Material usage | (actual_qty − standard_qty) × standard_unit_cost | Scrap, process yield loss, overissue |
| Labor rate | (actual_rate − standard_rate) × actual_hours | Overtime, skill mix change |
| Labor efficiency | (actual_hours − standard_hours) × standard_rate | Machine downtime, operator speed, setup time overrun |
| Machine rate | (actual_machine_rate − standard_machine_rate) × actual_hours | Equipment rental change, maintenance cost allocation shift |
| Machine efficiency | (actual_machine_hours − standard_machine_hours) × standard_rate | Unplanned downtime, cycle time creep |
| Overhead absorption | actual_base × standard_OH_rate − actual_OH_incurred | Volume vs. budget mismatch |
| Scrap | scrap_qty × standard_cost | Process instability, NC-driven scrap |

Variances are posted to specific GL variance accounts per type. The variance dashboard shows top-10 unfavorable variances by dollar amount for the period, with drill-down to the contributing WOs and operations. Variance root cause is linked to C7 CAPA when a variance exceeds the threshold configured per variance type per cost center (e.g., material usage variance > 5% of standard triggers CAPA flag).

### CAP-C11-06 — Inventory Valuation (FIFO, LIFO, Weighted Average, Standard)

Inventory is valued per the method configured for each site and item category. Methods:

- **Standard cost:** on-hand qty × current approved standard cost. Simple and most common for manufactured items.
- **Weighted average:** inventory value ÷ on-hand qty, recalculated on every receipt. Best for commodities with volatile prices.
- **FIFO:** cost layers maintained per lot receipt date; consumption pulls from oldest layer first. Complies with IAS 2 / ASC 330.
- **LIFO:** available for US GAAP customers only (prohibited under IFRS). Cost layers maintained; consumption pulls from newest layer.

The inventory valuation report is produced at period end and reconciled to the GL Inventory Asset account. Discrepancies between physical inventory (C5) and financial valuation trigger an investigation flag. Lower of cost or NRV (Net Realizable Value) write-downs are supported for slow-moving or obsolete inventory identified by the C5 inventory aging report.

### CAP-C11-07 — COPQ Reporting (per H8 + per D6 Cycle)

COPQ is aggregated per period per site across four categories per the ASQ/Juran framework:

- **Internal failure costs:** scrap (material cost + labor cost of scrapped WO operations), rework (cost of rework WOs), reinspection labor after rework, NC investigation labor
- **External failure costs:** customer complaint resolution labor, warranty returns (return processing + replacement cost), field recall costs
- **Appraisal costs:** inspection labor (IQC + IPC + FQC), calibration costs, MSA study costs, audit labor
- **Prevention costs:** training labor, CAPA preventive action implementation, FMEA development, process validation labor

Each COPQ record traces to a source record (yield_record for scrap, nc_id for rework, inspection_id for appraisal). COPQ as a percentage of COGS is the primary quality financial KPI reported to management review. The COPQ trend report feeds the C7 APR (J1 Pharma), PSUR (J4 MD), and management review inputs across all packs.

CAPA cost tracking: each CAPA records the labor hours invested in investigation and implementation; these are captured as `prevention cost` elements in COPQ, allowing calculation of the cost of CAPA investment vs. the cost of the original failure.

### CAP-C11-08 — GL Posting and Audit Trail (per H4 EC-22)

All GL postings are immutable once posted. Corrections are made by reversal + re-posting, not by modifying the original record. The audit trail captures: who posted, when, what the source transaction was, what GL accounts were debited/credited, and the reference number from the receiving financial system. For Sarbanes-Oxley (SOX) compliant customers, the posting audit trail is part of the internal controls evidence package.

GL postings are transmitted to the customer's financial system via the configured channel:
- **SAP:** IDoc or RFC posting (BO49/BO50 document types)
- **Oracle:** FBDI import file or REST API (Journal Import)
- **NetSuite:** SuiteTalk REST (JournalEntry object)
- **Dynamics 365:** OData General Journal Lines API
- **File export:** CSV/XML per customer format, SFTP delivery

Failed postings (network error, validation rejection by target system) are queued for retry with exponential backoff. A posting that fails 5 times triggers an alert to the Finance Lead with the target system's error response included. A period-end reconciliation report (`GET /api/v1/finance/gl-reconciliation?period=YYYY-MM`) shows all HESEM-side postings and their external system acknowledgment status, highlighting any gaps.

Currency conversion applies exchange rates from the Currency Conversion Record for all non-functional-currency transactions. Rate type selection (spot, period average, budget) is configurable per document type.

---

## 4. Posting Events Reference

Every operational event that has a financial consequence generates one or more GL Posting records automatically:

| Operational Event | Debit | Credit |
|---|---|---|
| PO receipt (purchased material) | Inventory Asset | Goods Receipt / Invoice Receipt (GRIR) |
| PO invoice match | GRIR | Accounts Payable |
| Material consumed in WO | WIP Material | Inventory Asset |
| Labor recorded on WO | WIP Labor | Labor Clearing |
| WO completion (goods receipt) | Finished Goods Inventory | WIP (material + labor + OH) |
| WO variance (unfavorable usage) | Material Usage Variance | WIP |
| Scrap write-off | Scrap Expense | Inventory Asset or WIP |
| SO shipment (COGS recognition) | Cost of Goods Sold | Finished Goods Inventory |
| NC rework cost | Rework Expense (COPQ) | Labor Clearing |
| Inventory adjustment (cycle count) | Inventory Adjustment | Inventory Asset (or reverse) |
| Period-end WIP balance | WIP Asset (balance sheet) | WIP clearing (P&L) |

---

## 5. Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| GL posting rejected by target system | External_posting_ref not received; error response captured | Retry queue; Finance Lead alert; manual investigation of target system error code |
| Standard cost missing at WO creation | Cost roll validation check | WO creation blocked with itemized missing-cost list; Finance Lead must add missing standard costs |
| WIP balance discrepancy at period end | GL reconciliation report shows gap | Audit trail review per posting; identify missing posting event; re-run affected transaction |
| Currency rate not available for posting date | FX rate lookup returns no record | Alert to Finance Lead; system uses last known rate with warning flag on posting; Finance Lead updates rate and triggers re-valuation |
| COPQ source record deleted (data cleanup attempt) | COPQ record has dangling reference | COPQ source records are protected from deletion while referenced; any delete attempt returns 409 |

---

## 6. Standards

| Standard | Clause | Capability |
|---|---|---|
| IFRS (IAS 2) | Inventory valuation — FIFO, weighted avg; prohibits LIFO | CAP-C11-06 |
| US GAAP (ASC 330) | Inventory — FIFO, LIFO, weighted avg | CAP-C11-06 |
| Sarbanes-Oxley | §404 Internal controls over financial reporting | CAP-C11-08 |
| ISO 9001:2015 | §10 Improvement — quality cost | CAP-C11-07 |
| ASQ COPQ Framework | Prevention / Appraisal / Internal / External failure | CAP-C11-07 |
| SAP IDoc standards | BO49/BO50 FI document types | CAP-C11-08 |

---

## 7. Cross-References

| Domain | Reference |
|---|---|
| C2 Product Engineering | Standard cost authored per BOM/Routing revision; ECO changes trigger cost roll |
| C4 Procurement | PO receipt cost feeds actual material cost; invoice matching generates GL postings |
| C5 Inventory | On-hand quantities × unit cost = inventory valuation; cycle count adjustments post to GL |
| C6 Shopfloor | WO labor hours and machine hours drive actual cost; yield/scrap events post variance |
| C7 Quality | NC/CAPA/scrap events generate COPQ records; COPQ trends feed management review |
| C1 Commercial | SO shipment triggers COGS recognition posting; invoice generation cross-ref |

---

*Decision phrase: S2-06_C10_C11_WORKFORCE_FINANCE_DEEP_UPGRADE_COMPLETE*
