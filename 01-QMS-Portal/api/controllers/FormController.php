<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use Throwable;

/**
 * Online forms controller for HESEM QMS Portal.
 *
 * Handles form listing, schema retrieval, entry submission,
 * entry queries, record ID generation, and form version streaming.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   2.0.0
 */
class FormController extends BaseController
{
    /**
     * GET list — List available online forms.
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
     * GET getSchema — Get the JSON schema for a specific form.
     *
     * Legacy action: `online_form_schema`
     *
     * @return never
     */
    public function getSchema(): never
    {
        $this->requireAuth();

        $code = strtoupper(trim((string)($this->query('code') ?? '')));
        if ($code === '') $this->error('missing_code', 400);

        $registryFile = $this->confDir . '/form_control_registry.json';
        $registry = $this->readJsonFile($registryFile) ?? [];

        $schema = null;
        foreach ($registry as $entry) {
            if (!is_array($entry)) continue;
            if (strtoupper(trim((string)($entry['code'] ?? ''))) === $code) {
                $schema = $entry;
                break;
            }
        }

        if ($schema === null) {
            $this->error('form_not_found', 404);
        }

        $this->success(['schema' => $schema]);
    }

    /**
     * POST submit — Submit a new form entry.
     *
     * Legacy action: `online_form_submit`
     *
     * @return never
     */
    public function submit(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $data = $this->jsonBody();
        $code = strtoupper(trim((string)($data['code'] ?? '')));

        if ($code === '') $this->error('missing_code', 400);

        $entryData = $data['data'] ?? $data;
        if (!is_array($entryData)) $this->error('invalid_data', 400);

        // Add submission metadata
        $entryData['submitted_by']   = (string)($me['username'] ?? '');
        $entryData['submitted_name'] = (string)($me['name'] ?? $me['username'] ?? '');
        $entryData['submitted_at']   = $this->nowIso();
        $entryData['form_code']      = $code;

        // Process form workflow if applicable
        require_once $this->rootDir . '/01-QMS-Portal/form_workflow.php';

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
     * GET getEntries — Get all entries for a specific form.
     *
     * Legacy action: `online_form_entries`
     *
     * @return never
     */
    public function getEntries(): never
    {
        $this->requireAuth();

        $code = strtoupper(trim((string)($this->query('code') ?? '')));
        if ($code === '') $this->error('missing_code', 400);

        $entryFile = $this->dataDir . '/online-forms/entries/' . $code . '.json';
        $entries = [];
        if (is_file($entryFile)) {
            $raw = @file_get_contents($entryFile);
            $entries = $raw ? json_decode($raw, true) : [];
        }

        $this->success(['entries' => is_array($entries) ? $entries : []]);
    }

    /**
     * GET getIdRegistry — Get the record ID registry (counter state).
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
     * GET configRecordTypes — Return record type registry configuration.
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
     * POST getNextId — Generate and consume the next record ID.
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
     * GET peekNextId — Preview the next record ID without consuming it.
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
     * GET streamVersion — Stream a specific form version file.
     *
     * Legacy action: `form_version_stream`
     *
     * @return never
     */
    public function streamVersion(): never
    {
        $this->requireAuth();

        $path = trim((string)($this->query('path') ?? ''));
        if ($path === '') $this->error('missing_path', 400);

        $relPath = safe_rel_path($path);
        $absPath = join_in_root($this->rootDir, $relPath);

        if (!is_file($absPath)) {
            $this->error('file_not_found', 404);
        }

        $ext  = portal_get_doc_extension($relPath);
        $mime = portal_stream_mime_type($ext);

        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        header('Content-Type: ' . $mime);
        if (portal_stream_can_inline($ext)) {
            header('Content-Disposition: inline');
        } else {
            header('Content-Disposition: attachment; filename="' . basename($relPath) . '"');
        }
        header('Content-Length: ' . filesize($absPath));
        header('Cache-Control: private, max-age=300');

        readfile($absPath);
        exit;
    }

    /**
     * POST uploadDraft — Upload a workbook file as a form draft.
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

        $code     = strtoupper(trim((string)($_POST['code'] ?? '')));
        $basePath = (string)($_POST['base_path'] ?? ($_POST['path'] ?? ''));
        $note     = trim((string)($_POST['note'] ?? ''));

        if ($code === '') $this->error('missing_code', 400);
        if (trim($basePath) === '') $this->error('missing_base_path', 400);
        if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
            $this->error('missing_file', 400);
        }

        $baseRel      = safe_rel_path($basePath);
        $registryFile = $this->confDir . '/form_control_registry.json';
        $formEntry    = form_registry_get_entry($registryFile, $code, $baseRel);
        if (!is_array($formEntry)) $this->error('form_not_found', 404);

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
}
