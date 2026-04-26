# 04 — V8 Authority Ledger Normative Model

```text
purpose:        Bind V7 §07 Authority Ledger prose to executable SQL DDL + 11 invariants
predecessor:    V7 §07 (V7_AUTHORITY_LEDGER_AND_OPERATIONAL_TRUTH_GRAPH_V3.md)
v8_advance:     Postgres DDL + JSON Schema + 11 axioms + 5 materialized views + RLS policy
work_package:   WP-V8-LEDGER (3 work packages)
owner:          Platform Lead + Security Lead
estimate:       4 engineering-weeks
```

---

## 1. Concept (V7 carry-forward)

V7 §07: "Authority Ledger answers who is allowed to change what, where, with which guard. OTG answers why this record has this state, with what evidence, related to which root."

V8 reaffirms the separation of concerns and binds it.

---

## 2. Postgres DDL (normative)

```sql
-- mom/database/migrations/250_authority_ledger_v8.sql

CREATE TABLE authority_ledger_v8 (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_code                   TEXT NOT NULL,
  resource_family             TEXT NOT NULL,
  authority_class             TEXT NOT NULL CHECK (authority_class IN
                                ('authoritative','projection','dependency','platform','vertical')),
  allowed_commands            JSONB NOT NULL DEFAULT '[]'::jsonb,
                              -- e.g. ["NQCASE_OPEN","NQCASE_DISPOSE","NQCASE_CLOSE"]
  forbidden_surfaces          JSONB NOT NULL DEFAULT '[]'::jsonb,
                              -- e.g. [{"surface_class":"WS","resource_family":"NQCASE_INBOX"}]
  guard_requirements          JSONB NOT NULL,
                              -- {policy:[],workflow:[],evidence:[],e_sign:{...},data:[]}
  audit_requirements          JSONB NOT NULL,
                              -- {before:bool, after:bool, actor:bool, reason:bool, timestamp:bool, correlation:bool}
  rollback_model              TEXT NOT NULL CHECK (rollback_model IN
                                ('compensating_command','revert','no_reversal','custom')),
  rollback_definition_uri     TEXT,
                              -- e.g. data/sagas/<command_id>.yaml
  maturity_level              SMALLINT NOT NULL DEFAULT 0 CHECK (maturity_level BETWEEN 0 AND 7),
  validation_scope            TEXT NOT NULL CHECK (validation_scope IN
                                ('regulated_gxp','regulated_iatf','regulated_as9100',
                                 'regulated_itar','regulated_med_device','regulated_food','non_regulated')),
  intended_use                TEXT NOT NULL,
  out_of_scope                TEXT,
  forbidden_uses              JSONB NOT NULL DEFAULT '[]'::jsonb,
  tenant_id                   UUID,                  -- NULL = system-level entry
  effective_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at               TIMESTAMPTZ,
  superseded_by_id            UUID REFERENCES authority_ledger_v8(id),
  signed_by                   TEXT NOT NULL,         -- e.g. 'platform-lead@hesem.io'
  signature                   BYTEA NOT NULL,        -- ed25519 signature over canonical JSON
  signature_algo              TEXT NOT NULL DEFAULT 'ed25519',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  UUID NOT NULL,
  metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT al_v8_root_unique
    UNIQUE (root_code, resource_family, authority_class, tenant_id, effective_at)
);

CREATE INDEX al_v8_root_idx ON authority_ledger_v8 (root_code);
CREATE INDEX al_v8_resource_family_idx ON authority_ledger_v8 (resource_family);
CREATE INDEX al_v8_authority_class_idx ON authority_ledger_v8 (authority_class);
CREATE INDEX al_v8_tenant_idx ON authority_ledger_v8 (tenant_id);
CREATE INDEX al_v8_active_idx ON authority_ledger_v8 (root_code, resource_family)
  WHERE superseded_at IS NULL;
CREATE INDEX al_v8_metadata_idx ON authority_ledger_v8 USING gin (metadata);
CREATE INDEX al_v8_allowed_commands_idx ON authority_ledger_v8 USING gin (allowed_commands);
CREATE INDEX al_v8_forbidden_surfaces_idx ON authority_ledger_v8 USING gin (forbidden_surfaces);

-- Row-level security
ALTER TABLE authority_ledger_v8 ENABLE ROW LEVEL SECURITY;
CREATE POLICY al_v8_tenant_iso ON authority_ledger_v8
  USING (tenant_id IS NULL OR
         tenant_id = current_setting('app.tenant_id', true)::uuid OR
         current_setting('app.tenant_id', true) = 'hesem-system');

-- Materialized view: active ledger entries (for runtime lookups)
CREATE MATERIALIZED VIEW mv_authority_ledger_active AS
SELECT *
FROM authority_ledger_v8
WHERE superseded_at IS NULL;

CREATE UNIQUE INDEX mv_al_active_pk
  ON mv_authority_ledger_active (root_code, resource_family, authority_class, tenant_id);

-- Refresh trigger: refresh on every insert/update via NOTIFY/LISTEN to async refresher
```

