<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

/**
 * EQMS Genealogy Controller — Canonical EQMS surface over the Traceability/Genealogy domain.
 *
 * Delegates to existing genealogy_threads table (migrations 066/078).
 * Exposes upstream/downstream chain traversal and immutable evidence-freeze.
 *
 * Special action:
 *   actionFreezeTraceReport — locks a genealogy record as regulatory evidence
 *   (immutable once frozen). Requires quality_manager signature. Emits
 *   eqms.genealogy.frozen event.
 *
 * Standards: 21 CFR Part 820.184, ISO 13485 §7.5.9, IATF 16949 §8.5.2
 *
 * @package MOM\Api\Controllers
 * @since   4.0.0
 */
class EqmsGenealogyController extends EqmsBaseController
{
    private const ENTITY_TYPE = 'genealogy';
    private const MODULE      = 'genealogy';
    private const TABLE       = 'genealogy_threads';
    protected const PK          = 'thread_id';

    private function genealogyWriteRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'quality_manager', 'qa_manager',
            'production_director', 'traceability_analyst',
        ])));
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    private function loadThread(string $id): array
    {
        $row = $this->data->query(
            "SELECT * FROM " . self::TABLE . " WHERE thread_id = :id LIMIT 1",
            [':id' => $id]
        );
        if (empty($row)) {
            $this->error('genealogy_thread_not_found', 404, "Genealogy thread '{$id}' not found.");
        }
        return $row[0];
    }

    private function assertNotFrozen(array $thread): void
    {
        if (!empty($thread['frozen'])) {
            $this->error('record_frozen', 409,
                "This genealogy record is frozen as regulatory evidence and cannot be mutated.");
        }
    }

    // ── Query & Metrics ───────────────────────────────────────────────────────

    /** POST /eqms/genealogy/query — Paged genealogy search. */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $q = $this->parseQueryBody();

        $conditions = ['1=1'];
        $params     = [':lim' => $q['limit'], ':off' => $q['offset']];

        if ($q['search'] !== '') {
            $conditions[] = "(lot_id::text ILIKE :search OR product_id::text ILIKE :search OR work_order_id::text ILIKE :search)";
            $params[':search'] = '%' . $q['search'] . '%';
        }

        foreach (['lot_id', 'product_id', 'work_order_id'] as $f) {
            if (!empty($q['filters'][$f])) {
                $conditions[] = "{$f} = :{$f}";
                $params[":{$f}"] = $q['filters'][$f];
            }
        }

        if (!empty($q['filters']['date_from'])) {
            $conditions[] = "created_at >= :date_from";
            $params[':date_from'] = $q['filters']['date_from'];
        }

        if (!empty($q['filters']['date_to'])) {
            $conditions[] = "created_at <= :date_to";
            $params[':date_to'] = $q['filters']['date_to'];
        }

        if (isset($q['filters']['frozen'])) {
            $conditions[] = "frozen = :frozen";
            $params[':frozen'] = $q['filters']['frozen'] ? 'true' : 'false';
        }

        $where  = implode(' AND ', $conditions);
        $sortBy = in_array($q['sort_by'], ['thread_id', 'lot_id', 'product_id', 'created_at'], true)
                  ? $q['sort_by'] : 'created_at';

        $items = $this->data->query(
            "SELECT thread_id, lot_id, product_id, work_order_id,
                    frozen, frozen_by, frozen_at, created_at
             FROM " . self::TABLE . "
             WHERE {$where}
             ORDER BY {$sortBy} {$q['sort_dir']}
             LIMIT :lim OFFSET :off",
            $params
        ) ?? [];

        $total = (int)($this->data->scalar(
            "SELECT COUNT(*) FROM " . self::TABLE . " WHERE {$where}",
            array_diff_key($params, [':lim' => 0, ':off' => 0])
        ) ?? 0);

        $this->paginated('genealogy_threads', $items, $total, $q['offset'], $q['limit']);
    }

    /** GET /eqms/genealogy/metrics */
    public function metrics(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $total = (int)($this->data->scalar("SELECT COUNT(*) FROM " . self::TABLE) ?? 0);
        $frozen = (int)($this->data->scalar("SELECT COUNT(*) FROM " . self::TABLE . " WHERE frozen = true") ?? 0);

        $recent = $this->data->query(
            "SELECT thread_id, lot_id, product_id, created_at
             FROM " . self::TABLE . " ORDER BY created_at DESC LIMIT 10"
        ) ?? [];

        $this->success([
            'metrics' => [
                'total_threads'  => $total,
                'frozen_count'   => $frozen,
                'recent_threads' => $recent,
            ],
        ]);
    }

    /** POST /eqms/genealogy/lookup — Fast lot/serial lookup. */
    public function lookup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());

        $body = $this->jsonBody();

        // Support lookup by lot_ids or thread_ids
        $lotIds    = is_array($body['lot_ids'] ?? null)    ? $body['lot_ids']    : [];
        $threadIds = is_array($body['thread_ids'] ?? null) ? $body['thread_ids'] : [];

        if (empty($lotIds) && empty($threadIds)) {
            $this->success(['records' => []]);
        }

        $conditions = ['1=0'];
        $params     = [];

        if (!empty($lotIds)) {
            $phs = implode(',', array_map(fn($i) => ":lot{$i}", array_keys($lotIds)));
            foreach ($lotIds as $i => $id) {
                $params[":lot{$i}"] = $id;
            }
            $conditions[] = "lot_id IN ({$phs})";
        }

        if (!empty($threadIds)) {
            $phs = implode(',', array_map(fn($i) => ":tid{$i}", array_keys($threadIds)));
            foreach ($threadIds as $i => $id) {
                $params[":tid{$i}"] = $id;
            }
            $conditions[] = "thread_id IN ({$phs})";
        }

        $where = implode(' OR ', $conditions);

        $rows = $this->data->query(
            "SELECT thread_id, lot_id, product_id, work_order_id, frozen
             FROM " . self::TABLE . " WHERE {$where}",
            $params
        ) ?? [];

        $this->success(['records' => $rows]);
    }

    // ── Detail & Update ───────────────────────────────────────────────────────

    /** GET /eqms/genealogy/{id} — Full genealogy record with upstream/downstream chain. */
    public function detail(): never
    {
        $user     = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $threadId = $this->requirePathId('id', 'thread_id');
        $thread   = $this->loadThread($threadId);

        // Upstream components / lots
        $upstream = $this->data->query(
            "SELECT * FROM genealogy_threads
             WHERE thread_id IN (
                 SELECT upstream_thread_id FROM genealogy_links WHERE thread_id = :id
             )
             ORDER BY created_at",
            [':id' => $threadId]
        ) ?? [];

        // Downstream assemblies / shipments
        $downstream = $this->data->query(
            "SELECT * FROM genealogy_threads
             WHERE thread_id IN (
                 SELECT thread_id FROM genealogy_links WHERE upstream_thread_id = :id
             )
             ORDER BY created_at",
            [':id' => $threadId]
        ) ?? [];

        $this->success([
            'thread'     => $thread,
            'upstream'   => $upstream,
            'downstream' => $downstream,
        ]);
    }

    /**
     * PATCH /eqms/genealogy/{id} — Update metadata/notes (restricted fields only).
     * Frozen records cannot be updated.
     */
    public function update(): never
    {
        $user     = $this->requireAuth();
        $this->requireAnyRole($user, $this->genealogyWriteRoles());
        $threadId = $this->requirePathId('id', 'thread_id');
        $thread   = $this->loadThread($threadId);

        $this->assertNotFrozen($thread);

        $body      = $this->jsonBody();
        $sets      = [];
        $params    = [':id' => $threadId];
        $updatable = ['notes', 'metadata'];

        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $sets[]           = $field === 'metadata'
                    ? "metadata = :{$field}::jsonb"
                    : "{$field} = :{$field}";
                $params[":{$field}"] = $field === 'metadata'
                    ? json_encode($body[$field])
                    : $body[$field];
            }
        }
        if (empty($sets)) {
            $this->error('no_fields_to_update', 400, "Only 'notes' and 'metadata' can be updated.");
        }

        $this->data->execute(
            "UPDATE " . self::TABLE . " SET " . implode(', ', $sets) .
            " WHERE thread_id = :id",
            $params
        );

        $this->emitQualityEvent('eqms.genealogy.updated', self::ENTITY_TYPE, $threadId, [], $user);
        $this->success(['thread' => $this->loadThread($threadId)]);
    }

    // ── Cross-cutting ─────────────────────────────────────────────────────────

    public function audit(): never
    {
        $user     = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $threadId = $this->requirePathId('id', 'thread_id');
        $this->loadThread($threadId);
        $this->serveAuditTrail(self::ENTITY_TYPE, $threadId);
    }

    public function export(): never
    {
        $user     = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $threadId = $this->requirePathId('id', 'thread_id');
        $this->loadThread($threadId);
        $this->serveExport(self::MODULE, $threadId, $user);
    }

    public function exportBulk(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $this->serveExport(self::MODULE, 'bulk', $user);
    }

    // ── Genealogy Actions ─────────────────────────────────────────────────────

    /**
     * POST /eqms/genealogy/{id}/actions/expand-upstream
     * Trace all upstream components / lots recursively.
     */
    public function actionExpandUpstream(): never
    {
        $user     = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $threadId = $this->requirePathId('id', 'thread_id');
        $this->loadThread($threadId);

        // Recursive CTE for upstream chain
        $chain = $this->data->query(
            "WITH RECURSIVE upstream_chain AS (
                 SELECT t.thread_id, t.lot_id, t.product_id, t.work_order_id, 0 AS depth
                 FROM genealogy_threads t WHERE t.thread_id = :id
                 UNION ALL
                 SELECT t2.thread_id, t2.lot_id, t2.product_id, t2.work_order_id, uc.depth + 1
                 FROM genealogy_threads t2
                 JOIN genealogy_links gl ON gl.upstream_thread_id = t2.thread_id
                 JOIN upstream_chain uc ON uc.thread_id = gl.thread_id
                 WHERE uc.depth < 20
             )
             SELECT * FROM upstream_chain ORDER BY depth",
            [':id' => $threadId]
        ) ?? [];

        $this->success(['thread_id' => $threadId, 'upstream_chain' => $chain, 'depth' => count($chain)]);
    }

    /**
     * POST /eqms/genealogy/{id}/actions/expand-downstream
     * Trace all downstream assemblies / shipments recursively.
     */
    public function actionExpandDownstream(): never
    {
        $user     = $this->requireAuth();
        $this->requireAnyRole($user, $this->eqmsReadRoles());
        $threadId = $this->requirePathId('id', 'thread_id');
        $this->loadThread($threadId);

        $chain = $this->data->query(
            "WITH RECURSIVE downstream_chain AS (
                 SELECT t.thread_id, t.lot_id, t.product_id, t.work_order_id, 0 AS depth
                 FROM genealogy_threads t WHERE t.thread_id = :id
                 UNION ALL
                 SELECT t2.thread_id, t2.lot_id, t2.product_id, t2.work_order_id, dc.depth + 1
                 FROM genealogy_threads t2
                 JOIN genealogy_links gl ON gl.thread_id = t2.thread_id
                 JOIN downstream_chain dc ON dc.thread_id = gl.upstream_thread_id
                 WHERE dc.depth < 20
             )
             SELECT * FROM downstream_chain ORDER BY depth",
            [':id' => $threadId]
        ) ?? [];

        $this->success(['thread_id' => $threadId, 'downstream_chain' => $chain, 'depth' => count($chain)]);
    }

    /**
     * POST /eqms/genealogy/{id}/actions/freeze-trace-report
     * Lock genealogy record as regulatory evidence. IMMUTABLE after freeze.
     * REQUIRES quality_manager role AND electronic signature.
     * Emits eqms.genealogy.frozen event.
     */
    public function actionFreezeTraceReport(): never
    {
        $user     = $this->requireAuth();

        // Strict role check — only quality_manager can freeze
        $userRoles = (array)($user['roles'] ?? []);
        $hasQmRole = in_array('quality_manager', $userRoles, true)
                     || in_array('admin', $userRoles, true)
                     || in_array('super_admin', $userRoles, true);
        if (!$hasQmRole) {
            $this->error('quality_manager_required', 403,
                "Freezing a genealogy trace report requires the 'quality_manager' role.");
        }

        $threadId = $this->requirePathId('id', 'thread_id');
        $thread   = $this->loadThread($threadId);

        // Already frozen?
        if (!empty($thread['frozen'])) {
            $this->error('already_frozen', 409,
                "This genealogy record is already frozen as regulatory evidence.");
        }

        $this->requireElectronicSignature($user, 'freeze-trace-report', $threadId);

        $actor = (string)($user['username'] ?? 'unknown');

        $this->data->execute(
            "UPDATE " . self::TABLE . "
             SET frozen = true, frozen_by = :by, frozen_at = now()
             WHERE thread_id = :id",
            [':by' => $actor, ':id' => $threadId]
        );

        $this->emitQualityEvent('eqms.genealogy.frozen', self::ENTITY_TYPE, $threadId, [
            'frozen_by' => $actor,
            'frozen_at' => $this->nowIso(),
        ], $user);

        $this->success([
            'thread'    => $this->loadThread($threadId),
            'frozen'    => true,
            'frozen_by' => $actor,
        ]);
    }
}
