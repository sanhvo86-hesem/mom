<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

/**
 * OrderEmailParserService — calls the Anthropic Claude API to extract
 * structured order data from a customer email body (and optionally the
 * extracted text of an attached PO). Returns the strict JSON schema
 * documented in tools/ai-order-intake/claude-order-extract-template.md.
 *
 * Hard rules (mirror the prompt template):
 *   • Return JSON only — anything else is treated as a parse failure.
 *   • schema_version must equal he-sem-email-intake-extraction-v1.
 *   • Required fields: customer_po_number, customer_id, part_number,
 *     revision_number, quantity, requested_delivery_date, delivery_address.
 *   • Field-level confidence is mandatory.
 *
 * The service is **fallback-only**. The Phase 2.5 body-header parser
 * (EmailIntakeImapService::parseBodyHeaderBlock) handles the standard
 * [HESEM-ORDER-INTAKE] format without any LLM call. We invoke Claude
 * only when:
 *   • the body has NO header block at all, OR
 *   • the case has attachments whose text content needs structuring.
 *
 * That keeps the per-poll cost low and the parsing deterministic for
 * the well-formed admin-templated emails.
 *
 * Configuration:
 *   ANTHROPIC_API_KEY env var (php-fpm pool config) — required.
 *   ANTHROPIC_MODEL    env var — optional, defaults to claude-haiku-4-5.
 *
 * @package MOM\Api\Services
 */
final class OrderEmailParserService
{
    private const API_URL          = 'https://api.anthropic.com/v1/messages';
    private const API_VERSION      = '2023-06-01';
    private const DEFAULT_MODEL    = 'claude-haiku-4-5';
    private const MAX_TOKENS       = 4096;
    private const TIMEOUT_SECONDS  = 60;
    private const SCHEMA_VERSION   = 'he-sem-email-intake-extraction-v1';

    private string $apiKey;
    private string $model;

    public function __construct(?string $apiKey = null, ?string $model = null)
    {
        $key = $apiKey ?? (string)getenv('ANTHROPIC_API_KEY');
        if ($key === '' || !str_starts_with($key, 'sk-ant-')) {
            throw new RuntimeException(
                'ANTHROPIC_API_KEY env variable is missing or malformed. '
                . 'Generate one at https://console.anthropic.com/settings/keys '
                . 'and add env[ANTHROPIC_API_KEY] = "sk-ant-..." to the php-fpm pool.'
            );
        }
        $this->apiKey = $key;
        $this->model  = $model ?? (string)(getenv('ANTHROPIC_MODEL') ?: self::DEFAULT_MODEL);
    }

    /** Whether the service is configured (cheap probe — does not call the API). */
    public static function isConfigured(): bool
    {
        $key = (string)getenv('ANTHROPIC_API_KEY');
        return $key !== '' && str_starts_with($key, 'sk-ant-');
    }

    /**
     * Extract structured order data from email body + optional attachment
     * text. Returns the strict JSON schema or throws RuntimeException on
     * parse / network / API errors.
     *
     * @param array<string,mixed> $context  Optional context bag with keys:
     *                                       - from_email, subject, received_at
     *                                       - attachment_filename, attachment_text
     *                                       - customer_template_hints (array)
     */
    public function extractOrder(string $bodyText, array $context = []): array
    {
        $prompt = $this->buildUserPrompt($bodyText, $context);

        $payload = [
            'model'       => $this->model,
            'max_tokens'  => self::MAX_TOKENS,
            'system'      => $this->systemPrompt(),
            'messages'    => [['role' => 'user', 'content' => $prompt]],
            'temperature' => 0.0,
        ];

        $response = $this->postJson(self::API_URL, $payload);

        // The Anthropic API returns {content: [{type:'text', text:'...'}], ...}
        $text = '';
        foreach (((array)($response['content'] ?? [])) as $block) {
            if (($block['type'] ?? '') === 'text') {
                $text .= (string)($block['text'] ?? '');
            }
        }
        $text = trim($text);
        if ($text === '') {
            throw new RuntimeException('Claude API returned no text content.');
        }

        // The prompt instructs JSON-only output; if Claude wraps in code
        // fences, strip them defensively.
        $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text) ?? $text;

        $parsed = json_decode($text, true);
        if (!is_array($parsed)) {
            throw new RuntimeException('Claude API output is not valid JSON: '
                . mb_substr($text, 0, 300));
        }

        // Validate schema_version
        $version = (string)($parsed['schema_version'] ?? '');
        if ($version !== self::SCHEMA_VERSION) {
            throw new RuntimeException(
                "Claude returned schema_version='{$version}', expected '"
                . self::SCHEMA_VERSION . "'"
            );
        }

