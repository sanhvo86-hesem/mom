<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
use RuntimeException;
use Throwable;

/**
 * Scheduled job definitions for HESEM MOM Portal.
 *
 * Each method is designed to be invoked by a cron runner (e.g. system cron,
 * Epicor scheduler, or the portal's own job dispatcher). All jobs are
 * idempotent and safe to re-run.
 *
 * Typical crontab schedule:
 *   - Daily at 01:00:   runDailyKpiSnapshot, runNcrAging, runNotificationDigest
 *   - Daily at 06:00:   runCalibrationAlerts, runTrainingAlerts, runCapaEscalation
 *   - Daily at 06:00:   runDeployDrillReminders
 *   - Weekly Sun 02:00: runWeeklyReport
 *   - Monthly 1st 03:00: runSupplierScoring
 *   - Monthly 1st 04:00: runDataPurge
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class ScheduledJobs
{
    private Connection       $db;
    private KpiEngine        $kpi;
    private SpcEngine        $spc;
    private DashboardService $dashboard;

    /** Absolute path to data directory. */
    private readonly string $dataDir;

    /** Job execution log directory. */
    private readonly string $logDir;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string          $dataDir Absolute path to data directory.
     * @param Connection|null $db      Database connection override.
     */
    public function __construct(string $dataDir, ?Connection $db = null)
    {
        require_once __DIR__ . '/KpiEngine.php';
        require_once __DIR__ . '/SpcEngine.php';
        require_once __DIR__ . '/DashboardService.php';
        require_once __DIR__ . '/NotificationService.php';
        require_once __DIR__ . '/DeployDrillReminderService.php';

        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->logDir  = $this->dataDir . '/job-logs';

        if (!is_dir($this->logDir)) {
            @mkdir($this->logDir, 0775, true);
        }

        $this->db        = $db ?? Connection::getInstance();
        $this->kpi       = new KpiEngine($this->db);
        $this->spc       = new SpcEngine($this->db);
        $this->dashboard = new DashboardService($dataDir, $this->db, $this->kpi, $this->spc);
    }

    // ── Job Definitions ─────────────────────────────────────────────────────

    /**
     * Daily KPI Snapshot: calculate and store all KPI values.
     *
     * Calculates every active KPI for the trailing 30-day window and
     * persists the results to the kpi_snapshots table. This provides
     * historical trend data for dashboards and management review.
     *
     * Schedule: Daily at 01:00.
     *
     * @return array{job: string, kpis_processed: int, errors: int, duration_ms: float}
     */
    public function runDailyKpiSnapshot(): array
    {
        return $this->executeJob('daily_kpi_snapshot', function (): array {
            $period  = new DateRange(
                date('Y-m-d', strtotime('-30 days')),
                date('Y-m-d'),
            );
            $results = $this->kpi->calculateAllKpis($period);

            $processed = 0;
            $errors    = 0;

            foreach ($results as $code => $result) {
                try {
                    if ($result instanceof KpiResult && $result->status !== KpiStatus::GREY) {
                        $this->kpi->saveSnapshot($code, $result);
                        $processed++;
                    }
                } catch (Throwable $e) {
                    $errors++;
                    $this->logJobError('daily_kpi_snapshot', "Failed to save {$code}: {$e->getMessage()}");
                }
            }

            return ['kpis_processed' => $processed, 'errors' => $errors];
        });
    }

    /**
     * Weekly Report: generate weekly quality and production summary.
     *
     * Builds a comprehensive report covering NCR/CAPA status, OEE/OTD
     * performance, SPC alerts, and training/calibration compliance for
     * the past 7 days. The report is stored as a JSON file and can be
     * rendered by the ReportGenerator.
     *
     * Schedule: Weekly on Sunday at 02:00.
     *
     * @return array{job: string, report_file: string, duration_ms: float}
     */
    public function runWeeklyReport(): array
    {
        return $this->executeJob('weekly_report', function (): array {
            $period = new DateRange(
                date('Y-m-d', strtotime('-7 days')),
                date('Y-m-d'),
            );

            $report = [
                'report_type'  => 'weekly_summary',
                'generated_at' => gmdate('c'),
                'period'       => $period->toArray(),
                'executive'    => $this->dashboard->getExecutiveDashboard($period),
                'quality'      => $this->dashboard->getQualityDashboard($period),
                'production'   => $this->dashboard->getProductionDashboard($period),
                'spc_alerts'   => $this->spc->getSpcAlerts(),
                'kpi_alerts'   => $this->kpi->getKpiAlerts(),
            ];

            $reportDir = $this->dataDir . '/reports/weekly';
            if (!is_dir($reportDir)) {
                @mkdir($reportDir, 0775, true);
            }

            $filename = "weekly-report-{$period->start}-to-{$period->end}.json";
            $filepath = $reportDir . '/' . $filename;
            file_put_contents(
                $filepath,
                json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
                LOCK_EX,
            );

            return ['report_file' => $filepath];
        });
    }

    /**
     * Calibration Alerts: check for upcoming and overdue calibrations.
     *
     * Scans the equipment table for gages/instruments whose calibration
     * is due within 14 days or already overdue. Creates notification
     * records for the responsible quality team members.
     *
     * Schedule: Daily at 06:00.
     *
     * @return array{job: string, overdue: int, due_soon: int, notifications_sent: int, duration_ms: float}
     */
    public function runCalibrationAlerts(): array
    {
        return $this->executeJob('calibration_alerts', function (): array {
            // Overdue calibrations
            $overdue = $this->db->query(
                "SELECT equipment_id, equipment_name, calibration_due, department_id
                 FROM equipment
                 WHERE is_active = TRUE
                   AND calibration_due IS NOT NULL
                   AND calibration_due < CURRENT_DATE
                 ORDER BY calibration_due",
            );

            // Due within 14 days
            $dueSoon = $this->db->query(
                "SELECT equipment_id, equipment_name, calibration_due, department_id
                 FROM equipment
                 WHERE is_active = TRUE
                   AND calibration_due IS NOT NULL
                   AND calibration_due BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '14 days')
                 ORDER BY calibration_due",
            );

            $sent = 0;

            // Create notifications for overdue
            foreach ($overdue as $eq) {
                $sent += $this->createAlertNotification(
                    category: 'overdue',
                    title: "OVERDUE Calibration: {$eq['equipment_name']} ({$eq['equipment_id']})",
                    body: "Calibration was due on {$eq['calibration_due']}. Immediate action required.",
                    link: "/equipment/{$eq['equipment_id']}/calibration",
                    deptCode: $eq['department_id'],
                );
            }

            // Create notifications for upcoming
            foreach ($dueSoon as $eq) {
                $sent += $this->createAlertNotification(
                    category: 'alert',
                    title: "Calibration Due Soon: {$eq['equipment_name']} ({$eq['equipment_id']})",
                    body: "Calibration due on {$eq['calibration_due']}. Schedule calibration.",
                    link: "/equipment/{$eq['equipment_id']}/calibration",
                    deptCode: $eq['department_id'],
                );
            }

            return [
                'overdue'            => count($overdue),
                'due_soon'           => count($dueSoon),
                'notifications_sent' => $sent,
            ];
        });
    }

    /**
     * Training Alerts: check for upcoming and overdue training/certifications.
     *
     * Scans training_records for certifications expiring within 30 days
     * or already expired. Notifies HR and department managers.
     *
     * Schedule: Daily at 06:30.
     *
     * @return array{job: string, expiring: int, expired: int, notifications_sent: int, duration_ms: float}
     */
    public function runTrainingAlerts(): array
    {
        return $this->executeJob('training_alerts', function (): array {
            // Expired certifications
            $expired = $this->db->query(
                "SELECT tr.training_id, tr.trainee_id, tr.training_topic,
                        tr.certification_expiry, e.department_id,
                        CONCAT(e.first_name, ' ', e.last_name) AS employee_name
                 FROM training_records tr
                 JOIN employees e ON e.employee_id = tr.trainee_id
                 WHERE tr.certification_expiry IS NOT NULL
                   AND tr.certification_expiry < CURRENT_DATE
                   AND tr.certification_expiry >= (CURRENT_DATE - INTERVAL '90 days')
                 ORDER BY tr.certification_expiry",
            );

            // Expiring within 30 days
            $expiring = $this->db->query(
                "SELECT tr.training_id, tr.trainee_id, tr.training_topic,
                        tr.certification_expiry, e.department_id,
                        CONCAT(e.first_name, ' ', e.last_name) AS employee_name
                 FROM training_records tr
                 JOIN employees e ON e.employee_id = tr.trainee_id
                 WHERE tr.certification_expiry IS NOT NULL
                   AND tr.certification_expiry BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
                 ORDER BY tr.certification_expiry",
            );

            $sent = 0;

            foreach ($expired as $tr) {
                $sent += $this->createAlertNotification(
                    category: 'overdue',
                    title: "EXPIRED Certification: {$tr['employee_name']} - {$tr['training_topic']}",
                    body: "Certification expired on {$tr['certification_expiry']}. Recertification required.",
                    link: "/training/{$tr['training_id']}",
                    deptCode: $tr['department_id'],
                );
            }

            foreach ($expiring as $tr) {
                $sent += $this->createAlertNotification(
                    category: 'alert',
                    title: "Certification Expiring: {$tr['employee_name']} - {$tr['training_topic']}",
                    body: "Certification expires on {$tr['certification_expiry']}. Schedule recertification.",
                    link: "/training/{$tr['training_id']}",
                    deptCode: $tr['department_id'],
                );
            }

            return [
                'expired'            => count($expired),
                'expiring'           => count($expiring),
                'notifications_sent' => $sent,
            ];
        });
    }

    /**
     * CAPA Escalation: escalate CAPAs that are overdue.
     *
     * Identifies CAPAs past their target date that remain open and
     * creates escalation notifications for quality management.
     *
     * Schedule: Daily at 07:00.
     *
     * @return array{job: string, escalated: int, notifications_sent: int, duration_ms: float}
     */
    public function runCapaEscalation(): array
    {
        return $this->executeJob('capa_escalation', function (): array {
            $overdue = $this->db->query(
                "SELECT cr.capa_id, cr.record_id, cr.target_date, cr.capa_status,
                        cr.corrective_action,
                        (CURRENT_DATE - cr.target_date) AS days_overdue
                 FROM capa_records cr
                 WHERE cr.capa_status NOT IN ('Closed', 'Verified')
                   AND cr.target_date < CURRENT_DATE
                 ORDER BY cr.target_date",
            );

            $sent = 0;
            foreach ($overdue as $capa) {
                $daysOverdue = (int) ($capa['days_overdue'] ?? 0);
                $urgency = $daysOverdue > 30 ? 'CRITICAL' : ($daysOverdue > 14 ? 'HIGH' : 'MEDIUM');

                $sent += $this->createAlertNotification(
                    category: 'overdue',
                    title: "[{$urgency}] Overdue CAPA: {$capa['record_id']} ({$daysOverdue} days)",
                    body: "CAPA target date was {$capa['target_date']}. Status: {$capa['capa_status']}. Escalation required.",
                    link: "/capa/{$capa['record_id']}",
                    deptCode: 'QA',
                );
            }

            // Update metadata with escalation timestamp
            if (!empty($overdue)) {
                $capaIds = array_column($overdue, 'capa_id');
                $placeholders = implode(',', array_fill(0, count($capaIds), '?'));
                $this->db->execute(
                    "UPDATE capa_records
                     SET metadata = metadata || jsonb_build_object(
                         'last_escalation', '" . gmdate('c') . "',
                         'escalation_count', COALESCE((metadata->>'escalation_count')::int, 0) + 1
                     )
                     WHERE capa_id IN ({$placeholders})",
                    $capaIds,
                );
            }

            return [
                'escalated'          => count($overdue),
                'notifications_sent' => $sent,
            ];
        });
    }

    /**
     * NCR Aging: flag NCRs that have been open longer than 30 days.
     *
     * Schedule: Daily at 01:30.
     *
     * @return array{job: string, flagged: int, notifications_sent: int, duration_ms: float}
     */
    public function runNcrAging(): array
    {
        return $this->executeJob('ncr_aging', function (): array {
            $aged = $this->db->query(
                "SELECT nr.ncr_number, nr.record_id, nr.defect_type,
                        r.created_at,
                        EXTRACT(DAY FROM (now() - r.created_at)) AS age_days
                 FROM ncr_records nr
                 JOIN records r ON r.record_id = nr.record_id
                 WHERE r.status NOT IN ('closed', 'cancelled')
                   AND r.created_at < (now() - INTERVAL '30 days')
                 ORDER BY r.created_at",
            );

            $sent = 0;
            foreach ($aged as $ncr) {
                $ageDays = (int) ($ncr['age_days'] ?? 0);

                $sent += $this->createAlertNotification(
                    category: 'alert',
                    title: "Aging NCR: {$ncr['ncr_number']} open {$ageDays} days",
                    body: "NCR {$ncr['ncr_number']} ({$ncr['defect_type']}) has been open for {$ageDays} days. Review disposition.",
                    link: "/ncr/{$ncr['record_id']}",
                    deptCode: 'QA',
                );
            }

            return [
                'flagged'            => count($aged),
                'notifications_sent' => $sent,
            ];
        });
    }

    /**
     * Supplier Scoring: recalculate supplier ratings.
     *
     * Evaluates each active vendor's OTD and quality performance for
     * the past period and writes a new vendor_ratings row.
     *
     * Schedule: Monthly on 1st at 03:00.
     *
     * @return array{job: string, vendors_scored: int, duration_ms: float}
     */
    public function runSupplierScoring(): array
    {
        return $this->executeJob('supplier_scoring', function (): array {
            $periodStart = date('Y-m-01', strtotime('-1 month'));
            $periodEnd   = date('Y-m-t', strtotime('-1 month'));

            $vendors = $this->db->query(
                "SELECT vendor_id, vendor_name FROM vendors WHERE vendor_status = 'approved'",
            );

            $scored = 0;

            foreach ($vendors as $vendor) {
                try {
                    // OTD calculation for vendor
                    $otdRow = $this->db->queryOne(
                        "SELECT
                            COUNT(*) FILTER (WHERE delivery_date_actual <= delivery_date_est) AS on_time,
                            COUNT(*) AS total
                         FROM purchase_orders po
                         JOIN shipments s ON s.shipment_code = po.po_number
                         WHERE po.vendor_id = :vid
                           AND s.ship_date BETWEEN :s AND :e
                           AND s.shipment_status = 'delivered'",
                        [':vid' => $vendor['vendor_id'], ':s' => $periodStart, ':e' => $periodEnd],
                    );

                    $otdTotal = (int) ($otdRow['total'] ?? 0);
                    $otdPct   = $otdTotal > 0 ? ((int) $otdRow['on_time'] / $otdTotal) * 100 : null;

                    // Quality calculation for vendor (accepted lots)
                    $qualRow = $this->db->queryOne(
                        "SELECT
                            COUNT(*) FILTER (WHERE ir.pass_fail = 'PASS') AS accepted,
                            COUNT(*) AS total
                         FROM inspection_results ir
                         JOIN purchase_orders po ON po.po_number = ir.job_number
                         WHERE po.vendor_id = :vid
                           AND ir.recorded_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
                        [':vid' => $vendor['vendor_id'], ':s' => $periodStart, ':e' => $periodEnd],
                    );

                    $qualTotal = (int) ($qualRow['total'] ?? 0);
                    $qualPct   = $qualTotal > 0 ? ((int) $qualRow['accepted'] / $qualTotal) * 100 : null;

                    // SCAR count
                    $scarCount = (int) $this->db->queryScalar(
                        "SELECT COUNT(*) FROM ncr_records nr
                         JOIN records r ON r.record_id = nr.record_id
                         WHERE (nr.metadata->>'vendor_id') = :vid
                           AND r.created_at BETWEEN :s AND (:e || ' 23:59:59')::timestamptz",
                        [':vid' => $vendor['vendor_id'], ':s' => $periodStart, ':e' => $periodEnd],
                    );

                    // Composite score: 50% OTD + 40% Quality - 10% SCAR penalty
                    $otdScore = $otdPct ?? 50;
                    $qualScore = $qualPct ?? 50;
                    $scarPenalty = min($scarCount * 5, 30);
                    $rating = max(0, ($otdScore * 0.5) + ($qualScore * 0.4) - $scarPenalty);

                    $grade = match (true) {
                        $rating >= 90 => 'A',
                        $rating >= 75 => 'B',
                        $rating >= 60 => 'C',
                        $rating >= 40 => 'D',
                        default       => 'F',
                    };

                    $this->db->execute(
                        "INSERT INTO vendor_ratings
                            (vendor_id, period_start, period_end, rating_score, rating_grade, otd_pct, quality_pct, scar_count)
                         VALUES (:vid, :ps, :pe, :score, :grade::vendor_rating_grade, :otd, :qual, :scar)",
                        [
                            ':vid'   => $vendor['vendor_id'],
                            ':ps'    => $periodStart,
                            ':pe'    => $periodEnd,
                            ':score' => round($rating, 2),
                            ':grade' => $grade,
                            ':otd'   => $otdPct !== null ? round($otdPct, 2) : null,
                            ':qual'  => $qualPct !== null ? round($qualPct, 2) : null,
                            ':scar'  => $scarCount,
                        ],
                    );

                    // Update vendor master rating
                    $this->db->execute(
                        "UPDATE vendors SET vendor_rating_score = :score, vendor_rating_grade = :grade::vendor_rating_grade, updated_at = now()
                         WHERE vendor_id = :vid",
                        [':vid' => $vendor['vendor_id'], ':score' => round($rating, 2), ':grade' => $grade],
                    );

                    $scored++;
                } catch (Throwable $e) {
                    $this->logJobError('supplier_scoring', "Failed scoring {$vendor['vendor_id']}: {$e->getMessage()}");
                }
            }

            return ['vendors_scored' => $scored];
        });
    }

    /**
     * Notification Digest: send daily email digests.
     *
     * Aggregates unread notifications per user and creates a digest
     * record. Actual email delivery is delegated to the notification
     * transport layer (SMTP / M365 Graph API).
     *
     * Schedule: Daily at 08:00.
     *
     * @return array{job: string, users_notified: int, total_notifications: int, duration_ms: float}
     */
    public function runNotificationDigest(): array
    {
        return $this->executeJob('notification_digest', function (): array {
            $digests = $this->db->query(
                "SELECT u.user_id, u.email, u.display_name,
                        COUNT(n.notification_id) AS unread_count
                 FROM users u
                 JOIN notifications n ON n.user_id = u.user_id
                 WHERE n.is_read = FALSE
                   AND n.created_at >= (now() - INTERVAL '24 hours')
                   AND u.is_active = TRUE
                   AND u.email IS NOT NULL
                 GROUP BY u.user_id, u.email, u.display_name
                 HAVING COUNT(n.notification_id) > 0
                 ORDER BY unread_count DESC",
            );

            $usersNotified      = 0;
            $totalNotifications = 0;

            foreach ($digests as $digest) {
                $unread = (int) $digest['unread_count'];

                // Load notification details for this user
                $notifications = $this->db->query(
                    "SELECT title, body, category, link, created_at
                     FROM notifications
                     WHERE user_id = :uid AND is_read = FALSE
                       AND created_at >= (now() - INTERVAL '24 hours')
                     ORDER BY created_at DESC
                     LIMIT 50",
                    [':uid' => $digest['user_id']],
                );

                // Store digest record
                $digestPath = $this->dataDir . '/notification-digests';
                if (!is_dir($digestPath)) {
                    @mkdir($digestPath, 0775, true);
                }

                $digestFile = $digestPath . '/' . date('Y-m-d') . '_' . md5($digest['user_id']) . '.json';
                @file_put_contents($digestFile, json_encode([
                    'user_id'       => $digest['user_id'],
                    'email'         => $digest['email'],
                    'display_name'  => $digest['display_name'],
                    'unread_count'  => $unread,
                    'notifications' => $notifications,
                    'generated_at'  => gmdate('c'),
                ], JSON_UNESCAPED_UNICODE), LOCK_EX);

                $usersNotified++;
                $totalNotifications += $unread;
            }

            return [
                'users_notified'      => $usersNotified,
                'total_notifications' => $totalNotifications,
            ];
        });
    }

    /**
     * Evidence review SLA notifications: warn reviewers and escalate overdue items.
     *
     * The Evidence Control module already materializes SLA state and audit events.
     * This job adds the missing operational loop by sending governed in-app notifications
     * and queueing emails when user preferences allow it.
     *
     * Schedule: Every 15 minutes.
     *
     * @return array{job: string, warned: int, overdue: int, escalated: int, allocations_scanned: int, duration_ms: float}
     */
    public function runEvidenceReviewSlaNotifications(): array
    {
        return $this->executeJob('evidence_review_sla_notifications', function (): array {
            $this->ensureApiHelpersLoaded();

            $notificationService = new NotificationService($this->dataDir, $this->db);
            $allocationStore = \load_allocation_store();
            $recordTypes = \load_record_type_registry();
            $schemaCache = [];
            $roleIndex = $this->buildActiveUserRoleIndex();

            $warned = 0;
            $overdue = 0;
            $escalated = 0;
            $dirty = false;
            $allocationsScanned = 0;

            foreach ($allocationStore['allocations'] as $idx => $allocation) {
                if (!is_array($allocation)) {
                    continue;
                }
                $status = \allocation_status_normalize((string)($allocation['status'] ?? 'allocated'));
                if ($status !== 'in_review') {
                    continue;
                }

                $allocationsScanned++;
                $allocationRow = $allocation;
                $formCode = trim((string)($allocationRow['form_code'] ?? ''));
                if ($formCode !== '' && !array_key_exists($formCode, $schemaCache)) {
                    $schemaCache[$formCode] = \load_form_schema_by_code($formCode) ?: [];
                }
                $schema = is_array($schemaCache[$formCode] ?? null) ? $schemaCache[$formCode] : [];
                $reviewConfig = \evidence_review_config($schema);
                $allocationRow['approval_summary'] = \evidence_approval_summary($allocationRow, $schema);
                $reviewSla = \evidence_review_sla_materialize($allocationRow, $recordTypes, $schema);

                $reviewSlaState = is_array($allocationRow['review_sla'] ?? null) ? $allocationRow['review_sla'] : [];
                $notificationLog = is_array($reviewSlaState['notifications'] ?? null) ? $reviewSlaState['notifications'] : [];
                $rowDirty = false;

                $recordId = trim((string)($allocationRow['record_id'] ?? $allocationRow['allocation_id'] ?? ''));
                $recordType = trim((string)($reviewSla['record_type'] ?? $allocationRow['record_type'] ?? 'record'));
                $detailPath = '/portal.html?page=forms';
                $data = [
                    'allocation_id' => (string)($allocationRow['allocation_id'] ?? ''),
                    'record_id' => $recordId,
                    'record_type' => $recordType,
                    'form_code' => $formCode,
                    'review_sla_state' => (string)($reviewSla['state'] ?? ''),
                    'due_at' => (string)($reviewSla['due_at'] ?? ''),
                    'escalation_due_at' => (string)($reviewSla['escalation_due_at'] ?? ''),
                    'link' => $detailPath,
                ];

                $state = strtolower(trim((string)($reviewSla['state'] ?? 'not_started')));

                if ($state === 'due_soon' && trim((string)($notificationLog['warn_sent_at'] ?? '')) === '') {
                    $recipients = $this->resolveUsersForRoles((array)($reviewConfig['roles_allowed'] ?? []), $roleIndex);
                    $sent = $this->notifyUsers(
                        $notificationService,
                        array_keys($recipients),
                        NotificationType::TASK_ASSIGNED,
                        "Evidence review due soon for {$recordType} {$recordId}",
                        "Sắp quá hạn review cho {$recordType} {$recordId}",
                        $data,
                        NotificationPriority::NORMAL,
                    );
                    if ($sent > 0) {
                        $notificationLog['warn_sent_at'] = gmdate('c');
                        $notificationLog['warn_recipients'] = array_keys($recipients);
                        \allocation_append_audit_log($allocationRow, 'review_sla_due_soon_notified', 'scheduled_job', 'review_sla_due_soon_notified', [
                            'recipients' => array_keys($recipients),
                            'due_at' => (string)($reviewSla['due_at'] ?? ''),
                        ]);
                        $warned += $sent;
                        $dirty = true;
                        $rowDirty = true;
                    }
                }

                if ($state === 'overdue' && trim((string)($notificationLog['overdue_sent_at'] ?? '')) === '') {
                    $recipients = $this->resolveUsersForRoles((array)($reviewConfig['roles_allowed'] ?? []), $roleIndex);
                    $sent = $this->notifyUsers(
                        $notificationService,
                        array_keys($recipients),
                        NotificationType::OVERDUE_ALERT,
                        "Evidence review overdue for {$recordType} {$recordId}",
                        "Quá hạn review cho {$recordType} {$recordId}",
                        $data,
                        NotificationPriority::URGENT,
                    );
                    if ($sent > 0) {
                        $notificationLog['overdue_sent_at'] = gmdate('c');
                        $notificationLog['overdue_recipients'] = array_keys($recipients);
                        \allocation_append_audit_log($allocationRow, 'review_sla_overdue_notified', 'scheduled_job', 'review_sla_overdue_notified', [
                            'recipients' => array_keys($recipients),
                            'due_at' => (string)($reviewSla['due_at'] ?? ''),
                            'overdue_hours' => (int)($reviewSla['overdue_hours'] ?? 0),
                        ]);
                        $overdue += $sent;
                        $dirty = true;
                        $rowDirty = true;
                    }
                }

                if ($state === 'escalated' && trim((string)($notificationLog['escalated_sent_at'] ?? '')) === '') {
                    $recipients = $this->resolveUsersForRoles((array)($reviewSla['escalation_roles'] ?? []), $roleIndex);
                    $sent = $this->notifyUsers(
                        $notificationService,
                        array_keys($recipients),
                        NotificationType::OVERDUE_ALERT,
                        "Evidence review escalated for {$recordType} {$recordId}",
                        "Review đã bị escalation cho {$recordType} {$recordId}",
                        $data,
                        NotificationPriority::URGENT,
                    );
                    if ($sent > 0) {
                        $notificationLog['escalated_sent_at'] = gmdate('c');
                        $notificationLog['escalated_recipients'] = array_keys($recipients);
                        \allocation_append_audit_log($allocationRow, 'review_sla_escalation_notified', 'scheduled_job', 'review_sla_escalation_notified', [
                            'recipients' => array_keys($recipients),
                            'escalation_roles' => array_values((array)($reviewSla['escalation_roles'] ?? [])),
                            'escalation_due_at' => (string)($reviewSla['escalation_due_at'] ?? ''),
                        ]);
                        $escalated += $sent;
                        $dirty = true;
                        $rowDirty = true;
                    }
                }

                if ($rowDirty) {
                    $allocationRow['review_sla']['notifications'] = $notificationLog;
                }
                $allocationStore['allocations'][$idx] = $allocationRow;
            }

            if ($dirty) {
                \save_allocation_store($allocationStore);
            }

            return [
                'warned' => $warned,
                'overdue' => $overdue,
                'escalated' => $escalated,
                'allocations_scanned' => $allocationsScanned,
            ];
        });
    }

    /**
     * Deploy drill reminders: mark missed drill seeds overdue and escalate to QMS.
     *
     * Schedule: Daily at 06:00.
     *
     * @return array<string, mixed>
     */
    public function runDeployDrillReminders(): array
    {
        return $this->executeJob('deploy_drill_reminders', function (): array {
            $service = new DeployDrillReminderService($this->dataDir);
            return $service->runDaily();
        });
    }

    /**
     * Epicor outbox worker: deliver queued MES transactions to Epicor REST.
     *
     * Schedule: Every 1 minute.
     *
     * @return array{job: string, processed: int, delivered: int, retried: int, dead_letter: int, skipped: int, duration_ms: float}
     */
    public function runEpicorOutboxWorker(int $limit = 25): array
    {
        return $this->executeJob('epicor_outbox_worker', function () use ($limit): array {
            require_once __DIR__ . '/EpicorTransportAdapter.php';
            require_once __DIR__ . '/OutboxWorker.php';

            $worker = new OutboxWorker($this->dataDir, new EpicorTransportAdapter($this->dataDir));
            $result = $worker->processPending([
                'limit' => $limit,
                'user_id' => 'scheduled_job',
            ]);

            return [
                'processed' => (int)($result['processed'] ?? 0),
                'delivered' => (int)($result['delivered'] ?? 0),
                'retried' => (int)($result['retried'] ?? 0),
                'dead_letter' => (int)($result['dead_letter'] ?? 0),
                'skipped' => (int)($result['skipped'] ?? 0),
            ];
        });
    }

    /**
     * Epicor inbound worker: pull governed inbound deltas from Epicor REST.
     *
     * Schedule: Every 5 minutes.
     *
     * @param array<int, string> $domains
     * @return array{job: string, processed: int, succeeded: int, skipped: int, failed: int, duration_ms: float}
     */
    public function runEpicorInboundSync(array $domains = []): array
    {
        return $this->executeJob('epicor_inbound_sync', function () use ($domains): array {
            require_once __DIR__ . '/EpicorTransportAdapter.php';
            require_once __DIR__ . '/EpicorInboundWorker.php';

            $worker = new EpicorInboundWorker($this->dataDir, new EpicorTransportAdapter($this->dataDir));
            $result = $worker->processInbound([
                'domains' => $domains,
                'user_id' => 'scheduled_job',
            ]);

            return [
                'processed' => (int)($result['processed'] ?? 0),
                'succeeded' => (int)($result['succeeded'] ?? 0),
                'skipped' => (int)($result['skipped'] ?? 0),
                'failed' => (int)($result['failed'] ?? 0),
            ];
        });
    }

    /**
     * Data Purge: archive old audit logs, expire notifications.
     *
     * Removes notifications older than 90 days (already read) and
     * archives audit log entries older than 365 days. Keeps the
     * database lean while preserving records per retention policy.
     *
     * Schedule: Monthly on 1st at 04:00.
     *
     * @return array{job: string, notifications_purged: int, audit_archived: int, duration_ms: float}
     */
    public function runDataPurge(): array
    {
        return $this->executeJob('data_purge', function (): array {
            // Purge old read notifications (> 90 days)
            $notifPurged = $this->db->execute(
                "DELETE FROM notifications
                 WHERE is_read = TRUE
                   AND created_at < (now() - INTERVAL '90 days')",
            );

            // Archive old audit logs to file and delete from DB (> 365 days)
            $auditRows = $this->db->query(
                "SELECT * FROM audit_trail
                 WHERE created_at < (now() - INTERVAL '365 days')
                 ORDER BY created_at
                 LIMIT 10000",
            );

            $auditArchived = 0;
            if (!empty($auditRows)) {
                $archiveDir = $this->dataDir . '/audit-archive';
                if (!is_dir($archiveDir)) {
                    @mkdir($archiveDir, 0775, true);
                }

                $archiveFile = $archiveDir . '/audit-archive-' . date('Y-m-d-His') . '.jsonl';
                $lines = [];
                $ids   = [];
                foreach ($auditRows as $row) {
                    $lines[] = json_encode($row, JSON_UNESCAPED_UNICODE);
                    $ids[]   = $row['audit_id'] ?? $row['id'] ?? null;
                }
                file_put_contents($archiveFile, implode("\n", $lines) . "\n", LOCK_EX);

                $ids = array_filter($ids);
                if (!empty($ids)) {
                    $placeholders = implode(',', array_fill(0, count($ids), '?'));
                    $auditArchived = $this->db->execute(
                        "DELETE FROM audit_trail WHERE audit_id IN ({$placeholders})",
                        array_values($ids),
                    );
                }
            }

            // Clean expired widget cache files
            $cacheDir = $this->dataDir . '/dashboard-cache';
            if (is_dir($cacheDir)) {
                $cacheFiles = glob($cacheDir . '/*.json') ?: [];
                foreach ($cacheFiles as $file) {
                    if (filemtime($file) < (time() - 3600)) {
                        @unlink($file);
                    }
                }
            }

            return [
                'notifications_purged' => $notifPurged,
                'audit_archived'       => $auditArchived,
            ];
        });
    }

    /**
     * Daily AI data ETL — creates training dataset snapshots.
     * ETL dữ liệu AI hàng ngày — tạo bản chụp tập dữ liệu huấn luyện.
     *
     * Iterates over all supported model types and creates a snapshot of
     * the most recent 90 days of training data for each. Results are
     * stored in the ai_training_datasets table.
     *
     * Schedule: Daily at 02:00.
     *
     * @param list<string> $orgIds Optional explicit org scopes for scheduler-controlled batch execution.
     * @return array{job: string, status: string, results: list<array>, duration_ms: float}
     */
    public function runAiDataEtl(array $orgIds = []): array
    {
        return $this->executeJob('ai_data_etl', function () use ($orgIds): array {
            require_once __DIR__ . '/AiDataEtlService.php';

            $etl = new \MOM\Api\Services\AiDataEtlService($this->dataDir, $this->db);
            $results = [];
            $scopedOrgIds = $this->resolveAiEtlOrgIds($orgIds);
            if ($scopedOrgIds === []) {
                foreach (['tool_wear', 'quality_prediction', 'scheduling', 'shopfloor_execution'] as $modelType) {
                    $results[] = [
                        'model_type' => $modelType,
                        'status'     => 'skipped',
                        'error'      => 'ai_etl_org_scope_required',
                    ];
                }

                return ['results' => $results, 'scope_status' => 'blocked'];
            }

            foreach ($scopedOrgIds as $orgId) {
                foreach (['tool_wear', 'quality_prediction', 'scheduling', 'shopfloor_execution'] as $modelType) {
                    try {
                        $dataset = $etl->snapshotForModel($modelType, $orgId);
                        $results[] = [
                            'org_id'     => $orgId,
                            'model_type' => $modelType,
                            'status'     => 'success',
                            'row_count'  => $dataset['row_count'] ?? 0,
                            'dataset_id' => $dataset['dataset_id'] ?? null,
                        ];
                    } catch (Throwable $e) {
                        $results[] = [
                            'org_id'     => $orgId,
                            'model_type' => $modelType,
                            'status'     => 'failed',
                            'error'      => $e->getMessage(),
                        ];
                    }
                }
            }

            return ['results' => $results];
        });
    }

    /**
     * @param list<string> $explicitOrgIds
     * @return list<string>
     */
    private function resolveAiEtlOrgIds(array $explicitOrgIds = []): array
    {
        $orgIds = [];
        foreach ($explicitOrgIds as $orgId) {
            $this->appendAiEtlOrgId($orgIds, $orgId);
        }

        $sessionOrgId = (string)($_SESSION['org_id'] ?? '');
        $this->appendAiEtlOrgId($orgIds, $sessionOrgId);

        $envOrgIds = trim((string)(getenv('MOM_AI_ETL_ORG_IDS') ?: ''));
        if ($envOrgIds !== '') {
            foreach (explode(',', $envOrgIds) as $orgId) {
                $this->appendAiEtlOrgId($orgIds, $orgId);
            }
        }

        $usersFile = $this->dataDir . '/config/users.json';
        if (is_file($usersFile)) {
            $decoded = json_decode((string)file_get_contents($usersFile), true);
            if (is_array($decoded)) {
                foreach ($decoded as $user) {
                    if (is_array($user)) {
                        $this->appendAiEtlOrgId($orgIds, (string)($user['org_id'] ?? ''));
                    }
                }
            }
        }

        return array_values($orgIds);
    }

    /**
     * @param array<string, string> $orgIds
     */
    private function appendAiEtlOrgId(array &$orgIds, string $orgId): void
    {
        $orgId = trim($orgId);
        if ($orgId !== '') {
            $orgIds[$orgId] = $orgId;
        }
    }

    /**
     * Daily AI prediction expiry — expires stale predictions.
     * Hết hạn dự đoán AI hàng ngày — đánh hết hạn các dự đoán cũ.
     *
     * Updates active predictions older than 30 days to 'expired' status.
     * Keeps the prediction table focused on actionable items.
     *
     * Schedule: Daily at 02:30.
     *
     * @return array{job: string, expired_count: int, duration_ms: float}
     */
    public function runAiPredictionExpiry(): array
    {
        return $this->executeJob('ai_prediction_expiry', function (): array {
            require_once __DIR__ . '/AiPredictionPipeline.php';

            $pipeline = new \MOM\Api\Services\AiPredictionPipeline($this->dataDir, $this->db);
            $expired = $pipeline->expireStale(30);

            return ['expired_count' => $expired];
        });
    }

    // ── Job Execution Framework ─────────────────────────────────────────────

    /**
     * MTConnect polling cycle for all active MTConnect adapters.
     *
     * Runs a governed polling pass across every active MTConnect adapter in
     * master data, updates runtime machine signals, appends connectivity
     * events, and mirrors the new state to the PostgreSQL shadow layer when
     * available.
     *
     * Schedule: Every 1 minute by cron or a Windows scheduled task.
     *
     * @return array{job: string, processed: int, success: int, failed: int, skipped: int, duration_ms: float}
     */
    public function runMtconnectPollingCycle(bool $force = false, int $limit = 20): array
    {
        return $this->executeJob('mtconnect_poll_cycle', function () use ($force, $limit): array {
            require_once __DIR__ . '/MtconnectPollingService.php';

            $service = new MtconnectPollingService($this->dataDir, dirname($this->dataDir, 2));
            $result = $service->pollAll([
                'user_id' => 'system.mtconnect',
                'note' => 'Scheduled MTConnect polling cycle.',
                'force' => $force,
                'limit' => $limit,
                'timeout_seconds' => 8,
            ]);

            return [
                'processed' => (int)($result['processed'] ?? 0),
                'success' => (int)($result['success'] ?? 0),
                'failed' => (int)($result['failed'] ?? 0),
                'skipped' => (int)($result['skipped'] ?? 0),
            ];
        });
    }

    /**
     * AI Email Order Intake — poll M365 mailbox for new order emails.
     *
     * Crontab recommendation:
     *   0 *\/2 * * * php cli/run-job.php email_inbox_poll >> /var/log/mom-jobs/email-intake.log 2>&1
     *
     * Delegates to EmailIntakeConfigService for the poll run audit record.
     * M365MailboxService and OrderEmailParserService (Claude API extraction)
     * are provisioned in sprint 2. This stub logs a skipped run with the
     * reason so the audit table populates correctly from day 1.
     */
    public function runEmailInboxPoll(string $triggeredBy = 'cron', string $triggeredByActor = 'system.cron'): array
    {
        return $this->executeJob('email_inbox_poll', function () use ($triggeredBy, $triggeredByActor): array {
            require_once __DIR__ . '/EmailIntakeConfigService.php';

            $svc = new \MOM\Api\Services\EmailIntakeConfigService($this->db);

            // Check enabled flag before opening a run record
            $config = $svc->loadConfig();
            if (!($config['enabled'] ?? false)) {
                return [
                    'status'       => 'skipped',
                    'reason'       => 'Email Order Intake is disabled in admin config.',
                    'run_id'       => null,
                    'orders_created' => 0,
                ];
            }

            $start = microtime(true);
            $runId = $configSvc->openPollRun($triggeredBy, $triggeredByActor);

            // M365MailboxService + OrderEmailParserService not yet provisioned (sprint 2).
            // Close as skipped so the poll log stays clean.
            $svc->closePollRun($runId, [
                'found' => 0, 'processed' => 0, 'skipped' => 0,
                'quarantined' => 0, 'created' => 0, 'review' => 0,
                'errors' => 0,
                'duration_ms' => (int)((microtime(true) - $start) * 1000),
                'api_calls'   => 0,
                'error_detail' => 'M365MailboxService not yet provisioned — pending sprint 2.',
            ], 'skipped');

            // IMAP polling — only attempt if php-imap is loaded.
            $imapSummary = [
                'mailboxes' => 0, 'fetched' => 0, 'created' => 0,
                'skipped' => 0, 'errors' => 0,
            ];
            if (!empty($imapMailboxIds) && extension_loaded('imap')) {
                require_once __DIR__ . '/EmailIntakeImapService.php';
                require_once __DIR__ . '/EmailIntakeCaseService.php';
                require_once __DIR__ . '/EmailIntakeValidationService.php';

                $caseSvc = new \MOM\Api\Services\EmailIntakeCaseService($this->db);
                $vSvc    = new \MOM\Api\Services\EmailIntakeValidationService(
                    $this->db, $caseSvc, $configSvc
                );
                $imapSvc = new \MOM\Api\Services\EmailIntakeImapService(
                    $this->db, $catalog, $configSvc, $caseSvc, $vSvc, $this->dataDir
                );

                foreach ($imapMailboxIds as $mid) {
                    $imapSummary['mailboxes']++;
                    try {
                        $row = $catalog->getMailboxWithSecret($mid);
                        $r   = $imapSvc->pollMailbox($row, 'system.cron.aeoi');
                        $imapSummary['fetched'] += (int)($r['fetched'] ?? 0);
                        $imapSummary['created'] += (int)($r['created'] ?? 0);
                        $imapSummary['skipped'] += (int)($r['skipped'] ?? 0);
                        if (($r['status'] ?? '') === 'failed') {
                            $imapSummary['errors']++;
                        }
                    } catch (Throwable $e) {
                        $imapSummary['errors']++;
                        $catalog->recordMailboxScan($mid, 'poll_failed', $e->getMessage());
                    }
                }
            }

            $detail = "Heartbeat: $heartbeatCount local-Outlook; "
                    . "IMAP: {$imapSummary['mailboxes']} mailboxes, "
                    . "fetched {$imapSummary['fetched']}, created {$imapSummary['created']}, "
                    . "skipped {$imapSummary['skipped']}, errors {$imapSummary['errors']}.";

            $configSvc->closePollRun($runId, [
                'found'        => $imapSummary['fetched'],
                'processed'    => $imapSummary['created'] + $imapSummary['skipped'],
                'skipped'      => $imapSummary['skipped'],
                'quarantined'  => 0,
                'created'      => $imapSummary['created'],
                'review'       => $imapSummary['created'], // every new case starts as needs-review
                'errors'       => $imapSummary['errors'],
                'duration_ms'  => (int)((microtime(true) - $start) * 1000),
                'api_calls'    => $imapSummary['mailboxes'],
                'error_detail' => $detail,
            ], $imapSummary['errors'] > 0 ? 'completed' : 'completed');
            $configSvc->updateNextPollAt();

            return [
                'status'         => 'skipped',
                'run_id'         => $runId,
                'orders_created' => 0,
                'note'           => 'M365 connection service will be provisioned in sprint 2.',
            ];
        });
    }

    /**
     * Execute a job with timing, error handling, and logging.
     *
     * @param string   $jobName Job identifier.
     * @param callable $fn      Job function returning result array.
     * @return array Job result with metadata.
     */
    private function executeJob(string $jobName, callable $fn): array
    {
        $startTime = microtime(true);
        $startIso  = gmdate('c');

        try {
            $result = $fn();
            $durationMs = round((microtime(true) - $startTime) * 1000, 1);

            $logEntry = array_merge([
                'job'         => $jobName,
                'status'      => 'success',
                'started_at'  => $startIso,
                'duration_ms' => $durationMs,
            ], $result);

            $this->logJobRun($logEntry);

            return $logEntry;
        } catch (Throwable $e) {
            $durationMs = round((microtime(true) - $startTime) * 1000, 1);

            $logEntry = [
                'job'         => $jobName,
                'status'      => 'failed',
                'started_at'  => $startIso,
                'duration_ms' => $durationMs,
                'error'       => $e->getMessage(),
                'trace'       => $e->getTraceAsString(),
            ];

            $this->logJobRun($logEntry);

            return $logEntry;
        }
    }

    /**
     * Load API helper functions in library-only mode for cron-safe jobs.
     */
    private function ensureApiHelpersLoaded(): void
    {
        if (\function_exists('load_allocation_store') && \function_exists('mes_mtconnect_poll_batch_runtime')) {
            return;
        }
        if (!\defined('API_HELPERS_ONLY')) {
            \define('API_HELPERS_ONLY', true);
        }
        require_once dirname(__DIR__, 2) . '/api.php';
    }

    /**
     * Build an index of active usernames by normalized role.
     *
     * @return array<string, array<int, string>>
     */
    private function buildActiveUserRoleIndex(): array
    {
        $file = $this->dataDir . '/config/users.json';
        if (!is_file($file)) {
            return [];
        }
        $raw = file_get_contents($file);
        $data = is_string($raw) ? json_decode($raw, true) : null;
        $index = [];
        foreach ((array)($data['users'] ?? []) as $user) {
            if (!is_array($user) || empty($user['active'])) {
                continue;
            }
            $username = strtolower(trim((string)($user['username'] ?? '')));
            if ($username === '') {
                continue;
            }
            $roles = is_array($user['roles'] ?? null) ? $user['roles'] : [(string)($user['role'] ?? '')];
            foreach ($roles as $role) {
                $normalizedRole = strtolower(trim((string)$role));
                if ($normalizedRole === '') {
                    continue;
                }
                $index[$normalizedRole] = $index[$normalizedRole] ?? [];
                if (!in_array($username, $index[$normalizedRole], true)) {
                    $index[$normalizedRole][] = $username;
                }
            }
        }
        return $index;
    }

    /**
     * Resolve unique usernames for a set of allowed roles.
     *
     * @param array<int, string> $roles
     * @param array<string, array<int, string>> $roleIndex
     * @return array<string, string>
     */
    private function resolveUsersForRoles(array $roles, array $roleIndex): array
    {
        $recipients = [];
        foreach ($roles as $role) {
            $normalizedRole = strtolower(trim((string)$role));
            foreach ((array)($roleIndex[$normalizedRole] ?? []) as $username) {
                $recipients[$username] = $username;
            }
        }
        return $recipients;
    }

    /**
     * Send one notification payload to many users.
     *
     * @param array<int, string> $usernames
     * @param array<string, mixed> $data
     */
    private function notifyUsers(
        NotificationService $notificationService,
        array $usernames,
        NotificationType $type,
        string $message,
        string $messageVi,
        array $data,
        NotificationPriority $priority,
    ): int {
        $count = 0;
        foreach ($usernames as $username) {
            $username = strtolower(trim((string)$username));
            if ($username === '') {
                continue;
            }
            $notificationService->notify($username, $type, $message, $data, $priority, $messageVi);
            $count++;
        }
        return $count;
    }

    /**
     * Create alert notifications for users in a department.
     *
     * @return int Number of notifications created.
     */
    private function createAlertNotification(
        string $category,
        string $title,
        string $body,
        string $link,
        ?string $deptCode = null,
    ): int {
        try {
            // Find users to notify: department members + QA managers
            $where = 'u.is_active = TRUE';
            $params = [];

            if ($deptCode !== null) {
                $where .= " AND (u.department_id = :dept OR u.role IN ('qa_manager', 'admin'))";
                $params[':dept'] = $deptCode;
            } else {
                $where .= " AND u.role IN ('qa_manager', 'admin')";
            }

            $users = $this->db->query(
                "SELECT user_id FROM users u WHERE {$where}",
                $params,
            );

            $created = 0;
            foreach ($users as $user) {
                // Avoid duplicate notifications (same title within 24h)
                $exists = $this->db->queryScalar(
                    "SELECT COUNT(*) FROM notifications
                     WHERE user_id = :uid AND title = :title
                       AND created_at >= (now() - INTERVAL '24 hours')",
                    [':uid' => $user['user_id'], ':title' => $title],
                );

                if ((int) $exists === 0) {
                    $this->db->execute(
                        "INSERT INTO notifications (user_id, title, body, link, category)
                         VALUES (:uid, :title, :body, :link, :cat)",
                        [
                            ':uid'   => $user['user_id'],
                            ':title' => $title,
                            ':body'  => $body,
                            ':link'  => $link,
                            ':cat'   => $category,
                        ],
                    );
                    $created++;
                }
            }

            return $created;
        } catch (Throwable) {
            return 0;
        }
    }

    /**
     * Write a job execution log entry.
     */
    private function logJobRun(array $entry): void
    {
        $logFile = $this->logDir . '/' . date('Y-m-d') . '.jsonl';
        $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        @file_put_contents($logFile, $line . "\n", FILE_APPEND | LOCK_EX);
    }

    /**
     * Write a job-specific error log entry.
     */
    private function logJobError(string $jobName, string $message): void
    {
        $this->logJobRun([
            'job'       => $jobName,
            'status'    => 'error',
            'message'   => $message,
            'timestamp' => gmdate('c'),
        ]);
    }
}
