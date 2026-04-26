# Audit Pack — Template V8

```yaml
audit_pack:
  pack_id: APACK-<TENANT>-<YYYYMMDD>-<regulator>
  tenant_id: <UUID>
  regulator: FDA | EMA | IATF | NADCAP | SOC2 | ISO27001 | customer | self_audit
  scope:
    period: { start: <ISO>, end: <ISO> }
    record_id_range: <list>
    domains: [<D-NN>]
    vertical_pack: <pharma | auto | aero | med_device | food | none>
  generated_at: <ISO 8601>
  generated_by: <principal>
  expires_at: <ISO 8601, +24h default>
  watermark: { inspector: <name>, organization: <org>, license: <license_id> }

contents_index:
  - VMP_validation_master_plan: <link>
  - IQ_records: [<period>]
  - OQ_records_per_slice: [<period>]
  - PQ_records_continuous: [<period>]
  - audit_trail_sampled_records: [<record_id_list>]
  - genealogy_traversal: [<root_id>]
  - change_control_history_ECO: [<eco_id_list>]
  - training_records: [<user_id_list>]
  - risk_assessment_per_module: [<module_id>]
  - incident_log: [<incident_id_list>]
  - periodic_review_records: [<review_id_list>]
  - access_control_list_snapshot: <ISO date>
  - backup_restore_evidence: <link>
  - dr_drill_records_recent: [<drill_id_list>]
  - penetration_test_report_recent: <link>

per_pharma:
  - 24mo_batch_records: [<batch_id>]
  - 24mo_deviations: [<dev_id>]
  - 24mo_complaints: [<comp_id>]
  - 24mo_recalls: [<recall_id>]
  - 3y_APRs: [<apr_year>]
  - stability_program_summary: <link>
  - DSCSA_event_log: <link>

per_auto:
  - PPAP_submissions: [<ppap_id>]
  - LPA_records_recent: <link>
  - special_process_certs: [<cqi>]
  - WARRANTY_CLAIM_recent: <link>
  - APQP_phase_history: [<apqp_id>]

per_aero:
  - AS9102_FAI_records: [<fai_id>]
  - NADCAP_cert_chain: <link>
  - COUNTERFEIT_CHECK_log: <link>
  - ITAR_compliance_attestation: <link>
  - DO_178C_SCI_records: [<sci_id>]

manifest:
  artifact_index_json: <link>
  total_size_bytes: <int>
  artifact_count: <int>
  sha256_each: <yes>

signing:
  bundle_sha256: <hex>
  bundle_signature_ed25519: <hex>
  signed_by: <platform-key-id>
  rfc_3161_timestamp: <if applicable>

distribution:
  customer_portal_link: <signed URL>
  email_notification: <to inspector>
  audit_event_otg: <event_id>
```
