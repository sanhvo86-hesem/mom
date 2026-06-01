<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\CommandRegistry;
use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\ProblemDetailsFactory;
use PHPUnit\Framework\TestCase;

final class DomainCommandApiContractClosureTest extends TestCase
{
    public function testDomainCommandRoutesAreDocumentedInOpenApi(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $routes = file_get_contents($repoRoot . '/mom/api/routes/rest-routes.php') ?: '';
        $openapi = file_get_contents($repoRoot . '/mom/api/openapi.yaml') ?: '';

        foreach ([
            '/api/v1/domain-commands',
            '/api/v1/domain-commands/registry',
            '/api/v1/domain-commands/signature-challenges',
            '/api/v1/domain-commands/signature-manifestations',
        ] as $path) {
            $this->assertStringContainsString($path, $routes, "Route missing: {$path}");
            $this->assertStringContainsString($path . ':', $openapi, "OpenAPI operation missing: {$path}");
        }
    }

    public function testDomainCommandErrorsUseProblemDetailsContract(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $openapi = file_get_contents($repoRoot . '/mom/api/openapi.yaml') ?: '';
        $controller = file_get_contents($repoRoot . '/mom/api/controllers/DomainCommandController.php') ?: '';

        foreach ([
            'DomainCommandBadRequestProblem',
            'DomainCommandForbiddenProblem',
            'DomainCommandNotFoundProblem',
            'DomainCommandConflictProblem',
            'DomainCommandNotImplementedProblem',
            'application/problem+json',
            'resource_readiness_blocked',
            'quality_hold_active',
            'idempotency_conflict',
            'regulated_evidence_missing',
        ] as $needle) {
            $this->assertStringContainsString($needle, $openapi);
        }

        $this->assertStringContainsString('application/problem+json; charset=utf-8', $controller);
        $this->assertStringContainsString('$this->rethrowResponse($e);', $controller);
    }

    public function testProblemDetailsFactoryReturnsMachineReadableProblem(): void
    {
        $problem = (new ProblemDetailsFactory())->fromThrowable(
            new DomainCommandException('resource_readiness_blocked', 'Resource readiness blocks this command.', 409, [
                'blockers' => [['evidence_key' => 'tool_life']],
            ]),
            'trace-contract-1'
        );

        $this->assertSame('urn:hesem:problem:domain-command:resource-readiness-blocked', $problem['type']);
        $this->assertSame('Resource Readiness Blocked', $problem['title']);
        $this->assertSame(409, $problem['status']);
        $this->assertSame('resource_readiness_blocked', $problem['code']);
        $this->assertSame('trace-contract-1', $problem['trace_id']);
        $this->assertSame('urn:hesem:trace:trace-contract-1', $problem['instance']);
        $this->assertSame('tool_life', $problem['details']['blockers'][0]['evidence_key']);
    }

    public function testProblemCatalogCoversRequiredFailureFamilies(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $catalog = json_decode(
            file_get_contents($repoRoot . '/mom/data/registry/mda-v4-problem-details-catalog.json') ?: '{}',
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        $categories = array_column((array)($catalog['problem_examples'] ?? []), 'category');

        foreach ([
            'validation_failure',
            'security_denial',
            'readiness_block',
            'quality_hold_block',
            'idempotency_conflict',
            'regulated_evidence_missing',
            'authority_mode_blocked',
        ] as $category) {
            $this->assertContains($category, $categories);
        }
    }

    public function testWorkflowCommandsExistInRegistryAndUseGatewayOperation(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $workflow = file_get_contents($repoRoot . '/mom/data/registry/mda-v4-command-workflows.yaml') ?: '';
        preg_match_all('/command_name:\s*([A-Za-z0-9_]+)/', $workflow, $matches);
        $commands = array_values(array_unique($matches[1] ?? []));
        $registry = (new CommandRegistry())->all();

        $this->assertNotSame([], $commands);
        foreach ($commands as $commandName) {
            $this->assertArrayHasKey($commandName, $registry, "Workflow references missing command: {$commandName}");
        }
        $this->assertStringNotContainsString('operationId: genericCrud', $workflow);
        $this->assertStringContainsString('operationId: submitDomainCommand', $workflow);
    }

    public function testOpenApiDocumentsObjectScopeForSecurityBoundary(): void
    {
        $repoRoot = dirname(__DIR__, 4);
        $openapi = file_get_contents($repoRoot . '/mom/api/openapi.yaml') ?: '';

        foreach (['actor_scope', 'site_ids', 'plant_ids', 'object_scope_denied'] as $needle) {
            $this->assertStringContainsString($needle, $openapi);
        }
    }
}
