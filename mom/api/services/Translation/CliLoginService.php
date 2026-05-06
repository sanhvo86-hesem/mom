<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;
use RuntimeException;
use Throwable;

/**
 * Drives the interactive `claude setup-token` and `codex login --device-auth`
 * OAuth flows from the admin UI.
 *
 * Flow (admin clicks "Connect" in the Provider tab):
 *
 *   1. POST /credentials/{provider}/login/start
 *      → spawn the CLI process with stdin = a tail -F file we control
 *      → capture stdout for the URL (and codex device-code) the user must visit
 *      → return URL + session_id to the UI; UI shows it inside a modal
 *
 *   2. (Claude only) POST /credentials/{provider}/login/complete
 *      → admin pastes the long-lived token from the OAuth confirmation page
 *      → service appends "<token>\n" to the stdin file, the CLI consumes it,
 *        writes ~/.claude/.credentials.json and exits
 *      → service reads credentials, extracts subject email + subscription tier
 *
 *   2'. (Codex device-auth) POST /credentials/{provider}/login/poll
 *       → CLI auto-detects approval via background HTTP poll; we just wait
 *         for process exit and read ~/.codex/auth.json
 *
 *   3. POST /credentials/{provider}/logout → spawn `claude logout` or
 *      `codex logout`, wipe creds.
 *
 * Session state lives in /tmp/dcc-cli-login/<session_id>/ — three files:
 *   - pid       process pid
 *   - stdin     fifo (or regular file with tail -F) for paste-back
 *   - stdout    captured CLI output so far
 *   - meta.json provider, started_at, expected_kind ('paste'|'device')
 *
 * After completion (success OR failure), the session dir is wiped.
 */
final class CliLoginService
{
    private const SESSION_ROOT = '/tmp/dcc-cli-login';

    public function __construct(
        private readonly DataLayer $data,
    ) {}

    /**
     * Spawn the CLI login flow. Returns details the UI shows in a modal.
     *
     * @return array<string, mixed>
     */
    public function start(string $providerKey): array
    {
        $row = $this->data->query(
            'SELECT cli_binary_path, cli_auth_home_path FROM translation_credentials WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        if (!is_array($row) || count($row) === 0) {
            throw new RuntimeException('Provider runtime not configured. Set binary_path + auth_home first.');
        }
        $binary = (string)($row[0]['cli_binary_path'] ?? '');
        $authHome = (string)($row[0]['cli_auth_home_path'] ?? '');
        if ($binary === '' || !is_file($binary)) {
            throw new RuntimeException("CLI binary not found at {$binary}");
        }
        if ($authHome === '') {
            throw new RuntimeException('cli_auth_home_path is empty.');
        }
        if (!is_dir($authHome)) {
            @mkdir($authHome, 0700, true);
        }

        // Provider-specific spawn details.
        if (str_starts_with($providerKey, 'claude')) {
            return $this->startClaude($providerKey, $binary, $authHome);
        }
        if (str_starts_with($providerKey, 'codex')) {
            return $this->startCodex($providerKey, $binary, $authHome);
        }
        throw new RuntimeException("Provider {$providerKey} does not support interactive login.");
    }

    /**
     * Admin pasted the token (Claude) — feed it to the waiting process.
     *
     * @return array<string, mixed>
     */
    public function completeWithCode(string $providerKey, string $sessionId, string $code): array
    {
        $code = trim($code);
        if ($code === '') {
            throw new RuntimeException('Code/token is empty.');
        }
        $sessionDir = $this->sessionDir($sessionId);
        $stdin = $sessionDir . '/stdin';
        if (!is_file($stdin)) {
            throw new RuntimeException('Login session not found or already finished. Click Connect again.');
        }
        // Append token + newline so the CLI's input prompt completes.
        if (file_put_contents($stdin, $code . "\n", FILE_APPEND | LOCK_EX) === false) {
            throw new RuntimeException('Could not write code to session stdin.');
        }
        return $this->waitForCompletion($providerKey, $sessionId);
    }

    /**
     * Codex device-auth: process auto-detects approval. We just poll
     * until the process exits or the deadline is reached.
     *
     * @return array<string, mixed>
     */
    public function pollDeviceAuth(string $providerKey, string $sessionId): array
    {
        return $this->waitForCompletion($providerKey, $sessionId);
    }

