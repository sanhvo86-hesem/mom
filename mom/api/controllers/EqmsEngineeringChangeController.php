<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Engineering Change Controller — world-class Engineering Change Notice (ECN) management.
 *
 * Manages the full lifecycle of engineering change records per
 * AS9100D §8.3.6, IATF 16949 §8.3.6, ISO 13485 §7.3.9.
 *
 * State machine:
 *   draft → assessment → pending_approval → approved → implementation → closed
 *   (cancel available from: assessment, pending_approval, approved, implementation)
 *
 * Signature required: approve, close
 * Standards: FDA 21 CFR Part 11, ISO 13485, AS9100D, IATF 16949.
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
final class EqmsEngineeringChangeController extends EqmsBaseController
{
    private const MODULE      = 'engineering_change';
    private const ENTITY_TYPE = 'engineering_change';
    private const TABLE       = 'eqms_engineering_changes';
    protected const PK          = 'ec_id';

    // ── State Machine ────────────────────────────────────────────────────────

    /** @return array<string, list<string>> */
    private function stateMachine(): array
    {
        return [
            'draft'            => ['submit-assessment'],
            'assessment'       => ['submit-assessment', 'approve', 'cancel'],
            'pending_approval' => ['approve', 'cancel'],
            'approved'         => ['implement', 'cancel'],
            'implementation'   => ['close', 'cancel'],
            'closed'           => [],
            'cancelled'        => [],
        ];
    }

