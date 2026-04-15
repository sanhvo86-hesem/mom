<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Suppliers Controller — Supplier Quality Network.
 *
 * Manages supplier quality profiles, qualification lifecycle, scorecards,
 * quality agreements, deviations, and SCARs per IATF 16949 §8.4, AS9100D §8.4,
 * and ISO 13485 §7.4 supplier control requirements.
 *
 * Tables: eqms_supplier_profiles (+ reads: supplier_scorecards, vendors)
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsSuppliersController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'supplier_profile';
    private const MODULE      = 'suppliers';

    // ── Role Helpers ─────────────────────────────────────────────────────────

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer',
            'purchasing_manager', 'supplier_quality_engineer',
        ])));
    }

    private function readRoles(): array
    {
        return $this->eqmsReadRoles();
    }

    // ── List / Query ──────────────────────────────────────────────────────────

    /**
     * POST /suppliers/query — Paginated supplier quality profile list.
     *
     * Filters: qualification_status, risk_tier
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $q      = $this->parseQueryBody();
        $f      = $q['filters'];
        $where  = ['1=1'];
        $params = [];

        if (!empty($f['qualification_status'])) {
            $where[]                       = 'sp.qualification_status = :qualification_status';
            $params[':qualification_status'] = (string)$f['qualification_status'];
        }
        if (!empty($f['risk_tier'])) {
            $where[]              = 'sp.risk_tier = :risk_tier';
            $params[':risk_tier'] = (string)$f['risk_tier'];
        }
        if ($q['search'] !== '') {
            $where[]           = "(v.vendor_name ILIKE :search OR v.vendor_code ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['updated_at', 'qualification_date', 'requalification_due', 'risk_tier'], true)
            ? $q['sort_by'] : 'updated_at';

        $rows = $this->data->query(
            "SELECT sp.supplier_profile_id, sp.vendor_id, v.vendor_name, v.vendor_code,
                    sp.qualification_status, sp.qualification_date, sp.requalification_due,
                    sp.risk_tier, sp.approved_categories, sp.notes, sp.version, sp.updated_at
             FROM eqms_supplier_profiles sp
             JOIN vendors v ON v.vendor_id = sp.vendor_id
             WHERE {$whereClause}
             ORDER BY sp.{$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_supplier_profiles sp
             JOIN vendors v ON v.vendor_id = sp.vendor_id
             WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('supplier_profiles', $rows, $total, $q['offset'], $q['limit']);
    }

    // ── Metrics ───────────────────────────────────────────────────────────────

    /**
     * GET /suppliers/metrics — Aggregate supplier quality stats.
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $qualified   = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE qualification_status = 'qualified'") ?? 0);
        $conditional = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE qualification_status = 'conditional'") ?? 0);
        $disqualified = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE qualification_status = 'disqualified'") ?? 0);
        $highRisk    = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE risk_tier = 'high'") ?? 0);
        $requalDue   = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_supplier_profiles
             WHERE qualification_status = 'qualified' AND requalification_due <= (now() + interval '30 days')"
        ) ?? 0);
        $avgScore    = (float)($this->data->scalar(
            "SELECT ROUND(AVG(overall_score)::numeric, 1) FROM supplier_scorecards WHERE period_end >= date_trunc('year', now())"
        ) ?? 0.0);

        $this->success([
            'metrics' => [
                'qualified_count'       => $qualified,
                'conditional_count'     => $conditional,
                'disqualified_count'    => $disqualified,
                'high_risk_count'       => $highRisk,
                'requalification_due_30d' => $requalDue,
                'avg_scorecard_score_ytd' => $avgScore,
            ],
        ]);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * POST /suppliers — Create/register a supplier quality profile.
     *
     * Requires vendor_id (FK to vendors table).
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id']);

        // Prevent duplicate profile per vendor
        $existing = $this->data->scalar(
            "SELECT supplier_profile_id FROM eqms_supplier_profiles WHERE vendor_id = :vid LIMIT 1",
            [':vid' => (string)$body['vendor_id']]
        );
        if ($existing !== null) {
            $this->error('supplier_profile_exists', 409, "A quality profile already exists for vendor '{$body['vendor_id']}'.");
        }

        $profileId = $this->newUuid();
        $actor     = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now       = $this->nowIso();

        $this->data->execute(
            "INSERT INTO eqms_supplier_profiles
             (supplier_profile_id, vendor_id, qualification_status, qualification_date,
              requalification_due, risk_tier, approved_categories, quality_agreement_ids,
              notes, version, updated_at, updated_by)
             VALUES
             (:pid, :vid, :qstatus, :qdate,
              :rqdue, :rtier, :cats::jsonb, :qids::jsonb,
              :notes, 1, :now, :by)",
            [
                ':pid'     => $profileId,
                ':vid'     => (string)$body['vendor_id'],
                ':qstatus' => (string)($body['qualification_status'] ?? 'under_review'),
                ':qdate'   => (string)($body['qualification_date'] ?? ''),
                ':rqdue'   => (string)($body['requalification_due'] ?? ''),
                ':rtier'   => (string)($body['risk_tier'] ?? 'medium'),
                ':cats'    => json_encode($body['approved_categories'] ?? [], JSON_THROW_ON_ERROR),
                ':qids'    => json_encode($body['quality_agreement_ids'] ?? [], JSON_THROW_ON_ERROR),
                ':notes'   => (string)($body['notes'] ?? ''),
                ':now'     => $now,
                ':by'      => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.supplier_profile.created', self::ENTITY_TYPE, $profileId, [
            'vendor_id' => (string)$body['vendor_id'],
        ], $user);

        $this->success([
            'supplier_profile' => [
                'supplier_profile_id'  => $profileId,
                'vendor_id'            => (string)$body['vendor_id'],
                'qualification_status' => (string)($body['qualification_status'] ?? 'under_review'),
                'version'              => 1,
            ],
        ], 201);
    }

    // ── Detail ────────────────────────────────────────────────────────────────

    /**
     * GET /suppliers/{id} — Full supplier quality profile.
     */
    public function detail(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();

        $row = $this->data->query(
            "SELECT sp.*, v.vendor_name, v.vendor_code, v.country, v.contact_email
             FROM eqms_supplier_profiles sp
             JOIN vendors v ON v.vendor_id = sp.vendor_id
             WHERE sp.supplier_profile_id = :id LIMIT 1",
            [':id' => $profileId]
        );
        if (empty($row)) {
            $this->error('supplier_profile_not_found', 404);
        }

        $this->success(['supplier_profile' => $row[0]]);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * PATCH /suppliers/{id} — Update qualification notes and risk tier.
     */
    public function update(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $profileId = $this->requirePathId();

        $existing = $this->data->query(
            "SELECT supplier_profile_id, version FROM eqms_supplier_profiles WHERE supplier_profile_id = :id LIMIT 1",
            [':id' => $profileId]
        );
        if (empty($existing)) {
            $this->error('supplier_profile_not_found', 404);
        }
        $rec = $existing[0];
        $this->requireVersionMatch((int)$rec['version'], $profileId);

        $body    = $this->jsonBody();
        $allowed = ['notes', 'risk_tier', 'requalification_due'];
        $sets    = [];
        $params  = [':id' => $profileId, ':ver' => (int)$rec['version'] + 1, ':now' => $this->nowIso(), ':by' => (string)($user['username'] ?? 'unknown')];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]              = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }
        if (empty($sets)) {
            $this->error('no_updatable_fields', 400);
        }
        $sets[] = 'version = :ver';
        $sets[] = 'updated_at = :now';
        $sets[] = 'updated_by = :by';

        $this->data->execute(
            "UPDATE eqms_supplier_profiles SET " . implode(', ', $sets) . " WHERE supplier_profile_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.supplier_profile.updated', self::ENTITY_TYPE, $profileId, [], $user);
        $this->success(['updated' => true, 'supplier_profile_id' => $profileId, 'version' => (int)$rec['version'] + 1]);
    }

    // ── Audit Trail ───────────────────────────────────────────────────────────

    /** GET /suppliers/{id}/audit */
    public function audit(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();
        $this->serveAuditTrail(self::ENTITY_TYPE, $profileId);
    }

    // ── Sub-resource Endpoints ────────────────────────────────────────────────

    /**
     * GET /suppliers/{id}/scorecards — List supplier scorecards.
     */
    public function scorecards(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();

        // Resolve vendor_id from profile
        $vendorId = $this->data->scalar(
            "SELECT vendor_id FROM eqms_supplier_profiles WHERE supplier_profile_id = :id",
            [':id' => $profileId]
        );
        if ($vendorId === null) {
            $this->error('supplier_profile_not_found', 404);
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        $rows = $this->data->query(
            "SELECT scorecard_id, vendor_id, period_start, period_end,
                    delivery_score, quality_score, responsiveness_score, overall_score,
                    prepared_by, approved_by, issued_at
             FROM supplier_scorecards WHERE vendor_id = :vid
             ORDER BY period_end DESC LIMIT :lim OFFSET :off",
            [':vid' => $vendorId, ':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM supplier_scorecards WHERE vendor_id = :vid",
            [':vid' => $vendorId]
        ) ?? 0);

        $this->paginated('scorecards', $rows, $total, $offset, $limit);
    }

    /**
     * GET /suppliers/{id}/qualifications — Qualification history.
     */
    public function qualifications(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();

        $rows = $this->data->query(
            "SELECT qualification_event_id, supplier_profile_id, event_type,
                    qualification_status, event_date, performed_by, notes, created_at
             FROM eqms_supplier_qualification_events
             WHERE supplier_profile_id = :id
             ORDER BY event_date DESC",
            [':id' => $profileId]
        ) ?? [];

        $this->success(['qualifications' => $rows]);
    }

    /**
     * GET /suppliers/{id}/quality-agreements — List quality agreements.
     */
    public function qualityAgreements(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        $rows = $this->data->query(
            "SELECT qa.agreement_id, qa.supplier_profile_id, qa.agreement_number,
                    qa.title, qa.effective_date, qa.expiry_date, qa.status, qa.storage_ref, qa.created_at
             FROM eqms_quality_agreements qa
             WHERE qa.supplier_profile_id = :id
             ORDER BY qa.effective_date DESC
             LIMIT :lim OFFSET :off",
            [':id' => $profileId, ':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_quality_agreements WHERE supplier_profile_id = :id",
            [':id' => $profileId]
        ) ?? 0);

        $this->paginated('quality_agreements', $rows, $total, $offset, $limit);
    }

    /**
     * POST /suppliers/{id}/quality-agreements — Create a new quality agreement record.
     */
    public function createQualityAgreement(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $profileId = $this->requirePathId();

        // Verify profile exists
        $exists = $this->data->scalar(
            "SELECT 1 FROM eqms_supplier_profiles WHERE supplier_profile_id = :id",
            [':id' => $profileId]
        );
        if ($exists === null) {
            $this->error('supplier_profile_not_found', 404);
        }

        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'effective_date']);

        $agreementId     = $this->newUuid();
        $agreementNumber = 'QAG-' . strtoupper(substr($agreementId, 0, 8));
        $actor           = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO eqms_quality_agreements
             (agreement_id, supplier_profile_id, agreement_number, title,
              effective_date, expiry_date, status, storage_ref, created_at, created_by)
             VALUES
             (:id, :pid, :num, :title,
              :eff, :exp, 'active', :ref, now(), :by)",
            [
                ':id'    => $agreementId,
                ':pid'   => $profileId,
                ':num'   => $agreementNumber,
                ':title' => (string)$body['title'],
                ':eff'   => (string)$body['effective_date'],
                ':exp'   => (string)($body['expiry_date'] ?? ''),
                ':ref'   => (string)($body['storage_ref'] ?? ''),
                ':by'    => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.supplier_profile.quality_agreement_created', self::ENTITY_TYPE, $profileId, [
            'agreement_id'     => $agreementId,
            'agreement_number' => $agreementNumber,
        ], $user);

        $this->success([
            'quality_agreement' => [
                'agreement_id'     => $agreementId,
                'agreement_number' => $agreementNumber,
                'status'           => 'active',
            ],
        ], 201);
    }

    /**
     * POST /suppliers/{id}/quality-agreements/{agreementId}/actions/acknowledge
     *
     * Partner acknowledgement that the quality agreement terms have been reviewed and accepted.
     * Writes a timestamped acknowledgement event. Does not require esig but records actor.
     */
    public function agreementActionAcknowledge(): never
    {
        $user        = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $profileId   = $this->requirePathId('id', 'supplier_profile_id');
        $agreementId = $this->requirePathId('agreementId', 'agreement_id');

        $rec = $this->data->row(
            "SELECT agreement_id, status, version FROM eqms_quality_agreements
             WHERE agreement_id = :aid AND supplier_profile_id = :pid",
            [':aid' => $agreementId, ':pid' => $profileId]
        );
        if ($rec === null) {
            $this->error('quality_agreement_not_found', 404);
        }
        if (!in_array($rec['status'], ['active', 'under_review'], true)) {
            $this->error('invalid_transition', 409,
                "Acknowledgement is only allowed on active or under_review agreements. Current status: {$rec['status']}");
        }

        $body  = $this->jsonBody();
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_quality_agreements
             SET acknowledged_by = :actor,
                 acknowledged_at = :now,
                 version         = :ver,
                 updated_at      = :now
             WHERE agreement_id = :aid",
            [
                ':actor' => $actor,
                ':now'   => $now,
                ':ver'   => (int)$rec['version'] + 1,
                ':aid'   => $agreementId,
            ]
        );

        $this->emitQualityEvent(
            'eqms.quality_agreement.acknowledged',
            'quality_agreement',
            $agreementId,
            [
                'supplier_profile_id' => $profileId,
                'acknowledged_by'     => $actor,
                'acknowledgement_note' => (string)($body['note'] ?? ''),
            ],
            $user
        );

        $this->success([
            'agreement_id'    => $agreementId,
            'acknowledged_by' => $actor,
            'acknowledged_at' => $now,
            'version'         => (int)$rec['version'] + 1,
        ]);
    }

    /**
     * POST /suppliers/{id}/quality-agreements/{agreementId}/actions/expire
     *
     * Marks a quality agreement as expired and optionally triggers a renewal prompt.
     * Typically called by a scheduler, but can also be triggered manually by quality_manager.
     */
    public function agreementActionExpire(): never
    {
        $user        = $this->requireAuth();
        $this->requireAnyRole($user, array_merge(admin_roles(), ['quality_manager', 'qa_manager', 'qms_manager']));
        $profileId   = $this->requirePathId('id', 'supplier_profile_id');
        $agreementId = $this->requirePathId('agreementId', 'agreement_id');

        $rec = $this->data->row(
            "SELECT agreement_id, status, version, expiry_date FROM eqms_quality_agreements
             WHERE agreement_id = :aid AND supplier_profile_id = :pid",
            [':aid' => $agreementId, ':pid' => $profileId]
        );
        if ($rec === null) {
            $this->error('quality_agreement_not_found', 404);
        }
        if ($rec['status'] === 'expired') {
            $this->error('already_expired', 409, "Quality agreement is already in expired status.");
        }
        if (!in_array($rec['status'], ['active', 'under_review'], true)) {
            $this->error('invalid_transition', 409,
                "Expire is only allowed on active or under_review agreements. Current status: {$rec['status']}");
        }

        $body  = $this->jsonBody();
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_quality_agreements
             SET status     = 'expired',
                 version    = :ver,
                 updated_at = :now,
                 updated_by = :actor
             WHERE agreement_id = :aid",
            [
                ':ver'   => (int)$rec['version'] + 1,
                ':now'   => $now,
                ':actor' => $actor,
                ':aid'   => $agreementId,
            ]
        );

        $renewalPrompted = (bool)($body['prompt_renewal'] ?? true);

        $this->emitQualityEvent(
            'eqms.quality_agreement.expired',
            'quality_agreement',
            $agreementId,
            [
                'supplier_profile_id' => $profileId,
                'expiry_date'         => (string)($rec['expiry_date'] ?? ''),
                'renewal_prompted'    => $renewalPrompted,
                'expired_by'          => $actor,
                'reason'              => (string)($body['reason'] ?? 'manual_expiration'),
            ],
            $user
        );

        $this->success([
            'agreement_id'     => $agreementId,
            'status'           => 'expired',
            'renewal_prompted' => $renewalPrompted,
            'version'          => (int)$rec['version'] + 1,
        ]);
    }

    /**
     * GET /suppliers/{id}/deviations — Deviations linked to this supplier.
     */
    public function deviations(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();

        $vendorId = $this->data->scalar(
            "SELECT vendor_id FROM eqms_supplier_profiles WHERE supplier_profile_id = :id",
            [':id' => $profileId]
        );
        if ($vendorId === null) {
            $this->error('supplier_profile_not_found', 404);
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        $rows = $this->data->query(
            "SELECT deviation_id, deviation_number, title, category, severity, status, created_at
             FROM eqms_deviations
             WHERE vendor_id = :vid
             ORDER BY created_at DESC LIMIT :lim OFFSET :off",
            [':vid' => $vendorId, ':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_deviations WHERE vendor_id = :vid",
            [':vid' => $vendorId]
        ) ?? 0);

        $this->paginated('deviations', $rows, $total, $offset, $limit);
    }

    /**
     * GET /suppliers/{id}/scars — SCARs for this supplier.
     */
    public function scars(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();

        $vendorId = $this->data->scalar(
            "SELECT vendor_id FROM eqms_supplier_profiles WHERE supplier_profile_id = :id",
            [':id' => $profileId]
        );
        if ($vendorId === null) {
            $this->error('supplier_profile_not_found', 404);
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        $rows = $this->data->query(
            "SELECT scar_id, scar_number, priority, description,
                    root_cause, assigned_to, response_due_date, status, created_at
             FROM eqms_scars WHERE vendor_id = :vid
             ORDER BY created_at DESC LIMIT :lim OFFSET :off",
            [':vid' => $vendorId, ':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_scars WHERE vendor_id = :vid",
            [':vid' => $vendorId]
        ) ?? 0);

        $this->paginated('scars', $rows, $total, $offset, $limit);
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * POST /suppliers/{id}/actions/qualify
     *
     * Body: { qualification_date, requalification_due, approved_categories }
     * Emits qualification event.
     */
    public function actionQualify(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $profileId = $this->requirePathId();

        $existing = $this->data->query(
            "SELECT supplier_profile_id, version, qualification_status FROM eqms_supplier_profiles
             WHERE supplier_profile_id = :id LIMIT 1",
            [':id' => $profileId]
        );
        if (empty($existing)) {
            $this->error('supplier_profile_not_found', 404);
        }
        $rec = $existing[0];
        $this->requireVersionMatch((int)$rec['version'], $profileId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['qualification_date', 'requalification_due', 'approved_categories']);

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_supplier_profiles
             SET qualification_status = 'qualified',
                 qualification_date   = :qdate,
                 requalification_due  = :rqdue,
                 approved_categories  = :cats::jsonb,
                 version              = :ver,
                 updated_at           = :now,
                 updated_by           = :by
             WHERE supplier_profile_id = :id",
            [
                ':qdate' => (string)$body['qualification_date'],
                ':rqdue' => (string)$body['requalification_due'],
                ':cats'  => json_encode($body['approved_categories'], JSON_THROW_ON_ERROR),
                ':ver'   => (int)$rec['version'] + 1,
                ':now'   => $now,
                ':by'    => $actor,
                ':id'    => $profileId,
            ]
        );

        // Record qualification history event
        $this->data->execute(
            "INSERT INTO eqms_supplier_qualification_events
             (qualification_event_id, supplier_profile_id, event_type,
              qualification_status, event_date, performed_by, notes, created_at)
             VALUES (:eid, :pid, 'qualified', 'qualified', :edate, :by, :notes, :now)",
            [
                ':eid'   => $this->newUuid(),
                ':pid'   => $profileId,
                ':edate' => (string)$body['qualification_date'],
                ':by'    => $actor,
                ':notes' => (string)($body['notes'] ?? ''),
                ':now'   => $now,
            ]
        );

        $this->emitQualityEvent('eqms.supplier_profile.qualified', self::ENTITY_TYPE, $profileId, [
            'qualification_date'  => (string)$body['qualification_date'],
            'requalification_due' => (string)$body['requalification_due'],
        ], $user);

        $this->success([
            'supplier_profile_id'  => $profileId,
            'qualification_status' => 'qualified',
            'version'              => (int)$rec['version'] + 1,
        ]);
    }

    /**
     * POST /suppliers/{id}/actions/disqualify
     *
     * Body: { disqualification_reason }
     * REQUIRES electronic signature from quality_manager.
     */
    public function actionDisqualify(): never
    {
        $user = $this->requireAuth();
        // Disqualification restricted to quality management roles
        $this->requireAnyRole($user, array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'qms_manager',
        ]))));
        $profileId = $this->requirePathId();

        $existing = $this->data->query(
            "SELECT supplier_profile_id, version, qualification_status FROM eqms_supplier_profiles
             WHERE supplier_profile_id = :id LIMIT 1",
            [':id' => $profileId]
        );
        if (empty($existing)) {
            $this->error('supplier_profile_not_found', 404);
        }
        $rec = $existing[0];
        $this->requireVersionMatch((int)$rec['version'], $profileId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['disqualification_reason']);
        $this->requireElectronicSignature($user, 'disqualify', $profileId);

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE eqms_supplier_profiles
             SET qualification_status = 'disqualified',
                 notes      = :reason,
                 version    = :ver,
                 updated_at = :now,
                 updated_by = :by
             WHERE supplier_profile_id = :id",
            [
                ':reason' => (string)$body['disqualification_reason'],
                ':ver'    => (int)$rec['version'] + 1,
                ':now'    => $now,
                ':by'     => $actor,
                ':id'     => $profileId,
            ]
        );

        $this->data->execute(
            "INSERT INTO eqms_supplier_qualification_events
             (qualification_event_id, supplier_profile_id, event_type,
              qualification_status, event_date, performed_by, notes, created_at)
             VALUES (:eid, :pid, 'disqualified', 'disqualified', :edate, :by, :notes, :now)",
            [
                ':eid'   => $this->newUuid(),
                ':pid'   => $profileId,
                ':edate' => $now,
                ':by'    => $actor,
                ':notes' => (string)$body['disqualification_reason'],
                ':now'   => $now,
            ]
        );

        $this->emitQualityEvent('eqms.supplier_profile.disqualified', self::ENTITY_TYPE, $profileId, [
            'disqualification_reason' => (string)$body['disqualification_reason'],
        ], $user);

        $this->success([
            'supplier_profile_id'  => $profileId,
            'qualification_status' => 'disqualified',
            'version'              => (int)$rec['version'] + 1,
        ]);
    }

    // ── Bulk Export ───────────────────────────────────────────────────────────

    /** POST /suppliers/export — Bulk export */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }
}
