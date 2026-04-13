<?php
declare(strict_types=1);

namespace MOM\Api\Services;

interface PlanningScenarioRepository
{
    /**
     * @param array<string, mixed> $scenario
     * @return array<string, mixed>
     */
    public function saveScenario(array $scenario): array;

    /**
     * @return array<string, mixed>|null
     */
    public function findScenario(string $scenarioIdOrKey): ?array;

    /**
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    public function listScenarios(array $filters = []): array;

    /**
     * @param array<string, mixed> $signal
     * @return array<string, mixed>
     */
    public function saveReplanningSignal(array $signal): array;

    /**
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    public function listReplanningSignals(array $filters = []): array;

    /**
     * @return array<string, mixed>
     */
    public function probe(): array;
}

if (!interface_exists('MOM\\Services\\PlanningScenarioRepository', false)) {
    class_alias(PlanningScenarioRepository::class, 'MOM\\Services\\PlanningScenarioRepository');
}
