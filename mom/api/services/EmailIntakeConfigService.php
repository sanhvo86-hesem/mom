<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;
use Throwable;

/**
 * EmailIntakeConfigService — backend for the AI Email Order Intake admin panel.
 *
 * Manages the singleton config row (email_intake_config id=1) and the
 * sender allowlist (email_intake_sender_allowlist). The controller calls
 * these methods; the actual M365 polling and AI extraction are delegated
 * to M365MailboxService and OrderEmailParserService (to be provisioned
 * in a follow-up sprint alongside the Claude API credentials).
 *
 * Security notes:
 *   - m365_client_secret is stored AES-256 encrypted via encryptSecret() /
 *     decryptSecret(). The encryption key is read from the APP_SECRET env
 *     variable (must be 32 bytes). The plaintext secret is never logged,
 *     never returned to the frontend, and never written to any JSON file.
 *   - isEmailAllowed() implements all three enforcement modes:
 *       strict      → must match an active allowlist row exactly
 *       domain_only → @domain suffix match is sufficient
 *       off         → all senders accepted (use only for testing)
 *
 * @package MOM\Api\Services
 */
final class EmailIntakeConfigService
{
    private const CONFIG_ID   = 1;
    private const CONFIG_TABLE = 'email_intake_config';
    private const ALLOW_TABLE  = 'email_intake_sender_allowlist';

    public function __construct(
        private readonly Connection $db
    ) {}

    // ── Config ────────────────────────────────────────────────────────────

    /**
     * Load config row for the admin panel (secret excluded, virtual fields added).
     */
    public function loadConfig(): array
    {
        $row = $this->fetchConfigRow();
        $row['secret_configured'] = !empty($row['m365_client_secret_enc']);
        unset($row['m365_client_secret_enc']);
        $row['allowed_attachment_types'] = $this->jsonDecode($row['allowed_attachment_types'] ?? '[]');
        $row['notify_roles_on_create']   = $this->jsonDecode($row['notify_roles_on_create'] ?? '[]');
        $row['notify_roles_on_review']   = $this->jsonDecode($row['notify_roles_on_review'] ?? '[]');
        $row['notify_roles_on_error']    = $this->jsonDecode($row['notify_roles_on_error'] ?? '[]');
        return $row;
    }

    /**
     * Persist config edits. Only whitelisted fields are written; secret
     * is only updated when a non-empty plain-text value is supplied.
     */
    public function saveConfig(array $data, string $actor): array
    {
        $allowed = [
            'm365_tenant_id','m365_client_id','intake_mailbox','enabled',
            'poll_interval_minutes',
            'require_attachment','allowed_attachment_types','subject_filter_regex',
            'extraction_scope','max_attachments_per_email',
            'auto_create_mode','confidence_threshold','duplicate_check_days',
            'part_match_mode','missing_field_action','auto_cascade_jo',
            'business_hours_only','business_hours_start','business_hours_end',
            'business_hours_timezone',
            'allowlist_enforcement','require_spf_dkim','max_orders_per_poll',
            'quarantine_unknown_senders','quarantine_review_alert',
            'high_value_threshold','high_value_currency','high_value_action',
            'audit_retention_days','mask_prices_in_log',
            'notify_roles_on_create','notify_roles_on_review','notify_roles_on_error',
            'escalation_review_hours',
        ];

        $sets   = ['updated_at = NOW()', 'updated_by = :p_actor'];
        $params = [':p_actor' => $actor];

        foreach ($allowed as $col) {
            if (!array_key_exists($col, $data)) {
                continue;
            }
            $val = $data[$col];
            if (in_array($col, ['allowed_attachment_types','notify_roles_on_create',
                                 'notify_roles_on_review','notify_roles_on_error'], true)) {
                $val = json_encode(is_array($val) ? $val : [], JSON_UNESCAPED_UNICODE);
            } elseif (is_bool($val)) {
                $val = $val ? 'true' : 'false';
            } elseif ($val === '') {
                $val = null;
            }
            $sets[]                = "$col = :p_$col";
            $params[":p_$col"]     = $val;
        }

        // Handle secret separately — only write when new value supplied
        if (!empty($data['m365_client_secret']) && is_string($data['m365_client_secret'])) {
            $sets[]                  = 'm365_client_secret_enc = :p_secret_enc';
            $params[':p_secret_enc'] = $this->encryptSecret($data['m365_client_secret']);
        }

        if (count($sets) < 2) {
            return $this->loadConfig();
        }

        $params[':p_id'] = self::CONFIG_ID;
        $sql = 'UPDATE ' . self::CONFIG_TABLE . ' SET ' . implode(', ', $sets)
             . ' WHERE id = :p_id';
        $this->db->execute($sql, $params);

        return $this->loadConfig();
    }

