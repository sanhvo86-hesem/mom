<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;

/**
 * EmailIntakeHeaderRuleService — single source of truth for parsing the
 * `[HESEM-ORDER-INTAKE] ... [/HESEM-ORDER-INTAKE]` header block, parsing
 * "Line NN" line-item blocks, and enforcing the per-rule policy stored
 * in `email_intake_header_rule`.
 *
 * Why split out from EmailIntakeImapService:
 *   The IMAP poll, the worker push endpoint, the test_parse admin tool
 *   and the validation service all need the same parser. When each one
 *   keeps a private copy the implementations drift, the test_parse UI
 *   shows results that production never reproduces, and the validation
 *   pipeline ends up re-implementing field synonyms it doesn't own.
 *
 * Policy contract (mirrors the GPT Pro audit recommendations):
 *   - matchRules() picks the highest-priority enabled rule whose
 *     subject_prefix and body markers fit the incoming email.
 *   - validateParsedHeader() checks required_fields, allowed_doc_types,
 *     allowed_actions, ai_process_must_equal and applies
 *     missing_header_action when nothing matches.
 *   - The caller (IMAP poll, worker endpoint, test_parse) decides what
 *     to do with the outcome — this service NEVER mutates a case.
 *
 * @package MOM\Api\Services
 */
final class EmailIntakeHeaderRuleService
{
    public const POLICY_IGNORE       = 'ignore';
    public const POLICY_CREATE_HOLD  = 'create_hold';
    public const POLICY_REJECT       = 'reject';
    public const POLICY_ALLOW_LLM    = 'allow_llm_fallback';

    private const T_HEADER_RULE = 'email_intake_header_rule';

    public function __construct(
        private readonly ?Connection $db = null
    ) {}

    // ── Header block ────────────────────────────────────────────────────

