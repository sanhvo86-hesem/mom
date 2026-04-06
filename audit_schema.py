import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

migrations_dir = "01-QMS-Portal/database/migrations"
tables = {}


def load_json(path):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        return json.load(f)


def load_optional_json(path, default=None):
    if default is None:
        default = {}
    if not os.path.exists(path):
        return default
    try:
        return load_json(path)
    except Exception:
        return default


def load_data_fields_registry(path):
    data = load_json(path)
    if not isinstance(data, dict):
        return {}
    if data.get('split') and isinstance(data.get('parts'), list):
        merged = {}
        base_dir = os.path.dirname(path)
        for part in data['parts']:
            part_file = part.get('file')
            if not part_file:
                continue
            part_path = os.path.join(base_dir, part_file)
            if not os.path.exists(part_path):
                continue
            part_data = load_json(part_path)
            if not isinstance(part_data, dict):
                continue
            for key, value in part_data.items():
                if key == '_meta':
                    continue
                merged[key] = value
        return merged
    return {k: v for k, v in data.items() if k != '_meta'}


def load_workflow_registry(path):
    data = load_json(path)
    if isinstance(data, dict) and isinstance(data.get('workflows'), dict):
        return data['workflows']
    return data if isinstance(data, dict) else {}


def load_table_registry(path):
    data = load_json(path)
    if isinstance(data, dict) and isinstance(data.get('tables'), dict):
        return data['tables']
    return {}


def normalize_col_type(type_value):
    return str(type_value or 'UNKNOWN').split('(')[0].upper()

