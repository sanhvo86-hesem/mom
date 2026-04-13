<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * TranslationService - Internationalization (i18n) framework.
 *
 * Loads locale files from /data/i18n/{locale}.json and provides
 * translation lookup with parameter interpolation and fallback chains.
 *
 * Supported locales: en (English), vi (Vietnamese), ja, ko, zh, de, fr, etc.
 * Default: en with vi fallback for HESEM context.
 *
 * Usage:
 *   $t = new TranslationService($dataDir, 'vi');
 *   echo $t->get('error.unauthorized');
 *   echo $t->get('order.created', ['order_id' => 'SO-001']);
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class TranslationService
{
    private string $locale;
    private string $fallbackLocale;
    private string $i18nDir;

    /** @var array<string, array<string, string>> Loaded translations: locale => [key => value] */
    private array $translations = [];

    /** @var list<string> Supported locale codes */
    public const SUPPORTED_LOCALES = ['en', 'vi', 'ja', 'ko', 'zh', 'de', 'fr', 'es', 'th'];

    private static ?self $instance = null;

    public function __construct(
        string $dataDir,
        string $locale = 'en',
        string $fallbackLocale = 'en'
    ) {
        $this->i18nDir = rtrim($dataDir, '/') . '/i18n';
        $this->locale = in_array($locale, self::SUPPORTED_LOCALES, true) ? $locale : 'en';
        $this->fallbackLocale = $fallbackLocale;

        if (!is_dir($this->i18nDir)) {
            @mkdir($this->i18nDir, 0775, true);
        }

        // Pre-load current locale and fallback
        $this->loadLocale($this->locale);
        if ($this->locale !== $this->fallbackLocale) {
            $this->loadLocale($this->fallbackLocale);
        }
    }

    /**
     * Get or create singleton instance.
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            $dataDir = $GLOBALS['DATA_DIR'] ?? dirname(__DIR__, 2) . '/data';
            // SECURITY FIX (INF-005): Validate locale against whitelist before using it
            $locale = 'en'; // Default

            // 1. Try GET parameter (with strict validation)
            if (!empty($_GET['lang'])) {
                $getLocale = strtolower(trim((string)$_GET['lang']));
                if (in_array($getLocale, self::SUPPORTED_LOCALES, true)) {
                    $locale = $getLocale;
                }
            }

            // 2. Fall back to Accept-Language header if GET didn't match
            if ($locale === 'en' && !empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
                $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'];
                $primary = strtolower(substr($acceptLang, 0, 2));
                if (in_array($primary, self::SUPPORTED_LOCALES, true)) {
                    $locale = $primary;
                }
            }

            self::$instance = new self($dataDir, $locale);
        }
        return self::$instance;
    }

    public static function setInstance(self $instance): void
    {
        self::$instance = $instance;
    }

    // ── Translation Lookup ──────────────────────────────────────────────

    /**
     * Get a translated string.
     *
     * @param string $key    Dot-notation key (e.g. 'error.unauthorized', 'quality.ncr.opened')
     * @param array  $params Interpolation params: {param_name} in the string will be replaced
     * @return string Translated string, or the key itself if not found
     */
    public function get(string $key, array $params = []): string
    {
        // Try current locale
        $value = $this->translations[$this->locale][$key] ?? null;

        // Fallback to fallback locale
        if ($value === null && $this->locale !== $this->fallbackLocale) {
            $value = $this->translations[$this->fallbackLocale][$key] ?? null;
        }

        // Return key if no translation found
        if ($value === null) {
            return $key;
        }

        // Interpolate parameters
        if (!empty($params)) {
            foreach ($params as $paramKey => $paramValue) {
                $value = str_replace('{' . $paramKey . '}', (string)$paramValue, $value);
            }
        }

        return $value;
    }

    /**
     * Get translations for both English and Vietnamese (common pattern in MOM).
     *
     * @return array{en: string, vi: string}
     */
    public function getBilingual(string $key, array $params = []): array
    {
        $currentLocale = $this->locale;

        // Get English
        $this->locale = 'en';
        $this->loadLocale('en');
        $en = $this->get($key, $params);

        // Get Vietnamese
        $this->locale = 'vi';
        $this->loadLocale('vi');
        $vi = $this->get($key, $params);

        // Restore original locale
        $this->locale = $currentLocale;

        return ['en' => $en, 'vi' => $vi];
    }

    /**
     * Check if a translation key exists.
     */
    public function has(string $key): bool
    {
        return isset($this->translations[$this->locale][$key])
            || isset($this->translations[$this->fallbackLocale][$key]);
    }

    /**
     * Get all translations for the current locale (for frontend bundle).
     *
     * @param string|null $prefix Only return keys starting with this prefix
     * @return array<string, string>
     */
    public function all(?string $prefix = null): array
    {
        $translations = array_merge(
            $this->translations[$this->fallbackLocale] ?? [],
            $this->translations[$this->locale] ?? []
        );

        if ($prefix !== null) {
            $filtered = [];
            $prefixLen = strlen($prefix);
            foreach ($translations as $key => $value) {
                if (str_starts_with($key, $prefix)) {
                    $filtered[substr($key, $prefixLen)] = $value;
                }
            }
            return $filtered;
        }

        return $translations;
    }

    // ── Locale Management ───────────────────────────────────────────────

    /**
     * Get current locale.
     */
    public function getLocale(): string
    {
        return $this->locale;
    }

    /**
     * Set current locale.
     */
    public function setLocale(string $locale): void
    {
        if (in_array($locale, self::SUPPORTED_LOCALES, true)) {
            $this->locale = $locale;
            $this->loadLocale($locale);
        }
    }

    /**
     * Detect locale from request (Accept-Language header, query param, session).
     */
    public static function detectLocale(): string
    {
        // 1. Query parameter
        if (!empty($_GET['lang'])) {
            $lang = strtolower(substr(trim($_GET['lang']), 0, 2));
            if (in_array($lang, self::SUPPORTED_LOCALES, true)) {
                return $lang;
            }
        }

        // 2. Session
        if (!empty($_SESSION['locale'])) {
            return $_SESSION['locale'];
        }

        // 3. Accept-Language header
        $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
        if ($acceptLang !== '') {
            $primary = strtolower(substr($acceptLang, 0, 2));
            if (in_array($primary, self::SUPPORTED_LOCALES, true)) {
                return $primary;
            }
        }

        // 4. Default
        return 'en';
    }

    // ── Locale File Management ──────────────────────────────────────────

    /**
     * Load a locale file into memory.
     */
    private function loadLocale(string $locale): void
    {
        // SECURITY FIX (INF-005): Validate locale against whitelist to prevent path traversal
        if (!in_array($locale, self::SUPPORTED_LOCALES, true)) {
            $this->translations[$locale] = [];
            return;
        }

        if (isset($this->translations[$locale])) {
            return; // Already loaded
        }

        $file = $this->i18nDir . '/' . $locale . '.json';
        if (!is_file($file)) {
            $this->translations[$locale] = [];
            return;
        }

        // Additional path validation: ensure the resolved path is within i18nDir
        $realFile = realpath($file);
        $reali18nDir = realpath($this->i18nDir);
        if ($realFile === false || $reali18nDir === false || !str_starts_with($realFile, $reali18nDir)) {
            $this->translations[$locale] = [];
            return;
        }

        $raw = @file_get_contents($realFile);
        if ($raw === false) {
            $this->translations[$locale] = [];
            return;
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->translations[$locale] = [];
            return;
        }

        // Flatten nested keys: {"error": {"unauthorized": "..."}} => {"error.unauthorized": "..."}
        $this->translations[$locale] = $this->flatten($data);
    }

    /**
     * Flatten a nested array to dot-notation keys.
     */
    private function flatten(array $array, string $prefix = ''): array
    {
        $result = [];
        foreach ($array as $key => $value) {
            $fullKey = $prefix === '' ? (string)$key : $prefix . '.' . $key;
            if (is_array($value)) {
                $result = array_merge($result, $this->flatten($value, $fullKey));
            } else {
                $result[$fullKey] = (string)$value;
            }
        }
        return $result;
    }
}
