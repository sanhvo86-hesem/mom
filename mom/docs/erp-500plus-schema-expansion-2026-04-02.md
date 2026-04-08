# ERP 500+ Schema Expansion

**Date:** 2026-04-02

This note extends `erp-gap-analysis-world-class-2026-04-02.md` from a 348-table target to a `500+` manufacturing ERP target by adding `23` new migrations (`046`-`068`) and `289` new tables. The migration set now reaches `518` tables in total.

## Result

- Baseline before this wave: `229` tables
- Added in migrations `046`-`055`: `119` tables
- Added in migrations `056`-`068`: `170` tables
- New total across migrations: `518` tables

## New Migration Waves

### Wave 1: Complete the original ERP gap analysis

- `046_plant_maintenance_cmms.sql` - 15 tables
- `047_advanced_planning_scheduling.sql` - 12 tables
- `048_plm_change_control.sql` - 12 tables
- `049_hcm_workforce_management.sql` - 14 tables
- `050_wms_extended_warehouse.sql` - 13 tables
- `051_finance_trade_multicurrency.sql` - 11 tables
- `052_project_system_earned_value.sql` - 10 tables
- `053_crm_pipeline_management.sql` - 10 tables
- `054_transportation_management.sql` - 10 tables
- `055_bi_data_warehouse.sql` - 12 tables

### Wave 2: Go beyond 500 tables with SAP/Epicor-style breadth

- `056_supplier_relationship_management.sql` - 14 tables
- `057_tooling_lifecycle_management.sql` - 14 tables
- `058_sop_demand_supply_planning.sql` - 12 tables
- `059_service_warranty_management.sql` - 12 tables
- `060_finance_treasury_assets.sql` - 12 tables
- `061_quality_lab_compliance.sql` - 16 tables
- `062_ehs_sustainability_management.sql` - 16 tables
- `063_manufacturing_engineering_industrialization.sql` - 14 tables
- `064_master_data_governance.sql` - 12 tables
- `065_commercial_contract_pricing.sql` - 12 tables
- `066_traceability_serialization.sql` - 12 tables
- `067_outsource_supplier_execution.sql` - 12 tables
- `068_trade_compliance_advanced.sql` - 12 tables

## Benchmark Anchors

The added domains were chosen to align HESEM with the breadth seen in world-class manufacturing platforms rather than only a QMS-plus-partial-ERP footprint.

- SAP S/4HANA Cloud manufacturing and supply chain scope:
  [SAP S/4HANA Cloud Manufacturing Supply Chain PDF](https://assets.dm.ux.sap.com/desapusergroupsknowledgetransfer/2019/pdfs/19_06_05_1905_shc_manufacturing_supply_chain.pdf)
- SAP IBP planning model coverage for S&OP / demand / supply:
  [SAP IBP Planning Model Template PDF](https://help.sap.com/doc/13d8ead8d99e478ba7644a9fc8f838e7/2002/en-US/IBP_2002_for_Cross_Topics_SAPIBP1_Planning_Model_Template.pdf)
- Epicor Kinetic manufacturing breadth including APS and maintenance:
  [Epicor ERP for Manufacturing Overview](https://www.epicor.com/AutoRedirect/downloadFile?fileID=40df6766-3e94-4e2e-baa6-addbc8119363&pageUrl=https%3A%2F%2Fwww.epicor.com%2Fvi-vn%2Fresources%2Flibrary%2Fmanufacturing%2Fbrochure-epicor-erp-for-manufacturing-overview%2F)
- Epicor ecosystem breadth including WMS and field service direction:
  [Epicor SMB ERP Technology Value Matrix](https://www.epicor.com/AutoRedirect/downloadFile?fileID=c1b9424d-ed8e-4d64-9fe6-b7ccbd754900&pageUrl=https%3A%2F%2Fwww.epicor.com%2Fen-us%2Fresources%2Flibrary%2Fmanufacturing%2Freport-nucleus-research-smb-erp-technology-value-matrix%2F)

## Coverage Direction

After these migrations, HESEM now has schema foundations for:

- Core ERP + QMS + MES
- CMMS / EAM
- APS / finite scheduling
- PLM / ECR / ECO / requirement traceability
- WMS / bin-level control / handling units
- HCM / payroll / qualifications
- Multi-currency / customs / trade finance
- Project system / earned value management
- CRM / pipeline / forecasting
- TMS / freight audit / export screening
- BI / data warehouse
- SRM / sourcing / supplier collaboration
- Tooling, presets, regrind, fixture lifecycle
- S&OP / replenishment / buffer planning
- Service / warranty / installed base
- Treasury / budgets / fixed assets
- Advanced quality lab / audit / obligation evidence
- EHS / waste / emissions / sustainability
- Manufacturing engineering / standard work / calendars
- MDM / stewardship / numbering
- Commercial pricing / rebates / contracts
- Deep traceability / travelers / label governance
- Outsource execution / recovery / supplier chargebacks
- Advanced trade compliance / ECCN / screening / drawbacks

## Operational Notes

- `database/migrate.sh` was updated to auto-discover zero-padded SQL migrations instead of stopping at the original 24-file list.
- `database/migrations/README.md` was updated to reflect the expanded migration landscape and 500+ target.
- `database/schema.sql` remains an older snapshot; for deployment, the migration directory is now the authoritative execution path.
