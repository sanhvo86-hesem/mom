<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Persistence boundary for master-data active, history, approval, and archive stores.
 */
interface MasterDataRepository
{
    /**
     * @return array<string, mixed>
     */
    public function loadStore(): array;

    /**
     * @param array<string, mixed> $data
     */
    public function saveStore(array $data): void;

    /**
     * @return array<string, mixed>
     */
    public function loadHistory(): array;

    /**
     * @param array<string, mixed> $data
     */
    public function saveHistory(array $data): void;

    /**
     * @return array<string, mixed>
     */
    public function loadPending(): array;

    /**
     * @param array<string, mixed> $data
     */
    public function savePending(array $data): void;

    /**
     * @return array<string, mixed>
     */
    public function loadArchive(): array;

    /**
     * @param array<string, mixed> $data
     */
    public function saveArchive(array $data): void;

    /**
     * @return array<string, mixed>
     */
    public function loadOrders(): array;

    /**
     * @return array<string, mixed>
     */
    public function loadMesRuntime(): array;
}
