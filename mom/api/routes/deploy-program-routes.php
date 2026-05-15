<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    $router->actions([
        'deploy_state_load'        => [DeployProgramController::class, 'loadState'],
        'deploy_program_get'       => [DeployProgramController::class, 'getProgram'],
        'deploy_users_list'        => [DeployProgramController::class, 'listUsers'],
        'deploy_readiness_cycle'   => [DeployProgramController::class, 'cycleReadiness'],
        'deploy_metric_update'     => [DeployProgramController::class, 'updateMetric'],
        'deploy_checklist_toggle'  => [DeployProgramController::class, 'toggleChecklist'],
        'deploy_phase_set'         => [DeployProgramController::class, 'setPhase'],
        'deploy_week_set'          => [DeployProgramController::class, 'setCurrentWeek'],
        'deploy_week_signoff'      => [DeployProgramController::class, 'signOffWeek'],
        'deploy_meeting_save'      => [DeployProgramController::class, 'saveMeeting'],
        'deploy_meeting_signoff'   => [DeployProgramController::class, 'signOffMeeting'],
        'deploy_department_roster_save' => [DeployProgramController::class, 'saveDepartmentRoster'],
        'deploy_champion_save'     => [DeployProgramController::class, 'saveChampion'],
        'deploy_champion_ojt_save' => [DeployProgramController::class, 'saveChampionOjt'],
        'deploy_issue_save'        => [DeployProgramController::class, 'saveIssue'],
        'deploy_drill_record'      => [DeployProgramController::class, 'recordDrill'],
        'deploy_drill_reminders_run' => [DeployProgramController::class, 'runDrillReminders'],
        'deploy_availability_save' => [DeployProgramController::class, 'saveAvailability'],
        'deploy_availability_check' => [DeployProgramController::class, 'checkAvailability'],
        'deploy_audit_save'        => [DeployProgramController::class, 'saveAudit'],
        'deploy_audit_finding_save'=> [DeployProgramController::class, 'saveFinding'],
        'deploy_review_save'       => [DeployProgramController::class, 'saveReview'],
        'deploy_review_signoff'    => [DeployProgramController::class, 'signOffReview'],
        'deploy_capa_bridge'       => [DeployProgramController::class, 'bridgeCapa'],
        'deploy_state_reset'       => [DeployProgramController::class, 'resetState'],
    ]);
    $router->get('/api/v1/deploy/program', DeployProgramController::class, 'getProgram');
    $router->get('/mom/api/v1/deploy/program', DeployProgramController::class, 'getProgram');
};
