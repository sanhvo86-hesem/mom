<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * Legacy Quality Shim Controller — Sprint 4D migration bridge.
 *
 * Intercepts all deprecated action-key calls from the three legacy quality
 * modules (Exception Hub, Supplier Quality, FMEA & Control Plan) and routes
 * them to the EQMS v4.0 data surface.
 *
 * Strategy:
 *   READ operations  → query EQMS tables, return data + deprecated:true marker
 *   WRITE operations → 410 Gone with new_endpoint pointer (mutations require
 *                      the caller to adopt the EQMS REST surface)
 *
 * Response contract:
 *   All responses include { "deprecated": true, "new_endpoint": "<url>" }
 *   Read responses also include { "data": [...] } or { "metrics": {...} }
 *   Write responses use HTTP 410 to signal unconditional migration requirement.
 *
 * Remove this file once all callers have migrated to EQMS REST endpoints
 * and the legacy action registrations are removed from operations-routes.php.
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class LegacyQualityShimController extends EqmsBaseController
{
    // ════════════════════════════════════════════════════════════════════════════
    // EXCEPTION MANAGEMENT SHIMS
    // Legacy module: 15-quality-exception-hub.js
    // New surface:   /api/v1/eqms/ncr/*, /api/v1/eqms/capa/*
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * exception_dashboard → aggregate NCR + CAPA KPIs from EQMS tables.
     */
    public function exceptionDashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $openNcr   = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_ncr_records WHERE status NOT IN ('closed')") ?? 0);
        $openCapa  = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_capa_records WHERE status NOT IN ('closed','cancelled')") ?? 0);
        $ncrStatus = $this->data->query("SELECT status, COUNT(*) AS count FROM eqms_ncr_records GROUP BY status ORDER BY status") ?? [];
        $capStatus = $this->data->query("SELECT status, COUNT(*) AS count FROM eqms_capa_records GROUP BY status ORDER BY status") ?? [];
        $ncrSev    = $this->data->query("SELECT severity, COUNT(*) AS count FROM eqms_ncr_records GROUP BY severity") ?? [];

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/ncr/metrics',
            'dashboard' => [
                'open_ncr'        => $openNcr,
                'open_capa'       => $openCapa,
                'ncr_by_status'   => $ncrStatus,
                'capa_by_status'  => $capStatus,
                'ncr_by_severity' => $ncrSev,
            ],
        ]);
    }

    /**
     * exception_list → paginated NCR list from eqms_ncr_records.
     */
    public function exceptionList(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $body   = $this->jsonBody();
        $limit  = max(1, min(200, (int)($body['limit']  ?? 50)));
        $offset = max(0, (int)($body['offset'] ?? 0));
        $search = trim((string)($body['search'] ?? ''));

        $conditions = ['1=1'];
        $params     = [':lim' => $limit, ':off' => $offset];
        if ($search !== '') {
            $conditions[] = "(ncr_number ILIKE :search OR title ILIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }
        $where = implode(' AND ', $conditions);

        $items = $this->data->query(
            "SELECT ncr_id, ncr_number, title, severity, source, status, detected_at, created_at
             FROM eqms_ncr_records WHERE {$where} ORDER BY created_at DESC LIMIT :lim OFFSET :off",
            $params
        ) ?? [];
        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_ncr_records WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/ncr/query',
            'items'        => $items,
            'total'        => $total,
            'limit'        => $limit,
            'offset'       => $offset,
        ]);
    }

    /**
     * exception_detail → single NCR record from eqms_ncr_records.
     */
    public function exceptionDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $body = $this->jsonBody();
        $id   = trim((string)($body['id'] ?? ''));
        if ($id === '') {
            $this->error('missing_id', 400, 'Request body must include "id".');
        }

        $row = $this->data->query(
            "SELECT * FROM eqms_ncr_records WHERE ncr_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('ncr_not_found', 404, "NCR '{$id}' not found.");
        }

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/ncr/' . $id,
            'record'       => $row[0],
        ]);
    }

    /**
     * exception_copq_summary → aggregate COPQ metrics from eqms NCR records.
     */
    public function exceptionCopqSummary(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $bySeverity = $this->data->query(
            "SELECT severity, COUNT(*) AS ncr_count FROM eqms_ncr_records GROUP BY severity ORDER BY severity"
        ) ?? [];
        $bySource = $this->data->query(
            "SELECT source, COUNT(*) AS ncr_count FROM eqms_ncr_records GROUP BY source ORDER BY ncr_count DESC"
        ) ?? [];
        $monthly = $this->data->query(
            "SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS ncr_count
             FROM eqms_ncr_records
             WHERE created_at >= NOW() - INTERVAL '12 months'
             GROUP BY month ORDER BY month"
        ) ?? [];

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/ncr/metrics',
            'copq' => [
                'by_severity' => $bySeverity,
                'by_source'   => $bySource,
                'monthly'     => $monthly,
            ],
        ]);
    }

    /**
     * exception_trends → monthly NCR + CAPA counts from EQMS tables.
     */
    public function exceptionTrends(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $ncrTrend = $this->data->query(
            "SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
             FROM eqms_ncr_records WHERE created_at >= NOW() - INTERVAL '12 months'
             GROUP BY month ORDER BY month"
        ) ?? [];
        $capaTrend = $this->data->query(
            "SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
             FROM eqms_capa_records WHERE created_at >= NOW() - INTERVAL '12 months'
             GROUP BY month ORDER BY month"
        ) ?? [];

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/ncr/metrics',
            'trends' => [
                'ncr'  => $ncrTrend,
                'capa' => $capaTrend,
            ],
        ]);
    }

    // ── Exception write shims (410 Gone) ─────────────────────────────────────

    public function exceptionComplaintCreate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/customer-complaints');
    }

    public function exceptionComplaintUpdate(): never
    {
        $this->requireAuth();
        $this->gone('PATCH', '/api/v1/eqms/customer-complaints/{id}');
    }

    public function exceptionMrbCreate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/ncr');
    }

    public function exceptionMrbUpdate(): never
    {
        $this->requireAuth();
        $this->gone('PATCH', '/api/v1/eqms/ncr/{id}');
    }

    public function exceptionDeviationCreate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/deviations');
    }

    public function exceptionDeviationUpdate(): never
    {
        $this->requireAuth();
        $this->gone('PATCH', '/api/v1/eqms/deviations/{id}');
    }

    public function exceptionConcessionCreate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/deviations');
    }

    public function exceptionConcessionUpdate(): never
    {
        $this->requireAuth();
        $this->gone('PATCH', '/api/v1/eqms/deviations/{id}');
    }

    public function exceptionTransition(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/ncr/{id}/actions/{action}');
    }

    public function exceptionEscalate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/ncr/{id}/actions/escalate');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // SUPPLIER QUALITY SHIMS
    // Legacy module: 16-supplier-quality.js
    // New surface:   /api/v1/eqms/suppliers/*, /api/v1/eqms/supplier-audits/*
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * supplier_dashboard → aggregate supplier KPIs from eqms_supplier_profiles.
     */
    public function supplierDashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsSupplierRoles());
        header('X-Deprecated: true');

        $qualified    = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE qualification_status='qualified'") ?? 0);
        $conditional  = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE qualification_status='conditional'") ?? 0);
        $disqualified = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE qualification_status='disqualified'") ?? 0);
        $total        = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles") ?? 0);
        $highRisk     = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE risk_tier='high'") ?? 0);
        $openAudits   = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_audits WHERE status NOT IN ('closed','cancelled')") ?? 0);

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/suppliers',
            'dashboard' => [
                'total'            => $total,
                'qualified'        => $qualified,
                'conditional'      => $conditional,
                'disqualified'     => $disqualified,
                'high_risk'        => $highRisk,
                'open_audits'      => $openAudits,
            ],
        ]);
    }

    /**
     * supplier_scorecard_list → paginated supplier scorecards.
     */
    public function supplierScorecardList(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsSupplierRoles());
        header('X-Deprecated: true');

        $body   = $this->jsonBody();
        $limit  = max(1, min(200, (int)($body['limit']  ?? 50)));
        $offset = max(0, (int)($body['offset'] ?? 0));

        $items = $this->data->query(
            "SELECT ss.scorecard_id, ss.vendor_id, v.vendor_name,
                    ss.period_year, ss.period_quarter, ss.overall_score, ss.grade, ss.created_at
             FROM supplier_scorecards ss
             LEFT JOIN vendors v ON v.vendor_id = ss.vendor_id::text
             ORDER BY ss.period_year DESC, ss.period_quarter DESC
             LIMIT :lim OFFSET :off",
            [':lim' => $limit, ':off' => $offset]
        ) ?? [];
        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM supplier_scorecards") ?? 0);

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/suppliers/{id}/scorecards',
            'items'        => $items,
            'total'        => $total,
            'limit'        => $limit,
            'offset'       => $offset,
        ]);
    }

    /**
     * supplier_scorecard_detail → single scorecard record.
     */
    public function supplierScorecardDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsSupplierRoles());
        header('X-Deprecated: true');

        $body = $this->jsonBody();
        $id   = trim((string)($body['scorecard_id'] ?? $body['id'] ?? ''));
        if ($id === '') {
            $this->error('missing_id', 400, 'Request body must include "scorecard_id".');
        }

        $row = $this->data->query(
            "SELECT ss.*, v.vendor_name
             FROM supplier_scorecards ss
             LEFT JOIN vendors v ON v.vendor_id = ss.vendor_id::text
             WHERE ss.scorecard_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('scorecard_not_found', 404, "Scorecard '{$id}' not found.");
        }

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/suppliers/{vendor_id}/scorecards',
            'record'       => $row[0],
        ]);
    }

    /**
     * supplier_asl_list → Approved Supplier List from eqms_supplier_profiles.
     */
    public function supplierAslList(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsSupplierRoles());
        header('X-Deprecated: true');

        $body   = $this->jsonBody();
        $limit  = max(1, min(200, (int)($body['limit']  ?? 100)));
        $offset = max(0, (int)($body['offset'] ?? 0));

        $items = $this->data->query(
            "SELECT sp.supplier_profile_id, sp.vendor_id, v.vendor_name,
                    sp.qualification_status, sp.risk_tier, sp.last_audit_date, sp.updated_at
             FROM eqms_supplier_profiles sp
             LEFT JOIN vendors v ON v.vendor_id = sp.vendor_id::text
             ORDER BY v.vendor_name
             LIMIT :lim OFFSET :off",
            [':lim' => $limit, ':off' => $offset]
        ) ?? [];
        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles") ?? 0);

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/suppliers',
            'items'        => $items,
            'total'        => $total,
            'limit'        => $limit,
            'offset'       => $offset,
        ]);
    }

    /**
     * supplier_scar_list → SCAR list from eqms_supplier_audits (corrective requests).
     */
    public function supplierScarList(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsSupplierRoles());
        header('X-Deprecated: true');

        $body   = $this->jsonBody();
        $limit  = max(1, min(200, (int)($body['limit']  ?? 50)));
        $offset = max(0, (int)($body['offset'] ?? 0));

        $items = $this->data->query(
            "SELECT sa.supplier_audit_id, sa.vendor_id, v.vendor_name,
                    sa.audit_type, sa.status, sa.planned_start, sa.created_at
             FROM eqms_supplier_audits sa
             LEFT JOIN vendors v ON v.vendor_id = sa.vendor_id::text
             ORDER BY sa.created_at DESC
             LIMIT :lim OFFSET :off",
            [':lim' => $limit, ':off' => $offset]
        ) ?? [];
        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_audits") ?? 0);

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/supplier-audits/query',
            'items'        => $items,
            'total'        => $total,
            'limit'        => $limit,
            'offset'       => $offset,
        ]);
    }

    /**
     * supplier_audit_list → audit list from eqms_supplier_audits.
     */
    public function supplierAuditList(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsSupplierRoles());
        header('X-Deprecated: true');

        $body   = $this->jsonBody();
        $limit  = max(1, min(200, (int)($body['limit']  ?? 50)));
        $offset = max(0, (int)($body['offset'] ?? 0));

        $items = $this->data->query(
            "SELECT sa.supplier_audit_id, sa.vendor_id, v.vendor_name,
                    sa.audit_type, sa.status, sa.planned_start, sa.actual_end, sa.created_at
             FROM eqms_supplier_audits sa
             LEFT JOIN vendors v ON v.vendor_id = sa.vendor_id::text
             ORDER BY sa.planned_start DESC
             LIMIT :lim OFFSET :off",
            [':lim' => $limit, ':off' => $offset]
        ) ?? [];
        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_audits") ?? 0);

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/supplier-audits/query',
            'items'        => $items,
            'total'        => $total,
            'limit'        => $limit,
            'offset'       => $offset,
        ]);
    }

    // ── Supplier write shims (410 Gone) ──────────────────────────────────────

    public function supplierScorecardCalc(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/suppliers/{id}/actions/recalculate-scorecard');
    }

    public function supplierIncomingList(): never
    {
        $this->requireAuth();
        $this->gone('GET', '/api/v1/eqms/suppliers/{id}/iqc');
    }

    public function supplierIncomingCreate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/suppliers/{id}/iqc');
    }

    public function supplierIncomingUpdate(): never
    {
        $this->requireAuth();
        $this->gone('PATCH', '/api/v1/eqms/suppliers/{id}/iqc/{iqc_id}');
    }

    public function supplierSkipLotStatus(): never
    {
        $this->requireAuth();
        $this->gone('GET', '/api/v1/eqms/suppliers/{id}/skip-lot');
    }

    public function supplierSkipLotUpdate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/suppliers/{id}/actions/update-skip-lot');
    }

    public function supplierAslUpsert(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/suppliers');
    }

    public function supplierScarCreate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/supplier-audits');
    }

    public function supplierScarUpdate(): never
    {
        $this->requireAuth();
        $this->gone('PATCH', '/api/v1/eqms/supplier-audits/{id}');
    }

    public function supplierScarTransition(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/supplier-audits/{id}/actions/{action}');
    }

    public function supplierAuditUpsert(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/supplier-audits');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // FMEA & CONTROL PLAN SHIMS
    // Legacy module: 24-fmea-control-plan.js
    // New surface:   /api/v1/eqms/risks/fmea/*, /api/v1/eqms/risks/*
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * fmea_list → paginated FMEA list from fmea_records via EQMS surface.
     */
    public function fmeaList(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $body   = $this->jsonBody();
        $limit  = max(1, min(200, (int)($body['limit']  ?? 50)));
        $offset = max(0, (int)($body['offset'] ?? 0));
        $search = trim((string)($body['search'] ?? ''));

        $conditions = ['1=1'];
        $params     = [':lim' => $limit, ':off' => $offset];
        if ($search !== '') {
            $conditions[] = "(fmea_number ILIKE :search OR title ILIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }
        $where = implode(' AND ', $conditions);

        $items = $this->data->query(
            "SELECT fmea_id, fmea_number, title, fmea_type, status, version, created_at
             FROM fmea_records WHERE {$where} ORDER BY created_at DESC LIMIT :lim OFFSET :off",
            $params
        ) ?? [];
        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM fmea_records WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/risks/fmea/query',
            'items'        => $items,
            'total'        => $total,
            'limit'        => $limit,
            'offset'       => $offset,
        ]);
    }

    /**
     * fmea_detail → FMEA record + failure modes from EQMS tables.
     */
    public function fmeaDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $body = $this->jsonBody();
        $id   = trim((string)($body['fmea_id'] ?? $body['id'] ?? ''));
        if ($id === '') {
            $this->error('missing_id', 400, 'Request body must include "fmea_id".');
        }

        $row = $this->data->query(
            "SELECT * FROM fmea_records WHERE fmea_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('fmea_not_found', 404, "FMEA '{$id}' not found.");
        }

        $failureModes = $this->data->query(
            "SELECT * FROM failure_modes WHERE fmea_id = :id ORDER BY created_at",
            [':id' => $id]
        ) ?? [];

        $this->success([
            'deprecated'    => true,
            'new_endpoint'  => '/api/v1/eqms/risks/fmea/' . $id,
            'record'        => $row[0],
            'failure_modes' => $failureModes,
        ]);
    }

    /**
     * fmea_control_plans → control plan list (from legacy fmea_control_plans or related table).
     */
    public function fmeaControlPlans(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $body   = $this->jsonBody();
        $limit  = max(1, min(200, (int)($body['limit']  ?? 50)));
        $offset = max(0, (int)($body['offset'] ?? 0));

        $items = $this->data->query(
            "SELECT * FROM fmea_control_plans ORDER BY created_at DESC LIMIT :lim OFFSET :off",
            [':lim' => $limit, ':off' => $offset]
        ) ?? [];
        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM fmea_control_plans") ?? 0);

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/risks/fmea/query',
            'items'        => $items,
            'total'        => $total,
            'limit'        => $limit,
            'offset'       => $offset,
        ]);
    }

    /**
     * fmea_cp_detail → single control plan record.
     */
    public function fmeaCpDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $body = $this->jsonBody();
        $id   = trim((string)($body['cp_id'] ?? $body['id'] ?? ''));
        if ($id === '') {
            $this->error('missing_id', 400, 'Request body must include "cp_id".');
        }

        $row = $this->data->query(
            "SELECT * FROM fmea_control_plans WHERE cp_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('control_plan_not_found', 404, "Control Plan '{$id}' not found.");
        }

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/risks/fmea/' . ($row[0]['fmea_id'] ?? $id),
            'record'       => $row[0],
        ]);
    }

    /**
     * fmea_rpn_trend → RPN trend data from failure_modes.
     */
    public function fmeaRpnTrend(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        header('X-Deprecated: true');

        $avgRpn = $this->data->query(
            "SELECT TO_CHAR(fr.created_at, 'YYYY-MM') AS month, ROUND(AVG(fm.rpn), 1) AS avg_rpn
             FROM failure_modes fm
             JOIN fmea_records fr ON fr.fmea_id = fm.fmea_id
             WHERE fr.created_at >= NOW() - INTERVAL '12 months'
             GROUP BY month ORDER BY month"
        ) ?? [];

        $this->success([
            'deprecated'   => true,
            'new_endpoint' => '/api/v1/eqms/risks/fmea/metrics',
            'rpn_trend'    => $avgRpn,
        ]);
    }

    // ── FMEA write shims (410 Gone) ──────────────────────────────────────────

    public function fmeaCreate(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/risks/fmea');
    }

    public function fmeaUpdate(): never
    {
        $this->requireAuth();
        $this->gone('PATCH', '/api/v1/eqms/risks/fmea/{id}');
    }

    public function fmeaAddFailureMode(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/risks/fmea/{id}/actions/add-failure-mode');
    }

    public function fmeaUpdateFailureMode(): never
    {
        $this->requireAuth();
        $this->gone('PATCH', '/api/v1/eqms/risks/fmea/{id}/failure-modes/{fm_id}');
    }

    public function fmeaAddAction(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/risks/fmea/{id}/actions/add-action');
    }

    public function fmeaCompleteAction(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/risks/fmea/{id}/actions/complete-action');
    }

    public function fmeaGenerateCp(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/risks/fmea/{id}/actions/generate-control-plan');
    }

    public function fmeaLinkNcr(): never
    {
        $this->requireAuth();
        $this->gone('POST', '/api/v1/eqms/risks/fmea/{id}/relationships/link');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Emit HTTP 410 Gone with migration instructions.
     *
     * @param string $method     HTTP method of the new endpoint.
     * @param string $newEndpoint New EQMS REST endpoint path.
     */
    private function gone(string $method, string $newEndpoint): never
    {
        http_response_code(410);
        header('Content-Type: application/json');
        header('X-Deprecated: true');
        echo json_encode([
            'error'        => 'endpoint_deprecated',
            'deprecated'   => true,
            'message'      => 'This legacy action key has been removed. '
                            . 'Migrate your client to the EQMS REST surface.',
            'new_method'   => $method,
            'new_endpoint' => $newEndpoint,
            'docs'         => '/api/v1/eqms',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
