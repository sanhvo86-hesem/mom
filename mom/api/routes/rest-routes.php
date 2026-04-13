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
    
    // Generic runtime entity access
    $router->get('/api/runtime/{domain}/{table}', GenericCrudController::class, 'listRecords');
    $router->get('/api/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'getDetail');
    $router->post('/api/runtime/{domain}/{table}', GenericCrudController::class, 'createRecord');
    $router->put('/api/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'updateRecord');
    $router->delete('/api/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'deleteRecord');
    $router->post('/api/runtime/{domain}/{table}/{id}/transition', GenericCrudController::class, 'transitionRecord');
    
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
    
    // Commercial customer purchase-order objects
    $router->get('/api/v1/commercial/customer-purchase-orders', CustomerPurchaseOrderController::class, 'listPurchaseOrders');
    $router->get('/api/v1/commercial/customer-purchase-orders/{customerPoId}', CustomerPurchaseOrderController::class, 'getPurchaseOrder');
    $router->post('/api/v1/commercial/customer-purchase-orders', CustomerPurchaseOrderController::class, 'createPurchaseOrder');
    $router->post('/api/v1/commercial/customer-purchase-orders/{customerPoId}:transition', CustomerPurchaseOrderController::class, 'transitionPurchaseOrder');
    
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
    $router->get('/api/kpi/{metricCode}', DashboardController::class, 'kpiGet');
    $router->get('/api/kpi/{metricCode}/trend', DashboardController::class, 'kpiTrend');
    
    // SPC
    $router->post('/api/spc/capability', DashboardController::class, 'spcCapability');
    $router->post('/api/spc/chart', DashboardController::class, 'spcChart');
    $router->get('/api/spc/alerts', DashboardController::class, 'spcAlerts');
    $router->get('/api/spc/summary', DashboardController::class, 'spcSummary');
    
    // Orders
    $router->get('/api/orders/sales', OrderController::class, 'listSalesOrders');
    $router->post('/api/orders/sales', OrderController::class, 'createSalesOrder');
    $router->get('/api/orders/sales/{soNumber}', OrderController::class, 'getSalesOrderDetail');
    $router->put('/api/orders/sales/{soNumber}', OrderController::class, 'updateSalesOrder');
    $router->get('/api/orders/jobs', OrderController::class, 'listJobOrders');
    $router->post('/api/orders/jobs', OrderController::class, 'createJobOrder');
    $router->get('/api/orders/jobs/{joNumber}', OrderController::class, 'getJobOrderDetail');
    $router->put('/api/orders/jobs/{joNumber}', OrderController::class, 'updateJobOrder');
    $router->post('/api/orders/work', OrderController::class, 'createWorkOrder');
    $router->put('/api/orders/work/{woNumber}', OrderController::class, 'updateWorkOrder');
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
};
