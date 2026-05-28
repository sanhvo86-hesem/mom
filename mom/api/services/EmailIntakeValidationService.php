<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use RuntimeException;

/**
 * EmailIntakeValidationService — the 20 ordered safety checks the spec
 * requires before any AI case can be committed.
 *
 * The service runs the checks against the DB rows the case already
 * carries (extracted_json + lines) and writes per-check evidence into
 * email_intake_validation_check. The final outcome (status,
 * blocking_codes, warning_codes) is applied back to email_intake_case
 * via EmailIntakeCaseService::applyValidationOutcome.
 *
 * Checks are intentionally idempotent — calling validateCase twice
 * produces the same outcome. The previous evidence is cleared first via
 * EmailIntakeCaseService::clearChecks so the audit trail reflects the
 * latest run.
 *
 * @package MOM\Api\Services
 */
final class EmailIntakeValidationService
{
    /** Map: failure_code → triage status. */
    private const STATUS_BY_CODE = [
        'case_not_found'            => 'error',
        'email_scope_not_allowed'   => 'security_hold',
        'sender_not_allowed'        => 'security_hold',
        'missing_or_invalid_header' => 'security_hold',
        'unsupported_attachment'    => 'security_hold',
        'duplicate_message'         => 'duplicate_hold',
        'duplicate_attachment'      => 'duplicate_hold',
        'duplicate_customer_po'     => 'duplicate_hold',
        'missing_customer_po_number'=> 'commercial_review',
        'unknown_customer'          => 'commercial_review',
        'customer_not_active'       => 'commercial_review',
        'missing_po_line'           => 'needs_review',
        'invalid_quantity'          => 'needs_review',
        'unknown_part_number'       => 'engineering_review',
        'part_not_active'           => 'engineering_review',
        'missing_revision'          => 'engineering_review',
        'revision_not_found'        => 'engineering_review',
        'revision_not_released'     => 'engineering_review',
        'revision_mismatch'         => 'engineering_review',
        'invalid_delivery_date'     => 'planning_review',
        'delivery_date_in_past'     => 'planning_review',
        'unknown_ship_to_address'   => 'commercial_review',
        'missing_price_for_sales_order' => 'commercial_review',
        'low_confidence'            => 'needs_review',
    ];

    public function __construct(
        private readonly Connection $db,
        private readonly EmailIntakeCaseService $cases,
        private readonly EmailIntakeConfigService $config,
        /**
         * Optional — when injected, the part / revision check uses this
         * service to look up the master data tables. Without it the
         * checks degrade to "warning, lookup not wired" (legacy/demo).
         * In production the EmailIntakeController wires this in.
         * Per GPT Pro audit P0-07/08.
         */
        private readonly ?MasterDataLookupService $masterLookup = null
    ) {}

