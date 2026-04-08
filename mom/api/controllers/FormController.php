<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

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

        $data = $this->jsonBody();
        $code = $this->normalizeFormCode((string)($data['code'] ?? ''));
        $form = $this->findFormRegistryEntry($code);
        $code = strtoupper(trim((string)($form['code'] ?? $code)));

        $entryData = $data['data'] ?? $data;
        if (!is_array($entryData)) $this->error('invalid_data', 400);

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

        $data = $this->jsonBody();
        $type = strtoupper(trim((string)($data['type'] ?? '')));

        if ($type === '') $this->error('missing_type', 400);

        $year = (int)date('Y');
        $counterFile = $this->confDir . '/record_counters.json';
        $counters = $this->readJsonFile($counterFile) ?? [];

        $key = "{$type}_{$year}";
        $num = ((int)($counters[$key] ?? 0)) + 1;
        $counters[$key] = $num;
        $this->writeJsonFile($counterFile, $counters);

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
        $counters = $this->readJsonFile($counterFile) ?? [];

        $key = "{$type}_{$year}";
        $num = ((int)($counters[$key] ?? 0)) + 1;

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
}
