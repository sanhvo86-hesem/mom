import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

migrations_dir = "01-QMS-Portal/database/migrations"
tables = {}

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

with open("01-QMS-Portal/qms-data/registry/data-fields.json", 'r', encoding='utf-8') as f:
    data_fields = json.load(f)

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
                    field_info[fkey] = {'endpoints': [], 'label': fld.get('label',''), 'type': fld.get('type','')}
                field_info[fkey]['endpoints'].append(key)
        endpoint_fields[key] = eps

with open("01-QMS-Portal/qms-data/registry/workflow-library.json", 'r', encoding='utf-8') as f:
    workflows = json.load(f)

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
    if any(f.startswith(p) for p in ['avg_','total_','count_','sum_','pct_','rate_','trend_','score_','rank_','ratio_','delta_','variance_','min_','max_']):
        classified['computed'].add(f)
    elif any(f.startswith(p) for p in ['kpi_','oee_','otd_','ppm_','dpmo_','copq_','yield_','mtbf_','mttr_']):
        classified['kpi'].add(f)
    elif any(f.startswith(p) for p in ['active_','open_','pending_','overdue_','closed_','this_week','this_month','today_','last_']):
        classified['aggregate'].add(f)
    elif f.endswith('_name') and f.replace('_name','_id') in all_col_names:
        classified['joined'].add(f)
    elif any(f.endswith(s) for s in ['_save','_delete','_create','_update','_transition']):
        classified['action_param'].add(f)
    else:
        classified['genuine'].add(f)

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
    'incoming_':'quality', 'oqc_':'quality', 'supplier_':'supplier_quality'
}

table_domain = {}
for tname in tables:
    domain = None
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
print(f"REGISTRY: {len(all_field_keys)} unique field keys, {len(endpoint_fields)} endpoints")
print(f"WORKFLOWS: {len(wf_entities)} workflow definitions")

print(f"\n--- FIELD-COLUMN LINKAGE ---")
print(f"Matched: {len(matched_fields)}/{len(all_field_keys)} fields ({100*len(matched_fields)/len(all_field_keys):.1f}%)")
print(f"Orphan fields: {len(orphan_fields)} ({100*len(orphan_fields)/len(all_field_keys):.1f}%)")
print(f"  computed/derived: {len(classified['computed'])}")
print(f"  kpi/metric:       {len(classified['kpi'])}")
print(f"  aggregate:        {len(classified['aggregate'])}")
print(f"  joined (FK name): {len(classified['joined'])}")
print(f"  action params:    {len(classified['action_param'])}")
print(f"  GENUINE orphans:  {len(classified['genuine'])}")

print(f"\nDB cols without field def: {len(all_col_names - all_field_keys)}/{len(all_col_names)} ({100*len(all_col_names-all_field_keys)/len(all_col_names):.1f}%)")

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
    entity_tables = [t for t in tables if entity in t or t.startswith(entity.replace('_',''))]
    print(f"  {entity} ({wfkey}): {len(entity_tables)} tables -> {entity_tables[:5]}")

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
    'matched': len(matched_fields),
    'orphan_fields': {k: sorted(list(v)) for k, v in classified.items()},
    'orphan_tables': sorted(orphan_tables),
    'domain_map': {d: sorted(ts) for d, ts in domain_counts.items()},
    'table_list': {t: {'migration': tables[t]['migration'], 'col_count': len(tables[t]['columns']), 'domain': table_domain[t]} for t in sorted(tables)},
}
with open("01-QMS-Portal/docs/schema-field-audit-full.json", 'w', encoding='utf-8') as f:
    json.dump(audit, f, ensure_ascii=False, indent=2)
print(f"\nFull audit saved to docs/schema-field-audit-full.json")
