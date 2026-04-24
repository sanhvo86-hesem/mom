/* HESEM Operations Platform — module-template-v4 renderers.
   Rendering only. No business mutations. */
(function(){
  'use strict';
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var domains = [
    ['executive-performance','Executive & Performance'],
    ['customer-order-commit','Customer, RFQ & Order Commit'],
    ['npi-engineering-product-definition','NPI / Engineering & Product Definition'],
    ['supply-chain-intralogistics','Supply Chain & Intralogistics'],
    ['planning-scheduling','Planning & Scheduling'],
    ['shopfloor-execution','Shopfloor Execution'],
    ['quality-operations','Quality Operations'],
    ['asset-reliability-maintenance','Asset Reliability & Maintenance'],
    ['shipping-customer-field-quality','Shipping, Customer Service & Field Quality'],
    ['finance-cost','Finance & Cost'],
    ['people-skill-ehs','People, Skill & EHS'],
    ['document-change-compliance','Document, Change & Compliance'],
    ['continuous-improvement-knowledge','Continuous Improvement & Knowledge'],
    ['platform-data-administration','Platform, Data & Administration']
  ];
  var modules = {
    'customer-order-commit': [['customer-360','Customer 360'],['rfq-quote-studio','RFQ & Quote Studio'],['contract-commitment-board','Contract / Commitment Board']],
    'planning-scheduling': [['demand-orchestrator','Demand Orchestrator'],['aps-finite-scheduler','APS / Finite Scheduler'],['dispatch-board','Dispatch Board'],['recovery-console','Recovery Console']],
    'shopfloor-execution': [['wo-console','WO Console'],['machine-oee-control','Machine & OEE Control'],['nc-release-dnc','NC Release / DNC'],['connected-worker-andon','Connected Worker & Andon']],
    'quality-operations': [['quality-tower','Quality Tower'],['inspection-spc','Inspection & SPC'],['quality-case-management','Quality Case Management'],['capa-effectiveness','CAPA & Effectiveness'],['metrology-release-trace','Metrology / Release / Trace']],
    'platform-data-administration': [['foundation-services-studio','Foundation Services Studio'],['administration-runtime','Administration & Runtime']]
  };
  function breadcrumb(items){
    var html = '<ol class="hmv4-breadcrumb">';
    items.forEach(function(it, idx){ html += '<li><' + (it.href && idx < items.length-1 ? 'a href="'+esc(it.href)+'"' : 'span aria-current="page"') + '>' + esc(it.label) + '</' + (it.href && idx < items.length-1 ? 'a' : 'span') + '></li>'; });
    return html + '</ol>';
  }
  function pageHeader(title, subtitle, chips){
    var html = '<div class="hmv4-page-title-block"><h1 class="hmv4-page-title">'+esc(title)+'</h1>';
    if(subtitle) html += '<p class="hmv4-page-subtitle">'+esc(subtitle)+'</p>';
    if(chips && chips.length){ html += '<div class="hmv4-chip-row">'+chips.map(function(c){return '<span class="hmv4-chip">'+esc(c)+'</span>';}).join('')+'</div>'; }
    return html + '</div>';
  }
  function renderShellHome(){
    return '<section class="hmv4-shell-home" data-route-class="SH">' +
      '<div class="hmv4-grid">' + domains.map(function(d){ return '<article class="hmv4-card"><h3>'+esc(d[1])+'</h3><p>Open domain landing.</p><a class="hmv4-card-link" href="/ops/'+esc(d[0])+'">Open '+esc(d[1])+'</a></article>'; }).join('') + '</div></section>';
  }
  function renderDomain(route){
    var d = route.params.domain || 'operations';
    var list = modules[d] || [];
    return '<section class="hmv4-domain-landing" data-route-class="DL" data-domain="'+esc(d)+'"><div class="hmv4-grid">' +
      (list.length ? list.map(function(m){ return '<article class="hmv4-card"><h3>'+esc(m[1])+'</h3><p>Module landing and workspace entry.</p><a class="hmv4-card-link" href="/ops/'+esc(d)+'/'+esc(m[0])+'">Open module</a></article>'; }).join('') : '<div class="hmv4-feedback" data-feedback-state="info"><strong>Domain ready</strong><p>No module fixture has been staged for this domain yet.</p></div>') + '</div></section>';
  }
  function renderModule(route){
    var p = route.params;
    return '<section class="hmv4-module-landing" data-route-class="ML" data-domain="'+esc(p.domain)+'" data-module="'+esc(p.module)+'">' +
      '<div class="hmv4-grid"><article class="hmv4-card"><h3>Primary workspace</h3><p>Open the default board/queue for this module.</p><a href="/ops/'+esc(p.domain)+'/'+esc(p.module)+'/queue">Open queue</a></article>' +
      '<article class="hmv4-card"><h3>Records</h3><p>Open authoritative collection through /ops/records.</p><a href="/ops/records/quotations">Open sample collection</a></article></div></section>';
  }
  function renderCollection(route){
    var rf = route.params.resource_family || 'records';
    return '<section class="hmv4-authoritative-collection" data-route-class="AC" data-resource-family="'+esc(rf)+'" data-authority-class="authoritative">' +
      '<table class="hmv4-data-table"><thead><tr><th>ID</th><th>Title</th><th>Status</th><th></th></tr></thead><tbody>'+
      '<tr><td data-label="ID">DEMO-001</td><td data-label="Title">Sample '+esc(rf)+' record</td><td data-label="Status">draft</td><td data-label="Open"><a href="/ops/records/'+esc(rf)+'/DEMO-001">Open</a></td></tr>'+
      '</tbody></table></section>';
  }
  function renderRecord(route){
    var p = route.params, tab = route.query.tab || 'overview';
    var tabs = ['overview','workflow','related','evidence','comments','audit'];
    return '<article class="hmv4-record-shell hmv4-record-shell--display" data-route-class="AR" data-resource-family="'+esc(p.resource_family)+'" data-record-id="'+esc(p.record_id)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'">' +
      '<section class="hmv4-record-identity"><h1 class="hmv4-record-title">'+esc(p.record_id)+'</h1><p class="hmv4-record-subtitle">'+esc(p.resource_family)+' authoritative record shell</p></section>'+
      '<div class="hmv4-tablist" role="tablist" aria-label="Record details">'+tabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-'+t+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      tabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-'+t+'" '+(t===tab?'':'hidden')+'><div class="hmv4-section"><h3>'+esc(t)+'</h3><p>Placeholder for '+esc(t)+' section.</p></div></section>';}).join('')+
      '</article>';
  }
  function renderWorkspace(route){
    var p = route.params;
    return '<section class="hmv4-workspace-shell" data-route-class="'+esc(route.routeClass)+'" data-domain="'+esc(p.domain)+'" data-module="'+esc(p.module)+'" data-workspace-family="'+esc(p.workspace_family)+'" data-authority-class="projection" data-requires-reanchor="true">' +
      '<header class="hmv4-workspace-header"><h1 class="hmv4-workspace-title">'+esc(p.workspace_family)+' workspace</h1><p class="hmv4-workspace-subtitle">Projection workspace. Mutations must re-anchor to authoritative record shells.</p></header>'+
      '<div class="hmv4-feedback" data-feedback-state="warning"><strong>Projection surface</strong><p>Rows/cards are not command anchors. Open the record before mutation.</p></div>'+
      '<div class="hmv4-grid"><article class="hmv4-card"><h3>Sample card</h3><p>Open authoritative sample.</p><a href="/ops/records/dispatch-targets/DEMO-001">Open record</a></article></div></section>';
  }
  function renderRoute(route){
    if(!route || !route.ok) return '<div class="hmv4-feedback" data-feedback-state="error"><strong>Invalid route</strong><p>The route cannot be resolved.</p></div>';
    if(route.routeClass === 'SH') return renderShellHome(route);
    if(route.routeClass === 'DL') return renderDomain(route);
    if(route.routeClass === 'ML') return renderModule(route);
    if(route.routeClass === 'AC') return renderCollection(route);
    if(route.routeClass === 'AR' || route.routeClass === 'ERD') return renderRecord(route);
    if(route.routeClass === 'WS' || route.routeClass === 'SFW') return renderWorkspace(route);
    return '<div class="hmv4-feedback" data-feedback-state="warning"><strong>Route class not rendered</strong><p>'+esc(route.routeClass)+'</p></div>';
  }
  function applyShell(root, route){
    var cr = root.querySelector('[data-hm-region="breadcrumb_row"]');
    var ph = root.querySelector('[data-hm-region="page_header_zone"]');
    var content = root.querySelector('[data-hm-slot="route-content"]');
    var items = [{label:'Operations', href:'/ops'}];
    if(route.params.domain) items.push({label:route.params.domain, href:'/ops/'+route.params.domain});
    if(route.params.module) items.push({label:route.params.module, href:'/ops/'+route.params.domain+'/'+route.params.module});
    if(route.params.resource_family) items.push({label:route.params.resource_family, href:'/ops/records/'+route.params.resource_family});
    if(route.params.record_id) items.push({label:route.params.record_id});
    if(cr) cr.innerHTML = breadcrumb(items);
    if(ph) ph.innerHTML = pageHeader('HESEM Operations Platform', 'Preview surface for '+route.routeClass, [route.routeClass, route.params.domain || route.params.resource_family || 'ops']);
    if(content) content.innerHTML = renderRoute(route);
  }
  function renderNav(nav){
    if(!nav) return;
    nav.innerHTML = '<div class="hmv4-nav-section"><h2 class="hmv4-nav-section-title">Domains</h2>' + domains.map(function(d){ return '<a class="hmv4-nav-link" href="/ops/'+esc(d[0])+'">'+esc(d[1])+'</a>'; }).join('') + '</div>';
  }
  window.Hmv4Renderers = { renderRoute: renderRoute, applyShell: applyShell, renderNav: renderNav, domains: domains, modules: modules };
})();