    // ── Role Helpers ─────────────────────────────────────────────────────────

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'engineering_manager', 'quality_manager', 'qa_manager', 'process_engineer',
        ])));
    }

    private function approveRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'engineering_manager', 'quality_manager', 'production_director',
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
            $this->error('engineering_change_not_found', 404, "Engineering change '{$id}' not found.");
        }
        return $rec[0];
    }

    // ── Standard CRUD Endpoints ───────────────────────────────────────────────

    /**
     * POST /eqms/engineering-changes/query
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $q = $this->parseQueryBody();

        $where  = ['1=1'];
        $params = [];

        if ($q['search'] !== '') {
            $where[]           = "(title ILIKE :search OR ec_number ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }
        foreach (['status', 'change_category'] as $f) {
            if (!empty($q['filters'][$f])) {
                $where[]          = "{$f} = :{$f}";
                $params[":{$f}"]  = $q['filters'][$f];
            }
        }

        $whereClause = implode(' AND ', $where);
        $sortBy      = in_array($q['sort_by'], ['created_at', 'ec_number', 'title', 'status', 'effective_date'], true)
            ? $q['sort_by'] : 'created_at';
        $sortDir     = $q['sort_dir'];

        $items = $this->data->query(
            "SELECT ec_id, ec_number, title, change_category, status, version,
                    created_at, created_by, approved_at, effective_date
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

        $this->paginated('engineering_changes', $items, $total, $q['offset'], $q['limit']);
    }

    /**
     * GET /eqms/engineering-changes/metrics
     */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $byStatus = $this->data->query(
            "SELECT status, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY status ORDER BY status"
        ) ?? [];

        $byCategory = $this->data->query(
            "SELECT change_category, COUNT(*) AS count FROM " . self::TABLE . " GROUP BY change_category ORDER BY change_category"
        ) ?? [];

        $this->success([
            'metrics' => [
                'by_status'   => $byStatus,
                'by_category' => $byCategory,
            ],
        ]);
    }

    /**
     * GET /eqms/engineering-changes/lookup
     */
    public function lookup(): never
    {
        $user   = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $search = trim((string)($this->query('q', '')));

        $items = $this->data->query(
            "SELECT ec_id AS id, ec_number AS code, title, status
             FROM " . self::TABLE . "
             WHERE title ILIKE :s OR ec_number ILIKE :s
             ORDER BY ec_number
             LIMIT 50",
            [':s' => '%' . $search . '%']
        ) ?? [];

        $this->success(['items' => $items]);
    }

    /**
     * POST /eqms/engineering-changes
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'change_category', 'reason']);

        $validCategories = ['design', 'material', 'process', 'tooling', 'supplier'];
        if (!in_array($body['change_category'], $validCategories, true)) {
            $this->error('invalid_change_category', 400,
                "Valid categories: " . implode(', ', $validCategories));
        }

        $id    = $this->newUuid();
        $num   = 'EC-' . strtoupper(substr($id, 0, 8));
        $now   = $this->nowIso();
        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->data->execute(
            "INSERT INTO " . self::TABLE . "
             (ec_id, ec_number, title, description, change_category, affected_parts,
              affected_bom_ids, affected_docs, reason,
              status, version, created_at, created_by)
             VALUES
             (:id, :num, :title, :desc, :ccat, :parts::jsonb,
              :boms::jsonb, :docs::jsonb, :reason,
              'draft', 1, :now, :actor)",
            [
                ':id'     => $id,
                ':num'    => $num,
                ':title'  => trim((string)($body['title'] ?? '')),
                ':desc'   => trim((string)($body['description'] ?? '')),
                ':ccat'   => $body['change_category'],
                ':parts'  => json_encode($body['affected_parts'] ?? []),
                ':boms'   => json_encode($body['affected_bom_ids'] ?? []),
                ':docs'   => json_encode($body['affected_docs'] ?? []),
                ':reason' => trim((string)$body['reason']),
                ':now'    => $now,
                ':actor'  => $actor,
            ]
        );

        $this->emitQualityEvent('eqms.engineering_change.created', self::ENTITY_TYPE, $id,
            ['number' => $num], $user);
        $this->success(['ec_id' => $id, 'ec_number' => $num], 201);
    }

    /**
     * GET /eqms/engineering-changes/{id}
     */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);
        $this->success(['engineering_change' => $rec]);
    }

    /**
     * PATCH /eqms/engineering-changes/{id}
     */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        if (in_array($rec['status'], ['closed', 'cancelled'], true)) {
            $this->error('record_immutable', 409, "Closed or cancelled engineering changes cannot be edited.");
        }

        $this->requireVersionMatch((int)$rec['version'], $id);
        $body = $this->jsonBody();

        $allowed = ['title', 'description', 'reason', 'change_category'];
        $jsonFields = ['affected_parts', 'affected_bom_ids', 'affected_docs'];
        $sets    = ["version = version + 1"];
        $params  = [':id' => $id];

        foreach (array_merge($allowed, $jsonFields) as $field) {
            if (!array_key_exists($field, $body)) {
                continue;
            }
            if (in_array($field, $jsonFields, true)) {
                $sets[]           = "{$field} = :{$field}::jsonb";
                $params[":{$field}"] = json_encode($body[$field]);
            } else {
                $sets[]           = "{$field} = :{$field}";
                $params[":{$field}"] = $body[$field];
            }
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) . " WHERE " . self::PK . " = :id",
            $params
        );

        $this->emitQualityEvent('eqms.engineering_change.updated', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['updated' => true]);
    }

    // ── Cross-cutting Endpoints ───────────────────────────────────────────────

    /** GET /eqms/engineering-changes/{id}/audit */
    public function audit(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveAuditTrail(self::ENTITY_TYPE, $id);
    }

    /** GET|POST /eqms/engineering-changes/{id}/comments */
    public function comments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveComments(self::ENTITY_TYPE, $id, $user);
    }

    /** GET|POST /eqms/engineering-changes/{id}/attachments */
    public function attachments(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveAttachments(self::ENTITY_TYPE, $id, $user);
    }

    /** GET /eqms/engineering-changes/{id}/relationships */
    public function relationships(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user);
    }

    /** POST /eqms/engineering-changes/{id}/relationships/link */
    public function relationshipsLink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'link');
    }

    /** POST /eqms/engineering-changes/{id}/relationships/unlink */
    public function relationshipsUnlink(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id = $this->requirePathId();
        $this->serveRelationships(self::ENTITY_TYPE, $id, $user, 'unlink');
    }

    /** GET /eqms/engineering-changes/{id}/available-actions */
    public function availableActions(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id  = $this->requirePathId();
        $rec = $this->fetchRecord($id);
        $this->serveAvailableActions((string)$rec['status'], $this->stateMachine());
    }

    /** GET|POST /eqms/engineering-changes/{id}/signatures */
    public function signatures(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveSignatures(self::ENTITY_TYPE, $id, $user);
    }

    /** POST /eqms/engineering-changes/{id}/export */
    public function export(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $id = $this->requirePathId();
        $this->serveExport(self::MODULE, $id, $user);
    }

    /** POST /eqms/engineering-changes/export-bulk */
    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── Workflow Action Endpoints ─────────────────────────────────────────────

    /**
     * POST /eqms/engineering-changes/{id}/actions/submit-assessment
     * Submit or update the assessment; transitions draft|assessment → assessment (or pending_approval).
     * Body: { assessment_notes: '...', assessor: '...', affected_parts: [...] }
     */
    public function actionSubmitAssessment(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'submit-assessment', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $body = $this->jsonBody();
        $this->requireFields($body, ['assessment_notes', 'assessor', 'affected_parts']);

        if (!is_array($body['affected_parts'])) {
            $this->error('invalid_affected_parts', 400, "'affected_parts' must be an array.");
        }

        $now = $this->nowIso();
        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'assessment',
                 assessment_notes = :notes,
                 assessor = :assessor,
                 assessed_at = :at,
                 affected_parts = :parts::jsonb,
                 version = version + 1
             WHERE " . self::PK . " = :id",
            [
                ':notes'    => trim((string)$body['assessment_notes']),
                ':assessor' => trim((string)$body['assessor']),
                ':at'       => $now,
                ':parts'    => json_encode($body['affected_parts']),
                ':id'       => $id,
            ]
        );

        $this->emitQualityEvent('eqms.engineering_change.assessment_submitted', self::ENTITY_TYPE, $id,
            ['assessor' => $body['assessor'], 'assessed_at' => $now], $user);
        $this->success(['status' => 'assessment']);
    }

    /**
     * POST /eqms/engineering-changes/{id}/actions/approve
     * Approve the engineering change; transitions assessment|pending_approval → approved.
     * REQUIRES electronic signature.
     */
    public function actionApprove(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'approve', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $this->requireElectronicSignature($user, 'approve', $id);

        $actor = (string)($user['username'] ?? $user['user'] ?? 'unknown');
        $now   = $this->nowIso();

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'approved', approved_by = :by, approved_at = :at, version = version + 1
             WHERE " . self::PK . " = :id",
            [':by' => $actor, ':at' => $now, ':id' => $id]
        );

        $this->emitQualityEvent('eqms.engineering_change.approved', self::ENTITY_TYPE, $id,
            ['approved_by' => $actor, 'approved_at' => $now], $user);
        $this->success(['status' => 'approved', 'approved_by' => $actor, 'approved_at' => $now]);
    }

    /**
     * POST /eqms/engineering-changes/{id}/actions/implement
     * Begin implementation; transitions approved → implementation.
     * Body: { implementation_notes: '...', effective_date: 'YYYY-MM-DD' }
     */
    public function actionImplement(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'implement', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $body = $this->jsonBody();
        $this->requireFields($body, ['implementation_notes', 'effective_date']);

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'implementation',
                 implementation_notes = :notes,
                 effective_date = :date,
                 version = version + 1
             WHERE " . self::PK . " = :id",
            [
                ':notes' => trim((string)$body['implementation_notes']),
                ':date'  => trim((string)$body['effective_date']),
                ':id'    => $id,
            ]
        );

        $this->emitQualityEvent('eqms.engineering_change.implementation_started', self::ENTITY_TYPE, $id,
            ['effective_date' => $body['effective_date']], $user);
        $this->success(['status' => 'implementation']);
    }

    /**
     * POST /eqms/engineering-changes/{id}/actions/close
     * Close the engineering change; transitions implementation → closed.
     * REQUIRES electronic signature.
     */
    public function actionClose(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'close', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);
        $this->requireElectronicSignature($user, 'close', $id);

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET status = 'closed', version = version + 1 WHERE " . self::PK . " = :id",
            [':id' => $id]
        );

        $this->emitQualityEvent('eqms.engineering_change.closed', self::ENTITY_TYPE, $id, [], $user);
        $this->success(['status' => 'closed']);
    }

    /**
     * POST /eqms/engineering-changes/{id}/actions/cancel
     * Cancel the engineering change; available from assessment, pending_approval, approved, implementation.
     * Body: { cancellation_reason: '...' }
     */
    public function actionCancel(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $id   = $this->requirePathId();
        $rec  = $this->fetchRecord($id);

        $this->requireValidTransition((string)$rec['status'], 'cancel', $this->stateMachine(), $id);
        $this->requireVersionMatch((int)$rec['version'], $id);

        $body = $this->jsonBody();
        $this->requireFields($body, ['cancellation_reason']);

        $reason = trim((string)$body['cancellation_reason']);
        if ($reason === '') {
            $this->error('cancellation_reason_required', 400, "'cancellation_reason' must not be empty.");
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET status = 'cancelled', version = version + 1
             WHERE " . self::PK . " = :id",
            [':id' => $id]
        );

        $this->emitQualityEvent('eqms.engineering_change.cancelled', self::ENTITY_TYPE, $id,
            ['cancellation_reason' => $reason], $user);
        $this->success(['status' => 'cancelled', 'cancellation_reason' => $reason]);
    }
}
