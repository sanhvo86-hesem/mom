<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

final class GenericCrudMutationDeniedException extends RuntimeException
{
    /**
     * @param array<string, mixed> $decision
     * @param array<string, mixed> $problemDetails
     */
    public function __construct(
        private readonly array $decision,
        private readonly array $problemDetails
    ) {
        parent::__construct((string)($problemDetails['detail'] ?? 'Generic CRUD mutation denied for governed record.'));
    }

    /**
     * @return array<string, mixed>
     */
    public function decision(): array
    {
        return $this->decision;
    }

    /**
     * @return array<string, mixed>
     */
    public function problemDetails(): array
    {
        return $this->problemDetails;
    }
}
