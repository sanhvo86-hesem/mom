<?php

declare(strict_types=1);

namespace HESEM\QMS\Services;

use RuntimeException;
use InvalidArgumentException;

/**
 * Formula evaluation engine for inter-field and inter-form calculations.
 *
 * Provides safe expression evaluation without PHP eval(). Supports arithmetic
 * operators, comparison operators, and a whitelisted set of aggregate/logic
 * functions: SUM, COUNT, AVG, MIN, MAX, IF, AND, OR, ROUND, ABS, CONCAT.
 *
 * @package HESEM\QMS\Services
 * @since   3.0.0
 */
final class FormulaEngine
{
    /** Whitelisted function names (case-insensitive). */
    private const ALLOWED_FUNCTIONS = [
        'SUM', 'COUNT', 'AVG', 'MIN', 'MAX',
        'IF', 'AND', 'OR', 'NOT',
        'ROUND', 'ABS', 'CEIL', 'FLOOR',
        'CONCAT', 'COALESCE',
    ];

    /** Operator precedence table (higher = binds tighter). */
    private const PRECEDENCE = [
        'OR'  => 1,
        'AND' => 2,
        '='   => 3, '==' => 3, '!=' => 3, '<>' => 3,
        '<'   => 4, '>'  => 4, '<=' => 4, '>=' => 4,
        '+'   => 5, '-'  => 5,
        '*'   => 6, '/'  => 6, '%'  => 6,
    ];

    /** @var string Absolute path to the qms-data directory. */
    private readonly string $dataDir;

    /** @var array<string, array>|null Cached formula definitions. */
    private ?array $formulaDefs = null;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to qms-data directory.
     */
    public function __construct(string $dataDir)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Evaluate a formula string with the given context of field values.
     *
     * @param string              $formula Formula string (e.g. "qty * unit_price").
     * @param array<string, mixed> $context Key-value pairs of field values.
     *
     * @return mixed The calculated result.
     *
     * @throws InvalidArgumentException On syntax errors or disallowed operations.
     */
    public function evaluate(string $formula, array $context): mixed
    {
        $formula = trim($formula);
        if ($formula === '') {
            return null;
        }

        $tokens = $this->tokenize($formula);
        $tokens = $this->resolveVariables($tokens, $context);

        return $this->parseExpression($tokens, 0)[0];
    }

    /**
     * Evaluate all intra-form formulas applicable to a form.
     *
     * Loads formula definitions from `form_builder_formulas.json` and evaluates
     * each formula that applies to the given form code.
     *
     * @param string               $formCode Form code (e.g. "FRM-631").
     * @param array<string, mixed> $data     Current field values.
     *
     * @return array<string, mixed> Computed field values keyed by target field ID.
     */
    public function evaluateFormFormulas(string $formCode, array $data): array
    {
        $defs    = $this->loadFormulaDefs();
        $results = [];

        // Find formulas for this form
        $formDefs = $defs[$formCode] ?? $defs[strtolower($formCode)] ?? [];

        foreach ($formDefs as $def) {
            $targetField = $def['target'] ?? $def['target_field'] ?? null;
            $formula     = $def['formula'] ?? $def['expression'] ?? null;
            if ($targetField === null || $formula === null) {
                continue;
            }

            try {
                // Merge already-computed results into context for chained formulas
                $ctx = array_merge($data, $results);
                $results[$targetField] = $this->evaluate($formula, $ctx);
            } catch (\Throwable $e) {
                $results[$targetField] = [
                    '_error'  => true,
                    'message' => $e->getMessage(),
                    'formula' => $formula,
                ];
            }
        }

        return $results;
    }

