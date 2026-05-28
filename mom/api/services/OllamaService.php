<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

/**
 * OllamaService — wraps Ollama's HTTP API (default http://127.0.0.1:11434).
 *
 * Ollama runs locally on the VPS and exposes a chat-completion API over
 * plain HTTP (no auth, loopback-only). Models run on CPU or GPU and can
 * answer extraction queries entirely on-prem — zero per-token cost and
 * zero data egress. That makes it the right default for AEOI email
 * extraction when the customer's volume is small and quality is "good
 * enough" rather than "best in class".
 *
 * Endpoints used:
 *   • POST /api/chat        — primary extraction call (JSON-mode)
 *   • GET  /api/tags        — health probe + available-model list
 *
 * Design rules:
 *   • Always set "format": "json" so the model returns parseable JSON.
 *   • Temperature 0.0 for deterministic extraction.
 *   • Cap num_ctx at 8192 unless the caller overrides — Llama 3.1 8B
 *     supports more, but bigger contexts slow inference linearly.
 *   • Hard timeout 90s. If Ollama is busy/cold-loading, the router falls
 *     back to the next provider in the chain rather than blocking the
 *     IMAP poll.
 *
 * Config:
 *   Base URL is read from translation_provider_config.driver_command for
 *   provider_key='ollama_local'. Defaults to http://127.0.0.1:11434.
 *
 * @package MOM\Api\Services
 */
final class OllamaService
{
    public const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
    public const DEFAULT_MODEL    = 'llama3.2:3b';
    // 240s = enough margin for 3B model on 4-vCPU CPU-only VPS doing
    // JSON-mode extraction with our schema (typical 100-180s end-to-end).
    private const TIMEOUT_SECONDS = 240;
    // Keep model loaded in Ollama RAM for 30 min after each call so the
    // next extraction doesn't pay the cold-load tax (~30s for 3B).
    private const KEEP_ALIVE      = '30m';
    private const SCHEMA_VERSION  = 'he-sem-email-intake-extraction-v1';

    public function __construct(
        private readonly string $baseUrl = self::DEFAULT_BASE_URL,
        private readonly string $model   = self::DEFAULT_MODEL
    ) {}

