<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\Publication\SharePointPublicationAdapter;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class SharePointPublicationAdapterTest extends TestCase
{
    public function testConstructorRejectsStringDirectUserUploadFlag(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('direct user upload');

        new SharePointPublicationAdapter(['direct_user_upload_allowed' => 'true']);
    }

    public function testPublicationRequestRequiresValidPackageHashes(): void
    {
        $adapter = new SharePointPublicationAdapter([]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('valid evidence package and manifest hashes');

        $adapter->buildPublicationRequest([
            'manifest_hash_sha256' => '',
            'package_hash_sha256' => '',
            'artifacts' => [
                'readable_snapshot' => ['storage_uri' => 'immutable://snapshot'],
            ],
        ]);
    }

    public function testPublicationRequestRejectsManifestThatTreatsTargetAsInputChannel(): void
    {
        $adapter = new SharePointPublicationAdapter([]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('read-only replica');

        $adapter->buildPublicationRequest([
            'manifest_hash_sha256' => str_repeat('a', 64),
            'package_hash_sha256' => str_repeat('b', 64),
            'artifacts' => [
                'readable_snapshot' => ['storage_uri' => 'immutable://snapshot'],
            ],
            'manifest' => [
                'publication_state' => [
                    'authority_role' => 'source_of_truth',
                    'direct_user_upload' => true,
                ],
            ],
        ]);
    }

    public function testPublicationRequestIsReadOnlyReplicaWithHashes(): void
    {
        $adapter = new SharePointPublicationAdapter([
            'site_id' => 'site',
            'drive_id' => 'drive',
            'folder_path' => '/controlled',
        ]);

        $request = $adapter->buildPublicationRequest([
            'manifest_hash_sha256' => str_repeat('a', 64),
            'package_hash_sha256' => str_repeat('b', 64),
            'artifacts' => [
                'readable_snapshot' => ['storage_uri' => 'immutable://snapshot'],
            ],
            'manifest' => ['manifest_version' => 1],
        ]);

        $this->assertSame('sharepoint_graph', $request['target_type']);
        $this->assertSame('read_only_replica', $request['authority_role']);
        $this->assertTrue($request['sharepoint']['read_only']);
        $this->assertSame(str_repeat('a', 64), $request['source_manifest_hash_sha256']);
        $this->assertSame(str_repeat('b', 64), $request['source_package_hash_sha256']);
    }
}
