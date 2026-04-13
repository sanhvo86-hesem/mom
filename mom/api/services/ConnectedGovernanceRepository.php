<?php
declare(strict_types=1);

namespace MOM\Api\Services;

interface ConnectedGovernanceRepository
{
    /**
     * @param array<string, mixed> $rollout
     * @return array<string, mixed>
     */
    public function saveRollout(array $rollout): array;

    /**
     * @return array<string, mixed>|null
     */
    public function findRollout(string $rolloutId): ?array;

    /**
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    public function listRollouts(array $filters = []): array;

    /**
     * @param array<string, mixed> $obligation
     * @return array<string, mixed>
     */
    public function saveTrainingObligation(array $obligation): array;

    /**
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    public function listTrainingObligations(array $filters = []): array;

    /**
     * @param array<string, mixed> $decision
     * @return array<string, mixed>
     */
    public function appendEntitlementDecision(array $decision): array;

    /**
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    public function listEntitlementDecisions(array $filters = []): array;

    /**
     * @return array<string, mixed>
     */
    public function probe(): array;
}

if (!interface_exists('MOM\\Services\\ConnectedGovernanceRepository', false)) {
    class_alias(ConnectedGovernanceRepository::class, 'MOM\\Services\\ConnectedGovernanceRepository');
}