    /**
     * Evaluate an inter-form reference by querying submitted form entries.
     *
     * @param string $sourceForm Form code to query (e.g. "FRM-631").
     * @param string $filter     Filter expression (e.g. "status=closed").
     * @param string $aggregate  Aggregate function: COUNT, SUM, AVG, MIN, MAX.
     * @param string $field      Field to aggregate (ignored for COUNT).
     *
     * @return mixed Aggregated result.
     */
    public function evaluateInterFormReference(
        string $sourceForm,
        string $filter,
        string $aggregate,
        string $field = '',
    ): mixed {
        $entries  = $this->loadFormEntries($sourceForm);
        $filtered = $this->applyFilter($entries, $filter);
        $agg      = strtoupper(trim($aggregate));

        return match ($agg) {
            'COUNT' => count($filtered),
            'SUM'   => $this->aggregateField($filtered, $field, 'SUM'),
            'AVG'   => $this->aggregateField($filtered, $field, 'AVG'),
            'MIN'   => $this->aggregateField($filtered, $field, 'MIN'),
            'MAX'   => $this->aggregateField($filtered, $field, 'MAX'),
            default => throw new InvalidArgumentException("Unknown aggregate: {$aggregate}"),
        };
    }

    // ── Tokenizer ───────────────────────────────────────────────────────────

    /**
     * Tokenize a formula string into typed tokens.
     *
     * @param string $formula Raw formula string.
     *
     * @return list<array{type: string, value: mixed}> Token list.
     */
    private function tokenize(string $formula): array
    {
        $tokens = [];
        $len    = strlen($formula);
        $i      = 0;

        while ($i < $len) {
            $ch = $formula[$i];

            // Whitespace
            if (ctype_space($ch)) {
                $i++;
                continue;
            }

            // Number (integer or float)
            if (ctype_digit($ch) || ($ch === '.' && $i + 1 < $len && ctype_digit($formula[$i + 1]))) {
                $num = '';
                $hasDot = false;
                while ($i < $len && (ctype_digit($formula[$i]) || (!$hasDot && $formula[$i] === '.'))) {
                    if ($formula[$i] === '.') {
                        $hasDot = true;
                    }
                    $num .= $formula[$i];
                    $i++;
                }
                $tokens[] = ['type' => 'number', 'value' => $hasDot ? (float) $num : (int) $num];
                continue;
            }

            // String literal (single or double quoted)
            if ($ch === '"' || $ch === "'") {
                $quote = $ch;
                $i++;
                $str = '';
                while ($i < $len && $formula[$i] !== $quote) {
                    if ($formula[$i] === '\\' && $i + 1 < $len) {
                        $i++;
                    }
                    $str .= $formula[$i];
                    $i++;
                }
                $i++; // skip closing quote
                $tokens[] = ['type' => 'string', 'value' => $str];
                continue;
            }

            // Parentheses and comma
            if ($ch === '(') {
                $tokens[] = ['type' => 'lparen', 'value' => '('];
                $i++;
                continue;
            }
            if ($ch === ')') {
                $tokens[] = ['type' => 'rparen', 'value' => ')'];
                $i++;
                continue;
            }
            if ($ch === ',') {
                $tokens[] = ['type' => 'comma', 'value' => ','];
                $i++;
                continue;
            }

            // Two-character operators
            if ($i + 1 < $len) {
                $two = $ch . $formula[$i + 1];
                if (in_array($two, ['<=', '>=', '!=', '<>', '=='], true)) {
                    $tokens[] = ['type' => 'operator', 'value' => $two];
                    $i += 2;
                    continue;
                }
            }

            // Single-character operators
            if (in_array($ch, ['+', '-', '*', '/', '%', '=', '<', '>'], true)) {
                $tokens[] = ['type' => 'operator', 'value' => $ch];
                $i++;
                continue;
            }

            // Identifier (variable name or function name)
            if (ctype_alpha($ch) || $ch === '_') {
                $ident = '';
                while ($i < $len && (ctype_alnum($formula[$i]) || $formula[$i] === '_' || $formula[$i] === '.')) {
                    $ident .= $formula[$i];
                    $i++;
                }

                // Check if it's a boolean literal
                $upper = strtoupper($ident);
                if ($upper === 'TRUE') {
                    $tokens[] = ['type' => 'boolean', 'value' => true];
                } elseif ($upper === 'FALSE') {
                    $tokens[] = ['type' => 'boolean', 'value' => false];
                } elseif ($upper === 'NULL' || $upper === 'NONE') {
                    $tokens[] = ['type' => 'null', 'value' => null];
                } elseif (in_array($upper, self::ALLOWED_FUNCTIONS, true)) {
                    $tokens[] = ['type' => 'function', 'value' => $upper];
                } elseif (in_array($upper, ['AND', 'OR', 'NOT'], true)) {
                    $tokens[] = ['type' => 'operator', 'value' => $upper];
                } else {
                    $tokens[] = ['type' => 'variable', 'value' => $ident];
                }
                continue;
            }

            throw new InvalidArgumentException("Unexpected character '{$ch}' at position {$i}");
        }

        return $tokens;
    }

