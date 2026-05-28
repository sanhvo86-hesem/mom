<?php

declare(strict_types=1);

namespace MOM\Tests;

use MOM\Api\Services\RaciControlRegistryService;
use PHPUnit\Framework\TestCase;

final class RaciControlRegistryServiceTest extends TestCase
{
    public function testControlRegistryBootstrapCoversCurrentRaciRows(): void
    {
        $service = new RaciControlRegistryService($this->repoRoot(), $this->dataDir());
        $result = $service->validate();

        self::assertTrue($result['valid'], json_encode($result['issues'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?: 'json_encode_failed');
        self::assertSame(57, $result['summary']['rows'] ?? null);
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
