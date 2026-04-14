<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;

/**
 * Approval Group orchestration service for the Foundation Governance Contract Slice.
 *
 * Owns: approval-group list, detail, snapshot ETag, decision bridge,
 *       timeline projection, and requestApproval command.
 *
 * @package MOM\Services
 * @since   5.0.0
 */
final class ApprovalGroupService
{
    /**
     * The approval_group decision path is bridged through ApprovalWorkflowAdapter.
     * This is a readiness signal consumed by runtime/publication gates; it does
     * not introduce a second workflow authority.
     */
    public const WORKFLOW_BRIDGE_READY = true;

    private DataLayer $data;
    private FoundationGovernanceService $fgService;
    private ?ApprovalWorkflowAdapter $workflowAdapter = null;

    public function __construct(DataLayer $data)
    {
        $this->data = $data;
        $this->fgService = new FoundationGovernanceService($data);
    }

    private function workflowAdapter(): ApprovalWorkflowAdapter
    {
        if ($this->workflowAdapter === null) {
            $this->workflowAdapter = new ApprovalWorkflowAdapter($this->data);
        }
        return $this->workflowAdapter;
    }

    // ── ETag helpers ───────────────────────────────────────────────────────

    /**
     * Compute a strong ETag from a canonical JSON snapshot.
     */
    public function computeStrongETag(array $snapshot): string
    {
        ksort($snapshot);
        $canonical = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return '"' . hash('sha256', $canonical) . '"';
    }

    /**
     * Parse and validate an If-Match header value.
     *
     * @return string|null The unquoted ETag or null if missing.
     * @throws \InvalidArgumentException On malformed header.
     */
    public function parseIfMatch(?string $header): ?string
    {
        if ($header === null || $header === '') {
            return null;
        }
        $trimmed = trim($header);
        if ($trimmed === '*') {
            return '*';
        }
        if (!preg_match('/^"([^"]+)"$/', $trimmed, $m)) {
            throw new \InvalidArgumentException('Malformed If-Match header.');
        }
        return $trimmed;
    }

    // ── List ───────────────────────────────────────────────────────────────

