<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;
use Throwable;

/**
 * EmailIntakeImapService — IMAP-based email ingest for Gmail, generic
 * IMAP servers and any provider that speaks IMAP4rev1 + TLS.
 *
 * Why a separate service:
 *   The local Outlook worker (PowerShell + COM) is the right pattern for
 *   Windows desktops, but most customers don't host Outlook locally. They
 *   want the MOM portal itself to poll their mailbox on schedule. IMAP is
 *   the universal wire protocol that gets us there without per-provider
 *   OAuth setup. Gmail (with 2FA + App Password) and Microsoft 365 (with
 *   "Authenticated SMTP" allowed) both support it; so do Yahoo, Zoho,
 *   Fastmail, cPanel mail, etc.
 *
 * Hard rules (mirrored from the worker push path):
 *   • Only mailbox/folder rows the admin enabled may be polled.
 *   • Sender allowlist is re-checked before a case is created.
 *   • Attachments are SHA-256 hashed BEFORE the case row is written so
 *     dedupe via the UNIQUE(sha256) constraint on email_intake_attachment
 *     kicks in across providers.
 *   • Raw email body is never logged. Only a 500-char preview is stored.
 *   • The IMAP password is decrypted via EmailIntakeConfigService::
 *     decryptSecret() in-memory and discarded immediately after the
 *     connection opens.
 *
 * Idempotency:
 *   We persist email_intake_mailbox.imap_last_uid after every batch. The
 *   next poll fetches UID > last_uid only. If the server's UIDVALIDITY
 *   changes (e.g. mailbox was rebuilt), we reset to UID 1 and let the
 *   normal email_intake_message UNIQUE(graph_message_id) constraint
 *   deduplicate.
 *
 * @package MOM\Api\Services
 */
final class EmailIntakeImapService
{
    /** Hard caps so a single poll can't tie up the worker forever. */
    private const MAX_MESSAGES_PER_POLL = 25;
    private const MAX_BODY_BYTES        = 1_048_576;   // 1 MB
    private const MAX_ATTACHMENT_BYTES  = 26_214_400;  // 25 MB

    private ?EmailIntakeHeaderRuleService $headerRulesSvc = null;

    public function __construct(
        private readonly Connection                    $db,
        private readonly EmailIntakeAdminCatalogService $catalog,
        private readonly EmailIntakeConfigService       $config,
        private readonly EmailIntakeCaseService         $cases,
        private readonly EmailIntakeValidationService   $validation,
        private readonly string                        $dataDir = ''
    ) {
        if (!extension_loaded('imap')) {
            throw new RuntimeException('PHP imap extension is not loaded on this server. Run: sudo apt install php-imap.');
        }
    }

    /** Lazy accessor for the shared header parser. */
    private function headerRules(): EmailIntakeHeaderRuleService
    {
        if ($this->headerRulesSvc === null) {
            $this->headerRulesSvc = new EmailIntakeHeaderRuleService($this->db);
        }
        return $this->headerRulesSvc;
    }

    /**
     * Poll a single mailbox row. Caller is ScheduledJobs (or the manual
     * "Run now" admin trigger). Returns a per-mailbox result summary.
     */
    public function pollMailbox(array $mailbox, string $actor = 'system.aeoi_imap'): array
    {
        $mailboxId = (int)$mailbox['id'];
        $startTime = microtime(true);

        if (!$mailbox['enabled']) {
            return $this->mkResult($mailboxId, 'skipped', 'mailbox_disabled', $startTime);
        }
        if (!in_array((string)($mailbox['provider'] ?? ''), ['gmail_imap', 'generic_imap'], true)) {
            return $this->mkResult($mailboxId, 'skipped', 'provider_not_imap', $startTime);
        }

        try {
            $conn = $this->openConnection($mailbox);
        } catch (Throwable $e) {
            $this->catalog->recordMailboxScan($mailboxId, 'connect_failed', $e->getMessage());
            return $this->mkResult($mailboxId, 'failed', 'connect_failed: ' . $e->getMessage(), $startTime);
        }

        try {
            $result = $this->fetchAndIngest($conn, $mailbox, $actor);
            $note = sprintf(
                'Fetched %d, created %d, skipped %d, errors %d (cursor preserved on errors).',
                $result['fetched'], $result['created'], $result['skipped'],
                $result['errors'] ?? 0
            );
            $finalStatus = ($result['errors'] ?? 0) > 0 ? 'partial' : 'completed';
            $this->catalog->recordMailboxScan($mailboxId, $finalStatus, $note);
            return array_merge(
                $this->mkResult($mailboxId, $finalStatus, $note, $startTime),
                $result
            );
        } catch (Throwable $e) {
            $this->catalog->recordMailboxScan($mailboxId, 'poll_failed', $e->getMessage());
            return $this->mkResult($mailboxId, 'failed', $e->getMessage(), $startTime);
        } finally {
            if (is_resource($conn) || $conn instanceof \IMAP\Connection) {
                @imap_close($conn);
            }
        }
    }

