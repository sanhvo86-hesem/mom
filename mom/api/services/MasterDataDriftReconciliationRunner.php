<?php

declare(strict_types=1);

namespace MOM\Services;

final class MasterDataDriftReconciliationRunner
{
    /**
     * @param array<string, mixed> $jsonStore
     * @param array<string, mixed> $postgresStore
     * @return array<string, mixed>
     */
    public function reconcileStores(array $jsonStore, array $postgresStore): array
    {
        $entities = array_values(array_unique(array_merge(
            $this->entityNames($jsonStore),
            $this->entityNames($postgresStore),
        )));
        sort($entities);

        $entityResults = [];
        $missingInPostgres = 0;
        $missingInJson = 0;
        $hashMismatches = 0;

        foreach ($entities as $entity) {
            $jsonRows = $this->rowsById((array)($jsonStore[$entity] ?? []));
            $pgRows = $this->rowsById((array)($postgresStore[$entity] ?? []));
            $jsonIds = array_keys($jsonRows);
            $pgIds = array_keys($pgRows);

            $missingPg = array_values(array_diff($jsonIds, $pgIds));
            $missingJson = array_values(array_diff($pgIds, $jsonIds));
            $mismatch = [];
            foreach (array_intersect($jsonIds, $pgIds) as $id) {
                if ($this->hashRow($jsonRows[$id]) !== $this->hashRow($pgRows[$id])) {
                    $mismatch[] = $id;
                }
            }

            $missingInPostgres += count($missingPg);
            $missingInJson += count($missingJson);
            $hashMismatches += count($mismatch);
            $entityResults[$entity] = [
                'json_count' => count($jsonRows),
                'postgres_count' => count($pgRows),
                'missing_in_postgres' => $missingPg,
                'missing_in_json' => $missingJson,
                'hash_mismatches' => $mismatch,
            ];
        }

        $ok = $missingInPostgres === 0 && $missingInJson === 0 && $hashMismatches === 0;

        return [
            'ok' => $ok,
            'checked_at' => gmdate('c'),
            'entity_count' => count($entities),
            'missing_in_postgres_total' => $missingInPostgres,
            'missing_in_json_total' => $missingInJson,
            'hash_mismatch_total' => $hashMismatches,
            'cutover_allowed' => $ok,
            'entities' => $entityResults,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function run(MasterDataRepository $jsonRepository, MasterDataRepository $postgresRepository): array
    {
        return $this->reconcileStores($jsonRepository->loadStore(), $postgresRepository->loadStore());
    }

    /**
     * @param array<string, mixed> $store
     * @return array<int, string>
     */
    private function entityNames(array $store): array
    {
        return array_values(array_filter(array_keys($store), static fn(string $key): bool => $key !== '' && $key[0] !== '_'));
    }

    /**
     * @param array<int, mixed> $rows
     * @return array<string, array<string, mixed>>
     */
    private function rowsById(array $rows): array
    {
        $result = [];
        foreach ($rows as $idx => $row) {
            if (!is_array($row)) {
                continue;
            }
            $id = $this->rowId($row);
            if ($id === '') {
                $id = 'row_' . (string)$idx;
            }
            $result[$id] = $row;
        }

        ksort($result);
        return $result;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function rowId(array $row): string
    {
        foreach ([
            'customer_id', 'supplier_id', 'part_number', 'revision_id', 'site_id',
            'account_id', 'routing_id', 'bom_id', 'control_plan_id', 'inspection_plan_id',
            'traveler_template_id', 'quality_gate_profile_id', 'gate_template_id',
            'approval_id', 'warehouse_id', 'defect_code', 'program_id', 'capa_number',
            'work_center_id', 'machine_id', 'operator_id', 'tool_id', 'reason_code',
            'resolution_code', 'adapter_id', 'alarm_code', 'playbook_id', 'assembly_id',
            'id', 'entity_id',
        ] as $field) {
            $value = trim((string)($row[$field] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hashRow(array $row): string
    {
        ksort($row);
        $json = json_encode($row, JSON_UNESCAPED_SLASHES);
        return hash('sha256', is_string($json) ? $json : serialize($row));
    }
}
