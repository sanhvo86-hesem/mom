#!/usr/bin/env python3
"""
generate-registry-from-ai-index.py
===================================
Bootstrap minimal Data Schema registry files from the pre-built .ai/ index.
Run this when the registry directory is missing or needs to be re-seeded.

Usage:
    python3 tools/registry/generate-registry-from-ai-index.py

Output files (in mom/data/registry/):
    endpoint-catalog-index.json   — API endpoints from route-map.json
    table-registry.json           — DB tables from db-map.json
    relation-map.json             — Empty relation map skeleton
    schema-authority-summary.json — Table authority summary
"""
import json, datetime, pathlib, sys

repo_root = pathlib.Path(__file__).parent.parent.parent
ai_dir    = repo_root / '.ai'
out_dir   = repo_root / 'mom' / 'data' / 'registry'

out_dir.mkdir(parents=True, exist_ok=True)
now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

# ── 1. Endpoint catalog from route-map.json ────────────────────────────────
route_map     = json.loads((ai_dir / 'route-map.json').read_text())
action_routes = route_map.get('action_routes', [])
rest_routes   = route_map.get('rest_routes', [])

rows = []
for r in action_routes:
    if not isinstance(r, dict):
        continue
    key = r.get('action', '')
    rows.append({
        'key': key,
        'path': r.get('path', f'?action={key}'),
        'method': r.get('http_method', 'POST'),
        'controller': r.get('controller', ''),
        'handler': r.get('method', ''),    # PHP method name — used by implementation_linked check
        'domain': r.get('domain', ''),
        'type': 'action',
        'services': r.get('services', []) if isinstance(r.get('services'), list) else [],
    })

for r in rest_routes:
    if not isinstance(r, dict):
        continue
    rows.append({
        'key': r.get('path', ''),
        'path': r.get('path', ''),
        'method': r.get('http_method', 'GET'),
        'controller': r.get('controller', ''),
        'handler': r.get('method', ''),
        'domain': r.get('domain', ''),
        'type': 'rest',
        'services': r.get('services', []) if isinstance(r.get('services'), list) else [],
    })

endpoint_catalog = {
    '_meta': {
        'generated_at': now,
        'source': 'ai-index/route-map.json',
        'total_endpoints': len(rows),
        'action_routes': len(action_routes),
        'rest_routes': len(rest_routes),
    },
    'rows': rows,
}
(out_dir / 'endpoint-catalog-index.json').write_text(
    json.dumps(endpoint_catalog, ensure_ascii=False, indent=2))
linked = sum(1 for r in rows if r['controller'] and r['handler'])
print(f'✓ endpoint-catalog-index.json  ({len(rows)} rows, {linked} with implementation linked)')

# ── 2. Table registry from db-map.json ────────────────────────────────────
db_map     = json.loads((ai_dir / 'db-map.json').read_text())
raw_tables = db_map.get('tables', {})

tables_out = {}
for tname, tdata in (raw_tables.items() if isinstance(raw_tables, dict) else []):
    pk = tdata.get('primary_key', '')
    tables_out[tname] = {
        'name': tname,
        'primaryKey': pk,                      # DataSchemaService reads 'primaryKey'
        'primaryKeys': [pk] if pk else [],     # DataSchemaService reads 'primaryKeys'
        'foreign_keys': tdata.get('foreign_keys', []) if isinstance(tdata.get('foreign_keys'), list) else [],
        'migration': tdata.get('migration', ''),
        'domain': tdata.get('domain', ''),
        'columns': {},                         # Empty — governance fields populated by full registry tools
    }

table_registry = {
    '_meta': {
        'generated_at': now,
        'source': 'ai-index/db-map.json',
        'total_tables': len(tables_out),
        'note': 'Bootstrapped from .ai/db-map.json. Run full registry tools for columns/governance data.',
    },
    'tables': tables_out,
}
(out_dir / 'table-registry.json').write_text(
    json.dumps(table_registry, ensure_ascii=False, indent=2))
print(f'✓ table-registry.json          ({len(tables_out)} tables)')

# ── 3. Relation map skeleton ───────────────────────────────────────────────
relation_map = {'_meta': {'generated_at': now, 'source': 'ai-index'}, 'entities': {}}
(out_dir / 'relation-map.json').write_text(json.dumps(relation_map, indent=2))
print(f'✓ relation-map.json            (skeleton)')

# ── 4. Schema authority summary ───────────────────────────────────────────
table_list = [
    {'name': n, 'domain': d.get('domain', ''), 'migration': d.get('migration', '')}
    for n, d in tables_out.items()
]
domains = sorted(set(t['domain'] for t in table_list if t['domain']))
schema_auth = {
    '_meta': {'generated_at': now, 'source': 'ai-index/db-map.json'},
    'tables': table_list,
    'summary': {'total': len(table_list), 'domain_count': len(domains), 'domains': domains},
}
(out_dir / 'schema-authority-summary.json').write_text(
    json.dumps(schema_auth, ensure_ascii=False, indent=2))
print(f'✓ schema-authority-summary.json ({len(table_list)} tables, {len(domains)} domains)')

print(f'\nAll registry files written to: {out_dir}')
print('To deploy to VPS: bash tools/vps-setup/scripts/sync-registry.sh')
