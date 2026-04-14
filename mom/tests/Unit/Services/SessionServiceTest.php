<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\SessionService;
use PHPUnit\Framework\TestCase;

class SessionServiceTest extends TestCase
{
    public function testExtractUserScope(): void
    {
        $user = [
            'org_company_code' => 'HESEM',
            'org_legal_entity_code' => 'HE-VN',
            'org_plant_id' => 'P01',
            'org_site_id' => 'S01',
        ];

        $scope = SessionService::extractUserScope($user);

        $this->assertSame('HESEM', $scope['org_company_code']);
        $this->assertSame('HE-VN', $scope['org_legal_entity_code']);
        $this->assertSame('P01', $scope['org_plant_id']);
        $this->assertSame('S01', $scope['org_site_id']);
    }

    public function testExtractUserScopeSkipsEmpty(): void
    {
        $user = [
            'org_company_code' => 'HESEM',
            'org_legal_entity_code' => '',
            'org_plant_id' => '  ',
        ];

        $scope = SessionService::extractUserScope($user);

        $this->assertArrayHasKey('org_company_code', $scope);
        $this->assertArrayNotHasKey('org_legal_entity_code', $scope);
        $this->assertArrayNotHasKey('org_plant_id', $scope);
    }

    public function testExtractUserScopeEmptyUser(): void
    {
        $this->assertSame([], SessionService::extractUserScope([]));
    }

    public function testRequiresCompletedMfaWhenSystemDisabled(): void
    {
        $user = ['mfa' => ['enabled' => true]];
        $settings = ['require_mfa' => false];

        $this->assertFalse(SessionService::requiresCompletedMfa($user, $settings));
    }

    public function testRequiresCompletedMfaWhenSystemEnabled(): void
    {
        $user = ['mfa' => ['enabled' => false]];
        $settings = ['require_mfa' => true];

        $this->assertTrue(SessionService::requiresCompletedMfa($user, $settings));
    }

    public function testRequiresCompletedMfaDefaultsToTrue(): void
    {
        $this->assertTrue(SessionService::requiresCompletedMfa([], []));
    }

    public function testPasswordPolicyValid(): void
    {
        [$ok, $msg] = SessionService::passwordPolicy('MyP@ssw0rd!');
        $this->assertTrue($ok);
        $this->assertSame('', $msg);
    }

    public function testPasswordPolicyTooShort(): void
    {
        [$ok, $msg] = SessionService::passwordPolicy('Ab1!');
        $this->assertFalse($ok);
        $this->assertStringContainsString('10 characters', $msg);
    }

    public function testPasswordPolicyNoLowercase(): void
    {
        [$ok, $msg] = SessionService::passwordPolicy('ABCDE12345!');
        $this->assertFalse($ok);
        $this->assertStringContainsString('lowercase', $msg);
    }

    public function testPasswordPolicyNoUppercase(): void
    {
        [$ok, $msg] = SessionService::passwordPolicy('abcde12345!');
        $this->assertFalse($ok);
        $this->assertStringContainsString('uppercase', $msg);
    }

    public function testPasswordPolicyNoDigit(): void
    {
        [$ok, $msg] = SessionService::passwordPolicy('Abcdefghij!');
        $this->assertFalse($ok);
        $this->assertStringContainsString('number', $msg);
    }

    public function testPasswordPolicyNoSymbol(): void
    {
        [$ok, $msg] = SessionService::passwordPolicy('Abcde12345');
        $this->assertFalse($ok);
        $this->assertStringContainsString('symbol', $msg);
    }

    public function testSessionOwnershipWarningAllowsFreshStart(): void
    {
        $method = new \ReflectionMethod(SessionService::class, 'exceptionAllowsFreshStart');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $this->assertTrue($method->invoke(null, new \RuntimeException(
            'session_start(): Session data file is not created by your uid'
        )));
    }
}