    /**
     * Run the full validation pipeline. Returns the outcome array; the
     * caller may then apply it via the case service.
     */
    public function validateCase(int $caseId, string $actor = 'system.aeoi_validation'): array
    {
        $case = $this->cases->getCase($caseId);
        $cfg  = $this->config->loadConfig();

        $this->cases->clearChecks($caseId);

        $blockers = [];
        $warnings = [];

        // 1. case_exists — implicit because getCase() would have thrown.
        $this->pass($caseId, 'case_exists', 'info', 'Case exists.');

        // 2. email_scope_allowed (cross-checked when worker submits, but
        //    re-confirmed here using mailbox_id linkage).
        if (!empty($case['mailbox_id'])) {
            $mbx = $this->db->queryOne(
                'SELECT id, enabled, mailbox_address, folder_path
                   FROM email_intake_mailbox WHERE id = :p_id',
                [':p_id' => (int)$case['mailbox_id']]
            );
            if (!$mbx || !$mbx['enabled']) {
                $blockers[] = 'email_scope_not_allowed';
                $this->fail($caseId, 'email_scope_allowed', 'blocker', 'Mailbox row disabled or removed.');
            } else {
                $this->pass($caseId, 'email_scope_allowed', 'info', "Mailbox {$mbx['mailbox_address']} :: {$mbx['folder_path']}");
            }
        } else {
            $this->pass($caseId, 'email_scope_allowed', 'info', 'No mailbox link (manual/test source).');
        }

        // 3. sender_allowed — P0-12: source-of-truth is the email_intake_message
        // row (what IMAP/worker actually received), NOT the extracted_json. LLM
        // extraction can lie or be missing; the message row cannot.
        $fromEmail = '';
        if (!empty($case['message_id'])) {
            $msgRow = $this->db->queryOne(
                'SELECT from_email FROM email_intake_message WHERE id = :p_id',
                [':p_id' => (int)$case['message_id']]
            );
            $fromEmail = strtolower(trim((string)($msgRow['from_email'] ?? '')));
        }
        if ($fromEmail === '') {
            $fromEmail = strtolower(trim((string)($case['extracted_json']['email']['from_email'] ?? '')));
        }
        if ($fromEmail === '') {
            $blockers[] = 'sender_missing';
            $this->fail($caseId, 'sender_allowed', 'blocker',
                'No sender email recorded on the case (neither message row nor extraction).');
        } else {
            $allow = $this->config->isEmailAllowed($fromEmail);
            if (!$allow['allowed']) {
                $blockers[] = 'sender_not_allowed';
                $this->fail($caseId, 'sender_allowed', 'blocker', "Sender {$fromEmail} not in allowlist.");
            } else {
                $this->pass($caseId, 'sender_allowed', 'info', "Matched by {$allow['match_type']}.");
            }
        }

        // 4. header_valid — P0-13: full check using EmailIntakeHeaderRuleService
        // when a header_rule_id is attached. Falls back to the legacy
        // document_type/action_type presence check when no rule is configured.
        if (!empty($case['header_rule_id']) && !empty($case['message_id'])) {
            try {
                require_once __DIR__ . '/EmailIntakeHeaderRuleService.php';
                $hdrSvc = new EmailIntakeHeaderRuleService($this->db);
                $bodyRow = $this->db->queryOne(
                    'SELECT body_preview, subject FROM email_intake_message WHERE id = :p_id',
                    [':p_id' => (int)$case['message_id']]
                );
                $body = (string)($bodyRow['body_preview'] ?? '');
                $subj = (string)($bodyRow['subject']      ?? '');
                $rule = $this->db->queryOne(
                    'SELECT * FROM email_intake_header_rule WHERE id = :p_id',
                    [':p_id' => (int)$case['header_rule_id']]
                );
                if ($rule) {
                    $hdr   = $hdrSvc->parseHeaderBlock($body);
                    $check = $hdrSvc->validateParsedHeader($rule, $hdr);
                    $headerOk = in_array((string)($check['outcome'] ?? ''), ['ok','allow_llm_fallback'], true);
                    if (!$headerOk) {
                        $blockers[] = 'missing_or_invalid_header';
                        $this->fail($caseId, 'header_valid', 'blocker',
                            'Header rule check returned ' . ($check['outcome'] ?? '?') . ': '
                            . ($check['reason'] ?? '(no reason)'));
                    } else {
                        $this->pass($caseId, 'header_valid', 'info',
                            'Header rule "' . ($rule['name'] ?? $rule['id']) . '" → ' . ($check['outcome'] ?? 'ok'));
                    }
                }
                unset($subj);
            } catch (\Throwable $e) {
                $blockers[] = 'header_check_failed';
                $this->fail($caseId, 'header_valid', 'blocker', 'Header recheck failed: ' . $e->getMessage());
            }
        } elseif (empty($case['document_type']) || empty($case['action_type'])) {
            $blockers[] = 'missing_or_invalid_header';
            $this->fail($caseId, 'header_valid', 'blocker', 'document_type or action_type missing.');
        } else {
            $this->pass($caseId, 'header_valid', 'info', "{$case['document_type']} / {$case['action_type']}.");
        }

        // 5. attachment_valid — P0-14: when require_attachment is true and the
        // doc type is a Customer PO family, missing attachments is a blocker
        // (the LLM cannot extract from headers alone for production orders).
        $allowedExt = array_map('strtolower', $cfg['allowed_attachment_types'] ?? ['pdf','xlsx','docx']);
        $attachCount  = count((array)($case['attachments'] ?? []));
        $needsAttach  = ($cfg['require_attachment'] ?? true)
            && in_array((string)$case['document_type'], ['CUSTOMER_PO','PO_CHANGE'], true);
        if ($needsAttach && $attachCount === 0) {
            $blockers[] = 'missing_attachment';
            $this->fail($caseId, 'attachment_valid', 'blocker',
                'Customer PO requires at least one attachment (PDF/XLSX/DOCX).');
        } else {
            $attachIssues = [];
            foreach ((array)($case['attachments'] ?? []) as $att) {
                $ext = strtolower(trim((string)($att['extension'] ?? '')));
                if ($ext === '' || !in_array($ext, $allowedExt, true)) {
                    $attachIssues[] = "{$att['original_filename']} (.{$ext})";
                }
                if (trim((string)($att['sha256'] ?? '')) === '') {
                    $attachIssues[] = "{$att['original_filename']} (missing sha256)";
                }
            }
            if ($attachIssues) {
                $blockers[] = 'unsupported_attachment';
                $this->fail($caseId, 'attachment_valid', 'blocker',
                    'Unsupported or unhashed attachment(s): ' . implode(', ', $attachIssues));
            } else {
                $this->pass($caseId, 'attachment_valid', 'info', "$attachCount attachment(s) ok.");
            }
        }

        // 6. customer_po_number_required
        $needsPo = in_array((string)$case['document_type'], ['CUSTOMER_PO','PO_CHANGE','PO_CANCEL'], true);
        if ($needsPo && trim((string)($case['customer_po_number'] ?? '')) === '') {
            $blockers[] = 'missing_customer_po_number';
            $this->fail($caseId, 'customer_po_number_required', 'blocker', 'customer_po_number is required for ' . $case['document_type']);
        } else {
            $this->pass($caseId, 'customer_po_number_required', 'info', $needsPo
                ? "PO {$case['customer_po_number']} present."
                : 'Not required for this document_type.');
        }

        // 7. customer_match — P0-11: an empty customer_id is itself a blocker.
        // The LLM might extract a blank customer_id and the gate used to skip
        // the check entirely, letting the case pass with an unknown party.
        $customerId = trim((string)($case['customer_id'] ?? ''));
        if ($customerId === '') {
            $blockers[] = 'unknown_customer';
            $this->fail($caseId, 'customer_match', 'blocker',
                'customer_id is missing from the extraction.');
        } else {
            try {
                $cust = $this->db->queryOne(
                    'SELECT customer_id, customer_status FROM customers WHERE customer_id = :p_id',
                    [':p_id' => $customerId]
                );
                if (!$cust) {
                    $blockers[] = 'unknown_customer';
                    $this->fail($caseId, 'customer_match', 'blocker', "Customer {$customerId} not in master data.");
                } elseif (strtolower((string)($cust['customer_status'] ?? 'active')) !== 'active') {
                    $blockers[] = 'customer_not_active';
                    $this->fail($caseId, 'customer_match', 'blocker',
                        "Customer {$customerId} customer_status='{$cust['customer_status']}' (must be 'active').");
                } else {
                    $this->pass($caseId, 'customer_match', 'info', "Customer {$customerId} active.");
                }
            } catch (\Throwable $e) {
                $blockers[] = 'customer_lookup_failed';
                $this->fail($caseId, 'customer_match', 'blocker',
                    'customers lookup failed: ' . $e->getMessage());
            }
        }

        // 8. duplicate_customer_po — check whether an earlier AEOI case has
        //    already produced (or attempted) a Customer PO with the same
        //    customer_id + customer_po_number combination. The
        //    CustomerPurchaseOrderService will reject true duplicates at
        //    commit time as well, but flagging it here lets the reviewer
        //    see the conflict before approving.
        if (!empty($case['customer_po_number']) && !empty($case['customer_id'])) {
            $dup = $this->db->queryOne(
                'SELECT id, intake_no, status, committed_customer_po_id
                   FROM email_intake_case
                  WHERE id != :p_self
                    AND customer_id = :p_cust
                    AND customer_po_number = :p_po
                  ORDER BY created_at DESC
                  LIMIT 1',
                [
                    ':p_self' => $caseId,
                    ':p_cust' => (string)$case['customer_id'],
                    ':p_po'   => (string)$case['customer_po_number'],
                ]
            );
            if ($dup) {
                $blockers[] = 'duplicate_customer_po';
                $this->fail($caseId, 'duplicate_customer_po', 'blocker',
                    "Another AEOI case already exists for {$case['customer_id']}/{$case['customer_po_number']}: "
                    . ($dup['intake_no'] ?? '?') . ' (status: ' . ($dup['status'] ?? '?') . ').');
            } else {
                $this->pass($caseId, 'duplicate_customer_po', 'info',
                    "No prior AEOI case for {$case['customer_id']}/{$case['customer_po_number']}.");
            }
        }

        // 9-13. Per-line checks
        if ($needsPo && empty($case['lines'])) {
            $blockers[] = 'missing_po_line';
            $this->fail($caseId, 'line_required', 'blocker', 'CUSTOMER_PO requires at least one line.');
        }

        foreach ((array)($case['lines'] ?? []) as $lineIdx => $line) {
            $lineLabel = 'L' . ($lineIdx + 1);
            // qty
            if ((float)($line['quantity'] ?? 0) <= 0) {
                $blockers[] = 'invalid_quantity';
                $this->fail($caseId, 'quantity_positive', 'blocker', "$lineLabel quantity must be > 0.");
            }
            // part_number existence — checked against MasterDataLookupService.
            // Per GPT Pro audit P0-07/08, an unavailable master-data lookup
            // must NOT silently pass. It becomes a configuration_error
            // blocker so the admin knows the gate is broken.
            $pn = trim((string)($line['part_number'] ?? ''));
            if ($pn === '') {
                $blockers[] = 'unknown_part_number';
                $this->fail($caseId, 'part_exists', 'blocker', "$lineLabel missing part_number.");
            } elseif ($this->masterLookup === null) {
                // No lookup wired — keep legacy behaviour (warn-only) so a
                // bare install still works for demo. Production deploy MUST
                // inject MasterDataLookupService.
                $this->pass($caseId, 'part_exists', 'warning', "$lineLabel master-data lookup not wired; skipping.");
            } elseif (!$this->masterLookup->isAvailable()) {
                $blockers[] = 'master_data_lookup_unavailable';
                $this->fail($caseId, 'part_exists', 'blocker',
                    "$lineLabel master-data lookup unavailable: " . $this->masterLookup->describeAvailability());
            } else {
                $part = $this->masterLookup->findPart($pn);
                if ($part === null) {
                    $blockers[] = 'unknown_part_number';
                    $this->fail($caseId, 'part_exists', 'blocker', "$lineLabel part_number $pn not found in master data.");
                } else {
                    $partStatus = strtolower((string)($part['status'] ?? $part['engineering_status'] ?? 'active'));
                    if (in_array($partStatus, ['obsolete', 'superseded', 'disabled', 'on_hold'], true)) {
                        $blockers[] = 'part_not_active';
                        $this->fail($caseId, 'part_exists', 'blocker', "$lineLabel part $pn status={$partStatus}.");
                    } else {
                        $this->pass($caseId, 'part_exists', 'info', "$lineLabel part $pn ok.");
                    }
                }
            }
            // revision_required — must exist on case line AND in master data
            $rev = trim((string)($line['revision_number'] ?? ''));
            if ($rev === '') {
                $blockers[] = 'missing_revision';
                $this->fail($caseId, 'revision_required', 'blocker', "$lineLabel missing revision_number.");
            } elseif ($this->masterLookup !== null && $this->masterLookup->isAvailable() && $pn !== '') {
                $revRow = $this->masterLookup->findRevisionForPart($pn, $rev);
                if ($revRow === null) {
                    $blockers[] = 'revision_not_found';
                    $this->fail($caseId, 'revision_exists_for_part', 'blocker',
                        "$lineLabel revision $rev not found for part $pn.");
                } elseif (!$this->masterLookup->isRevisionReleased($revRow)) {
                    $blockers[] = 'revision_not_released';
                    $this->fail($caseId, 'revision_released', 'blocker',
                        "$lineLabel revision $rev for part $pn is not released — engineering must release before SO commit.");
                } else {
                    $this->pass($caseId, 'revision_exists_for_part', 'info', "$lineLabel rev $rev ok.");
                }
            }
            // delivery_date_valid
            $due = trim((string)($line['requested_delivery_date'] ?? ''));
            if ($due === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $due)) {
                $blockers[] = 'invalid_delivery_date';
                $this->fail($caseId, 'delivery_date_valid', 'blocker', "$lineLabel invalid requested_delivery_date.");
            } elseif (strtotime($due) < strtotime(date('Y-m-d'))) {
                $warnings[] = 'delivery_date_in_past';
                $this->pass($caseId, 'delivery_date_valid', 'warning', "$lineLabel delivery date is in the past.");
            }
            // delivery_address — P0-15: default policy is block.
            // ship-to is critical for an order; downgrade to warning ONLY when
            // policy explicitly says delivery_address_missing_policy=warn.
            $addr = trim((string)($line['delivery_address'] ?? ''));
            if ($addr === '') {
                $policy = strtolower((string)($cfg['delivery_address_missing_policy'] ?? 'block'));
                if ($policy === 'warn') {
                    $warnings[] = 'unknown_ship_to_address';
                    $this->pass($caseId, 'delivery_address_match', 'warning', "$lineLabel missing delivery_address.");
                } else {
                    $blockers[] = 'unknown_ship_to_address';
                    $this->fail($caseId, 'delivery_address_match', 'blocker',
                        "$lineLabel missing delivery_address (policy=block).");
                }
            }
            // unit_price — only blocks SO commit (not CPO)
            if ((float)($line['unit_price'] ?? 0) <= 0) {
                $warnings[] = 'missing_price_for_sales_order';
            }
        }

