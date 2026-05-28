<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

/**
 * EmailIntakeAdminCatalogService — CRUD for the admin-managed catalogs
 * introduced in migration 205:
 *
 *   • email_intake_mailbox            — per-folder scope worker may read
 *   • email_intake_header_rule        — recognition header rules
 *   • email_intake_customer_template  — per-customer PO parsing hints
 *
 * One service for the three because they share the same admin tab pattern
 * (list / create / update / delete by id) and the same actor-stamping
 * convention. Larger lifecycles (cases, worker tokens) live in their own
 * services so the responsibility lines stay clean.
 *
 * @package MOM\Api\Services
 */
final class EmailIntakeAdminCatalogService
{
    private const T_MAILBOX  = 'email_intake_mailbox';
    private const T_HEADER   = 'email_intake_header_rule';
    private const T_TEMPLATE = 'email_intake_customer_template';

    public function __construct(
        private readonly Connection $db,
        private readonly ?EmailIntakeConfigService $config = null
    ) {}

    // ── Mailboxes ────────────────────────────────────────────────────────

    /** Return all mailbox rows (enabled + disabled). */
    public function listMailboxes(): array
    {
        return $this->db->query(
            'SELECT id, mailbox_address, provider, folder_path, enabled,
                    read_body, read_attachments, move_after_processed,
                    processed_folder_path, error_folder_path,
                    last_scan_at, last_status, last_error,
                    created_at, created_by, updated_at, updated_by
               FROM ' . self::T_MAILBOX . '
              ORDER BY enabled DESC, lower(mailbox_address), lower(folder_path)'
        );
    }

    /** Return only enabled mailbox rows — the worker config view. */
    public function listEnabledMailboxes(): array
    {
        return $this->db->query(
            'SELECT id, mailbox_address, provider, folder_path,
                    read_body, read_attachments,
                    move_after_processed, processed_folder_path, error_folder_path,
                    imap_host, imap_port, imap_encryption, imap_username,
                    imap_validate_cert, imap_last_uid, imap_last_uidvalidity
               FROM ' . self::T_MAILBOX . '
              WHERE enabled = true
              ORDER BY lower(mailbox_address), lower(folder_path)'
        );
    }