    /**
     * Lightweight health probe — does NOT load a model. Returns
     * ['ok' => bool, 'models' => array<string>, 'message' => string].
     *
     * @return array{ok:bool, models:list<string>, message:string}
     */
    public function health(): array
    {
        try {
            $response = $this->getJson($this->baseUrl . '/api/tags');
            $models = [];
            foreach ((array)($response['models'] ?? []) as $m) {
                if (isset($m['name']) && is_string($m['name'])) {
                    $models[] = $m['name'];
                }
            }
            return [
                'ok'      => true,
                'models'  => $models,
                'message' => 'Ollama reachable with ' . count($models) . ' model(s).',
            ];
        } catch (RuntimeException $e) {
            return [
                'ok'      => false,
                'models'  => [],
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Extract structured order data from email body + optional attachment
     * text. Returns the strict JSON schema or throws RuntimeException on
     * parse / network / model errors.
     *
     * Mirrors OrderEmailParserService::extractOrder() so the router can
     * swap providers without the caller re-shaping the response.
     *
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    public function extractOrder(string $bodyText, array $context = []): array
    {
        $systemPrompt = $this->systemPrompt();
        $userPrompt   = $this->buildUserPrompt($bodyText, $context);

        $payload = [
            'model'      => $this->model,
            'stream'     => false,
            'format'     => 'json',
            'keep_alive' => self::KEEP_ALIVE,
            'options'    => [
                'temperature' => 0.0,
                'top_p'       => 0.95,
                'num_ctx'     => 8192,
            ],
            'messages'   => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user',   'content' => $userPrompt],
            ],
        ];

        $response = $this->postJson($this->baseUrl . '/api/chat', $payload);

        // Ollama chat response: {message:{content:"..."}}
        $text = trim((string)($response['message']['content'] ?? ''));
        if ($text === '') {
            throw new RuntimeException('Ollama returned empty content.');
        }

        // Strip code fences defensively (some models wrap JSON despite
        // format:json being set).
        $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text) ?? $text;

        $parsed = json_decode($text, true);
        if (!is_array($parsed)) {
            throw new RuntimeException('Ollama output is not valid JSON: '
                . mb_substr($text, 0, 300));
        }

        // Validate schema_version. If the local model forgot to include
        // it, patch it so downstream code doesn't choke. Log a warning
        // so the admin sees the issue in the test_parse UI.
        $version = (string)($parsed['schema_version'] ?? '');
        if ($version !== self::SCHEMA_VERSION) {
            $parsed['schema_version'] = self::SCHEMA_VERSION;
            $parsed['warnings']       = array_merge(
                (array)($parsed['warnings'] ?? []),
                ['ollama_omitted_schema_version']
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
1. Return JSON only. No prose, no markdown.
2. Never invent values. If a field is missing, return "" or null and add a
   warning to `warnings`.
3. Preserve part numbers and revision codes EXACTLY as in the source.
4. Normalise dates to ISO YYYY-MM-DD when calendar order is unambiguous;
   otherwise return the raw string and warn.
5. Include short evidence (max 120 chars) per required field.
6. If overall_confidence < 0.90, set overall_recommendation to "needs_review".
7. PO changes use document_type=PO_CHANGE and action=CHANGE.

OUTPUT SCHEMA (return EXACTLY this structure)
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
EOT;
    }

    private function buildUserPrompt(string $bodyText, array $context): string
    {
        $from = (string)($context['from_email'] ?? '');
        $subj = (string)($context['subject'] ?? '');
        $recv = (string)($context['received_at'] ?? '');
        $attFn = (string)($context['attachment_filename'] ?? '');
        $attTxt = (string)($context['attachment_text'] ?? '');

        // Cap body + attachment to 16 KB each to keep latency bounded.
        $bodyText = mb_substr($bodyText, 0, 16000);
        $attTxt   = mb_substr($attTxt,   0, 16000);

        // P1-03: feed customer-template hints to the model. Hints are
        // admin-curated regex / phrase markers per customer that improve
        // extraction quality for that customer's PO format.
        $hintsBlock = '';
        $tmpl = is_array($context['customer_template'] ?? null) ? $context['customer_template'] : null;
        if ($tmpl !== null && is_array($tmpl['hints'] ?? null) && $tmpl['hints'] !== []) {
            $lines = ['', 'CUSTOMER TEMPLATE HINTS (admin-curated for customer ' . ($tmpl['customer_id'] ?? '?') . ')'];
            foreach ($tmpl['hints'] as $field => $patterns) {
                if (!is_array($patterns) || $patterns === []) continue;
                $clean = array_slice(array_map('strval', $patterns), 0, 8);
                $lines[] = '- ' . $field . ': ' . implode(' | ', $clean);
            }
            $hintsBlock = "\n" . implode("\n", $lines) . "\n";
        }

        return <<<PROMPT
EMAIL METADATA
From:               {$from}
Subject:            {$subj}
Received:           {$recv}
{$hintsBlock}
EMAIL BODY
---
{$bodyText}
---

ATTACHMENT EXTRACTED TEXT (filename: {$attFn})
---
{$attTxt}
---

Produce the JSON. Nothing else.
PROMPT;
    }

    /**
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
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => self::TIMEOUT_SECONDS,
            CURLOPT_CONNECTTIMEOUT => 10,
        ]);
        $raw  = curl_exec($ch);
        $err  = curl_error($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);

        if ($raw === false || $err !== '') {
            throw new RuntimeException('Ollama curl error: ' . $err);
        }
        if ($code < 200 || $code >= 300) {
            throw new RuntimeException("Ollama HTTP $code: "
                . mb_substr((string)$raw, 0, 500));
        }

        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Ollama response not JSON: '
                . mb_substr((string)$raw, 0, 300));
        }
        return $decoded;
    }

    /**
     * @return array<string,mixed>
     */
    private function getJson(string $url): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('curl_init failed.');
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $raw  = curl_exec($ch);
        $err  = curl_error($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);

        if ($raw === false || $err !== '') {
            throw new RuntimeException('Ollama curl error: ' . $err);
        }
        if ($code < 200 || $code >= 300) {
            throw new RuntimeException("Ollama HTTP $code: "
                . mb_substr((string)$raw, 0, 300));
        }
        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Ollama tags response not JSON.');
        }
        return $decoded;
    }
}
