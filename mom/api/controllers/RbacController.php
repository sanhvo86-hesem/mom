<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\RbacService;
use Throwable;

/**
 * RBAC + Governance Controller.
 *
 * Custom endpoints for the admin governance surface that GenericCrudController
 * cannot answer (cross-table joins, SoD pre-check, view-backed read ports).
 *
 * Routes (registered in routes/rest-routes.php):
 *
 *   GET   /api/v1/rbac/effective-permissions/{userId}
 *   GET   /api/v1/rbac/sod-violations
 *   POST  /api/v1/rbac/role-assignments        body: {user_id, role_id, reason?, waive_sod?}
 *   DELETE/api/v1/rbac/role-assignments        body: {user_id, role_id, reason?}
 *
 *   GET   /api/v1/mfa/factors                  query: user_id
 *   POST  /api/v1/mfa/factors/{factorId}:revoke body: {reason}
 *   POST  /api/v1/mfa/factors:reset            body: {user_id, reason}
 *
 *   GET   /api/v1/documents/in-force
 *   GET   /api/v1/documents/pending-acknowledgement (auth user, or ?user_id for admin)
 *
 *   GET   /api/v1/portal-display/effective-layout (auth user, or ?user_id for admin)
 *
 *   GET   /api/v1/retention/due-for-disposal
 *   GET   /api/v1/access-review/progress
 *
 * @package MOM\Api\Controllers
 */
class RbacController extends BaseController
{
    private ?RbacService $rbac = null;

    private function rbac(): RbacService
    {
        if ($this->rbac === null) {
            $this->rbac = new RbacService($this->data);
        }
        return $this->rbac;
    }

    private function requireAuthOrFail(): array
    {
        $user = $this->requireAuth();
        if (!is_array($user)) {
            $this->error('unauthorized', 401);
        }
        return (array)$user;
    }

    private function actorId(array $user): string
    {
        // Session user uses `username` (legacy file-backed users.json) — resolve
        // to the canonical UUID from the `users` table on demand.
        $username = (string)($user['username'] ?? $user['user'] ?? $user['name'] ?? '');
        if ($username === '') {
            return '';
        }
        return $this->rbac()->resolveUserIdByUsername($username);
    }

    // ── RBAC ─────────────────────────────────────────────────────────────────

