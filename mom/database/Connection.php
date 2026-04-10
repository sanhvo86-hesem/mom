<?php

declare(strict_types=1);

namespace MOM\Database;

use PDO;
use PDOException;
use PDOStatement;
use RuntimeException;

/**
 * PDO Connection Manager for HESEM MOM Portal.
 *
 * Provides singleton access to a PostgreSQL PDO connection with:
 * - Lazy connection (connects on first query, not on instantiation)
 * - Automatic reconnect on connection failure
 * - Query logging with slow-query detection
 * - Transaction helpers (begin / commit / rollback / transactional closure)
 * - Prepared statement convenience methods
 *
 * @package MOM\Database
 * @since   1.0.0
 */
class Connection
{
    /** Singleton instance */
    private static ?self $instance = null;

    /** Underlying PDO handle (null until first query) */
    private ?PDO $pdo = null;

    /** Resolved configuration array */
    private array $config;

    /** Current transaction nesting depth */
    private int $transactionDepth = 0;

    /** Query log entries (when logging is enabled) */
    private array $queryLog = [];

    /** Maximum reconnect attempts */
    private const MAX_RECONNECT_ATTEMPTS = 2;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param array $config Database configuration (from config.php)
     */
    private function __construct(array $config)
    {
        $this->config = $config;
    }

    /** Prevent cloning of the singleton. */
    private function __clone()
    {
    }

    /**
     * Retrieve the singleton Connection instance.
     *
     * @param array|null $config Override configuration on first call.
     * @return self
     */
    public static function getInstance(?array $config = null): self
    {
        if (self::$instance === null) {
            $cfg = $config ?? (array)(require __DIR__ . '/config.php');
            self::$instance = new self($cfg);
        }
        return self::$instance;
    }

    /**
     * Reset the singleton (useful in tests or long-running workers).
     */
    public static function resetInstance(): void
    {
        if (self::$instance !== null) {
            self::$instance->disconnect();
            self::$instance = null;
        }
    }

    // ── Connection Lifecycle ────────────────────────────────────────────────

    /**
     * Establish the PDO connection lazily.
     *
     * @throws RuntimeException When the connection cannot be established.
     */
    private function connect(): void
    {
        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;options=--search_path=%s',
            $this->config['host'],
            $this->config['port'],
            $this->config['database'],
            $this->config['schema'] ?? 'public',
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_STRINGIFY_FETCHES  => false,
        ];

