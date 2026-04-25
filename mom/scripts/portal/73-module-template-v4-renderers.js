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
  var nonconformanceTabs = ['overview','investigation','evidence','related','audit','signatures'];
  function normalizeNcTab(tab){
    return nonconformanceTabs.indexOf(tab) >= 0 ? tab : 'overview';
  }
  function defaultNonconformanceRecord(recordId){
    return {
      recordId: recordId || 'NC-001',
      rootCode: 'NQCASE',
      title: 'Dimensional nonconformance on operation OP-30',
      subtype: 'Material nonconformance',
      status: 'triaged',
      severity: 'major',
      state: 'current',
      freshness: 'fixture_current',
      owner: 'QA Engineer',
      source: 'In-process inspection',
      part: 'PN-2042 Rev B',
      lot: 'LOT-2026-04',
      workOrder: 'WO-3011',
      stateMessage: 'Read-only prototype shell. Governed actions must remain outside this fixture.',
      lifecycle: [
        ['opened','complete'],
        ['triaged','current'],
        ['investigation','pending'],
        ['disposition','locked'],
        ['closure','locked']
      ],
      overview: [
        'Nonconformance identified during in-process inspection.',
        'Containment and disposition are represented as read-only placeholders in this prototype.'
      ],
      investigation: [
        'Investigation placeholder: cause analysis, containment notes, and measurement review will re-anchor to governed records.',
        'No investigation submission or workflow transition is available from this shell.'
      ],
      evidence: [
        'Evidence placeholder: photos, measurements, and attachments are displayed as read-only fixture rows.',
        'Evidence upload and versioning are out of scope for this slice.'
      ],
      related: [
        ['Work order','WO-3011'],
        ['Dispatch target','DISP-011'],
        ['Potential CAPA','read-only placeholder']
      ],
      audit: [
        'Fixture opened for preview.',
        'No audit event is written by this prototype shell.'
      ],
      signatures: [
        'Disposition signature: not executed in prototype.',
        'Closure signature: not executed in prototype.'
      ],
      limitations: []
    };
  }
  function mergeRecord(base, override){
    override = override || {};
    Object.keys(override).forEach(function(k){ base[k] = override[k]; });
    return base;
  }
  function getNonconformanceRecord(route){
    var p = route.params || {};
    var recordId = p.record_id || 'NC-001';
    var fixture = window.HMV4_NONCONFORMANCE_CASE_FIXTURE || readJsonFixture('[data-hmv4-nonconformance-case-fixture]') || {};
    var record = defaultNonconformanceRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    record.recordId = recordId;
    record.rootCode = 'NQCASE';
    return record;
  }
  function renderLifecycle(record){
    var stages = Array.isArray(record.lifecycle) ? record.lifecycle : [];
    return '<ol class="hmv4-lifecycle-strip" data-hmv4-lifecycle-strip aria-label="Nonconformance lifecycle">' + stages.map(function(stage){
      return '<li data-lifecycle-state="'+esc(stage[1] || 'pending')+'"><strong>'+esc(stage[0])+'</strong><span>'+esc(stage[1] || 'pending')+'</span></li>';
    }).join('') + '</ol>';
  }
  function renderReadOnlyActions(){
    return '<div class="hmv4-grid" data-hmv4-nc-readonly-actions>'+
      '<article class="hmv4-card"><h3>Disposition</h3><p>Approval is unavailable from this read-only prototype.</p><button type="button" disabled data-hmv4-mutation-intent="nqcase-approve-disposition">Approve disposition disabled</button></article>'+
      '<article class="hmv4-card"><h3>CAPA</h3><p>CAPA creation and closure are out of scope.</p><button type="button" disabled data-hmv4-mutation-intent="nqcase-create-capa">Create CAPA disabled</button></article>'+
      '<article class="hmv4-card"><h3>Signature</h3><p>E-sign challenge execution is out of scope.</p><button type="button" disabled data-hmv4-mutation-intent="nqcase-esign">E-sign disabled</button></article>'+
      '</div>';
  }
  function renderNcPanel(tab, record){
    if(tab === 'overview'){
      return '<div class="hmv4-section"><h3>Overview</h3>'+record.overview.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+
        '<dl class="hmv4-record-facts"><dt>Subtype</dt><dd>'+esc(record.subtype)+'</dd><dt>Status</dt><dd>'+esc(record.status)+'</dd><dt>Severity</dt><dd>'+esc(record.severity)+'</dd><dt>Source</dt><dd>'+esc(record.source)+'</dd><dt>Part</dt><dd>'+esc(record.part)+'</dd><dt>Lot</dt><dd>'+esc(record.lot)+'</dd><dt>Work order</dt><dd>'+esc(record.workOrder)+'</dd></dl>'+renderReadOnlyActions()+'</div>';
    }
    if(tab === 'investigation'){
      return '<div class="hmv4-section"><h3>Investigation</h3>'+record.investigation.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</div>';
    }
    if(tab === 'evidence'){
      return '<div class="hmv4-section"><h3>Evidence</h3>'+record.evidence.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</div>';
    }
    if(tab === 'related'){
      return '<div class="hmv4-section"><h3>Related records</h3><table class="hmv4-data-table"><thead><tr><th>Type</th><th>Reference</th></tr></thead><tbody>'+record.related.map(function(x){return '<tr><td>'+esc(x[0])+'</td><td>'+esc(x[1])+'</td></tr>';}).join('')+'</tbody></table></div>';
    }
    if(tab === 'audit'){
      return '<div class="hmv4-section"><h3>Audit</h3>'+record.audit.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</div>';
    }
    return '<div class="hmv4-section"><h3>Signatures</h3>'+record.signatures.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</div>';
  }
  function renderNonconformanceRecord(route){
    var p = route.params, tab = normalizeNcTab(route.query.tab || 'overview');
    var record = getNonconformanceRecord(route);
    var state = record.state || 'current';
    var feedbackState = state === 'current' ? 'info' : 'warning';
    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--nonconformance" data-hmv4-nonconformance-record data-route-class="AR" data-resource-family="nonconformance-cases" data-root-code="NQCASE" data-record-id="'+esc(p.record_id)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(record.freshness || 'fixture_current')+'">' +
      '<section class="hmv4-record-identity"><h1 class="hmv4-record-title">'+esc(record.recordId)+'</h1><p class="hmv4-record-subtitle">'+esc(record.title)+'</p><div class="hmv4-chip-row"><span class="hmv4-chip">'+esc(record.subtype)+'</span><span class="hmv4-chip">'+esc(record.status)+'</span><span class="hmv4-chip">'+esc(record.severity)+'</span></div></section>'+
      '<div class="hmv4-feedback" data-feedback-state="'+esc(feedbackState)+'" role="status" data-hmv4-nc-state><strong>Record posture</strong><p>'+esc(state)+' / '+esc(record.freshness || 'fixture_current')+'. '+esc(record.stateMessage || 'Read-only fixture shell.')+'</p></div>'+
      (record.limitations && record.limitations.length ? '<div class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-nc-access><strong>Access limitation</strong><p>'+record.limitations.map(esc).join(' ')+'</p></div>' : '')+
      renderLifecycle(record)+
      '<div class="hmv4-tablist" role="tablist" aria-label="Nonconformance case details">'+nonconformanceTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-'+t+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      nonconformanceTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-nc-panel="'+esc(t)+'">'+renderNcPanel(t, record)+'</section>';}).join('')+
      '</article>';
  }
  function renderRecord(route){
    var p = route.params, tab = route.query.tab || 'overview';
    if(p.resource_family === 'nonconformance-cases') return renderNonconformanceRecord(route);
    var tabs = ['overview','workflow','related','evidence','comments','audit'];
    return '<article class="hmv4-record-shell hmv4-record-shell--display" data-route-class="AR" data-resource-family="'+esc(p.resource_family)+'" data-record-id="'+esc(p.record_id)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'">' +
      '<section class="hmv4-record-identity"><h1 class="hmv4-record-title">'+esc(p.record_id)+'</h1><p class="hmv4-record-subtitle">'+esc(p.resource_family)+' authoritative record shell</p></section>'+
      '<div class="hmv4-tablist" role="tablist" aria-label="Record details">'+tabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-'+t+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      tabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-'+t+'" '+(t===tab?'':'hidden')+'><div class="hmv4-section"><h3>'+esc(t)+'</h3><p>Placeholder for '+esc(t)+' section.</p></div></section>';}).join('')+
      '</article>';
  }
  function readJsonFixture(selector){
    var node = document.querySelector(selector);
    if(!node) return null;
    try { return JSON.parse(node.textContent || '{}'); } catch(e) { return null; }
  }
  function getDispatchProjection(){
    var projection = window.HMV4_DISPATCH_BOARD_PROJECTION || readJsonFixture('[data-hmv4-dispatch-board-fixture]');
    if(!projection || !Array.isArray(projection.lanes)){
      return {
        projectionId: 'dispatch-board-empty-projection',
        freshness: 'fixture_missing',
        reanchorMessage: 'Open the dispatch target record before mutation.',
        summary: { ready: 0, running: 0, blocked: 0, stale: 0 },
        lanes: []
      };
    }
    return projection;
  }
  function isDispatchBoardRoute(route){
    return route && route.params && route.params.domain === 'planning-scheduling' && route.params.module === 'dispatch-board' && route.params.workspace_family === 'board';
  }
  function renderDispatchCard(card){
    var signals = Array.isArray(card.signals) ? card.signals : [];
    return '<article class="hmv4-card" data-hmv4-dispatch-card data-dispatch-target-id="'+esc(card.id)+'" data-mutation-posture="'+esc(card.mutationPosture || 'reanchor_required')+'">' +
      '<h3>'+esc(card.title || card.id)+'</h3>'+
      '<p><strong>Status:</strong> '+esc(card.status || 'unknown')+'</p>'+
      '<p><strong>Work center:</strong> '+esc(card.workCenter || 'unassigned')+'</p>'+
      '<p><strong>Priority:</strong> '+esc(card.priority || 'normal')+' | <strong>Due:</strong> '+esc(card.due || 'not scheduled')+'</p>'+
      (signals.length ? '<p><strong>Signals:</strong> '+signals.map(esc).join(', ')+'</p>' : '')+
      '<div class="hmv4-feedback" data-feedback-state="warning" role="status"><strong>Read-only projection</strong><p>'+esc(card.reanchorMessage || 'Open the dispatch target record before mutation.')+'</p></div>'+
      '<p><a data-hmv4-record-link href="'+esc(card.recordHref || '/ops/records/dispatch-targets/'+(card.id || 'DISP-UNKNOWN')+'?tab=overview')+'">Open dispatch target record</a></p>'+
      '<button type="button" disabled data-hmv4-mutation-intent="dispatch-start" aria-describedby="hmv4-dispatch-reanchor-note">Start disabled</button> '+
      '<button type="button" disabled data-hmv4-mutation-intent="dispatch-resequence" aria-describedby="hmv4-dispatch-reanchor-note">Resequence disabled</button>'+
      '</article>';
  }
  function renderDispatchBoardWorkspace(route){
    var projection = getDispatchProjection();
    var lanes = projection.lanes || [];
    var summary = projection.summary || {};
    var view = route.query.view || 'default';
    var freshness = projection.freshness || 'fixture_current';
    var state = projection.state || (freshness === 'fixture_current' ? 'current' : 'degraded');
    return '<section class="hmv4-workspace-shell" aria-label="Dispatch board projection workspace" data-route-class="WS" data-domain="planning-scheduling" data-module="dispatch-board" data-workspace-family="board" data-hmv4-dispatch-board data-authority-class="projection" data-requires-reanchor="true" data-projection-id="'+esc(projection.projectionId || 'dispatch-board-projection')+'" data-projection-freshness="'+esc(freshness)+'" data-projection-state="'+esc(state)+'" data-query-view="'+esc(view)+'">' +
      '<header class="hmv4-workspace-header"><h1 class="hmv4-workspace-title">Dispatch Board</h1><p class="hmv4-workspace-subtitle">Read-only projection workspace. Live dispatch actions must re-anchor to authoritative records.</p></header>'+
      '<div class="hmv4-feedback" data-feedback-state="warning" role="status" id="hmv4-dispatch-reanchor-note"><strong>Projection only</strong><p>'+esc(projection.reanchorMessage || 'Open the dispatch target record before mutation.')+'</p></div>'+
      '<div class="hmv4-feedback" data-feedback-state="'+(state === 'current' ? 'success' : 'warning')+'" role="status" data-hmv4-dispatch-freshness><strong>Projection state</strong><p>'+esc(state)+' / '+esc(freshness)+'</p></div>'+
      '<div class="hmv4-grid" aria-label="Dispatch board summary">'+
        '<article class="hmv4-card"><h3>Ready</h3><p data-hmv4-summary="ready">'+esc(summary.ready || 0)+' targets</p></article>'+
        '<article class="hmv4-card"><h3>Running</h3><p data-hmv4-summary="running">'+esc(summary.running || 0)+' targets</p></article>'+
        '<article class="hmv4-card"><h3>Blocked</h3><p data-hmv4-summary="blocked">'+esc(summary.blocked || 0)+' targets</p></article>'+
        '<article class="hmv4-card"><h3>Stale</h3><p data-hmv4-summary="stale">'+esc(summary.stale || 0)+' targets need review</p></article>'+
      '</div>'+
      '<div class="hmv4-grid" data-hmv4-dispatch-lanes>'+
      (lanes.length ? lanes.map(function(lane){
        var cards = Array.isArray(lane.cards) ? lane.cards : [];
        return '<section class="hmv4-section" data-hmv4-dispatch-lane="'+esc(lane.id)+'" aria-label="'+esc(lane.title || lane.id)+' lane">'+
          '<h3>'+esc(lane.title || lane.id)+'</h3>'+
          '<p>'+esc(lane.description || 'Read-only dispatch targets for this lane.')+'</p>'+
          (cards.length ? cards.map(renderDispatchCard).join('') : '<div class="hmv4-feedback" data-feedback-state="info"><strong>No targets</strong><p>This lane has no fixture targets.</p></div>')+
          '</section>';
      }).join('') : '<div class="hmv4-feedback" data-feedback-state="warning"><strong>No projection staged</strong><p>No dispatch board fixture data was found for this route.</p></div>')+
      '</div></section>';
  }
  function renderWorkspace(route){
    var p = route.params;
    if(isDispatchBoardRoute(route)) return renderDispatchBoardWorkspace(route);
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
  window.Hmv4Renderers = { renderRoute: renderRoute, applyShell: applyShell, renderNav: renderNav, renderDispatchBoardWorkspace: renderDispatchBoardWorkspace, renderNonconformanceRecord: renderNonconformanceRecord, domains: domains, modules: modules };
})();
