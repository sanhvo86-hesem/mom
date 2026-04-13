<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use MOM\Services\EvidenceVaultService;
use Throwable;

/**
 * Evidence vault controller for HESEM MOM Portal.
 *
 * Provides API endpoints for evidence management including upload,
 * linking to entities, chain-of-custody tracking, hash-chain
 * integrity verification, and full-text search.
 *
 * Evidence metadata in `data/evidence/vault.json`, custody log
 * in `data/evidence/custody.json`, actual files in
 * `data/uploads/evidence/`.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class EvidenceController extends BaseController
{
    /** @var EvidenceVaultService|null Lazy-loaded evidence vault service. */
    private ?EvidenceVaultService $evidenceSvc = null;

    /** @var array|null Cached evidence access-control config. */
    private ?array $evidenceConfig = null;
    private ?IdempotencyService $idempotencyService = null;

    // â”€â”€ Service Access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Get or create the EvidenceVaultService instance.
     *
     * @return EvidenceVaultService
     */
    private function evidenceService(): EvidenceVaultService
    {
        if ($this->evidenceSvc === null) {
            $this->evidenceSvc = new EvidenceVaultService($this->dataDir, $this->data);
        }
        return $this->evidenceSvc;
    }

    private function idempotency(): IdempotencyService
    {
        if ($this->idempotencyService === null) {
            $this->idempotencyService = new IdempotencyService($this->dataDir);
        }

        return $this->idempotencyService;
    }

    private function parseIdempotencyKey(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_scalar($value)) {
            $this->sliceProblem('urn:qms:problem:validation-error', 'Invalid Idempotency-Key', 400);
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (strlen($text) > 200 || preg_match('/^[A-Za-z0-9._:\-]+$/', $text) !== 1) {
            $this->sliceProblem('urn:qms:problem:validation-error', 'Invalid Idempotency-Key', 400);
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $file
     */
    private function fileSha256(array $file): string
    {
        $tmpName = trim((string)($file['tmp_name'] ?? ''));
        if ($tmpName === '' || !is_file($tmpName)) {
            $this->sliceProblem('urn:qms:problem:validation-error', 'Uploaded file is unavailable for integrity verification', 422);
        }

        $hash = hash_file('sha256', $tmpName);
        if (!is_string($hash) || trim($hash) === '') {
            $this->sliceProblem('urn:qms:problem:server-error', 'Unable to fingerprint uploaded file', 500);
        }

        return $hash;
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1;
        }
        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'y'], true);
        }
        return false;
    }

    /**
     * @param array<string, mixed> $file
     * @return array<string, mixed>
     */
    private function governanceAttachmentIdempotency(array $file, string $approvalGroupId, ?string $commentText, ?string $documentTypeCode, string $actorPartyId): array
    {
        $postKey = $this->parseIdempotencyKey($_POST['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($_POST['request_id'] ?? null);
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $postKey;

        $fingerprint = [
            'approval_group_id' => $approvalGroupId,
            'actor_party_id' => $actorPartyId,
            'comment_text' => $commentText,
            'document_type_code' => $documentTypeCode,
            'file_name' => (string)($file['name'] ?? ''),
            'file_size' => (int)($file['size'] ?? 0),
            'file_sha256' => $this->fileSha256($file),
        ];

        if ($explicitKey !== null) {
            return [
                'scope_key' => implode('|', ['governance_attachment', $approvalGroupId, $actorPartyId]),
                'key' => $explicitKey,
                'key_source' => 'header_or_body',
                'mode' => 'client_token',
                'kind' => 'create',
                'domain' => 'governance',
                'table' => 'attachment',
                'user_id' => $actorPartyId,
                'fingerprint' => $fingerprint,
            ];
        }

        return [
            'scope_key' => implode('|', ['governance_attachment', $approvalGroupId, $actorPartyId]),
            'key' => 'drv-attachment-create-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:file_checksum_payload',
            'mode' => 'derived_payload_window',
            'kind' => 'create',
            'domain' => 'governance',
            'table' => 'attachment',
            'user_id' => $actorPartyId,
            'ttl_seconds' => $this->idempotency()->retryWindowSeconds(),
            'fingerprint' => $fingerprint,
        ];
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

    // â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET listEvidence â€” List evidence items with optional filters.
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
            $filters['entity_id'] = $record;
        }

        $recordType = $this->query('record_type');
        if ($recordType !== null && $recordType !== '') {
            $filters['entity_type'] = strtolower($recordType);
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
            $this->rethrowResponse($e);
            $this->error('evidence_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET detail â€” Single evidence item with chain-of-custody timeline.
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
            $this->rethrowResponse($e);
            $this->error('evidence_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST upload â€” Upload an evidence file (multipart/form-data).
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

        foreach (['controlled_record', 'final_evidence', 'immutable_package'] as $controlledFlag) {
            if ($this->truthy($_POST[$controlledFlag] ?? false)) {
                $this->error(
                    'canonical_evidence_finalization_required',
                    409,
                    'Final controlled evidence must be accepted through the canonical issuance/submission/finalization command path, not the legacy evidence vault upload endpoint.'
                );
            }
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
                'evidence_id'   => $evidence['evidence_id'] ?? '',
                'original_name' => $originalName,
                'sha256'        => $evidence['file_hash'] ?? '',
            ], $userId);

            $this->success(['evidence' => $evidence], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('evidence_upload_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST link â€” Link evidence to an entity (NCR, CAPA, SO, JO, etc.).
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
            $this->rethrowResponse($e);
            $this->error('evidence_link_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET chainOfCustody â€” Get custody log for an evidence item.
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
            $this->rethrowResponse($e);
            $this->error('custody_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET verifyChain â€” Verify integrity of hash chain (no tampering).
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
            $this->rethrowResponse($e);
            $this->error('verify_chain_failed', 500, $e->getMessage());
        }
    }

    // ══ Governance Attachment Routes (Foundation Governance Contract Slice) ═══

    /**
     * Emit an RFC 9457 problem detail.
     */
    private function sliceProblem(string $type, string $title, int $status, ?string $detail = null): never
    {
        $body = ['type' => $type, 'title' => $title, 'status' => $status];
        if ($detail !== null) {
            $body['detail'] = $detail;
        }
        throw ExitException::json($body, $status, ['Content-Type' => 'application/problem+json']);
    }

    private function sliceJson(array $payload, int $code = 200, array $headers = []): never
    {
        throw ExitException::json($payload, $code, array_merge(
            ['Content-Type' => 'application/json'],
            $headers
        ));
    }

    /**
     * GET /api/v1/governance/approval-groups/{approvalGroupId}/attachments
     */
    public function listApprovalGroupAttachments(): never
    {
        $this->requireAuth();

        $groupId = $this->query('approvalGroupId') ?? '';
        if ($groupId === '') {
            $this->sliceProblem('urn:qms:problem:invalid-request', 'Missing approvalGroupId', 400);
        }

        $db = $this->data->getConnection();
        if ($db === null) {
            $this->sliceProblem('urn:qms:problem:server-error', 'Database unavailable', 503);
        }

        try {
            $rows = $this->evidenceService()->listGovernanceAttachments('approval_group', $groupId, $db);

            $data = array_map(function (array $r): array {
                return [
                    'attachmentId'       => $r['attachment_id'],
                    'entityName'         => $r['entity_name'],
                    'entityId'           => $r['entity_id'],
                    'fileName'           => $r['file_name'],
                    'contentType'        => $r['content_type'],
                    'fileSizeBytes'      => $r['file_size_bytes'] !== null ? (int)$r['file_size_bytes'] : null,
                    'checksumSha256'     => $r['checksum_sha256'] ?? '',
                    'uploadedByPartyId'  => $r['uploaded_by_party_id'],
                    'createdAt'          => $r['created_at'] ? (new \DateTimeImmutable($r['created_at']))->format('c') : null,
                    'etag'               => $this->evidenceService()->computeAttachmentETag($r),
                ];
            }, $rows);

            $this->sliceJson([
                'data'     => $data,
                'pageInfo' => [
                    'limit'           => count($data),
                    'hasNextPage'     => false,
                    'hasPreviousPage' => false,
                    'startCursor'     => null,
                    'endCursor'       => null,
                    'sort'            => [['field' => 'created_at', 'direction' => 'desc']],
                ],
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->sliceProblem('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        }
    }

    /**
     * GET /api/v1/governance/attachments/{attachmentId}
     */
    public function getGovernanceAttachment(): never
    {
        $this->requireAuth();

        $attachmentId = $this->query('attachmentId') ?? '';
        if ($attachmentId === '') {
            $this->sliceProblem('urn:qms:problem:invalid-request', 'Missing attachmentId', 400);
        }

        $db = $this->data->getConnection();
        if ($db === null) {
            $this->sliceProblem('urn:qms:problem:server-error', 'Database unavailable', 503);
        }

        try {
            $row = $this->evidenceService()->getGovernanceAttachment($attachmentId, $db);
            if ($row === null) {
                $this->sliceProblem('urn:qms:problem:resource-not-found', 'Attachment not found', 404);
            }

            $etag = $this->evidenceService()->computeAttachmentETag($row);

            $this->sliceJson([
                'data' => [
                    'attachmentId'       => $row['attachment_id'],
                    'entityName'         => $row['entity_name'],
                    'entityId'           => $row['entity_id'],
                    'fileName'           => $row['file_name'],
                    'contentType'        => $row['content_type'],
                    'fileSizeBytes'      => $row['file_size_bytes'] !== null ? (int)$row['file_size_bytes'] : null,
                    'checksumSha256'     => $row['checksum_sha256'] ?? '',
                    'evidenceChainHash'  => $row['evidence_chain_hash'],
                    'uploadedByPartyId'  => $row['uploaded_by_party_id'],
                    'createdAt'          => $row['created_at'] ? (new \DateTimeImmutable($row['created_at']))->format('c') : null,
                    'updatedAt'          => $row['updated_at'] ? (new \DateTimeImmutable($row['updated_at']))->format('c') : null,
                    'rowVersion'         => (int)($row['row_version'] ?? 1),
                ],
            ], 200, ['ETag' => $etag]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->sliceProblem('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        }
    }

    /**
     * POST /api/v1/governance/attachments
     */
    public function createGovernanceAttachment(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $approvalGroupId = $_POST['approvalGroupId'] ?? '';
        if ($approvalGroupId === '') {
            $this->sliceProblem('urn:qms:problem:validation-error', 'Missing approvalGroupId', 422);
        }

        $file = $this->uploadedFile('file');
        if ($file === null) {
            $this->sliceProblem('urn:qms:problem:validation-error', 'Missing file', 422);
        }

        $db = $this->data->getConnection();
        if ($db === null) {
            $this->sliceProblem('urn:qms:problem:server-error', 'Database unavailable', 503);
        }

        $actorPartyId = (string)($user['party_id'] ?? $user['username'] ?? 'unknown');
        $commentText = $_POST['commentText'] ?? null;
        $documentTypeCode = $_POST['documentTypeCode'] ?? null;
        $idempotency = $this->governanceAttachmentIdempotency($file, (string)$approvalGroupId, is_scalar($commentText) ? (string)$commentText : null, is_scalar($documentTypeCode) ? (string)$documentTypeCode : null, $actorPartyId);

        try {
            $execution = $this->idempotency()->execute($idempotency, function () use ($file, $approvalGroupId, $actorPartyId, $db, $commentText, $documentTypeCode): array {
                $row = $this->evidenceService()->createGovernanceAttachment(
                    $file, $approvalGroupId, $actorPartyId, $db, $commentText, $documentTypeCode
                );

                $etag = $this->evidenceService()->computeAttachmentETag($row);
                return [
                    'status_code' => 201,
                    'payload' => [
                        'data' => [
                            'attachmentId'       => $row['attachment_id'],
                            'entityName'         => $row['entity_name'] ?? 'approval_group',
                            'entityId'           => $row['entity_id'] ?? $approvalGroupId,
                            'fileName'           => $row['file_name'],
                            'checksumSha256'     => $row['checksum_sha256'] ?? '',
                            'createdAt'          => $row['created_at'] ?? null,
                        ],
                        'etag' => $etag,
                        'location' => '/api/v1/governance/attachments/' . ($row['attachment_id'] ?? ''),
                    ],
                ];
            });

            $payload = is_array($execution['payload'] ?? null) ? (array)$execution['payload'] : [];
            $etag = trim((string)($payload['etag'] ?? ''));
            $location = trim((string)($payload['location'] ?? ''));
            unset($payload['etag'], $payload['location']);

            $headers = [];
            if ($etag !== '') {
                $headers['ETag'] = $etag;
            }
            if ($location !== '') {
                $headers['Location'] = $location;
            }

            $this->sliceJson($payload, (int)($execution['status_code'] ?? 201), $headers);
        } catch (RecordConflictException $e) {
            $this->sliceProblem('urn:qms:problem:idempotency-conflict', 'Idempotency conflict', 409, $e->getMessage());
        } catch (\RuntimeException $e) {
            if (strpos($e->getMessage(), 'no longer accepts') !== false) {
                $this->sliceProblem('urn:qms:problem:invalid-state-transition', 'Approval group no longer accepts attachments', 409, $e->getMessage());
            }
            $this->sliceProblem('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->sliceProblem('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        }
    }

    /**
     * GET search â€” Full-text search across evidence titles, descriptions, metadata.
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
            $this->rethrowResponse($e);
            $this->error('evidence_search_failed', 500, $e->getMessage());
        }
    }
}
