<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\EvidenceVaultService;
use MOM\Database\Connection;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use RuntimeException;

final class EvidenceVaultServiceComplianceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        Connection::resetInstance();
        $this->tmpDir = sys_get_temp_dir() . '/mom_evidence_vault_test_' . bin2hex(random_bytes(4));
        if (!mkdir($this->tmpDir, 0775, true) && !is_dir($this->tmpDir)) {
            throw new RuntimeException('Unable to create temp evidence test directory.');
        }
    }

    protected function tearDown(): void
    {
        Connection::resetInstance();
        $this->removeTree($this->tmpDir);
    }

    public function testInitialCustodyActionMatchesDatabaseEnum(): void
    {
        $service = new EvidenceVaultService($this->tmpDir);

        $record = $service->store([
            'title' => 'Certificate package',
            'type' => 'certificate',
            'content' => 'controlled evidence payload',
        ], 'qa.user');

        $this->assertSame('GENESIS', $record['previous_hash']);
        $this->assertSame(hash('sha256', 'controlled evidence payload'), $record['file_hash']);

        $custody = $service->getCustodyLog($record['evidence_id']);
        $this->assertCount(1, $custody);
        $this->assertSame('uploaded', $custody[0]['action']);

        $this->assertTrue($service->verifyChain()['valid']);
        $this->assertTrue($service->verifyChain($record['evidence_id'])['valid']);

        $missing = $service->verifyChain('00000000-0000-4000-8000-000000000000');
        $this->assertFalse($missing['valid']);
        $this->assertSame('evidence_not_found', $missing['error']);
    }

    public function testLegacyEvidenceTermsMapToMigrationEnums(): void
    {
        $service = new EvidenceVaultService($this->tmpDir);
        $ref = new ReflectionClass($service);

        $mapType = $ref->getMethod('mapEvidenceType');
        $this->assertSame('material_cert', $mapType->invoke($service, 'certificate'));
        $this->assertSame('measurement_data', $mapType->invoke($service, 'measurement'));
        $this->assertSame('machine_log', $mapType->invoke($service, 'log'));
        $this->assertSame('test_report', $mapType->invoke($service, 'report'));

        $mapAction = $ref->getMethod('mapCustodyAction');
        $this->assertSame('uploaded', $mapAction->invoke($service, 'stored'));
        $this->assertSame('viewed', $mapAction->invoke($service, 'accessed'));
        $this->assertSame('downloaded', $mapAction->invoke($service, 'exported'));
        $this->assertSame('verified', $mapAction->invoke($service, 'sealed'));
    }

    public function testFileUploadEvidenceFailsClosedWhenTempFileIsMissing(): void
    {
        $service = new EvidenceVaultService($this->tmpDir);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('evidence_upload_temp_unreadable');

        $service->store([
            'tmp_name' => $this->tmpDir . '/missing.xlsx',
            'name' => 'offline.xlsx',
            'type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'size' => 123,
        ], ['type' => 'form_upload'], 'operator');
    }

    public function testControlledProgrammaticEvidenceRequiresRealArtifactHash(): void
    {
        $service = new EvidenceVaultService($this->tmpDir);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('evidence_hash_required_for_controlled_record');

        $service->store([
            'title' => 'Final offline package',
            'type' => 'form_upload',
            'controlled_record' => true,
        ], 'qa.user');
    }

    public function testControlledProgrammaticEvidenceRejectsInvalidArtifactHash(): void
    {
        $service = new EvidenceVaultService($this->tmpDir);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('evidence_hash_invalid_for_controlled_record');

        $service->store([
            'title' => 'Final offline package',
            'type' => 'form_upload',
            'controlled_record' => true,
            'file_hash' => 'not-a-sha256',
        ], 'qa.user');
    }

    public function testGovernanceAttachmentFailsClosedWhenTempFileIsMissing(): void
    {
        $service = new EvidenceVaultService($this->tmpDir);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('governance_attachment_temp_unreadable');

        $service->createGovernanceAttachment([
            'tmp_name' => $this->tmpDir . '/missing.pdf',
            'name' => 'approval-evidence.pdf',
            'type' => 'application/pdf',
            'size' => 456,
        ], 'approval-group-1', 'party-1', new \stdClass());
    }

    public function testPostgresPrimaryEvidenceWriteFailsClosedWhenDatabaseUnavailable(): void
    {
        $service = new EvidenceVaultService($this->tmpDir, $this->failingDataLayer(DataLayer::MODE_POSTGRES_PRIMARY));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('evidence_pg_write_failed:evidence');

        $service->store([
            'title' => 'Controlled DB-primary evidence',
            'type' => 'document',
            'content' => 'payload',
        ], 'qa.user');
    }

    public function testShadowWriteEvidenceFailureIsObservableButCompatible(): void
    {
        $service = new EvidenceVaultService($this->tmpDir, $this->failingDataLayer(DataLayer::MODE_SHADOW_WRITE));

        $record = $service->store([
            'title' => 'Shadow evidence',
            'type' => 'document',
            'content' => 'payload',
        ], 'qa.user');

        $this->assertNotEmpty($record['evidence_id']);
        $probe = $service->pgWriteProbe();
        $this->assertTrue($probe['enabled']);
        $this->assertSame(DataLayer::MODE_SHADOW_WRITE, $probe['mode']);
        $this->assertTrue($probe['degraded']);
        $this->assertGreaterThanOrEqual(1, $probe['failure_count']);
        $this->assertSame('failed', $probe['last_status']);
        $this->assertNotSame('', $probe['last_error']);
    }

    private function failingDataLayer(string $mode): DataLayer
    {
        return new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, [
            'use_postgres' => true,
            'shadow_write' => $mode === DataLayer::MODE_SHADOW_WRITE,
            'json_fallback' => $mode === DataLayer::MODE_POSTGRES_PRIMARY,
            'host' => '127.0.0.1',
            'port' => 1,
            'database' => 'mom_unavailable',
            'username' => 'mom',
            'password' => 'mom',
            'schema' => 'public',
            'statement_timeout' => 1000,
        ]);
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($it as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($path);
    }
}
