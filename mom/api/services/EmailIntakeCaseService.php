<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

/**
 * EmailIntakeCaseService — case lifecycle for the AEOI module.
 *
 * Responsible for:
 *   • Generating a new intake_no and writing an email_intake_case row from
 *     the validated email envelope (after sender+header pass).
 *   • Persisting per-line extracted data into email_intake_case_line.
 *   • Persisting attachment metadata into email_intake_attachment.
 *   • Listing/filtering cases for the review queue.
 *   • Updating case status with audit (reviewer/approver/rejector).
 *
 * Status transitions are validated against the 23-state machine in
 * migration 205. Commercial side-effects (CPO/SO/JO/WO creation) live in
 * EmailIntakeCommitService — this service NEVER calls OrderService or
 * CustomerPurchaseOrderService directly.
 *
 * @package MOM\Api\Services
 */
final class EmailIntakeCaseService
{
    public const VALID_STATUSES = [
        'new','header_matched','attachment_received',
        'extraction_pending','extraction_running','extracted',
        'validation_pending','validation_running',
        'needs_review','approved','rejected',
        'duplicate_hold','security_hold',
        'engineering_review','commercial_review',
        'planning_review','quality_review',
        'commit_ready','committed_cpo','committed_so',
        'committed_jo','committed_wo','closed','error',
    ];

    private const T_CASE   = 'email_intake_case';
    private const T_LINE   = 'email_intake_case_line';
    private const T_ATTACH = 'email_intake_attachment';
    private const T_VCHECK = 'email_intake_validation_check';

    public function __construct(private readonly Connection $db) {}

    // ── List / get ───────────────────────────────────────────────────────

    /**
     * Paginated list with optional filters. Filters: status (string or array),
     * customer_id, customer_po_number, part_number, revision_number,
     * received_from (DATE), received_to (DATE), min_confidence (NUMERIC).
     */
    public function listCases(array $filters = [], int $limit = 50, int $offset = 0): array
    {
        $where  = [];
        $params = [':p_limit' => $limit, ':p_offset' => $offset];

        if (!empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $statusList = array_values(array_filter(array_map('strval', $filters['status'])));
                if ($statusList) {
                    $placeholders = [];
                    foreach ($statusList as $i => $s) {
                        $key = ":p_status_$i";
                        $placeholders[] = $key;
                        $params[$key]   = $s;
                    }
                    $where[] = 'c.status IN (' . implode(',', $placeholders) . ')';
                }
            } else {
                $where[] = 'c.status = :p_status';
                $params[':p_status'] = (string)$filters['status'];
            }
        }
        if (!empty($filters['customer_id'])) {
            $where[] = 'c.customer_id = :p_cust';
            $params[':p_cust'] = (string)$filters['customer_id'];
        }
        if (!empty($filters['customer_po_number'])) {
            $where[] = 'c.customer_po_number = :p_po';
            $params[':p_po'] = (string)$filters['customer_po_number'];
        }
        if (!empty($filters['received_from'])) {
            $where[] = 'c.created_at >= :p_from';
            $params[':p_from'] = (string)$filters['received_from'];
        }
        if (!empty($filters['received_to'])) {
            $where[] = 'c.created_at <= :p_to';
            $params[':p_to'] = (string)$filters['received_to'];
        }
        if (isset($filters['min_confidence']) && $filters['min_confidence'] !== '') {
            $where[] = 'c.overall_confidence >= :p_conf';
            $params[':p_conf'] = (float)$filters['min_confidence'];
        }
        if (!empty($filters['part_number'])) {
            $where[] = 'EXISTS (SELECT 1 FROM ' . self::T_LINE . ' l WHERE l.case_id = c.id AND l.part_number = :p_part)';
            $params[':p_part'] = (string)$filters['part_number'];
        }
        if (!empty($filters['revision_number'])) {
            $where[] = 'EXISTS (SELECT 1 FROM ' . self::T_LINE . ' l WHERE l.case_id = c.id AND l.revision_number = :p_rev)';
            $params[':p_rev'] = (string)$filters['revision_number'];
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);

