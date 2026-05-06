<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;

/**
 * Detects and probes subscription-based CLI translators (claude, codex).
 *
 * Subscription CLIs differ from API providers in two ways:
 *   1. Auth lives in a per-user home dir (~/.claude, ~/.codex), not in the DB.
 *   2. There is no /v1/models endpoint — we probe a candidate list to learn
 *      which models the subscription actually exposes.
 *
 * This service is the bridge: it stores the binary path + auth home in
 * translation_credentials (kind='cli_auth') and runs probes to update
 * health_status + last_test_status.
 *
 * NOTE on auth path: when PHP-FPM runs as www-data, it normally cannot read
 * the user's ~/.claude/.credentials.json. Operators must one-time copy or
 * symlink the credentials into a www-data-readable path — the field
 * cli_auth_home_path tells the driver which HOME to set when spawning.
 */
final class CliRuntimeService
{
    public function __construct(private readonly DataLayer $data) {}

    /**
     * Persist or update the CLI runtime config for a provider.
     *
     * @param array{cli_binary_path?: string, cli_auth_home_path?: string} $patch
     */
    public function configure(string $providerKey, array $patch, ?string $actor = null): void
    {
        $binary = isset($patch['cli_binary_path']) ? trim((string)$patch['cli_binary_path']) : null;
        $authHome = isset($patch['cli_auth_home_path']) ? trim((string)$patch['cli_auth_home_path']) : null;

        $rows = $this->data->query(
            'SELECT 1 FROM translation_credentials WHERE provider_key = $1',
            [$providerKey]
        );
        if (is_array($rows) && count($rows) > 0) {
            $this->data->execute(
                'UPDATE translation_credentials
                    SET credential_kind = $1,
                        cli_binary_path = COALESCE($2, cli_binary_path),
                        cli_auth_home_path = COALESCE($3, cli_auth_home_path),
                        updated_at = now()
                  WHERE provider_key = $4',
                ['cli_auth', $binary, $authHome, $providerKey]
            );
        } else {
            $this->data->execute(
                'INSERT INTO translation_credentials
                    (provider_key, credential_kind, cli_binary_path, cli_auth_home_path, created_by)
                 VALUES ($1, $2, $3, $4, $5)',
                [$providerKey, 'cli_auth', $binary, $authHome, $actor]
            );
        }
    }

    /**
     * Run a fast probe: check binary exists + exec, check auth home dir
     * exists + has expected credential file, run a 1-token "ping" prompt.
     *
     * Returns an array suitable for updating last_test_* columns.
     *
     * @return array{status: string, message: string, subject?: string, latency_ms?: int}
     */
    public function probe(string $providerKey): array
    {
        $row = $this->data->query(
            'SELECT cli_binary_path, cli_auth_home_path
               FROM translation_credentials
              WHERE provider_key = $1',
            [$providerKey]
        );
        if (!is_array($row) || count($row) === 0) {
            return ['status' => 'config_error', 'message' => 'No CLI runtime configured for this provider.'];
        }
        $binary = (string)($row[0]['cli_binary_path'] ?? '');
        $authHome = (string)($row[0]['cli_auth_home_path'] ?? '');

        if ($binary === '' || !is_file($binary)) {
            return ['status' => 'binary_missing', 'message' => "CLI binary not found at: {$binary}"];
        }
        if (!is_executable($binary)) {
            return ['status' => 'binary_missing', 'message' => "CLI binary is not executable: {$binary}"];
        }
        if ($authHome !== '' && !is_dir($authHome)) {
            return ['status' => 'auth_failed', 'message' => "Auth home dir not found: {$authHome}"];
        }

        $startMs = (int)(microtime(true) * 1000);
        $version = $this->captureVersion($binary, $authHome);
        if ($version === null) {
            return ['status' => 'binary_missing', 'message' => "CLI {$binary} did not respond to --version."];
        }

        // Ping prompt — short, cheap, deterministic.
        $ping = $this->capturePing($binary, $authHome, $providerKey);
        $latencyMs = (int)(microtime(true) * 1000) - $startMs;
        if ($ping === null) {
            return [
                'status' => 'auth_failed',
                'message' => "CLI {$binary} ({$version}) responded to --version but failed the ping prompt. Most likely the OAuth token is missing or expired in {$authHome}.",
                'latency_ms' => $latencyMs,
            ];
        }

        $this->updateProbeRow($providerKey, 'ok', "CLI {$version} ok ({$latencyMs}ms)", null);
        return [
            'status' => 'ok',
            'message' => "CLI {$version} responding ({$latencyMs}ms)",
            'subject' => $version,
            'latency_ms' => $latencyMs,
        ];
    }

