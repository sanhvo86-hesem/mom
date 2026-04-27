/* DEV/TEST ONLY. Do not load in production portal.html. */
(function(){
  'use strict';
  window.Hmv4Fixtures = {
    routes: [
      '/ops',
      '/ops/quality-operations',
      '/ops/quality-operations/quality-tower',
      '/ops/records/quotations',
      '/ops/records/quotations/QUO-DEMO-001?tab=overview',
      '/ops/records/customer-purchase-orders/CPO-2026-077?tab=overview',
      '/ops/records/work-orders/WO-3013?tab=overview',
      '/ops/records/controlled-documents/CDOC-DEMO-001/drafts/DRAFT-1?tab=workflow',
      '/ops/planning-scheduling/dispatch-board/board?view=kanban',
      '/ops/quality-operations/metrology-release-trace/explorer/lots/LOT-DEMO-001'
    ],
    records: {
      quotation: { id:'QUO-DEMO-001', title:'Demo quotation', state:'draft' },
      dispatchTarget: { id:'DISP-DEMO-001', title:'Demo dispatch target', state:'ready' },
      customerPurchaseOrder: { id:'CPO-2026-077', title:'Customer PO from Acme Industrial', state:'acknowledged' },
      workOrder: { id:'WO-3013', title:'First-piece OP-30 on JO-2026-014', state:'executing' }
    }
  };
})();
