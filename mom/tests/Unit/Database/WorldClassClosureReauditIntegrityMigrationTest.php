<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class WorldClassClosureReauditIntegrityMigrationTest extends TestCase
{
    private string $sql;
    private string $closureSql;
    private string $finalHardeningSql;
    private string $mesClosureSql;

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

        $finalHardeningPath = dirname(__DIR__, 3) . '/database/migrations/134_world_class_closure_final_record_integrity.sql';
        $finalHardeningSql = file_get_contents($finalHardeningPath);
        self::assertIsString($finalHardeningSql);
        $this->finalHardeningSql = $finalHardeningSql;

        $mesClosurePath = dirname(__DIR__, 3) . '/database/migrations/135_world_class_mes_event_spine_periodic_closure.sql';
        $mesClosureSql = file_get_contents($mesClosurePath);
        self::assertIsString($mesClosureSql);
        $this->mesClosureSql = $mesClosureSql;
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
        $this->assertStringContainsString('released_doc_revision_delete_blocked', $this->closureSql);
        $this->assertStringContainsString('BEFORE DELETE ON doc_revisions', $this->closureSql);
        $this->assertStringContainsString('BEFORE DELETE ON frm_template_revisions', $this->closureSql);
        $this->assertStringContainsString('BEFORE DELETE ON frm_schema_versions', $this->closureSql);
        $this->assertStringContainsString('NEW.approved_by IS DISTINCT FROM OLD.approved_by', $this->closureSql);
        $this->assertStringContainsString('NEW.released_at IS DISTINCT FROM OLD.released_at', $this->closureSql);
        $this->assertStringContainsString('NEW.metadata IS DISTINCT FROM OLD.metadata', $this->closureSql);
        $this->assertStringContainsString('fk_periodic_evaluations_waiver_signature_event', $this->closureSql);
        $this->assertStringContainsString('audit.integrity_digest.daily', $this->closureSql);
    }

    public function testFinalRecordIntegrityMigrationHardensSignatureEvidenceRetentionAndDigestRows(): void
    {
        $this->assertStringContainsString('chk_signature_events_applied_regulated_ceremony', $this->finalHardeningSql);
        $this->assertStringContainsString('form_submission_acceptance', $this->finalHardeningSql);
        $this->assertStringContainsString('prevent_final_evidence_record_mutation', $this->finalHardeningSql);
        $this->assertStringContainsString('final_evidence_record_delete_blocked', $this->finalHardeningSql);
        $this->assertStringContainsString('prevent_integrity_digest_mutation', $this->finalHardeningSql);
        $this->assertStringContainsString('integrity_digest_delete_blocked', $this->finalHardeningSql);
        $this->assertStringContainsString('prevent_integrity_exception_identity_mutation', $this->finalHardeningSql);
        $this->assertStringContainsString('integrity_exception_delete_blocked', $this->finalHardeningSql);
        $this->assertStringContainsString('prevent_active_retention_lock_mutation', $this->finalHardeningSql);
        $this->assertStringContainsString('active_retention_lock_delete_blocked', $this->finalHardeningSql);
    }

    public function testMesEventSpineMigrationClosesPeriodicAndMachineEventP1Gaps(): void
    {
        $this->assertStringContainsString('ADD COLUMN IF NOT EXISTS org_id TEXT', $this->mesClosureSql);
        $this->assertStringContainsString('ux_periodic_evaluations_org_scope_due', $this->mesClosureSql);
        $this->assertStringContainsString('periodic_evaluation_closure_events', $this->mesClosureSql);
        $this->assertStringContainsString('prevent_closed_periodic_evaluation_mutation', $this->mesClosureSql);
        $this->assertStringContainsString('closed_periodic_evaluation_is_immutable', $this->mesClosureSql);
        $this->assertStringContainsString('machine_raw_events', $this->mesClosureSql);
        $this->assertStringContainsString('production_derived_events', $this->mesClosureSql);
        $this->assertStringContainsString("payload_schema_version TEXT NOT NULL DEFAULT 'mes_machine_raw_event.v1'", $this->mesClosureSql);
        $this->assertStringContainsString('row_version INTEGER NOT NULL DEFAULT 1', $this->mesClosureSql);
        $this->assertStringContainsString('prevent_append_only_mes_spine_mutation', $this->mesClosureSql);
        $this->assertStringContainsString('RecordMachineEvent', $this->mesClosureSql);
        $this->assertStringContainsString('DeriveProductionEvent', $this->mesClosureSql);
    }
}
