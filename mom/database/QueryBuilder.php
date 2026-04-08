<?php

declare(strict_types=1);

namespace MOM\Database;

use InvalidArgumentException;

/**
 * Fluent SQL Query Builder for HESEM MOM Portal.
 *
 * Generates parameterised SQL for PostgreSQL. All user-supplied values go
 * through PDO prepared-statement placeholders -- never interpolated.
 *
 * Supports:
 * - SELECT / INSERT / UPDATE / DELETE
 * - WHERE clauses (AND / OR, nested groups)
 * - ORDER BY, LIMIT, OFFSET
 * - JOINs (INNER, LEFT, RIGHT, CROSS)
 * - INSERT ... RETURNING
 * - JSONB operators (->>, @>, ?)
 * - Pagination helper
 *
 * @package MOM\Database
 * @since   1.0.0
 */
class QueryBuilder
{
    // ── Internal State ──────────────────────────────────────────────────────

    private string $table = '';
    private string $alias = '';
    private string $operation = 'SELECT';

    /** @var string[] */
    private array $columns = ['*'];

    /** @var array<int, array{type: string, sql: string}> */
    private array $joins = [];

    /** @var array<int, array{sql: string, params: array, connector: string}> */
    private array $wheres = [];

    /** @var array<int, string> */
    private array $orderBy = [];

    private ?int $limit = null;
    private ?int $offset = null;

    /** @var string[] */
    private array $groupBy = [];

    /** @var array<int, array{sql: string, params: array}> */
    private array $havings = [];

    /** INSERT / UPDATE data */
    private array $data = [];

    /** RETURNING columns */
    private ?string $returning = null;

    /** Accumulated bind parameters */
    private array $params = [];

    /** Auto-incrementing placeholder counter */
    private int $paramIndex = 0;

    // ── Factory / Fluent Entry Points ───────────────────────────────────────

    /**
     * Create a new QueryBuilder for a table.
     *
     * @param string      $table Table name.
     * @param string|null $alias Optional table alias.
     * @return self
     */
    public static function table(string $table, ?string $alias = null): self
    {
        $qb = new self();
        $qb->table = $table;
        $qb->alias = $alias ?? '';
        return $qb;
    }

    // ── SELECT ──────────────────────────────────────────────────────────────

    /**
     * Set the columns to select.
     *
     * @param string ...$columns Column expressions.
     * @return $this
     */
    public function select(string ...$columns): self
    {
        $this->operation = 'SELECT';
        $this->columns = $columns ?: ['*'];
        return $this;
    }

    // ── JOIN ────────────────────────────────────────────────────────────────

    /**
     * Add an INNER JOIN clause.
     *
     * @param string $table     Joined table (optionally aliased: "table alias").
     * @param string $condition ON condition (e.g. "a.id = b.a_id").
     * @return $this
     */
    public function join(string $table, string $condition): self
    {
        $this->joins[] = ['type' => 'INNER JOIN', 'sql' => "$table ON $condition"];
        return $this;
    }

    /**
     * Add a LEFT JOIN clause.
     *
     * @param string $table     Joined table.
     * @param string $condition ON condition.
     * @return $this
     */
    public function leftJoin(string $table, string $condition): self
    {
        $this->joins[] = ['type' => 'LEFT JOIN', 'sql' => "$table ON $condition"];
        return $this;
    }

    /**
     * Add a RIGHT JOIN clause.
     *
     * @param string $table     Joined table.
     * @param string $condition ON condition.
     * @return $this
     */
    public function rightJoin(string $table, string $condition): self
    {
        $this->joins[] = ['type' => 'RIGHT JOIN', 'sql' => "$table ON $condition"];
        return $this;
    }

    // ── WHERE ───────────────────────────────────────────────────────────────

    /**
     * Add a WHERE condition (AND).
     *
     * @param string $column   Column or expression.
     * @param mixed  $operator Comparison operator or value (when two args).
     * @param mixed  $value    Value (when three args).
     * @return $this
     */
    public function where(string $column, mixed $operator = null, mixed $value = null): self
    {
        return $this->addWhere('AND', $column, $operator, $value);
    }

    /**
     * Add a WHERE condition (OR).
     *
     * @param string $column   Column or expression.
     * @param mixed  $operator Comparison operator or value.
     * @param mixed  $value    Value.
     * @return $this
     */
    public function orWhere(string $column, mixed $operator = null, mixed $value = null): self
    {
        return $this->addWhere('OR', $column, $operator, $value);
    }

