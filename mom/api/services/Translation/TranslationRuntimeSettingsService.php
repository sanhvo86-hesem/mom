<?php

declare(strict_types=1);

namespace MOM\Services\Translation;

use MOM\Database\DataLayer;
use Throwable;

/**
 * Runtime-toggleable translation flags (admin panel ↔ DB).
 *
 * Backed by migration 191_translation_runtime_settings.sql. Stores small
 * JSONB blobs per setting key. First flag: `auto_translate_enabled`.
 *
 * Read path is cached per PHP process so the 5 trigger sites in
 * DocumentController and the cron worker incur exactly one query per
 * request / cron tick.
 *
 * @since 4.3.0
 */
final class TranslationRuntimeSettingsService
{
    public const KEY_AUTO_TRANSLATE_ENABLED = 'auto_translate_enabled';

    /** @var array<string, array<string,mixed>>|null */
    private static ?array $cache = null;

    public function __construct(
        private readonly DataLayer $data,
    ) {}

    /**
     * True when event-driven + cron auto-translate is allowed to run.
     * Defaults to true (preserve behavior) if the row is missing or the
     * DB is unreachable — we never silently break auto-translate due to
     * a settings-table outage.
     */
    public function isAutoTranslateEnabled(): bool
    {
        $value = $this->get(self::KEY_AUTO_TRANSLATE_ENABLED);
        if (!is_array($value) || !array_key_exists('enabled', $value)) {
            return true;
        }
        return (bool)$value['enabled'];
    }

    public function setAutoTranslateEnabled(bool $enabled, string $actor): bool
    {
        return $this->set(self::KEY_AUTO_TRANSLATE_ENABLED, ['enabled' => $enabled], $actor);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function get(string $key): ?array
    {
        $all = $this->loadAll();
        return $all[$key]['value'] ?? null;
    }

    /**
     * @return array<string, array{value:array<string,mixed>, updated_at:string, updated_by:?string, description:?string}>
     */
    public function listAll(): array
    {
        return $this->loadAll();
    }

    /**
     * @param array<string,mixed> $value
     */
    public function set(string $key, array $value, string $actor): bool
    {
        try {
            $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (!is_string($encoded)) {
                return false;
            }
            $this->data->execute(
                "INSERT INTO translation_runtime_setting (setting_key, setting_value, updated_by)
                 VALUES (:p1, :p2::jsonb, :p3)
                 ON CONFLICT (setting_key) DO UPDATE
                   SET setting_value = EXCLUDED.setting_value,
                       updated_at = now(),
                       updated_by = EXCLUDED.updated_by",
                [':p1' => $key, ':p2' => $encoded, ':p3' => $actor]
            );
            self::$cache = null;
            return true;
        } catch (Throwable $e) {
            error_log('TranslationRuntimeSettingsService.set failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * @return array<string, array{value:array<string,mixed>, updated_at:string, updated_by:?string, description:?string}>
     */
    private function loadAll(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        try {
            $rows = $this->data->query(
                'SELECT setting_key, setting_value, description, updated_at, updated_by
                   FROM translation_runtime_setting'
            );
        } catch (Throwable $e) {
            error_log('TranslationRuntimeSettingsService.loadAll failed: ' . $e->getMessage());
            self::$cache = [];
            return self::$cache;
        }
        $out = [];
        if (is_array($rows)) {
            foreach ($rows as $row) {
                $key = (string)($row['setting_key'] ?? '');
                if ($key === '') continue;
                $raw = $row['setting_value'] ?? null;
                $value = [];
                if (is_array($raw)) {
                    $value = $raw;
                } elseif (is_string($raw)) {
                    $decoded = json_decode($raw, true);
                    $value = is_array($decoded) ? $decoded : [];
                }
                $out[$key] = [
                    'value' => $value,
                    'updated_at' => (string)($row['updated_at'] ?? ''),
                    'updated_by' => $row['updated_by'] ?? null,
                    'description' => $row['description'] ?? null,
                ];
            }
        }
        self::$cache = $out;
        return self::$cache;
    }

    /** For unit tests only — never call from production code. */
    public static function resetCache(): void
    {
        self::$cache = null;
    }
}
