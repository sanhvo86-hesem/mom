<?php
require 'C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/bootstrap.php';
use HESEM\QMS\Api\Controllers\SchemaStudioController;
use HESEM\QMS\Api\Controllers\ExitException;
use HESEM\QMS\Database\DataLayer;
function reset_state() {
  $_GET = [];
  $_POST = [];
  $_FILES = [];
  $_SERVER = ['REQUEST_METHOD' => 'POST', 'REQUEST_URI' => '/', 'REMOTE_ADDR' => '127.0.0.1'];
  $_SESSION = [];
}
$dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
$store = [
  'settings' => ['require_mfa' => false],
  'users' => [[
    'username' => 'builder-user',
    'name' => 'QMS Engineer',
    'role' => 'qms_engineer',
    'active' => true,
  ]],
];
reset_state();
$_SESSION['user'] = 'builder-user';
$_SESSION['mfa_ok'] = true;
$_SESSION['csrf'] = 'schema-smoke-token';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-token';
$controller = (new SchemaStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($store);
try {
  $controller->listDesigns();
  echo "allowed\n";
} catch (ExitException $e) {
  echo 'status=' . $e->getStatusCode() . "\n";
  echo json_encode($e->getPayload(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), "\n";
}
