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
      '/ops/records/controlled-documents/CDOC-DEMO-001/drafts/DRAFT-1?tab=workflow',
      '/ops/planning-scheduling/dispatch-board/board?view=kanban',
      '/ops/quality-operations/metrology-release-trace/explorer/lots/LOT-DEMO-001'
    ],
    records: {
      quotation: { id:'QUO-DEMO-001', title:'Demo quotation', state:'draft' },
      dispatchTarget: { id:'DISP-DEMO-001', title:'Demo dispatch target', state:'ready' }
    }
  };
})();
