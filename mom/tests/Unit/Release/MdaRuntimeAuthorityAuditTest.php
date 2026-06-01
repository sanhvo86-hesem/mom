<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Release;

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 3) . '/tools/audit_runtime_authority_consistency.php';

final class MdaRuntimeAuthorityAuditTest extends TestCase
{
    public function testPostgresOnlyDoesNotBlockWhenJsonMirrorIsEmpty(): void
    {
        $result = \audit_collection(
            'mes',
            'connector_feeds',
            [],
            [['feed_id' => 'M-001', 'machine_id' => 'M-001']],
            'POSTGRES_ONLY',
        );

        $this->assertSame('ok', $result['authority_status']);
        $this->assertSame(0, $result['blocking_issue_count']);
        $this->assertSame('advisory_drift', $result['status']);
        $this->assertSame(['M-001'], $result['missing_in_json']);
    }

    public function testPostgresOnlyBlocksLegacyJsonRowsMissingFromAuthority(): void
    {
        $result = \audit_collection(
            'master_data',
            'parts',
            [['part_number' => 'PN-LEGACY']],
            [],
            'POSTGRES_ONLY',
        );

        $this->assertSame('blocked', $result['authority_status']);
        $this->assertSame(1, $result['blocking_issue_count']);
        $this->assertSame(['PN-LEGACY'], $result['missing_in_postgres']);
    }

    public function testMissingPostgresCollectionKeyIsBlockingWithoutPhpWarnings(): void
    {
        $result = \audit_collection(
            'mes',
            'connector_feeds',
            [],
            [['machine_id' => 'M-001']],
            'POSTGRES_ONLY',
        );

        $this->assertSame('blocked', $result['authority_status']);
        $this->assertSame(1, $result['blocking_issue_count']);
        $this->assertSame('postgres_rows_missing_collection_key', $result['blocking_issues'][0]['code'] ?? '');
    }

    public function testShadowWriteStillRequiresJsonMirrorParity(): void
    {
        $result = \audit_collection(
            'orders',
            'sales_orders',
            [],
            [['so_number' => 'SO-001']],
            'SHADOW_WRITE',
        );

        $this->assertSame('blocked', $result['authority_status']);
        $this->assertSame('postgres_rows_missing_in_shadow_json', $result['blocking_issues'][0]['code'] ?? '');
    }
}
