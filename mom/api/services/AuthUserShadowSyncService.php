<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use Throwable;

/**
 * Shadow-sync legacy auth users.json records into canonical system tables.
 *
 * This keeps the file-based auth store alive during migration while ensuring
 * identity, employee master, and HCM assignment data are mirrored into the
 * system database whenever connectivity is available.
 */
class AuthUserShadowSyncService
{
    private Connection $db;

    public function __construct(string $portalRoot)
    {
        $base = rtrim($portalRoot, '/\\');
        $configFile = $base . '/database/config.php';
        if (!is_file($configFile)) {
            $configFile = $base . '/mom/database/config.php';
        }
        $config = (array)(require $configFile);
        $this->db = Connection::getInstance($config);
    }

    public static function canonicalEmployeeIdForUser(array $user): string
    {
        $existing = strtoupper(trim((string)($user['employee_id'] ?? '')));
        if ($existing !== '') {
            return substr(preg_replace('/[^A-Z0-9_-]/', '', $existing), 0, 20);
        }

        $seed = strtolower(trim((string)($user['username'] ?? '')));
        if ($seed === '') {
            $seed = strtolower(trim((string)($user['personal_email'] ?? $user['email'] ?? '')));
        }
        if ($seed === '') {
            $seed = strtolower(trim((string)($user['cccd'] ?? '')));
        }
        if ($seed === '') {
            $seed = json_encode($user, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: uniqid('emp', true);
        }

        return 'EMP' . strtoupper(substr(sha1($seed), 0, 12));
    }

    /**
     * @return array<int, string>
     */
    public function knownRoleCodes(): array
    {
        try {
            $rows = $this->db->query(
                'SELECT role_code
                   FROM roles
                  WHERE is_active IS NOT FALSE
                  ORDER BY role_code'
            );
        } catch (Throwable) {
            return [];
        }

        $codes = [];
        foreach ($rows as $row) {
            $code = strtolower(trim((string)($row['role_code'] ?? '')));
            if ($code !== '') {
                $codes[$code] = true;
            }
        }

        return array_keys($codes);
    }

    /**
     * Resolve authoritative HCM linkage while retaining compatibility with
     * legacy dept/title text fields during migration.
     *
     * @return array{
     *   dept_code:?string,
     *   hcm_org_unit_id:?string,
     *   hcm_position_id:?string,
     *   position_title:string
     * }
     */
    public function normalizeUserLinkage(array $user): array
    {
        try {
            return $this->resolveUserLinkage($user);
        } catch (Throwable $e) {
            @error_log('[AuthUserShadowSyncService] normalizeUserLinkage failed: ' . $e->getMessage());
            return [
                'dept_code' => $this->nullableCode((string)($user['dept'] ?? '')),
                'hcm_org_unit_id' => $this->nullableUuid((string)($user['hcm_org_unit_id'] ?? '')),
                'hcm_position_id' => $this->nullableUuid((string)($user['hcm_position_id'] ?? '')),
                'position_title' => trim((string)($user['title'] ?? '')),
            ];
        }
    }

    public function syncUser(array $user): void
    {
        $username = strtolower(trim((string)($user['username'] ?? '')));
        if ($username === '') {
            return;
        }

        $employeeId = self::canonicalEmployeeIdForUser($user);
        $email = strtolower(trim((string)($user['personal_email'] ?? $user['email'] ?? '')));
        $emailSource = 'personal_email';
        if ($email === '') {
            $email = $username . '@auth.local.invalid';
            $emailSource = 'synthetic_invalid';
        }

        try {
                $this->db->transactional(function () use ($user, $username, $employeeId, $email, $emailSource): void {
                $linkage = $this->resolveUserLinkage($user);
                $deptCode = $linkage['dept_code'];
                $positionTitle = trim((string)$linkage['position_title']);
                if ($positionTitle === '') {
                    $positionTitle = trim((string)($user['title'] ?? ''));
                }

                // SVC-021 (CRITICAL): Privilege escalation prevention
                // Check the current DB role before accepting JSON role
                $currentRole = $this->getCurrentUserRole($username);
                $requestedRoleCode = trim((string)($user['role'] ?? ''));
                $roleCode = $this->validateRuntimeRoleCode($currentRole, $requestedRoleCode, $username);
                $roleId = $roleCode !== '' ? $this->roleIdForCode($roleCode) : null;
                $status = !empty($user['active']) ? 'active' : 'inactive';
                $fullName = trim((string)($user['name'] ?? $user['full_name'] ?? $username));
                $passwordHash = trim((string)($user['password_hash'] ?? ''));
                $orgCompanyCode = $this->nullableCode((string)($user['org_company_code'] ?? ''));
                $orgLegalEntityCode = $this->nullableCode((string)($user['org_legal_entity_code'] ?? ''));
                $orgPlantId = $this->nullableCode((string)($user['org_plant_id'] ?? ''));
                $orgSiteId = $this->nullableCode((string)($user['org_site_id'] ?? ''));
                if ($passwordHash === '') {
                    return;
                }

                $userMetadata = [
                    'title' => $positionTitle,
                    'avatar' => (string)($user['avatar'] ?? ''),
                    'avatar_icon' => (string)($user['avatar_icon'] ?? ($user['avatar'] ?? '')),
                    'avatar_image' => (string)($user['avatar_image'] ?? ''),
                    'avatar_url' => (string)($user['avatar_url'] ?? ''),
                    'phone' => (string)($user['phone'] ?? ''),
                    'cccd' => (string)($user['cccd'] ?? ''),
                    'jd_code' => (string)($user['jd_code'] ?? ''),
                    'jd_title' => (string)($user['jd_title'] ?? ''),
                    'hcm_org_unit_id' => (string)($linkage['hcm_org_unit_id'] ?? ''),
                    'hcm_position_id' => (string)($linkage['hcm_position_id'] ?? ''),
                    'assignment_linkage_source' => (($user['hcm_position_id'] ?? '') !== '' || ($user['hcm_org_unit_id'] ?? '') !== '') ? 'explicit_hcm_reference' : 'legacy_text_fallback',
                    'email_source' => $emailSource,
                    'auth_source' => 'users.json',
                    'shadow_synced_at' => gmdate('c'),
                    'role_source' => is_array($user['role_source'] ?? null) ? (array)$user['role_source'] : new \stdClass(),
                ];

                $userRow = $this->db->insertReturning(
                    'INSERT INTO users (
                        employee_id,
                        username,
                        email,
                        full_name,
                        password_hash,
                        dept_code,
                        primary_role_id,
                        org_company_code,
                        org_legal_entity_code,
                        org_plant_id,
                        org_site_id,
                        status,
                        source_system,
                        source_record_id,
                        payload_schema_version,
                        metadata,
                        created_at,
                        updated_at
                     ) VALUES (
                        :employee_id,
                        :username,
                        :email,
                        :full_name,
                        :password_hash,
                        :dept_code,
                        :primary_role_id,
                        :org_company_code,
                        :org_legal_entity_code,
                        :org_plant_id,
                        :org_site_id,
                        :status,
                        :source_system,
                        :source_record_id,
                        :payload_schema_version,
                        :metadata::jsonb,
                        now(),
                        now()
                     )
                     ON CONFLICT (username) DO UPDATE SET
                        employee_id = EXCLUDED.employee_id,
                        email = EXCLUDED.email,
                        full_name = EXCLUDED.full_name,
                        password_hash = EXCLUDED.password_hash,
                        dept_code = EXCLUDED.dept_code,
                        primary_role_id = EXCLUDED.primary_role_id,
                        org_company_code = EXCLUDED.org_company_code,
                        org_legal_entity_code = EXCLUDED.org_legal_entity_code,
                        org_plant_id = EXCLUDED.org_plant_id,
                        org_site_id = EXCLUDED.org_site_id,
                        status = EXCLUDED.status,
                        source_system = EXCLUDED.source_system,
                        source_record_id = EXCLUDED.source_record_id,
                        payload_schema_version = EXCLUDED.payload_schema_version,
                        metadata = COALESCE(users.metadata, \'{}\'::jsonb) || EXCLUDED.metadata,
                        updated_at = now()
                     RETURNING user_id, employee_id',
                    [
                        ':employee_id' => $employeeId,
                        ':username' => $username,
                        ':email' => $email,
                        ':full_name' => $fullName,
                        ':password_hash' => $passwordHash,
                        ':dept_code' => $deptCode,
                        ':primary_role_id' => $roleId,
                        ':org_company_code' => $orgCompanyCode,
                        ':org_legal_entity_code' => $orgLegalEntityCode,
                        ':org_plant_id' => $orgPlantId,
                        ':org_site_id' => $orgSiteId,
                        ':status' => $status,
                        ':source_system' => 'AUTH_JSON',
                        ':source_record_id' => $username,
                        ':payload_schema_version' => '1.0',
                        ':metadata' => json_encode($userMetadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]
                );
                if (!is_array($userRow)) {
                    return;
                }

                $this->db->execute(
                    'DELETE FROM user_roles
                      WHERE user_id = :user_id
                        AND source_system = :source_system
                        AND source_record_id = :source_record_id',
                    [
                        ':user_id' => (string)($userRow['user_id'] ?? ''),
                        ':source_system' => 'AUTH_JSON',
                        ':source_record_id' => $username,
                    ]
                );
                if ($roleId !== null && $roleId !== '') {
                    $this->db->execute(
                        'INSERT INTO user_roles (
                            user_id,
                            role_id,
                            assigned_at,
                            valid_from,
                            org_company_code,
                            org_legal_entity_code,
                            org_plant_id,
                            org_site_id,
                            source_system,
                            source_record_id,
                            payload_schema_version
                         ) VALUES (
                            :user_id,
                            :role_id,
                            now(),
                            now(),
                            :org_company_code,
                            :org_legal_entity_code,
                            :org_plant_id,
                            :org_site_id,
                            :source_system,
                            :source_record_id,
                            :payload_schema_version
                         )
                         ON CONFLICT (user_id, role_id) DO UPDATE SET
                            valid_from = now(),
                            org_company_code = EXCLUDED.org_company_code,
                            org_legal_entity_code = EXCLUDED.org_legal_entity_code,
                            org_plant_id = EXCLUDED.org_plant_id,
                            org_site_id = EXCLUDED.org_site_id,
                            source_system = EXCLUDED.source_system,
                            source_record_id = EXCLUDED.source_record_id,
                            payload_schema_version = EXCLUDED.payload_schema_version',
                        [
                            ':user_id' => (string)($userRow['user_id'] ?? ''),
                            ':role_id' => $roleId,
                            ':org_company_code' => $orgCompanyCode,
                            ':org_legal_entity_code' => $orgLegalEntityCode,
                            ':org_plant_id' => $orgPlantId,
                            ':org_site_id' => $orgSiteId,
                            ':source_system' => 'AUTH_JSON',
                            ':source_record_id' => $username,
                            ':payload_schema_version' => '1.0',
                        ]
                    );
                }

                $this->db->execute(
                    'INSERT INTO employees (
                        employee_id,
                        employee_name,
                        user_id_code,
                        user_id,
                        role_code,
                        role_label,
                        dept_code,
                        shift,
                        is_active,
                        metadata,
                        created_at,
                        updated_at
                     ) VALUES (
                        :employee_id,
                        :employee_name,
                        :user_id_code,
                        :user_id,
                        :role_code,
                        :role_label,
                        :dept_code,
                        :shift,
                        :is_active,
                        :metadata::jsonb,
                        now(),
                        now()
                     )
                     ON CONFLICT (employee_id) DO UPDATE SET
                        employee_name = EXCLUDED.employee_name,
                        user_id_code = EXCLUDED.user_id_code,
                        user_id = EXCLUDED.user_id,
                        role_code = EXCLUDED.role_code,
                        role_label = EXCLUDED.role_label,
                        dept_code = EXCLUDED.dept_code,
                        shift = EXCLUDED.shift,
                        is_active = EXCLUDED.is_active,
                        metadata = COALESCE(employees.metadata, \'{}\'::jsonb) || EXCLUDED.metadata,
                        updated_at = now()',
                    [
                        ':employee_id' => $employeeId,
                        ':employee_name' => $fullName,
                        ':user_id_code' => $username,
                        ':user_id' => (string)($userRow['user_id'] ?? ''),
                        ':role_code' => $roleCode !== '' ? $roleCode : null,
                        ':role_label' => $positionTitle,
                        ':dept_code' => $deptCode,
                        ':shift' => null,
                        ':is_active' => !empty($user['active']),
                        ':metadata' => json_encode([
                            'phone' => (string)($user['phone'] ?? ''),
                            'cccd' => (string)($user['cccd'] ?? ''),
                            'avatar' => (string)($user['avatar'] ?? ''),
                            'avatar_icon' => (string)($user['avatar_icon'] ?? ($user['avatar'] ?? '')),
                            'avatar_image' => (string)($user['avatar_image'] ?? ''),
                            'avatar_url' => (string)($user['avatar_url'] ?? ''),
                            'source' => 'users.json',
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]
                );

                $orgUnitId = $linkage['hcm_org_unit_id'];
                $positionId = $linkage['hcm_position_id'];
                $employmentStatus = !empty($user['active']) ? 'active' : 'terminated';

                $this->db->execute(
                    'INSERT INTO hcm_employees (
                        employee_id,
                        hcm_position_id,
                        hcm_org_unit_id,
                        employment_status,
                        org_company_code,
                        org_legal_entity_code,
                        org_plant_id,
                        org_site_id,
                        source_system,
                        source_record_id,
                        payload_schema_version,
                        metadata,
                        created_at,
                        updated_at
                     ) VALUES (
                        :employee_id,
                        :position_id,
                        :org_unit_id,
                        :employment_status,
                        :org_company_code,
                        :org_legal_entity_code,
                        :org_plant_id,
                        :org_site_id,
                        :source_system,
                        :source_record_id,
                        :payload_schema_version,
                        :metadata::jsonb,
                        now(),
                        now()
                     )
                     ON CONFLICT (employee_id) DO UPDATE SET
                        hcm_position_id = EXCLUDED.hcm_position_id,
                        hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
                        employment_status = EXCLUDED.employment_status,
                        org_company_code = EXCLUDED.org_company_code,
                        org_legal_entity_code = EXCLUDED.org_legal_entity_code,
                        org_plant_id = EXCLUDED.org_plant_id,
                        org_site_id = EXCLUDED.org_site_id,
                        source_system = EXCLUDED.source_system,
                        source_record_id = EXCLUDED.source_record_id,
                        payload_schema_version = EXCLUDED.payload_schema_version,
                        metadata = COALESCE(hcm_employees.metadata, \'{}\'::jsonb) || EXCLUDED.metadata,
                        updated_at = now()',
                    [
                        ':employee_id' => $employeeId,
                        ':position_id' => $positionId,
                        ':org_unit_id' => $orgUnitId,
                        ':employment_status' => $employmentStatus,
                        ':org_company_code' => $orgCompanyCode,
                        ':org_legal_entity_code' => $orgLegalEntityCode,
                        ':org_plant_id' => $orgPlantId,
                        ':org_site_id' => $orgSiteId,
                        ':source_system' => 'AUTH_JSON',
                        ':source_record_id' => $username,
                        ':payload_schema_version' => '1.0',
                        ':metadata' => json_encode([
                            'source' => 'users.json',
                            'title' => $positionTitle,
                            'dept' => (string)($deptCode ?? $user['dept'] ?? ''),
                            'avatar' => (string)($user['avatar'] ?? ''),
                            'avatar_icon' => (string)($user['avatar_icon'] ?? ($user['avatar'] ?? '')),
                            'avatar_image' => (string)($user['avatar_image'] ?? ''),
                            'avatar_url' => (string)($user['avatar_url'] ?? ''),
                            'email_source' => $emailSource,
                            'assignment_linkage_source' => (($user['hcm_position_id'] ?? '') !== '' || ($user['hcm_org_unit_id'] ?? '') !== '') ? 'explicit_hcm_reference' : 'legacy_text_fallback',
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]
                );

                $this->syncUserPositionAssignments(
                    $user,
                    $employeeId,
                    $linkage,
                    $employmentStatus,
                    [
                        'org_company_code' => $orgCompanyCode,
                        'org_legal_entity_code' => $orgLegalEntityCode,
                        'org_plant_id' => $orgPlantId,
                        'org_site_id' => $orgSiteId,
                    ]
                );
            });
        } catch (Throwable $e) {
            @error_log('[AuthUserShadowSyncService] syncUser failed: ' . $e->getMessage());
        }
    }

    public function deactivateUser(string $username, ?string $employeeId = null): void
    {
        $username = strtolower(trim($username));
        if ($username === '') {
            return;
        }

        try {
            $this->db->transactional(function () use ($username, $employeeId): void {
                $employeeId = $employeeId !== null && trim($employeeId) !== ''
                    ? trim($employeeId)
                    : $this->employeeIdForUsername($username);

                $this->db->execute(
                    'UPDATE users SET status = :status, updated_at = now() WHERE username = :username',
                    [
                        ':status' => 'inactive',
                        ':username' => $username,
                    ]
                );

                $this->db->execute(
                    'UPDATE user_roles
                        SET valid_to = COALESCE(valid_to, now())
                      WHERE user_id IN (
                        SELECT user_id FROM users WHERE username = :username
                      )
                        AND source_system = :source_system',
                    [
                        ':username' => $username,
                        ':source_system' => 'AUTH_JSON',
                    ]
                );

                if ($employeeId === null) {
                    return;
                }

                $this->db->execute(
                    'UPDATE employees
                        SET is_active = FALSE,
                            termination_date = COALESCE(termination_date, CURRENT_DATE),
                            updated_at = now()
                      WHERE employee_id = :employee_id',
                    [':employee_id' => $employeeId]
                );

                $this->db->execute(
                    'UPDATE hcm_employees
                        SET employment_status = :status,
                            updated_at = now()
                      WHERE employee_id = :employee_id',
                    [
                        ':status' => 'terminated',
                        ':employee_id' => $employeeId,
                    ]
                );

                if ($this->tableExists('hcm_employee_position_assignments')) {
                    $this->db->execute(
                        'UPDATE hcm_employee_position_assignments
                            SET assignment_status = :status,
                                effective_to = COALESCE(effective_to, CURRENT_DATE),
                                updated_at = now()
                          WHERE employee_id = :employee_id
                            AND source_system = :source_system
                            AND assignment_status = :active_status',
                        [
                            ':status' => 'ended',
                            ':employee_id' => $employeeId,
                            ':source_system' => 'AUTH_JSON',
                            ':active_status' => 'active',
                        ]
                    );
                }
            });
        } catch (Throwable $e) {
            @error_log('[AuthUserShadowSyncService] deactivateUser failed: ' . $e->getMessage());
        }
    }

    private function validDeptCode(string $deptCode): ?string
    {
        $deptCode = strtoupper(trim($deptCode));
        if ($deptCode === '') {
            return null;
        }

        try {
            $row = $this->db->queryOne(
                'SELECT dept_code FROM departments WHERE dept_code = :dept_code LIMIT 1',
                [':dept_code' => $deptCode]
            );
            return is_array($row) ? (string)($row['dept_code'] ?? '') ?: null : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function roleIdForCode(string $roleCode): ?string
    {
        $roleCode = trim($roleCode);
        if ($roleCode === '') {
            return null;
        }

        $row = $this->db->queryOne(
            'SELECT role_id
               FROM roles
              WHERE role_code = :role_code
                AND is_active IS NOT FALSE
              LIMIT 1',
            [':role_code' => $roleCode]
        );
        return is_array($row) ? (string)($row['role_id'] ?? '') ?: null : null;
    }

    /**
     * @return array{
     *   dept_code:?string,
     *   hcm_org_unit_id:?string,
     *   hcm_position_id:?string,
     *   position_title:string
     * }
     */
    private function resolveUserLinkage(array $user): array
    {
        $deptCode = $this->validDeptCode((string)($user['dept'] ?? ''));
        $roleCode = trim((string)($user['role'] ?? ''));
        $requestedOrgUnitId = $this->validOrgUnitId((string)($user['hcm_org_unit_id'] ?? ''));
        $requestedPosition = $this->positionRecordForId((string)($user['hcm_position_id'] ?? ''));
        $submittedTitle = trim((string)($user['title'] ?? ''));

        if ($requestedOrgUnitId !== null && $deptCode !== null) {
            $requestedDeptCode = $this->orgUnitCodeForId($requestedOrgUnitId);
            if ($requestedDeptCode !== null && strtoupper($requestedDeptCode) !== strtoupper($deptCode)) {
                $requestedOrgUnitId = null;
            }
        }

        if (is_array($requestedPosition)) {
            $positionOrgUnitId = (string)($requestedPosition['hcm_org_unit_id'] ?? '') ?: null;
            $positionDeptCode = $positionOrgUnitId !== null ? $this->orgUnitCodeForId($positionOrgUnitId) : null;
            $positionTitle = trim((string)($requestedPosition['position_title'] ?? ''));
            $titleMismatch = $submittedTitle !== ''
                && $this->normalizeComparableTitle($positionTitle) !== $this->normalizeComparableTitle($submittedTitle);
            $deptMismatch = $deptCode !== null
                && $positionDeptCode !== null
                && strtoupper($positionDeptCode) !== strtoupper($deptCode);
            if ($titleMismatch || $deptMismatch) {
                $requestedPosition = null;
            }
        }

        $orgUnitId = $requestedOrgUnitId;
        $positionId = is_array($requestedPosition) ? (string)($requestedPosition['hcm_position_id'] ?? '') ?: null : null;
        $positionTitle = $submittedTitle;

        if ($orgUnitId === null && $deptCode !== null) {
            $orgUnitId = $this->orgUnitIdForCode($deptCode);
        }

        if (is_array($requestedPosition)) {
            $positionOrgUnitId = (string)($requestedPosition['hcm_org_unit_id'] ?? '') ?: null;
            if ($positionOrgUnitId !== null) {
                $orgUnitId = $positionOrgUnitId;
            }
            if ($positionTitle === '') {
                $positionTitle = trim((string)($requestedPosition['position_title'] ?? ''));
            }
        }

        if ($positionId === null && $positionTitle !== '') {
            $positionId = $this->positionIdForAssignment($orgUnitId, $positionTitle);
            if ($positionId !== null) {
                $requestedPosition = $this->positionRecordForId($positionId);
            }
        }

        if ($positionId === null && $roleCode !== '') {
            $requestedPosition = $this->positionRecordForRoleCode($orgUnitId, $roleCode);
            if (is_array($requestedPosition)) {
                $positionId = (string)($requestedPosition['hcm_position_id'] ?? '') ?: null;
                $positionTitle = trim((string)($requestedPosition['position_title'] ?? $positionTitle));
            }
        }

        if (is_array($requestedPosition)) {
            $positionOrgUnitId = (string)($requestedPosition['hcm_org_unit_id'] ?? '') ?: null;
            if ($positionOrgUnitId !== null) {
                $orgUnitId = $positionOrgUnitId;
            }
            if ($positionTitle === '') {
                $positionTitle = trim((string)($requestedPosition['position_title'] ?? ''));
            }
        }

        if ($deptCode === null && $orgUnitId !== null) {
            $deptCode = $this->orgUnitCodeForId($orgUnitId);
        }

        return [
            'dept_code' => $deptCode,
            'hcm_org_unit_id' => $orgUnitId,
            'hcm_position_id' => $positionId,
            'position_title' => $positionTitle,
        ];
    }

    private function validOrgUnitId(string $orgUnitId): ?string
    {
        $orgUnitId = $this->nullableUuid($orgUnitId);
        if ($orgUnitId === null) {
            return null;
        }

        $row = $this->db->queryOne(
            'SELECT hcm_org_unit_id
               FROM hcm_org_units
              WHERE hcm_org_unit_id = :hcm_org_unit_id
              LIMIT 1',
            [':hcm_org_unit_id' => $orgUnitId]
        );
        return is_array($row) ? (string)($row['hcm_org_unit_id'] ?? '') ?: null : null;
    }

    private function orgUnitIdForCode(string $orgUnitCode): ?string
    {
        $orgUnitCode = strtoupper(trim($orgUnitCode));
        if ($orgUnitCode === '') {
            return null;
        }

        $row = $this->db->queryOne(
            'SELECT hcm_org_unit_id
               FROM hcm_org_units
              WHERE org_unit_code = :org_unit_code
              ORDER BY CASE WHEN status = \'active\' THEN 0 ELSE 1 END, updated_at DESC
              LIMIT 1',
            [':org_unit_code' => $orgUnitCode]
        );
        return is_array($row) ? (string)($row['hcm_org_unit_id'] ?? '') ?: null : null;
    }

    private function orgUnitCodeForId(string $orgUnitId): ?string
    {
        $orgUnitId = $this->nullableUuid($orgUnitId);
        if ($orgUnitId === null) {
            return null;
        }

        $row = $this->db->queryOne(
            'SELECT org_unit_code
               FROM hcm_org_units
              WHERE hcm_org_unit_id = :hcm_org_unit_id
              LIMIT 1',
            [':hcm_org_unit_id' => $orgUnitId]
        );
        return is_array($row) ? (string)($row['org_unit_code'] ?? '') ?: null : null;
    }

    private function positionRecordForId(string $positionId): ?array
    {
        $positionId = $this->nullableUuid($positionId);
        if ($positionId === null) {
            return null;
        }

        $row = $this->db->queryOne(
            'SELECT hcm_position_id, hcm_org_unit_id, position_title
               FROM hcm_positions
              WHERE hcm_position_id = :hcm_position_id
              ORDER BY CASE WHEN status = \'active\' THEN 0 ELSE 1 END, updated_at DESC
              LIMIT 1',
            [':hcm_position_id' => $positionId]
        );
        return is_array($row) ? $row : null;
    }

    private function positionIdForAssignment(?string $orgUnitId, string $title): ?string
    {
        $title = trim($title);
        if ($title === '') {
            return null;
        }

        $params = [':position_title' => $title];
        $sql = 'SELECT hcm_position_id
                  FROM hcm_positions
                 WHERE position_title = :position_title';
        if ($orgUnitId !== null && $orgUnitId !== '') {
            $sql .= ' AND hcm_org_unit_id = :org_unit_id';
            $params[':org_unit_id'] = $orgUnitId;
        }
        $sql .= ' ORDER BY CASE WHEN status = \'active\' THEN 0 ELSE 1 END, updated_at DESC LIMIT 1';

        $row = $this->db->queryOne($sql, $params);
        if (is_array($row) && !empty($row['hcm_position_id'])) {
            return (string)$row['hcm_position_id'];
        }

        $normalizedTitle = $this->normalizeComparableTitle($title);
        if ($normalizedTitle !== '') {
            $records = $this->positionCandidatesForMatching($orgUnitId);
            foreach ($records as $record) {
                if ($this->normalizeComparableTitle((string)($record['position_title'] ?? '')) === $normalizedTitle) {
                    return (string)($record['hcm_position_id'] ?? '') ?: null;
                }
            }
        }

        if ($orgUnitId !== null && $orgUnitId !== '') {
            $row = $this->db->queryOne(
                'SELECT hcm_position_id
                   FROM hcm_positions
                  WHERE position_title = :position_title
                  ORDER BY CASE WHEN status = \'active\' THEN 0 ELSE 1 END, updated_at DESC
                  LIMIT 1',
                [':position_title' => $title]
            );
            return is_array($row) ? (string)($row['hcm_position_id'] ?? '') ?: null : null;
        }

        return null;
    }

    private function positionRecordForRoleCode(?string $orgUnitId, string $roleCode): ?array
    {
        $roleCode = trim($roleCode);
        if ($roleCode === '') {
            return null;
        }

        $role = $this->db->queryOne(
            'SELECT role_label, role_label_vi
               FROM roles
              WHERE role_code = :role_code
                AND is_active IS NOT FALSE
              LIMIT 1',
            [':role_code' => $roleCode]
        );
        if (!is_array($role)) {
            return null;
        }

        $candidates = array_values(array_unique(array_filter([
            trim((string)($role['role_label'] ?? '')),
            trim((string)($role['role_label_vi'] ?? '')),
        ])));
        foreach ($candidates as $candidate) {
            $positionId = $this->positionIdForAssignment($orgUnitId, $candidate);
            if ($positionId !== null) {
                return $this->positionRecordForId($positionId);
            }
        }

        return null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function positionCandidatesForMatching(?string $orgUnitId): array
    {
        $params = [];
        $sql = 'SELECT hcm_position_id, position_title
                  FROM hcm_positions';
        if ($orgUnitId !== null && $orgUnitId !== '') {
            $sql .= ' WHERE hcm_org_unit_id = :org_unit_id';
            $params[':org_unit_id'] = $orgUnitId;
        }
        $sql .= ' ORDER BY CASE WHEN status = \'active\' THEN 0 ELSE 1 END, updated_at DESC';

        $rows = $this->db->query($sql, $params);
        return $rows;
    }

    private function normalizeComparableTitle(string $title): string
    {
        $title = mb_strtolower(trim($title), 'UTF-8');
        if ($title === '') {
            return '';
        }

        $title = str_replace(['&', '/', '_', '-'], [' and ', ' ', ' ', ' '], $title);
        $title = preg_replace('/[^[:alnum:]\s]+/u', ' ', $title) ?: $title;
        $title = preg_replace('/\s+/u', ' ', $title) ?: $title;
        return trim($title);
    }

    private function employeeIdForUsername(string $username): ?string
    {
        $row = $this->db->queryOne(
            'SELECT employee_id FROM users WHERE username = :username LIMIT 1',
            [':username' => $username]
        );
        return is_array($row) ? (string)($row['employee_id'] ?? '') ?: null : null;
    }

    private function nullableCode(string $value): ?string
    {
        $value = trim($value);
        return $value !== '' ? $value : null;
    }

    private function nullableUuid(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        return preg_match('/^[0-9a-fA-F-]{36}$/', $value) === 1 ? strtolower($value) : null;
    }

    private function tableExists(string $table): bool
    {
        try {
            $row = $this->db->queryOne(
                'SELECT to_regclass(:table_name) AS table_name',
                [':table_name' => 'public.' . $table]
            );
            return is_array($row) && trim((string)($row['table_name'] ?? '')) !== '';
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return list<string>
     */
    private function userRoleCodes(array $user): array
    {
        $roles = [];
        $add = static function (mixed $role) use (&$roles): void {
            if (!is_scalar($role)) {
                return;
            }
            $roleCode = strtolower(trim((string)$role));
            if ($roleCode !== '') {
                $roles[$roleCode] = true;
            }
        };

        if (is_array($user['roles'] ?? null)) {
            foreach ((array)$user['roles'] as $role) {
                $add($role);
            }
        }
        $add($user['role'] ?? '');

        return array_keys($roles);
    }

    /**
     * @return list<array{position:array<string,mixed>, assignment_type:string, source_key:string, role_code:?string}>
     */
    private function desiredUserPositionAssignments(array $user, array $linkage): array
    {
        $desired = [];
        $seen = [];
        $orgUnitId = $this->nullableUuid((string)($linkage['hcm_org_unit_id'] ?? ''));
        $primaryPositionId = $this->nullableUuid((string)($linkage['hcm_position_id'] ?? ''));
        $primaryPosition = $primaryPositionId !== null ? $this->positionRecordForId($primaryPositionId) : null;

        if (!is_array($primaryPosition) && $primaryPositionId !== null && $orgUnitId !== null) {
            $primaryPosition = [
                'hcm_position_id' => $primaryPositionId,
                'hcm_org_unit_id' => $orgUnitId,
                'position_title' => trim((string)($linkage['position_title'] ?? $user['title'] ?? '')),
            ];
        }

        $add = static function (array $position, string $assignmentType, string $sourceKey, ?string $roleCode) use (&$desired, &$seen): void {
            $positionId = trim((string)($position['hcm_position_id'] ?? ''));
            $unitId = trim((string)($position['hcm_org_unit_id'] ?? ''));
            if ($positionId === '' || $unitId === '') {
                return;
            }
            $assignmentType = in_array($assignmentType, ['primary', 'role', 'concurrent', 'acting', 'backup', 'temporary'], true)
                ? $assignmentType
                : 'role';
            $key = $positionId . '|' . $assignmentType;
            if (isset($seen[$key])) {
                return;
            }
            $seen[$key] = true;
            $desired[] = [
                'position' => $position,
                'assignment_type' => $assignmentType,
                'source_key' => substr($sourceKey, 0, 120),
                'role_code' => $roleCode,
            ];
        };

        if (is_array($primaryPosition)) {
            $add($primaryPosition, 'primary', 'primary', null);
        }

        foreach ($this->userRoleCodes($user) as $roleCode) {
            $rolePosition = $this->positionRecordForRoleCode($orgUnitId, $roleCode);
            if (!is_array($rolePosition)) {
                continue;
            }
            $rolePositionId = trim((string)($rolePosition['hcm_position_id'] ?? ''));
            if ($primaryPositionId !== null && $rolePositionId === $primaryPositionId) {
                continue;
            }
            $add($rolePosition, 'role', 'role:' . $roleCode, $roleCode);
        }

        return $desired;
    }

    /**
     * @param list<string> $keepSourceIds
     */
    private function endStaleAuthJsonAssignments(string $employeeId, string $username, array $keepSourceIds = []): void
    {
        $params = [
            ':employee_id' => $employeeId,
            ':source_system' => 'AUTH_JSON',
            ':source_prefix' => strtr($username, ['\\' => '\\\\', '%' => '\\%', '_' => '\\_']) . ':%',
            ':active_status' => 'active',
            ':ended_status' => 'ended',
        ];
        $sql = 'UPDATE hcm_employee_position_assignments
                   SET assignment_status = :ended_status,
                       effective_to = COALESCE(effective_to, CURRENT_DATE),
                       updated_at = now()
                 WHERE employee_id = :employee_id
                   AND source_system = :source_system
                   AND source_record_id LIKE :source_prefix ESCAPE \'\\\'
                   AND assignment_status = :active_status';
        if ($keepSourceIds !== []) {
            $placeholders = [];
            foreach (array_values($keepSourceIds) as $idx => $sourceId) {
                $ph = ':keep_' . $idx;
                $placeholders[] = $ph;
                $params[$ph] = $sourceId;
            }
            $sql .= ' AND source_record_id NOT IN (' . implode(',', $placeholders) . ')';
        }
        $this->db->execute($sql, $params);
    }

    /**
     * SVC-021 (CRITICAL): Get the current role from the authoritative DB source.
     * Only the DB is the source of truth for user roles during sync.
     *
     * @return ?string The current role_code from database, or null if user doesn't exist
     */
    private function getCurrentUserRole(string $username): ?string
    {
        try {
            $row = $this->db->queryOne(
                'SELECT r.role_code
                   FROM users u
                   LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.valid_to IS NULL
                   LEFT JOIN roles r ON ur.role_id = r.role_id
                  WHERE u.username = :username
                  LIMIT 1',
                [':username' => $username]
            );
            if (!is_array($row)) {
                return null;
            }
            return trim((string)($row['role_code'] ?? '')) ?: null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Keep the canonical shadow tables aligned with the runtime role catalog.
     *
     * The admin write path already gates who can change users. This layer must
     * not maintain a second hardcoded hierarchy because production roles are
     * governed by core_system.roles.
     */
    private function validateRuntimeRoleCode(?string $currentRole, string $requestedRoleCode, string $username): string
    {
        $requestedRoleCode = strtolower(trim($requestedRoleCode));
        if ($requestedRoleCode === '') {
            return '';
        }

        if ($this->roleIdForCode($requestedRoleCode) !== null) {
            return $requestedRoleCode;
        }

        $currentRole = $currentRole !== null ? strtolower(trim($currentRole)) : null;
        if ($currentRole !== null && $currentRole !== '') {
            @error_log(
                '[AuthUserShadowSyncService] Unknown role ignored during shadow sync: ' .
                "user={$username} current_role={$currentRole} requested_role={$requestedRoleCode}"
            );
            return $currentRole;
        }

        @error_log(
            '[AuthUserShadowSyncService] Unknown role ignored during shadow sync: ' .
            "user={$username} requested_role={$requestedRoleCode}"
        );
        return '';
    }

    /**
     * Mirror the admin user list into the canonical multi-position bridge.
     *
     * @param array<string, mixed> $user
     * @param array<string, mixed> $linkage
     * @param array<string, mixed> $orgContext
     */
    private function syncUserPositionAssignments(
        array $user,
        ?string $employeeId,
        array $linkage,
        string $employmentStatus,
        array $orgContext
    ): void {
        $employeeId = trim((string)($employeeId ?? ''));
        $username = strtolower(trim((string)($user['username'] ?? '')));
        if ($employeeId === '' || $username === '') {
            return;
        }
        if (!$this->tableExists('hcm_employee_position_assignments')) {
            return;
        }

        if ($employmentStatus !== 'active') {
            $this->endStaleAuthJsonAssignments($employeeId, $username);
            return;
        }

        $desired = $this->desiredUserPositionAssignments($user, $linkage);
        if ($desired === []) {
            $this->endStaleAuthJsonAssignments($employeeId, $username);
            return;
        }

        $keepSourceIds = [];
        foreach ($desired as $assignment) {
            $position = $assignment['position'];
            $positionId = (string)($position['hcm_position_id'] ?? '');
            $orgUnitId = (string)($position['hcm_org_unit_id'] ?? '');
            $assignmentType = $assignment['assignment_type'];
            $sourceRecordId = substr($username . ':' . $assignment['source_key'], 0, 120);
            $keepSourceIds[] = $sourceRecordId;
            $metadata = [
                'source' => 'users.json',
                'username' => $username,
                'name' => (string)($user['name'] ?? ''),
                'title' => (string)($position['position_title'] ?? $linkage['position_title'] ?? $user['title'] ?? ''),
                'role_code' => (string)($assignment['role_code'] ?? $user['role'] ?? ''),
                'assignment_linkage_source' => (($user['hcm_position_id'] ?? '') !== '' || ($user['hcm_org_unit_id'] ?? '') !== '') ? 'explicit_hcm_reference' : 'admin_user_list',
            ];

            $this->db->execute(
                'INSERT INTO hcm_employee_position_assignments (
                    employee_id,
                    hcm_position_id,
                    hcm_org_unit_id,
                    assignment_type,
                    assignment_status,
                    is_primary,
                    org_company_code,
                    org_legal_entity_code,
                    org_plant_id,
                    org_site_id,
                    source_system,
                    source_record_id,
                    payload_schema_version,
                    metadata,
                    created_at,
                    updated_at
                 ) VALUES (
                    :employee_id,
                    :position_id,
                    :org_unit_id,
                    :assignment_type,
                    :assignment_status,
                    :is_primary,
                    :org_company_code,
                    :org_legal_entity_code,
                    :org_plant_id,
                    :org_site_id,
                    :source_system,
                    :source_record_id,
                    :payload_schema_version,
                    :metadata::jsonb,
                    now(),
                    now()
                 )
                 ON CONFLICT (employee_id, hcm_position_id, assignment_type, source_system, source_record_id)
                 WHERE assignment_status = \'active\'
                 DO UPDATE SET
                    hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
                    assignment_status = EXCLUDED.assignment_status,
                    is_primary = EXCLUDED.is_primary,
                    effective_to = NULL,
                    org_company_code = EXCLUDED.org_company_code,
                    org_legal_entity_code = EXCLUDED.org_legal_entity_code,
                    org_plant_id = EXCLUDED.org_plant_id,
                    org_site_id = EXCLUDED.org_site_id,
                    payload_schema_version = EXCLUDED.payload_schema_version,
                    metadata = COALESCE(hcm_employee_position_assignments.metadata, \'{}\'::jsonb) || EXCLUDED.metadata,
                    updated_at = now()',
                [
                    ':employee_id' => $employeeId,
                    ':position_id' => $positionId,
                    ':org_unit_id' => $orgUnitId,
                    ':assignment_type' => $assignmentType,
                    ':assignment_status' => 'active',
                    ':is_primary' => $assignmentType === 'primary',
                    ':org_company_code' => $orgContext['org_company_code'] ?? null,
                    ':org_legal_entity_code' => $orgContext['org_legal_entity_code'] ?? null,
                    ':org_plant_id' => $orgContext['org_plant_id'] ?? null,
                    ':org_site_id' => $orgContext['org_site_id'] ?? null,
                    ':source_system' => 'AUTH_JSON',
                    ':source_record_id' => $sourceRecordId,
                    ':payload_schema_version' => '1.0',
                    ':metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ]
            );
        }

        $this->endStaleAuthJsonAssignments($employeeId, $username, array_values(array_unique($keepSourceIds)));
    }
}
