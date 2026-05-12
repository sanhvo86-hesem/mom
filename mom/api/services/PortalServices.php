<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use Throwable;

/**
 * Centralised factory for ADR-0013 services.
 *
 * Controllers and CLI tools should obtain repositories through this
 * factory instead of constructing them directly. The factory handles:
 *
 *   - lazy DB connection (returns null if PostgreSQL is unreachable —
 *     callers fall back to legacy filesystem paths)
 *   - per-process memoisation (one instance per service per request)
 *   - dependency wiring (DataCollectionModeResolver and AuditChainService
 *     are constructed once and shared)
 *
 * Static memoisation is appropriate for PHP's per-request lifecycle
 * model (FPM workers reset between requests). Long-running workers
 * should call {@see resetForTesting()} between iterations.
 */
final class PortalServices
{
    private static ?Connection $connection = null;
    private static ?DataCollectionModeResolver $modeResolver = null;
    private static ?AuditChainService $audit = null;
    private static ?IdentityRepository $identity = null;
    private static ?DocumentBodyRepository $documentBody = null;

    private function __construct()
    {
    }

    /**
     * Retrieve the canonical DB connection, or null if unavailable.
     */
    public static function connection(): ?Connection
    {
        if (self::$connection !== null) {
            return self::$connection;
        }
        // Defensive autoload: legacy mom/api.php boots without
        // composer's autoloader, so PSR-4 lookup of MOM\Api\Services\*
        // would silently fail. Pull in the sibling service files we need.
        self::loadServiceClasses();

        $configFile = __DIR__ . '/../../database/config.php';
        if (!is_file($configFile)) {
            return null;
        }
        try {
            $config = (array)(require $configFile);
            $conn = Connection::getInstance($config);
            // Cheap probe — fails fast if PG is down so callers can fall back.
            $conn->queryOne('SELECT 1');
            self::$connection = $conn;
            return $conn;
        } catch (Throwable $e) {
            @error_log('[PortalServices] DB unavailable: ' . $e->getMessage());
            return null;
        }
    }

    private static function loadServiceClasses(): void
    {
        static $loaded = false;
        if ($loaded) {
            return;
        }
        $loaded = true;
        $base = __DIR__;
        $files = [
            $base . '/../../database/Connection.php',
            $base . '/UserRepository.php',
            $base . '/AuthUserShadowSyncService.php',
            $base . '/DataCollectionModeResolver.php',
            $base . '/AuditChainService.php',
            $base . '/IdentityRepository.php',
            $base . '/DocumentBodyRepository.php',
        ];
        foreach ($files as $f) {
            if (is_file($f)) {
                require_once $f;
            }
        }
    }

    public static function modeResolver(): ?DataCollectionModeResolver
    {
        if (self::$modeResolver !== null) {
            return self::$modeResolver;
        }
        $conn = self::connection();
        if ($conn === null) {
            return null;
        }
        return self::$modeResolver = new DataCollectionModeResolver($conn);
    }

    public static function auditChain(): ?AuditChainService
    {
        if (self::$audit !== null) {
            return self::$audit;
        }
        $conn = self::connection();
        if ($conn === null) {
            return null;
        }
        return self::$audit = new AuditChainService($conn);
    }

    /**
     * Build the IdentityRepository wired to the canonical user store.
     * Returns null when the DB is unavailable so callers know to use the
     * legacy filesystem path. The dataDir argument should be `mom/data`.
     */
    public static function identity(string $dataDir, string $portalRoot): ?IdentityRepository
    {
        if (self::$identity !== null) {
            return self::$identity;
        }
        $conn = self::connection();
        $modeResolver = self::modeResolver();
        $audit = self::auditChain();
        if ($conn === null || $modeResolver === null || $audit === null) {
            return null;
        }
        return self::$identity = new IdentityRepository(
            $conn,
            new UserRepository($dataDir),
            new AuthUserShadowSyncService($portalRoot),
            $modeResolver,
            $audit,
        );
    }

    /**
     * Build the DocumentBodyRepository for the given docs root.
     * docsRoot should be `mom/docs` absolute.
     */
    public static function documentBody(string $docsRoot): ?DocumentBodyRepository
    {
        if (self::$documentBody !== null) {
            return self::$documentBody;
        }
        $conn = self::connection();
        $modeResolver = self::modeResolver();
        $audit = self::auditChain();
        if ($conn === null || $modeResolver === null || $audit === null) {
            return null;
        }
        return self::$documentBody = new DocumentBodyRepository(
            $conn,
            $modeResolver,
            $audit,
            $docsRoot,
        );
    }

    /**
     * Reset all memoised instances. Tests and long-running workers call
     * this between iterations.
     */
    public static function resetForTesting(): void
    {
        self::$connection   = null;
        self::$modeResolver = null;
        self::$audit        = null;
        self::$identity     = null;
        self::$documentBody = null;
    }
}
