<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    // â”€â”€ Register RESTful Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    // Documents
    $router->get('/api/documents', DocumentController::class, 'listCustom');
    $router->post('/api/documents', DocumentController::class, 'create');
    $router->get('/api/documents/{code}/versions', DocumentController::class, 'listVersions');
    $router->get('/api/documents/stream', DocumentController::class, 'stream');
    $router->get('/api/documents/visibility', DocumentController::class, 'getVisibility');
    
    // Forms
    $router->get('/api/forms', FormController::class, 'list');
    $router->get('/api/forms/{code}/schema', FormController::class, 'getSchema');
    $router->post('/api/forms/{code}/entries', FormController::class, 'submit');
    $router->get('/api/forms/{code}/entries', FormController::class, 'getEntries');
    
    // Records
    $router->get('/api/records/registry', FormController::class, 'getIdRegistry');
    $router->post('/api/records/next-id', FormController::class, 'getNextId');
    
    // Users
    $router->get('/api/users', UserController::class, 'list');
    $router->post('/api/users', UserController::class, 'upsert');
    
    // Auth
    $router->get('/api/auth/status', AuthController::class, 'status');
    $router->post('/api/auth/login', AuthController::class, 'login');
    $router->post('/api/auth/mfa', AuthController::class, 'mfaVerify');
    $router->post('/api/auth/enroll', AuthController::class, 'enrollVerify');
    $router->post('/api/auth/logout', AuthController::class, 'logout');
    
    // Dictionary
    $router->get('/api/dictionary', DictController::class, 'list');
    $router->post('/api/dictionary', DictController::class, 'upsert');
    $router->delete('/api/dictionary', DictController::class, 'delete');
    
    // Meta / API catalog
    $router->get('/api/meta/catalog', ModuleSchemaController::class, 'apiCatalog');
    
    // System contract registry for frontend/AI tooling
    $router->get('/api/system/contracts', RegistryController::class, 'getSystemContract');
    $router->get('/api/registry/table-registry', RegistryController::class, 'getTableRegistry');
    $router->get('/api/registry/endpoint-catalog', RegistryController::class, 'getEndpointCatalog');
    $router->get('/api/registry/workflow-library', RegistryController::class, 'getWorkflowLibrary');
    $router->get('/api/registry/status-options', RegistryController::class, 'getStatusOptions');
    $router->get('/api/registry/relation-map', RegistryController::class, 'getRelationMap');
    $router->get('/api/registry/compliance-crosswalk', RegistryController::class, 'getComplianceCrosswalk');
    $router->get('/api/registry/global-capability-audit', RegistryController::class, 'getGlobalCapabilityAudit');
    $router->get('/api/registry/manifest', RegistryController::class, 'getRegistryManifest');
    
    // ─────────────────────────────────────────────────────────────────────
    // RBAC + Governance custom endpoints (cross-table joins, SoD pre-check,
    // view-backed read ports). Live alongside generic CRUD so the admin
    // governance UI can avoid stitching multiple table-runtime calls.
    // ─────────────────────────────────────────────────────────────────────
    $router->get ('/api/v1/rbac/effective-permissions/{userId}', RbacController::class, 'effectivePermissions');
    $router->get ('/api/v1/rbac/sod-violations',                 RbacController::class, 'sodViolations');
    $router->post('/api/v1/rbac/role-assignments',               RbacController::class, 'assignRole');
    $router->delete('/api/v1/rbac/role-assignments',             RbacController::class, 'revokeRole');

    $router->get ('/api/v1/mfa/factors',                         RbacController::class, 'listFactors');
    $router->post('/api/v1/mfa/factors/{factorId}:revoke',       RbacController::class, 'revokeFactor');
    $router->post('/api/v1/mfa/factors:reset',                   RbacController::class, 'resetFactors');

    $router->get ('/api/v1/documents/in-force',                  RbacController::class, 'documentsInForce');
    $router->get ('/api/v1/documents/pending-acknowledgement',   RbacController::class, 'pendingAcknowledgement');

    $router->get ('/api/v1/portal-display/effective-layout',     RbacController::class, 'effectiveLayout');

    $router->get ('/api/v1/retention/due-for-disposal',          RbacController::class, 'retentionDueForDisposal');
    $router->get ('/api/v1/access-review/progress',              RbacController::class, 'accessReviewProgress');

    // Generic runtime entity access — registered under /api/v1/runtime so the nginx
    // ^/api/v1/ location block routes the request to mom/api/index.php. Plain
    // /api/runtime/* never reached PHP and would 404 at the edge.
    $router->get('/api/v1/runtime/{domain}/{table}', GenericCrudController::class, 'listRecords');
    $router->get('/api/v1/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'getDetail');
    $router->post('/api/v1/runtime/{domain}/{table}', GenericCrudController::class, 'createRecord');
    $router->put('/api/v1/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'updateRecord');
    $router->delete('/api/v1/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'deleteRecord');
    $router->post('/api/v1/runtime/{domain}/{table}/{id}/transition', GenericCrudController::class, 'transitionRecord');
    
    // ── Foundation Governance Contract Slice: Public REST Routes ────────────────
    
    // Foundation read-through
    $router->get('/api/v1/foundation/organizations', MasterDataController::class, 'listFoundationOrganizations');
    $router->get('/api/v1/foundation/parties', MasterDataController::class, 'listFoundationParties');
    $router->get('/api/v1/foundation/calendars', MasterDataController::class, 'listFoundationCalendars');
    
    // Governance approval-group
    $router->get('/api/v1/governance/approval-groups', ApprovalGroupController::class, 'listApprovalGroups');
    $router->get('/api/v1/governance/approval-groups/{approvalGroupId}', ApprovalGroupController::class, 'getApprovalGroup');
    $router->post('/api/v1/governance/approval-groups/{approvalGroupId}:decide', ApprovalGroupController::class, 'decideApprovalGroup');
    $router->get('/api/v1/governance/approval-groups/{approvalGroupId}/timeline', ApprovalGroupController::class, 'listApprovalGroupTimeline');
    $router->get('/api/v1/governance/approval-groups/{approvalGroupId}/attachments', EvidenceController::class, 'listApprovalGroupAttachments');
    
    // Governance attachments
    $router->get('/api/v1/governance/attachments/{attachmentId}', EvidenceController::class, 'getGovernanceAttachment');
    $router->post('/api/v1/governance/attachments', EvidenceController::class, 'createGovernanceAttachment');
    
    // Governance override controls
    $router->get('/api/v1/governance/override-controls', OperationalOverrideController::class, 'listOverrides');
    $router->get('/api/v1/governance/override-controls/{overrideId}', OperationalOverrideController::class, 'getOverride');
    $router->post('/api/v1/governance/override-controls', OperationalOverrideController::class, 'createOverride');
    $router->post('/api/v1/governance/override-controls/{overrideId}:transition', OperationalOverrideController::class, 'transitionOverride');
    
    // Finance control objects
    $router->get('/api/v1/finance/period-closes', FinanceController::class, 'listPeriodCloses');
    $router->get('/api/v1/finance/period-closes/{periodCloseId}', FinanceController::class, 'getPeriodClose');
    $router->post('/api/v1/finance/period-closes', FinanceController::class, 'createPeriodClose');
    $router->post('/api/v1/finance/period-closes/{periodCloseId}:transition', FinanceController::class, 'transitionPeriodClose');
    $router->get('/api/v1/finance/backdate-exceptions', FinanceController::class, 'listBackdateExceptions');
    $router->get('/api/v1/finance/backdate-exceptions/{backdateExceptionId}', FinanceController::class, 'getBackdateException');
    $router->post('/api/v1/finance/backdate-exceptions', FinanceController::class, 'createBackdateException');
    $router->post('/api/v1/finance/backdate-exceptions/{backdateExceptionId}:transition', FinanceController::class, 'transitionBackdateException');
    $router->get('/api/v1/finance/credit-memos', FinanceController::class, 'listCreditMemos');
    $router->get('/api/v1/finance/credit-memos/{creditMemoId}', FinanceController::class, 'getCreditMemo');
    $router->post('/api/v1/finance/credit-memos', FinanceController::class, 'createCreditMemo');
    $router->get('/api/v1/finance/debit-memos', FinanceController::class, 'listDebitMemos');
    $router->get('/api/v1/finance/debit-memos/{debitMemoId}', FinanceController::class, 'getDebitMemo');
    $router->post('/api/v1/finance/debit-memos', FinanceController::class, 'createDebitMemo');
    
    // Commercial customer purchase-order objects (legacy /commercial/ namespace — kept live, emits 301 to canonical)
    $router->get('/api/v1/commercial/customer-purchase-orders', CustomerPurchaseOrderController::class, 'redirectLegacyListCustomerPurchaseOrders');
    $router->get('/api/v1/commercial/customer-purchase-orders/{customerPoId}', CustomerPurchaseOrderController::class, 'redirectLegacyGetCustomerPurchaseOrder');
    $router->post('/api/v1/commercial/customer-purchase-orders', CustomerPurchaseOrderController::class, 'redirectLegacyCreateCustomerPurchaseOrder');
    $router->post('/api/v1/commercial/customer-purchase-orders/{customerPoId}:transition', CustomerPurchaseOrderController::class, 'redirectLegacyTransitionCustomerPurchaseOrder');

    // ─────────────────────────────────────────────────────────────────────────
    // CPO canonical path (ADR-0008, Stream C.3, 2026-04-26)
    // /api/v1/customer-purchase-orders — no /commercial/ prefix.
    // Legacy /api/v1/commercial/customer-purchase-orders emits 301 to here.
    // ─────────────────────────────────────────────────────────────────────────
    $router->get('/api/v1/customer-purchase-orders', CustomerPurchaseOrderController::class, 'listPurchaseOrders');
    $router->post('/api/v1/customer-purchase-orders', CustomerPurchaseOrderController::class, 'createPurchaseOrder');
    $router->get('/api/v1/customer-purchase-orders/{customerPoId}', CustomerPurchaseOrderController::class, 'getPurchaseOrder');
    $router->post('/api/v1/customer-purchase-orders/{customerPoId}:transition', CustomerPurchaseOrderController::class, 'transitionPurchaseOrder');
    
    // Folders
    $router->get('/api/folders', FileController::class, 'scanFolders');
    $router->post('/api/folders', FileController::class, 'createFolder');
    
    // Admin
    $router->post('/api/admin/git/sync', AdminController::class, 'gitSync');
    $router->post('/api/admin/git/pull', AdminController::class, 'gitPull');
    $router->post('/api/admin/cache/clear', AdminController::class, 'clearCache');
    
    // Documents â€” snapshot
    $router->post('/api/documents/snapshot', DocumentController::class, 'docsSnapshot');
    
    // Forms â€” draft upload
    $router->post('/api/forms/upload-draft', FormController::class, 'uploadDraft');
    $router->post('/api/forms/drafts', FormController::class, 'saveDraft');
    $router->get('/api/forms/drafts', FormController::class, 'listDrafts');
    $router->get('/api/forms/{code}/draft', FormController::class, 'getDraft');
    
    // Dashboards
    $router->get('/api/dashboard/executive', DashboardController::class, 'executive');
    $router->get('/api/dashboard/quality', DashboardController::class, 'quality');
    $router->get('/api/dashboard/production', DashboardController::class, 'production');
    $router->get('/api/dashboard/supplier', DashboardController::class, 'supplier');
    $router->get('/api/dashboard/department', DashboardController::class, 'department');
    $router->get('/api/dashboard/widget', DashboardController::class, 'widget');
    
    // VPS Control Tower
    $router->get('/api/vps/overview', VpsController::class, 'overview');
    $router->get('/api/vps/host', VpsController::class, 'host');
    $router->post('/api/vps/action', VpsController::class, 'runAction');
    $router->get('/api/vps/files', VpsController::class, 'fileList');
    $router->get('/api/vps/files/search', VpsController::class, 'fileSearch');
    $router->get('/api/vps/files/read', VpsController::class, 'fileRead');
    $router->post('/api/vps/files/mutate', VpsController::class, 'fileMutate');
    $router->post('/api/vps/files/upload', VpsController::class, 'fileUpload');
    $router->get('/api/vps/terminal/auth', VpsController::class, 'terminalAuth');
    $router->get('/api/vps/observability/auth', VpsController::class, 'observabilityAuth');
    
    // KPI
    $router->get('/api/kpi/alerts', DashboardController::class, 'kpiAlerts');
    $router->get('/api/kpi/catalog', DashboardController::class, 'kpiCatalog');
    $router->get('/api/kpi/{metricCode}', DashboardController::class, 'kpiGet');
    $router->get('/api/kpi/{metricCode}/trend', DashboardController::class, 'kpiTrend');
    
    // SPC
    $router->post('/api/spc/capability', DashboardController::class, 'spcCapability');
    $router->post('/api/spc/chart', DashboardController::class, 'spcChart');
    $router->get('/api/spc/alerts', DashboardController::class, 'spcAlerts');
    $router->get('/api/spc/summary', DashboardController::class, 'spcSummary');
    
    // Transactional plural-form REST routes (ADR-0008, Stream C.2, 2026-04-25)
    // SO / JO / WO canonical paths delegate to existing OrderController behavior.
    $router->get('/api/v1/sales-orders', OrderController::class, 'listSalesOrders');
    $router->post('/api/v1/sales-orders', OrderController::class, 'createSalesOrder');
    $router->get('/api/v1/sales-orders/{soNumber}', OrderController::class, 'getSalesOrderDetailForPath');
    $router->patch('/api/v1/sales-orders/{soNumber}', OrderController::class, 'updateSalesOrderForPath');
    $router->post('/api/v1/sales-orders/{soNumber}:transition', OrderController::class, 'transitionSalesOrder');

    $router->get('/api/v1/job-orders', OrderController::class, 'listJobOrders');
    $router->post('/api/v1/job-orders', OrderController::class, 'createJobOrder');
    $router->get('/api/v1/job-orders/{joNumber}', OrderController::class, 'getJobOrderDetailForPath');
    $router->patch('/api/v1/job-orders/{joNumber}', OrderController::class, 'updateJobOrderForPath');
    $router->post('/api/v1/job-orders/{joNumber}:transition', OrderController::class, 'transitionJobOrder');

    $router->get('/api/v1/work-orders', OrderController::class, 'listWorkOrders');
    $router->post('/api/v1/work-orders', OrderController::class, 'createWorkOrder');
    $router->get('/api/v1/work-orders/{woNumber}', OrderController::class, 'getWorkOrderDetail');
    $router->patch('/api/v1/work-orders/{woNumber}', OrderController::class, 'updateWorkOrderForPath');
    $router->post('/api/v1/work-orders/{woNumber}:transition', OrderController::class, 'transitionWorkOrder');

    // Legacy /api/orders/{sales,jobs,work} paths redirect to canonical ADR-0008 paths.
    $router->get('/api/orders/sales', OrderController::class, 'redirectLegacySalesOrders');
    $router->post('/api/orders/sales', OrderController::class, 'redirectLegacySalesOrders');
    $router->get('/api/orders/sales/{soNumber}', OrderController::class, 'redirectLegacySalesOrderDetail');
    $router->put('/api/orders/sales/{soNumber}', OrderController::class, 'redirectLegacySalesOrderDetail');
    $router->get('/api/orders/jobs', OrderController::class, 'redirectLegacyJobOrders');
    $router->post('/api/orders/jobs', OrderController::class, 'redirectLegacyJobOrders');
    $router->get('/api/orders/jobs/{joNumber}', OrderController::class, 'redirectLegacyJobOrderDetail');
    $router->put('/api/orders/jobs/{joNumber}', OrderController::class, 'redirectLegacyJobOrderDetail');
    $router->get('/api/orders/work', OrderController::class, 'redirectLegacyWorkOrders');
    $router->post('/api/orders/work', OrderController::class, 'redirectLegacyWorkOrders');
    $router->get('/api/orders/work/{woNumber}', OrderController::class, 'redirectLegacyWorkOrderDetail');
    $router->put('/api/orders/work/{woNumber}', OrderController::class, 'redirectLegacyWorkOrderDetail');
    $router->post('/api/orders/transition', OrderController::class, 'transition');
    $router->get('/api/orders/hierarchy', OrderController::class, 'getHierarchy');
    $router->get('/api/orders/timeline', OrderController::class, 'getTimeline');
    $router->get('/api/orders/dashboard', OrderController::class, 'getDashboardKpi');
    $router->get('/api/orders/search', OrderController::class, 'search');
    
    // Exceptions
    $router->get('/api/exceptions/dashboard', ExceptionController::class, 'dashboard');
    $router->get('/api/exceptions', ExceptionController::class, 'listAll');
    $router->get('/api/exceptions/{id}', ExceptionController::class, 'detail');
    $router->post('/api/exceptions/complaints', ExceptionController::class, 'createComplaint');
    $router->post('/api/exceptions/mrb', ExceptionController::class, 'createMrb');
    $router->post('/api/exceptions/deviations', ExceptionController::class, 'createDeviation');
    $router->post('/api/exceptions/concessions', ExceptionController::class, 'createConcession');
    $router->get('/api/exceptions/copq', ExceptionController::class, 'copqSummary');
    $router->get('/api/exceptions/trends', ExceptionController::class, 'trends');
    
    // Supplier Quality
    $router->get('/api/suppliers/dashboard', SupplierController::class, 'dashboard');
    $router->get('/api/suppliers/scorecards', SupplierController::class, 'listScorecards');
    $router->get('/api/suppliers/incoming', SupplierController::class, 'listIncoming');
    $router->post('/api/suppliers/incoming', SupplierController::class, 'createIncoming');
    $router->get('/api/suppliers/asl', SupplierController::class, 'listAsl');
    $router->get('/api/suppliers/scar', SupplierController::class, 'listScar');
    $router->post('/api/suppliers/scar', SupplierController::class, 'createScar');
    
    // Quotes
    $router->get('/api/quotes', QuoteController::class, 'listQuotes');
    $router->post('/api/quotes', QuoteController::class, 'create');
    $router->get('/api/quotes/{id}', QuoteController::class, 'detail');
    $router->put('/api/quotes/{id}', QuoteController::class, 'update');
    $router->post('/api/quotes/{id}/convert', QuoteController::class, 'convertToSo');
    
    // Evidence
    $router->get('/api/evidence', EvidenceController::class, 'listEvidence');
    $router->post('/api/evidence', EvidenceController::class, 'upload');
    $router->get('/api/evidence/{id}', EvidenceController::class, 'detail');
    $router->post('/api/evidence/{id}/link', EvidenceController::class, 'link');
    $router->get('/api/evidence/{id}/custody', EvidenceController::class, 'chainOfCustody');
    $router->get('/api/evidence/verify', EvidenceController::class, 'verifyChain');
    $router->get('/api/evidence/search', EvidenceController::class, 'search');

    // EQMS plural-form REST aliases (ADR-0008, 2026-04-25)
    // Frontend HMV4 Step 3 vocabulary uses these canonical paths.
    // Existing /api/v1/eqms/<singular> paths remain live.

    // NQCASE -> /api/v1/nonconformance-cases
    $router->get('/api/v1/nonconformance-cases', EqmsNcrController::class, 'query');
    $router->post('/api/v1/nonconformance-cases', EqmsNcrController::class, 'create');
    $router->post('/api/v1/nonconformance-cases/{id}:contain', EqmsNcrController::class, 'actionContain');
    $router->post('/api/v1/nonconformance-cases/{id}:investigate', EqmsNcrController::class, 'actionInvestigate');
    $router->post('/api/v1/nonconformance-cases/{id}:close', EqmsNcrController::class, 'actionClose');
    $router->post('/api/v1/nonconformance-cases/{id}:reopen', EqmsNcrController::class, 'actionReopen');
    $router->get('/api/v1/nonconformance-cases/{id}', EqmsNcrController::class, 'detail');
    $router->patch('/api/v1/nonconformance-cases/{id}', EqmsNcrController::class, 'update');
    $router->get('/api/v1/nonconformance-cases/{id}/audit', EqmsNcrController::class, 'audit');
    $router->get('/api/v1/nonconformance-cases/{id}/comments', EqmsNcrController::class, 'comments');
    $router->post('/api/v1/nonconformance-cases/{id}/comments', EqmsNcrController::class, 'comments');
    $router->get('/api/v1/nonconformance-cases/{id}/attachments', EqmsNcrController::class, 'attachments');
    $router->post('/api/v1/nonconformance-cases/{id}/attachments', EqmsNcrController::class, 'attachments');

    // CAPA -> /api/v1/capas
    $router->get('/api/v1/capas', EqmsCapaController::class, 'query');
    $router->post('/api/v1/capas', EqmsCapaController::class, 'create');
    $router->post('/api/v1/capas/{id}:start-analysis', EqmsCapaController::class, 'actionStartAnalysis');
    $router->post('/api/v1/capas/{id}:close', EqmsCapaController::class, 'actionClose');
    $router->post('/api/v1/capas/{id}:cancel', EqmsCapaController::class, 'actionCancel');
    $router->get('/api/v1/capas/{id}', EqmsCapaController::class, 'detail');
    $router->patch('/api/v1/capas/{id}', EqmsCapaController::class, 'update');
    $router->get('/api/v1/capas/{id}/audit', EqmsCapaController::class, 'audit');
    $router->get('/api/v1/capas/{id}/comments', EqmsCapaController::class, 'comments');
    $router->post('/api/v1/capas/{id}/comments', EqmsCapaController::class, 'comments');
    $router->get('/api/v1/capas/{id}/attachments', EqmsCapaController::class, 'attachments');
    $router->post('/api/v1/capas/{id}/attachments', EqmsCapaController::class, 'attachments');

    // CDOC -> /api/v1/controlled-documents
    $router->get('/api/v1/controlled-documents', EqmsDocumentsController::class, 'query');
    $router->post('/api/v1/controlled-documents', EqmsDocumentsController::class, 'create');
    $router->post('/api/v1/controlled-documents/{id}:approve', EqmsDocumentsController::class, 'actionApprove');
    $router->post('/api/v1/controlled-documents/{id}:release', EqmsDocumentsController::class, 'actionRelease');
    $router->get('/api/v1/controlled-documents/{id}', EqmsDocumentsController::class, 'detail');
    $router->patch('/api/v1/controlled-documents/{id}', EqmsDocumentsController::class, 'update');
    $router->get('/api/v1/controlled-documents/{id}/audit', EqmsDocumentsController::class, 'audit');
    $router->get('/api/v1/controlled-documents/{id}/comments', EqmsDocumentsController::class, 'comments');
    $router->post('/api/v1/controlled-documents/{id}/comments', EqmsDocumentsController::class, 'comments');
    $router->get('/api/v1/controlled-documents/{id}/attachments', EqmsDocumentsController::class, 'attachments');
    $router->post('/api/v1/controlled-documents/{id}/attachments', EqmsDocumentsController::class, 'attachments');

    // INSP -> /api/v1/inspections
    $router->get('/api/v1/inspections', EqmsInspectionController::class, 'query');
    $router->post('/api/v1/inspections/{id}:flag-nonconformance', EqmsInspectionController::class, 'inprocessActionFlagNc');

    // BREL -> /api/v1/batch-releases
    $router->get('/api/v1/batch-releases', EqmsBatchReleaseController::class, 'query');
    $router->post('/api/v1/batch-releases/{id}:approve-release', EqmsBatchReleaseController::class, 'actionApproveRelease');
    $router->post('/api/v1/batch-releases/{id}:market-ship', EqmsBatchReleaseController::class, 'actionMarketShip');
    $router->get('/api/v1/batch-releases/{id}', EqmsBatchReleaseController::class, 'detail');

    // ECO -> /api/v1/engineering-changes
    $router->get('/api/v1/engineering-changes', EqmsEngineeringChangeController::class, 'query');
    $router->post('/api/v1/engineering-changes', EqmsEngineeringChangeController::class, 'create');
    $router->get('/api/v1/engineering-changes/{id}', EqmsEngineeringChangeController::class, 'detail');
    $router->patch('/api/v1/engineering-changes/{id}', EqmsEngineeringChangeController::class, 'update');
    $router->get('/api/v1/engineering-changes/{id}/audit', EqmsEngineeringChangeController::class, 'audit');

    // TRAIN -> /api/v1/training-records
    $router->get('/api/v1/training-records', EqmsTrainingController::class, 'query');
    $router->post('/api/v1/training-records', EqmsTrainingController::class, 'create');
    $router->get('/api/v1/training-records/matrix', EqmsTrainingController::class, 'matrix');
    $router->get('/api/v1/training-records/curricula', EqmsTrainingController::class, 'curricula');
    $router->get('/api/v1/training-records/{id}', EqmsTrainingController::class, 'detail');
    $router->patch('/api/v1/training-records/{id}', EqmsTrainingController::class, 'update');
    $router->get('/api/v1/training-records/{id}/audit', EqmsTrainingController::class, 'audit');
};
