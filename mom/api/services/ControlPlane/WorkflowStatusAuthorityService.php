<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

/**
 * Verifies that workflow/status references exposed by controlled contracts do
 * not drift away from the runtime order workflow authority.
 */
final class WorkflowStatusAuthorityService
{
    private const ORDER_WORKFLOW_STATUS_SETS = [
        'wf_sales_order' => [
            'flow' => 'so',
            'canonical_status_set' => 'sales_order_status_runtime',
            'legacy_status_sets' => ['sales_order_status', 'sales_order_status_code'],
        ],
        'wf_job_order' => [
            'flow' => 'jo',
            'canonical_status_set' => 'job_order_status_runtime',
            'legacy_status_sets' => ['job_order_status', 'job_order_status_code'],
        ],
        'wf_work_order_execution' => [
            'flow' => 'wo',
            'canonical_status_set' => 'work_order_status_runtime',
            'legacy_status_sets' => ['work_order_status', 'work_order_status_code'],
        ],
        'wf_work_order' => [
            'flow' => 'wo',
            'canonical_status_set' => 'work_order_status_runtime',
            'legacy_status_sets' => ['work_order_status', 'work_order_status_code'],
        ],
    ];

    /**
     * @return array{valid: bool, findings: list<array<string, mixed>>, canonical: array<string, mixed>}
     */
    public function validate(array $soJoWoConfig, array $tableRegistry): array
    {
        $findings = [];
        $canonical = $this->canonicalOrderStatusSets($soJoWoConfig);
        $tables = is_array($tableRegistry['tables'] ?? null) ? $tableRegistry['tables'] : [];

        foreach ($tables as $tableName => $table) {
            if (!is_array($table)) {
                continue;
            }
            $workflowId = trim((string)($table['workflowId'] ?? ''));
            if ($workflowId === '' || !isset(self::ORDER_WORKFLOW_STATUS_SETS[$workflowId])) {
                continue;
            }

            $statusColumn = trim((string)($table['statusColumn'] ?? ''));
            $statusSet = trim((string)($table['statusSet'] ?? ''));
            $supportTable = !empty($table['supportTable']);

            if ($supportTable && $statusColumn === '') {
                $findings[] = $this->finding('support_table_has_header_workflow', (string)$tableName, $workflowId, 'Support tables must not inherit header workflow without their own status column.');
                continue;
            }

            $expected = self::ORDER_WORKFLOW_STATUS_SETS[$workflowId]['canonical_status_set'];
            if ($statusSet !== $expected) {
                $findings[] = $this->finding('stale_status_set_reference', (string)$tableName, $workflowId, 'Workflow table must reference canonical runtime status set.', [
                    'status_set' => $statusSet,
                    'expected_status_set' => $expected,
                    'legacy_status_sets' => self::ORDER_WORKFLOW_STATUS_SETS[$workflowId]['legacy_status_sets'],
                ]);
            }
        }

        return [
            'valid' => $findings === [],
            'findings' => $findings,
            'canonical' => $canonical,
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function canonicalOrderStatusSets(array $soJoWoConfig): array
    {
        $statusFlow = is_array($soJoWoConfig['status_flow'] ?? null) ? $soJoWoConfig['status_flow'] : [];
        $sets = [];
        foreach (self::ORDER_WORKFLOW_STATUS_SETS as $workflowId => $definition) {
            $flow = (string)$definition['flow'];
            $states = is_array($statusFlow[$flow]['states'] ?? null) ? array_values($statusFlow[$flow]['states']) : [];
            $statusSet = (string)$definition['canonical_status_set'];
            if (isset($sets[$statusSet])) {
                $sets[$statusSet]['workflow_ids'][] = $workflowId;
                $sets[$statusSet]['legacy_aliases'] = array_values(array_unique(array_merge(
                    $sets[$statusSet]['legacy_aliases'],
                    $definition['legacy_status_sets']
                )));
                continue;
            }
            $sets[$statusSet] = [
                'workflow_id' => $workflowId,
                'workflow_ids' => [$workflowId],
                'flow' => $flow,
                'states' => $states,
                'state_hash_sha256' => hash('sha256', implode('|', $states)),
                'legacy_aliases' => $definition['legacy_status_sets'],
            ];
        }
        return $sets;
    }

    /**
     * @return array<string, mixed>
     */
    private function finding(string $code, string $table, string $workflowId, string $message, array $data = []): array
    {
        return [
            'severity' => 'P0',
            'code' => $code,
            'table' => $table,
            'workflow_id' => $workflowId,
            'message' => $message,
            'data' => $data,
        ];
    }
}
