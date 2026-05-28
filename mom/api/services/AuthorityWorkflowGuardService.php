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
            if ($this->arrayOfStrings($row['sod_rules'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Workflow transition has no SoD rules.'];
            }
            $outage = is_array($row['outage_fallback'] ?? null) ? $row['outage_fallback'] : [];
            if (($outage['allowed'] ?? false) && empty($outage['requires_replay'])) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Outage fallback is allowed without replay requirement.'];
            }
            if (in_array('m365', $this->arrayOfStrings($row['channels'] ?? null), true)
                && $this->arrayOfStrings($row['approver_roles'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'M365 channel present without business approver roles.'];
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
