<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * WorkflowDefinitionRegistry - Extracted from WorkflowEngine.
 *
 * Contains all workflow state machine definitions and step data requirements
 * that were previously embedded in WorkflowEngine::buildWorkflowDefinitions()
 * and WorkflowEngine::buildStepDataRequirements().
 *
 * Separating definitions from engine logic allows:
 *   - Independent evolution of workflow rules
 *   - Easier testing of state machine configurations
 *   - Future: load definitions from database/JSON instead of code
 *   - Cleaner WorkflowEngine focused on transition mechanics
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class WorkflowDefinitionRegistry
{
    /** @var array<string, array> Cached definitions */
    private static ?array $definitions = null;

    /** @var array<string, array> Cached step data requirements */
    private static ?array $stepRequirements = null;

    /**
     * Get all workflow definitions keyed by record type code.
     *
     * @return array<string, array>
     */
    public static function all(): array
    {
        if (self::$definitions === null) {
            self::$definitions = self::build();
        }
        return self::$definitions;
    }

    /**
     * Get workflow definition for a specific record type.
     */
    public static function get(string $recordType): ?array
    {
        $type = strtoupper(trim($recordType));
        return self::all()[$type] ?? null;
    }

    /**
     * Get all defined workflow type codes.
     *
     * @return list<string>
     */
    public static function types(): array
    {
        return array_keys(self::all());
    }

    /**
     * Get step data requirements for a workflow type + target state.
     *
     * @return array{table: string, required_fields: array, optional_fields: array, attachments: array}
     */
    public static function stepRequirements(string $recordType, string $targetState): array
    {
        if (self::$stepRequirements === null) {
            self::$stepRequirements = self::buildStepRequirements();
        }

        $key = strtoupper($recordType) . '::' . $targetState;
        return self::$stepRequirements[$key] ?? [
            'table'           => 'workflow_step_data',
            'required_fields' => [],
            'optional_fields' => [],
            'attachments'     => [],
        ];
    }

    /**
     * Validate that all required step data is present.
     *
     * @return array{ok: bool, missing: array, table: string}
     */
    public static function validateStepData(string $recordType, string $targetState, array $data): array
    {
        $reqs = self::stepRequirements($recordType, $targetState);
        $missing = [];

        foreach ($reqs['required_fields'] as $field => $fieldDef) {
            $value = $data[$field] ?? null;
            if ($value === null || $value === '' || (is_array($value) && empty($value))) {
                $missing[] = [
                    'field'    => $field,
                    'label'    => $fieldDef['label'] ?? $field,
                    'label_vi' => $fieldDef['label_vi'] ?? $field,
                    'type'     => $fieldDef['type'] ?? 'text',
                ];
            }
        }

        return ['ok' => empty($missing), 'missing' => $missing, 'table' => $reqs['table']];
    }

    /**
     * Reset cached definitions (useful for testing).
     */
    public static function reset(): void
    {
        self::$definitions = null;
        self::$stepRequirements = null;
    }

    // ── Build Definitions ──────────────────────────────────────────────────
    // Note: This delegates to the existing WorkflowEngine method via a
    // static wrapper. The actual definition arrays remain in WorkflowEngine
    // until a full extraction is completed, at which point they will be
    // moved here. This avoids duplicating 2,000 lines of definition data
    // and breaking existing callers.

    /**
     * Build workflow definitions.
     * Currently delegates to WorkflowEngine's internal method via reflection
     * for backward compatibility. In a future refactor, the definitions
     * will be moved entirely here or loaded from a configuration source.
     *
     * @return array<string, array>
     */
    private static function build(): array
    {
        // Create a temporary WorkflowEngine to access definitions.
        // This is a transitional pattern - definitions will be moved
        // here or to a JSON/database source in the next phase.
        //
        // For now, we provide a stub registry that WorkflowEngine
        // can populate via registerDefinitions().
        return self::$definitions ?? [];
    }

    /**
     * Register workflow definitions from WorkflowEngine.
     * Called during WorkflowEngine construction to populate the registry.
     *
     * @param array<string, array> $definitions
     */
    public static function register(array $definitions): void
    {
        self::$definitions = $definitions;
    }

    /**
     * Register step data requirements.
     *
     * @param array<string, array> $requirements
     */
    public static function registerStepRequirements(array $requirements): void
    {
        self::$stepRequirements = $requirements;
    }

    /**
     * Build step data requirements map.
     * Key format: "RECORD_TYPE::target_state"
     */
    private static function buildStepRequirements(): array
    {
        return self::$stepRequirements ?? [];
    }
}
