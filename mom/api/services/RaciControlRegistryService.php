<?php

declare(strict_types=1);

namespace MOM\Api\Services;

final class RaciControlRegistryService
{
    private const BOOTSTRAP_RELATIVE_PATH = 'config/raci_control_registry.bootstrap.json';

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

        $matrix = FileHelper::readJson($this->dataDir . '/config/raci_matrix.bootstrap.json');
        $matrixRows = is_array($matrix['rows'] ?? null) ? $matrix['rows'] : [];
        $matrixByCdr = [];
        foreach ($matrixRows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $cdr = strtoupper(trim((string)($row['cdr'] ?? '')));
            if ($cdr !== '') {
                $matrixByCdr[$cdr] = $row;
            }
        }

        $anchors = $this->authorityAnchors();
        $validRoles = $this->validRoles();
        $tbdCount = 0;
        $holdRows = 0;

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $cdr = strtoupper(trim((string)($row['cdr'] ?? '')));
            $id = (string)($row['id'] ?? $row['row_id'] ?? $cdr);
            if ($cdr === '' || !isset($matrixByCdr[$cdr])) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Registry row is not mapped to an existing RACI CDR row.'];
                continue;
            }
            if (!isset($anchors[$cdr])) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'Registry row points to a CDR without AUTHORITY-MATRIX anchor.'];
            }

            $expectedA = $this->matrixAccountableRole($matrixByCdr[$cdr]);
            $aProcess = strtoupper(trim((string)($row['a_process'] ?? '')));
            if ($aProcess === '' || $aProcess !== $expectedA) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => sprintf('a_process mismatch: expected %s from RACI master, got %s.', $expectedA, $aProcess === '' ? '(blank)' : $aProcess)];
            }

            foreach ($this->collectRoleValues($row) as $field => $codes) {
                foreach ($codes as $code) {
                    if ($code === 'TBD_DECISION_REQUIRED') {
                        $tbdCount++;
                        continue;
                    }
                    if (!isset($validRoles[$code])) {
                        $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => sprintf('Unknown role code %s in %s.', $code, $field)];
                    }
                }
            }

            $releaseAuthority = $this->arrayOfStrings($row['hold']['release_authority'] ?? null);
            if ($releaseAuthority !== []) {
                $holdRows++;
            }
            if (in_array($row['gate'] ?? '', ['G4', 'G5', 'G6', 'G7'], true) && $releaseAuthority === []) {
                $issues[] = ['severity' => 'P0', 'path' => $id, 'message' => 'High-risk row is missing release authority.'];
            }
        }

        return [
            'valid' => $issues === [],
            'summary' => [
                'rows' => count($rows),
                'matrix_rows' => count($matrixByCdr),
                'authority_anchors' => count($anchors),
                'hold_release_rows' => $holdRows,
                'tbd_count' => $tbdCount,
            ],
            'issues' => $issues,
        ];
    }

    /**
     * @return array<string, true>
     */
    private function validRoles(): array
    {
        $valid = [];
        $overlay = FileHelper::readJson($this->dataDir . '/config/raci_role_overlays.json');
        $detail = is_array($overlay['detail_role_registry'] ?? null) ? $overlay['detail_role_registry'] : [];
        foreach (array_keys($detail) as $code) {
            if (is_string($code) && $code !== '') {
                $valid[strtoupper($code)] = true;
            }
        }
        foreach (['CS', 'EST', 'ENG', 'PPL', 'WKM', 'PD', 'QA', 'SCM', 'CEO', 'EHS', 'HR', 'IT'] as $code) {
            $valid[$code] = true;
        }

        return $valid;
    }

    /**
     * @return array<string, true>
     */
    private function authorityAnchors(): array
    {
        $path = rtrim($this->rootDir, '/') . '/mom/docs/system/organization/04-RACI-Authority/authority-matrix.html';
        $html = is_file($path) ? (string)file_get_contents($path) : '';
        preg_match_all('/id="cdr-([A-F]\d+)"/', $html, $matches);
        $out = [];
        foreach ($matches[1] as $cdr) {
            $out[strtoupper((string)$cdr)] = true;
        }

        return $out;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function matrixAccountableRole(array $row): string
    {
        $roles = is_array($row['roles'] ?? null) ? $row['roles'] : [];
        foreach ($roles as $code => $letter) {
            if (strtoupper(trim((string)$letter)) === 'A') {
                return strtoupper((string)$code);
            }
        }

        return '';
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, list<string>>
     */
    private function collectRoleValues(array $row): array
    {
        $map = [];
        foreach (['a_process', 'responsible', 'proposer', 'verifier', 'consulted', 'informed'] as $field) {
            $value = $row[$field] ?? null;
            $map[$field] = is_array($value) ? $this->arrayOfStrings($value) : $this->singleRole($value);
        }
        $authority = is_array($row['authority'] ?? null) ? $row['authority'] : [];
        $map['authority.primary_signer'] = $this->singleRole($authority['primary_signer'] ?? null);
        $levels = is_array($authority['levels'] ?? null) ? $authority['levels'] : [];
        foreach ($levels as $i => $level) {
            if (!is_array($level)) {
                continue;
            }
            $map['authority.levels.' . $i] = $this->singleRole($level['approver'] ?? null);
        }
        $hold = is_array($row['hold'] ?? null) ? $row['hold'] : [];
        $map['hold.can_hold'] = $this->arrayOfStrings($hold['can_hold'] ?? null);
        $map['hold.release_authority'] = $this->arrayOfStrings($hold['release_authority'] ?? null);

        return $map;
    }

    /**
     * @return list<string>
     */
    private function singleRole(mixed $value): array
    {
        $text = strtoupper(trim((string)$value));
        return $text === '' ? [] : [$text];
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