    /**
     * Replace variable tokens with their resolved values from context.
     *
     * @param list<array{type: string, value: mixed}> $tokens  Token list.
     * @param array<string, mixed>                    $context Field values.
     *
     * @return list<array{type: string, value: mixed}> Resolved tokens.
     */
    private function resolveVariables(array $tokens, array $context): array
    {
        $resolved = [];
        foreach ($tokens as $token) {
            if ($token['type'] === 'variable') {
                $key   = $token['value'];
                $value = $context[$key] ?? $context[strtolower($key)] ?? null;

                if ($value === null) {
                    $resolved[] = ['type' => 'null', 'value' => null];
                } elseif (is_bool($value)) {
                    $resolved[] = ['type' => 'boolean', 'value' => $value];
                } elseif (is_int($value) || is_float($value)) {
                    $resolved[] = ['type' => 'number', 'value' => $value];
                } else {
                    // Try to parse numeric strings
                    if (is_string($value) && is_numeric($value)) {
                        $resolved[] = ['type' => 'number', 'value' => str_contains($value, '.') ? (float) $value : (int) $value];
                    } else {
                        $resolved[] = ['type' => 'string', 'value' => (string) $value];
                    }
                }
            } else {
                $resolved[] = $token;
            }
        }

        return $resolved;
    }

    // ── Recursive Descent Parser ────────────────────────────────────────────

    /**
     * Parse an expression using recursive descent with operator precedence.
     *
     * @param list<array{type: string, value: mixed}> $tokens Token list.
     * @param int                                      $pos    Current position.
     * @param int                                      $minPrec Minimum precedence.
     *
     * @return array{0: mixed, 1: int} [result, new_position]
     */
    private function parseExpression(array $tokens, int $pos, int $minPrec = 0): array
    {
        [$left, $pos] = $this->parsePrimary($tokens, $pos);

        while ($pos < count($tokens)) {
            $token = $tokens[$pos];
            if ($token['type'] !== 'operator') {
                break;
            }

            $op   = $token['value'];
            $prec = self::PRECEDENCE[$op] ?? null;
            if ($prec === null || $prec < $minPrec) {
                break;
            }

            $pos++;
            [$right, $pos] = $this->parseExpression($tokens, $pos, $prec + 1);
            $left = $this->applyOperator($op, $left, $right);
        }

        return [$left, $pos];
    }

    /**
     * Parse a primary value: number, string, boolean, null, function call,
     * or parenthesized expression.
     *
     * @return array{0: mixed, 1: int}
     */
    private function parsePrimary(array $tokens, int $pos): array
    {
        if ($pos >= count($tokens)) {
            throw new InvalidArgumentException('Unexpected end of formula');
        }

        $token = $tokens[$pos];

        // Unary minus
        if ($token['type'] === 'operator' && $token['value'] === '-') {
            [$value, $pos] = $this->parsePrimary($tokens, $pos + 1);
            return [-$this->toNumber($value), $pos];
        }

        // Unary NOT
        if ($token['type'] === 'operator' && strtoupper((string) $token['value']) === 'NOT') {
            [$value, $pos] = $this->parsePrimary($tokens, $pos + 1);
            return [!$this->toBool($value), $pos];
        }

        // Literal values
        if (in_array($token['type'], ['number', 'string', 'boolean', 'null'], true)) {
            return [$token['value'], $pos + 1];
        }

        // Function call
        if ($token['type'] === 'function') {
            return $this->parseFunctionCall($tokens, $pos);
        }

        // Parenthesized expression
        if ($token['type'] === 'lparen') {
            [$value, $pos] = $this->parseExpression($tokens, $pos + 1, 0);
            if ($pos < count($tokens) && $tokens[$pos]['type'] === 'rparen') {
                $pos++;
            }
            return [$value, $pos];
        }

        throw new InvalidArgumentException("Unexpected token: {$token['type']} = {$token['value']}");
    }