        // Projection includes a LEFT JOIN LATERAL on the first line of
        // each case + COUNT() aggregates for line + attachment so the M2
        // Orders AI Intake Queue can render part/rev/qty/due without
        // making 50 follow-up requests. Also joins email_intake_message
        // for the from_email / received_at the case originated from.
        // (GPT Pro audit P0-11.)
        $rows = $this->db->query(
            'SELECT c.id, c.intake_no, c.status, c.customer_id, c.customer_name,
                    c.customer_po_number, c.document_type, c.action_type,
                    c.overall_confidence, c.blocking_codes, c.warning_codes,
                    c.committed_customer_po_id, c.committed_so_number,
                    c.created_at, c.created_by,
                    c.reviewed_by, c.reviewed_at,
                    c.approved_by, c.approved_at,
                    c.rejected_by, c.rejected_at,
                    m.from_email                 AS from_email,
                    m.subject                    AS subject,
                    m.received_at                AS received_at,
                    line.part_number             AS part_number,
                    line.revision_number         AS revision_number,
                    line.quantity                AS quantity,
                    line.uom                     AS uom,
                    line.requested_delivery_date AS requested_delivery_date,
                    line.delivery_address        AS delivery_address,
                    counts.line_count            AS line_count,
                    counts.attachment_count      AS attachment_count
               FROM ' . self::T_CASE . ' c
               LEFT JOIN email_intake_message m
                      ON m.id = c.message_id
               LEFT JOIN LATERAL (
                       SELECT part_number, revision_number, quantity, uom,
                              requested_delivery_date, delivery_address
                         FROM ' . self::T_LINE . ' l
                        WHERE l.case_id = c.id
                        ORDER BY (CASE WHEN l.line_no ~ \'^[0-9]+$\' THEN l.line_no::int ELSE NULL END) NULLS LAST, l.id
                        LIMIT 1
                  ) AS line ON TRUE
               LEFT JOIN LATERAL (
                       SELECT
                          (SELECT COUNT(*) FROM ' . self::T_LINE . ' l2 WHERE l2.case_id = c.id) AS line_count,
                          (SELECT COUNT(*) FROM ' . self::T_ATTACH . ' a WHERE a.case_id = c.id) AS attachment_count
                  ) AS counts ON TRUE
               ' . $whereSql . '
              ORDER BY c.created_at DESC
              LIMIT :p_limit OFFSET :p_offset',
            $params
        );

        $countParams = $params;
        unset($countParams[':p_limit'], $countParams[':p_offset']);
        $total = (int)($this->db->queryOne(
            'SELECT COUNT(*) AS n FROM ' . self::T_CASE . ' c ' . $whereSql,
            $countParams
        )['n'] ?? 0);

        foreach ($rows as &$r) {
            $r['blocking_codes'] = $this->jsonDecode($r['blocking_codes'] ?? '[]');
            $r['warning_codes']  = $this->jsonDecode($r['warning_codes']  ?? '[]');
        }

        return ['items' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
    }

    /** Full case detail including lines + attachments + validation checks. */
    public function getCase(int $id): array
    {
        $row = $this->db->queryOne(
            'SELECT * FROM ' . self::T_CASE . ' WHERE id = :p_id',
            [':p_id' => $id]
        );
        if (!$row) {
            throw new RuntimeException('Case not found: ' . $id);
        }

        foreach (['field_confidence','extracted_json','validation_json',
                  'blocking_codes','warning_codes',
                  'committed_jo_numbers','committed_wo_numbers'] as $k) {
            $row[$k] = $this->jsonDecode($row[$k] ?? '{}');
        }

        $row['lines'] = $this->db->query(
            'SELECT * FROM ' . self::T_LINE . ' WHERE case_id = :p_case ORDER BY id',
            [':p_case' => $id]
        );
        foreach ($row['lines'] as &$line) {
            $line['field_confidence'] = $this->jsonDecode($line['field_confidence'] ?? '{}');
            $line['evidence']         = $this->jsonDecode($line['evidence']         ?? '{}');
            $line['validation_codes'] = $this->jsonDecode($line['validation_codes'] ?? '[]');
        }

        $row['attachments'] = $this->db->query(
            'SELECT id, original_filename, safe_filename, mime_type, extension,
                    file_size_bytes, sha256, ocr_status, created_at
               FROM ' . self::T_ATTACH . ' WHERE case_id = :p_case ORDER BY id',
            [':p_case' => $id]
        );

        $row['validation_checks'] = $this->db->query(
            'SELECT id, check_code, severity, result, message, details, created_at
               FROM ' . self::T_VCHECK . ' WHERE case_id = :p_case ORDER BY id',
            [':p_case' => $id]
        );
        foreach ($row['validation_checks'] as &$chk) {
            $chk['details'] = $this->jsonDecode($chk['details'] ?? '{}');
        }

        return $row;
    }

    public function getCaseByIntakeNo(string $intakeNo): array
    {
        $row = $this->db->queryOne(
            'SELECT id FROM ' . self::T_CASE . ' WHERE intake_no = :p_no',
            [':p_no' => $intakeNo]
        );
        if (!$row) {
            throw new RuntimeException('Case not found: ' . $intakeNo);
        }
        return $this->getCase((int)$row['id']);
    }

    // ── Create ───────────────────────────────────────────────────────────

    /**
     * Create a new intake case. The caller (worker endpoint or manual
     * test parser) supplies the validated email_intake_message row id
     * plus the contextual data so the case can be tracked end-to-end.
     */
    public function createCase(array $data, string $actor): array
    {
        $intakeNo = $this->generateIntakeNo();

        $row = $this->db->queryOne(
            'INSERT INTO ' . self::T_CASE . '
                (intake_no, message_id, extraction_id, mailbox_id,
                 sender_allowlist_id, header_rule_id, template_id,
                 status, document_type, action_type,
                 customer_id, customer_name, customer_po_number,
                 created_by, updated_by)
             VALUES (:p_no, :p_msg, :p_ext, :p_mbx,
                     :p_sender, :p_rule, :p_tpl,
                     :p_status, :p_doc, :p_act,
                     :p_cust, :p_cust_name, :p_po,
                     :p_actor, :p_actor)
             RETURNING id',
            [
                ':p_no'        => $intakeNo,
                ':p_msg'       => $data['message_id']           ?? null,
                ':p_ext'       => $data['extraction_id']        ?? null,
                ':p_mbx'       => $data['mailbox_id']           ?? null,
                ':p_sender'    => $data['sender_allowlist_id']  ?? null,
                ':p_rule'      => $data['header_rule_id']       ?? null,
                ':p_tpl'       => $data['template_id']          ?? null,
                ':p_status'    => $this->validateStatus((string)($data['status'] ?? 'new')),
                ':p_doc'       => trim((string)($data['document_type'] ?? '')) ?: null,
                ':p_act'       => trim((string)($data['action_type']   ?? '')) ?: null,
                ':p_cust'      => trim((string)($data['customer_id']   ?? '')) ?: null,
                ':p_cust_name' => trim((string)($data['customer_name'] ?? '')) ?: null,
                ':p_po'        => trim((string)($data['customer_po_number'] ?? '')) ?: null,
                ':p_actor'     => $actor,
            ]
        );
        return $this->getCase((int)$row['id']);
    }

    public function addLine(int $caseId, array $line): int
    {
        $row = $this->db->queryOne(
            'INSERT INTO ' . self::T_LINE . '
                (case_id, line_no, customer_part_number, part_number, part_description,
                 revision_number, customer_revision, drawing_revision,
                 quantity, uom, requested_delivery_date, delivery_address, ship_to_site_id,
                 unit_price, line_total, field_confidence, evidence)
             VALUES (:p_case, :p_line_no, :p_cpn, :p_pn, :p_desc,
                     :p_rev, :p_crev, :p_drev,
                     :p_qty, :p_uom, :p_due, :p_addr, :p_ship,
                     :p_price, :p_total, :p_fc, :p_ev)
             RETURNING id',
            [
                ':p_case'    => $caseId,
                ':p_line_no' => trim((string)($line['line_no'] ?? '')) ?: null,
                ':p_cpn'     => trim((string)($line['customer_part_number'] ?? '')) ?: null,
                ':p_pn'      => trim((string)($line['part_number'] ?? '')),
                ':p_desc'    => trim((string)($line['part_description'] ?? '')) ?: null,
                ':p_rev'     => trim((string)($line['revision_number'] ?? '')) ?: null,
                ':p_crev'    => trim((string)($line['customer_revision'] ?? '')) ?: null,
                ':p_drev'    => trim((string)($line['drawing_revision'] ?? '')) ?: null,
                ':p_qty'     => (float)($line['quantity'] ?? 0),
                ':p_uom'     => trim((string)($line['uom'] ?? 'EA')) ?: 'EA',
                ':p_due'     => trim((string)($line['requested_delivery_date'] ?? '')) ?: null,
                ':p_addr'    => trim((string)($line['delivery_address'] ?? '')) ?: null,
                ':p_ship'    => trim((string)($line['ship_to_site_id']  ?? '')) ?: null,
                ':p_price'   => isset($line['unit_price']) ? (float)$line['unit_price'] : null,
                ':p_total'   => isset($line['line_total']) ? (float)$line['line_total'] : null,
                ':p_fc'      => json_encode($line['field_confidence'] ?? []),
                ':p_ev'      => json_encode($line['evidence']         ?? []),
            ]
        );
        return (int)$row['id'];
    }

    public function addAttachment(int $caseId, ?int $messageId, array $att): int
    {
        $row = $this->db->queryOne(
            'INSERT INTO ' . self::T_ATTACH . '
                (case_id, message_id, original_filename, safe_filename,
                 mime_type, extension, file_size_bytes, sha256,
                 storage_path, extracted_text_path, ocr_status)
             VALUES (:p_case, :p_msg, :p_orig, :p_safe,
                     :p_mime, :p_ext, :p_size, :p_sha,
                     :p_path, :p_text, :p_ocr)
             ON CONFLICT (sha256) DO UPDATE
                SET case_id = COALESCE(' . self::T_ATTACH . '.case_id, EXCLUDED.case_id)
             RETURNING id',
            [
                ':p_case' => $caseId,
                ':p_msg'  => $messageId,
                ':p_orig' => (string)($att['original_filename'] ?? ''),
                ':p_safe' => (string)($att['safe_filename']     ?? $att['original_filename'] ?? ''),
                ':p_mime' => trim((string)($att['mime_type'] ?? '')) ?: null,
                ':p_ext'  => trim((string)($att['extension'] ?? '')) ?: null,
                ':p_size' => isset($att['file_size_bytes']) ? (int)$att['file_size_bytes'] : null,
                ':p_sha'  => (string)($att['sha256'] ?? ''),
                ':p_path' => trim((string)($att['storage_path']        ?? '')) ?: null,
                ':p_text' => trim((string)($att['extracted_text_path'] ?? '')) ?: null,
                ':p_ocr'  => trim((string)($att['ocr_status'] ?? 'not_required')) ?: 'not_required',
            ]
        );
        return (int)$row['id'];
    }

    // ── Update lifecycle ─────────────────────────────────────────────────

    /** Patch fields the reviewer can correct (extracted_json, lines, etc.). */
    public function updateCase(int $id, array $data, string $actor): array
    {
        $allowed = [
            'document_type','action_type','customer_id','customer_name',
            'customer_po_number','po_date','currency_code','incoterm_code',
            'payment_term_code','overall_confidence',
            'field_confidence','extracted_json',
            'blocking_codes','warning_codes',
        ];
        $sets   = ['updated_at = NOW()', 'updated_by = :p_actor'];
        $params = [':p_actor' => $actor];

        foreach ($allowed as $col) {
            if (!array_key_exists($col, $data)) {
                continue;
            }
            $val = $data[$col];
            if (in_array($col, ['field_confidence','extracted_json',
                                'blocking_codes','warning_codes'], true)) {
                $val = json_encode(is_array($val) || is_object($val) ? $val : []);
            } elseif (is_string($val)) {
                $val = trim($val);
                if ($val === '') { $val = null; }
            }
            $sets[]            = "$col = :p_$col";
            $params[":p_$col"] = $val;
        }

        if (count($sets) < 2) {
            return $this->getCase($id);
        }

        $params[':p_id'] = $id;
        $this->db->execute(
            'UPDATE ' . self::T_CASE . ' SET ' . implode(', ', $sets) . ' WHERE id = :p_id',
            $params
        );
        return $this->getCase($id);
    }

    public function setStatus(int $id, string $status, string $actor, ?string $reason = null): array
    {
        $status = $this->validateStatus($status);
        $extra  = '';
        $params = [
            ':p_status' => $status,
            ':p_actor'  => $actor,
            ':p_id'     => $id,
        ];

        if ($status === 'approved') {
            $extra = ', approved_by = :p_actor, approved_at = NOW()';
        } elseif ($status === 'rejected') {
            $extra = ', rejected_by = :p_actor, rejected_at = NOW(), rejection_reason = :p_reason';
            $params[':p_reason'] = $reason;
        } elseif (in_array($status, ['needs_review','engineering_review','commercial_review',
                                     'planning_review','quality_review'], true)) {
            $extra = ', reviewed_by = :p_actor, reviewed_at = NOW()';
        }

        $this->db->execute(
            'UPDATE ' . self::T_CASE . '
                SET status = :p_status,
                    updated_at = NOW(), updated_by = :p_actor' . $extra . '
              WHERE id = :p_id',
            $params
        );
        return $this->getCase($id);
    }

    /** Record a commit result: store CPO id, SO number, JO/WO arrays. */
    public function recordCommit(int $id, string $type, string $targetRef, array $payload, string $actor, ?string $error = null): void
    {
        // Append to commit_log
        $this->db->execute(
            'INSERT INTO email_intake_commit_log
                (case_id, commit_type, target_ref, status, payload, error_detail, committed_by)
             VALUES (:p_case, :p_type, :p_ref, :p_status, :p_payload, :p_err, :p_actor)',
            [
                ':p_case'    => $id,
                ':p_type'    => $type,
                ':p_ref'     => $targetRef,
                ':p_status'  => $error === null ? 'succeeded' : 'failed',
                ':p_payload' => json_encode($payload),
                ':p_err'     => $error,
                ':p_actor'   => $actor,
            ]
        );

        // Patch case columns when a commit succeeded
        if ($error !== null) {
            return;
        }
        if ($type === 'customer_po') {
            $this->db->execute(
                'UPDATE ' . self::T_CASE . '
                    SET committed_customer_po_id = :p_ref, status = :p_status,
                        updated_at = NOW(), updated_by = :p_actor
                  WHERE id = :p_id',
                [':p_ref' => $targetRef, ':p_status' => 'committed_cpo', ':p_actor' => $actor, ':p_id' => $id]
            );
        } elseif ($type === 'sales_order') {
            $this->db->execute(
                'UPDATE ' . self::T_CASE . '
                    SET committed_so_number = :p_ref, status = :p_status,
                        updated_at = NOW(), updated_by = :p_actor
                  WHERE id = :p_id',
                [':p_ref' => $targetRef, ':p_status' => 'committed_so', ':p_actor' => $actor, ':p_id' => $id]
            );
        } elseif ($type === 'job_order') {
            $row = $this->db->queryOne(
                'SELECT committed_jo_numbers FROM ' . self::T_CASE . ' WHERE id = :p_id',
                [':p_id' => $id]
            );
            $list = $this->jsonDecode($row['committed_jo_numbers'] ?? '[]');
            $list[] = $targetRef;
            $this->db->execute(
                'UPDATE ' . self::T_CASE . '
                    SET committed_jo_numbers = :p_list, status = :p_status,
                        updated_at = NOW(), updated_by = :p_actor
                  WHERE id = :p_id',
                [':p_list' => json_encode($list), ':p_status' => 'committed_jo', ':p_actor' => $actor, ':p_id' => $id]
            );
        } elseif ($type === 'work_order') {
            $row = $this->db->queryOne(
                'SELECT committed_wo_numbers FROM ' . self::T_CASE . ' WHERE id = :p_id',
                [':p_id' => $id]
            );
            $list = $this->jsonDecode($row['committed_wo_numbers'] ?? '[]');
            $list[] = $targetRef;
            $this->db->execute(
                'UPDATE ' . self::T_CASE . '
                    SET committed_wo_numbers = :p_list, status = :p_status,
                        updated_at = NOW(), updated_by = :p_actor
                  WHERE id = :p_id',
                [':p_list' => json_encode($list), ':p_status' => 'committed_wo', ':p_actor' => $actor, ':p_id' => $id]
            );
        }
    }

    // ── Validation checks ────────────────────────────────────────────────

    public function recordCheck(int $caseId, array $check): void
    {
        $this->db->execute(
            'INSERT INTO ' . self::T_VCHECK . '
                (case_id, check_code, severity, result, message, details)
             VALUES (:p_case, :p_code, :p_sev, :p_res, :p_msg, :p_det)',
            [
                ':p_case' => $caseId,
                ':p_code' => (string)($check['check_code'] ?? ''),
                ':p_sev'  => (string)($check['severity']   ?? 'info'),
                ':p_res'  => (string)($check['result']     ?? 'pass'),
                ':p_msg'  => trim((string)($check['message'] ?? '')) ?: null,
                ':p_det'  => json_encode($check['details'] ?? []),
            ]
        );
    }

    public function clearChecks(int $caseId): void
    {
        $this->db->execute(
            'DELETE FROM ' . self::T_VCHECK . ' WHERE case_id = :p_case',
            [':p_case' => $caseId]
        );
    }

    public function applyValidationOutcome(int $caseId, array $outcome): array
    {
        $this->db->execute(
            'UPDATE ' . self::T_CASE . '
                SET validation_json = :p_v,
                    blocking_codes  = :p_blk,
                    warning_codes   = :p_wrn,
                    status          = :p_status,
                    updated_at      = NOW()
              WHERE id = :p_id',
            [
                ':p_v'      => json_encode($outcome),
                ':p_blk'    => json_encode($outcome['blocking_codes'] ?? []),
                ':p_wrn'    => json_encode($outcome['warning_codes']  ?? []),
                ':p_status' => $this->validateStatus((string)($outcome['status'] ?? 'needs_review')),
                ':p_id'     => $caseId,
            ]
        );
        return $this->getCase($caseId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private function validateStatus(string $status): string
    {
        if (!in_array($status, self::VALID_STATUSES, true)) {
            throw new RuntimeException('Invalid case status: ' . $status);
        }
        return $status;
    }

    private function generateIntakeNo(): string
    {
        $year = date('Y');
        $row  = $this->db->queryOne(
            "SELECT COUNT(*) AS n FROM " . self::T_CASE
            . " WHERE intake_no LIKE :p_prefix",
            [':p_prefix' => "INT-{$year}-%"]
        );
        $n = ((int)($row['n'] ?? 0)) + 1;
        return sprintf('INT-%s-%06d', $year, $n);
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
}
