<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\ChangeControl\ChangeAuthorityService;
use MOM\Services\ControlPlane\LegacyWriteSurfacePolicy;
use Throwable;

/**
 * Online forms controller for HESEM MOM Portal.
 *
 * Handles form listing, schema retrieval, entry submission,
 * entry queries, record ID generation, and form version streaming.
 *
 * @package MOM\Api\Controllers
 * @since   2.0.0
 */
class FormController extends BaseController
{
    private function denyLegacyFormWrite(string $operation): void
    {
        $decision = (new LegacyWriteSurfacePolicy())->assess('online_form_json', $operation);
        $this->error($decision['error_code'], $decision['status'], $decision['message'], [
            'canonical_path' => $decision['canonical_path'],
            'legacy_surface' => $decision['surface'],
            'legacy_operation' => $decision['operation'],
        ]);
    }

    /**
     * GET list â€” List available online forms.
     *
     * Legacy action: `online_form_list`
     *
     * @return never
     */
    public function list(): never
    {
        $this->requireAuth();

        $registryFile = $this->confDir . '/form_control_registry.json';
        $registry = $this->readJsonFile($registryFile) ?? [];

        // Filter to only forms with online_form = true
        $forms = [];
        foreach ($registry as $entry) {
            if (!is_array($entry)) continue;
            if (!($entry['online_form'] ?? false)) continue;
            $forms[] = [
                'code'   => (string)($entry['code'] ?? ''),
                'title'  => (string)($entry['title'] ?? ''),
                'status' => (string)($entry['control_status'] ?? 'RELEASED'),
                'rev'    => (string)($entry['rev'] ?? ''),
            ];
        }

        $this->success(['forms' => $forms]);
    }

    /**
     * GET getSchema â€” Get the JSON schema for a specific form.
     *
     * Legacy action: `online_form_schema`
     *
     * @return never
     */
    public function getSchema(): never
    {
        $this->requireAuth();

        $code = $this->normalizeFormCode((string)($this->query('code') ?? ''));
        $schema = $this->findFormRegistryEntry($code);

        $this->success(['schema' => $schema]);
    }

    /**
     * POST submit â€” Submit a new form entry.
     *
     * Legacy action: `online_form_submit`
     *
     * @return never
     */
    public function submit(): never
    {
        if ($this->method() !== 'POST') {
            $this->error('method_not_allowed', 405);
        }

        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->denyLegacyFormWrite('submit_entry');

        $data = $this->jsonBody();
        $code = $this->normalizeFormCode((string)($data['code'] ?? ''));
        $form = $this->findFormRegistryEntry($code);
        $code = strtoupper(trim((string)($form['code'] ?? $code)));

        $entryData = $data['data'] ?? $data;
        if (!is_array($entryData)) $this->error('invalid_data', 400);
        $this->assertControlledFormMutationAllowed($code, $entryData);

        // Add submission metadata
        $entryData['submitted_by']   = (string)($me['username'] ?? '');
        $entryData['submitted_name'] = (string)($me['name'] ?? $me['username'] ?? '');
        $entryData['submitted_at']   = $this->nowIso();
        $entryData['form_code']      = $code;

        // Process form workflow if applicable
        require_once $this->rootDir . '/mom/form_workflow.php';

        // Save entry
        $entriesDir = $this->dataDir . '/online-forms/entries/' . $code;
        if (!is_dir($entriesDir)) {
            @mkdir($entriesDir, 0775, true);
        }

        $entryId = bin2hex(random_bytes(8)) . '-' . time();
        $entryData['entry_id'] = $entryId;

        $entryFile = $entriesDir . '/' . $entryId . '.json';
        $this->writeJsonFile($entryFile, $entryData);

        // Also append to the consolidated entries file
        $consolidatedFile = $this->dataDir . '/online-forms/entries/' . $code . '.json';
        $allEntries = $this->readJsonFile($consolidatedFile) ?? [];
        $allEntries[] = $entryData;
        $this->writeJsonFile($consolidatedFile, $allEntries);

        // PostgreSQL dual-write
        $this->pgWriteFormEntry($code, $entryId, $entryData, $me);

        $this->auditLog('online_form_submit', ['code' => $code, 'entry_id' => $entryId]);
        $this->success(['entry_id' => $entryId]);
    }

    /**
     * GET getEntries â€” Get all entries for a specific form.
     *
     * Legacy action: `online_form_entries`
     *
     * @return never
     */
    public function getEntries(): never
    {
        $this->requireAuth();

        $code = $this->normalizeFormCode((string)($this->query('code') ?? ''));
        $form = $this->findFormRegistryEntry($code);
        $code = strtoupper(trim((string)($form['code'] ?? $code)));

        $entryFile = $this->dataDir . '/online-forms/entries/' . $code . '.json';
        $entries = [];
        if (is_file($entryFile)) {
            $raw = @file_get_contents($entryFile);
            $entries = $raw ? json_decode($raw, true) : [];
        }

        $this->success(['entries' => is_array($entries) ? $entries : []]);
    }

