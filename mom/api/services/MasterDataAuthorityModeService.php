<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;

final class MasterDataAuthorityModeService
{
    public const MODE_JSON_ONLY = DataLayer::MODE_JSON_ONLY;
    public const MODE_SHADOW_WRITE = DataLayer::MODE_SHADOW_WRITE;
    public const MODE_POSTGRES_PRIMARY = DataLayer::MODE_POSTGRES_PRIMARY;
    public const MODE_POSTGRES_ONLY = DataLayer::MODE_POSTGRES_ONLY;

    /** @var array<string, mixed> */
    private array $config;

    /**
     * @param array<string, mixed>|null $config
     */
    public function __construct(
        private readonly string $dataDir,
        private readonly ?string $rootDir = null,
        ?array $config = null,
    ) {
        $this->config = $config ?? (array)(require dirname(__DIR__, 2) . '/database/config.php');
    }

    public function mode(): string
    {
        $override = strtoupper(trim((string)(getenv('HESEM_MASTER_DATA_AUTHORITY_MODE') ?: '')));
        if (in_array($override, $this->validModes(), true)) {
            return $override;
        }

        if (!($this->config['use_postgres'] ?? false)) {
            return self::MODE_JSON_ONLY;
        }
        if ($this->config['shadow_write'] ?? false) {
            return self::MODE_SHADOW_WRITE;
        }
        if ($this->config['json_fallback'] ?? false) {
            return self::MODE_POSTGRES_PRIMARY;
        }

        return self::MODE_POSTGRES_ONLY;
    }

    public function postgresConfigured(): bool
    {
        return (bool)($this->config['use_postgres'] ?? false)
            || in_array($this->mode(), [self::MODE_SHADOW_WRITE, self::MODE_POSTGRES_PRIMARY, self::MODE_POSTGRES_ONLY], true);
    }

    public function usesPostgresRepository(): bool
    {
        return $this->mode() !== self::MODE_JSON_ONLY && $this->postgresConfigured();
    }

    public function jsonFallbackAllowed(): bool
    {
        return $this->mode() === self::MODE_POSTGRES_PRIMARY;
    }

    public function shadowJsonWriteAllowed(): bool
    {
        return $this->mode() === self::MODE_SHADOW_WRITE || $this->mode() === self::MODE_POSTGRES_PRIMARY;
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        return [
            'mode' => $this->mode(),
            'postgres_configured' => $this->postgresConfigured(),
            'uses_postgres_repository' => $this->usesPostgresRepository(),
            'json_fallback_allowed' => $this->jsonFallbackAllowed(),
            'shadow_json_write_allowed' => $this->shadowJsonWriteAllowed(),
            'data_dir' => $this->dataDir,
            'root_dir' => $this->rootDir ?? '',
        ];
    }

    public function assertGovernedCommandAllowed(string $commandName): void
    {
        $mode = $this->mode();
        if ($mode !== self::MODE_JSON_ONLY && $this->usesPostgresRepository()) {
            return;
        }

        throw new MasterDataAuthorityException(
            'governed_master_data_postgres_authority_required',
            'Governed master-data commands require PostgreSQL authority. JSON_ONLY/compatibility-only mode is read-only for governed roots.',
            [
                'mode' => $mode,
                'command' => $commandName,
                'postgres_configured' => $this->postgresConfigured(),
            ],
        );
    }

    public function assertPostgresOnlyCutoverAllowed(MasterDataFallbackTelemetry $telemetry): void
    {
        if ($this->mode() !== self::MODE_POSTGRES_ONLY) {
            return;
        }

        $summary = $telemetry->summary();
        if ((int)($summary['fallback_read_total'] ?? 0) === 0 && (int)($summary['drift_incident_total'] ?? 0) === 0) {
            return;
        }

        throw new MasterDataAuthorityException(
            'postgres_only_cutover_blocked_by_fallback_or_drift',
            'POSTGRES_ONLY is blocked while fallback reads or drift incidents exist.',
            $summary,
        );
    }

    /**
     * @return array<int, string>
     */
    private function validModes(): array
    {
        return [
            self::MODE_JSON_ONLY,
            self::MODE_SHADOW_WRITE,
            self::MODE_POSTGRES_PRIMARY,
            self::MODE_POSTGRES_ONLY,
        ];
    }
}