    /**
     * List approval groups with cursor pagination.
     *
     * @param array<string, mixed> $params
     * @return array{data: list<array>, pageInfo: array}
     */
    public function listApprovalGroups(array $params): array
    {
        $limit  = min(100, max(1, (int)($params['limit'] ?? 50)));
        $cursor = $params['cursor'] ?? null;
        $entityName = $params['entityName'] ?? null;
        $entityId   = $params['entityId'] ?? null;
        $statusCode = $params['statusCode'] ?? null;
        $approverPartyId = $params['approverPartyId'] ?? null;
        $decisionCode    = $params['decisionCode'] ?? null;

        $sortFields = ['requested_at', 'approval_group_id'];
        $directions = ['desc', 'desc'];
        $sort = array_map(fn($f, $d) => ['field' => $f, 'direction' => $d], $sortFields, $directions);

        $conn = $this->data->getConnection();
        if ($conn === null) {
            return ['data' => [], 'pageInfo' => $this->fgService->buildPageInfo($limit, false, false, null, null, $sort)];
        }

        $where = [];
        $binds = [];

        if ($entityName !== null && $entityName !== '') {
            $where[] = "g.entity_name = :entity_name";
            $binds[':entity_name'] = $entityName;
        }
        if ($entityId !== null && $entityId !== '') {
            $where[] = "g.entity_id = :entity_id";
            $binds[':entity_id'] = $entityId;
        }
        if ($statusCode !== null && $statusCode !== '') {
            $where[] = "g.group_status = :status_code";
            $binds[':status_code'] = $statusCode;
        }
        if ($approverPartyId !== null && $approverPartyId !== '') {
            $where[] = "EXISTS (SELECT 1 FROM approval a2 WHERE a2.approval_group_id = g.approval_group_id AND a2.approver_party_id = :approver)";
            $binds[':approver'] = $approverPartyId;
        }
        if ($decisionCode !== null && $decisionCode !== '') {
            $where[] = "g.group_decision = :decision_code";
            $binds[':decision_code'] = $decisionCode;
        }

        if ($cursor !== null && $cursor !== '') {
            $ck = $this->fgService->decodeCursor($cursor);
            $where[] = "(g.requested_at, g.approval_group_id::text) < (:ck_at, :ck_id)";
            $binds[':ck_at'] = $ck['k'][0] ?? '';
            $binds[':ck_id'] = $ck['k'][1] ?? '';
        }

        $whereClause = empty($where) ? '' : 'WHERE ' . implode(' AND ', $where);

        $sql = "WITH groups AS (
                    SELECT approval_group_id,
                           entity_name,
                           entity_id,
                           MIN(created_at) AS requested_at,
                           (SELECT a2.approver_party_id FROM approval a2 WHERE a2.approval_group_id = approval.approval_group_id AND a2.approval_step_code = 'requester' LIMIT 1) AS requested_by_party_id,
                           CASE WHEN bool_and(status_code = 'completed' AND decision_code = 'approve') THEN 'completed'
                                WHEN bool_or(status_code = 'completed' AND decision_code = 'reject') THEN 'completed'
                                ELSE 'pending' END AS group_status,
                           CASE WHEN bool_and(status_code = 'completed' AND decision_code = 'approve') THEN 'approve'
                                WHEN bool_or(status_code = 'completed' AND decision_code = 'reject') THEN 'reject'
                                ELSE NULL END AS group_decision,
                           MAX(decided_at) AS decided_at,
                           MAX(approval_step_code) FILTER (WHERE status_code = 'pending') AS current_step_code
                    FROM approval
                    GROUP BY approval_group_id, entity_name, entity_id
                )
                SELECT g.* FROM groups g
                {$whereClause}
                ORDER BY g.requested_at DESC, g.approval_group_id DESC
                LIMIT :lim";

        $binds[':lim'] = $limit + 1;

        try {
            $rows = $conn->query($sql, $binds);
        } catch (\Throwable $e) {
            return ['data' => [], 'pageInfo' => $this->fgService->buildPageInfo($limit, false, false, null, null, $sort)];
        }

        $hasNext = count($rows) > $limit;
        if ($hasNext) {
            array_pop($rows);
        }

        $data = array_map(function (array $r): array {
            $snapshot = $this->buildGroupSnapshot($r['approval_group_id'], $r);
            return [
                'approvalGroupId'    => $r['approval_group_id'],
                'entityName'         => $r['entity_name'],
                'entityId'           => $r['entity_id'],
                'statusCode'         => $r['group_status'],
                'decisionCode'       => $r['group_decision'],
                'requestedAt'        => $r['requested_at'] ? (new \DateTimeImmutable($r['requested_at']))->format('c') : null,
                'requestedByPartyId' => $r['requested_by_party_id'],
                'decidedAt'          => $r['decided_at'] ? (new \DateTimeImmutable($r['decided_at']))->format('c') : null,
                'currentStepCode'    => $r['current_step_code'],
                'etag'               => $this->computeStrongETag($snapshot),
            ];
        }, $rows);

        $startCursor = null;
        $endCursor   = null;
        if (!empty($data)) {
            $first = $data[0];
            $startCursor = $this->fgService->encodeCursor($sortFields, $directions, [$first['requestedAt'] ?? '', $first['approvalGroupId']]);
            $last = $data[count($data) - 1];
            $endCursor = $this->fgService->encodeCursor($sortFields, $directions, [$last['requestedAt'] ?? '', $last['approvalGroupId']]);
        }

