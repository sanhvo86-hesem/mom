<?php
require 'C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/bootstrap.php';
$file = QMS_TEST_DATA_DIR . '/config/role_permissions.json';
$checks = [
  'managed' => permission_matrix_manages_permission('quality_management.capa_records.create', $file),
  'qms_engineer_quality_write' => user_has_any_permission(['role' => 'qms_engineer'], 'quality_management.capa_records.create', $file),
  'finance_quality_write' => user_has_any_permission(['role' => 'finance_manager'], 'quality_management.capa_records.create', $file),
  'developer_schema_write' => user_has_any_permission(['role' => 'developer'], 'studio.schema.write', $file),
  'qms_engineer_schema_write' => user_has_any_permission(['role' => 'qms_engineer'], 'studio.schema.write', $file),
  'finance_master_data_list' => user_has_any_permission(['role' => 'finance_manager'], 'master_data_governance.org_companies.list', $file),
];
echo json_encode($checks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), "\n";