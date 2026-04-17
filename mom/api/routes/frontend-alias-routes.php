<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    // â”€â”€ Frontend Action Aliases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Map frontend action names to existing controller methods where naming differs.
    
    // Module 15: quality-exception-hub.js aliases
    $router->actions([
        'quality_exception_list'            => [ExceptionController::class, 'listAll'],
        'quality_exception_kpi'             => [ExceptionController::class, 'dashboard'],
        'quality_exception_copq'            => [ExceptionController::class, 'copqSummary'],
        'quality_exception_trends'          => [ExceptionController::class, 'trends'],
        'quality_exception_create'          => [ExceptionController::class, 'createComplaint'],
        'quality_exception_transition'      => [ExceptionController::class, 'transition'],
        'quality_exception_save_8d'         => [ExceptionController::class, 'updateComplaint'],
        'quality_exception_mrb_disposition' => [ExceptionController::class, 'updateMrb'],
    ]);
    
    // Module 16: supplier-quality.js aliases
    $router->actions([
        'supplier_quality_data'         => [SupplierController::class, 'dashboard'],
        'supplier_asl_create'           => [SupplierController::class, 'upsertAsl'],
        'supplier_asl_suspend'          => [SupplierController::class, 'upsertAsl'],
        'supplier_audit_create'         => [SupplierController::class, 'upsertAudit'],
        'supplier_incoming_disposition' => [SupplierController::class, 'updateIncoming'],
    ]);
    
    // Module 17: quoting-engine.js aliases
    $router->actions([
        'quote_kpi'  => [QuoteController::class, 'dashboard'],
        'quote_save' => [QuoteController::class, 'create'],
    ]);
    
    // Module 19: customer-portal-admin.js aliases
    $router->actions([
        'customer_portal_data'                => [CustomerPortalController::class, 'getAdminData'],
        'customer_portal_grant_access'        => [CustomerPortalController::class, 'grantAccess'],
        'customer_portal_revoke_access'       => [CustomerPortalController::class, 'revokeAccess'],
        'customer_portal_complaint_update'    => [CustomerPortalController::class, 'updateComplaintStatus'],
        'customer_portal_resend_verification' => [CustomerPortalController::class, 'resendVerification'],
        'customer_portal_revoke_doc'          => [CustomerPortalController::class, 'revokeDocument'],
    ]);
    
    // Module 20: cnc-programs.js aliases
    $router->actions([
        'cnc_program_data'       => [CncProgramController::class, 'listPrograms'],
        'cnc_program_compare'    => [CncProgramController::class, 'getDetail'],
        'cnc_setup_sheet_create' => [CncProgramController::class, 'createSetupSheet'],
    ]);
    
    // Module 21: product-passport.js aliases
    $router->actions([
        'product_passport_data'       => [ProductPassportController::class, 'listPassports'],
        'product_passport_transition' => [ProductPassportController::class, 'addEvent'],
    ]);
    
    // Module 22: ai-quality-scheduling.js aliases
    $router->actions([
        'ai_quality_scheduling_data'  => [AiSchedulingController::class, 'getDashboard'],
        'ai_prediction_false_positive'=> [AiSchedulingController::class, 'resolvePrediction'],
        'schedule_promise_calculate'  => [AiSchedulingController::class, 'suggestPromiseDate'],
        'schedule_slot_breakdown'     => [AiSchedulingController::class, 'getSchedule'],
        'schedule_slot_detail'        => [AiSchedulingController::class, 'getSchedule'],
        // schedule_slots: gantt load alias (was unreachable — not in any route)
        'schedule_slots'              => [AiSchedulingController::class, 'getSchedule'],
        // schedule_slot_move: AI recommendations drag-drop reschedule alias
        'schedule_slot_move'          => [AiSchedulingController::class, 'updateSlot'],
        // spc_chart_data: SPC overlay alias used by ai-quality-scheduling module
        'spc_chart_data'              => [DashboardController::class, 'spcChart'],
    ]);
    
    // Module 23: compliance-reports.js aliases
    $router->actions([
        'compliance_report_list' => [ComplianceReportController::class, 'listReportTypes'],
    ]);
    
    // Module 24: fmea-control-plan.js aliases
    $router->actions([
        'fmea_save'            => [FmeaController::class, 'createFmea'],
        'cp_detail'            => [FmeaController::class, 'getControlPlanDetail'],
        'cp_add_characteristic'=> [FmeaController::class, 'updateFmea'],
        'cp_auto_generate'     => [FmeaController::class, 'generateControlPlan'],
    ]);
    
    // Module 25: apqp-ppap.js aliases
    $router->actions([
        'apqp_toggle_deliverable' => [ApqpController::class, 'submitGateReview'],
        'ppap_create'             => [ApqpController::class, 'createPpapSubmission'],
        'ppap_update_element'     => [ApqpController::class, 'updatePpapElement'],
    ]);
    
    // Module 26: mobile-shopfloor.js aliases
    $router->actions([
        'mobile_queue'              => [MobileController::class, 'getMyQueue'],
        'mobile_create_ncr'         => [MobileController::class, 'captureInspection'],
        'mobile_inspection_plan'    => [MobileController::class, 'getMyQueue'],
        'mobile_submit_first_piece' => [MobileController::class, 'captureInspection'],
        'mobile_submit_inprocess'   => [MobileController::class, 'captureInspection'],
        'mobile_sync'               => [MobileController::class, 'submitOfflineBatch'],
    ]);
    
    // Module 09e: so-jo-wo-dashboard.js aliases
    $router->actions([
        'order_detail'           => [OrderController::class, 'getSalesOrderDetail'],
        'order_update_fields'    => [OrderController::class, 'updateSalesOrder'],
        'order_so_update_status' => [OrderController::class, 'transition'],
        'order_jo_update_status' => [OrderController::class, 'transition'],
        'order_wo_update_status' => [OrderController::class, 'transition'],
        'order_get_linked_forms' => [OrderController::class, 'getHierarchy'],
    ]);

    // Module 13: master-data-control.js alias
    $router->actions([
        // Upsert: creates or updates based on presence of record_id
        'quality_exception_update' => [ExceptionController::class, 'updateComplaint'],
    ]);

    // ── EQMS Suite (40-62): World-Class Quality Management Surface ──────────
    // Maps frontend action keys (api.php?action=eqms_*) to EQMS REST controllers.
    // Frontend uses apiCall('eqms_module_action') pattern; backend uses REST routes.

    // Module 42: eqms-complaints.js
    $router->actions([
        'eqms_complaints_query'       => [EqmsComplaintsController::class, 'search'],
        'eqms_complaints_detail'      => [EqmsComplaintsController::class, 'detail'],
        'eqms_complaints_create'      => [EqmsComplaintsController::class, 'create'],
        'eqms_complaints_update'      => [EqmsComplaintsController::class, 'update'],
        'eqms_complaints_metrics'     => [EqmsComplaintsController::class, 'metrics'],
        'eqms_complaints_audit'       => [EqmsComplaintsController::class, 'audit'],
        'eqms_complaints_comments'    => [EqmsComplaintsController::class, 'comments'],
        'eqms_complaints_signatures'  => [EqmsComplaintsController::class, 'signatures'],
        'eqms_complaints_export'      => [EqmsComplaintsController::class, 'export'],
        'eqms_complaints_attachments' => [EqmsComplaintsController::class, 'attachments'],
        'eqms_complaints_relationships' => [EqmsComplaintsController::class, 'relationships'],
        'eqms_complaints_action_intake'                => [EqmsComplaintsController::class, 'actionIntake'],
        'eqms_complaints_action_triage'                => [EqmsComplaintsController::class, 'actionTriage'],
        'eqms_complaints_action_assign'                => [EqmsComplaintsController::class, 'actionAssign'],
        'eqms_complaints_action_record_containment'    => [EqmsComplaintsController::class, 'actionRecordContainment'],
        'eqms_complaints_action_start_investigation'   => [EqmsComplaintsController::class, 'actionStartInvestigation'],
        'eqms_complaints_action_link_capa'             => [EqmsComplaintsController::class, 'actionLinkCapa'],
        'eqms_complaints_action_initiate_field_action' => [EqmsComplaintsController::class, 'actionInitiateFieldAction'],
        'eqms_complaints_action_issue_response'        => [EqmsComplaintsController::class, 'actionIssueResponse'],
        'eqms_complaints_action_close'                 => [EqmsComplaintsController::class, 'actionClose'],
        'eqms_complaints_action_reopen'                => [EqmsComplaintsController::class, 'actionReopen'],
    ]);

    // Module 43: eqms-deviations.js
    $router->actions([
        'eqms_deviations_query'          => [EqmsDeviationController::class, 'search'],
        'eqms_deviations_detail'         => [EqmsDeviationController::class, 'detail'],
        'eqms_deviations_create'         => [EqmsDeviationController::class, 'create'],
        'eqms_deviations_update'         => [EqmsDeviationController::class, 'update'],
        'eqms_deviations_metrics'        => [EqmsDeviationController::class, 'metrics'],
        'eqms_deviations_audit'          => [EqmsDeviationController::class, 'audit'],
        'eqms_deviations_comments'       => [EqmsDeviationController::class, 'comments'],
        'eqms_deviations_attachments'    => [EqmsDeviationController::class, 'attachments'],
        'eqms_deviations_relationships'  => [EqmsDeviationController::class, 'relationships'],
        'eqms_deviations_signatures'     => [EqmsDeviationController::class, 'signatures'],
        'eqms_deviations_export'         => [EqmsDeviationController::class, 'export'],
        'eqms_deviations_action_classify'            => [EqmsDeviationController::class, 'actionClassify'],
        'eqms_deviations_action_record_containment'  => [EqmsDeviationController::class, 'actionRecordContainment'],
        'eqms_deviations_action_start_investigation' => [EqmsDeviationController::class, 'actionStartInvestigation'],
        'eqms_deviations_action_link_batch'          => [EqmsDeviationController::class, 'actionLinkBatch'],
        'eqms_deviations_action_link_change_control' => [EqmsDeviationController::class, 'actionLinkChangeControl'],
        'eqms_deviations_action_link_capa'           => [EqmsDeviationController::class, 'actionLinkCapa'],
        'eqms_deviations_action_close'               => [EqmsDeviationController::class, 'actionClose'],
        'eqms_deviations_action_void'                => [EqmsDeviationController::class, 'actionVoid'],
    ]);

    // Module 44: eqms-ncr.js
    $router->actions([
        'eqms_ncr_query'         => [EqmsNcrController::class, 'search'],
        'eqms_ncr_detail'        => [EqmsNcrController::class, 'detail'],
        'eqms_ncr_create'        => [EqmsNcrController::class, 'create'],
        'eqms_ncr_update'        => [EqmsNcrController::class, 'update'],
        'eqms_ncr_metrics'       => [EqmsNcrController::class, 'metrics'],
        'eqms_ncr_audit'         => [EqmsNcrController::class, 'audit'],
        'eqms_ncr_comments'      => [EqmsNcrController::class, 'comments'],
        'eqms_ncr_attachments'   => [EqmsNcrController::class, 'attachments'],
        'eqms_ncr_relationships' => [EqmsNcrController::class, 'relationships'],
        'eqms_ncr_signatures'    => [EqmsNcrController::class, 'signatures'],
        'eqms_ncr_export'                    => [EqmsNcrController::class, 'export'],
        'eqms_ncr_action_contain'            => [EqmsNcrController::class, 'actionContain'],
        'eqms_ncr_action_investigate'        => [EqmsNcrController::class, 'actionInvestigate'],
        'eqms_ncr_action_submit_mrb'         => [EqmsNcrController::class, 'actionSubmitMrb'],
        'eqms_ncr_action_record_disposition' => [EqmsNcrController::class, 'actionRecordDisposition'],
        'eqms_ncr_action_close'              => [EqmsNcrController::class, 'actionClose'],
        'eqms_ncr_action_reopen'             => [EqmsNcrController::class, 'actionReopen'],
    ]);

    // Module 45: eqms-capa.js
    $router->actions([
        'eqms_capa_query'         => [EqmsCapaController::class, 'search'],
        'eqms_capa_detail'        => [EqmsCapaController::class, 'detail'],
        'eqms_capa_create'        => [EqmsCapaController::class, 'create'],
        'eqms_capa_update'        => [EqmsCapaController::class, 'update'],
        'eqms_capa_metrics'       => [EqmsCapaController::class, 'metrics'],
        'eqms_capa_audit'         => [EqmsCapaController::class, 'audit'],
        'eqms_capa_comments'      => [EqmsCapaController::class, 'comments'],
        'eqms_capa_attachments'   => [EqmsCapaController::class, 'attachments'],
        'eqms_capa_relationships' => [EqmsCapaController::class, 'relationships'],
        'eqms_capa_signatures'    => [EqmsCapaController::class, 'signatures'],
        'eqms_capa_export'                       => [EqmsCapaController::class, 'export'],
        'eqms_capa_action_start_analysis'        => [EqmsCapaController::class, 'actionStartAnalysis'],
        'eqms_capa_action_record_root_cause'     => [EqmsCapaController::class, 'actionRecordRootCause'],
        'eqms_capa_action_add_action_plan'       => [EqmsCapaController::class, 'actionAddActionPlan'],
        'eqms_capa_action_assign_action'         => [EqmsCapaController::class, 'actionAssignAction'],
        'eqms_capa_action_submit_approval'       => [EqmsCapaController::class, 'actionSubmitApproval'],
        'eqms_capa_action_submit_verification'   => [EqmsCapaController::class, 'actionSubmitVerification'],
        'eqms_capa_action_record_effectiveness'  => [EqmsCapaController::class, 'actionRecordEffectiveness'],
        'eqms_capa_action_close'                 => [EqmsCapaController::class, 'actionClose'],
        'eqms_capa_action_cancel'                => [EqmsCapaController::class, 'actionCancel'],
    ]);

    // Module 46: eqms-change-control.js
    $router->actions([
        'eqms_change_controls_query'         => [EqmsChangeControlController::class, 'search'],
        'eqms_change_controls_detail'        => [EqmsChangeControlController::class, 'detail'],
        'eqms_change_controls_create'        => [EqmsChangeControlController::class, 'create'],
        'eqms_change_controls_update'        => [EqmsChangeControlController::class, 'update'],
        'eqms_change_controls_metrics'       => [EqmsChangeControlController::class, 'metrics'],
        'eqms_change_controls_audit'         => [EqmsChangeControlController::class, 'audit'],
        'eqms_change_controls_comments'      => [EqmsChangeControlController::class, 'comments'],
        'eqms_change_controls_attachments'   => [EqmsChangeControlController::class, 'attachments'],
        'eqms_change_controls_relationships' => [EqmsChangeControlController::class, 'relationships'],
        'eqms_change_controls_signatures'                    => [EqmsChangeControlController::class, 'signatures'],
        'eqms_change_controls_action_classify'              => [EqmsChangeControlController::class, 'actionClassify'],
        'eqms_change_controls_action_assess_impact'         => [EqmsChangeControlController::class, 'actionAssessImpact'],
        'eqms_change_controls_action_route_approval'        => [EqmsChangeControlController::class, 'actionRouteApproval'],
        'eqms_change_controls_action_approve'               => [EqmsChangeControlController::class, 'actionApprove'],
        'eqms_change_controls_action_launch_implementation' => [EqmsChangeControlController::class, 'actionLaunchImplementation'],
        'eqms_change_controls_action_verify_effectiveness'  => [EqmsChangeControlController::class, 'actionVerifyEffectiveness'],
        'eqms_change_controls_action_close'                 => [EqmsChangeControlController::class, 'actionClose'],
    ]);

    // Module 48: eqms-documents.js
    $router->actions([
        'eqms_documents_query'         => [EqmsDocumentsController::class, 'search'],
        'eqms_documents_detail'        => [EqmsDocumentsController::class, 'detail'],
        'eqms_documents_create'        => [EqmsDocumentsController::class, 'create'],
        'eqms_documents_update'        => [EqmsDocumentsController::class, 'update'],
        'eqms_documents_metrics'       => [EqmsDocumentsController::class, 'metrics'],
        'eqms_documents_audit'         => [EqmsDocumentsController::class, 'audit'],
        'eqms_documents_comments'      => [EqmsDocumentsController::class, 'comments'],
        'eqms_documents_attachments'   => [EqmsDocumentsController::class, 'attachments'],
        'eqms_documents_relationships' => [EqmsDocumentsController::class, 'relationships'],
        'eqms_documents_signatures'    => [EqmsDocumentsController::class, 'signatures'],
        'eqms_documents_export'                         => [EqmsDocumentsController::class, 'export'],
        'eqms_documents_action_check_out'               => [EqmsDocumentsController::class, 'actionCheckOut'],
        'eqms_documents_action_check_in'                => [EqmsDocumentsController::class, 'actionCheckIn'],
        'eqms_documents_action_submit_review'           => [EqmsDocumentsController::class, 'actionSubmitReview'],
        'eqms_documents_action_approve'                 => [EqmsDocumentsController::class, 'actionApprove'],
        'eqms_documents_action_release'                 => [EqmsDocumentsController::class, 'actionRelease'],
        'eqms_documents_action_supersede'               => [EqmsDocumentsController::class, 'actionSupersede'],
        'eqms_documents_action_obsolete'                => [EqmsDocumentsController::class, 'actionObsolete'],
        'eqms_documents_action_request_acknowledgement' => [EqmsDocumentsController::class, 'actionRequestAcknowledgement'],
        'eqms_documents_action_record_acknowledgement'  => [EqmsDocumentsController::class, 'actionRecordAcknowledgement'],
    ]);

    // Module 49: eqms-training.js
    $router->actions([
        'eqms_training_query'            => [EqmsTrainingController::class, 'search'],
        'eqms_training_detail'           => [EqmsTrainingController::class, 'detail'],
        'eqms_training_create'           => [EqmsTrainingController::class, 'create'],
        'eqms_training_matrix'           => [EqmsTrainingController::class, 'matrix'],
        'eqms_training_curricula'        => [EqmsTrainingController::class, 'curricula'],
        'eqms_training_metrics'          => [EqmsTrainingController::class, 'metrics'],
        'eqms_training_audit'            => [EqmsTrainingController::class, 'audit'],
        'eqms_training_comments'         => [EqmsTrainingController::class, 'comments'],
        'eqms_training_attachments'      => [EqmsTrainingController::class, 'attachments'],
        'eqms_training_signatures'       => [EqmsTrainingController::class, 'signatures'],
        'eqms_training_relationships'    => [EqmsTrainingController::class, 'relationships'],
        'eqms_training_available_actions'=> [EqmsTrainingController::class, 'availableActions'],
        'eqms_training_export'           => [EqmsTrainingController::class, 'export'],
        // Workflow action aliases — each maps to its dedicated action method
        'eqms_training_action_launch_session'       => [EqmsTrainingController::class, 'actionLaunchSession'],
        'eqms_training_action_record_completion'    => [EqmsTrainingController::class, 'actionRecordCompletion'],
        'eqms_training_action_record_assessment'    => [EqmsTrainingController::class, 'actionRecordAssessment'],
        'eqms_training_action_verify_effectiveness' => [EqmsTrainingController::class, 'actionVerifyEffectiveness'],
        'eqms_training_action_expire'               => [EqmsTrainingController::class, 'actionExpire'],
        'eqms_training_action_waive'                => [EqmsTrainingController::class, 'actionWaive'],
        'eqms_training_action_assign'               => [EqmsTrainingController::class, 'actionAssign'],
    ]);

    // Module 51: eqms-suppliers.js
    $router->actions([
        'eqms_suppliers_query'    => [EqmsSuppliersController::class, 'search'],
        'eqms_suppliers_detail'   => [EqmsSuppliersController::class, 'detail'],
        'eqms_suppliers_create'   => [EqmsSuppliersController::class, 'create'],
        'eqms_suppliers_update'   => [EqmsSuppliersController::class, 'update'],
        'eqms_suppliers_metrics'  => [EqmsSuppliersController::class, 'metrics'],
        'eqms_suppliers_audit'    => [EqmsSuppliersController::class, 'audit'],
        'eqms_suppliers_export'            => [EqmsSuppliersController::class, 'exportBulk'],
        'eqms_suppliers_action_qualify'    => [EqmsSuppliersController::class, 'actionQualify'],
        'eqms_suppliers_action_disqualify' => [EqmsSuppliersController::class, 'actionDisqualify'],
    ]);

    // Module 52: eqms-supplier-audits.js
    $router->actions([
        'eqms_supplier_audits_query'   => [EqmsSupplierAuditsController::class, 'search'],
        'eqms_supplier_audits_detail'  => [EqmsSupplierAuditsController::class, 'detail'],
        'eqms_supplier_audits_create'  => [EqmsSupplierAuditsController::class, 'create'],
        'eqms_supplier_audits_update'  => [EqmsSupplierAuditsController::class, 'update'],
        'eqms_supplier_audits_metrics' => [EqmsSupplierAuditsController::class, 'metrics'],
        'eqms_scars_query'             => [EqmsSupplierAuditsController::class, 'scarQuery'],
        'eqms_scars_detail'            => [EqmsSupplierAuditsController::class, 'scarDetail'],
        'eqms_scars_create'            => [EqmsSupplierAuditsController::class, 'scarCreate'],
        'eqms_scars_update'                          => [EqmsSupplierAuditsController::class, 'scarUpdate'],
        'eqms_supplier_audits_action_schedule'       => [EqmsSupplierAuditsController::class, 'actionSchedule'],
        'eqms_supplier_audits_action_start'          => [EqmsSupplierAuditsController::class, 'actionStart'],
        'eqms_supplier_audits_action_record_finding' => [EqmsSupplierAuditsController::class, 'actionRecordFinding'],
        'eqms_supplier_audits_action_issue_scar'     => [EqmsSupplierAuditsController::class, 'actionIssueScar'],
        'eqms_supplier_audits_action_close'          => [EqmsSupplierAuditsController::class, 'actionClose'],
        'eqms_supplier_audits_action_cancel'         => [EqmsSupplierAuditsController::class, 'actionCancel'],
        'eqms_scars_action_assign'                   => [EqmsSupplierAuditsController::class, 'scarActionAssign'],
        'eqms_scars_action_submit_response'          => [EqmsSupplierAuditsController::class, 'scarActionSubmitResponse'],
        'eqms_scars_action_verify_effectiveness'     => [EqmsSupplierAuditsController::class, 'scarActionVerifyEffectiveness'],
        'eqms_scars_action_close'                    => [EqmsSupplierAuditsController::class, 'scarActionClose'],
    ]);

    // Module 53: eqms-risks.js
    $router->actions([
        'eqms_risks_query'      => [EqmsRisksController::class, 'search'],
        'eqms_risks_detail'     => [EqmsRisksController::class, 'detail'],
        'eqms_risks_update'     => [EqmsRisksController::class, 'update'],
        'eqms_risks_metrics'    => [EqmsRisksController::class, 'metrics'],
        'eqms_risks_audit'      => [EqmsRisksController::class, 'audit'],
        'eqms_risks_signatures' => [EqmsRisksController::class, 'signatures'],
        'eqms_risks_heatmap'    => [EqmsRisksController::class, 'heatmap'],
        'eqms_fmea_query'       => [EqmsRisksController::class, 'fmeaQuery'],
        'eqms_fmea_detail'      => [EqmsRisksController::class, 'fmeaDetail'],
        'eqms_fmea_update'                       => [EqmsRisksController::class, 'fmeaUpdate'],
        'eqms_risks_action_assess'               => [EqmsRisksController::class, 'actionAssess'],
        'eqms_risks_action_add_control'          => [EqmsRisksController::class, 'actionAddControl'],
        'eqms_risks_action_verify_control'       => [EqmsRisksController::class, 'actionVerifyControl'],
        'eqms_risks_action_accept_residual_risk' => [EqmsRisksController::class, 'actionAcceptResidualRisk'],
        'eqms_risks_action_review'               => [EqmsRisksController::class, 'actionReview'],
    ]);

    // Module 54: eqms-calibration.js
    $router->actions([
        'eqms_calibration_query'      => [EqmsCalibrationController::class, 'search'],
        'eqms_calibration_detail'     => [EqmsCalibrationController::class, 'detail'],
        'eqms_calibration_create'     => [EqmsCalibrationController::class, 'create'],
        'eqms_calibration_update'     => [EqmsCalibrationController::class, 'update'],
        'eqms_calibration_metrics'    => [EqmsCalibrationController::class, 'metrics'],
        'eqms_calibration_audit'      => [EqmsCalibrationController::class, 'audit'],
        'eqms_calibration_signatures' => [EqmsCalibrationController::class, 'signatures'],
        'eqms_calibration_export'     => [EqmsCalibrationController::class, 'export'],
        'eqms_msa_query'              => [EqmsCalibrationController::class, 'msaQuery'],
        'eqms_msa_detail'             => [EqmsCalibrationController::class, 'msaDetail'],
        'eqms_msa_create'             => [EqmsCalibrationController::class, 'msaCreate'],
        'eqms_msa_export'             => [EqmsCalibrationController::class, 'msaExport'],
        'eqms_calibration_action_start'          => [EqmsCalibrationController::class, 'actionStart'],
        'eqms_calibration_action_record_result'  => [EqmsCalibrationController::class, 'actionRecordResult'],
        'eqms_calibration_action_submit_review'  => [EqmsCalibrationController::class, 'actionSubmitReview'],
        'eqms_calibration_action_approve'        => [EqmsCalibrationController::class, 'actionApprove'],
        'eqms_calibration_action_declare_oot'    => [EqmsCalibrationController::class, 'actionDeclareOot'],
        'eqms_calibration_action_close'          => [EqmsCalibrationController::class, 'actionClose'],
    ]);

    // Module 55: eqms-lab-investigations.js
    $router->actions([
        'eqms_lab_investigations_query'      => [EqmsLabInvestigationsController::class, 'search'],
        'eqms_lab_investigations_detail'     => [EqmsLabInvestigationsController::class, 'detail'],
        'eqms_lab_investigations_create'     => [EqmsLabInvestigationsController::class, 'create'],
        'eqms_lab_investigations_update'     => [EqmsLabInvestigationsController::class, 'update'],
        'eqms_lab_investigations_metrics'    => [EqmsLabInvestigationsController::class, 'metrics'],
        'eqms_lab_investigations_audit'      => [EqmsLabInvestigationsController::class, 'audit'],
        'eqms_lab_investigations_signatures' => [EqmsLabInvestigationsController::class, 'signatures'],
        'eqms_lab_investigations_export'                   => [EqmsLabInvestigationsController::class, 'export'],
        'eqms_lab_investigations_action_intake_oos'        => [EqmsLabInvestigationsController::class, 'actionIntakeOos'],
        'eqms_lab_investigations_action_intake_oot'        => [EqmsLabInvestigationsController::class, 'actionIntakeOot'],
        'eqms_lab_investigations_action_start_phase1'      => [EqmsLabInvestigationsController::class, 'actionStartPhase1'],
        'eqms_lab_investigations_action_start_phase2'      => [EqmsLabInvestigationsController::class, 'actionStartPhase2'],
        'eqms_lab_investigations_action_request_retest'    => [EqmsLabInvestigationsController::class, 'actionRequestRetest'],
        'eqms_lab_investigations_action_request_resample'  => [EqmsLabInvestigationsController::class, 'actionRequestResample'],
        'eqms_lab_investigations_action_link_capa'         => [EqmsLabInvestigationsController::class, 'actionLinkCapa'],
        'eqms_lab_investigations_action_close'             => [EqmsLabInvestigationsController::class, 'actionClose'],
    ]);

    // Module 58: eqms-batch-release.js
    $router->actions([
        'eqms_batch_release_query'      => [EqmsBatchReleaseController::class, 'search'],
        'eqms_batch_release_detail'     => [EqmsBatchReleaseController::class, 'detail'],
        'eqms_batch_release_create'     => [EqmsBatchReleaseController::class, 'create'],
        'eqms_batch_release_update'     => [EqmsBatchReleaseController::class, 'update'],
        'eqms_batch_release_metrics'    => [EqmsBatchReleaseController::class, 'metrics'],
        'eqms_batch_release_audit'      => [EqmsBatchReleaseController::class, 'audit'],
        'eqms_batch_release_signatures' => [EqmsBatchReleaseController::class, 'signatures'],
        'eqms_batch_release_export'                    => [EqmsBatchReleaseController::class, 'export'],
        'eqms_batch_release_action_aggregate_data'     => [EqmsBatchReleaseController::class, 'actionAggregateData'],
        'eqms_batch_release_action_review_exceptions'  => [EqmsBatchReleaseController::class, 'actionReviewExceptions'],
        'eqms_batch_release_action_approve_release'    => [EqmsBatchReleaseController::class, 'actionApproveRelease'],
        'eqms_batch_release_action_hold_release'       => [EqmsBatchReleaseController::class, 'actionHoldRelease'],
        'eqms_batch_release_action_market_ship'        => [EqmsBatchReleaseController::class, 'actionMarketShip'],
    ]);

    // Module 59: eqms-validation.js
    $router->actions([
        'eqms_validation_projects_query'  => [EqmsValidationController::class, 'projectsQuery'],
        'eqms_validation_projects_detail' => [EqmsValidationController::class, 'projectDetail'],
        'eqms_validation_projects_create' => [EqmsValidationController::class, 'projectCreate'],
        'eqms_validation_projects_update' => [EqmsValidationController::class, 'projectUpdate'],
        'eqms_validation_metrics'         => [EqmsValidationController::class, 'projectsMetrics'],
        'eqms_validation_audit'           => [EqmsValidationController::class, 'projectAudit'],
        'eqms_validation_signatures'      => [EqmsValidationController::class, 'projectSignatures'],
        'eqms_validation_export'          => [EqmsValidationController::class, 'exportBulk'],
        'eqms_validation_trace_matrix'                 => [EqmsValidationController::class, 'traceMatrix'],
        'eqms_validation_action_approve_protocol'      => [EqmsValidationController::class, 'protocolActionApprove'],
        'eqms_validation_action_start_execution'       => [EqmsValidationController::class, 'executionActionStart'],
        'eqms_validation_action_record_result'         => [EqmsValidationController::class, 'executionActionRecordResult'],
        'eqms_validation_action_log_deviation'         => [EqmsValidationController::class, 'executionActionLogDeviation'],
        'eqms_validation_action_generate_summary'      => [EqmsValidationController::class, 'executionActionGenerateSummary'],
    ]);

    // Module 60: eqms-field-actions.js
    $router->actions([
        'eqms_field_actions_query'      => [EqmsFieldActionsController::class, 'search'],
        'eqms_field_actions_detail'     => [EqmsFieldActionsController::class, 'detail'],
        'eqms_field_actions_create'     => [EqmsFieldActionsController::class, 'create'],
        'eqms_field_actions_update'     => [EqmsFieldActionsController::class, 'update'],
        'eqms_field_actions_metrics'    => [EqmsFieldActionsController::class, 'metrics'],
        'eqms_field_actions_audit'      => [EqmsFieldActionsController::class, 'audit'],
        'eqms_field_actions_signatures' => [EqmsFieldActionsController::class, 'signatures'],
        'eqms_field_actions_export'                      => [EqmsFieldActionsController::class, 'export'],
        'eqms_field_actions_action_evaluate'             => [EqmsFieldActionsController::class, 'actionEvaluate'],
        'eqms_field_actions_action_plan'                 => [EqmsFieldActionsController::class, 'actionPlan'],
        'eqms_field_actions_action_launch'               => [EqmsFieldActionsController::class, 'actionLaunch'],
        'eqms_field_actions_action_notify_customers'     => [EqmsFieldActionsController::class, 'actionNotifyCustomers'],
        'eqms_field_actions_action_record_effectiveness' => [EqmsFieldActionsController::class, 'actionRecordEffectiveness'],
        'eqms_field_actions_action_close'                => [EqmsFieldActionsController::class, 'actionClose'],
    ]);

    // Module 61: eqms-genealogy.js
    $router->actions([
        'eqms_genealogy_query'                => [EqmsGenealogyController::class, 'search'],
        'eqms_genealogy_detail'               => [EqmsGenealogyController::class, 'detail'],
        'eqms_genealogy_lookup'               => [EqmsGenealogyController::class, 'lookup'],
        'eqms_genealogy_metrics'              => [EqmsGenealogyController::class, 'metrics'],
        'eqms_genealogy_export'               => [EqmsGenealogyController::class, 'export'],
        'eqms_genealogy_expand_upstream'      => [EqmsGenealogyController::class, 'actionExpandUpstream'],
        'eqms_genealogy_expand_downstream'    => [EqmsGenealogyController::class, 'actionExpandDownstream'],
        'eqms_genealogy_freeze_trace_report'  => [EqmsGenealogyController::class, 'actionFreezeTraceReport'],
    ]);

    // Module 62: eqms-quality-agreements.js
    $router->actions([
        'eqms_quality_agreements_query'      => [EqmsSuppliersController::class, 'qualityAgreementsSearch'],
        'eqms_quality_agreements_detail'     => [EqmsSuppliersController::class, 'qualityAgreements'],
        'eqms_quality_agreements_create'     => [EqmsSuppliersController::class, 'createQualityAgreement'],
        'eqms_quality_agreements_update'     => [EqmsSuppliersController::class, 'createQualityAgreement'],
        'eqms_quality_agreements_audit'      => [EqmsSuppliersController::class, 'audit'],
        'eqms_quality_agreements_signatures' => [EqmsSuppliersController::class, 'audit'],
        'eqms_quality_agreements_export'     => [EqmsSuppliersController::class, 'exportBulk'],
    ]);

    // Module 41: eqms-quality-tower.js (uses REST paths primarily, aliases for fallback)
    $router->actions([
        'eqms_quality_tower_dashboard' => [EqmsQualityTowerController::class, 'dashboard'],
        'eqms_quality_tower_metrics'   => [EqmsQualityTowerController::class, 'metrics'],
        'eqms_quality_tower_overdue'   => [EqmsQualityTowerController::class, 'overdueActions'],
        'eqms_quality_tower_export'    => [EqmsQualityTowerController::class, 'export'],
    ]);

    // Module 22/22b/22c: additional AI action aliases (name variants used by JS)
    $router->actions([
        // tool_wear_predictions: alternate name for ai_tool_wear
        'tool_wear_predictions'  => [AiSchedulingController::class, 'getToolWearPredictions'],
        // ai_feedback: alternate name for ai_feedback_submit (22c-ai-recommendations.js)
        'ai_feedback'            => [AiSchedulingController::class, 'aiFeedbackSubmit'],
        // ai_conversation_detail: load messages for a specific conversation_id
        'ai_conversation_detail' => [AiSchedulingController::class, 'aiConversationDetail'],
        // ai_spc_predict: SPC forecast overlay
        'ai_spc_predict'         => [AiSchedulingController::class, 'aiSpcPredict'],
        // ai_schedule_optimize: returns schedule optimization suggestions
        'ai_schedule_optimize'   => [AiSchedulingController::class, 'aiScheduleOptimize'],
        // ai_schedule_apply: records advisory review intent; it does not mutate schedule truth
        'ai_schedule_apply'      => [AiSchedulingController::class, 'aiScheduleApply'],
        // ai_schedule_pm: proposes PM for planner review; scheduling remains a planner action
        'ai_schedule_pm'         => [AiSchedulingController::class, 'aiSchedulePm'],
        // ai_machine_telemetry: machine metrics timeseries
        'ai_machine_telemetry'   => [AiSchedulingController::class, 'aiMachineTelemetry'],
        // ai_operator_guidance: per-machine operator tips
        'ai_operator_guidance'   => [AiSchedulingController::class, 'aiOperatorGuidance'],
    ]);
};
