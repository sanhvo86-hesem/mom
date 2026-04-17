<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Documents Controller — world-class Quality Document Control management.
 *
 * Manages the complete lifecycle of controlled quality documents per
 * ISO 13485 §4.2, FDA 21 CFR Part 820.40, AS9100D §7.5, IATF 16949 §7.5.
 *
 * Implements a QualityDocs-grade document control system with:
 *  - Pessimistic check-out/check-in locking
 *  - Approval and release with electronic signatures
 *  - Controlled copy tracking and acknowledgement management
 *  - Document supersession and obsolescence lifecycle
 *
 * State machine:
 *   draft → review → pending_approval → approved → released → superseded → obsolete
 *   (check-out/check-in available from most states)
 *
 * Signature required: approve, release, supersede, obsolete
 * Standards: FDA 21 CFR Part 11, ISO 13485, AS9100D, IATF 16949.
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsDocumentsController extends EqmsBaseController
{
    private const MODULE      = 'documents';
    private const ENTITY_TYPE = 'document';
    private const TABLE       = 'eqms_documents';
    protected const PK          = 'doc_id';

    // ── State Machine ────────────────────────────────────────────────────────

    /** @return array<string, list<string>> */
    private function stateMachine(): array
    {
        return [
            'draft'           => ['check-out', 'submit-review'],
            'checked_out'     => ['check-in'],
            'review'          => ['approve', 'check-out'],
            'pending_approval' => ['approve', 'check-out'],
            'approved'        => ['release', 'check-out'],
            'released'        => ['supersede', 'obsolete', 'check-out', 'request-acknowledgement'],
            'superseded'      => ['obsolete'],
            'obsolete'        => [],
        ];
    }

    /** Actions that require an electronic signature. */
    protected function signatureRequiredActions(): array
    {
        return ['approve', 'release', 'supersede', 'obsolete'];
    }

    // ── Role Helpers ─────────────────────────────────────────────────────────

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'document_control', 'document_controller', 'quality_manager', 'qa_manager', 'qms_manager',
        ])));
    }

    private function approveRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager', 'qms_manager', 'document_controller',
        ])));
    }

    // ── Fetch Helper ─────────────────────────────────────────────────────────

    private function fetchRecord(string $id): array
    {
        $rec = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE " . self::PK . " = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($rec)) {
            $this->error('document_not_found', 404, "Document '{$id}' not found.");
        }
        return $rec[0];
    }

    // ── Standard CRUD Endpoints ───────────────────────────────────────────────

    /**
     * POST /eqms/documents/query
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $q = $this->parseQueryBody();

        $where  = ['1=1'];
        $params = [];

        if ($q['search'] !== '') {
            $where[]           = "(title ILIKE :search OR doc_number ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }
        foreach (['status', 'document_type', 'department', 'owner'] as $f) {
            if (!empty($q['filters'][$f])) {
                $where[]          = "{$f} = :{$f}";
                $params[":{$f}"]  = $q['filters'][$f];
            }
        }
        if (!empty($q['filters']['acknowledgement_required'])) {
            $where[]           = "acknowledgement_required = :ack_req";
            $params[':ack_req'] = filter_var($q['filters']['acknowledgement_required'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['created_at', 'doc_number', 'title', 'status', 'revision_code', 'effective_date'], true)
            ? $q['sort_by'] : 'created_at';
        $sortDir     = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT doc_id, doc_number, title, document_type, department, owner,
                    revision_code, effective_date, expiry_date, status, version,
                    acknowledgement_required, checked_out_by, created_at, created_by
             FROM " . self::TABLE . "
             WHERE {$whereClause}
             ORDER BY {$sortBy} {$sortDir}
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('documents', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * GET /eqms/documents/metrics
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byType = $this->data->query(
            "SELECT document_type, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY document_type ORDER BY document_type"
        ) ?? [];

        $checkedOut = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE checked_out_by IS NOT NULL"
        ) ?? 0);

        $expiringCount = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . "
             WHERE status = 'released' AND expiry_date IS NOT NULL AND expiry_date <= (CURRENT_DATE + INTERVAL '30 days')"
        ) ?? 0);

        $this->success([
            'metrics' => [
                'by_status'        => $byStatus,
                'by_type'          => $byType,
                'checked_out_count' => $checkedOut,
                'expiring_soon_count' => $expiringCount,
            ],
        ]);
    }

    /**
     * GET /eqms/documents/lookup
     */
    public function lookup(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $search = trim((string)($this->query('q', '')));

        $items = $this->data->query(
            "SELECT doc_id AS id, doc_number AS code, title, revision_code, status
             FROM " . self::TABLE . "
             WHERE title ILIKE :s OR doc_number ILIKE :s
             ORDER BY doc_number
             LIMIT 50",
            [':s' => '%' . $search . '%']
        ) ?? [];

        $this->success(['items' => $items]);
    }

    /**
     * POST /eqms/documents
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'document_type', 'department', 'owner']);

        $validTypes = ['SOP', 'WI', 'form', 'policy', 'spec', 'record'];
        if (!in_array($body['document_type'], $validTypes, true)) {
            $this->error('invalid_document_type', 400,
                "Valid types: " . implode(', ', $validTypes));
        }

        $id    = $this->newUuid();
        $num   = 'DOC-' . strtoupper(substr($id, 0, 8));
        $now   = $this->nowIso();
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (doc_id, doc_number, title, document_type, department, owner,
              revision_code, effective_date, expiry_date, storage_ref, template_id,
              acknowledgement_required, status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :dtype, :dept, :owner,
              :rev, :eff, :exp, :ref, :tmpl,
              :ack, 'draft', 1, :now, :actor)",
            [
                ':id'    => $id,
                ':num'   => $num,
                ':title' => trim((string)($body['title'] ?? '')),
                ':dtype' => $body['document_type'],
                ':dept'  => trim((string)$body['department']),
                ':owner' => trim((string)$body['owner']),
                ':rev'   => trim((string)($body['revision_code'] ?? 'A')),
                ':eff'   => $body['effective_date'] ?? null,
                ':exp'   => $body['expiry_date'] ?? null,
                ':ref'   => trim((string)($body['storage_ref'] ?? '')),
                ':tmpl'  => $body['template_id'] ?? null,
                ':ack'   => (isset($body['acknowledgement_required']) && $body['acknowledgement_required']) ? 'true' : 'false',
                ':now'   => $now,
                ':actor' => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.document.created', self::ENTITY_TYPE, $id,
            ['number' => $num, 'document_type' => $body['document_type']], $user);
        $this->success(['doc_id' => $id, 'doc_number' => $num], 201);
    }

    /**
     * GET /eqms/documents/{id}
     */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);
        $this->success(['document' => $rec]);
    }

    /**
     * PATCH /eqms/documents/{id}
     * Obsolete documents are read-only; checked-out documents may only be edited by the checkout holder.
     */
    public function update(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id    = $this->requirePathId();
        $rec   = $this->fetchRecord($id);
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        if ($rec['status'] === 'obsolete') {
            $this->error('document_obsolete', 409, "Obsolete documents are read-only.");
        }

        // If checked out, only the checkout holder may update
        if (!empty($rec['checked_out_by']) && $rec['checked_out_by'] !== $actor) {
            $this->error('document_checked_out', 423,
                "Document is checked out by '{$rec['checked_out_by']}'. Only that user can edit it.");
        }

        $this->requireVersionMatch((int)$rec['version'], $id);
        $body = $this->jsonBody();

        $allowed    = ['title', 'description', 'department', 'owner', 'revision_code',
                       'effective_date', 'expiry_date', 'storage_ref', 'acknowledgement_required'];
        $sets       = ["version = version + 1"];
        $params     = [':id' => $id];

        foreach ($allowed as $field) {
            if (!array_key_exists($field, $body)) {
                continue;
            }
            if ($field === 'acknowledgement_required') {
                $sets[]          = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field] ? 'true' : 'false';
            } else {
                $sets[]          = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) . " WHERE " . self::PK . " = :id",
            $params
        );

        $this->emitQualityEvent('eqms.document.updated', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['updated' => true]);
    }

    // ── Cross-cutting Endpoints ───────────────────────────────────────────────

    /** GET /eqms/documents/{id}/audit */
    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveAuditTrail(self::ENTITY_TYPE, $id);
    }

    /** GET|POST /eqms/documents/{id}/comments */
    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveComments(self::ENTITY_TYPE, $id, $user);
    }

    /** GET|POST /eqms/documents/{id}/attachments */
    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveAttachments(self::ENTITY_TYPE, $id, $user);
    }

    /** GET /eqms/documents/{id}/relationships */
    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user);
    }

    /** POST /eqms/documents/{id}/relationships/link */
    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'link');
    }

    /** POST /eqms/documents/{id}/relationships/unlink */
    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'unlink');
    }

    /** GET /eqms/documents/{id}/available-actions */
    public function availableActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id  = $this->requirePathId();
        $rec = $this->fetchRecord($id);
        $this->serveAvailableActions((string)$rec['status'], $this->stateMachine());
    }

    /** GET|POST /eqms/documents/{id}/signatures */
    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveSignatures(self::ENTITY_TYPE, $id, $user);
    }

    /** POST /eqms/documents/{id}/export */
    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveExport(self::MODULE, $id, $user);
    }

    /** POST /eqms/documents/export-bulk */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── Document-specific Endpoints ───────────────────────────────────────────

    /**
     * GET /eqms/documents/{id}/controlled-copies
     * List controlled copies of this document.
     */
    public function controlledCopies(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id  = $this->requirePathId();

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        $copies = $this->data->query(
            "SELECT copy_id, copy_number,
                    issued_to AS recipient,
                    issued_location AS copy_format,
                    issued_location,
                    issued_by, issued_at,
                    (status = 'active') AS is_active,
                    status
             FROM eqms_controlled_copies
             WHERE doc_id = :id
             ORDER BY issued_at DESC
             LIMIT :lim OFFSET :off",
            [':id' => $id, ':lim' => $limit, ':off' => $offset]
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_controlled_copies WHERE doc_id = :id",
            [':id' => $id]
        ) ?? 0);

        $this->paginated('controlled_copies', $copies, $total, $offset, $limit);
    }

    /**
     * POST /eqms/documents/{id}/controlled-copies
     * Create or record printing of a controlled copy.
     */
    public function createControlledCopy(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        if (!in_array($rec['status'], ['approved', 'released'], true)) {
            $this->error('document_not_releasable', 409,
                "Controlled copies can only be issued for approved or released documents.");
        }

        $body = $this->jsonBody();
        $this->requireFields($body, ['recipient', 'copy_format']);

        $copyId  = $this->newUuid();
        $copyNum = 'CC-' . strtoupper(substr($id, 0, 6)) . '-' . strtoupper(substr($copyId, 0, 4));
        $actor   = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now     = $this->nowIso();

        $this->data->execute(
            "INSERT INTO eqms_controlled_copies
             (copy_id, doc_id, copy_number, revision_code, issued_to, issued_location, issued_by, issued_at, status)
             VALUES (:cid, :did, :cnum, :rev, :recipient, :fmt, :by, :at, 'active')",
            [
                ':cid'       => $copyId,
                ':did'       => $id,
                ':cnum'      => $copyNum,
                ':rev'       => (string)($rec['revision_code'] ?? 'A'),
                ':recipient' => trim((string)$body['recipient']),
                ':fmt'       => trim((string)$body['copy_format']),
                ':by'        => $actor,
                ':at'        => $now,
            ]
        );

        $this->emitQualityEvent('eqms.document.controlled_copy_issued', self::ENTITY_TYPE, $id,
            ['copy_id' => $copyId, 'copy_number' => $copyNum, 'recipient' => $body['recipient']], $user);
        $this->success(['copy_id' => $copyId, 'copy_number' => $copyNum], 201);
    }

    /**
     * POST /eqms/documents/{id}/acknowledgements/query
     * Query who has acknowledged reading this document.
     */
    public function acknowledgementsQuery(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id  = $this->requirePathId();
        $q   = $this->parseQueryBody();

        $where  = ['doc_id = :id'];
        $params = [':id' => $id];

        if ($q['search'] !== '') {
            $where[]           = "(employee_id ILIKE :search OR employee_name ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }
        if (!empty($q['filters']['acknowledged'])) {
            $where[]               = "acknowledged_at IS NOT NULL";
        }

        $whereClause = implode(' AND ', $where);

        $items = $this->data->query(
            "SELECT ack_id AS acknowledgement_id,
                    employee_id AS acknowledged_by,
                    employee_name,
                    acknowledged_at,
                    (required_by IS NOT NULL) AS is_mandatory,
                    required_by AS requested_at,
                    status,
                    acknowledgement_method
             FROM eqms_document_acknowledgements
             WHERE {$whereClause}
             ORDER BY required_by DESC NULLS LAST
             LIMIT :lim OFFSET :off",
            array_merge($params, [':lim' => $q['limit'], ':off' => $q['offset']])
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM eqms_document_acknowledgements WHERE {$whereClause}",
            $params
        ) ?? 0);

        $this->paginated('acknowledgements', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * POST /eqms/documents/{id}/change-controls/link
     * Link this document to a change control record.
     */
    public function changeControlsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $body = $this->jsonBody();

        $ccId = trim((string)($body['change_control_id'] ?? ''));
        if ($ccId === '') {
            $this->error('change_control_id_required', 400, "'change_control_id' is required.");
        }

        // Verify change control exists
        $ccExists = $this->data->scalar(
            "SELECT 1 FROM eqms_change_controls WHERE change_control_id = :cid LIMIT 1",
            [':cid' => $ccId]
        );
        if (!$ccExists) {
            $this->error('change_control_not_found', 404, "Change control '{$ccId}' not found.");
        }

        $linkId = $this->newUuid();
        $this->data->execute(
            "INSERT INTO eqms_record_links
             (link_id, source_type, source_id, target_type, target_id, relationship_type, linked_by, linked_at)
             VALUES (:lid, 'document', :did, 'change_control', :cid, 'change_control_link', :by, now())
             ON CONFLICT (source_type, source_id, target_type, target_id) DO NOTHING",
            [
                ':lid' => $linkId,
                ':did' => $id,
                ':cid' => $ccId,
                ':by'  => (string)($user['username'] ?? 'unknown'),
            ]
        );

        $this->emitQualityEvent('eqms.document.change_control_linked', self::ENTITY_TYPE, $id,
            ['change_control_id' => $ccId], $user);
        $this->success(['linked' => true, 'change_control_id' => $ccId]);
    }

    // ── Workflow Action Endpoints ─────────────────────────────────────────────

    /**
     * POST /eqms/documents/{id}/actions/check-out
     * Check out the document for editing.
     * Sets checked_out_by and checked_out_at; blocks other users from editing.
     * Available from: draft, review, pending_approval, approved, released.
     */
    public function actionCheckOut(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id    = $this->requirePathId();
        $rec   = $this->fetchRecord($id);
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->requireValidTransition((string)$rec['status'], 'check-out', $this->stateMachine(), $id);

        if ($rec['status'] === 'obsolete') {
            $this->error('document_obsolete', 409, "Obsolete documents are read-only.");
        }

        // If already checked out by someone else, reject
        if (!empty($rec['checked_out_by']) && $rec['checked_out_by'] !== $actor) {
            $this->error('document_already_checked_out', 423,
                "Document is already checked out by '{$rec['checked_out_by']}'.");
        }

        $now = $this->nowIso();
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'checked_out',
                 checked_out_by = :by,
                 checked_out_at = :at,
                 version = version + 1
             WHERE " . self::PK . " = :id",
            [':by' => $actor, ':at' => $now, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.document.checked_out', self::ENTITY_TYPE, $id,
            ['checked_out_by' => $actor, 'checked_out_at' => $now], $user);
        $this->success(['status' => 'checked_out', 'checked_out_by' => $actor, 'checked_out_at' => $now]);
    }

    /**
     * POST /eqms/documents/{id}/actions/check-in
     * Check in the document; clears checkout lock and increments revision.
     * Only the user who checked out can check in.
     */
    public function actionCheckIn(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id    = $this->requirePathId();
        $rec   = $this->fetchRecord($id);
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->requireValidTransition((string)$rec['status'], 'check-in', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        // Only the checkout holder may check in
        if ((string)($rec['checked_out_by'] ?? '') !== $actor) {
            $this->error('not_checkout_holder', 403,
                "Only the user who checked out this document ('{$rec['checked_out_by']}') can check it in.");
        }

        $body        = $this->jsonBody();
        $storageRef  = trim((string)($body['storage_ref'] ?? (string)($rec['storage_ref'] ?? '')));
        $contentHash = trim((string)($body['content_hash'] ?? ''));

        $sets = [
            "status = 'draft'",
            "checked_out_by = NULL",
            "checked_out_at = NULL",
            "version = version + 1",
        ];
        $params = [':id' => $id];

        if ($storageRef !== '') {
            $sets[]           = "storage_ref = :ref";
            $params[':ref']   = $storageRef;
        }
        if ($contentHash !== '') {
            $sets[]           = "content_hash = :hash";
            $params[':hash']  = $contentHash;
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) . " WHERE " . self::PK . " = :id",
            $params
        );

        $this->emitQualityEvent('eqms.document.checked_in', self::ENTITY_TYPE, $id,
            ['checked_in_by' => $actor], $user);
        $this->success(['status' => 'draft', 'checked_in' => true]);
    }

    /**
     * POST /eqms/documents/{id}/actions/submit-review
     * Submit document for review; transitions draft → review.
     */
    public function actionSubmitReview(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'submit-review', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET status = 'review', version = version + 1 WHERE " . self::PK . " = :id",
            [':id' => $id]
        );

        $this->emitQualityEvent('eqms.document.submitted_for_review', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['status' => 'review']);
    }

    /**
     * POST /eqms/documents/{id}/actions/approve
     * Approve the document; transitions review|pending_approval → approved.
     * REQUIRES electronic signature.
     */
    public function actionApprove(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $id    = $this->requirePathId();
        $rec   = $this->fetchRecord($id);
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->requireValidTransition((string)$rec['status'], 'approve', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $this->requireElectronicSignature($user, 'approve', $id);

        $now = $this->nowIso();
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'approved', version = version + 1
             WHERE " . self::PK . " = :id",
            [':id' => $id]
        );

        // Persist formal signature record
        $sigId = $this->newUuid();
        $body  = $this->jsonBody();
        $this->data->execute(
            "INSERT INTO eqms_signatures (signature_id, entity_type, entity_id, signer, signing_role, reason, signed_at, ip_address)
             VALUES (:sid, :etype, :eid, :signer, 'approver', :reason, now(), :ip)",
            [
                ':sid'    => $sigId,
                ':etype'  => self::ENTITY_TYPE,
                ':eid'    => $id,
                ':signer' => $actor,
                ':reason' => trim((string)(($body['esig'] ?? [])['reason'] ?? 'Document approval')),
                ':ip'     => $this->clientIp(),
            ]
        );

        $this->emitQualityEvent('eqms.document.approved', self::ENTITY_TYPE, $id,
            ['approved_by' => $actor, 'approved_at' => $now, 'signature_id' => $sigId], $user);
        $this->success(['status' => 'approved', 'approved_by' => $actor, 'approved_at' => $now]);
    }

    /**
     * POST /eqms/documents/{id}/actions/release
     * Release the document to production use; transitions approved → released.
     * REQUIRES electronic signature.
     */
    public function actionRelease(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $id    = $this->requirePathId();
        $rec   = $this->fetchRecord($id);
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->requireValidTransition((string)$rec['status'], 'release', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $this->requireElectronicSignature($user, 'release', $id);

        $body = $this->jsonBody();
        $now  = $this->nowIso();

        // Effective date may be overridden in the request body; default to today
        $effectiveDate = trim((string)($body['effective_date'] ?? date('Y-m-d')));

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'released',
                 effective_date = :eff,
                 released_by = :by,
                 released_at = :at,
                 version = version + 1
             WHERE " . self::PK . " = :id",
            [':eff' => $effectiveDate, ':by' => $actor, ':at' => $now, ':id' => $id]
        );

        $sigId = $this->newUuid();
        $this->data->execute(
            "INSERT INTO eqms_signatures (signature_id, entity_type, entity_id, signer, signing_role, reason, signed_at, ip_address)
             VALUES (:sid, :etype, :eid, :signer, 'releaser', :reason, now(), :ip)",
            [
                ':sid'    => $sigId,
                ':etype'  => self::ENTITY_TYPE,
                ':eid'    => $id,
                ':signer' => $actor,
                ':reason' => trim((string)(($body['esig'] ?? [])['reason'] ?? 'Document release')),
                ':ip'     => $this->clientIp(),
            ]
        );

        $this->emitQualityEvent('eqms.document.released', self::ENTITY_TYPE, $id,
            ['released_by' => $actor, 'released_at' => $now, 'effective_date' => $effectiveDate], $user);
        $this->success(['status' => 'released', 'effective_date' => $effectiveDate, 'released_by' => $actor]);
    }

    /**
     * POST /eqms/documents/{id}/actions/supersede
     * Supersede this document with a new version; transitions released → superseded.
     * REQUIRES electronic signature.
     * Body: { superseded_by_doc_id: '...' }
     */
    public function actionSupersede(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $id    = $this->requirePathId();
        $rec   = $this->fetchRecord($id);
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->requireValidTransition((string)$rec['status'], 'supersede', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $this->requireElectronicSignature($user, 'supersede', $id);

        $body          = $this->jsonBody();
        $supersededById = trim((string)($body['superseded_by_doc_id'] ?? ''));

        if ($supersededById === '') {
            $this->error('superseded_by_doc_id_required', 400, "'superseded_by_doc_id' is required.");
        }
        if ($supersededById === $id) {
            $this->error('self_supersede_not_allowed', 400, "A document cannot supersede itself.");
        }

        // Verify the superseding document exists
        $newDocExists = $this->data->scalar(
            "SELECT 1 FROM " . self::TABLE . " WHERE " . self::PK . " = :nid LIMIT 1",
            [':nid' => $supersededById]
        );
        if (!$newDocExists) {
            $this->error('superseding_document_not_found', 404,
                "Superseding document '{$supersededById}' not found.");
        }

        $now = $this->nowIso();
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'superseded', superseded_by = :newdoc, version = version + 1
             WHERE " . self::PK . " = :id",
            [':newdoc' => $supersededById, ':id' => $id]
        );

        $sigId = $this->newUuid();
        $this->data->execute(
            "INSERT INTO eqms_signatures (signature_id, entity_type, entity_id, signer, signing_role, reason, signed_at, ip_address)
             VALUES (:sid, :etype, :eid, :signer, 'superseder', :reason, now(), :ip)",
            [
                ':sid'    => $sigId,
                ':etype'  => self::ENTITY_TYPE,
                ':eid'    => $id,
                ':signer' => $actor,
                ':reason' => trim((string)(($body['esig'] ?? [])['reason'] ?? 'Document supersession')),
                ':ip'     => $this->clientIp(),
            ]
        );

        $this->emitQualityEvent('eqms.document.superseded', self::ENTITY_TYPE, $id,
            ['superseded_by' => $supersededById, 'superseded_at' => $now], $user);
        $this->success(['status' => 'superseded', 'superseded_by' => $supersededById]);
    }

    /**
     * POST /eqms/documents/{id}/actions/obsolete
     * Mark the document as obsolete; transitions released|superseded → obsolete.
     * REQUIRES electronic signature. Obsolete documents are permanently read-only.
     */
    public function actionObsolete(): never
    {
        $user  = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $id    = $this->requirePathId();
        $rec   = $this->fetchRecord($id);
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->requireValidTransition((string)$rec['status'], 'obsolete', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $this->requireElectronicSignature($user, 'obsolete', $id);

        $body = $this->jsonBody();
        $now  = $this->nowIso();

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET status = 'obsolete', version = version + 1 WHERE " . self::PK . " = :id",
            [':id' => $id]
        );

        $sigId = $this->newUuid();
        $this->data->execute(
            "INSERT INTO eqms_signatures (signature_id, entity_type, entity_id, signer, signing_role, reason, signed_at, ip_address)
             VALUES (:sid, :etype, :eid, :signer, 'obsoleter', :reason, now(), :ip)",
            [
                ':sid'    => $sigId,
                ':etype'  => self::ENTITY_TYPE,
                ':eid'    => $id,
                ':signer' => $actor,
                ':reason' => trim((string)(($body['esig'] ?? [])['reason'] ?? 'Document obsolescence')),
                ':ip'     => $this->clientIp(),
            ]
        );

        $this->emitQualityEvent('eqms.document.obsoleted', self::ENTITY_TYPE, $id,
            ['obsoleted_by' => $actor, 'obsoleted_at' => $now], $user);
        $this->success(['status' => 'obsolete']);
    }

    /**
     * POST /eqms/documents/{id}/actions/request-acknowledgement
     * Send acknowledgement requests to a list of roles or users.
     * Available from: released.
     * Body: { user_ids: [], role: '...', message: '...' }
     */
    public function actionRequestAcknowledgement(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'request-acknowledgement', $this->stateMachine(), $id);

        $body    = $this->jsonBody();
        $userIds = is_array($body['user_ids'] ?? null) ? $body['user_ids'] : [];
        $role    = trim((string)($body['role'] ?? ''));

        if (empty($userIds) && $role === '') {
            $this->error('acknowledgement_recipients_required', 400,
                "Provide 'user_ids' (array) or 'role' (string) to target acknowledgement recipients.");
        }

        $now   = $this->nowIso();
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $count = 0;

        // If user_ids provided, create individual acknowledgement requests
        foreach ($userIds as $uid) {
            $uid = trim((string)$uid);
            if ($uid === '') {
                continue;
            }
            $ackId = $this->newUuid();
            $this->data->execute(
                "INSERT INTO eqms_document_acknowledgements
                 (ack_id, doc_id, employee_id, required_by, acknowledgement_method, status)
                 VALUES (:aid, :did, :uid, CURRENT_DATE, 'portal', 'pending')
                 ON CONFLICT (doc_id, employee_id) DO NOTHING",
                [':aid' => $ackId, ':did' => $id, ':uid' => $uid]
            );
            $count++;
        }

        $this->emitQualityEvent('eqms.document.acknowledgement_requested', self::ENTITY_TYPE, $id,
            ['recipient_count' => $count, 'role' => $role, 'requested_by' => $actor], $user);
        $this->success(['acknowledgement_requests_sent' => $count, 'role' => $role]);
    }

    /**
     * POST /eqms/documents/{id}/actions/record-acknowledgement
     * Record that the authenticated user has read and acknowledged this document.
     */
    public function actionRecordAcknowledgement(): never
    {
        $user  = $this->requireAuth();
        $id    = $this->requirePathId();
        $rec   = $this->fetchRecord($id);
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        // Document must be released for acknowledgements to be meaningful
        if (!in_array($rec['status'], ['released', 'superseded'], true)) {
            $this->error('document_not_released', 409,
                "Acknowledgements can only be recorded for released or superseded documents.");
        }

        $now = $this->nowIso();

        // Upsert: create if not exists, update acknowledged_at if pending
        $existing = $this->data->query(
            "SELECT ack_id AS acknowledgement_id, acknowledged_at FROM eqms_document_acknowledgements
             WHERE doc_id = :did AND employee_id = :uid LIMIT 1",
            [':did' => $id, ':uid' => $actor]
        );

        if (!empty($existing)) {
            if ($existing[0]['acknowledged_at'] !== null) {
                $this->success(['already_acknowledged' => true, 'acknowledged_at' => $existing[0]['acknowledged_at']]);
            }
            $this->data->execute(
                "UPDATE eqms_document_acknowledgements
                 SET acknowledged_at = :now, status = 'acknowledged', acknowledgement_method = 'portal'
                 WHERE doc_id = :did AND employee_id = :uid",
                [':now' => $now, ':did' => $id, ':uid' => $actor]
            );
        } else {
            $ackId = $this->newUuid();
            $this->data->execute(
                "INSERT INTO eqms_document_acknowledgements
                 (ack_id, doc_id, employee_id, required_by, acknowledged_at, acknowledgement_method, status)
                 VALUES (:aid, :did, :uid, CURRENT_DATE, :now, 'portal', 'acknowledged')",
                [':aid' => $ackId, ':did' => $id, ':uid' => $actor, ':now' => $now]
            );
        }

        $this->emitQualityEvent('eqms.document.acknowledged', self::ENTITY_TYPE, $id,
            ['acknowledged_by' => $actor, 'acknowledged_at' => $now], $user);
        $this->success(['acknowledged' => true, 'acknowledged_by' => $actor, 'acknowledged_at' => $now]);
    }
}
