<?php

declare(strict_types=1);

define('API_HELPERS_ONLY', true);
require_once dirname(__DIR__) . '/api.php';
require_once dirname(__DIR__) . '/api/services/ScheduledJobs.php';

use MOM\Services\ScheduledJobs;

$args = $argv ?? [];
$jobName = '';
$force = false;
$limit = 20;

foreach ($args as $arg) {
    if (!is_string($arg)) {
        continue;
    }
    if (str_starts_with($arg, '--job=')) {
        $jobName = trim(substr($arg, 6));
        continue;
    }
    if ($arg === '--force') {
        $force = true;
        continue;
    }
    if (str_starts_with($arg, '--limit=')) {
        $limit = max(1, min(50, (int)substr($arg, 8)));
    }
}

if ($jobName === '') {
    fwrite(STDERR, "Missing --job option.\n");
    exit(1);
}

$jobs = new ScheduledJobs($DATA_DIR);

$dispatch = [
    'daily_kpi_snapshot' => static fn() => $jobs->runDailyKpiSnapshot(),
    'weekly_report' => static fn() => $jobs->runWeeklyReport(),
    'calibration_alerts' => static fn() => $jobs->runCalibrationAlerts(),
    'training_alerts' => static fn() => $jobs->runTrainingAlerts(),
    'supplier_scoring' => static fn() => $jobs->runSupplierScoring(),
    'notification_digest' => static fn() => $jobs->runNotificationDigest(),
    'data_purge' => static fn() => $jobs->runDataPurge(),
    'mtconnect_poll_cycle' => static fn() => $jobs->runMtconnectPollingCycle($force, $limit),
    'evidence_review_sla_notifications' => static fn() => $jobs->runEvidenceReviewSlaNotifications(),
    'deploy_drill_reminders' => static fn() => $jobs->runDeployDrillReminders(),
    'epicor_inbound_sync' => static fn() => $jobs->runEpicorInboundSync(),
    'epicor_outbox_worker' => static fn() => $jobs->runEpicorOutboxWorker($limit),
];

if (!isset($dispatch[$jobName])) {
    fwrite(STDERR, "Unknown job: {$jobName}\n");
    fwrite(STDERR, 'Available jobs: ' . implode(', ', array_keys($dispatch)) . "\n");
    exit(2);
}

$result = $dispatch[$jobName]();
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
exit(($result['status'] ?? '') === 'failed' ? 3 : 0);
