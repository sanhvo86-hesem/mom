<?php
require 'C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/bootstrap.php';
use HESEM\QMS\Api\Controllers\SchemaStudioController;
use HESEM\QMS\Api\Controllers\ExitException;
use HESEM\QMS\Database\DataLayer;


auto_prepend_file;
 = [];
 = [];
 = [];
 = [
    'REQUEST_METHOD' => 'POST',
    'REQUEST_URI' => '/',
    'HTTP_X_CSRF_TOKEN' => 'schema-db-token',
];
 = [
    'user' => 'builder-user',
    'mfa_ok' => true,
    'csrf' => 'schema-db-token',
];

 = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
 = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'builder-user',
        'name' => 'QMS Engineer',
        'role' => 'qms_engineer',
        'active' => true,
    ]],
];

try {
    (new SchemaStudioController(, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))
        ->setStore()
        ->previewTableData();
    echo "no_exception\n";
} catch (ExitException ) {
    echo json_encode(['status' => ->getStatusCode(), 'payload' => ->getPayload()], JSON_PRETTY_PRINT), "\n";
} catch (Throwable ) {
    echo get_class(), ':', ->getMessage(), "\n";
}