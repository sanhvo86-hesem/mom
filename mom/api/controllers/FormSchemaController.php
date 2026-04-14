<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use RuntimeException;
use Throwable;

/**
 * Form Schema Controller
 *
 * Handles versioned form schema lifecycle for the Form Builder (09f-form-builder-engine.js).
 * Operations: history, version detail, save draft, submit for review,
 * publish release, reject, rollback, and create new schema.
 *
 * All functions delegate to `online_schema_*` helpers from online_schema_workflow.php,
 * which is loaded unconditionally in api.php before API_HELPERS_ONLY takes effect.
 */
class FormSchemaController extends BaseController
{
    /**
     * Roles allowed to author and draft form schemas.
     *
     * @return array<int, string>
     */
    private function schemaAuthorRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            ['quality_manager', 'qms_engineer', 'engineering_manager']
        )));
    }

    private function actorName(array $user): string
    {
        return trim((string)($user['name'] ?? $user['username'] ?? $_SESSION['user'] ?? 'anonymous'));
    }

    private function actorRole(array $user): string
    {
        return trim((string)($user['role'] ?? '')) ?: 'Author';
    }

    /**
     * Validate form_code: alphanumeric, dots, dashes, underscores.
     */
    private function validateCode(string $code): void
    {
        if ($code === '') $this->error('missing_form_code', 400);
        if (!preg_match('/^[A-Za-z0-9._-]+$/', $code)) $this->error('invalid_form_code', 400);
    }

    /**
     * GET form_schema_history
     * Returns schema state, version list, live schema, and current working draft.
     * Query params: form_code (required)
     *
     * @return never
     */
    public function history(): never
    {
        $this->requireAuth();

        $code = trim((string)($this->query('form_code') ?? $this->query('code') ?? ''));
        $this->validateCode($code);

        try {
            $boot = online_schema_bootstrap($this->dataDir, $code);
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'schema_not_found') $this->error('schema_not_found', 404);
            throw $e;
        }

        $state    = is_array($boot['state'] ?? null) ? $boot['state'] : [];
        $manifest = is_array($boot['manifest'] ?? null) ? $boot['manifest'] : ['versions' => []];

        $this->success([
            'code'         => strtoupper($code),
            'state'        => $state,
            'versions'     => online_schema_public_versions($manifest, $state),
            'live_schema'  => $boot['live_schema'] ?? null,
            'draft_schema' => online_schema_load_working_draft_schema($this->dataDir, $manifest),
            'server_time'  => $this->nowIso(),
        ]);
    }

    /**
     * GET form_schema_version
     * Returns a specific version's schema detail.
     * Query params: form_code (required), version_id (required)
     *
     * @return never
     */
    public function getVersion(): never
    {
        $this->requireAuth();

        $code      = trim((string)($this->query('form_code') ?? $this->query('code') ?? ''));
        $versionId = trim((string)($this->query('version_id') ?? $this->query('id') ?? ''));
        $this->validateCode($code);
        if ($versionId === '') $this->error('missing_version_id', 400);

        try {
            $detail = online_schema_version_detail($this->dataDir, $code, $versionId);
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            if ($msg === 'schema_not_found') $this->error('schema_not_found', 404);
            if ($msg === 'version_not_found') $this->error('version_not_found', 404);
            throw $e;
        }

        $this->success([
            'code'        => strtoupper($code),
            'state'       => $detail['state'] ?? [],
            'version'     => $detail['version'] ?? null,
            'schema'      => $detail['schema'] ?? null,
            'live_schema' => $detail['live_schema'] ?? null,
            'server_time' => $this->nowIso(),
        ]);
    }

    /**
     * POST form_schema_save_draft
     * Save a working draft of the form schema.
     * Body: form_code (required), schema (required), change_note (optional)
     *
     * @return never
     */
    public function saveDraft(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->schemaAuthorRoles());
        $this->requireCsrf();

        $body       = $this->jsonBody();
        $code       = trim((string)($body['form_code'] ?? ''));
        $schema     = is_array($body['schema'] ?? null) ? $body['schema'] : null;
        $changeNote = trim((string)($body['change_note'] ?? ''));
        $this->validateCode($code);
        if ($schema === null) $this->error('missing_schema', 400);

        try {
            $result = online_schema_save_draft_working_copy(
                $this->dataDir, $code, $schema,
                $this->actorName($user), $changeNote, $this->actorRole($user)
            );
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'schema_not_found') $this->error('schema_not_found', 404);
            throw $e;
        }

        $this->success([
            'code'         => strtoupper($code),
            'state'        => $result['state'] ?? [],
            'versions'     => $result['versions'] ?? [],
            'draft_schema' => $result['draft_schema'] ?? null,
            'live_schema'  => $result['live_schema'] ?? null,
            'server_time'  => $this->nowIso(),
        ]);
    }

    /**
     * POST form_schema_submit_review
     * Submit the working draft for review.
     * Body: form_code (required), change_note (optional), update_type (optional)
     *
     * @return never
     */
    public function submitReview(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->schemaAuthorRoles());
        $this->requireCsrf();

        $body       = $this->jsonBody();
        $code       = trim((string)($body['form_code'] ?? ''));
        $changeNote = trim((string)($body['change_note'] ?? ''));
        $updateType = (string)($body['update_type'] ?? $body['updateType'] ?? 'minor');
        $this->validateCode($code);

        try {
            $result = online_schema_submit_review_working_copy(
                $this->dataDir, $code,
                $this->actorName($user), $changeNote, $updateType, $this->actorRole($user)
            );
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            if ($msg === 'schema_not_found') $this->error('schema_not_found', 404);
            if ($msg === 'missing_draft_schema') $this->error('missing_draft_schema', 400);
            throw $e;
        }

        $this->success([
            'code'         => strtoupper($code),
            'state'        => $result['state'] ?? [],
            'versions'     => $result['versions'] ?? [],
            'draft_schema' => $result['draft_schema'] ?? null,
            'live_schema'  => $result['live_schema'] ?? null,
            'server_time'  => $this->nowIso(),
        ]);
    }

    /**
     * POST form_schema_publish
     * Publish (release) the reviewed schema version.
     * Body: form_code (required), change_note, update_type, revision, effective_date (all optional)
     * Requires doc-workflow approver role.
     *
     * @return never
     */
    public function publish(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);
        $user = $this->requireAuth();
        require_doc_workflow_approver($user);
        $this->requireCsrf();

        $body          = $this->jsonBody();
        $code          = trim((string)($body['form_code'] ?? ''));
        $changeNote    = trim((string)($body['change_note'] ?? ''));
        $updateType    = (string)($body['update_type'] ?? $body['updateType'] ?? 'major');
        $revision      = (string)($body['revision'] ?? '');
        $effectiveDate = trim((string)($body['effective_date'] ?? ''));
        $this->validateCode($code);

        try {
            $result = online_schema_publish_release(
                $this->dataDir, $code,
                $this->actorName($user), $changeNote, $updateType,
                $this->actorRole($user), $revision, $effectiveDate
            );
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            if ($msg === 'schema_not_found') $this->error('schema_not_found', 404);
            if ($msg === 'missing_review_schema') $this->error('missing_review_schema', 400);
            if ($msg === 'approve_revision_mismatch') $this->error('approve_revision_mismatch', 409);
            throw $e;
        }

        $liveSchema = is_array($result['live_schema'] ?? null) ? $result['live_schema'] : [];
        $releaseFollowup = release_followup_register_release([
            'kind'                 => 'form_schema',
            'code'                 => strtoupper($code),
            'title'                => trim((string)($liveSchema['title'] ?? $liveSchema['title_vi'] ?? strtoupper($code))),
            'category'             => 'FRM',
            'owner'                => 'QA/QMS',
            'path'                 => 'online-forms/schemas/' . strtoupper($code) . '.json',
            'revision'             => (string)($result['state']['released_revision'] ?? $result['state']['revision'] ?? $revision),
            'update_type'          => $updateType,
            'effective_date'       => (string)($result['state']['effective_date'] ?? $effectiveDate),
            'released_at'          => $this->nowIso(),
            'released_by'          => $this->actorName($user),
            'released_by_username' => (string)($user['username'] ?? $_SESSION['user'] ?? ''),
            'released_by_role'     => $this->actorRole($user),
            'roles_allowed'        => array_values((array)($liveSchema['roles_allowed'] ?? [])),
            'note'                 => $changeNote,
        ]);

        $this->success([
            'code'             => strtoupper($code),
            'state'            => $result['state'] ?? [],
            'versions'         => $result['versions'] ?? [],
            'draft_schema'     => $result['draft_schema'] ?? null,
            'live_schema'      => $result['live_schema'] ?? null,
            'release_followup' => $releaseFollowup,
            'server_time'      => $this->nowIso(),
        ]);
    }

    /**
     * POST form_schema_reject
     * Reject a schema under review.
     * Body: form_code (required), reason (optional)
     * Requires doc-workflow approver role.
     *
     * @return never
     */
    public function reject(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);
        $user = $this->requireAuth();
        require_doc_workflow_approver($user);
        $this->requireCsrf();

        $body   = $this->jsonBody();
        $code   = trim((string)($body['form_code'] ?? ''));
        $reason = trim((string)($body['reason'] ?? $body['change_note'] ?? ''));
        $this->validateCode($code);

        try {
            $result = online_schema_reject_review(
                $this->dataDir, $code,
                $this->actorName($user), $reason, $this->actorRole($user)
            );
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            if ($msg === 'schema_not_found') $this->error('schema_not_found', 404);
            if ($msg === 'nothing_to_reject') $this->error('nothing_to_reject', 400);
            throw $e;
        }

        $this->success([
            'code'         => strtoupper($code),
            'state'        => $result['state'] ?? [],
            'versions'     => $result['versions'] ?? [],
            'draft_schema' => $result['draft_schema'] ?? null,
            'live_schema'  => $result['live_schema'] ?? null,
            'server_time'  => $this->nowIso(),
        ]);
    }

    /**
     * POST form_schema_rollback
     * Roll back to a previous released version as a new draft.
     * Body: form_code (required), version_id or revision (one required), change_note (optional)
     *
     * @return never
     */
    public function rollback(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->schemaAuthorRoles());
        $this->requireCsrf();

        $body       = $this->jsonBody();
        $code       = trim((string)($body['form_code'] ?? ''));
        $versionId  = trim((string)($body['version_id'] ?? $body['id'] ?? ''));
        $revision   = trim((string)($body['revision'] ?? ''));
        $changeNote = trim((string)($body['change_note'] ?? ''));
        $this->validateCode($code);
        if ($versionId === '' && $revision === '') $this->error('missing_version_id_or_revision', 400);

        try {
            $result = online_schema_rollback_to_draft(
                $this->dataDir, $code,
                $this->actorName($user), $versionId, $revision,
                $changeNote, $this->actorRole($user)
            );
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            if ($msg === 'schema_not_found') $this->error('schema_not_found', 404);
            if ($msg === 'version_not_found') $this->error('version_not_found', 404);
            throw $e;
        }

        $this->success([
            'code'         => strtoupper($code),
            'state'        => $result['state'] ?? [],
            'versions'     => $result['versions'] ?? [],
            'draft_schema' => $result['draft_schema'] ?? null,
            'live_schema'  => $result['live_schema'] ?? null,
            'server_time'  => $this->nowIso(),
        ]);
    }

    /**
     * POST eqms_form_schema_save
     * Create a new EQMS form schema file.
     * Body: schema (required, object with form_code, title, etc.)
     *
     * @return never
     */
    public function createSchema(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->schemaAuthorRoles());
        $this->requireCsrf();

        $body   = $this->jsonBody();
        $schema = is_array($body['schema'] ?? null) ? $body['schema'] : $body;
        $code   = strtoupper(trim((string)($schema['form_code'] ?? $schema['code'] ?? '')));
        if ($code === '') $this->error('missing_form_code', 400);
        $this->validateCode($code);

        $schemasDir = $this->dataDir . '/online-forms/schemas';
        if (!is_dir($schemasDir)) @mkdir($schemasDir, 0775, true);

        $file = $schemasDir . '/' . $code . '.json';
        if (is_file($file)) $this->error('schema_already_exists', 409);

        $schema['form_code']  = $code;
        $schema['created_at'] = $this->nowIso();
        $schema['created_by'] = (string)($user['username'] ?? '');
        $this->writeJsonFile($file, $schema);

        $this->auditLog('eqms_form_schema_save', ['code' => $code], (string)($user['username'] ?? ''));
        $this->success(['ok' => true, 'form_code' => $code, 'created_at' => $schema['created_at']]);
    }
}
