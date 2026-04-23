<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * InputSanitizer - Extracted from legacy api.php.
 *
 * Encapsulates sanitization helpers that were previously global functions:
 *   sanitize_code()                -> InputSanitizer::code()
 *   sanitize_role_permission_row() -> InputSanitizer::rolePermissionRow()
 *   normalize_permission_value_list() -> InputSanitizer::normalizePermissionList()
 *   sanitize_user_for_client()     -> InputSanitizer::userForClient()
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class InputSanitizer
{
    /**
     * Sanitize a document code: uppercase, trim, replace invalid chars with underscore.
     * Equivalent to legacy: sanitize_code($code)
     */
    public static function code(string $code): string
    {
        $code = strtoupper(trim($code));
        return preg_replace('/[^A-Z0-9_\-\.]/', '_', $code);
    }

    /**
     * Normalize a permission value list to a clean array of unique strings.
     * Equivalent to legacy: normalize_permission_value_list($value)
     */
    public static function normalizePermissionList(mixed $value): array
    {
        if (!is_array($value)) return [];
        $patterns = [];
        foreach ($value as $item) {
            if (!is_scalar($item)) continue;
            $pattern = trim((string)$item);
            if ($pattern === '') continue;
            $patterns[] = $pattern;
        }
        return array_values(array_unique($patterns));
    }

    /**
     * Sanitize a role permission configuration row.
     * Equivalent to legacy: sanitize_role_permission_row($row)
     */
    public static function rolePermissionRow(array $row): array
    {
        $clean = [
            'canEditDocs' => (bool)($row['canEditDocs'] ?? false),
            'canCreateDocs' => (bool)($row['canCreateDocs'] ?? false),
        ];

        if (!empty($row['allowAllPermissions'])) {
            $clean['allowAllPermissions'] = true;
        }

        $patterns = [];
        foreach (['permissions', 'permission_keys', 'grants'] as $field) {
            $patterns = array_merge($patterns, self::normalizePermissionList($row[$field] ?? null));
        }
        $patterns = array_values(array_unique($patterns));
        if ($patterns !== []) {
            $clean['permissions'] = $patterns;
        }

        $denies = self::normalizePermissionList($row['denies'] ?? null);
        if ($denies !== []) {
            $clean['denies'] = $denies;
        }

        foreach ($row as $key => $value) {
            $permissionKey = trim((string)$key);
            if ($permissionKey === '' || in_array($permissionKey, ['canEditDocs', 'canCreateDocs', 'allowAllPermissions', 'permissions', 'permission_keys', 'grants', 'denies'], true)) {
                continue;
            }
            if (!is_bool($value)) continue;
            $clean[$permissionKey] = (bool)$value;
        }

        return $clean;
    }

    /**
     * Strip sensitive fields from a user record for client consumption.
     * Equivalent to legacy: sanitize_user_for_client($user)
     */
    public static function userForClient(array $user): array
    {
        return [
            'employee_id'          => (string)($user['employee_id'] ?? ''),
            'username'             => (string)($user['username'] ?? ''),
            'active'               => (bool)($user['active'] ?? true),
            'role'                 => (string)($user['role'] ?? 'user'),
            'name'                 => (string)($user['name'] ?? ''),
            'dept'                 => (string)($user['dept'] ?? ''),
            'title'                => (string)($user['title'] ?? ''),
            'hcm_org_unit_id'      => (string)($user['hcm_org_unit_id'] ?? ''),
            'hcm_position_id'      => (string)($user['hcm_position_id'] ?? ''),
            'cccd'                 => self::maskPii((string)($user['cccd'] ?? '')),
            'phone'                => self::maskPii((string)($user['phone'] ?? '')),
            'personal_email'       => self::maskEmail((string)($user['personal_email'] ?? '')),
            'org_company_code'     => (string)($user['org_company_code'] ?? ''),
            'org_legal_entity_code' => (string)($user['org_legal_entity_code'] ?? ''),
            'org_plant_id'         => (string)($user['org_plant_id'] ?? ''),
            'org_site_id'          => (string)($user['org_site_id'] ?? ''),
            'mfa'                  => ['enabled' => is_array($user['mfa'] ?? null) && (bool)($user['mfa']['enabled'] ?? false)],
            'updated_at'           => (string)($user['updated_at'] ?? ''),
            'created_at'           => (string)($user['created_at'] ?? ''),
        ];
    }

    /**
     * Mask personally identifiable information for safe display.
     *
     * @param string $value Value to mask.
     * @param int $visibleChars Number of trailing characters to keep visible.
     * @return string Masked value.
     */
    private static function maskPii(string $value, int $visibleChars = 4): string
    {
        $len = mb_strlen($value);
        if ($len <= $visibleChars) {
            return str_repeat('*', $len);
        }
        return str_repeat('*', $len - $visibleChars) . mb_substr($value, -$visibleChars);
    }

    /**
     * Mask email address for safe display.
     * Format: keep first 2 characters + *** + domain
     * Example: sa***@gmail.com
     *
     * @param string $email Email address to mask.
     * @return string Masked email.
     */
    private static function maskEmail(string $email): string
    {
        if ($email === '') {
            return '';
        }

        $parts = explode('@', $email, 2);
        if (count($parts) !== 2) {
            // Invalid email format, mask entirely
            return str_repeat('*', mb_strlen($email));
        }

        $local = $parts[0];
        $domain = $parts[1];

        // Keep first 2 characters of local part, mask the rest
        $visibleChars = 2;
        $localLen = mb_strlen($local);
        if ($localLen <= $visibleChars) {
            // Short local part, mask all but first char
            $masked = mb_substr($local, 0, 1) . str_repeat('*', max(1, $localLen - 1));
        } else {
            $masked = mb_substr($local, 0, $visibleChars) . str_repeat('*', $localLen - $visibleChars);
        }

        return $masked . '@' . $domain;
    }
}