    /**
     * Polls every enabled IMAP-flavoured mailbox. Returns the aggregate
     * summary the scheduled-jobs framework can write into the poll_run row.
     */
    public function pollAll(string $actor = 'system.aeoi_imap'): array
    {
        $totals = ['mailboxes' => 0, 'fetched' => 0, 'created' => 0, 'skipped' => 0, 'errors' => 0, 'detail' => []];
        $rows = $this->catalog->listEnabledMailboxes();
        foreach ($rows as $m) {
            if (!in_array((string)($m['provider'] ?? ''), ['gmail_imap', 'generic_imap'], true)) {
                continue;
            }
            $totals['mailboxes']++;
            // P0-02: pollMailbox requires imap_password_enc to open the
            // IMAP connection. getMailbox() strips that field for API safety
            // (P0-03), so we MUST use getMailboxWithSecret() here. Using
            // getMailbox() previously caused every polled mailbox to throw
            // "missing IMAP password" silently.
            $full = $this->catalog->getMailboxWithSecret((int)$m['id']);
            $r = $this->pollMailbox($full, $actor);
            $totals['fetched'] += (int)($r['fetched'] ?? 0);
            $totals['created'] += (int)($r['created'] ?? 0);
            $totals['skipped'] += (int)($r['skipped'] ?? 0);
            $totals['errors']  += (int)($r['errors']  ?? 0);
            if (($r['status'] ?? '') === 'failed') {
                $totals['errors']++;
            }
            $totals['detail'][] = [
                'mailbox_id' => $r['mailbox_id'],
                'status'     => $r['status'],
                'note'       => $r['note'],
                'fetched'    => $r['fetched']  ?? 0,
                'created'    => $r['created']  ?? 0,
            ];
        }
        return $totals;
    }

    // ── Internals ────────────────────────────────────────────────────────

    /**
     * Open an IMAP connection. The mailbox row is the full DB record (we
     * need the encrypted password). On return the caller MUST eventually
     * imap_close() the connection.
     *
     * @return \IMAP\Connection
     */
    /** Cache the connection string so fetchAndIngest can pass it to imap_status. */
    private string $lastMailboxStr = '';

    private function openConnection(array $mailbox)
    {
        $host = trim((string)($mailbox['imap_host'] ?? ''));
        $port = (int)($mailbox['imap_port'] ?? 0);
        $enc  = strtolower(trim((string)($mailbox['imap_encryption'] ?? 'ssl')));
        $user = trim((string)($mailbox['imap_username'] ?? ''));
        $pwdEnc = (string)($mailbox['imap_password_enc'] ?? '');

        if ($host === '' || $port <= 0 || $user === '' || $pwdEnc === '') {
            throw new RuntimeException('IMAP host/port/username/password missing.');
        }

        // Build the IMAP connection string per imap_open() docs:
        //   {host:port/flag1/flag2}folder
        $flags = ['imap'];
        if ($enc === 'ssl') {
            $flags[] = 'ssl';
        } elseif ($enc === 'tls' || $enc === 'starttls') {
            $flags[] = 'tls';
        } else {
            $flags[] = 'notls';
        }
        if (empty($mailbox['imap_validate_cert'])) {
            $flags[] = 'novalidate-cert';
        }
        $folder = trim((string)($mailbox['folder_path'] ?? 'INBOX')) ?: 'INBOX';

        $mailboxStr = sprintf('{%s:%d/%s}%s',
            $host, $port, implode('/', $flags), $folder);
        $this->lastMailboxStr = $mailboxStr;

        $pwd = $this->config->decryptSecret($pwdEnc);
        if ($pwd === null || $pwd === '') {
            throw new RuntimeException('IMAP password decryption failed — secret missing or APP_SECRET changed.');
        }

        // imap_open spits errors as warnings; collect them via a local handler
        $errors = [];
        set_error_handler(static function ($n, $msg) use (&$errors) {
            $errors[] = $msg;
            return true;
        });
        $conn = false;
        try {
            $conn = imap_open($mailboxStr, $user, $pwd, OP_READONLY, 1, [
                'DISABLE_AUTHENTICATOR' => ['GSSAPI', 'NTLM'],
            ]);
        } finally {
            restore_error_handler();
            // Clear any imap_alerts/imap_errors PHP collected
            @imap_errors();
            @imap_alerts();
            // Wipe plaintext password from local scope
            unset($pwd);
        }

        if ($conn === false) {
            $detail = $errors !== [] ? implode('; ', array_slice($errors, 0, 3)) : 'unknown';
            throw new RuntimeException('IMAP connect failed: ' . $detail);
        }
        return $conn;
    }

