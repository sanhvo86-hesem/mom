<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
use RuntimeException;

// ── Value Objects ────────────────────────────────────────────────────────────

/**
 * Result of a form field validation.
 */
final readonly class ValidationResult
{
    /**
     * @param bool   $valid    Whether validation passed.
     * @param array  $errors   List of error messages (EN).
     * @param array  $errorsVi List of error messages (VI).
     * @param array  $fieldErrors Per-field errors keyed by field ID.
     */
    public function __construct(
        public bool $valid,
        public array $errors = [],
        public array $errorsVi = [],
        public array $fieldErrors = [],
    ) {
    }

    /** @return array Serializable representation. */
    public function toArray(): array
    {
        return [
            'valid'        => $this->valid,
            'errors'       => $this->errors,
            'errors_vi'    => $this->errorsVi,
            'field_errors' => $this->fieldErrors,
        ];
    }
}

/**
 * Result of a form submission processing.
 */
final readonly class SubmissionResult
{
    /**
     * @param bool              $success     Whether the submission succeeded.
     * @param string|null       $recordId    Generated record ID (if applicable).
     * @param string|null       $entryId     Stored entry identifier.
     * @param ValidationResult|null $validation Validation details (if failed).
     * @param string|null       $error       Error message (EN).
     * @param string|null       $errorVi     Error message (VI).
     * @param array             $data        The processed (enriched) data.
     */
    public function __construct(
        public bool $success,
        public ?string $recordId = null,
        public ?string $entryId = null,
        public ?ValidationResult $validation = null,
        public ?string $error = null,
        public ?string $errorVi = null,
        public array $data = [],
    ) {
    }

    /** @return array Serializable representation. */
    public function toArray(): array
    {
        return [
            'success'    => $this->success,
            'record_id'  => $this->recordId,
            'entry_id'   => $this->entryId,
            'validation' => $this->validation?->toArray(),
            'error'      => $this->error,
            'error_vi'   => $this->errorVi,
            'data'       => $this->data,
        ];
    }
}

// ── Form Engine ─────────────────────────────────────────────────────────────

/**
 * Form processing engine for HESEM MOM online forms.
 *
 * Handles the full lifecycle of form submissions: schema loading, validation,
 * data enrichment, storage, and workflow triggering. Supports:
 *
 * - JSON Schema-based validation against form definitions
 * - Conditional fields (show/hide based on other field values)
 * - Calculated fields (auto-compute from other fields)
 * - Cross-form references (e.g. CAPA referencing NCR)
 * - File attachment handling with SHA-256 integrity verification
 * - Max entries limit enforcement (1000 per form)
 * - Online vs. offline decision scoring
 * - Bilingual error messages (EN/VI)
 *
 * @package MOM\Services
 * @since   3.0.0
 */
final class FormEngine
{
    /** Maximum entries per form before archival required. */
    private const MAX_ENTRIES_PER_FORM = 1000;

    /** Maximum file attachment size (25 MB). */
    private const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

