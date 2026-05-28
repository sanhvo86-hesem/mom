<?php

declare(strict_types=1);

namespace MOM\Api\Services;

final class RaciDerivativeIntegrityService
{
    private readonly RaciMatrixService $matrix;

    public function __construct(
        private readonly string $rootDir,
        string $dataDir,
        ?RaciMatrixService $matrix = null,
    ) {
        $this->matrix = $matrix ?? new RaciMatrixService($rootDir, $dataDir);
    }

    /**
     * @return array{valid: bool, documents_scanned: int, regions_scanned: int, issues: list<array<string, string>>}
     */
    public function audit(): array
    {
        $preview = $this->matrix->previewPublication();
        $issues = [];
        $documents = 0;
        $regions = 0;

        foreach ($preview as $relativePath => $expected) {
            $fullPath = rtrim($this->rootDir, '/') . '/' . ltrim($relativePath, '/');
            $actual = is_file($fullPath) ? (string)@file_get_contents($fullPath) : '';
            if ($actual === '') {
                $issues[] = [
                    'severity' => 'P0',
                    'path' => $relativePath,
                    'message' => 'Published derivative is missing or unreadable.',
                ];
                continue;
            }

            $documents++;
            $regions += $this->managedRegionCount($expected);
            foreach ($this->compareGeneratedDocument($relativePath, $actual, $expected) as $issue) {
                $issues[] = $issue;
            }
        }

        return [
            'valid' => $issues === [],
            'documents_scanned' => $documents,
            'regions_scanned' => $regions,
            'issues' => $issues,
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    public function compareGeneratedDocument(string $relativePath, string $actual, string $expected): array
    {
        if ($this->normalizeHtml($actual) === $this->normalizeHtml($expected)) {
            return [];
        }

        $message = 'Generated RACI derivative drift detected.';
        if (str_contains($actual, 'TAMPERED')) {
            $message = 'Generated derivative drift includes tampered content: TAMPERED.';
        } elseif ($mismatch = $this->firstRowMismatch($actual, $expected)) {
            $message = sprintf(
                'Generated derivative drift near %s: actual "%s" vs expected "%s".',
                $mismatch['cdr'],
                $mismatch['actual'],
                $mismatch['expected']
            );
        }

        return [[
            'severity' => 'P0',
            'path' => $relativePath,
            'message' => $message,
        ]];
    }

    private function managedRegionCount(string $html): int
    {
        preg_match_all('/<!-- RACI-(?:MATRIX|ROLES):START\b/', $html, $matches);
        return count($matches[0]);
    }

    private function normalizeHtml(string $html): string
    {
        $html = $this->canonicalizeDccBootstrap($html);
        $html = $this->canonicalizeAnchorAttributes($html);
        return preg_replace('/\s+/u', ' ', trim($html)) ?? trim($html);
    }

    /**
     * DCC revision/effective-date bumps are expected side effects of publication,
     * not semantic derivative drift. Normalize them before comparison.
     */
    private function canonicalizeDccBootstrap(string $html): string
    {
        $pattern = '/data-dcc-bootstrap=(["\'])(.*?)\1/s';
        $next = preg_replace_callback(
            $pattern,
            static function (array $m): string {
                $quote = $m[1];
                $payload = html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $data = json_decode($payload, true);
                if (!is_array($data) || !is_array($data['header'] ?? null)) {
                    return $m[0];
                }
                $data['header']['revision'] = '__DCC_REV__';
                $data['header']['effective_date'] = '__DCC_DATE__';
                $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                if ($encoded === false) {
                    return $m[0];
                }
                $attr = $quote === '"'
                    ? htmlspecialchars($encoded, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                    : str_replace("'", '&#039;', $encoded);
                return 'data-dcc-bootstrap=' . $quote . $attr . $quote;
            },
            $html
        );

        return is_string($next) ? $next : $html;
    }

    /**
     * @return array{cdr: string, actual: string, expected: string}|null
     */
    private function firstRowMismatch(string $actual, string $expected): ?array
    {
        $actualRows = $this->extractRows($actual);
        $expectedRows = $this->extractRows($expected);
        $count = min(count($actualRows), count($expectedRows));
        for ($i = 0; $i < $count; $i++) {
            if ($actualRows[$i] === $expectedRows[$i]) {
                continue;
            }
            return [
                'cdr' => (string)($expectedRows[$i]['cdr'] ?? $actualRows[$i]['cdr'] ?? 'unknown'),
                'actual' => (string)($actualRows[$i]['activity'] ?? ''),
                'expected' => (string)($expectedRows[$i]['activity'] ?? ''),
            ];
        }
        return null;
    }

    /**
     * @return list<array{cdr: string, activity: string}>
     */
    private function extractRows(string $html): array
    {
        preg_match_all('/<tr><td>(?:[A-Z0-9]+)<\/td><td>([A-Z]\d+)<\/td><td>([^<]+)/', $html, $matches, PREG_SET_ORDER);
        $rows = [];
        foreach ($matches as $match) {
            $rows[] = [
                'cdr' => trim($match[1]),
                'activity' => trim($match[2]),
            ];
        }
        return $rows;
    }

    private function canonicalizeAnchorAttributes(string $html): string
    {
        $next = preg_replace_callback(
            '/<a\b([^>]*)>/i',
            static function (array $m): string {
                $attrs = (string)$m[1];
                $href = '';
                $class = '';
                if (preg_match('/\bhref\s*=\s*"([^"]*)"/i', $attrs, $h)) {
                    $href = $h[1];
                }
                if (preg_match('/\bclass\s*=\s*"([^"]*)"/i', $attrs, $c)) {
                    $class = $c[1];
                }

                $out = '<a';
                if ($class !== '') {
                    $out .= ' class="' . htmlspecialchars($class, ENT_QUOTES | ENT_HTML5) . '"';
                }
                if ($href !== '') {
                    $out .= ' href="' . htmlspecialchars($href, ENT_QUOTES | ENT_HTML5) . '"';
                }
                return $out . '>';
            },
            $html
        );

        return is_string($next) ? $next : $html;
    }
}
