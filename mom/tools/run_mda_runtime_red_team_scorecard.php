<?php

declare(strict_types=1);

require_once __DIR__ . '/../api/services/MdaRuntimeRedTeamScorecardService.php';

use MOM\Services\MdaRuntimeRedTeamScorecardService;

/** @return list<array<string, string>> */
function mda_p41_read_csv_assoc(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $handle = fopen($path, 'r');
    if ($handle === false) {
        return [];
    }
    $header = fgetcsv($handle, null, ',', '"', '\\');
    if (!is_array($header)) {
        fclose($handle);
        return [];
    }
    $rows = [];
    while (($row = fgetcsv($handle, null, ',', '"', '\\')) !== false) {
        if (!is_array($row)) {
            continue;
        }
        $assoc = [];
        foreach ($header as $index => $column) {
            $assoc[(string)$column] = (string)($row[$index] ?? '');
        }
        $rows[] = $assoc;
    }
    fclose($handle);

    return $rows;
}

$repoRoot = dirname(__DIR__, 2);
$reportDir = $repoRoot . '/_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29';
$blockers = mda_p41_read_csv_assoc($reportDir . '/MDA_V3_P0_P1_BLOCKER_REGISTER.csv');
$maturity = mda_p41_read_csv_assoc($reportDir . '/MDA_V3_DOMAIN_RUNTIME_MATURITY_SCORECARD.csv');
$runtimeMode = ['mode' => getenv('MOM_RUNTIME_MODE') ?: 'JSON_ONLY'];

$result = (new MdaRuntimeRedTeamScorecardService())->score($blockers, $maturity, $runtimeMode);

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;
exit($result['decision_token'] === 'P41_PASS_READY_FOR_NEXT' ? 0 : 2);