---

## 3. JSON Schema (canonical)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hesem.io/schemas/authority_ledger_v8.json",
  "title": "AuthorityLedgerEntry",
  "type": "object",
  "required": [
    "root_code","resource_family","authority_class","allowed_commands",
    "forbidden_surfaces","guard_requirements","audit_requirements",
    "rollback_model","maturity_level","validation_scope","intended_use","signed_by"
  ],
  "properties": {
    "root_code": {"type":"string","pattern":"^[A-Z][A-Z0-9_-]{1,15}$"},
    "resource_family": {"type":"string","pattern":"^[a-z][a-z0-9-]{1,40}$"},
    "authority_class": {"enum":["authoritative","projection","dependency","platform","vertical"]},
    "allowed_commands": {
      "type":"array",
      "items": {"type":"string","pattern":"^[A-Z][A-Z0-9_]+_[A-Z][A-Z0-9_]+$"}
    },
    "forbidden_surfaces": {
      "type":"array",
      "items": {
        "type":"object",
        "required":["surface_class","resource_family"],
        "properties":{
          "surface_class": {"enum":["WS","SH","DL","ML","AC","AR","ERD","NRD","SFW"]},
          "resource_family": {"type":"string"},
          "reason": {"type":"string"}
        }
      }
    },
    "guard_requirements": {
      "type":"object",
      "properties":{
        "policy":   {"type":"array","items":{"$ref":"#/$defs/policy_predicate"}},
        "workflow": {"type":"array","items":{"$ref":"#/$defs/workflow_predicate"}},
        "evidence": {"type":"array","items":{"$ref":"#/$defs/evidence_predicate"}},
        "e_sign":   {"$ref":"#/$defs/e_sign_predicate"},
        "data":     {"type":"array","items":{"$ref":"#/$defs/data_predicate"}}
      }
    },
    "audit_requirements": {
      "type":"object",
      "properties":{
        "before":      {"type":"boolean","default":true},
        "after":       {"type":"boolean","default":true},
        "actor":       {"type":"boolean","default":true},
        "reason":      {"type":"boolean","default":true},
        "timestamp":   {"type":"boolean","default":true},
        "correlation": {"type":"boolean","default":true}
      }
    },
    "rollback_model": {"enum":["compensating_command","revert","no_reversal","custom"]},
    "rollback_definition_uri": {"type":"string","format":"uri"},
    "maturity_level": {"type":"integer","minimum":0,"maximum":7},
    "validation_scope": {
      "enum":["regulated_gxp","regulated_iatf","regulated_as9100","regulated_itar",
              "regulated_med_device","regulated_food","non_regulated"]
    },
    "intended_use": {"type":"string","minLength":20,"maxLength":2000},
    "out_of_scope": {"type":"string","maxLength":2000},
    "forbidden_uses": {"type":"array","items":{"type":"string"}},
    "tenant_id": {"type":["string","null"],"format":"uuid"},
    "effective_at": {"type":"string","format":"date-time"},
    "signed_by": {"type":"string","format":"email"}
  },
  "$defs": {
    "policy_predicate": {"type":"object","required":["directive_id"],
      "properties":{"directive_id":{"type":"string"}}},
    "workflow_predicate": {"type":"object","required":["state_machine","required_state"],
      "properties":{"state_machine":{"type":"string"},"required_state":{"type":"string"}}},
    "evidence_predicate": {"type":"object","required":["evidence_class","cardinality"],
      "properties":{"evidence_class":{"enum":["validation","signature","telemetry",
                                              "transaction","rollback","retraining",
                                              "redteam","audit_anchor","fallback"]},
                    "cardinality":{"enum":["one","one_or_more","exactly_two"]},
                    "freshness_max_days":{"type":"integer","minimum":1}}},
    "e_sign_predicate": {"type":"object",
      "properties":{"required":{"type":"boolean","default":false},
                    "factor_count":{"type":"integer","minimum":1,"maximum":3},
                    "signers":{"type":"integer","minimum":1,"maximum":3},
                    "factors_per_signer":{"type":"array","items":{"enum":["password","totp","u2f","hsm_smart_card","biometric"]}},
                    "part11_compliant":{"type":"boolean","default":true},
                    "time_window_seconds":{"type":"integer","default":300}}},
    "data_predicate": {"type":"object","required":["check_id"],
      "properties":{"check_id":{"type":"string"},
                    "scope":{"enum":["referential","range","unique","not_null","custom"]}}}
  }
}
```

---

## 4. The 11 Authority Ledger axioms

```yaml
A-AL-1: Every Authority Ledger row must reference a canonical root_code present in data/root_backlog_v8.json
A-AL-2: For each (root_code, resource_family, authority_class, tenant_id), at most one entry has superseded_at IS NULL
A-AL-3: An entry's effective_at must be ≤ NOW() at promotion time
A-AL-4: An entry with maturity_level >= 5 must have non-empty allowed_commands AND non-empty guard_requirements.workflow
A-AL-5: An entry with validation_scope IN ('regulated_*') AND maturity_level >= 5 must have e_sign required = true with factor_count >= obligation table
A-AL-6: forbidden_surfaces must include at least one entry where surface_class='WS' for any authority_class='authoritative' (per V7-INV-2)
A-AL-7: signed_by must be a current signer in authority_signers_v8 table; signature must verify against canonical_json_hash
A-AL-8: Every allowed_commands entry must exist in command_registry_v8 (no orphan commands)
A-AL-9: rollback_definition_uri must be present when rollback_model != 'no_reversal'
A-AL-10: tenant_id IS NULL entries are system-level; cross-tenant edges only allowed when subject is system-level
A-AL-11: An entry cannot transition maturity_level by >1 step without intermediate signed entry (anti-skipping; cf MAT-NO-SKIP-001)
```

Online enforcement: triggers on INSERT/UPDATE.
Offline enforcement: nightly `axiom_AL_audit` job emits SEV-1 on violation.

---

## 5. Workflow lookup query

The Command Bus (file 09) consults the Authority Ledger on every command:

```sql
SELECT
  al.allowed_commands,
  al.forbidden_surfaces,
  al.guard_requirements,
  al.audit_requirements,
  al.rollback_model,
  al.rollback_definition_uri,
  al.maturity_level,
  al.validation_scope
