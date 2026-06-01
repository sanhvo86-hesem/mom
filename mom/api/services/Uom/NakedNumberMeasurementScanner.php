<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

final class NakedNumberMeasurementScanner
{
    private const FIELD_PATTERN = "/[\"']?\\b(temperature|weight|length|width|height|qty|quantity|measurement|pressure|density)\\b[\"']?\\s*[:=]\\s*(-?[0-9]+(?:\\.[0-9]+)?)(?!\\s*(?:[A-Za-z_][A-Za-z0-9_]*|[{\\[]))/i";

    /**
     * @param list<string> $paths
     * @return list<array{file:string,line:int,field:string,value:string,severity:string,remediation:string}>
     */
    public function scanFiles(array $paths): array
    {
        $findings = [];
        foreach ($paths as $path) {
            if (!is_file($path) || !is_readable($path)) {
                continue;
            }
            $lines = file($path, FILE_IGNORE_NEW_LINES);
            if ($lines === false) {
                continue;
            }
            foreach ($lines as $idx => $line) {
                if (preg_match_all(self::FIELD_PATTERN, $line, $matches, PREG_SET_ORDER) !== 1) {
                    continue;
                }
                foreach ($matches as $match) {
                    $field = strtolower((string)$match[1]);
                    $findings[] = [
                        'file' => $path,
                        'line' => $idx + 1,
                        'field' => $field,
                        'value' => (string)$match[2],
                        'severity' => $this->severity($field),
                        'remediation' => 'Wrap this measurement in MEASVAL or provide canonical unit_code next to the magnitude.',
                    ];
                }
            }
        }
        return $findings;
    }

    private function severity(string $field): string
    {
        return in_array($field, ['temperature', 'weight', 'density', 'pressure'], true) ? 'high' : 'medium';
    }
}
