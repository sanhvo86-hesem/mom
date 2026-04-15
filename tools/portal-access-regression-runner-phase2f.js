
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = process.argv[2];
if (!repoRoot) {
  console.error('Usage: node portal-access-regression-runner-phase2f.js <repoRoot>');
  process.exit(2);
}
const repo = path.resolve(repoRoot);
const dataConfigPath = path.join(repo, 'mom', 'scripts', 'portal', '01-data-config.js');
const scenariosPath = path.join(repo, 'mom', 'data', 'config', 'portal-access-regression-scenarios.json');
const visibilityPath = path.join(repo, 'mom', 'data', 'config', 'docs_visibility.json');
const customDocsPath = path.join(repo, 'mom', 'data', 'config', 'docs_custom.json');
const rolePermsPath = path.join(repo, 'mom', 'data', 'config', 'role_permissions.json');
const descPath = path.join(repo, 'mom', 'data', 'config', 'doc_descriptions.json');

function readJson(p, fallback){
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e){ return fallback; }
}

const context = {
  window: { qmsEditorConfig: {} },
  sessionStorage: {
    getItem(){ return null; },
    setItem(){},
    removeItem(){},
  },
  localStorage: {
    getItem(){ return null; },
    setItem(){},
    removeItem(){},
  },
  document: {},
  fetch: async()=>({ json: async()=>({}) }),
  console,
  setTimeout,
  clearTimeout,
};
context.globalThis = context;
vm.createContext(context);

const code = fs.readFileSync(dataConfigPath, 'utf8');
vm.runInContext(code + '\n;globalThis.__EXPORT__={ROLE_DOCS,ROLES,normalizeDocPattern,docCodeMatchesPattern};', context, { timeout: 10000 });
const { ROLE_DOCS, ROLES, docCodeMatchesPattern } = context.__EXPORT__;

const scenarios = readJson(scenariosPath, { scenarios: [] });
const visibility = readJson(visibilityPath, { hidden: [] });
const customDocsRaw = readJson(customDocsPath, { docs: [] });
const customDocs = Array.isArray(customDocsRaw.docs) ? customDocsRaw.docs : Array.isArray(customDocsRaw) ? customDocsRaw : [];
const rolePerms = readJson(rolePermsPath, {});
const docDescriptions = readJson(descPath, {});

const hidden = new Set(Array.isArray(visibility.hidden) ? visibility.hidden : []);
const customCodes = new Set(customDocs.map(d => String(d.code || '').trim()).filter(Boolean));
const describedCodes = new Set(Object.keys(docDescriptions || {}));
const existingCodes = new Set([...customCodes, ...describedCodes]);

function hasRoleAccess(role, code, override){
  const roleDocs = ROLE_DOCS[role];
  if (!roleDocs) return false;
  if (hidden.has(code)) return false;
  let allowed = false;
  if (roleDocs === 'ALL') {
    allowed = true;
  } else if (Array.isArray(roleDocs)) {
    allowed = roleDocs.some(p => docCodeMatchesPattern(code, p));
  }
  const deny = (override && Array.isArray(override.deny)) ? override.deny : [];
  const grant = (override && Array.isArray(override.grant)) ? override.grant : [];
  if (deny.some(p => docCodeMatchesPattern(code, p))) allowed = false;
  if (grant.some(p => docCodeMatchesPattern(code, p))) allowed = true;
  return allowed;
}

function canCreate(role){
  if (rolePerms[role] && typeof rolePerms[role].canCreateDocs !== 'undefined') {
    return !!rolePerms[role].canCreateDocs;
  }
  return !!(ROLES[role] && ROLES[role].canCreateDocs);
}

const results = [];
for (const s of (scenarios.scenarios || [])) {
  const kind = s.kind || 'doc-access';
  let actual = false;
  let basis = '';
  let exists = true;

  if (kind === 'alias-match') {
    actual = !!docCodeMatchesPattern(String(s.doc_code || ''), String(s.pattern || ''));
    basis = `alias:${s.pattern}`;
  } else if (kind === 'custom-create') {
    actual = canCreate(String(s.role || ''));
    basis = 'canCreateDocs';
  } else {
    const code = String(s.doc_code || '');
    exists = (s.doc_registry === 'custom') ? customCodes.has(code) : true;
    actual = hasRoleAccess(String(s.role || ''), code, s.override || null) && exists;
    basis = s.override ? 'role+override' : 'role';
  }

  results.push({
    id: s.id,
    title: s.title,
    kind,
    role: s.role || null,
    pattern: s.pattern || null,
    doc_code: s.doc_code || null,
    expected: !!s.expected,
    actual,
    pass: actual === !!s.expected,
    basis,
    exists,
    hidden: s.doc_code ? hidden.has(String(s.doc_code)) : false,
    risk_group: s.risk_group || null,
    context: s.context || null,
  });
}

const byGroup = {};
for (const r of results) {
  const g = r.risk_group || 'ungrouped';
  if (!byGroup[g]) byGroup[g] = { total: 0, pass: 0 };
  byGroup[g].total++;
  if (r.pass) byGroup[g].pass++;
}

const out = {
  version: scenarios.version || 'phase2f',
  executed_against: scenarios.executed_against || '',
  generated_at: new Date().toISOString(),
  summary: {
    total: results.length,
    pass: results.filter(r => r.pass).length,
    fail: results.filter(r => !r.pass).length,
    hidden_count: hidden.size,
    custom_doc_count: customDocs.length,
  },
  groups: byGroup,
  results
};

const outPath = path.join(repo, 'mom', 'docs', 'portal-access-regression-results-phase2f.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(outPath);
