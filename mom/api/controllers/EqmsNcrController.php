<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS NCR Controller — Non-Conformance Report lifecycle per AS9100D.
 *
 * Implements the full NCR state machine, cross-cutting quality endpoints,
 * and all AS9100D-regulated actions including MRB disposition workflow.
 *
 * State machine:
 *   draft             → contain, investigate
 *   submitted         → contain, investigate, submit-mrb
 *   under_review      → contain, investigate, submit-mrb, record-disposition
 *   mrb_review        → record-disposition, rework, repair, use-as-is, return-to-vendor, scrap
 *   disposition_set   → rework, repair, use-as-is, return-to-vendor, scrap, close
 *   rework_in_progress→ close, reopen
 *   closed            → reopen
 *
 * Standards: AS9100D §8.7, ISO 9001:2015 §10.2
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsNcrController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'ncr';
    private const MODULE      = 'ncr';
    private const TABLE       = 'eqms_ncr_records';
    protected const PK          = 'ncr_id';

    /** AS9100D NCR state machine. */
    private const STATE_MACHINE = [
        'draft'              => ['contain', 'investigate'],
        'submitted'          => ['contain', 'investigate', 'submit-mrb'],
        'under_review'       => ['contain', 'investigate', 'submit-mrb', 'record-disposition'],
        'mrb_review'         => ['record-disposition', 'rework', 'repair', 'use-as-is', 'return-to-vendor', 'scrap'],
        'disposition_set'    => ['rework', 'repair', 'use-as-is', 'return-to-vendor', 'scrap', 'close'],
        'rework_in_progress' => ['close', 'reopen'],
        'closed'             => ['reopen'],
    ];

    /** Write roles for NCR records. */
    private function ncrWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'quality_engineer',
            'production_director', 'shift_leader',
        ])));
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    /**
     * Load a single NCR record or emit 404.
     */
    private function loadNcr(string $ncrId): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE ncr_id = :id LIMIT 1",
            [':id' => $ncrId]
        );
        if (empty($row)) {
            $this->error('ncr_not_found', 404, "NCR '{$ncrId}' not found.");
        }
        return $row[0];
    }

    // ── Query & Metrics ──────────────────────────────────────────────────────

    /**
     * POST /eqms/ncr/query — Paginated NCR list with filters and search.
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(ncr_number ILIKE :search OR title ILIKE :search OR description ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['status', 'severity', 'source', 'assigned_to'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        $where   = implode(' AND ', $conditions);
        $sortBy  = in_array($q['sort_by'], ['ncr_number', 'title', 'severity', 'status', 'detected_at', 'created_at'], true)
                   ? $q['sort_by'] : 'created_at';
        $sortDir = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT ncr_id, ncr_number, title, severity, source, status, assigned_to,
                    detected_at, created_at, created_by, version
             FROM " . self::TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$sortDir}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('ncr_records', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * GET /eqms/ncr/metrics — Aggregate NCR KPIs.
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $bySeverity = $this->data->query(
            "SELECT severity, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY severity ORDER BY severity"
        ) ?? [];

        $bySource = $this->data->query(
            "SELECT source, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY source ORDER BY source"
        ) ?? [];

        $openCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE status NOT IN ('closed')"
        ) ?? 0);

        $overdueCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE status NOT IN ('closed') AND detected_at < NOW() - INTERVAL '30 days'"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'    => $byStatus,
                'by_severity'  => $bySeverity,
                'by_source'    => $bySource,
                'open_count'   => $openCount,
                'overdue_count' => $overdueCount,
            ],
        ]);
    }

    /**
     * POST /eqms/ncr/lookup — Lightweight ID→number lookup for linking.
     */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body = $this->jsonBody();
        $ids  = is_array($body['ids'] ?? null) ? $body['ids'] : [];

        if (empty($ids)) {
            $this->success(['records' => []]);
        }

        // Build safe placeholders
        $placeholders = implode(',', array_map(fn($i) => ":id{$i}", array_keys($ids)));
        $params       = [];
        foreach ($ids as $i => $id) {
            $params[":id{$i}"] = $id;
        }

        $rows = $this->data->query(
            "SELECT ncr_id, ncr_number, title, status, severity FROM " . self::TABLE . "
             WHERE ncr_id IN ({$placeholders})",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    /**
     * POST /eqms/ncr — Create a new NCR in draft state.
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());

        $body = $this->jsonBody();

        $title    = trim((string)($body['title'] ?? ''));
        $severity = trim((string)($body['severity'] ?? ''));
        $source   = trim((string)($body['source'] ?? ''));

        if ($title === '') {
            $this->error('title_required', 400, "'title' is required.");
        }
        if (!in_array($severity, ['minor', 'major', 'critical'], true)) {
            $this->error('invalid_severity', 400, "'severity' must be minor, major, or critical.");
        }
        if (!in_array($source, ['production', 'receiving', 'customer', 'audit', 'process'], true)) {
            $this->error('invalid_source', 400, "'source' must be production, receiving, customer, audit, or process.");
        }

        $ncrId     = $this->newUuid();
        $ncrNumber = 'NCR-' . strtoupper(substr($ncrId, 0, 8));
        $now       = $this->nowIso();
        $actor     = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (ncr_id, ncr_number, title, description, severity, source,
              item_id, job_number, lot_number, qty_affected,
              detected_by, detected_at, assigned_to,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, :sev, :src,
              :item, :job, :lot, :qty,
              :detected_by, :detected_at, :assigned,
              'draft', 1, :now, :by)",
            [
                ':id'          => $ncrId,
                ':num'         => $ncrNumber,
                ':title'       => $title,
                ':desc'        => trim((string)($body['description'] ?? '')),
                ':sev'         => $severity,
                ':src'         => $source,
                ':item'        => $body['item_id'] ?? null,
                ':job'         => $body['job_number'] ?? null,
                ':lot'         => $body['lot_number'] ?? null,
                ':qty'         => isset($body['qty_affected']) ? (int)$body['qty_affected'] : null,
                ':detected_by' => $body['detected_by'] ?? $actor,
                ':detected_at' => $body['detected_at'] ?? $now,
                ':assigned'    => $body['assigned_to'] ?? null,
                ':now'         => $now,
                ':by'          => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.ncr.created', self::ENTITY_TYPE, $ncrId, [
            'ncr_number' => $ncrNumber,
            'severity'   => $severity,
            'source'     => $source,
        ], $user);

        $ncr = $this->loadNcr($ncrId);
        $this->success(['ncr' => $ncr], 201);
    }

    /**
     * GET /eqms/ncr/{id} — Retrieve full NCR detail.
     */
    public function detail(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->success(['ncr' => $ncr]);
    }

    /**
     * PATCH /eqms/ncr/{id} — Update mutable NCR fields with optimistic concurrency.
     */
    public function update(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        if (in_array($ncr['status'], ['closed'], true)) {
            $this->error('record_locked', 409, "Closed NCR records cannot be updated.");
        }

        $body        = $this->jsonBody();
        $sets        = [];
        $params      = [':id' => $ncrId, ':ver' => ((int)$ncr['version']) + 1];
        $updatable   = [
            'title', 'description', 'severity', 'source',
            'item_id', 'job_number', 'lot_number', 'qty_affected',
            'detected_by', 'detected_at', 'containment_action',
            'root_cause', 'assigned_to',
        ];

        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]           = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        if (empty($sets)) {
            $this->error('no_fields_to_update', 400, "No updatable fields provided.");
        }

        $sets[] = 'version = :ver';
        $sql    = "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
                  " WHERE ncr_id = :id AND version = " . (int)$ncr['version'];

        $this->data->execute($sql, $params);

        $this->emitQualityEvent('eqms.ncr.updated', self::ENTITY_TYPE, $ncrId, [
            'fields_updated' => array_intersect_key($body, array_flip($updatable)),
        ], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    // ── Cross-cutting Endpoints ───────────────────────────────────────────────

    /** GET /eqms/ncr/{id}/audit */
    public function audit(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $this->loadNcr($ncrId); // ensure exists
        $this->serveAuditTrail(self::ENTITY_TYPE, $ncrId);
    }

    /** GET|POST /eqms/ncr/{id}/comments */
    public function comments(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $this->loadNcr($ncrId);
        $this->serveComments(self::ENTITY_TYPE, $ncrId, $user);
    }

    /** GET|POST /eqms/ncr/{id}/attachments */
    public function attachments(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $this->loadNcr($ncrId);
        $this->serveAttachments(self::ENTITY_TYPE, $ncrId, $user);
    }

    /** GET /eqms/ncr/{id}/relationships */
    public function relationships(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $this->loadNcr($ncrId);
        $this->serveRelationships(self::ENTITY_TYPE, $ncrId, $user, 'list');
    }

    /** POST /eqms/ncr/{id}/relationships/link */
    public function relationshipsLink(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $this->loadNcr($ncrId);
        $this->serveRelationships(self::ENTITY_TYPE, $ncrId, $user, 'link');
    }

    /** POST /eqms/ncr/{id}/relationships/unlink */
    public function relationshipsUnlink(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $this->loadNcr($ncrId);
        $this->serveRelationships(self::ENTITY_TYPE, $ncrId, $user, 'unlink');
    }

    /** GET /eqms/ncr/{id}/available-actions */
    public function availableActions(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);
        $this->serveAvailableActions((string)$ncr['status'], self::STATE_MACHINE);
    }

    /** GET|POST /eqms/ncr/{id}/signatures */
    public function signatures(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $this->loadNcr($ncrId);
        $this->serveSignatures(self::ENTITY_TYPE, $ncrId, $user);
    }

    /** POST /eqms/ncr/{id}/export */
    public function export(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $ncrId = $this->requirePathId('id', 'ncr_id');
        $this->loadNcr($ncrId);
        $this->serveExport(self::MODULE, $ncrId, $user);
    }

    /** POST /eqms/ncr/export-bulk */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── State Machine Actions ─────────────────────────────────────────────────

    /**
     * POST /eqms/ncr/{id}/actions/contain
     * Record a containment action. Transitions to 'submitted' from 'draft'.
     */
    public function actionContain(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireValidTransition((string)$ncr['status'], 'contain', self::STATE_MACHINE, $ncrId);
        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        $body              = $this->jsonBody();
        $containmentAction = trim((string)($body['containment_action'] ?? ''));

        if ($containmentAction === '') {
            $this->error('containment_action_required', 400, "'containment_action' is required.");
        }

        $newVersion = ((int)$ncr['version']) + 1;
        $newStatus  = $ncr['status'] === 'draft' ? 'submitted' : $ncr['status'];

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET containment_action = :action, status = :status, version = :ver
             WHERE ncr_id = :id AND version = :oldver",
            [
                ':action' => $containmentAction,
                ':status' => $newStatus,
                ':ver'    => $newVersion,
                ':id'     => $ncrId,
                ':oldver' => (int)$ncr['version'],
            ]
        );

        $this->emitQualityEvent('eqms.ncr.contained', self::ENTITY_TYPE, $ncrId, [
            'containment_action' => $containmentAction,
            'new_status'         => $newStatus,
        ], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    /**
     * POST /eqms/ncr/{id}/actions/investigate
     * Start root cause analysis. Transitions to 'under_review'.
     */
    public function actionInvestigate(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireValidTransition((string)$ncr['status'], 'investigate', self::STATE_MACHINE, $ncrId);
        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        $body      = $this->jsonBody();
        $rootCause = trim((string)($body['root_cause'] ?? ''));

        $newVersion = ((int)$ncr['version']) + 1;
        $sets       = ["status = 'under_review'", "version = :ver"];
        $params     = [':ver' => $newVersion, ':id' => $ncrId, ':oldver' => (int)$ncr['version']];

        if ($rootCause !== '') {
            $sets[]            = 'root_cause = :rc';
            $params[':rc']     = $rootCause;
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE ncr_id = :id AND version = :oldver",
            $params
        );

        $this->emitQualityEvent('eqms.ncr.investigation_started', self::ENTITY_TYPE, $ncrId, [
            'root_cause_provided' => $rootCause !== '',
        ], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    /**
     * POST /eqms/ncr/{id}/actions/submit-mrb
     * Escalate NCR to Material Review Board.
     */
    public function actionSubmitMrb(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireValidTransition((string)$ncr['status'], 'submit-mrb', self::STATE_MACHINE, $ncrId);
        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        $newVersion = ((int)$ncr['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET status = 'mrb_review', version = :ver
             WHERE ncr_id = :id AND version = :oldver",
            [':ver' => $newVersion, ':id' => $ncrId, ':oldver' => (int)$ncr['version']]
        );

        $this->emitQualityEvent('eqms.ncr.submitted_to_mrb', self::ENTITY_TYPE, $ncrId, [], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    /**
     * POST /eqms/ncr/{id}/actions/record-disposition
     * Record MRB disposition decision.
     */
    public function actionRecordDisposition(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireValidTransition((string)$ncr['status'], 'record-disposition', self::STATE_MACHINE, $ncrId);
        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        $body        = $this->jsonBody();
        $disposition = trim((string)($body['disposition'] ?? ''));
        $mrbDecision = trim((string)($body['mrb_decision'] ?? ''));

        if ($disposition === '') {
            $this->error('disposition_required', 400, "'disposition' is required.");
        }
        if (!in_array($disposition, ['rework', 'repair', 'use-as-is', 'return-to-vendor', 'scrap'], true)) {
            $this->error('invalid_disposition', 400,
                "'disposition' must be one of: rework, repair, use-as-is, return-to-vendor, scrap.");
        }

        $newVersion = ((int)$ncr['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET disposition = :disp, disposition_reason = :reason, mrb_decision = :mrb,
                 status = 'disposition_set', version = :ver
             WHERE ncr_id = :id AND version = :oldver",
            [
                ':disp'   => $disposition,
                ':reason' => trim((string)($body['disposition_reason'] ?? '')),
                ':mrb'    => $mrbDecision,
                ':ver'    => $newVersion,
                ':id'     => $ncrId,
                ':oldver' => (int)$ncr['version'],
            ]
        );

        $this->emitQualityEvent('eqms.ncr.disposition_recorded', self::ENTITY_TYPE, $ncrId, [
            'disposition' => $disposition,
            'mrb_decision' => $mrbDecision,
        ], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    /**
     * POST /eqms/ncr/{id}/actions/rework
     * Disposition: send for rework.
     */
    public function actionRework(): never
    {
        $this->performDispositionAction('rework', 'rework_in_progress');
    }

    /**
     * POST /eqms/ncr/{id}/actions/repair
     * Disposition: send for repair.
     */
    public function actionRepair(): never
    {
        $this->performDispositionAction('repair', 'rework_in_progress');
    }

    /**
     * POST /eqms/ncr/{id}/actions/use-as-is
     * Disposition: accept use-as-is.
     * REQUIRES engineering justification and electronic signature (AS9100D §8.7.2).
     */
    public function actionUseAsIs(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsApproveRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireValidTransition((string)$ncr['status'], 'use-as-is', self::STATE_MACHINE, $ncrId);
        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        $body                  = $this->jsonBody();
        $engineeringJustification = trim((string)($body['engineering_justification'] ?? ''));

        if ($engineeringJustification === '') {
            $this->error('engineering_justification_required', 400,
                "Action 'use-as-is' requires 'engineering_justification' per AS9100D §8.7.2.");
        }

        // Electronic signature mandatory for use-as-is
        $this->requireElectronicSignature($user, 'use-as-is', $ncrId);

        $newVersion = ((int)$ncr['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET disposition = 'use-as-is', disposition_reason = :justification,
                 status = 'disposition_set', version = :ver
             WHERE ncr_id = :id AND version = :oldver",
            [
                ':justification' => $engineeringJustification,
                ':ver'           => $newVersion,
                ':id'            => $ncrId,
                ':oldver'        => (int)$ncr['version'],
            ]
        );

        $this->emitQualityEvent('eqms.ncr.use_as_is_approved', self::ENTITY_TYPE, $ncrId, [
            'engineering_justification' => $engineeringJustification,
            'approved_by'               => (string)($user['username'] ?? 'unknown'),
        ], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    /**
     * POST /eqms/ncr/{id}/actions/return-to-vendor
     * Disposition: return nonconforming material to vendor.
     */
    public function actionReturnToVendor(): never
    {
        $this->performDispositionAction('return-to-vendor', 'disposition_set');
    }

    /**
     * POST /eqms/ncr/{id}/actions/scrap
     * Disposition: scrap nonconforming material.
     */
    public function actionScrap(): never
    {
        $this->performDispositionAction('scrap', 'disposition_set');
    }

    /**
     * POST /eqms/ncr/{id}/actions/close
     * Close the NCR. Requires disposition to be set and electronic signature.
     */
    public function actionClose(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsCloseRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireValidTransition((string)$ncr['status'], 'close', self::STATE_MACHINE, $ncrId);
        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        // Business rule: cannot close without disposition
        if (empty($ncr['disposition'])) {
            $this->error('disposition_required_for_close', 409,
                "NCR cannot be closed without a disposition being recorded first.");
        }

        // Electronic signature required for close
        $this->requireElectronicSignature($user, 'close', $ncrId);

        $newVersion = ((int)$ncr['version']) + 1;
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'closed', version = :ver, closed_by = :by, closed_at = now()
             WHERE ncr_id = :id AND version = :oldver",
            [
                ':ver'    => $newVersion,
                ':by'     => $actor,
                ':id'     => $ncrId,
                ':oldver' => (int)$ncr['version'],
            ]
        );

        $this->emitQualityEvent('eqms.ncr.closed', self::ENTITY_TYPE, $ncrId, [
            'closed_by'  => $actor,
            'disposition' => $ncr['disposition'],
        ], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    /**
     * POST /eqms/ncr/{id}/actions/reopen
     * Reopen a closed or rework-complete NCR.
     */
    public function actionReopen(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireValidTransition((string)$ncr['status'], 'reopen', self::STATE_MACHINE, $ncrId);
        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        $body   = $this->jsonBody();
        $reason = trim((string)($body['reopen_reason'] ?? ''));

        if ($reason === '') {
            $this->error('reopen_reason_required', 400, "'reopen_reason' is required.");
        }

        $newVersion = ((int)$ncr['version']) + 1;

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET status = 'under_review', version = :ver
             WHERE ncr_id = :id AND version = :oldver",
            [':ver' => $newVersion, ':id' => $ncrId, ':oldver' => (int)$ncr['version']]
        );

        $this->emitQualityEvent('eqms.ncr.reopened', self::ENTITY_TYPE, $ncrId, [
            'reopen_reason'  => $reason,
            'reopened_by'    => (string)($user['username'] ?? 'unknown'),
            'previous_status' => $ncr['status'],
        ], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    // ── Private Action Helper ─────────────────────────────────────────────────

    /**
     * Generic disposition action handler for rework, repair, return-to-vendor, scrap.
     *
     * @param string $action    The action key in the state machine.
     * @param string $newStatus The resulting status.
     */
    private function performDispositionAction(string $action, string $newStatus): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        $this->requireValidTransition((string)$ncr['status'], $action, self::STATE_MACHINE, $ncrId);
        $this->requireVersionMatch((int)$ncr['version'], $ncrId);

        $body       = $this->jsonBody();
        $notes      = trim((string)($body['notes'] ?? ''));
        $newVersion = ((int)$ncr['version']) + 1;

        $sets   = ["status = :status", "version = :ver"];
        $params = [':status' => $newStatus, ':ver' => $newVersion, ':id' => $ncrId, ':oldver' => (int)$ncr['version']];

        // Only set disposition if not already recorded via record-disposition
        if (empty($ncr['disposition'])) {
            $sets[]               = 'disposition = :disp';
            $params[':disp']      = $action;
        }
        if ($notes !== '') {
            $sets[]               = 'disposition_reason = :reason';
            $params[':reason']    = $notes;
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE ncr_id = :id AND version = :oldver",
            $params
        );

        $eventType = 'eqms.ncr.' . str_replace('-', '_', $action);
        $this->emitQualityEvent($eventType, self::ENTITY_TYPE, $ncrId, [
            'action'     => $action,
            'new_status' => $newStatus,
            'notes'      => $notes,
        ], $user);

        $updated = $this->loadNcr($ncrId);
        $this->success(['ncr' => $updated]);
    }

    // ── Cross-module Actions ──────────────────────────────────────────────────

    /**
     * POST /eqms/ncr/{id}/actions/create-capa
     * Auto-create a linked CAPA record from this NCR.
     * Body optional: { severity, assigned_to, due_date, title_override }
     */
    public function actionCreateCapa(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->ncrWriteRoles());

        $ncrId = $this->requirePathId('id', 'ncr_id');
        $ncr   = $this->loadNcr($ncrId);

        if ($ncr['status'] === 'closed') {
            $this->error('ncr_closed', 409, "Cannot create CAPA from a closed NCR.");
        }

        $existingCapa = $this->data->scalar(
            "SELECT capa_id FROM eqms_capa_records WHERE source_type = 'ncr' AND source_id = :ncr_id LIMIT 1",
            [':ncr_id' => $ncrId]
        );
        if ($existingCapa) {
            $this->error('capa_already_exists', 409,
                "A CAPA (ID: {$existingCapa}) is already linked to NCR '{$ncrId}'.");
        }

        $body       = $this->jsonBody();
        $actor      = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $capaId     = $this->newUuid();
        $capaNumber = 'CAPA-' . strtoupper(substr($capaId, 0, 8));
        $now        = $this->nowIso();
        $severity   = in_array($body['severity'] ?? '', ['minor','major','critical'], true)
                      ? $body['severity'] : 'major';
        $title      = !empty($body['title_override'])
                      ? trim((string)$body['title_override'])
                      : 'CAPA for NCR ' . ($ncr['ncr_number'] ?? $ncrId);

        $this->data->execute(
            "INSERT INTO eqms_capa_records
             (capa_id, capa_number, title, description, source_type, source_id,
              severity, assigned_to, due_date, action_plan, status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, 'ncr', :src_id,
              :sev, :assigned, :due, '[]'::jsonb, 'initiated', 1, :now, :by)",
            [
                ':id'       => $capaId,
                ':num'      => $capaNumber,
                ':title'    => $title,
                ':desc'     => (string)($ncr['description'] ?? ''),
                ':src_id'   => $ncrId,
                ':sev'      => $severity,
                ':assigned' => $body['assigned_to'] ?? null,
                ':due'      => $body['due_date'] ?? null,
                ':now'      => $now,
                ':by'       => $actor,
            ]
        );

        $this->data->execute(
            "INSERT INTO eqms_record_links
             (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'ncr', :ncr_id, 'capa', :capa_id, 'spawned_capa', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [':lid' => $this->newUuid(), ':ncr_id' => $ncrId, ':capa_id' => $capaId, ':by' => $actor]
        );

        $this->emitQualityEvent('eqms.ncr.capa_created', self::ENTITY_TYPE, $ncrId, [
            'capa_id'     => $capaId,
            'capa_number' => $capaNumber,
            'severity'    => $severity,
        ], $user);

        $capa = $this->data->query(
            "SELECT capa_id, capa_number, title, status, severity FROM eqms_capa_records WHERE capa_id = :id",
            [':id' => $capaId]
        )[0] ?? [];

        $this->success(['ncr' => $this->loadNcr($ncrId), 'created_capa' => $capa], 201);
    }
}
