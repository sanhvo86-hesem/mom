<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class ControlPlaneCutoverHardeningMigrationTest extends TestCase
{
    private string $sql;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/database/migrations/109_control_plane_cutover_hardening.sql';
        $sql = file_get_contents($path);
        self::assertIsString($sql);
        $this->sql = $sql;
    }

    public function testCutoverTablesArePresent(): void
    {
        foreach ([
            'governed_route_registry',
            'legacy_authority_sunset',
            'control_plane_command_handlers',
            'periodic_evaluations',
            'emergency_change_controls',
            'rollback_requirements',
            'genealogy_edge_facts',
            'traceability_5m_obligations',
        ] as $table) {
            $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS ' . $table, $this->sql, $table);
        }
    }

    public function testLegacyAuthoritySunsetSeedsKnownSplitBrainSurfaces(): void
    {
        foreach (['EvidenceVaultService', 'WorkflowEngine', 'FormController', 'ProductPassportController'] as $surface) {
            $this->assertStringContainsString($surface, $this->sql);
        }
        $this->assertStringContainsString('canonical_outbox_legacy_bridge', $this->sql);
    }

    public function testEmergencyRollbackAnd5mSemanticsAreEncoded(): void
    {
        $this->assertStringContainsString("CHECK (emergency_state IN ('declared', 'approved_for_use', 'contained', 'normalized', 'rejected', 'rolled_back'))", $this->sql);
        $this->assertStringContainsString("CHECK (rollback_state IN ('required', 'planned', 'approved', 'executed', 'waived', 'not_required'))", $this->sql);
        $this->assertStringContainsString("CHECK (edge_fact_type IN ('consume', 'produce', 'split', 'merge', 'rework', 'hold', 'release', 'quarantine', 'scrap', 'supersede', 'ship', 'inspect', 'measure'))", $this->sql);
    }
}