FROM mv_authority_ledger_active al
WHERE al.root_code = :root_code
  AND al.resource_family = :resource_family
  AND al.authority_class = 'authoritative'
  AND (al.tenant_id IS NULL OR al.tenant_id = current_setting('app.tenant_id')::uuid)
ORDER BY al.tenant_id NULLS LAST  -- prefer tenant-specific override over system default
LIMIT 1;
```

Latency budget: p95 < 5ms (served from materialized view + Redis L1 cache with 60s TTL).

---

## 6. Seed dataset

```yaml
seed_file: data/authority_ledger_seed_v8.json
seed_entries: 75 (one per V7 root) + 12 (per spine) + N tenant overrides
generation: scripts/generate_al_seed_v8.py reads data/root_backlog_v8.json + standards_gates_v8.json
verification: scripts/verify_al_seed_v8.py validates against schema + axioms
```

Sample seed entry:

```json
{
  "root_code": "NQCASE",
  "resource_family": "nq-cases",
  "authority_class": "authoritative",
  "allowed_commands": ["NQCASE_OPEN","NQCASE_DISPOSE","NQCASE_CLOSE","NQCASE_LINK_CAPA","NQCASE_REASSIGN"],
  "forbidden_surfaces": [
    {"surface_class":"WS","resource_family":"nq-case-inbox","reason":"projection only"},
    {"surface_class":"WS","resource_family":"quality-trend-board","reason":"analytic readout"}
  ],
  "guard_requirements": {
    "policy": [{"directive_id":"DIR-21CFR11-ESIGN"}, {"directive_id":"DIR-ISO13485-NC"}],
    "workflow": [{"state_machine":"sm4_nc","required_state":"open"}],
    "evidence": [{"evidence_class":"audit_anchor","cardinality":"one_or_more"}],
    "e_sign": {"required":true,"factor_count":2,"signers":2,"factors_per_signer":["password","totp"],"part11_compliant":true,"time_window_seconds":300},
    "data": [{"check_id":"NC-LOT-LINK-VALID","scope":"referential"}]
  },
  "audit_requirements": {"before":true,"after":true,"actor":true,"reason":true,"timestamp":true,"correlation":true},
  "rollback_model": "compensating_command",
  "rollback_definition_uri": "data/sagas/nqcase_dispose_compensation.yaml",
  "maturity_level": 1,
  "validation_scope": "regulated_gxp",
  "intended_use": "authoritative record of nonconformance cases for quality control with full traceability and regulated disposition workflow",
  "out_of_scope": "trend analytics, supplier scorecards (those are projections)",
  "forbidden_uses": ["AI auto-dispose", "workspace-driven mutation", "bulk close without per-case e-sign"],
  "tenant_id": null,
  "effective_at": "2026-04-26T00:00:00Z",
  "signed_by": "platform-lead@hesem.io"
}
```

---

## 7. Work packages

```yaml
WP-V8-LEDGER-1:
  title: Implement authority_ledger_v8 Postgres DDL + RLS + triggers
  deliverables:
    - mom/database/migrations/250_authority_ledger_v8.sql
    - mom/database/migrations/251_authority_ledger_v8_axioms.sql (online triggers)
    - mom/api/Jobs/AxiomALAuditJob.php (offline job)
    - schemas/authority_ledger_v8.json
    - schemas/authority_ledger_v8.sql (this file's section 2 carved out)
  effort_eng_weeks: 2
  owner_role: Platform Engineer
  reviewer: Database Lead + Security Lead

WP-V8-LEDGER-2:
  title: Author authority_ledger_v8 seed for 75 roots
  deliverables:
    - data/authority_ledger_seed_v8.json (75+ entries)
    - scripts/generate_al_seed_v8.py
    - scripts/verify_al_seed_v8.py
  effort_eng_weeks: 1.5
  owner_role: Domain Architect
  dependencies: [WP-V8-LEDGER-1, WP-V8-ROOTS-1]

WP-V8-LEDGER-3:
  title: Wire Authority Ledger lookup into Command Bus + Redis L1 cache
  deliverables:
    - mom/api/Services/Authority/AuthorityLedgerService.php
    - mom/api/Cache/AuthorityLedgerCache.php (Redis 60s TTL + invalidation)
    - tests/v8/authority/test_ledger_lookup_latency.php (p95 < 5ms)
  effort_eng_weeks: 1
  owner_role: Backend Engineer
  dependencies: [WP-V8-LEDGER-1, WP-V8-CMD-1]
```

---

## 8. Decision phrase

```text
V8_AUTHORITY_LEDGER_NORMATIVE_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-LEDGER-1..3
NEXT_FILE: 05_V8_OPERATIONAL_TRUTH_GRAPH_V8.md
```