        return [
            'data'     => $data,
            'pageInfo' => $this->fgService->buildPageInfo($limit, $hasNext, $cursor !== null, $startCursor, $endCursor, $sort),
        ];
    }

    // ── Detail ─────────────────────────────────────────────────────────────

    /**
     * Get approval group detail with steps and strong ETag.
     *
     * @return array{data: array, etag: string}|null
     */
    public function getApprovalGroup(string $approvalGroupId): ?array
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            return null;
        }

        try {
            $rows = $conn->query(
                "SELECT approval_id, approval_group_id, entity_name, entity_id,
                        approval_step_code, approver_party_id, status_code,
                        decision_code, decided_at, created_at, row_version
                 FROM approval
                 WHERE approval_group_id = :gid
                 ORDER BY created_at ASC, approval_step_code ASC",
                [':gid' => $approvalGroupId]
            );
        } catch (\Throwable $e) {
            return null;
        }

        if (empty($rows)) {
            return null;
        }

        $first = $rows[0];
        $groupStatus = 'pending';
        $groupDecision = null;
        $decidedAt = null;
        $allApproved = true;
        $anyRejected = false;
        $requestedByPartyId = null;

        $steps = [];
        foreach ($rows as $r) {
            // Extract requester identity from the 'requester' step
            if ($r['approval_step_code'] === 'requester') {
                $requestedByPartyId = $r['approver_party_id'];
                continue; // Don't include requester row in visible steps
            }

            if ($r['status_code'] !== 'completed' || $r['decision_code'] !== 'approve') {
                $allApproved = false;
            }
            if ($r['status_code'] === 'completed' && $r['decision_code'] === 'reject') {
                $anyRejected = true;
            }
            if ($r['decided_at'] !== null && ($decidedAt === null || $r['decided_at'] > $decidedAt)) {
                $decidedAt = $r['decided_at'];
            }

            $steps[] = [
                'approvalStepCode' => $r['approval_step_code'],
                'approverPartyId'  => $r['approver_party_id'],
                'statusCode'       => $r['status_code'],
                'decisionCode'     => $r['decision_code'],
                'decidedAt'        => $r['decided_at'] ? (new \DateTimeImmutable($r['decided_at']))->format('c') : null,
                'rowVersion'       => (int)($r['row_version'] ?? 1),
            ];
        }

        if (empty($steps)) {
            return null; // Only requester row, no approval steps
        }

        if ($allApproved) {
            $groupStatus = 'completed';
            $groupDecision = 'approve';
        } elseif ($anyRejected) {
            $groupStatus = 'completed';
            $groupDecision = 'reject';
        }

        $detail = [
            'approvalGroupId'    => $approvalGroupId,
            'entityName'         => $first['entity_name'],
            'entityId'           => $first['entity_id'],
            'statusCode'         => $groupStatus,
            'decisionCode'       => $groupDecision,
            'requestedAt'        => (new \DateTimeImmutable($first['created_at']))->format('c'),
            'requestedByPartyId' => $requestedByPartyId,
            'decidedAt'          => $decidedAt !== null ? (new \DateTimeImmutable($decidedAt))->format('c') : null,
            'steps'              => $steps,
        ];

        $snapshot = $this->buildDetailSnapshot($approvalGroupId, $groupStatus, $groupDecision, $steps);
        $etag = $this->computeStrongETag($snapshot);

        return ['data' => $detail, 'etag' => $etag];
    }

    // ── Decide ─────────────────────────────────────────────────────────────

    /**
     * Record a decision on an approval group.
     *
     * @param string $approvalGroupId
     * @param string $ifMatchEtag     The strong ETag from If-Match header.
     * @param array  $payload         Decision payload.
     * @param string $actorPartyId    The deciding party.
     * @return array{data: array, etag: string, status: int}
     * @throws \RuntimeException On state/ETag/policy violations.
     */
    public function decide(string $approvalGroupId, string $ifMatchEtag, array $payload, string $actorPartyId): array
    {
        $current = $this->getApprovalGroup($approvalGroupId);
        if ($current === null) {
            throw new \RuntimeException('resource_not_found', 404);
        }

        if ($current['etag'] !== $ifMatchEtag) {
            throw new \RuntimeException('etag_mismatch', 412);
        }

        $detail = $current['data'];
        if ($detail['statusCode'] === 'completed') {
            throw new \RuntimeException('invalid_state_transition', 409);
        }

        $decisionCode = $payload['decisionCode'] ?? '';
        $commentText = $payload['commentText'] ?? null;
        $reasonCode  = $payload['reasonCode'] ?? null;
        $esigId      = $payload['electronicSignatureId'] ?? null;

        $pendingStep = null;
        foreach ($detail['steps'] as $step) {
            if ($step['statusCode'] === 'pending') {
                $pendingStep = $step;
                break;
            }
        }

        if ($pendingStep === null) {
            throw new \RuntimeException('invalid_state_transition', 409);
        }

        // Execute through the WorkflowEngine bridge adapter.
        // This validates state, decision code, and self-approval prohibition.
        $bridgeResult = $this->workflowAdapter()->executeDecision(
            $approvalGroupId,
            $pendingStep['approvalStepCode'],
            $pendingStep['statusCode'],
            $decisionCode,
            $actorPartyId,
            $detail['requestedByPartyId'] ?? null,
            $commentText,
        );

        if (!$bridgeResult['success']) {
            $errorMsg = $bridgeResult['error'] ?? 'workflow_transition_failed';
            $errorCode = $bridgeResult['errorCode'] ?? 409;
            // Map adapter errors to the right exception codes
            if (str_contains($errorMsg, 'self_approval_forbidden')) {
                throw new \RuntimeException('self_approval_forbidden', 403);
            }
            if (str_contains($errorMsg, 'validation_error')) {
                throw new \RuntimeException('validation_error', 422);
            }
            throw new \RuntimeException('invalid_state_transition', $errorCode);
        }

        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $now = gmdate('Y-m-d\TH:i:s.v\Z');

        try {
            $affected = $conn->execute(
                "UPDATE approval SET
                    decision_code = :decision,
                    comment_text = :comment,
                    decision_reason_code = :reason,
                    electronic_signature_id = :esig,
                    approver_party_id = :actor,
                    decided_at = NOW(),
                    status_code = 'completed'
                 WHERE approval_group_id = :gid
                   AND approval_step_code = :step
                   AND status_code = 'pending'
                   AND row_version = :rv",
                [
                    ':decision' => $decisionCode,
                    ':comment'  => $commentText,
                    ':reason'   => $reasonCode,
                    ':esig'     => $esigId,
                    ':actor'    => $actorPartyId,
                    ':gid'      => $approvalGroupId,
                    ':step'     => $pendingStep['approvalStepCode'],
                    ':rv'       => $pendingStep['rowVersion'],
                ]
            );

            if ($affected === 0) {
                throw new \RuntimeException('etag_mismatch', 412);
            }
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('decision_failed', 500);
        }

        $auditTrail = new AuditTrail($this->data->getDataDir());
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::APPROVED,
            'approval_group',
            $approvalGroupId,
            $actorPartyId,
            [
                'decision_code' => $decisionCode,
                'step_code'     => $pendingStep['approvalStepCode'],
                'comment'       => $commentText,
                'reason_code'   => $reasonCode,
            ]
        ));

        // OTel structured observability
        $otel = SliceObservability::getInstance($this->data->getDataDir());
        $otel->setActorContext($actorPartyId);
        $otel->logApprovalDecision($approvalGroupId, $pendingStep['approvalStepCode'], $decisionCode, $actorPartyId, $commentText);
        if ($esigId !== null) {
            $otel->logSignatureApplication($approvalGroupId, $esigId, true, true);
        }

        $updated = $this->getApprovalGroup($approvalGroupId);

        return [
            'data'   => [
                'approvalGroupId' => $approvalGroupId,
                'statusCode'      => $updated['data']['statusCode'] ?? 'pending',
                'decisionCode'    => $decisionCode,
                'decidedAt'       => $now,
                'etag'            => $updated['etag'] ?? '',
            ],
            'etag'   => $updated['etag'] ?? '',
            'status' => 200,
        ];
    }

    // ── Timeline ───────────────────────────────────────────────────────────

    /**
     * List timeline events for an approval group.
     *
     * @return array{data: list<array>, pageInfo: array, etag: string}|null
     */
    public function listTimeline(string $approvalGroupId, array $params): ?array
    {
        $limit  = min(100, max(1, (int)($params['limit'] ?? 50)));
        $cursor = $params['cursor'] ?? null;

        $sortFields = ['occurred_at', 'event_id'];
        $directions = ['asc', 'asc'];
        $sort = array_map(fn($f, $d) => ['field' => $f, 'direction' => $d], $sortFields, $directions);

        $conn = $this->data->getConnection();
        if ($conn === null) {
            return null;
        }

        try {
            $rows = $conn->query(
                "SELECT approval_id, approval_step_code, approver_party_id,
                        status_code, decision_code, decided_at, comment_text,
                        electronic_signature_id, created_at
                 FROM approval
                 WHERE approval_group_id = :gid
                 ORDER BY created_at ASC, approval_id ASC",
                [':gid' => $approvalGroupId]
            );
        } catch (\Throwable $e) {
            return null;
        }

        if (empty($rows)) {
            return null;
        }

        $events = [];
        $seq = 0;
        foreach ($rows as $r) {
            $events[] = [
                'eventId'                => $r['approval_id'],
                'eventType'              => $r['status_code'] === 'pending' ? 'step_assigned' : 'decision_recorded',
                'occurredAt'             => (new \DateTimeImmutable($r['decided_at'] ?? $r['created_at']))->format('c'),
                'actorPartyId'           => $r['approver_party_id'],
                'approvalStepCode'       => $r['approval_step_code'],
                'decisionCode'           => $r['decision_code'],
                'commentText'            => $r['comment_text'],
                'attachmentId'           => null,
                'electronicSignatureId'  => $r['electronic_signature_id'],
            ];
            $seq++;
        }

        $attRows = $conn->query(
            "SELECT attachment_id, file_name, created_at, uploaded_by_party_id
             FROM attachment
             WHERE entity_name = 'approval_group' AND entity_id = :gid
             ORDER BY created_at ASC",
            [':gid' => $approvalGroupId]
        );
        foreach ($attRows as $ar) {
            $events[] = [
                'eventId'                => 'att-' . $ar['attachment_id'],
                'eventType'              => 'attachment_added',
                'occurredAt'             => (new \DateTimeImmutable($ar['created_at']))->format('c'),
                'actorPartyId'           => $ar['uploaded_by_party_id'],
                'approvalStepCode'       => null,
                'decisionCode'           => null,
                'commentText'            => null,
                'attachmentId'           => $ar['attachment_id'],
                'electronicSignatureId'  => null,
            ];
        }

        usort($events, fn($a, $b) => strcmp($a['occurredAt'], $b['occurredAt']) ?: strcmp($a['eventId'], $b['eventId']));

        // Apply cursor advancement: skip events at or before the cursor position
        $startIdx = 0;
        if ($cursor !== null && $cursor !== '') {
            $ck = $this->fgService->decodeCursor($cursor);
            $cursorAt = $ck['k'][0] ?? '';
            $cursorId = $ck['k'][1] ?? '';
            foreach ($events as $idx => $ev) {
                $cmp = strcmp($ev['occurredAt'], $cursorAt) ?: strcmp($ev['eventId'], $cursorId);
                if ($cmp > 0) {
                    $startIdx = $idx;
                    break;
                }
                // If we reach the end without finding a position after cursor, start past the end
                if ($idx === count($events) - 1) {
                    $startIdx = count($events);
                }
            }
        }

        $page = array_slice($events, $startIdx, $limit + 1);
        $hasNext = count($page) > $limit;
        if ($hasNext) {
            array_pop($page);
        }

        $groupDetail = $this->getApprovalGroup($approvalGroupId);
        $etag = $groupDetail !== null ? $groupDetail['etag'] : '';

        $startCursor = null;
        $endCursor   = null;
        if (!empty($page)) {
            $first = $page[0];
            $startCursor = $this->fgService->encodeCursor($sortFields, $directions, [$first['occurredAt'], $first['eventId']]);
            $last = $page[count($page) - 1];
            $endCursor = $this->fgService->encodeCursor($sortFields, $directions, [$last['occurredAt'], $last['eventId']]);
        }

        return [
            'data'     => $page,
            'pageInfo' => $this->fgService->buildPageInfo($limit, $hasNext, $cursor !== null, $startCursor, $endCursor, $sort),
            'etag'     => $etag,
        ];
    }

    // ── Request Approval (internal command) ────────────────────────────────

    /**
     * Create a new approval group.
     *
     * @return array Created approval-group representation.
     */
    public function requestApproval(array $payload, string $actorPartyId): array
    {
        $entityName = $payload['entity_name'] ?? '';
        $entityId   = $payload['entity_id'] ?? '';
        $steps      = $payload['steps'] ?? [];

        if ($entityName === '' || $entityId === '') {
            throw new \InvalidArgumentException('entity_name and entity_id are required.');
        }

        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('database_unavailable', 503);
        }

        $groupId = $this->generateUuidV4();

        try {
            $conn->beginTransaction();

            if (empty($steps)) {
                $steps = [['step_code' => 'default', 'approver_party_id' => null]];
            }

            // First row: requester identity record (step_code = 'requester')
            $conn->execute(
                "INSERT INTO approval (approval_group_id, entity_name, entity_id, approval_step_code, approver_party_id, status_code, decision_code, decided_at)
                 VALUES (:gid, :en, :eid, 'requester', :requester, 'completed', 'requested', NOW())",
                [
                    ':gid'       => $groupId,
                    ':en'        => $entityName,
                    ':eid'       => $entityId,
                    ':requester' => $actorPartyId,
                ]
            );

            // Subsequent rows: actual approval steps
            foreach ($steps as $step) {
                $conn->execute(
                    "INSERT INTO approval (approval_group_id, entity_name, entity_id, approval_step_code, approver_party_id, status_code)
                     VALUES (:gid, :en, :eid, :step, :approver, 'pending')",
                    [
                        ':gid'      => $groupId,
                        ':en'       => $entityName,
                        ':eid'      => $entityId,
                        ':step'     => $step['step_code'] ?? 'default',
                        ':approver' => $step['approver_party_id'] ?? null,
                    ]
                );
            }

            $conn->commit();
        } catch (\Throwable $e) {
            // Connection class doesn't have rollBack, use getPdo()
            try { $conn->getPdo()->rollBack(); } catch (\Throwable $_) {}
            throw $e;
        }

        $auditTrail = new AuditTrail($this->data->getDataDir());
        $auditTrail->logEvent(new AuditEvent(
            AuditEventType::CREATED,
            'approval_group',
            $groupId,
            $actorPartyId,
            ['entity_name' => $entityName, 'entity_id' => $entityId]
        ));

        return ['approvalGroupId' => $groupId, 'statusCode' => 'pending'];
    }

    // ── Snapshot helpers ───────────────────────────────────────────────────

    private function buildGroupSnapshot(string $groupId, array $groupRow): array
    {
        return [
            'approvalGroupId' => $groupId,
            'statusCode'      => $groupRow['group_status'] ?? 'pending',
            'decisionCode'    => $groupRow['group_decision'] ?? null,
        ];
    }

    private function buildDetailSnapshot(string $groupId, string $status, ?string $decision, array $steps): array
    {
        $stepSnapshots = array_map(fn(array $s) => [
            'approvalStepCode' => $s['approvalStepCode'],
            'statusCode'       => $s['statusCode'],
            'decisionCode'     => $s['decisionCode'],
            'decidedAt'        => $s['decidedAt'],
            'rowVersion'       => $s['rowVersion'],
        ], $steps);

        return [
            'approvalGroupId' => $groupId,
            'statusCode'      => $status,
            'decisionCode'    => $decision,
            'steps'           => $stepSnapshots,
        ];
    }

    private function generateUuidV4(): string
    {
        $data    = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