    // ── Allowlist ─────────────────────────────────────────────────────────

    /** Return all allowlist entries (active + inactive), ordered by type then value. */
    public function getAllowlist(): array
    {
        $sql = 'SELECT id, entry_type, value, label, customer_id, active, notes,
                       created_at, created_by, updated_at, updated_by
                  FROM ' . self::ALLOW_TABLE . '
                 ORDER BY entry_type, lower(value)';
        return $this->db->query($sql);
    }

    /**
     * Add a new allowlist entry.
     *
     * @param string      $type       'email' or 'domain'
     * @param string      $value      email address or domain (lowercased on insert)
     * @param string|null $label      human-readable name
     * @param string|null $customerId optional link to customers table
     * @param string|null $notes
     * @param string      $actor      user performing the action
     */
    public function addAllowlistEntry(
        string  $type,
        string  $value,
        ?string $label,
        ?string $customerId,
        ?string $notes,
        string  $actor
    ): array {
        $this->validateEntryType($type);
        $value = strtolower(trim($value));
        $this->validateEntryValue($type, $value);

        $sql = 'INSERT INTO ' . self::ALLOW_TABLE
             . ' (entry_type, value, label, customer_id, notes, created_by, updated_by)
                VALUES (:p_type, :p_value, :p_label, :p_customer, :p_notes, :p_actor, :p_actor)
                ON CONFLICT (entry_type, value) DO UPDATE
                   SET active = true, label = EXCLUDED.label,
                       customer_id = EXCLUDED.customer_id,
                       notes = EXCLUDED.notes,
                       updated_at = NOW(), updated_by = EXCLUDED.updated_by
                RETURNING id';
        $row = $this->db->queryOne($sql, [
            ':p_type'     => $type,
            ':p_value'    => $value,
            ':p_label'    => $label,
            ':p_customer' => $customerId,
            ':p_notes'    => $notes,
            ':p_actor'    => $actor,
        ]);
        return $this->getAllowlistEntry((int)$row['id']);
    }

    /** Update an existing allowlist entry. */
    public function updateAllowlistEntry(int $id, array $data, string $actor): array
    {
        $allowed = ['label','customer_id','active','notes'];
        $sets    = ['updated_at = NOW()', 'updated_by = :p_actor'];
        $params  = [':p_actor' => $actor];

        foreach ($allowed as $col) {
            if (!array_key_exists($col, $data)) {
                continue;
            }
            $val = $data[$col];
            if ($col === 'active') {
                $val = $val ? 'true' : 'false';
            }
            $sets[]            = "$col = :p_$col";
            $params[":p_$col"] = $val;
        }

        if (count($sets) < 2) {
            return $this->getAllowlistEntry($id);
        }

        $params[':p_id'] = $id;
        $sql = 'UPDATE ' . self::ALLOW_TABLE . ' SET ' . implode(', ', $sets)
             . ' WHERE id = :p_id';
        $this->db->execute($sql, $params);
        return $this->getAllowlistEntry($id);
    }

