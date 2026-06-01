<?php

declare(strict_types=1);

namespace MOM\Api\Services\Scenario;

use MOM\Database\Connection;

final class ScenarioFixtureSeeder
{
    /**
     * @param array<string,mixed> $scenario
     * @return array<string,mixed>
     */
    public function seed(Connection $db, array $scenario): array
    {
        $fixture = is_array($scenario['fixture'] ?? null) ? (array)$scenario['fixture'] : [];
        if ($db instanceof ScenarioSandboxConnection) {
            $db->seed($fixture);
        }

        return [
            'mode' => $db instanceof ScenarioSandboxConnection ? 'transaction_sandbox' : 'external_connection',
            'fixture_keys' => array_values(array_keys($fixture)),
            'mock_only' => false,
        ];
    }
}
