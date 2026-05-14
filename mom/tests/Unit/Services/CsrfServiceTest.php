<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CsrfService;
use MOM\Api\Services\SessionService;
use PHPUnit\Framework\TestCase;

final class CsrfServiceTest extends TestCase
{
    protected function setUp(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        session_id('csrf' . bin2hex(random_bytes(8)));
        SessionService::init();
        $_SESSION = [];
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }

    public function testTokenRotatesExpiredSessionToken(): void
    {
        $_SESSION['csrf'] = 'old-token';
        $_SESSION['csrf_generated_at'] = time() - 3700;

        $token = CsrfService::token();

        $this->assertNotSame('old-token', $token);
        $this->assertSame(64, strlen($token));
        $this->assertGreaterThanOrEqual(time() - 5, (int)$_SESSION['csrf_generated_at']);
    }

    public function testTokenBackfillsGeneratedAtForLegacySessionToken(): void
    {
        $_SESSION['csrf'] = 'legacy-token';
        unset($_SESSION['csrf_generated_at']);

        $token = CsrfService::token();

        $this->assertSame('legacy-token', $token);
        $this->assertArrayHasKey('csrf_generated_at', $_SESSION);
        $this->assertGreaterThanOrEqual(time() - 5, (int)$_SESSION['csrf_generated_at']);
    }

    public function testLegacyTokenHelperRotatesExpiredSessionToken(): void
    {
        $_SESSION['csrf'] = 'old-legacy-token';
        $_SESSION['csrf_generated_at'] = time() - 3700;

        $token = \csrf_token();

        $this->assertNotSame('old-legacy-token', $token);
        $this->assertSame(64, strlen($token));
        $this->assertGreaterThanOrEqual(time() - 5, (int)$_SESSION['csrf_generated_at']);
    }
}
