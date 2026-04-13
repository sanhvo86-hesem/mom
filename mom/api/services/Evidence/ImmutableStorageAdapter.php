<?php

declare(strict_types=1);

namespace MOM\Services\Evidence;

/**
 * Storage adapter contract for immutable evidence artifacts.
 */
interface ImmutableStorageAdapter
{
    /**
     * Store bytes under content-addressed immutable storage.
     *
     * @return array{storage_adapter: string, storage_uri: string, sha256: string, size_bytes: int}
     */
    public function putBytes(string $logicalName, string $bytes): array;

    /**
     * Store an existing local file under content-addressed immutable storage.
     *
     * @return array{storage_adapter: string, storage_uri: string, sha256: string, size_bytes: int}
     */
    public function putFile(string $logicalName, string $sourcePath): array;
}
