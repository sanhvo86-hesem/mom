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

    public function __construct(
        private readonly Connection                    $db,
        private readonly EmailIntakeAdminCatalogService $catalog,
        private readonly EmailIntakeConfigService       $config,
        private readonly EmailIntakeCaseService         $cases,
        /** @phpstan-ignore-next-line property.unused — reserved for the
         *  auto-validate-after-extraction path; harmless to inject now. */
        private readonly EmailIntakeValidationService   $validation
    ) {
        if (!extension_loaded('imap')) {
            throw new RuntimeException('PHP imap extension is not loaded on this server. Run: sudo apt install php-imap.');
        }
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
            $this->catalog->recordMailboxScan($mailboxId, 'completed',
                sprintf('Fetched %d, created %d, skipped %d.',
                    $result['fetched'], $result['created'], $result['skipped']));
            return array_merge(
                $this->mkResult($mailboxId, 'completed', null, $startTime),
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
            $full = $this->catalog->getMailbox((int)$m['id']);
            $r = $this->pollMailbox($full, $actor);
            $totals['fetched'] += (int)($r['fetched'] ?? 0);
            $totals['created'] += (int)($r['created'] ?? 0);
            $totals['skipped'] += (int)($r['skipped'] ?? 0);
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

        $fetched = 0;
        $created = 0;
        $skipped = 0;
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
                // (and we fall back to Claude API or subject-regex only) if the
                // body has no header block.
                $hdr = $this->parseBodyHeaderBlock($bodyText);

                // If no header block and Claude API is configured, try LLM
                // extraction as a fallback. Cheap-first, AI-second policy:
                // the well-templated emails get parsed deterministically;
                // free-form ones fall through to Claude.
                $claudeExtract = null;
                if ($hdr['customer_id'] === ''
                    && $hdr['customer_po_number'] === ''
                    && OrderEmailParserService::isConfigured()) {
                    try {
                        $parser = new OrderEmailParserService();
                        $claudeExtract = $parser->extractOrder($bodyText, [
                            'from_email'          => $fromEmail,
                            'subject'             => $subject,
                            'received_at'         => $receivedAt,
                            'internet_message_id' => $internetMsgId,
                        ]);
                        // Bridge Claude's fields into the same $hdr shape so
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
                        @error_log('[AEOI Claude] uid=' . $uid . ' err=' . $e->getMessage());
                        $claudeExtract = null; // fall through to empty
                    }
                }

                $case = $this->cases->createCase([
                    'message_id'          => $messageId,
                    'mailbox_id'          => $mailboxId,
                    'sender_allowlist_id' => $allow['entry_id'] ?? null,
                    'status'              => 'extraction_pending',
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
                $lines = $this->parseBodyLineItems($bodyText);

                // If body regex found nothing and Claude API gave us lines,
                // use those instead.
                if ($lines === [] && is_array($claudeExtract ?? null)
                    && isset($claudeExtract['lines']) && is_array($claudeExtract['lines'])) {
                    foreach ($claudeExtract['lines'] as $cl) {
                        if (empty($cl['part_number']) || (float)($cl['quantity'] ?? 0) <= 0) {
                            continue;
                        }
                        $lines[] = [
                            'line_no'                 => (string)($cl['line_no'] ?? ''),
                            'customer_part_number'    => (string)($cl['customer_part_number'] ?? ''),
                            'part_number'             => (string)$cl['part_number'],
                            'part_description'        => (string)($cl['part_description'] ?? ''),
                            'revision_number'         => (string)($cl['revision_number'] ?? ''),
                            'customer_revision'       => (string)($cl['customer_revision'] ?? ''),
                            'drawing_revision'        => (string)($cl['drawing_revision'] ?? ''),
                            'quantity'                => (float)$cl['quantity'],
                            'uom'                     => (string)($cl['uom'] ?? 'EA'),
                            'requested_delivery_date' => $this->normaliseIsoDate((string)($cl['requested_delivery_date'] ?? '')),
                            'delivery_address'        => (string)($cl['delivery_address'] ?? ''),
                            'ship_to_site_id'         => '',
                            'unit_price'              => isset($cl['unit_price']) ? (float)$cl['unit_price'] : null,
                            'line_total'              => isset($cl['line_total']) ? (float)$cl['line_total'] : null,
                            'field_confidence'        => (array)($cl['field_confidence'] ?? []),
                            'evidence'                => (array)($cl['evidence'] ?? ['source' => 'claude_api']),
                        ];
                    }
                }

                foreach ($lines as $line) {
                    $this->cases->addLine($caseId, $line);
                }

                foreach ($attachments as $att) {
                    $this->cases->addAttachment($caseId, $messageId, $att);
                }

                $created++;
                if ($uid > $maxSeenUid) { $maxSeenUid = $uid; }
            } catch (Throwable $e) {
                @error_log('[AEOI IMAP] uid=' . $uid . ' err=' . $e->getMessage());
                $skipped++;
                if ($uid > $maxSeenUid) { $maxSeenUid = $uid; }
            }
        }

        $this->persistCursor($mailboxId, $maxSeenUid, $mailbox['imap_last_uidvalidity'] ?? null);
        return ['fetched' => $fetched, 'created' => $created, 'skipped' => $skipped];
    }

    private function persistCursor(int $mailboxId, int $newUid, mixed $uidValidity): void
    {
        $this->db->execute(
            'UPDATE email_intake_mailbox
                SET imap_last_uid         = :p_uid,
                    imap_last_uidvalidity = :p_uidv,
                    imap_messages_fetched = imap_messages_fetched + 1,
                    updated_at            = NOW()
              WHERE id = :p_id',
            [
                ':p_uid'  => $newUid,
                ':p_uidv' => $uidValidity !== null ? (int)$uidValidity : null,
                ':p_id'   => $mailboxId,
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

    // ── Body header / line item parsers ──────────────────────────────────
    //
    // These are the "Phase 2.5" parsers that close the GPT Pro gap of
    // unparsed [HESEM-ORDER-INTAKE] block. They don't replace the full
    // Claude API extraction (Phase 3) — they handle the standard
    // admin-controlled header format the user templates with.

    /**
     * Parse the [HESEM-ORDER-INTAKE]...[/HESEM-ORDER-INTAKE] block from
     * a plain-text email body. Returns a normalized map of the fields
     * we care about — always populated, missing keys default to ''.
     *
     * @return array{
     *   doc_type:string, action:string, customer_id:string, customer_name:string,
     *   customer_po_number:string, po_date:string, currency_code:string,
     *   incoterm_code:string, payment_term_code:string,
     *   ship_to_name:string, ship_to_addr:string,
     *   ai_process:string, raw_block:string, parsed:array<string,string>
     * }
     */
    private function parseBodyHeaderBlock(string $bodyText): array
    {
        $out = [
            'doc_type'           => '',
            'action'             => '',
            'customer_id'        => '',
            'customer_name'      => '',
            'customer_po_number' => '',
            'po_date'            => '',
            'currency_code'      => '',
            'incoterm_code'      => '',
            'payment_term_code'  => '',
            'ship_to_name'       => '',
            'ship_to_addr'       => '',
            'ai_process'         => '',
            'raw_block'          => '',
            'parsed'             => [],
        ];
        if ($bodyText === '') {
            return $out;
        }

        // Tolerant regex: any whitespace between markers, multi-line
        if (!preg_match(
            '/\[HESEM-ORDER-INTAKE\](.*?)\[\/HESEM-ORDER-INTAKE\]/is',
            $bodyText,
            $m
        )) {
            return $out;
        }

        $block = trim((string)$m[1]);
        $out['raw_block'] = mb_substr($block, 0, 2000);

        // Each non-empty line is Key: Value
        $parsed = [];
        foreach (preg_split('/\r?\n/', $block) ?: [] as $rawLine) {
            $line = trim($rawLine);
            if ($line === '') { continue; }
            if (!preg_match('/^([A-Za-z0-9 _\-]+)\s*:\s*(.*)$/u', $line, $kv)) {
                continue;
            }
            $key = strtolower(str_replace(' ', '-', trim($kv[1])));
            $val = trim($kv[2]);
            if ($val !== '') {
                $parsed[$key] = $val;
            }
        }
        $out['parsed'] = $parsed;

        // Map keys to our normalised case columns. Accept several
        // synonyms so the user can template loosely.
        $get = static fn(string ...$keys): string => (function () use ($keys, $parsed) {
            foreach ($keys as $k) {
                if (isset($parsed[$k]) && $parsed[$k] !== '') { return $parsed[$k]; }
            }
            return '';
        })();

        $out['doc_type']           = strtoupper($get('doc-type', 'document-type'));
        $out['action']             = strtoupper($get('action'));
        $out['customer_id']        = strtoupper($get('customer-code', 'customer-id', 'customer'));
        $out['customer_name']      = $get('customer-name');
        $out['customer_po_number'] = $get('po-no', 'po-number', 'customer-po', 'customer-po-number');
        $out['po_date']            = $this->normaliseIsoDate($get('po-date'));
        $out['currency_code']      = strtoupper($get('currency', 'currency-code'));
        $out['incoterm_code']      = strtoupper($get('incoterm', 'incoterm-code'));
        $out['payment_term_code']  = strtoupper($get('payment-term', 'payment-terms'));
        $out['ship_to_name']       = $get('ship-to-name', 'ship-to');
        $out['ship_to_addr']       = $get('ship-to-addr', 'ship-to-address');
        $out['ai_process']         = strtoupper($get('ai-process'));

        return $out;
    }

    /**
     * Parse "Line NN" blocks from the body. Each block looks like:
     *
     *   Line 10
     *     Part Number:   HSM-2200-A
     *     Revision:      Rev B
     *     Description:   ...
     *     Quantity:      40 EA
     *     Unit Price:    USD 125.00
     *     Need Date:     2026-07-15
     *
     * The grammar is intentionally loose — labels can be any case,
     * indentation arbitrary, ":" or "-" or "—" separator accepted.
     * Lines that don't have a Part Number are skipped (validation gate).
     *
     * @return array<int, array<string, mixed>>
     */
    private function parseBodyLineItems(string $bodyText): array
    {
        if ($bodyText === '') {
            return [];
        }

        // Strip the header block out so its keys don't confuse the parser
        $bodyText = preg_replace(
            '/\[HESEM-ORDER-INTAKE\].*?\[\/HESEM-ORDER-INTAKE\]/is',
            '', $bodyText
        ) ?? $bodyText;

        // Split on "Line NN" markers. The first chunk before any "Line N"
        // is preamble; ignore it.
        $chunks = preg_split('/^\s*Line\s+(\d+)\s*\r?\n/m', $bodyText, -1, PREG_SPLIT_DELIM_CAPTURE);
        if (!is_array($chunks) || count($chunks) < 3) {
            return [];
        }

        $out = [];
        // chunks[0] = preamble, then pairs [lineNo, body, lineNo, body, ...]
        for ($i = 1; $i + 1 < count($chunks); $i += 2) {
            $lineNo = (string)$chunks[$i];
            $body   = (string)$chunks[$i + 1];
            $row    = $this->extractLineFields($lineNo, $body);
            if ($row['part_number'] !== '' && (float)$row['quantity'] > 0) {
                $out[] = $row;
            }
        }
        return $out;
    }

    /**
     * Extract Key: Value pairs from a single line block.
     * Returns the array shape EmailIntakeCaseService::addLine expects.
     *
     * @return array{
     *   line_no:string, customer_part_number:string, part_number:string,
     *   part_description:string, revision_number:string, customer_revision:string,
     *   drawing_revision:string, quantity:float, uom:string,
     *   requested_delivery_date:string, delivery_address:string,
     *   ship_to_site_id:string, unit_price:?float, line_total:?float,
     *   field_confidence:array<string,float>, evidence:array<string,string>
     * }
     */
    private function extractLineFields(string $lineNo, string $body): array
    {
        $fields = [];
        foreach (preg_split('/\r?\n/', $body) ?: [] as $rawLine) {
            $line = trim($rawLine);
            if ($line === '') { continue; }
            // Stop at the next "==" section header or "Best regards" etc.
            if (preg_match('/^(==|Best regards|Regards|Sincerely|Total)/i', $line)) {
                break;
            }
            if (!preg_match('/^([A-Za-z][A-Za-z0-9 _\-]*?)\s*[:\-]\s*(.*)$/u', $line, $m)) {
                continue;
            }
            $key = strtolower(preg_replace('/\s+/', '-', trim($m[1])) ?? '');
            $val = trim($m[2]);
            if ($val !== '') {
                $fields[$key] = $val;
            }
        }

        $partNumber = $fields['part-number'] ?? $fields['part'] ?? '';
        $rev        = preg_replace('/^Rev\.?\s*/i', '', $fields['revision'] ?? $fields['rev'] ?? '') ?? '';
        $qtyRaw     = $fields['quantity'] ?? $fields['qty'] ?? '';
        // Quantity might be "40 EA" — split numeric prefix + UOM suffix.
        $qty = 0.0;
        $uom = 'EA';
        if (preg_match('/^([\d.,]+)\s*([A-Za-z]+)?/', $qtyRaw, $qm)) {
            $qty = (float)str_replace(',', '', $qm[1]);
            if (!empty($qm[2])) { $uom = strtoupper($qm[2]); }
        }
        // Unit price might be "USD 125.00" — strip currency prefix.
        $unitPrice = null;
        if (!empty($fields['unit-price']) && preg_match('/([\d.,]+)/', (string)$fields['unit-price'], $upm)) {
            $unitPrice = (float)str_replace(',', '', $upm[1]);
        }

        return [
            'line_no'                 => $lineNo,
            'customer_part_number'    => $fields['customer-part-number']    ?? '',
            'part_number'             => trim((string)$partNumber),
            'part_description'        => $fields['description']             ?? '',
            'revision_number'         => trim((string)$rev),
            'customer_revision'       => '',
            'drawing_revision'        => $fields['drawing-revision']        ?? '',
            'quantity'                => $qty,
            'uom'                     => $uom,
            'requested_delivery_date' => $this->normaliseIsoDate($fields['need-date']
                                                             ?? $fields['needed-date']
                                                             ?? $fields['delivery-date']
                                                             ?? $fields['requested-delivery-date']
                                                             ?? ''),
            'delivery_address'        => $fields['ship-to']                 ?? '',
            'ship_to_site_id'         => '',
            'unit_price'              => $unitPrice,
            'line_total'              => ($unitPrice !== null && $qty > 0) ? round($unitPrice * $qty, 4) : null,
            'field_confidence'        => [
                'part_number'             => $partNumber !== '' ? 1.0 : 0.0,
                'revision_number'         => $rev !== '' ? 1.0 : 0.0,
                'quantity'                => $qty > 0 ? 1.0 : 0.0,
                'requested_delivery_date' => isset($fields['need-date']) ? 1.0 : 0.0,
            ],
            'evidence'                => [
                'source' => 'email_body_line_block',
                'line_no'=> $lineNo,
            ],
        ];
    }

    /** Best-effort date normalisation. Returns '' if input is empty/unparseable. */
    private function normaliseIsoDate(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') { return ''; }
        // Strip trailing parenthetical notes — "2026-07-01  (early — pre-stage...)"
        $raw = trim((string)preg_replace('/\s*\(.*$/', '', $raw));
        // If already ISO YYYY-MM-DD pass through
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            return $raw;
        }
        $ts = strtotime($raw);
        if ($ts === false) {
            return '';
        }
        return date('Y-m-d', $ts);
    }
}
