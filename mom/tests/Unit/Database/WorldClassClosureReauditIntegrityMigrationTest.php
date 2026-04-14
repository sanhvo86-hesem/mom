<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class WorldClassClosureReauditIntegrityMigrationTest extends TestCase
{
    private string $sql;
    private string $closureSql;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/database/migrations/132_world_class_closure_reaudit_integrity.sql';
        $sql = file_get_contents($path);
        self::assertIsString($sql);
        $this->sql = $sql;

        $closurePath = dirname(__DIR__, 3) . '/database/migrations/133_world_class_closure_scope_change_integrity.sql';
        $closureSql = file_get_contents($closurePath);
        self::assertIsString($closureSql);
        $this->closureSql = $closureSql;
    }

    public function testSignatureEventsAreRelationallyBoundToAuthChallenges(): void
    {
        $this->assertStringContainsString('fk_signature_events_auth_challenge', $this->sql);
        $this->assertStringContainsString('FOREIGN KEY (auth_challenge_id)', $this->sql);
        $this->assertStringContainsString('REFERENCES e_signature_auth_challenges (auth_challenge_id)', $this->sql);
        $this->assertStringContainsString('signature_events_auth_challenge_orphans_block_fk', $this->sql);
        $this->assertStringNotContainsString('NOT VALID', $this->sql);
    }

    public function testExplicitFieldAuthorizationTokensHaveUnconsumedLookupIndex(): void
    {
        $this->assertStringContainsString('idx_eqms_field_change_authorization_unconsumed', $this->sql);
        $this->assertStringContainsString('WHERE consumed_at IS NULL', $this->sql);
        $this->assertStringContainsString('one-shot explicit field authorization tokens', $this->sql);
    }

    public function testClosureMigrationScopes5MAndValidatesReleaseSignatureConstraint(): void
    {
        $this->assertStringContainsString('VALIDATE CONSTRAINT chk_plm_change_orders_release_signature', $this->closureSql);
        $this->assertStringContainsString('plm_change_orders_release_signature_unvalidated_rows_block_constraint', $this->closureSql);
        $this->assertStringContainsString('ux_traceability_5m_obligations_scoped', $this->closureSql);
        $this->assertStringContainsString('(COALESCE(org_plant_id, \'\'))', $this->closureSql);
        $this->assertStringNotContainsString('NOT VALID', $this->closureSql);
    }

    public function testClosureMigrationAddsDocumentFormImmutabilityAndWaiverForeignKey(): void
    {
        $this->assertStringContainsString('prevent_released_document_form_control_mutation', $this->closureSql);
        $this->assertStringContainsString('released_doc_revision_immutable', $this->closureSql);
        $this->assertStringContainsString('released_form_template_revision_immutable', $this->closureSql);
        $this->assertStringContainsString('released_form_schema_version_immutable', $this->closureSql);
        $this->assertStringContainsString('fk_periodic_evaluations_waiver_signature_event', $this->closureSql);
        $this->assertStringContainsString('audit.integrity_digest.daily', $this->closureSql);
    }
}
