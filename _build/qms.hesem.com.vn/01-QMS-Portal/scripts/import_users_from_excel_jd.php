#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Import users from the company Excel list into the HESEM QMS runtime store.
 *
 * Key rules:
 * - Remove sample users and rebuild the runtime user list from Excel.
 * - Preserve the existing CEO account to avoid breaking the live director login.
 * - Map each employee to the nearest published JD in the organization documents.
 * - Keep the portal permission role compatible with the current runtime role model.
 * - Generate a strong password only for rows where the password cell is blank.
 * - Resolve duplicate usernames by appending the last 4 CCCD digits.
 */

const SHEET_MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const SHEET_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

main($argv);

function main(array $argv): void
{
    $options = parse_options($argv);
    $usersFile = $options['users'];
    $xlsxFile = $options['xlsx'];
    $reportDir = $options['report_dir'];
    $apply = $options['apply'];

    if (!is_file($usersFile)) {
        fwrite(STDERR, "Users file not found: {$usersFile}\n");
        exit(1);
    }
    if (!is_file($xlsxFile)) {
        fwrite(STDERR, "Excel file not found: {$xlsxFile}\n");
        exit(1);
    }
    if (!class_exists('ZipArchive')) {
        fwrite(STDERR, "ZipArchive is required to read XLSX files.\n");
        exit(1);
    }

    $store = json_decode((string)file_get_contents($usersFile), true);
    if (!is_array($store) || !isset($store['users']) || !is_array($store['users'])) {
        fwrite(STDERR, "Invalid users.json structure.\n");
        exit(1);
    }

    $rows = parse_xlsx_rows($xlsxFile);
    if (!$rows) {
        fwrite(STDERR, "No employee rows found in Excel.\n");
        exit(1);
    }

    $existingByUsername = [];
    foreach ($store['users'] as $user) {
        if (!is_array($user)) {
            continue;
        }
        $existingByUsername[strtolower((string)($user['username'] ?? ''))] = $user;
    }

    $duplicateCounts = [];
    foreach ($rows as $row) {
        $baseUsername = strtolower(trim((string)($row['Username'] ?? '')));
        if ($baseUsername === '') {
            continue;
        }
        $duplicateCounts[$baseUsername] = ($duplicateCounts[$baseUsername] ?? 0) + 1;
    }

    $timestamp = gmdate('Ymd_His');
    $nowIso = gmdate('c');
    $usedUsernames = [];
    $generatedPasswords = [];
    $renamedUsernames = [];
    $mappingReport = [];
    $importedUsers = [];
    $summary = [
        'total_rows' => count($rows),
        'preserved_existing_directors' => 0,
        'generated_passwords' => 0,
        'renamed_usernames' => 0,
        'mapped_roles' => [],
        'mapped_jds' => [],
    ];

    foreach ($rows as $index => $row) {
        $rawUsername = strtolower(trim((string)($row['Username'] ?? '')));
        if ($rawUsername === '') {
            throw new RuntimeException('Missing Username at Excel row ' . ($index + 2));
        }

        $username = resolve_username($row, $rawUsername, $duplicateCounts, $usedUsernames);
        $usedUsernames[$username] = true;

        if ($username !== $rawUsername) {
            $renamedUsernames[] = [
                'source_username' => $rawUsername,
                'final_username' => $username,
                'name' => trim((string)($row['Họ tên / Name'] ?? '')),
                'cccd' => trim((string)($row['CCCD / Citizen ID'] ?? '')),
            ];
        }

        $mapping = map_row_to_jd($row);
        $sourcePassword = trim((string)($row['Password'] ?? ''));
        $passwordMode = $sourcePassword === '' ? 'generated' : 'xlsx';
        $plainPassword = $sourcePassword === '' ? random_password(14) : $sourcePassword;

        $finalUser = [
            'username' => $username,
            'name' => normalize_cell($row['Họ tên / Name'] ?? ''),
            'password_hash' => password_hash($plainPassword, PASSWORD_BCRYPT, ['cost' => 12]),
            'role' => $mapping['system_role'],
            'active' => normalize_status($row['Trạng thái / Status'] ?? 'Active'),
            'created_at' => $nowIso,
            'updated_at' => $nowIso,
            'title' => $mapping['jd_title'],
            'dept' => $mapping['dept'],
            'cccd' => normalize_cell($row['CCCD / Citizen ID'] ?? ''),
            'phone' => normalize_cell($row['Số ĐT / Phone'] ?? ''),
            'personal_email' => normalize_cell($row['Email cá nhân / Personal Email'] ?? ''),
            'mfa' => ['enabled' => false],
            'jd_code' => $mapping['jd_code'],
            'jd_title' => $mapping['jd_title'],
            'role_source' => [
                'excel_dept' => normalize_cell($row['Phòng ban / Dept'] ?? ''),
                'excel_title' => normalize_cell($row['Chức danh / Title'] ?? ''),
                'excel_role' => normalize_cell($row['Vai trò / Role'] ?? ''),
                'excel_role_key' => normalize_cell($row['Role Key'] ?? ''),
                'mapping_reason' => $mapping['reason'],
            ],
        ];

        $existing = $existingByUsername[$rawUsername] ?? null;
        $shouldPreserveExisting = $existing !== null
            && strtolower((string)($existing['role'] ?? '')) === 'ceo'
            && $mapping['jd_code'] === 'JD-CEO'
            && $username === $rawUsername;

        if ($shouldPreserveExisting) {
            $finalUser['password_hash'] = (string)($existing['password_hash'] ?? $finalUser['password_hash']);
            $finalUser['created_at'] = (string)($existing['created_at'] ?? $finalUser['created_at']);
            if (isset($existing['last_login'])) {
                $finalUser['last_login'] = $existing['last_login'];
            }
            if (isset($existing['mfa']) && is_array($existing['mfa'])) {
                $finalUser['mfa'] = $existing['mfa'];
            }
            $finalUser['updated_at'] = $nowIso;
            $passwordMode = 'preserved_existing';
            $summary['preserved_existing_directors']++;
        } elseif ($passwordMode === 'generated') {
            $generatedPasswords[] = [
                'username' => $username,
                'name' => $finalUser['name'],
                'jd_code' => $mapping['jd_code'],
                'jd_title' => $mapping['jd_title'],
                'password' => $plainPassword,
            ];
            $summary['generated_passwords']++;
        }

        $summary['mapped_roles'][$mapping['system_role']] = ($summary['mapped_roles'][$mapping['system_role']] ?? 0) + 1;
        $summary['mapped_jds'][$mapping['jd_code']] = ($summary['mapped_jds'][$mapping['jd_code']] ?? 0) + 1;

        $mappingReport[] = [
            'username' => $username,
            'name' => $finalUser['name'],
            'dept' => $finalUser['dept'],
            'system_role' => $finalUser['role'],
            'jd_code' => $mapping['jd_code'],
            'jd_title' => $mapping['jd_title'],
            'password_mode' => $passwordMode,
            'source_dept' => normalize_cell($row['Phòng ban / Dept'] ?? ''),
            'source_title' => normalize_cell($row['Chức danh / Title'] ?? ''),
            'source_role' => normalize_cell($row['Vai trò / Role'] ?? ''),
            'source_role_key' => normalize_cell($row['Role Key'] ?? ''),
            'mapping_reason' => $mapping['reason'],
        ];

        $importedUsers[] = $finalUser;
    }

    usort($importedUsers, static function (array $a, array $b): int {
        $left = strtolower((string)($a['username'] ?? ''));
        $right = strtolower((string)($b['username'] ?? ''));
        return $left <=> $right;
    });

    $summary['renamed_usernames'] = count($renamedUsernames);
    ksort($summary['mapped_roles']);
    ksort($summary['mapped_jds']);

    ensure_dir($reportDir);
    $reportBase = rtrim($reportDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'hesem_user_import_' . $timestamp;
    $reportJson = $reportBase . '.json';
    $generatedCsv = $reportBase . '_generated_passwords.csv';
    $renamedCsv = $reportBase . '_renamed_usernames.csv';

    file_put_contents($reportJson, json_encode([
        'generated_at' => $nowIso,
        'xlsx' => $xlsxFile,
        'users_file' => $usersFile,
        'summary' => $summary,
        'renamed_usernames' => $renamedUsernames,
        'users' => $mappingReport,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    write_csv($generatedCsv, ['username', 'name', 'jd_code', 'jd_title', 'password'], $generatedPasswords);
    write_csv($renamedCsv, ['source_username', 'final_username', 'name', 'cccd'], $renamedUsernames);

    if ($apply) {
        $backupFile = $usersFile . '.bak_' . $timestamp;
        if (!copy($usersFile, $backupFile)) {
            throw new RuntimeException('Failed to create backup file: ' . $backupFile);
        }

        $store['users'] = $importedUsers;
        $json = json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false || file_put_contents($usersFile, $json . PHP_EOL) === false) {
            throw new RuntimeException('Failed to write users file.');
        }

        echo "Applied import.\n";
        echo "Backup: {$backupFile}\n";
    } else {
        echo "Dry run only. No files were changed.\n";
    }

    echo "Users: " . count($importedUsers) . PHP_EOL;
    echo "Generated passwords: " . $summary['generated_passwords'] . PHP_EOL;
    echo "Renamed usernames: " . $summary['renamed_usernames'] . PHP_EOL;
    echo "Preserved director accounts: " . $summary['preserved_existing_directors'] . PHP_EOL;
    echo "Report JSON: {$reportJson}\n";
    echo "Generated passwords CSV: {$generatedCsv}\n";
    echo "Renamed usernames CSV: {$renamedCsv}\n";
}

function parse_options(array $argv): array
{
    $portalDir = dirname(__DIR__);
    $workspaceRoot = dirname($portalDir, 3);

    $options = [
        'apply' => false,
        'xlsx' => '/Users/a10/Desktop/New Factory Mar-2026/4/HESEM_Users_2026-04-08.xlsx',
        'users' => $portalDir . '/qms-data/config/users.json',
        'report_dir' => $workspaceRoot . '/_reports',
    ];

    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--apply') {
            $options['apply'] = true;
            continue;
        }
        if ($arg === '--help' || $arg === '-h') {
            print_help();
            exit(0);
        }
        if (str_starts_with($arg, '--xlsx=')) {
            $options['xlsx'] = substr($arg, 7);
            continue;
        }
        if (str_starts_with($arg, '--users=')) {
            $options['users'] = substr($arg, 8);
            continue;
        }
        if (str_starts_with($arg, '--report-dir=')) {
            $options['report_dir'] = substr($arg, 13);
            continue;
        }
        throw new InvalidArgumentException('Unknown option: ' . $arg);
    }

    return $options;
}

function print_help(): void
{
    echo <<<TXT
Usage:
  php import_users_from_excel_jd.php [--apply] [--xlsx=PATH] [--users=PATH] [--report-dir=PATH]

TXT;
}

function parse_xlsx_rows(string $path): array
{
    $zip = new ZipArchive();
    if ($zip->open($path) !== true) {
        throw new RuntimeException('Cannot open XLSX file: ' . $path);
    }

    $sharedStrings = read_shared_strings($zip);
    $sheetXml = read_first_sheet_xml($zip);

    $dom = new DOMDocument();
    $dom->loadXML($sheetXml);
    $xp = new DOMXPath($dom);
    $xp->registerNamespace('a', SHEET_MAIN_NS);

    $rows = [];
    foreach ($xp->query('//a:sheetData/a:row') as $rowNode) {
        $cells = [];
        $maxIndex = -1;
        foreach ($xp->query('a:c', $rowNode) as $cellNode) {
            $ref = (string)$cellNode->getAttribute('r');
            $colRef = preg_replace('/\d+/', '', $ref);
            $colIndex = column_to_index($colRef);
            $maxIndex = max($maxIndex, $colIndex);

            $type = (string)$cellNode->getAttribute('t');
            $value = '';
            if ($type === 's') {
                $vNode = $xp->query('a:v', $cellNode)->item(0);
                $sharedIndex = $vNode ? (int)$vNode->textContent : -1;
                $value = $sharedStrings[$sharedIndex] ?? '';
            } elseif ($type === 'inlineStr') {
                $fragments = [];
                foreach ($xp->query('.//a:t', $cellNode) as $textNode) {
                    $fragments[] = $textNode->textContent;
                }
                $value = implode('', $fragments);
            } else {
                $vNode = $xp->query('a:v', $cellNode)->item(0);
                $value = $vNode ? $vNode->textContent : '';
            }

            $cells[$colIndex] = $value;
        }

        if ($maxIndex < 0) {
            continue;
        }

        $row = [];
        for ($i = 0; $i <= $maxIndex; $i++) {
            $row[] = $cells[$i] ?? '';
        }
        $rows[] = $row;
    }

    $zip->close();

    if (!$rows) {
        return [];
    }

    $header = array_map(static fn($value) => trim((string)$value), $rows[0]);
    $data = [];
    foreach (array_slice($rows, 1) as $row) {
        $assoc = [];
        foreach ($header as $index => $column) {
            if ($column === '') {
                continue;
            }
            $assoc[$column] = isset($row[$index]) ? trim((string)$row[$index]) : '';
        }
        if (!array_filter($assoc, static fn($value) => $value !== '')) {
            continue;
        }
        $data[] = $assoc;
    }

    return $data;
}

function read_shared_strings(ZipArchive $zip): array
{
    $xml = $zip->getFromName('xl/sharedStrings.xml');
    if ($xml === false) {
        return [];
    }

    $dom = new DOMDocument();
    $dom->loadXML($xml);
    $xp = new DOMXPath($dom);
    $xp->registerNamespace('a', SHEET_MAIN_NS);

    $strings = [];
    foreach ($xp->query('//a:si') as $siNode) {
        $text = [];
        foreach ($xp->query('.//a:t', $siNode) as $tNode) {
            $text[] = $tNode->textContent;
        }
        $strings[] = implode('', $text);
    }

    return $strings;
}

function read_first_sheet_xml(ZipArchive $zip): string
{
    $workbook = $zip->getFromName('xl/workbook.xml');
    $rels = $zip->getFromName('xl/_rels/workbook.xml.rels');
    if ($workbook === false || $rels === false) {
        throw new RuntimeException('XLSX workbook metadata is missing.');
    }

    $workbookDom = new DOMDocument();
    $workbookDom->loadXML($workbook);
    $wbXp = new DOMXPath($workbookDom);
    $wbXp->registerNamespace('a', SHEET_MAIN_NS);
    $wbXp->registerNamespace('r', SHEET_REL_NS);
    $sheetNode = $wbXp->query('/a:workbook/a:sheets/a:sheet')->item(0);
    if (!$sheetNode instanceof DOMElement) {
        throw new RuntimeException('No worksheet found in workbook.');
    }
    $relationId = $sheetNode->getAttributeNS(SHEET_REL_NS, 'id');
    if ($relationId === '') {
        throw new RuntimeException('Worksheet relation id is missing.');
    }

    $relsDom = new DOMDocument();
    $relsDom->loadXML($rels);
    $relXp = new DOMXPath($relsDom);
    $relXp->registerNamespace('p', PKG_REL_NS);

    $target = null;
    foreach ($relXp->query('/p:Relationships/p:Relationship') as $relNode) {
        if ($relNode instanceof DOMElement && $relNode->getAttribute('Id') === $relationId) {
            $target = $relNode->getAttribute('Target');
            break;
        }
    }

    if ($target === null || $target === '') {
        throw new RuntimeException('Worksheet target is missing for relation ' . $relationId);
    }

    $sheetXml = $zip->getFromName('xl/' . ltrim($target, '/'));
    if ($sheetXml === false) {
        throw new RuntimeException('Cannot read worksheet XML: ' . $target);
    }

    return $sheetXml;
}

function column_to_index(string $letters): int
{
    $letters = strtoupper($letters);
    $index = 0;
    $length = strlen($letters);
    for ($i = 0; $i < $length; $i++) {
        $index = ($index * 26) + (ord($letters[$i]) - 64);
    }
    return $index - 1;
}

function resolve_username(array $row, string $baseUsername, array $duplicateCounts, array $usedUsernames): string
{
    $count = $duplicateCounts[$baseUsername] ?? 0;
    if ($count <= 1 && !isset($usedUsernames[$baseUsername])) {
        return $baseUsername;
    }

    $last4 = preg_replace('/\D+/', '', (string)($row['CCCD / Citizen ID'] ?? ''));
    $last4 = $last4 !== '' ? substr($last4, -4) : '';
    $suffix = $last4 !== '' ? $last4 : str_pad((string)($row['ID'] ?? '0'), 2, '0', STR_PAD_LEFT);
    $candidate = $baseUsername . '.' . $suffix;
    $counter = 2;
    while (isset($usedUsernames[$candidate])) {
        $candidate = $baseUsername . '.' . $suffix . '.' . $counter;
        $counter++;
    }
    return $candidate;
}

function map_row_to_jd(array $row): array
{
    $dept = normalize_token($row['Phòng ban / Dept'] ?? '');
    $title = normalize_token($row['Chức danh / Title'] ?? '');
    $role = normalize_token($row['Vai trò / Role'] ?? '');
    $roleKey = normalize_token($row['Role Key'] ?? '');

    if ($roleKey === 'general_director' || $title === 'tong_giam_doc') {
        return jd('JD-CEO', 'Chief Executive Officer (CEO)', 'ceo', 'EXE', 'Exact executive JD match.');
    }
    if ($roleKey === 'hr_manager') {
        return jd('JD-HR', 'HR Manager', 'hr_manager', 'HR', 'Exact HR JD match.');
    }
    if ($roleKey === 'finance_manager' || $title === 'finance_manager') {
        return jd('JD-FIN', 'Finance Manager', 'finance_manager', 'FIN', 'Exact finance manager JD match.');
    }
    if ($roleKey === 'accounting_staff') {
        return jd('JD-GLP', 'General Ledger and Payroll Accountant', 'gl_payroll_accountant', 'FIN', 'Accounting Staff mapped to the closest finance JD used by the portal.');
    }
    if ($roleKey === 'sales_manager') {
        return jd('JD-EST', 'Estimator', 'estimator', 'SAL', 'Sales Manager mapped to the closest commercial JD available in the current portal roles.');
    }
    if ($roleKey === 'buyer') {
        return jd('JD-BUY', 'Buyer / Purchasing', 'buyer', 'SCM', 'Exact supply chain JD match.');
    }
    if ($roleKey === 'warehouse_manager') {
        return jd('JD-SCM', 'Supply Chain Manager', 'supply_chain_manager', 'SCM', 'Warehouse Manager mapped to the warehouse leadership JD available in the portal role model.');
    }
    if ($roleKey === 'warehouse_staff') {
        return jd('JD-WAR', 'Warehouse Clerk', 'warehouse_clerk', 'SCM', 'Warehouse Staff mapped to the warehouse clerk JD.');
    }
    if ($roleKey === 'epicor') {
        return jd('JD-ESA', 'Epicor System Administrator', 'epicor_admin', 'IT', 'Exact IT JD match.');
    }
    if ($roleKey === 'operations_manager') {
        return jd('JD-PD', 'Production Director', 'production_director', 'EXE', 'Operations Manager mapped to the plant-level production leadership JD.');
    }
    if ($roleKey === 'prod_manager' || $title === 'production_manager') {
        return jd('JD-WKM', 'CNC Workshop Manager', 'cnc_workshop_manager', 'PRO', 'Production Manager mapped to the workshop management JD.');
    }
    if ($roleKey === 'production_team_leader' || $title === 'production_lead') {
        return jd('JD-SL', 'Shift Leader', 'shift_leader', 'PRO', 'Production team lead mapped to the shift leader JD.');
    }
    if ($roleKey === 'production_lathe' || $roleKey === 'production_mil' || str_starts_with($title, 'worker')) {
        return jd('JD-OPR', 'CNC Operator', 'cnc_operator', 'PRO', 'Production operators mapped to the CNC operator JD.');
    }
    if ($roleKey === 'packaging_manager') {
        return jd('JD-CPS', 'Cleaning and Packaging Supervisor', 'cleaning_packaging_supervisor', 'PRO', 'Packaging manager mapped to the published packaging supervisor JD.');
    }
    if ($roleKey === 'finish_deburr_assembly') {
        return jd('JD-DBT', 'Deburr Technician', 'deburr_technician', 'PRO', 'Finish/deburr/assembly mapped to the deburr technician JD.');
    }
    if ($roleKey === 'planning' || $title === 'order_processing') {
        return jd('JD-PPL', 'Production Planner', 'production_planner', 'PRO', 'Planning/order processing mapped to the production planner JD.');
    }
    if ($roleKey === 'qc_manager') {
        return jd('JD-QCL', 'QC Inspector Lead', 'qc_inspector', 'QA', 'QC Manager mapped to QC Inspector Lead; the portal reuses the qc_inspector permission profile.');
    }
    if ($roleKey === 'qc' || $title === 'qc') {
        return jd('JD-QC', 'QC Inspector / CMM Programmer-Operator', 'qc_inspector', 'QA', 'QC staff mapped to the QC inspector JD.');
    }
    if ($roleKey === 'service_engineering_team_leader' || ($title === 'engineer_lead' && str_contains($role, 'service_engineering'))) {
        return jd('JD-ENGM', 'Engineering Lead / Manager', 'engineering_lead', 'ENG', 'Service engineering lead mapped to the engineering manager JD.');
    }
    if (
        in_array($roleKey, ['services_engineering', 'service_engineering'], true)
        || str_contains($role, 'services_engineering')
        || str_contains($role, 'service_engineering')
    ) {
        return jd('JD-DFM', 'DFM Engineer', 'process_engineer', 'ENG', 'Service engineering mapped to the DFM JD; the portal reuses process_engineer permissions.');
    }
    if ($roleKey === 'mfg_engineering_manager') {
        return jd('JD-ENGM', 'Engineering Lead / Manager', 'engineering_lead', 'ENG', 'Manufacturing engineering manager mapped to the engineering manager JD.');
    }
    if ($roleKey === 'mfg_engineering') {
        if ($dept === 'pro' || $title === 'engineering_assistant') {
            return jd('JD-PIE', 'Production Engineer / Industrial Engineer', 'process_engineer', 'PRO', 'Manufacturing engineering inside production mapped to the production engineer JD; the portal reuses process_engineer permissions.');
        }
        return jd('JD-PE', 'Process Engineer', 'process_engineer', 'ENG', 'Manufacturing engineering inside engineering mapped to the process engineer JD.');
    }
    if ($title === 'engineering_assistant') {
        return jd('JD-PIE', 'Production Engineer / Industrial Engineer', 'process_engineer', 'PRO', 'Engineering Assistant mapped to the production engineer JD; the portal reuses process_engineer permissions.');
    }

    $signature = sprintf(
        'Unmapped row: dept=%s | title=%s | role=%s | role_key=%s',
        (string)($row['Phòng ban / Dept'] ?? ''),
        (string)($row['Chức danh / Title'] ?? ''),
        (string)($row['Vai trò / Role'] ?? ''),
        (string)($row['Role Key'] ?? '')
    );
    throw new RuntimeException($signature);
}

function jd(string $jdCode, string $jdTitle, string $systemRole, string $dept, string $reason): array
{
    return [
        'jd_code' => $jdCode,
        'jd_title' => $jdTitle,
        'system_role' => $systemRole,
        'dept' => $dept,
        'reason' => $reason,
    ];
}

function normalize_status(string $value): bool
{
    $token = normalize_token($value);
    return !in_array($token, ['inactive', 'disabled', 'off'], true);
}

function normalize_cell(string $value): string
{
    return trim(preg_replace('/\s+/u', ' ', $value));
}

function normalize_token(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($ascii !== false && $ascii !== '') {
        $value = $ascii;
    }

    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '_', $value);
    $value = preg_replace('/_+/', '_', (string)$value);
    return trim((string)$value, '_');
}

