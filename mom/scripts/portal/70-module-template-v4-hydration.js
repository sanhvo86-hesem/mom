/* HESEM Operations Platform — module-template-v4 hydration adapter.
   Feature-flagged. No-op unless HMV4_PREVIEW_ENABLED or /ops path. */
(function(){
  'use strict';
  if(typeof window !== 'undefined' && typeof window.HMV4_LIVE_API_ENABLED === 'undefined') window.HMV4_LIVE_API_ENABLED = false;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function readLiveApiFlag(){
    if(typeof window === 'undefined') return false;
    if(window.HMV4_LIVE_API_ENABLED === true) return true;
    try {
      var url = new URL(window.location.href);
      if(url.searchParams.get('hmv4-live-api') === '1') return true;
    } catch(_) {}
    if(document.body && document.body.getAttribute('data-hmv4-live-api') === 'true') return true;
    return false;
  }
  function normalizeLifecycle(lifecycle){
    if(!Array.isArray(lifecycle)) return [];
    return lifecycle.map(function(stage){
      if(Array.isArray(stage)) return stage;
      return [stage.name || stage.stage || stage.status || 'stage', stage.state || stage.status || 'pending'];
    });
  }
  // Live API resource registry (ADR-0011 + ADR-0012)
  var HMV4_LIVE_RESOURCE_REGISTRY = {
    'nonconformance-cases': {
      canonicalPath: '/api/v1/nonconformance-cases',
      fixtureGlobal: 'HMV4_NONCONFORMANCE_CASE_FIXTURE',
      recordAttr: 'data-hmv4-nonconformance-record',
      adapt: function(live){
        if(!live) return null;
        var recordId = live.id || live.record_id || live.code;
        return {
          recordId: recordId,
          rootCode: 'NQCASE',
          title: live.title || live.summary || ('Nonconformance ' + (recordId || '')),
          subtype: live.subtype || live.kind || 'nonconformance',
          status: live.state || live.status,
          severity: live.severity,
          state: 'live',
          freshness: 'live_current',
          owner: (live.owner && (live.owner.name || live.owner)) || null,
          source: live.source,
          part: live.part_number || live.part,
          lot: live.lot,
          workOrder: live.work_order_id || live.workOrder,
          stateMessage: 'Live API mode. Read-only display. Mutation actions remain disabled.',
          lifecycle: normalizeLifecycle(live.lifecycle)
        };
      }
    },
    'work-orders': {
      canonicalPath: '/api/v1/work-orders',
      fixtureGlobal: 'HMV4_WO_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-wo-record',
      adapt: function(live){
        if(!live) return null;
        var recordId = live.id || live.record_id || live.work_order_id || live.code;
        var operation = live.operation || {};
        var resource = live.resourceAllocation || live.resource_allocation || {};
        return {
          recordId: recordId,
          rootCode: 'WO',
          title: live.title || live.summary || ('Work order ' + (recordId || '')),
          parentJobOrder: live.parentJobOrder || live.parent_job_order || live.job_order_id || live.jobOrderId,
          state: live.state || live.status || 'live',
          severity: live.severity,
          operation: {
            code: operation.code || live.operation_code,
            name: operation.name || live.operation_name,
            sequence: operation.sequence || live.operation_sequence,
            workCenter: operation.workCenter || operation.work_center || live.work_center,
            equipmentCode: operation.equipmentCode || operation.equipment_code || live.equipment_code,
            equipmentName: operation.equipmentName || operation.equipment_name || live.equipment_name,
            setupTimeMin: operation.setupTimeMin || operation.setup_time_min,
            runTimeMin: operation.runTimeMin || operation.run_time_min
          },
          resourceAllocation: resource,
          scheduledStart: live.scheduledStart || live.scheduled_start,
          scheduledEnd: live.scheduledEnd || live.scheduled_end,
          actualStart: live.actualStart || live.actual_start,
          actualEnd: live.actualEnd || live.actual_end,
          quantityPlanned: live.quantityPlanned || live.quantity_planned,
          quantityProduced: live.quantityProduced || live.quantity_produced,
          quantityScrap: live.quantityScrap || live.quantity_scrap,
          freshness: 'live_current',
          stateMessage: 'Live API mode. Read-only display. Mutation actions remain disabled.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          executionLog: live.executionLog || live.execution_log || [],
          inspections: live.inspections || [],
          dispatchStatus: live.dispatchStatus || live.dispatch_status || {},
          relatedRecords: live.relatedRecords || live.related_records || []
        };
      }
    },
    'job-orders': {
      canonicalPath: '/api/v1/job-orders',
      fixtureGlobal: 'HMV4_JO_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-jo-record',
      adapt: function(live){
        if(!live) return null;
        var recordId = live.id || live.record_id || live.code || live.job_number || live.jobNumber;
        return {
          recordId: recordId,
          rootCode: 'JO',
          title: live.title || live.summary || ('Job ' + (live.job_number || live.jobNumber || recordId || '')),
          jobNumber: live.job_number || live.jobNumber || recordId,
          customerOrderRef: live.customer_order_ref || live.customerOrderRef,
          productCode: live.product_code || live.productCode,
          quantityOrdered: live.quantity_ordered || live.quantityOrdered,
          quantityCompleted: live.quantity_completed || live.quantityCompleted,
          state: live.state || live.status || 'live',
          severity: live.severity || 'low',
          scheduledStart: live.scheduled_start || live.scheduledStart,
          scheduledEnd: live.scheduled_end || live.scheduledEnd,
          actualStart: live.actual_start || live.actualStart,
          actualEnd: live.actual_end || live.actualEnd,
          owner: (live.owner && (live.owner.name || live.owner)) || null,
          plannerNotes: live.planner_notes || live.plannerNotes,
          freshness: 'live_current',
          stateMessage: 'Live API mode. Read-only display. Mutation actions remain disabled.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          dispatchReadiness: live.dispatch_readiness || live.dispatchReadiness || {},
          spawnedWorkOrders: live.spawned_work_orders || live.spawnedWorkOrders || [],
          materialConsumption: live.material_consumption || live.materialConsumption || [],
          progressMetrics: live.progress_metrics || live.progressMetrics || {},
          relatedRecords: live.related_records || live.relatedRecords || []
        };
      }
    },
    'sales-orders': {
      canonicalPath: '/api/v1/sales-orders',
      fixtureGlobal: 'HMV4_SO_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-so-record',
      adapt: function(live){
        if(!live) return null;
        var recordId = live.id || live.record_id || live.code || live.sales_order_number || live.salesOrderNumber;
        return {
          recordId: recordId,
          rootCode: 'SO',
          title: live.title || live.summary || ('Sales order ' + (recordId || '')),
          salesOrderNumber: live.sales_order_number || live.salesOrderNumber || recordId,
          customerCode: live.customer_code || live.customerCode,
          customerName: live.customer_name || live.customerName,
          customerOrderRef: live.customer_order_ref || live.customerOrderRef || live.customer_po,
          state: live.state || live.status || 'live',
          severity: live.severity || 'low',
          orderDate: live.order_date || live.orderDate,
          requestedShipDate: live.requested_ship_date || live.requestedShipDate,
          confirmedShipDate: live.confirmed_ship_date || live.confirmedShipDate,
          actualShipDate: live.actual_ship_date || live.actualShipDate,
          totalValue: live.total_value || live.totalValue,
          currency: live.currency,
          owner: (live.owner && (live.owner.name || live.owner)) || null,
          salesNotes: live.sales_notes || live.salesNotes,
          freshness: 'live_current',
          stateMessage: 'Live API mode. Read-only display. Mutation actions remain disabled.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          lineItems: live.line_items || live.lineItems || [],
          linkedJobOrders: live.linked_job_orders || live.linkedJobOrders || [],
          shipmentAllocation: live.shipment_allocation || live.shipmentAllocation || [],
          invoicing: live.invoicing || {},
          relatedRecords: live.related_records || live.relatedRecords || []
        };
      }
    },
    'customer-purchase-orders': {
      canonicalPath: '/api/v1/customer-purchase-orders',
      fixtureGlobal: 'HMV4_CPO_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-cpo-record',
      adapt: function(live){
        if(!live) return null;
        var recordId = live.id || live.record_id || live.code || live.customer_po_number || live.customerPoNumber;
        return {
          recordId: recordId,
          rootCode: 'CPO',
          title: live.title || live.summary || ('Customer purchase order ' + (recordId || '')),
          customerPoNumber: live.customer_po_number || live.customerPoNumber || recordId,
          customerCode: live.customer_code || live.customerCode,
          customerName: live.customer_name || live.customerName,
          customerOrderRef: live.customer_order_ref || live.customerOrderRef || recordId,
          state: live.state || live.status || 'live',
          severity: live.severity || 'low',
          receivedDate: live.received_date || live.receivedDate,
          requestedDeliveryDate: live.requested_delivery_date || live.requestedDeliveryDate,
          acknowledgedDate: live.acknowledged_date || live.acknowledgedDate,
          totalValue: live.total_value || live.totalValue,
          currency: live.currency,
          paymentTerms: live.payment_terms || live.paymentTerms,
          deliveryTerms: live.delivery_terms || live.deliveryTerms,
          owner: (live.owner && (live.owner.name || live.owner)) || null,
          freshness: 'live_current',
          stateMessage: 'Live API mode. Read-only display. Mutation actions remain disabled.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          lineItems: live.line_items || live.lineItems || [],
          termsAndConditions: live.terms_and_conditions || live.termsAndConditions || {},
          linkedSalesOrders: live.linked_sales_orders || live.linkedSalesOrders || [],
          acknowledgment: live.acknowledgment || {},
          relatedRecords: live.related_records || live.relatedRecords || []
        };
      }
    },
    'capas': {
      canonicalPath: '/api/v1/capas',
      fixtureGlobal: 'HMV4_CAPA_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-capa-record',
      adapt: function(live){
        if(!live) return null;
        return {
          recordId: live.id || live.code,
          rootCode: 'CAPA',
          title: live.title || live.summary,
          severity: live.severity,
          state: live.state || 'live',
          freshness: 'live_current',
          owner: (live.owner && (live.owner.name || live.owner)) || null,
          dueDate: live.due_date || live.dueDate,
          linkedNcId: live.linked_nc_id || live.linkedNcId,
          stateMessage: 'Live API mode. Read-only display.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          rootCauses: live.root_causes || live.rootCauses || [],
          actionPlan: live.action_plan || live.actionPlan || [],
          verifications: live.verifications || [],
          effectivenessChecks: live.effectiveness_checks || [],
          relatedRecords: live.related_records || []
        };
      }
    },
    'controlled-documents': {
      canonicalPath: '/api/v1/controlled-documents',
      fixtureGlobal: 'HMV4_CDOC_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-cdoc-record',
      adapt: function(live){
        if(!live) return null;
        return {
          recordId: live.id || live.code,
          rootCode: 'CDOC',
          docCode: live.doc_code || live.docCode,
          title: live.title,
          category: live.category,
          classification: live.classification,
          state: live.state || 'live',
          currentRevision: live.current_revision || live.currentRevision,
          effectiveDate: live.effective_date || live.effectiveDate,
          owner: (live.owner && (live.owner.name || live.owner)) || null,
          contentSummary: live.content_summary || live.contentSummary,
          freshness: 'live_current',
          stateMessage: 'Live API mode. Read-only display.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          revisions: live.revisions || [],
          controlledCopies: live.controlled_copies || live.controlledCopies || [],
          effectivity: live.effectivity || {},
          relatedRecords: live.related_records || []
        };
      }
    },
    'inspections': {
      canonicalPath: '/api/v1/inspections',
      fixtureGlobal: 'HMV4_INSP_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-insp-record',
      adapt: function(live){
        if(!live) return null;
        return {
          recordId: live.id || live.code,
          rootCode: 'INSP',
          title: live.title,
          inspectionSubtype: live.subtype || live.inspection_subtype,
          state: live.state || 'live',
          severity: live.severity,
          workOrderId: live.work_order_id,
          lotId: live.lot_id,
          partNumber: live.part_number,
          supplier: live.supplier,
          freshness: 'live_current',
          stateMessage: 'Live API mode. Read-only display.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          characteristics: live.characteristics || [],
          sampleResults: live.sample_results || live.sampleResults || [],
          nonconformanceFlags: live.nc_flags || live.nonconformanceFlags || [],
          evidence: live.evidence || [],
          relatedRecords: live.related_records || []
        };
      }
    },
    'batch-releases': {
      canonicalPath: '/api/v1/batch-releases',
      fixtureGlobal: 'HMV4_BREL_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-brel-record',
      adapt: function(live){
        if(!live) return null;
        return {
          recordId: live.id || live.code,
          rootCode: 'BREL',
          title: live.title,
          batchId: live.batch_id || live.batchId,
          productCode: live.product_code,
          lotId: live.lot_id,
          manufacturedAt: live.manufactured_at,
          manufactureLine: live.manufacture_line,
          state: live.state || 'live',
          releaseDecision: live.release_decision || live.releaseDecision || 'pending',
          freshness: 'live_current',
          stateMessage: 'Live API mode. 2-person e-sign required for release.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          approvers: live.approvers || [],
          releasePackage: live.release_package || {},
          qualityEvidence: live.quality_evidence || {},
          genealogyRoot: live.genealogy_root,
          shipmentReadiness: live.shipment_readiness || {},
          relatedRecords: live.related_records || []
        };
      }
    },
    'engineering-changes': {
      canonicalPath: '/api/v1/engineering-changes',
      fixtureGlobal: 'HMV4_ECO_RECORD_FIXTURE',
      recordAttr: 'data-hmv4-eco-record',
      adapt: function(live){
        if(!live) return null;
        return {
          recordId: live.id || live.code,
          rootCode: 'ECO',
          title: live.title,
          changeType: live.change_type,
          changeReason: live.change_reason,
          state: live.state || 'live',
          severity: live.severity,
          proposer: live.proposer,
          approver: live.approver,
          freshness: 'live_current',
          stateMessage: 'Live API mode. Read-only display.',
          lifecycle: normalizeLifecycle(live.lifecycle),
          changeScope: live.change_scope || {},
          impactAssessment: live.impact_assessment || {},
          implementationPlan: live.implementation_plan || {},
          trainingImpact: live.training_impact || {},
          relatedRecords: live.related_records || []
        };
      }
    }
  };
  function fetchLiveResource(resourceFamily, recordId){
    var def = HMV4_LIVE_RESOURCE_REGISTRY[resourceFamily];
    if(!def || !recordId) return Promise.reject(new Error('unsupported resource: ' + resourceFamily));
    return fetch(def.canonicalPath + '/' + encodeURIComponent(recordId), {
      credentials: 'include',
      redirect: 'manual',
      headers: { 'Accept': 'application/json' }
    }).then(function(res){
      if(!res.ok) throw new Error('live api status ' + res.status);
      return res.json();
    }).then(function(payload){
      return (payload && payload.data) ? payload.data : payload;
    });
  }
  function renderLiveResource(shell, route){
    var resourceFamily = route.params && route.params.resource_family;
    var recordId = route.params && route.params.record_id;
    var def = resourceFamily && HMV4_LIVE_RESOURCE_REGISTRY[resourceFamily];
    if(!def) return false;
    var content = shell.querySelector('[data-hm-slot="route-content"]');
    if(!content) return false;
    content.innerHTML = '<article class="hmv4-record-shell hmv4-record-shell--loading" data-hmv4-live-api-loading="true" data-hmv4-resource-family="' + esc(resourceFamily) + '" data-hmv4-record-id="' + esc(recordId) + '"><p>Loading from ' + esc(def.canonicalPath) + '/' + esc(recordId) + '...</p></article>';
    fetchLiveResource(resourceFamily, recordId)
      .then(function(live){
        var adapted = def.adapt(live);
        var fixturePayload = { records: {} };
        fixturePayload.records[recordId] = adapted;
        window[def.fixtureGlobal] = fixturePayload;
        content.innerHTML = window.Hmv4Renderers.renderRoute(route);
        var root = content.querySelector('[' + def.recordAttr + ']');
        if(root){
          root.setAttribute('data-hmv4-source', 'live-api');
          root.setAttribute('data-fixture-state', 'live');
        }
      })
      .catch(function(err){
        content.innerHTML = '<article class="hmv4-record-shell hmv4-record-shell--error" data-hmv4-live-api-error="true" data-hmv4-resource-family="' + esc(resourceFamily) + '" data-hmv4-record-id="' + esc(recordId) + '">' +
          '<header class="hmv4-record-identity"><h1 class="hmv4-record-title">' + esc(recordId) + ' &mdash; live API unavailable</h1></header>' +
          '<p class="hmv4-feedback" data-feedback-state="warning" role="status">Live API unavailable: ' +
          esc(err && err.message ? String(err.message) : 'unknown') + '. Refresh to retry, or remove ?hmv4-live-api=1.</p>' +
          '</article>';
      });
    return true;
  }
  function isPreview(){ return !!window.HMV4_PREVIEW_ENABLED || location.pathname.indexOf('/ops') === 0; }
  function ensureShell(){
    var shell = document.getElementById('hmv4-ops-shell');
    if(shell) return shell;
    if(!isPreview()) return null;
    var content = document.getElementById('content') || document.body;
    var mount = document.createElement('div');
    mount.id = 'hmv4-ops-shell';
    mount.className = 'hmv4-ops-shell';
    mount.setAttribute('data-hm-shell','ops');
    mount.setAttribute('data-hm-component','ops-shell');
    mount.innerHTML = ''+
      '<header class="hmv4-top-shell-header" data-hm-region="top_shell_header"><a class="hmv4-brand" href="/ops"><span class="hmv4-brand-mark">H</span><span class="hmv4-brand-text">HESEM Operations Platform</span></a><div class="hmv4-global-actions"><button class="hmv4-icon-button" type="button" aria-label="Close preview" data-hmv4-close-preview>×</button></div></header>'+
      '<aside class="hmv4-left-navigation-rail" data-hm-region="left_navigation_rail"><nav class="hmv4-nav" data-hm-component="left-nav"></nav></aside>'+
      '<main id="hmv4-content" class="hmv4-main" data-hm-region="content_canvas" tabindex="-1"><nav class="hmv4-breadcrumb-row" data-hm-region="breadcrumb_row" aria-label="Breadcrumb"></nav><header class="hmv4-page-header-zone" data-hm-region="page_header_zone"></header><section class="hmv4-page-command-bar" data-hm-region="page_command_bar" hidden></section><section class="hmv4-content-canvas" data-hm-slot="route-content"></section></main>'+
      '<aside class="hmv4-contextual-side-zone" data-hm-region="contextual_side_zone" hidden></aside><footer class="hmv4-bottom-status-sync-rail" data-hm-region="bottom_status_sync_rail" hidden aria-live="polite"></footer>';
    content.innerHTML = '';
    content.appendChild(mount);
    return mount;
  }
  function updateTabs(root){
    root.addEventListener('click', function(e){
      var tab = e.target.closest('[role="tab"][data-tab]');
      if(!tab) return;
      var tabs = tab.closest('[role="tablist"]');
      var shell = tab.closest('.hmv4-record-shell, .hmv4-workspace-shell') || root;
      if(tabs) tabs.querySelectorAll('[role="tab"]').forEach(function(t){ t.setAttribute('aria-selected', String(t === tab)); });
      shell.querySelectorAll('[role="tabpanel"]').forEach(function(p){ p.hidden = p.getAttribute('aria-labelledby') !== tab.id; });
      if(window.history && window.Hmv4Routes){
        var route = window.Hmv4Routes.parseLocation();
        route.query.tab = tab.getAttribute('data-tab');
        history.replaceState(history.state || {}, '', window.Hmv4Routes.buildUrl({routeClass:route.routeClass, params:route.params, query:route.query}));
      }
    });
    root.addEventListener('keydown', function(e){
      var tab = e.target.closest('[role="tab"]');
      if(!tab || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      var list = Array.prototype.slice.call(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
      var i = list.indexOf(tab), next = e.key === 'ArrowRight' ? (i+1)%list.length : (i-1+list.length)%list.length;
      list[next].focus(); e.preventDefault();
    });
  }
  function hydrate(){
    if(!isPreview()) return;
    if(!window.Hmv4Routes || !window.Hmv4Renderers) { console.warn('[HMV4] Missing route/render adapters'); return; }
    var shell = ensureShell(); if(!shell) return;
    var route = window.Hmv4Routes.parseLocation();
    shell.setAttribute('data-route-class', route.routeClass || 'UNKNOWN');
    if(window.Hmv4Renderers.renderNav) window.Hmv4Renderers.renderNav(shell.querySelector('[data-hm-component="left-nav"]'));
    window.Hmv4Renderers.applyShell(shell, route);
    if(route.routeClass === 'AR' && route.params && readLiveApiFlag()) renderLiveResource(shell, route);
    updateTabs(shell);
    var close = shell.querySelector('[data-hmv4-close-preview]');
    if(close) close.addEventListener('click', function(){ location.href = location.pathname.replace(/^\/ops\/?/, '/') || '/'; });
    if(route.rejectedQuery && route.rejectedQuery.length && window.history){ history.replaceState(history.state || {}, '', route.canonicalPath + (new URLSearchParams(route.query).toString() ? '?' + new URLSearchParams(route.query).toString() : '')); }
  }
  window.Hmv4LiveApi = {
    enabled: readLiveApiFlag,
    registry: HMV4_LIVE_RESOURCE_REGISTRY,
    fetchResource: fetchLiveResource,
    // Legacy aliases (ADR-0011 backwards compat)
    fetchNonconformance: function(recordId){ return fetchLiveResource('nonconformance-cases', recordId); },
    fetchWorkOrder: function(recordId){ return fetchLiveResource('work-orders', recordId); },
    fetchJobOrder: function(recordId){ return fetchLiveResource('job-orders', recordId); },
    fetchSalesOrder: function(recordId){ return fetchLiveResource('sales-orders', recordId); },
    fetchCustomerPurchaseOrder: function(recordId){ return fetchLiveResource('customer-purchase-orders', recordId); },
    adaptNcToFixtureShape: function(live){ return HMV4_LIVE_RESOURCE_REGISTRY['nonconformance-cases'].adapt(live); },
    adaptWoToFixtureShape: function(live){ return HMV4_LIVE_RESOURCE_REGISTRY['work-orders'].adapt(live); },
    adaptJoToFixtureShape: function(live){ return HMV4_LIVE_RESOURCE_REGISTRY['job-orders'].adapt(live); },
    adaptSoToFixtureShape: function(live){ return HMV4_LIVE_RESOURCE_REGISTRY['sales-orders'].adapt(live); },
    adaptCpoToFixtureShape: function(live){ return HMV4_LIVE_RESOURCE_REGISTRY['customer-purchase-orders'].adapt(live); }
  };
  window.HMModuleTemplateV4Hydration = { hydrate: hydrate, ensureShell: ensureShell };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrate); else hydrate();
})();
