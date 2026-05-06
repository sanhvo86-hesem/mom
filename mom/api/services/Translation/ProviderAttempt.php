<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

/**
 * Value object: one fully-resolved attempt (provider + model + spawn config).
 *
 * Returned by ProviderRegistryService::resolveAttempts() in priority order.
 * The DocumentLocaleAutomationService iterates this list, spawning the
 * driver_command for each until one returns a successful translation.
 */
final class ProviderAttempt
{
    public string $providerKey = '';
    public ?string $modelId = null;
    public string $driverCommand = '';
    public string $providerKind = '';

    /** @var array<string, mixed> */
    public array $options = [];

    /** @var array<string, mixed> */
    public array $capabilities = [];

    public string $costClass = 'unknown';

    /** Decrypted API key for http_api providers; null otherwise. */
    public ?string $apiKey = null;

    /** Path to the CLI binary for cli_subscription providers. */
    public string $cliBinaryPath = '';

    /** Filesystem HOME to set when spawning subscription CLIs. */
    public string $cliAuthHomePath = '';

    public bool $isFallback = false;

    /**
     * Build the env var overlay for proc_open. Caller merges this with
     * inherited env when spawning the driver script.
     *
     * @return array<string, string>
     */
    public function buildEnvOverlay(): array
    {
        $env = [
            'DCC_PROVIDER_KEY' => $this->providerKey,
            'DCC_PROVIDER_KIND' => $this->providerKind,
        ];
        if ($this->modelId !== null && $this->modelId !== '') {
            $env['DCC_PROVIDER_MODEL'] = $this->modelId;
        }
        if ($this->apiKey !== null && $this->apiKey !== '') {
            $env['DCC_PROVIDER_API_KEY'] = $this->apiKey;
        }
        if ($this->providerKind === 'cli_subscription') {
            if ($this->cliBinaryPath !== '') {
                $env['DCC_CLI_BINARY'] = $this->cliBinaryPath;
            }
            if ($this->cliAuthHomePath !== '') {
                $env['DCC_CLI_AUTH_HOME'] = $this->cliAuthHomePath;
                $env['HOME'] = $this->cliAuthHomePath;
                // Linux Claude Code does not consistently pick up
                // .credentials.json on its own; inject the OAuth token via
                // ANTHROPIC_AUTH_TOKEN so the Max subscription is honored.
                if (str_starts_with($this->providerKey, 'claude')) {
                    $token = CliRuntimeService::readClaudeOAuthToken($this->cliAuthHomePath);
                    if ($token !== null) {
                        $env['ANTHROPIC_AUTH_TOKEN'] = $token;
                    }
                }
            }
        }
        if (!empty($this->options)) {
            $env['DCC_PROVIDER_OPTIONS_JSON'] = json_encode($this->options) ?: '{}';
        }
        return $env;
    }
}
