<?php

declare(strict_types=1);

namespace MOM\Api\Validators;

/**
 * Validates form submissions against JSON Schema definitions from form_schemas.
 *
 * Supports cross-field validation rules, required field checking,
 * type coercion, and bilingual error messages (EN/VI).
 *
 * @package MOM\Api\Validators
 * @since   2.0.0
 */
class FormValidator
{
    /** @var array<string, string> Bilingual error messages. */
    private const MESSAGES = [
        'required'       => 'Field "%s" is required / Truong "%s" la bat buoc',
        'type_string'    => 'Field "%s" must be text / Truong "%s" phai la van ban',
        'type_number'    => 'Field "%s" must be a number / Truong "%s" phai la so',
        'type_integer'   => 'Field "%s" must be an integer / Truong "%s" phai la so nguyen',
        'type_boolean'   => 'Field "%s" must be true/false / Truong "%s" phai la dung/sai',
        'type_array'     => 'Field "%s" must be a list / Truong "%s" phai la danh sach',
        'type_object'    => 'Field "%s" must be an object / Truong "%s" phai la doi tuong',
        'min_length'     => 'Field "%s" must be at least %d characters / Truong "%s" phai co it nhat %d ky tu',
        'max_length'     => 'Field "%s" must not exceed %d characters / Truong "%s" khong duoc vuot qua %d ky tu',
        'minimum'        => 'Field "%s" must be at least %s / Truong "%s" phai it nhat la %s',
        'maximum'        => 'Field "%s" must not exceed %s / Truong "%s" khong duoc vuot qua %s',
        'pattern'        => 'Field "%s" does not match the required format / Truong "%s" khong dung dinh dang',
        'enum'           => 'Field "%s" must be one of: %s / Truong "%s" phai la mot trong: %s',
        'cross_field'    => 'Cross-field validation failed: %s / Kiem tra lien truong that bai: %s',
    ];

    /** @var list<array{field: string, message: string}> Collected errors. */
    private array $errors = [];

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Validate form data against a JSON Schema.
     *
     * @param array      $data   The submitted form data.
     * @param array      $schema The JSON Schema definition.
     * @param array|null $uiHints Optional UI schema with cross-field rules.
     * @return array{valid: bool, errors: list<array{field: string, message: string}>, coerced: array}
     */
    public function validate(array $data, array $schema, ?array $uiHints = null): array
    {
        $this->errors = [];

        // Type coercion pass
        $coerced = $this->coerce($data, $schema);

        // Required fields
        $required = $schema['required'] ?? [];
        if (is_array($required)) {
            foreach ($required as $field) {
                $field = (string)$field;
                if (!array_key_exists($field, $coerced) || $this->isEmpty($coerced[$field])) {
                    $this->addError($field, sprintf(self::MESSAGES['required'], $field, $field));
                }
            }
        }

        // Per-property validation
        $properties = $schema['properties'] ?? [];
        if (is_array($properties)) {
            foreach ($properties as $fieldName => $fieldSchema) {
                if (!is_array($fieldSchema)) continue;
                $fieldName = (string)$fieldName;
                if (!array_key_exists($fieldName, $coerced)) continue;

                $this->validateField($fieldName, $coerced[$fieldName], $fieldSchema);
            }
        }

        // Cross-field validation
        if (is_array($uiHints) && isset($uiHints['cross_field_rules'])) {
            $this->validateCrossField($coerced, $uiHints['cross_field_rules']);
        }

        return [
            'valid'   => empty($this->errors),
            'errors'  => $this->errors,
            'coerced' => $coerced,
        ];
    }

    /**
     * Get formatted error messages suitable for API response.
     *
     * @return list<array{field: string, message: string}>
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    // ── Internal ────────────────────────────────────────────────────────────

    /**
     * Validate a single field against its schema.
     *
     * @param string $field  Field name.
     * @param mixed  $value  Field value.
     * @param array  $schema Field schema.
     * @return void
     */
    private function validateField(string $field, mixed $value, array $schema): void
    {
        if ($this->isEmpty($value) && !in_array($field, $schema['required'] ?? [], true)) {
            return; // Optional field with no value
        }

        // Type check
        $type = $schema['type'] ?? null;
        if ($type !== null && !$this->isEmpty($value)) {
            $this->checkType($field, $value, (string)$type);
        }

        // String constraints
        if (is_string($value)) {
            if (isset($schema['minLength']) && mb_strlen($value) < (int)$schema['minLength']) {
                $this->addError($field, sprintf(self::MESSAGES['min_length'], $field, (int)$schema['minLength'], $field, (int)$schema['minLength']));
            }
            if (isset($schema['maxLength']) && mb_strlen($value) > (int)$schema['maxLength']) {
                $this->addError($field, sprintf(self::MESSAGES['max_length'], $field, (int)$schema['maxLength'], $field, (int)$schema['maxLength']));
            }
            if (isset($schema['pattern']) && !preg_match('/' . $schema['pattern'] . '/', $value)) {
                $this->addError($field, sprintf(self::MESSAGES['pattern'], $field, $field));
            }
        }

        // Numeric constraints
        if (is_numeric($value)) {
            $numVal = (float)$value;
            if (isset($schema['minimum']) && $numVal < (float)$schema['minimum']) {
                $this->addError($field, sprintf(self::MESSAGES['minimum'], $field, $schema['minimum'], $field, $schema['minimum']));
            }
            if (isset($schema['maximum']) && $numVal > (float)$schema['maximum']) {
                $this->addError($field, sprintf(self::MESSAGES['maximum'], $field, $schema['maximum'], $field, $schema['maximum']));
            }
        }

        // Enum
        if (isset($schema['enum']) && is_array($schema['enum'])) {
            if (!in_array($value, $schema['enum'], true)) {
                $enumList = implode(', ', array_map('strval', $schema['enum']));
                $this->addError($field, sprintf(self::MESSAGES['enum'], $field, $enumList, $field, $enumList));
            }
        }
    }