        // 14. confidence_threshold — P0-10: an absent / zero overall_confidence
        // is itself a blocker. The previous "$overall > 0 &&" guard let a
        // missing field silently pass with the misleading message "0 ≥ 0.95".
        $minOverall = (float)($cfg['confidence_threshold'] ?? 0.95);
        $overall    = (float)($case['overall_confidence'] ?? 0);
        if ($overall <= 0) {
            $blockers[] = 'low_confidence';
            $this->fail($caseId, 'confidence_threshold', 'blocker',
                'overall_confidence missing or zero — extraction did not produce a confidence score.');
        } elseif ($overall < $minOverall) {
            $blockers[] = 'low_confidence';
            $this->fail($caseId, 'confidence_threshold', 'blocker',
                "Overall confidence {$overall} < threshold {$minOverall}.");
        } else {
            $this->pass($caseId, 'confidence_threshold', 'info',
                "Overall confidence {$overall} ≥ {$minOverall}.");
        }

        // 15. commit_policy
        $blockers = array_values(array_unique($blockers));
        $warnings = array_values(array_unique($warnings));

        $status = 'commit_ready';
        if (!empty($cfg['enabled']) === false || ($cfg['auto_create_mode'] ?? 'review_queue') === 'review_queue') {
            $status = 'needs_review';
        }
        if ($blockers) {
            $status = $this->mapStatus($blockers);
        }

