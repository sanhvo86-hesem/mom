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

        $this->appendJsonDocumentRows($rows, $momRoot . '/data/scan_cache.json');
        $this->appendJsonDocumentRows($rows, $momRoot . '/data/config/docs_custom.local.json');
        $this->appendJsonDocumentRows($rows, $momRoot . '/data/config/docs_custom.json');

        foreach ($this->legacyDccBootstrapRows($momRoot . '/docs') as $row) {
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * @param list<array<string, mixed>> $rows
     */
    private function appendJsonDocumentRows(array &$rows, string $path): void
    {
        $payload = $this->readJsonFile($path);
        $docs = isset($payload['docs']) && is_array($payload['docs']) ? $payload['docs'] : $payload;
        if (!array_is_list($docs)) {
            return;
        }

        foreach ($docs as $row) {
            if (is_array($row)) {
                $rows[] = $row;
            }
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function legacyDccBootstrapRows(string $docsRoot): array
    {
        if (!is_dir($docsRoot)) {
            return [];
        }

        $rows = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($docsRoot, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $fileInfo) {
            if (!$fileInfo instanceof \SplFileInfo || !$fileInfo->isFile()) {
                continue;
            }
            if (strtolower($fileInfo->getExtension()) !== 'html') {
                continue;
            }

            $html = @file_get_contents($fileInfo->getPathname());
            if (!is_string($html) || $html === '') {
                continue;
            }

            $seed = $this->dccBootstrapHeader($html);
            $code = DocumentControlService::canonicalizeCode((string)($seed['doc_code'] ?? ''));
            if ($code === '' && preg_match('/data-dcc-doc-code=["\']([^"\']+)["\']/i', $html, $m) === 1) {
                $code = DocumentControlService::canonicalizeCode((string)$m[1]);
            }
            if ($code === '') {
                continue;
            }

            $title = trim((string)($seed['title'] ?? ''));
            if ($title === '') {
                $title = $this->fallbackHtmlTitle($html, $code);
            }

            $subtitle = trim((string)($seed['subtitle'] ?? ''));
            if ($title !== '' || $subtitle !== '') {
                $rows[] = [
                    'code' => $code,
                    'title' => $title,
                    'description' => $subtitle,
                ];
            }
        }

        return $rows;
    }

    /**
     * @return array<string, mixed>
     */
    private function dccBootstrapHeader(string $html): array
    {
        if (preg_match('/data-dcc-bootstrap=(["\'])(.*?)\1/isu', $html, $m) !== 1) {
            return [];
        }

        $raw = html_entity_decode((string)$m[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || !is_array($decoded['header'] ?? null)) {
            return [];
        }

        return $decoded['header'];
    }

    private function fallbackHtmlTitle(string $html, string $code): string
    {
        if (preg_match('/<title[^>]*>(.*?)<\/title>/isu', $html, $m) !== 1) {
            return '';
        }

        $title = trim(strip_tags(html_entity_decode((string)$m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
        $title = preg_replace('/\s*\|\s*HESEM MOM\s*$/i', '', $title) ?? $title;
        $title = preg_replace('/^' . preg_quote($code, '/') . '\s*[-—–]\s*/i', '', $title) ?? $title;
        return trim($title);
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
