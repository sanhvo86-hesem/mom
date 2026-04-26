# Customer Onboarding Plan — Template V8

```yaml
customer:
  tenant_id: <UUID>
  organization: <legal name>
  industry: <pharma | auto | aero | med_device | food | other>
  vertical_pack: <pack name or none>
  region: <US-East | EU-West | AP-Tokyo | etc.>
  jurisdiction: <USA | EU | JP | KR | VN | ...>
  tier: <Core | Pro | Enterprise>
  user_count: <int>
  expected_arr_usd: <int>
  signed_contract_date: <ISO>
  csm: <name@hesem.io>
  implementation_lead: <name@hesem.io>

phases (per V8 file 28):
  P1_discovery:
    duration_wk: <int>
    output: SoW + selected tier + vertical pack
    gate: signed SoW
    status: <not_started | in_progress | done>
  P2_validation_scoping (regulated only):
    duration_wk: <int>
    output: URS + risk assessment + validation plan
    gate: validation plan signed
    status: ...
  P3_tenant_provisioning:
    duration_wk: <int>
    output: tenant created + IAM + SSO config
    gate: IQ executed PASS
    status: ...
  P4_master_data_migration:
    duration_wk: <int>
    output: ITEM/CUST/SUP/EQP/MDEV/USER/ROLE imported
    gate: master_data_migration_report PASS
    status: ...
  P5_configuration:
    duration_wk: <int>
    output: workflows + documents + users trained
    gate: OQ per slice PASS
    status: ...
  P6_pilot_operation:
    duration_wk: <int>
    output: pilot batches/transactions in production-equivalent
    gate: PQ observation period started
    status: ...
  P7_pre_production_cutover:
    duration_wk: <int>
    output: training compliance 100% + on-call established
    gate: customer signs pre-production cutover
    status: ...
  P8_steady_state:
    duration: ongoing
    output: SLA monitoring + QBRs

milestones:
  - <milestone>: <ISO date>: <status>

risks_per_customer:
  - id: RC-V8-NNN
    description: <one-line>
    mitigation: <plan>

approvals:
  - phase: P3
    customer_signer: <name>
    hesem_signer: <name>
    signed_at: <ISO>

post_p7_metrics:
  csat_target: >= 0.85
  nps_target: >= 50
  sla_breach_count_first_90d_target: 0
  time_to_first_value_days_target: <30 Core; 90 Pro; 180 Ent>
```