    /** GET /api/v1/rbac/effective-permissions/{userId} */
    public function effectivePermissions(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $userId = trim((string)($_GET['userId'] ?? ''));
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $userId)) {
            $this->error('invalid_user_id', 400);
        }
        try {
            $bundle = $this->rbac()->effectivePermissionsForUser($userId);
            $this->success(['data' => $bundle]);
        } catch (Throwable $e) {
            $this->error('effective_permissions_failed', 500, $e->getMessage());
        }
    }

    /** GET /api/v1/rbac/sod-violations */
    public function sodViolations(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        try {
            $rows = $this->rbac()->currentSodViolations();
            $this->success(['data' => $rows, 'count' => count($rows)]);
        } catch (Throwable $e) {
            $this->error('sod_violations_failed', 500, $e->getMessage());
        }
    }

    /** POST /api/v1/rbac/role-assignments */
    public function assignRole(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $userId   = trim((string)($body['user_id'] ?? ''));
        $roleId   = trim((string)($body['role_id'] ?? ''));
        $reason   = trim((string)($body['reason'] ?? ''));
        $waiveSod = (bool)($body['waive_sod'] ?? false);

        if ($userId === '' || $roleId === '') {
            $this->error('invalid_request', 400, 'user_id and role_id are required');
        }
        try {
            $result = $this->rbac()->assignRole($userId, $roleId, $this->actorId($user), $reason ?: null, $waiveSod);
            if (($result['ok'] ?? false) !== true) {
                $this->error((string)$result['error'], 409, null, ['conflicts' => $result['conflicts'] ?? []]);
            }
            $this->success(['data' => $result]);
        } catch (Throwable $e) {
            $this->error('role_assignment_failed', 500, $e->getMessage());
        }
    }

    /** DELETE /api/v1/rbac/role-assignments */
    public function revokeRole(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $userId = trim((string)($body['user_id'] ?? $_GET['user_id'] ?? ''));
        $roleId = trim((string)($body['role_id'] ?? $_GET['role_id'] ?? ''));
        $reason = trim((string)($body['reason'] ?? ''));
        if ($userId === '' || $roleId === '') {
            $this->error('invalid_request', 400);
        }
        try {
            $result = $this->rbac()->revokeRole($userId, $roleId, $this->actorId($user), $reason ?: null);
            $this->success(['data' => $result]);
        } catch (Throwable $e) {
            $this->error('role_revoke_failed', 500, $e->getMessage());
        }
    }

    // ── MFA admin ────────────────────────────────────────────────────────────

    /** GET /api/v1/mfa/factors?user_id=... */
    public function listFactors(): void
    {
        $user = $this->requireAuthOrFail();
        $userId = trim((string)($_GET['user_id'] ?? ''));
        // Non-admin can only list their own factors.
        if ($userId === '' || $userId === $this->actorId($user)) {
            $userId = $this->actorId($user);
        } else {
            $this->requireAdmin($user);
        }
        try {
            $rows = $this->rbac()->listFactorsForUser($userId);
            $this->success(['data' => $rows, 'user_id' => $userId, 'count' => count($rows)]);
        } catch (Throwable $e) {
            $this->error('mfa_factor_list_failed', 500, $e->getMessage());
        }
    }

    /** POST /api/v1/mfa/factors/{factorId}:revoke */
    public function revokeFactor(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $factorId = trim((string)($_GET['factorId'] ?? ''));
        $body = $this->jsonBody();
        $reason = trim((string)($body['reason'] ?? ''));
        if ($factorId === '') {
            $this->error('invalid_request', 400);
        }
        try {
            $result = $this->rbac()->revokeFactor($factorId, $this->actorId($user), $reason);
            if (($result['ok'] ?? false) !== true) {
                $this->error((string)$result['error'], 409);
            }
            $this->success(['data' => $result]);
        } catch (Throwable $e) {
            $this->error('mfa_revoke_failed', 500, $e->getMessage());
        }
    }

    /** POST /api/v1/mfa/factors:reset */
    public function resetFactors(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $userId = trim((string)($body['user_id'] ?? ''));
        $reason = trim((string)($body['reason'] ?? ''));
        if ($userId === '') {
            $this->error('invalid_request', 400);
        }
        try {
            $result = $this->rbac()->resetAllFactors($userId, $this->actorId($user), $reason);
            if (($result['ok'] ?? false) !== true) {
                $this->error((string)$result['error'], 409);
            }
            $this->success(['data' => $result]);
        } catch (Throwable $e) {
            $this->error('mfa_reset_failed', 500, $e->getMessage());
        }
    }

    // ── View-backed read endpoints ───────────────────────────────────────────

    /** GET /api/v1/documents/in-force */
    public function documentsInForce(): void
    {
        $user = $this->requireAuthOrFail();
        $limit  = (int)($_GET['limit'] ?? 200);
        $offset = (int)($_GET['offset'] ?? 0);
        try {
            $rows = $this->rbac()->documentsInForce($limit, $offset);
            $this->success(['data' => $rows, 'count' => count($rows), 'offset' => $offset, 'limit' => $limit]);
        } catch (Throwable $e) {
            $this->error('documents_in_force_failed', 500, $e->getMessage());
        }
    }

    /** GET /api/v1/documents/pending-acknowledgement */
    public function pendingAcknowledgement(): void
    {
        $user = $this->requireAuthOrFail();
        $userId = trim((string)($_GET['user_id'] ?? $this->actorId($user)));
        if ($userId !== $this->actorId($user)) {
            $this->requireAdmin($user);
        }
        try {
            $rows = $this->rbac()->documentsPendingAckForUser($userId, (int)($_GET['limit'] ?? 100));
            $this->success(['data' => $rows, 'count' => count($rows), 'user_id' => $userId]);
        } catch (Throwable $e) {
            $this->error('pending_ack_failed', 500, $e->getMessage());
        }
    }

    /** GET /api/v1/portal-display/effective-layout */
    public function effectiveLayout(): void
    {
        $user = $this->requireAuthOrFail();
        $userId = trim((string)($_GET['user_id'] ?? $this->actorId($user)));
        if ($userId !== $this->actorId($user)) {
            $this->requireAdmin($user);
        }
        try {
            $row = $this->rbac()->effectiveLayoutForUser($userId);
            $this->success(['data' => $row, 'user_id' => $userId]);
        } catch (Throwable $e) {
            $this->error('effective_layout_failed', 500, $e->getMessage());
        }
    }

    /** GET /api/v1/retention/due-for-disposal */
    public function retentionDueForDisposal(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        try {
            $rows = $this->rbac()->retentionDueForDisposal(
                (int)($_GET['limit'] ?? 200),
                (bool)($_GET['exclude_blocked'] ?? false)
            );
            $this->success(['data' => $rows, 'count' => count($rows)]);
        } catch (Throwable $e) {
            $this->error('retention_due_failed', 500, $e->getMessage());
        }
    }

    /** GET /api/v1/access-review/progress */
    public function accessReviewProgress(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        try {
            $rows = $this->rbac()->accessReviewProgress();
            $this->success(['data' => $rows, 'count' => count($rows)]);
        } catch (Throwable $e) {
            $this->error('access_review_progress_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST /api/v1/documents/{docId}:acknowledge
     * Body: { revision?: string, notes?: string }
     * Writes a HMAC-signed acknowledgement row (21 CFR Part 11 §11.10(c)).
     */
    public function acknowledgeDocument(string $docId): void
    {
        $user = $this->requireAuthOrFail();
        $body = $this->jsonBody();
        try {
            $payload = [
                'doc_id'           => $docId,
                'doc_code'         => (string)($body['doc_code'] ?? $docId),
                'revision'         => (string)($body['revision'] ?? ''),
                'user_id'          => $this->actorId($user),
                'signature_method' => 'hmac-sha256',
                'notes'            => (string)($body['notes'] ?? ''),
                'created_at'       => date('c'),
            ];
            $secret = (string)(getenv('HMAC_SECRET') ?: 'mom-dev-hmac-secret');
            $payloadStr = $payload['doc_id'].'|'.$payload['revision'].'|'.$payload['user_id'].'|'.$payload['created_at'];
            $payload['signature_hmac'] = hash_hmac('sha256', $payloadStr, $secret);
            $row = $this->rbac()->insertAcknowledgement($payload);
            $this->success(['acknowledgement' => $row], 201);
        } catch (Throwable $e) {
            $this->error('acknowledge_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST /api/v1/retention/{recordId}:dispose
     * Body: { method_used, witness_user_id, location?, notes, actor_reason }
     * Writes a disposal_event row + chain-of-custody entry; refuses if a
     * legal hold is active for the record.
     */
    public function disposeRecord(string $recordId): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $required = ['method_used','witness_user_id','notes'];
        foreach ($required as $f) {
            if (empty($body[$f])) { $this->error('missing_field:'.$f, 400); }
        }
        try {
            $event = $this->rbac()->disposeRecord(
                $recordId,
                $this->actorId($user),
                (string)$body['witness_user_id'],
                (string)$body['method_used'],
                (string)($body['location'] ?? ''),
                (string)$body['notes'],
                (string)($body['actor_reason'] ?? '')
            );
            $this->success(['disposal_event' => $event], 201);
        } catch (Throwable $e) {
            $this->error('dispose_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST /api/v1/access-review/campaigns/{campaignId}:close
     * Body: { reason }
     * Marks campaign closed, snapshots remaining-pending count, writes audit.
     */
    public function closeCampaign(string $campaignId): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        if (empty($body['reason'])) { $this->error('reason_required', 400); }
        try {
            $summary = $this->rbac()->closeCampaign($campaignId, $this->actorId($user), (string)$body['reason']);
            $this->success(['campaign' => $summary]);
        } catch (Throwable $e) {
            $this->error('close_campaign_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET /api/v1/sessions/active
     *
     * Lists every active PHP session under mom/data/sessions/ enriched with
     * the username, role, last-activity time, IP and User-Agent from audit
     * events. This is the world-class sessions surface — file-based PHP
     * sessions stay invisible to the GenericCrudController, so we hand-build
     * the dataset here.
     *
     * Output sorted by last-activity desc; the caller's own session is flagged
     * with `is_current`.
     */
    public function listActiveSessions(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        try {
            $rows = $this->rbac()->listActiveSessions($this->getCurrentSessionId());
            $this->success(['data' => $rows, 'count' => count($rows), 'current_session_id' => $this->getCurrentSessionId()]);
        } catch (Throwable $e) {
            $this->error('sessions_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST /api/v1/sessions/{sessionId}:revoke
     *
     * Force-logs-out a portal session by deleting its session file. The
     * actor must be admin and cannot revoke their own current session via
     * this endpoint (use the standard logout flow instead).
     */
    public function revokeSession(string $sessionId): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        if (empty($body['reason'])) { $this->error('reason_required', 400); }
        if ($sessionId === $this->getCurrentSessionId()) {
            $this->error('cannot_revoke_own_session', 400);
        }
        try {
            $deleted = $this->rbac()->revokeSession($sessionId, $this->actorId($user), (string)$body['reason']);
            $this->success(['session_id' => $sessionId, 'deleted' => $deleted]);
        } catch (Throwable $e) {
            $this->error('revoke_session_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST /api/v1/rbac/canonical-seed:apply
     *
     * Idempotent re-application of the canonical least-privilege seed
     * (migration 173). Overwrites the {permissions, denies, level, admin, …}
     * shape on every catalog role. Custom roles outside the catalog are
     * untouched. Audited via audit_events as `rbac.canonical_seed.apply`.
     *
     * Body: { reason: string (>= 5 chars) }
     */
    public function applyCanonicalSeed(): void
    {
        $user = $this->requireAuthOrFail();
        $this->requireAdmin($user);
        $body = $this->jsonBody();
        $reason = trim((string)($body['reason'] ?? ''));
        if (strlen($reason) < 5) {
            $this->error('reason_required', 400, 'reason must be >= 5 chars');
        }
        try {
            $result = $this->rbac()->applyCanonicalSeed($this->actorId($user), $reason);
            $this->success(['data' => $result, 'applied' => $result['applied'] ?? 0]);
        } catch (Throwable $e) {
            $this->error('canonical_seed_failed', 500, $e->getMessage());
        }
    }

    private function getCurrentSessionId(): string
    {
        // 1. Active PHP session
        if (session_status() === PHP_SESSION_ACTIVE) {
            $sid = (string)session_id();
            if ($sid !== '') return $sid;
        }
        // 2. Try to start a session quietly to recover the id from the cookie
        if (session_status() === PHP_SESSION_NONE) {
            @session_start(['read_and_close' => true]);
            $sid = (string)session_id();
            if ($sid !== '') return $sid;
        }
        // 3. Fallback: scan all cookies for one whose value resembles a 32-hex
        //    PHP session token (matches what we see on disk: sess_<hex32>).
        foreach (($_COOKIE ?? []) as $name => $value) {
            if (is_string($value) && preg_match('/^[a-f0-9]{32}$/i', $value)) {
                return $value;
            }
        }
        return '';
    }
}
