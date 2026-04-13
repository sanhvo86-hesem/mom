<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class EqmsControlPlaneMigrationContractTest extends TestCase
{
    private string $migrationSql;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/database/migrations/106_eqms_world_class_control_plane.sql';
        $sql = file_get_contents($path);
        self::assertIsString($sql);
        $this->migrationSql = $sql;
    }

    public function testFinalEvidenceAndPublicationStatesHaveDatabaseLevelCompletenessGuards(): void
    {
        $this->assertStringContainsString("record_state IN ('open', 'under_review') OR current_version_id IS NOT NULL", $this->migrationSql);
        $this->assertStringContainsString("version_state NOT IN ('locked', 'superseded', 'voided') OR finalized_at IS NOT NULL", $this->migrationSql);
        $this->assertStringContainsString("publication_state <> 'published'", $this->migrationSql);
        $this->assertStringContainsString("publication_receipt <> '{}'::jsonb", $this->migrationSql);
        $this->assertStringContainsString("publication_state NOT IN ('failed', 'retry_scheduled', 'dead_letter') OR last_error_code IS NOT NULL", $this->migrationSql);
    }

    public function testControlledActorRowsCannotBeOwnerless(): void
    {
        $this->assertStringContainsString("audience_user_id IS NOT NULL OR NULLIF(trim(actor_ref), '') IS NOT NULL", $this->migrationSql);
        $this->assertStringContainsString("issued_to_user_id IS NOT NULL OR NULLIF(trim(issued_to_ref), '') IS NOT NULL", $this->migrationSql);
        $this->assertStringContainsString("signer_user_id IS NOT NULL OR NULLIF(trim(signer_ref), '') IS NOT NULL", $this->migrationSql);
    }

    public function testPackageAndChangeAuthorityDuplicateGuardsArePresent(): void
    {
        $this->assertStringContainsString('ux_evidence_artifacts_single_package_role', $this->migrationSql);
        $this->assertStringContainsString('ux_plm_change_affected_objects_order_scope', $this->migrationSql);
    }
}
