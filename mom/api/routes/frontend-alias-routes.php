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
        // ai_schedule_apply: applies an optimization result
        'ai_schedule_apply'      => [AiSchedulingController::class, 'aiScheduleApply'],
        // ai_schedule_pm: schedule preventive maintenance for a tool/machine
        'ai_schedule_pm'         => [AiSchedulingController::class, 'aiSchedulePm'],
        // ai_machine_telemetry: machine metrics timeseries
        'ai_machine_telemetry'   => [AiSchedulingController::class, 'aiMachineTelemetry'],
        // ai_operator_guidance: per-machine operator tips
        'ai_operator_guidance'   => [AiSchedulingController::class, 'aiOperatorGuidance'],
    ]);
};