    /**
     * GET getIdRegistry â€” Get the record ID registry (counter state).
     *
     * Legacy action: `record_id_registry`
     *
     * @return never
     */
    public function getIdRegistry(): never
    {
        $this->requireAuth();

        $counterFile = $this->confDir . '/record_counters.json';
        $counters = $this->readJsonFile($counterFile) ?? [];

        $this->success(['registry' => $counters]);
    }

    /**
     * GET configRecordTypes â€” Return record type registry configuration.
     *
     * Legacy action: `config_record_types`
     *
     * @return never
     */
    public function configRecordTypes(): never
    {
        $this->requireAuth();
        $this->success(['record_types' => load_record_type_registry()]);
    }

    /**
     * POST getNextId â€” Generate and consume the next record ID.
     *
     * Legacy action: `record_id_next`
     *
     * @return never
     */
    public function getNextId(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->denyLegacyFormWrite('consume_record_id');

        $data = $this->jsonBody();
        $type = strtoupper(trim((string)($data['type'] ?? '')));

        if ($type === '') $this->error('missing_type', 400);

        $year = (int)date('Y');
        $counterFile = $this->confDir . '/record_counters.json';
        $key = "{$type}_{$year}";

        // Generate next ID with file locking to prevent race conditions
        $num = $this->incrementCounter($counterFile, $key);

        $digits = (int)($data['digits'] ?? 3);
        if ($digits < 1 || $digits > 6) $digits = 3;

        $recordId = sprintf('%s-%d-%0' . $digits . 'd', $type, $year, $num);

        $this->auditLog('record_id_next', ['type' => $type, 'record_id' => $recordId]);
        $this->success(['record_id' => $recordId, 'number' => $num]);
    }

    /**
     * GET peekNextId â€” Preview the next record ID without consuming it.
     *
     * Legacy action: `record_id_peek`
     *
     * @return never
     */
    public function peekNextId(): never
    {
        $this->requireAuth();

        $type = strtoupper(trim((string)($this->query('type') ?? '')));
        if ($type === '') $this->error('missing_type', 400);

        $year = (int)date('Y');
        $counterFile = $this->confDir . '/record_counters.json';

        // Peek at the next counter value without consuming it (safe read with shared lock)
        $num = $this->peekCounter($counterFile, "{$type}_{$year}") + 1;

        $digits = (int)($this->query('digits') ?? '3');
        if ($digits < 1 || $digits > 6) $digits = 3;

        $recordId = sprintf('%s-%d-%0' . $digits . 'd', $type, $year, $num);

        $this->success(['record_id' => $recordId, 'number' => $num, 'peek' => true]);
    }

    /**
     * GET streamVersion â€” Stream a specific form version file.
     *
     * Legacy action: `form_version_stream`
     *
     * @return never
     */
    public function streamVersion(): never
    {
        if ($this->method() !== 'GET') {
            $this->error('method_not_allowed', 405);
        }

        $me = $this->requireAuth();

        $code = $this->normalizeFormCode((string)($this->query('code') ?? ''));
        $basePath = (string)($this->query('base_path') ?? ($this->query('path') ?? ''));
        $id = trim((string)($this->query('id') ?? ''));
        if (trim($basePath) === '' || $id === '') {
            $this->error('missing_params', 400);
        }

        [$baseRel, $formEntry] = $this->resolveManagedFormEntry($code, $basePath);
        $displayConfig = portal_load_display_config($this->confDir . '/portal_display_config.json');
        $doc = [
            'code' => strtoupper(trim((string)($formEntry['code'] ?? $code))),
            'path' => (string)($formEntry['path'] ?? $baseRel),
            'folder' => (string)($formEntry['folder'] ?? dirname($baseRel)),
            'cat' => 'FRM',
        ];
        $hidden = array_values(array_unique(array_map(
            static fn($value): string => strtoupper((string)$value),
            load_doc_visibility($this->confDir . '/docs_visibility.json')
        )));
        $roleDocs = portal_load_role_docs($this->portalConfigJsFile());
        if (!portal_can_access_doc($me, $doc, $roleDocs, $hidden, $displayConfig)) {
            $this->error('forbidden', 403);
        }

        $resolved = form_resolve_version_for_stream($this->dataDir, $this->rootDir, $formEntry, $id);
        if (!is_array($resolved) || !is_file((string)($resolved['abs'] ?? ''))) {
            $this->error('not_found', 404);
        }

        $ext = strtolower((string)($resolved['ext'] ?? ''));
        $mime = portal_stream_mime_type($ext);

        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Content-Type: ' . $mime);
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: same-origin');
        header('Content-Disposition: attachment; filename="' . rawurlencode((string)($resolved['name'] ?? basename((string)$resolved['abs']))) . '"');
        $size = @filesize((string)$resolved['abs']);
        if ($size !== false) {
            header('Content-Length: ' . (string)$size);
        }

        readfile((string)$resolved['abs']);
        exit;
    }

