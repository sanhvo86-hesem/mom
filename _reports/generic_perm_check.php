<?php
require 'C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/bootstrap.php';
use HESEM\QMS\Api\Controllers\GenericCrudController;
use HESEM\QMS\Api\Controllers\ExitException;
use HESEM\QMS\Database\DataLayer;
function reset_state() {
  $_GET = [];
  $_POST = [];
  $_FILES = [];
  $_SERVER = ['REQUEST_METHOD' => 'GET', 'REQUEST_URI' => '/', 'REMOTE_ADDR' => '127.0.0.1'];
  $_SESSION = [];
}
$dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
$financeStore = [
  'settings' => ['require_mfa' => false],
  'users' => [[
    'username' => 'finance-user',
    'name' => 'Finance Manager',
    'role' => 'finance_manager',
    'org_company_code' => 'HESEM',
    'org_legal_entity_code' => 'HESEM-VN',
    'org_plant_id' => 'PLANT01',
    'org_site_id' => 'SITE01',
    'active' => true,
  ]],
];
reset_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$_GET['domain'] = 'quality_management';
$_GET['table'] = 'capa_records';
$controller = (new GenericCrudController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
  $controller->createRecord();
  echo "create:allowed\n";
} catch (ExitException $e) {
  echo 'create:' . $e->getStatusCode() . ':' . ($e->getPayload()['error'] ?? 'unknown') . "\n";
}
reset_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$_GET['domain'] = 'master_data_governance';
$_GET['table'] = 'org_companies';
$controller = (new GenericCrudController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
  $controller->listRecords();
  echo "list:allowed\n";
} catch (ExitException $e) {
  echo 'list:' . $e->getStatusCode() . ':' . ($e->getPayload()['error'] ?? 'unknown') . "\n";
}