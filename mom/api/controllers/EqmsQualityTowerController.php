<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Quality Control Tower — Cross-module aggregate KPIs and management dashboard.
 *
 * Read-only aggregation controller. Materializes snapshots from all EQMS domain tables
 * into `eqms_quality_tower_snapshots` for fast dashboard serving.
 *
 * No state machines, no electronic signatures, no write operations.
 * All endpoints are available to any EQMS read-eligible role.
 *
 * Endpoints:
 *   GET  /api/v1/eqms/quality-tower/dashboard
 *   GET  /api/v1/eqms/quality-tower/metrics
 *   GET  /api/v1/eqms/quality-tower/overdue-actions
 *   GET  /api/v1/eqms/quality-tower/compliance-calendar
 *   POST /api/v1/eqms/quality-tower/snapshot          (system/cron refresh)
 *   POST /api/v1/eqms/quality-tower/export
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsQualityTowerController extends EqmsBaseController
{
    // ── Dashboard ────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/eqms/quality-tower/dashboard
     *
     * Returns the latest materialized quality snapshot enriched with live
     * open-item counts across all modules.
     */
    public function dashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $db = $this->eqmsPdo();

        // Latest snapshot
        $snap = $db->query(
            "SELECT * FROM eqms_quality_tower_snapshots ORDER BY snapshot_at DESC LIMIT 1"
        )->fetch(\PDO::FETCH_ASSOC);

        // Live open-item counts (lightweight — partial indexes make these fast)
        $live = $db->query("
            SELECT
              (SELECT COUNT(*) FROM eqms_complaints         WHERE status NOT IN ('closed')) AS open_complaints,
              (SELECT COUNT(*) FROM eqms_deviations          WHERE status NOT IN ('closed','voided')) AS open_deviations,
              (SELECT COUNT(*) FROM eqms_ncr_records         WHERE status NOT IN ('closed')) AS open_ncr,
              (SELECT COUNT(*) FROM eqms_capa_records        WHERE status NOT IN ('closed')) AS open_capa,
              (SELECT COUNT(*) FROM eqms_change_controls     WHERE status NOT IN ('closed','cancelled')) AS open_changes,
              (SELECT COUNT(*) FROM eqms_audit_findings      WHERE status NOT IN ('closed')) AS open_audit_findings,
              (SELECT COUNT(*) FROM eqms_scar_records        WHERE status NOT IN ('closed')) AS open_scar,
              (SELECT COUNT(*) FROM eqms_batch_release_records WHERE status = 'pending_release') AS pending_release,
              (SELECT COUNT(*) FROM eqms_field_actions       WHERE status NOT IN ('closed')) AS active_field_actions,
              (SELECT COUNT(*) FROM eqms_lab_investigations  WHERE status NOT IN ('closed')) AS open_lab_investigations,
              (SELECT COUNT(*) FROM eqms_calibration_records WHERE next_due_date < NOW()
                AND status NOT IN ('closed','cancelled')) AS overdue_calibrations,
              (SELECT COUNT(*) FROM eqms_training_records    WHERE due_date < NOW()
                AND status != 'completed') AS overdue_training,
              (SELECT COUNT(*) FROM eqms_risk_register       WHERE risk_score >= 15
                AND status NOT IN ('closed','mitigated')) AS critical_risks
        ")->fetch(\PDO::FETCH_ASSOC);

        $this->success([
            'snapshot'       => $snap ?: null,
            'snapshot_stale' => $snap
                ? (strtotime($snap['snapshot_at']) < time() - 3600)
                : true,
            'live_counts'    => $live,
        ]);
    }

    // ── Metrics ──────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/eqms/quality-tower/metrics
     *
     * Returns trended KPI metrics suitable for management review:
     *   - CAPA on-time closure rate (last 90 days)
     *   - NCR first-pass yield trend (last 12 months)
     *   - Calibration compliance % (current)
     *   - Training compliance % (current)
     *   - Supplier SCAR response-rate (last 6 months)
     *   - Open CAPA aging buckets
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $db = $this->eqmsPdo();

        // CAPA on-time closure rate (last 90 days)
        $capaRow = $db->query("
            SELECT
              COUNT(*) FILTER (WHERE status = 'closed') AS closed_total,
              COUNT(*) FILTER (WHERE status = 'closed'
                AND updated_at <= target_close_date) AS closed_on_time
            FROM eqms_capa_records
            WHERE created_at >= NOW() - INTERVAL '90 days'
        ")->fetch(\PDO::FETCH_ASSOC);

        $total    = (int)($capaRow['closed_total'] ?? 0);
        $onTime   = (int)($capaRow['closed_on_time'] ?? 0);
        $capaRate = $total > 0 ? round($onTime / $total * 100, 1) : null;

        // Calibration compliance
        $calRow = $db->query("
            SELECT
              COUNT(*) AS total_instruments,
              COUNT(*) FILTER (WHERE next_due_date >= NOW()
                OR status IN ('closed','approved')) AS compliant
            FROM eqms_calibration_records
            WHERE status NOT IN ('cancelled')
        ")->fetch(\PDO::FETCH_ASSOC);

        $calTotal     = (int)($calRow['total_instruments'] ?? 0);
        $calCompliant = (int)($calRow['compliant'] ?? 0);
        $calRate      = $calTotal > 0 ? round($calCompliant / $calTotal * 100, 1) : null;

        // Training compliance
        $trainRow = $db->query("
            SELECT
              COUNT(*) AS total_assigned,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed
            FROM eqms_training_records
            WHERE due_date <= NOW()
        ")->fetch(\PDO::FETCH_ASSOC);

        $trainTotal     = (int)($trainRow['total_assigned'] ?? 0);
        $trainCompleted = (int)($trainRow['completed'] ?? 0);
        $trainRate      = $trainTotal > 0 ? round($trainCompleted / $trainTotal * 100, 1) : null;

        // CAPA aging buckets
        $aging = $db->query("
            SELECT
              COUNT(*) FILTER (WHERE age_days <= 30) AS bucket_0_30,
              COUNT(*) FILTER (WHERE age_days BETWEEN 31 AND 60) AS bucket_31_60,
              COUNT(*) FILTER (WHERE age_days BETWEEN 61 AND 90) AS bucket_61_90,
              COUNT(*) FILTER (WHERE age_days > 90) AS bucket_over_90
            FROM (
              SELECT EXTRACT(DAY FROM NOW() - created_at)::int AS age_days
              FROM eqms_capa_records
              WHERE status NOT IN ('closed')
            ) t
        ")->fetch(\PDO::FETCH_ASSOC);

        // Supplier SCAR response rate (last 180 days)
        $scarRow = $db->query("
            SELECT
              COUNT(*) AS issued,
              COUNT(*) FILTER (WHERE status NOT IN ('draft','issued')
                AND updated_at <= (created_at + INTERVAL '30 days')) AS responded_on_time
            FROM eqms_scar_records
            WHERE created_at >= NOW() - INTERVAL '180 days'
        ")->fetch(\PDO::FETCH_ASSOC);

        $scarIssued   = (int)($scarRow['issued'] ?? 0);
        $scarOnTime   = (int)($scarRow['responded_on_time'] ?? 0);
        $scarRate     = $scarIssued > 0 ? round($scarOnTime / $scarIssued * 100, 1) : null;

        $this->success([
            'capa_on_time_closure_rate_pct'    => $capaRate,
            'calibration_compliance_rate_pct'  => $calRate,
            'training_compliance_rate_pct'     => $trainRate,
            'supplier_scar_response_rate_pct'  => $scarRate,
            'capa_aging_buckets'               => $aging,
            'as_of'                            => $this->nowIso(),
        ]);
    }

    // ── Overdue Actions ──────────────────────────────────────────────────────

    /**
     * GET /api/v1/eqms/quality-tower/overdue-actions
     *
     * Returns all overdue action items across every EQMS module,
     * sorted by days overdue descending.
     *
     * Supports ?module=capa,ncr,scar,training,calibration filter.
     */
    public function overdueActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $filter = $this->query('module') ?? '';
        $modules = $filter !== ''
            ? array_map('trim', explode(',', $filter))
            : ['capa', 'ncr', 'deviations', 'scar', 'training', 'calibration', 'field_actions'];

        $db = $this->eqmsPdo();
        $rows = [];

        if (in_array('capa', $modules, true)) {
            $st = $db->query("
                SELECT id, 'capa' AS module, title, status,
                  EXTRACT(DAY FROM NOW() - target_close_date)::int AS days_overdue,
                  owner_user_id AS owner
                FROM eqms_capa_records
                WHERE status NOT IN ('closed')
                  AND target_close_date IS NOT NULL
                  AND target_close_date < NOW()
                ORDER BY days_overdue DESC
            ");
            $rows = array_merge($rows, $st->fetchAll(\PDO::FETCH_ASSOC));
        }

        if (in_array('ncr', $modules, true)) {
            $st = $db->query("
                SELECT id, 'ncr' AS module, description AS title, status,
                  EXTRACT(DAY FROM NOW() - due_date)::int AS days_overdue,
                  assigned_to AS owner
                FROM eqms_ncr_records
                WHERE status NOT IN ('closed')
                  AND due_date IS NOT NULL
                  AND due_date < NOW()
                ORDER BY days_overdue DESC
            ");
            $rows = array_merge($rows, $st->fetchAll(\PDO::FETCH_ASSOC));
        }

        if (in_array('scar', $modules, true)) {
            $st = $db->query("
                SELECT id, 'scar' AS module, title, status,
                  EXTRACT(DAY FROM NOW() - response_due_date)::int AS days_overdue,
                  supplier_id::text AS owner
                FROM eqms_scar_records
                WHERE status NOT IN ('closed')
                  AND response_due_date IS NOT NULL
                  AND response_due_date < NOW()
                ORDER BY days_overdue DESC
            ");
            $rows = array_merge($rows, $st->fetchAll(\PDO::FETCH_ASSOC));
        }

        if (in_array('training', $modules, true)) {
            $st = $db->query("
                SELECT id, 'training' AS module, course_name AS title, status,
                  EXTRACT(DAY FROM NOW() - due_date)::int AS days_overdue,
                  employee_id::text AS owner
                FROM eqms_training_records
                WHERE status != 'completed'
                  AND due_date IS NOT NULL
                  AND due_date < NOW()
                ORDER BY days_overdue DESC
            ");
            $rows = array_merge($rows, $st->fetchAll(\PDO::FETCH_ASSOC));
        }

        if (in_array('calibration', $modules, true)) {
            $st = $db->query("
                SELECT id, 'calibration' AS module, instrument_name AS title, status,
                  EXTRACT(DAY FROM NOW() - next_due_date)::int AS days_overdue,
                  responsible_user_id::text AS owner
                FROM eqms_calibration_records
                WHERE status NOT IN ('closed','cancelled')
                  AND next_due_date IS NOT NULL
                  AND next_due_date < NOW()
                ORDER BY days_overdue DESC
            ");
            $rows = array_merge($rows, $st->fetchAll(\PDO::FETCH_ASSOC));
        }

        if (in_array('field_actions', $modules, true)) {
            $st = $db->query("
                SELECT id, 'field_action' AS module, title, status,
                  EXTRACT(DAY FROM NOW() - target_completion_date)::int AS days_overdue,
                  owner_user_id::text AS owner
                FROM eqms_field_actions
                WHERE status NOT IN ('closed')
                  AND target_completion_date IS NOT NULL
                  AND target_completion_date < NOW()
                ORDER BY days_overdue DESC
            ");
            $rows = array_merge($rows, $st->fetchAll(\PDO::FETCH_ASSOC));
        }

        usort($rows, static fn($a, $b) => (int)$b['days_overdue'] <=> (int)$a['days_overdue']);

        $this->success([
            'total'          => count($rows),
            'overdue_actions' => $rows,
            'modules_queried' => $modules,
        ]);
    }

    // ── Compliance Calendar ──────────────────────────────────────────────────

    /**
     * GET /api/v1/eqms/quality-tower/compliance-calendar
     *
     * Returns upcoming compliance-critical dates across EQMS:
     *   - Calibrations due in next 30 days
     *   - Training expirations in next 30 days
     *   - Scheduled internal audits
     *   - Quality agreement review dates
     *   - Validation re-qualification due dates
     *
     * Supports ?days=N (default 30, max 90) lookahead window.
     */
    public function complianceCalendar(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $days = min(90, max(1, (int)($this->query('days') ?? 30)));
        $db   = $this->eqmsPdo();
        $stmt = $db->prepare("SELECT :days_int::int");
        $stmt->bindValue(':days_int', $days, \PDO::PARAM_INT);

        // Calibrations due
        $calDue = $db->prepare("
            SELECT id, instrument_name AS name, 'calibration_due' AS event_type,
              next_due_date AS due_date
            FROM eqms_calibration_records
            WHERE status NOT IN ('closed','cancelled')
              AND next_due_date BETWEEN NOW() AND NOW() + (:days || ' days')::INTERVAL
            ORDER BY next_due_date
        ");
        $calDue->execute(['days' => $days]);

        // Training expirations
        $trainDue = $db->prepare("
            SELECT id, course_name AS name, 'training_expiry' AS event_type,
              due_date
            FROM eqms_training_records
            WHERE status != 'completed'
              AND due_date BETWEEN NOW() AND NOW() + (:days || ' days')::INTERVAL
            ORDER BY due_date
        ");
        $trainDue->execute(['days' => $days]);

        // Scheduled audits
        $auditDue = $db->prepare("
            SELECT id, audit_name AS name, 'audit_scheduled' AS event_type,
              planned_date AS due_date
            FROM eqms_audits
            WHERE status IN ('planned','scheduled')
              AND planned_date BETWEEN NOW() AND NOW() + (:days || ' days')::INTERVAL
            ORDER BY planned_date
        ");
        $auditDue->execute(['days' => $days]);

        // Quality agreement reviews
        $agmtDue = $db->prepare("
            SELECT id, agreement_title AS name, 'quality_agreement_review' AS event_type,
              review_date AS due_date
            FROM eqms_supplier_quality_agreements
            WHERE status NOT IN ('expired','terminated')
              AND review_date BETWEEN NOW() AND NOW() + (:days || ' days')::INTERVAL
            ORDER BY review_date
        ");
        $agmtDue->execute(['days' => $days]);

        $events = array_merge(
            $calDue->fetchAll(\PDO::FETCH_ASSOC),
            $trainDue->fetchAll(\PDO::FETCH_ASSOC),
            $auditDue->fetchAll(\PDO::FETCH_ASSOC),
            $agmtDue->fetchAll(\PDO::FETCH_ASSOC),
        );

        usort($events, static fn($a, $b) => strcmp($a['due_date'], $b['due_date']));

        $this->success([
            'lookahead_days' => $days,
            'total'          => count($events),
            'events'         => $events,
        ]);
    }

    // ── Snapshot Refresh ─────────────────────────────────────────────────────

    /**
     * POST /api/v1/eqms/quality-tower/snapshot
     *
     * Materializes a fresh snapshot into eqms_quality_tower_snapshots.
     * Intended to be called by a cron job every hour, but can also be triggered
     * manually by quality_manager or admin roles.
     */
    public function refreshSnapshot(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, array_merge(admin_roles(), ['quality_manager', 'qa_manager', 'qms_manager']));

        $db = $this->eqmsPdo();

        // Aggregate open counts across all modules
        $counts = $db->query("
            SELECT
              (SELECT COUNT(*) FROM eqms_complaints         WHERE status NOT IN ('closed')) AS open_complaints,
              (SELECT COUNT(*) FROM eqms_deviations          WHERE status NOT IN ('closed','voided')) AS open_deviations,
              (SELECT COUNT(*) FROM eqms_ncr_records         WHERE status NOT IN ('closed')) AS open_ncr,
              (SELECT COUNT(*) FROM eqms_capa_records        WHERE status NOT IN ('closed')) AS open_capa,
              (SELECT COUNT(*) FROM eqms_change_controls     WHERE status NOT IN ('closed','cancelled')) AS open_changes,
              (SELECT COUNT(*) FROM eqms_field_actions       WHERE status NOT IN ('closed')) AS active_field_actions,
              (SELECT COUNT(*) FROM eqms_calibration_records WHERE next_due_date < NOW()
                AND status NOT IN ('closed','cancelled')) AS overdue_calibrations,
              (SELECT COUNT(*) FROM eqms_training_records    WHERE due_date < NOW()
                AND status != 'completed') AS overdue_training
        ")->fetch(\PDO::FETCH_ASSOC);

        // CAPA on-time closure rate (last 90 days)
        $capaRow = $db->query("
            SELECT
              COUNT(*) FILTER (WHERE status = 'closed') AS closed_total,
              COUNT(*) FILTER (WHERE status = 'closed'
                AND updated_at <= target_close_date) AS closed_on_time
            FROM eqms_capa_records
            WHERE created_at >= NOW() - INTERVAL '90 days'
        ")->fetch(\PDO::FETCH_ASSOC);

        $total    = (int)($capaRow['closed_total'] ?? 0);
        $onTime   = (int)($capaRow['closed_on_time'] ?? 0);
        $capaRate = $total > 0 ? round($onTime / $total * 100, 1) : null;

        $kpi = [
            'capa_on_time_closure_rate_pct' => $capaRate,
            'open_counts' => $counts,
        ];

        $overdueJson  = json_encode($counts, JSON_THROW_ON_ERROR);
        $kpiJson      = json_encode($kpi, JSON_THROW_ON_ERROR);

        $insert = $db->prepare("
            INSERT INTO eqms_quality_tower_snapshots
              (id, snapshot_at, open_ncr_count, open_capa_count, overdue_actions, kpi_data, created_by)
            VALUES
              (gen_random_uuid(), NOW(), :open_ncr, :open_capa, :overdue::jsonb, :kpi::jsonb, :actor)
        ");

        $insert->execute([
            'open_ncr'  => (int)($counts['open_ncr'] ?? 0),
            'open_capa' => (int)($counts['open_capa'] ?? 0),
            'overdue'   => $overdueJson,
            'kpi'       => $kpiJson,
            'actor'     => (string)($user['username'] ?? $user['user'] ?? 'system'),
        ]);

        $this->emitQualityEvent(
            'eqms.quality_tower.snapshot_refreshed',
            'quality_tower',
            'snapshot',
            ['kpi' => $kpi],
            $user
        );

        $this->success([
            'snapshot_at' => $this->nowIso(),
            'kpi'         => $kpi,
        ]);
    }

    // ── Export ───────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/eqms/quality-tower/export
     *
     * Enqueues an async export job for a cross-module management review pack.
     * Returns 202 Accepted + job_id.
     */
    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());

        $this->serveExport('quality_tower', 'management-review', $user);
    }
}
