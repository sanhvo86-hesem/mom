<?php

declare(strict_types=1);

namespace MOM\Tests;

use MOM\Api\Services\AuthorityWorkflowGuardService;
use PHPUnit\Framework\TestCase;

final class AuthorityWorkflowGuardServiceTest extends TestCase
{
    public function testWorkflowRegistryMapsCriticalTransitionsToEvidenceAndAuthority(): void
    {
        $service = new AuthorityWorkflowGuardService($this->repoRoot(), $this->dataDir());
        $result = $service->validate();

        self::assertTrue($result['valid'], json_encode($result['issues'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?: 'json_encode_failed');
        self::assertGreaterThan(0, $result['summary']['critical_rows'] ?? 0);
    }

    private function repoRoot(): string
    {
        return dirname(__DIR__, 2);
    }

    private function dataDir(): string
    {
        return $this->repoRoot() . '/mom/data';
    }
}