    /** Allowed attachment MIME types. */
    private const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
    ];

    /** Cached schemas keyed by form code. */
    private array $schemaCache = [];

    /** Form entries storage directory. */
    private readonly string $entriesDir;

    /** Schema directory. */
    private readonly string $schemaDir;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string                    $dataDir    Absolute path to data directory.
     * @param string                    $rootDir    Absolute path to project root.
     * @param Connection|null           $db         Optional database connection.
     * @param RecordIdGenerator|null    $idGen      Optional record ID generator.
     * @param WorkflowEngine|null       $workflow   Optional workflow engine.
     * @param AuditTrail|null           $auditTrail Optional audit trail.
     */
    public function __construct(
        private readonly string $dataDir,
        string $rootDir,
        private readonly ?Connection $db = null,
        private readonly ?RecordIdGenerator $idGen = null,
        private readonly ?WorkflowEngine $workflow = null,
        private readonly ?AuditTrail $auditTrail = null,
    ) {
        unset($rootDir);
        $base = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->entriesDir = $base . '/online-forms/entries';
        $this->schemaDir = $base . '/online-forms/schemas';

        foreach ([$this->entriesDir, $this->schemaDir] as $dir) {
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Validate form data against the schema for a given form code.
     *
     * @param string $formCode Form code (e.g. "FRM-208").
     * @param array  $data     Submitted data.
     * @return ValidationResult
     */
    public function validateSubmission(string $formCode, array $data): ValidationResult
    {
        $schema = $this->getFormSchema($formCode);
        if ($schema === null) {
            return new ValidationResult(
                valid: false,
                errors: ["Form schema not found: {$formCode}"],
                errorsVi: ["Khong tim thay dinh nghia bieu mau: {$formCode}"],
            );
        }

        $errors = [];
        $errorsVi = [];
        $fieldErrors = [];
        $fields = $schema['fields'] ?? [];

        foreach ($fields as $field) {
            $fieldId = $field['id'] ?? '';
            if ($fieldId === '') {
                continue;
            }

            // Skip conditional fields that shouldn't be shown
            if (!$this->isFieldVisible($field, $data)) {
                continue;
            }

            // Handle grouped fields
            if (($field['type'] ?? '') === 'group') {
                $subFields = $field['fields'] ?? [];
                foreach ($subFields as $subField) {
                    $subId = $subField['id'] ?? '';
                    $subErrors = $this->validateField($subField, $data[$subId] ?? null, $data);
                    if (!empty($subErrors)) {
                        $fieldErrors[$subId] = $subErrors;
                        $errors = array_merge($errors, $subErrors['en'] ?? []);
                        $errorsVi = array_merge($errorsVi, $subErrors['vi'] ?? []);
                    }
                }
                continue;
            }

            // Handle table fields
            if (($field['type'] ?? '') === 'table') {
                $tableErrors = $this->validateTableField($field, $data[$fieldId] ?? null);
                if (!empty($tableErrors)) {
                    $fieldErrors[$fieldId] = $tableErrors;
                    $errors = array_merge($errors, $tableErrors['en'] ?? []);
                    $errorsVi = array_merge($errorsVi, $tableErrors['vi'] ?? []);
                }
                continue;
            }

            // Validate regular field
            $value = $data[$fieldId] ?? null;
            $fErrors = $this->validateField($field, $value, $data);
            if (!empty($fErrors)) {
                $fieldErrors[$fieldId] = $fErrors;
                $errors = array_merge($errors, $fErrors['en'] ?? []);
                $errorsVi = array_merge($errorsVi, $fErrors['vi'] ?? []);
            }
        }

        return new ValidationResult(
            valid: empty($errors),
            errors: $errors,
            errorsVi: $errorsVi,
            fieldErrors: $fieldErrors,
        );
    }

    /**
     * Process a complete form submission: validate, enrich, store, trigger workflow.
     *
     * @param string $formCode Form code.
     * @param array  $data     Submitted data.
     * @param string $userId   Submitting user ID.
     * @return SubmissionResult
     */
    public function processSubmission(string $formCode, array $data, string $userId): SubmissionResult
    {
        // Step 1: Validate
        $validation = $this->validateSubmission($formCode, $data);
        if (!$validation->valid) {
            return new SubmissionResult(
                success: false,
                validation: $validation,
                error: 'Validation failed: ' . implode('; ', $validation->errors),
                errorVi: 'Xac thuc that bai: ' . implode('; ', $validation->errorsVi),
            );
        }

        // Step 2: Check entry limit
        $entryCount = $this->getEntryCount($formCode);
        if ($entryCount >= self::MAX_ENTRIES_PER_FORM) {
            return new SubmissionResult(
                success: false,
                error: "Maximum entries limit reached ({$entryCount}/" . self::MAX_ENTRIES_PER_FORM . '). Archive old entries first.',
                errorVi: "Da dat gioi han so luong ban ghi ({$entryCount}/" . self::MAX_ENTRIES_PER_FORM . '). Can luu tru ban ghi cu truoc.',
            );
        }

        // Step 3: Enrich
        $enriched = $this->enrichFormData($formCode, $data, $userId);

        // Step 4: Process calculated fields
        $enriched = $this->processCalculatedFields($formCode, $enriched);

        // Step 5: Generate record ID if this form maps to a record type
        $recordId = null;
        $schema = $this->getFormSchema($formCode);
        $recordType = $this->resolveRecordType($formCode, $schema);
        if ($recordType !== null && $this->idGen !== null) {
            $dept = $enriched['department'] ?? null;
            $recordId = $this->idGen->generateId($recordType, $dept);
            $enriched['record_id'] = $recordId;
        }

        // Step 6: Process file attachments
        $enriched = $this->processAttachments($formCode, $enriched);

        // Step 7: Store entry
        $entryId = $this->storeEntry($formCode, $enriched);
        if ($entryId === null) {
            return new SubmissionResult(
                success: false,
                error: 'Failed to store form entry',
                errorVi: 'Khong the luu ban ghi bieu mau',
            );
        }

        // Step 8: Initialize workflow if applicable
        if ($recordId !== null && $recordType !== null && $this->workflow !== null) {
            try {
                $this->workflow->initializeRecord($recordId, $recordType, $userId, $enriched);
            } catch (\Throwable $e) {
                error_log("[FormEngine] Workflow init failed for {$recordId}: " . $e->getMessage());
            }
        }

        // Step 9: Log to audit trail
        if ($this->auditTrail !== null) {
            // INT-R6-006: Sanitize REMOTE_ADDR and HTTP_USER_AGENT to prevent log injection
            $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
            if (!filter_var($remoteAddr, FILTER_VALIDATE_IP)) {
                $remoteAddr = 'unknown';
            }
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $userAgent = str_replace(["\n", "\r", "\0"], ' ', $userAgent);
            $userAgent = substr($userAgent, 0, 500); // Truncate to 500 chars

            $this->auditTrail->logEvent(new AuditEvent(
                eventType: AuditEventType::SUBMITTED,
                aggregateType: $recordType ?? 'FORM',
                aggregateId: $recordId ?? $entryId,
                actorId: $userId,
                payload: [
                    'form_code' => $formCode,
                    'entry_id'  => $entryId,
                ],
                metadata: [
                    'ip'         => $remoteAddr,
                    'user_agent' => $userAgent,
                ],
            ));
        }

        return new SubmissionResult(
            success: true,
            recordId: $recordId,
            entryId: $entryId,
            data: $enriched,
        );
    }

    /**
     * Enrich form data with server-side auto-fields.
     *
     * @param string $formCode Form code.
     * @param array  $data     Raw submitted data.
     * @param string $userId   Submitting user ID.
     * @return array Enriched data.
     */
    public function enrichFormData(string $formCode, array $data, string $userId): array
    {
        $now = gmdate('Y-m-d\TH:i:s\Z');

        // INT-R6-006: Sanitize REMOTE_ADDR and HTTP_USER_AGENT
        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
        if (!filter_var($remoteAddr, FILTER_VALIDATE_IP)) {
            $remoteAddr = 'unknown';
        }
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $userAgent = str_replace(["\n", "\r", "\0"], ' ', $userAgent);
        $userAgent = substr($userAgent, 0, 500); // Truncate to 500 chars

        $data['_form_code']    = strtoupper(trim($formCode));
        $data['_server_time']  = $now;
        $data['_submitted_at'] = $now;
        $data['_submitted_by'] = $userId;
        $data['_session_user'] = $userId;
        $data['_status']       = 'submitted';
        $data['_ip']           = $remoteAddr;
        $data['_user_agent']   = $userAgent;

        // Generate entry ID
        $data['_entry_id'] = $this->generateEntryId();

        // Apply default values from schema
        $schema = $this->getFormSchema($formCode);
        if ($schema !== null) {
            $data = $this->applyDefaults($schema, $data);
        }

        return $data;
    }

    /**
     * Load and cache a form schema by code.
     *
     * @param string $formCode Form code (e.g. "FRM-208").
     * @return array|null Schema data or null if not found.
     */
    public function getFormSchema(string $formCode): ?array
    {
        $code = strtoupper(trim($formCode));

        if (isset($this->schemaCache[$code])) {
            return $this->schemaCache[$code];
        }

        // Try JSON schema file first
        $schemaFile = $this->schemaDir . '/' . $code . '.json';
        if (is_file($schemaFile)) {
            $content = file_get_contents($schemaFile);
            if ($content !== false) {
                $schema = json_decode($content, true);
                if (is_array($schema)) {
                    $this->schemaCache[$code] = $schema;
                    return $schema;
                }
            }
        }

        // Try PostgreSQL
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $row = $this->db->queryOne(
                    'SELECT schema_data FROM form_schemas WHERE form_code = :code AND valid_to IS NULL ORDER BY version DESC LIMIT 1',
                    [':code' => $code],
                );
                if ($row !== null) {
                    $schema = is_string($row['schema_data'] ?? null)
                        ? json_decode($row['schema_data'], true)
                        : ($row['schema_data'] ?? null);
                    if (is_array($schema)) {
                        $this->schemaCache[$code] = $schema;
                        return $schema;
                    }
                }
            } catch (\Throwable) {
                // Fall through
            }
        }

        return null;
    }

    /**
     * Calculate the online vs. offline decision score for a form.
     *
     * Higher scores favor online (digital) forms; lower scores favor
     * offline (paper/Excel). Based on the framework in
     * core-standards/18-online-vs-offline-form-decision-framework.md.
     *
     * @param string $formCode Form code.
     * @param array  $data     Context data (optional, for dynamic scoring).
     * @return int Score 0-100 (>=60 = recommend online).
     */
    public function calculateDecisionScore(string $formCode, array $data = []): int
    {
        $schema = $this->getFormSchema($formCode);
        if ($schema === null) {
            return 0;
        }

        $score = 0;

        // Factor 1: Field count (more fields = more benefit from digital) -- max 15
        $fieldCount = count($schema['fields'] ?? []);
        $score += min(15, $fieldCount * 2);

        // Factor 2: Has conditional logic -- +10
        $hasConditions = false;
        foreach ($schema['fields'] ?? [] as $field) {
            if (isset($field['show_if'])) {
                $hasConditions = true;
                break;
            }
        }
        if ($hasConditions) {
            $score += 10;
        }

        // Factor 3: Frequency (daily forms benefit most) -- max 20
        $frequency = strtolower($schema['frequency'] ?? '');
        $score += match ($frequency) {
            'daily'     => 20,
            'per_shift' => 18,
            'weekly'    => 12,
            'monthly'   => 8,
            'quarterly' => 5,
            'per_event' => 15,
            default     => 5,
        };

        // Factor 4: Has table/repeating sections -- +10
        foreach ($schema['fields'] ?? [] as $field) {
            if (($field['type'] ?? '') === 'table') {
                $score += 10;
                break;
            }
        }

        // Factor 5: Requires notifications/escalation -- +10
        if (!empty($schema['notifications'])) {
            $score += 10;
        }

        // Factor 6: Has select/dropdown fields (benefit from controlled vocabulary) -- max 10
        $selectCount = 0;
        foreach ($schema['fields'] ?? [] as $field) {
            if (in_array($field['type'] ?? '', ['select', 'radio'], true)) {
                $selectCount++;
            }
        }
        $score += min(10, $selectCount * 3);

        // Factor 7: Multiple roles allowed (cross-dept collaboration) -- +10
        $roles = $schema['roles_allowed'] ?? [];
        if (count($roles) >= 3) {
            $score += 10;
        }

        // Factor 8: Has auto fields (computed values benefit from automation) -- +5
        if (!empty($schema['auto_fields'])) {
            $score += 5;
        }

        // Factor 9: SOP reference exists (integration potential) -- +5
        if (!empty($schema['sop_ref'])) {
            $score += 5;
        }

        // Dynamic factors from data context
        if (!empty($data)) {
            // High volume departments get bonus
            $dept = strtoupper($data['department'] ?? '');
            if (in_array($dept, ['PROD', 'QA', 'PRO'], true)) {
                $score += 5;
            }
        }

        return min(100, $score);
    }

    /**
     * Get list of all available form schemas.
     *
     * @return array List of form code + title pairs.
     */
    public function listForms(): array
    {
        $forms = [];
        $files = glob($this->schemaDir . '/*.json') ?: [];

        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content === false) {
                continue;
            }
            $schema = json_decode($content, true);
            if (!is_array($schema)) {
                continue;
            }
            $forms[] = [
                'form_code' => $schema['form_code'] ?? basename($file, '.json'),
                'title'     => $schema['title'] ?? '',
                'title_vi'  => $schema['title_vi'] ?? '',
                'category'  => $schema['category'] ?? '',
                'sop_ref'   => $schema['sop_ref'] ?? '',
            ];
        }

        return $forms;
    }

    /**
     * Get entries for a form with optional filters.
     *
     * @param string $formCode Form code.
     * @param array  $filters  Optional: status, date_from, date_to, limit, offset.
     * @return array List of form entries.
     */
    public function getEntries(string $formCode, array $filters = []): array
    {
        $code = strtoupper(trim($formCode));
        $limit = min((int) ($filters['limit'] ?? 100), self::MAX_ENTRIES_PER_FORM);
        $offset = max(0, (int) ($filters['offset'] ?? 0));

        // Try PostgreSQL
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                return $this->getEntriesFromPg($code, $filters, $limit, $offset);
            } catch (\Throwable) {
                // Fall through
            }
        }

        return $this->getEntriesFromJson($code, $filters, $limit, $offset);
    }

    // ── Field Validation ────────────────────────────────────────────────────

    /**
     * Validate a single field value.
     *
     * @return array{en: string[], vi: string[]} Error messages, or empty if valid.
     */
    private function validateField(array $field, mixed $value, array $allData): array
    {
        $errors = ['en' => [], 'vi' => []];
        $fieldId = $field['id'] ?? '';
        $label = $field['label_en'] ?? $field['label'] ?? $fieldId;
        $labelVi = $field['label'] ?? $label;
        $type = $field['type'] ?? 'text';
        $required = $field['required'] ?? false;

        // Required check
        if ($required && ($value === null || $value === '' || $value === [])) {
            $errors['en'][] = "{$label} is required";
            $errors['vi'][] = "{$labelVi} la bat buoc";
            return $errors;
        }

        // Skip further validation if empty and not required
        if ($value === null || $value === '') {
            return $errors;
        }

        // Type-specific validation
        match ($type) {
            'number' => $this->validateNumber($field, $value, $errors, $label, $labelVi),
            'date' => $this->validateDate($field, $value, $errors, $label, $labelVi),
            'select', 'radio' => $this->validateSelect($field, $value, $errors, $label, $labelVi),
            'email' => $this->validateEmail($value, $errors, $label, $labelVi),
            'text', 'textarea' => $this->validateText($field, $value, $errors, $label, $labelVi),
            'checkbox' => null, // Boolean, always valid if present
            default => null,
        };

        return empty($errors['en']) ? [] : $errors;
    }

    /**
     * Validate a number field.
     */
    private function validateNumber(array $field, mixed $value, array &$errors, string $label, string $labelVi): void
    {
        if (!is_numeric($value)) {
            $errors['en'][] = "{$label} must be a number";
            $errors['vi'][] = "{$labelVi} phai la so";
            return;
        }

        $num = (float) $value;

        if (isset($field['min']) && $num < (float) $field['min']) {
            $errors['en'][] = "{$label} must be at least {$field['min']}";
            $errors['vi'][] = "{$labelVi} toi thieu la {$field['min']}";
        }

        if (isset($field['max']) && $num > (float) $field['max']) {
            $errors['en'][] = "{$label} must be at most {$field['max']}";
            $errors['vi'][] = "{$labelVi} toi da la {$field['max']}";
        }
    }

    /**
     * Validate a date field.
     */
    private function validateDate(array $field, mixed $value, array &$errors, string $label, string $labelVi): void
    {
        $dateStr = (string) $value;
        $parsed = \DateTimeImmutable::createFromFormat('Y-m-d', $dateStr);
        if ($parsed === false || $parsed->format('Y-m-d') !== $dateStr) {
            $errors['en'][] = "{$label} must be a valid date (YYYY-MM-DD)";
            $errors['vi'][] = "{$labelVi} phai la ngay hop le (YYYY-MM-DD)";
        }
    }

    /**
     * Validate a select/radio field against allowed options.
     */
    private function validateSelect(array $field, mixed $value, array &$errors, string $label, string $labelVi): void
    {
        $options = $field['options'] ?? [];
        $allowedValues = array_column($options, 'value');
        if (!empty($allowedValues) && !in_array((string) $value, $allowedValues, true)) {
            $errors['en'][] = "{$label} has an invalid selection";
            $errors['vi'][] = "{$labelVi} co lua chon khong hop le";
        }
    }

    /**
     * Validate an email field.
     */
    private function validateEmail(mixed $value, array &$errors, string $label, string $labelVi): void
    {
        if (filter_var((string) $value, FILTER_VALIDATE_EMAIL) === false) {
            $errors['en'][] = "{$label} must be a valid email address";
            $errors['vi'][] = "{$labelVi} phai la dia chi email hop le";
        }
    }

    /**
     * Validate a text field (length constraints).
     */
    private function validateText(array $field, mixed $value, array &$errors, string $label, string $labelVi): void
    {
        $str = (string) $value;
        $minLen = $field['min_length'] ?? null;
        $maxLen = $field['max_length'] ?? 10000;

        if ($minLen !== null && mb_strlen($str) < (int) $minLen) {
            $errors['en'][] = "{$label} must be at least {$minLen} characters";
            $errors['vi'][] = "{$labelVi} phai co it nhat {$minLen} ky tu";
        }

        if (mb_strlen($str) > (int) $maxLen) {
            $errors['en'][] = "{$label} must be at most {$maxLen} characters";
            $errors['vi'][] = "{$labelVi} khong duoc qua {$maxLen} ky tu";
        }
    }

    /**
     * Validate a table (repeating rows) field.
     *
     * @return array{en: string[], vi: string[]} Error messages.
     */
    private function validateTableField(array $field, mixed $rows): array
    {
        $errors = ['en' => [], 'vi' => []];
        $fieldId = $field['id'] ?? '';
        $label = $field['label_en'] ?? $field['label'] ?? $fieldId;
        $labelVi = $field['label'] ?? $label;

        if (!is_array($rows)) {
            $rows = [];
        }

        $minRows = $field['min_rows'] ?? 0;
        $maxRows = $field['max_rows'] ?? 100;

        if (count($rows) < (int) $minRows) {
            $errors['en'][] = "{$label} requires at least {$minRows} rows";
            $errors['vi'][] = "{$labelVi} yeu cau it nhat {$minRows} dong";
        }

        if (count($rows) > (int) $maxRows) {
            $errors['en'][] = "{$label} allows at most {$maxRows} rows";
            $errors['vi'][] = "{$labelVi} cho phep toi da {$maxRows} dong";
        }

        // Validate each row against column definitions
        $columns = $field['columns'] ?? [];
        foreach ($rows as $rowIdx => $row) {
            if (!is_array($row)) {
                continue;
            }
            foreach ($columns as $col) {
                $colId = $col['id'] ?? '';
                $colRequired = $col['required'] ?? false;
                $colValue = $row[$colId] ?? null;

                if ($colRequired && ($colValue === null || $colValue === '')) {
                    $colLabel = $col['label'] ?? $colId;
                    $errors['en'][] = "Row " . ($rowIdx + 1) . ": {$colLabel} is required";
                    $errors['vi'][] = "Dong " . ($rowIdx + 1) . ": {$colLabel} la bat buoc";
                }
            }
        }

        return empty($errors['en']) ? [] : $errors;
    }

    // ── Conditional Fields ──────────────────────────────────────────────────

    /**
     * Determine whether a field should be visible based on show_if conditions.
     *
     * @param array $field   Field definition.
     * @param array $data    All submitted data.
     * @return bool True if the field should be validated/shown.
     */
    private function isFieldVisible(array $field, array $data): bool
    {
        $showIf = $field['show_if'] ?? null;
        if ($showIf === null) {
            return true;
        }

        $targetField = $showIf['field'] ?? '';
        $targetValue = $showIf['value'] ?? null;
        $operator = $showIf['operator'] ?? 'equals';
        $actualValue = $data[$targetField] ?? null;

        return match ($operator) {
            // RA-003 FIX: Use strict comparison (===) instead of loose (==) to prevent type juggling
            'equals', '=='     => $actualValue === $targetValue || (is_string($actualValue) && is_string($targetValue) && (string)$actualValue === (string)$targetValue),
            'not_equals', '!=' => $actualValue !== $targetValue && !(is_string($actualValue) && is_string($targetValue) && (string)$actualValue === (string)$targetValue),
            'in'               => is_array($targetValue) && in_array($actualValue, $targetValue, true),
            'not_in'           => is_array($targetValue) && !in_array($actualValue, $targetValue, true),
            'gt', '>'          => is_numeric($actualValue) && is_numeric($targetValue) && (float) $actualValue > (float) $targetValue,
            'gte', '>='        => is_numeric($actualValue) && is_numeric($targetValue) && (float) $actualValue >= (float) $targetValue,
            'lt', '<'          => is_numeric($actualValue) && is_numeric($targetValue) && (float) $actualValue < (float) $targetValue,
            'lte', '<='        => is_numeric($actualValue) && is_numeric($targetValue) && (float) $actualValue <= (float) $targetValue,
            'not_empty'        => $actualValue !== null && $actualValue !== '' && $actualValue !== [],
            'empty'            => $actualValue === null || $actualValue === '' || $actualValue === [],
            default            => $actualValue === $targetValue || (is_string($actualValue) && is_string($targetValue) && (string)$actualValue === (string)$targetValue),
        };
    }

    // ── Calculated Fields ───────────────────────────────────────────────────

    /**
     * Process calculated fields in the form data.
     *
     * @param string $formCode Form code.
     * @param array  $data     Enriched data.
     * @return array Data with calculated fields applied.
     */
    private function processCalculatedFields(string $formCode, array $data): array
    {
        $schema = $this->getFormSchema($formCode);
        if ($schema === null) {
            return $data;
        }

        foreach ($schema['fields'] ?? [] as $field) {
            $calc = $field['calculated'] ?? null;
            if ($calc === null) {
                continue;
            }

            $fieldId = $field['id'] ?? '';
            $formula = $calc['formula'] ?? '';
            $inputs = $calc['inputs'] ?? [];

            $data[$fieldId] = match ($formula) {
                'sum' => $this->calcSum($inputs, $data),
                'average' => $this->calcAverage($inputs, $data),
                'count' => count($inputs),
                'concat' => implode(' ', array_map(fn($k) => (string) ($data[$k] ?? ''), $inputs)),
                'max' => $this->calcMax($inputs, $data),
                'min' => $this->calcMin($inputs, $data),
                'duration_hours' => $this->calcDurationHours($inputs, $data),
                default => $data[$fieldId] ?? null,
            };
        }

        return $data;
    }

    private function calcSum(array $inputs, array $data): float
    {
        $sum = 0.0;
        foreach ($inputs as $key) {
            $sum += (float) ($data[$key] ?? 0);
        }
        return $sum;
    }

    private function calcAverage(array $inputs, array $data): float
    {
        if (empty($inputs)) {
            return 0.0;
        }
        return $this->calcSum($inputs, $data) / count($inputs);
    }

    private function calcMax(array $inputs, array $data): float
    {
        $values = array_map(fn($k) => (float) ($data[$k] ?? 0), $inputs);
        return !empty($values) ? max($values) : 0.0;
    }

    private function calcMin(array $inputs, array $data): float
    {
        $values = array_map(fn($k) => (float) ($data[$k] ?? 0), $inputs);
        return !empty($values) ? min($values) : 0.0;
    }

    private function calcDurationHours(array $inputs, array $data): float
    {
        if (count($inputs) < 2) {
            return 0.0;
        }
        $start = $data[$inputs[0]] ?? null;
        $end = $data[$inputs[1]] ?? null;
        if ($start === null || $end === null) {
            return 0.0;
        }
        try {
            $s = new \DateTimeImmutable((string) $start);
            $e = new \DateTimeImmutable((string) $end);
            return max(0, ($e->getTimestamp() - $s->getTimestamp()) / 3600);
        } catch (\Throwable) {
            return 0.0;
        }
    }

    // ── Cross-Form References ───────────────────────────────────────────────

    /**
     * Resolve a cross-form reference (e.g. a CAPA referencing an NCR).
     *
     * @param string $refFormCode The referenced form code.
     * @param string $refEntryId  The referenced entry ID or record ID.
     * @return array|null The referenced entry data or null.
     */
    public function resolveReference(string $refFormCode, string $refEntryId): ?array
    {
        $entries = $this->getEntries($refFormCode, ['limit' => self::MAX_ENTRIES_PER_FORM]);
        foreach ($entries as $entry) {
            if (($entry['_entry_id'] ?? '') === $refEntryId || ($entry['record_id'] ?? '') === $refEntryId) {
                return $entry;
            }
        }
        return null;
    }

    // ── Attachment Handling ──────────────────────────────────────────────────

    /**
     * Process file attachments: validate size, type, and compute SHA-256.
     *
     * @param string $formCode Form code.
     * @param array  $data     Enriched data possibly containing _attachments.
     * @return array Data with processed attachment metadata.
     */
    private function processAttachments(string $formCode, array $data): array
    {
        $attachments = $data['_attachments'] ?? [];
        if (!is_array($attachments) || empty($attachments)) {
            return $data;
        }

        $processed = [];
        foreach ($attachments as $i => $attachment) {
            if (!is_array($attachment)) {
                continue;
            }

            $filePath = $attachment['tmp_path'] ?? $attachment['path'] ?? '';
            $fileName = $attachment['name'] ?? basename($filePath);
            $mimeType = $attachment['mime_type'] ?? $attachment['type'] ?? '';

            // Validate file exists and size
            if ($filePath !== '' && is_file($filePath)) {
                $size = filesize($filePath);
                if ($size > self::MAX_ATTACHMENT_BYTES) {
                    $data['_attachment_errors'][] = sprintf(
                        'File "%s" exceeds max size (%d MB)',
                        $fileName,
                        self::MAX_ATTACHMENT_BYTES / (1024 * 1024),
                    );
                    continue;
                }
                if ($mimeType !== '' && !in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
                    $data['_attachment_errors'][] = sprintf(
                        'File "%s" has unsupported MIME type "%s"',
                        $fileName,
                        $mimeType,
                    );
                    continue;
                }

                // Compute SHA-256 integrity hash
                $hash = hash_file('sha256', $filePath);

                $processed[] = [
                    'name'     => $fileName,
                    'size'     => $size,
                    'mime'     => $mimeType,
                    'sha256'   => $hash,
                    'uploaded' => gmdate('Y-m-d\TH:i:s\Z'),
                ];
            } else {
                // Already-processed attachment metadata (no file path)
                $processed[] = $attachment;
            }
        }

        $data['_attachments'] = $processed;
        return $data;
    }

    // ── Storage ─────────────────────────────────────────────────────────────

    /**
     * Store a form entry.
     *
     * @return string|null Entry ID on success, null on failure.
     */
    private function storeEntry(string $formCode, array $data): ?string
    {
        $code = strtoupper(trim($formCode));
        $entryId = $data['_entry_id'] ?? $this->generateEntryId();

        // Try PostgreSQL
        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $this->db->execute(
                    "INSERT INTO form_entries (entry_id, form_code, record_id, data, status, submitted_by, submitted_at) VALUES (:eid, :code, :rid, CAST(:data AS jsonb), :status, :user, NOW())",
                    [
                        ':eid'    => $entryId,
                        ':code'   => $code,
                        ':rid'    => $data['record_id'] ?? null,
                        ':data'   => json_encode($data, JSON_UNESCAPED_UNICODE),
                        ':status' => $data['_status'] ?? 'submitted',
                        ':user'   => $data['_submitted_by'] ?? '',
                    ],
                );
            } catch (\Throwable $e) {
                error_log("[FormEngine] PG insert failed: " . $e->getMessage());
            }
        }

        // Always write JSON as backup
        $formDir = $this->entriesDir . '/' . $code;
        if (!is_dir($formDir)) {
            @mkdir($formDir, 0775, true);
        }

        $line = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        $file = $formDir . '/entries.jsonl';
        $result = file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

        return $result !== false ? $entryId : null;
    }

    /**
     * Get the number of entries for a form.
     */
    private function getEntryCount(string $formCode): int
    {
        $code = strtoupper(trim($formCode));

        if ($this->db !== null && $this->db->isConnected()) {
            try {
                $row = $this->db->queryOne(
                    'SELECT COUNT(*) AS cnt FROM form_entries WHERE form_code = :code',
                    [':code' => $code],
                );
                if ($row !== null) {
                    return (int) ($row['cnt'] ?? 0);
                }
            } catch (\Throwable) {
                // Fall through
            }
        }

        $file = $this->entriesDir . '/' . $code . '/entries.jsonl';
        if (!is_file($file)) {
            return 0;
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        return $lines !== false ? count($lines) : 0;
    }

    /**
     * Get entries from PostgreSQL.
     */
    private function getEntriesFromPg(string $code, array $filters, int $limit, int $offset): array
    {
        $where = 'form_code = :code';
        $params = [':code' => $code];

        if (!empty($filters['status'])) {
            $where .= ' AND status = :status';
            $params[':status'] = $filters['status'];
        }
        if (!empty($filters['date_from'])) {
            $where .= ' AND submitted_at >= :dfrom';
            $params[':dfrom'] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $where .= ' AND submitted_at <= :dto';
            $params[':dto'] = $filters['date_to'];
        }

        $sql = "SELECT * FROM form_entries WHERE {$where} ORDER BY submitted_at DESC LIMIT :lim OFFSET :off";
        $params[':lim'] = $limit;
        $params[':off'] = $offset;

        $rows = $this->db->query($sql, $params);
        return array_map(function (array $row): array {
            if (is_string($row['data'] ?? null)) {
                return json_decode($row['data'], true) ?? $row;
            }
            return $row;
        }, $rows);
    }

    /**
     * Get entries from JSON file.
     */
    private function getEntriesFromJson(string $code, array $filters, int $limit, int $offset): array
    {
        $file = $this->entriesDir . '/' . $code . '/entries.jsonl';
        if (!is_file($file)) {
            return [];
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return [];
        }

        $entries = [];
        // Read newest first
        for ($i = count($lines) - 1; $i >= 0; $i--) {
            $entry = json_decode($lines[$i], true);
            if (!is_array($entry)) {
                continue;
            }

            // Apply filters
            if (!empty($filters['status']) && ($entry['_status'] ?? '') !== $filters['status']) {
                continue;
            }
            if (!empty($filters['date_from']) && ($entry['_submitted_at'] ?? '') < $filters['date_from']) {
                continue;
            }
            if (!empty($filters['date_to']) && ($entry['_submitted_at'] ?? '') > $filters['date_to']) {
                continue;
            }

            $entries[] = $entry;
        }

        return array_slice($entries, $offset, $limit);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Apply default values from schema to data where fields are empty.
     */
    private function applyDefaults(array $schema, array $data): array
    {
        foreach ($schema['fields'] ?? [] as $field) {
            $fieldId = $field['id'] ?? '';
            if ($fieldId === '' || isset($data[$fieldId])) {
                continue;
            }

            $default = $field['default'] ?? null;
            if ($default === null) {
                continue;
            }

            $data[$fieldId] = match ($default) {
                'today' => date('Y-m-d'),
                'now'   => gmdate('Y-m-d\TH:i:s\Z'),
                default => $default,
            };
        }

        return $data;
    }

    /**
     * Resolve the record type code from a form code using the document_type_registry.
     */
    private function resolveRecordType(string $formCode, ?array $schema): ?string
    {
        // Check schema-level record_type mapping
        if ($schema !== null && !empty($schema['record_type'])) {
            return strtoupper($schema['record_type']);
        }

        // Look up in document_type_registry
        $registryFile = rtrim(str_replace('\\', '/', $this->dataDir), '/')
            . '/config/document_type_registry.json';

        if (!is_file($registryFile)) {
            return null;
        }

        $content = file_get_contents($registryFile);
        if ($content === false) {
            return null;
        }

        $registry = json_decode($content, true);
        if (!is_array($registry) || !isset($registry['record_types'])) {
            return null;
        }

        $code = strtoupper(trim($formCode));
        foreach ($registry['record_types'] as $typeCode => $typeMeta) {
            if (strtoupper(trim($typeMeta['form_code'] ?? '')) === $code) {
                return $typeCode;
            }
        }

        return null;
    }

    /**
     * Generate a unique entry ID.
     */
    private function generateEntryId(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
