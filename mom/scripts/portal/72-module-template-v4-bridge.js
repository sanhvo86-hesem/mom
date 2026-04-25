/* HESEM Operations Platform — module-template-v4 bridge adapter.
   Current page keys/EQMS ids are bridge inputs only. */
(function(){
  'use strict';
  var R = window.Hmv4Routes;
  function u(routeClass, params, query){ return R ? R.buildUrl({routeClass:routeClass, params:params || {}, query:query || {}}) : '/ops'; }
  var pageKeyAliasMap = Object.freeze({
    dashboard: { policy:'redirect_then_deprecate', url:u('SH') },
    quoting: { policy:'redirect_then_deprecate', url:u('ML',{domain:'customer-order-commit', module:'rfq-quote-studio'}) },
    orders: { policy:'redirect_then_deprecate', url:u('ML',{domain:'planning-scheduling', module:'demand-orchestrator'}) },
    dispatch: { policy:'redirect_then_deprecate', url:u('WS',{domain:'planning-scheduling', module:'dispatch-board', workspace_family:'board'}) },
    mes: { policy:'redirect_then_deprecate', url:u('ML',{domain:'shopfloor-execution', module:'wo-console'}) },
    'mobile-shopfloor': { policy:'redirect_then_deprecate', url:u('WS',{domain:'shopfloor-execution', module:'connected-worker-andon', workspace_family:'queue'}) },
    purchasing: { policy:'redirect_then_deprecate', url:u('ML',{domain:'supply-chain-intralogistics', module:'procurement-desk'}) },
    documents: { policy:'redirect_then_deprecate', url:u('ML',{domain:'document-change-compliance', module:'controlled-docs-records'}) },
    forms: { policy:'redirect_then_deprecate', url:u('ML',{domain:'document-change-compliance', module:'controlled-docs-records'}) },
    'product-passport': { policy:'redirect_then_deprecate', url:u('WS',{domain:'shipping-customer-field-quality', module:'customer-portal-passport', workspace_family:'packet'}) },
    'energy-dashboard': { policy:'redirect_then_deprecate', url:u('WS',{domain:'people-skill-ehs', module:'ehs-energy', workspace_family:'dashboard'}) },
    'knowledge-base': { policy:'redirect_then_deprecate', url:u('ML',{domain:'continuous-improvement-knowledge', module:'lessons-learned-knowledge-base'}) },
    'continuous-improvement': { policy:'redirect_then_deprecate', url:u('ML',{domain:'continuous-improvement-knowledge', module:'improvement-portfolio'}) },
    'module-builder': { policy:'internal_only_bridge', url:u('ML',{domain:'platform-data-administration', module:'foundation-services-studio'}) },
    'schema-studio': { policy:'internal_only_bridge', url:u('ML',{domain:'platform-data-administration', module:'foundation-services-studio'}) },
    admin: { policy:'internal_only_bridge', url:u('ML',{domain:'platform-data-administration', module:'administration-runtime'}) },
    eqms: { policy:'keep_as_alias', url:u('ML',{domain:'quality-operations', module:'quality-tower'}) }
  });
  var eqmsModuleAliasMap = Object.freeze({
    'quality-tower': u('ML',{domain:'quality-operations', module:'quality-tower'}),
    inspection: u('ML',{domain:'quality-operations', module:'inspection-spc'}),
    spc: u('WS',{domain:'quality-operations', module:'inspection-spc', workspace_family:'analytics'}),
    ncr: u('ML',{domain:'quality-operations', module:'quality-case-management'}),
    deviations: u('ML',{domain:'quality-operations', module:'quality-case-management'}),
    concessions: u('ML',{domain:'quality-operations', module:'quality-case-management'}),
    capa: u('ML',{domain:'quality-operations', module:'capa-effectiveness'}),
    cdoc: u('ML',{domain:'document-change-compliance', module:'controlled-docs-records'}),
    'batch-release': u('ML',{domain:'quality-operations', module:'metrology-release-trace'}),
    genealogy: u('WS',{domain:'quality-operations', module:'metrology-release-trace', workspace_family:'explorer'}),
    documents: u('ML',{domain:'document-change-compliance', module:'controlled-docs-records'}),
    training: u('ML',{domain:'people-skill-ehs', module:'training-competency'}),
    audits: u('ML',{domain:'document-change-compliance', module:'audit-compliance'}),
    suppliers: u('ML',{domain:'supply-chain-intralogistics', module:'supplier-360'}),
    'supplier-audits': u('ML',{domain:'supply-chain-intralogistics', module:'supplier-360'}),
    'engineering-change': u('ML',{domain:'npi-engineering-product-definition', module:'engineering-change'}),
    'apqp-ppap': u('ML',{domain:'npi-engineering-product-definition', module:'ppap-fai-validation'}),
    fai: u('ML',{domain:'npi-engineering-product-definition', module:'ppap-fai-validation'})
  });
  function resolvePageKey(pageKey){
    var key = String(pageKey || '').trim();
    return pageKeyAliasMap[key] || { policy:'unmapped_needs_decision', url:null, reason:'no_page_key_alias' };
  }
  function getRecordContextId(context){
    context = context || {};
    return context.recordId || context.record_id || context.id || context.caseId || context.case_id || null;
  }
  function resolveEqmsModule(moduleId, context){
    var key = String(moduleId || '').trim();
    var recordId = getRecordContextId(context);
    if((key === 'ncr' || key === 'deviations') && recordId){
      return {
        policy:'redirect_record_context_only',
        url:u('AR',{resource_family:'nonconformance-cases', record_id:recordId},{tab:(context && context.tab) || 'overview'})
      };
    }
    if(key === 'capa' && recordId){
      return {
        policy:'redirect_record_context_only',
        url:u('AR',{resource_family:'capas', record_id:recordId},{tab:(context && context.tab) || 'overview'})
      };
    }
    if(key === 'cdoc' && recordId){
      return {
        policy:'redirect_record_context_only',
        url:u('AR',{resource_family:'controlled-documents', record_id:recordId},{tab:(context && context.tab) || 'overview'})
      };
    }
    if((key === 'brel' || key === 'release') && recordId){
      return {
        policy:'redirect_record_context_only',
        url:u('AR',{resource_family:'batch-releases', record_id:recordId},{tab:(context && context.tab) || 'overview'})
      };
    }
    return eqmsModuleAliasMap[key] ? { policy:'redirect_then_deprecate', url:eqmsModuleAliasMap[key] } : { policy:'unmapped_needs_decision', url:null, reason:'no_eqms_alias' };
  }
  function bridgeBannerHtml(res){
    if(!res || !res.policy || res.policy === 'canonical') return '';
    return '<div class="hmv4-feedback" data-feedback-state="bridge" data-hm-component="bridge-banner" role="status"><strong>Bridge mode</strong><p>This legacy surface maps to the HESEM Operations Platform route model.</p></div>';
  }
  function maybeReplaceToCanonical(res){
    if(!res || !res.url || !window.history || !window.HMV4_PREVIEW_ENABLED) return false;
    if(res.policy === 'redirect_then_deprecate' && location.pathname + location.search !== res.url){ history.replaceState({hmv4Bridge:true}, '', res.url); return true; }
    return false;
  }
  window.Hmv4Bridge = { pageKeyAliasMap: pageKeyAliasMap, eqmsModuleAliasMap: eqmsModuleAliasMap, resolvePageKey: resolvePageKey, resolveEqmsModule: resolveEqmsModule, bridgeBannerHtml: bridgeBannerHtml, maybeReplaceToCanonical: maybeReplaceToCanonical };
})();
