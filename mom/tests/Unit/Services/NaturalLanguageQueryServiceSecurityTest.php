<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\NaturalLanguageQueryService;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class NaturalLanguageQueryServiceSecurityTest extends TestCase
{
    public function testPromptUsesCanonicalPredictionTypesAndAdvisoryBoundary(): void
    {
        $service = new NaturalLanguageQueryService(sys_get_temp_dir());
        $method = (new ReflectionClass($service))->getMethod('buildSystemPrompt');

        $prompt = (string)$method->invoke($service);

        $this->assertStringContainsString("'defect_probability', 'tool_wear', 'spc_anomaly', 'process_drift', 'equipment_failure'", $prompt);
        $this->assertStringContainsString("'info', 'watch', 'warning', 'critical'", $prompt);
        $this->assertStringContainsString('AI prediction rows are advisory projections only', $prompt);
        $this->assertStringNotContainsString("'defect_risk', 'tool_wear', 'spc_violation'", $prompt);
        $this->assertStringNotContainsString("quality_predictions — AI quality predictions\n- prediction_id   UUID PRIMARY KEY\n- prediction_type VARCHAR(50) — 'defect_probability', 'tool_wear', 'spc_anomaly', 'process_drift', 'equipment_failure'\n- severity        VARCHAR(20) — 'critical', 'major', 'minor'", $prompt);
    }

    public function testPostgresStatementTimeoutIsSetInsideReadOnlyTransaction(): void
    {
        $source = (string)file_get_contents(QMS_TEST_BASE_DIR . '/api/services/NaturalLanguageQueryService.php');

        $beginPosition = strpos($source, "\$pdo->exec('BEGIN TRANSACTION READ ONLY')");
        $timeoutPosition = strpos($source, 'SET LOCAL statement_timeout');

        $this->assertNotFalse($beginPosition);
        $this->assertNotFalse($timeoutPosition);
        $this->assertLessThan($timeoutPosition, $beginPosition);
    }

    public function testSqlValidatorRejectsMutatingAndDangerousQueries(): void
    {
        $service = new NaturalLanguageQueryService(sys_get_temp_dir());
        $method = (new ReflectionClass($service))->getMethod('validateSql');

        $this->assertNull($method->invoke($service, 'SELECT wo_number FROM work_orders LIMIT 10'));
        $this->assertNull($method->invoke($service, 'WITH late AS (SELECT wo_number FROM work_orders) SELECT * FROM late LIMIT 10'));
        $this->assertIsString($method->invoke($service, 'UPDATE work_orders SET status = \'closed\''));
        $this->assertIsString($method->invoke($service, 'SELECT pg_sleep(10)'));
        $this->assertIsString($method->invoke($service, 'SELECT * FROM work_orders; DROP TABLE work_orders'));
        $this->assertIsString($method->invoke($service, 'SELECT username FROM users LIMIT 10'));
        $this->assertIsString($method->invoke($service, 'SELECT * FROM audit_trail LIMIT 10'));
    }
}
