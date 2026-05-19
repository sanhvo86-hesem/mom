<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

/**
 * Local workstation controls for the runtime-config pull-down path.
 *
 * This service is deliberately local-only. A production VPS cannot command a
 * developer laptop, and it must not pretend that a server-side button pulled
 * data into the workstation.
 */
final class LocalRuntimeSyncService
{
    private const APPLY_ALLOWLIST = [
        'decision_thresholds.json',
    ];

    private string $rootDir;
    private string $dataDir;

    public function __construct(string $rootDir, string $dataDir)
    {
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
    }

    /**
     * @return array<string,mixed>
     */
    public function status(string $target = 'eqms'): array
    {
        $target = $this->sanitizeTarget($target);
        $gate = $this->executionGate();
        $workingDir = $this->workingDir($target);
        $scriptPath = $this->localSyncScriptPath();
        $launchAgentPath = $this->launchAgentPath();

        return [
            'execution_allowed'        => $gate['allowed'],
            'execution_blocked_reason' => $gate['reason'],
            'target'                   => $target,
            'repo_path'                => $this->rootDir,
            'script_path'              => $scriptPath,
            'script_present'           => is_file($scriptPath),
            'working_dir'              => $workingDir,
            'apply_allowlist'          => self::APPLY_ALLOWLIST,
            'decision_thresholds'      => $this->filePairStatus($target, 'decision_thresholds.json'),
            'launch_agent'             => [
                'path'      => $launchAgentPath,
                'installed' => is_file($launchAgentPath),
                'loaded'    => $gate['allowed'] ? $this->launchAgentLoaded() : false,
                'interval_minutes' => $this->launchAgentIntervalMinutes($launchAgentPath),
            ],
            'commands'                 => [
                'run_pull' => 'TARGET=' . $target . ' APPLY_DECISION_THRESHOLDS=1 bash tools/vps-setup/scripts/local-sync-down.sh',
                'install_launch_agent' => 'Use the Local sync tab on a local portal, or install a macOS LaunchAgent that runs tools/vps-setup/scripts/local-sync-down.sh.',
            ],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function runPull(string $target = 'eqms', bool $applyDecisionThresholds = false): array
    {
        $this->assertExecutionAllowed();
        $target = $this->sanitizeTarget($target);
        $scriptPath = $this->localSyncScriptPath();
        if (!is_file($scriptPath)) {
            throw new RuntimeException('local_sync_script_missing: ' . $scriptPath);
        }

        $result = $this->runProcess([
            '/usr/bin/env',
            'TARGET=' . $target,
            'APPLY_DECISION_THRESHOLDS=' . ($applyDecisionThresholds ? '1' : '0'),
            'bash',
            $scriptPath,
        ], 180);

        return [
            'target' => $target,
            'apply_decision_thresholds' => $applyDecisionThresholds,
            'exit_code' => $result['exit_code'],
            'stdout' => $this->tailText($result['stdout']),
            'stderr' => $this->tailText($result['stderr']),
            'decision_thresholds' => $this->filePairStatus($target, 'decision_thresholds.json'),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function configureSchedule(int $intervalMinutes, bool $enabled, string $target = 'eqms', bool $applyDecisionThresholds = true): array
    {
        $this->assertExecutionAllowed();
        if (PHP_OS_FAMILY !== 'Darwin') {
            throw new RuntimeException('launch_agent_supported_only_on_macos');
        }

        $target = $this->sanitizeTarget($target);
        $intervalMinutes = max(1, min(1440, $intervalMinutes));
        $path = $this->launchAgentPath();
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('launch_agent_dir_create_failed: ' . $dir);
        }

        $bootout = $this->launchctl(['bootout', 'gui/' . $this->uid(), $path], 15);
        if (!$enabled) {
            if (is_file($path)) {
                @unlink($path);
            }
            return [
                'enabled' => false,
                'interval_minutes' => $intervalMinutes,
                'path' => $path,
                'bootout_exit_code' => $bootout['exit_code'],
            ];
        }

        $plist = $this->buildLaunchAgentPlist($intervalMinutes, $target, $applyDecisionThresholds);
        $tmp = $path . '.tmp.' . substr(bin2hex(random_bytes(3)), 0, 6);
        if (file_put_contents($tmp, $plist) === false || !rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('launch_agent_write_failed: ' . $path);
        }
        @chmod($path, 0644);

        $bootstrap = $this->launchctl(['bootstrap', 'gui/' . $this->uid(), $path], 30);
        $kickstart = $this->launchctl(['kickstart', '-k', 'gui/' . $this->uid() . '/com.hesem.mom-sync'], 30);

        return [
            'enabled' => true,
            'interval_minutes' => $intervalMinutes,
            'target' => $target,
            'apply_decision_thresholds' => $applyDecisionThresholds,
            'path' => $path,
            'bootout_exit_code' => $bootout['exit_code'],
            'bootstrap_exit_code' => $bootstrap['exit_code'],
            'kickstart_exit_code' => $kickstart['exit_code'],
            'bootstrap_stderr' => $this->tailText($bootstrap['stderr']),
            'kickstart_stderr' => $this->tailText($kickstart['stderr']),
        ];
    }

    /**
     * @return array{allowed:bool,reason:string}
     */
    private function executionGate(): array
    {
        $env = strtolower((string)(getenv('MOM_ENABLE_LOCAL_SYNC_EXEC') ?: ''));
        if (in_array($env, ['1', 'true', 'yes'], true)) {
            return ['allowed' => true, 'reason' => 'enabled_by_env'];
        }

        $isDarwin = PHP_OS_FAMILY === 'Darwin';
        $underUsers = str_starts_with($this->rootDir, '/Users/');
        if ($isDarwin && $underUsers) {
            return ['allowed' => true, 'reason' => 'local_macos_checkout'];
        }

        return ['allowed' => false, 'reason' => 'local_sync_execution_only_available_on_local_macos_checkout'];
    }

    private function assertExecutionAllowed(): void
    {
        $gate = $this->executionGate();
        if (!$gate['allowed']) {
            throw new RuntimeException($gate['reason']);
        }
    }

    private function sanitizeTarget(string $target): string
    {
        $target = trim($target);
        if ($target === '') {
            $target = 'eqms';
        }
        if (!preg_match('/\A[A-Za-z0-9_.@:-]{1,96}\z/', $target)) {
            throw new RuntimeException('invalid_sync_target');
        }
        return $target;
    }

    private function localSyncScriptPath(): string
    {
        return $this->rootDir . '/tools/vps-setup/scripts/local-sync-down.sh';
    }

    private function workingDir(string $target): string
    {
        $override = trim((string)(getenv('WORKING_DIR') ?: ''));
        if ($override !== '') {
            return rtrim(str_replace('\\', '/', $override), '/');
        }
        return $this->homeDir() . '/mom-vps-data/' . $this->hostSlug($target) . '/working';
    }

    private function hostSlug(string $target): string
    {
        return preg_replace('/[^a-zA-Z0-9]/', '_', $target) ?: 'eqms';
    }

    private function launchAgentPath(): string
    {
        return $this->homeDir() . '/Library/LaunchAgents/com.hesem.mom-sync.plist';
    }

    private function homeDir(): string
    {
        $home = trim((string)(getenv('HOME') ?: ''));
        if ($home !== '') {
            return rtrim(str_replace('\\', '/', $home), '/');
        }
        if (function_exists('posix_getpwuid') && function_exists('posix_getuid')) {
            $pw = posix_getpwuid(posix_getuid());
            if (is_array($pw) && is_string($pw['dir']) && $pw['dir'] !== '') {
                return rtrim(str_replace('\\', '/', $pw['dir']), '/');
            }
        }
        throw new RuntimeException('home_dir_unavailable');
    }

    /**
     * @return array<string,mixed>
     */
    private function filePairStatus(string $target, string $file): array
    {
        if (!in_array($file, self::APPLY_ALLOWLIST, true)) {
            throw new RuntimeException('local_apply_file_not_allowlisted');
        }
        $pulled = $this->workingDir($target) . '/files/config/' . $file;
        $app = $this->dataDir . '/config/' . $file;

        $pulledHash = $this->sha256($pulled);
        $appHash = $this->sha256($app);

        return [
            'file' => $file,
            'pulled_path' => $pulled,
            'app_path' => $app,
            'pulled_present' => is_file($pulled),
            'app_present' => is_file($app),
            'pulled_sha256_short' => $pulledHash !== null ? substr($pulledHash, 0, 12) : '',
            'app_sha256_short' => $appHash !== null ? substr($appHash, 0, 12) : '',
            'in_sync' => $pulledHash !== null && $appHash !== null && hash_equals($pulledHash, $appHash),
        ];
    }

    private function sha256(string $path): ?string
    {
        if (!is_file($path)) {
            return null;
        }
        $hash = @hash_file('sha256', $path);
        return is_string($hash) && $hash !== '' ? $hash : null;
    }

    /**
     * @param list<string> $command
     * @return array{exit_code:int,stdout:string,stderr:string}
     */
    private function runProcess(array $command, int $timeoutSeconds): array
    {
        $spec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proc = @proc_open($command, $spec, $pipes, $this->rootDir);
        if (!is_resource($proc)) {
            throw new RuntimeException('proc_open_failed');
        }
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $deadline = time() + max(1, $timeoutSeconds);
        $exitCode = 1;
        while (true) {
            $stdout .= (string)stream_get_contents($pipes[1]);
            $stderr .= (string)stream_get_contents($pipes[2]);
            $status = proc_get_status($proc);
            if (!$status['running']) {
                $exitCode = (int)$status['exitcode'];
                break;
            }
            if (time() >= $deadline) {
                proc_terminate($proc);
                $exitCode = 124;
                $stderr .= "\nlocal_sync_timeout\n";
                break;
            }
            usleep(100000);
        }

        $stdout .= (string)stream_get_contents($pipes[1]);
        $stderr .= (string)stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $closeCode = proc_close($proc);
        if ($exitCode === 0 && is_int($closeCode) && $closeCode !== -1) {
            $exitCode = $closeCode;
        }

        return ['exit_code' => $exitCode, 'stdout' => $stdout, 'stderr' => $stderr];
    }

    /**
     * @param list<string> $args
     * @return array{exit_code:int,stdout:string,stderr:string}
     */
    private function launchctl(array $args, int $timeoutSeconds): array
    {
        $binary = '/bin/launchctl';
        if (!is_file($binary)) {
            return ['exit_code' => 127, 'stdout' => '', 'stderr' => 'launchctl_not_found'];
        }
        return $this->runProcess(array_merge([$binary], $args), $timeoutSeconds);
    }

    private function launchAgentLoaded(): bool
    {
        $result = $this->launchctl(['print', 'gui/' . $this->uid() . '/com.hesem.mom-sync'], 10);
        return $result['exit_code'] === 0;
    }

    private function launchAgentIntervalMinutes(string $path): ?int
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = (string)(@file_get_contents($path) ?: '');
        if (preg_match('/<key>StartInterval<\/key>\s*<integer>(\d+)<\/integer>/', $raw, $m)) {
            return max(1, (int)floor(((int)$m[1]) / 60));
        }
        return null;
    }

    private function uid(): string
    {
        if (function_exists('posix_getuid')) {
            return (string)posix_getuid();
        }
        return trim((string)shell_exec('id -u 2>/dev/null')) ?: '501';
    }

    private function buildLaunchAgentPlist(int $intervalMinutes, string $target, bool $applyDecisionThresholds): string
    {
        $seconds = $intervalMinutes * 60;
        $script = $this->xmlEscape($this->localSyncScriptPath());
        $repo = $this->xmlEscape($this->rootDir);
        $targetXml = $this->xmlEscape($target);
        $apply = $applyDecisionThresholds ? '1' : '0';

        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.hesem.mom-sync</string>
  <key>StartInterval</key><integer>{$seconds}</integer>
  <key>WorkingDirectory</key><string>{$repo}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>TARGET</key><string>{$targetXml}</string>
    <key>APPLY_DECISION_THRESHOLDS</key><string>{$apply}</string>
  </dict>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>{$script}</string>
  </array>
  <key>StandardOutPath</key><string>/tmp/mom-local-sync-down.log</string>
  <key>StandardErrorPath</key><string>/tmp/mom-local-sync-down.err</string>
</dict>
</plist>
XML;
    }

    private function xmlEscape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }

    private function tailText(string $text): string
    {
        $text = trim($text);
        if (strlen($text) <= 6000) {
            return $text;
        }
        return substr($text, -6000);
    }
}
