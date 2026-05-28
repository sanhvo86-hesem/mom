<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\EmailIntakeAdminCatalogService;
use MOM\Api\Services\EmailIntakeCaseService;
use MOM\Api\Services\EmailIntakeCommitService;
use MOM\Api\Services\EmailIntakeConfigService;
use MOM\Api\Services\EmailIntakeValidationService;
use MOM\Api\Services\EmailIntakeWorkerAuthService;
use MOM\Api\Services\LlmExtractionRouterService;
use MOM\Services\CustomerPurchaseOrderService;
use MOM\Services\OrderService;
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
    private ?EmailIntakeAdminCatalogService $catalogSvc = null;
    private ?EmailIntakeWorkerAuthService $workerAuthSvc = null;
    private ?EmailIntakeCaseService $caseSvc = null;
    private ?EmailIntakeValidationService $validationSvc = null;
    private ?EmailIntakeCommitService $commitSvc = null;
    private ?LlmExtractionRouterService $llmRouterSvc = null;

    private function db(): \MOM\Database\Connection
    {
        $conn = $this->data->getConnection();
        if ($conn === null) {
            throw new \RuntimeException('Database not available (JSON_ONLY mode). Email Intake requires PostgreSQL.');
        }
        return $conn;
    }

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

    private function catalog(): EmailIntakeAdminCatalogService
    {
        if ($this->catalogSvc === null) {
            // Inject EmailIntakeConfigService so IMAP passwords can be encrypted.
            $this->catalogSvc = new EmailIntakeAdminCatalogService($this->db(), $this->svc());
        }
        return $this->catalogSvc;
    }

    private function workerAuth(): EmailIntakeWorkerAuthService
    {
        if ($this->workerAuthSvc === null) {
            $this->workerAuthSvc = new EmailIntakeWorkerAuthService($this->db());
        }
        return $this->workerAuthSvc;
    }

    private function caseSvc(): EmailIntakeCaseService
    {
        if ($this->caseSvc === null) {
            $this->caseSvc = new EmailIntakeCaseService($this->db());
        }
        return $this->caseSvc;
    }

    private function validation(): EmailIntakeValidationService
    {
        if ($this->validationSvc === null) {
            $this->validationSvc = new EmailIntakeValidationService(
                $this->db(),
                $this->caseSvc(),
                $this->svc()
            );
        }
        return $this->validationSvc;
    }

    private function commit(): EmailIntakeCommitService
    {
        if ($this->commitSvc === null) {
            $this->commitSvc = new EmailIntakeCommitService(
                $this->caseSvc(),
                new CustomerPurchaseOrderService($this->dataDir),
                new OrderService($this->dataDir)
            );
        }
        return $this->commitSvc;
    }

    private function actor(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    private function llmRouter(): LlmExtractionRouterService
    {
        if ($this->llmRouterSvc === null) {
            $this->llmRouterSvc = new LlmExtractionRouterService($this->db());
        }
        return $this->llmRouterSvc;
    }

    // ── LLM Model routing (migration 207) ────────────────────────────────

    public function llmProvidersList(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        try {
            $this->success(['providers' => $this->llmRouter()->listProvidersForUi()]);
        } catch (Throwable $e) {
            $this->error('llm_providers_failed', 500, $e->getMessage());
        }
    }

    public function llmRulesList(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        try {
            $this->success(['rules' => $this->llmRouter()->listRulesForUi()]);
        } catch (Throwable $e) {
            $this->error('llm_rules_failed', 500, $e->getMessage());
        }
    }

    public function llmRuleSave(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        try {
            $row = $this->llmRouter()->saveRule($this->jsonBody(), $this->actor($user));
            $this->auditLog('admin_email_intake_llm_rule_save', [
                'scope_type'  => $row['scope_type']  ?? null,
                'scope_value' => $row['scope_value'] ?? null,
            ]);
            $this->success(['rule' => $row, 'saved' => true]);
        } catch (Throwable $e) {
            $this->error('llm_rule_save_failed', 400, $e->getMessage());
        }
    }

    public function llmRuleDelete(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['routing_id'] ?? $body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'routing_id is required.'); }
        try {
            $this->llmRouter()->deleteRule($id);
            $this->auditLog('admin_email_intake_llm_rule_delete', ['routing_id' => $id]);
            $this->success(['deleted' => true, 'routing_id' => $id]);
        } catch (Throwable $e) {
            $this->error('llm_rule_delete_failed', 400, $e->getMessage());
        }
    }

    public function llmHealth(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        try {
            $this->success(['health' => $this->llmRouter()->healthAll()]);
        } catch (Throwable $e) {
            $this->error('llm_health_failed', 500, $e->getMessage());
        }
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
        $this->requireCsrf();

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
        $this->requireCsrf();

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
        $this->requireCsrf();

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
        $this->requireCsrf();

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
        $this->requireCsrf();

        try {
            $config = $this->svc()->loadConfig();
            if (!$config['enabled']) {
                $this->error('intake_disabled', 409,
                    'Email Order Intake is disabled. Enable it in Connection Settings first.');
            }

            // Manual "Chạy ngay" triggers the same code path as the cron
            // (ScheduledJobs::runEmailInboxPoll). That handles both
            // outlook_local heartbeats AND gmail_imap / generic_imap polls
            // across every enabled mailbox row, opens its own poll_run record,
            // and returns aggregate counts.
            require_once dirname(__DIR__) . '/services/ScheduledJobs.php';
            $jobs = new \MOM\Services\ScheduledJobs($this->dataDir, $this->db());
            $result = $jobs->runEmailInboxPoll();

            $this->auditLog('admin_email_intake_trigger', [
                'actor'   => $user['username'] ?? 'unknown',
                'result'  => array_intersect_key($result, array_flip([
                    'status','mode','run_id','mailboxes_imap','fetched','orders_created','errors',
                ])),
            ]);

            $this->success([
                'status'  => $result['status'] ?? 'completed',
                'mode'    => $result['mode']   ?? 'mixed',
                'run_id'  => $result['run_id'] ?? null,
                'fetched' => $result['fetched'] ?? 0,
                'created' => $result['orders_created'] ?? 0,
                'note'    => $result['note']   ?? null,
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
        $this->requireCsrf();

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
        $this->requireCsrf();

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

    // ── Catalog: Mailboxes ───────────────────────────────────────────────

    public function mailboxList(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        try {
            $items = $this->catalog()->listMailboxes();
            $this->success(['mailboxes' => $items, 'total' => count($items)]);
        } catch (Throwable $e) {
            $this->error('mailbox_list_failed', 500, $e->getMessage());
        }
    }

    public function mailboxCreate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        try {
            $row = $this->catalog()->createMailbox($this->jsonBody(), $this->actor($user));
            $this->auditLog('admin_email_intake_mailbox_create', ['mailbox_id' => $row['id'] ?? null]);
            $this->success(['mailbox' => $row, 'added' => true]);
        } catch (Throwable $e) {
            $this->error('mailbox_create_failed', 400, $e->getMessage());
        }
    }

    public function mailboxUpdate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->catalog()->updateMailbox($id, $body, $this->actor($user));
            $this->auditLog('admin_email_intake_mailbox_update', ['mailbox_id' => $id]);
            $this->success(['mailbox' => $row, 'updated' => true]);
        } catch (Throwable $e) {
            $this->error('mailbox_update_failed', 400, $e->getMessage());
        }
    }

    public function mailboxDelete(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $this->catalog()->deleteMailbox($id);
            $this->auditLog('admin_email_intake_mailbox_delete', ['mailbox_id' => $id]);
            $this->success(['deleted' => true, 'id' => $id]);
        } catch (Throwable $e) {
            $this->error('mailbox_delete_failed', 400, $e->getMessage());
        }
    }

    /**
     * POST admin_email_intake_mailbox_poll
     *
     * Trigger an IMAP poll for a single mailbox row. Useful for "test
     * connection" + "fetch latest now" from the admin UI without waiting
     * for the cron heartbeat.
     */
    public function mailboxPoll(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        // Open a poll_run record so admin can see the manual poll in
        // "Nhật ký poll" — without this, only cron-driven polls show up
        // in the log and admins lose visibility into manual triggers.
        $runId  = $this->svc()->openPollRun('manual', $this->actor($user));
        $start  = microtime(true);
        try {
            $row = $this->catalog()->getMailboxWithSecret($id);
            $imap = new \MOM\Api\Services\EmailIntakeImapService(
                $this->db(), $this->catalog(), $this->svc(),
                $this->caseSvc(), $this->validation(), $this->dataDir
            );
            $result = $imap->pollMailbox($row, $this->actor($user));

            $this->svc()->closePollRun($runId, [
                'found'        => (int)($result['fetched'] ?? 0),
                'processed'    => (int)($result['fetched'] ?? 0),
                'skipped'      => (int)($result['skipped'] ?? 0),
                'quarantined'  => 0,
                'created'      => (int)($result['created'] ?? 0),
                'review'       => (int)($result['created'] ?? 0),
                'errors'       => ($result['status'] ?? '') === 'failed' ? 1 : 0,
                'duration_ms'  => (int)((microtime(true) - $start) * 1000),
                'api_calls'    => 1,
                'error_detail' => $result['note'] ?? null,
            ], ($result['status'] ?? 'failed') === 'failed' ? 'failed' : 'completed');
            $this->svc()->updateNextPollAt();

            $this->auditLog('admin_email_intake_mailbox_poll', [
                'mailbox_id' => $id,
                'run_id'     => $runId,
                'status'     => $result['status'] ?? null,
                'fetched'    => $result['fetched'] ?? 0,
                'created'    => $result['created'] ?? 0,
            ]);
            $this->success(['result' => array_merge($result, ['run_id' => $runId])]);
        } catch (Throwable $e) {
            // Close the run as failed so the admin sees the failure in the log
            try {
                $this->svc()->closePollRun($runId, [
                    'errors'       => 1,
                    'duration_ms'  => (int)((microtime(true) - $start) * 1000),
                    'error_detail' => $e->getMessage(),
                ], 'failed');
            } catch (Throwable) { /* avoid masking the original error */ }
            $this->error('mailbox_poll_failed', 400, $e->getMessage());
        }
    }

    // ── Catalog: Header rules ────────────────────────────────────────────

    public function headerRuleList(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        try {
            $items = $this->catalog()->listHeaderRules();
            $this->success(['header_rules' => $items, 'total' => count($items)]);
        } catch (Throwable $e) {
            $this->error('header_rule_list_failed', 500, $e->getMessage());
        }
    }

    public function headerRuleCreate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        try {
            $row = $this->catalog()->createHeaderRule($this->jsonBody(), $this->actor($user));
            $this->auditLog('admin_email_intake_header_rule_create', ['rule_id' => $row['id'] ?? null]);
            $this->success(['header_rule' => $row, 'added' => true]);
        } catch (Throwable $e) {
            $this->error('header_rule_create_failed', 400, $e->getMessage());
        }
    }

    public function headerRuleUpdate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->catalog()->updateHeaderRule($id, $body, $this->actor($user));
            $this->auditLog('admin_email_intake_header_rule_update', ['rule_id' => $id]);
            $this->success(['header_rule' => $row, 'updated' => true]);
        } catch (Throwable $e) {
            $this->error('header_rule_update_failed', 400, $e->getMessage());
        }
    }

    public function headerRuleDelete(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $this->catalog()->deleteHeaderRule($id);
            $this->auditLog('admin_email_intake_header_rule_delete', ['rule_id' => $id]);
            $this->success(['deleted' => true, 'id' => $id]);
        } catch (Throwable $e) {
            $this->error('header_rule_delete_failed', 400, $e->getMessage());
        }
    }

    // ── Catalog: Customer templates ──────────────────────────────────────

    public function templateList(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        try {
            $items = $this->catalog()->listCustomerTemplates();
            $this->success(['templates' => $items, 'total' => count($items)]);
        } catch (Throwable $e) {
            $this->error('template_list_failed', 500, $e->getMessage());
        }
    }

    public function templateCreate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        try {
            $row = $this->catalog()->createCustomerTemplate($this->jsonBody(), $this->actor($user));
            $this->auditLog('admin_email_intake_template_create', ['template_id' => $row['id'] ?? null]);
            $this->success(['template' => $row, 'added' => true]);
        } catch (Throwable $e) {
            $this->error('template_create_failed', 400, $e->getMessage());
        }
    }

    public function templateUpdate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->catalog()->updateCustomerTemplate($id, $body, $this->actor($user));
            $this->auditLog('admin_email_intake_template_update', ['template_id' => $id]);
            $this->success(['template' => $row, 'updated' => true]);
        } catch (Throwable $e) {
            $this->error('template_update_failed', 400, $e->getMessage());
        }
    }

    public function templateDelete(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $this->catalog()->deleteCustomerTemplate($id);
            $this->auditLog('admin_email_intake_template_delete', ['template_id' => $id]);
            $this->success(['deleted' => true, 'id' => $id]);
        } catch (Throwable $e) {
            $this->error('template_delete_failed', 400, $e->getMessage());
        }
    }

    // ── Worker tokens (Admin) ────────────────────────────────────────────

    public function workerTokenList(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        try {
            $items = $this->workerAuth()->listTokens();
            $this->success(['tokens' => $items, 'total' => count($items)]);
        } catch (Throwable $e) {
            $this->error('worker_token_list_failed', 500, $e->getMessage());
        }
    }

    public function workerTokenCreate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        try {
            $result = $this->workerAuth()->createToken($this->jsonBody(), $this->actor($user));
            $this->auditLog('admin_email_intake_worker_token_create', [
                'worker_id' => $result['token']['worker_id'] ?? null,
            ]);
            // Raw secret is returned ONCE
            $this->success([
                'token'        => $result['token'],
                'raw_secret'   => $result['secret'],
                'secret_notice'=> 'This raw secret is shown ONCE. Save it now into the worker secret file; it will never be retrievable again.',
            ]);
        } catch (Throwable $e) {
            $this->error('worker_token_create_failed', 400, $e->getMessage());
        }
    }

    public function workerTokenRotate(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $result = $this->workerAuth()->rotateToken($id, $this->actor($user));
            $this->auditLog('admin_email_intake_worker_token_rotate', ['token_id' => $id]);
            $this->success([
                'token'      => $result['token'],
                'raw_secret' => $result['secret'],
                'secret_notice' => 'New secret is shown ONCE.',
            ]);
        } catch (Throwable $e) {
            $this->error('worker_token_rotate_failed', 400, $e->getMessage());
        }
    }

    public function workerTokenDisable(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->workerAuth()->disableToken($id, $this->actor($user));
            $this->auditLog('admin_email_intake_worker_token_disable', ['token_id' => $id]);
            $this->success(['token' => $row, 'disabled' => true]);
        } catch (Throwable $e) {
            $this->error('worker_token_disable_failed', 400, $e->getMessage());
        }
    }

    public function workerTokenEnable(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->workerAuth()->enableToken($id, $this->actor($user));
            $this->auditLog('admin_email_intake_worker_token_enable', ['token_id' => $id]);
            $this->success(['token' => $row, 'enabled' => true]);
        } catch (Throwable $e) {
            $this->error('worker_token_enable_failed', 400, $e->getMessage());
        }
    }

    // ── Intake cases (review queue) ──────────────────────────────────────

    public function caseList(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, [
            'admin','it_admin',
            'ceo','general_director','production_director',
            'sales_manager','customer_service',
            'planning_manager','production_planner',
            'engineering_manager','quality_manager','supply_chain_manager',
            'cnc_workshop_manager','estimator',
        ]);
        $limit  = max(1, min(200, (int)($this->query('limit') ?? 50)));
        $offset = max(0, (int)($this->query('offset') ?? 0));
        $filters = [];
        foreach (['status','customer_id','customer_po_number','part_number',
                  'revision_number','received_from','received_to','min_confidence'] as $k) {
            $v = $this->query($k);
            if ($v !== null && $v !== '') {
                $filters[$k] = $v;
            }
        }
        try {
            $result = $this->caseSvc()->listCases($filters, $limit, $offset);
            $this->success(['cases' => $result['items'], 'total' => $result['total'],
                            'limit' => $result['limit'], 'offset' => $result['offset']]);
        } catch (Throwable $e) {
            $this->error('case_list_failed', 500, $e->getMessage());
        }
    }

    public function caseDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, [
            'admin','it_admin',
            'ceo','general_director','production_director',
            'sales_manager','customer_service',
            'planning_manager','production_planner',
            'engineering_manager','quality_manager','supply_chain_manager',
            'cnc_workshop_manager','estimator',
        ]);
        $id = (int)($this->query('id') ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $this->success(['case' => $this->caseSvc()->getCase($id)]);
        } catch (Throwable $e) {
            $this->error('case_detail_failed', 404, $e->getMessage());
        }
    }

    public function caseUpdate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, [
            'admin','ceo','general_director',
            'sales_manager','customer_service','engineering_manager','planning_manager',
        ]);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->caseSvc()->updateCase($id, $body, $this->actor($user));
            $this->auditLog('admin_email_intake_case_update', ['case_id' => $id, 'fields' => array_keys($body)]);
            $this->success(['case' => $row, 'updated' => true]);
        } catch (Throwable $e) {
            $this->error('case_update_failed', 400, $e->getMessage());
        }
    }

    public function caseValidate(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, [
            'admin','ceo','general_director','production_director',
            'sales_manager','customer_service',
            'engineering_manager','planning_manager','quality_manager',
        ]);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->validation()->validateCase($id, $this->actor($user));
            $this->auditLog('admin_email_intake_case_validate', ['case_id' => $id, 'status' => $row['status'] ?? null]);
            $this->success(['case' => $row, 'validated' => true]);
        } catch (Throwable $e) {
            $this->error('case_validate_failed', 400, $e->getMessage());
        }
    }

    public function caseApprove(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, [
            'admin','ceo','general_director','production_director',
            'sales_manager','customer_service',
            'engineering_manager','planning_manager','quality_manager',
        ]);
        $this->requireCsrf();
        $body   = $this->jsonBody();
        $id     = (int)($body['id'] ?? 0);
        $reason = isset($body['reason']) ? (string)$body['reason'] : null;
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->caseSvc()->setStatus($id, 'approved', $this->actor($user), $reason);
            $this->auditLog('admin_email_intake_case_approve', ['case_id' => $id]);
            $this->success(['case' => $row, 'approved' => true]);
        } catch (Throwable $e) {
            $this->error('case_approve_failed', 400, $e->getMessage());
        }
    }

    public function caseReject(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, [
            'admin','ceo','general_director','production_director',
            'sales_manager','customer_service',
            'engineering_manager','planning_manager','quality_manager',
        ]);
        $this->requireCsrf();
        $body   = $this->jsonBody();
        $id     = (int)($body['id'] ?? 0);
        $reason = isset($body['reason']) ? (string)$body['reason'] : null;
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $row = $this->caseSvc()->setStatus($id, 'rejected', $this->actor($user), $reason);
            $this->auditLog('admin_email_intake_case_reject', ['case_id' => $id, 'reason' => $reason]);
            $this->success(['case' => $row, 'rejected' => true]);
        } catch (Throwable $e) {
            $this->error('case_reject_failed', 400, $e->getMessage());
        }
    }

    public function caseCommitCustomerPo(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, [
            'admin','ceo','general_director','sales_manager','customer_service',
        ]);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $cpo = $this->commit()->commitCustomerPo($id, $this->actor($user));
            $this->auditLog('admin_email_intake_commit_cpo', [
                'case_id'         => $id,
                'customer_po_id'  => $cpo['customer_po_id'] ?? null,
            ]);
            $this->success(['case_id' => $id, 'customer_po' => $cpo, 'committed' => true]);
        } catch (Throwable $e) {
            $this->error('case_commit_cpo_failed', 400, $e->getMessage());
        }
    }

    public function caseCommitSalesOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, [
            'admin','ceo','general_director','sales_manager','customer_service',
        ]);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $id   = (int)($body['id'] ?? 0);
        if ($id <= 0) { $this->error('missing_id', 400, 'id is required.'); }
        try {
            $so = $this->commit()->commitSalesOrder($id, $this->actor($user));
            $this->auditLog('admin_email_intake_commit_so', [
                'case_id'   => $id,
                'so_number' => $so['so_number'] ?? null,
            ]);
            $this->success(['case_id' => $id, 'sales_order' => $so, 'committed' => true]);
        } catch (Throwable $e) {
            $this->error('case_commit_so_failed', 400, $e->getMessage());
        }
    }

    // ── Worker HMAC endpoints ────────────────────────────────────────────

    private function verifyWorker(string $rawBody): array
    {
        $method  = $this->method();
        $path    = (string)($_SERVER['REQUEST_URI'] ?? '');
        $remote  = $this->clientIp();
        $headers = [];
        foreach ($_SERVER as $k => $v) {
            if (strncmp($k, 'HTTP_', 5) === 0) {
                $name = strtolower(str_replace('_', '-', substr($k, 5)));
                $headers[$name] = (string)$v;
            }
        }
        try {
            return $this->workerAuth()->verifyRequest($method, $path, $rawBody, $headers, $remote);
        } catch (Throwable $e) {
            $this->auditLog('aeoi_worker_auth_failed', ['code' => $e->getMessage(), 'remote' => $remote]);
            $this->error($e->getMessage(), 401, 'Worker authentication failed.');
        }
    }

    public function workerConfig(): never
    {
        $rawBody = file_get_contents('php://input') ?: '';
        $worker  = $this->verifyWorker($rawBody);
        try {
            $cfg = $this->svc()->loadConfig();
            $mboxes = $this->catalog()->listEnabledMailboxes();
            $headers= $this->catalog()->listHeaderRules();
            $templates = $this->catalog()->listCustomerTemplates();

            $this->success([
                'ok'                     => true,
                'worker_id'              => $worker['worker_id'],
                'enabled'                => (bool)($cfg['enabled'] ?? false),
                'polling_interval_minutes' => (int)($cfg['poll_interval_minutes'] ?? 120),
                'runtime_mode'           => 'outlook_local_push',
                'mailboxes'              => array_map(static fn($m) => [
                    'mailbox_id'           => (int)$m['id'],
                    'mailbox_address'      => (string)$m['mailbox_address'],
                    'provider'             => (string)$m['provider'],
                    'folder_path'          => (string)$m['folder_path'],
                    'read_body'            => (bool)$m['read_body'],
                    'read_attachments'     => (bool)$m['read_attachments'],
                    'move_after_processed' => (bool)$m['move_after_processed'],
                ], $mboxes),
                'header_rules'           => array_filter($headers, static fn($h) => !empty($h['enabled'])),
                'templates'              => array_filter($templates, static fn($t) => !empty($t['enabled'])),
                'limits' => [
                    'max_email_age_days'        => 14,
                    'max_attachment_mb'         => 25,
                    'allowed_attachment_types'  => $cfg['allowed_attachment_types'] ?? ['pdf','xlsx','docx'],
                ],
            ]);
        } catch (Throwable $e) {
            $this->error('worker_config_failed', 500, $e->getMessage());
        }
    }

    /**
     * Worker submits an email envelope. The backend revalidates the
     * scope (mailbox + folder + sender), persists the message + any
     * attachments, and creates an intake case in status
     * `extraction_pending`. The worker is expected to submit the AI
     * extraction result via workerSubmitExtractionResult next.
     */
    public function workerSubmitEmailEnvelope(): never
    {
        $rawBody = file_get_contents('php://input') ?: '';
        $worker  = $this->verifyWorker($rawBody);
        $body    = json_decode($rawBody, true) ?: [];

        $mailboxId   = (int)($body['mailbox_id'] ?? 0);
        $providerMsg = trim((string)($body['provider_message_id'] ?? ''));
        $internetMsg = trim((string)($body['internet_message_id'] ?? ''));
        $fromEmail   = strtolower(trim((string)($body['from_email'] ?? '')));
        $subject     = (string)($body['subject'] ?? '');
        $receivedAt  = trim((string)($body['received_at'] ?? '')) ?: date('c');
        $atts        = is_array($body['attachments'] ?? null) ? $body['attachments'] : [];

        if ($mailboxId <= 0 || ($providerMsg === '' && $internetMsg === '')) {
            $this->error('missing_fields', 400, 'mailbox_id and (provider_message_id or internet_message_id) are required.');
        }

        try {
            // Verify mailbox row enabled
            $mbx = $this->catalog()->getMailbox($mailboxId);
            if (!$mbx['enabled']) {
                $this->error('mailbox_disabled', 403, 'Mailbox row is disabled.');
            }

            // Verify sender allowlist
            $allow = $this->svc()->isEmailAllowed($fromEmail);
            if (!$allow['allowed']) {
                $this->auditLog('aeoi_worker_sender_rejected', [
                    'worker'  => $worker['worker_id'],
                    'from'    => $fromEmail,
                ]);
                $this->success(['ok' => true, 'action' => 'ignored', 'reason' => 'sender_not_allowed']);
            }

            // Best-effort document_type / action_type heuristic from subject
            $docType = '';
            $action  = '';
            if (preg_match('/\[(CUSTOMER_PO|PO_CHANGE|PO_CANCEL|EXPEDITE)\]/i', $subject, $m)) {
                $docType = strtoupper($m[1]);
            }
            if (preg_match('/\[(NEW|CHANGE|CANCEL|EXPEDITE)\]/i', $subject, $m)) {
                $action = strtoupper($m[1]);
            }

            // De-dupe: an internet_message_id we've already seen returns the
            // existing case instead of creating a new one. This is the same
            // safety net Phase 1's email_intake_message ledger gives us.
            $msgKey = $internetMsg !== '' ? $internetMsg : ($mailboxId . ':' . $providerMsg);
            $existing = $this->db()->queryOne(
                'SELECT m.id AS msg_id, c.id AS case_id, c.intake_no
                   FROM email_intake_message m
                   LEFT JOIN email_intake_case c ON c.message_id = m.id
                  WHERE m.graph_message_id = :p_key',
                [':p_key' => $msgKey]
            );
            if ($existing) {
                $this->auditLog('aeoi_worker_envelope_duplicate', [
                    'worker'    => $worker['worker_id'],
                    'message_id'=> (int)$existing['msg_id'],
                    'case_id'   => $existing['case_id'] ? (int)$existing['case_id'] : null,
                ]);
                $this->success([
                    'ok'        => true,
                    'action'    => 'duplicate',
                    'case_id'   => $existing['case_id'] ? (int)$existing['case_id'] : null,
                    'intake_no' => $existing['intake_no'] ?? null,
                    'reason'    => 'message_already_processed',
                ]);
            }

            // Persist the Phase 1 email_intake_message row first. The case's
            // message_id FK points back here so the message log + poll log
            // views show the full lifecycle.
            $msgRow = $this->db()->queryOne(
                'INSERT INTO email_intake_message
                    (graph_message_id, internet_message_id, received_at,
                     from_email, from_name, subject,
                     has_attachments, attachment_count, attachment_names,
                     allowlist_match, status, body_preview)
                 VALUES (:p_key, :p_imid, :p_recv,
                         :p_from, :p_name, :p_subj,
                         :p_has, :p_cnt, :p_atts,
                         :p_allow, :p_status, :p_preview)
                 RETURNING id',
                [
                    ':p_key'     => $msgKey,
                    ':p_imid'    => $internetMsg ?: null,
                    ':p_recv'    => $receivedAt,
                    ':p_from'    => $fromEmail,
                    ':p_name'    => trim((string)($body['from_name'] ?? '')) ?: null,
                    ':p_subj'    => $subject,
                    ':p_has'     => count($atts) > 0 ? 'true' : 'false',
                    ':p_cnt'     => count($atts),
                    ':p_atts'    => json_encode(array_map(static fn($a) => (string)($a['filename'] ?? ''), $atts)),
                    ':p_allow'   => (string)($allow['match_type'] ?? 'none'),
                    ':p_status'  => 'extracted',
                    ':p_preview' => mb_substr(trim((string)($body['body_text'] ?? '')), 0, 500),
                ]
            );
            $messageId = (int)$msgRow['id'];

            // Create the intake case linked to the message row
            $case = $this->caseSvc()->createCase([
                'message_id'          => $messageId,
                'mailbox_id'          => $mailboxId,
                'sender_allowlist_id' => $allow['entry_id'] ?? null,
                'status'              => 'extraction_pending',
                'document_type'       => $docType ?: null,
                'action_type'         => $action  ?: null,
            ], $worker['worker_id']);
            $caseId = (int)$case['id'];

            // Mark message as 'processing' — the email_intake_message.status
            // enum (migration 203) is pending | processing | extracted |
            // created | review_queue | quarantined | skipped | failed |
            // duplicate. 'extraction_pending' is a CASE-level status only.
            $this->db()->execute(
                'UPDATE email_intake_message
                    SET status = :p_status, updated_at = NOW()
                  WHERE id = :p_id',
                [':p_status' => 'processing', ':p_id' => $messageId]
            );

            // Persist attachments
            foreach ($atts as $att) {
                $sha256 = trim((string)($att['sha256'] ?? ''));
                if ($sha256 === '' || !preg_match('/^[a-f0-9]{64}$/i', $sha256)) {
                    continue;
                }
                $this->caseSvc()->addAttachment($caseId, $messageId, [
                    'original_filename' => (string)($att['filename'] ?? 'unknown'),
                    'safe_filename'     => (string)($att['safe_filename'] ?? $att['filename'] ?? 'unknown'),
                    'mime_type'         => trim((string)($att['mime_type'] ?? '')) ?: null,
                    'extension'         => strtolower(pathinfo((string)($att['filename'] ?? ''), PATHINFO_EXTENSION)),
                    'file_size_bytes'   => (int)($att['size_bytes'] ?? 0),
                    'sha256'            => strtolower($sha256),
                    'storage_path'      => null,
                    'extracted_text_path' => null,
                    'ocr_status'        => 'not_required',
                ]);
            }

            // Update mailbox last_scan
            $this->catalog()->recordMailboxScan($mailboxId, 'completed', null);

            $this->auditLog('aeoi_worker_envelope_accepted', [
                'worker'    => $worker['worker_id'],
                'case_id'   => $caseId,
                'intake_no' => $case['intake_no'] ?? null,
                'from'      => $fromEmail,
                'subj_hash' => hash('sha256', $subject),
                'att_count' => count($atts),
            ]);

            $this->success([
                'ok'        => true,
                'action'    => 'case_created',
                'case_id'   => $caseId,
                'intake_no' => $case['intake_no'] ?? null,
                'status'    => 'extraction_pending',
            ]);
        } catch (Throwable $e) {
            $this->error('worker_envelope_failed', 500, $e->getMessage());
        }
    }

    /**
     * Worker submits the Claude extraction result for a previously
     * created intake case. We validate the schema_version then run
     * EmailIntakeValidationService and update the case.
     */
    public function workerSubmitExtractionResult(): never
    {
        $rawBody = file_get_contents('php://input') ?: '';
        $worker  = $this->verifyWorker($rawBody);
        $body    = json_decode($rawBody, true) ?: [];

        $caseId  = (int)($body['case_id'] ?? 0);
        $version = (string)($body['schema_version'] ?? '');
        $extract = is_array($body['extracted'] ?? null) ? $body['extracted'] : null;

        if ($caseId <= 0 || $extract === null || $version === '') {
            $this->error('missing_fields', 400, 'case_id, schema_version and extracted are required.');
        }
        if ($version !== 'he-sem-email-intake-extraction-v1') {
            $this->error('unsupported_schema_version', 400, 'Unsupported schema_version: ' . $version);
        }

        try {
            // Store the extraction into the case
            $update = [
                'id'                 => $caseId,
                'document_type'      => $extract['document_type'] ?? null,
                'action_type'        => $extract['action']        ?? null,
                'customer_id'        => $extract['customer']['customer_id']   ?? null,
                'customer_name'      => $extract['customer']['customer_name'] ?? null,
                'customer_po_number' => $extract['purchase_order']['customer_po_number'] ?? null,
                'po_date'            => $extract['purchase_order']['po_date']            ?? null,
                'currency_code'      => $extract['purchase_order']['currency_code']      ?? null,
                'incoterm_code'      => $extract['purchase_order']['incoterm_code']      ?? null,
                'payment_term_code'  => $extract['purchase_order']['payment_term_code']  ?? null,
                'overall_confidence' => $extract['overall_confidence']                   ?? null,
                'field_confidence'   => $extract['field_confidence'] ?? [],
                'extracted_json'     => $extract,
            ];
            $this->caseSvc()->updateCase($caseId, $update, $worker['worker_id']);

            // Persist per-line rows (re-create from extraction)
            foreach ((array)($extract['lines'] ?? []) as $line) {
                if (empty($line['part_number']) || (float)($line['quantity'] ?? 0) <= 0) {
                    continue;
                }
                $this->caseSvc()->addLine($caseId, [
                    'line_no'              => $line['line_no'] ?? '',
                    'customer_part_number' => $line['customer_part_number'] ?? '',
                    'part_number'          => $line['part_number'],
                    'part_description'     => $line['part_description'] ?? '',
                    'revision_number'      => $line['revision_number'] ?? '',
                    'customer_revision'    => $line['customer_revision'] ?? '',
                    'drawing_revision'     => $line['drawing_revision'] ?? '',
                    'quantity'             => (float)($line['quantity'] ?? 0),
                    'uom'                  => $line['uom'] ?? 'EA',
                    'requested_delivery_date' => $line['requested_delivery_date'] ?? '',
                    'delivery_address'     => $line['delivery_address'] ?? '',
                    'unit_price'           => $line['unit_price'] ?? null,
                    'line_total'           => $line['line_total'] ?? null,
                    'field_confidence'     => $line['field_confidence'] ?? [],
                    'evidence'             => $line['evidence'] ?? [],
                ]);
            }

            // Run validation pipeline
            $row = $this->validation()->validateCase($caseId, $worker['worker_id']);

            $this->auditLog('aeoi_worker_extraction_accepted', [
                'worker'  => $worker['worker_id'],
                'case_id' => $caseId,
                'status'  => $row['status'] ?? null,
            ]);
            $this->success(['ok' => true, 'case' => $row]);
        } catch (Throwable $e) {
            $this->error('worker_extraction_failed', 500, $e->getMessage());
        }
    }
}
