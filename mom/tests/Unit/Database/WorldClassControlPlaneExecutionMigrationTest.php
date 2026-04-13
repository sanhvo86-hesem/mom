<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class WorldClassControlPlaneExecutionMigrationTest extends TestCase
{
    private string $sql;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/database/migrations/108_world_class_control_plane_execution.sql';
        $sql = file_get_contents($path);
        self::assertIsString($sql);
        $this->sql = $sql;
    }

    public function testWaveTablesArePresent(): void
    {
        foreach ([
            'release_manifests',
            'promotion_receipts',
            'eqms_command_ledger',
            'control_plane_object_registry',
            'state_transition_events',
            'submission_validation_results',
            'duplicate_detection_fingerprints',
            'effectivity_conflicts',
            'training_gate_decisions',
            'publication_attempts',
            'publication_receipts',
            'audit_pack_exports',
            'genealogy_nodes',
            'genealogy_edges',
            'as_manufactured_snapshots',
            'traceability_exceptions',
        ] as $table) {
            $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS ' . $table, $this->sql, $table);
        }
    }

    public function testOutboxConsolidationAddsCanonicalWorkerFields(): void
    {
        $this->assertStringContainsString('ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS handler_key', $this->sql);
        $this->assertStringContainsString('ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS dedupe_key', $this->sql);
        $this->assertStringContainsString('ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS lease_owner', $this->sql);
        $this->assertStringContainsString('ux_outbox_events_dedupe_key', $this->sql);
    }

    public function testFinalEvidencePublicationAndChangeSemanticsAreEncoded(): void
    {
        $this->assertStringContainsString("SharePoint remains publication/read-only only", $this->sql);
        $this->assertStringContainsString("CHECK (promotion_scope IN ('controlled_source', 'runtime_config', 'schema_registry', 'publication_bundle'))", $this->sql);
        $this->assertStringContainsString("CHECK (session_state <> 'finalized' OR locked_payload_hash_sha256 IS NOT NULL)", $this->sql);
        $this->assertStringContainsString("CHECK (export_state <> 'ready' OR (package_uri IS NOT NULL AND package_hash_sha256 IS NOT NULL))", $this->sql);
    }
}
