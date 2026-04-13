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
        $this->assertStringContainsString('AI prediction rows are advisory projections only', $prompt);
        $this->assertStringNotContainsString("'defect_risk', 'tool_wear', 'spc_violation'", $prompt);
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
        $this->assertIsString($method->invoke($service, 'UPDATE work_orders SET status = \'closed\''));
        $this->assertIsString($method->invoke($service, 'SELECT pg_sleep(10)'));
        $this->assertIsString($method->invoke($service, 'SELECT * FROM work_orders; DROP TABLE work_orders'));
    }
}
