<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\Evidence\EvidencePackageBuilder;
use MOM\Services\Evidence\LocalImmutableStorageAdapter;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class EvidencePackageBuilderTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_evidence_package_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testBuildCreatesRequiredArtifactRolesAndManifestHashes(): void
    {
        $builder = new EvidencePackageBuilder(new LocalImmutableStorageAdapter($this->tmpDir));

        $package = $builder->build([
            'subject_type' => 'form_record',
            'subject_id' => 'FRM-001',
            'actor_id' => 'tester',
            'original_bytes' => 'raw workbook bytes',
            'canonical_payload' => ['b' => 2, 'a' => 1],
        ]);

        $this->assertArrayHasKey('original', $package['artifacts']);
        $this->assertArrayHasKey('canonical_payload', $package['artifacts']);
        $this->assertArrayHasKey('readable_snapshot', $package['artifacts']);
        $this->assertArrayHasKey('manifest', $package['artifacts']);
        $this->assertArrayHasKey('hash_signature_manifest', $package['artifacts']);
        $this->assertSame($package['artifacts']['manifest'], $package['artifacts']['hash_signature_manifest']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $package['package_hash_sha256']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $package['manifest_hash_sha256']);
        $this->assertSame($package['snapshot_hash_sha256'], $package['readable_snapshot_hash_sha256']);
        $this->assertSame('pending', $package['manifest']['publication_state']['state']);
        $this->assertSame('read_only_replica', $package['manifest']['publication_state']['authority_role']);
        $this->assertSame([], $package['manifest']['signature_events']);
    }

    public function testBuildRejectsPublicationStateThatTreatsSharePointAsSourceOfTruth(): void
    {
        $builder = new EvidencePackageBuilder(new LocalImmutableStorageAdapter($this->tmpDir));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('read-only replica');

        $builder->build([
            'subject_type' => 'form_record',
            'subject_id' => 'FRM-002',
            'original_bytes' => 'raw workbook bytes',
            'canonical_payload' => ['a' => 1],
            'publication_state' => [
                'state' => 'pending',
                'authority_role' => 'source_of_truth',
            ],
        ]);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