    /** Hard-delete an allowlist entry (admin only). */
    public function deleteAllowlistEntry(int $id): void
    {
        $this->db->execute(
            'DELETE FROM ' . self::ALLOW_TABLE . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
    }

    /**
     * Check whether an inbound email address is permitted under the current
     * allowlist_enforcement mode.
     *
     * Returns ['allowed' => bool, 'match_type' => string, 'entry_id' => int|null]
     */
    public function isEmailAllowed(string $fromEmail): array
    {
        $row = $this->fetchConfigRow();
        $enforcement = $row['allowlist_enforcement'] ?? 'strict';

        if ($enforcement === 'off') {
            return ['allowed' => true, 'match_type' => 'enforcement_off', 'entry_id' => null];
        }

        $email  = strtolower(trim($fromEmail));
        $domain = substr($email, (int)strrpos($email, '@') + 1);

        // Check exact email match
        $exactRow = $this->db->queryOne(
            'SELECT id FROM ' . self::ALLOW_TABLE
            . ' WHERE entry_type = :p_type AND lower(value) = :p_value AND active = true',
            [':p_type' => 'email', ':p_value' => $email]
        );
        if ($exactRow) {
            return ['allowed' => true, 'match_type' => 'email', 'entry_id' => (int)$exactRow['id']];
        }

        // Check domain match (both modes accept domain entries)
        $domainRow = $this->db->queryOne(
            'SELECT id FROM ' . self::ALLOW_TABLE
            . ' WHERE entry_type = :p_type AND lower(value) = :p_value AND active = true',
            [':p_type' => 'domain', ':p_value' => $domain]
        );
        if ($domainRow) {
            return ['allowed' => true, 'match_type' => 'domain', 'entry_id' => (int)$domainRow['id']];
        }

        return ['allowed' => false, 'match_type' => 'none', 'entry_id' => null];
    }

    // ── Poll run log helpers ──────────────────────────────────────────────

    /** Open a new poll run record, return its id. */
    public function openPollRun(string $triggeredBy, ?string $triggeredUser): int
    {
        $row = $this->db->queryOne(
            'INSERT INTO email_intake_poll_run (triggered_by, triggered_user)
             VALUES (:p_by, :p_user) RETURNING id',
            [':p_by' => $triggeredBy, ':p_user' => $triggeredUser]
        );
        return (int)$row['id'];
    }

    /** Close a poll run with final stats. */
    public function closePollRun(int $runId, array $stats, string $status = 'completed'): void
    {
        $this->db->execute(
            'UPDATE email_intake_poll_run SET
                finished_at          = NOW(),
                status               = :p_status,
                messages_found       = :p_found,
                messages_processed   = :p_processed,
                messages_skipped     = :p_skipped,
                messages_quarantined = :p_quarantined,
                orders_created       = :p_created,
                review_items_added   = :p_review,
                parse_errors         = :p_errors,
                duration_ms          = :p_duration,
                error_detail         = :p_error_detail,
                graph_api_calls      = :p_api_calls
             WHERE id = :p_id',
            [
                ':p_status'       => $status,
                ':p_found'        => $stats['found']        ?? 0,
                ':p_processed'    => $stats['processed']    ?? 0,
                ':p_skipped'      => $stats['skipped']      ?? 0,
                ':p_quarantined'  => $stats['quarantined']  ?? 0,
                ':p_created'      => $stats['created']      ?? 0,
                ':p_review'       => $stats['review']       ?? 0,
                ':p_errors'       => $stats['errors']       ?? 0,
                ':p_duration'     => $stats['duration_ms']  ?? null,
                ':p_error_detail' => $stats['error_detail'] ?? null,
                ':p_api_calls'    => $stats['api_calls']    ?? 0,
                ':p_id'           => $runId,
            ]
        );
    }

    /** Update next_poll_at after a successful run. */
    public function updateNextPollAt(): void
    {
        $this->db->execute(
            'UPDATE email_intake_config
                SET last_poll_at = NOW(),
                    next_poll_at = NOW() + (poll_interval_minutes * interval \'1 minute\')
              WHERE id = :p_id',
            [':p_id' => self::CONFIG_ID]
        );
    }

    // ── Paginated log queries ─────────────────────────────────────────────

    /** Paginated poll run log. */
    public function getPollRunLog(int $limit = 50, int $offset = 0): array
    {
        $rows = $this->db->query(
            'SELECT * FROM email_intake_poll_run ORDER BY started_at DESC LIMIT :p_limit OFFSET :p_offset',
            [':p_limit' => $limit, ':p_offset' => $offset]
        );
        $total = (int)($this->db->queryOne('SELECT COUNT(*) AS n FROM email_intake_poll_run')['n'] ?? 0);
        return ['items' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
    }

    /** Paginated message log with optional status filter. */
    public function getMessageLog(?string $status, int $limit = 50, int $offset = 0): array
    {
        $where  = $status ? 'WHERE status = :p_status' : '';
        $params = [':p_limit' => $limit, ':p_offset' => $offset];
        if ($status) { $params[':p_status'] = $status; }
        $rows   = $this->db->query(
            'SELECT id, poll_run_id, from_email, from_name, subject, received_at,
                    has_attachments, attachment_count, attachment_names,
                    allowlist_match, status, skip_reason, so_number, created_at
               FROM email_intake_message ' . $where . '
              ORDER BY received_at DESC LIMIT :p_limit OFFSET :p_offset',
            $params
        );
        $cntParams = $status ? [':p_status' => $status] : [];
        $total = (int)($this->db->queryOne(
            'SELECT COUNT(*) AS n FROM email_intake_message ' . $where, $cntParams
        )['n'] ?? 0);
        return ['items' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
    }

    /** Paginated quarantine queue (unreviewed by default). */
    public function getQuarantineQueue(bool $unreviewedOnly = true, int $limit = 50, int $offset = 0): array
    {
        $where  = $unreviewedOnly ? 'WHERE reviewed = false' : '';
        $rows   = $this->db->query(
            'SELECT q.id, q.message_id, q.reason_code, q.reason_detail,
                    q.from_email, q.subject, q.severity, q.notified,
                    q.reviewed, q.review_action, q.reviewed_by, q.reviewed_at, q.created_at
               FROM email_intake_quarantine q ' . $where . '
              ORDER BY q.created_at DESC LIMIT :p_limit OFFSET :p_offset',
            [':p_limit' => $limit, ':p_offset' => $offset]
        );
        $total = (int)($this->db->queryOne(
            'SELECT COUNT(*) AS n FROM email_intake_quarantine ' . $where
        )['n'] ?? 0);
        return ['items' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
    }

    /** Record a quarantine review decision. */
    public function reviewQuarantineItem(int $qid, string $action, ?string $notes, string $actor): void
    {
        $valid = ['allow', 'block', 'ignore'];
        if (!in_array($action, $valid, true)) {
            throw new RuntimeException('Invalid quarantine action. Must be: ' . implode(', ', $valid));
        }
        $this->db->execute(
            'UPDATE email_intake_quarantine
                SET reviewed = true, review_action = :p_action, review_notes = :p_notes,
                    reviewed_by = :p_by, reviewed_at = NOW()
              WHERE id = :p_id',
            [':p_action' => $action, ':p_notes' => $notes, ':p_by' => $actor, ':p_id' => $qid]
        );
    }

    // ── Internal helpers ──────────────────────────────────────────────────

    private function fetchConfigRow(): array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::CONFIG_TABLE . ' WHERE id = :p_id',
            [':p_id' => self::CONFIG_ID]
        );
        if (!$row) {
            throw new RuntimeException('email_intake_config singleton row missing — run migration 203.');
        }
        return $row;
    }

    private function getAllowlistEntry(int $id): array
    {
        $row = $this->db->queryOne(
            'SELECT id, entry_type, value, label, customer_id, active, notes,
                    created_at, created_by, updated_at, updated_by
               FROM ' . self::ALLOW_TABLE . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
        if (!$row) {
            throw new RuntimeException('Allowlist entry not found: ' . $id);
        }
        return $row;
    }

    private function validateEntryType(string $type): void
    {
        if (!in_array($type, ['email', 'domain'], true)) {
            throw new RuntimeException('entry_type must be "email" or "domain".');
        }
    }

    private function validateEntryValue(string $type, string $value): void
    {
        if ($type === 'email') {
            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                throw new RuntimeException('Invalid email address: ' . $value);
            }
        } else {
            // domain: must look like a hostname
            if (!preg_match('/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)+$/i', $value)) {
                throw new RuntimeException('Invalid domain: ' . $value);
            }
        }
    }

    private function jsonDecode(mixed $val): array
    {
        if (is_array($val)) {
            return $val;
        }
        if (!is_string($val) || $val === '') {
            return [];
        }
        $decoded = json_decode($val, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Encrypt a secret using AES-256-CBC with a key derived from APP_SECRET.
     * Stored as base64(iv + ciphertext).
     */
    private function encryptSecret(string $plaintext): string
    {
        $key = $this->deriveKey();
        $iv  = random_bytes(16);
        $ct  = openssl_encrypt($plaintext, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
        if ($ct === false) {
            throw new RuntimeException('Failed to encrypt secret.');
        }
        return base64_encode($iv . $ct);
    }

    /** Decrypt a previously encrypted secret. Returns null if decryption fails. */
    public function decryptSecret(string $encoded): ?string
    {
        try {
            $raw = base64_decode($encoded, true);
            if ($raw === false || strlen($raw) <= 16) {
                return null;
            }
            $iv  = substr($raw, 0, 16);
            $ct  = substr($raw, 16);
            $key = $this->deriveKey();
            $pt  = openssl_decrypt($ct, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
            return $pt !== false ? $pt : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function deriveKey(): string
    {
        $appSecret = getenv('APP_SECRET') ?: '';
        if (strlen($appSecret) < 16) {
            throw new RuntimeException(
                'APP_SECRET env variable must be at least 16 characters to encrypt M365 credentials.'
            );
        }
        return hash('sha256', $appSecret, true); // 32 bytes
    }
}
