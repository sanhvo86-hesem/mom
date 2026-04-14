<?php

declare(strict_types=1);

namespace MOM\Api\Validators;

/**
 * Validates record creation and updates (NCR, CAPA, FAI, etc.).
 *
 * Enforces department permissions, naming patterns, and required
 * fields per record type.
 *
 * @package MOM\Api\Validators
 * @since   2.0.0
 */
class RecordValidator
{
    /** @var array<string, list<string>> Required fields per record type. */
    private const REQUIRED_FIELDS = [
        'NCR'   => ['title', 'description', 'severity', 'detected_by'],
        'CAPA'  => ['title', 'description', 'type', 'root_cause'],
        'FAI'   => ['part_number', 'operation', 'result'],
        'SCAR'  => ['title', 'supplier', 'description'],
        'ECR'   => ['title', 'description', 'change_type'],
        'ECN'   => ['title', 'description', 'affected_docs'],
        'DCR'   => ['title', 'document_code', 'change_type'],
        'RMA'   => ['title', 'customer', 'reason'],
        'MRR'   => ['title', 'material', 'disposition'],
        'AUDIT' => ['title', 'audit_type', 'scope'],
    ];

    /** @var array<string, string> Naming pattern per record type. */
    private const NAMING_PATTERNS = [
        'NCR'   => '/^NCR-\d{4}-\d{3,6}$/',
        'CAPA'  => '/^CAPA-\d{4}-\d{3,6}$/',
        'FAI'   => '/^FAI-\d{4}-\d{3,6}$/',
        'SCAR'  => '/^SCAR-\d{4}-\d{3,6}$/',
        'ECR'   => '/^ECR-\d{4}-\d{3,6}$/',
        'ECN'   => '/^ECN-\d{4}-\d{3,6}$/',
        'DCR'   => '/^DCR-\d{4}-\d{3,6}$/',
        'RMA'   => '/^RMA-\d{4}-\d{3,6}$/',
        'MRR'   => '/^MRR-\d{4}-\d{3,6}$/',
        'AUDIT' => '/^AUDIT-\d{4}-\d{3,6}$/',
    ];

    /** @var array<string, list<string>> Department codes allowed to create each record type. */
    private const DEPARTMENT_PERMISSIONS = [
        'NCR'   => ['QA', 'QC', 'PRO', 'ENG', 'SCM'],
        'CAPA'  => ['QA', 'QC', 'PRO', 'ENG'],
        'FAI'   => ['QA', 'QC', 'ENG'],
        'SCAR'  => ['QA', 'SCM', 'PUR'],
        'ECR'   => ['ENG', 'QA'],
        'ECN'   => ['ENG', 'QA'],
        'DCR'   => ['QA', 'IT'],
        'RMA'   => ['QA', 'SAL'],
        'MRR'   => ['QA', 'QC', 'SCM'],
        'AUDIT' => ['QA'],
    ];

    /** @var list<array{field: string, message: string}> Collected errors. */
    private array $errors = [];

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Validate a record creation request.
     *
     * @param string $type       Record type (NCR, CAPA, etc.).
     * @param string $department User's department code.
     * @param array  $data       Record data.
     * @return array{valid: bool, errors: list<array{field: string, message: string}>}
     */
    public function validateCreate(string $type, string $department, array $data): array
    {
        $this->errors = [];
        $type = strtoupper(trim($type));
        $department = strtoupper(trim($department));

        // Check record type is known
        if (!isset(self::REQUIRED_FIELDS[$type])) {
            $this->addError('type', "Unknown record type: {$type} / Loai ban ghi khong hop le: {$type}");
            return $this->result();
        }

        // Check department permission
        $this->checkDepartmentPermission($type, $department);

        // Check required fields
        $requiredFields = self::REQUIRED_FIELDS[$type];
        foreach ($requiredFields as $field) {
            $value = $data[$field] ?? null;
            if ($value === null || (is_string($value) && trim($value) === '')) {
                $this->addError(
                    $field,
                    "Field \"{$field}\" is required for {$type} records / Truong \"{$field}\" la bat buoc cho ban ghi {$type}"
                );
            }
        }

        return $this->result();
    }