    /**
     * Parse a function call: FUNC(arg1, arg2, ...).
     *
     * @return array{0: mixed, 1: int}
     */
    private function parseFunctionCall(array $tokens, int $pos): array
    {
        $funcName = $tokens[$pos]['value'];
        $pos++;

        // Expect '('
        if ($pos >= count($tokens) || $tokens[$pos]['type'] !== 'lparen') {
            throw new InvalidArgumentException("Expected '(' after function {$funcName}");
        }
        $pos++;

        // Parse arguments
        $args = [];
        if ($pos < count($tokens) && $tokens[$pos]['type'] !== 'rparen') {
            [$arg, $pos] = $this->parseExpression($tokens, $pos, 0);
            $args[] = $arg;

            while ($pos < count($tokens) && $tokens[$pos]['type'] === 'comma') {
                $pos++;
                [$arg, $pos] = $this->parseExpression($tokens, $pos, 0);
                $args[] = $arg;
            }
        }

        // Expect ')'
        if ($pos < count($tokens) && $tokens[$pos]['type'] === 'rparen') {
            $pos++;
        }

        $result = $this->callFunction($funcName, $args);

        return [$result, $pos];
    }

    // ── Function dispatch ───────────────────────────────────────────────────

    /**
     * Execute a whitelisted function with given arguments.
     *
     * @param string       $name Function name (uppercase).
     * @param list<mixed>  $args Evaluated arguments.
     *
     * @return mixed Function result.
     */
    private function callFunction(string $name, array $args): mixed
    {
        return match ($name) {
            'SUM'      => $this->fnSum($args),
            'COUNT'    => count($args),
            'AVG'      => $this->fnAvg($args),
            'MIN'      => $this->fnMin($args),
            'MAX'      => $this->fnMax($args),
            'IF'       => $this->fnIf($args),
            'AND'      => $this->fnAnd($args),
            'OR'       => $this->fnOr($args),
            'NOT'      => !$this->toBool($args[0] ?? false),
            'ROUND'    => round($this->toNumber($args[0] ?? 0), (int) ($args[1] ?? 0)),
            'ABS'      => abs($this->toNumber($args[0] ?? 0)),
            'CEIL'     => (int) ceil($this->toNumber($args[0] ?? 0)),
            'FLOOR'    => (int) floor($this->toNumber($args[0] ?? 0)),
            'CONCAT'   => implode('', array_map(fn($a) => (string) ($a ?? ''), $args)),
            'COALESCE' => $this->fnCoalesce($args),
            default    => throw new InvalidArgumentException("Unknown function: {$name}"),
        };
    }

    private function fnSum(array $args): float|int
    {
        $sum = 0;
        foreach ($args as $a) {
            $sum += $this->toNumber($a);
        }
        return $sum;
    }

    private function fnAvg(array $args): float|int
    {
        if (count($args) === 0) {
            return 0;
        }
        return $this->fnSum($args) / count($args);
    }

    private function fnMin(array $args): float|int
    {
        if (count($args) === 0) {
            return 0;
        }
        $nums = array_map(fn($a) => $this->toNumber($a), $args);
        return min($nums);
    }

