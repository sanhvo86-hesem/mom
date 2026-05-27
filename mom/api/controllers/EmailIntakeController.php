<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\EmailIntakeConfigService;
use Throwable;

/**
 * EmailIntakeController — Admin panel for the AI Email Order Intake (AEOI) module.
 *
 * All endpoints require admin role. The controller delegates to
 * EmailIntakeConfigService for all persistence; no business logic lives here.
 *
 * Routes (all registered under admin_email_intake_* action keys):
 *
 *   GET  admin_email_intake_config_get          → configGet()
 *   POST admin_email_intake_config_save         → configSave()
 *   GET  admin_email_intake_allowlist_get       → allowlistGet()
 *   POST admin_email_intake_allowlist_add       → allowlistAdd()
 *   POST admin_email_intake_allowlist_update    → allowlistUpdate()
 *   POST admin_email_intake_allowlist_delete    → allowlistDelete()
 *   POST admin_email_intake_trigger             → triggerPoll()
 *   POST admin_email_intake_test_parse          → testParse()
 *   GET  admin_email_intake_poll_log            → pollLog()
 *   GET  admin_email_intake_message_log         → messageLog()
 *   GET  admin_email_intake_quarantine_get      → quarantineGet()
 *   POST admin_email_intake_quarantine_action   → quarantineAction()
 *
 * @package MOM\Api\Controllers
 */
class EmailIntakeController extends BaseController
{
    private ?EmailIntakeConfigService $configSvc = null;

    private function svc(): EmailIntakeConfigService
    {
        if ($this->configSvc === null) {
            $conn = $this->data->getConnection();
            if ($conn === null) {
                throw new \RuntimeException('Database not available (JSON_ONLY mode). Email Intake requires PostgreSQL.');
            }
            $this->configSvc = new EmailIntakeConfigService($conn);
        }
        return $this->configSvc;
    }

    // ── Config ────────────────────────────────────────────────────────────