    /**
     * Create a new mailbox row.
     * Validates: email format, non-empty folder_path, provider enum,
     * uniqueness of (mailbox_address, folder_path) (case-insensitive).
     */
    public function createMailbox(array $data, string $actor): array
    {
        $addr   = strtolower(trim((string)($data['mailbox_address'] ?? '')));
        $folder = trim((string)($data['folder_path'] ?? ''));
        $prov   = trim((string)($data['provider'] ?? 'outlook_local')) ?: 'outlook_local';

        if (!filter_var($addr, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('mailbox_address must be a valid email.');
        }
        if ($folder === '') {
            throw new RuntimeException('folder_path is required.');
        }
        if (!in_array($prov, ['outlook_local', 'microsoft_graph', 'manual_upload',
                              'gmail_imap', 'generic_imap', 'exchange_ews'], true)) {
            throw new RuntimeException('provider must be outlook_local | microsoft_graph | manual_upload | gmail_imap | generic_imap | exchange_ews.');
        }
        // IMAP providers must have host + port + username + password
        if (in_array($prov, ['gmail_imap', 'generic_imap'], true)) {
            foreach (['imap_host', 'imap_port', 'imap_username', 'imap_password'] as $req) {
                if (empty($data[$req])) {
                    throw new RuntimeException("$req is required for $prov provider.");
                }
            }
        }

        $existing = $this->db->queryOne(
            'SELECT id FROM ' . self::T_MAILBOX
            . ' WHERE lower(mailbox_address) = :p_addr AND lower(folder_path) = :p_folder',
            [':p_addr' => $addr, ':p_folder' => strtolower($folder)]
        );
        if ($existing) {
            throw new RuntimeException('A mailbox row with this address + folder already exists.');
        }

        // Encrypt IMAP password if supplied
        $imapPwdEnc = null;
        if (!empty($data['imap_password']) && is_string($data['imap_password'])) {
            if ($this->config === null) {
                throw new RuntimeException('Cannot encrypt IMAP password — EmailIntakeConfigService not injected.');
            }
            $imapPwdEnc = $this->config->encryptSecret($data['imap_password']);
        }

        $row = $this->db->queryOne(
            'INSERT INTO ' . self::T_MAILBOX . '
                (mailbox_address, provider, folder_path, enabled,
                 read_body, read_attachments, move_after_processed,
                 processed_folder_path, error_folder_path,
                 imap_host, imap_port, imap_encryption, imap_username,
                 imap_password_enc, imap_validate_cert,
                 created_by, updated_by)
             VALUES (:p_addr, :p_prov, :p_folder, :p_enabled,
                     :p_read_body, :p_read_att, :p_move,
                     :p_proc, :p_err,
                     :p_imap_host, :p_imap_port, :p_imap_enc, :p_imap_user,
                     :p_imap_pwd, :p_imap_validate,
                     :p_actor, :p_actor)
             RETURNING id',
            [
                ':p_addr'         => $addr,
                ':p_prov'         => $prov,
                ':p_folder'       => $folder,
                ':p_enabled'      => isset($data['enabled']) ? ($data['enabled'] ? 'true' : 'false') : 'true',
                ':p_read_body'    => isset($data['read_body']) ? ($data['read_body'] ? 'true' : 'false') : 'true',
                ':p_read_att'     => isset($data['read_attachments']) ? ($data['read_attachments'] ? 'true' : 'false') : 'true',
                ':p_move'         => isset($data['move_after_processed']) ? ($data['move_after_processed'] ? 'true' : 'false') : 'false',
                ':p_proc'         => trim((string)($data['processed_folder_path'] ?? '')) ?: null,
                ':p_err'          => trim((string)($data['error_folder_path'] ?? '')) ?: null,
                ':p_imap_host'    => trim((string)($data['imap_host'] ?? '')) ?: null,
                ':p_imap_port'    => isset($data['imap_port']) && $data['imap_port'] !== '' ? (int)$data['imap_port'] : null,
                ':p_imap_enc'     => trim((string)($data['imap_encryption'] ?? '')) ?: null,
                ':p_imap_user'    => trim((string)($data['imap_username'] ?? '')) ?: null,
                ':p_imap_pwd'     => $imapPwdEnc,
                ':p_imap_validate'=> isset($data['imap_validate_cert']) ? ($data['imap_validate_cert'] ? 'true' : 'false') : 'true',
                ':p_actor'        => $actor,
            ]
        );
        return $this->getMailbox((int)$row['id']);
    }

    /** Patch-style update; only the supplied fields change. */
    public function updateMailbox(int $id, array $data, string $actor): array
    {
        $allowed = [
            'mailbox_address','provider','folder_path','enabled',
            'read_body','read_attachments','move_after_processed',
            'processed_folder_path','error_folder_path',
            'imap_host','imap_port','imap_encryption','imap_username',
            'imap_validate_cert',
        ];
        $sets   = ['updated_at = NOW()', 'updated_by = :p_actor'];
        $params = [':p_actor' => $actor];

        foreach ($allowed as $col) {
            if (!array_key_exists($col, $data)) {
                continue;
            }
            $val = $data[$col];
            if (in_array($col, ['enabled','read_body','read_attachments','move_after_processed','imap_validate_cert'], true)) {
                $val = $val ? 'true' : 'false';
            } elseif ($col === 'imap_port') {
                $val = ($val === '' || $val === null) ? null : (int)$val;
            } elseif ($col === 'mailbox_address' && is_string($val)) {
                $val = strtolower(trim($val));
                if ($val !== '' && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
                    throw new RuntimeException('mailbox_address must be a valid email.');
                }
            } elseif (is_string($val)) {
                $val = trim($val);
                if ($val === '') { $val = null; }
            }
            $sets[]            = "$col = :p_$col";
            $params[":p_$col"] = $val;
        }

        // imap_password is encrypted on the way in — never stored in plaintext
        if (!empty($data['imap_password']) && is_string($data['imap_password'])) {
            if ($this->config === null) {
                throw new RuntimeException('Cannot encrypt IMAP password — EmailIntakeConfigService not injected.');
            }
            $sets[] = 'imap_password_enc = :p_imap_pwd';
            $params[':p_imap_pwd'] = $this->config->encryptSecret($data['imap_password']);
        }

        if (count($sets) < 2) {
            return $this->getMailbox($id);
        }

        $params[':p_id'] = $id;
        $this->db->execute(
            'UPDATE ' . self::T_MAILBOX . ' SET ' . implode(', ', $sets) . ' WHERE id = :p_id',
            $params
        );
        return $this->getMailbox($id);
    }

    public function deleteMailbox(int $id): void
    {
        $this->db->execute(
            'DELETE FROM ' . self::T_MAILBOX . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
    }

    public function getMailbox(int $id): array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::T_MAILBOX . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
        if (!$row) {
            throw new RuntimeException('Mailbox not found: ' . $id);
        }
        // Virtual field — tell the UI whether a password is stored so it
        // can render the field as "(đã lưu — nhập mới để đổi)".
        $row['imap_password_configured'] = !empty($row['imap_password_enc']);
        // SECURITY: strip the encrypted password ciphertext from any
        // response that leaves this service. The plaintext only lives in
        // memory during decryptSecret() inside the IMAP service.
        // getMailboxWithSecret() bypasses this for internal use only.
        unset($row['imap_password_enc']);
        return $row;
    }

    /** Internal accessor: returns the row including imap_password_enc for
     *  the IMAP service to decrypt. NEVER expose this via the controller. */
    public function getMailboxWithSecret(int $id): array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::T_MAILBOX . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
        if (!$row) {
            throw new RuntimeException('Mailbox not found: ' . $id);
        }
        return $row;
    }

