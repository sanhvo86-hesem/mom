<?php

declare(strict_types=1);

/**
 * SCIM-equivalent one-shot sync: push the 80 users from
 * mom/data/config/users.json into the running Keycloak realm via the
 * Keycloak Admin API.
 *
 * Idempotent: existing users are updated in place by username match.
 *
 * Usage on VPS:
 *   sudo -u www-data php tools/keycloak/scripts/sync-users-from-json.php \
 *     --kc-url http://127.0.0.1:8080/auth \
 *     --realm hesem \
 *     --admin-user kc-admin \
 *     --admin-password "$(grep KEYCLOAK_ADMIN_PASSWORD /var/www/data-private/secrets/keycloak.env | cut -d= -f2-)"
 *
 * What it pushes per user:
 *   - username, email, firstName/lastName (parsed from full_name)
 *   - enabled = active
 *   - emailVerified = true (HESEM-managed users)
 *   - realmRoles = [ ROLES[u.role].kc_role ?? u.role ]
 *   - attributes:
 *       employee_id, dept, hcm_position_id, hcm_org_unit_id, jd_code
 *   - credentials:
 *       (NOT pushed — users go through "Forgot password" or are migrated
 *        one-by-one via Keycloak's hash-import feature once their bcrypt
 *        is verified locally. Phase 2 spec.)
 *
 * After running this script:
 *   - Open https://eqms.hesemeng.com/auth/admin/master/console/#/hesem/users
 *   - All 80 HESEM users visible with correct roles, no passwords.
 *   - Each user must do "forgot password" on first KC login to set a new
 *     Argon2id password under Keycloak's policy.
 */

const OPTS = ['kc-url', 'realm', 'admin-user', 'admin-password', 'users-file'];

$args = [];
for ($i = 1; $i < $argc; $i++) {
    if (str_starts_with($argv[$i], '--')) {
        $key = substr($argv[$i], 2);
        $val = $argv[++$i] ?? '';
        $args[$key] = $val;
    }
}

foreach (['kc-url', 'realm', 'admin-user', 'admin-password'] as $required) {
    if (empty($args[$required])) {
        fwrite(STDERR, "Missing --$required\n");
        exit(2);
    }
}

$kcUrl   = rtrim($args['kc-url'], '/');
$realm   = $args['realm'];
$usersFile = $args['users-file'] ?? '/var/www/eqms.hesemeng.com/mom/data/config/users.json';

if (!is_file($usersFile)) {
    fwrite(STDERR, "users.json not found: $usersFile\n");
    exit(2);
}

// 1. Get admin access token via password grant against master realm.
$token = adminToken($kcUrl, $args['admin-user'], $args['admin-password']);
if ($token === null) exit(3);

// 2. For each user in users.json, upsert into KC realm.
$raw = json_decode((string)file_get_contents($usersFile), true);
$users = $raw['users'] ?? [];
$inserted = 0;
$updated = 0;
$skipped = 0;

foreach ($users as $u) {
    $username = strtolower(trim((string)($u['username'] ?? '')));
    if ($username === '') { $skipped++; continue; }

    $existing = findUserByUsername($kcUrl, $realm, $token, $username);
    $names = explode(' ', trim((string)($u['name'] ?? '')), 2);
    $firstName = $names[0] ?? '';
    $lastName  = $names[1] ?? '';
    $role = strtolower(trim((string)($u['role'] ?? '')));

    $repr = [
        'username' => $username,
        'enabled'  => (bool)($u['active'] ?? true),
        'email'    => trim((string)($u['personal_email'] ?? "$username@hesem.com.vn")),
        'firstName' => $firstName,
        'lastName' => $lastName,
        'emailVerified' => true,
        'attributes' => [
            'employee_id' => [(string)($u['employee_id'] ?? '')],
            'dept'        => [(string)($u['dept'] ?? '')],
            'hcm_position_id' => [(string)($u['hcm_position_id'] ?? '')],
            'hcm_org_unit_id' => [(string)($u['hcm_org_unit_id'] ?? '')],
            'jd_code'     => [(string)($u['jd_code'] ?? '')],
        ],
    ];

    if ($existing === null) {
        $userId = createUser($kcUrl, $realm, $token, $repr);
        if ($userId === null) { $skipped++; continue; }
        $inserted++;
    } else {
        $userId = $existing['id'];
        updateUser($kcUrl, $realm, $token, $userId, $repr);
        $updated++;
    }

    if ($role !== '') {
        assignRealmRole($kcUrl, $realm, $token, $userId, $role);
    }
}

echo "inserted=$inserted updated=$updated skipped=$skipped\n";
exit(0);

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function adminToken(string $kcUrl, string $user, string $pass): ?string
{
    $ch = curl_init("$kcUrl/realms/master/protocol/openid-connect/token");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'password',
            'client_id' => 'admin-cli',
            'username' => $user,
            'password' => $pass,
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200) {
        fwrite(STDERR, "admin token request failed: $code $resp\n");
        return null;
    }
    $data = json_decode((string)$resp, true);
    return $data['access_token'] ?? null;
}

function findUserByUsername(string $kcUrl, string $realm, string $token, string $username): ?array
{
    $ch = curl_init("$kcUrl/admin/realms/$realm/users?username=" . urlencode($username) . '&exact=true');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    $rows = json_decode((string)$resp, true);
    return is_array($rows) && !empty($rows) ? $rows[0] : null;
}

function createUser(string $kcUrl, string $realm, string $token, array $repr): ?string
{
    $ch = curl_init("$kcUrl/admin/realms/$realm/users");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_POSTFIELDS => json_encode($repr, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token", "Content-Type: application/json"],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($code !== 201) {
        fwrite(STDERR, "create user failed for {$repr['username']}: $code\n");
        curl_close($ch);
        return null;
    }
    $headers = substr($resp, 0, curl_getinfo($ch, CURLINFO_HEADER_SIZE));
    curl_close($ch);
    if (preg_match('#Location:.+/users/([0-9a-f-]+)#i', $headers, $m)) {
        return $m[1];
    }
    return null;
}

function updateUser(string $kcUrl, string $realm, string $token, string $userId, array $repr): void
{
    $ch = curl_init("$kcUrl/admin/realms/$realm/users/$userId");
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => json_encode($repr, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token", "Content-Type: application/json"],
    ]);
    curl_exec($ch);
    curl_close($ch);
}

function assignRealmRole(string $kcUrl, string $realm, string $token, string $userId, string $roleName): void
{
    $ch = curl_init("$kcUrl/admin/realms/$realm/roles/" . urlencode($roleName));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token"],
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    $role = json_decode((string)$resp, true);
    if (!is_array($role) || empty($role['id'])) return;

    $ch = curl_init("$kcUrl/admin/realms/$realm/users/$userId/role-mappings/realm");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => json_encode([$role], JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $token", "Content-Type: application/json"],
    ]);
    curl_exec($ch);
    curl_close($ch);
}