    private function fnMax(array $args): float|int
    {
        if (count($args) === 0) {
            return 0;
        }
        $nums = array_map(fn($a) => $this->toNumber($a), $args);
        return max($nums);
    }

    /**
     * IF(condition, trueValue, falseValue)
     */
    private function fnIf(array $args): mixed
    {
        $condition  = $this->toBool($args[0] ?? false);
        $trueValue  = $args[1] ?? null;
        $falseValue = $args[2] ?? null;

        return $condition ? $trueValue : $falseValue;
    }

    private function fnAnd(array $args): bool
    {
        foreach ($args as $a) {
            if (!$this->toBool($a)) {
                return false;
            }
        }
        return true;
    }

    private function fnOr(array $args): bool
    {
        foreach ($args as $a) {
            if ($this->toBool($a)) {
                return true;
            }
        }
        return false;
    }

    private function fnCoalesce(array $args): mixed
    {
        foreach ($args as $a) {
            if ($a !== null && $a !== '') {
                return $a;
            }
        }
        return null;
    }

    // ── Operator application ────────────────────────────────────────────────

    /**
     * Apply a binary operator to two operands.
     */
    private function applyOperator(string $op, mixed $left, mixed $right): mixed
    {
        return match ($op) {
            '+'         => $this->toNumber($left) + $this->toNumber($right),
            '-'         => $this->toNumber($left) - $this->toNumber($right),
            '*'         => $this->toNumber($left) * $this->toNumber($right),
            '/'         => $this->safeDivide($left, $right),
            '%'         => $this->safeMod($left, $right),
            '=', '=='   => $left == $right,
            '!=', '<>'   => $left != $right,
            '<'         => $this->toNumber($left) < $this->toNumber($right),
            '>'         => $this->toNumber($left) > $this->toNumber($right),
            '<='        => $this->toNumber($left) <= $this->toNumber($right),
            '>='        => $this->toNumber($left) >= $this->toNumber($right),
            'AND'       => $this->toBool($left) && $this->toBool($right),
            'OR'        => $this->toBool($left) || $this->toBool($right),
            default     => throw new InvalidArgumentException("Unknown operator: {$op}"),
        };
    }

    private function safeDivide(mixed $left, mixed $right): float|int
    {
        $r = $this->toNumber($right);
        if ($r == 0) {
            return 0; // Safe division by zero
        }
        return $this->toNumber($left) / $r;
    }

    private function safeMod(mixed $left, mixed $right): float|int
    {
        $r = $this->toNumber($right);
        if ($r == 0) {
            return 0;
        }
        return $this->toNumber($left) % $r;
    }

    // ── Type coercion ───────────────────────────────────────────────────────

