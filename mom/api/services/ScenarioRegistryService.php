<?php

declare(strict_types=1);

namespace MOM\Api\Services;

final class ScenarioRegistryService
{
    private const BOOTSTRAP_RELATIVE_PATH = 'config/scenario_registry.bootstrap.json';

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

        return is_array($data) ? $data : ['_meta' => [], 'scenarios' => [], 'drill_set' => []];
    }

    /**
     * @return array{valid: bool, summary: array<string, int>, issues: list<array<string, string>>}
     */
    public function validate(): array
    {
        $config = $this->load();
        $scenarios = is_array($config['scenarios'] ?? null) ? $config['scenarios'] : [];
        $drills = is_array($config['drill_set'] ?? null) ? $config['drill_set'] : [];
        $validRoles = $this->validRoles();
        $validBundles = $this->validBundles();
        $gateCoverage = ['G0' => 0, 'G1' => 0, 'G2' => 0, 'G3' => 0, 'G4' => 0, 'G5' => 0, 'G6' => 0, 'G7' => 0];
        $issues = [];

        foreach ($scenarios as $scenario) {
            if (!is_array($scenario)) {
                continue;
            }
            $id = (string)($scenario['scenario_id'] ?? 'unknown');
            foreach ($this->arrayOfStrings($scenario['gate'] ?? null) as $gate) {
                if (isset($gateCoverage[$gate])) {
                    $gateCoverage[$gate]++;
                }
            }
            if ($this->arrayOfStrings($scenario['cdr'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario has no mapped CDR.'];
            }
            if ($this->arrayOfStrings($scenario['evidence_required'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario has no evidence_required.'];
            }
            if ($this->arrayOfStrings($scenario['exit_criteria'] ?? null) === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario has no exit_criteria.'];
            }
            $raci = is_array($scenario['raci'] ?? null) ? $scenario['raci'] : [];
            $aProcess = strtoupper(trim((string)($raci['a_process'] ?? '')));
            if ($aProcess === '') {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario has no a_process.'];
            }
            $flatAProcess = strtoupper(trim((string)($scenario['a_process'] ?? '')));
            if ($flatAProcess === '') {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario is missing top-level a_process.'];
            } elseif ($aProcess !== '' && $flatAProcess !== $aProcess) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario top-level a_process drifted from raci.a_process.'];
            }
            if (isset($validBundles[$aProcess])) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario uses a role bundle as a_process.'];
            }
            foreach ([
                'proposer' => $this->arrayOfStrings($raci['proposer'] ?? null),
                'verifier' => $this->arrayOfStrings($raci['verifier'] ?? null),
                'responsible' => $this->arrayOfStrings($raci['responsible'] ?? null),
                'consulted' => $this->arrayOfStrings($raci['consulted'] ?? null),
                'informed' => $this->arrayOfStrings($raci['informed'] ?? null),
            ] as $field => $nestedValues) {
                $topLevelValues = $this->arrayOfStrings($scenario[$field] ?? null);
                if ($topLevelValues === []) {
                    $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => sprintf('Scenario is missing top-level %s.', $field)];
                    continue;
                }
                if ($nestedValues !== [] && $topLevelValues !== $nestedValues) {
                    $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => sprintf('Scenario top-level %s drifted from raci.%s.', $field, $field)];
                }
            }
            $releaseTop = $this->arrayOfStrings($scenario['release_authority'] ?? null);
            $releaseNested = $this->arrayOfStrings($scenario['authority']['release_authority'] ?? null);
            if ($releaseTop === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario is missing top-level release_authority.'];
            } elseif ($releaseNested !== [] && $releaseTop !== $releaseNested) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario top-level release_authority drifted from authority.release_authority.'];
            }
            $holdTop = $this->arrayOfStrings($scenario['hold_authority'] ?? null);
            $holdNested = $this->arrayOfStrings($scenario['authority']['hold_authority'] ?? null);
            if ($holdTop === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario is missing top-level hold_authority.'];
            } elseif ($holdNested !== [] && $holdTop !== $holdNested) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Scenario top-level hold_authority drifted from authority.hold_authority.'];
            }
            foreach ($this->collectRoleCodes($scenario) as $field => $codes) {
                foreach ($codes as $code) {
                    if (!isset($validRoles[$code]) && !isset($validBundles[$code])) {
                        $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => sprintf('Unknown role code %s in %s.', $code, $field)];
                    }
                }
            }
            if (($scenario['severity'] ?? '') === 'P0') {
                $release = $this->arrayOfStrings($scenario['authority']['release_authority'] ?? null);
                if ($release === []) {
                    $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'P0 scenario is missing release authority.'];
                }
            }
        }

        foreach ($gateCoverage as $gate => $count) {
            if ($count < 1) {
                $issues[] = ['severity' => 'P0', 'path' => $gate, 'message' => 'No scenarios mapped to gate ' . $gate . '.'];
            }
        }
        if (count($scenarios) < 110) {
            $issues[] = ['severity' => 'P0', 'path' => 'scenario_registry', 'message' => 'Scenario registry has fewer than 110 scenarios.'];
        }
        if (count($drills) < 24) {
            $issues[] = ['severity' => 'P0', 'path' => 'drill_set', 'message' => 'Training drill set has fewer than 24 drills.'];
        }

        return [
            'valid' => $issues === [],
            'summary' => [
                'scenarios' => count($scenarios),
                'drills' => count($drills),
                'g0' => $gateCoverage['G0'],
                'g1' => $gateCoverage['G1'],
                'g2' => $gateCoverage['G2'],
                'g3' => $gateCoverage['G3'],
                'g4' => $gateCoverage['G4'],
                'g5' => $gateCoverage['G5'],
                'g6' => $gateCoverage['G6'],
                'g7' => $gateCoverage['G7'],
            ],
            'issues' => $issues,
        ];
    }

    /**
     * @return array<string, true>
     */
    private function validRoles(): array
    {
        $overlay = FileHelper::readJson($this->dataDir . '/config/raci_role_overlays.json');
        $detail = is_array($overlay['detail_role_registry'] ?? null) ? $overlay['detail_role_registry'] : [];
        $roles = [];
        foreach (array_keys($detail) as $code) {
            if (is_string($code) && $code !== '') {
                $roles[strtoupper($code)] = true;
            }
        }

        return $roles;
    }

    /**
     * @return array<string, true>
     */
    private function validBundles(): array
    {
        $html = (string)file_get_contents(rtrim($this->rootDir, '/') . '/mom/docs/system/organization/04-RACI-Authority/role-and-department-bundles.html');
        preg_match_all('/bundle-code">([^<]+)</', $html, $matches);
        $out = [];
        foreach ($matches[1] as $bundle) {
            $out[strtoupper(trim((string)$bundle))] = true;
        }

        return $out;
    }

    /**
     * @param array<string, mixed> $scenario
     * @return array<string, list<string>>
     */
    private function collectRoleCodes(array $scenario): array
    {
        $map = [];
        $raci = is_array($scenario['raci'] ?? null) ? $scenario['raci'] : [];
        foreach (['a_process', 'proposer', 'verifier', 'responsible', 'consulted', 'informed'] as $field) {
            $value = $raci[$field] ?? null;
            $map['raci.' . $field] = is_array($value) ? $this->arrayOfStrings($value) : $this->singleString($value);
        }
        $auth = is_array($scenario['authority'] ?? null) ? $scenario['authority'] : [];
        $map['authority.release_authority'] = $this->arrayOfStrings($auth['release_authority'] ?? null);
        $map['authority.hold_authority'] = $this->arrayOfStrings($auth['hold_authority'] ?? null);
        foreach (['proposer', 'verifier', 'responsible', 'consulted', 'informed', 'release_authority', 'hold_authority'] as $field) {
            $map[$field] = $this->arrayOfStrings($scenario[$field] ?? null);
        }
        $map['a_process'] = $this->singleString($scenario['a_process'] ?? null);

        return $map;
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

    /**
     * @return list<string>
     */
    private function singleString(mixed $value): array
    {
        $text = strtoupper(trim((string)$value));
        return $text === '' ? [] : [$text];
    }
}
