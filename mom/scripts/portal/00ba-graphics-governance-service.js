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
var VERSION = '20260413b';

var ENDPOINTS = {
  designConfig:      { method:'GET',  action:'admin_design_config' },
  designConfigSave:  { method:'POST', action:'admin_design_config_save' },
  templateRegistry:  { method:'GET',  action:'admin_template_registry_get' },
  templateGet:       { method:'GET',  action:'admin_template_get' },
  templateDraftSave: { method:'POST', action:'admin_template_draft_save' },
  templateValidate:  { method:'POST', action:'admin_template_validate' },
  templatePublish:   { method:'POST', action:'admin_template_publish' },
  templateDeprecate: { method:'POST', action:'admin_template_deprecate' },
  templateModules:   { method:'GET',  action:'admin_template_modules_get' },
  impactToken:       { method:'POST', action:'admin_graphics_impact_token' },
  impactTemplate:    { method:'POST', action:'admin_graphics_impact_template' },
  impactComponent:   { method:'POST', action:'admin_graphics_impact_component' },
  complianceMatrix:  { method:'GET',  action:'admin_graphics_compliance_get' },
  nonCompliant:      { method:'GET',  action:'admin_graphics_non_compliant_get' },
  debtReport:        { method:'GET',  action:'admin_graphics_debt_get' },
  driftReport:       { method:'GET',  action:'admin_graphics_drift_get' },
  rolloutStage:      { method:'POST', action:'admin_graphics_rollout_stage' },
  publishApply:      { method:'POST', action:'admin_graphics_rollout_apply' },
  rollback:          { method:'POST', action:'admin_graphics_rollout_rollback' },
  auditHistory:      { method:'GET',  action:'admin_graphics_audit_history_get' },
  waiverRequest:     { method:'POST', action:'admin_graphics_waiver_create' },
  waiverApprove:     { method:'POST', action:'admin_graphics_waiver_approve' },
  waiverExpire:      { method:'POST', action:'admin_graphics_waiver_expire' },
  activeWaivers:     { method:'GET',  action:'admin_graphics_waiver_active_get' },
  releaseBlockers:   { method:'GET',  action:'admin_graphics_release_blockers_get' },
  changeSet:         { method:'GET',  action:'admin_graphics_change_set_get' },
  lineageGraph:      { method:'GET',  action:'admin_graphics_lineage_get' },
  runtimeBeacon:     { method:'GET',  action:'admin_graphics_runtime_beacon_get' },
  debtObservatory:   { method:'GET',  action:'admin_graphics_debt_observatory_get' },
  environmentPacks:  { method:'GET',  action:'admin_graphics_environment_policy_packs_get' },
  releaseDashboard:  { method:'GET',  action:'admin_graphics_release_dashboard_get' }
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
  designConfigVersion: '',
  designConfigEtag: '',
  registryVersion: '',
  registryEtag: '',
  waiverVersion: '',
  waiverEtag: '',
  templates: [],
  modules: [],
  compliance: [],
  drift: null,
  debt: null,
  releaseBlockers: [],
  changeSet: null,
  lineageGraph: null,
  runtimeBeacon: null,
  debtObservatory: null,
  environmentPolicyPacks: null,
  releaseDashboard: null,
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

function normalizeDensity(value){
  var density = String(value || 'default').toLowerCase();
  if(density === 'dense') return 'compact';
  if(['compact','default','comfortable','shopfloor'].indexOf(density) >= 0) return density;
  return 'default';
}

function zoneIdOf(zone){
  if(zone && typeof zone === 'object') return String(zone.zoneId || zone.name || zone.id || zone.type || '').trim();
  return String(zone || '').trim();
}

function allowedBlocksForZone(tpl, zoneId){
  var source = tpl && tpl.allowedBlocksByZone && tpl.allowedBlocksByZone[zoneId] !== undefined
    ? tpl.allowedBlocksByZone[zoneId]
    : (tpl && tpl.allowedBlocks && tpl.allowedBlocks[zoneId] !== undefined ? tpl.allowedBlocks[zoneId] : '');
  if(Array.isArray(source)) return source.map(String).filter(Boolean);
  return String(source || '').split(/[,;|]/).map(function(item){ return item.trim(); }).filter(Boolean);
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
  out.name = normalizeTitle(out.name || out.title || out.displayName, out.canonicalId || templateId);
  out.desc = normalizeTitle(out.desc || out.description, out.name.vi || templateId);
  out.version = String(out.version || out.templateVersion || '1.0.0');
  out.owner = ownerForTemplate(out);
  var adoptionModules = out.adoption && (out.adoption.modules || out.adoption);
  out.governedModules = (out.governedModules || out.modules || adoptionModules || []).slice();
  out.modules = out.governedModules.slice();
  var rawZones = Array.isArray(out.zones) ? out.zones.slice() : [];
  var zoneNames = rawZones.map(zoneIdOf).filter(Boolean);
  var zoneSettings = Array.isArray(out.zoneSettings) && out.zoneSettings.length
    ? out.zoneSettings.map(function(zone){ return Object.assign({}, zone); })
    : rawZones.map(function(zone){
        var zoneId = zoneIdOf(zone);
        var type = zone && typeof zone === 'object' ? String(zone.type || zoneId) : zoneId;
        return {
          name: zoneId,
          type: type,
          scroll: (zoneId === 'main' || zoneId === 'primary' || zoneId === 'sidebar') ? 'data-only' : 'sticky',
          allowed: allowedBlocksForZone(out, zoneId).join(', ')
        };
      });
  out.zones = zoneNames;
  out.zoneSettings = zoneSettings;
  out.zoneCount = Number(out.zoneCount || zoneNames.length || 0);
  out.allowedBlocks = out.allowedBlocks || {};
  (out.zoneSettings || []).forEach(function(zone){
    if(zone && zone.name) out.allowedBlocks[zone.name] = zone.allowed || out.allowedBlocks[zone.name] || '';
  });
  out.defaultDensity = normalizeDensity(out.defaultDensity || out.density);
  out.density = out.density || out.defaultDensity;
  out.supportedDensities = Array.isArray(out.supportedDensities) && out.supportedDensities.length
    ? out.supportedDensities.map(normalizeDensity)
    : ['compact','default','comfortable','shopfloor'];
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
  if(!out.regulatedCompatibility){
    out.regulatedCompatibility = out.governedModules.some(function(moduleId){
      return /quality|qms|eqms|document|compliance/i.test(String(moduleId || ''));
    }) ? 'explicit-required' : 'not-regulated';
  }
  if(!out.shopfloorCompatibility){
    out.shopfloorCompatibility = out.governedModules.some(function(moduleId){
      return /production|shopfloor|mes|dispatch|execution|line/i.test(String(moduleId || ''));
    }) ? 'explicit-required' : 'standard-compatible';
  }
  out.sourceAuthority = out.sourceAuthority || (out.status === 'draft-only' ? 'local-draft-cache' : 'frontend-fallback-seed');
  return out;
}

function backendStatusForTemplate(status, action){
  var s = canonicalState(status);
  if(action === 'publish' || s === 'published') return 'approved';
  if(s === 'deprecated') return 'deprecated';
  if(s === 'legacy-bridged') return 'deprecated';
  return 'draft';
}

function toBackendTemplate(template, action){
  var tpl = normalizeTemplate(template);
  var zoneSettings = Array.isArray(tpl.zoneSettings) && tpl.zoneSettings.length
    ? tpl.zoneSettings
    : (tpl.zones || []).map(function(zone){ return { name:zoneIdOf(zone), type:zoneIdOf(zone), allowed:'' }; });
  var allowedBlocksByZone = {};
  var zones = zoneSettings.map(function(zone){
    var zoneId = zoneIdOf(zone.name || zone.zoneId || zone);
    allowedBlocksByZone[zoneId] = allowedBlocksForZone(tpl, zoneId);
    if(!allowedBlocksByZone[zoneId].length && zone.allowed) allowedBlocksByZone[zoneId] = allowedBlocksForZone({ allowedBlocks:{ [zoneId]:zone.allowed } }, zoneId);
    return {
      zoneId: zoneId,
      type: String(zone.type || zoneId),
      required: zone.required === true
    };
  }).filter(function(zone){ return zone.zoneId; });
  return Object.assign({}, tpl, {
    status: backendStatusForTemplate(tpl.status, action),
    description: tpl.description || tpl.desc || tpl.name,
    zones: zones,
    allowedZones: zones.map(function(zone){ return zone.zoneId; }),
    allowedBlocksByZone: allowedBlocksByZone,
    allowedBlocks: Object.keys(allowedBlocksByZone).reduce(function(acc, zoneId){
      allowedBlocksByZone[zoneId].forEach(function(block){ if(acc.indexOf(block) < 0) acc.push(block); });
      return acc;
    }, []),
    defaultDensity: normalizeDensity(tpl.defaultDensity || tpl.density),
    supportedDensities: (tpl.supportedDensities || ['compact','default','comfortable','shopfloor']).map(normalizeDensity),
    themePolicy: tpl.themePolicy || {
      modes:['light','dark','high-contrast'],
      tokenSource:'admin/shared-token-layer',
      inlineStylePolicy:'forbidden-without-waiver',
      requiredTokenGroups:['color','surface','spacing','radius','shadow','type','state']
    },
    responsivePolicy: tpl.responsivePolicy || {
      breakpoints:['320','390','768','1024','1440','1920'],
      zoomLevels:['100','200','400'],
      reflowRequirement:'No horizontal scroll except intentional data-grid overflow with keyboard-accessible sticky controls.'
    },
    qaEvidence: tpl.qaEvidence || {
      status:'IMPLEMENTED',
      gateRef:'mom/design/qa-gates.json',
      validator:'mom/tools/design/validate-frontend-contracts.mjs'
    },
    governedModules: tpl.governedModules || [],
    regulatedCompatibility: tpl.regulatedCompatibility || 'not-regulated',
    shopfloorCompatibility: tpl.shopfloorCompatibility || 'standard-compatible',
    updatedBy: tpl.updatedBy || 'Admin Appearance',
    updatedAt: tpl.updatedAt || nowIso(),
    evidenceRefs: tpl.evidenceRefs || []
  });
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
    if(_state.registryAuthority !== 'backend'){
      normalized.sourceAuthority = 'frontend-fallback-seed';
      if(normalized.controlMode === 'controlled') normalized.controlMode = 'preview-seed';
    }
    if(normalized.templateId) map[normalized.templateId] = normalized;
  });

  (_state.templates || []).forEach(function(tpl){
    var normalized = normalizeTemplate(tpl);
    if(_state.registryAuthority === 'backend'){
      normalized.sourceAuthority = normalized.sourceAuthority === 'frontend-fallback-seed'
        ? 'backend-graphics-authority'
        : (normalized.sourceAuthority || 'backend-graphics-authority');
      if(normalized.controlMode === 'preview-seed') normalized.controlMode = normalized.status === 'draft-only' ? 'draft-cache' : 'controlled';
    }
    if(normalized.templateId) map[normalized.templateId] = Object.assign({}, map[normalized.templateId] || {}, normalized);
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
      status: status,
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
      status: row.status || linkage,
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

function apiUrl(endpoint, payload){
  var url = 'api.php?action=' + encodeURIComponent(endpoint.action);
  if(String(endpoint.method || 'GET').toUpperCase() === 'GET'){
    Object.keys(payload || {}).forEach(function(key){
      var value = payload[key];
      if(value === undefined || value === null || value === '') return;
      if(typeof value === 'object') value = JSON.stringify(value);
      url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(String(value));
    });
  }
  return url;
}

function csrfHeaderValue(){
  var meta = document.querySelector && document.querySelector('meta[name="csrf-token"]');
  return (typeof csrfToken !== 'undefined' && csrfToken) || window.csrfToken || (meta && meta.content) || '';
}

function attachConcurrency(name, payload, headers){
  payload = payload || {};
  var expected = payload.expectedVersion || '';
  if(!expected && /^(templateDraftSave|templatePublish|templateDeprecate|rolloutStage|publishApply|rollback)$/.test(name)){
    expected = _state.registryEtag || _state.registryVersion || '';
  }
  if(!expected && name === 'designConfigSave'){
    expected = _state.designConfigEtag || _state.designConfigVersion || '';
  }
  if(!expected && /^(waiverRequest|waiverApprove|waiverExpire)$/.test(name)){
    expected = _state.waiverEtag || _state.waiverVersion || '';
  }
  if(expected){
    payload.expectedVersion = payload.expectedVersion || expected;
    headers['If-Match'] = expected;
  }
  return payload;
}

	function callEndpoint(name, payload){
	  var endpoint = ENDPOINTS[name];
	  if(!endpoint || !window.fetch) return Promise.reject(new Error('endpoint_unavailable'));
	  payload = payload || {};
	  var opts = {
	    method: endpoint.method || 'GET',
	    headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
	    credentials: 'same-origin'
	  };
	  if(opts.method !== 'GET'){
	    var csrf = csrfHeaderValue();
	    if(csrf) opts.headers['X-CSRF-Token'] = csrf;
	    payload = attachConcurrency(name, payload, opts.headers);
	    opts.body = JSON.stringify(payload || {});
	  }
  return fetch(apiUrl(endpoint, payload), opts).then(function(res){
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
  var debt = callEndpoint('debtReport', {}).catch(function(){ return null; });
  var drift = callEndpoint('driftReport', {}).catch(function(){ return null; });
  var audit = callEndpoint('auditHistory', {}).catch(function(){ return null; });
  var waivers = callEndpoint('activeWaivers', {}).catch(function(){ return null; });
  var releaseBlockers = callEndpoint('releaseBlockers', {}).catch(function(){ return null; });
  var changeSet = callEndpoint('changeSet', {}).catch(function(){ return null; });
  var lineageGraph = callEndpoint('lineageGraph', {}).catch(function(){ return null; });
  var runtimeBeacon = callEndpoint('runtimeBeacon', {}).catch(function(){ return null; });
  var debtObservatory = callEndpoint('debtObservatory', {}).catch(function(){ return null; });
  var environmentPacks = callEndpoint('environmentPacks', {}).catch(function(){ return null; });
  var releaseDashboard = callEndpoint('releaseDashboard', {}).catch(function(){ return null; });

  return Promise.all([
    registry,
    compliance,
    debt,
    drift,
    audit,
    waivers,
    releaseBlockers,
    changeSet,
    lineageGraph,
    runtimeBeacon,
    debtObservatory,
    environmentPacks,
    releaseDashboard,
    localModules
  ]).then(function(parts){
    var remoteRegistry = parts[0];
    var remoteCompliance = parts[1];
    var remoteDebt = parts[2];
    var remoteDrift = parts[3];
    var remoteAudit = parts[4];
    var remoteWaivers = parts[5];
    var remoteReleaseBlockers = parts[6];
    var remoteChangeSet = parts[7];
    var remoteLineageGraph = parts[8];
    var remoteRuntimeBeacon = parts[9];
    var remoteDebtObservatory = parts[10];
    var remoteEnvironmentPacks = parts[11];
    var remoteReleaseDashboard = parts[12];
    var localSchemas = parts[13];
    var complianceRows = normalizeComplianceRows(remoteCompliance);
    var auditRows = normalizeAuditRows(remoteAudit);
    var waiverRows = normalizeWaiverRows(remoteWaivers);
    if(remoteRegistry && Array.isArray(remoteRegistry.templates)){
      _state.templates = remoteRegistry.templates.map(normalizeTemplate);
      _state.registryAuthority = 'backend';
      _state.registryVersion = String(remoteRegistry.version || remoteRegistry.registryVersion || '');
      _state.registryEtag = String(remoteRegistry.etag || remoteRegistry.registryEtag || '');
    } else {
      _state.templates = [];
      _state.registryAuthority = 'fallback-seed';
      _state.registryVersion = '';
      _state.registryEtag = '';
    }
    _state.modules = mergeModules(remoteRegistry && remoteRegistry.modules ? remoteRegistry.modules : localSchemas);
    _state.compliance = complianceRows || fallbackCompliance(_state.modules);
    _state.debt = remoteDebt || null;
    _state.drift = remoteDrift && remoteDrift.drift ? remoteDrift.drift : (remoteDrift || null);
    _state.audit = auditRows || defaultAudit();
    _state.waivers = waiverRows || _state.waivers || [];
    _state.releaseBlockers = remoteReleaseBlockers && Array.isArray(remoteReleaseBlockers.blockers) ? remoteReleaseBlockers.blockers : [];
    _state.changeSet = remoteChangeSet && (remoteChangeSet.changeSet || remoteChangeSet);
    _state.lineageGraph = remoteLineageGraph && (remoteLineageGraph.lineageGraph || remoteLineageGraph);
    _state.runtimeBeacon = remoteRuntimeBeacon && (remoteRuntimeBeacon.runtimeBeacon || remoteRuntimeBeacon);
    _state.debtObservatory = remoteDebtObservatory && (remoteDebtObservatory.observatory || remoteDebtObservatory);
    _state.environmentPolicyPacks = remoteEnvironmentPacks && (remoteEnvironmentPacks.policyPacks || remoteEnvironmentPacks);
    _state.releaseDashboard = remoteReleaseDashboard && (remoteReleaseDashboard.releaseDashboard || remoteReleaseDashboard);
    _state.waiverVersion = String(remoteWaivers && remoteWaivers.version || '');
    _state.waiverEtag = String(remoteWaivers && remoteWaivers.etag || '');
    _state.loaded = true;
    _state.loading = false;
    _state.lastLoadedAt = nowIso();
    _state.lastImpact = computeImpact(_state.lastChange, seedTemplates);
    _state.changeSet = _state.changeSet || buildChangeSet(_state.lastImpact);
    _state.lineageGraph = _state.lineageGraph || buildLineageGraph(seedTemplates);
    _state.runtimeBeacon = _state.runtimeBeacon || collectRuntimeBeacon();
    _state.debtObservatory = _state.debtObservatory || buildDebtObservatory();
    _state.environmentPolicyPacks = _state.environmentPolicyPacks || buildEnvironmentPolicyPacks();
    _state.releaseDashboard = _state.releaseDashboard || buildReleaseDashboard();
    return getSnapshot(seedTemplates);
  }).catch(function(){
    _state.modules = mergeModules([]);
    _state.compliance = fallbackCompliance(_state.modules);
    _state.debt = null;
    _state.drift = null;
    _state.releaseBlockers = [];
    _state.audit = defaultAudit();
    _state.loaded = true;
    _state.loading = false;
    _state.lastLoadedAt = nowIso();
    _state.lastImpact = computeImpact(_state.lastChange, seedTemplates);
    _state.changeSet = buildChangeSet(_state.lastImpact);
    _state.lineageGraph = buildLineageGraph(seedTemplates);
    _state.runtimeBeacon = collectRuntimeBeacon();
    _state.debtObservatory = buildDebtObservatory();
    _state.environmentPolicyPacks = buildEnvironmentPolicyPacks();
    _state.releaseDashboard = buildReleaseDashboard();
    return getSnapshot(seedTemplates);
  });
}

function getSnapshot(seedTemplates){
  if(!_state.modules || !_state.modules.length) _state.modules = mergeModules([]);
  if(!_state.compliance || !_state.compliance.length) _state.compliance = fallbackCompliance(_state.modules);
  if(!_state.audit || !_state.audit.length) _state.audit = defaultAudit();
  var templates = mergeDraftAndPreviewTemplates(seedTemplates || []);
  var runtimeDiagnostics = collectRuntimeDiagnostics();
  return {
    version: VERSION,
    endpoints: clone(ENDPOINTS),
    templateStates: TEMPLATE_STATES.slice(),
    registryAuthority: _state.registryAuthority,
    registryVersion: _state.registryVersion,
    registryEtag: _state.registryEtag,
    waiverVersion: _state.waiverVersion,
    waiverEtag: _state.waiverEtag,
    endpointStatus: clone(_state.endpointStatus),
    backendAvailable: _state.backendAvailable,
    lastLoadedAt: _state.lastLoadedAt,
    templates: templates,
    modules: clone(_state.modules),
    compliance: clone(_state.compliance),
    debt: clone(_state.debt),
    drift: clone(_state.drift),
    runtimeDiagnostics: runtimeDiagnostics,
    runtimeBeacon: clone(_state.runtimeBeacon || collectRuntimeBeacon()),
    changeSet: clone(_state.changeSet || buildChangeSet(_state.lastImpact || computeImpact(_state.lastChange, seedTemplates || []))),
    lineageGraph: clone(_state.lineageGraph || buildLineageGraph(seedTemplates || [])),
    debtObservatory: clone(_state.debtObservatory || buildDebtObservatory()),
    environmentPolicyPacks: clone(_state.environmentPolicyPacks || buildEnvironmentPolicyPacks()),
    releaseDashboard: clone(_state.releaseDashboard || buildReleaseDashboard()),
    releaseBlockers: effectiveReleaseBlockers(),
    audit: clone(_state.audit),
    waivers: clone(_state.waivers),
    rolloutsByTemplate: clone(_state.rolloutsByTemplate),
    lastChange: clone(_state.lastChange),
    impact: clone(_state.lastImpact || computeImpact(_state.lastChange, seedTemplates || []))
  };
}

function collectRuntimeDiagnostics(){
  if(!window.document) {
    return { available:false, linkageStatus:'runtime-unavailable', releaseBlocker:false };
  }
  var root = document.documentElement;
  var sharedTokens = 0;
  try {
    var style = window.getComputedStyle ? window.getComputedStyle(root) : null;
    ['--bg-surface','--text-primary','--border','--radius-md','--hds-btn-py','--hds-table-cell-py'].forEach(function(token){
      if(style && String(style.getPropertyValue(token) || '').trim() !== '') sharedTokens++;
    });
  } catch(e){}
  var hmConsumers = document.querySelectorAll ? document.querySelectorAll('[class*="hm-"]').length : 0;
  var privateShells = document.querySelectorAll ? document.querySelectorAll('[class*="eqms-"],[class*="ev-"],[class*="cr-"],[class*="ec-"]').length : 0;
  var inlineStyles = document.querySelectorAll ? document.querySelectorAll('[style]').length : 0;
  var linkageStatus = sharedTokens >= 3 && hmConsumers > 0 ? 'full-admin-controlled' : (sharedTokens >= 3 ? 'bridged-to-shared-tokens' : 'blocked');
  return {
    available:true,
    linkageStatus: linkageStatus,
    sharedTokenProbeCount: sharedTokens,
    hmComponentConsumerCount: hmConsumers,
    privateShellSelectorCount: privateShells,
    inlineStyleCount: inlineStyles,
    releaseBlocker: linkageStatus === 'blocked',
    checkedAt: nowIso()
  };
}

function collectRuntimeBeacon(){
  var diagnostics = collectRuntimeDiagnostics();
  var rows = (_state.compliance && _state.compliance.length ? _state.compliance : fallbackCompliance(_state.modules || mergeModules([]))).map(function(row){
    return {
      moduleId: row.moduleId,
      route: row.route || '',
      linkageStatus: row.linkageStatus || (row.compliant ? 'full-admin-controlled' : 'blocked'),
      sharedTokenProbe: row.consumesSharedTokens === true,
      hmComponentProbe: row.consumesHmComponents === true,
      privateCssProbe: row.usesPrivateCssShell === true,
      beaconStatus: row.linkageStatus === 'blocked' ? 'release-blocking' : 'reported',
      reportedAt: diagnostics.checkedAt || nowIso()
    };
  });
  return {
    beacons: rows,
    summary: {
      reportedModules: rows.length,
      releaseBlockingModules: rows.filter(function(row){ return row.beaconStatus === 'release-blocking'; }).length,
      shellLinkageStatus: diagnostics.linkageStatus,
      shellPrivateSelectorCount: diagnostics.privateShellSelectorCount || 0,
      shellInlineStyleCount: diagnostics.inlineStyleCount || 0
    }
  };
}

function severityForImpact(affected, blockers){
  var regulated = affected.some(function(module){ return String(module.criticality || '').indexOf('regulated') >= 0; });
  var shopfloor = affected.some(function(module){ return String(module.criticality || '').indexOf('shopfloor') >= 0; });
  if(shopfloor) return 'shopfloor-critical';
  if(regulated) return 'regulated';
  if((blockers || []).length || affected.length >= 8) return 'high';
  if(affected.length >= 3) return 'medium';
  return 'low';
}

function evidencePlanForSeverity(severity){
  var plan = [
    { evidenceType:'impact-snapshot', required:true, owner:'Frontend Platform' },
    { evidenceType:'rollback-plan', required:true, owner:'Release Engineering' }
  ];
  if(['medium','high','regulated','shopfloor-critical'].indexOf(severity) >= 0){
    plan.push({ evidenceType:'screenshot-diff', required:true, owner:'UX QA' });
    plan.push({ evidenceType:'keyboard-focus-proof', required:true, owner:'Accessibility QA' });
  }
  if(['high','regulated','shopfloor-critical'].indexOf(severity) >= 0){
    plan.push({ evidenceType:'compliance-matrix-snapshot', required:true, owner:'Design System Governance' });
    plan.push({ evidenceType:'drift-report', required:true, owner:'Runtime Governance' });
  }
  if(severity === 'regulated') plan.push({ evidenceType:'audit-traceability-pack', required:true, owner:'Quality Systems' });
  if(severity === 'shopfloor-critical'){
    plan.push({ evidenceType:'shopfloor-kiosk-smoke', required:true, owner:'MES Operations' });
    plan.push({ evidenceType:'touch-target-proof', required:true, owner:'UX QA' });
  }
  return plan;
}

function rolloutScopePlan(severity, blockers){
  var blocked = (blockers || []).length > 0;
  return [
    { mode:'preview-only', allowed:true, releaseCondition:'No production write; preview cache only.' },
    { mode:'canary-module-group', allowed:!blocked && ['medium','high','regulated','shopfloor-critical'].indexOf(severity) >= 0, releaseCondition:'Impact report and rollback plan attached.' },
    { mode:'canary-domain', allowed:!blocked && ['high','regulated','shopfloor-critical'].indexOf(severity) >= 0, releaseCondition:'Domain owner approval and evidence checklist complete.' },
    { mode:'environment-stage', allowed:!blocked, releaseCondition:'Environment policy pack selected and QA rerun plan complete.' },
    { mode:'global-apply', allowed:!blocked && severity !== 'shopfloor-critical', releaseCondition:'No active release blockers and release manifest refs present.' }
  ];
}

function affectedTemplatesForModules(affected){
  var templates = {};
  (affected || []).forEach(function(module){
    if(module.templateId) templates[module.templateId] = true;
  });
  return Object.keys(templates);
}

function buildChangeSet(impact){
  impact = impact || computeImpact(_state.lastChange, []);
  return {
    changeSetId: impact.changeSetRef || ('gcs_' + String(Date.now()).slice(-8)),
    status: impact.backendAttested ? 'impact-recorded' : 'preview-only',
    source: impact.backendAttested ? 'backend-attested' : 'frontend-fallback',
    edits: [{
      analysisType: impact.kind || 'graphics',
      subject: { target: impact.target || '', label: impact.label || '' },
      status: impact.backendAttested ? 'recorded' : 'preview-only',
      recordedAt: impact.computedAt || nowIso()
    }],
    diffSummary: {
      affectedModules: (impact.affectedModules || []).length,
      affectedTemplates: (impact.affectedTemplates || []).length,
      blockers: String(impact.releaseBlockerSummary || '').indexOf('No ') === 0 ? 0 : 1
    },
    impact: impact,
    risk: { severityClass: impact.severityClass || 'low' },
    rolloutScopePlan: impact.rolloutScopes || rolloutScopePlan(impact.severityClass || 'low', []),
    evidenceChecklist: impact.requiredEvidence || evidencePlanForSeverity(impact.severityClass || 'low')
  };
}

function buildLineageGraph(seedTemplates){
  var templates = mergeDraftAndPreviewTemplates(seedTemplates || []);
  var nodes = [
    { id:'admin-appearance', type:'admin-control-plane', label:'Admin Appearance / Template Studio' },
    { id:'backend-graphics-authority', type:'backend-authority', label:'Canonical backend graphics authority' },
    { id:'shared-tokens', type:'token-layer', label:'Shared tokens' },
    { id:'shared-components', type:'component-layer', label:'Shared hm-* components' }
  ];
  var edges = [
    { from:'admin-appearance', to:'backend-graphics-authority', relation:'persists-through' },
    { from:'backend-graphics-authority', to:'shared-tokens', relation:'publishes-runtime-tokens' },
    { from:'shared-tokens', to:'shared-components', relation:'drives-contracts' }
  ];
  templates.forEach(function(tpl){
    var id = String(tpl.templateId || tpl.id || '');
    if(!id) return;
    nodes.push({ id:'template:' + id, type:'template', label:id + ' v' + (tpl.version || ''), status:tpl.status || '' });
    edges.push({ from:'backend-graphics-authority', to:'template:' + id, relation:'controls-template' });
  });
  (_state.modules || mergeModules([])).forEach(function(module){
    nodes.push({ id:'module:' + module.moduleId, type:'module', label:module.moduleId, route:module.route || '' });
    if(module.templateId) edges.push({ from:'template:' + module.templateId, to:'module:' + module.moduleId, relation:'governs-module' });
    (module.blockFamilies || []).forEach(function(family){
      var componentId = 'component:' + family;
      if(!nodes.some(function(node){ return node.id === componentId; })) nodes.push({ id:componentId, type:'component-contract', label:family });
      edges.push({ from:componentId, to:'module:' + module.moduleId, relation:'consumed-by-module' });
    });
  });
  return { nodes:nodes, edges:edges, summary:{ nodeCount:nodes.length, edgeCount:edges.length, templateCount:templates.length } };
}

function buildDebtObservatory(){
  var rows = (_state.compliance && _state.compliance.length ? _state.compliance : fallbackCompliance(_state.modules || mergeModules([]))).map(function(row){
    var score = Number(row.bridgeAliasDebt || 0) + Number(row.privateCssDebt || 0) * 10 + Number(row.hardcodedStyleDebt || 0) * 5 + (row.linkageStatus === 'blocked' ? 25 : 0);
    return {
      moduleId: row.moduleId,
      route: row.route || '',
      domain: row.domain || 'unclassified',
      ownerTeam: row.ownerTeam || 'Frontend Platform',
      linkageStatus: row.linkageStatus || 'blocked',
      bridgeAliasDebt: Number(row.bridgeAliasDebt || 0),
      privateCssDebt: Number(row.privateCssDebt || 0),
      hardcodedStyleDebt: Number(row.hardcodedStyleDebt || 0),
      uncontrolledLegacyShellDebt: row.linkageStatus === 'legacy-private-css' ? 1 : 0,
      debtScore: score
    };
  });
  rows.sort(function(a, b){ return b.debtScore - a.debtScore; });
  return {
    byModule: rows,
    summary: {
      moduleDebtCount: rows.filter(function(row){ return row.debtScore > 0; }).length,
      uncontrolledLegacyShellDebt: rows.reduce(function(sum, row){ return sum + row.uncontrolledLegacyShellDebt; }, 0)
    }
  };
}

function buildEnvironmentPolicyPacks(){
  return {
    packs: [
      { environment:'office', tokenOverrides:{ density:'default', contrast:'standard' }, evidenceObligations:['visual-regression'] },
      { environment:'review', tokenOverrides:{ density:'comfortable', contrast:'standard' }, evidenceObligations:['screenshot-diff','keyboard-path'] },
      { environment:'admin', tokenOverrides:{ density:'compact', contrast:'standard' }, evidenceObligations:['audit-trail','permission-review'] },
      { environment:'shopfloor', tokenOverrides:{ density:'shopfloor', contrast:'high' }, evidenceObligations:['shopfloor-kiosk-smoke','touch-target-proof'] },
      { environment:'kiosk', tokenOverrides:{ density:'shopfloor', contrast:'high' }, evidenceObligations:['kiosk-viewport-proof','timeout-proof'] },
      { environment:'tv', tokenOverrides:{ density:'comfortable', contrast:'high' }, evidenceObligations:['distance-legibility-proof'] },
      { environment:'night-shift', tokenOverrides:{ mode:'dark', contrast:'high' }, evidenceObligations:['dark-mode-contrast','fatigue-review'] }
    ],
    summary: { authority:'frontend-fallback-backend-contract', localStorageAuthority:false }
  };
}

function buildReleaseDashboard(){
  var blockers = effectiveReleaseBlockers();
  var observatory = _state.debtObservatory || buildDebtObservatory();
  return {
    readiness: blockers.some(function(row){ return String(row.status || '') === 'active'; }) ? 'blocked' : 'ready',
    blockers: { blockers:blockers, summary:{ blockerCount:blockers.length, releaseBlocked:blockers.length > 0 } },
    complianceSummary: {
      moduleCount: (_state.compliance || []).length,
      blockedCount: (_state.compliance || []).filter(function(row){ return row.linkageStatus === 'blocked'; }).length
    },
    debtSummary: observatory.summary || {},
    rolloutSummary: { rolloutCount:Object.keys(_state.rolloutsByTemplate || {}).length },
    postApplyVerification: { runtimeBeaconRequired:true, driftReportRequired:true, evidenceBundleRequired:true },
    generatedAt: nowIso()
  };
}

function effectiveReleaseBlockers(){
  var blockers = clone(_state.releaseBlockers || []) || [];
  if(!_state.backendAvailable){
    var exists = blockers.some(function(row){ return row && row.blockerId === 'graphics_backend_authority_unavailable'; });
    if(!exists){
      blockers.unshift({
        blockerId:'graphics_backend_authority_unavailable',
        scope:'graphics',
        targetId:'backend-graphics-authority',
        severity:'blocker',
        status:'active',
        reason:'Backend graphics authority endpoint is unavailable; publish/apply must remain blocked.',
        releaseGate:'G19-graphics-governance',
        waiverAllowed:false
      });
    }
  }
  return blockers;
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
  var severityClass = severityForImpact(affected, blockers);
  var affectedTemplates = affectedTemplatesForModules(affected);
  var requiredEvidence = evidencePlanForSeverity(severityClass);
  var scopes = rolloutScopePlan(severityClass, blockers);

  return {
    kind: kind,
    target: target,
    label: change && change.label || target || kind,
    affectedModules: affected.map(function(module){ return module.moduleId; }),
    affectedRoutes: Object.keys(routes),
    affectedScreens: Object.keys(screens),
    affectedBlockFamilies: Object.keys(families),
    affectedTemplates: affectedTemplates,
    regulatedModules: regulated.map(function(module){ return module.moduleId; }),
    shopfloorModules: shopfloor.map(function(module){ return module.moduleId; }),
    gatesToRerun: gates,
    severityClass: severityClass,
    requiredEvidence: requiredEvidence,
    rerunPlan: {
      gates: gates,
      regulatedEvidenceRequired: regulated.length > 0,
      shopfloorEvidenceRequired: shopfloor.length > 0,
      screenshotDiffRequired: ['medium','high','regulated','shopfloor-critical'].indexOf(severityClass) >= 0
    },
    rolloutScopes: scopes,
    changeSetRef: 'gcs-' + String(kind + '-' + target).replace(/[^A-Za-z0-9_-]+/g, '-'),
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
    affectedTemplates: remote.affectedTemplates || localImpact.affectedTemplates || [],
    regulatedModules: remote.regulatedModulesTouched || remote.regulatedModules || localImpact.regulatedModules || [],
    shopfloorModules: remote.shopfloorModulesTouched || remote.shopfloorModules || localImpact.shopfloorModules || [],
    gatesToRerun: remote.gatesToRerun || localImpact.gatesToRerun || [],
    severityClass: remote.severityClass || localImpact.severityClass || 'low',
    requiredEvidence: remote.requiredEvidence || localImpact.requiredEvidence || [],
    rerunPlan: remote.rerunPlan || localImpact.rerunPlan || {},
    rolloutScopes: remote.rolloutScopes || localImpact.rolloutScopes || [],
    changeSetRef: remote.changeSetRef || localImpact.changeSetRef || '',
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
    _state.changeSet = buildChangeSet(_state.lastImpact);
    _state.releaseDashboard = buildReleaseDashboard();
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
  _state.changeSet = buildChangeSet(_state.lastImpact);
  _state.releaseDashboard = buildReleaseDashboard();
  return clone(_state.lastImpact);
}

function cacheUnsavedTemplateDraft(template){
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

function saveTemplateDraft(template){
  if(!template || !(template.templateId || template.id)) return Promise.resolve({ ok:false, status:'publish-blocked', message:'Missing templateId' });
  var tpl = toBackendTemplate(template, 'saveDraft');
  return templateAction('saveDraft', tpl.templateId, { template:tpl });
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

function getTemplate(templateId){
  return callEndpoint('templateGet', { templateId:String(templateId || '') });
}

function templateAction(action, templateId, payload){
  var id = String(templateId || '');
  if(!id) return Promise.resolve({ ok:false, status:'publish-blocked', message:'Missing templateId' });
  var endpointMap = {
    saveDraft:'templateDraftSave',
    validate:'templateValidate',
    publish:'templatePublish',
    deprecate:'templateDeprecate',
    stage:'rolloutStage',
    apply:'publishApply',
    rollback:'rollback'
  };
  var endpointName = endpointMap[action];
  if(!endpointName) return Promise.resolve({ ok:false, status:'publish-blocked', message:'Unsupported graphics governance action: ' + action });
  var body = Object.assign({ templateId:id }, payload || {});
  if(body.template) body.template = toBackendTemplate(body.template, action);
  if(action === 'stage'){
    body.impactType = body.impactType || 'template';
    body.scope = Object.assign({ mode:'preview-only', templates:[id] }, body.scope || {});
  }
  if(action === 'publish'){
    body.impactAnalysisId = body.impactAnalysisId || (_state.lastImpact && _state.lastImpact.backendAttested && _state.lastImpact.impactId) || '';
    if(!body.impactAnalysisId){
      recordAudit('template-publish', id, 'blocked-impact-analysis-required');
      return Promise.resolve({
        ok:false,
        status:'publish-blocked',
        message:'Run backend impact analysis before publish.'
      });
    }
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
    var validationFailed = data && data.validation && data.validation.valid === false;
    var resultStatus = validationFailed ? 'publish-blocked'
      : data && data.status ? canonicalState(data.status)
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
    return {
      ok: !validationFailed,
      status: resultStatus,
      data: data || null,
      message: validationFailed ? 'Backend validation failed; publish remains blocked.' : ''
    };
  }).catch(function(err){
    var resultStatus = 'publish-blocked';
    recordAudit('template-' + action, id, 'blocked-backend-governance');
    return {
      ok: false,
      status: resultStatus,
      message: err && err.message ? ('Backend governance blocked action: ' + err.message) : 'Backend authority endpoint unavailable; local cache was not promoted to authority.'
    };
  });
}

function validateTemplate(templateId, payload){
  return templateAction('validate', templateId, payload || {});
}

function publishTemplate(templateId, payload){
  return templateAction('publish', templateId, payload || {});
}

function deprecateTemplate(templateId, payload){
  return templateAction('deprecate', templateId, payload || {});
}

function stageGraphicsRollout(payload){
  var templateId = payload && payload.templateId ? payload.templateId : 'graphics-rollout';
  return templateAction('stage', templateId, payload || {});
}

function applyGraphicsRollout(payload){
  var templateId = payload && payload.templateId ? payload.templateId : 'graphics-rollout';
  return templateAction('apply', templateId, payload || {});
}

function rollbackGraphicsRollout(payload){
  var templateId = payload && payload.templateId ? payload.templateId : 'graphics-rollout';
  return templateAction('rollback', templateId, payload || {});
}

function analyzeTemplateImpact(templateId, changes){
  return analyzeImpact(Object.assign({ kind:'template-zone', target:String(templateId || ''), label:'template impact' }, changes || {}), []);
}

function analyzeTokenImpact(changes){
  return analyzeImpact(Object.assign({ kind:'token', target:'token-change', label:'token impact' }, changes || {}), []);
}

function analyzeComponentImpact(componentId, changes){
  return analyzeImpact(Object.assign({ kind:'component-contract', target:String(componentId || ''), label:'component impact' }, changes || {}), []);
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
    scope: payload.scope || 'release_gate',
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

function getDesignConfig(){
  return callEndpoint('designConfig', {}).then(function(data){
    _state.designConfigVersion = String(data && data.version || data && data.config && data.config._meta && data.config._meta.version || '');
    _state.designConfigEtag = String(data && data.etag || '');
    return clone(data || {});
  });
}

function saveDesignConfig(payload){
  payload = payload || {};
  var body = payload.config ? Object.assign({}, payload) : { config: payload };
  body.expectedVersion = body.expectedVersion || _state.designConfigEtag || _state.designConfigVersion || '';
  return callEndpoint('designConfigSave', body).then(function(data){
    _state.designConfigVersion = String(data && data.version || data && data.config && data.config._meta && data.config._meta.version || _state.designConfigVersion || '');
    _state.designConfigEtag = String(data && data.etag || _state.designConfigEtag || '');
    recordAudit('design-config-saved', 'design-config', 'backend-attested');
    return clone(data || {});
  });
}

function getNonCompliantModules(){
  return callEndpoint('nonCompliant', {}).then(function(data){
    var rows = firstArray(data, data && data.modules, data && data.rows);
    return clone(rows || (_state.compliance || []).filter(function(row){
      return row && row.status !== 'full-admin-controlled';
    }));
  }).catch(function(){
    return clone((_state.compliance || []).filter(function(row){
      return row && row.status !== 'full-admin-controlled';
    }));
  });
}

function approveWaiver(payload){
  payload = payload || {};
  var waiverId = String(payload.waiverId || payload.id || '');
  if(!waiverId) return Promise.resolve({ ok:false, status:'publish-blocked', message:'Missing waiverId' });
  return callEndpoint('waiverApprove', payload).then(function(data){
    _state.waivers = (_state.waivers || []).map(function(row){
      if(String(row.waiverId || row.id || '') === waiverId) row.status = 'approved';
      return row;
    });
    recordAudit('waiver-approved', waiverId, 'backend-attested');
    return clone(data || { ok:true, waiverId:waiverId, status:'approved' });
  });
}

function expireWaiver(payload){
  payload = payload || {};
  var waiverId = String(payload.waiverId || payload.id || '');
  if(!waiverId) return Promise.resolve({ ok:false, status:'publish-blocked', message:'Missing waiverId' });
  return callEndpoint('waiverExpire', payload).then(function(data){
    _state.waivers = (_state.waivers || []).map(function(row){
      if(String(row.waiverId || row.id || '') === waiverId) row.status = 'expired';
      return row;
    });
    recordAudit('waiver-expired', waiverId, 'backend-attested');
    return clone(data || { ok:true, waiverId:waiverId, status:'expired' });
  });
}

window.HmGraphicsGovernance = {
  VERSION: VERSION,
  ENDPOINTS: ENDPOINTS,
  TEMPLATE_STATES: TEMPLATE_STATES,
  refresh: refresh,
  getDesignConfig: getDesignConfig,
  saveDesignConfig: saveDesignConfig,
  getSnapshot: getSnapshot,
  getTemplateRegistry: function(seedTemplates){ return getSnapshot(seedTemplates).templates; },
  getTemplate: getTemplate,
  getModulesForTemplate: function(templateId, seedTemplates){ return modulesForTemplate(templateId, mergeDraftAndPreviewTemplates(seedTemplates || [])); },
  getComplianceMatrix: function(){ return clone(_state.compliance && _state.compliance.length ? _state.compliance : fallbackCompliance(mergeModules([]))); },
  getGraphicsComplianceMatrix: function(){ return clone(_state.compliance && _state.compliance.length ? _state.compliance : fallbackCompliance(mergeModules([]))); },
  getNonCompliantModules: getNonCompliantModules,
  getGraphicsDebtReport: function(){ return clone(_state.debt || {}); },
  getGraphicsAuditHistory: function(){ return clone(_state.audit || []); },
  getActiveWaivers: function(){ return clone(_state.waivers || []); },
  getReleaseBlockers: function(){ return effectiveReleaseBlockers(); },
  getGraphicsReleaseBlockers: function(){ return effectiveReleaseBlockers(); },
  getGraphicsChangeSet: function(seedTemplates){ return clone(_state.changeSet || buildChangeSet(_state.lastImpact || computeImpact(_state.lastChange, seedTemplates || []))); },
  getModuleGraphicsLineageGraph: function(seedTemplates){ return clone(_state.lineageGraph || buildLineageGraph(seedTemplates || [])); },
  getRuntimeGraphicsComplianceBeacon: function(){ return clone(_state.runtimeBeacon || collectRuntimeBeacon()); },
  getVisualDebtObservatory: function(){ return clone(_state.debtObservatory || buildDebtObservatory()); },
  getEnvironmentPolicyPacks: function(){ return clone(_state.environmentPolicyPacks || buildEnvironmentPolicyPacks()); },
  getGraphicsReleaseDashboard: function(){ return clone(_state.releaseDashboard || buildReleaseDashboard()); },
  collectRuntimeDiagnostics: collectRuntimeDiagnostics,
  collectRuntimeBeacon: collectRuntimeBeacon,
  computeImpact: computeImpact,
  markChange: markChange,
  analyzeImpact: analyzeImpact,
  analyzeTemplateImpact: analyzeTemplateImpact,
  analyzeTokenImpact: analyzeTokenImpact,
  analyzeComponentImpact: analyzeComponentImpact,
  saveTemplateDraft: saveTemplateDraft,
  cacheUnsavedTemplateDraft: cacheUnsavedTemplateDraft,
  validateTemplate: validateTemplate,
  publishTemplate: publishTemplate,
  deprecateTemplate: deprecateTemplate,
  saveTemplatePreview: saveTemplatePreview,
  deleteTemplateDraft: deleteTemplateDraft,
  getDraftCache: function(){ return safeRead(DRAFT_CACHE_KEY); },
  replaceDraftCache: function(next){ safeWrite(DRAFT_CACHE_KEY, next || {}); recordAudit('template-draft-cache-imported', 'draft-cache', 'draft-only'); },
  getPreviewCache: function(){ return safeRead(PREVIEW_CACHE_KEY); },
  replacePreviewCache: function(next){ safeWrite(PREVIEW_CACHE_KEY, next || {}); recordAudit('template-preview-cache-imported', 'preview-cache', 'preview-only'); },
  templateAction: templateAction,
  stageGraphicsRollout: stageGraphicsRollout,
  applyGraphicsRollout: applyGraphicsRollout,
  rollbackGraphicsRollout: rollbackGraphicsRollout,
  requestWaiver: requestWaiver,
  approveWaiver: approveWaiver,
  expireWaiver: expireWaiver
};

})();
