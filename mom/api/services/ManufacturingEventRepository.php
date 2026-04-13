<?php
declare(strict_types=1);

namespace MOM\Api\Services;

interface ManufacturingEventRepository
{
    /**
     * @param array<string, mixed> $event Canonical event payload, already validated by the service.
     * @return array{event: array<string, mixed>, replayed: bool}
     */
    public function append(array $event): array;

    /**
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    public function timeline(array $filters = []): array;

    /**
     * @return array<string, mixed>
     */
    public function probe(): array;
}

if (!interface_exists('MOM\\Services\\ManufacturingEventRepository', false)) {
    class_alias(ManufacturingEventRepository::class, 'MOM\\Services\\ManufacturingEventRepository');
}
