<?php
declare(strict_types=1);

namespace MOM\Api\Services;

interface TrustedReleaseRecordRepository
{
    /**
     * @param array<string, mixed> $packet
     * @return array<string, mixed>
     */
    public function save(array $packet): array;

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $packetId): ?array;

    /**
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    public function list(array $filters = []): array;

    /**
     * @return array<string, mixed>
     */
    public function probe(): array;
}

if (!interface_exists('MOM\\Services\\TrustedReleaseRecordRepository', false)) {
    class_alias(TrustedReleaseRecordRepository::class, 'MOM\\Services\\TrustedReleaseRecordRepository');
}

