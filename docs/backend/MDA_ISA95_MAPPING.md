# MDA ISA-95 Mapping

Decision scope: pre-production runtime-closure candidate.

| Governed root | ISA-95 object | Owner | Command owner | Event owner |
|---|---|---|---|---|
| item | Material | master_data | DomainCommandGateway | domain_outbox_events |
| item_revision | MaterialDefinition | engineering | DomainCommandGateway | domain_outbox_events |
| engineering_release_package | WorkDefinition | engineering | DomainCommandGateway | domain_outbox_events |
| party | PersonnelOrPartner | master_data | DomainCommandGateway | domain_outbox_events |
| supplier | Partner | supplier_quality | DomainCommandGateway | domain_outbox_events |
| customer | Partner | commercial | DomainCommandGateway | domain_outbox_events |
| organization | EnterpriseSiteArea | master_data | DomainCommandGateway | domain_outbox_events |
| shift_calendar | WorkSchedule | production_control | DomainCommandGateway | domain_outbox_events |
| equipment | Equipment | maintenance | DomainCommandGateway | domain_outbox_events |
| tooling | EquipmentAsset | tooling | DomainCommandGateway | domain_outbox_events |
| gage | TestEquipment | quality | DomainCommandGateway | domain_outbox_events |
| quality_hold | QualityTestSpecification | quality | DomainCommandGateway | domain_outbox_events |
| ncr | QualityTestResult | quality | DomainCommandGateway | domain_outbox_events |
| mrb | QualityDisposition | quality | DomainCommandGateway | domain_outbox_events |
| capa | CorrectiveAction | quality | DomainCommandGateway | domain_outbox_events |
| complaint | QualityComplaint | quality | DomainCommandGateway | domain_outbox_events |
| scar | SupplierQualityAction | supplier_quality | DomainCommandGateway | domain_outbox_events |
| inventory_period | MaterialAccounting | inventory | DomainCommandGateway | domain_outbox_events |
| lot | MaterialLot | inventory | DomainCommandGateway | domain_outbox_events |
| serial | MaterialSublot | inventory | DomainCommandGateway | domain_outbox_events |
| container | MaterialContainer | warehouse | DomainCommandGateway | domain_outbox_events |
| work_order | WorkRequest | production_control | DomainCommandGateway | domain_outbox_events |
| sales_order | WorkScheduleDemand | commercial | DomainCommandGateway | domain_outbox_events |
| job_order | WorkOrder | production_control | DomainCommandGateway | domain_outbox_events |