    /** Update last_scan_* fields from the worker after a poll. */
    public function recordMailboxScan(int $id, string $status, ?string $error = null): void
    {
        $this->db->execute(
            'UPDATE ' . self::T_MAILBOX . '
                SET last_scan_at = NOW(), last_status = :p_status, last_error = :p_err
              WHERE id = :p_id',
            [':p_status' => $status, ':p_err' => $error, ':p_id' => $id]
        );
    }

    // ── Header rules ─────────────────────────────────────────────────────

    public function listHeaderRules(): array
    {
        $rows = $this->db->query(
            'SELECT id, rule_name, enabled, subject_prefix, body_start_marker, body_end_marker,
                    required_fields, allowed_doc_types, allowed_actions,
                    ai_process_must_equal, missing_header_action,
                    created_at, created_by, updated_at, updated_by
               FROM ' . self::T_HEADER . '
              ORDER BY enabled DESC, lower(rule_name)'
        );
        foreach ($rows as &$r) {
            $r['required_fields']   = $this->jsonDecode($r['required_fields']   ?? '[]');
            $r['allowed_doc_types'] = $this->jsonDecode($r['allowed_doc_types'] ?? '[]');
            $r['allowed_actions']   = $this->jsonDecode($r['allowed_actions']   ?? '[]');
        }
        return $rows;
    }

    public function createHeaderRule(array $data, string $actor): array
    {
        $name = trim((string)($data['rule_name'] ?? ''));
        if ($name === '') {
            throw new RuntimeException('rule_name is required.');
        }
        $row = $this->db->queryOne(
            'INSERT INTO ' . self::T_HEADER . '
                (rule_name, enabled, subject_prefix,
                 body_start_marker, body_end_marker,
                 required_fields, allowed_doc_types, allowed_actions,
                 ai_process_must_equal, missing_header_action,
                 created_by, updated_by)
             VALUES (:p_name, :p_enabled, :p_subject,
                     :p_start, :p_end,
                     :p_required, :p_doc_types, :p_actions,
                     :p_ai, :p_missing,
                     :p_actor, :p_actor)
             RETURNING id',
            [
                ':p_name'     => $name,
                ':p_enabled'  => isset($data['enabled']) ? ($data['enabled'] ? 'true' : 'false') : 'true',
                ':p_subject'  => trim((string)($data['subject_prefix'] ?? '')) ?: null,
                ':p_start'    => trim((string)($data['body_start_marker'] ?? '[HESEM-ORDER-INTAKE]')) ?: '[HESEM-ORDER-INTAKE]',
                ':p_end'      => trim((string)($data['body_end_marker']   ?? '[/HESEM-ORDER-INTAKE]')) ?: '[/HESEM-ORDER-INTAKE]',
                ':p_required' => json_encode(is_array($data['required_fields']   ?? null) ? $data['required_fields']   : ['Doc-Type','Action','Customer-Code','AI-Process']),
                ':p_doc_types'=> json_encode(is_array($data['allowed_doc_types'] ?? null) ? $data['allowed_doc_types'] : ['CUSTOMER_PO','PO_CHANGE','PO_CANCEL','EXPEDITE']),
                ':p_actions'  => json_encode(is_array($data['allowed_actions']   ?? null) ? $data['allowed_actions']   : ['NEW','CHANGE','CANCEL','EXPEDITE']),
                ':p_ai'       => trim((string)($data['ai_process_must_equal'] ?? 'YES')) ?: null,
                ':p_missing'  => $this->checkMissingHeaderAction((string)($data['missing_header_action'] ?? 'ignore')),
                ':p_actor'    => $actor,
            ]
        );
        return $this->getHeaderRule((int)$row['id']);
    }

