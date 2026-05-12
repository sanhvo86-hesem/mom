<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\AuditChainService;
use MOM\Api\Services\DataCollectionModeResolver;
use MOM\Api\Services\DocumentBodyRepository;
use MOM\Database\Connection;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

#[CoversClass(DocumentBodyRepository::class)]
final class DocumentBodyRepositoryTest extends TestCase
{
    private string $docsRoot;

    protected function setUp(): void
    {
        $this->docsRoot = sys_get_temp_dir() . '/mom_docs_test_' . bin2hex(random_bytes(4));
        mkdir($this->docsRoot . '/system/policies', 0775, true);
        file_put_contents(
            $this->docsRoot . '/system/policies/pol-qms-001-quality-policy.html',
            '<html><body>Policy body v1</body></html>',
        );
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->docsRoot);
    }

    #[Test]
    public function jsonOnlyModeReadsFromFilesystem(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => DataCollectionModeResolver::MODE_JSON_ONLY,
            'postgres_table' => 'dcc_document_body',
            'json_path'      => 'docs/**/*.html',
        ]);
        $repo = $this->buildRepo($db);

        $result = $repo->findCurrent('pol-qms-001');
        $this->assertNotNull($result);
        $this->assertStringContainsString('Policy body v1', $result['body_html']);
        $this->assertSame(hash('sha256', $result['body_html']), $result['body_sha256']);
        $this->assertStringStartsWith('filesystem:', $result['source']);
    }

    #[Test]
    public function postgresOnlyModeReadsFromDatabase(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturnCallback(function (string $sql) {
            if (str_contains($sql, 'data_collection_state')) {
                return [
                    'mode'           => DataCollectionModeResolver::MODE_POSTGRES_ONLY,
                    'postgres_table' => 'dcc_document_body',
                    'json_path'      => null,
                ];
            }
            if (str_contains($sql, 'dcc_document_body_current')) {
                return [
                    'body_html'   => '<html>From DB</html>',
                    'body_sha256' => hash('sha256', '<html>From DB</html>'),
                    'revision'    => 'V1',
                    'status'      => 'released',
                ];
            }
            return null;
        });
        $repo = $this->buildRepo($db);

        $result = $repo->findCurrent('pol-qms-001');
        $this->assertNotNull($result);
        $this->assertSame('<html>From DB</html>', $result['body_html']);
        $this->assertSame('postgres', $result['source']);
        $this->assertSame('V1', $result['revision']);
    }

    #[Test]
    public function postgresPrimaryFallsBackToFilesystemOnDbMiss(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturnCallback(function (string $sql) {
            if (str_contains($sql, 'data_collection_state')) {
                return [
                    'mode'           => DataCollectionModeResolver::MODE_POSTGRES_PRIMARY,
                    'postgres_table' => 'dcc_document_body',
                    'json_path'      => 'docs/**',
                ];
            }
            return null; // dcc_document_body_current returns nothing
        });
        $repo = $this->buildRepo($db);

        $result = $repo->findCurrent('pol-qms-001');
        $this->assertNotNull($result);
        $this->assertStringContainsString('Policy body v1', $result['body_html']);
        $this->assertStringStartsWith('filesystem:', $result['source']);
    }

    #[Test]
    public function shadowWriteSavesToBothStores(): void
    {
        $captured = [];
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => DataCollectionModeResolver::MODE_SHADOW_WRITE,
            'postgres_table' => 'dcc_document_body',
            'json_path'      => 'docs/**',
        ]);
        $db->method('execute')->willReturnCallback(
            function (string $sql, array $params = []) use (&$captured): int {
                $captured[] = ['sql' => $sql, 'params' => $params];
                return 1;
            },
        );

        $audit = $this->createMock(AuditChainService::class);
        $audit->expects($this->once())->method('record')->willReturn([
            'chain_id' => 1, 'row_sha256' => str_repeat('a', 64),
        ]);

        $resolver = new DataCollectionModeResolver($db);
        $repo     = new DocumentBodyRepository($db, $resolver, $audit, $this->docsRoot);

        $newHtml = '<html>shadow updated</html>';
        $sha = $repo->saveVersion(
            payload: [
                'doc_code'    => 'pol-qms-001',
                'revision'    => 'V2',
                'status'      => 'draft',
                'locale'      => 'vi',
                'body_html'   => $newHtml,
                'source_path' => 'mom/docs/system/policies/pol-qms-001-quality-policy.html',
                'fs_relpath'  => 'system/policies/pol-qms-001-quality-policy.html',
            ],
            actor: 'tester',
        );

        $this->assertSame(hash('sha256', $newHtml), $sha);
        // DB INSERT recorded:
        $insertSql = array_filter($captured, fn($c) => str_contains($c['sql'], 'INSERT INTO dcc_document_body'));
        $this->assertNotEmpty($insertSql);
        // FS mirror happened:
        $onDisk = (string)file_get_contents($this->docsRoot . '/system/policies/pol-qms-001-quality-policy.html');
        $this->assertSame($newHtml, $onDisk);
    }

    #[Test]
    public function postgresOnlySaveSkipsFilesystem(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => DataCollectionModeResolver::MODE_POSTGRES_ONLY,
            'postgres_table' => 'dcc_document_body',
            'json_path'      => null,
        ]);
        $db->method('execute')->willReturn(1);
        $audit = $this->createMock(AuditChainService::class);
        $audit->expects($this->once())->method('record');

        $resolver = new DataCollectionModeResolver($db);
        $repo     = new DocumentBodyRepository($db, $resolver, $audit, $this->docsRoot);

        $repo->saveVersion(
            payload: [
                'doc_code'    => 'pol-qms-001',
                'revision'    => 'V3',
                'status'      => 'released',
                'locale'      => 'vi',
                'body_html'   => '<html>only-db</html>',
                'source_path' => 'mom/docs/system/policies/pol-qms-001-quality-policy.html',
                'fs_relpath'  => 'system/policies/pol-qms-001-quality-policy.html',
            ],
            actor: 'tester',
        );

        // Filesystem must remain unchanged at v1 — postgres_only skips FS mirror.
        $onDisk = (string)file_get_contents(
            $this->docsRoot . '/system/policies/pol-qms-001-quality-policy.html',
        );
        $this->assertStringContainsString('Policy body v1', $onDisk);
    }

    #[Test]
    public function postgresOnlyWithDbFailureThrows(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => DataCollectionModeResolver::MODE_POSTGRES_ONLY,
            'postgres_table' => 'dcc_document_body',
            'json_path'      => null,
        ]);
        $db->method('execute')->willThrowException(new \RuntimeException('connection lost'));
        $audit = $this->createMock(AuditChainService::class);

        $resolver = new DataCollectionModeResolver($db);
        $repo     = new DocumentBodyRepository($db, $resolver, $audit, $this->docsRoot);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('document_body_db_write_failed');
        $repo->saveVersion(
            payload: [
                'doc_code'  => 'pol-qms-001',
                'revision'  => 'V4',
                'status'    => 'released',
                'locale'    => 'vi',
                'body_html' => '<x/>',
            ],
            actor: 'tester',
        );
    }

    #[Test]
    public function resolveFsPathByCodeFindsUnderscoreVariants(): void
    {
        // Add an underscore-prefixed locale variant.
        file_put_contents(
            $this->docsRoot . '/system/policies/_pol-qms-002-quality-objectives.en.html',
            '<x/>',
        );
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => DataCollectionModeResolver::MODE_JSON_ONLY,
            'postgres_table' => 'dcc_document_body',
            'json_path'      => 'docs/**',
        ]);
        $repo = $this->buildRepo($db);

        $resolved = $repo->resolveFsPathByCode('pol-qms-002');
        $this->assertNotNull($resolved);
        $this->assertStringContainsString('pol-qms-002', $resolved);
    }

    #[Test]
    public function unknownDocumentReturnsNull(): void
    {
        $db = $this->createMock(Connection::class);
        $db->method('queryOne')->willReturn([
            'mode'           => DataCollectionModeResolver::MODE_JSON_ONLY,
            'postgres_table' => 'dcc_document_body',
            'json_path'      => 'docs/**',
        ]);
        $repo = $this->buildRepo($db);
        $this->assertNull($repo->findCurrent('does-not-exist-001'));
    }

    private function buildRepo(Connection $db): DocumentBodyRepository
    {
        $audit    = $this->createMock(AuditChainService::class);
        $audit->method('record')->willReturn([
            'chain_id' => 1, 'row_sha256' => str_repeat('0', 64),
        ]);
        $resolver = new DataCollectionModeResolver($db);
        return new DocumentBodyRepository($db, $resolver, $audit, $this->docsRoot);
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            @unlink($path);
            return;
        }
        foreach (scandir($path) ?: [] as $e) {
            if ($e === '.' || $e === '..') continue;
            $this->removeTree($path . '/' . $e);
        }
        @rmdir($path);
    }
}
