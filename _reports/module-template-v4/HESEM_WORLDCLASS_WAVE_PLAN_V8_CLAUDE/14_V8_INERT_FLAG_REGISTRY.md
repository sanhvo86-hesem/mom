# 14 — V8 Inert Flag Registry

```text
purpose:        Bind V7's "HMV4 inert default" name to a registry of feature flags + tests
predecessor:    V7 §00 + CLAUDE.md (HMV4_PREVIEW_ENABLED, HMV4_FIXTURE_MODE, etc.)
v8_advance:     Per-flag registry with default + scope + audit + tests + rollout policy
work_package:   WP-V8-INERT (1 work package)
owner:          Platform Lead
estimate:       0.5 engineering-week
```

---

## 1. Registry

`data/inert_flag_registry_v8.json`:

```json
[
  {
    "flag_id":"HMV4_PREVIEW_ENABLED",
    "scope":"global",
    "default_main":false,
    "default_dev":true,
    "rollout_policy":"per_tenant_opt_in",
    "controls":["enables HMV4 portal preview UI"],
    "owner_role":"Platform Lead",
    "rollout_authorized_by":"User explicit per CLAUDE.md ADR-0001",
    "test":"tests/v8/inert/test_hmv4_preview_default.spec.ts asserts main has default=false",
    "wave":"W0"
  },
  {
    "flag_id":"HMV4_FIXTURE_MODE",
    "scope":"global",
    "default_main":false,
    "default_dev":true,
    "rollout_policy":"per_tenant_opt_in",
    "controls":["enables fixture-mode rendering when HMV4 preview ON"],
    "test":"tests/v8/inert/test_fixture_mode_default.spec.ts",
    "wave":"W0"
  },
  {
    "flag_id":"HMV4_DISABLE_MUTATION_LAUNCHERS",
    "scope":"global",
    "default_main":true,
    "rollout_policy":"never_default_off",
    "controls":["disables mutation buttons in HMV4 surfaces; data-hmv4-mutation-intent attribute set"],
    "test":"tests/v8/inert/test_mutation_launcher_disabled.spec.ts",
    "wave":"W0"
  },
  {
    "flag_id":"HMV4_LIVE_API_<ROOT>",
    "scope":"per_root + per_tenant",
    "default_main":false,
    "rollout_policy":"per_slice_per_tenant_opt_in",
    "controls":["enables live read-only API for root <ROOT>"],
    "instances":["HMV4_LIVE_API_NQCASE","HMV4_LIVE_API_CAPA","HMV4_LIVE_API_CDOC","HMV4_LIVE_API_TRAIN","HMV4_LIVE_API_INSP","HMV4_LIVE_API_BREL","HMV4_LIVE_API_LOT","HMV4_LIVE_API_DISP","HMV4_LIVE_API_WO","HMV4_LIVE_API_INSPECTION"],
    "test":"tests/v8/inert/test_live_api_default_off.spec.ts",
    "wave":"W4"
  },
  {
    "flag_id":"HMV4_AI_ADVISORY_<FEATURE>",
    "scope":"per_feature + per_tenant",
    "default_main":false,
    "rollout_policy":"per_feature_per_tenant_after_red_team",
    "controls":["enables AI advisory feature <FEATURE>; never auto-enabled"],
    "instances":["HMV4_AI_ADVISORY_NC_SIM","HMV4_AI_ADVISORY_CAPA_RC","HMV4_AI_ADVISORY_CDOC_REVIEWER","HMV4_AI_ADVISORY_PRED_MAINT","HMV4_AI_ADVISORY_COMPLAINT_NLP"],
    "test":"tests/v8/inert/test_ai_advisory_default_off.spec.ts",
    "wave":"W6.5"
  },
  {
    "flag_id":"HMV4_VERTICAL_PACK_<PACK>",
    "scope":"per_pack + per_tenant",
    "default_main":false,
    "rollout_policy":"per_tenant_after_pack_signoff",
    "instances":["HMV4_VERTICAL_PACK_PHARMA","HMV4_VERTICAL_PACK_AUTOMOTIVE","HMV4_VERTICAL_PACK_AEROSPACE","HMV4_VERTICAL_PACK_MED_DEVICE","HMV4_VERTICAL_PACK_FOOD"],
    "wave":"W10"
  },
  {
    "flag_id":"HMV4_OT_WRITE_PATH_<EQP>",
    "scope":"per_equipment + per_tenant",
    "default_main":false,
    "rollout_policy":"per_equipment_after_safety_review",
    "controls":["enables OT write-back to specific equipment; requires IEC 62443 zone review"],
    "wave":"W6"
  },
  {
    "flag_id":"HMV4_MULTI_REGION",
    "scope":"global",
    "default_main":false,
    "rollout_policy":"per_tenant_after_dr_drill",
    "wave":"W13"
  }
]
```

---

## 2. Inert default test

```python
# tests/v8/inert/test_hmv4_inert_defaults.py
def test_hmv4_preview_enabled_false_on_main():
    portal_html = read("mom/portal.html")
    assert re.search(r"HMV4_PREVIEW_ENABLED\s*=\s*false", portal_html)
    assert "HMV4_PREVIEW_ENABLED = true" not in portal_html

def test_74_fixtures_not_loaded():
    portal_html = read("mom/portal.html")
    assert "74-module-template-v4-fixtures" not in portal_html

def test_disable_mutation_launchers_default_true_on_main():
    bridge_js = read("mom/scripts/portal/72-module-template-v4-bridge.js")
    # default value declaration
    assert re.search(r"HMV4_DISABLE_MUTATION_LAUNCHERS\s*=\s*true", bridge_js) or \
           "default: true" in extract_default_block(bridge_js)
```

---

## 3. Rollout audit

Every flag flip is logged:

```yaml
otg_event_type:  inert_flag.toggled
payload:         { flag_id, from, to, scope, tenant_id?, principal_id, reason, adr_ref }
retention:       gxp_long_term (7y) for any flag controlling regulated path
mandatory_evidence: ADR ref + user approval phrase
```

---

## 4. Decision phrase

```text
V8_INERT_FLAG_REGISTRY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-INERT-1
NEXT_FILE: 15_V8_MES_OT_REFERENCE_ARCHITECTURE.md
```
