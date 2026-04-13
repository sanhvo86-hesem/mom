<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;
use MOM\Services\MasterDataService;
use MOM\Services\OrderWorkflowService;

/**
 * Central runtime authority posture report for promoted backend slices.
 */
final class RuntimeAuthorityService
{
    public function __construct(
        private readonly DataLayer $data,
        private readonly string $dataDir,
        private readonly ?IdempotencyService $idempotency = null,
        private readonly ?OrderWorkflowService $orderWorkflow = null,
        private readonly ?MasterDataService $masterData = null,
        private readonly ?array $modeSummaryOverride = null,
        private readonly ?ManufacturingEventBackboneService $manufacturingEvents = null,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function report(): array
    {
        $modeSummary = $this->modeSummary();
        $idempotency = ($this->idempotency ?? new IdempotencyService($this->dataDir))->backendProbe();
        $orderWorkflow = ($this->orderWorkflow ?? new OrderWorkflowService($this->dataDir))->authorityProbe($modeSummary);
        $masterData = ($this->masterData ?? new MasterDataService($this->dataDir))->authorityProbe($modeSummary);
        $manufacturingEvents = ($this->manufacturingEvents ?? new ManufacturingEventBackboneService($this->dataDir, $this->data))->authorityProbe();

        $slices = [
            'idempotency' => $this->normalizeIdempotencySlice($idempotency, $modeSummary),
            'order_workflow' => $this->normalizeOperationalSlice($orderWorkflow),
            'master_data' => $this->normalizeOperationalSlice($masterData),
            'manufacturing_events' => $this->normalizeOperationalSlice($manufacturingEvents),
        ];

        $states = [];
        $degraded = [];
        foreach ($slices as $slice => $payload) {
            $state = (string)($payload['readiness_state'] ?? 'degraded');
            $states[$state] = (int)($states[$state] ?? 0) + 1;
            if ($state === 'degraded') {
                $degraded[] = $slice;
            }
        }

        return [
            'ok' => $degraded === [],
            'generated_at' => gmdate(DATE_ATOM),
            'profile' => [
                'data_layer_mode' => (string)($modeSummary['mode'] ?? $this->data->getMode()),
                'use_postgres' => (bool)($modeSummary['use_postgres'] ?? false),
                'shadow_write' => (bool)($modeSummary['shadow_write'] ?? false),
                'json_fallback' => (bool)($modeSummary['json_fallback'] ?? false),
                'database_configured' => (bool)($modeSummary['database_configured'] ?? false),
                'database_probe_reachable' => (bool)($modeSummary['database_probe_reachable'] ?? false),
                'database_probe_error' => (string)($modeSummary['database_probe_error'] ?? ''),
            ],
            'slices' => $slices,
            'summary' => [
                'readiness_counts' => $states,
                'degraded_slices' => $degraded,
                'idempotency_expected_authority_met' => (bool)($slices['idempotency']['expected_authority_met'] ?? true),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function modeSummary(): array
    {
        if (is_array($this->modeSummaryOverride)) {
            return $this->modeSummaryOverride;
        }

        try {
            return $this->data->getModeSummary();
        } catch (\Throwable $e) {
            return [
                'mode' => $this->data->getMode(),
                'use_postgres' => false,
                'shadow_write' => false,
                'json_fallback' => false,
                'database_configured' => false,
                'database_probe_reachable' => false,
                'database_probe_error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @param array<string, mixed> $probe
     * @param array<string, mixed> $modeSummary
     * @return array<string, mixed>
     */
    private function normalizeIdempotencySlice(array $probe, array $modeSummary): array
    {
        $expectedMet = (bool)($probe['expected_authority_met'] ?? true);
        $state = $expectedMet
            ? (string)($probe['readiness_state'] ?? 'compatibility_only')
            : 'degraded';

        return array_merge($probe, [
            'slice' => 'idempotency',
            'readiness_state' => $state,
            'authority_mode' => (string)($probe['active_backend'] ?? $probe['backend'] ?? 'unknown'),
            'data_layer_mode' => (string)($modeSummary['mode'] ?? ''),
            'postgres_configured' => (bool)($modeSummary['use_postgres'] ?? false),
            'degradation_reason' => $expectedMet ? '' : (string)($probe['configuration_error'] ?? 'expected_postgres_authority_not_met'),
        ]);
    }

    /**
     * @param array<string, mixed> $probe
     * @return array<string, mixed>
     */
    private function normalizeOperationalSlice(array $probe): array
    {
        $state = (string)($probe['readiness_state'] ?? 'degraded');
        return array_merge($probe, [
            'authority_mode' => match ($state) {
                'authoritative_ready' => 'postgres_primary',
                'authority_partial' => 'shadow_mode',
                'compatibility_only' => 'json_fallback',
                default => 'degraded',
            },
        ]);
    }
}
