<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Api\Services\RecordConflictException;
use Throwable;

final class ProblemDetailsFactory
{
    /**
     * @return array<string,mixed>
     */
    public function fromThrowable(Throwable $e, string $traceId = ''): array
    {
        if ($e instanceof DomainCommandException) {
            return $this->build(
                $e->httpStatus,
                $e->problemCode,
                $e->getMessage(),
                $e->details,
                $traceId
            );
        }

        if ($e instanceof RecordConflictException) {
            return $this->build(409, 'idempotency_conflict', $e->getMessage(), [], $traceId);
        }

        return $this->build(500, 'domain_command_system_error', 'Domain command execution failed.', [
            'exception_class' => $e::class,
        ], $traceId);
    }

    /**
     * @param array<string,mixed> $details
     * @return array<string,mixed>
     */
    public function build(int $status, string $code, string $detail, array $details = [], string $traceId = ''): array
    {
        $type = 'urn:hesem:problem:domain-command:' . strtolower(str_replace('_', '-', $code));

        return [
            'type' => $type,
            'title' => $this->title($code),
            'status' => $status,
            'detail' => $detail,
            'code' => $code,
            'trace_id' => $traceId,
            'details' => $details,
        ];
    }

    private function title(string $code): string
    {
        return ucwords(str_replace('_', ' ', $code));
    }
}
