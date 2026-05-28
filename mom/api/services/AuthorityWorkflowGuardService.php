<?php

declare(strict_types=1);

namespace MOM\Api\Services;

final class AuthorityWorkflowGuardService
{
    private const BOOTSTRAP_RELATIVE_PATH = 'config/workflow_transition_registry.bootstrap.json';

    public function __construct(
        private readonly string $rootDir,
        private readonly string $dataDir,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function load(): array
    {
        $data = FileHelper::readJson($this->dataDir . '/' . self::BOOTSTRAP_RELATIVE_PATH);

        return is_array($data) ? $data : ['_meta' => [], 'rows' => []];
    }

    /**
     * @return array{valid: bool, summary: array<string, int>, issues: list<array<string, string>>}
     */
    public function validate(): array
    {
        $config = $this->load();
        $rows = is_array($config['rows'] ?? null) ? $config['rows'] : [];
        $issues = [];
        $critical = 0;

        $control = new RaciControlRegistryService($this->rootDir, $this->dataDir);
        $controlRows = is_array($control->load()['rows'] ?? null) ? $control->load()['rows'] : [];
        $controlByCdr = [];
        foreach ($controlRows as $row) {
            if (is_array($row) && isset($row['cdr'])) {
                $controlByCdr[strtoupper((string)$row['cdr'])] = $row;
            }
        }

        $scenario = new ScenarioRegistryService($this->rootDir, $this->dataDir);
        $scenarioConfig = $scenario->load();
        $scenarios = is_array($scenarioConfig['scenarios'] ?? null) ? $scenarioConfig['scenarios'] : [];
        $scenarioById = [];
        foreach ($scenarios as $scenarioRow) {
            if (!is_array($scenarioRow)) {
                continue;
            }
            $scenarioId = strtoupper(trim((string)($scenarioRow['scenario_id'] ?? '')));
            if ($scenarioId !== '') {
                $scenarioById[$scenarioId] = $scenarioRow;
            }
        }

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $id = (string)($row['id'] ?? 'unknown');
            $cdr = strtoupper(trim((string)($row['cdr'] ?? '')));
            $critical++;
            if ($cdr === '' || !isset($controlByCdr[$cdr])) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition does not map to a valid control-registry CDR.'];
                continue;
            }
            if ($this->arrayOfStrings($row['mandatory_evidence'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition has no mandatory evidence.'];
            }
            if ($this->arrayOfStrings($row['approver_roles'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition has no approver roles.'];
            }
            if ($this->arrayOfStrings($row['release_roles'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition has no release roles.'];
            }
            if ($this->arrayOfStrings($row['sod_rules'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition has no SoD rules.'];
            }
            $requiredCdr = strtoupper(trim((string)($row['required_cdr'] ?? '')));
            if ($requiredCdr === '' || $requiredCdr !== $cdr) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition required_cdr drifted from cdr.'];
            }
            $outage = is_array($row['outage_fallback'] ?? null) ? $row['outage_fallback'] : [];
            if (($outage['allowed'] ?? false) && empty($outage['requires_replay'])) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Outage fallback is allowed without replay requirement.'];
            }
            if (in_array('m365', $this->arrayOfStrings($row['channels'] ?? null), true)
                && $this->arrayOfStrings($row['approver_roles'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'M365 channel present without business approver roles.'];
            }

            $scenarioIds = $this->arrayOfStrings($row['scenario_ids'] ?? null);
            if ($scenarioIds === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition has no mapped scenario playbook.'];
                continue;
            }

            $gate = strtoupper(trim((string)($row['gate'] ?? '')));
            $matchedScenario = false;
            foreach ($scenarioIds as $scenarioId) {
                if (!isset($scenarioById[$scenarioId])) {
                    $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => sprintf('Workflow transition references unknown scenario %s.', $scenarioId)];
                    continue;
                }
                $scenarioRow = $scenarioById[$scenarioId];
                $scenarioCdrs = $this->arrayOfStrings($scenarioRow['cdr'] ?? null);
                $scenarioGates = $this->arrayOfStrings($scenarioRow['gate'] ?? null);
                if (!in_array($cdr, $scenarioCdrs, true)) {
                    $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => sprintf('Scenario %s does not cover workflow CDR %s.', $scenarioId, $cdr)];
                    continue;
                }
                if ($gate !== '' && !in_array($gate, $scenarioGates, true)) {
                    $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => sprintf('Scenario %s does not cover workflow gate %s.', $scenarioId, $gate)];
                    continue;
                }
                $matchedScenario = true;
            }
            if (!$matchedScenario) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition has no valid scenario coverage for its gate and CDR.'];
            }
        }

        return [
            'valid' => $issues === [],
            'summary' => [
                'rows' => count($rows),
                'critical_rows' => $critical,
            ],
            'issues' => $issues,
        ];
    }

    /**
     * @return list<string>
     */
    private function arrayOfStrings(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $item) {
            $text = strtoupper(trim((string)$item));
            if ($text !== '') {
                $out[] = $text;
            }
        }
        return array_values(array_unique($out));
    }
}