    /**
     * Fetch new messages since imap_last_uid, validate sender allowlist,
     * download attachments, hand each accepted message off to the case
     * service for ingestion + validation. Persists imap_last_uid at the
     * end so the next run is incremental.
     *
     * @param \IMAP\Connection|resource $conn
     */
    private function fetchAndIngest($conn, array $mailbox, string $actor): array
    {
        $mailboxId = (int)$mailbox['id'];
        $lastUid   = (int)($mailbox['imap_last_uid'] ?? 0);

        // UIDVALIDITY safety net — if the server's UIDVALIDITY changed
        // since our last poll, the UID space has been reset and we have
        // to forget our cursor. imap_status() takes the mailbox PATH
        // (the same {host:port/flags}folder string we passed to imap_open)
        // — NOT the connection object. PHP 8.1+ refuses to cast
        // IMAP\Connection to string.
        $status = $this->lastMailboxStr !== ''
            ? (imap_status($conn, $this->lastMailboxStr, SA_UIDVALIDITY | SA_UIDNEXT) ?: null)
            : null;
        if ($status !== null && isset($status->uidvalidity)) {
            $serverUidvalidity = (int)$status->uidvalidity;
            $ourUidvalidity    = (int)($mailbox['imap_last_uidvalidity'] ?? 0);
            if ($ourUidvalidity !== 0 && $ourUidvalidity !== $serverUidvalidity) {
                $lastUid = 0;
            }
            $mailbox['imap_last_uidvalidity'] = $serverUidvalidity;
        }

        // PHP's imap_search() does NOT accept the raw IMAP "UID a:b"
        // criterion — it returns false with "Unknown search criterion: UID".
        // Workaround: fetch ALL UIDs and filter in PHP. The set is bounded
        // by the mailbox size and we cap to MAX_MESSAGES_PER_POLL anyway.
        $allUids = imap_search($conn, 'ALL', SE_UID);
        if (!is_array($allUids) || $allUids === []) {
            $allUids = [];
        }
        if (!is_array($allUids) || $allUids === []) {
            $this->persistCursor($mailboxId, $lastUid, $mailbox['imap_last_uidvalidity'] ?? null);
            return ['fetched' => 0, 'created' => 0, 'skipped' => 0];
        }

        // Keep only UIDs strictly greater than our cursor, sorted ascending
        // so we always advance the cursor monotonically.
        $uids = array_values(array_filter(
            array_map('intval', $allUids),
            static fn(int $u) => $u > $lastUid
        ));
        sort($uids, SORT_NUMERIC);

        if ($uids === []) {
            $this->persistCursor($mailboxId, $lastUid, $mailbox['imap_last_uidvalidity'] ?? null);
            return ['fetched' => 0, 'created' => 0, 'skipped' => 0];
        }

        // First-run safeguard: if the cursor was 0 (brand-new mailbox row)
        // and the inbox is large, skip ancient mail by taking the NEWEST
        // MAX_MESSAGES_PER_POLL only. Subsequent polls naturally process
        // any new mail past the advanced cursor.
        if ($lastUid === 0 && count($uids) > self::MAX_MESSAGES_PER_POLL) {
            $uids = array_slice($uids, -self::MAX_MESSAGES_PER_POLL);
        } else {
            $uids = array_slice($uids, 0, self::MAX_MESSAGES_PER_POLL);
        }

        $fetched    = 0;
        $created    = 0;
        $skipped    = 0;
        $errors     = 0;
        $maxSeenUid = $lastUid;

        foreach ($uids as $uid) {
            $uid = (int)$uid;
            if ($uid <= $lastUid) {
                continue;
            }
            $fetched++;

            try {
                $msgNo = imap_msgno($conn, $uid);
                if (!$msgNo) {
                    $skipped++;
                    continue;
                }

                $headerInfo = imap_headerinfo($conn, $msgNo);
                $structure  = imap_fetchstructure($conn, $uid, FT_UID);
                if (!$headerInfo || !$structure) {
                    $skipped++;
                    continue;
                }

                $fromEmail = $this->extractFromEmail($headerInfo);
                if ($fromEmail === '') {
                    $skipped++;
                    continue;
                }

                $allow = $this->config->isEmailAllowed($fromEmail);
                if (!$allow['allowed']) {
                    $skipped++;
                    if ($uid > $maxSeenUid) { $maxSeenUid = $uid; }
                    continue;
                }

                $subject     = $this->decodeMimeHeader($headerInfo->subject ?? '');
                $fromName    = $this->decodeMimeHeader($headerInfo->fromaddress ?? '');
                $receivedAt  = isset($headerInfo->udate)
                    ? gmdate('c', (int)$headerInfo->udate)
                    : gmdate('c');
                $internetMsgId = trim((string)($headerInfo->message_id ?? ''), '<>');

                // Pull body parts: plain text body + attachments with sha256
                $bodyText    = $this->extractBodyText($conn, $uid, $structure);
                $attachments = $this->extractAttachments($conn, $uid, $structure);

                // Idempotency: skip if we already have this internet_message_id
                $existing = $this->db->queryOne(
                    'SELECT id FROM email_intake_message WHERE graph_message_id = :p_key',
                    [':p_key' => $internetMsgId !== '' ? $internetMsgId : ($mailboxId . ':uid:' . $uid)]
                );
                if ($existing) {
                    $skipped++;
                    if ($uid > $maxSeenUid) { $maxSeenUid = $uid; }
                    continue;
                }

                // Persist email_intake_message + case
                $msgKey = $internetMsgId !== '' ? $internetMsgId : ($mailboxId . ':uid:' . $uid);
                $msgRow = $this->db->queryOne(
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
                        ':p_imid'    => $internetMsgId ?: null,
                        ':p_recv'    => $receivedAt,
                        ':p_from'    => $fromEmail,
                        ':p_name'    => $fromName ?: null,
                        ':p_subj'    => $subject,
                        ':p_has'     => count($attachments) > 0 ? 'true' : 'false',
                        ':p_cnt'     => count($attachments),
                        ':p_atts'    => json_encode(array_map(static fn($a) => (string)$a['original_filename'], $attachments)),
                        ':p_allow'   => (string)($allow['match_type'] ?? 'none'),
                        // email_intake_message.status enum (migration 203):
                        // pending | processing | extracted | created | review_queue
                        // | quarantined | skipped | failed | duplicate.
                        // 'pending' = received, awaiting extraction; the case
                        // row's status drives the wider workflow.
                        ':p_status'  => 'pending',
                        ':p_preview' => mb_substr($bodyText, 0, 500),
                    ]
                );
                $messageId = (int)$msgRow['id'];

                // Best-effort subject heuristic for docType/action
                $docType = $action = '';
                if (preg_match('/\[(CUSTOMER_PO|PO_CHANGE|PO_CANCEL|EXPEDITE)\]/i', $subject, $m)) {
                    $docType = strtoupper($m[1]);
                }
                if (preg_match('/\[(NEW|CHANGE|CANCEL|EXPEDITE)\]/i', $subject, $m)) {
                    $action = strtoupper($m[1]);
                }

                // Parse the [HESEM-ORDER-INTAKE]…[/HESEM-ORDER-INTAKE] body
                // block — admin-controlled header that supplies the structured
                // fields without needing a Claude API call. Returns []
                // (and we fall back to subject-regex only values) if the
                // body has no header block.
                $hdr = $this->headerRules()->parseHeaderBlock($bodyText);

                // Header policy enforcement — match an enabled rule against
                // (subject, body) and apply its missing_header_action when
                // required fields/markers/AI-Process aren't satisfied.
                // Policy outcomes:
                //   ok                 → proceed normally
                //   ignore             → skip the email, no case
                //   security_hold      → create case but flag for manual review
                //   reject             → skip with explicit reject log
                //   allow_llm_fallback → fall through to the LLM router
                //
                // P0-05: production default is fail-closed. If admin has set
                // up at least one enabled header rule and none matches, we
                // CANNOT silently LLM-fallback — that bypasses the gate.
                // Only allow the legacy LLM fallback when:
                //   - no enabled header rule exists at all (greenfield install
                //     where admin hasn't configured rules yet), OR
                //   - the matched rule explicitly says allow_llm_fallback, OR
                //   - the dev flag email_intake_config.aeoi_dev_allow_llm_fallback
                //     is set (not exposed in admin UI; for local dev only).
                $matchedRule = $this->headerRules()->matchRule($subject, $bodyText);
                if ($matchedRule !== null) {
                    $check = $this->headerRules()->validateParsedHeader($matchedRule, $hdr);
                    $policyOutcome = (string)($check['outcome'] ?? 'security_hold');
                    $policyReason  = (string)($check['reason']  ?? 'header check produced no reason');
                } else {
                    $enabledRules = (int)($this->db->queryOne(
                        'SELECT COUNT(*) AS n FROM email_intake_header_rule WHERE enabled = TRUE',
                        []
                    )['n'] ?? 0);
                    if ($enabledRules === 0) {
                        // Greenfield install — admin has not configured rules.
                        $policyOutcome = 'allow_llm_fallback';
                        $policyReason  = 'no enabled header rule on this install';
                    } else {
                        $policyOutcome = 'security_hold';
                        $policyReason  = 'header rules are configured but none matched the email';
                    }
                }

                if ($policyOutcome === 'ignore') {
                    @error_log('[AEOI policy] uid=' . $uid . ' IGNORE: ' . $policyReason);
                    $skipped++;
                    if ($uid > $maxSeenUid) { $maxSeenUid = $uid; }
                    continue;
                }
                if ($policyOutcome === 'reject') {
                    @error_log('[AEOI policy] uid=' . $uid . ' REJECT: ' . $policyReason);
                    $skipped++;
                    if ($uid > $maxSeenUid) { $maxSeenUid = $uid; }
                    continue;
                }

                $claudeExtract     = null;
                $extractionAttempts = [];
                // Honour the rule policy: only allow the LLM router when the
                // header was valid (ok) OR the rule explicitly permits the
                // LLM fallback. security_hold cases still extract but get
                // tagged below; reject/ignore short-circuited above.
                $allowLlmRouter = ($policyOutcome === 'ok')
                                   || ($policyOutcome === 'security_hold')
                                   || ($policyOutcome === 'allow_llm_fallback');

                if ($allowLlmRouter && $hdr['customer_id'] === '' && $hdr['customer_po_number'] === '') {
                    // Pre-extract text from PDF attachments. Result is fed
                    // into the LLM prompt as `attachment_text`. We process
                    // the FIRST pdf only (most POs are a single document)
                    // and cache the extracted text on the attachment row
                    // after addAttachment runs.
                    $pdfText  = '';
                    $pdfFname = '';
                    foreach ($attachments as $att) {
                        if (($att['extension'] ?? '') === 'pdf' && !empty($att['_bytes'])) {
                            try {
                                $pdfSvc  = new PdfExtractorService();
                                $pdfRes  = $pdfSvc->extractFromBytes((string)$att['_bytes'], (string)$att['original_filename']);
                                $pdfText = $pdfRes['text'];
                                $pdfFname = (string)$att['original_filename'];
                                break;
                            } catch (Throwable $e) {
                                @error_log('[AEOI PDF] uid=' . $uid . ' file=' . $att['original_filename'] . ' err=' . $e->getMessage());
                            }
                        }
                    }

                    // Choose tier: pdf-attached → extraction_pdf, else default.
                    $tier = $pdfText !== '' ? 'extraction_pdf' : 'extraction_default';

                    // P1-03: look up the customer template matching this
                    // sender/document type/file type so the LLM gets the
                    // admin-curated hints. At this point $hdr['customer_id']
                    // is empty by the outer if-guard, so we lean on the
                    // sender allowlist's customer_id linkage when available.
                    $tmplCustomerId = (string)($allow['customer_id'] ?? '');
                    $tmplDocType    = $hdr['doc_type'] !== ''
                                        ? $hdr['doc_type']
                                        : ($docType !== '' ? $docType : 'CUSTOMER_PO');
                    $tmplFileType   = $pdfText !== '' ? 'pdf' : 'email';
                    $customerTemplate = null;
                    if ($tmplCustomerId !== '') {
                        $customerTemplate = $this->db->queryOne(
                            'SELECT id, template_name,
                                    po_number_hints, part_number_hints,
                                    revision_hints, quantity_hints,
                                    delivery_date_hints, ship_to_hints,
                                    unit_price_hints, line_table_required,
                                    min_confidence_overall, min_confidence_required_field
                               FROM email_intake_customer_template
                              WHERE enabled = TRUE
                                AND customer_id   = :p_cust
                                AND document_type = :p_doc
                                AND (file_type = :p_ft OR file_type = \'any\')
                              ORDER BY (file_type = :p_ft) DESC, id DESC
                              LIMIT 1',
                            [
                                ':p_cust' => $tmplCustomerId,
                                ':p_doc'  => $tmplDocType,
                                ':p_ft'   => $tmplFileType,
                            ]
                        );
                    }
                    $tmplHints = [];
                    if ($customerTemplate) {
                        foreach (['po_number_hints','part_number_hints','revision_hints',
                                  'quantity_hints','delivery_date_hints','ship_to_hints',
                                  'unit_price_hints'] as $k) {
                            $decoded = is_string($customerTemplate[$k] ?? null)
                                ? (json_decode((string)$customerTemplate[$k], true) ?: [])
                                : (is_array($customerTemplate[$k] ?? null) ? $customerTemplate[$k] : []);
                            if ($decoded !== []) {
                                $tmplHints[$k] = $decoded;
                            }
                        }
                        if (!empty($customerTemplate['line_table_required'])) {
                            $tmplHints['line_table_required'] = true;
                        }
                    }

                    try {
                        $router  = new LlmExtractionRouterService($this->db);
                        $context = [
                            'from_email'          => $fromEmail,
                            'subject'             => $subject,
                            'received_at'         => $receivedAt,
                            'internet_message_id' => $internetMsgId,
                            'attachment_filename' => $pdfFname,
                            'attachment_text'     => $pdfText,
                        ];
                        if ($customerTemplate) {
                            $context['customer_template'] = [
                                'template_id'   => (int)$customerTemplate['id'],
                                'template_name' => (string)$customerTemplate['template_name'],
                                'customer_id'   => $tmplCustomerId,
                                'hints'         => $tmplHints,
                            ];
                        }
                        $outcome = $router->extract($bodyText, $context, $tier);
                        $claudeExtract      = $outcome['result'];
                        $extractionAttempts = $outcome['attempts'];
                        // Bridge LLM fields into the same $hdr shape so
                        // the rest of the flow doesn't branch.
                        $hdr['doc_type']           = (string)($claudeExtract['document_type'] ?? '');
                        $hdr['action']             = (string)($claudeExtract['action'] ?? '');
                        $hdr['customer_id']        = (string)($claudeExtract['customer']['customer_id'] ?? '');
                        $hdr['customer_name']      = (string)($claudeExtract['customer']['customer_name'] ?? '');
                        $hdr['customer_po_number'] = (string)($claudeExtract['purchase_order']['customer_po_number'] ?? '');
                        $hdr['po_date']            = (string)($claudeExtract['purchase_order']['po_date'] ?? '');
                        $hdr['currency_code']      = (string)($claudeExtract['purchase_order']['currency_code'] ?? '');
                        $hdr['incoterm_code']      = (string)($claudeExtract['purchase_order']['incoterm_code'] ?? '');
                        $hdr['payment_term_code']  = (string)($claudeExtract['purchase_order']['payment_term_code'] ?? '');
                        $hdr['ship_to_name']       = (string)($claudeExtract['ship_to']['ship_to_name'] ?? '');
                        $hdr['ship_to_addr']       = (string)($claudeExtract['ship_to']['delivery_address'] ?? '');
                    } catch (Throwable $e) {
                        @error_log('[AEOI LLM] uid=' . $uid . ' err=' . $e->getMessage());
                    }

                    // Stash for case extracted_json + attachment cache below.
                    $pdfTextCache = $pdfText;
                } else {
                    $pdfTextCache = '';
                }

                $case = $this->cases->createCase([
                    'message_id'          => $messageId,
                    'mailbox_id'          => $mailboxId,
                    'sender_allowlist_id' => $allow['entry_id'] ?? null,
                    'status'              => $policyOutcome === 'security_hold'
                                              ? 'security_hold'
                                              : 'extraction_pending',
                    'document_type'       => $hdr['doc_type']   ?: ($docType ?: null),
                    'action_type'         => $hdr['action']     ?: ($action  ?: null),
                    'customer_id'         => $hdr['customer_id']        ?: null,
                    'customer_name'       => $hdr['customer_name']      ?: null,
                    'customer_po_number'  => $hdr['customer_po_number'] ?: null,
                ], $actor);
                $caseId = (int)$case['id'];

                // Patch additional case fields the createCase signature
                // doesn't accept (po_date, currency, incoterm, payment_term).
                if ($hdr['po_date'] !== '' || $hdr['currency_code'] !== ''
                    || $hdr['incoterm_code'] !== '' || $hdr['payment_term_code'] !== '') {
                    $this->cases->updateCase($caseId, [
                        'po_date'           => $hdr['po_date']           ?: null,
                        'currency_code'     => $hdr['currency_code']     ?: null,
                        'incoterm_code'     => $hdr['incoterm_code']     ?: null,
                        'payment_term_code' => $hdr['payment_term_code'] ?: null,
                        'extracted_json'    => [
                            'email_header_block'  => $hdr['raw_block'],
                            'parsed_header'       => $hdr['parsed'],
                            'ship_to'             => [
                                'name'    => $hdr['ship_to_name'],
                                'address' => $hdr['ship_to_addr'],
                            ],
                            'ai_process'          => $hdr['ai_process'],
                        ],
                    ], $actor);
                }

                // Parse body line items section (best-effort regex).
                // Pattern: "Line NN ... Part Number: X ... Revision: Y ... Quantity: Z EA ... Need Date: D"
                $lines = $this->headerRules()->parseLineItems($bodyText);
                foreach ($lines as $line) {
                    $this->cases->addLine($caseId, $line);
                }

                // P0-06: persist attachment bytes to private storage so the
                // reviewer can re-download the source PO during case review,
                // and so audit trails have the original file (not just a
                // sha256). P0-07: detect duplicate sha256 BEFORE addAttachment
                // so we can flip the case to duplicate_hold instead of
                // silently sharing the row with another case.
                $duplicateRefs = [];
                $dangerousAtts = [];
                foreach ($attachments as $att) {
                    $persistable = $att;
                    $bytes = $persistable['_bytes'] ?? '';
                    unset($persistable['_bytes']);

                    $ext = strtolower((string)($persistable['extension']
                        ?? pathinfo((string)($persistable['original_filename'] ?? ''), PATHINFO_EXTENSION)));
                    $dangerous = [
                        'exe','bat','cmd','ps1','vbs','js','msi','dll',
                        'jar','scr','com','sh','php','phtml','cgi','pl',
                    ];
                    if (in_array($ext, $dangerous, true)) {
                        $dangerousAtts[] = (string)($persistable['original_filename'] ?? '');
                        continue;
                    }

                    // Duplicate detection across cases.
                    $sha = strtolower((string)($persistable['sha256'] ?? ''));
                    if ($sha !== '') {
                        $dupRow = $this->db->queryOne(
                            'SELECT a.id AS attachment_id, a.case_id, c.intake_no
                               FROM email_intake_attachment a
                               JOIN email_intake_case c ON c.id = a.case_id
                              WHERE a.sha256 = :p_sha AND a.case_id <> :p_case
                              ORDER BY a.id ASC LIMIT 1',
                            [':p_sha' => $sha, ':p_case' => $caseId]
                        );
                        if ($dupRow) {
                            $duplicateRefs[] = [
                                'case_id'       => (int)$dupRow['case_id'],
                                'intake_no'     => (string)($dupRow['intake_no'] ?? ''),
                                'attachment_id' => (int)$dupRow['attachment_id'],
                            ];
                        }
                    }

                    $persistable['storage_path'] = $this->persistAttachmentBytes(
                        $caseId,
                        (string)$bytes,
                        $sha,
                        (string)($persistable['original_filename'] ?? 'attachment'),
                        $ext
                    );
                    $persistable['ocr_status'] = $persistable['storage_path'] === null
                        ? 'pending'
                        : 'not_required';

                    $this->cases->addAttachment($caseId, $messageId, $persistable);
                }

                if ($dangerousAtts !== []) {
                    $this->cases->setStatus($caseId, 'security_hold', $actor,
                        'dangerous_attachment_extension');
                    $this->cases->recordCheck($caseId, [
                        'check_code' => 'attachment_dangerous',
                        'severity'   => 'blocker',
                        'result'     => 'fail',
                        'message'    => 'Attachment with dangerous extension blocked: '
                                      . implode(', ', $dangerousAtts),
                        'details'    => ['filenames' => $dangerousAtts],
                    ]);
                } elseif ($duplicateRefs !== []) {
                    $this->cases->setStatus($caseId, 'duplicate_hold', $actor,
                        'duplicate_attachment_detected');
                    $this->cases->recordCheck($caseId, [
                        'check_code' => 'attachment_duplicate',
                        'severity'   => 'blocker',
                        'result'     => 'fail',
                        'message'    => 'Attachment sha256 already recorded against another case.',
                        'details'    => ['existing' => $duplicateRefs],
                    ]);
                }

                // Cache the pdftotext output on the first PDF attachment row
                // so a re-validation doesn't re-shell out to pdftotext.
                // NOTE: PostgreSQL does NOT support UPDATE ... LIMIT directly,
                // so we drive the row id through a CTE. Picking the lowest id
                // (ORDER BY id LIMIT 1) gives deterministic "first PDF" pick.
                if (($pdfTextCache ?? '') !== '') {
                    $this->db->execute(
                        'WITH target AS (
                             SELECT id
                               FROM email_intake_attachment
                              WHERE case_id = :p_case
                                AND extension = :p_ext
                                AND pdf_text_extracted IS NULL
                              ORDER BY id
                              LIMIT 1
                         )
                         UPDATE email_intake_attachment AS a
                            SET pdf_text_extracted    = :p_text,
                                pdf_text_extracted_at = NOW(),
                                pdf_text_chars        = :p_chars
                           FROM target
                          WHERE a.id = target.id',
                        [
                            ':p_text'  => $pdfTextCache,
                            ':p_chars' => mb_strlen($pdfTextCache),
                            ':p_case'  => $caseId,
                            ':p_ext'   => 'pdf',
                        ]
                    );
                }

                // Auto-create master-data records from extracted PO data so
                // downstream validation + commit don't fail on "unknown
                // customer" / "unknown part". Audit trail goes to
                // aeoi_auto_created_record.
                if (is_array($claudeExtract ?? null) && $this->dataDir !== '') {
                    try {
                        $auto = new AeoiAutoCreateService($this->db, $this->dataDir);
                        $auto->createMissingMasterData($caseId, $claudeExtract, $actor);
                    } catch (Throwable $e) {
                        @error_log('[AEOI auto-create] case=' . $caseId . ' err=' . $e->getMessage());
                    }
                }

                // Advance status: extraction_pending → extracted, then run the
                // 20-check validation pipeline which sets the final state
                // (commit_ready / needs_review / security_hold / etc.).
                //
                // Cases created under security_hold (header rule policy)
                // stay at security_hold — validation does NOT auto-clear
                // the security gate. Admin must review via the quarantine
                // queue and explicitly release before the case proceeds.
                if ($policyOutcome !== 'security_hold') {
                    try {
                        $this->cases->updateCase($caseId, ['status' => 'extracted'], $actor);
                        $this->validation->validateCase($caseId, $actor);
                    } catch (Throwable $e) {
                        @error_log('[AEOI validate] case=' . $caseId . ' err=' . $e->getMessage());
                    }
                } else {
                    @error_log('[AEOI policy] case=' . $caseId . ' SECURITY_HOLD: ' . $policyReason);
                }

                $created++;
                if ($uid > $maxSeenUid) { $maxSeenUid = $uid; }
            } catch (Throwable $e) {
                // P0-08: do NOT advance maxSeenUid past an unhandled exception.
                // If the failure is transient (DB hiccup, IMAP timeout mid-
                // fetch), advancing the cursor would silently drop the email
                // — the next poll would never see it again. Leave it for retry.
                @error_log('[AEOI IMAP] uid=' . $uid . ' err=' . $e->getMessage()
                    . ' (cursor NOT advanced; will retry next poll)');
                $errors++;
            }
        }