        return $parsed;
    }

    // ── Internals ────────────────────────────────────────────────────────

    private function systemPrompt(): string
    {
        return <<<EOT
You are HESEM AI Order Intake — an extraction engine that converts a
customer order email plus its purchase-order attachments into one strict
JSON object describing the order intent.

NON-NEGOTIABLE RULES
1. Return JSON only. No prose, no markdown, no chain-of-thought.
2. Never invent values. If a field is missing, return "" (string) or null
   (number) and add a warning to `warnings`.
3. Preserve part numbers and revision codes EXACTLY as they appear in the
   source. Do not normalise case, strip dashes, or merge separators.
4. Normalise dates to ISO YYYY-MM-DD ONLY when the calendar order is
   unambiguous in the source. Otherwise return the raw string and warn.
5. Include `evidence` for every required field — a short snippet (max 120
   chars) showing exactly where you read the value from.
6. Confidence values are real (0.00–1.00).
7. If any required field has confidence < 0.90, set
   `overall_recommendation` to `"needs_review"`.
8. If you encounter PO changes/cancellations, set `document_type` and
   `action` accordingly (PO_CHANGE / PO_CANCEL / EXPEDITE).
9. Multiple PO lines must be returned as multiple objects inside `lines`.

REQUIRED FIELDS
   document_type, action, overall_confidence, overall_recommendation,
   customer.customer_id, customer.customer_name, customer.sender_email,
   purchase_order.customer_po_number, purchase_order.po_date,
   ship_to.delivery_address,
   lines[].part_number, lines[].revision_number, lines[].quantity,
   lines[].uom, lines[].requested_delivery_date.

OUTPUT SCHEMA (return EXACTLY this structure, schema_version is mandatory)
```
{
  "schema_version": "he-sem-email-intake-extraction-v1",
  "document_type": "CUSTOMER_PO|PO_CHANGE|PO_CANCEL|EXPEDITE|UNKNOWN",
  "action": "NEW|CHANGE|CANCEL|EXPEDITE|UNKNOWN",
  "overall_confidence": 0.0,
  "overall_recommendation": "commit_candidate|needs_review|reject",
  "customer": {"customer_id":"","customer_name":"","sender_email":""},
  "purchase_order": {"customer_po_number":"","po_date":"","currency_code":"","incoterm_code":"","payment_term_code":"","buyer_name":"","buyer_email":""},
  "ship_to": {"ship_to_name":"","delivery_address":"","delivery_city":"","delivery_country":"","delivery_postal_code":""},
  "lines": [
    {"line_no":"","customer_part_number":"","part_number":"","part_description":"","revision_number":"","customer_revision":"","drawing_revision":"","quantity":0,"uom":"EA","requested_delivery_date":"","delivery_address":"","unit_price":null,"line_total":null,"special_requirements":"","evidence":{},"field_confidence":{}}
  ],
  "field_confidence": {},
  "warnings": [],
  "extraction_notes": []
}
```
EOT;
    }

    private function buildUserPrompt(string $bodyText, array $context): string
    {
        $from = (string)($context['from_email'] ?? '');
        $subj = (string)($context['subject'] ?? '');
        $recv = (string)($context['received_at'] ?? '');
        $imid = (string)($context['internet_message_id'] ?? '');
        $attFn = (string)($context['attachment_filename'] ?? '');
        $attTxt = (string)($context['attachment_text'] ?? '');
        $hints = (array)($context['customer_template_hints'] ?? []);

        $hintBlock = '';
        if ($hints !== []) {
            foreach ($hints as $k => $vs) {
                if (is_array($vs) && $vs !== []) {
                    $hintBlock .= "$k: " . implode(', ', array_map('strval', $vs)) . "\n";
                }
            }
        }

        // Cap body at 20 KB to keep token usage bounded.
        $bodyText = mb_substr($bodyText, 0, 20000);
        $attTxt   = mb_substr($attTxt,   0, 20000);

        return <<<PROMPT
EMAIL METADATA
From:               {$from}
Subject:            {$subj}
Received:           {$recv}
Internet-Message-Id:{$imid}

EMAIL BODY (full)
---
{$bodyText}
---

ATTACHMENT EXTRACTED TEXT (filename: {$attFn})
---
{$attTxt}
---

CUSTOMER TEMPLATE HINTS
{$hintBlock}

Now produce the JSON. Do not write anything else.
PROMPT;
    }

    /**
     * Minimal cURL JSON POST. Returns decoded response or throws.
     *
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function postJson(string $url, array $payload): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('curl_init failed.');
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_SLASHES),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-key: ' . $this->apiKey,
                'anthropic-version: ' . self::API_VERSION,
            ],
            CURLOPT_TIMEOUT        => self::TIMEOUT_SECONDS,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $raw = curl_exec($ch);
        $err = curl_error($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);

        if ($raw === false || $err !== '') {
            throw new RuntimeException('Anthropic API curl error: ' . $err);
        }
        if ($code < 200 || $code >= 300) {
            throw new RuntimeException("Anthropic API HTTP $code: "
                . mb_substr((string)$raw, 0, 500));
        }

        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Anthropic API response is not JSON: '
                . mb_substr((string)$raw, 0, 300));
        }
        return $decoded;
    }
}