    /**
     * Spawn `claude logout` / `codex logout` and wipe credentials.
     *
     * @return array<string, mixed>
     */
    public function logout(string $providerKey): array
    {
        $row = $this->data->query(
            'SELECT cli_binary_path, cli_auth_home_path FROM translation_credentials WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        if (!is_array($row) || count($row) === 0) {
            return ['ok' => true, 'message' => 'Nothing to log out.'];
        }
        $binary = (string)($row[0]['cli_binary_path'] ?? '');
        $authHome = (string)($row[0]['cli_auth_home_path'] ?? '');
        $env = ['HOME' => $authHome];
        if (str_starts_with($providerKey, 'claude')) {
            // claude logout is interactive; just wipe the creds file.
            @unlink(rtrim($authHome, '/') . '/.claude/.credentials.json');
        } elseif (str_starts_with($providerKey, 'codex')) {
            $this->runCommand([$binary, 'logout'], '', $env, 30);
            @unlink(rtrim($authHome, '/') . '/.codex/auth.json');
        }
        // Clear cached subject in DB
        $this->data->execute(
            'UPDATE translation_credentials SET cli_auth_subject = NULL, last_test_status = NULL,
                last_test_message = NULL, available_models = NULL, models_fetched_at = NULL,
                updated_at = now() WHERE provider_key = :p1',
            [':p1' => $providerKey]
        );
        return ['ok' => true, 'provider_key' => $providerKey];
    }

    // ── Internal: provider-specific spawn ────────────────────────────────────

