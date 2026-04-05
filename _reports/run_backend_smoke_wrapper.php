<?php
try {
  require 'C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/tests/backend_smoke.php';
  echo "WRAPPER_OK\n";
} catch (Throwable $e) {
  fwrite(STDERR, get_class($e) . ': ' . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n");
  exit(1);
}