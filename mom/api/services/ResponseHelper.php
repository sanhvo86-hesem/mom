<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * ResponseHelper - Extracted from legacy api.php.
 *
 * Encapsulates HTTP response helpers:
 *   api_json()          -> ResponseHelper::json()
 *   api_stream_event()  -> ResponseHelper::streamEvent()
 *
 * Note: The global api_json() function is still used extensively throughout
 * the legacy codebase. This class provides a namespaced alternative for
 * new code. The global function delegates to this class when available.
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class ResponseHelper
{
    /**
     * Send a JSON response with security headers and exit.
     * Equivalent to legacy: api_json($payload, $code)
     */
    public static function json(array $payload, int $code = 200): void
    {
        // Ensure session data is written before responding
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        if (defined('API_THROW_RESPONSES') && API_THROW_RESPONSES) {
            throw \MOM\Api\Controllers\ExitException::json($payload, $code, [
                'Cache-Control'       => 'no-store, no-cache, must-revalidate, max-age=0',
                'X-Content-Type-Options' => 'nosniff',
                'X-Frame-Options'     => 'SAMEORIGIN',
                'Referrer-Policy'     => 'same-origin',
            ]);
        }

        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: same-origin');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Send a Server-Sent Event.
     * Equivalent to legacy: api_stream_event($event, $payload)
     */
    public static function streamEvent(string $event, array $payload): void
    {
        echo 'event: ' . $event . "\n";
        echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
        @ob_flush();
        @flush();
    }
}
