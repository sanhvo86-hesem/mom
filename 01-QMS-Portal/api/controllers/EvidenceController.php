<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use HESEM\QMS\Services\EvidenceVaultService;
use Throwable;

/**
 * Evidence vault controller for HESEM QMS Portal.
 *
 * Provides API endpoints for evidence management including upload,
 * linking to entities, chain-of-custody tracking, hash-chain
 * integrity verification, and full-text search.
 *
 * Evidence metadata in `qms-data/evidence/vault.json`, custody log
 * in `qms-data/evidence/custody.json`, actual files in
 * `qms-data/uploads/evidence/`.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class EvidenceController extends BaseController
{
    /** @var EvidenceVaultService|null Lazy-loaded evidence vault service. */
    private ?EvidenceVaultService $evidenceSvc = null;

    /** @var array|null Cached evidence access-control config. */
    private ?array $evidenceConfig = null;

    // ── Service Access ──────────────────────────────────────────────────────

    /**
     * Get or create the EvidenceVaultService instance.
     *
     * @return EvidenceVaultService
     */
    private function evidenceService(): EvidenceVaultService
    {
        if ($this->evidenceSvc === null) {
            $this->evidenceSvc = new EvidenceVaultService($this->dataDir);
        }
        return $this->evidenceSvc;
    }

    /**
     * Load the evidence access-control configuration.
     *
     * @return array<string, mixed>
     */
    private function loadEvidenceConfig(): array
    {
        if ($this->evidenceConfig !== null) {
            return $this->evidenceConfig;
        }

        $configFile = $this->confDir . '/evidence_config.json';
        $this->evidenceConfig = $this->readJsonFile($configFile) ?? [
            'roles' => [
                'admin'          => ['ev_read', 'ev_write', 'ev_link', 'ev_verify', 'ev_search'],
                'doc_controller' => ['ev_read', 'ev_write', 'ev_link', 'ev_verify', 'ev_search'],
                'quality'        => ['ev_read', 'ev_write', 'ev_link', 'ev_search'],
                'production'     => ['ev_read', 'ev_write', 'ev_link'],
                'engineering'    => ['ev_read', 'ev_search'],
                'viewer'         => ['ev_read'],
            ],
        ];

        return $this->evidenceConfig;
    }

    /**
     * Check if the user has a specific evidence permission.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return bool
     */
    private function hasEvidencePermission(array $user, string $permission): bool
    {
        $config = $this->loadEvidenceConfig();
        $roles  = $config['roles'] ?? [];
        $role   = (string)($user['role'] ?? 'viewer');

        $perms = $roles[$role] ?? $roles['viewer'] ?? [];

        return in_array($permission, $perms, true);
    }

    /**
     * Require an evidence permission, terminating with 403 if missing.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return void
     */
    private function requireEvidencePermission(array $user, string $permission): void
    {
        if (!$this->hasEvidencePermission($user, $permission)) {
            $this->error('forbidden', 403, "Missing permission: {$permission}");
        }
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
     * GET listEvidence — List evidence items with optional filters.
     *
     * Query params:
     *   - type      (string, optional): Evidence type (photo, document, certificate, etc.).
     *   - date_from (string, optional): YYYY-MM-DD.
     *   - date_to   (string, optional): YYYY-MM-DD.
     *   - record    (string, optional): Linked record ID.
     *   - tags      (string, optional): Comma-separated tag filter.
     *   - offset    (int, optional)
     *   - limit     (int, optional)
     *
     * @return never
     */
    public function listEvidence(): never
    {
        $user = $this->requireAuth();
        $this->requireEvidencePermission($user, 'ev_read');

        $filters = [];

        $type = $this->query('type');
        if ($type !== null && $type !== '') {
            $filters['type'] = strtolower($type);
        }

        $dateFrom = $this->query('date_from');
        if ($dateFrom !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
            $filters['date_from'] = $dateFrom;
        }

        $dateTo = $this->query('date_to');
        if ($dateTo !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
            $filters['date_to'] = $dateTo;
        }

        $record = $this->query('record');
        if ($record !== null && $record !== '') {
            $filters['record'] = $record;
        }

        $tags = $this->query('tags');
        if ($tags !== null && $tags !== '') {
            $filters['tags'] = array_map('trim', explode(',', $tags));
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->evidenceService()->getAll($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('evidence', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('evidence_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET detail — Single evidence item with chain-of-custody timeline.
     *
     * Query params:
     *   - id (string, required): Evidence record ID.
     *
     * @return never
     */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireEvidencePermission($user, 'ev_read');

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }

        $id = trim($id);

        try {
            $evidence = $this->evidenceService()->getDetail($id);
            if ($evidence === null) {
                $this->error('not_found', 404, "Evidence {$id} not found.");
            }

            // Include chain-of-custody timeline
            $custody = $this->evidenceService()->getCustodyLog($id);
            $evidence['custody_timeline'] = $custody;

            $this->success(['evidence' => $evidence]);
        } catch (Throwable $e) {
            $this->error('evidence_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST upload — Upload an evidence file (multipart/form-data).
     *
     * Computes SHA-256 hash and extends the hash chain for tamper detection.
     *
     * Form fields:
     *   - file        (file, required): The evidence file.
     *   - title       (string, required): Evidence title.
     *   - description (string, optional): Description.
     *   - type        (string, optional): Evidence type (photo, document, certificate, etc.).
     *   - tags        (string, optional): Comma-separated tags.
     *   - record_id   (string, optional): Linked record ID for auto-linking.
     *   - record_type (string, optional): Linked record type (ncr, capa, so, jo, etc.).
     *
     * @return never
     */
    public function upload(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireEvidencePermission($user, 'ev_write');

        $file = $this->uploadedFile('file');
        if ($file === null) {
            $this->error('missing_file', 400, 'No file uploaded.');
        }

        // Validate file upload
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            $this->error('upload_error', 400, 'File upload failed with error code: ' . ($file['error'] ?? 'unknown'));
        }

        $title = trim((string)($_POST['title'] ?? ''));
        if ($title === '') {
            $this->error('missing_title', 400);
        }

        $userId = $this->userId($user);

        // Maximum file size: 50 MB
        $maxSize = 50 * 1024 * 1024;
        if (($file['size'] ?? 0) > $maxSize) {
            $this->error('file_too_large', 400, 'Maximum file size is 50 MB.');
        }

        // Disallow dangerous extensions
        $originalName = (string)($file['name'] ?? 'unknown');
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $dangerousExts = ['php', 'phtml', 'phar', 'exe', 'bat', 'cmd', 'sh', 'cgi', 'pl'];
        if (in_array($ext, $dangerousExts, true)) {
            $this->error('forbidden_file_type', 400, "File type .{$ext} is not allowed.");
        }

        try {
            $evidence = $this->evidenceService()->store(
                $file,
                [
                    'title'       => $title,
                    'description' => trim((string)($_POST['description'] ?? '')),
                    'type'        => strtolower(trim((string)($_POST['type'] ?? 'document'))),
                    'tags'        => array_filter(array_map('trim', explode(',', (string)($_POST['tags'] ?? '')))),
                    'record_id'   => trim((string)($_POST['record_id'] ?? '')),
                    'record_type' => strtolower(trim((string)($_POST['record_type'] ?? ''))),
                ],
                $userId
            );

            $this->auditLog('evidence_upload', [
                'evidence_id'   => $evidence['id'],
                'original_name' => $originalName,
                'sha256'        => $evidence['sha256'] ?? '',
            ], $userId);

            $this->success(['evidence' => $evidence], 201);
        } catch (Throwable $e) {
            $this->error('evidence_upload_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST link — Link evidence to an entity (NCR, CAPA, SO, JO, etc.).
     *
     * Body fields:
     *   - evidence_id (string, required): Evidence record ID.
     *   - record_id   (string, required): Target entity ID.
     *   - record_type (string, required): Target entity type (ncr, capa, so, jo, complaint, etc.).
     *   - note        (string, optional): Linking note.
     *
     * @return never
     */
    public function link(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireEvidencePermission($user, 'ev_link');

        $body = $this->jsonBody();
        $this->requireFields($body, ['evidence_id', 'record_id', 'record_type']);

        $evidenceId = trim((string)($body['evidence_id'] ?? ''));
        $recordId   = trim((string)($body['record_id'] ?? ''));
        $recordType = strtolower(trim((string)($body['record_type'] ?? '')));
        $note       = trim((string)($body['note'] ?? ''));
        $userId     = $this->userId($user);

        try {
            $link = $this->evidenceService()->link($evidenceId, $recordId, $recordType, $userId, $note);
            if ($link === null) {
                $this->error('link_failed', 400, "Evidence {$evidenceId} not found or link already exists.");
            }

            $this->auditLog('evidence_link', [
                'evidence_id' => $evidenceId,
                'record_id'   => $recordId,
                'record_type' => $recordType,
            ], $userId);

            $this->success(['link' => $link]);
        } catch (Throwable $e) {
            $this->error('evidence_link_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET chainOfCustody — Get custody log for an evidence item.
     *
     * Query params:
     *   - id (string, required): Evidence record ID.
     *
     * @return never
     */
    public function chainOfCustody(): never
    {
        $user = $this->requireAuth();
        $this->requireEvidencePermission($user, 'ev_read');

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }

        $id = trim($id);

        try {
            $custody = $this->evidenceService()->getCustodyLog($id);
            if ($custody === null) {
                $this->error('not_found', 404, "Evidence {$id} not found.");
            }

            $this->success(['chain_of_custody' => $custody]);
        } catch (Throwable $e) {
            $this->error('custody_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET verifyChain — Verify integrity of hash chain (no tampering).
     *
     * Query params:
     *   - id (string, optional): Verify a single evidence item. If omitted, verifies entire chain.
     *
     * @return never
     */
    public function verifyChain(): never
    {
        $user = $this->requireAuth();
        $this->requireEvidencePermission($user, 'ev_verify');

        $id = $this->query('id');
        if ($id !== null && trim($id) === '') {
            $id = null;
        }

        try {
            $result = $this->evidenceService()->verifyChain($id ? trim($id) : null);

            $this->success(['verification' => $result]);
        } catch (Throwable $e) {
            $this->error('verify_chain_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET search — Full-text search across evidence titles, descriptions, metadata.
     *
     * Query params:
     *   - q      (string, required): Search query.
     *   - type   (string, optional): Filter by evidence type.
     *   - offset (int, optional)
     *   - limit  (int, optional)
     *
     * @return never
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireEvidencePermission($user, 'ev_search');

        $q = $this->query('q');
        if ($q === null || trim($q) === '') {
            $this->error('missing_query', 400, 'Search query (q) is required.');
        }

        $q = trim($q);

        $type = $this->query('type');
        if ($type !== null && trim($type) === '') {
            $type = null;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->evidenceService()->search($q, $type);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('results', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('evidence_search_failed', 500, $e->getMessage());
        }
    }
}