    /**
     * Parse the `[HESEM-ORDER-INTAKE] ... [/HESEM-ORDER-INTAKE]` block
     * from an email body. Returns the canonical $hdr shape used by the
     * IMAP poll. All fields are non-null strings; arrays are empty when
     * the block is absent.
     *
     * Custom start/end markers can be supplied (e.g. when a rule
     * overrides the default markers).
     *
     * @return array{
     *   doc_type:string, action:string, customer_id:string,
     *   customer_name:string, customer_po_number:string, po_date:string,
     *   currency_code:string, incoterm_code:string, payment_term_code:string,
     *   ship_to_name:string, ship_to_addr:string,
     *   ai_process:string, raw_block:string, parsed:array<string,string>
     * }
     */
    public function parseHeaderBlock(
        string $bodyText,
        string $startMarker = '[HESEM-ORDER-INTAKE]',
        string $endMarker   = '[/HESEM-ORDER-INTAKE]'
    ): array {
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

        $pattern = '/' . preg_quote($startMarker, '/') . '(.*?)' . preg_quote($endMarker, '/') . '/is';
        if (!preg_match($pattern, $bodyText, $m)) {
            return $out;
        }

        $block = trim((string)$m[1]);
        $out['raw_block'] = mb_substr($block, 0, 2000);

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

        // Tolerant key synonyms.
        $get = static function (string ...$keys) use ($parsed): string {
            foreach ($keys as $k) {
                if (isset($parsed[$k]) && $parsed[$k] !== '') { return $parsed[$k]; }
            }
            return '';
        };

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

    // ── Line items ──────────────────────────────────────────────────────

    /**
     * Parse "Line NN" line-item blocks from the body. Returns the array
     * shape that `EmailIntakeCaseService::addLine` accepts.
     *
     * @return list<array<string,mixed>>
     */
    public function parseLineItems(string $bodyText): array
    {
        if ($bodyText === '') {
            return [];
        }

        // Strip the header block so its keys don't confuse the parser.
        $bodyText = preg_replace(
            '/\[HESEM-ORDER-INTAKE\].*?\[\/HESEM-ORDER-INTAKE\]/is',
            '', $bodyText
        ) ?? $bodyText;

        $chunks = preg_split('/^\s*Line\s+(\d+)\s*\r?\n/m', $bodyText, -1, PREG_SPLIT_DELIM_CAPTURE);
        if (!is_array($chunks) || count($chunks) < 3) {
            return [];
        }

        $out = [];
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

    // ── Rules (DB-backed) ───────────────────────────────────────────────

    /**
     * Find the highest-priority enabled rule whose subject_prefix and
     * body markers (if set) fit the incoming email. Returns null if
     * no rule matches.
     *
     * @return ?array<string,mixed>
     */
    public function matchRule(string $subject, string $bodyText): ?array
    {
        if ($this->db === null) {
            return null;
        }
        $rows = $this->db->query(
            'SELECT * FROM ' . self::T_HEADER_RULE
            . ' WHERE enabled = TRUE ORDER BY id ASC'
        );
        foreach ($rows as $r) {
            $prefix = trim((string)($r['subject_prefix'] ?? ''));
            $start  = trim((string)($r['body_start_marker'] ?? ''));
            $end    = trim((string)($r['body_end_marker']   ?? ''));

            if ($prefix !== '' && stripos($subject, $prefix) === false) {
                continue;
            }
            if ($start !== '' && $end !== ''
                && !preg_match('/' . preg_quote($start, '/') . '.*?' . preg_quote($end, '/') . '/is', $bodyText)) {
                continue;
            }
            return $r;
        }
        return null;
    }

    /**
     * Apply a rule's policy to a parsed header block. Returns the action
     * the caller should take and the human-readable reason for the audit
     * log.
     *
     * @param array<string,mixed> $rule      Row from email_intake_header_rule
     * @param array<string,mixed> $parsedHdr Output of parseHeaderBlock()
     * @return array{outcome:string, reason:string, missing:list<string>}
     *         outcome ∈ { 'ok', 'ignore', 'security_hold', 'reject', 'allow_llm_fallback' }
     */
    public function validateParsedHeader(array $rule, array $parsedHdr): array
    {
        $missing = [];
        $parsed  = (array)($parsedHdr['parsed'] ?? []);

        // 1. Required key/value pairs
        $required = $this->jsonDecodeArray($rule['required_fields'] ?? []);
        foreach ($required as $field) {
            $k = strtolower(str_replace(' ', '-', (string)$field));
            if (!isset($parsed[$k]) || trim((string)$parsed[$k]) === '') {
                $missing[] = (string)$field;
            }
        }

        // 2. Allowed doc types
        $docType   = (string)($parsedHdr['doc_type'] ?? '');
        $allowedDt = $this->jsonDecodeArray($rule['allowed_doc_types'] ?? []);
        $docOk = ($docType !== '' && (in_array($docType, $allowedDt, true) || $allowedDt === []));

        // 3. Allowed actions
        $action    = (string)($parsedHdr['action'] ?? '');
        $allowedAc = $this->jsonDecodeArray($rule['allowed_actions'] ?? []);
        $actOk = ($action !== '' && (in_array($action, $allowedAc, true) || $allowedAc === []));

        // 4. AI-Process gate
        $aiMust = trim((string)($rule['ai_process_must_equal'] ?? ''));
        $aiProc = (string)($parsedHdr['ai_process'] ?? '');
        $aiOk   = ($aiMust === '' || strcasecmp($aiProc, $aiMust) === 0);

        if ($missing === [] && $docOk && $actOk && $aiOk) {
            return ['outcome' => 'ok', 'reason' => 'header valid', 'missing' => []];
        }

        $reasonParts = [];
        if ($missing !== []) { $reasonParts[] = 'missing fields: ' . implode(',', $missing); }
        if (!$docOk)         { $reasonParts[] = "doc_type '$docType' not in allowed list"; }
        if (!$actOk)         { $reasonParts[] = "action '$action' not in allowed list"; }
        if (!$aiOk)          { $reasonParts[] = "AI-Process '$aiProc' must equal '$aiMust'"; }
        $reason = implode('; ', $reasonParts);

        $policy = (string)($rule['missing_header_action'] ?? self::POLICY_IGNORE);
        $outcome = match ($policy) {
            self::POLICY_REJECT      => 'reject',
            self::POLICY_CREATE_HOLD => 'security_hold',
            self::POLICY_ALLOW_LLM   => 'allow_llm_fallback',
            default                  => 'ignore',
        };

        return ['outcome' => $outcome, 'reason' => $reason, 'missing' => $missing];
    }

    /** Best-effort date normalisation. Returns '' if input is empty/unparseable. */
    public function normaliseIsoDate(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') { return ''; }
        $raw = trim((string)preg_replace('/\s*\(.*$/', '', $raw));
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            return $raw;
        }
        $ts = strtotime($raw);
        if ($ts === false) {
            return '';
        }
        return date('Y-m-d', $ts);
    }

    // ── Internals ───────────────────────────────────────────────────────

    /**
     * @return array<string,mixed>
     */
    private function extractLineFields(string $lineNo, string $body): array
    {
        $fields = [];
        foreach (preg_split('/\r?\n/', $body) ?: [] as $rawLine) {
            $line = trim($rawLine);
            if ($line === '') { continue; }
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
        $qty = 0.0;
        $uom = 'EA';
        if (preg_match('/^([\d.,]+)\s*([A-Za-z]+)?/', $qtyRaw, $qm)) {
            $qty = (float)str_replace(',', '', $qm[1]);
            if (!empty($qm[2])) { $uom = strtoupper($qm[2]); }
        }
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

    /**
     * @param mixed $raw
     * @return list<string>
     */
    private function jsonDecodeArray(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values(array_map('strval', $raw));
        }
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return array_values(array_map('strval', $decoded));
            }
        }
        return [];
    }
}