    /**
     * Validate that a record ID matches the expected naming pattern.
     *
     * @param string $recordId The record ID to validate.
     * @return array{valid: bool, errors: list<array{field: string, message: string}>}
     */
    public function validateRecordId(string $recordId): array
    {
        $this->errors = [];

        $parts = explode('-', $recordId, 2);
        $type  = strtoupper($parts[0] ?? '');
        $pattern = self::NAMING_PATTERNS[$type] ?? null;

        if ($pattern === null) {
            $this->addError('record_id', "Unknown record type prefix: {$type}");
            return $this->result();
        }

        if (!preg_match($pattern, $recordId)) {
            $this->addError(
                'record_id',
                "Record ID \"{$recordId}\" does not match pattern for {$type} / Ma ban ghi \"{$recordId}\" khong dung dinh dang {$type}"
            );
        }

        return $this->result();
    }

    /**
     * Check whether a department is allowed to create a given record type.
     *
     * @param string $type       Record type.
     * @param string $department Department code.
     * @return bool
     */
    public function canDepartmentCreate(string $type, string $department): bool
    {
        $type = strtoupper(trim($type));
        $department = strtoupper(trim($department));

        $allowed = self::DEPARTMENT_PERMISSIONS[$type] ?? [];
        if (empty($allowed)) return true; // Unknown type = allow

        // Admin departments always have access
        if (in_array($department, ['EXE', 'BOD', 'IT'], true)) {
            return true;
        }

        return in_array($department, $allowed, true);
    }

    /**
     * Get the required fields for a record type.
     *
     * @param string $type Record type.
     * @return list<string>
     */
    public function getRequiredFields(string $type): array
    {
        return self::REQUIRED_FIELDS[strtoupper(trim($type))] ?? [];
    }

    /**
     * Get the naming pattern for a record type.
     *
     * @param string $type Record type.
     * @return string|null Regex pattern or null.
     */
    public function getNamingPattern(string $type): ?string
    {
        return self::NAMING_PATTERNS[strtoupper(trim($type))] ?? null;
    }

    /**
     * Validate record data for an update operation.
     *
     * @param string $recordId Existing record ID.
     * @param array  $data     Update data.
     * @return array{valid: bool, errors: list<array{field: string, message: string}>}
     */
    public function validateUpdate(string $recordId, array $data): array
    {
        $this->errors = [];

        // Validate record ID format
        $idResult = $this->validateRecordId($recordId);
        if (!$idResult['valid']) {
            return $idResult;
        }

        // Validate status transitions if status is being changed
        if (isset($data['status'])) {
            $validStatuses = ['open', 'in_progress', 'pending_review', 'closed', 'void', 'cancelled'];
            if (!in_array(strtolower(trim((string)$data['status'])), $validStatuses, true)) {
                $this->addError('status', "Invalid status value / Trang thai khong hop le");
            }
        }

        // Validate due_date format if provided
        if (isset($data['due_date'])) {
            $dueDate = trim((string)$data['due_date']);
            if ($dueDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}/', $dueDate)) {
                $this->addError('due_date', "Due date must be YYYY-MM-DD format / Ngay han phai theo dinh dang YYYY-MM-DD");
            }
        }

        return $this->result();
    }

    // ── Internal ────────────────────────────────────────────────────────────

    /**
     * Check department permission for a record type.
     *
     * @param string $type       Record type.
     * @param string $department Department code.
     * @return void
     */
    private function checkDepartmentPermission(string $type, string $department): void
    {
        if (!$this->canDepartmentCreate($type, $department)) {
            $allowed = implode(', ', self::DEPARTMENT_PERMISSIONS[$type] ?? []);
            $this->addError(
                'department',
                "Department {$department} cannot create {$type} records. Allowed: {$allowed} / " .
                "Phong {$department} khong duoc tao ban ghi {$type}. Cho phep: {$allowed}"
            );
        }
    }

    /**
     * Add an error to the collection.
     *
     * @param string $field   Field name.
     * @param string $message Error message.
     * @return void
     */
    private function addError(string $field, string $message): void
    {
        $this->errors[] = ['field' => $field, 'message' => $message];
    }

    /**
     * Build the validation result.
     *
     * @return array{valid: bool, errors: list<array{field: string, message: string}>}
     */
    private function result(): array
    {
        return [
            'valid'  => empty($this->errors),
            'errors' => $this->errors,
        ];
    }
}
