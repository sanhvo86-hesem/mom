<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class WorldClassClosureReauditIntegrityMigrationTest extends TestCase
{
    private string $sql;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/database/migrations/132_world_class_closure_reaudit_integrity.sql';
        $sql = file_get_contents($path);
        self::assertIsString($sql);
        $this->sql = $sql;
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
}