    public function updateHeaderRule(int $id, array $data, string $actor): array
    {
        $allowed = [
            'rule_name','enabled','subject_prefix','body_start_marker','body_end_marker',
            'required_fields','allowed_doc_types','allowed_actions',
            'ai_process_must_equal','missing_header_action',
        ];
        $sets   = ['updated_at = NOW()', 'updated_by = :p_actor'];
        $params = [':p_actor' => $actor];

        foreach ($allowed as $col) {
            if (!array_key_exists($col, $data)) {
                continue;
            }
            $val = $data[$col];
            if ($col === 'enabled') {
                $val = $val ? 'true' : 'false';
            } elseif (in_array($col, ['required_fields','allowed_doc_types','allowed_actions'], true)) {
                $val = json_encode(is_array($val) ? $val : []);
            } elseif ($col === 'missing_header_action') {
                $val = $this->checkMissingHeaderAction((string)$val);
            } elseif (is_string($val)) {
                $val = trim($val);
                if ($val === '') { $val = null; }
            }
            $sets[]            = "$col = :p_$col";
            $params[":p_$col"] = $val;
        }

        if (count($sets) < 2) {
            return $this->getHeaderRule($id);
        }

        $params[':p_id'] = $id;
        $this->db->execute(
            'UPDATE ' . self::T_HEADER . ' SET ' . implode(', ', $sets) . ' WHERE id = :p_id',
            $params
        );
        return $this->getHeaderRule($id);
    }

    public function deleteHeaderRule(int $id): void
    {
        $this->db->execute(
            'DELETE FROM ' . self::T_HEADER . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
    }

    public function getHeaderRule(int $id): array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::T_HEADER . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
        if (!$row) {
            throw new RuntimeException('Header rule not found: ' . $id);
        }
        $row['required_fields']   = $this->jsonDecode($row['required_fields']   ?? '[]');
        $row['allowed_doc_types'] = $this->jsonDecode($row['allowed_doc_types'] ?? '[]');
        $row['allowed_actions']   = $this->jsonDecode($row['allowed_actions']   ?? '[]');
        return $row;
    }

    // ── Customer templates ───────────────────────────────────────────────

    public function listCustomerTemplates(): array
    {
        $rows = $this->db->query(
            'SELECT * FROM ' . self::T_TEMPLATE
            . ' ORDER BY enabled DESC, lower(customer_id), lower(template_name)'
        );
        foreach ($rows as &$r) {
            foreach (['po_number_hints','part_number_hints','revision_hints',
                      'quantity_hints','delivery_date_hints','ship_to_hints',
                      'unit_price_hints'] as $k) {
                $r[$k] = $this->jsonDecode($r[$k] ?? '[]');
            }
        }
        return $rows;
    }

    public function createCustomerTemplate(array $data, string $actor): array
    {
        $customerId = trim((string)($data['customer_id'] ?? ''));
        $name       = trim((string)($data['template_name'] ?? ''));
        if ($customerId === '' || $name === '') {
            throw new RuntimeException('customer_id and template_name are required.');
        }

        $row = $this->db->queryOne(
            'INSERT INTO ' . self::T_TEMPLATE . '
                (customer_id, template_name, document_type, file_type, enabled,
                 po_number_hints, part_number_hints, revision_hints,
                 quantity_hints, delivery_date_hints, ship_to_hints, unit_price_hints,
                 line_table_required, min_confidence_overall, min_confidence_required_field,
                 created_by, updated_by)
             VALUES (:p_cust, :p_name, :p_doc, :p_file, :p_enabled,
                     :p_po, :p_part, :p_rev,
                     :p_qty, :p_date, :p_ship, :p_price,
                     :p_line_req, :p_co, :p_cr,
                     :p_actor, :p_actor)
             RETURNING id',
            [
                ':p_cust'    => $customerId,
                ':p_name'    => $name,
                ':p_doc'     => trim((string)($data['document_type'] ?? 'CUSTOMER_PO')),
                ':p_file'    => trim((string)($data['file_type'] ?? 'pdf')),
                ':p_enabled' => isset($data['enabled']) ? ($data['enabled'] ? 'true' : 'false') : 'true',
                ':p_po'      => json_encode($this->stringArray($data['po_number_hints'] ?? [])),
                ':p_part'    => json_encode($this->stringArray($data['part_number_hints'] ?? [])),
                ':p_rev'     => json_encode($this->stringArray($data['revision_hints'] ?? [])),
                ':p_qty'     => json_encode($this->stringArray($data['quantity_hints'] ?? [])),
                ':p_date'    => json_encode($this->stringArray($data['delivery_date_hints'] ?? [])),
                ':p_ship'    => json_encode($this->stringArray($data['ship_to_hints'] ?? [])),
                ':p_price'   => json_encode($this->stringArray($data['unit_price_hints'] ?? [])),
                ':p_line_req'=> isset($data['line_table_required']) ? ($data['line_table_required'] ? 'true' : 'false') : 'true',
                ':p_co'      => $this->clampConfidence($data['min_confidence_overall'] ?? 0.95),
                ':p_cr'      => $this->clampConfidence($data['min_confidence_required_field'] ?? 0.90),
                ':p_actor'   => $actor,
            ]
        );
        return $this->getCustomerTemplate((int)$row['id']);
    }