    /**
     * @return array<string,mixed>
     */
    private function startClaude(string $providerKey, string $binary, string $authHome): array
    {
        $sessionId = $this->newSessionId();
        $sessionDir = $this->sessionDir($sessionId);
        if (!@mkdir($sessionDir, 0700, true) && !is_dir($sessionDir)) {
            throw new RuntimeException("Could not create session dir {$sessionDir}");
        }
        $stdin = $sessionDir . '/stdin';
        $stdout = $sessionDir . '/stdout';
        touch($stdin);

        // Spawn: tail -F stdin | claude setup-token > stdout 2>&1 &
        // tail -F keeps the input open even when the file is empty, so the CLI
        // doesn't see EOF prematurely.
        $cmd = sprintf(
            'cd %s && HOME=%s nohup bash -c %s > /dev/null 2>&1 & echo $!',
            escapeshellarg($authHome),
            escapeshellarg($authHome),
            escapeshellarg(sprintf(
                'tail -n +1 -F %s | %s setup-token > %s 2>&1',
                escapeshellarg($stdin),
                escapeshellarg($binary),
                escapeshellarg($stdout)
            ))
        );
        $pid = trim((string)shell_exec($cmd));
        if (!ctype_digit($pid)) {
            $this->cleanupSession($sessionId);
            throw new RuntimeException('Could not spawn claude setup-token.');
        }
        // The pipeline pid we capture is bash's; the actual claude process is
        // its child. For wait/cleanup purposes we track the pipeline group.
        file_put_contents($sessionDir . '/pid', $pid);
        $this->writeMeta($sessionId, [
            'provider_key' => $providerKey,
            'kind' => 'paste',
            'started_at' => time(),
            'authHome' => $authHome,
            'pid' => (int)$pid,
        ]);

        // Wait up to 12s for the URL to appear in stdout.
        $url = '';
        $deadline = microtime(true) + 12;
        while (microtime(true) < $deadline) {
            $out = (string)@file_get_contents($stdout);
            if (preg_match('~https?://[^\s\x1b]+~', $out, $m)) {
                $url = trim($m[0], "\"'.,;:");
                break;
            }
            usleep(300_000);
        }
        if ($url === '') {
            $this->cleanupSession($sessionId);
            throw new RuntimeException('Did not receive auth URL from claude setup-token within 12s.');
        }

        return [
            'session_id' => $sessionId,
            'provider_key' => $providerKey,
            'flow' => 'paste',
            'auth_url' => $url,
            'expects_paste' => true,
            'instructions_vi' => "1. Mở URL ở trên trong tab mới\n2. Đăng nhập tài khoản Claude (Max subscription)\n3. Nhấn Approve\n4. Copy token hiện ra\n5. Paste vào ô bên dưới và bấm Hoàn tất",
            'instructions_en' => "1. Open the URL above in a new tab\n2. Sign in to your Claude account (Max subscription)\n3. Click Approve\n4. Copy the token shown\n5. Paste it below and click Complete",
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function startCodex(string $providerKey, string $binary, string $authHome): array
    {
        $sessionId = $this->newSessionId();
        $sessionDir = $this->sessionDir($sessionId);
        if (!@mkdir($sessionDir, 0700, true) && !is_dir($sessionDir)) {
            throw new RuntimeException("Could not create session dir {$sessionDir}");
        }
        $stdout = $sessionDir . '/stdout';
        // codex device-auth doesn't need stdin, but we still touch one so
        // cleanupSession is symmetric with claude.
        touch($sessionDir . '/stdin');

        $cmd = sprintf(
            'cd %s && HOME=%s nohup bash -c %s > /dev/null 2>&1 & echo $!',
            escapeshellarg($authHome),
            escapeshellarg($authHome),
            escapeshellarg(sprintf(
                '%s login --device-auth > %s 2>&1',
                escapeshellarg($binary),
                escapeshellarg($stdout)
            ))
        );
        $pid = trim((string)shell_exec($cmd));
        if (!ctype_digit($pid)) {
            $this->cleanupSession($sessionId);
            throw new RuntimeException('Could not spawn codex login --device-auth.');
        }
        file_put_contents($sessionDir . '/pid', $pid);
        $this->writeMeta($sessionId, [
            'provider_key' => $providerKey,
            'kind' => 'device',
            'started_at' => time(),
            'authHome' => $authHome,
            'pid' => (int)$pid,
        ]);

        // Wait up to 15s for "Visit URL X with code Y" line.
        $url = '';
        $code = '';
        $deadline = microtime(true) + 15;
        while (microtime(true) < $deadline) {
            $out = (string)@file_get_contents($stdout);
            if ($url === '' && preg_match('~https?://[^\s\x1b]+~', $out, $m)) {
                $url = trim($m[0], "\"'.,;:");
            }
            if ($code === '' && preg_match('~code:?\s*([A-Z0-9-]{4,})~i', $out, $m)) {
                $code = trim($m[1]);
            }
            if ($url !== '' && $code !== '') break;
            usleep(300_000);
        }
        if ($url === '') {
            $this->cleanupSession($sessionId);
            throw new RuntimeException('Did not receive auth URL from codex login.');
        }

        return [
            'session_id' => $sessionId,
            'provider_key' => $providerKey,
            'flow' => 'device',
            'auth_url' => $url,
            'pairing_code' => $code,
            'expects_paste' => false,
            'instructions_vi' => "1. Mở URL ở trên\n2. Nhập mã: " . $code . "\n3. Đăng nhập tài khoản ChatGPT Pro\n4. Nhấn Approve\n5. Bấm \"Đợi xác nhận\" ở dưới (process tự kết thúc khi xác nhận thành công)",
            'instructions_en' => "1. Open the URL above\n2. Enter the code: " . $code . "\n3. Sign in to your ChatGPT account (Pro subscription)\n4. Click Approve\n5. Click \"Wait for completion\" below (process auto-finishes once approved)",
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function waitForCompletion(string $providerKey, string $sessionId): array
    {
        $meta = $this->readMeta($sessionId);
        if ($meta === null) {
            throw new RuntimeException('Login session not found.');
        }
        $authHome = (string)$meta['authHome'];

        // Poll for process exit (up to ~25s per HTTP request — UI can re-poll).
        $sessionDir = $this->sessionDir($sessionId);
        $pidFile = $sessionDir . '/pid';
        $stdoutFile = $sessionDir . '/stdout';
        $deadline = microtime(true) + 25;
        $alive = true;
        while (microtime(true) < $deadline) {
            $alive = $this->isAlive($sessionId);
            if (!$alive) break;
            usleep(500_000);
        }

        if ($alive) {
            // Still waiting (codex device-auth pre-approval, or claude waiting
            // for paste). UI should re-poll.
            return [
                'ok' => false,
                'state' => 'pending',
                'session_id' => $sessionId,
                'tail' => mb_substr((string)@file_get_contents($stdoutFile), -2000),
            ];
        }

        // Process exited. Determine outcome by reading the credentials file.
        $info = $this->readCredentialMeta($providerKey, $authHome);
        $stdoutContent = (string)@file_get_contents($stdoutFile);
        $this->cleanupSession($sessionId);

        if ($info === null) {
            return [
                'ok' => false,
                'state' => 'failed',
                'session_id' => $sessionId,
                'message' => 'Login process exited but no valid credentials were written.',
                'tail' => mb_substr($stdoutContent, -2000),
            ];
        }

        // Persist subject + reset test state so admin sees fresh "Probe me" button.
        $this->data->execute(
            'UPDATE translation_credentials
                SET cli_auth_subject = :p1,
                    last_test_at = NULL,
                    last_test_status = NULL,
                    last_test_message = NULL,
                    updated_at = now()
              WHERE provider_key = :p2',
            [':p1' => $info['subject'] ?? null, ':p2' => $providerKey]
        );

        return [
            'ok' => true,
            'state' => 'completed',
            'session_id' => $sessionId,
            'account' => $info,
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function readCredentialMeta(string $providerKey, string $authHome): ?array
    {
        if (str_starts_with($providerKey, 'claude')) {
            $path = rtrim($authHome, '/') . '/.claude/.credentials.json';
            if (!is_file($path)) return null;
            $j = json_decode((string)@file_get_contents($path), true);
            if (!is_array($j)) return null;
            $oauth = $j['claudeAiOauth'] ?? [];
            return [
                'subject' => $oauth['subject'] ?? $oauth['accountEmail'] ?? null,
                'subscription' => $oauth['subscriptionType'] ?? null,
                'expires_at' => isset($oauth['expiresAt']) ? (int)($oauth['expiresAt'] / 1000) : null,
                'scopes' => $oauth['scopes'] ?? [],
            ];
        }
        if (str_starts_with($providerKey, 'codex')) {
            $path = rtrim($authHome, '/') . '/.codex/auth.json';
            if (!is_file($path)) return null;
            $j = json_decode((string)@file_get_contents($path), true);
            if (!is_array($j)) return null;
            return [
                'subject' => $j['email'] ?? $j['account_id'] ?? $j['user_id'] ?? null,
                'subscription' => $j['plan_type'] ?? $j['plan'] ?? 'unknown',
                'mode' => $j['auth_mode'] ?? null,
            ];
        }
        return null;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function newSessionId(): string
    {
        return bin2hex(random_bytes(8));
    }

    private function sessionDir(string $sessionId): string
    {
        if (!preg_match('/^[a-f0-9]{4,40}$/', $sessionId)) {
            throw new RuntimeException('Invalid session id.');
        }
        return self::SESSION_ROOT . '/' . $sessionId;
    }

    /**
     * @param array<string,mixed> $meta
     */
    private function writeMeta(string $sessionId, array $meta): void
    {
        $path = $this->sessionDir($sessionId) . '/meta.json';
        @file_put_contents($path, json_encode($meta));
    }

    /**
     * @return array<string,mixed>|null
     */
    private function readMeta(string $sessionId): ?array
    {
        $path = $this->sessionDir($sessionId) . '/meta.json';
        if (!is_file($path)) return null;
        $j = json_decode((string)@file_get_contents($path), true);
        return is_array($j) ? $j : null;
    }

    private function isAlive(string $sessionId): bool
    {
        $pidFile = $this->sessionDir($sessionId) . '/pid';
        $pid = trim((string)@file_get_contents($pidFile));
        if (!ctype_digit($pid)) return false;
        // bash launcher exits quickly, but the actual claude/codex sub-process
        // is its child group. Look for any descendant of the same pgid.
        $pgid = trim((string)shell_exec('ps -o pgid= -p ' . (int)$pid . ' 2>/dev/null'));
        if (!ctype_digit(trim($pgid))) {
            // Process group already gone.
            return false;
        }
        $alive = trim((string)shell_exec('pgrep -g ' . (int)trim($pgid) . ' 2>/dev/null | head -1'));
        return $alive !== '';
    }

    private function cleanupSession(string $sessionId): void
    {
        $dir = $this->sessionDir($sessionId);
        if (!is_dir($dir)) return;
        $pid = trim((string)@file_get_contents($dir . '/pid'));
        if (ctype_digit($pid)) {
            // Kill the whole process group to make sure tail+claude both die.
            @shell_exec('kill -TERM -' . (int)$pid . ' 2>/dev/null; pkill -P ' . (int)$pid . ' 2>/dev/null');
        }
        @array_map('unlink', glob($dir . '/*') ?: []);
        @rmdir($dir);
    }

    /**
     * @param list<string> $cmd
     * @param array<string,string>|null $envOverlay
     * @return array{stdout:string,stderr:string,exit:int}|null
     */
    private function runCommand(array $cmd, string $stdin, ?array $envOverlay, int $timeoutSec): ?array
    {
        $spec = [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']];
        $env = $envOverlay !== null ? array_merge($_ENV ?: getenv() ?: [], $envOverlay) : null;
        $proc = @proc_open($cmd, $spec, $pipes, null, $env);
        if (!is_resource($proc)) return null;
        if ($stdin !== '') fwrite($pipes[0], $stdin);
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $so = ''; $se = '';
        $deadline = microtime(true) + $timeoutSec;
        while (true) {
            $so .= (string)stream_get_contents($pipes[1]);
            $se .= (string)stream_get_contents($pipes[2]);
            $st = proc_get_status($proc);
            if (!$st['running']) break;
            if (microtime(true) >= $deadline) {
                proc_terminate($proc, 9);
                fclose($pipes[1]); fclose($pipes[2]);
                proc_close($proc);
                return ['stdout'=>$so,'stderr'=>$se."\n[timeout]",'exit'=>124];
            }
            usleep(80000);
        }
        $so .= (string)stream_get_contents($pipes[1]);
        $se .= (string)stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        $exit = proc_close($proc);
        return ['stdout'=>$so,'stderr'=>$se,'exit'=>$exit];
    }
}
