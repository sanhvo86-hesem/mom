<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use RuntimeException;

/**
 * Structured API response exception used to unwind the controller stack
 * without calling exit() from deep inside middleware or controllers.
 */
final class ExitException extends RuntimeException
{
    private int $statusCode;

    /** @var array<string, mixed>|null */
    private ?array $payload;

    /** @var array<string, string> */
    private array $headers;

    private ?string $body;

    /**
     * @param array<string, mixed>|null $payload
     * @param array<string, string>      $headers
     */
    public function __construct(int $statusCode = 200, ?array $payload = null, array $headers = [], ?string $body = null)
    {
        parent::__construct('api_response', $statusCode);
        $this->statusCode = max(100, $statusCode);
        $this->payload = $payload;
        $this->headers = $headers;
        $this->body = $body;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, string> $headers
     */
    public static function json(array $payload, int $statusCode = 200, array $headers = []): self
    {
        $headers = array_merge(['Content-Type' => 'application/json; charset=utf-8'], $headers);
        return new self($statusCode, $payload, $headers, null);
    }

    /**
     * @param array<string, string> $headers
     */
    public static function empty(int $statusCode = 204, array $headers = []): self
    {
        return new self($statusCode, null, $headers, '');
    }

    /**
     * @param array<string, string> $headers
     */
    public static function raw(string $body, int $statusCode = 200, array $headers = []): self
    {
        return new self($statusCode, null, $headers, $body);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getPayload(): ?array
    {
        return $this->payload;
    }

    /**
     * @return array<string, string>
     */
    public function getHeaders(): array
    {
        return $this->headers;
    }

    public function getBody(): string
    {
        if ($this->body !== null) {
            return $this->body;
        }

        if ($this->payload === null) {
            return '';
        }

        $encoded = json_encode($this->payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $encoded === false ? '{"ok":false,"error":"response_encode_failed"}' : $encoded;
    }
}
