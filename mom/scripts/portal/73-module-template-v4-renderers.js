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
  function navFixture(){ return window.HMV4_NAV_SHELL_FIXTURE || readJsonFixture('[data-hmv4-nav-shell-fixture]') || {}; }
  function findNavDomain(domainsList, domainKey){
    for(var i=0;i<domainsList.length;i++) if(domainsList[i].key === domainKey) return domainsList[i];
    return null;
  }
  function findNavModule(modulesList, moduleKey){
    for(var i=0;i<modulesList.length;i++) if(modulesList[i].key === moduleKey) return modulesList[i];
    return null;
  }
  function renderShellHome(route){
    var fixture = navFixture();
    var domainsList = fixture.domains || [];
    var search = '<form class="hmv4-search" role="search" aria-label="Search records or workspaces" data-hmv4-shell-search><input type="search" placeholder="Search..." disabled aria-disabled="true"></form>';
    var tiles = domainsList.map(function(d){
      var moduleCount = (d.modules || []).length;
      return '<a class="hmv4-card hmv4-domain-tile" href="/ops/'+esc(d.key)+'" data-hmv4-domain-tile data-domain-key="'+esc(d.key)+'">'+
        '<h2>'+esc(d.name)+'</h2>'+
        '<p class="hmv4-text-2">'+moduleCount+' module'+(moduleCount===1?'':'s')+'</p>'+
      '</a>';
    }).join('');
    return '<section class="hmv4-shell-home" data-hmv4-shell-home data-route-class="SH">'+
      '<header class="hmv4-page-header-zone"><h1>Operations</h1>'+search+'</header>'+
      '<div class="hmv4-grid">'+tiles+'</div>'+
    '</section>';
  }
  function renderDomainLanding(route){
    var p = route.params || {};
    var domainKey = p.domain || '';
    var fixture = navFixture();
    var domainsList = fixture.domains || [];
    var modulesList = fixture.modules || [];
    var domain = findNavDomain(domainsList, domainKey);

    if(!domain){
      return '<section class="hmv4-domain-landing" data-hmv4-domain-landing data-route-class="DL" data-domain-key="'+esc(domainKey)+'" data-fixture-state="unknown">'+
        '<div class="hmv4-feedback" data-feedback-state="warning">Unknown domain "'+esc(domainKey)+'". Open <a href="/ops">shell home</a>.</div>'+
      '</section>';
    }

    var moduleKeys = domain.modules || [];
    var domainModules = modulesList.filter(function(m){ return moduleKeys.indexOf(m.key) >= 0; });
    var tiles = domainModules.map(function(m){
      return '<a class="hmv4-card hmv4-module-tile" href="/ops/'+esc(domainKey)+'/'+esc(m.key)+'" data-hmv4-module-tile data-domain-key="'+esc(domainKey)+'" data-module-key="'+esc(m.key)+'">'+
        '<h3>'+esc(m.name)+'</h3>'+
        (m.summary ? '<p class="hmv4-text-2">'+esc(m.summary)+'</p>' : '')+
      '</a>';
    }).join('');
    var crumbs = '<nav aria-label="Breadcrumb"><ol class="hmv4-breadcrumb"><li><a href="/ops">Operations</a></li><li aria-current="page">'+esc(domain.name)+'</li></ol></nav>';

    return '<section class="hmv4-domain-landing" data-hmv4-domain-landing data-route-class="DL" data-domain-key="'+esc(domainKey)+'">'+
      '<header class="hmv4-page-header-zone">'+crumbs+'<h1>'+esc(domain.name)+'</h1>'+(domain.summary?'<p class="hmv4-page-subtitle">'+esc(domain.summary)+'</p>':'')+'</header>'+
      '<div class="hmv4-grid">'+tiles+'</div>'+
    '</section>';
  }
  function renderModuleLanding(route){
    var p = route.params || {};
    var domainKey = p.domain || '';
    var moduleKey = p.module || '';
    var fixture = navFixture();
    var domainsList = fixture.domains || [];
    var modulesList = fixture.modules || [];
    var domain = findNavDomain(domainsList, domainKey);
    var module = findNavModule(modulesList, moduleKey);

    if(!domain || !module){
      return '<section class="hmv4-module-landing" data-hmv4-module-landing data-route-class="ML" data-domain-key="'+esc(domainKey)+'" data-module-key="'+esc(moduleKey)+'" data-fixture-state="unknown">'+
        '<div class="hmv4-feedback" data-feedback-state="warning">Unknown module "'+esc(domainKey)+'/'+esc(moduleKey)+'". Open <a href="/ops/'+esc(domainKey)+'">domain landing</a>.</div>'+
      '</section>';
    }

    var tiles = (module.tiles || []).map(function(t){
      var href = t.href || '';
      return '<a class="hmv4-card hmv4-module-tile" href="'+esc(href)+'" data-hmv4-tile-kind="'+esc(t.kind || 'workspace')+'">'+
        '<h3>'+esc(t.label)+'</h3>'+
        (t.summary ? '<p class="hmv4-text-2">'+esc(t.summary)+'</p>' : '')+
      '</a>';
    }).join('');

    if(!tiles){
      tiles = '<div class="hmv4-feedback" data-feedback-state="bridge" data-hmv4-module-empty>'+
        '<p>No tiles configured for this module fixture.</p>'+
      '</div>';
    }

    var crumbs = '<nav aria-label="Breadcrumb"><ol class="hmv4-breadcrumb">'+
      '<li><a href="/ops">Operations</a></li>'+
      '<li><a href="/ops/'+esc(domainKey)+'">'+esc(domain.name)+'</a></li>'+
      '<li aria-current="page">'+esc(module.name)+'</li>'+
    '</ol></nav>';

    return '<section class="hmv4-module-landing" data-hmv4-module-landing data-route-class="ML" data-domain-key="'+esc(domainKey)+'" data-module-key="'+esc(moduleKey)+'">'+
      '<header class="hmv4-page-header-zone">'+crumbs+'<h1>'+esc(module.name)+'</h1>'+(module.summary?'<p class="hmv4-page-subtitle">'+esc(module.summary)+'</p>':'')+'</header>'+
      '<div class="hmv4-grid">'+tiles+'</div>'+
    '</section>';
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
  var capaTabs = ['overview','analysis','actions','verification','effectiveness','related','audit','signatures'];
  function normaliseCapaTab(tab){
    return capaTabs.indexOf(tab) >= 0 ? tab : 'overview';
  }
  function defaultCapaRecord(recordId){
    return {
      recordId: recordId || 'CAPA-001',
      rootCode: 'CAPA',
      title: 'Operator training gap on operation OP-30',
      summary: 'CAPA opened from NC-001 dimensional issue. Containment complete; root cause analysis in progress.',
      severity: 'major',
      state: 'analysis',
      owner: 'Quality Engineer',
      dueDate: '2026-06-30',
      linkedNcId: 'NC-001',
      lifecycle: [
        ['draft','complete'],
        ['analysis','current'],
        ['action-planning','pending'],
        ['execution','locked'],
        ['verification','locked'],
        ['effectiveness','locked'],
        ['closed','locked']
      ],
      stateMessage: 'Read-only prototype shell. Governed CAPA actions must remain outside this fixture.',
      freshness: 'fixture_current',
      rootCauses: [
        { category: 'Training', text: 'Operator OP-1002 had expired QUAL_INJ_BASIC certification.' },
        { category: 'Process', text: 'Pre-shift competency check did not run on this date.' }
      ],
      actionPlan: [
        { title: 'Re-certify OP-1002', owner: 'Training Lead', dueDate: '2026-05-15', status: 'in_progress' },
        { title: 'Add daily competency check to shift handoff', owner: 'Production Supervisor', dueDate: '2026-05-30', status: 'planned' }
      ],
      verifications: [],
      effectivenessChecks: [],
      relatedRecords: [
        { resourceFamily: 'nonconformance-cases', recordId: 'NC-001', label: 'NC-001 dimensional NC' },
        { resourceFamily: 'training-records', recordId: 'TR-7003', label: 'TR-7003 OP-1002 training certification' }
      ],
      limitations: []
    };
  }
  function getCapaRecord(route){
    var p = route.params || {};
    var recordId = p.record_id || 'CAPA-001';
    var fixture = window.HMV4_CAPA_RECORD_FIXTURE || readJsonFixture('[data-hmv4-capa-record-fixture]') || {};
    var record = defaultCapaRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    var state = (route.query && route.query.state) || fixture.state || record.state || 'analysis';
    var stateOverlay = (fixture.states || {})[state] || null;
    if(stateOverlay){
      record.state = state;
      if(stateOverlay.freshness) record.freshness = stateOverlay.freshness;
      if(stateOverlay.stateMessage) record.stateMessage = stateOverlay.stateMessage;
      if(stateOverlay.limitations) record.limitations = stateOverlay.limitations;
    }
    record.recordId = recordId;
    record.rootCode = 'CAPA';
    return record;
  }
  function renderCapaPanel(tab, record){
    var capaActions = record.actionPlan || [];
    var rootCauses = record.rootCauses || [];
    var verifications = record.verifications || [];
    var effectivenessChecks = record.effectivenessChecks || [];

    if(tab === 'overview'){
      return '<div class="hmv4-section"><h3>Overview</h3>' +
        '<p>'+esc(record.summary || 'CAPA opened from upstream NQCASE. Read-only overview fixture.')+'</p>' +
        '<dl class="hmv4-meta-grid">' +
          '<dt>Linked NC</dt><dd>'+esc(record.linkedNcId || '-')+'</dd>' +
          '<dt>Severity</dt><dd>'+esc(record.severity || '-')+'</dd>' +
          '<dt>Owner</dt><dd>'+esc(record.owner || '-')+'</dd>' +
          '<dt>Due date</dt><dd>'+esc(record.dueDate || '-')+'</dd>' +
        '</dl></div>';
    }
    if(tab === 'analysis'){
      if(rootCauses.length === 0) return '<div class="hmv4-section"><h3>Root cause analysis</h3><p class="hmv4-text-2">No root causes recorded. Read-only placeholder.</p></div>';
      return '<div class="hmv4-section"><h3>Root cause analysis</h3><ul class="hmv4-list">' +
        rootCauses.map(function(rc){return '<li><strong>'+esc(rc.category)+'</strong>: '+esc(rc.text)+'</li>';}).join('') +
        '</ul></div>';
    }
    if(tab === 'actions'){
      if(capaActions.length === 0) return '<div class="hmv4-section"><h3>Action plan</h3><p class="hmv4-text-2">No actions planned. Read-only placeholder.</p></div>';
      return '<div class="hmv4-section"><h3>Action plan</h3><table class="hmv4-data-table"><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>' +
        capaActions.map(function(a){return '<tr><td>'+esc(a.title)+'</td><td>'+esc(a.owner)+'</td><td>'+esc(a.dueDate)+'</td><td>'+esc(a.status)+'</td></tr>';}).join('') +
        '</tbody></table></div>';
    }
    if(tab === 'verification'){
      if(verifications.length === 0) return '<div class="hmv4-section"><h3>Verification</h3><p class="hmv4-text-2">No verifications recorded. Read-only placeholder.</p></div>';
      return '<div class="hmv4-section"><h3>Verification</h3><ul class="hmv4-list">' +
        verifications.map(function(v){return '<li>'+esc(v.summary)+' - '+esc(v.verifiedBy)+' on '+esc(v.verifiedAt)+'</li>';}).join('') +
        '</ul></div>';
    }
    if(tab === 'effectiveness'){
      if(effectivenessChecks.length === 0) return '<div class="hmv4-section"><h3>Effectiveness check</h3><p class="hmv4-text-2">No effectiveness checks recorded. Read-only placeholder.</p></div>';
      return '<div class="hmv4-section"><h3>Effectiveness check</h3><ul class="hmv4-list">' +
        effectivenessChecks.map(function(e){return '<li>'+esc(e.summary)+' - result: '+esc(e.result)+'</li>';}).join('') +
        '</ul></div>';
    }
    if(tab === 'related'){
      var related = record.relatedRecords || [];
      if(related.length === 0) return '<div class="hmv4-section"><h3>Related records</h3><p class="hmv4-text-2">No related records. Read-only placeholder.</p></div>';
      return '<div class="hmv4-section"><h3>Related records</h3><ul class="hmv4-list">' +
        related.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';}).join('') +
        '</ul></div>';
    }
    if(tab === 'audit') return '<div class="hmv4-section"><h3>Audit trail</h3><p class="hmv4-text-2">Read-only placeholder. Audit events surface in production via /api/v1/capas/{id}/audit.</p></div>';
    if(tab === 'signatures') return '<div class="hmv4-section"><h3>Signatures</h3><p class="hmv4-text-2">Read-only placeholder. e-Signatures (21 CFR Part 11) surface in production via /api/v1/electronic-signatures.</p></div>';
    return '<div class="hmv4-section"><p>Unknown tab.</p></div>';
  }
  function renderCapaMutationButton(intent, label, noteId){
    return '<button class="hmv4-button" type="button" disabled aria-disabled="true" aria-describedby="'+esc(noteId)+'" data-hmv4-mutation-intent="'+esc(intent)+'">'+esc(label)+'</button>';
  }
  function renderCapaRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseCapaTab(q.tab || 'overview');
    var recordId = p.record_id || 'CAPA-001';
    var record = getCapaRecord(route);
    var state = record.state || 'analysis';
    var freshness = record.freshness || 'fixture_current';
    var limitations = record.limitations || [];
    var lifecycle = record.lifecycle || [];
    var noteId = 'hmv4-capa-mutation-note';

    var head =
      '<section class="hmv4-record-identity">' +
        '<h1 class="hmv4-record-title">'+esc(recordId)+'</h1>' +
        '<p class="hmv4-record-subtitle">'+esc(record.title)+'</p>' +
        '<dl class="hmv4-meta-grid">' +
          '<dt>Severity</dt><dd>'+esc(record.severity || '')+'</dd>' +
          '<dt>State</dt><dd>'+esc(state)+'</dd>' +
          '<dt>Owner</dt><dd>'+esc(record.owner || '')+'</dd>' +
          '<dt>Linked NC</dt><dd>'+esc(record.linkedNcId || '-')+'</dd>' +
        '</dl>' +
        (record.stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-capa-state>'+esc(record.stateMessage)+'</p>' : '') +
      '</section>';

    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-capa-lifecycle aria-label="CAPA lifecycle">' +
      lifecycle.map(function(s){return '<li data-lifecycle-state="'+esc(s[1] || 'pending')+'"><strong>'+esc(s[0])+'</strong><span>'+esc(s[1] || 'pending')+'</span></li>';}).join('') +
      '</ol>';

    var partialAccessNotice = '';
    if(state === 'partial_access' && limitations.length){
      partialAccessNotice =
        '<section class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-capa-partial>' +
          '<strong>Partial access</strong>' +
          '<ul>'+limitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul>' +
        '</section>';
    }

    var intents = [
      ['capa-start-analysis','Start analysis'],
      ['capa-record-root-cause','Record root cause'],
      ['capa-add-action-plan','Add action plan'],
      ['capa-assign-action','Assign action'],
      ['capa-submit-approval','Submit for approval'],
      ['capa-submit-verification','Submit verification'],
      ['capa-record-effectiveness','Record effectiveness'],
      ['capa-close','Close CAPA'],
      ['capa-cancel','Cancel CAPA'],
      ['capa-esign','e-Sign']
    ];
    var disabledLaunchers =
      '<section class="hmv4-toolbar" aria-label="Disabled CAPA mutation launchers" data-hmv4-capa-launchers>' +
        intents.map(function(intent){ return renderCapaMutationButton(intent[0], intent[1] + ' disabled', noteId); }).join('') +
        '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Mutation actions are disabled in this read-only prototype. Governed approval, verification, effectiveness, closure, cancellation, and e-sign execution remain outside fixture scope.</span>' +
      '</section>';

    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--capa" data-hmv4-capa-record data-route-class="AR" data-resource-family="capas" data-root-code="CAPA" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">' +
      head + lifecycleStrip + partialAccessNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="CAPA case details">' + capaTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-capa-'+t+'">'+esc(t)+'</button>';}).join('') + '</div>' +
      capaTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-capa-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-capa-panel="'+esc(t)+'">'+renderCapaPanel(t, record)+'</section>';}).join('') +
      '</article>';
  }
  function renderRecord(route){
    var p = route.params, tab = route.query.tab || 'overview';
    if(p.resource_family === 'nonconformance-cases') return renderNonconformanceRecord(route);
    if(p.resource_family === 'capas') return renderCapaRecord(route);
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
  function getTrainingMatrixProjection(){
    var projection = window.HMV4_TRAINING_MATRIX_PROJECTION || readJsonFixture('[data-hmv4-training-matrix-fixture]');
    if(!projection || !Array.isArray(projection.operators)){
      return {
        projectionId: 'training-matrix-empty-projection',
        freshness: 'fixture_missing',
        reanchorMessage: 'Open the training record before issuing or completing certification.',
        summary: { qualified: 0, expiring: 0, expired: 0, in_training: 0, not_required: 0 },
        qualifications: [],
        operators: []
      };
    }
    return projection;
  }
  function isTrainingMatrixRoute(route){
    return route && route.params && route.params.domain === 'people-skill-ehs' && route.params.module === 'training-competency' && route.params.workspace_family === 'matrix';
  }
  var trainingStatusFeedback = { qualified: 'success', expiring: 'warning', expired: 'danger', in_training: 'info', not_required: 'info' };
  function renderTrainingStatusCell(cell){
    var status = cell.status || 'not_required';
    var feedback = trainingStatusFeedback[status] || 'info';
    var recordHref = cell.evidence_link || (cell.training_record_id ? '/ops/records/training-records/'+cell.training_record_id+'?tab=overview' : null);
    var html = '<td role="gridcell" data-hmv4-training-cell data-training-status="'+esc(status)+'" data-feedback-state="'+esc(feedback)+'" data-label="'+esc(cell.qualification_code || '')+'">' +
      '<span class="hmv4-chip" data-hmv4-training-status-text>'+esc(status)+'</span>';
    if(cell.last_certified_at) html += ' <span data-hmv4-training-last-cert>Last: '+esc(cell.last_certified_at)+'</span>';
    if(cell.expires_at) html += ' <span data-hmv4-training-expires>Expires: '+esc(cell.expires_at)+'</span>';
    if(recordHref) html += ' <a data-hmv4-record-link href="'+esc(recordHref)+'">Open record</a>';
    return html + '</td>';
  }
  function renderTrainingMatrixWorkspace(route){
    var projection = getTrainingMatrixProjection();
    var qualifications = Array.isArray(projection.qualifications) ? projection.qualifications : [];
    var operators = Array.isArray(projection.operators) ? projection.operators : [];
    var summary = projection.summary || {};
    var freshness = projection.freshness || 'fixture_current';
    var state = projection.state || (freshness === 'fixture_current' ? 'current' : 'degraded');
    var limitations = Array.isArray(projection.limitations) ? projection.limitations : [];
    var query = route.query || {};
    var filterKeys = ['view','scope','lane','group_by','q'];
    var activeFilters = filterKeys.filter(function(k){ return query[k]; }).map(function(k){ return [k, query[k]]; });
    var html = '<section class="hmv4-workspace-shell" aria-label="Training matrix projection workspace" data-route-class="WS" data-domain="people-skill-ehs" data-module="training-competency" data-workspace-family="matrix" data-hmv4-training-matrix data-authority-class="projection" data-resource-family="training-records" data-root-code="TRAIN" data-requires-reanchor="true" data-projection-id="'+esc(projection.projectionId || 'training-matrix-projection')+'" data-projection-freshness="'+esc(freshness)+'" data-projection-state="'+esc(state)+'" data-query-view="'+esc(query.view || 'default')+'">' +
      '<header class="hmv4-workspace-header"><h1 class="hmv4-workspace-title">Training matrix</h1><p class="hmv4-workspace-subtitle">Read-only qualification projection. Certification and completion must re-anchor to training-record authority.</p></header>'+
      '<div class="hmv4-feedback" data-feedback-state="warning" role="status" id="hmv4-training-reanchor-note"><strong>Projection only</strong><p>'+esc(projection.reanchorMessage || 'Open the training record before issuing or completing certification.')+'</p></div>'+
      '<div class="hmv4-feedback" data-feedback-state="'+(state === 'current' ? 'success' : 'warning')+'" role="status" data-hmv4-training-freshness><strong>Projection state</strong><p>'+esc(state)+' / '+esc(freshness)+'</p></div>'+
      (limitations.length ? '<div class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-training-access><strong>Access limitation</strong><p>'+limitations.map(esc).join(' ')+'</p></div>' : '')+
      '<div class="hmv4-chip-row" data-hmv4-training-filters aria-label="Active subject filters">'+
      (activeFilters.length ? activeFilters.map(function(f){ return '<span class="hmv4-chip">'+esc(f[0])+': '+esc(f[1])+'</span>'; }).join('') : '<span class="hmv4-chip" data-hmv4-training-filters-empty>All operators (no filter)</span>')+
      '</div>'+
      '<div class="hmv4-grid" aria-label="Training matrix summary">'+
      ['qualified','expiring','expired','in_training','not_required'].map(function(key){
        return '<article class="hmv4-card"><h3>'+esc(key)+'</h3><p data-hmv4-training-summary="'+esc(key)+'">'+esc(summary[key] || 0)+' operators</p></article>';
      }).join('')+
      '</div>'+
      '<div class="hmv4-grid" data-hmv4-training-readonly-actions>'+
      '<article class="hmv4-card"><h3>Issue qualification</h3><p>Issue qualification is unavailable from this projection.</p><button type="button" disabled data-hmv4-mutation-intent="train-issue-qualification" aria-describedby="hmv4-training-reanchor-note">Issue qualification disabled</button></article>'+
      '<article class="hmv4-card"><h3>Schedule training</h3><p>Schedule training is unavailable from this projection.</p><button type="button" disabled data-hmv4-mutation-intent="train-schedule-training" aria-describedby="hmv4-training-reanchor-note">Schedule training disabled</button></article>'+
      '<article class="hmv4-card"><h3>Acknowledge / Sign</h3><p>Acknowledgement and e-sign are out of scope for this projection.</p><button type="button" disabled data-hmv4-mutation-intent="train-acknowledge" aria-describedby="hmv4-training-reanchor-note">Acknowledge disabled</button></article>'+
      '</div>';
    if(operators.length && qualifications.length){
      html += '<table class="hmv4-data-table" role="grid" aria-label="Training matrix" data-hmv4-training-matrix-grid>'+
        '<thead><tr role="row"><th scope="col" role="columnheader">Operator</th><th scope="col" role="columnheader">Role</th><th scope="col" role="columnheader">Team</th>'+
        qualifications.map(function(q){ return '<th scope="col" role="columnheader" data-hmv4-training-qual="'+esc(q.code)+'">'+esc(q.name || q.code)+'</th>'; }).join('')+
        '</tr></thead><tbody>'+
        operators.map(function(op){
          var cells = Array.isArray(op.cells) ? op.cells : [];
          var cellByCode = {};
          cells.forEach(function(c){ cellByCode[c.qualification_code] = c; });
          return '<tr role="row" data-hmv4-training-operator data-operator-id="'+esc(op.id)+'">'+
            '<td role="rowheader" data-label="Operator">'+esc(op.name || op.id)+'</td>'+
            '<td role="cell" data-label="Role">'+esc(op.role || 'unassigned')+'</td>'+
            '<td role="cell" data-label="Team">'+esc(op.team || 'unassigned')+'</td>'+
            qualifications.map(function(q){
              return renderTrainingStatusCell(cellByCode[q.code] || { status: 'not_required', qualification_code: q.code });
            }).join('')+
            '</tr>';
        }).join('')+
        '</tbody></table>';
    } else {
      html += '<div class="hmv4-feedback" data-feedback-state="info" data-hmv4-training-empty><strong>No operators in scope</strong><p>This fixture has no matrix rows. Adjust filters or open authoritative training records.</p></div>';
    }
    return html + '</section>';
  }
  function renderWorkspace(route){
    var p = route.params;
    if(isDispatchBoardRoute(route)) return renderDispatchBoardWorkspace(route);
    if(isTrainingMatrixRoute(route)) return renderTrainingMatrixWorkspace(route);
    return '<section class="hmv4-workspace-shell" data-route-class="'+esc(route.routeClass)+'" data-domain="'+esc(p.domain)+'" data-module="'+esc(p.module)+'" data-workspace-family="'+esc(p.workspace_family)+'" data-authority-class="projection" data-requires-reanchor="true">' +
      '<header class="hmv4-workspace-header"><h1 class="hmv4-workspace-title">'+esc(p.workspace_family)+' workspace</h1><p class="hmv4-workspace-subtitle">Projection workspace. Mutations must re-anchor to authoritative record shells.</p></header>'+
      '<div class="hmv4-feedback" data-feedback-state="warning"><strong>Projection surface</strong><p>Rows/cards are not command anchors. Open the record before mutation.</p></div>'+
      '<div class="hmv4-grid"><article class="hmv4-card"><h3>Sample card</h3><p>Open authoritative sample.</p><a href="/ops/records/dispatch-targets/DEMO-001">Open record</a></article></div></section>';
  }
  function renderRoute(route){
    if(!route || !route.ok) return '<div class="hmv4-feedback" data-feedback-state="error"><strong>Invalid route</strong><p>The route cannot be resolved.</p></div>';
    if(route.routeClass === 'SH') return renderShellHome(route);
    if(route.routeClass === 'DL') return renderDomainLanding(route);
    if(route.routeClass === 'ML') return renderModuleLanding(route);
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
    var fixture = navFixture();
    var navDomains = fixture.domains || domains.map(function(d){ return { key: d[0], name: d[1] }; });
    nav.innerHTML = '<div class="hmv4-nav-section"><h2 class="hmv4-nav-section-title">Domains</h2>' + navDomains.map(function(d){ return '<a class="hmv4-nav-link" href="/ops/'+esc(d.key)+'">'+esc(d.name)+'</a>'; }).join('') + '</div>';
  }
  window.Hmv4Renderers = Object.assign(window.Hmv4Renderers || {}, {
    renderRoute: renderRoute,
    applyShell: applyShell,
    renderNav: renderNav,
    renderShellHome: renderShellHome,
    renderDomainLanding: renderDomainLanding,
    renderModuleLanding: renderModuleLanding,
    renderDispatchBoardWorkspace: renderDispatchBoardWorkspace,
    renderTrainingMatrixWorkspace: renderTrainingMatrixWorkspace,
    renderNonconformanceRecord: renderNonconformanceRecord,
    renderCapaRecord: renderCapaRecord,
    domains: domains,
    modules: modules
  });
})();
