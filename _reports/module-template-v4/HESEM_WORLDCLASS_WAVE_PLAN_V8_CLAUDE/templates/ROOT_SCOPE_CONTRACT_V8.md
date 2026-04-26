# Root Scope Contract — Template V8

```yaml
# fill in for each root per V8 file 11

root_identity:
  code: <ROOT_CODE>             # e.g., NQCASE
  name: <human-readable name>
  domain: <D-NN>                 # e.g., D-07
  authority_class: <authoritative | projection | dependency | platform | vertical>
  resource_family: <kebab-case>  # e.g., nq-cases
  route_canonical: /ops/records/<resource_family>/{record_id}
  api_family: /api/v1/<resource_family>
  baseline_maturity: <0-7>
  target_maturity: <0-7>
  target_wave: <W0..W14>
  vertical_only: <null | pharma | automotive | aerospace | med_device | food>
  gxp_eligible: <true | false>
  retention_class: <standard | gxp_long_term | permanent | privacy_subject | gxp_batch_pharma | cmmc_cui>
  owner_role: <e.g., Quality Lead>
  reviewer_role: <e.g., Compliance Lead>

intended_use:
  - <one-paragraph statement of intended use>
  - <data subjects + business activities + jurisdictions>

out_of_scope:
  - <explicit out-of-scope uses>
  - <forbidden uses (prevents creep)>

forbidden_uses:
  - <forbidden_use_1>
  - <forbidden_use_2>

authority:
  authoritative_source_table: <e.g., nqcase>
  projection_surfaces:
    - <e.g., nq-case-inbox WS>
    - <e.g., quality-trend-board derived_read_model>
  mutation_owner: <e.g., NQCASE state machine commands only via Command Bus>
  forbidden_mutation_surfaces:
    - <e.g., {surface_class: WS, resource_family: nq-case-inbox, reason: "projection only"}>

state_machine:
  reference: <data/workflow_state_machines_v8.json#sm4_nc>
  states: [...]
  transitions:
    - id: nqcase.open
      from: draft
      to: open
      guards: [...]
      obligations: [...]
      emits: [...]

authority_ledger_entry:
  reference: data/authority_ledger_seed_v8.json#NQCASE
  signed_by: <platform-lead>

contracts:
  screen_contract: <mom/templates/module-template-v4/<root>/*.html>
  api_contract: <mom/contracts/openapi/<domain>/<root>.openapi.yaml>
  event_contract: <mom/contracts/events/<root>.events.yaml>
  evidence_contract: <_reports/.../EVIDENCE_CONTRACT.md>
  data_contract: <_reports/.../DATA_CONTRACT.md (if applicable)>

cross_root_dependencies:
  references: data/cross_root_deps_v8.json filter by subject=ROOT_CODE
  hard_fk: [...]
  soft_ref: [...]
  workflow_trigger: [...]
  evidence_input: [...]

tests:
  static:    [node --check, JSON parse, forbidden diff, no fixture in portal]
  e2e:       [Playwright spec list with mandatory scenarios]
  contract:  [openapi-spec-validator, contract-diff]
  negative:  [BOLA, cross-tenant, replay, version conflict]
  rollback:  [feature flag revert, data rollback, evidence chain integrity]

stop_rules:
  - <e.g., axiom A* violation → SEV-N>
  - <e.g., RULE-2 violation → SEV-0>
  - <e.g., audit chain break → SEV-1>

risks:
  top3:
    - id: R-V8-NNN
      mitigation: <reference>
    - ...

approval:
  user_phrase_required: <"Proceed with NQCASE Stage 2 live-API graduation">
  approval_chain: [Domain Lead, Platform Lead, Compliance Lead]
  sla_hours: 168
```
