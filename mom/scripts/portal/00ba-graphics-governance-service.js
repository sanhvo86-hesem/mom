/* ============================================================================
   HESEM MOM - Graphics Governance Service Contract
   Backend-ready control plane facade for Template Studio / Admin Appearance.

   Authority model:
     Backend registry and governance endpoints are authoritative.
     localStorage is limited to preview cache and unsaved draft cache.
   ============================================================================ */
(function(){
'use strict';

var PREVIEW_CACHE_KEY = 'hesem_graphics_template_preview_cache';
var DRAFT_CACHE_KEY = 'hesem_graphics_template_draft_cache';
var VERSION = '20260413a';

var ENDPOINTS = {
  templateRegistry:  { method:'GET',  action:'graphics_template_registry_get' },
  templateDraftSave: { method:'POST', action:'graphics_template_draft_save' },
  templateValidate:  { method:'POST', action:'graphics_template_validate' },
  templatePublish:   { method:'POST', action:'graphics_template_publish' },
  impactToken:       { method:'POST', action:'graphics_impact_token' },
  impactTemplate:    { method:'POST', action:'graphics_impact_template' },
  impactComponent:   { method:'POST', action:'graphics_impact_component' },
  complianceMatrix: { method:'GET',  action:'graphics_compliance_matrix' },
  driftReport:       { method:'GET',  action:'graphics_drift_report' },
  rolloutStage:     { method:'POST', action:'graphics_rollout_stage' },
  publishApply:     { method:'POST', action:'graphics_rollout_apply' },
  rollback:         { method:'POST', action:'graphics_rollout_rollback' },
  auditHistory:     { method:'GET',  action:'graphics_audit_history' },
  waiverRequest:    { method:'POST', action:'graphics_waiver_create' },
  activeWaivers:    { method:'GET',  action:'graphics_waivers_active' }
};

var TEMPLATE_STATES = [
  'draft-only',
  'controlled-draft',
  'validated',
  'publish-blocked',
  'published',
  'deprecated',
  'legacy-bridged'
];

var _state = {
  loaded: false,
  loading: false,
  lastLoadedAt: null,
  registryAuthority: 'fallback-seed',
  endpointStatus: {},
  backendAvailable: false,
  templates: [],
  modules: [],
  compliance: [],
  drift: null,
  audit: [],
  waivers: [],
  rolloutsByTemplate: {},
  lastChange: {
    kind: 'template-registry',
    target: 'T13',
    label: 'Template registry baseline',
    source: 'frontend-fallback'
  },
  lastImpact: null
};

function clone(value){
  return JSON.parse(JSON.stringify(value == null ? null : value));
}

function nowIso(){
  return new Date().toISOString();
}

function safeRead(key){
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch(e){
    return {};
  }
}

function safeWrite(key, value){
  try {
    localStorage.setItem(key, JSON.stringify(value || {}));
  } catch(e){}
}

function canonicalState(status){
  var s = String(status || '').toLowerCase().replace(/_/g, '-');
  if(s === 'draft') return 'controlled-draft';
  if(s === 'approved' || s === 'live') return 'published';
  if(s === 'blocked') return 'publish-blocked';
  if(s === 'legacy') return 'legacy-bridged';
  return TEMPLATE_STATES.indexOf(s) >= 0 ? s : 'legacy-bridged';
}

function normalizeTitle(value, fallback){
  if(value && typeof value === 'object'){
    return {
      vi: String(value.vi || value.en || fallback || ''),
      en: String(value.en || value.vi || fallback || '')
    };
  }
  return { vi:String(value || fallback || ''), en:String(value || fallback || '') };
}

function ownerForTemplate(tpl){
  var cat = String(tpl.category || '').toLowerCase();
  if(tpl.owner) return tpl.owner;
  if(cat === 'quality' || cat === 'document') return 'Quality Systems';
  if(cat === 'production') return 'MES Platform';
  if(cat === 'admin') return 'Platform Architecture';
  if(cat === 'purchasing' || cat === 'warehouse') return 'Supply Chain Systems';
  return 'HESEM Platform Architecture';
}

function normalizeTemplate(tpl){
  var out = clone(tpl || {}) || {};
  var templateId = String(out.templateId || out.id || '').trim();
  out.id = templateId;
  out.templateId = templateId;
  out.legacyCode = out.legacyCode || (/^T\d+$/i.test(templateId) ? templateId : '');
  out.name = normalizeTitle(out.name, templateId);
  out.desc = normalizeTitle(out.desc, out.name.vi || templateId);
  out.version = String(out.version || out.templateVersion || '1.0.0');
  out.owner = ownerForTemplate(out);
  out.governedModules = (out.governedModules || out.modules || []).slice();
  out.modules = out.governedModules.slice();
  out.zoneCount = Number(out.zoneCount || (out.zones || []).length || 0);
  out.allowedBlocks = out.allowedBlocks || {};
  (out.zoneSettings || []).forEach(function(zone){
    if(zone && zone.name) out.allowedBlocks[zone.name] = zone.allowed || out.allowedBlocks[zone.name] || '';
  });
  if(!out.status){
    if(out.source === 'custom' || /^C\d+/i.test(templateId)) out.status = 'draft-only';
    else if(templateId === 'T13' || templateId === 'T29') out.status = 'published';
    else if(out.governedModules && out.governedModules.length) out.status = 'validated';
    else out.status = 'legacy-bridged';
  }
  out.status = canonicalState(out.status);
  if(!out.controlMode){
    out.controlMode = out.status === 'legacy-bridged' ? 'bridged' : (out.status === 'draft-only' ? 'draft-cache' : 'controlled');
  }
  out.bridgeMode = out.bridgeMode || (out.controlMode === 'bridged' ? 'legacy bridge to shared tokens' : 'admin controlled');
  out.moduleArchetype = out.moduleArchetype || archetypeForTemplate(out);
  out.sourceAuthority = out.sourceAuthority || (out.status === 'draft-only' ? 'local-draft-cache' : 'backend-ready-registry');
  return out;
}

function archetypeForTemplate(tpl){
  var meta = String(tpl.layoutMeta || '').toLowerCase();
  if(meta.indexOf('wizard') >= 0 || meta.indexOf('stepper') >= 0) return 'wizard';
  if(meta.indexOf('kanban') >= 0 || meta.indexOf('pipeline') >= 0) return 'board';
  if(meta.indexOf('chart') >= 0 || meta.indexOf('kpi') >= 0) return 'analytical-dashboard';
  if(meta.indexOf('sidebar') >= 0 && meta.indexOf('form') >= 0) return 'object-page';
  if(meta.indexOf('table') >= 0 || meta.indexOf('list') >= 0) return 'list-report-workspace';
  return 'admin-studio';
}

function mergeDraftAndPreviewTemplates(seedTemplates){
  var map = {};
  (seedTemplates || []).forEach(function(tpl){
    var normalized = normalizeTemplate(tpl);
    if(normalized.templateId) map[normalized.templateId] = normalized;
  });

  var preview = safeRead(PREVIEW_CACHE_KEY);
  Object.keys(preview || {}).forEach(function(id){
    var tpl = normalizeTemplate(preview[id]);
    tpl.status = tpl.status === 'draft-only' ? 'draft-only' : canonicalState(tpl.status || 'legacy-bridged');
    tpl.sourceAuthority = 'preview-cache';
    map[id] = Object.assign({}, map[id] || {}, tpl);
  });

  var drafts = safeRead(DRAFT_CACHE_KEY);
  Object.keys(drafts || {}).forEach(function(id){
    var tpl = normalizeTemplate(drafts[id]);
    tpl.status = 'draft-only';
    tpl.controlMode = 'draft-cache';
    tpl.sourceAuthority = 'unsaved-draft-cache';
    map[id] = Object.assign({}, map[id] || {}, tpl);
  });

  (_state.templates || []).forEach(function(tpl){
    var normalized = normalizeTemplate(tpl);
    if(normalized.templateId) map[normalized.templateId] = Object.assign({}, map[normalized.templateId] || {}, normalized);
  });

  return Object.keys(map).sort(function(a, b){ return a.localeCompare(b); }).map(function(id){ return map[id]; });
}

function fallbackModules(){
  return [
    {
      moduleId:'M2-orders',
      moduleName:{vi:'Đơn hàng',en:'Orders'},
      route:'/orders',
      templateId:'T13',
      templateVersion:'1.0.0',
      criticality:'regulated',
      screens:['overview','order-detail','contract-review','shipment'],
      blockFamilies:['kpi-row','filter-bar','data-table','detail-panel','status-flow','audit-timeline'],
      consumesHmComponents:true,
      consumesSharedTokens:true,
      usesPrivateCssShell:false
    },
    {
      moduleId:'M4-purchasing',
      moduleName:{vi:'Mua hàng & IQC',en:'Purchasing & IQC'},
      route:'/purchasing',
      templateId:'T29',
      templateVersion:'1.0.0',
      criticality:'regulated',
      screens:['overview','po-detail','iqc','supplier-evidence'],
      blockFamilies:['info-banner','filter-bar','data-table','form','status-flow','evidence-list'],
      consumesHmComponents:true,
      consumesSharedTokens:true,
      usesPrivateCssShell:false
    },
    {
      moduleId:'mes',
      moduleName:{vi:'Trung tâm điều hành MES',en:'MES Control Center'},
      route:'/mes',
      templateId:'T37',
      templateVersion:'1.0.0',
      criticality:'shopfloor-critical',
      screens:['machine-grid','job-queue','andon-alerts'],
      blockFamilies:['kpi-row','machine-grid','andon-alert','data-table'],
      consumesHmComponents:true,
      consumesSharedTokens:true,
      usesPrivateCssShell:false
    },
    {
      moduleId:'mobile-shopfloor',
      moduleName:{vi:'Xưởng di động',en:'Shop Floor Mobile'},
      route:'/mobile-shopfloor',
      templateId:'T38',
      templateVersion:'1.0.0',
      criticality:'shopfloor-critical',
      screens:['operator-current-job','scan','handover'],
      blockFamilies:['operator-card','large-action-button','scanner-input','status-banner'],
      consumesHmComponents:false,
      consumesSharedTokens:true,
      usesPrivateCssShell:true
    },
    {
      moduleId:'forms',
      moduleName:{vi:'Kiểm soát chứng cứ',en:'Evidence Control'},
      route:'/forms',
      templateId:'T99',
      templateVersion:'1.0.0',
      criticality:'regulated',
      screens:['form-list','form-entry','evidence-vault'],
      blockFamilies:['data-table','form','evidence-list','signature-panel'],
      consumesHmComponents:true,
      consumesSharedTokens:true,
      usesPrivateCssShell:false
    },
    {
      moduleId:'compliance-reports',
      moduleName:{vi:'Báo cáo tuân thủ',en:'Compliance Reports'},
      route:'/compliance-reports',
      templateId:'T97',
      templateVersion:'1.0.0',
      criticality:'regulated',
      screens:['report-index','report-viewer','export'],
      blockFamilies:['report-canvas','tabs','kpi-row','data-table','progress'],
      consumesHmComponents:true,
      consumesSharedTokens:true,
      usesPrivateCssShell:false
    },
    {
      moduleId:'schema-studio',
      moduleName:{vi:'Schema Studio',en:'Schema Studio'},
      route:'/schema-studio',
      templateId:'T112',
      templateVersion:'1.0.0',
      criticality:'admin',
      screens:['design-list','compiler','release-gates'],
      blockFamilies:['data-table','editor','diagnostics-panel','release-gate'],
      consumesHmComponents:true,
      consumesSharedTokens:true,
      usesPrivateCssShell:false
    }
  ];
}

function normalizeModule(schema){
  var moduleId = String(schema.moduleId || schema.id || '').trim();
  if(!moduleId) return null;
  var screens = [];
  var blockFamilies = {};
  (schema.tabs || []).forEach(function(tab){
    screens.push(String(tab.tabId || tab.id || tab.title && tab.title.en || 'screen'));
    (tab.blocks || []).forEach(function(block){
      if(block && block.type) blockFamilies[String(block.type)] = true;
    });
  });
  var title = normalizeTitle(schema.title || schema.moduleName || moduleId, moduleId);
  var criticality = schema.criticality || '';
  var hay = [moduleId, schema.route, title.vi, title.en, (schema.contractRefs || []).join(' ')].join(' ').toLowerCase();
  if(!criticality && /(quality|qms|iqc|evidence|compliance|order|purchase|signature|audit)/.test(hay)) criticality = 'regulated';
  if(!criticality && /(mes|shopfloor|operator|andon|machine)/.test(hay)) criticality = 'shopfloor-critical';
  return {
    moduleId: moduleId,
    moduleName: title,
    route: schema.route || '/' + moduleId,
    templateId: schema.templateId || '',
    templateVersion: String(schema.templateVersion || schema.version || '1.0.0'),
    criticality: criticality || 'standard',
    screens: screens.length ? screens : ['default'],
    blockFamilies: Object.keys(blockFamilies),
    consumesHmComponents: schema.consumesHmComponents !== false,
    consumesSharedTokens: schema.consumesSharedTokens !== false,
    usesPrivateCssShell: schema.usesPrivateCssShell === true
  };
}

function mergeModules(modules){
  var map = {};
  fallbackModules().forEach(function(m){ map[m.moduleId] = clone(m); });
  (modules || []).forEach(function(m){
    var n = normalizeModule(m);
    if(n) map[n.moduleId] = Object.assign({}, map[n.moduleId] || {}, n);
  });
  return Object.keys(map).sort(function(a, b){ return a.localeCompare(b); }).map(function(id){ return map[id]; });
}

function fallbackCompliance(modules){
  return (modules || fallbackModules()).map(function(module){
    var status = 'full-admin-controlled';
    var selectorDebt = module.usesPrivateCssShell ? 28 : (module.moduleId === 'schema-studio' ? 4 : 2);
    var privateTokenDebt = module.usesPrivateCssShell ? 9 : 0;
    var hardcodedStyleDebt = module.usesPrivateCssShell ? 16 : (module.moduleId === 'M2-orders' ? 3 : 1);
    var reason = 'Compliant: consumes shared tokens and governed hm-* component contracts.';
    if(module.usesPrivateCssShell){
      status = 'legacy-private-css';
      reason = 'Non-compliant: module still carries a private visual shell; bridge tokens are present but shell extraction is required.';
    } else if(!module.consumesHmComponents && module.consumesSharedTokens){
      status = 'bridged-to-shared-tokens';
      reason = 'Partial: token bridge exists, but shared hm-* component adoption is incomplete.';
    }
    return {
      moduleId: module.moduleId,
      moduleName: module.moduleName,
      route: module.route,
      templateId: module.templateId,
      linkageStatus: status,
      selectorDebt: selectorDebt,
      privateTokenDebt: privateTokenDebt,
      hardcodedStyleDebt: hardcodedStyleDebt,
      consumesHmComponents: module.consumesHmComponents === true,
      consumesSharedTokens: module.consumesSharedTokens === true,
      usesPrivateCssShell: module.usesPrivateCssShell === true,
      reason: reason
    };
  });
}

function defaultAudit(){
  return [
    {
      at:'2026-04-11T00:00:00+07:00',
      actor:'HESEM Platform Architecture',
      action:'frontend-authority-linked',
      subject:'standards/36-frontend-module-layout-template-standard.md',
      result:'required-standard'
    },
    {
      at:'2026-04-05T00:00:00+07:00',
      actor:'Design authority',
      action:'graphics-governance-adopted',
      subject:'mom/docs/document-graphics-governance-2026-04-05.md',
      result:'admin-appearance-governance-console'
    }
  ];
}

function firstArray(){
  for(var i = 0; i < arguments.length; i++){
    if(Array.isArray(arguments[i])) return arguments[i];
  }
  return null;
}

function normalizeComplianceRows(remote){
  var rows = firstArray(
    remote,
    remote && remote.matrix,
    remote && remote.modules,
    remote && remote.rows
  );
  if(!rows) return null;
  return rows.map(function(row){
    row = row || {};
    var findings = Array.isArray(row.findings) ? row.findings : [];
    var findingCodes = findings.map(function(f){ return f && (f.code || f.message) || ''; }).filter(Boolean);
    var blocker = row.linkageStatus === 'blocked' || findings.some(function(f){
      return String(f && f.severity || '').toLowerCase() === 'blocker';
    });
    var linkage = row.linkageStatus || (row.compliant === true ? 'full-admin-controlled' : (blocker ? 'blocked' : 'bridged-to-shared-tokens'));
    var blockFamilies = Array.isArray(row.blockFamilies) ? row.blockFamilies : [];
    return Object.assign({}, row, {
      moduleId: String(row.moduleId || row.module || ''),
      route: String(row.route || ''),
      linkageStatus: linkage,
      selectorDebt: Number(row.selectorDebt || (row.compliant === false ? findings.length || 1 : 0)),
      privateTokenDebt: Number(row.privateTokenDebt || 0),
      hardcodedStyleDebt: Number(row.hardcodedStyleDebt || 0),
      consumesHmComponents: row.consumesHmComponents !== undefined ? !!row.consumesHmComponents : blockFamilies.length > 0,
      consumesSharedTokens: row.consumesSharedTokens !== undefined ? !!row.consumesSharedTokens : row.compliant === true,
      usesPrivateCssShell: row.usesPrivateCssShell !== undefined ? !!row.usesPrivateCssShell : linkage === 'legacy-private-css',
      reason: row.reason || (findingCodes.length ? findingCodes.join(', ') : (row.compliant === true ? 'Backend compliance matrix reports no findings.' : 'Backend compliance matrix reports unresolved graphics findings.'))
    });
  });
}

function normalizeAuditRows(remote){
  var rows = firstArray(
    remote,
    remote && remote.events,
    remote && remote.audit,
    remote && remote.rows
  );
  if(!rows) return null;
  return rows.map(function(row){
    row = row || {};
    return {
      at: row.at || row.createdAt || row.created_at || row.timestamp || row.time || '',
      actor: row.actor || row.actorName || row.actor_name || row.user || row.username || '-',
      action: row.action || row.event || row.eventType || row.event_type || row.name || '-',
      subject: row.subject || row.aggregateId || row.aggregate_id || row.targetId || row.target_id || '-',
      result: row.result || row.status || row.outcome || 'recorded'
    };
  });
}

function normalizeWaiverRows(remote){
  var rows = firstArray(
    remote,
    remote && remote.waivers,
    remote && remote.rows
  );
  if(!rows) return null;
  return rows.map(function(row){
    row = row || {};
    return Object.assign({}, row, {
      waiverId: row.waiverId || row.id || '',
      subjectId: row.subjectId || row.targetId || row.templateId || row.moduleId || '',
      reasonText: row.reasonText || row.reason || '',
      status: row.status || 'recorded'
    });
  });
}

function apiUrl(endpoint){
  return 'api.php?action=' + encodeURIComponent(endpoint.action);
}

function callEndpoint(name, payload){
  var endpoint = ENDPOINTS[name];
  if(!endpoint || !window.fetch) return Promise.reject(new Error('endpoint_unavailable'));
  var opts = {
    method: endpoint.method || 'GET',
    headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
    credentials: 'same-origin'
  };
  if(opts.method !== 'GET') opts.body = JSON.stringify(payload || {});
  return fetch(apiUrl(endpoint), opts).then(function(res){
    if(!res.ok) throw new Error('http_' + res.status);
    return res.json();
  }).then(function(json){
    _state.endpointStatus[name] = 'online';
    _state.backendAvailable = true;
    return json && json.data !== undefined ? json.data : json;
  }).catch(function(err){
    _state.endpointStatus[name] = 'fallback: ' + (err && err.message ? err.message : 'unavailable');
    throw err;
  });
}

function fetchLocalModule(path){
  if(!window.fetch) return Promise.reject(new Error('fetch_unavailable'));
  return fetch(path, { cache:'no-store' }).then(function(res){
    if(!res.ok) throw new Error('http_' + res.status);
    return res.json();
  });
}

function refresh(seedTemplates){
  if(_state.loading) return Promise.resolve(getSnapshot(seedTemplates));
  _state.loading = true;
  var localModules = Promise.all([
    fetchLocalModule('data/modules/M2-orders.json').catch(function(){ return null; }),
    fetchLocalModule('data/modules/M4-purchasing.json').catch(function(){ return null; })
  ]).then(function(list){ return list.filter(Boolean); }).catch(function(){ return []; });

  var registry = callEndpoint('templateRegistry', {}).catch(function(){ return null; });
  var compliance = callEndpoint('complianceMatrix', {}).catch(function(){ return null; });
  var drift = callEndpoint('driftReport', {}).catch(function(){ return null; });
  var audit = callEndpoint('auditHistory', {}).catch(function(){ return null; });
  var waivers = callEndpoint('activeWaivers', {}).catch(function(){ return null; });

  return Promise.all([registry, compliance, drift, audit, waivers, localModules]).then(function(parts){
    var remoteRegistry = parts[0];
    var remoteCompliance = parts[1];
    var remoteDrift = parts[2];
    var remoteAudit = parts[3];
    var remoteWaivers = parts[4];
    var localSchemas = parts[5];
    var complianceRows = normalizeComplianceRows(remoteCompliance);
    var auditRows = normalizeAuditRows(remoteAudit);
    var waiverRows = normalizeWaiverRows(remoteWaivers);
    if(remoteRegistry && Array.isArray(remoteRegistry.templates)){
      _state.templates = remoteRegistry.templates.map(normalizeTemplate);
      _state.registryAuthority = 'backend';
    } else {
      _state.templates = [];
      _state.registryAuthority = 'fallback-seed';
    }
    _state.modules = mergeModules(remoteRegistry && remoteRegistry.modules ? remoteRegistry.modules : localSchemas);
    _state.compliance = complianceRows || fallbackCompliance(_state.modules);
    _state.drift = remoteDrift && remoteDrift.drift ? remoteDrift.drift : (remoteDrift || null);
    _state.audit = auditRows || defaultAudit();
    _state.waivers = waiverRows || _state.waivers || [];
    _state.loaded = true;
    _state.loading = false;
    _state.lastLoadedAt = nowIso();
    _state.lastImpact = computeImpact(_state.lastChange, seedTemplates);
    return getSnapshot(seedTemplates);
  }).catch(function(){
    _state.modules = mergeModules([]);
    _state.compliance = fallbackCompliance(_state.modules);
    _state.drift = null;
    _state.audit = defaultAudit();
    _state.loaded = true;
    _state.loading = false;
    _state.lastLoadedAt = nowIso();
    _state.lastImpact = computeImpact(_state.lastChange, seedTemplates);
    return getSnapshot(seedTemplates);
  });
}

function getSnapshot(seedTemplates){
  if(!_state.modules || !_state.modules.length) _state.modules = mergeModules([]);
  if(!_state.compliance || !_state.compliance.length) _state.compliance = fallbackCompliance(_state.modules);
  if(!_state.audit || !_state.audit.length) _state.audit = defaultAudit();
  var templates = mergeDraftAndPreviewTemplates(seedTemplates || []);
  return {
    version: VERSION,
    endpoints: clone(ENDPOINTS),
    templateStates: TEMPLATE_STATES.slice(),
    registryAuthority: _state.registryAuthority,
    endpointStatus: clone(_state.endpointStatus),
    backendAvailable: _state.backendAvailable,
    lastLoadedAt: _state.lastLoadedAt,
    templates: templates,
    modules: clone(_state.modules),
    compliance: clone(_state.compliance),
    drift: clone(_state.drift),
    audit: clone(_state.audit),
    waivers: clone(_state.waivers),
    rolloutsByTemplate: clone(_state.rolloutsByTemplate),
    lastChange: clone(_state.lastChange),
    impact: clone(_state.lastImpact || computeImpact(_state.lastChange, seedTemplates || []))
  };
}

function blockFamiliesForChange(change){
  var path = String(change && (change.path || change.target || '') || '').toLowerCase();
  if(/table/.test(path)) return ['data-table','pagination','filter-bar'];
  if(/button|action/.test(path)) return ['button','large-action-button','toolbar'];
  if(/input|field|form/.test(path)) return ['form','filter-bar','scanner-input'];
  if(/tab/.test(path)) return ['tabs','navigation'];
  if(/modal|dialog/.test(path)) return ['modal','signature-panel'];
  if(/kpi/.test(path)) return ['kpi-row','metric-card'];
  if(/theme|color|brand|surface|status/.test(path)) return ['all-visual-blocks'];
  if(/zone|allowed/.test(path)) return ['template-zone','allowed-blocks'];
  return ['shared-token-consumers'];
}

function modulesForTemplate(templateId, templates){
  var tid = String(templateId || '');
  var modules = (_state.modules && _state.modules.length ? _state.modules : mergeModules([]));
  var tpl = (templates || []).find(function(item){ return String(item.templateId || item.id) === tid; });
  var governed = {};
  if(tpl) (tpl.governedModules || tpl.modules || []).forEach(function(m){ governed[String(m)] = true; });
  return modules.filter(function(module){
    return String(module.templateId || '') === tid || governed[module.moduleId] || governed[module.route];
  });
}

function computeImpact(change, seedTemplates){
  var snapshotTemplates = mergeDraftAndPreviewTemplates(seedTemplates || []);
  var modules = (_state.modules && _state.modules.length ? _state.modules : mergeModules([]));
  var kind = String(change && change.kind || 'template-registry');
  var target = String(change && change.target || '');
  var affected = [];
  if(kind.indexOf('template') === 0){
    affected = modulesForTemplate(target, snapshotTemplates);
  } else {
    affected = modules.filter(function(module){
      if(kind === 'component-contract') return module.consumesHmComponents || module.consumesSharedTokens;
      if(kind === 'theme-preset' || kind === 'token') return module.consumesSharedTokens;
      return true;
    });
  }
  if(!affected.length && modules.length) affected = modules.slice(0, Math.min(4, modules.length));

  var routes = {};
  var screens = {};
  var families = {};
  var regulated = [];
  var shopfloor = [];
  affected.forEach(function(module){
    routes[module.route || ('/' + module.moduleId)] = true;
    (module.screens || []).forEach(function(screen){ screens[module.moduleId + ':' + screen] = true; });
    (module.blockFamilies || []).forEach(function(fam){ families[fam] = true; });
    if(String(module.criticality || '').indexOf('regulated') >= 0) regulated.push(module);
    if(String(module.criticality || '').indexOf('shopfloor') >= 0) shopfloor.push(module);
  });
  blockFamiliesForChange(change).forEach(function(fam){ families[fam] = true; });

  var gates = ['template-registry-schema','token-lint','wcag-aa-contrast','keyboard-focus','visual-regression'];
  if(kind.indexOf('template') === 0) gates.push('zone-allowed-block-validation');
  if(kind === 'component-contract') gates.push('component-contract-snapshot');
  if(regulated.length) gates.push('regulated-traceability-evidence');
  if(shopfloor.length) gates.push('shopfloor-kiosk-smoke');

  var blockers = [];
  if(!_state.backendAvailable) blockers.push('Backend authority endpoint unavailable: publish/apply must remain blocked.');
  if(regulated.length) blockers.push('Regulated modules touched: audit evidence and rollback manifest required.');
  if(shopfloor.length) blockers.push('Shopfloor modules touched: kiosk/mobile smoke gate required.');

  return {
    kind: kind,
    target: target,
    label: change && change.label || target || kind,
    affectedModules: affected.map(function(module){ return module.moduleId; }),
    affectedRoutes: Object.keys(routes),
    affectedScreens: Object.keys(screens),
    affectedBlockFamilies: Object.keys(families),
    regulatedModules: regulated.map(function(module){ return module.moduleId; }),
    shopfloorModules: shopfloor.map(function(module){ return module.moduleId; }),
    gatesToRerun: gates,
    releaseBlockerSummary: blockers.length ? blockers.join(' ') : 'No frontend blocker detected in current snapshot.',
    computedAt: nowIso()
  };
}

function impactEndpointForChange(change){
  var kind = String(change && change.kind || '');
  if(kind === 'component-contract') return 'impactComponent';
  if(kind.indexOf('template') === 0) return 'impactTemplate';
  if(kind === 'theme-preset' || kind === 'token') return 'impactToken';
  return '';
}

function impactPayloadForChange(change){
  change = change || {};
  var kind = String(change.kind || '');
  var target = String(change.target || '');
  if(kind === 'component-contract') return { componentId: target, blockType: target };
  if(kind.indexOf('template') === 0) return { templateId: target, impactType: 'template' };
  return {
    tokenKeys: target ? [target] : [],
    tokenGroups: String(change.path || target || '').split('.').filter(Boolean).slice(0, 1),
    impactType: 'token'
  };
}

function normalizeBackendImpact(remote, change, localImpact){
  localImpact = localImpact || {};
  if(!remote || typeof remote !== 'object') return localImpact;
  var affectedModules = remote.affectedModules || [];
  var moduleIds = affectedModules.map(function(row){
    return typeof row === 'string' ? row : String(row && row.moduleId || '');
  }).filter(Boolean);
  return Object.assign({}, localImpact || {}, {
    kind: change && change.kind || remote.analysisType || localImpact.kind,
    target: change && change.target || (remote.subject && (remote.subject.templateId || remote.subject.componentId || (remote.subject.tokenKeys || [])[0])) || localImpact.target,
    label: change && change.label || localImpact.label,
    affectedModules: moduleIds.length ? moduleIds : (localImpact.affectedModules || []),
    affectedRoutes: remote.affectedRoutes || localImpact.affectedRoutes || [],
    affectedScreens: remote.affectedScreens || localImpact.affectedScreens || [],
    affectedBlockFamilies: remote.affectedBlockFamilies || localImpact.affectedBlockFamilies || [],
    regulatedModules: remote.regulatedModulesTouched || remote.regulatedModules || localImpact.regulatedModules || [],
    shopfloorModules: remote.shopfloorModulesTouched || remote.shopfloorModules || localImpact.shopfloorModules || [],
    gatesToRerun: remote.gatesToRerun || localImpact.gatesToRerun || [],
    releaseBlockerSummary: remote.blockers && remote.blockers.length
      ? remote.blockers.map(function(item){ return item.code || item.message || 'backend_blocker'; }).join(', ')
      : (localImpact.releaseBlockerSummary || 'No backend blocker detected.'),
    impactId: remote.impactId || localImpact.impactId || '',
    computedAt: remote.generatedAt || nowIso(),
    backendAttested: true
  });
}

function analyzeImpact(change, seedTemplates){
  var localImpact = markChange(change, seedTemplates || []);
  var endpointName = impactEndpointForChange(_state.lastChange);
  if(!endpointName) return Promise.resolve(localImpact);
  return callEndpoint(endpointName, impactPayloadForChange(_state.lastChange)).then(function(remote){
    _state.lastImpact = normalizeBackendImpact(remote, _state.lastChange, localImpact);
    recordAudit('graphics-impact-analyzed', _state.lastChange.target, 'backend-attested', { impactId:_state.lastImpact.impactId || '' });
    return clone(_state.lastImpact);
  }).catch(function(){
    recordAudit('graphics-impact-analyzed', _state.lastChange.target, 'frontend-fallback');
    return clone(localImpact);
  });
}

function recordAudit(action, subject, result, extra){
  _state.audit = _state.audit || defaultAudit();
  _state.audit.unshift(Object.assign({
    at: nowIso(),
    actor: 'Admin Appearance',
    action: action,
    subject: subject || '',
    result: result || 'recorded'
  }, extra || {}));
}

function markChange(change, seedTemplates){
  _state.lastChange = Object.assign({
    kind:'token',
    target:'',
    label:'',
    source:'admin-appearance'
  }, change || {});
  _state.lastImpact = computeImpact(_state.lastChange, seedTemplates || []);
  return clone(_state.lastImpact);
}

function saveTemplateDraft(template){
  if(!template || !(template.templateId || template.id)) return false;
  var tpl = normalizeTemplate(template);
  tpl.status = 'draft-only';
  tpl.controlMode = 'draft-cache';
  tpl.sourceAuthority = 'unsaved-draft-cache';
  var drafts = safeRead(DRAFT_CACHE_KEY);
  drafts[tpl.templateId] = tpl;
  safeWrite(DRAFT_CACHE_KEY, drafts);
  recordAudit('template-draft-cached', tpl.templateId, 'draft-only');
  markChange({ kind:'template-zone', target:tpl.templateId, label:'Unsaved template draft' });
  return true;
}

function saveTemplatePreview(template){
  if(!template || !(template.templateId || template.id)) return false;
  var tpl = normalizeTemplate(template);
  tpl.sourceAuthority = 'preview-cache';
  var cache = safeRead(PREVIEW_CACHE_KEY);
  cache[tpl.templateId] = tpl;
  safeWrite(PREVIEW_CACHE_KEY, cache);
  recordAudit('template-preview-cached', tpl.templateId, 'preview-only');
  return true;
}

function deleteTemplateDraft(templateId){
  var id = String(templateId || '');
  var drafts = safeRead(DRAFT_CACHE_KEY);
  delete drafts[id];
  safeWrite(DRAFT_CACHE_KEY, drafts);
  recordAudit('template-draft-cleared', id, 'draft-cache-only');
  return true;
}

function templateAction(action, templateId, payload){
  var id = String(templateId || '');
  if(!id) return Promise.resolve({ ok:false, status:'publish-blocked', message:'Missing templateId' });
  var endpointMap = {
    saveDraft:'templateDraftSave',
    validate:'templateValidate',
    publish:'templatePublish',
    stage:'rolloutStage',
    apply:'publishApply',
    rollback:'rollback'
  };
  var endpointName = endpointMap[action];
  if(!endpointName) return Promise.resolve({ ok:false, status:'publish-blocked', message:'Unsupported graphics governance action: ' + action });
  var body = Object.assign({ templateId:id }, payload || {});
  if(action === 'stage'){
    body.impactType = body.impactType || 'template';
    body.scope = body.scope || { templates:[id] };
  }
  if(action === 'publish'){
    body.impactAnalysisId = body.impactAnalysisId || (_state.lastImpact && _state.lastImpact.impactId) || 'frontend-impact-fallback';
    body.blockersResolved = body.blockersResolved !== undefined ? body.blockersResolved : true;
  }
  if((action === 'apply' || action === 'rollback') && !body.rolloutId){
    body.rolloutId = _state.rolloutsByTemplate[id] || '';
  }
  if((action === 'apply' || action === 'rollback') && !body.rolloutId){
    recordAudit('template-' + action, id, 'blocked-rollout-not-staged');
    return Promise.resolve({
      ok:false,
      status:'publish-blocked',
      message:'Stage rollout first; backend apply/rollback requires rolloutId.'
    });
  }
  return callEndpoint(endpointName, body).then(function(data){
    var rollout = data && data.rollout ? data.rollout : null;
    if(rollout && rollout.rolloutId) _state.rolloutsByTemplate[id] = rollout.rolloutId;
    var resultStatus = data && data.status ? canonicalState(data.status)
      : (data && data.template && data.template.status ? canonicalState(data.template.status)
      : (action === 'validate' ? 'validated' : (action === 'apply' || action === 'publish') ? 'published' : action === 'rollback' ? 'validated' : 'controlled-draft'));
    recordAudit('template-' + action, id, resultStatus);
    _state.templates = (_state.templates || []).map(function(tpl){
      if(String(tpl.templateId || tpl.id) === id){
        tpl = normalizeTemplate(tpl);
        tpl.status = resultStatus;
      }
      return tpl;
    });
    return { ok:true, status:resultStatus, data:data || null };
  }).catch(function(){
    var blocked = action === 'apply' || action === 'stage' || action === 'rollback' || action === 'saveDraft';
    var resultStatus = blocked ? 'publish-blocked' : 'validated';
    recordAudit('template-' + action, id, blocked ? 'blocked-backend-unavailable' : resultStatus);
    return {
      ok: !blocked,
      status: resultStatus,
      message: blocked ? 'Backend authority endpoint unavailable; local cache was not promoted to authority.' : 'Frontend validation completed without backend attestation.'
    };
  });
}

function requestWaiver(payload){
  payload = payload || {};
  var targetId = payload.targetId || payload.subjectId || payload.templateId || payload.moduleId || '';
  var expires = payload.expiresAt;
  if(!expires){
    var d = new Date();
    d.setDate(d.getDate() + 30);
    expires = d.toISOString();
  }
  var waiver = Object.assign({
    waiverId:'WV-' + String(Date.now()).slice(-8),
    at: nowIso(),
    scope: payload.scope || 'graphics-governance',
    targetId: targetId || 'graphics-control-plane',
    subjectId: targetId || payload.subjectId || 'graphics-control-plane',
    reason: payload.reason || payload.reasonText || 'Graphics exception requires review before rollout.',
    reasonText: payload.reasonText || payload.reason || 'Graphics exception requires review before rollout.',
    expiresAt: expires,
    status:'requested'
  }, payload);
  return callEndpoint('waiverRequest', waiver).then(function(data){
    var backendWaiver = data && data.waiver ? data.waiver : {};
    _state.waivers.unshift(Object.assign({}, waiver, backendWaiver, normalizeWaiverRows([Object.assign({}, waiver, backendWaiver)])[0], { status:(backendWaiver.status || 'submitted') }));
    recordAudit('waiver-requested', waiver.subjectId || waiver.templateId || waiver.moduleId || waiver.waiverId, 'submitted');
    return { ok:true, waiver:waiver };
  }).catch(function(){
    _state.waivers.unshift(Object.assign({}, waiver, { status:'draft-only' }));
    recordAudit('waiver-request-cached', waiver.subjectId || waiver.templateId || waiver.moduleId || waiver.waiverId, 'draft-only');
    return { ok:false, waiver:waiver, message:'Backend waiver endpoint unavailable; request remains a local draft.' };
  });
}

window.HmGraphicsGovernance = {
  VERSION: VERSION,
  ENDPOINTS: ENDPOINTS,
  TEMPLATE_STATES: TEMPLATE_STATES,
  refresh: refresh,
  getSnapshot: getSnapshot,
  getTemplateRegistry: function(seedTemplates){ return getSnapshot(seedTemplates).templates; },
  getModulesForTemplate: function(templateId, seedTemplates){ return modulesForTemplate(templateId, mergeDraftAndPreviewTemplates(seedTemplates || [])); },
  getComplianceMatrix: function(){ return clone(_state.compliance && _state.compliance.length ? _state.compliance : fallbackCompliance(mergeModules([]))); },
  computeImpact: computeImpact,
  markChange: markChange,
  analyzeImpact: analyzeImpact,
  saveTemplateDraft: saveTemplateDraft,
  saveTemplatePreview: saveTemplatePreview,
  deleteTemplateDraft: deleteTemplateDraft,
  getDraftCache: function(){ return safeRead(DRAFT_CACHE_KEY); },
  replaceDraftCache: function(next){ safeWrite(DRAFT_CACHE_KEY, next || {}); recordAudit('template-draft-cache-imported', 'draft-cache', 'draft-only'); },
  getPreviewCache: function(){ return safeRead(PREVIEW_CACHE_KEY); },
  replacePreviewCache: function(next){ safeWrite(PREVIEW_CACHE_KEY, next || {}); recordAudit('template-preview-cache-imported', 'preview-cache', 'preview-only'); },
  templateAction: templateAction,
  requestWaiver: requestWaiver
};

})();