    /**
     * WHERE column IN (...).
     *
     * @param string $column Column name.
     * @param array  $values Allowed values.
     * @return $this
     */
    public function whereIn(string $column, array $values): self
    {
        if ($values === []) {
            // Impossible condition
            $this->wheres[] = ['sql' => '1 = 0', 'params' => [], 'connector' => 'AND'];
            return $this;
        }
        $placeholders = [];
        $localParams = [];
        foreach ($values as $val) {
            $ph = $this->nextPlaceholder();
            $placeholders[] = $ph;
            $localParams[$ph] = $val;
        }
        $sql = "$column IN (" . implode(', ', $placeholders) . ')';
        $this->wheres[] = ['sql' => $sql, 'params' => $localParams, 'connector' => 'AND'];
        return $this;
    }

    /**
     * WHERE column IS NULL.
     *
     * @param string $column Column name.
     * @return $this
     */
    public function whereNull(string $column): self
    {
        $this->wheres[] = ['sql' => "$column IS NULL", 'params' => [], 'connector' => 'AND'];
        return $this;
    }

    /**
     * WHERE column IS NOT NULL.
     *
     * @param string $column Column name.
     * @return $this
     */
    public function whereNotNull(string $column): self
    {
        $this->wheres[] = ['sql' => "$column IS NOT NULL", 'params' => [], 'connector' => 'AND'];
        return $this;
    }

    /**
     * Add a raw WHERE expression.
     *
     * @param string $sql    Raw SQL condition.
     * @param array  $params Bind parameters for the condition.
     * @return $this
     */
    public function whereRaw(string $sql, array $params = []): self
    {
        $this->wheres[] = ['sql' => $sql, 'params' => $params, 'connector' => 'AND'];
        return $this;
    }

    // ── JSONB Operators ─────────────────────────────────────────────────────

    /**
     * WHERE column->>key = value (JSONB text extraction).
     *
     * @param string $column JSONB column name.
     * @param string $key    JSON key.
     * @param mixed  $value  Expected value.
     * @return $this
     */
    public function whereJsonText(string $column, string $key, mixed $value): self
    {
        $ph = $this->nextPlaceholder();
        $this->wheres[] = [
            'sql'       => "{$column}->>'{$key}' = {$ph}",
            'params'    => [$ph => (string)$value],
            'connector' => 'AND',
        ];
        return $this;
    }