    /**
     * GET admin_email_intake_config_get
     * Returns the full config (secret excluded, virtual `secret_configured` bool added).
     */
    public function configGet(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $config = $this->svc()->loadConfig();
            $this->success(['config' => $config]);
        } catch (Throwable $e) {
            $this->error('email_intake_config_load_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_email_intake_config_save
     *
     * Body: any subset of editable config fields (see EmailIntakeConfigService::saveConfig).
     * Include `m365_client_secret` to update the encrypted credential.
     */
    public function configSave(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $body = $this->jsonBody();
        if (empty($body)) {
            $this->error('empty_payload', 400, 'Request body is required.');
        }

        try {
            $updated = $this->svc()->saveConfig($body, $user['username'] ?? 'unknown');
            $this->auditLog('admin_email_intake_config_save', [
                'fields_touched' => array_keys($body),
                'secret_updated' => !empty($body['m365_client_secret']),
            ]);
            $this->success(['config' => $updated, 'saved' => true]);
        } catch (Throwable $e) {
            $this->error('email_intake_config_save_failed', 500, $e->getMessage());
        }
    }

    // ── Allowlist ─────────────────────────────────────────────────────────

    /**
     * GET admin_email_intake_allowlist_get
     * Returns all allowlist entries (active + inactive).
     */
    public function allowlistGet(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $entries = $this->svc()->getAllowlist();
            $this->success(['entries' => $entries, 'total' => count($entries)]);
        } catch (Throwable $e) {
            $this->error('allowlist_load_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_email_intake_allowlist_add
     *
     * Body: { entry_type, value, label?, customer_id?, notes? }
     */
    public function allowlistAdd(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $body = $this->jsonBody();
        $type  = trim((string)($body['entry_type'] ?? ''));
        $value = trim((string)($body['value'] ?? ''));

        if ($type === '' || $value === '') {
            $this->error('missing_fields', 400, 'entry_type and value are required.');
        }

        try {
            $entry = $this->svc()->addAllowlistEntry(
                $type,
                $value,
                isset($body['label'])       ? (string)$body['label']       : null,
                isset($body['customer_id']) ? (string)$body['customer_id'] : null,
                isset($body['notes'])       ? (string)$body['notes']       : null,
                $user['username'] ?? 'unknown'
            );
            $this->auditLog('admin_email_intake_allowlist_add', ['type' => $type, 'value' => $value]);
            $this->success(['entry' => $entry, 'added' => true]);
        } catch (Throwable $e) {
            $this->error('allowlist_add_failed', 400, $e->getMessage());
        }
    }

    /**
     * POST admin_email_intake_allowlist_update
     *
     * Body: { id, label?, customer_id?, active?, notes? }
     */
    public function allowlistUpdate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            $this->error('missing_id', 400, 'id is required.');
        }

        try {
            $entry = $this->svc()->updateAllowlistEntry($id, $body, $user['username'] ?? 'unknown');
            $this->auditLog('admin_email_intake_allowlist_update', ['id' => $id]);
            $this->success(['entry' => $entry, 'updated' => true]);
        } catch (Throwable $e) {
            $this->error('allowlist_update_failed', 400, $e->getMessage());
        }
    }

    /**
     * POST admin_email_intake_allowlist_delete
     *
     * Body: { id }
     * Hard-deletes the entry.
     */
    public function allowlistDelete(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            $this->error('missing_id', 400, 'id is required.');
        }

        try {
            $this->svc()->deleteAllowlistEntry($id);
            $this->auditLog('admin_email_intake_allowlist_delete', ['id' => $id]);
            $this->success(['deleted' => true, 'id' => $id]);
        } catch (Throwable $e) {
            $this->error('allowlist_delete_failed', 400, $e->getMessage());
        }
    }

    // ── Manual poll trigger ───────────────────────────────────────────────

    /**
     * POST admin_email_intake_trigger
     *
     * Queues a manual poll run. Returns a stub run_id; actual processing
     * happens asynchronously via the jobs queue or synchronously in dev mode.
     */
    public function triggerPoll(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $config = $this->svc()->loadConfig();
            if (!$config['enabled']) {
                $this->error('intake_disabled', 409,
                    'Email Order Intake is disabled. Enable it in Connection Settings first.');
            }
            if (empty($config['m365_tenant_id']) || empty($config['intake_mailbox'])) {
                $this->error('intake_not_configured', 409,
                    'M365 connection is not configured. Set Tenant ID and Mailbox first.');
            }

            $runId = $this->svc()->openPollRun('manual', $user['username'] ?? 'unknown');
            $this->auditLog('admin_email_intake_trigger', ['run_id' => $runId]);

            // Close immediately as a stub — real processing delegated to
            // M365MailboxService which runs as a background job (sprint 2).
            $this->svc()->closePollRun($runId, [
                'found' => 0, 'processed' => 0, 'skipped' => 0,
                'quarantined' => 0, 'created' => 0, 'review' => 0,
                'errors' => 0, 'duration_ms' => 0, 'api_calls' => 0,
                'error_detail' => 'M365MailboxService not yet provisioned — scheduled for sprint 2.',
            ], 'skipped');

            $this->success([
                'run_id'  => $runId,
                'status'  => 'queued',
                'message' => 'Poll queued. M365 connection service will be available in sprint 2.',
            ]);
        } catch (Throwable $e) {
            $this->error('trigger_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_email_intake_test_parse
     *
     * Dry-run: accepts a raw email body (and optional base64-encoded PDF text)
     * and returns the extraction result without writing to DB or creating orders.
     *
     * Body: { email_body: string, attachment_text?: string }
     */
    public function testParse(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $body      = $this->jsonBody();
        $emailBody = trim((string)($body['email_body'] ?? ''));
        if ($emailBody === '') {
            $this->error('missing_email_body', 400, 'email_body is required.');
        }

        // Stub response — OrderEmailParserService (Claude API) provisioned in sprint 2.
        $this->success([
            'dry_run'  => true,
            'result'   => null,
            'message'  => 'Test parse will be available when OrderEmailParserService (Claude API) is provisioned in sprint 2.',
            'received' => [
                'email_body_length'      => strlen($emailBody),
                'has_attachment_text'    => !empty($body['attachment_text']),
            ],
        ]);
    }

    // ── Log viewers ───────────────────────────────────────────────────────

    /**
     * GET admin_email_intake_poll_log
     * Query params: limit (default 50), offset (default 0)
     */
    public function pollLog(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $limit  = max(1, min(200, (int)($this->query('limit')  ?? 50)));
        $offset = max(0, (int)($this->query('offset') ?? 0));

        try {
            $log = $this->svc()->getPollRunLog($limit, $offset);
            $this->success($log);
        } catch (Throwable $e) {
            $this->error('poll_log_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET admin_email_intake_message_log
     * Query params: status? (filter), limit, offset
     */
    public function messageLog(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $status = $this->query('status');
        $limit  = max(1, min(200, (int)($this->query('limit')  ?? 50)));
        $offset = max(0, (int)($this->query('offset') ?? 0));

        try {
            $log = $this->svc()->getMessageLog($status, $limit, $offset);
            $this->success($log);
        } catch (Throwable $e) {
            $this->error('message_log_failed', 500, $e->getMessage());
        }
    }

    // ── Quarantine ────────────────────────────────────────────────────────

    /**
     * GET admin_email_intake_quarantine_get
     * Query params: all? (1 = include reviewed), limit, offset
     */
    public function quarantineGet(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $unreviewedOnly = ($this->query('all') !== '1');
        $limit  = max(1, min(200, (int)($this->query('limit')  ?? 50)));
        $offset = max(0, (int)($this->query('offset') ?? 0));

        try {
            $queue = $this->svc()->getQuarantineQueue($unreviewedOnly, $limit, $offset);
            $this->success($queue);
        } catch (Throwable $e) {
            $this->error('quarantine_get_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST admin_email_intake_quarantine_action
     *
     * Body: { id: int, action: 'allow'|'block'|'ignore', notes?: string }
     */
    public function quarantineAction(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        $body   = $this->jsonBody();
        $qid    = (int)($body['id']     ?? 0);
        $action = trim((string)($body['action'] ?? ''));
        $notes  = isset($body['notes']) ? (string)$body['notes'] : null;

        if ($qid <= 0 || $action === '') {
            $this->error('missing_fields', 400, 'id and action are required.');
        }

        try {
            $this->svc()->reviewQuarantineItem($qid, $action, $notes, $user['username'] ?? 'unknown');
            $this->auditLog('admin_email_intake_quarantine_action', [
                'quarantine_id' => $qid,
                'action'        => $action,
            ]);
            $this->success(['reviewed' => true, 'id' => $qid, 'action' => $action]);
        } catch (Throwable $e) {
            $this->error('quarantine_action_failed', 400, $e->getMessage());
        }
    }
}
