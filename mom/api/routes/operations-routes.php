<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    // Orders (SO/JO/WO)
    $router->actions([
        'order_so_list'           => [OrderController::class, 'listSalesOrders'],
        'order_so_detail'         => [OrderController::class, 'getSalesOrderDetail'],
        'order_so_create'         => [OrderController::class, 'createSalesOrder'],
        'order_so_update'         => [OrderController::class, 'updateSalesOrder'],
        'order_jo_list'           => [OrderController::class, 'listJobOrders'],
        'order_jo_detail'         => [OrderController::class, 'getJobOrderDetail'],
        'order_jo_create'         => [OrderController::class, 'createJobOrder'],
        'order_jo_update'         => [OrderController::class, 'updateJobOrder'],
        'order_wo_create'         => [OrderController::class, 'createWorkOrder'],
        'order_wo_update'         => [OrderController::class, 'updateWorkOrder'],
        'order_transition'        => [OrderController::class, 'transition'],
        'order_contract_review'   => [OrderController::class, 'contractReview'],
        'order_hold_set'          => [OrderController::class, 'setHold'],
        'order_hold_release'      => [OrderController::class, 'releaseHold'],
        'order_note_add'          => [OrderController::class, 'addNote'],
        'order_hierarchy'         => [OrderController::class, 'getHierarchy'],
        'order_timeline'          => [OrderController::class, 'getTimeline'],
        'order_dashboard_stats'   => [OrderController::class, 'getDashboardStats'],
        'order_dashboard_kpi'     => [OrderController::class, 'getDashboardKpi'],
        'order_search'            => [OrderController::class, 'search'],
        'order_link_form'         => [OrderController::class, 'linkForm'],
        'order_shipment_gate'     => [OrderController::class, 'checkShipmentReadiness'],
        'order_shipment_gate_override' => [OrderController::class, 'overrideShipmentGate'],
        'order_shipment_gate_overrides' => [OrderController::class, 'listShipmentGateOverrides'],
        'order_schedule_get'      => [AiSchedulingController::class, 'getSchedule'],
        'order_schedule_slot'     => [AiSchedulingController::class, 'createSlot'],
        'order_schedule_update'   => [AiSchedulingController::class, 'updateSlot'],
        'order_capacity_heatmap'  => [AiSchedulingController::class, 'getCapacityHeatmap'],
        'order_promise_suggest'   => [AiSchedulingController::class, 'suggestPromiseDate'],
    ]);
    
    // Exception Management
    // @deprecated — Shimmed to LegacyQualityShimController → EQMS v4.0 data surface.
    // Read ops return live data from eqms_ncr_records/eqms_capa_records + deprecated:true.
    // Write ops return HTTP 410 Gone with new_endpoint pointer.
    // Remove this block after all callers migrate to /api/v1/eqms/ncr/*, /api/v1/eqms/capa/*.
    $router->actions([
        'exception_dashboard'         => [LegacyQualityShimController::class, 'exceptionDashboard'],
        'exception_list'              => [LegacyQualityShimController::class, 'exceptionList'],
        'exception_detail'            => [LegacyQualityShimController::class, 'exceptionDetail'],
        'exception_complaint_create'  => [LegacyQualityShimController::class, 'exceptionComplaintCreate'],
        'exception_complaint_update'  => [LegacyQualityShimController::class, 'exceptionComplaintUpdate'],
        'exception_mrb_create'        => [LegacyQualityShimController::class, 'exceptionMrbCreate'],
        'exception_mrb_update'        => [LegacyQualityShimController::class, 'exceptionMrbUpdate'],
        'exception_deviation_create'  => [LegacyQualityShimController::class, 'exceptionDeviationCreate'],
        'exception_deviation_update'  => [LegacyQualityShimController::class, 'exceptionDeviationUpdate'],
        'exception_concession_create' => [LegacyQualityShimController::class, 'exceptionConcessionCreate'],
        'exception_concession_update' => [LegacyQualityShimController::class, 'exceptionConcessionUpdate'],
        'exception_transition'        => [LegacyQualityShimController::class, 'exceptionTransition'],
        'exception_copq_summary'      => [LegacyQualityShimController::class, 'exceptionCopqSummary'],
        'exception_trends'            => [LegacyQualityShimController::class, 'exceptionTrends'],
        'exception_escalate'          => [LegacyQualityShimController::class, 'exceptionEscalate'],
    ]);
    
    // Finance control objects
    $router->actions([
        'finance_period_close_list' => [FinanceController::class, 'listPeriodCloses'],
        'finance_period_close_create' => [FinanceController::class, 'createPeriodClose'],
        'finance_period_close_transition' => [FinanceController::class, 'transitionPeriodClose'],
        'finance_backdate_exception_list' => [FinanceController::class, 'listBackdateExceptions'],
        'finance_backdate_exception_create' => [FinanceController::class, 'createBackdateException'],
        'finance_backdate_exception_transition' => [FinanceController::class, 'transitionBackdateException'],
        'finance_credit_memo_list' => [FinanceController::class, 'listCreditMemos'],
        'finance_credit_memo_create' => [FinanceController::class, 'createCreditMemo'],
        'finance_debit_memo_list' => [FinanceController::class, 'listDebitMemos'],
        'finance_debit_memo_create' => [FinanceController::class, 'createDebitMemo'],
    ]);
    
    // Commercial customer purchase-order controls
    $router->actions([
        'customer_purchase_order_list' => [CustomerPurchaseOrderController::class, 'listPurchaseOrders'],
        'customer_purchase_order_detail' => [CustomerPurchaseOrderController::class, 'getPurchaseOrder'],
        'customer_purchase_order_create' => [CustomerPurchaseOrderController::class, 'createPurchaseOrder'],
        'customer_purchase_order_transition' => [CustomerPurchaseOrderController::class, 'transitionPurchaseOrder'],
    ]);
    
    // Supplier Quality Management
    // @deprecated — Shimmed to LegacyQualityShimController → EQMS v4.0 supplier surface.
    // Read ops return live data from eqms_supplier_profiles/eqms_supplier_audits + deprecated:true.
    // Write ops return HTTP 410 Gone with new_endpoint pointer.
    // Remove this block after all callers migrate to /api/v1/eqms/suppliers/*, /api/v1/eqms/supplier-audits/*.
    $router->actions([
        'supplier_dashboard'        => [LegacyQualityShimController::class, 'supplierDashboard'],
        'supplier_scorecard_list'   => [LegacyQualityShimController::class, 'supplierScorecardList'],
        'supplier_scorecard_detail' => [LegacyQualityShimController::class, 'supplierScorecardDetail'],
        'supplier_scorecard_calc'   => [LegacyQualityShimController::class, 'supplierScorecardCalc'],
        'supplier_incoming_list'    => [LegacyQualityShimController::class, 'supplierIncomingList'],
        'supplier_incoming_create'  => [LegacyQualityShimController::class, 'supplierIncomingCreate'],
        'supplier_incoming_update'  => [LegacyQualityShimController::class, 'supplierIncomingUpdate'],
        'supplier_skip_lot_status'  => [LegacyQualityShimController::class, 'supplierSkipLotStatus'],
        'supplier_skip_lot_update'  => [LegacyQualityShimController::class, 'supplierSkipLotUpdate'],
        'supplier_asl_list'         => [LegacyQualityShimController::class, 'supplierAslList'],
        'supplier_asl_upsert'       => [LegacyQualityShimController::class, 'supplierAslUpsert'],
        'supplier_scar_list'        => [LegacyQualityShimController::class, 'supplierScarList'],
        'supplier_scar_create'      => [LegacyQualityShimController::class, 'supplierScarCreate'],
        'supplier_scar_update'      => [LegacyQualityShimController::class, 'supplierScarUpdate'],
        'supplier_scar_transition'  => [LegacyQualityShimController::class, 'supplierScarTransition'],
        'supplier_audit_list'       => [LegacyQualityShimController::class, 'supplierAuditList'],
        'supplier_audit_upsert'     => [LegacyQualityShimController::class, 'supplierAuditUpsert'],
    ]);
    
    // Quoting & Estimation
    $router->actions([
        'quote_list'              => [QuoteController::class, 'listQuotes'],
        'quote_detail'            => [QuoteController::class, 'detail'],
        'quote_create'            => [QuoteController::class, 'create'],
        'quote_update'            => [QuoteController::class, 'update'],
        'quote_transition'        => [QuoteController::class, 'transition'],
        'quote_convert_to_so'     => [QuoteController::class, 'convertToSo'],
        'quote_estimate_cycle'    => [QuoteController::class, 'estimateCycleTime'],
        'quote_estimate_material' => [QuoteController::class, 'estimateMaterial'],
        'quote_dashboard'         => [QuoteController::class, 'dashboard'],
    ]);
    
    // Evidence Vault
    $router->actions([
        'evidence_list'           => [EvidenceController::class, 'listEvidence'],
        'evidence_detail'         => [EvidenceController::class, 'detail'],
        'evidence_upload'         => [EvidenceController::class, 'upload'],
        'evidence_link'           => [EvidenceController::class, 'link'],
        'evidence_chain_custody'  => [EvidenceController::class, 'chainOfCustody'],
        'evidence_verify_chain'   => [EvidenceController::class, 'verifyChain'],
        'evidence_search'         => [EvidenceController::class, 'search'],
    ]);
    
    // FMEA & Control Plan
    // @deprecated — Shimmed to LegacyQualityShimController → EQMS v4.0 risks/fmea surface.
    // Read ops return live data from fmea_records/failure_modes + deprecated:true.
    // Write ops return HTTP 410 Gone with new_endpoint pointer.
    // Remove this block after all callers migrate to /api/v1/eqms/risks/fmea/*.
    $router->actions([
        'fmea_list'               => [LegacyQualityShimController::class, 'fmeaList'],
        'fmea_detail'             => [LegacyQualityShimController::class, 'fmeaDetail'],
        'fmea_create'             => [LegacyQualityShimController::class, 'fmeaCreate'],
        'fmea_update'             => [LegacyQualityShimController::class, 'fmeaUpdate'],
        'fmea_add_failure_mode'   => [LegacyQualityShimController::class, 'fmeaAddFailureMode'],
        'fmea_update_failure_mode'=> [LegacyQualityShimController::class, 'fmeaUpdateFailureMode'],
        'fmea_add_action'         => [LegacyQualityShimController::class, 'fmeaAddAction'],
        'fmea_complete_action'    => [LegacyQualityShimController::class, 'fmeaCompleteAction'],
        'fmea_generate_cp'        => [LegacyQualityShimController::class, 'fmeaGenerateCp'],
        'fmea_control_plans'      => [LegacyQualityShimController::class, 'fmeaControlPlans'],
        'fmea_cp_detail'          => [LegacyQualityShimController::class, 'fmeaCpDetail'],
        'fmea_rpn_trend'          => [LegacyQualityShimController::class, 'fmeaRpnTrend'],
        'fmea_link_ncr'           => [LegacyQualityShimController::class, 'fmeaLinkNcr'],
    ]);
    
    // APQP / PPAP
    $router->actions([
        'apqp_list'               => [ApqpController::class, 'listProjects'],
        'apqp_detail'             => [ApqpController::class, 'getProjectDetail'],
        'apqp_create'             => [ApqpController::class, 'createProject'],
        'apqp_update'             => [ApqpController::class, 'updateProject'],
        'apqp_advance_phase'      => [ApqpController::class, 'advancePhase'],
        'apqp_gate_review'        => [ApqpController::class, 'submitGateReview'],
        'apqp_gate_approve'       => [ApqpController::class, 'approveGate'],
        'apqp_gate_reject'        => [ApqpController::class, 'rejectGate'],
        'apqp_ppap_create'        => [ApqpController::class, 'createPpapSubmission'],
        'apqp_ppap_element'       => [ApqpController::class, 'updatePpapElement'],
        'apqp_ppap_response'      => [ApqpController::class, 'recordCustomerResponse'],
        'apqp_deliverables'       => [ApqpController::class, 'getPhaseDeliverables'],
        'apqp_dashboard'          => [ApqpController::class, 'getDashboard'],
    ]);
    
    // Mobile Shop Floor
    $router->actions([
        'mobile_my_queue'         => [MobileController::class, 'getMyQueue'],
        'mobile_start_task'       => [MobileController::class, 'startTask'],
        'mobile_complete_task'    => [MobileController::class, 'completeTask'],
        'mobile_clock_in'         => [MobileController::class, 'clockIn'],
        'mobile_clock_out'        => [MobileController::class, 'clockOut'],
        'mobile_capture_inspection' => [MobileController::class, 'captureInspection'],
        'mobile_sync_batch'       => [MobileController::class, 'submitOfflineBatch'],
        'mobile_sync_status'      => [MobileController::class, 'getSyncStatus'],
        'mobile_resolve_conflict' => [MobileController::class, 'resolveConflict'],
        'mobile_shop_overview'    => [MobileController::class, 'getShopFloorOverview'],
        'mobile_dashboard'        => [MobileController::class, 'getOperatorDashboard'],
    ]);
    
    // Master Data Management
    $router->actions([
        'master_data_list'            => [MasterDataController::class, 'listRecords'],
        'master_data_detail'          => [MasterDataController::class, 'getDetail'],
        'master_data_create'          => [MasterDataController::class, 'createRecord'],
        'master_data_update'          => [MasterDataController::class, 'updateRecord'],
        'master_data_delete'          => [MasterDataController::class, 'deleteRecord'],
        'master_data_status'          => [MasterDataController::class, 'changeStatus'],
        'master_data_history'         => [MasterDataController::class, 'getHistory'],
        'master_data_entities'        => [MasterDataController::class, 'listEntities'],
        'master_data_snapshot'        => [MasterDataController::class, 'listRecords'],
        // Upsert alias: 13-master-data-control.js Save button (create if no record_id, else update)
        'master_data_upsert'          => [MasterDataController::class, 'upsert'],
        // Shifts
        'shift_list'                  => [MasterDataController::class, 'listShifts'],
        'shift_save'                  => [MasterDataController::class, 'saveShift'],
        'shift_assignments'           => [MasterDataController::class, 'listShiftAssignments'],
        'shift_assign'                => [MasterDataController::class, 'saveShiftAssignment'],
        'shift_holidays'              => [MasterDataController::class, 'listHolidays'],
        'shift_holiday_save'          => [MasterDataController::class, 'saveHoliday'],
    ]);
    
    // Production Dispatch & Shift Targets
    $router->actions([
        'dispatch_timeline'          => [DispatchController::class, 'getTimeline'],
        'dispatch_dashboard'         => [DispatchController::class, 'getDashboard'],
        'dispatch_list_targets'      => [DispatchController::class, 'listTargets'],
        'dispatch_create_target'     => [DispatchController::class, 'createTarget'],
        'dispatch_update_target'     => [DispatchController::class, 'updateTarget'],
        'dispatch_send'              => [DispatchController::class, 'dispatchTarget'],
        'dispatch_bulk_send'         => [DispatchController::class, 'bulkDispatch'],
        'dispatch_operator_tasks'    => [DispatchController::class, 'getOperatorDispatch'],
        'dispatch_report_production' => [DispatchController::class, 'reportProduction'],
        'dispatch_pause_target'      => [DispatchController::class, 'pauseTarget'],
        'dispatch_resume_target'     => [DispatchController::class, 'resumeTarget'],
    ]);
    
    // Logistics: Subcontract, OQC, Packing, Delivery
    $router->actions([
        'subcontract_list'          => [LogisticsController::class, 'subcontract_list'],
        'subcontract_create'        => [LogisticsController::class, 'subcontract_create'],
        'subcontract_update'        => [LogisticsController::class, 'subcontract_update'],
        'subcontract_receive'       => [LogisticsController::class, 'subcontract_receive'],
        'oqc_list'                  => [LogisticsController::class, 'oqc_list'],
        'oqc_create'                => [LogisticsController::class, 'oqc_create'],
        'oqc_update'                => [LogisticsController::class, 'oqc_update'],
        'packing_list'              => [LogisticsController::class, 'packing_list'],
        'packing_create'            => [LogisticsController::class, 'packing_create'],
        'packing_update'            => [LogisticsController::class, 'packing_update'],
        'delivery_confirm'          => [LogisticsController::class, 'delivery_confirm'],
    ]);
    
    // CNC Programs
    $router->actions([
        'cnc_program_list'          => [CncProgramController::class, 'listPrograms'],
        'cnc_program_detail'        => [CncProgramController::class, 'getDetail'],
        'cnc_program_create'        => [CncProgramController::class, 'create'],
        'cnc_program_update'        => [CncProgramController::class, 'update'],
        'cnc_program_upload_version'=> [CncProgramController::class, 'addVersion'],
        'cnc_program_approve'       => [CncProgramController::class, 'approve'],
        'cnc_program_setup_sheets'  => [CncProgramController::class, 'listSetupSheets'],
        'cnc_program_setup_create'  => [CncProgramController::class, 'createSetupSheet'],
    ]);
    
    // Product Passport
    $router->actions([
        'product_passport_list'      => [ProductPassportController::class, 'listPassports'],
        'product_passport_detail'    => [ProductPassportController::class, 'getDetail'],
        'product_passport_create'    => [ProductPassportController::class, 'create'],
        'product_passport_add_event' => [ProductPassportController::class, 'addEvent'],
        'product_passport_trace'     => [ProductPassportController::class, 'trace'],
        'product_passport_qr'        => [ProductPassportController::class, 'getQrData'],
    ]);

    // Canonical Manufacturing Event Backbone
    $router->actions([
        'manufacturing_event_timeline' => [ManufacturingEventController::class, 'timeline'],
        'manufacturing_event_probe'    => [ManufacturingEventController::class, 'probe'],
        'manufacturing_history_packet' => [ManufacturingEventController::class, 'productionHistory'],
        'traceability_genealogy_upstream' => [TraceabilityGenealogyController::class, 'upstream'],
        'traceability_genealogy_downstream' => [TraceabilityGenealogyController::class, 'downstream'],
        'traceability_genealogy_impacted_outputs' => [TraceabilityGenealogyController::class, 'impactedOutputs'],
        'traceability_genealogy_supplier_issue_impact' => [TraceabilityGenealogyController::class, 'supplierIssueImpact'],
        'traceability_genealogy_consumption_eligibility' => [TraceabilityGenealogyController::class, 'consumptionEligibility'],
        'traceability_genealogy_shipment_eligibility' => [TraceabilityGenealogyController::class, 'shipmentEligibility'],
        'traceability_genealogy_probe' => [TraceabilityGenealogyController::class, 'probe'],
        'manufacturing_spine_model'    => [ManufacturingSpineController::class, 'model'],
        'manufacturing_spine_probe'    => [ManufacturingSpineController::class, 'probe'],
        'trusted_release_record_assemble' => [TrustedReleaseRecordController::class, 'assemble'],
        'trusted_release_record_readiness' => [TrustedReleaseRecordController::class, 'readiness'],
        'trusted_release_record_release' => [TrustedReleaseRecordController::class, 'release'],
        'trusted_release_record_detail' => [TrustedReleaseRecordController::class, 'detail'],
        'trusted_release_record_provenance' => [TrustedReleaseRecordController::class, 'provenance'],
        'trusted_release_record_rollup' => [TrustedReleaseRecordController::class, 'rollup'],
        'trusted_release_record_probe' => [TrustedReleaseRecordController::class, 'probe'],
        'connected_governance_release_revision' => [ConnectedGovernanceController::class, 'releaseRevision'],
        'connected_governance_active_revision' => [ConnectedGovernanceController::class, 'activeRevision'],
        'connected_governance_operator_readiness' => [ConnectedGovernanceController::class, 'operatorReadiness'],
        'connected_governance_rollout_readiness' => [ConnectedGovernanceController::class, 'rolloutReadiness'],
        'connected_governance_enterprise_rollout' => [ConnectedGovernanceController::class, 'enterpriseRollout'],
        'connected_governance_blockers' => [ConnectedGovernanceController::class, 'blockers'],
        'connected_governance_probe' => [ConnectedGovernanceController::class, 'probe'],
        'planning_scenario_calculate' => [PlanningScenarioController::class, 'calculate'],
        'planning_scenario_detail' => [PlanningScenarioController::class, 'detail'],
        'planning_scenario_feasibility' => [PlanningScenarioController::class, 'feasibility'],
        'planning_scenario_capacity' => [PlanningScenarioController::class, 'capacityLoad'],
        'planning_scenario_approve' => [PlanningScenarioController::class, 'approve'],
        'planning_scenario_publish' => [PlanningScenarioController::class, 'publish'],
        'planning_dispatch_readiness' => [PlanningScenarioController::class, 'dispatchReadiness'],
        'planning_replanning_signal_create' => [PlanningScenarioController::class, 'recordSignal'],
        'planning_replanning_signals' => [PlanningScenarioController::class, 'replanningSignals'],
        'planning_scenario_probe' => [PlanningScenarioController::class, 'probe'],
    ]);
    $router->get('/api/manufacturing-events/timeline', ManufacturingEventController::class, 'timeline');
    $router->get('/api/manufacturing-events/probe', ManufacturingEventController::class, 'probe');
    $router->get('/api/manufacturing-events/production-history', ManufacturingEventController::class, 'productionHistory');
    $router->get('/api/traceability-genealogy/upstream', TraceabilityGenealogyController::class, 'upstream');
    $router->get('/api/traceability-genealogy/downstream', TraceabilityGenealogyController::class, 'downstream');
    $router->get('/api/traceability-genealogy/impacted-outputs', TraceabilityGenealogyController::class, 'impactedOutputs');
    $router->get('/api/traceability-genealogy/supplier-issue-impact', TraceabilityGenealogyController::class, 'supplierIssueImpact');
    $router->get('/api/traceability-genealogy/consumption-eligibility', TraceabilityGenealogyController::class, 'consumptionEligibility');
    $router->get('/api/traceability-genealogy/shipment-eligibility', TraceabilityGenealogyController::class, 'shipmentEligibility');
    $router->get('/api/traceability-genealogy/probe', TraceabilityGenealogyController::class, 'probe');
    $router->get('/api/manufacturing-spine/model', ManufacturingSpineController::class, 'model');
    $router->get('/api/manufacturing-spine/probe', ManufacturingSpineController::class, 'probe');
    $router->get('/api/trusted-release-record/readiness', TrustedReleaseRecordController::class, 'readiness');
    $router->get('/api/trusted-release-record/detail', TrustedReleaseRecordController::class, 'detail');
    $router->get('/api/trusted-release-record/provenance', TrustedReleaseRecordController::class, 'provenance');
    $router->get('/api/trusted-release-record/rollup', TrustedReleaseRecordController::class, 'rollup');
    $router->get('/api/trusted-release-record/probe', TrustedReleaseRecordController::class, 'probe');
    $router->post('/api/trusted-release-record/assemble', TrustedReleaseRecordController::class, 'assemble');
    $router->post('/api/trusted-release-record/release', TrustedReleaseRecordController::class, 'release');
    $router->post('/api/connected-governance/revisions/release', ConnectedGovernanceController::class, 'releaseRevision');
    $router->get('/api/connected-governance/active-revision', ConnectedGovernanceController::class, 'activeRevision');
    $router->get('/api/connected-governance/operator-readiness', ConnectedGovernanceController::class, 'operatorReadiness');
    $router->get('/api/connected-governance/rollout-readiness', ConnectedGovernanceController::class, 'rolloutReadiness');
    $router->get('/api/connected-governance/enterprise-rollout', ConnectedGovernanceController::class, 'enterpriseRollout');
    $router->get('/api/connected-governance/blockers', ConnectedGovernanceController::class, 'blockers');
    $router->get('/api/connected-governance/probe', ConnectedGovernanceController::class, 'probe');
    $router->post('/api/planning/scenarios/calculate', PlanningScenarioController::class, 'calculate');
    $router->get('/api/planning/scenarios/detail', PlanningScenarioController::class, 'detail');
    $router->get('/api/planning/scenarios/feasibility', PlanningScenarioController::class, 'feasibility');
    $router->get('/api/planning/scenarios/capacity-load', PlanningScenarioController::class, 'capacityLoad');
    $router->post('/api/planning/scenarios/approve', PlanningScenarioController::class, 'approve');
    $router->post('/api/planning/scenarios/publish', PlanningScenarioController::class, 'publish');
    $router->get('/api/planning/dispatch-readiness', PlanningScenarioController::class, 'dispatchReadiness');
    $router->post('/api/planning/replanning-signals', PlanningScenarioController::class, 'recordSignal');
    $router->get('/api/planning/replanning-signals', PlanningScenarioController::class, 'replanningSignals');
    $router->get('/api/planning/scenarios/probe', PlanningScenarioController::class, 'probe');
    
    // AI Quality Scheduling
    $router->actions([
        'ai_prediction_list'         => [AiSchedulingController::class, 'listPredictions'],
        'ai_prediction_acknowledge'  => [AiSchedulingController::class, 'acknowledgePrediction'],
        'ai_prediction_resolve'      => [AiSchedulingController::class, 'resolvePrediction'],
        'ai_spc_anomalies'           => [AiSchedulingController::class, 'getSpcAnomalies'],
        'ai_tool_wear'               => [AiSchedulingController::class, 'getToolWearPredictions'],
        'ai_dashboard'               => [AiSchedulingController::class, 'getDashboard'],
        'schedule_get'               => [AiSchedulingController::class, 'getSchedule'],
        'schedule_slot_create'       => [AiSchedulingController::class, 'createSlot'],
        'schedule_slot_update'       => [AiSchedulingController::class, 'updateSlot'],
        'schedule_conflicts'         => [AiSchedulingController::class, 'getConflicts'],
        'schedule_capacity'          => [AiSchedulingController::class, 'getCapacityHeatmap'],
        'schedule_promise'           => [AiSchedulingController::class, 'suggestPromiseDate'],
        // Phase 3A: AI intelligence endpoints
        'ai_nl_query'                => [AiSchedulingController::class, 'aiNlQuery'],
        'ai_rca_analyze'             => [AiSchedulingController::class, 'aiRcaAnalyze'],
        'ai_feedback_submit'         => [AiSchedulingController::class, 'aiFeedbackSubmit'],
        'ai_model_list'              => [AiSchedulingController::class, 'aiModelList'],
        'ai_conversation_history'    => [AiSchedulingController::class, 'aiConversationHistory'],
        'ai_document_summarize'      => [AiSchedulingController::class, 'aiDocumentSummarize'],
        'ai_dashboard_combined'      => [AiSchedulingController::class, 'aiDashboard'],
    ]);
    
    // Customer Portal
    $router->actions([
        'customer_portal_users'         => [CustomerPortalController::class, 'listUsers'],
        'customer_portal_user_create'   => [CustomerPortalController::class, 'createUser'],
        'customer_portal_user_update'   => [CustomerPortalController::class, 'updateUser'],
        'customer_portal_access_list'   => [CustomerPortalController::class, 'listAccessGrants'],
        'customer_portal_access_grant'  => [CustomerPortalController::class, 'grantAccess'],
        'customer_portal_access_revoke' => [CustomerPortalController::class, 'revokeAccess'],
        'customer_portal_complaints'    => [CustomerPortalController::class, 'listComplaints'],
        'customer_portal_documents'     => [CustomerPortalController::class, 'listDocAccess'],
        'customer_portal_analytics'     => [CustomerPortalController::class, 'getAnalytics'],
    ]);
    
    // Compliance Reports
    $router->actions([
        'compliance_report_types'           => [ComplianceReportController::class, 'listReportTypes'],
        'compliance_report_generate'        => [ComplianceReportController::class, 'generateReport'],
        'compliance_report_history'         => [ComplianceReportController::class, 'getHistory'],
        'compliance_report_management_review' => [ComplianceReportController::class, 'getManagementReviewData'],
        'compliance_report_customer_quality'  => [ComplianceReportController::class, 'getCustomerQualityData'],
        'compliance_report_supplier_review'   => [ComplianceReportController::class, 'getSupplierReviewData'],
        'compliance_report_copq'            => [ComplianceReportController::class, 'getCopqData'],
        'compliance_report_evidence_package' => [ComplianceReportController::class, 'getEvidencePackage'],
    ]);
    
    // Knowledge Base
    $router->actions([
        'knowledge_list'    => [KnowledgeController::class, 'listTips'],
        'knowledge_detail'  => [KnowledgeController::class, 'getDetail'],
        'knowledge_create'  => [KnowledgeController::class, 'create'],
        'knowledge_update'  => [KnowledgeController::class, 'update'],
        'knowledge_vote'    => [KnowledgeController::class, 'vote'],
        'knowledge_comment' => [KnowledgeController::class, 'addComment'],
    ]);
    
    // Continuous Improvement
    $router->actions([
        'ci_dashboard'           => [CiController::class, 'dashboard'],
        'ci_suggestion_list'     => [CiController::class, 'listSuggestions'],
        'ci_suggestion_create'   => [CiController::class, 'createSuggestion'],
        'ci_project_list'        => [CiController::class, 'listProjects'],
        'ci_project_create'      => [CiController::class, 'createProject'],
        'ci_project_update'      => [CiController::class, 'updateProject'],
        'ci_project_transition'  => [CiController::class, 'transitionProject'],
        'ci_roi_summary'         => [CiController::class, 'getRoiSummary'],
    ]);
    
    // Energy Dashboard
    $router->actions([
        'energy_overview'       => [EnergyController::class, 'getOverview'],
        'energy_machine_detail' => [EnergyController::class, 'getMachineDetail'],
        'energy_per_part'       => [EnergyController::class, 'getPerPartEnergy'],
        'energy_cost_trend'     => [EnergyController::class, 'getCostTrend'],
    ]);

    // MES Observability & Manual Runtime (was unreachable — previously only in legacy api.php switch)
    $router->actions([
        'mes_shadow_status'                => [AdminDataLayerController::class, 'shadowStatus'],
        'epicor_transport_health'          => [AdminDataLayerController::class, 'epicorTransportHealth'],
        'mes_connector_snapshot'           => [AdminDataLayerController::class, 'connectorSnapshot'],
        'manual_runtime_summary'           => [ManualRuntimeController::class, 'summary'],
        'manual_runtime_endpoint_contracts'=> [ManualRuntimeController::class, 'endpointContracts'],
    ]);

    // Form Fill runtime (10-eqms-form-runtime.js, 09b-form-fill-download.js, 09h-allocation-tracker.js)
    $router->actions([
        // Read-only form schema lookup (from online-forms/schemas/)
        'form_fill_load_schema'    => [FormController::class, 'fillLoadSchema'],
        // Draft read/discard/history
        'form_fill_get_draft'      => [FormController::class, 'fillGetDraft'],
        'form_fill_discard_draft'  => [FormController::class, 'fillDiscardDraft'],
        'form_fill_history'        => [FormController::class, 'fillHistory'],
        // Write actions: these canonically require the EQMS control-plane path.
        // Routing them here returns 410 with guidance instead of 400 unknown_action.
        'form_fill_save_draft'     => [FormController::class, 'saveDraft'],
        'form_fill_submit_online'  => [FormController::class, 'submit'],
        // Offline package issue (09h-allocation-tracker.js)
        'form_fill_download_offline' => [AllocationController::class, 'downloadOffline'],
    ]);
};
