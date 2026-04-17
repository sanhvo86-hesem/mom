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

    private function supplierVendorId(string $profileId): string
    {
        $vendorId = $this->data->scalar(
            "SELECT vendor_id FROM eqms_supplier_profiles WHERE supplier_profile_id = :id",
            [':id' => $profileId]
        );
        if ($vendorId === null) {
            $this->error('supplier_profile_not_found', 404);
        }
        return (string)$vendorId;
    }

    private function loadQualityAgreement(string $agreementId): array
    {
        $row = $this->data->query(
            "SELECT qa.*, sp.supplier_profile_id, v.vendor_name
             FROM eqms_quality_agreements qa
             LEFT JOIN eqms_supplier_profiles sp ON sp.vendor_id = qa.vendor_id
             LEFT JOIN vendors v ON v.vendor_id = qa.vendor_id::text
             WHERE qa.agreement_id = :id LIMIT 1",
            [':id' => $agreementId]
        );
        if (empty($row)) {
            $this->error('quality_agreement_not_found', 404);
        }
        return $row[0];
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
            $where[]           = "(v.vendor_name ILIKE :search OR v.vendor_id ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['updated_at', 'qualification_date', 'requalification_due', 'risk_tier'], true)
            ? $q['sort_by'] : 'updated_at';

        $rows = $this->data->query(
            "SELECT sp.supplier_profile_id, sp.supplier_profile_id AS id,
                    sp.vendor_id, sp.vendor_id AS supplier_id,
                    v.vendor_name, v.vendor_name AS name,
                    sp.qualification_status, sp.qualification_date, sp.requalification_due,
                    sp.risk_tier, sp.approved_categories, sp.notes, sp.version, sp.updated_at
             FROM eqms_supplier_profiles sp
             JOIN vendors v ON v.vendor_id = sp.vendor_id::text
             WHERE {$whereClause}
             ORDER BY sp.{$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_supplier_profiles sp
             JOIN vendors v ON v.vendor_id = sp.vendor_id::text
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
        $total       = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles") ?? 0);
        $conditional = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE qualification_status = 'conditional'") ?? 0);
        $disqualified = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE qualification_status = 'disqualified'") ?? 0);
        $highRisk    = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_supplier_profiles WHERE risk_tier = 'high'") ?? 0);
        $requalDue   = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_supplier_profiles
             WHERE qualification_status = 'qualified' AND requalification_due <= (now() + interval '30 days')"
        ) ?? 0);
        $avgScore    = (float)($this->data->scalar(
            "SELECT ROUND(AVG(overall_score)::numeric, 1) FROM supplier_scorecards WHERE created_at >= date_trunc('year', now())"
        ) ?? 0.0);
        $openScars   = (int)($this->data->scalar("SELECT COUNT(*) FROM eqms_scars WHERE status <> 'closed'") ?? 0);

        $this->success([
            'metrics' => [
                'total_suppliers'       => $total,
                'qualified_count'       => $qualified,
                'conditional_count'     => $conditional,
                'disqualified_count'    => $disqualified,
                'high_risk_count'       => $highRisk,
                'requalification_due_30d' => $requalDue,
                'avg_scorecard_score_ytd' => $avgScore,
                'avg_quality_score'     => $avgScore,
                'qualification_coverage' => $total > 0 ? round(($qualified / $total) * 100, 1) : 0,
                'open_scars'            => $openScars,
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
            "SELECT sp.*, sp.supplier_profile_id AS id, sp.vendor_id AS supplier_id,
                    v.vendor_name, v.vendor_name AS name, v.country, v.contact_email
             FROM eqms_supplier_profiles sp
             JOIN vendors v ON v.vendor_id = sp.vendor_id::text
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

    public function comments(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $profileId = $this->requirePathId();
        $this->serveComments(self::ENTITY_TYPE, $profileId, $user);
    }

    public function attachments(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $profileId = $this->requirePathId();
        $this->serveAttachments(self::ENTITY_TYPE, $profileId, $user);
    }

    public function relationships(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $profileId, $user);
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
            "SELECT scorecard_id, vendor_id, period,
                    delivery_score, quality_score, overall_score,
                    created_at
             FROM supplier_scorecards WHERE vendor_id = :vid
             ORDER BY created_at DESC LIMIT :lim OFFSET :off",
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
            "SELECT event_id AS qualification_event_id, event_id AS id,
                    supplier_profile_id,
                    event_type, event_type AS qualification_status,
                    event_type AS status, event_type AS standard,
                    event_date, event_date AS qualification_date,
                    recorded_by AS performed_by, recorded_by AS auditor,
                    notes, notes AS evidence, created_at
             FROM eqms_supplier_qualification_events
             WHERE supplier_profile_id = :id
             ORDER BY event_date DESC",
            [':id' => $profileId]
        ) ?? [];

        $this->success(['qualifications' => $rows]);
    }

    /**
     * POST action:eqms_quality_agreements_query — Global list of quality agreements
     * (used by standalone module 62-eqms-quality-agreements.js).
     */
    public function qualityAgreementsSearch(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        $body    = $this->jsonBody();
        $filters = is_array($body['filters'] ?? null) ? $body['filters'] : [];
        $offset  = max(0, (int)($body['offset'] ?? 0));
        $limit   = min(200, max(1, (int)($body['limit'] ?? 25)));
        $sortBy  = in_array($body['sort_by'] ?? '', ['effective_date', 'expiry_date', 'status', 'created_at'], true)
                 ? $body['sort_by'] : 'created_at';
        $sortDir = strtoupper($body['sort_dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        $where  = [];
        $params = [':lim' => $limit, ':off' => $offset];

        if (!empty($filters['status'])) {
            $where[] = 'qa.status = :status';
            $params[':status'] = $filters['status'];
        }
        if (!empty($filters['supplier_id'])) {
            $where[] = 'sp.vendor_id = :vendor_id';
            $params[':vendor_id'] = $filters['supplier_id'];
        }
        if (!empty($body['search'])) {
            $where[] = "(qa.title ILIKE :search OR qa.agreement_number ILIKE :search)";
            $params[':search'] = '%' . $body['search'] . '%';
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $rows = $this->data->query(
            "SELECT qa.agreement_id, qa.agreement_number, qa.title,
                    qa.vendor_id, sp.supplier_profile_id,
                    qa.effective_date, qa.expiry_date, qa.status, qa.created_at
             FROM eqms_quality_agreements qa
             LEFT JOIN eqms_supplier_profiles sp ON sp.vendor_id = qa.vendor_id
             {$whereClause}
             ORDER BY qa.{$sortBy} {$sortDir}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_quality_agreements qa
             LEFT JOIN eqms_supplier_profiles sp ON sp.vendor_id = qa.vendor_id
             {$whereClause}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('data', $rows, $total, $offset, $limit);
    }

    /**
     * GET /suppliers/{id}/quality-agreements — List quality agreements for a supplier.
     */
    public function qualityAgreements(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $profileId = $this->requirePathId();
        $vendorId  = $this->supplierVendorId($profileId);

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        $rows = $this->data->query(
            "SELECT qa.agreement_id, qa.vendor_id, qa.agreement_number,
                    qa.title, qa.effective_date, qa.expiry_date, qa.status, qa.created_at
             FROM eqms_quality_agreements qa
             WHERE qa.vendor_id = :id
             ORDER BY qa.effective_date DESC
             LIMIT :lim OFFSET :off",
            [':id' => $vendorId, ':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_quality_agreements WHERE vendor_id = :id",
            [':id' => $vendorId]
        ) ?? 0);

        $this->paginated('quality_agreements', $rows, $total, $offset, $limit);
    }

    public function qualityAgreementDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $agreementId = $this->requirePathId('id', 'agreement_id');
        $agreement = $this->loadQualityAgreement($agreementId);
        $this->success([
            'quality_agreement' => $agreement,
            'clauses' => is_array($agreement['key_requirements'] ?? null) ? $agreement['key_requirements'] : json_decode((string)($agreement['key_requirements'] ?? '[]'), true),
        ]);
    }

    /**
     * POST /suppliers/{id}/quality-agreements — Create a new quality agreement record.
     */
    public function createQualityAgreement(): never
    {
        $user      = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $profileId = $this->requirePathId();
        $vendorId  = $this->supplierVendorId($profileId);

        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'effective_date']);

        $agreementId     = $this->newUuid();
        $agreementNumber = 'QAG-' . strtoupper(substr($agreementId, 0, 8));
        $actor           = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO eqms_quality_agreements
             (agreement_id, vendor_id, agreement_number, title,
              effective_date, expiry_date, scope, key_requirements, document_ref,
              status, created_at, created_by)
             VALUES
             (:id, :vid, :num, :title,
              :eff, :exp, :scope, :reqs::jsonb, :ref,
              :status, now(), :by)",
            [
                ':id'    => $agreementId,
                ':vid'   => $vendorId,
                ':num'   => $agreementNumber,
                ':title' => (string)$body['title'],
                ':eff'   => (string)$body['effective_date'],
                ':exp'   => ($body['expiry_date'] ?? null) ?: null,
                ':scope' => (string)($body['scope'] ?? ''),
                ':reqs'  => json_encode($body['key_requirements'] ?? [], JSON_THROW_ON_ERROR),
                ':ref'   => (string)($body['document_ref'] ?? $body['storage_ref'] ?? ''),
                ':status' => (string)($body['status'] ?? 'draft'),
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
                'vendor_id'         => $vendorId,
                'status'           => (string)($body['status'] ?? 'draft'),
            ],
        ], 201);
    }

    public function qualityAgreementCreateStandalone(): never
    {
        $body = $this->jsonBody();
        $profileId = trim((string)($body['supplier_profile_id'] ?? $body['profile_id'] ?? ''));
        if ($profileId === '') {
            $this->error('supplier_profile_required', 400, 'Creating a quality agreement requires a real supplier_profile_id.');
        }
        $_GET['id'] = $profileId;
        $this->createQualityAgreement();
    }

    public function qualityAgreementUpdate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $agreementId = $this->requirePathId('id', 'agreement_id');
        $rec = $this->loadQualityAgreement($agreementId);
        $body = $this->jsonBody();
        $action = trim((string)($body['action'] ?? ''));
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now = $this->nowIso();

        if ($action !== '') {
            $statusMap = [
                'submit-review' => 'under_review',
                'activate' => 'active',
                'request-renewal' => 'renewal_pending',
                'expire' => 'expired',
                'terminate' => 'terminated',
            ];
            if ($action === 'acknowledge') {
                $this->data->execute(
                    "UPDATE eqms_quality_agreements
                     SET acknowledged_by = :actor, acknowledged_at = :now,
                         version = version + 1, updated_at = :now, updated_by = :actor
                     WHERE agreement_id = :id",
                    [':actor' => $actor, ':now' => $now, ':id' => $agreementId]
                );
            } elseif (isset($statusMap[$action])) {
                $this->data->execute(
                    "UPDATE eqms_quality_agreements
                     SET status = :status, version = version + 1, updated_at = :now, updated_by = :actor
                     WHERE agreement_id = :id",
                    [':status' => $statusMap[$action], ':now' => $now, ':actor' => $actor, ':id' => $agreementId]
                );
            } else {
                $this->error('unsupported_quality_agreement_action', 400, "Action '{$action}' is not supported.");
            }

            $this->emitQualityEvent('eqms.quality_agreement.' . str_replace('-', '_', $action), 'quality_agreement', $agreementId, [
                'previous_status' => (string)($rec['status'] ?? ''),
            ], $user);
            $this->success(['quality_agreement' => $this->loadQualityAgreement($agreementId)]);
        }

        $allowed = ['title', 'effective_date', 'expiry_date', 'scope', 'document_ref', 'status'];
        $sets = ['version = version + 1', 'updated_at = :now', 'updated_by = :actor'];
        $params = [':id' => $agreementId, ':now' => $now, ':actor' => $actor];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $sets[] = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }
        if (array_key_exists('key_requirements', $body)) {
            $sets[] = "key_requirements = :key_requirements::jsonb";
            $params[':key_requirements'] = json_encode($body['key_requirements'], JSON_THROW_ON_ERROR);
        }
        if (count($sets) === 3) {
            $this->error('no_updatable_fields', 400);
        }
        $this->data->execute(
            "UPDATE eqms_quality_agreements SET " . implode(', ', $sets) . " WHERE agreement_id = :id",
            $params
        );
        $this->success(['quality_agreement' => $this->loadQualityAgreement($agreementId)]);
    }

    public function qualityAgreementMetrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM eqms_quality_agreements GROUP BY status ORDER BY status"
        ) ?? [];
        $expiring = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_quality_agreements
             WHERE status IN ('active', 'renewal_pending') AND expiry_date <= (now() + interval '60 days')::date"
        ) ?? 0);
        $this->success(['metrics' => ['by_status' => $byStatus, 'expiring_60d' => $expiring]]);
    }

    public function qualityAgreementAudit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $agreementId = $this->requirePathId('id', 'agreement_id');
        $this->serveAuditTrail('quality_agreement', $agreementId);
    }

    public function qualityAgreementSignatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $agreementId = $this->requirePathId('id', 'agreement_id');
        $this->serveSignatures('quality_agreement', $agreementId, $user);
    }

    public function qualityAgreementComments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $agreementId = $this->requirePathId('id', 'agreement_id');
        $this->serveComments('quality_agreement', $agreementId, $user);
    }

    public function qualityAgreementAttachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->method() === 'POST' ? $this->writeRoles() : $this->readRoles());
        $agreementId = $this->requirePathId('id', 'agreement_id');
        $this->serveAttachments('quality_agreement', $agreementId, $user);
    }

    public function qualityAgreementRelationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $agreementId = $this->requirePathId('id', 'agreement_id');
        $this->serveRelationships('quality_agreement', $agreementId, $user);
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
        $vendorId     = $this->supplierVendorId($profileId);

        $rec = $this->data->row(
            "SELECT agreement_id, status, version FROM eqms_quality_agreements
             WHERE agreement_id = :aid AND vendor_id = :vid",
            [':aid' => $agreementId, ':vid' => $vendorId]
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
        $vendorId     = $this->supplierVendorId($profileId);

        $rec = $this->data->row(
            "SELECT agreement_id, status, version, expiry_date FROM eqms_quality_agreements
             WHERE agreement_id = :aid AND vendor_id = :vid",
            [':aid' => $agreementId, ':vid' => $vendorId]
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

        $this->supplierVendorId($profileId);

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        $rows = $this->data->query(
            "SELECT d.deviation_id, d.deviation_id AS record_id,
                    d.deviation_number, d.deviation_number AS record_number,
                    d.title, d.severity, d.status, d.created_at,
                    'deviation' AS entity_type, 'deviation' AS type,
                    l.relationship_type
             FROM eqms_deviations d
             JOIN eqms_record_links l
               ON (
                    l.source_type = 'supplier_profile'
                    AND l.source_id = CAST(:sid_source AS uuid)
                    AND l.target_type = 'deviation'
                    AND l.target_id = d.deviation_id
                  )
               OR (
                    l.target_type = 'supplier_profile'
                    AND l.target_id = CAST(:sid_target AS uuid)
                    AND l.source_type = 'deviation'
                    AND l.source_id = d.deviation_id
                  )
             ORDER BY d.created_at DESC LIMIT :lim OFFSET :off",
            [':sid_source' => $profileId, ':sid_target' => $profileId, ':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*)
             FROM eqms_deviations d
             JOIN eqms_record_links l
               ON (
                    l.source_type = 'supplier_profile'
                    AND l.source_id = CAST(:sid_source AS uuid)
                    AND l.target_type = 'deviation'
                    AND l.target_id = d.deviation_id
                  )
               OR (
                    l.target_type = 'supplier_profile'
                    AND l.target_id = CAST(:sid_target AS uuid)
                    AND l.source_type = 'deviation'
                    AND l.source_id = d.deviation_id
                  )",
            [':sid_source' => $profileId, ':sid_target' => $profileId]
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
            "SELECT scar_id, scar_id AS record_id,
                    scar_number, scar_number AS record_number,
                    title,
                    priority, priority AS severity,
                    description,
                    root_cause, assigned_to, response_due_date, status, created_at,
                    created_at::date AS issued_date,
                    GREATEST(0, DATE_PART('day', COALESCE(closed_at, now()) - created_at)::int) AS days_open,
                    'scar' AS entity_type, 'scar' AS type
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
             (event_id, supplier_profile_id, event_type, event_date, recorded_by, notes, created_at)
             VALUES (:eid, :pid, 'qualified', :edate, :by, :notes, :now)",
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
                 disqualification_reason = :reason,
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
             (event_id, supplier_profile_id, event_type, event_date, recorded_by, notes, created_at)
             VALUES (:eid, :pid, 'disqualified', :edate, :by, :notes, :now)",
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
