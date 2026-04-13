<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * PluginManager - Plugin/Extension framework for MOM Portal.
 *
 * Enables third-party or custom modules to extend the system by:
 *   - Registering new API routes
 *   - Subscribing to domain events
 *   - Adding scheduled jobs
 *   - Extending validation rules
 *   - Adding custom computed formulas
 *
 * Plugins live in /mom/plugins/{plugin-name}/ and declare themselves
 * via a plugin.json manifest file.
 *
 * Lifecycle: discover -> load -> activate -> (deactivate -> uninstall)
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class PluginManager
{
    private string $pluginDir;
    private string $dataDir;
    private ?EventBus $eventBus;

    /** @var array<string, PluginManifest> Discovered plugins */
    private array $plugins = [];

    /** @var array<string, object> Active plugin instances */
    private array $instances = [];

    private static ?self $instance = null;

    public function __construct(string $pluginDir, string $dataDir, ?EventBus $eventBus = null)
    {
        $this->pluginDir = rtrim($pluginDir, '/');
        $this->dataDir = rtrim($dataDir, '/');
        $this->eventBus = $eventBus;

        if (!is_dir($this->pluginDir)) {
            @mkdir($this->pluginDir, 0775, true);
        }
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            $baseDir = dirname(__DIR__, 2);
            self::$instance = new self(
                $baseDir . '/plugins',
                $baseDir . '/data',
                EventBus::getInstance()
            );
        }
        return self::$instance;
    }

    public static function setInstance(self $instance): void
    {
        self::$instance = $instance;
    }

    // ── Discovery ───────────────────────────────────────────────────────

    /**
     * Discover all plugins in the plugins directory.
     *
     * @return array<string, PluginManifest>
     */
    public function discover(): array
    {
        $this->plugins = [];

        if (!is_dir($this->pluginDir)) {
            return $this->plugins;
        }

        $entries = @scandir($this->pluginDir);
        if (!$entries) return $this->plugins;

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') continue;

            $manifestFile = $this->pluginDir . '/' . $entry . '/plugin.json';
            if (!is_file($manifestFile)) continue;

            $raw = @file_get_contents($manifestFile);
            if ($raw === false) continue;

            $data = json_decode($raw, true);
            if (!is_array($data) || empty($data['name'])) continue;

            $manifest = new PluginManifest(
                name: $data['name'],
                version: $data['version'] ?? '1.0.0',
                description: $data['description'] ?? '',
                author: $data['author'] ?? '',
                entryPoint: $data['entry_point'] ?? 'Plugin.php',
                className: $data['class_name'] ?? null,
                dependencies: $data['dependencies'] ?? [],
                routes: $data['routes'] ?? [],
                events: $data['events'] ?? [],
                jobs: $data['jobs'] ?? [],
                directory: $this->pluginDir . '/' . $entry,
                enabled: $data['enabled'] ?? true,
            );

            $this->plugins[$manifest->name] = $manifest;
        }

        return $this->plugins;
    }

    // ── Lifecycle ───────────────────────────────────────────────────────

    /**
     * Load and activate all enabled plugins.
     *
     * @return array{loaded: list<string>, errors: array<string, string>}
     */
    public function loadAll(): array
    {
        if (empty($this->plugins)) {
            $this->discover();
        }

        $loaded = [];
        $errors = [];

        // Sort by dependencies
        $sorted = $this->topologicalSort();

        foreach ($sorted as $name) {
            $manifest = $this->plugins[$name] ?? null;
            if (!$manifest || !$manifest->enabled) continue;

            try {
                $this->loadPlugin($manifest);
                $loaded[] = $name;
            } catch (\Throwable $e) {
                $errors[$name] = $e->getMessage();
                @error_log("[PluginManager] Failed to load '{$name}': {$e->getMessage()}");
            }
        }

        return ['loaded' => $loaded, 'errors' => $errors];
    }

    /**
     * Load a single plugin.
     */
    private function loadPlugin(PluginManifest $manifest): void
    {
        // Check dependencies
        foreach ($manifest->dependencies as $dep) {
            if (!isset($this->instances[$dep])) {
                throw new \RuntimeException("Missing dependency: {$dep}");
            }
        }

        // SECURITY FIX (INF-004): Validate plugin name and entry point to prevent arbitrary PHP loading
        // Plugin names must be alphanumeric, hyphens, and underscores only
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $manifest->name)) {
            throw new \RuntimeException("Invalid plugin name (alphanumeric, hyphens, underscores only): {$manifest->name}");
        }
        // Entry point filename must be alphanumeric, hyphens, dots, and underscores
        if (!preg_match('/^[a-zA-Z0-9_.-]+$/', $manifest->entryPoint)) {
            throw new \RuntimeException("Invalid entry point filename: {$manifest->entryPoint}");
        }

        // Verify the plugin directory is within the plugins directory
        $realPluginDir = realpath($this->pluginDir);
        $realManifestDir = realpath($manifest->directory);
        if ($realPluginDir === false || $realManifestDir === false || !str_starts_with($realManifestDir, $realPluginDir)) {
            throw new \RuntimeException("Plugin directory is outside the plugins directory");
        }

        // Require entry point with validated path
        $entryFile = $manifest->directory . '/' . $manifest->entryPoint;
        if (!is_file($entryFile)) {
            throw new \RuntimeException("Entry point not found: {$manifest->entryPoint}");
        }

        // Final validation: ensure the resolved entry file is within the plugin directory
        $realEntryFile = realpath($entryFile);
        if ($realEntryFile === false || !str_starts_with($realEntryFile, $realManifestDir)) {
            throw new \RuntimeException("Entry point is outside the plugin directory");
        }

        require_once $realEntryFile;

        // Determine class name
        $className = $manifest->className;
        if ($className === null) {
            // Convention: Plugin name "my-plugin" -> class "MyPlugin\Plugin"
            $namespace = str_replace(['-', '_'], '', ucwords($manifest->name, '-_'));
            $className = $namespace . '\\Plugin';
        }

        if (!class_exists($className)) {
            throw new \RuntimeException("Plugin class not found: {$className}");
        }

        // Check interface
        $instance = new $className();
        if (!($instance instanceof PluginInterface)) {
            throw new \RuntimeException("Plugin must implement PluginInterface: {$className}");
        }

        // Activate
        $context = new PluginContext(
            name: $manifest->name,
            dataDir: $this->dataDir . '/plugins/' . $manifest->name,
            eventBus: $this->eventBus,
            pluginManager: $this,
        );

        $instance->onActivate($context);
        $this->instances[$manifest->name] = $instance;

        // Register event subscriptions from manifest
        if ($this->eventBus) {
            foreach ($manifest->events as $eventType) {
                if (method_exists($instance, 'onEvent')) {
                    $this->eventBus->on($eventType, [$instance, 'onEvent']);
                }
            }
        }
    }

    /**
     * Deactivate a plugin.
     */
    public function deactivate(string $name): void
    {
        $instance = $this->instances[$name] ?? null;
        if ($instance && $instance instanceof PluginInterface) {
            $instance->onDeactivate();
        }
        unset($this->instances[$name]);
    }

    /**
     * Deactivate all plugins.
     */
    public function deactivateAll(): void
    {
        foreach (array_keys($this->instances) as $name) {
            $this->deactivate($name);
        }
    }

    // ── Query ───────────────────────────────────────────────────────────

    /**
     * Get all discovered plugins with their status.
     *
     * @return array<string, array>
     */
    public function getStatus(): array
    {
        $status = [];
        foreach ($this->plugins as $name => $manifest) {
            $status[$name] = [
                'name'         => $manifest->name,
                'version'      => $manifest->version,
                'description'  => $manifest->description,
                'author'       => $manifest->author,
                'enabled'      => $manifest->enabled,
                'active'       => isset($this->instances[$name]),
                'dependencies' => $manifest->dependencies,
                'routes'       => count($manifest->routes),
                'events'       => count($manifest->events),
                'jobs'         => count($manifest->jobs),
            ];
        }
        return $status;
    }

    /**
     * Get a loaded plugin instance.
     */
    public function getPlugin(string $name): ?object
    {
        return $this->instances[$name] ?? null;
    }

    /**
     * Collect all route registrations from active plugins.
     *
     * @return array<int, array{method: string, path: string, class: string, handler: string}>
     */
    public function collectRoutes(): array
    {
        $routes = [];
        foreach ($this->plugins as $manifest) {
            if (!$manifest->enabled || !isset($this->instances[$manifest->name])) continue;
            foreach ($manifest->routes as $route) {
                $routes[] = $route;
            }
        }
        return $routes;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /**
     * Topological sort plugins by dependencies.
     *
     * @return list<string>
     */
    private function topologicalSort(): array
    {
        $sorted = [];
        $visited = [];

        $visit = function (string $name) use (&$visit, &$sorted, &$visited): void {
            if (isset($visited[$name])) return;
            $visited[$name] = true;

            $manifest = $this->plugins[$name] ?? null;
            if (!$manifest) return;

            foreach ($manifest->dependencies as $dep) {
                $visit($dep);
            }

            $sorted[] = $name;
        };

        foreach (array_keys($this->plugins) as $name) {
            $visit($name);
        }

        return $sorted;
    }
}

// ── Plugin Interface ────────────────────────────────────────────────────

interface PluginInterface
{
    public function onActivate(PluginContext $context): void;
    public function onDeactivate(): void;
    public function onEvent(DomainEvent $event): void;
}

// ── Plugin Context ──────────────────────────────────────────────────────

final class PluginContext
{
    public function __construct(
        public readonly string $name,
        public readonly string $dataDir,
        public readonly ?EventBus $eventBus,
        public readonly ?PluginManager $pluginManager,
    ) {
        if (!is_dir($this->dataDir)) {
            @mkdir($this->dataDir, 0775, true);
        }
    }
}

// ── Plugin Manifest ─────────────────────────────────────────────────────

final class PluginManifest
{
    public function __construct(
        public readonly string $name,
        public readonly string $version,
        public readonly string $description,
        public readonly string $author,
        public readonly string $entryPoint,
        public readonly ?string $className,
        public readonly array $dependencies,
        public readonly array $routes,
        public readonly array $events,
        public readonly array $jobs,
        public readonly string $directory,
        public readonly bool $enabled,
    ) {}
}
