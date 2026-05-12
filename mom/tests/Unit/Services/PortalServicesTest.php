<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\PortalServices;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

#[CoversClass(PortalServices::class)]
final class PortalServicesTest extends TestCase
{
    protected function setUp(): void
    {
        PortalServices::resetForTesting();
    }

    protected function tearDown(): void
    {
        PortalServices::resetForTesting();
    }

    #[Test]
    public function factoryReturnsNullWhenDbUnavailable(): void
    {
        // The test environment has no PG service; connection() should fail
        // gracefully and every dependent factory should return null. This
        // guarantees the legacy filesystem fallback paths in
        // UserController + DocumentController stay reachable when the DB
        // is down.
        $conn = PortalServices::connection();
        if ($conn !== null) {
            $this->markTestSkipped('PostgreSQL is reachable; null-path test only meaningful without DB.');
        }
        $this->assertNull(PortalServices::modeResolver());
        $this->assertNull(PortalServices::auditChain());
        $this->assertNull(PortalServices::identity('/tmp/x', '/tmp/y'));
        $this->assertNull(PortalServices::documentBody('/tmp/x'));
    }

    #[Test]
    public function resetForTestingClearsMemoisation(): void
    {
        PortalServices::connection(); // attempt
        PortalServices::resetForTesting();
        // Should not throw and should re-attempt cleanly.
        $this->assertNull(PortalServices::connection());
    }
}
