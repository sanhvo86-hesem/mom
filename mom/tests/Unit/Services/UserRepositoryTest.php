<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\UserRepository;
use PHPUnit\Framework\TestCase;

class UserRepositoryTest extends TestCase
{
    private string $tmpDir;
    private UserRepository $repo;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_userrepo_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir . '/config', 0775, true);

        $store = [
            'users' => [
                [
                    'username' => 'admin',
                    'password' => '$2y$10$hashed',
                    'name' => 'Admin User',
                    'role' => 'admin',
                    'active' => true,
                    'totp_secret' => 'SECRET',
                ],
                [
                    'username' => 'operator',
                    'password' => '$2y$10$hashed2',
                    'name' => 'Operator One',
                    'role' => 'operator',
                    'active' => true,
                ],
                [
                    'username' => 'inactive',
                    'password' => '$2y$10$hashed3',
                    'name' => 'Inactive User',
                    'role' => 'user',
                    'active' => false,
                ],
            ],
            'settings' => ['require_mfa' => true],
        ];

        file_put_contents(
            $this->tmpDir . '/config/users.json',
            json_encode($store, JSON_PRETTY_PRINT)
        );

        $this->repo = new UserRepository($this->tmpDir);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testLoadStore(): void
    {
        $store = $this->repo->loadStore();
        $this->assertIsArray($store);
        $this->assertCount(3, $store['users']);
    }

    public function testLoadStoreCachesResult(): void
    {
        $store1 = $this->repo->loadStore();
        $store2 = $this->repo->loadStore();
        $this->assertSame($store1, $store2);
    }

    public function testFindByUsername(): void
    {
        $user = $this->repo->findByUsername('admin');
        $this->assertNotNull($user);
        $this->assertSame('Admin User', $user['name']);
    }

    public function testFindByUsernameCaseInsensitive(): void
    {
        $user = $this->repo->findByUsername('ADMIN');
        $this->assertNotNull($user);
        $this->assertSame('admin', $user['username']);
    }

    public function testFindByUsernameNotFound(): void
    {
        $this->assertNull($this->repo->findByUsername('nonexistent'));
    }

    public function testUpdateExistingUser(): void
    {
        $this->repo->updateUser([
            'username' => 'admin',
            'name' => 'Updated Admin',
            'role' => 'superadmin',
        ]);

        // Fresh repo to verify persistence
        $fresh = new UserRepository($this->tmpDir);
        $user = $fresh->findByUsername('admin');
        $this->assertSame('Updated Admin', $user['name']);
        $this->assertSame('superadmin', $user['role']);
    }

    public function testUpdateInsertsNewUser(): void
    {
        $this->repo->updateUser([
            'username' => 'newuser',
            'name' => 'New User',
            'role' => 'viewer',
        ]);

        $fresh = new UserRepository($this->tmpDir);
        $user = $fresh->findByUsername('newuser');
        $this->assertNotNull($user);
        $this->assertSame('New User', $user['name']);
    }

    public function testListUsersStripsPasswords(): void
    {
        $users = $this->repo->listUsers();
        $this->assertCount(3, $users);

        foreach ($users as $user) {
            $this->assertArrayNotHasKey('password', $user);
            $this->assertArrayNotHasKey('totp_secret', $user);
        }
    }

    public function testGetSettings(): void
    {
        $settings = $this->repo->getSettings();
        $this->assertTrue($settings['require_mfa']);
    }

    public function testUserHasRole(): void
    {
        $this->assertTrue($this->repo->userHasRole('admin', 'admin'));
        $this->assertFalse($this->repo->userHasRole('admin', 'operator'));
        $this->assertFalse($this->repo->userHasRole('nonexistent', 'admin'));
    }

    public function testIsActive(): void
    {
        $this->assertTrue($this->repo->isActive('admin'));
        $this->assertFalse($this->repo->isActive('inactive'));
        $this->assertFalse($this->repo->isActive('nonexistent'));
    }

    public function testLoadStoreReturnsNullWhenNoFile(): void
    {
        $emptyDir = $this->tmpDir . '/empty';
        mkdir($emptyDir, 0775, true);
        $repo = new UserRepository($emptyDir);
        $this->assertNull($repo->loadStore());
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) return;
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
