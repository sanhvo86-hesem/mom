<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainEvent;
use MOM\Api\Services\EventBus;
use MOM\Services\WorkflowEngine;
use PHPUnit\Framework\TestCase;

final class WorkflowEngineEventBusTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_workflow_event_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testTransitionPublishesWorkflowTransitionEvent(): void
    {
        $events = [];
        $eventBus = new EventBus();
        $eventBus->on('*', static function (DomainEvent $event) use (&$events): void {
            $events[] = $event;
        });

        $engine = new WorkflowEngine($this->tmpDir, null, null, null, $eventBus);
        $engine->initializeRecord('DOC-001', 'DOC', 'author');

        $result = $engine->transition('DOC-001', 'in_review', 'author', 'Submit for review');

        $this->assertTrue($result->success);
        $this->assertCount(1, $events);
        $this->assertSame(DomainEvent::WORKFLOW_TRANSITIONED, $events[0]->eventType);
        $this->assertSame('DOC', $events[0]->aggregateType);
        $this->assertSame('DOC-001', $events[0]->aggregateId);
        $this->assertSame('draft', $events[0]->payload['from_state'] ?? null);
        $this->assertSame('in_review', $events[0]->payload['to_state'] ?? null);
        $this->assertSame('author', $events[0]->metadata['user_id'] ?? null);
    }

    public function testPostgresWritesDoNotUsePdoUnsafeNamedParameterCasts(): void
    {
        $source = file_get_contents(__DIR__ . '/../../../api/services/WorkflowEngine.php');
        $this->assertIsString($source);

        $this->assertStringContainsString('CAST(:data AS jsonb)', $source);
        $this->assertStringContainsString('CAST(:at AS timestamptz)', $source);
        $this->assertStringNotContainsString(':data::jsonb', $source);
        $this->assertStringNotContainsString(':at::timestamptz', $source);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