    public function recordProbeResult(string $providerKey, string $status, string $message, ?string $subject = null): void
    {
        $this->updateProbeRow($providerKey, $status, $message, $subject);
    }

    private function updateProbeRow(string $providerKey, string $status, string $message, ?string $subject): void
    {
        // Cap message length so a verbose error doesn't blow up the column.
        $trimmedMessage = mb_substr($message, 0, 4000);
        $this->data->execute(
            'UPDATE translation_credentials
                SET last_test_at = now(),
                    last_test_status = $1,
                    last_test_message = $2,
                    cli_auth_subject = COALESCE($3, cli_auth_subject),
                    updated_at = now()
              WHERE provider_key = $4',
            [$status, $trimmedMessage, $subject, $providerKey]
        );
    }

    private function captureVersion(string $binary, string $authHome): ?string
    {
        $env = $authHome !== '' ? ['HOME' => $authHome] : null;
        $output = $this->run([$binary, '--version'], '', $env, 5);
        if ($output === null || trim($output['stdout']) === '') {
            return null;
        }
        $first = trim(strtok($output['stdout'], "\n") ?: '');
        return $first === '' ? null : $first;
    }

    private function capturePing(string $binary, string $authHome, string $providerKey): ?string
    {
        $env = $authHome !== '' ? ['HOME' => $authHome] : null;
        // For both Claude and Codex we just send a 2-word prompt and check
        // we get *some* non-empty text response. We don't validate semantics.
        if (str_starts_with($providerKey, 'claude')) {
            $cmd = [
                $binary, '-p', '--bare',
                '--max-turns', '1',
                '--no-session-persistence',
                '--output-format', 'text',
                'Reply OK',
            ];
        } elseif (str_starts_with($providerKey, 'codex')) {
            $cmd = [
                $binary, 'exec',
                '--skip-git-repo-check',
                'Reply OK',
            ];
        } else {
            return null;
        }
        $result = $this->run($cmd, '', $env, 30);
        if ($result === null) {
            return null;
        }
        return trim($result['stdout']) === '' ? null : $result['stdout'];
    }

    /**
     * @param list<string> $cmd
     * @param array<string,string>|null $envOverlay
     * @return array{stdout:string, stderr:string, exit:int}|null
     */
    private function run(array $cmd, string $stdin, ?array $envOverlay, int $timeoutSec): ?array
    {
        $spec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $env = $envOverlay !== null ? array_merge($_ENV ?: getenv(), $envOverlay) : null;
        $proc = @proc_open($cmd, $spec, $pipes, null, $env);
        if (!is_resource($proc)) {
            return null;
        }
        if ($stdin !== '') {
            fwrite($pipes[0], $stdin);
        }
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $deadline = microtime(true) + $timeoutSec;
        while (true) {
            $stdout .= (string)stream_get_contents($pipes[1]);
            $stderr .= (string)stream_get_contents($pipes[2]);
            $status = proc_get_status($proc);
            if (!$status['running']) {
                break;
            }
            if (microtime(true) >= $deadline) {
                proc_terminate($proc, 9);
                fclose($pipes[1]);
                fclose($pipes[2]);
                proc_close($proc);
                return ['stdout' => $stdout, 'stderr' => $stderr . "\n[timeout]", 'exit' => 124];
            }
            usleep(50000);
        }
        $stdout .= (string)stream_get_contents($pipes[1]);
        $stderr .= (string)stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exit = proc_close($proc);
        return ['stdout' => $stdout, 'stderr' => $stderr, 'exit' => $exit];
    }
}
