<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\InputSanitizer;
use PHPUnit\Framework\TestCase;

class InputSanitizerTest extends TestCase
{
    public function testCodeUppercaseAndTrim(): void
    {
        $this->assertSame('HELLO', InputSanitizer::code('  hello  '));
    }

    public function testCodeReplacesInvalidChars(): void
    {
        $this->assertSame('DOC-001.V2', InputSanitizer::code('doc-001.v2'));
        $this->assertSame('A_B_C', InputSanitizer::code('a b c'));
        $this->assertSame('TEST_123', InputSanitizer::code('test@123'));
    }

    public function testCodePreservesHyphensAndDots(): void
    {
        $this->assertSame('NCR-2024.001', InputSanitizer::code('ncr-2024.001'));
    }

    public function testNormalizePermissionListFiltersInvalid(): void
    {
        $result = InputSanitizer::normalizePermissionList(['read', '', 'write', null, 'read']);
        $this->assertSame(['read', 'write'], $result);
    }

    public function testNormalizePermissionListNonArray(): void
    {
        $this->assertSame([], InputSanitizer::normalizePermissionList('not-array'));
        $this->assertSame([], InputSanitizer::normalizePermissionList(null));
    }

    public function testRolePermissionRowBasic(): void
    {
        $row = [
            'canEditDocs' => true,
            'canCreateDocs' => true,
            'permissions' => ['quality.*', 'orders.read'],
            'denies' => ['admin.*'],
        ];

        $clean = InputSanitizer::rolePermissionRow($row);

        $this->assertTrue($clean['canEditDocs']);
        $this->assertTrue($clean['canCreateDocs']);
        $this->assertSame(['quality.*', 'orders.read'], $clean['permissions']);
        $this->assertSame(['admin.*'], $clean['denies']);
    }

    public function testRolePermissionRowAllowAll(): void
    {
        $clean = InputSanitizer::rolePermissionRow(['allowAllPermissions' => true]);
        $this->assertTrue($clean['allowAllPermissions']);
    }

    public function testRolePermissionRowBooleanFlags(): void
    {
        $row = [
            'canEditDocs' => true,
            'canCreateDocs' => false,
            'canApprove' => true,
            'canDelete' => false,
            'notBool' => 'string',
        ];

        $clean = InputSanitizer::rolePermissionRow($row);

        $this->assertTrue($clean['canEditDocs']);
        $this->assertFalse($clean['canCreateDocs']);
        $this->assertTrue($clean['canApprove']);
        $this->assertFalse($clean['canDelete']);
        $this->assertArrayNotHasKey('notBool', $clean);
    }

    public function testUserForClientStripsPassword(): void
    {
        $user = [
            'username' => 'admin',
            'password' => '$2y$10$secret',
            'totp_secret' => 'JBSWY3DPEHPK3PXP',
            'name' => 'Admin User',
            'role' => 'admin',
            'active' => true,
            'avatar_icon' => '👑',
            'avatar_image' => 'data:image/png;base64,AA==',
            'mfa' => ['enabled' => true],
        ];

        $clean = InputSanitizer::userForClient($user);

        $this->assertSame('admin', $clean['username']);
        $this->assertSame('Admin User', $clean['name']);
        $this->assertSame('👑', $clean['avatar_icon']);
        $this->assertSame('data:image/png;base64,AA==', $clean['avatar_image']);
        $this->assertTrue($clean['mfa']['enabled']);
        $this->assertArrayNotHasKey('password', $clean);
        $this->assertArrayNotHasKey('totp_secret', $clean);
    }

    public function testUserForClientDefaults(): void
    {
        $clean = InputSanitizer::userForClient([]);
        $this->assertSame('', $clean['username']);
        $this->assertSame('user', $clean['role']);
        $this->assertTrue($clean['active']);
        $this->assertFalse($clean['mfa']['enabled']);
    }
}
