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
        // to forget our cursor.
        $status = imap_status($conn, ((string)$conn ?: 'INBOX'), SA_UIDVALIDITY | SA_UIDNEXT) ?: null;
        if ($status !== null && isset($status->uidvalidity)) {
            $serverUidvalidity = (int)$status->uidvalidity;
            $ourUidvalidity    = (int)($mailbox['imap_last_uidvalidity'] ?? 0);
            if ($ourUidvalidity !== 0 && $ourUidvalidity !== $serverUidvalidity) {
                $lastUid = 0;
            }
            $mailbox['imap_last_uidvalidity'] = $serverUidvalidity;
        }

        // imap_search by UID range. The "UID a:b" syntax wants UIDs.
        // a = lastUid+1, b = '*' (the highest existing UID).
        $criterion = 'UID ' . ($lastUid + 1) . ':*';
        $uids = imap_search($conn, $criterion, SE_UID) ?: [];
        if ($uids === []) {
            $this->persistCursor($mailboxId, $lastUid, $mailbox['imap_last_uidvalidity'] ?? null);
            return ['fetched' => 0, 'created' => 0, 'skipped' => 0];
        }

        // imap_search() returns UIDs in arbitrary order; sort ascending so
        // we always advance the cursor monotonically.
        sort($uids, SORT_NUMERIC);
        $uids = array_slice($uids, 0, self::MAX_MESSAGES_PER_POLL);

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
                        ':p_status'  => 'extraction_pending',
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

                $case = $this->cases->createCase([
                    'message_id'          => $messageId,
                    'mailbox_id'          => $mailboxId,
                    'sender_allowlist_id' => $allow['entry_id'] ?? null,
                    'status'              => 'extraction_pending',
                    'document_type'       => $docType ?: null,
                    'action_type'         => $action  ?: null,
                ], $actor);
                $caseId = (int)$case['id'];

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
}