    /**
     * Check whether a value matches the expected JSON Schema type.
     *
     * @param string $field Field name.
     * @param mixed  $value Value to check.
     * @param string $type  Expected type.
     * @return void
     */
    private function checkType(string $field, mixed $value, string $type): void
    {
        $valid = match ($type) {
            'string'  => is_string($value),
            'number'  => is_numeric($value),
            'integer' => is_int($value) || (is_string($value) && ctype_digit(ltrim($value, '-'))),
            'boolean' => is_bool($value),
            'array'   => is_array($value) && array_is_list($value),
            'object'  => is_array($value) && !array_is_list($value),
            'null'    => $value === null,
            default   => true,
        };

        if (!$valid) {
            $msgKey = 'type_' . $type;
            $msg = self::MESSAGES[$msgKey] ?? "Field \"{$field}\" has invalid type";
            $this->addError($field, sprintf($msg, $field, $field));
        }
    }

    /**
     * Apply type coercion based on schema definitions.
     *
     * @param array $data   Raw form data.
     * @param array $schema JSON Schema.
     * @return array Coerced data.
     */
    private function coerce(array $data, array $schema): array
    {
        $properties = $schema['properties'] ?? [];
        if (!is_array($properties)) return $data;

        $coerced = $data;
        foreach ($properties as $field => $fieldSchema) {
            if (!is_array($fieldSchema) || !array_key_exists($field, $coerced)) continue;
            $type  = $fieldSchema['type'] ?? null;
            $value = $coerced[$field];

            if ($type === null || $value === null) continue;

            $coerced[$field] = match ($type) {
                'integer' => is_numeric($value) ? (int)$value : $value,
                'number'  => is_numeric($value) ? (float)$value : $value,
                'boolean' => is_bool($value) ? $value : ($value === 'true' || $value === '1' || $value === 1),
                'string'  => is_scalar($value) ? (string)$value : $value,
                default   => $value,
            };
        }

        return $coerced;
    }

    /**
     * Validate cross-field rules.
     *
     * Rules format: [['if' => [...], 'then' => [...], 'message' => '...'], ...]
     *
     * @param array $data  Coerced form data.
     * @param array $rules Cross-field validation rules.
     * @return void
     */
    private function validateCrossField(array $data, array $rules): void
    {
        foreach ($rules as $rule) {
            if (!is_array($rule)) continue;

            $condition = $rule['if'] ?? [];
            $then      = $rule['then'] ?? [];
            $message   = (string)($rule['message'] ?? 'Cross-field validation failed');

            if (!is_array($condition) || !is_array($then)) continue;

            // Check if condition matches
            $conditionMet = true;
            foreach ($condition as $field => $expected) {
                $actual = $data[$field] ?? null;
                if ($actual !== $expected) {
                    $conditionMet = false;
                    break;
                }
            }

            if (!$conditionMet) continue;

            // Apply "then" requirements
            foreach ($then as $field => $constraint) {
                if (is_string($constraint) && $constraint === 'required') {
                    if (!array_key_exists($field, $data) || $this->isEmpty($data[$field])) {
                        $this->addError((string)$field, sprintf(self::MESSAGES['cross_field'], $message, $message));
                    }
                }
            }
        }
    }

    /**
     * Check whether a value is considered empty.
     *
     * @param mixed $value Value to check.
     * @return bool
     */
    private function isEmpty(mixed $value): bool
    {
        if ($value === null) return true;
        if (is_string($value) && trim($value) === '') return true;
        if (is_array($value) && count($value) === 0) return true;
        return false;
    }

    /**
     * Add an error to the error collection.
     *
     * @param string $field   Field name.
     * @param string $message Error message.
     * @return void
     */
    private function addError(string $field, string $message): void
    {
        $this->errors[] = ['field' => $field, 'message' => $message];
    }
}
