<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class EngineeringReleasePackageMigrationTest extends TestCase
{
    public function testMigrationDefinesPackageTablesSnapshotsAndReleaseTriggers(): void
    {
        $sql = file_get_contents(__DIR__ . '/../../../database/migrations/274_engineering_release_package_runtime_closure.sql');
        $this->assertIsString($sql);

        foreach ([
            'CREATE TABLE IF NOT EXISTS engineering_release_package',
            'CREATE TABLE IF NOT EXISTS engineering_release_package_member',
            'CREATE TABLE IF NOT EXISTS engineering_release_package_approval',
            'CREATE TABLE IF NOT EXISTS work_order_engineering_package_snapshot',
            'CREATE TABLE IF NOT EXISTS order_engineering_package_snapshot',
            'ADD COLUMN IF NOT EXISTS engineering_package_id',
            'prevent_released_engineering_package_member_mutation',
            'prevent_released_engineering_package_manifest_mutation',
            'enforce_work_order_engineering_package_snapshot',
            'enforce_sales_order_engineering_package_snapshot',
            'enforce_job_order_engineering_package_snapshot',
            'work_order_release_requires_engineering_package_snapshot',
            'sales_order_release_requires_engineering_package_snapshot',
            'job_order_release_requires_engineering_package_snapshot',
        ] as $requiredSql) {
            $this->assertStringContainsString($requiredSql, $sql);
        }
    }
}