        // P0-09: persistCursor now records the actual fetched count so the
        // mailbox row's imap_messages_fetched column matches reality. The
        // previous code incremented by 1 per cursor save (poll-run count).
        $this->persistCursor($mailboxId, $maxSeenUid, $mailbox['imap_last_uidvalidity'] ?? null, $fetched);
        return ['fetched' => $fetched, 'created' => $created, 'skipped' => $skipped, 'errors' => $errors];
    }

    private function persistCursor(int $mailboxId, int $newUid, mixed $uidValidity, int $fetched = 0): void
    {
        $this->db->execute(
            'UPDATE email_intake_mailbox
                SET imap_last_uid         = :p_uid,
                    imap_last_uidvalidity = :p_uidv,
                    imap_messages_fetched = imap_messages_fetched + :p_fetched,
                    updated_at            = NOW()
              WHERE id = :p_id',
            [
                ':p_uid'     => $newUid,
                ':p_uidv'    => $uidValidity !== null ? (int)$uidValidity : null,
                ':p_fetched' => max(0, $fetched),
                ':p_id'      => $mailboxId,
            ]
        );
    }

    private function extractFromEmail(object $headerInfo): string
    {
        $from = $headerInfo->from ?? [];
        if (!is_array($from) || $from === []) {
            return '';
        }
        $first = $from[0];
        $mb = isset($first->mailbox) ? (string)$first->mailbox : '';
        $host = isset($first->host) ? (string)$first->host : '';
        if ($mb === '' || $host === '') {
            return '';
        }
        return strtolower($mb . '@' . $host);
    }

    private function decodeMimeHeader(string $raw): string
    {
        if ($raw === '') {
            return '';
        }
        $parts = imap_mime_header_decode($raw);
        if (!is_array($parts)) {
            return $raw;
        }
        $out = '';
        foreach ($parts as $p) {
            $charset = strtoupper((string)($p->charset ?? 'utf-8'));
            $text    = (string)($p->text ?? '');
            if ($charset !== 'UTF-8' && $charset !== 'DEFAULT') {
                $conv = @iconv($charset, 'UTF-8//TRANSLIT', $text);
                if ($conv !== false) { $text = $conv; }
            }
            $out .= $text;
        }
        return $out;
    }

    private function extractBodyText($conn, int $uid, object $structure): string
    {
        // Walk parts looking for text/plain; if absent, fall back to text/html stripped.
        $candidate = $this->findTextPart($structure, '');
        if ($candidate === null) {
            return '';
        }
        [$section, $encoding, $charset, $isHtml] = $candidate;
        $raw = imap_fetchbody($conn, $uid, $section ?: '1', FT_UID | FT_PEEK);
        if ($raw === false || $raw === '') {
            return '';
        }
        $decoded = $this->decodeBody($raw, $encoding);
        if ($charset !== '' && strtoupper($charset) !== 'UTF-8') {
            $conv = @iconv($charset, 'UTF-8//TRANSLIT', $decoded);
            if ($conv !== false) { $decoded = $conv; }
        }
        if ($isHtml) {
            $decoded = trim(strip_tags($decoded));
        }
        if (strlen($decoded) > self::MAX_BODY_BYTES) {
            $decoded = substr($decoded, 0, self::MAX_BODY_BYTES);
        }
        return $decoded;
    }

    /**
     * @return array{0:string,1:string,2:string,3:bool}|null  [section, encoding, charset, isHtml]
     */
    private function findTextPart(object $structure, string $prefix): ?array
    {
        $mainType = (int)($structure->type ?? 0);
        $subType  = strtolower((string)($structure->subtype ?? ''));

        if ($mainType === 0 /* text */) {
            $section = $prefix === '' ? '1' : $prefix;
            $isHtml  = ($subType === 'html');
            $enc     = strtolower((string)($structure->encoding ?? ''));
            $charset = '';
            foreach ((array)($structure->parameters ?? []) as $p) {
                if (strtolower((string)($p->attribute ?? '')) === 'charset') {
                    $charset = (string)$p->value;
                }
            }
            return [$section, $this->mapEncoding($enc), $charset, $isHtml];
        }

        $parts = $structure->parts ?? [];
        if (!is_array($parts)) { return null; }
        // Prefer text/plain. Track HTML fallback.
        $htmlFallback = null;
        foreach ($parts as $idx => $p) {
            $section = ($prefix === '' ? (string)($idx + 1) : $prefix . '.' . ($idx + 1));
            $r = $this->findTextPart($p, $section);
            if ($r === null) { continue; }
            if ($r[3] === false) { return $r; }   // text/plain wins
            if ($htmlFallback === null) { $htmlFallback = $r; }
        }
        return $htmlFallback;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function extractAttachments($conn, int $uid, object $structure): array
    {
        $out = [];
        $this->walkAttachments($conn, $uid, $structure, '', $out);
        return $out;
    }

    private function walkAttachments($conn, int $uid, object $part, string $prefix, array &$out): void
    {
        $disp = strtolower((string)($part->ifdisposition ? ($part->disposition ?? '') : ''));
        $filename = $this->paramValue($part, 'filename') ?: $this->dparamValue($part, 'filename');
        $isAttachment = ($disp === 'attachment') || ($filename !== '');
        $parts = $part->parts ?? null;

        if ($isAttachment && $filename !== '' && !is_array($parts)) {
            $section = $prefix === '' ? '1' : $prefix;
            $raw = imap_fetchbody($conn, $uid, $section, FT_UID | FT_PEEK);
            if ($raw !== false && $raw !== '') {
                $enc = strtolower((string)($part->encoding ?? ''));
                $decoded = $this->decodeBody($raw, $this->mapEncoding($enc));
                $size = strlen($decoded);
                if ($size > self::MAX_ATTACHMENT_BYTES) {
                    return; // skip oversize attachment
                }
                $sha = hash('sha256', $decoded);
                $safe = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?: 'attachment';
                $ext  = strtolower(pathinfo($filename, PATHINFO_EXTENSION) ?: '');
                $mime = $this->mimeType($part);

                $out[] = [
                    'original_filename'   => $filename,
                    'safe_filename'       => $safe,
                    'mime_type'           => $mime,
                    'extension'           => $ext,
                    'file_size_bytes'     => $size,
                    'sha256'              => $sha,
                    'storage_path'        => null,
                    'extracted_text_path' => null,
                    'ocr_status'          => 'not_required',
                    // Decoded bytes retained in-memory for the duration of
                    // this poll. The pollMailbox loop reads them to run
                    // pdftotext on PDFs, then discards. NEVER persisted.
                    '_bytes'              => $decoded,
                ];
            }
            return;
        }

        if (is_array($parts)) {
            foreach ($parts as $idx => $sub) {
                $section = ($prefix === '' ? (string)($idx + 1) : $prefix . '.' . ($idx + 1));
                $this->walkAttachments($conn, $uid, $sub, $section, $out);
            }
        }
    }

    private function paramValue(object $part, string $name): string
    {
        $params = (array)($part->parameters ?? []);
        foreach ($params as $p) {
            if (strtolower((string)($p->attribute ?? '')) === strtolower($name)) {
                return (string)($p->value ?? '');
            }
        }
        return '';
    }

    private function dparamValue(object $part, string $name): string
    {
        $params = (array)($part->dparameters ?? []);
        foreach ($params as $p) {
            if (strtolower((string)($p->attribute ?? '')) === strtolower($name)) {
                return (string)($p->value ?? '');
            }
        }
        return '';
    }

    private function mimeType(object $part): string
    {
        $primary = ['text','multipart','message','application','audio','image','video','model','other'];
        $type = $primary[(int)($part->type ?? 0)] ?? 'application';
        $sub  = strtolower((string)($part->subtype ?? 'octet-stream'));
        return $type . '/' . $sub;
    }

    private function mapEncoding(string $enc): string
    {
        // PHP imap returns encoding as int sometimes; we receive string here
        switch ($enc) {
            case '0': case '7bit':            return '7bit';
            case '1': case '8bit':            return '8bit';
            case '2': case 'binary':          return 'binary';
            case '3': case 'base64':          return 'base64';
            case '4': case 'quoted-printable':return 'quoted-printable';
            default: return $enc ?: '7bit';
        }
    }

    private function decodeBody(string $raw, string $encoding): string
    {
        switch ($encoding) {
            case 'base64':           return (string)base64_decode($raw, true);
            case 'quoted-printable': return quoted_printable_decode($raw);
            default:                 return $raw;
        }
    }

    private function mkResult(int $mailboxId, string $status, ?string $note, float $startTime): array
    {
        return [
            'mailbox_id'  => $mailboxId,
            'status'      => $status,
            'note'        => $note,
            'duration_ms' => (int)((microtime(true) - $startTime) * 1000),
            'fetched'     => 0,
            'created'     => 0,
            'skipped'     => 0,
        ];
    }

    /**
     * P0-06: write attachment bytes to private storage and return the
     * storage_path (relative to dataDir). Returns null when bytes can't
     * be persisted — the caller still records the metadata row so the
     * reviewer sees the filename + sha256.
     */
    private function persistAttachmentBytes(
        int    $caseId,
        string $bytes,
        string $sha256,
        string $filename,
        string $ext
    ): ?string {
        if ($bytes === '') return null;

        // Verify hash matches bytes when both are provided.
        if (preg_match('/^[a-f0-9]{64}$/', $sha256)) {
            if (!hash_equals($sha256, hash('sha256', $bytes))) {
                return null;
            }
        } else {
            $sha256 = hash('sha256', $bytes);
        }

        $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $filename);
        $safe = substr((string)$safe, 0, 80) ?: 'attachment';

        $baseDir = rtrim($this->dataDir, '/') . '/private/email-intake/attachments/' . $caseId;
        if (!is_dir($baseDir) && !@mkdir($baseDir, 0750, true) && !is_dir($baseDir)) {
            return null;
        }

        $fname = $sha256 . '_' . $safe;
        $abs   = $baseDir . '/' . $fname;
        if (file_put_contents($abs, $bytes, LOCK_EX) === false) {
            return null;
        }
        @chmod($abs, 0640);

        return 'private/email-intake/attachments/' . $caseId . '/' . $fname;
    }

}
