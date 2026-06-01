<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

final class RuntimeRequirementGateException extends RuntimeException
{
    /**
     * @param array<string,mixed> $gateContext
     */
    public function __construct(
        private readonly string $reasonCode,
        private readonly array $gateContext,
        string $message = 'Runtime requirement gate blocked the command.',
    ) {
        parent::__construct($message, 409);
    }

    public function reasonCode(): string
    {
        return $this->reasonCode;
    }

    /**
     * @return array<string,mixed>
     */
    public function gateContext(): array
    {
        return $this->gateContext;
    }
}