    /**
     * POST uploadDraft â€” Upload a workbook file as a form draft.
     *
     * Legacy action: `form_upload_draft`
     *
     * Expects multipart/form-data with fields: code, base_path|path, note, revision, file.
     *
     * @return never
     */
    public function uploadDraft(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);

        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->denyLegacyFormWrite('upload_offline_draft');

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        require_doc_workflow_editor($me, $rolePermsFile);

        $code     = $this->normalizeFormCode((string)($_POST['code'] ?? ''));
        $basePath = (string)($_POST['base_path'] ?? ($_POST['path'] ?? ''));
        $note     = trim((string)($_POST['note'] ?? ''));

        if ($code === '') $this->error('missing_code', 400);
        if (trim($basePath) === '') $this->error('missing_base_path', 400);
        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            $this->error('missing_file', 400);
        }

        [$baseRel, $formEntry] = $this->resolveManagedFormEntry($code, $basePath);

        $state = form_load_state($this->dataDir, $this->rootDir, $formEntry);
        if (($state['status'] ?? 'approved') === 'approved') {
            $this->error('start_new_revision_required', 400);
        }

        $manifest   = form_load_manifest($this->dataDir, $this->rootDir, $formEntry);
        $revision   = form_normalize_revision(
            (string)($_POST['revision'] ?? ($state['revision'] ?? '0')),
            form_normalize_revision((string)($state['revision'] ?? '0'), '0')
        );
        $updateType = (($state['updateType'] ?? 'minor') === 'major') ? 'major' : 'minor';

        // Validate upload
        $upload      = $_FILES['file'];
        $tmpName     = (string)($upload['tmp_name'] ?? '');
        $uploadError = (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($uploadError !== UPLOAD_ERR_OK || $tmpName === '') {
            $this->error('upload_failed', 400);
        }

        $uploadSize = (int)($upload['size'] ?? 0);
        if ($uploadSize <= 0) $this->error('invalid_upload_size', 400);

        $maxBytes = 25 * 1024 * 1024; // 25 MB
        if ($uploadSize > $maxBytes) {
            $this->error('upload_too_large', 413);
        }

        // Extension checks
        $liveExt   = form_extension_from_path((string)$formEntry['path']);
        $uploadExt = strtolower(pathinfo((string)($upload['name'] ?? ''), PATHINFO_EXTENSION));
        if (!form_is_workbook_extension($uploadExt)) {
            $this->error('unsupported_form_extension', 400);
        }
        if ($liveExt !== '' && $uploadExt !== $liveExt) {
            $this->error('extension_mismatch', 400);
        }

        // Store the draft file
        $draftMeta = form_private_file_meta($this->dataDir, (string)$formEntry['code'], $revision, 'draft', $uploadExt);
        ensure_dir(dirname($draftMeta['abs']));
        $moved = @move_uploaded_file($tmpName, $draftMeta['abs']);
        if (!$moved) {
            $moved = @copy($tmpName, $draftMeta['abs']);
        }
        if (!$moved || !is_file($draftMeta['abs'])) {
            $this->error('upload_store_failed', 500);
        }

        clearstatcache(true, $draftMeta['abs']);
        $storedSize = @filesize($draftMeta['abs']) ?: 0;
        if ($storedSize <= 0 || $storedSize > $maxBytes) {
            if (is_file($draftMeta['abs'])) @unlink($draftMeta['abs']);
            $this->error(
                $storedSize > $maxBytes ? 'upload_too_large' : 'invalid_upload_size',
                $storedSize > $maxBytes ? 413 : 400
            );
        }

        // Validate file signature
        if (!uploaded_workbook_signature_valid($draftMeta['abs'], $uploadExt)) {
            if (is_file($draftMeta['abs'])) @unlink($draftMeta['abs']);
            $this->error('invalid_file_signature', 400);
        }

        $sha  = form_sha256_file($draftMeta['abs']);
        $size = $storedSize;
        $dt   = human_dt();

        // Update manifest versions
        $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
        $idx = form_find_working_entry_index($versions, $revision, ['draft', 'in_review', 'pending_approval']);

        $entry = [
            'id'            => $idx >= 0
                ? (string)($versions[$idx]['id'] ?? (ts_compact() . '_draft'))
                : (ts_compact() . '_draft'),
            'version'       => 'v' . $revision,
            'status'        => 'draft',
            'date'          => $dt,
            'user'          => (string)($me['name'] ?? $me['username'] ?? ''),
            'role'          => (string)($me['role'] ?? ''),
            'note'          => $note !== '' ? $note : 'Uploaded workbook draft',
            'updateType'    => $updateType,
            'storage'       => 'private',
            'private_rel'   => $draftMeta['rel'],
            'sha256'        => $sha,
            'size_bytes'    => $size,
            'original_name' => (string)($upload['name'] ?? ''),
        ];

        if ($idx >= 0) {
            // Clean up previous draft file if different
            $oldPrivateRel = trim((string)($versions[$idx]['private_rel'] ?? ''));
            if ($oldPrivateRel !== '' && $oldPrivateRel !== $draftMeta['rel']) {
                try {
                    $oldPrivateAbs = form_resolve_private_abs($this->dataDir, $oldPrivateRel);
                    if (is_file($oldPrivateAbs)) @unlink($oldPrivateAbs);
                } catch (Throwable $e) {
                    $this->rethrowResponse($e);
                    // ignore stale file
                }
            }
            $versions[$idx] = array_merge($versions[$idx], $entry);
        } else {
            array_unshift($versions, $entry);
        }

        $manifest['versions'] = $versions;
        $manifest['base']     = (string)$formEntry['path'];
        $manifest['kind']     = 'excel_form';
        form_save_manifest($this->dataDir, (string)$formEntry['code'], $manifest);

        // Update state
        $state['status']     = 'draft';
        $state['revision']   = $revision;
        $state['updateType'] = $updateType;
        $state['checked_out_by'] = [
            'name' => (string)($me['name'] ?? $me['username'] ?? ''),
            'role' => (string)($me['role'] ?? ''),
            'date' => $dt,
        ];
        $state['lastEdit'] = [
            'by'   => (string)($me['name'] ?? $me['username'] ?? ''),
            'role' => (string)($me['role'] ?? ''),
            'date' => $dt,
            'note' => $note !== '' ? $note : 'Uploaded workbook draft',
        ];
        form_save_state($this->dataDir, (string)$formEntry['code'], $state);
        invalidate_scan_cache($this->dataDir);

        $this->success([
            'code'        => (string)$formEntry['code'],
            'state'       => $state,
            'versions'    => form_public_versions($manifest, $state, (string)$formEntry['code'], (string)$formEntry['path']),
            'server_time' => $this->nowIso(),
        ]);
    }

    /**
     * Normalize and validate a form code coming from the client.
     *
     * @param string $code Raw form code.
     * @return string
     */
    private function normalizeFormCode(string $code): string
    {
        $code = strtoupper(trim($code));
        if ($code === '') {
            $this->error('missing_code', 400);
        }
        if (!preg_match('/^[A-Z0-9._-]+$/', $code)) {
            $this->error('invalid_form_code', 400);
        }

        return $code;
    }

    /**
     * Return the form registry file path.
     *
     * @return string
     */
    private function formRegistryFile(): string
    {
        return $this->confDir . '/form_control_registry.json';
    }

    /**
     * Look up a form entry by its canonical code.
     *
     * @param string $code Validated form code.
     * @return array<string, mixed>
     */
    private function findFormRegistryEntry(string $code): array
    {
        $registry = $this->readJsonFile($this->formRegistryFile()) ?? [];
        foreach ($registry as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            if (strtoupper(trim((string)($entry['code'] ?? ''))) === $code) {
                return $entry;
            }
        }

        $this->error('form_not_found', 404);
    }

    /**
     * Resolve a managed form workflow target by code and base path.
     *
     * @param string $code Validated form code.
     * @param string $basePath Relative form base path.
     * @return array{0: string, 1: array<string, mixed>}
     */
    private function resolveManagedFormEntry(string $code, string $basePath): array
    {
        $baseRel = safe_rel_path($basePath);
        $formEntry = form_registry_get_entry($this->formRegistryFile(), $code, $baseRel);
        if (!is_array($formEntry)) {
            $this->error('form_not_found', 404);
        }

        return [$baseRel, $formEntry];
    }

    /**
     * Return the portal role-doc configuration JS file path.
     *
     * @return string
     */
    private function portalConfigJsFile(): string
    {
        return $this->rootDir . '/mom/scripts/portal/01-data-config.js';
    }

    /**
     * @param array<string, mixed> $candidate
     */
    private function assertControlledFormMutationAllowed(string $code, array $candidate): void
    {
        $sourceEntryId = trim((string)($candidate['source_entry_id'] ?? ''));
        $entryId = trim((string)($candidate['entry_id'] ?? ''));
        $allocationId = trim((string)($candidate['allocation_id'] ?? ''));
        if ($sourceEntryId === '' && $entryId === '' && $allocationId === '') {
            return;
        }

        $previous = $this->loadOnlineFormEntry($code, $sourceEntryId !== '' ? $sourceEntryId : $entryId, $allocationId);
        if ($previous === null) {
            return;
        }

        $previousState = $this->entryWorkflowState($previous);
        if (!$this->isLockedWorkflowState($previousState)) {
            return;
        }

        $editOrigin = trim((string)($candidate['edit_origin'] ?? ''));
        $changeAuthorityId = $this->changeAuthorityFromPayload($candidate);
        $amendmentReason = trim((string)($candidate['amendment_reason'] ?? ''));

        if ($editOrigin !== 'amendment' || !$this->changeAuthorityFormatValid($changeAuthorityId)) {
            $this->error('change_authority_required', 409, 'Locked form records require an amendment with a valid released change authority.');
        }
        if ($amendmentReason === '') {
            $this->error('amendment_reason_required', 422);
        }

        $service = ChangeAuthorityService::fromDataLayer($this->data);
        foreach ($this->changedContentFields($previous, $candidate) as $fieldPath => $values) {
            $decision = $service->assertFieldEditAllowed(
                'form_record',
                trim((string)($previous['record_id'] ?? $previous['entry_id'] ?? $code)),
                $fieldPath,
                $values['old'],
                $values['new'],
                $previousState !== '' ? $previousState : 'locked',
                [
                    'change_authority_id' => $changeAuthorityId,
                    'requested_effect' => 'amend',
                    'form_code' => $code,
                    'source_entry_id' => (string)($previous['entry_id'] ?? ''),
                    'source_submission_revision' => (int)($previous['submission_revision'] ?? 0),
                ],
            );
            if (!$decision->allowed) {
                $this->error($decision->errorCode !== '' ? $decision->errorCode : 'change_authority_required', 409, $decision->message);
            }
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadOnlineFormEntry(string $code, string $entryId = '', string $allocationId = ''): ?array
    {
        $entries = $this->readJsonFile($this->dataDir . '/online-forms/entries/' . $code . '.json') ?? [];
        if (!is_array($entries)) {
            return null;
        }
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            if ($entryId !== '' && (string)($entry['entry_id'] ?? '') === $entryId) {
                return $entry;
            }
            if ($allocationId !== '' && (string)($entry['allocation_id'] ?? '') === $allocationId) {
                return $entry;
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $previous
     * @param array<string, mixed> $candidate
     * @return array<string, array{old:mixed,new:mixed}>
     */
    private function changedContentFields(array $previous, array $candidate): array
    {
        $old = $this->contentFields($previous);
        $new = $this->contentFields($candidate);
        $fields = array_values(array_unique(array_merge(array_keys($old), array_keys($new))));
        sort($fields);

        $changes = [];
        foreach ($fields as $field) {
            $oldValue = $old[$field] ?? null;
            $newValue = $new[$field] ?? null;
            if (json_encode($oldValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                === json_encode($newValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) {
                continue;
            }
            $changes[$field] = ['old' => $oldValue, 'new' => $newValue];
        }
        return $changes;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function contentFields(array $payload): array
    {
        $fields = is_array($payload['fieldValues'] ?? null) ? $payload['fieldValues'] : $payload;
        $metadata = array_flip([
            'entry_id', 'record_id', 'allocation_id', 'form_code', 'form_version',
            'workflow_state', 'approval_state', '_status', '_ip', '_server_time',
            '_session_user', 'submitted_at', 'submitted_by', 'submitted_name',
            'updated_at', 'updated_by', 'created_at', 'created_by',
            'submission_revision', 'submission_count', 'resubmission_count',
            'amendment_count', 'edit_origin', 'source_entry_id',
            'source_submission_revision', 'change_authority_id',
            'amendment_reason', 'master_context', 'history', 'signatures',
            'runtime_mode',
        ]);

        $out = [];
        foreach ($fields as $key => $value) {
            $field = trim((string)$key);
            if ($field === '' || str_starts_with($field, '_') || isset($metadata[$field])) {
                continue;
            }
            $out[$field] = $value;
        }
        ksort($out);
        return $out;
    }

    private function entryWorkflowState(array $entry): string
    {
        return strtolower(trim((string)($entry['workflow_state'] ?? $entry['approval_state'] ?? $entry['_status'] ?? '')));
    }

    private function isLockedWorkflowState(string $state): bool
    {
        return in_array(strtolower(trim($state)), ['submitted', 'received', 'in_review', 'approved', 'closed', 'finalized', 'rejected'], true);
    }

    private function changeAuthorityFromPayload(array $payload): string
    {
        foreach (['change_authority_id', 'change_authority', 'authority_id', 'change_order_id', 'change_order_number', 'plm_change_order_id', 'change_order_ref'] as $key) {
            $value = $payload[$key] ?? null;
            if (is_scalar($value) && trim((string)$value) !== '') {
                return trim((string)$value);
            }
        }
        return '';
    }

    private function changeAuthorityFormatValid(string $authority): bool
    {
        $authority = trim($authority);
        if ($authority === '') {
            return false;
        }
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $authority) === 1) {
            return true;
        }
        return (bool)preg_match('/^[A-Z]{2,12}[A-Z0-9._\/-]{2,80}$/i', $authority);
    }

    // ── Draft API ───────────────────────────────────────────────────────────

    /**
     * POST saveDraft — Auto-save a form draft.
     *
     * Action: `form_draft_save`
     *
     * @return never
     */
    public function saveDraft(): never
    {
        if ($this->method() !== 'POST') $this->error('method_not_allowed', 405);
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->denyLegacyFormWrite('save_online_draft');

        $body = $this->jsonBody();
        $code = $this->normalizeFormCode((string)($body['code'] ?? ''));
        $allocId = trim((string)($body['allocation_id'] ?? ''));
        $fieldValues = $body['field_values'] ?? $body['data'] ?? [];
        $signatures = $body['signatures'] ?? [];
        $userId = (string)($me['username'] ?? '');

        if (!is_array($fieldValues)) $this->error('invalid_field_values', 400);
        $draftContext = $fieldValues;
        if (is_array($body['data'] ?? null) && is_array(($body['data']['fieldValues'] ?? null))) {
            $draftContext = $body['data'];
        }
        foreach (['entry_id', 'allocation_id', 'edit_origin', 'source_entry_id', 'source_submission_revision', 'change_authority_id', 'amendment_reason'] as $field) {
            if (array_key_exists($field, $body)) {
                $draftContext[$field] = $body[$field];
            }
        }
        $this->assertControlledFormMutationAllowed($code, $draftContext);

        // JSON file draft
        $draftDir = $this->dataDir . '/online-forms/drafts/' . $code;
        if (!is_dir($draftDir)) @mkdir($draftDir, 0775, true);
        $draftFile = $draftDir . '/' . $userId . ($allocId ? '_' . $allocId : '') . '.json';
        $existing = $this->readJsonFile($draftFile) ?? [];
        $version = ((int)($existing['version'] ?? 0)) + 1;

        $draft = [
            'form_code'     => $code,
            'allocation_id' => $allocId ?: null,
            'user_id'       => $userId,
            'field_values'  => $fieldValues,
            'signatures'    => is_array($signatures) ? $signatures : [],
            'edit_origin'   => (string)($body['edit_origin'] ?? 'draft'),
            'source_entry_id' => trim((string)($body['source_entry_id'] ?? '')),
            'source_submission_revision' => (int)($body['source_submission_revision'] ?? 0),
            'change_authority_id' => trim((string)($body['change_authority_id'] ?? $body['change_order_id'] ?? '')),
            'amendment_reason' => trim((string)($body['amendment_reason'] ?? '')),
            'version'       => $version,
            'saved_at'      => $this->nowIso(),
        ];
        $this->writeJsonFile($draftFile, $draft);

        // PostgreSQL dual-write
        $this->pgSaveDraft($draft);

        $this->success(['version' => $version, 'saved_at' => $draft['saved_at']]);
    }

    /**
     * GET getDraft — Retrieve the latest draft for a form.
     *
     * Action: `form_draft_get`
     *
     * @return never
     */
    public function getDraft(): never
    {
        $me = $this->requireAuth();

        $code = $this->normalizeFormCode((string)($this->query('code') ?? ''));
        $allocId = trim((string)($this->query('allocation_id') ?? ''));
        $userId = (string)($me['username'] ?? '');

        // Try PostgreSQL first
        $mode = $this->data->getMode();
        if ($mode === \MOM\Database\DataLayer::MODE_POSTGRES_PRIMARY || $mode === \MOM\Database\DataLayer::MODE_POSTGRES_ONLY) {
            try {
                $db = $this->data->getConnection();
                $sql = 'SELECT * FROM form_drafts WHERE form_code = :code AND user_id = :user';
                $params = [':code' => $code, ':user' => $userId];
                if ($allocId !== '') {
                    $sql .= ' AND allocation_id = :aid::uuid';
                    $params[':aid'] = $allocId;
                }
                $sql .= ' ORDER BY saved_at DESC LIMIT 1';
                $row = $db->queryOne($sql, $params);
                if ($row !== null) {
                    $fieldValues = is_string($row['field_values'] ?? null)
                        ? json_decode($row['field_values'], true) : ($row['field_values'] ?? []);
                    $sigs = is_string($row['signatures'] ?? null)
                        ? json_decode($row['signatures'], true) : ($row['signatures'] ?? []);
                    $this->success([
                        'draft' => [
                            'form_code'     => $row['form_code'],
                            'allocation_id' => $row['allocation_id'],
                            'user_id'       => $row['user_id'],
                            'field_values'  => $fieldValues,
                            'signatures'    => $sigs,
                            'version'       => (int)$row['version'],
                            'saved_at'      => $row['saved_at'],
                        ],
                    ]);
                }
                if ($mode === \MOM\Database\DataLayer::MODE_POSTGRES_ONLY) {
                    $this->success(['draft' => null]);
                }
            } catch (\Throwable $e) {
                error_log('[FormController] PG getDraft failed: ' . $e->getMessage());
                if ($mode === \MOM\Database\DataLayer::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
            }
        }

        // JSON fallback
        $draftDir = $this->dataDir . '/online-forms/drafts/' . $code;
        $draftFile = $draftDir . '/' . $userId . ($allocId ? '_' . $allocId : '') . '.json';
        $draft = $this->readJsonFile($draftFile);

        $this->success(['draft' => $draft]);
    }

    /**
     * GET listDrafts — List all drafts for the current user.
     *
     * Action: `form_draft_list`
     *
     * @return never
     */
    public function listDrafts(): never
    {
        $me = $this->requireAuth();
        $userId = (string)($me['username'] ?? '');

        $mode = $this->data->getMode();
        if ($mode === \MOM\Database\DataLayer::MODE_POSTGRES_PRIMARY || $mode === \MOM\Database\DataLayer::MODE_POSTGRES_ONLY) {
            try {
                $db = $this->data->getConnection();
                $rows = $db->query(
                    'SELECT draft_id, form_code, allocation_id, version, saved_at
                     FROM form_drafts WHERE user_id = :user ORDER BY saved_at DESC LIMIT 100',
                    [':user' => $userId]
                );
                $this->success(['drafts' => $rows]);
            } catch (\Throwable $e) {
                error_log('[FormController] PG listDrafts failed: ' . $e->getMessage());
                if ($mode === \MOM\Database\DataLayer::MODE_POSTGRES_ONLY) {
                    throw $e;
                }
            }
        }

        // JSON fallback: scan draft directories
        $drafts = [];
        $baseDir = $this->dataDir . '/online-forms/drafts';
        if (is_dir($baseDir)) {
            foreach (scandir($baseDir) ?: [] as $formDir) {
                if ($formDir === '.' || $formDir === '..') continue;
                $formPath = $baseDir . '/' . $formDir;
                if (!is_dir($formPath)) continue;
                foreach (scandir($formPath) ?: [] as $file) {
                    if (!str_starts_with($file, $userId)) continue;
                    $draft = $this->readJsonFile($formPath . '/' . $file);
                    if (is_array($draft)) $drafts[] = $draft;
                }
            }
        }

        $this->success(['drafts' => $drafts]);
    }

    // ── PostgreSQL Helpers ──────────────────────────────────────────────────

    /**
     * Write a form entry to PostgreSQL (dual-write).
     */
    private function pgWriteFormEntry(string $code, string $entryId, array $entryData, array $user): void
    {
        $mode = $this->data->getMode();
        if ($mode === \MOM\Database\DataLayer::MODE_JSON_ONLY) return;

        try {
            $db = $this->data->getConnection();
            $dataJson = json_encode($entryData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            // Find latest schema version
            $schemaRow = $db->queryOne(
                'SELECT version FROM form_schemas WHERE form_code = :code ORDER BY version DESC LIMIT 1',
                [':code' => $code]
            );
            $version = $schemaRow ? (int)$schemaRow['version'] : 1;

            $db->execute(
                'INSERT INTO form_entries (entry_id, form_code, form_version, data, submitted_by, workflow_state, metadata)
                 VALUES (:eid::uuid, :code, :ver, :data::jsonb, (SELECT user_id FROM users WHERE username = :uname LIMIT 1), \'draft\'::workflow_status,
                         :meta::jsonb)
                 ON CONFLICT (entry_id) DO UPDATE SET data = EXCLUDED.data, metadata = EXCLUDED.metadata',
                [
                    ':eid'   => $this->normalizeUuid($entryId),
                    ':code'  => $code,
                    ':ver'   => $version,
                    ':data'  => $dataJson,
                    ':uname' => (string)($user['username'] ?? ''),
                    ':meta'  => json_encode(['source' => 'form_submit', 'original_entry_id' => $entryId]),
                ]
            );
        } catch (\Throwable $e) {
            error_log('[FormController] PG form entry write failed: ' . $e->getMessage());
            // In shadow_write mode, don't throw
        }
    }

    /**
     * Save a draft to PostgreSQL.
     */
    private function pgSaveDraft(array $draft): void
    {
        $mode = $this->data->getMode();
        if ($mode === \MOM\Database\DataLayer::MODE_JSON_ONLY) return;

        try {
            $db = $this->data->getConnection();

            $fieldJson = json_encode($draft['field_values'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $sigJson   = json_encode($draft['signatures'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $allocId   = !empty($draft['allocation_id']) ? $draft['allocation_id'] : null;

            $db->execute(
                'INSERT INTO form_drafts (form_code, allocation_id, user_id, field_values, signatures)
                 VALUES (:code, :aid::uuid, :user, :fv::jsonb, :sig::jsonb)
                 ON CONFLICT (form_code, allocation_id, user_id)
                 DO UPDATE SET field_values = EXCLUDED.field_values, signatures = EXCLUDED.signatures',
                [
                    ':code' => $draft['form_code'],
                    ':aid'  => $allocId,
                    ':user' => $draft['user_id'],
                    ':fv'   => $fieldJson,
                    ':sig'  => $sigJson,
                ]
            );
        } catch (\Throwable $e) {
            error_log('[FormController] PG draft save failed: ' . $e->getMessage());
        }
    }

    /**
     * Normalize an entry ID to UUID format for PostgreSQL.
     * If the entry ID isn't a valid UUID, generate a deterministic UUID v5 from it.
     */
    private function normalizeUuid(string $id): string
    {
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
            return strtolower($id);
        }
        // Create a deterministic UUID from the non-UUID entry_id
        $hash = md5('hesem-form-entry:' . $id);
        return substr($hash, 0, 8) . '-' . substr($hash, 8, 4) . '-4' . substr($hash, 13, 3)
            . '-' . dechex(8 | (hexdec(substr($hash, 16, 1)) & 3)) . substr($hash, 17, 3)
            . '-' . substr($hash, 20, 12);
    }

    /**
     * Atomically increment a counter value with exclusive file locking.
     * Prevents race conditions when multiple requests try to generate sequential IDs.
     *
     * @param string $counterFile Path to the counter file (JSON).
     * @param string $key Counter key (e.g., "PO_2026").
     * @return int The incremented value.
     */
    private function incrementCounter(string $counterFile, string $key): int
    {
        $lockFile = $counterFile . '.lock';
        $lock = @fopen($lockFile, 'c');

        if (!$lock || !@flock($lock, LOCK_EX)) {
            // Fallback if locking fails (should not happen in normal operation)
            error_log("[FormController] Failed to acquire exclusive lock on {$lockFile}");
            $counters = $this->readJsonFile($counterFile) ?? [];
            $num = ((int)($counters[$key] ?? 0)) + 1;
            $counters[$key] = $num;
            $this->writeJsonFile($counterFile, $counters);
            return $num;
        }

        try {
            $counters = $this->readJsonFile($counterFile) ?? [];
            $num = ((int)($counters[$key] ?? 0)) + 1;
            $counters[$key] = $num;
            $this->writeJsonFile($counterFile, $counters);
            return $num;
        } finally {
            @flock($lock, LOCK_UN);
            @fclose($lock);
        }
    }

    /**
     * Safely peek at the current counter value without consuming it (shared lock).
     * Prevents dirty reads while allowing concurrent peeks.
     *
     * @param string $counterFile Path to the counter file (JSON).
     * @param string $key Counter key (e.g., "PO_2026").
     * @return int The current counter value (0 if not set).
     */
    private function peekCounter(string $counterFile, string $key): int
    {
        $lockFile = $counterFile . '.lock';
        $lock = @fopen($lockFile, 'c');

        if (!$lock || !@flock($lock, LOCK_SH)) {
            // Fallback if locking fails
            $counters = $this->readJsonFile($counterFile) ?? [];
            return (int)($counters[$key] ?? 0);
        }

        try {
            $counters = $this->readJsonFile($counterFile) ?? [];
            return (int)($counters[$key] ?? 0);
        } finally {
            @flock($lock, LOCK_UN);
            @fclose($lock);
        }
    }
}