        try {
            $this->pdo = new PDO(
                $dsn,
                $this->config['username'],
                $this->config['password'],
                $options,
            );

            // Set client encoding
            $this->pdo->exec("SET client_encoding TO 'UTF8'");

            // Set statement timeout
            $timeout = $this->config['statement_timeout'] ?? 30000;
            $this->pdo->exec("SET statement_timeout = {$timeout}");
        } catch (PDOException $e) {
            $this->pdo = null;
            throw new RuntimeException(
                'Database connection failed: ' . $e->getMessage(),
                (int)$e->getCode(),
                $e,
            );
        }
    }

    /**
     * Disconnect and release the PDO handle.
     */
    public function disconnect(): void
    {
        $this->pdo = null;
        $this->transactionDepth = 0;
    }

    /**
     * Get the raw PDO handle, connecting if necessary.
     *
     * @return PDO
     */
    public function getPdo(): PDO
    {
        if ($this->pdo === null) {
            $this->connect();
        }
        /** @var PDO $this->pdo */
        return $this->pdo;
    }

    /**
     * Test whether the connection is alive.
     *
     * @return bool
     */
    public function isConnected(): bool
    {
        if ($this->pdo === null) {
            return false;
        }
        try {
            $this->pdo->query('SELECT 1');
            return true;
        } catch (PDOException) {
            return false;
        }
    }

    /**
     * Reconnect after a detected connection drop.
     *
     * @throws RuntimeException After exhausting reconnect attempts.
     */
    private function reconnect(): void
    {
        $this->disconnect();
        $this->connect();
    }

    // ── Query Execution ─────────────────────────────────────────────────────

    /**
     * Execute a SELECT query and return all rows.
     *
     * @param string $sql    SQL with named or positional placeholders.
     * @param array  $params Bind parameters.
     * @return array<int, array<string, mixed>> Result rows.
     */
    public function query(string $sql, array $params = []): array
    {
        $stmt = $this->executeStatement($sql, $params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Execute a SELECT and return the first row or null.
     *
     * @param string $sql    SQL with placeholders.
     * @param array  $params Bind parameters.
     * @return array<string, mixed>|null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->executeStatement($sql, $params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * Execute a scalar query (single column, single row).
     *
     * @param string $sql    SQL with placeholders.
     * @param array  $params Bind parameters.
     * @return mixed The scalar value or null.
     */
    public function queryScalar(string $sql, array $params = []): mixed
    {
        $stmt = $this->executeStatement($sql, $params);
        $value = $stmt->fetchColumn();
        return $value !== false ? $value : null;
    }

    /**
     * Execute a non-SELECT statement (INSERT, UPDATE, DELETE).
     *
     * @param string $sql    SQL with placeholders.
     * @param array  $params Bind parameters.
     * @return int Number of affected rows.
     */
    public function execute(string $sql, array $params = []): int
    {
        $stmt = $this->executeStatement($sql, $params);
        return $stmt->rowCount();
    }

    /**
     * Execute a raw SQL script that may contain multiple statements.
     *
     * This bypasses prepared statements intentionally because PostgreSQL does
     * not allow multi-command migration batches in a single prepared query.
     *
     * @param string $sql Raw SQL script text.
     * @return void
     */
    public function executeScript(string $sql): void
    {
        $attempts = 0;
        $startTime = microtime(true);

        while (true) {
            try {
                $pdo = $this->getPdo();
                $pdo->exec($sql);
                $this->logQuery($sql, [], $startTime);
                return;
            } catch (PDOException $e) {
                $attempts++;
                if ($attempts <= self::MAX_RECONNECT_ATTEMPTS && $this->isConnectionError($e)) {
                    $this->reconnect();
                    continue;
                }
                $this->logQuery($sql, [], $startTime, $e->getMessage());
                throw new RuntimeException(
                    'Query failed: ' . $e->getMessage(),
                    (int)$e->getCode(),
                    $e,
                );
            }
        }
    }

    /**
     * Execute an INSERT ... RETURNING and return the first row.
     *
     * @param string $sql    SQL with RETURNING clause.
     * @param array  $params Bind parameters.
     * @return array<string, mixed>|null The returned row or null.
     */
    public function insertReturning(string $sql, array $params = []): ?array
    {
        $stmt = $this->executeStatement($sql, $params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? $row : null;
    }

    /**
     * Core statement executor with automatic reconnect and logging.
     *
     * @param string $sql    SQL text.
     * @param array  $params Bind parameters.
     * @return PDOStatement
     * @throws RuntimeException On persistent failure.
     */
    private function executeStatement(string $sql, array $params): PDOStatement
    {
        $attempts = 0;
        $startTime = microtime(true);

        while (true) {
            try {
                $pdo = $this->getPdo();
                $stmt = $pdo->prepare($sql);
                foreach ($params as $key => $value) {
                    $paramType = match (true) {
                        is_bool($value) => PDO::PARAM_BOOL,
                        is_int($value) => PDO::PARAM_INT,
                        $value === null => PDO::PARAM_NULL,
                        default => PDO::PARAM_STR,
                    };
                    $stmt->bindValue($key, $value, $paramType);
                }
                $stmt->execute();
                $this->logQuery($sql, $params, $startTime);
                return $stmt;
            } catch (PDOException $e) {
                $attempts++;
                // Reconnect on connection-level errors (server gone, etc.)
                if ($attempts <= self::MAX_RECONNECT_ATTEMPTS && $this->isConnectionError($e)) {
                    $this->reconnect();
                    continue;
                }
                $this->logQuery($sql, $params, $startTime, $e->getMessage());
                throw new RuntimeException(
                    'Query failed: ' . $e->getMessage(),
                    (int)$e->getCode(),
                    $e,
                );
            }
        }
    }

    /**
     * Determine whether a PDOException indicates a broken connection.
     *
     * @param PDOException $e
     * @return bool
     */
    private function isConnectionError(PDOException $e): bool
    {
        $code = (string)$e->getCode();
        // PostgreSQL connection-class errors start with "08"
        if (str_starts_with($code, '08')) {
            return true;
        }
        $msg = strtolower($e->getMessage());
        $markers = ['server has gone away', 'connection reset', 'broken pipe', 'no connection'];
        foreach ($markers as $marker) {
            if (str_contains($msg, $marker)) {
                return true;
            }
        }
        return false;
    }

    // ── Transactions ────────────────────────────────────────────────────────

    /**
     * Begin a database transaction (supports nested via SAVEPOINTs).
     */
    public function beginTransaction(): void
    {
        if ($this->transactionDepth === 0) {
            $this->getPdo()->beginTransaction();
        } else {
            $this->getPdo()->exec('SAVEPOINT sp_' . $this->transactionDepth);
        }
        $this->transactionDepth++;
    }

    /**
     * Commit the current transaction or release the savepoint.
     */
    public function commit(): void
    {
        if ($this->transactionDepth <= 0) {
            return;
        }
        $this->transactionDepth--;
        if ($this->transactionDepth === 0) {
            $this->getPdo()->commit();
        } else {
            $this->getPdo()->exec('RELEASE SAVEPOINT sp_' . $this->transactionDepth);
        }
    }

    /**
     * Roll back the current transaction or to the savepoint.
     */
    public function rollback(): void
    {
        if ($this->transactionDepth <= 0) {
            return;
        }
        $this->transactionDepth--;
        if ($this->transactionDepth === 0) {
            $this->getPdo()->rollBack();
        } else {
            $this->getPdo()->exec('ROLLBACK TO SAVEPOINT sp_' . $this->transactionDepth);
        }
    }

    /**
     * Execute a closure inside a transaction, auto-committing on success
     * and rolling back on exception.
     *
     * @template T
     * @param callable(): T $callback
     * @return T
     * @throws \Throwable Re-thrown after rollback.
     */
    public function transactional(callable $callback): mixed
    {
        $this->beginTransaction();
        try {
            $result = $callback();
            $this->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Check whether we are currently inside a transaction.
     *
     * @return bool
     */
    public function inTransaction(): bool
    {
        return $this->transactionDepth > 0;
    }

    // ── Query Logging ───────────────────────────────────────────────────────

    /**
     * Log a query execution (if logging is enabled in config).
     *
     * @param string      $sql       The SQL text.
     * @param array       $params    Bind parameters.
     * @param float       $startTime microtime(true) when execution started.
     * @param string|null $error     Error message on failure.
     */
    private function logQuery(string $sql, array $params, float $startTime, ?string $error = null): void
    {
        if (empty($this->config['log_queries'])) {
            return;
        }

        $durationMs = round((microtime(true) - $startTime) * 1000, 2);
        $entry = [
            'sql'         => $sql,
            'params'      => $params,
            'duration_ms' => $durationMs,
            'error'       => $error,
            'timestamp'   => gmdate('Y-m-d\TH:i:s\Z'),
        ];

        $this->queryLog[] = $entry;

        // Write slow queries or errors to file
        $slowMs = $this->config['slow_query_ms'] ?? 500;
        if ($error !== null || $durationMs >= $slowMs) {
            $logFile = $this->config['log_file'] ?? '';
            if ($logFile !== '') {
                $line = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                @file_put_contents($logFile, $line . "\n", FILE_APPEND | LOCK_EX);
            }
        }
    }

    /**
     * Retrieve all logged queries (since last reset).
     *
     * @return array<int, array<string, mixed>>
     */
    public function getQueryLog(): array
    {
        return $this->queryLog;
    }

    /**
     * Clear the in-memory query log.
     */
    public function resetQueryLog(): void
    {
        $this->queryLog = [];
    }

    /**
     * Get the total number of queries executed in this request.
     *
     * @return int
     */
    public function getQueryCount(): int
    {
        return count($this->queryLog);
    }
}