function random_password(int $length): string
{
    if ($length < 10) {
        $length = 10;
    }

    $upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    $lower = 'abcdefghijkmnopqrstuvwxyz';
    $digits = '23456789';
    $symbols = '!@#$%^&*_-+=?';
    $all = $upper . $lower . $digits . $symbols;

    $chars = [
        $upper[random_int(0, strlen($upper) - 1)],
        $lower[random_int(0, strlen($lower) - 1)],
        $digits[random_int(0, strlen($digits) - 1)],
        $symbols[random_int(0, strlen($symbols) - 1)],
    ];

    for ($i = count($chars); $i < $length; $i++) {
        $chars[] = $all[random_int(0, strlen($all) - 1)];
    }

    for ($i = count($chars) - 1; $i > 0; $i--) {
        $swap = random_int(0, $i);
        [$chars[$i], $chars[$swap]] = [$chars[$swap], $chars[$i]];
    }

    return implode('', $chars);
}

function write_csv(string $path, array $headers, array $rows): void
{
    $fp = fopen($path, 'wb');
    if ($fp === false) {
        throw new RuntimeException('Cannot open CSV for writing: ' . $path);
    }

    fputcsv($fp, $headers, ',', '"', '');
    foreach ($rows as $row) {
        $ordered = [];
        foreach ($headers as $header) {
            $ordered[] = $row[$header] ?? '';
        }
        fputcsv($fp, $ordered, ',', '"', '');
    }
    fclose($fp);
}

function ensure_dir(string $path): void
{
    if (is_dir($path)) {
        return;
    }
    if (!mkdir($path, 0775, true) && !is_dir($path)) {
        throw new RuntimeException('Cannot create directory: ' . $path);
    }
}
