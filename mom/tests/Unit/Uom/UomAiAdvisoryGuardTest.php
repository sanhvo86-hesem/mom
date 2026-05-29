<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\UomAiAdvisoryGuard;
use MOM\Api\Services\Uom\UomException;
use PHPUnit\Framework\TestCase;

final class UomAiAdvisoryGuardTest extends TestCase
{
    public function testAiActorRecognisedFromCatalog(): void
    {
        $this->assertTrue(UomAiAdvisoryGuard::isAiActor('ai-llm'));
        $this->assertTrue(UomAiAdvisoryGuard::isAiActor('AI-LLM'));
        $this->assertFalse(UomAiAdvisoryGuard::isAiActor('human-reviewer'));
    }

    public function testHumanCallerNeverBlocked(): void
    {
        // Should NOT throw for human actor regardless of operation.
        UomAiAdvisoryGuard::assertNotAi('human-reviewer', 'manifest.approve');
        $this->assertTrue(true, 'reached without exception');
    }

    public function testAiCannotApproveManifest(): void
    {
        try {
            UomAiAdvisoryGuard::assertNotAi('ai-llm', 'manifest.approve');
            $this->fail('expected UOM_AI_AUTHORITY_FORBIDDEN');
        } catch (UomException $e) {
            $this->assertSame('UOM_AI_AUTHORITY_FORBIDDEN', $e->problemCode);
            $this->assertSame(403, $e->getHttpStatus());
        }
    }

    public function testAiCannotEsignRule(): void
    {
        try {
            UomAiAdvisoryGuard::assertNotAi('ai-classifier', 'rule.esign');
            $this->fail('expected UOM_AI_AUTHORITY_FORBIDDEN');
        } catch (UomException $e) {
            $this->assertSame('UOM_AI_AUTHORITY_FORBIDDEN', $e->problemCode);
        }
    }

    public function testAiAllowedOnNonAuthorityOperation(): void
    {
        // 'advisory.record' is not in the forbidden list → guard passes.
        UomAiAdvisoryGuard::assertNotAi('ai-suggester', 'advisory.record');
        $this->assertTrue(true);
    }
}
