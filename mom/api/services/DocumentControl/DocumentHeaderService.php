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
    public function render(string $docCode, string $locale = 'vi'): array
    {
        $header = (new DocumentControlService($this->data))->getLocalizedHeader($docCode, $locale);
        $header = $this->applyLegacyDisplayFallbacks($header, $locale);
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
        $locale = $this->normaliseLocale($locale);
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

    private function normaliseLocale(string $locale): string
    {
        $locale = strtolower(trim($locale));
        if ($locale === '') {
            return 'vi';
        }
        $locale = str_replace('_', '-', $locale);
        $parts = explode('-', $locale, 2);
        return $parts[0] !== '' ? $parts[0] : 'vi';
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

    /**
     * Transitional compatibility bridge for older seeded rows whose DB title /
     * subtitle have not been backfilled yet. The DCC API remains authoritative
     * for metadata, but while T1/C9 debt still exists on legacy rows we must
     * keep the live ribbon aligned with the portal's catalog + doc_descriptions
     * view so title/subtitle do not disappear after a release.
     *
     * @param array<string, mixed> $header
     * @return array<string, mixed>
     */
    private function applyLegacyDisplayFallbacks(array $header, string $requestedLocale): array
    {
        $canonical = DocumentControlService::canonicalizeCode((string)($header['doc_code'] ?? ''));
        if ($canonical === '') {
            return $header;
        }

        $legacy = $this->legacyCatalogMap()[$canonical] ?? [];
        $currentTitle = trim((string)($header['title'] ?? ''));
        $legacyTitle = trim((string)($legacy['title'] ?? ''));
        if ($legacyTitle !== '' && ($currentTitle === '' || strtoupper($currentTitle) === $canonical)) {
            $header['title'] = $legacyTitle;
        }

        $locale = $this->normaliseLocale((string)($header['locale'] ?? $requestedLocale));
        $canFallbackSubtitle = $locale === 'vi' || !empty($header['is_locale_fallback']);
        $currentSubtitle = trim((string)($header['subtitle'] ?? ''));
        $legacySubtitle = trim((string)($this->legacyDocDescriptions()[$canonical] ?? ($legacy['subtitle'] ?? '')));
        if ($canFallbackSubtitle && $currentSubtitle === '' && $legacySubtitle !== '') {
            $header['subtitle'] = $legacySubtitle;
        }

        return $header;
    }

    /**
     * @return array<string, array{title?: string, subtitle?: string}>
     */
    private function legacyCatalogMap(): array
    {
        static $cache = null;
        if (is_array($cache)) {
            return $cache;
        }

        $cache = [];
        foreach ($this->legacyCatalogRows() as $row) {
            if (!is_array($row)) {
                continue;
            }
            $canonical = DocumentControlService::canonicalizeCode((string)($row['code'] ?? ''));
            if ($canonical === '') {
                continue;
            }

            $title = trim((string)($row['title'] ?? ''));
            $subtitle = trim((string)($row['description'] ?? ($row['desc'] ?? '')));

            $cache[$canonical] = $cache[$canonical] ?? [];
            if (
                $title !== ''
                && (
                    !isset($cache[$canonical]['title'])
                    || trim((string)$cache[$canonical]['title']) === ''
                    || strtoupper(trim((string)$cache[$canonical]['title'])) === $canonical
                )
            ) {
                $cache[$canonical]['title'] = $title;
            }
            if ($subtitle !== '' && !isset($cache[$canonical]['subtitle'])) {
                $cache[$canonical]['subtitle'] = $subtitle;
            }
        }

        return $cache;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function legacyCatalogRows(): array
    {
        $momRoot = dirname(__DIR__, 3);
        $rows = [];

        $scanCache = $this->readJsonFile($momRoot . '/data/scan_cache.json');
        if (isset($scanCache['docs']) && is_array($scanCache['docs'])) {
            foreach ($scanCache['docs'] as $row) {
                if (is_array($row)) {
                    $rows[] = $row;
                }
            }
        }

        $customDocs = $this->readJsonFile($momRoot . '/data/config/docs_custom.json');
        if (array_is_list($customDocs)) {
            foreach ($customDocs as $row) {
                if (is_array($row)) {
                    $rows[] = $row;
                }
            }
        }

        return $rows;
    }

    /**
     * @return array<string, string>
     */
    private function legacyDocDescriptions(): array
    {
        static $cache = null;
        if (is_array($cache)) {
            return $cache;
        }

        $momRoot = dirname(__DIR__, 3);
        $raw = $this->readJsonFile($momRoot . '/data/config/doc_descriptions.json');
        $cache = [];
        foreach ($raw as $code => $desc) {
            $canonical = DocumentControlService::canonicalizeCode((string)$code);
            $value = trim((string)$desc);
            if ($canonical !== '' && $value !== '') {
                $cache[$canonical] = $value;
            }
        }
        return $cache;
    }

    /**
     * @return array<string, mixed>
     */
    private function readJsonFile(string $path): array
    {
        if (!is_file($path)) {
            return [];
        }
        $raw = @file_get_contents($path);
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}