        $outcome = [
            'status'         => $status,
            'blocking_codes' => $blockers,
            'warning_codes'  => $warnings,
            'evaluated_at'   => date('c'),
            'min_confidence' => $minOverall,
        ];

        return $this->cases->applyValidationOutcome($caseId, $outcome);
    }

    private function mapStatus(array $blockers): string
    {
        // Priority: security_hold > duplicate_hold > engineering_review > planning_review > commercial_review > needs_review
        $priority = [
            'security_hold' => 0,
            'duplicate_hold' => 1,
            'engineering_review' => 2,
            'planning_review' => 3,
            'commercial_review' => 4,
            'needs_review' => 5,
        ];
        $best = 'needs_review';
        $bestRank = $priority['needs_review'];
        foreach ($blockers as $b) {
            $s = self::STATUS_BY_CODE[$b] ?? 'needs_review';
            // PHPStan knows STATUS_BY_CODE values are always in $priority,
            // so a direct lookup is safe. Fall back to needs_review rank
            // only for forward-compat with new status values.
            $rank = isset($priority[$s]) ? $priority[$s] : $priority['needs_review'];
            if ($rank < $bestRank) {
                $best = $s;
                $bestRank = $rank;
            }
        }
        return $best;
    }

    private function pass(int $caseId, string $code, string $sev, string $msg): void
    {
        $this->cases->recordCheck($caseId, [
            'check_code' => $code,
            'severity'   => $sev,
            'result'     => $sev === 'warning' ? 'warn' : 'pass',
            'message'    => $msg,
        ]);
    }

    private function fail(int $caseId, string $code, string $sev, string $msg): void
    {
        $this->cases->recordCheck($caseId, [
            'check_code' => $code,
            'severity'   => $sev,
            'result'     => 'fail',
            'message'    => $msg,
        ]);
    }
}
