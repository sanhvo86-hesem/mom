# 18 — V8 Approval Workflow

```text
purpose:        Specify approval authority + SLA + audit that V7 leaves implicit
predecessor:    V7 §28 prompt library mentions "explicit approval" without defining what
v8_advance:     Approval-record schema + per-decision authority chain + SLA + audit
work_package:   WP-V8-APPR (1 work package)
owner:          Program Manager + Compliance Lead
estimate:       1.5 engineering-weeks
```

---

## 1. Approval-record schema

```json
{
  "$id":"https://hesem.io/schemas/approval_record_v8.json",
  "type":"object",
  "required":["approval_id","decision_type","subject_kind","subject_ref","requested_by","requested_at","authority_chain","sla_hours","status"],
  "properties":{
    "approval_id":{"type":"string","format":"uuid"},
    "decision_type":{"enum":[
      "slice_planning_start","slice_implementation_start","stage2_live_api_graduation",
      "stage3_mutation_graduation","ot_write_path_enablement","forbidden_diff_exception",
      "vertical_pack_enablement","ai_advisory_enablement","tenant_onboarding",
      "release_authority","conflict_resolution_adr","emergency_change","red_team_finding_block_lift"]},
    "subject_kind":{"enum":["slice","root","mutation_surface","tenant","feature_flag","wave_gate","release","adr"]},
    "subject_ref":{"type":"string"},
    "requested_by":{"type":"string","format":"email"},
    "requested_at":{"type":"string","format":"date-time"},
    "authority_chain":{
      "type":"array",
      "items":{"type":"object",
        "required":["role","status"],
        "properties":{
          "role":{"type":"string"},
          "principal_id":{"type":"string","format":"uuid"},
          "status":{"enum":["pending","approved","rejected","abstained"]},
          "decided_at":{"type":"string","format":"date-time"},
          "rationale":{"type":"string","maxLength":2000},
          "signature":{"type":"string"}
        }}},
    "sla_hours":{"type":"integer"},
    "expires_at":{"type":"string","format":"date-time"},
    "status":{"enum":["pending","approved","rejected","expired","withdrawn"]},
    "user_approval_phrase":{"type":"string","description":"the literal phrase per V3 RULE-8"}
  }
}
```

---

## 2. Decision-type authority chain table

```csv
decision_type,minimum_signers,roles,sla_hours,user_phrase_required
slice_planning_start,1,[Domain Lead],24,no
slice_implementation_start,2,[Domain Lead, Platform Lead],48,"Proceed with <slice> implementation"
stage2_live_api_graduation,2,[Domain Lead, Platform Lead],72,"Proceed with <slice> Stage 2 live-API graduation"
stage3_mutation_graduation,3,[Domain Lead, Platform Lead, Compliance Lead],168,"Proceed with <slice> Stage 3 controlled mutation per ADR-NNNN"
ot_write_path_enablement,3,[Domain Lead, Security Lead, Plant Manager],168,"Enable OT write for <equipment> at <site> per ADR-NNNN"
forbidden_diff_exception,3,[Platform Lead, Security Lead, Affected Domain Lead],48,"Exception ADR-NNNN allows modification of <forbidden_path>"
vertical_pack_enablement,2,[Vertical Pack Lead, Compliance Lead],168,"Enable <pack> for <tenant>"
ai_advisory_enablement,2,[AI Lead, Compliance Lead],168,"Enable AI advisory <feature_id> for <tenant>"
tenant_onboarding,2,[CS Lead, Implementation Lead],168,"Onboard tenant <tenant_id>"
release_authority,3,[Engineering Lead, QA Lead, Release Manager],48,"Release v<semver> authority signed"
conflict_resolution_adr,3,[Compliance Lead, Security Lead, Legal],168,"ADR-V8-XSTD-NNNN ratified"
emergency_change,2,[On-call SRE, On-call Engineering Lead],4,no (post-action ADR required within 7d)
red_team_finding_block_lift,2,[Security Lead, AI Lead],168,"Lift block on <finding_id> per ADR-NNNN"
```

---

## 3. Approval middleware

```yaml
endpoint: POST /api/v1/approvals
behavior:
  - validate decision_type against table
  - generate approval_id + SLA timer
  - notify all required signers via email + Slack
  - publish to OTG as audit_event with class='approval_request'
  
endpoint: POST /api/v1/approvals/{id}:sign
behavior:
  - signer authenticates with step-up (TOTP)
  - signature stored in authority_chain
  - if all required signers approved → status='approved'; emit OTG audit_event with class='approval_granted'
  - if any rejected → status='rejected'; emit audit_event class='approval_rejected'
  - if SLA expired → status='expired'; auto-escalate

dashboard: /admin/approvals (per-tenant + system-level)
```

---

## 4. Audit chain integration

Every approval grant/reject is an OTG audit_event with hash-chain extension. Approvals for regulated decisions (Stage 3 mutation, OT write, vertical pack, release) carry `evidence_class='signature'` and WORM retention permanent.

---

## 5. Decision phrase

```text
V8_APPROVAL_WORKFLOW_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-APPR-1
NEXT_FILE: 19_V8_AI_AUTHORITY_BOUNDARY.md
```
