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
}