for fname in sorted(os.listdir(migrations_dir)):
    if not fname.endswith('.sql'): continue
    with open(os.path.join(migrations_dir, fname), 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    for match in re.finditer(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(', content, re.I):
        tname = match.group(1).lower()
        if 'PARTITION OF' in content[max(0,match.start()-80):match.start()]: continue
        start = match.end()
        depth = 1; pos = start
        while pos < len(content) and depth > 0:
            if content[pos] == '(': depth += 1
            elif content[pos] == ')': depth -= 1
            pos += 1
        block = content[start:pos-1]
        cols = []; col_types = {}
        for line in block.split('\n'):
            line = line.strip().rstrip(',')
            if not line or line.startswith('--') or line.startswith('/*'): continue
            if re.match(r'^(PRIMARY|UNIQUE|CHECK|CONSTRAINT|FOREIGN|EXCLUDE|CREATE|LIKE)\b', line, re.I): continue
            m = re.match(r'^(\w+)\s+(\S+)', line)
            if m:
                col = m.group(1).lower()
                ctype = m.group(2).split('(')[0].upper()
                skip = {'primary','unique','check','constraint','foreign','create','like','exclude','partition','inherits'}
                if col not in skip:
                    cols.append(col)
                    col_types[col] = ctype
        tables[tname] = {'migration': fname, 'columns': cols, 'col_types': col_types}

parsed_tables = dict(tables)
table_registry = load_table_registry("01-QMS-Portal/qms-data/registry/table-registry.json")
if table_registry:
    merged_tables = {}
    for tname, meta in table_registry.items():
        columns = meta.get('columns') or {}
        merged_tables[tname] = {
            'migration': meta.get('migration') or parsed_tables.get(tname, {}).get('migration', 'registry'),
            'columns': list(columns.keys()),
            'col_types': {
                col: normalize_col_type(col_meta.get('type') if isinstance(col_meta, dict) else None)
                for col, col_meta in columns.items()
            },
            'domain': meta.get('domain'),
            'workflow_id': meta.get('workflowId'),
        }
    for tname, meta in parsed_tables.items():
        if tname not in merged_tables:
            merged_tables[tname] = meta
    tables = merged_tables

data_fields = load_data_fields_registry("01-QMS-Portal/qms-data/registry/data-fields.json")

field_info = {}
endpoint_fields = {}
for key, fields in data_fields.items():
    if key == '_meta': continue
    if isinstance(fields, list):
        eps = []
        for fld in fields:
            if isinstance(fld, dict) and 'key' in fld:
                fkey = fld['key']
                eps.append(fkey)
                if fkey not in field_info:
                    field_info[fkey] = {
                        'endpoints': [],
                        'label': fld.get('label',''),
                        'type': fld.get('type',''),
                        'sources': set(),
                    }
                field_info[fkey]['endpoints'].append(key)
                field_info[fkey]['sources'].add(fld.get('source', 'unknown'))
        endpoint_fields[key] = eps

workflows = load_workflow_registry("01-QMS-Portal/qms-data/registry/workflow-library.json")
manifest = load_optional_json("01-QMS-Portal/qms-data/registry/registry-manifest.json")
quality_report = load_optional_json("01-QMS-Portal/qms-data/registry/registry-quality-report.json")
frontend_foundation = load_optional_json("01-QMS-Portal/qms-data/registry/frontend-foundation-catalog.json")
manifest_coverage = manifest.get('coverage', {}) if isinstance(manifest, dict) else {}
quality_summary = quality_report.get('summary', {}) if isinstance(quality_report, dict) else {}
quality_checks = quality_report.get('checks', []) if isinstance(quality_report, dict) else []
failed_quality_checks = [check for check in quality_checks if isinstance(check, dict) and not check.get('passed')]
frontend_summary = frontend_foundation.get('summary', {}) if isinstance(frontend_foundation, dict) else {}
frontend_entities = frontend_foundation.get('entities', {}) if isinstance(frontend_foundation, dict) else {}
frontend_blocked = {
    key: value for key, value in frontend_entities.items()
    if isinstance(value, dict) and ((value.get('readiness') or {}).get('verdict') == 'blocked')
}

wf_entities = {}
for wfkey, wf in workflows.items():
    if wfkey == '_meta' or not isinstance(wf, dict): continue
    entity = wf.get('entity', wfkey.replace('wf_', ''))
    wf_entities[entity] = wfkey

all_db_cols = {}
for tname, tdata in tables.items():
    for col in tdata['columns']:
        all_db_cols.setdefault(col, []).append(tname)

all_field_keys = set(field_info.keys())
all_col_names = set(all_db_cols.keys())
matched_fields = all_field_keys & all_col_names
orphan_fields = all_field_keys - all_col_names

# Classify orphans
classified = {'computed':set(),'kpi':set(),'aggregate':set(),'joined':set(),'action_param':set(),'genuine':set()}
for f in orphan_fields:
    sources = field_info.get(f, {}).get('sources', set())
    endpoints = field_info.get(f, {}).get('endpoints', [])
    if 'join' in sources:
        classified['joined'].add(f)
    elif 'param' in sources:
        classified['action_param'].add(f)
    elif any(ep.startswith('registry_support.aggregate.metrics') for ep in endpoints):
        classified['aggregate'].add(f)
    elif any(ep.startswith('registry_support.computed.metrics') for ep in endpoints):
        classified['computed'].add(f)
    elif any(f.startswith(p) for p in ['avg_','total_','count_','sum_','pct_','rate_','trend_','score_','rank_','ratio_','delta_','variance_','min_','max_']):
        classified['computed'].add(f)
    elif any(f.startswith(p) for p in ['kpi_','oee_','otd_','ppm_','dpmo_','copq_','yield_','mtbf_','mttr_']):
        classified['kpi'].add(f)
    elif any(f.startswith(p) for p in ['active_','open_','pending_','overdue_','closed_','this_week','this_month','today_','last_']):
        classified['aggregate'].add(f)
    else:
        classified['genuine'].add(f)

source_conflicts = {
    key: sorted([src for src in meta.get('sources', set()) if src])
    for key, meta in field_info.items()
    if len([src for src in meta.get('sources', set()) if src]) > 1
}

# Map tables to workflow/domain
domain_prefixes = {
    'mes_':'mes', 'pm_':'maintenance', 'aps_':'planning', 'wms_':'warehouse',
    'hcm_':'hr', 'plm_':'plm', 'crm_':'crm', 'tms_':'transport', 'bi_':'analytics',
    'fin_':'finance', 'prj_':'project', 'ehs_':'ehs', 'srm_':'supplier',
    'tlm_':'tooling', 'sop_':'demand_planning', 'svc_':'service', 'wty_':'warranty',
    'tre_':'treasury', 'qlab_':'quality_lab', 'esg_':'sustainability',
    'mei_':'mfg_engineering', 'mdg_':'master_data_gov', 'ccp_':'commercial',
    'trc_':'traceability', 'osp_':'outsource', 'tcm_':'trade_compliance',
    'ncr_':'quality', 'capa_':'quality', 'fai_':'quality', 'spc_':'quality',
    'fmea_':'quality', 'scar_':'supplier_quality', 'inspection_':'quality',
    'sales_':'sales', 'purchase_':'purchasing', 'job_':'production',
    'inventory_':'inventory', 'lot_':'inventory', 'serial_':'inventory',
    'routing_':'master_data', 'bom_':'master_data', 'item':'master_data',
    'customer':'crm', 'vendor':'purchasing', 'document':'document_control',
    'form_':'forms', 'record_':'records', 'workflow_':'system',
    'audit_':'audit', 'risk_':'risk', 'training_':'training',
    'calibration_':'calibration', 'equipment':'equipment', 'tool':'tooling',
    'shipment':'logistics', 'compliance_':'compliance', 'certificate':'compliance',
    'quote':'quoting', 'evidence_':'evidence', 'product_passport':'dpp',
    'shift_':'production', 'labor_':'production', 'production_':'production',
    'gl_':'finance', 'cost_':'finance', 'ap_':'finance',
    'tag':'system', 'comment':'system', 'notification':'system', 'file_':'system',
    'user':'core', 'role':'core', 'session':'core', 'department':'core',
    'warehouse':'inventory', 'kpi_':'analytics', 'mrp_':'planning',
    'concession':'quality', 'deviation':'quality', 'engineering_change':'plm',
    'npi_':'project', 'contamination':'quality', 'passport_':'dpp',
    'approved_supplier':'supplier_quality', 'skip_lot':'supplier_quality',
    'copq_':'quality', 'escalation_':'system', 'mobile_':'mobile',
    'packing_':'logistics', 'outside_':'outsource', 'subcontract':'outsource',
    'rma_':'rma', 'order_':'orders', 'capacity_':'planning',
    'control_plan':'quality', 'apqp_':'quality', 'ppap_':'quality',
    'prediction_':'ai', 'schedule_':'planning', 'dispatch_':'production',
    'machine_rate':'production', 'material_':'master_data', 'setup_':'production',
    'commercial_':'commercial', 'portal_':'portal', 'contract_':'commercial',
    'incoming_':'quality', 'oqc_':'quality', 'supplier_':'supplier_quality',
    'lean_':'lean', 'org_':'master_data_governance', 'retention_':'master_data_governance',
    'source_system_':'master_data_governance', 'data_archival_':'master_data_governance',
    'integration_':'system_infrastructure'
}

table_domain = {}
for tname in tables:
    domain = tables[tname].get('domain')
    if not domain:
        for prefix, dom in sorted(domain_prefixes.items(), key=lambda x: -len(x[0])):
            if tname.startswith(prefix) or tname == prefix.rstrip('_'):
                domain = dom
                break
    table_domain[tname] = domain

mapped_tables = {t for t, d in table_domain.items() if d}
orphan_tables = {t for t, d in table_domain.items() if not d}

# Domain summary
domain_counts = {}
for t, d in table_domain.items():
    if d:
        domain_counts.setdefault(d, []).append(t)

# PRINT REPORT
print("=" * 70)
print("COMPLETE SCHEMA-FIELD-WORKFLOW AUDIT")
print("=" * 70)

print(f"\nDATABASE: {len(tables)} tables, {sum(len(t['columns']) for t in tables.values())} columns")
print(f"REGISTRY: {len(all_field_keys)} unique field keys, {len(endpoint_fields)} field-registry actions")
if manifest_coverage or quality_summary:
    print(
        "RUNTIME: "
        f"{manifest_coverage.get('router_actions', quality_summary.get('endpoint_count', 0))} router actions, "
        f"{manifest_coverage.get('domain_pack_count', quality_summary.get('pack_count', 0))} packs, "
        f"{manifest_coverage.get('relation_edges', quality_summary.get('relation_edge_count', 0))} relations"
    )
    print(
        "QUALITY: "
        f"{'PASS' if quality_report.get('all_passed') else 'WARN'} "
        f"({len(quality_checks) - len(failed_quality_checks)}/{len(quality_checks)} checks passed)"
    )
if frontend_summary:
    print(
        "FRONTEND FOUNDATION: "
        f"{frontend_summary.get('entity_count', 0)} entities, "
        f"{frontend_summary.get('ready_entities', 0)} ready, "
        f"{frontend_summary.get('partial_entities', 0)} partial, "
        f"{frontend_summary.get('blocked_entities', 0)} blocked"
    )
print(f"WORKFLOWS: {len(wf_entities)} workflow definitions")

print(f"\n--- FIELD-COLUMN LINKAGE ---")
field_denominator = len(all_field_keys) or 1
col_denominator = len(all_col_names) or 1
print(f"Matched: {len(matched_fields)}/{len(all_field_keys)} fields ({100*len(matched_fields)/field_denominator:.1f}%)")
print(f"Orphan fields: {len(orphan_fields)} ({100*len(orphan_fields)/field_denominator:.1f}%)")
print(f"  computed/derived: {len(classified['computed'])}")
print(f"  kpi/metric:       {len(classified['kpi'])}")
print(f"  aggregate:        {len(classified['aggregate'])}")
print(f"  joined (FK name): {len(classified['joined'])}")
print(f"  action params:    {len(classified['action_param'])}")
print(f"  GENUINE orphans:  {len(classified['genuine'])}")
print(f"Field source conflicts: {len(source_conflicts)}")

missing_field_defs = sorted(all_col_names - all_field_keys)
print(f"\nDB cols without field def: {len(missing_field_defs)}/{len(all_col_names)} ({100*len(missing_field_defs)/col_denominator:.1f}%)")
if missing_field_defs:
    print(f"Missing DB field defs (up to 20): {missing_field_defs[:20]}")

print(f"\n--- TABLE DOMAIN MAPPING ---")
print(f"Mapped to domain: {len(mapped_tables)}/{len(tables)} ({100*len(mapped_tables)/len(tables):.1f}%)")
print(f"Unmapped (orphan): {len(orphan_tables)}")

print(f"\nDomain distribution (top 25):")
for dom, tbls in sorted(domain_counts.items(), key=lambda x: -len(x[1]))[:25]:
    print(f"  {dom}: {len(tbls)} tables")

if orphan_tables:
    print(f"\nOrphan tables ({len(orphan_tables)}):")
    for t in sorted(orphan_tables):
        print(f"  {t} ({len(tables[t]['columns'])} cols) [{tables[t]['migration']}]")

# Workflow entities vs tables
print(f"\n--- WORKFLOW-TABLE COVERAGE ---")
for entity, wfkey in sorted(wf_entities.items()):
    entity_tables = [t for t, meta in tables.items() if meta.get('workflow_id') == wfkey]
    if not entity_tables:
        entity_tables = [t for t in tables if entity in t or t.startswith(entity.replace('_',''))]
    print(f"  {entity} ({wfkey}): {len(entity_tables)} tables -> {entity_tables[:5]}")

if source_conflicts:
    print(f"\n--- MULTI-SOURCE FIELD KEYS ({len(source_conflicts)}) ---")
    print("These keys are reused across db/join/param/computed sources and should be minimized.")
    for field_key in sorted(source_conflicts)[:40]:
        print(f"  {field_key}: {source_conflicts[field_key]}")

if frontend_blocked:
    print(f"\n--- FRONTEND FOUNDATION BLOCKERS ({len(frontend_blocked)}) ---")
    print("These entities still lack backend contracts needed for world-class frontend experiences.")
    for key in sorted(frontend_blocked)[:40]:
        readiness = frontend_blocked[key].get('readiness') or {}
        print(f"  {key} | score={readiness.get('score')} | blockers={readiness.get('blockers', [])[:5]}")

# Genuine orphan fields detail
print(f"\n--- GENUINE ORPHAN FIELDS ({len(classified['genuine'])}) ---")
print("These fields exist in data-fields.json but have NO matching DB column.")
print("Need to determine: (a) missing table/column, or (b) field should be removed")
for f in sorted(classified['genuine'])[:80]:
    eps = field_info[f]['endpoints'][:3]
    print(f"  {f} | type={field_info[f]['type']} | used in {len(field_info[f]['endpoints'])} eps: {eps}")

# Save full audit
audit = {
    'tables': len(tables),
    'columns': sum(len(t['columns']) for t in tables.values()),
    'field_keys': len(all_field_keys),
    'field_registry_actions': len(endpoint_fields),
    'matched': len(matched_fields),
    'runtime_manifest': manifest_coverage,
    'quality_summary': quality_summary,
    'quality_failed_checks': failed_quality_checks,
    'frontend_foundation_summary': frontend_summary,
    'frontend_foundation_blocked': {
        key: {
            'score': (value.get('readiness') or {}).get('score'),
            'blockers': (value.get('readiness') or {}).get('blockers', []),
            'profile': value.get('profile'),
        }
        for key, value in frontend_blocked.items()
    },
    'missing_field_defs': missing_field_defs,
    'orphan_fields': {k: sorted(list(v)) for k, v in classified.items()},
    'field_source_conflicts': source_conflicts,
    'orphan_tables': sorted(orphan_tables),
    'domain_map': {d: sorted(ts) for d, ts in domain_counts.items()},
    'table_list': {t: {'migration': tables[t]['migration'], 'col_count': len(tables[t]['columns']), 'domain': table_domain[t]} for t in sorted(tables)},
}
with open("01-QMS-Portal/docs/schema-field-audit-full.json", 'w', encoding='utf-8') as f:
    json.dump(audit, f, ensure_ascii=False, indent=2)
print(f"\nFull audit saved to docs/schema-field-audit-full.json")
