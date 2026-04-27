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
  var cdocTabs = ['overview','content','revisions','controlled-copies','effectivity','related','audit','signatures'];
  function normaliseCdocTab(tab){ return cdocTabs.indexOf(tab) >= 0 ? tab : 'overview'; }
  function defaultCdocRecord(recordId){
    return {
      recordId: recordId || 'CDOC-001',
      rootCode: 'CDOC',
      docCode: 'qms-sop-100',
      title: 'Process Validation SOP',
      category: 'SOP',
      classification: 'internal',
      state: 'effective',
      currentRevision: 'B',
      effectiveDate: '2026-01-15',
      owner: 'Quality Manager',
      approver: 'VP Quality',
      approvedAt: '2026-01-10',
      releasedAt: '2026-01-12',
      contentSummary: 'Procedure for IQ/OQ/PQ validation of new manufacturing processes. Applies to all production lines.',
      freshness: 'fixture_current',
      stateMessage: 'Read-only prototype. Document mutation must remain outside this fixture.',
      lifecycle: [
        ['draft','complete'],['in-review','complete'],['approved','complete'],
        ['released','complete'],['effective','current'],['superseded','locked'],['obsolete','locked']
      ],
      revisions: [
        { rev: 'A', date: '2025-06-10', summary: 'Initial release', approver: 'VP Quality' },
        { rev: 'B', date: '2026-01-10', summary: 'Updated PQ acceptance criteria per FDA guidance', approver: 'VP Quality' }
      ],
      controlledCopies: [
        { copyId: 'CC-001', holder: 'Production Line 1 Supervisor', location: 'Line 1 control booth', acknowledgedAt: '2026-01-15' },
        { copyId: 'CC-002', holder: 'Production Line 2 Supervisor', location: 'Line 2 control booth', acknowledgedAt: '2026-01-15' },
        { copyId: 'CC-003', holder: 'QC Lab', location: 'QC Lab Wall', acknowledgedAt: null }
      ],
      effectivity: {
        scope: 'All production validation activities',
        sites: ['Plant 1', 'Plant 2'],
        processes: ['Injection molding', 'CNC machining', 'Assembly'],
        validFrom: '2026-01-15',
        validTo: null
      },
      relatedRecords: [
        { resourceFamily: 'engineering-changes', recordId: 'ECO-2026-014', label: 'ECO-2026-014 process update driving Rev B' },
        { resourceFamily: 'training-records', recordId: 'TR-7050', label: 'TR-7050 Process Validation training' }
      ],
      limitations: []
    };
  }
  function getCdocRecord(route){
    var p = route.params || {};
    var recordId = p.record_id || 'CDOC-001';
    var fixture = window.HMV4_CDOC_RECORD_FIXTURE || readJsonFixture('[data-hmv4-cdoc-record-fixture]') || {};
    var record = defaultCdocRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    var state = (route.query && route.query.state) || fixture.state || record.state || 'effective';
    var stateOverlay = (fixture.states || {})[state] || null;
    if(stateOverlay){
      record.state = state;
      if(stateOverlay.freshness) record.freshness = stateOverlay.freshness;
      if(stateOverlay.stateMessage) record.stateMessage = stateOverlay.stateMessage;
      if(stateOverlay.limitations) record.limitations = stateOverlay.limitations;
    }
    record.recordId = recordId;
    record.rootCode = 'CDOC';
    return record;
  }
  function renderCdocPanel(tab, record){
    if(tab === 'overview'){
      return '<h2>Overview</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Doc code</dt><dd>'+esc(record.docCode || '—')+'</dd>'+
          '<dt>Category</dt><dd>'+esc(record.category || '—')+'</dd>'+
          '<dt>Classification</dt><dd>'+esc(record.classification || '—')+'</dd>'+
          '<dt>Current revision</dt><dd>'+esc(record.currentRevision || '—')+'</dd>'+
          '<dt>Effective date</dt><dd>'+esc(record.effectiveDate || '—')+'</dd>'+
          '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>'+
        '</dl>'+
        '<p>'+esc(record.contentSummary || 'Read-only overview fixture.')+'</p>';
    }
    if(tab === 'content'){
      return '<h2>Content preview</h2>'+
        '<p class="hmv4-text-2">Document body rendering deferred to live integration. This fixture displays a placeholder.</p>'+
        '<div class="hmv4-card hmv4-card--document-preview">'+
          '<h3>'+esc(record.title || 'Document content')+'</h3>'+
          '<p>'+esc(record.contentSummary || '—')+'</p>'+
        '</div>';
    }
    if(tab === 'revisions'){
      var revs = record.revisions || [];
      if(revs.length === 0) return '<h2>Revision history</h2><p class="hmv4-text-2">No revisions recorded.</p>';
      return '<h2>Revision history</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>Rev</th><th>Date</th><th>Summary</th><th>Approver</th></tr></thead><tbody>'+
        revs.map(function(r){return '<tr><td>'+esc(r.rev)+'</td><td>'+esc(r.date)+'</td><td>'+esc(r.summary)+'</td><td>'+esc(r.approver)+'</td></tr>';}).join('')+
        '</tbody></table>';
    }
    if(tab === 'controlled-copies'){
      var copies = record.controlledCopies || [];
      if(copies.length === 0) return '<h2>Controlled copies</h2><p class="hmv4-text-2">No controlled copies issued.</p>';
      return '<h2>Controlled copies</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>Copy ID</th><th>Holder</th><th>Location</th><th>Acknowledged</th></tr></thead><tbody>'+
        copies.map(function(c){return '<tr><td>'+esc(c.copyId)+'</td><td>'+esc(c.holder)+'</td><td>'+esc(c.location)+'</td><td>'+esc(c.acknowledgedAt || '—')+'</td></tr>';}).join('')+
        '</tbody></table>';
    }
    if(tab === 'effectivity'){
      var eff = record.effectivity || {};
      return '<h2>Effectivity scope</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Scope</dt><dd>'+esc(eff.scope || '—')+'</dd>'+
          '<dt>Sites</dt><dd>'+esc((eff.sites || []).join(', ') || '—')+'</dd>'+
          '<dt>Processes</dt><dd>'+esc((eff.processes || []).join(', ') || '—')+'</dd>'+
          '<dt>Valid from</dt><dd>'+esc(eff.validFrom || '—')+'</dd>'+
          '<dt>Valid to</dt><dd>'+esc(eff.validTo || '—')+'</dd>'+
        '</dl>';
    }
    if(tab === 'related'){
      var related = record.relatedRecords || [];
      if(related.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
      return '<h2>Related records</h2><ul class="hmv4-list">'+
        related.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';}).join('')+
        '</ul>';
    }
    if(tab === 'audit') return '<h2>Audit trail</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/controlled-documents/{id}/audit.</p>';
    if(tab === 'signatures') return '<h2>Signatures</h2><p class="hmv4-text-2">Read-only placeholder. e-Signatures (21 CFR Part 11).</p>';
    return '<p>Unknown tab.</p>';
  }
  function renderCdocRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseCdocTab(q.tab || 'overview');
    var recordId = p.record_id || 'CDOC-001';
    var record = getCdocRecord(route);
    var state = record.state || 'effective';
    var freshness = record.freshness || 'fixture_current';
    var limitations = record.limitations || [];
    var noteId = 'hmv4-cdoc-mutation-note';

    var head =
      '<header class="hmv4-record-identity">'+
        '<h1 class="hmv4-record-title">'+esc(record.docCode || recordId)+' &mdash; '+esc(record.title)+'</h1>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Revision</dt><dd>'+esc(record.currentRevision || '')+'</dd>'+
          '<dt>State</dt><dd>'+esc(state)+'</dd>'+
          '<dt>Effective</dt><dd>'+esc(record.effectiveDate || '')+'</dd>'+
          '<dt>Owner</dt><dd>'+esc(record.owner || '')+'</dd>'+
        '</dl>'+
        (record.stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-cdoc-state>'+esc(record.stateMessage)+'</p>' : '')+
      '</header>';

    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-cdoc-lifecycle aria-label="CDOC lifecycle">'+
      (record.lifecycle || []).map(function(s){return '<li data-lifecycle-state="'+esc(s[1] || 'pending')+'"><strong>'+esc(s[0])+'</strong><span>'+esc(s[1] || 'pending')+'</span></li>';}).join('')+
      '</ol>';

    var partialAccessNotice = '';
    if(state === 'partial_access' && limitations.length){
      partialAccessNotice =
        '<section class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-cdoc-partial>'+
          '<strong>Partial access</strong>'+
          '<ul>'+limitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul>'+
        '</section>';
    }

    var intents = [
      ['cdoc-submit-for-review','Submit for review'],
      ['cdoc-approve','Approve'],
      ['cdoc-release','Release'],
      ['cdoc-supersede','Supersede'],
      ['cdoc-obsolete','Obsolete'],
      ['cdoc-acknowledge-controlled-copy','Acknowledge controlled copy'],
      ['cdoc-esign','e-Sign']
    ];
    var disabledLaunchers =
      '<section class="hmv4-toolbar" aria-label="Disabled document mutation launchers" data-hmv4-cdoc-launchers>'+
        intents.map(function(intent){return '<button class="hmv4-button" type="button" disabled aria-disabled="true" aria-describedby="'+esc(noteId)+'" data-hmv4-mutation-intent="'+esc(intent[0])+'">'+esc(intent[1])+' disabled</button>';}).join('')+
        '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Mutation actions are disabled in this read-only prototype.</span>'+
      '</section>';

    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--cdoc" data-hmv4-cdoc-record data-route-class="AR" data-resource-family="controlled-documents" data-root-code="CDOC" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
      head + lifecycleStrip + partialAccessNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="Controlled document details">'+cdocTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-cdoc-'+t+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      cdocTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-cdoc-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-cdoc-panel="'+esc(t)+'">'+renderCdocPanel(t, record)+'</section>';}).join('')+
      '</article>';
  }
  var brelTabs = ['overview','release-package','quality-evidence','genealogy','shipment-readiness','related','audit','signatures'];
  function normaliseBrelTab(tab){ return brelTabs.indexOf(tab) >= 0 ? tab : 'overview'; }
  function renderBrelPanel(tab, record){
    if(tab === 'overview'){
      var approvers = record.approvers || [];
      return '<h2>Overview</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Batch ID</dt><dd>'+esc(record.batchId || '—')+'</dd>'+
          '<dt>Product code</dt><dd>'+esc(record.productCode || '—')+'</dd>'+
          '<dt>Lot ID</dt><dd>'+esc(record.lotId || '—')+'</dd>'+
          '<dt>Manufactured</dt><dd>'+esc(record.manufacturedAt || '—')+'</dd>'+
          '<dt>Line</dt><dd>'+esc(record.manufactureLine || '—')+'</dd>'+
          '<dt>Release decision</dt><dd>'+esc(record.releaseDecision || '—')+'</dd>'+
        '</dl>'+
        (approvers.length ? '<h3>Approvers (2-person rule)</h3>'+
          '<table class="hmv4-data-table"><thead><tr><th>Role</th><th>Name</th><th>Decision</th><th>Signed at</th></tr></thead><tbody>'+
          approvers.map(function(a){ return '<tr data-hmv4-brel-approver><td>'+esc(a.role)+'</td><td>'+esc(a.name)+'</td><td>'+esc(a.decision)+'</td><td>'+esc(a.signedAt || '—')+'</td></tr>'; }).join('')+
          '</tbody></table>' : '');
    }
    if(tab === 'release-package'){
      var pkg = record.releasePackage || {};
      var insp = pkg.inspectionRecords || [];
      var ncs = pkg.nonconformanceCases || [];
      var capas = pkg.capaRecords || [];
      var cdocs = pkg.cdocVersions || [];
      var devs = pkg.deviations || [];
      return '<h2>Release package</h2>'+
        (insp.length ? '<h3>Inspection records</h3><ul class="hmv4-list">'+insp.map(function(r){ return '<li><a href="/ops/records/inspections/'+esc(r.id)+'?tab=overview" data-hmv4-record-open="inspections" data-hmv4-record-id="'+esc(r.id)+'">'+esc(r.id)+'</a> — '+esc(r.result)+'</li>'; }).join('')+'</ul>' : '')+
        (ncs.length ? '<h3>Nonconformance cases</h3><ul class="hmv4-list">'+ncs.map(function(r){ return '<li><a href="/ops/records/nonconformance-cases/'+esc(r.id)+'?tab=overview" data-hmv4-record-open="nonconformance-cases" data-hmv4-record-id="'+esc(r.id)+'">'+esc(r.id)+'</a> — '+esc(r.disposition)+'</li>'; }).join('')+'</ul>' : '')+
        (capas.length ? '<h3>CAPA records</h3><ul class="hmv4-list">'+capas.map(function(r){ return '<li><a href="/ops/records/capas/'+esc(r.id)+'?tab=overview" data-hmv4-record-open="capas" data-hmv4-record-id="'+esc(r.id)+'">'+esc(r.id)+'</a> — '+esc(r.status)+'</li>'; }).join('')+'</ul>' : '')+
        (cdocs.length ? '<h3>Controlled document versions</h3><ul class="hmv4-list">'+cdocs.map(function(r){ return '<li>'+esc(r.docCode)+' Rev '+esc(r.rev)+'</li>'; }).join('')+'</ul>' : '')+
        (devs.length ? '<h3>Deviations</h3><ul class="hmv4-list">'+devs.map(function(r){ return '<li>'+esc(r.id || JSON.stringify(r))+'</li>'; }).join('')+'</ul>' : '<p class="hmv4-text-2">No deviations on record.</p>');
    }
    if(tab === 'quality-evidence'){
      var ev = record.qualityEvidence || {};
      return '<h2>Quality evidence</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>CoA</dt><dd>'+(ev.coa ? esc(ev.coa.id)+' (issued '+esc(ev.coa.issuedAt)+')' : '—')+'</dd>'+
          '<dt>Batch record</dt><dd>'+(ev.batchRecord ? esc(ev.batchRecord.id)+' — '+(ev.batchRecord.complete ? 'complete' : 'incomplete') : '—')+'</dd>'+
          '<dt>Validation certificate</dt><dd>'+(ev.validationCertificate ? esc(ev.validationCertificate.id)+' valid until '+esc(ev.validationCertificate.validUntil) : '—')+'</dd>'+
        '</dl>';
    }
    if(tab === 'genealogy'){
      return '<h2>Genealogy</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Genealogy root</dt><dd>'+esc(record.genealogyRoot || '—')+'</dd>'+
        '</dl>'+
        '<p class="hmv4-text-2">Full genealogy graph rendering deferred to live integration. Open <a href="/ops/records/lots/'+esc(record.lotId || 'LOT-UNKNOWN')+'?tab=overview">'+esc(record.lotId || 'LOT-UNKNOWN')+'</a> for the material identity anchor.</p>';
    }
    if(tab === 'shipment-readiness'){
      var ship = record.shipmentReadiness || {};
      var allocs = ship.allocatedTo || [];
      var blocks = ship.blockedBy || [];
      return '<h2>Shipment readiness</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Quantity available</dt><dd>'+esc(ship.quantityAvailable != null ? ship.quantityAvailable : '—')+'</dd>'+
        '</dl>'+
        (allocs.length ? '<h3>Allocations</h3><ul class="hmv4-list">'+allocs.map(function(a){ return '<li>'+esc(a.customer)+' — '+esc(a.quantity)+'</li>'; }).join('')+'</ul>' : '<p class="hmv4-text-2">No allocations.</p>')+
        (blocks.length ? '<h3>Blocked by</h3><ul class="hmv4-list">'+blocks.map(function(b){ return '<li class="hmv4-chip" data-feedback-state="warning">'+esc(b)+'</li>'; }).join('')+'</ul>' : '<p class="hmv4-text-2">No active blockers.</p>');
    }
    if(tab === 'related'){
      var related = record.relatedRecords || [];
      if(related.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
      return '<h2>Related records</h2><ul class="hmv4-list">'+
        related.map(function(r){ return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>'; }).join('')+
        '</ul>';
    }
    if(tab === 'audit') return '<h2>Audit trail</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/batch-releases/{id}/audit.</p>';
    if(tab === 'signatures'){
      var sApprovers = record.approvers || [];
      return '<h2>Signatures</h2><p class="hmv4-text-2">Read-only placeholder. 2-person e-sign required for actual release (21 CFR Part 11).</p>'+
        (sApprovers.length ? '<table class="hmv4-data-table"><thead><tr><th>Role</th><th>Name</th><th>Decision</th><th>Signed at</th></tr></thead><tbody>'+
          sApprovers.map(function(a){ return '<tr data-hmv4-brel-approver><td>'+esc(a.role)+'</td><td>'+esc(a.name)+'</td><td>'+esc(a.decision)+'</td><td>'+esc(a.signedAt || '—')+'</td></tr>'; }).join('')+
          '</tbody></table>' : '');
    }
    return '<p>Unknown tab.</p>';
  }
  function renderBrelRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseBrelTab(q.tab || 'overview');
    var recordId = p.record_id || 'BREL-001';
    var fixture = window.HMV4_BREL_RECORD_FIXTURE || readJsonFixture('[data-hmv4-brel-record-fixture]') || {};
    var records = fixture.records || {};
    var record = records[recordId] || {
      recordId: recordId, rootCode: 'BREL',
      title: 'Batch BX-2026-04 release packet',
      batchId: 'BX-2026-04', productCode: 'PN-2042', lotId: 'LOT-2026-04',
      manufacturedAt: '2026-04-15', manufactureLine: 'Line 1',
      state: 'review', releaseDecision: 'pending',
      freshness: 'fixture_current',
      stateMessage: 'Read-only release packet. 2-person e-sign required for actual release.',
      lifecycle: [['draft','complete'],['evidence-collection','complete'],['review','current'],['release-approved','pending'],['market-ship-ready','locked'],['on-hold','locked'],['rejected','locked']],
      approvers: [
        {role:'QA Director', name:'Dr. Tran', decision:'pending', signedAt:null},
        {role:'Plant Manager', name:'Mr. Le', decision:'pending', signedAt:null}
      ],
      releasePackage: {
        inspectionRecords: [{id:'INSP-001', result:'PASS'}],
        nonconformanceCases: [{id:'NC-001', disposition:'linked_to_release_review'}],
        capaRecords: [{id:'CAPA-001', status:'effectiveness_pending'}],
        cdocVersions: [{docCode:'qms-sop-100', rev:'B'}],
        deviations: []
      },
      qualityEvidence: {}, genealogyRoot: null,
      shipmentReadiness: { quantityAvailable: 0, allocatedTo: [], blockedBy: [] },
      relatedRecords: []
    };
    record.rootCode = 'BREL'; record.recordId = recordId;
    var state = q.state || record.state || 'review';
    var stateOverlay = (fixture.states || {})[state] || null;
    var freshness = (stateOverlay && stateOverlay.freshness) || record.freshness || 'fixture_current';
    var stateMessage = (stateOverlay && stateOverlay.stateMessage) || record.stateMessage || '';
    var partialAccessLimitations = (stateOverlay && stateOverlay.limitations) || [];
    var head = '<header class="hmv4-record-identity">'+
      '<h1 class="hmv4-record-title">'+esc(recordId)+' &mdash; '+esc(record.title)+'</h1>'+
      '<dl class="hmv4-meta-grid">'+
        '<dt>Batch</dt><dd>'+esc(record.batchId || '')+'</dd>'+
        '<dt>State</dt><dd>'+esc(record.state || state)+'</dd>'+
        '<dt>Decision</dt><dd>'+esc(record.releaseDecision || '')+'</dd>'+
        '<dt>Product</dt><dd>'+esc(record.productCode || '')+'</dd>'+
      '</dl>'+
      (stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-brel-state>'+esc(stateMessage)+'</p>' : '')+
    '</header>';
    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-brel-lifecycle aria-label="BREL lifecycle">'+
      (record.lifecycle || []).map(function(s){ return '<li data-state-class="'+esc(s[1])+'">'+esc(s[0])+'</li>'; }).join('')+
    '</ol>';
    var partialNotice = (state === 'partial_access' && partialAccessLimitations.length)
      ? '<section class="hmv4-feedback" data-feedback-state="warning" data-hmv4-brel-partial><p>Partial access:</p><ul>'+partialAccessLimitations.map(function(l){ return '<li>'+esc(l)+'</li>'; }).join('')+'</ul></section>'
      : '';
    var noteId = 'hmv4-brel-disabled-note';
    var brelIntents = [
      ['brel-collect-evidence','Collect evidence'],
      ['brel-submit-for-review','Submit for review'],
      ['brel-approve-release','Approve release'],
      ['brel-reject','Reject'],
      ['brel-place-on-hold','Place on hold'],
      ['brel-release-from-hold','Release from hold'],
      ['brel-market-ship','Market ship'],
      ['brel-recall','Recall'],
      ['brel-esign-2person','e-Sign (2-person)'],
      ['brel-esign','e-Sign']
    ];
    var disabledLaunchers = '<section class="hmv4-toolbar" aria-label="Disabled BREL mutation launchers" data-hmv4-brel-launchers>'+
      brelIntents.map(function(intent){ return '<button class="hmv4-button" disabled aria-disabled="true" data-hmv4-mutation-intent="'+esc(intent[0])+'" aria-describedby="'+esc(noteId)+'">'+esc(intent[1])+'</button>'; }).join('')+
      '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Release actions are disabled in this read-only prototype. BREL is the highest-stakes governed-quality root — 2-person e-sign, approval, market-ship, and recall remain outside fixture scope.</span>'+
    '</section>';
    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--brel" data-hmv4-brel-record data-route-class="AR" data-resource-family="batch-releases" data-root-code="BREL" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
      head + lifecycleStrip + partialNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="Batch release details">'+brelTabs.map(function(t){ return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-brel-'+t+'">'+esc(t)+'</button>'; }).join('')+'</div>'+
      brelTabs.map(function(t){ return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-brel-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-brel-panel="'+esc(t)+'">'+renderBrelPanel(t, record)+'</section>'; }).join('')+
    '</article>';
  }
  var inspTabs = ['overview','sample-results','nonconformance-flags','evidence','related','audit','signatures'];
  function normaliseInspTab(tab){ return inspTabs.indexOf(tab) >= 0 ? tab : 'overview'; }
  function defaultInspRecord(recordId){
    return {
      recordId: recordId || 'INSP-001',
      rootCode: 'INSP',
      title: 'First-piece inspection on WO-3011 OP-30',
      inspectionSubtype: 'first_piece',
      state: 'completed',
      severity: 'minor',
      workOrderId: 'WO-3011',
      lotId: 'LOT-2026-04',
      partNumber: 'PN-2042 Rev B',
      supplier: null,
      freshness: 'fixture_current',
      stateMessage: 'Read-only prototype. Mutation outside fixture.',
      lifecycle: [
        ['draft','complete'],['in-progress','complete'],['completed','current'],
        ['reviewed','pending'],['closed','locked']
      ],
      characteristics: [],
      sampleResults: [],
      nonconformanceFlags: [],
      evidence: [],
      relatedRecords: [],
      limitations: []
    };
  }
  function getInspRecord(route){
    var p = route.params || {};
    var recordId = p.record_id || 'INSP-001';
    var fixture = window.HMV4_INSP_RECORD_FIXTURE || readJsonFixture('[data-hmv4-insp-record-fixture]') || {};
    var record = defaultInspRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    var state = (route.query && route.query.state) || fixture.state || record.state || 'completed';
    var stateOverlay = (fixture.states || {})[state] || null;
    if(stateOverlay){
      record.state = state;
      if(stateOverlay.freshness) record.freshness = stateOverlay.freshness;
      if(stateOverlay.stateMessage) record.stateMessage = stateOverlay.stateMessage;
      if(stateOverlay.limitations) record.limitations = stateOverlay.limitations;
    }
    record.recordId = recordId;
    record.rootCode = 'INSP';
    return record;
  }
  function renderInspPanel(tab, record){
    if(tab === 'overview'){
      return '<h2>Overview</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Subtype</dt><dd>'+esc(record.inspectionSubtype || '—')+'</dd>'+
          '<dt>Work order</dt><dd>'+esc(record.workOrderId || '—')+'</dd>'+
          '<dt>Lot</dt><dd>'+esc(record.lotId || '—')+'</dd>'+
          '<dt>Part</dt><dd>'+esc(record.partNumber || '—')+'</dd>'+
          '<dt>Supplier</dt><dd>'+esc(record.supplier || '—')+'</dd>'+
        '</dl>'+
        '<h3>Characteristics</h3>'+
        ((record.characteristics || []).length === 0
          ? '<p class="hmv4-text-2">No characteristics defined.</p>'
          : '<table class="hmv4-data-table"><thead><tr><th>Name</th><th>Target</th><th>Tolerance</th><th>Sample size</th></tr></thead><tbody>'+
            (record.characteristics || []).map(function(c){return '<tr><td>'+esc(c.name)+'</td><td>'+esc(c.target)+'</td><td>'+esc(c.tolerance)+'</td><td>'+esc(c.sampleSize)+'</td></tr>';}).join('')+
            '</tbody></table>');
    }
    if(tab === 'sample-results'){
      var results = record.sampleResults || [];
      if(results.length === 0) return '<h2>Sample results</h2><p class="hmv4-text-2">No sample results recorded.</p>';
      return '<h2>Sample results</h2>'+
        results.map(function(r){
          return '<section class="hmv4-card"><h3>'+esc(r.characteristic)+'</h3><p>Result: <strong>'+esc(r.result)+'</strong></p>'+
            '<table class="hmv4-data-table"><thead><tr><th>Sample #</th><th>Value</th><th>Judgment</th></tr></thead><tbody>'+
            (r.samples || []).map(function(s,i){return '<tr><td>'+(i+1)+'</td><td>'+esc(s.value)+'</td><td data-hmv4-status="'+esc(s.judgment)+'">'+esc(s.judgment)+'</td></tr>';}).join('')+
            '</tbody></table></section>';
        }).join('');
    }
    if(tab === 'nonconformance-flags'){
      var flags = record.nonconformanceFlags || [];
      if(flags.length === 0) return '<h2>Nonconformance flags</h2><p class="hmv4-text-2">No nonconformance flags raised.</p>';
      return '<h2>Nonconformance flags</h2><ul class="hmv4-list">'+
        flags.map(function(f){
          var ncLink = f.escalatedToNcId
            ? ' &mdash; <a href="/ops/records/nonconformance-cases/'+esc(f.escalatedToNcId)+'?tab=overview" data-hmv4-record-open="nonconformance-cases" data-hmv4-record-id="'+esc(f.escalatedToNcId)+'">'+esc(f.escalatedToNcId)+'</a>'
            : ' (not yet escalated)';
          return '<li><strong>'+esc(f.characteristic)+'</strong> ('+esc(f.severity)+')'+ncLink+'</li>';
        }).join('')+
        '</ul>';
    }
    if(tab === 'evidence'){
      var ev = record.evidence || [];
      if(ev.length === 0) return '<h2>Evidence</h2><p class="hmv4-text-2">No evidence attached.</p>';
      return '<h2>Evidence</h2><ul class="hmv4-list">'+
        ev.map(function(e){return '<li>'+esc(e.type)+': '+esc(e.label)+'</li>';}).join('')+
        '</ul>';
    }
    if(tab === 'related'){
      var related = record.relatedRecords || [];
      if(related.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
      return '<h2>Related records</h2><ul class="hmv4-list">'+
        related.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';}).join('')+
        '</ul>';
    }
    if(tab === 'audit') return '<h2>Audit</h2><p class="hmv4-text-2">Read-only placeholder.</p>';
    if(tab === 'signatures') return '<h2>Signatures</h2><p class="hmv4-text-2">Read-only placeholder.</p>';
    return '<p>Unknown tab.</p>';
  }
  function renderInspRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseInspTab(q.tab || 'overview');
    var recordId = p.record_id || 'INSP-001';
    var record = getInspRecord(route);
    var state = record.state || 'completed';
    var freshness = record.freshness || 'fixture_current';
    var limitations = record.limitations || [];
    var noteId = 'hmv4-insp-mutation-note';

    var head =
      '<header class="hmv4-record-identity">'+
        '<h1 class="hmv4-record-title">'+esc(recordId)+' &mdash; '+esc(record.title)+'</h1>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Subtype</dt><dd>'+esc(record.inspectionSubtype || '')+'</dd>'+
          '<dt>State</dt><dd>'+esc(state)+'</dd>'+
          '<dt>Severity</dt><dd>'+esc(record.severity || '')+'</dd>'+
          '<dt>Work order</dt><dd>'+esc(record.workOrderId || '')+'</dd>'+
        '</dl>'+
        (record.stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-insp-state>'+esc(record.stateMessage)+'</p>' : '')+
      '</header>';

    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-insp-lifecycle aria-label="INSP lifecycle">'+
      (record.lifecycle || []).map(function(s){return '<li data-lifecycle-state="'+esc(s[1] || 'pending')+'"><strong>'+esc(s[0])+'</strong><span>'+esc(s[1] || 'pending')+'</span></li>';}).join('')+
      '</ol>';

    var partialAccessNotice = '';
    if(state === 'partial_access' && limitations.length){
      partialAccessNotice =
        '<section class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-insp-partial>'+
          '<strong>Partial access</strong>'+
          '<ul>'+limitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul>'+
        '</section>';
    }

    var intents = [
      ['insp-record-result','Record result'],
      ['insp-flag-nonconformance','Flag nonconformance'],
      ['insp-submit-review','Submit for review'],
      ['insp-close','Close'],
      ['insp-esign','e-Sign']
    ];
    var disabledLaunchers =
      '<section class="hmv4-toolbar" aria-label="Disabled inspection mutation launchers" data-hmv4-insp-launchers>'+
        intents.map(function(intent){return '<button class="hmv4-button" type="button" disabled aria-disabled="true" aria-describedby="'+esc(noteId)+'" data-hmv4-mutation-intent="'+esc(intent[0])+'">'+esc(intent[1])+' disabled</button>';}).join('')+
        '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Mutation actions are disabled in this read-only prototype.</span>'+
      '</section>';

    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--insp" data-hmv4-insp-record data-route-class="AR" data-resource-family="inspections" data-root-code="INSP" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
      head + lifecycleStrip + partialAccessNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="Inspection record details">'+inspTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-insp-'+t+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      inspTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-insp-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-insp-panel="'+esc(t)+'">'+renderInspPanel(t, record)+'</section>';}).join('')+
      '</article>';
  }
  var ecoTabs = ['overview','change-scope','impact-assessment','implementation-plan','training-impact','related','audit','signatures'];
  function normaliseEcoTab(tab){ return ecoTabs.indexOf(tab) >= 0 ? tab : 'overview'; }
  function defaultEcoRecord(recordId){
    return {
      recordId: recordId || 'ECO-2026-014',
      rootCode: 'ECO',
      title: 'Update PQ acceptance criteria per FDA guidance 2026',
      changeType: 'document',
      changeReason: 'regulatory',
      state: 'implementation',
      severity: 'major',
      proposer: 'Quality Manager',
      approver: 'VP Quality + CCB',
      freshness: 'fixture_current',
      stateMessage: 'Read-only prototype. CCB approval cycle outside fixture.',
      lifecycle: [
        ['proposed','complete'],['impact-assessment','complete'],
        ['CCB-review','complete'],['approved','complete'],
        ['implementation','current'],['verification','pending'],['closed','locked']
      ],
      changeScope: {
        affectedItems: [],
        affectedDocuments: [{ docCode: 'qms-sop-100', fromRev: 'A', toRev: 'B' }],
        affectedProcesses: ['Process Validation']
      },
      impactAssessment: {
        qualityImpact: 'high — adds new acceptance criterion',
        costImpact: 'low — documentation only',
        scheduleImpact: '30 days for retraining',
        regulatoryImpact: 'REQUIRED — FDA guidance compliance',
        validationImpact: 're-validation NOT required (clarification, not new criterion)',
        summary: 'FDA 2026 guidance clarifies PQ acceptance. Update SOP to mirror language. Retrain affected roles.'
      },
      implementationPlan: {
        targetEffectiveDate: '2026-01-15',
        phases: [
          { phase: 'Document update', owner: 'QA Director', dueDate: '2025-12-15', status: 'complete' },
          { phase: 'Training rollout', owner: 'Training Lead', dueDate: '2026-01-10', status: 'complete' },
          { phase: 'Effective date go-live', owner: 'QA Director', dueDate: '2026-01-15', status: 'in-progress' },
          { phase: '60-day verification', owner: 'QA Director', dueDate: '2026-03-15', status: 'planned' }
        ]
      },
      trainingImpact: {
        requiredTraining: [{ code: 'QUAL_PV_2026', name: 'Process Validation per 2026 FDA guidance' }],
        affectedRoles: ['Process Engineer', 'Validation Engineer', 'QC Inspector'],
        trainingRecords: [
          { id: 'TR-7050', operatorId: 'OP-1004', status: 'completed' },
          { id: 'TR-7051', operatorId: 'OP-1007', status: 'in_progress' }
        ]
      },
      relatedRecords: [
        { resourceFamily: 'controlled-documents', recordId: 'CDOC-001', label: 'qms-sop-100 Rev B (driven by this ECO)' },
        { resourceFamily: 'training-records', recordId: 'TR-7050', label: 'TR-7050 PV training' }
      ],
      limitations: []
    };
  }
  function getEcoRecord(route){
    var p = route.params || {};
    var recordId = p.record_id || 'ECO-2026-014';
    var fixture = window.HMV4_ECO_RECORD_FIXTURE || readJsonFixture('[data-hmv4-eco-record-fixture]') || {};
    var record = defaultEcoRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    var state = (route.query && route.query.state) || fixture.state || record.state || 'implementation';
    var stateOverlay = (fixture.states || {})[state] || null;
    if(stateOverlay){
      record.state = state;
      if(stateOverlay.freshness) record.freshness = stateOverlay.freshness;
      if(stateOverlay.stateMessage) record.stateMessage = stateOverlay.stateMessage;
      if(stateOverlay.limitations) record.limitations = stateOverlay.limitations;
    }
    record.recordId = recordId;
    record.rootCode = 'ECO';
    return record;
  }
  function renderEcoPanel(tab, record){
    var scope = record.changeScope || {};
    var impact = record.impactAssessment || {};
    var plan = record.implementationPlan || {};
    var training = record.trainingImpact || {};
    if(tab === 'overview'){
      return '<h2>Overview</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Change type</dt><dd>'+esc(record.changeType || '—')+'</dd>'+
          '<dt>Change reason</dt><dd>'+esc(record.changeReason || '—')+'</dd>'+
          '<dt>State</dt><dd>'+esc(record.state || '—')+'</dd>'+
          '<dt>Severity</dt><dd>'+esc(record.severity || '—')+'</dd>'+
          '<dt>Proposer</dt><dd>'+esc(record.proposer || '—')+'</dd>'+
          '<dt>Approver</dt><dd>'+esc(record.approver || '—')+'</dd>'+
        '</dl>'+
        '<p>'+esc(record.stateMessage || 'Read-only overview fixture.')+'</p>';
    }
    if(tab === 'change-scope'){
      var affectedDocs = scope.affectedDocuments || [];
      var affectedItems = scope.affectedItems || [];
      var affectedProcs = scope.affectedProcesses || [];
      var docsHtml = affectedDocs.length ?
        '<h3>Affected documents</h3><table class="hmv4-data-table"><thead><tr><th>Doc code</th><th>From rev</th><th>To rev</th></tr></thead><tbody>'+
        affectedDocs.map(function(d){return '<tr><td>'+esc(d.docCode)+'</td><td>'+esc(d.fromRev)+'</td><td>'+esc(d.toRev)+'</td></tr>';}).join('')+
        '</tbody></table>' : '<h3>Affected documents</h3><p class="hmv4-text-2">No affected documents.</p>';
      var itemsHtml = affectedItems.length ?
        '<h3>Affected items</h3><ul class="hmv4-list">'+affectedItems.map(function(i){return '<li>'+esc(typeof i === 'string' ? i : i.itemCode || JSON.stringify(i))+'</li>';}).join('')+'</ul>' : '';
      var procsHtml = affectedProcs.length ?
        '<h3>Affected processes</h3><ul class="hmv4-list">'+affectedProcs.map(function(pr){return '<li>'+esc(pr)+'</li>';}).join('')+'</ul>' :
        '<h3>Affected processes</h3><p class="hmv4-text-2">No affected processes.</p>';
      return '<h2>Change scope</h2>'+docsHtml+itemsHtml+procsHtml;
    }
    if(tab === 'impact-assessment'){
      return '<h2>Impact assessment</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Quality impact</dt><dd>'+esc(impact.qualityImpact || '—')+'</dd>'+
          '<dt>Cost impact</dt><dd>'+esc(impact.costImpact || '—')+'</dd>'+
          '<dt>Schedule impact</dt><dd>'+esc(impact.scheduleImpact || '—')+'</dd>'+
          '<dt>Regulatory impact</dt><dd>'+esc(impact.regulatoryImpact || '—')+'</dd>'+
          '<dt>Validation impact</dt><dd>'+esc(impact.validationImpact || '—')+'</dd>'+
        '</dl>'+
        (impact.summary ? '<p>'+esc(impact.summary)+'</p>' : '');
    }
    if(tab === 'implementation-plan'){
      var phases = plan.phases || [];
      var phasesHtml = phases.length ?
        '<table class="hmv4-data-table"><thead><tr><th>Phase</th><th>Owner</th><th>Due date</th><th>Status</th></tr></thead><tbody>'+
        phases.map(function(ph){return '<tr><td>'+esc(ph.phase)+'</td><td>'+esc(ph.owner)+'</td><td>'+esc(ph.dueDate)+'</td><td>'+esc(ph.status)+'</td></tr>';}).join('')+
        '</tbody></table>' : '<p class="hmv4-text-2">No phases recorded.</p>';
      return '<h2>Implementation plan</h2>'+
        '<dl class="hmv4-meta-grid"><dt>Target effective date</dt><dd>'+esc(plan.targetEffectiveDate || '—')+'</dd></dl>'+
        phasesHtml;
    }
    if(tab === 'training-impact'){
      var required = training.requiredTraining || [];
      var roles = training.affectedRoles || [];
      var trRecords = training.trainingRecords || [];
      var reqHtml = required.length ?
        '<h3>Required training</h3><ul class="hmv4-list">'+required.map(function(t){return '<li><strong>'+esc(t.code)+'</strong>: '+esc(t.name)+'</li>';}).join('')+'</ul>' :
        '<h3>Required training</h3><p class="hmv4-text-2">No required training.</p>';
      var rolesHtml = roles.length ?
        '<h3>Affected roles</h3><ul class="hmv4-list">'+roles.map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul>' : '';
      var recsHtml = trRecords.length ?
        '<h3>Training records</h3><table class="hmv4-data-table"><thead><tr><th>Record ID</th><th>Operator</th><th>Status</th><th></th></tr></thead><tbody>'+
        trRecords.map(function(tr){return '<tr><td>'+esc(tr.id)+'</td><td>'+esc(tr.operatorId)+'</td><td>'+esc(tr.status)+'</td><td><a href="/ops/records/training-records/'+esc(tr.id)+'?tab=overview" data-hmv4-record-open="training-records" data-hmv4-record-id="'+esc(tr.id)+'">Open</a></td></tr>';}).join('')+
        '</tbody></table>' : '<h3>Training records</h3><p class="hmv4-text-2">No training records linked.</p>';
      return '<h2>Training impact</h2>'+reqHtml+rolesHtml+recsHtml;
    }
    if(tab === 'related'){
      var related = record.relatedRecords || [];
      if(related.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
      return '<h2>Related records</h2><ul class="hmv4-list">'+
        related.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';}).join('')+
        '</ul>';
    }
    if(tab === 'audit') return '<h2>Audit trail</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/engineering-changes/{id}/audit.</p>';
    if(tab === 'signatures') return '<h2>Signatures</h2><p class="hmv4-text-2">Read-only placeholder. e-Signatures (21 CFR Part 11).</p>';
    return '<p>Unknown tab.</p>';
  }
  function renderEcoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseEcoTab(q.tab || 'overview');
    var recordId = p.record_id || 'ECO-2026-014';
    var record = getEcoRecord(route);
    var state = record.state || 'implementation';
    var freshness = record.freshness || 'fixture_current';
    var limitations = record.limitations || [];
    var noteId = 'hmv4-eco-mutation-note';
    var head =
      '<header class="hmv4-record-identity">'+
        '<h1 class="hmv4-record-title">'+esc(recordId)+'</h1>'+
        '<p class="hmv4-record-subtitle">'+esc(record.title)+'</p>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Change type</dt><dd>'+esc(record.changeType || '')+'</dd>'+
          '<dt>State</dt><dd>'+esc(state)+'</dd>'+
          '<dt>Severity</dt><dd>'+esc(record.severity || '')+'</dd>'+
          '<dt>Proposer</dt><dd>'+esc(record.proposer || '')+'</dd>'+
        '</dl>'+
        (record.stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-eco-state>'+esc(record.stateMessage)+'</p>' : '')+
      '</header>';
    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-eco-lifecycle aria-label="ECO lifecycle">'+
      (record.lifecycle || []).map(function(s){return '<li data-lifecycle-state="'+esc(s[1] || 'pending')+'"><strong>'+esc(s[0])+'</strong><span>'+esc(s[1] || 'pending')+'</span></li>';}).join('')+
      '</ol>';
    var partialAccessNotice = '';
    if(state === 'partial_access' && limitations.length){
      partialAccessNotice =
        '<section class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-eco-partial>'+
          '<strong>Partial access</strong>'+
          '<ul>'+limitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul>'+
        '</section>';
    }
    var intents = [
      ['eco-submit-impact-assessment','Submit impact assessment'],
      ['eco-submit-to-ccb','Submit to CCB'],
      ['eco-ccb-approve','CCB approve'],
      ['eco-ccb-reject','CCB reject'],
      ['eco-start-implementation','Start implementation'],
      ['eco-verify-implementation','Verify implementation'],
      ['eco-close','Close ECO'],
      ['eco-esign','e-Sign']
    ];
    var disabledLaunchers =
      '<section class="hmv4-toolbar" aria-label="Disabled ECO mutation launchers" data-hmv4-eco-launchers>'+
        intents.map(function(intent){return '<button class="hmv4-button" type="button" disabled aria-disabled="true" aria-describedby="'+esc(noteId)+'" data-hmv4-mutation-intent="'+esc(intent[0])+'">'+esc(intent[1])+' disabled</button>';}).join('')+
        '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Mutation actions are disabled in this read-only prototype. CCB approval, implementation, verification, closure, and e-sign execution remain outside fixture scope.</span>'+
      '</section>';
    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--eco" data-hmv4-eco-record data-route-class="AR" data-resource-family="engineering-changes" data-root-code="ECO" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
      head + lifecycleStrip + partialAccessNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="Engineering change order details">'+ecoTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+t+'" id="tab-eco-'+t+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      ecoTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-eco-'+t+'" '+(t===tab?'':'hidden')+' data-hmv4-eco-panel="'+esc(t)+'">'+renderEcoPanel(t, record)+'</section>';}).join('')+
      '</article>';
  }
  var joTabs = ['overview','dispatch-readiness','spawned-work-orders','material-consumption','progress','related','audit'];
  function normaliseJoTab(tab){ return joTabs.indexOf(tab) >= 0 ? tab : 'overview'; }
  function defaultJoRecord(recordId){
    return {
      recordId: recordId || 'JO-2026-014',
      rootCode: 'JO',
      title: 'Job order JO-2026-014 (PN-2042 Rev B, Qty 5000)',
      jobNumber: 'JO-2026-014',
      customerOrderRef: 'CPO-2026-077',
      productCode: 'PN-2042',
      quantityOrdered: 5000,
      quantityCompleted: 3200,
      state: 'executing',
      severity: 'low',
      scheduledStart: '2026-04-15',
      scheduledEnd: '2026-04-30',
      actualStart: '2026-04-15',
      actualEnd: null,
      owner: 'Production Planner',
      plannerNotes: 'Customer expedite. Run on Line 1 morning shift.',
      freshness: 'fixture_current',
      stateMessage: 'Read-only prototype JO shell. Mutation outside fixture.',
      lifecycle: [['draft','complete'],['released','complete'],['executing','current'],['on-hold','pending'],['completed','locked'],['cancelled','locked']],
      dispatchReadiness: { materialReady: true, equipmentReady: true, operatorReady: true, blockedBy: [] },
      spawnedWorkOrders: [],
      materialConsumption: [],
      progressMetrics: { completionPct: 64, scrapRate: 0.8, downtimePct: 3.2 },
      relatedRecords: [],
      limitations: []
    };
  }
  function getJoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var recordId = p.record_id || 'JO-2026-014';
    var fixture = window.HMV4_JO_RECORD_FIXTURE || readJsonFixture('[data-hmv4-jo-record-fixture]') || {};
    var record = defaultJoRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    var state = q.state || fixture.state || record.state || 'executing';
    var stateOverlay = (fixture.states || {})[state] || null;
    if(stateOverlay){
      record.state = state;
      if(stateOverlay.freshness) record.freshness = stateOverlay.freshness;
      if(stateOverlay.stateMessage) record.stateMessage = stateOverlay.stateMessage;
      if(stateOverlay.limitations) record.limitations = stateOverlay.limitations;
    }
    record.recordId = recordId;
    record.rootCode = 'JO';
    return record;
  }
  function renderJoPanel(tab, record){
    if(tab === 'overview'){
      return '<h2>Overview</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Job number</dt><dd>'+esc(record.jobNumber || '—')+'</dd>'+
          '<dt>Customer order</dt><dd>'+esc(record.customerOrderRef || '—')+'</dd>'+
          '<dt>Product</dt><dd>'+esc(record.productCode || '—')+'</dd>'+
          '<dt>Quantity</dt><dd>'+esc((record.quantityCompleted || 0)+' / '+(record.quantityOrdered || 0))+'</dd>'+
          '<dt>Scheduled</dt><dd>'+esc(record.scheduledStart || '—')+' &rarr; '+esc(record.scheduledEnd || '—')+'</dd>'+
          '<dt>Actual</dt><dd>'+esc(record.actualStart || '—')+' &rarr; '+esc(record.actualEnd || 'in-progress')+'</dd>'+
          '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>'+
        '</dl>'+
        (record.plannerNotes ? '<h3>Planner notes</h3><p>'+esc(record.plannerNotes)+'</p>' : '');
    }
    if(tab === 'dispatch-readiness'){
      var d = record.dispatchReadiness || {};
      var blockedBy = d.blockedBy || [];
      return '<h2>Dispatch readiness</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Material</dt><dd data-hmv4-readiness="'+(d.materialReady ? 'ready' : 'blocked')+'">'+(d.materialReady ? 'Ready' : 'Blocked')+'</dd>'+
          '<dt>Equipment</dt><dd data-hmv4-readiness="'+(d.equipmentReady ? 'ready' : 'blocked')+'">'+(d.equipmentReady ? 'Ready' : 'Blocked')+'</dd>'+
          '<dt>Operator</dt><dd data-hmv4-readiness="'+(d.operatorReady ? 'ready' : 'blocked')+'">'+(d.operatorReady ? 'Ready' : 'Blocked')+'</dd>'+
        '</dl>'+
        (blockedBy.length === 0 ? '<p class="hmv4-text-2">No blockers.</p>' :
          '<h3>Blocked by</h3><ul class="hmv4-list">'+blockedBy.map(function(b){return '<li>'+esc(b)+'</li>';}).join('')+'</ul>');
    }
    if(tab === 'spawned-work-orders'){
      var wos = record.spawnedWorkOrders || [];
      if(wos.length === 0) return '<h2>Spawned work orders</h2><p class="hmv4-text-2">No WOs spawned yet.</p>';
      return '<h2>Spawned work orders</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>WO ID</th><th>Operation</th><th>Scheduled</th><th>State</th></tr></thead><tbody>'+
        wos.map(function(w){return '<tr><td><a href="/ops/records/work-orders/'+esc(w.id)+'?tab=overview" data-hmv4-record-open="work-orders" data-hmv4-record-id="'+esc(w.id)+'">'+esc(w.id)+'</a></td><td>'+esc(w.operation)+'</td><td>'+esc(w.scheduledStart || '')+' &rarr; '+esc(w.scheduledEnd || '')+'</td><td>'+esc(w.state)+'</td></tr>';}).join('')+
        '</tbody></table>';
    }
    if(tab === 'material-consumption'){
      var mc = record.materialConsumption || [];
      if(mc.length === 0) return '<h2>Material consumption</h2><p class="hmv4-text-2">No materials recorded.</p>';
      return '<h2>Material consumption</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>Item</th><th>Planned</th><th>Actual</th><th>Lot</th></tr></thead><tbody>'+
        mc.map(function(m){return '<tr><td>'+esc(m.itemCode)+'</td><td>'+esc(m.plannedQty)+'</td><td>'+esc(m.actualQty)+'</td><td><a href="/ops/records/lots/'+esc(m.lot || '')+'?tab=overview" data-hmv4-record-open="lots" data-hmv4-record-id="'+esc(m.lot || '')+'">'+esc(m.lot || '—')+'</a></td></tr>';}).join('')+
        '</tbody></table>';
    }
    if(tab === 'progress'){
      var metrics = record.progressMetrics || {};
      return '<h2>Progress metrics</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Completion</dt><dd>'+esc((metrics.completionPct || 0)+'%')+'</dd>'+
          '<dt>Scrap rate</dt><dd>'+esc((metrics.scrapRate || 0)+'%')+'</dd>'+
          '<dt>Downtime</dt><dd>'+esc((metrics.downtimePct || 0)+'%')+'</dd>'+
        '</dl>';
    }
    if(tab === 'related'){
      var rel = record.relatedRecords || [];
      if(rel.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
      return '<h2>Related records</h2><ul class="hmv4-list">'+
        rel.map(function(r){
          if(r.resourceFamily === 'job-orders') return '<li><span data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</span></li>';
          return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';
        }).join('')+
        '</ul>';
    }
    if(tab === 'audit') return '<h2>Audit</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/job-orders/{id}/audit when audit endpoint is added in a Phase B follow-up.</p>';
    return '<p>Unknown tab.</p>';
  }
  function renderJoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseJoTab(q.tab || 'overview');
    var recordId = p.record_id || 'JO-2026-014';
    var record = getJoRecord(route);
    var state = record.state || 'executing';
    var freshness = record.freshness || 'fixture_current';
    var partialAccessLimitations = record.limitations || [];
    var noteId = 'hmv4-jo-disabled-note';

    var head =
      '<header class="hmv4-record-identity">'+
        '<h1 class="hmv4-record-title">'+esc(record.jobNumber || recordId)+' &mdash; '+esc(record.title)+'</h1>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>State</dt><dd>'+esc(state)+'</dd>'+
          '<dt>Product</dt><dd>'+esc(record.productCode || '—')+'</dd>'+
          '<dt>Qty</dt><dd>'+esc((record.quantityCompleted || 0)+' / '+(record.quantityOrdered || 0))+'</dd>'+
          '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>'+
        '</dl>'+
        (record.stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-jo-state>'+esc(record.stateMessage)+'</p>' : '')+
      '</header>';

    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-jo-lifecycle aria-label="JO lifecycle">'+
      (record.lifecycle || []).map(function(s){return '<li data-state-class="'+esc(s[1] || 'pending')+'" data-lifecycle-state="'+esc(s[1] || 'pending')+'"><strong>'+esc(s[0])+'</strong><span>'+esc(s[1] || 'pending')+'</span></li>';}).join('')+
      '</ol>';

    var partialNotice = (state === 'partial_access' && partialAccessLimitations.length)
      ? '<section class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-jo-partial><strong>Partial access</strong><ul>'+partialAccessLimitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul></section>'
      : '';

    var intents = [
      ['jo-release','Release'],
      ['jo-spawn-work-order','Spawn WO'],
      ['jo-place-on-hold','Place on hold'],
      ['jo-resume','Resume'],
      ['jo-cancel','Cancel'],
      ['jo-complete','Complete']
    ];
    var disabledLaunchers =
      '<section class="hmv4-toolbar" aria-label="Disabled JO mutation launchers" data-hmv4-jo-launchers>'+
        intents.map(function(intent){return '<button class="hmv4-button" type="button" disabled aria-disabled="true" aria-describedby="'+esc(noteId)+'" data-hmv4-mutation-intent="'+esc(intent[0])+'">'+esc(intent[1])+' disabled</button>';}).join('')+
        '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Mutation actions are disabled in this read-only prototype.</span>'+
      '</section>';

    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--jo" data-hmv4-jo-record data-route-class="AR" data-resource-family="job-orders" data-root-code="JO" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
      head + lifecycleStrip + partialNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="Job order details">'+joTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+esc(t)+'" id="tab-jo-'+esc(t)+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      joTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-jo-'+esc(t)+'" '+(t===tab?'':'hidden')+' data-hmv4-jo-panel="'+esc(t)+'">'+renderJoPanel(t, record)+'</section>';}).join('')+
      '</article>';
  }
  var soTabs = ['overview','line-items','linked-job-orders','shipment-allocation','invoicing','related','audit'];
  function normaliseSoTab(tab){ return soTabs.indexOf(tab) >= 0 ? tab : 'overview'; }
  function defaultSoRecord(recordId){
    return {
      recordId: recordId || 'SO-2026-088',
      rootCode: 'SO',
      title: 'Sales order SO-2026-088 (CUST-100, $250K)',
      salesOrderNumber: 'SO-2026-088',
      customerCode: 'CUST-100',
      customerName: 'Acme Industrial Corp.',
      customerOrderRef: 'PO-ACME-2026-Q2-014',
      state: 'fulfilling',
      severity: 'low',
      orderDate: '2026-04-01',
      requestedShipDate: '2026-04-30',
      confirmedShipDate: '2026-05-02',
      actualShipDate: null,
      totalValue: 250000,
      currency: 'USD',
      owner: 'Sales Manager',
      salesNotes: 'Customer requested split shipment aligned to job-order fulfillment.',
      freshness: 'fixture_current',
      stateMessage: 'Read-only prototype SO shell. Mutation outside fixture.',
      lifecycle: [['draft','complete'],['confirmed','complete'],['released','complete'],['fulfilling','current'],['completed','locked'],['cancelled','locked']],
      lineItems: [
        { line: 1, productCode: 'PN-2042', description: 'Widget Assembly Rev B', quantityOrdered: 5000, quantityShipped: 0, unitPrice: 50.00, lineTotal: 250000, requestedDate: '2026-04-30' }
      ],
      linkedJobOrders: [
        { id: 'JO-2026-014', productCode: 'PN-2042', quantity: 5000, state: 'executing' }
      ],
      shipmentAllocation: [
        { shipmentId: 'SHIP-2026-031', lineRef: 1, quantity: 2000, status: 'planned', plannedDate: '2026-04-30' },
        { shipmentId: 'SHIP-2026-032', lineRef: 1, quantity: 3000, status: 'planned', plannedDate: '2026-05-02' }
      ],
      invoicing: { invoiced: 0, invoiceIds: [], paid: 0, paymentTerms: 'Net 30' },
      relatedRecords: [
        { resourceFamily: 'customer-purchase-orders', recordId: 'CPO-2026-077', label: 'CPO-2026-077 customer purchase order' },
        { resourceFamily: 'job-orders', recordId: 'JO-2026-014', label: 'JO-2026-014 spawned for fulfillment' }
      ],
      limitations: []
    };
  }
  function getSoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var recordId = p.record_id || 'SO-2026-088';
    var fixture = window.HMV4_SO_RECORD_FIXTURE || readJsonFixture('[data-hmv4-so-record-fixture]') || {};
    var record = defaultSoRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    var fixtureStates = fixture.states || {};
    var panelState = q.panel ? String(q.panel).replace(/-/g, '_') : null;
    var state = q.state || (panelState && fixtureStates[panelState] ? panelState : null) || fixture.state || record.state || 'fulfilling';
    var stateOverlay = fixtureStates[state] || null;
    if(stateOverlay){
      record.state = state;
      if(stateOverlay.freshness) record.freshness = stateOverlay.freshness;
      if(stateOverlay.stateMessage) record.stateMessage = stateOverlay.stateMessage;
      if(stateOverlay.limitations) record.limitations = stateOverlay.limitations;
    }
    if(state === 'partial_access'){
      record.customerName = 'Masked';
      record.totalValue = 'Masked';
      record.invoicing = record.invoicing || {};
      record.invoicing.paymentTerms = 'Masked';
    }
    record.recordId = recordId;
    record.rootCode = 'SO';
    return record;
  }
  function soNumber(value){
    if(value == null || value === '') return '-';
    var num = Number(value);
    return isFinite(num) ? num.toLocaleString('en-US') : String(value);
  }
  function soMoney(value, currency){
    if(value == null || value === '') return '-';
    var num = Number(value);
    if(!isFinite(num)) return esc(String(value));
    return esc(currency || 'USD') + ' ' + esc(num.toLocaleString('en-US'));
  }
  function renderSoPanel(tab, record){
    if(tab === 'overview'){
      return '<h2>Overview</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>SO number</dt><dd>'+esc(record.salesOrderNumber || '—')+'</dd>'+
          '<dt>Customer</dt><dd>'+esc(record.customerCode || '—')+' - '+esc(record.customerName || '—')+'</dd>'+
          '<dt>Customer PO</dt><dd>'+esc(record.customerOrderRef || '—')+'</dd>'+
          '<dt>Order date</dt><dd>'+esc(record.orderDate || '—')+'</dd>'+
          '<dt>Requested ship</dt><dd>'+esc(record.requestedShipDate || '—')+'</dd>'+
          '<dt>Confirmed ship</dt><dd>'+esc(record.confirmedShipDate || '—')+'</dd>'+
          '<dt>Actual ship</dt><dd>'+esc(record.actualShipDate || 'not shipped')+'</dd>'+
          '<dt>Total value</dt><dd>'+soMoney(record.totalValue, record.currency)+'</dd>'+
          '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>'+
        '</dl>'+
        (record.salesNotes ? '<h3>Sales notes</h3><p>'+esc(record.salesNotes)+'</p>' : '');
    }
    if(tab === 'line-items'){
      var lines = record.lineItems || [];
      if(lines.length === 0) return '<h2>Line items</h2><p class="hmv4-text-2">No line items recorded.</p>';
      return '<h2>Line items</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>Line</th><th>Product</th><th>Description</th><th>Ordered</th><th>Shipped</th><th>Progress</th><th>Unit price</th><th>Line total</th><th>Requested</th></tr></thead><tbody>'+
        lines.map(function(line){
          var ordered = Number(line.quantityOrdered || 0);
          var shipped = Number(line.quantityShipped || 0);
          var progress = ordered > 0 ? Math.round((shipped / ordered) * 100) + '%' : '0%';
          return '<tr><td>'+esc(line.line)+'</td><td>'+esc(line.productCode)+'</td><td>'+esc(line.description)+'</td><td>'+esc(soNumber(line.quantityOrdered))+'</td><td>'+esc(soNumber(line.quantityShipped))+'</td><td>'+esc(progress)+'</td><td>'+soMoney(line.unitPrice, record.currency)+'</td><td>'+soMoney(line.lineTotal, record.currency)+'</td><td>'+esc(line.requestedDate || '—')+'</td></tr>';
        }).join('')+
        '</tbody></table>';
    }
    if(tab === 'linked-job-orders'){
      var jobs = record.linkedJobOrders || [];
      if(jobs.length === 0) return '<h2>Linked job orders</h2><p class="hmv4-text-2">No job orders linked.</p>';
      return '<h2>Linked job orders</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>JO ID</th><th>Product</th><th>Quantity</th><th>State</th></tr></thead><tbody>'+
        jobs.map(function(job){return '<tr><td><a href="/ops/records/job-orders/'+esc(job.id)+'?tab=overview" data-hmv4-record-open="job-orders" data-hmv4-record-id="'+esc(job.id)+'">'+esc(job.id)+'</a></td><td>'+esc(job.productCode || '—')+'</td><td>'+esc(soNumber(job.quantity))+'</td><td>'+esc(job.state || '—')+'</td></tr>';}).join('')+
        '</tbody></table>';
    }
    if(tab === 'shipment-allocation'){
      var shipments = record.shipmentAllocation || [];
      if(shipments.length === 0) return '<h2>Shipment allocation</h2><p class="hmv4-text-2">No shipment allocation recorded.</p>';
      return '<h2>Shipment allocation</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>Shipment</th><th>Line</th><th>Quantity</th><th>Status</th><th>Planned</th></tr></thead><tbody>'+
        shipments.map(function(s){return '<tr><td>'+esc(s.shipmentId)+'</td><td>'+esc(s.lineRef)+'</td><td>'+esc(soNumber(s.quantity))+'</td><td>'+esc(s.status || '—')+'</td><td>'+esc(s.plannedDate || '—')+'</td></tr>';}).join('')+
        '</tbody></table>';
    }
    if(tab === 'invoicing'){
      var inv = record.invoicing || {};
      var invoices = inv.invoiceIds || [];
      return '<h2>Invoicing</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Invoiced</dt><dd>'+soMoney(inv.invoiced || 0, record.currency)+'</dd>'+
          '<dt>Paid</dt><dd>'+soMoney(inv.paid || 0, record.currency)+'</dd>'+
          '<dt>Payment terms</dt><dd>'+esc(inv.paymentTerms || '—')+'</dd>'+
          '<dt>Invoice IDs</dt><dd>'+esc(invoices.length ? invoices.join(', ') : 'None')+'</dd>'+
        '</dl>';
    }
    if(tab === 'related'){
      var rel = record.relatedRecords || [];
      if(rel.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
      return '<h2>Related records</h2><ul class="hmv4-list">'+
        rel.map(function(r){
          if(r.resourceFamily === 'job-orders') return '<li><span data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</span></li>';
          return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';
        }).join('')+
        '</ul>';
    }
    if(tab === 'audit') return '<h2>Audit</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/sales-orders/{id}/audit when audit endpoint is added in a Phase B follow-up.</p>';
    return '<p>Unknown tab.</p>';
  }
  function renderSoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseSoTab(q.tab || 'overview');
    var recordId = p.record_id || 'SO-2026-088';
    var record = getSoRecord(route);
    var state = record.state || 'fulfilling';
    var freshness = record.freshness || 'fixture_current';
    var partialAccessLimitations = record.limitations || [];
    var noteId = 'hmv4-so-disabled-note';

    var head =
      '<header class="hmv4-record-identity">'+
        '<h1 class="hmv4-record-title">'+esc(record.salesOrderNumber || recordId)+' &mdash; '+esc(record.title)+'</h1>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>State</dt><dd>'+esc(state)+'</dd>'+
          '<dt>Customer</dt><dd>'+esc(record.customerCode || '—')+'</dd>'+
          '<dt>Total</dt><dd>'+soMoney(record.totalValue, record.currency)+'</dd>'+
          '<dt>Owner</dt><dd>'+esc(record.owner || '—')+'</dd>'+
        '</dl>'+
        (record.stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-so-state>'+esc(record.stateMessage)+'</p>' : '')+
      '</header>';

    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-so-lifecycle aria-label="SO lifecycle">'+
      (record.lifecycle || []).map(function(s){return '<li data-state-class="'+esc(s[1] || 'pending')+'" data-lifecycle-state="'+esc(s[1] || 'pending')+'"><strong>'+esc(s[0])+'</strong><span>'+esc(s[1] || 'pending')+'</span></li>';}).join('')+
      '</ol>';

    var partialNotice = (state === 'partial_access' && partialAccessLimitations.length)
      ? '<section class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-so-partial><strong>Partial access</strong><ul>'+partialAccessLimitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul></section>'
      : '';

    var intents = [
      ['so-confirm','Confirm'],
      ['so-release','Release'],
      ['so-spawn-job-order','Spawn JO'],
      ['so-allocate-shipment','Allocate shipment'],
      ['so-invoice','Invoice'],
      ['so-cancel','Cancel'],
      ['so-complete','Complete']
    ];
    var disabledLaunchers =
      '<section class="hmv4-toolbar" aria-label="Disabled SO mutation launchers" data-hmv4-so-launchers>'+
        intents.map(function(intent){return '<button class="hmv4-button" type="button" disabled aria-disabled="true" aria-describedby="'+esc(noteId)+'" data-hmv4-mutation-intent="'+esc(intent[0])+'">'+esc(intent[1])+' disabled</button>';}).join('')+
        '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Mutation actions are disabled in this read-only prototype.</span>'+
      '</section>';

    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--so" data-hmv4-so-record data-route-class="AR" data-resource-family="sales-orders" data-root-code="SO" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
      head + lifecycleStrip + partialNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="Sales order details">'+soTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+esc(t)+'" id="tab-so-'+esc(t)+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      soTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-so-'+esc(t)+'" '+(t===tab?'':'hidden')+' data-hmv4-so-panel="'+esc(t)+'">'+renderSoPanel(t, record)+'</section>';}).join('')+
      '</article>';
  }
  var woTabs = ['overview','operation-detail','resource-allocation','execution-log','inspections','dispatch-status','related','audit'];
  function normaliseWoTab(tab){ return woTabs.indexOf(tab) >= 0 ? tab : 'overview'; }
  function defaultWoRecord(recordId){
    return {
      recordId: recordId || 'WO-3013',
      rootCode: 'WO',
      title: 'WO-3013 First-piece OP-30 on JO-2026-014',
      parentJobOrder: 'JO-2026-014',
      state: 'executing',
      severity: 'low',
      operation: {
        code: 'OP-30',
        name: 'First-piece inspection',
        sequence: 30,
        workCenter: 'WC-QC-01',
        equipmentCode: 'CMM-Z1',
        equipmentName: 'Zeiss Contura CMM',
        setupTimeMin: 15,
        runTimeMin: 45
      },
      resourceAllocation: {
        operatorId: 'OP-1004',
        operatorName: 'Pham Thi D',
        equipmentId: 'CMM-Z1',
        equipmentBookedFrom: '2026-04-25 14:00',
        equipmentBookedTo: '2026-04-25 15:30',
        skillRequirements: ['QUAL_FIRST_PIECE','QUAL_QC_VISUAL'],
        qualifiedOperators: ['OP-1004','OP-1007']
      },
      scheduledStart: '2026-04-25',
      scheduledEnd: '2026-04-26',
      actualStart: '2026-04-25 14:05',
      actualEnd: null,
      quantityPlanned: 5,
      quantityProduced: 3,
      quantityScrap: 0,
      freshness: 'fixture_current',
      stateMessage: 'Read-only prototype WO shell.',
      lifecycle: [['planned','complete'],['released','complete'],['ready','complete'],['executing','current'],['paused','locked'],['completed','locked'],['scrapped','locked']],
      executionLog: [],
      inspections: [],
      dispatchStatus: {},
      relatedRecords: [],
      limitations: []
    };
  }
  function getWoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var recordId = p.record_id || 'WO-3013';
    var fixture = window.HMV4_WO_RECORD_FIXTURE || readJsonFixture('[data-hmv4-wo-record-fixture]') || {};
    var record = defaultWoRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    var state = q.state || fixture.state || record.state || 'executing';
    var stateOverlay = (fixture.states || {})[state] || null;
    if(stateOverlay){
      record.state = state;
      if(stateOverlay.freshness) record.freshness = stateOverlay.freshness;
      if(stateOverlay.stateMessage) record.stateMessage = stateOverlay.stateMessage;
      if(stateOverlay.limitations) record.limitations = stateOverlay.limitations;
    }
    if(state === 'partial_access'){
      record.resourceAllocation = Object.assign({}, record.resourceAllocation || {}, {
        operatorName: 'Masked',
        equipmentBookedFrom: 'Masked',
        equipmentBookedTo: 'Masked'
      });
    }
    record.recordId = recordId;
    record.rootCode = 'WO';
    return record;
  }
  function renderWoList(items, renderItem){
    if(!items || !items.length) return '<p class="hmv4-text-2">No rows recorded.</p>';
    return '<ul class="hmv4-list">'+items.map(renderItem).join('')+'</ul>';
  }
  function renderWoPanel(tab, record){
    var op = record.operation || {};
    var res = record.resourceAllocation || {};
    if(tab === 'overview'){
      return '<h2>Overview</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Parent JO</dt><dd>'+esc(record.parentJobOrder || '—')+'</dd>'+
          '<dt>Operation</dt><dd>'+esc(op.code || '—')+' '+esc(op.name || '')+'</dd>'+
          '<dt>Work center</dt><dd>'+esc(op.workCenter || '—')+'</dd>'+
          '<dt>Equipment</dt><dd>'+esc(op.equipmentCode || '—')+' '+esc(op.equipmentName || '')+'</dd>'+
          '<dt>Scheduled</dt><dd>'+esc(record.scheduledStart || '—')+' &rarr; '+esc(record.scheduledEnd || '—')+'</dd>'+
          '<dt>Actual</dt><dd>'+esc(record.actualStart || '—')+' &rarr; '+esc(record.actualEnd || 'in-progress')+'</dd>'+
          '<dt>Quantity</dt><dd>'+esc((record.quantityProduced || 0)+' / '+(record.quantityPlanned || 0)+' produced, '+(record.quantityScrap || 0)+' scrap')+'</dd>'+
        '</dl>';
    }
    if(tab === 'operation-detail'){
      return '<h2>Operation detail</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Code</dt><dd>'+esc(op.code || '—')+'</dd>'+
          '<dt>Name</dt><dd>'+esc(op.name || '—')+'</dd>'+
          '<dt>Sequence</dt><dd>'+esc(op.sequence || '—')+'</dd>'+
          '<dt>Work center</dt><dd>'+esc(op.workCenter || '—')+'</dd>'+
          '<dt>Equipment code</dt><dd>'+esc(op.equipmentCode || '—')+'</dd>'+
          '<dt>Equipment name</dt><dd>'+esc(op.equipmentName || '—')+'</dd>'+
          '<dt>Setup time</dt><dd>'+esc(op.setupTimeMin != null ? op.setupTimeMin+' min' : '—')+'</dd>'+
          '<dt>Run time</dt><dd>'+esc(op.runTimeMin != null ? op.runTimeMin+' min' : '—')+'</dd>'+
        '</dl>';
    }
    if(tab === 'resource-allocation'){
      return '<h2>Resource allocation</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Operator</dt><dd>'+esc(res.operatorId || '—')+' '+esc(res.operatorName || '')+'</dd>'+
          '<dt>Equipment booking</dt><dd>'+esc(res.equipmentId || '—')+' '+esc(res.equipmentBookedFrom || '—')+' &rarr; '+esc(res.equipmentBookedTo || '—')+'</dd>'+
          '<dt>Skills required</dt><dd>'+esc((res.skillRequirements || []).join(', ') || '—')+'</dd>'+
          '<dt>Qualified operators</dt><dd>'+esc((res.qualifiedOperators || []).join(', ') || '—')+'</dd>'+
        '</dl>';
    }
    if(tab === 'execution-log'){
      return '<h2>Execution log</h2>'+renderWoList(record.executionLog || [], function(e){
        return '<li><strong>'+esc(e.ts || '—')+'</strong> '+esc(e.event || 'event')+' — '+esc(e.operatorId || '—')+'<p>'+esc(e.note || '')+'</p></li>';
      });
    }
    if(tab === 'inspections'){
      return '<h2>Inspections</h2>'+renderWoList(record.inspections || [], function(i){
        return '<li><a href="/ops/records/inspections/'+esc(i.id)+'?tab=overview" data-hmv4-record-open="inspections" data-hmv4-record-id="'+esc(i.id)+'">'+esc(i.id)+'</a> — '+esc(i.type || 'inspection')+' / '+esc(i.result || 'pending')+' at '+esc(i.recordedAt || '—')+'</li>';
      });
    }
    if(tab === 'dispatch-status'){
      var d = record.dispatchStatus || {};
      return '<h2>Dispatch status</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Dispatched at</dt><dd>'+esc(d.dispatchedAt || '—')+'</dd>'+
          '<dt>Dispatched by</dt><dd>'+esc(d.dispatchedBy || '—')+'</dd>'+
          '<dt>Dispatch target</dt><dd>'+esc(d.currentDispatchTarget || '—')+'</dd>'+
          '<dt>ETA</dt><dd>'+esc(d.eta || '—')+'</dd>'+
        '</dl>';
    }
    if(tab === 'related'){
      var rel = record.relatedRecords || [];
      if(rel.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
      return '<h2>Related records</h2><ul class="hmv4-list">'+
        rel.map(function(r){
          if(r.resourceFamily === 'inspections') return '<li>'+esc(r.label)+'</li>';
          return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';
        }).join('')+
        '</ul>';
    }
    if(tab === 'audit') return '<h2>Audit</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/work-orders/{id}/audit when the governed audit projection is connected.</p>';
    return '<p>Unknown tab.</p>';
  }
  function renderWoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseWoTab(q.tab || 'overview');
    var recordId = p.record_id || 'WO-3013';
    var record = getWoRecord(route);
    var state = record.state || 'executing';
    var freshness = record.freshness || 'fixture_current';
    var limitations = record.limitations || [];
    var noteId = 'hmv4-wo-disabled-note';

    var head =
      '<header class="hmv4-record-identity">'+
        '<h1 class="hmv4-record-title">'+esc(recordId)+' &mdash; '+esc(record.title)+'</h1>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>State</dt><dd>'+esc(state)+'</dd>'+
          '<dt>Severity</dt><dd>'+esc(record.severity || '—')+'</dd>'+
          '<dt>Parent JO</dt><dd>'+esc(record.parentJobOrder || '—')+'</dd>'+
          '<dt>Operation</dt><dd>'+esc((record.operation && record.operation.code) || '—')+'</dd>'+
        '</dl>'+
        (record.stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-wo-state>'+esc(record.stateMessage)+'</p>' : '')+
      '</header>';

    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-wo-lifecycle aria-label="WO lifecycle">'+
      (record.lifecycle || []).map(function(s){return '<li data-state-class="'+esc(s[1] || 'pending')+'" data-lifecycle-state="'+esc(s[0] || 'stage')+'" data-lifecycle-status="'+esc(s[1] || 'pending')+'"><strong>'+esc(s[0])+'</strong><span>'+esc(s[1] || 'pending')+'</span></li>';}).join('')+
      '</ol>';

    var partialNotice = (state === 'partial_access' && limitations.length)
      ? '<section class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-wo-partial><strong>Partial access</strong><ul>'+limitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul></section>'
      : '';

    var intents = [
      ['wo-release','Release'],
      ['wo-mark-ready','Mark ready'],
      ['wo-start-execution','Start execution'],
      ['wo-pause','Pause'],
      ['wo-resume','Resume'],
      ['wo-record-completion','Record completion'],
      ['wo-record-scrap','Record scrap'],
      ['wo-cancel','Cancel']
    ];
    var disabledLaunchers =
      '<section class="hmv4-toolbar" aria-label="Disabled WO mutation launchers" data-hmv4-wo-launchers>'+
        intents.map(function(intent){return '<button class="hmv4-button" type="button" disabled aria-disabled="true" aria-describedby="'+esc(noteId)+'" data-hmv4-mutation-intent="'+esc(intent[0])+'">'+esc(intent[1])+' disabled</button>';}).join('')+
        '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Mutation actions are disabled in this read-only prototype. Release, ready, execution, completion, scrap, and cancellation must re-anchor to governed WO service paths.</span>'+
      '</section>';

    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--wo" data-hmv4-wo-record data-route-class="AR" data-resource-family="work-orders" data-root-code="WO" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
      head + lifecycleStrip + partialNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="Work order details">'+woTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+esc(t)+'" id="tab-wo-'+esc(t)+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      woTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-wo-'+esc(t)+'" '+(t===tab?'':'hidden')+' data-hmv4-wo-panel="'+esc(t)+'">'+renderWoPanel(t, record)+'</section>';}).join('')+
      '</article>';
  }
  var cpoTabs = ['overview','line-items','terms-and-conditions','linked-sales-orders','acknowledgment','related','audit'];
  function normaliseCpoTab(tab){ return cpoTabs.indexOf(tab) >= 0 ? tab : 'overview'; }
  function defaultCpoRecord(recordId){
    return {
      recordId: recordId || 'CPO-2026-077',
      rootCode: 'CPO',
      title: 'Customer PO from Acme Industrial (PO-ACME-2026-Q2-014)',
      customerPoNumber: 'PO-ACME-2026-Q2-014',
      customerCode: 'CUST-100',
      customerName: 'Acme Industrial Corp.',
      customerOrderRef: 'PO-ACME-2026-Q2-014',
      state: 'acknowledged',
      severity: 'low',
      receivedDate: '2026-03-28',
      requestedDeliveryDate: '2026-04-30',
      acknowledgedDate: '2026-04-01',
      totalValue: 250000,
      currency: 'USD',
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB Shipping Point',
      owner: 'Sales Manager',
      freshness: 'fixture_current',
      stateMessage: 'Read-only prototype CPO shell.',
      lifecycle: [
        ['received','complete'],
        ['reviewing','complete'],
        ['acknowledged','current'],
        ['fulfilled','pending'],
        ['rejected','locked']
      ],
      lineItems: [
        { line: 1, productCode: 'PN-2042', description: 'Widget Assembly Rev B', quantity: 5000, unitPrice: 50, lineTotal: 250000, requestedDate: '2026-04-30' }
      ],
      termsAndConditions: {
        paymentTerms: 'Net 30',
        deliveryTerms: 'FOB Shipping Point',
        warrantyTerms: '12 months from delivery',
        qualityRequirements: 'ISO 9001 cert required; customer source inspection on first lot',
        customClauses: ['Customer reserves right to cancel without penalty if delivery > 14 days late']
      },
      linkedSalesOrders: [
        { id: 'SO-2026-088', productCode: 'PN-2042', quantity: 5000, state: 'fulfilling' }
      ],
      acknowledgment: {
        acknowledgedAt: '2026-04-01',
        acknowledgedBy: 'Sales Manager',
        customerSignedAt: '2026-04-02',
        deviationsFromCustomerPo: [
          { field: 'deliveryDate', customerRequested: '2026-04-30', weAcknowledged: '2026-05-02', reason: 'Production schedule capacity' }
        ]
      },
      relatedRecords: [
        { resourceFamily: 'sales-orders', recordId: 'SO-2026-088', label: 'SO-2026-088 spawned for fulfillment' }
      ],
      limitations: []
    };
  }
  function getCpoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var recordId = p.record_id || 'CPO-2026-077';
    var fixture = window.HMV4_CPO_RECORD_FIXTURE || readJsonFixture('[data-hmv4-cpo-record-fixture]') || {};
    var record = defaultCpoRecord(recordId);
    if(fixture.records && fixture.records[recordId]) mergeRecord(record, fixture.records[recordId]);
    if(fixture.record) mergeRecord(record, fixture.record);
    if(fixture.state) record.state = fixture.state;
    if(fixture.freshness) record.freshness = fixture.freshness;
    if(fixture.stateMessage) record.stateMessage = fixture.stateMessage;
    if(fixture.limitations) record.limitations = fixture.limitations;
    var state = q.state || fixture.state || record.state || 'received';
    var stateOverlay = (fixture.states || {})[state] || null;
    if(stateOverlay){
      record.state = state;
      if(stateOverlay.freshness) record.freshness = stateOverlay.freshness;
      if(stateOverlay.stateMessage) record.stateMessage = stateOverlay.stateMessage;
      if(stateOverlay.limitations) record.limitations = stateOverlay.limitations;
    }
    record.recordId = recordId;
    record.rootCode = 'CPO';
    return record;
  }
  function cpoMoney(value, currency, masked){
    if(masked) return '<span data-hmv4-cpo-total-value="masked">Masked</span>';
    var n = Number(value);
    if(!isFinite(n)) return '<span data-hmv4-cpo-total-value="unknown">-</span>';
    return '<span data-hmv4-cpo-total-value="visible">'+esc(currency || 'USD')+' '+esc(n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))+'</span>';
  }
  function cpoDisplay(value, masked){
    if(masked) return 'Masked';
    return value == null || value === '' ? '-' : String(value);
  }
  function renderCpoPanel(tab, record){
    var partial = record.state === 'partial_access';
    if(tab === 'overview'){
      return '<h2>Overview</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Customer PO #</dt><dd>'+esc(record.customerPoNumber || '-')+'</dd>'+
          '<dt>Customer</dt><dd>'+esc(cpoDisplay(record.customerName || record.customerCode, partial))+'</dd>'+
          '<dt>Customer code</dt><dd>'+esc(record.customerCode || '-')+'</dd>'+
          '<dt>Received</dt><dd>'+esc(record.receivedDate || '-')+'</dd>'+
          '<dt>Requested delivery</dt><dd>'+esc(record.requestedDeliveryDate || '-')+'</dd>'+
          '<dt>Acknowledged</dt><dd>'+esc(record.acknowledgedDate || '-')+'</dd>'+
          '<dt>Total value</dt><dd>'+cpoMoney(record.totalValue, record.currency, partial)+'</dd>'+
          '<dt>Owner</dt><dd>'+esc(record.owner || '-')+'</dd>'+
        '</dl>'+
        '<p class="hmv4-text-2">Inbound customer commitment. Sales-order fulfillment remains linked but governed separately.</p>';
    }
    if(tab === 'line-items'){
      var lines = record.lineItems || [];
      if(lines.length === 0) return '<h2>Line items</h2><p class="hmv4-text-2">No line items in this fixture.</p>';
      return '<h2>Line items</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>Line</th><th>Product</th><th>Description</th><th>Qty</th><th>Unit price</th><th>Line total</th><th>Requested</th></tr></thead><tbody>'+
        lines.map(function(line){
          return '<tr><td>'+esc(line.line)+'</td><td>'+esc(line.productCode || '-')+'</td><td>'+esc(line.description || '-')+'</td><td>'+esc(line.quantity || 0)+'</td><td>'+cpoMoney(line.unitPrice, record.currency, false)+'</td><td>'+cpoMoney(line.lineTotal, record.currency, partial)+'</td><td>'+esc(line.requestedDate || '-')+'</td></tr>';
        }).join('')+
        '</tbody></table>';
    }
    if(tab === 'terms-and-conditions'){
      var terms = record.termsAndConditions || {};
      var clauses = partial ? ['Masked'] : (terms.customClauses || []);
      return '<h2>Terms and conditions</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Payment terms</dt><dd>'+esc(terms.paymentTerms || record.paymentTerms || '-')+'</dd>'+
          '<dt>Delivery terms</dt><dd>'+esc(terms.deliveryTerms || record.deliveryTerms || '-')+'</dd>'+
          '<dt>Warranty</dt><dd>'+esc(terms.warrantyTerms || '-')+'</dd>'+
          '<dt>Quality requirements</dt><dd>'+esc(terms.qualityRequirements || '-')+'</dd>'+
        '</dl>'+
        (clauses.length ? '<h3>Custom clauses</h3><ul class="hmv4-list">'+clauses.map(function(c){return '<li>'+esc(c)+'</li>';}).join('')+'</ul>' : '<p class="hmv4-text-2">No custom clauses.</p>');
    }
    if(tab === 'linked-sales-orders'){
      var orders = record.linkedSalesOrders || [];
      if(orders.length === 0) return '<h2>Linked sales orders</h2><p class="hmv4-text-2">No sales orders spawned from this CPO.</p>';
      return '<h2>Linked sales orders</h2>'+
        '<table class="hmv4-data-table"><thead><tr><th>Sales order</th><th>Product</th><th>Qty</th><th>State</th></tr></thead><tbody>'+
        orders.map(function(order){
          return '<tr><td><a href="/ops/records/sales-orders/'+esc(order.id)+'?tab=overview" data-hmv4-record-open="sales-orders" data-hmv4-record-id="'+esc(order.id)+'">'+esc(order.id)+'</a></td><td>'+esc(order.productCode || '-')+'</td><td>'+esc(order.quantity || 0)+'</td><td>'+esc(order.state || '-')+'</td></tr>';
        }).join('')+
        '</tbody></table>';
    }
    if(tab === 'acknowledgment'){
      var ack = record.acknowledgment || {};
      var deviations = ack.deviationsFromCustomerPo || [];
      return '<h2>Acknowledgment</h2>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Acknowledged at</dt><dd>'+esc(ack.acknowledgedAt || record.acknowledgedDate || '-')+'</dd>'+
          '<dt>Acknowledged by</dt><dd>'+esc(ack.acknowledgedBy || '-')+'</dd>'+
          '<dt>Customer signed</dt><dd>'+esc(ack.customerSignedAt || '-')+'</dd>'+
        '</dl>'+
        (deviations.length ? '<h3>Deviations from customer PO</h3><table class="hmv4-data-table"><thead><tr><th>Field</th><th>Customer requested</th><th>We acknowledged</th><th>Reason</th></tr></thead><tbody>'+
          deviations.map(function(d){return '<tr><td>'+esc(d.field || '-')+'</td><td>'+esc(d.customerRequested || '-')+'</td><td>'+esc(d.weAcknowledged || '-')+'</td><td>'+esc(d.reason || '-')+'</td></tr>';}).join('')+
          '</tbody></table>' : '<p class="hmv4-text-2">No deviations from customer PO.</p>');
    }
    if(tab === 'related'){
      var related = record.relatedRecords || [];
      if(related.length === 0) return '<h2>Related records</h2><p class="hmv4-text-2">No related records.</p>';
      return '<h2>Related records</h2><ul class="hmv4-list">'+
        related.map(function(r){return '<li><a href="/ops/records/'+esc(r.resourceFamily)+'/'+esc(r.recordId)+'?tab=overview" data-hmv4-record-open="'+esc(r.resourceFamily)+'" data-hmv4-record-id="'+esc(r.recordId)+'">'+esc(r.label)+'</a></li>';}).join('')+
        '</ul>';
    }
    if(tab === 'audit') return '<h2>Audit</h2><p class="hmv4-text-2">Read-only placeholder. Live: GET /api/v1/customer-purchase-orders/{id}/audit when audit projection is added.</p>';
    return '<p>Unknown tab.</p>';
  }
  function renderCpoRecord(route){
    var p = route.params || {};
    var q = route.query || {};
    var tab = normaliseCpoTab(q.tab || 'overview');
    var recordId = p.record_id || 'CPO-2026-077';
    var record = getCpoRecord(route);
    var state = record.state || 'received';
    var freshness = record.freshness || 'fixture_current';
    var limitations = record.limitations || [];
    var noteId = 'hmv4-cpo-disabled-note';

    var head =
      '<header class="hmv4-record-identity">'+
        '<h1 class="hmv4-record-title">'+esc(record.recordId || recordId)+' &mdash; '+esc(record.title || 'Customer purchase order')+'</h1>'+
        '<dl class="hmv4-meta-grid">'+
          '<dt>Customer PO #</dt><dd>'+esc(record.customerPoNumber || '-')+'</dd>'+
          '<dt>State</dt><dd>'+esc(state)+'</dd>'+
          '<dt>Severity</dt><dd>'+esc(record.severity || '-')+'</dd>'+
          '<dt>Total</dt><dd>'+cpoMoney(record.totalValue, record.currency, state === 'partial_access')+'</dd>'+
        '</dl>'+
        (record.stateMessage ? '<p class="hmv4-feedback" data-feedback-state="bridge" role="status" data-hmv4-cpo-state>'+esc(record.stateMessage)+'</p>' : '')+
      '</header>';

    var lifecycleStrip = '<ol class="hmv4-lifecycle-strip" data-hmv4-cpo-lifecycle aria-label="CPO lifecycle">'+
      (record.lifecycle || []).map(function(s){return '<li data-state-class="'+esc(s[1] || 'pending')+'" data-lifecycle-state="'+esc(s[1] || 'pending')+'"><strong>'+esc(s[0])+'</strong><span>'+esc(s[1] || 'pending')+'</span></li>';}).join('')+
      '</ol>';

    var partialNotice = (state === 'partial_access' && limitations.length)
      ? '<section class="hmv4-feedback" data-feedback-state="warning" role="status" data-hmv4-cpo-partial><strong>Partial access</strong><ul>'+limitations.map(function(l){return '<li>'+esc(l)+'</li>';}).join('')+'</ul></section>'
      : '';

    var intents = [
      ['cpo-acknowledge','Acknowledge'],
      ['cpo-reject','Reject'],
      ['cpo-spawn-sales-order','Spawn sales order'],
      ['cpo-amend','Amend']
    ];
    var disabledLaunchers =
      '<section class="hmv4-toolbar" aria-label="Disabled CPO mutation launchers" data-hmv4-cpo-launchers>'+
        intents.map(function(intent){return '<button class="hmv4-button" type="button" disabled aria-disabled="true" aria-describedby="'+esc(noteId)+'" data-hmv4-mutation-intent="'+esc(intent[0])+'">'+esc(intent[1])+' disabled</button>';}).join('')+
        '<span class="hmv4-feedback" data-feedback-state="warning" role="note" id="'+esc(noteId)+'">Mutation actions are disabled in this read-only prototype. Acknowledgment, rejection, sales-order spawning, and amendment must use governed commercial write paths.</span>'+
      '</section>';

    return '<article class="hmv4-record-shell hmv4-record-shell--display hmv4-record-shell--cpo" data-hmv4-cpo-record data-route-class="AR" data-resource-family="customer-purchase-orders" data-root-code="CPO" data-record-id="'+esc(recordId)+'" data-authority-class="authoritative" data-query-tab="'+esc(tab)+'" data-fixture-state="'+esc(state)+'" data-fixture-freshness="'+esc(freshness)+'">'+
      head + lifecycleStrip + partialNotice + disabledLaunchers +
      '<div class="hmv4-tablist" role="tablist" aria-label="Customer purchase order details">'+cpoTabs.map(function(t){return '<button class="hmv4-tab" role="tab" aria-selected="'+(t===tab)+'" data-tab="'+esc(t)+'" id="tab-cpo-'+esc(t)+'">'+esc(t)+'</button>';}).join('')+'</div>'+
      cpoTabs.map(function(t){return '<section class="hmv4-tabpanel" role="tabpanel" aria-labelledby="tab-cpo-'+esc(t)+'" '+(t===tab?'':'hidden')+' data-hmv4-cpo-panel="'+esc(t)+'">'+renderCpoPanel(t, record)+'</section>';}).join('')+
      '</article>';
  }
  function renderRecord(route){
    var p = route.params, tab = route.query.tab || 'overview';
    if(p.resource_family === 'nonconformance-cases') return renderNonconformanceRecord(route);
    if(p.resource_family === 'capas') return renderCapaRecord(route);
    if(p.resource_family === 'batch-releases') return renderBrelRecord(route);
    if(p.resource_family === 'controlled-documents') return renderCdocRecord(route);
    if(p.resource_family === 'inspections') return renderInspRecord(route);
    if(p.resource_family === 'engineering-changes') return renderEcoRecord(route);
    if(p.resource_family === 'job-orders') return renderJoRecord(route);
    if(p.resource_family === 'work-orders') return renderWoRecord(route);
    if(p.resource_family === 'sales-orders') return renderSoRecord(route);
    if(p.resource_family === 'customer-purchase-orders') return renderCpoRecord(route);
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
    renderCdocRecord: renderCdocRecord,
    renderBrelRecord: renderBrelRecord,
    renderInspRecord: renderInspRecord,
    renderEcoRecord: renderEcoRecord,
    renderJoRecord: renderJoRecord,
    renderSoRecord: renderSoRecord,
    renderWoRecord: renderWoRecord,
    renderCpoRecord: renderCpoRecord,
    domains: domains,
    modules: modules
  });
})();
