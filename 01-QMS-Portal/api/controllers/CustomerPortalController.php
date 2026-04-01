<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use Throwable;

/**
 * Customer portal controller for HESEM QMS Portal.
 *
 * Manages external portal users, access grants, complaint submissions,
 * document access tracking, and usage analytics.
 *
 * Data stored in `qms-data/customer-portal/` with per-entity JSON files.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class CustomerPortalController extends BaseController
{
    /** @var string Base directory for customer portal data. */
    private string $portalDir = '';

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Get the portal data directory, creating it on first use.
     *
     * @return string
     */
    private function portalDir(): string
    {
        if ($this->portalDir === '') {
            $this->portalDir = $this->dataDir . '/customer-portal';
            if (!is_dir($this->portalDir)) {
                @mkdir($this->portalDir, 0755, true);
            }
        }
        return $this->portalDir;
    }

    /**
     * Extract the acting username from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    // ── Endpoints ───────────────────────────────────────────────────────────

    /**
     * GET listUsers — List portal users.
     *
     * Query params:
     *   - status  (string, optional): active, inactive.
     *   - offset  (int, optional)
     *   - limit   (int, optional)
     *
     * @return never
     */
    public function listUsers(): never
    {
        $user = $this->requireAuth();

        try {
            $file  = $this->portalDir() . '/users.json';
            $all   = $this->readJsonFile($file) ?? [];

            $status = $this->query('status');
            if ($status !== null && $status !== '') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $u) => strtolower($u['status'] ?? '') === $status);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('users', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('portal_list_users_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createUser — Create a portal user.
     *
     * Body fields:
     *   - email       (string, required)
     *   - name        (string, required)
     *   - company     (string, required)
     *   - customer_id (string, optional)
     *
     * @return never
     */
    public function createUser(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['email', 'name', 'company']);

        $userId = $this->userId($user);

        try {
            $file  = $this->portalDir() . '/users.json';
            $all   = $this->readJsonFile($file) ?? [];

            $newUser = [
                'id'          => 'PU-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'email'       => trim((string)($body['email'] ?? '')),
                'name'        => trim((string)($body['name'] ?? '')),
                'company'     => trim((string)($body['company'] ?? '')),
                'customer_id' => trim((string)($body['customer_id'] ?? '')),
                'status'      => 'active',
                'created_by'  => $userId,
                'created_at'  => $this->nowIso(),
                'updated_at'  => $this->nowIso(),
            ];

            $all[] = $newUser;
            $this->writeJsonFile($file, $all);

            $this->auditLog('portal_create_user', [
                'portal_user_id' => $newUser['id'],
                'email'          => $newUser['email'],
            ], $userId);

            $this->success(['user' => $newUser], 201);
        } catch (Throwable $e) {
            $this->error('portal_create_user_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateUser — Update a portal user.
     *
     * Body fields:
     *   - id     (string, required)
     *   - Any updatable fields (name, email, company, status).
     *
     * @return never
     */
    public function updateUser(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->portalDir() . '/users.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $updatable = ['name', 'email', 'company', 'customer_id', 'status'];
                    foreach ($updatable as $field) {
                        if (isset($body[$field])) {
                            $entry[$field] = trim((string)$body[$field]);
                        }
                    }
                    $entry['updated_at'] = $this->nowIso();
                    $entry['updated_by'] = $userId;
                    $found = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "Portal user {$id} not found.");
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('portal_update_user', [
                'portal_user_id' => $id,
                'fields'         => array_keys($body),
            ], $userId);

            $this->success(['user' => $updated]);
        } catch (Throwable $e) {
            $this->error('portal_update_user_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listAccessGrants — List access grants.
     *
     * Query params:
     *   - portal_user_id (string, optional)
     *   - so_number      (string, optional)
     *   - revoked        (string, optional): "true" or "false".
     *   - offset         (int, optional)
     *   - limit          (int, optional)
     *
     * @return never
     */
    public function listAccessGrants(): never
    {
        $user = $this->requireAuth();

        try {
            $file = $this->portalDir() . '/access.json';
            $all  = $this->readJsonFile($file) ?? [];

            $portalUserId = $this->query('portal_user_id');
            if ($portalUserId !== null && $portalUserId !== '') {
                $all = array_filter($all, fn(array $a) => ($a['portal_user_id'] ?? '') === $portalUserId);
            }

            $soNumber = $this->query('so_number');
            if ($soNumber !== null && $soNumber !== '') {
                $all = array_filter($all, fn(array $a) => ($a['so_number'] ?? '') === $soNumber);
            }

            $revoked = $this->query('revoked');
            if ($revoked !== null && $revoked !== '') {
                $isRevoked = strtolower($revoked) === 'true';
                $all = array_filter($all, fn(array $a) => (bool)($a['revoked'] ?? false) === $isRevoked);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('access_grants', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('portal_list_access_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST grantAccess — Grant SO visibility to a portal user.
     *
     * Body fields:
     *   - portal_user_id (string, required)
     *   - so_number      (string, required)
     *   - scope          (string, optional): full, status_only, documents.
     *
     * @return never
     */
    public function grantAccess(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['portal_user_id', 'so_number']);

        $userId = $this->userId($user);

        try {
            $file  = $this->portalDir() . '/access.json';
            $all   = $this->readJsonFile($file) ?? [];

            $grant = [
                'id'             => 'PA-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)),
                'portal_user_id' => trim((string)($body['portal_user_id'] ?? '')),
                'so_number'      => trim((string)($body['so_number'] ?? '')),
                'scope'          => trim((string)($body['scope'] ?? 'status_only')),
                'granted_by'     => $userId,
                'granted_at'     => $this->nowIso(),
                'revoked'        => false,
            ];

            $all[] = $grant;
            $this->writeJsonFile($file, $all);

            $this->auditLog('portal_grant_access', [
                'grant_id'       => $grant['id'],
                'portal_user_id' => $grant['portal_user_id'],
                'so_number'      => $grant['so_number'],
            ], $userId);

            $this->success(['access' => $grant], 201);
        } catch (Throwable $e) {
            $this->error('portal_grant_access_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST revokeAccess — Revoke SO access from a portal user.
     *
     * Body fields:
     *   - id (string, required): Access grant ID.
     *
     * @return never
     */
    public function revokeAccess(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->portalDir() . '/access.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $entry['revoked']    = true;
                    $entry['revoked_by'] = $userId;
                    $entry['revoked_at'] = $this->nowIso();
                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "Access grant {$id} not found.");
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('portal_revoke_access', ['grant_id' => $id], $userId);

            $this->success(['access' => $updated]);
        } catch (Throwable $e) {
            $this->error('portal_revoke_access_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listComplaints — List portal complaint submissions.
     *
     * Query params:
     *   - portal_user_id (string, optional)
     *   - status         (string, optional)
     *   - offset         (int, optional)
     *   - limit          (int, optional)
     *
     * @return never
     */
    public function listComplaints(): never
    {
        $user = $this->requireAuth();

        try {
            $file = $this->portalDir() . '/complaints.json';
            $all  = $this->readJsonFile($file) ?? [];

            $portalUserId = $this->query('portal_user_id');
            if ($portalUserId !== null && $portalUserId !== '') {
                $all = array_filter($all, fn(array $c) => ($c['portal_user_id'] ?? '') === $portalUserId);
            }

            $status = $this->query('status');
            if ($status !== null && $status !== '') {
                $status = strtolower($status);
                $all = array_filter($all, fn(array $c) => strtolower($c['status'] ?? '') === $status);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('complaints', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('portal_list_complaints_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST linkComplaint — Link a portal complaint to an internal 8D.
     *
     * Body fields:
     *   - complaint_id (string, required): Portal complaint ID.
     *   - internal_id  (string, required): Internal 8D/NCR record ID.
     *
     * @return never
     */
    public function linkComplaint(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['complaint_id', 'internal_id']);

        $complaintId = trim((string)($body['complaint_id'] ?? ''));
        $internalId  = trim((string)($body['internal_id'] ?? ''));
        $userId      = $this->userId($user);

        try {
            $file  = $this->portalDir() . '/complaints.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $complaintId) {
                    $entry['linked_internal_id'] = $internalId;
                    $entry['linked_by']          = $userId;
                    $entry['linked_at']          = $this->nowIso();
                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "Portal complaint {$complaintId} not found.");
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('portal_link_complaint', [
                'complaint_id' => $complaintId,
                'internal_id'  => $internalId,
            ], $userId);

            $this->success(['complaint' => $updated]);
        } catch (Throwable $e) {
            $this->error('portal_link_complaint_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listDocAccess — Document access tracking.
     *
     * Query params:
     *   - portal_user_id (string, optional)
     *   - offset         (int, optional)
     *   - limit          (int, optional)
     *
     * @return never
     */
    public function listDocAccess(): never
    {
        $user = $this->requireAuth();

        try {
            $file = $this->portalDir() . '/doc-access.json';
            $all  = $this->readJsonFile($file) ?? [];

            $portalUserId = $this->query('portal_user_id');
            if ($portalUserId !== null && $portalUserId !== '') {
                $all = array_filter($all, fn(array $d) => ($d['portal_user_id'] ?? '') === $portalUserId);
            }

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('doc_access', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('portal_list_doc_access_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getAnalytics — Portal usage KPIs.
     *
     * Returns active users count, total logins, complaints submitted,
     * documents accessed, average response time.
     *
     * @return never
     */
    public function getAnalytics(): never
    {
        $user = $this->requireAuth();

        try {
            $usersFile      = $this->portalDir() . '/users.json';
            $complaintsFile = $this->portalDir() . '/complaints.json';
            $accessFile     = $this->portalDir() . '/access.json';
            $docAccessFile  = $this->portalDir() . '/doc-access.json';

            $users      = $this->readJsonFile($usersFile) ?? [];
            $complaints = $this->readJsonFile($complaintsFile) ?? [];
            $access     = $this->readJsonFile($accessFile) ?? [];
            $docAccess  = $this->readJsonFile($docAccessFile) ?? [];

            $activeUsers = count(array_filter($users, fn(array $u) => ($u['status'] ?? '') === 'active'));

            $kpis = [
                'total_portal_users' => count($users),
                'active_users'       => $activeUsers,
                'total_complaints'   => count($complaints),
                'open_complaints'    => count(array_filter($complaints, fn(array $c) => !in_array(strtolower($c['status'] ?? ''), ['closed', 'resolved'], true))),
                'active_grants'      => count(array_filter($access, fn(array $a) => !($a['revoked'] ?? false))),
                'documents_accessed' => count($docAccess),
            ];

            $this->success(['kpis' => $kpis]);
        } catch (Throwable $e) {
            $this->error('portal_analytics_failed', 500, $e->getMessage());
        }
    }
}