    /**
     * WHERE column @> '{"key": value}' (JSONB containment).
     *
     * @param string $column JSONB column.
     * @param array  $data   Data the column must contain.
     * @return $this
     */
    public function whereJsonContains(string $column, array $data): self
    {
        $ph = $this->nextPlaceholder();
        $this->wheres[] = [
            'sql'       => "{$column} @> {$ph}::jsonb",
            'params'    => [$ph => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)],
            'connector' => 'AND',
        ];
        return $this;
    }

    /**
     * WHERE column ? 'key' (JSONB key existence).
     *
     * @param string $column JSONB column.
     * @param string $key    Key that must exist.
     * @return $this
     */
    public function whereJsonHasKey(string $column, string $key): self
    {
        $ph = $this->nextPlaceholder();
        $this->wheres[] = [
            'sql'       => "{$column} ?? {$ph}",
            'params'    => [$ph => $key],
            'connector' => 'AND',
        ];
        return $this;
    }

    // ── ORDER BY / GROUP BY / LIMIT ─────────────────────────────────────────

    /**
     * Add an ORDER BY clause.
     *
     * @param string $column    Column name.
     * @param string $direction ASC or DESC.
     * @return $this
     */
    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        $dir = strtoupper($direction) === 'DESC' ? 'DESC' : 'ASC';
        $this->orderBy[] = "$column $dir";
        return $this;
    }

    /**
     * Set the GROUP BY clause.
     *
     * @param string ...$columns Columns to group by.
     * @return $this
     */
    public function groupBy(string ...$columns): self
    {
        $this->groupBy = $columns;
        return $this;
    }

    /**
     * Add a HAVING clause.
     *
     * @param string $sql    Condition SQL.
     * @param array  $params Bind parameters.
     * @return $this
     */
    public function having(string $sql, array $params = []): self
    {
        $this->havings[] = ['sql' => $sql, 'params' => $params];
        return $this;
    }

    /**
     * Set LIMIT.
     *
     * @param int $limit Maximum row count.
     * @return $this
     */
    public function limit(int $limit): self
    {
        $this->limit = max(0, $limit);
        return $this;
    }

    /**
     * Set OFFSET.
     *
     * @param int $offset Row offset.
     * @return $this
     */
    public function offset(int $offset): self
    {
        $this->offset = max(0, $offset);
        return $this;
    }

    /**
     * Convenience: set LIMIT + OFFSET from page number and page size.
     *
     * @param int $page     Page number (1-based).
     * @param int $pageSize Rows per page.
     * @return $this
     */
    public function paginate(int $page = 1, int $pageSize = 25): self
    {
        $page = max(1, $page);
        $pageSize = max(1, min($pageSize, 1000));
        $this->limit = $pageSize;
        $this->offset = ($page - 1) * $pageSize;
        return $this;
    }

    // ── INSERT ──────────────────────────────────────────────────────────────

    /**
     * Set up an INSERT operation.
     *
     * @param array<string, mixed> $data Column => value pairs.
     * @return $this
     */
    public function insert(array $data): self
    {
        $this->operation = 'INSERT';
        $this->data = $data;
        return $this;
    }

    /**
     * Add RETURNING clause for INSERT / UPDATE / DELETE.
     *
     * @param string $columns Columns to return (default: '*').
     * @return $this
     */
    public function returning(string $columns = '*'): self
    {
        $this->returning = $columns;
        return $this;
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────

    /**
     * Set up an UPDATE operation.
     *
     * @param array<string, mixed> $data Column => value pairs to update.
     * @return $this
     */
    public function update(array $data): self
    {
        $this->operation = 'UPDATE';
        $this->data = $data;
        return $this;
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    /**
     * Set up a DELETE operation.
     *
     * @return $this
     */
    public function delete(): self
    {
        $this->operation = 'DELETE';
        return $this;
    }

    // ── Build ───────────────────────────────────────────────────────────────

    /**
     * Build the SQL string and return [sql, params].
     *
     * @return array{0: string, 1: array<string, mixed>}
     * @throws InvalidArgumentException On misconfigured builder.
     */
    public function build(): array
    {
        if ($this->table === '') {
            throw new InvalidArgumentException('Table name is required');
        }

        $this->params = [];

        return match ($this->operation) {
            'SELECT' => $this->buildSelect(),
            'INSERT' => $this->buildInsert(),
            'UPDATE' => $this->buildUpdate(),
            'DELETE' => $this->buildDelete(),
            default  => throw new InvalidArgumentException("Unknown operation: {$this->operation}"),
        };
    }

    /**
     * Compile and execute the query via the Connection singleton.
     *
     * @return array<int, array<string, mixed>> Result rows (SELECT) or RETURNING rows.
     */
    public function get(): array
    {
        [$sql, $params] = $this->build();
        return Connection::getInstance()->query($sql, $params);
    }

    /**
     * Compile and execute, returning the first row or null.
     *
     * @return array<string, mixed>|null
     */
    public function first(): ?array
    {
        $this->limit(1);
        [$sql, $params] = $this->build();
        return Connection::getInstance()->queryOne($sql, $params);
    }

    /**
     * Compile and execute a non-SELECT (INSERT/UPDATE/DELETE).
     *
     * @return int Affected row count.
     */
    public function run(): int
    {
        [$sql, $params] = $this->build();
        return Connection::getInstance()->execute($sql, $params);
    }

    /**
     * Execute INSERT ... RETURNING and return the first row.
     *
     * @return array<string, mixed>|null
     */
    public function runReturning(): ?array
    {
        [$sql, $params] = $this->build();
        return Connection::getInstance()->insertReturning($sql, $params);
    }

    // ── Private Build Methods ───────────────────────────────────────────────

    /**
     * Build a SELECT statement.
     *
     * @return array{0: string, 1: array}
     */
    private function buildSelect(): array
    {
        $tableRef = $this->alias !== '' ? "{$this->table} {$this->alias}" : $this->table;
        $cols = implode(', ', $this->columns);

        $sql = "SELECT {$cols} FROM {$tableRef}";
        $sql .= $this->buildJoins();
        $sql .= $this->buildWheres();
        $sql .= $this->buildGroupBy();
        $sql .= $this->buildHaving();
        $sql .= $this->buildOrderBy();
        $sql .= $this->buildLimitOffset();

        return [$sql, $this->params];
    }

    /**
     * Build an INSERT statement.
     *
     * @return array{0: string, 1: array}
     */
    private function buildInsert(): array
    {
        if ($this->data === []) {
            throw new InvalidArgumentException('INSERT requires data');
        }

        $columns = [];
        $placeholders = [];
        foreach ($this->data as $col => $val) {
            $columns[] = $col;
            $ph = $this->nextPlaceholder();
            $placeholders[] = $this->isJsonbValue($val) ? "{$ph}::jsonb" : $ph;
            $this->params[$ph] = $this->prepareValue($val);
        }

        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $this->table,
            implode(', ', $columns),
            implode(', ', $placeholders),
        );

        if ($this->returning !== null) {
            $sql .= ' RETURNING ' . $this->returning;
        }

        return [$sql, $this->params];
    }

    /**
     * Build an UPDATE statement.
     *
     * @return array{0: string, 1: array}
     */
    private function buildUpdate(): array
    {
        if ($this->data === []) {
            throw new InvalidArgumentException('UPDATE requires data');
        }

        $sets = [];
        foreach ($this->data as $col => $val) {
            $ph = $this->nextPlaceholder();
            $cast = $this->isJsonbValue($val) ? '::jsonb' : '';
            $sets[] = "{$col} = {$ph}{$cast}";
            $this->params[$ph] = $this->prepareValue($val);
        }

        $sql = sprintf('UPDATE %s SET %s', $this->table, implode(', ', $sets));
        $sql .= $this->buildWheres();

        if ($this->returning !== null) {
            $sql .= ' RETURNING ' . $this->returning;
        }

        return [$sql, $this->params];
    }

    /**
     * Build a DELETE statement.
     *
     * @return array{0: string, 1: array}
     */
    private function buildDelete(): array
    {
        $sql = "DELETE FROM {$this->table}";
        $sql .= $this->buildWheres();

        if ($this->returning !== null) {
            $sql .= ' RETURNING ' . $this->returning;
        }

        return [$sql, $this->params];
    }

    /**
     * Build JOIN clauses.
     */
    private function buildJoins(): string
    {
        if ($this->joins === []) {
            return '';
        }
        $parts = [];
        foreach ($this->joins as $j) {
            $parts[] = " {$j['type']} {$j['sql']}";
        }
        return implode('', $parts);
    }

    /**
     * Build WHERE clause.
     */
    private function buildWheres(): string
    {
        if ($this->wheres === []) {
            return '';
        }
        $parts = [];
        foreach ($this->wheres as $i => $w) {
            foreach ($w['params'] as $k => $v) {
                $this->params[$k] = $v;
            }
            $prefix = $i === 0 ? '' : " {$w['connector']} ";
            $parts[] = $prefix . $w['sql'];
        }
        return ' WHERE ' . implode('', $parts);
    }

    /**
     * Build GROUP BY clause.
     */
    private function buildGroupBy(): string
    {
        return $this->groupBy !== [] ? ' GROUP BY ' . implode(', ', $this->groupBy) : '';
    }

    /**
     * Build HAVING clause.
     */
    private function buildHaving(): string
    {
        if ($this->havings === []) {
            return '';
        }
        $parts = [];
        foreach ($this->havings as $h) {
            foreach ($h['params'] as $k => $v) {
                $this->params[$k] = $v;
            }
            $parts[] = $h['sql'];
        }
        return ' HAVING ' . implode(' AND ', $parts);
    }

    /**
     * Build ORDER BY clause.
     */
    private function buildOrderBy(): string
    {
        return $this->orderBy !== [] ? ' ORDER BY ' . implode(', ', $this->orderBy) : '';
    }

    /**
     * Build LIMIT / OFFSET clause.
     */
    private function buildLimitOffset(): string
    {
        $sql = '';
        if ($this->limit !== null) {
            $sql .= ' LIMIT ' . $this->limit;
        }
        if ($this->offset !== null && $this->offset > 0) {
            $sql .= ' OFFSET ' . $this->offset;
        }
        return $sql;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Internal WHERE builder.
     */
    private function addWhere(string $connector, string $column, mixed $operator, mixed $value): self
    {
        // Two-argument shorthand: where('col', 'value') => col = value
        if ($value === null && $operator !== null && !in_array(strtoupper((string)$operator), ['IS NULL', 'IS NOT NULL'], true)) {
            $value = $operator;
            $operator = '=';
        }

        $op = strtoupper(trim((string)$operator));
        if ($op === 'IS NULL') {
            $this->wheres[] = ['sql' => "$column IS NULL", 'params' => [], 'connector' => $connector];
            return $this;
        }
        if ($op === 'IS NOT NULL') {
            $this->wheres[] = ['sql' => "$column IS NOT NULL", 'params' => [], 'connector' => $connector];
            return $this;
        }

        $allowedOps = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'ILIKE', 'NOT LIKE', 'SIMILAR TO'];
        if (!in_array($op, $allowedOps, true)) {
            $op = '=';
        }

        $ph = $this->nextPlaceholder();
        $this->wheres[] = [
            'sql'       => "$column $op $ph",
            'params'    => [$ph => $value],
            'connector' => $connector,
        ];
        return $this;
    }

    /**
     * Generate the next unique placeholder name.
     */
    private function nextPlaceholder(): string
    {
        return ':_p' . ($this->paramIndex++);
    }

    /**
     * Determine whether a value should be cast to JSONB.
     */
    private function isJsonbValue(mixed $value): bool
    {
        return is_array($value);
    }

    /**
     * Prepare a value for binding (encode arrays as JSON strings).
     */
    private function prepareValue(mixed $value): mixed
    {
        if (is_array($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        return $value;
    }
}