    public function updateCustomerTemplate(int $id, array $data, string $actor): array
    {
        $allowed = [
            'template_name','document_type','file_type','enabled',
            'po_number_hints','part_number_hints','revision_hints',
            'quantity_hints','delivery_date_hints','ship_to_hints','unit_price_hints',
            'line_table_required','min_confidence_overall','min_confidence_required_field',
        ];
        $sets   = ['updated_at = NOW()', 'updated_by = :p_actor'];
        $params = [':p_actor' => $actor];

        foreach ($allowed as $col) {
            if (!array_key_exists($col, $data)) {
                continue;
            }
            $val = $data[$col];
            if (in_array($col, ['enabled','line_table_required'], true)) {
                $val = $val ? 'true' : 'false';
            } elseif (in_array($col, ['po_number_hints','part_number_hints','revision_hints',
                                     'quantity_hints','delivery_date_hints','ship_to_hints','unit_price_hints'], true)) {
                $val = json_encode($this->stringArray($val));
            } elseif (in_array($col, ['min_confidence_overall','min_confidence_required_field'], true)) {
                $val = $this->clampConfidence($val);
            } elseif (is_string($val)) {
                $val = trim($val);
                if ($val === '') { $val = null; }
            }
            $sets[]            = "$col = :p_$col";
            $params[":p_$col"] = $val;
        }

        if (count($sets) < 2) {
            return $this->getCustomerTemplate($id);
        }

        $params[':p_id'] = $id;
        $this->db->execute(
            'UPDATE ' . self::T_TEMPLATE . ' SET ' . implode(', ', $sets) . ' WHERE id = :p_id',
            $params
        );
        return $this->getCustomerTemplate($id);
    }

    public function deleteCustomerTemplate(int $id): void
    {
        $this->db->execute(
            'DELETE FROM ' . self::T_TEMPLATE . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
    }

    public function getCustomerTemplate(int $id): array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::T_TEMPLATE . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
        if (!$row) {
            throw new RuntimeException('Customer template not found: ' . $id);
        }
        foreach (['po_number_hints','part_number_hints','revision_hints',
                  'quantity_hints','delivery_date_hints','ship_to_hints',
                  'unit_price_hints'] as $k) {
            $row[$k] = $this->jsonDecode($row[$k] ?? '[]');
        }
        return $row;
    }

    /**
     * Find the most specific enabled template for a given customer +
     * document_type + file_type combination. Returns null if no template
     * matches; the validation pipeline treats that as "use defaults".
     */
    public function findTemplate(string $customerId, string $documentType, string $fileType): ?array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::T_TEMPLATE . '
              WHERE enabled = true
                AND customer_id   = :p_cust
                AND document_type = :p_doc
                AND file_type     = :p_file
              ORDER BY updated_at DESC LIMIT 1',
            [':p_cust' => $customerId, ':p_doc' => $documentType, ':p_file' => $fileType]
        );
        if ($row === null) {
            return null;
        }
        foreach (['po_number_hints','part_number_hints','revision_hints',
                  'quantity_hints','delivery_date_hints','ship_to_hints',
                  'unit_price_hints'] as $k) {
            $row[$k] = $this->jsonDecode($row[$k] ?? '[]');
        }
        return $row;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

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

    private function stringArray(mixed $val): array
    {
        if (!is_array($val)) {
            return [];
        }
        $out = [];
        foreach ($val as $item) {
            $s = trim((string)$item);
            if ($s !== '') {
                $out[] = $s;
            }
        }
        return $out;
    }

    private function clampConfidence(mixed $val): float
    {
        $f = is_numeric($val) ? (float)$val : 0.95;
        if ($f < 0) { $f = 0.0; }
        if ($f > 1) { $f = 1.0; }
        return round($f, 3);
    }

    private function checkMissingHeaderAction(string $val): string
    {
        $val = trim($val);
        if (!in_array($val, ['ignore','create_hold','reject'], true)) {
            return 'ignore';
        }
        return $val;
    }
}
