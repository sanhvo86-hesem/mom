<?php

declare(strict_types=1);

namespace MOM\Services\DocumentControl;

use MOM\Database\DataLayer;
use RuntimeException;

/**
 * DCC — Document Header Projection Service.
 *
 * Thin read-optimised layer that produces the JSON payload consumed by the
 * portal header renderer. Every rendered header (ID | Rev | Eff | Owner | Appr)
 * is a projection of:
 *   • dcc_document_header           — canonical metadata
 *   • dcc_document_header_label     — locale-specific label text
 *
 * Guarantees:
 *   • Output is already trimmed to the values the renderer needs — no extra
 *     round-trips, no hardcoded strings.
 *   • Single owner / single approver is an invariant of the underlying table.
 *   • Short labels respect the overflow budget (≤5 chars) set by the DCC spec.
 *
 * @since 4.1.0
 */
final class DocumentHeaderService
{
    public function __construct(private DataLayer $data) {}

    /**
     * Return a renderer-ready payload for one document.
     *
     * @return array{
     *     doc_code: string,
     *     title: string,
     *     subtitle: ?string,
     *     doc_type: string,
     *     revision: string,
     *     effective_date: string,
     *     owner_role_code: string,
     *     approver_role_code: string,
     *     iso_clause: ?string,
     *     status: string,
     *     labels: array<string, array{short: string, long: string, sort: int}>
     * }
     */
    public function render(string $docCode, string $locale = 'en'): array
    {
        $rows = $this->data->query(
            "SELECT doc_code, title, subtitle, doc_type, revision, effective_date,
                    owner_role_code, approver_role_code, iso_clause, status
             FROM dcc_document_header
             WHERE doc_code = :c
             LIMIT 1",
            [':c' => $docCode]
        ) ?? [];

        if ($rows === []) {
            throw new RuntimeException('dcc_document_not_found:' . $docCode);
        }
        $header = $rows[0];
        $header['labels'] = $this->labelsFor($locale);
        $header['effective_date'] = $this->formatIsoDate($header['effective_date'] ?? null);
        return $header;
    }

    /**
     * Return labels map: label_key → {short, long, sort}. Falls back to 'en'.
     *
     * @return array<string, array{short: string, long: string, sort: int}>
     */
    public function labelsFor(string $locale): array
    {
        $locale = strtolower(trim($locale)) ?: 'en';
        $rows = $this->data->query(
            "SELECT label_key, short_label, long_label, sort_order
             FROM dcc_document_header_label
             WHERE is_active = TRUE AND locale = :loc
             ORDER BY sort_order, label_key",
            [':loc' => $locale]
        ) ?? [];

        if ($rows === [] && $locale !== 'en') {
            return $this->labelsFor('en');
        }

        $out = [];
        foreach ($rows as $r) {
            $out[(string)$r['label_key']] = [
                'short' => (string)$r['short_label'],
                'long'  => (string)$r['long_label'],
                'sort'  => (int)$r['sort_order'],
            ];
        }
        return $out;
    }

    private function formatIsoDate(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        $s = (string)$value;
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $s, $m)) {
            return $m[0];
        }
        $ts = strtotime($s);
        return $ts ? date('Y-m-d', $ts) : $s;
    }
}