    /**
     * Coerce a value to a numeric type.
     */
    private function toNumber(mixed $value): float|int
    {
        if (is_int($value) || is_float($value)) {
            return $value;
        }
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_string($value) && is_numeric($value)) {
            return str_contains($value, '.') ? (float) $value : (int) $value;
        }
        return 0;
    }

    /**
     * Coerce a value to boolean.
     */
    private function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value) || is_float($value)) {
            return $value != 0;
        }
        if (is_string($value)) {
            return $value !== '' && strtoupper($value) !== 'FALSE' && $value !== '0';
        }
        return $value !== null;
    }

    // ── Data loading ────────────────────────────────────────────────────────

    /**
     * Load formula definitions from config.
     *
     * @return array<string, list<array{target: string, formula: string}>>
     */
    private function loadFormulaDefs(): array
    {
        if ($this->formulaDefs !== null) {
            return $this->formulaDefs;
        }

        $path = $this->dataDir . '/config/form_builder_formulas.json';
        if (!is_file($path)) {
            $this->formulaDefs = [];
            return [];
        }

        $json = file_get_contents($path);
        if ($json === false) {
            $this->formulaDefs = [];
            return [];
        }

        try {
            $decoded = json_decode($json, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            $this->formulaDefs = [];
            return [];
        }

        $this->formulaDefs = is_array($decoded) ? $decoded : [];
        return $this->formulaDefs;
    }

    /**
     * Load submitted form entries for inter-form queries.
     *
     * @param string $formCode Form code to load entries for.
     *
     * @return list<array<string, mixed>> List of entry records.
     */
    private function loadFormEntries(string $formCode): array
    {
        // Try form-specific submission file
        $code = strtolower(str_replace('-', '_', $formCode));
        $paths = [
            $this->dataDir . "/submissions/{$code}.json",
            $this->dataDir . "/submissions/{$formCode}.json",
            $this->dataDir . '/submissions/all_submissions.json',
        ];

        foreach ($paths as $path) {
            if (!is_file($path)) {
                continue;
            }
            $json = file_get_contents($path);
            if ($json === false) {
                continue;
            }
            try {
                $decoded = json_decode($json, true, 64, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                continue;
            }

            // If it's the global file, filter by form code
            if (str_contains($path, 'all_submissions')) {
                return array_values(array_filter(
                    is_array($decoded) ? $decoded : [],
                    fn(array $e): bool => ($e['form_code'] ?? '') === $formCode,
                ));
            }

            return is_array($decoded) ? array_values($decoded) : [];
        }

        return [];
    }

    /**
     * Filter form entries by a simple filter expression.
     *
     * Supports: "field=value", "field!=value", "field>value", "field<value"
     * and compound filters joined by " AND " (case-insensitive).
     *
     * @param list<array<string, mixed>> $entries Entries to filter.
     * @param string                     $filter  Filter expression.
     *
     * @return list<array<string, mixed>> Filtered entries.
     */
    private function applyFilter(array $entries, string $filter): array
    {
        $filter = trim($filter);
        if ($filter === '' || $filter === '*') {
            return $entries;
        }

        // Split compound filters on AND
        $parts = preg_split('/\s+AND\s+/i', $filter);
        if ($parts === false) {
            return $entries;
        }

        $conditions = [];
        foreach ($parts as $part) {
            $part = trim($part);
            if (preg_match('/^(\w+)\s*(!=|<>|<=|>=|=|<|>)\s*(.+)$/', $part, $m)) {
                $conditions[] = [
                    'field' => $m[1],
                    'op'    => $m[2],
                    'value' => trim($m[3], " \t\n\r\0\x0B\"'"),
                ];
            }
        }

        if (count($conditions) === 0) {
            return $entries;
        }

        return array_values(array_filter($entries, function (array $entry) use ($conditions): bool {
            foreach ($conditions as $cond) {
                $actual = $entry[$cond['field']] ?? null;
                $expected = $cond['value'];

                $match = match ($cond['op']) {
                    '='         => (string) $actual === $expected,
                    '!=', '<>'  => (string) $actual !== $expected,
                    '>'         => is_numeric($actual) && $actual > (float) $expected,
                    '<'         => is_numeric($actual) && $actual < (float) $expected,
                    '>='        => is_numeric($actual) && $actual >= (float) $expected,
                    '<='        => is_numeric($actual) && $actual <= (float) $expected,
                    default     => false,
                };

                if (!$match) {
                    return false;
                }
            }
            return true;
        }));
    }

    /**
     * Apply an aggregate function over a specific field in a set of entries.
     *
     * @param list<array<string, mixed>> $entries Filtered entries.
     * @param string                     $field   Field name to aggregate.
     * @param string                     $agg     Aggregate: SUM, AVG, MIN, MAX.
     *
     * @return float|int Aggregated result.
     */
    private function aggregateField(array $entries, string $field, string $agg): float|int
    {
        $values = [];
        foreach ($entries as $entry) {
            $val = $entry[$field] ?? null;
            if ($val !== null && is_numeric($val)) {
                $values[] = (float) $val;
            }
        }

        if (count($values) === 0) {
            return 0;
        }

        return match ($agg) {
            'SUM' => array_sum($values),
            'AVG' => array_sum($values) / count($values),
            'MIN' => min($values),
            'MAX' => max($values),
            default => 0,
        };
    }
}
