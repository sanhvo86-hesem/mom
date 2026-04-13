<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainEvent;
use MOM\Api\Services\EventBus;
use MOM\Api\Services\GenericCrudService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class GenericCrudServiceEventBusTest extends TestCase
{
    private GenericCrudFakeConnection $db;
    /** @var list<DomainEvent> */
    private array $events;

    protected function setUp(): void
    {
        $this->db = new GenericCrudFakeConnection();
        $this->events = [];
    }

    public function testCreatePublishesRecordCreatedEvent(): void
    {
        $service = $this->serviceWithEventBus();
        $this->db->insertReturningResults[] = [
            'crm_activity_id' => 'ACT-001',
            'activity_type' => 'call',
            'subject' => 'Follow up',
            'activity_status' => 'open',
            'source_system' => 'QMS',
            'payload_schema_version' => '1.0',
            'row_version' => 1,
            'created_at' => '2026-04-13T00:00:00Z',
            'updated_at' => '2026-04-13T00:00:00Z',
        ];

        $record = $service->create('crm', 'crm_activities', [
            'activity_type' => 'call',
            'subject' => 'Follow up',
        ], 'unit-user');

        $this->assertSame('ACT-001', $record['crm_activity_id'] ?? null);
        $this->assertCount(1, $this->events);
        $this->assertSame(DomainEvent::RECORD_CREATED, $this->events[0]->eventType);
        $this->assertSame('crm.crm_activities', $this->events[0]->aggregateType);
        $this->assertSame('crm_activity_id=ACT-001', $this->events[0]->aggregateId);
        $this->assertSame('Follow up', $this->events[0]->payload['record']['subject'] ?? null);
    }

    public function testUpdatePublishesRecordUpdatedEventWithOldValues(): void
    {
        $service = $this->serviceWithEventBus();
        $this->db->queryOneResults[] = [
            'crm_activity_id' => 'ACT-001',
            'activity_type' => 'call',
            'subject' => 'Old subject',
            'activity_status' => 'open',
            'source_system' => 'QMS',
            'payload_schema_version' => '1.0',
            'row_version' => 1,
        ];
        $this->db->insertReturningResults[] = [
            'crm_activity_id' => 'ACT-001',
            'activity_type' => 'call',
            'subject' => 'New subject',
            'activity_status' => 'open',
            'source_system' => 'QMS',
            'payload_schema_version' => '1.0',
            'row_version' => 2,
        ];

        $record = $service->update('crm', 'crm_activities', ['crm_activity_id' => 'ACT-001'], [
            'subject' => 'New subject',
        ], 'unit-user');

        $this->assertSame('New subject', $record['subject'] ?? null);
        $this->assertCount(1, $this->events);
        $event = $this->events[0];
        $this->assertSame(DomainEvent::RECORD_UPDATED, $event->eventType);
        $this->assertSame('crm.crm_activities', $event->aggregateType);
        $this->assertSame('crm_activity_id=ACT-001', $event->aggregateId);
        $this->assertSame('New subject', $event->payload['changes']['subject'] ?? null);
        $this->assertSame('Old subject', $event->payload['old_values']['subject'] ?? null);
    }

    private function serviceWithEventBus(): GenericCrudService
    {
        $eventBus = new EventBus();
        $eventBus->on('*', function (DomainEvent $event): void {
            $this->events[] = $event;
        });

        $service = new GenericCrudService(QMS_TEST_DATA_DIR, $eventBus);
        $db = new \ReflectionProperty($service, 'db');
        $db->setValue($service, $this->db);

        return $service;
    }
}

final class GenericCrudFakeConnection extends Connection
{
    /** @var list<array<string, mixed>|null> */
    public array $queryOneResults = [];
    /** @var list<array<string, mixed>|null> */
    public array $insertReturningResults = [];

    public function __construct()
    {
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        return array_shift($this->queryOneResults);
    }

    public function insertReturning(string $sql, array $params = []): ?array
    {
        return array_shift($this->insertReturningResults);
    }
}
