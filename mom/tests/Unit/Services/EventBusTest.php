<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainEvent;
use MOM\Api\Services\EventBus;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for EventBus and DomainEvent.
 */
class EventBusTest extends TestCase
{
    private EventBus $bus;

    protected function setUp(): void
    {
        $this->bus = new EventBus(); // No queue/broadcaster/log in unit tests
    }

    public function testPublishNotifiesListeners(): void
    {
        $received = [];
        $this->bus->on('test.event', function (DomainEvent $event) use (&$received) {
            $received[] = $event;
        });

        $event = new DomainEvent('test.event', 'TestAggregate', 'id-1', ['key' => 'value']);
        $this->bus->publish($event);

        $this->assertCount(1, $received);
        $this->assertSame('test.event', $received[0]->eventType);
        $this->assertSame('id-1', $received[0]->aggregateId);
        $this->assertSame('value', $received[0]->payload['key']);
    }

    public function testWildcardListener(): void
    {
        $received = [];
        $this->bus->on('*', function (DomainEvent $event) use (&$received) {
            $received[] = $event->eventType;
        });

        $this->bus->emit('first.event', 'Agg', 'id-1');
        $this->bus->emit('second.event', 'Agg', 'id-2');

        $this->assertSame(['first.event', 'second.event'], $received);
    }

    public function testBufferingAndFlush(): void
    {
        $received = [];
        $this->bus->on('buffered.event', function (DomainEvent $event) use (&$received) {
            $received[] = $event->aggregateId;
        });

        $this->bus->startBuffering();
        $this->bus->emit('buffered.event', 'Agg', 'id-1');
        $this->bus->emit('buffered.event', 'Agg', 'id-2');

        // Nothing received yet
        $this->assertEmpty($received);

        $this->bus->flush();

        // Now both received
        $this->assertSame(['id-1', 'id-2'], $received);
    }

    public function testBufferingAndDiscard(): void
    {
        $received = [];
        $this->bus->on('discarded.event', function (DomainEvent $event) use (&$received) {
            $received[] = $event;
        });

        $this->bus->startBuffering();
        $this->bus->emit('discarded.event', 'Agg', 'id-1');

        $this->bus->discard();

        $this->assertEmpty($received);
    }

    public function testOnAnyRegistersMultipleTypes(): void
    {
        $received = [];
        $this->bus->onAny(['type.a', 'type.b'], function (DomainEvent $event) use (&$received) {
            $received[] = $event->eventType;
        });

        $this->bus->emit('type.a', 'Agg', 'id-1');
        $this->bus->emit('type.b', 'Agg', 'id-2');
        $this->bus->emit('type.c', 'Agg', 'id-3'); // Not registered

        $this->assertSame(['type.a', 'type.b'], $received);
    }

    public function testListenerErrorDoesNotBreakOtherListeners(): void
    {
        $received = [];

        $this->bus->on('error.test', function () {
            throw new \RuntimeException('Listener error');
        });
        $this->bus->on('error.test', function (DomainEvent $event) use (&$received) {
            $received[] = $event->aggregateId;
        });

        $this->bus->emit('error.test', 'Agg', 'id-1');

        // Second listener still executed despite first throwing
        $this->assertSame(['id-1'], $received);
    }

    public function testDomainEventToArray(): void
    {
        $event = new DomainEvent('test.type', 'TestAgg', 'test-id', ['foo' => 'bar']);
        $arr = $event->toArray();

        $this->assertArrayHasKey('event_id', $arr);
        $this->assertSame('test.type', $arr['event_type']);
        $this->assertSame('TestAgg', $arr['aggregate_type']);
        $this->assertSame('test-id', $arr['aggregate_id']);
        $this->assertSame('bar', $arr['payload']['foo']);
        $this->assertArrayHasKey('occurred_at', $arr);
    }

    public function testDomainEventFactoryWorkflowTransitioned(): void
    {
        $event = DomainEvent::workflowTransitioned(
            'ncr_record', 'NCR-001', 'open', 'in_progress', 'admin', ['notify']
        );

        $this->assertSame(DomainEvent::WORKFLOW_TRANSITIONED, $event->eventType);
        $this->assertSame('ncr_record', $event->aggregateType);
        $this->assertSame('NCR-001', $event->aggregateId);
        $this->assertSame('open', $event->payload['from_state']);
        $this->assertSame('in_progress', $event->payload['to_state']);
    }

    public function testDomainEventFactoryRecordCreated(): void
    {
        $event = DomainEvent::recordCreated('quality', 'ncr_records', 'NCR-002', ['status' => 'open']);

        $this->assertSame(DomainEvent::RECORD_CREATED, $event->eventType);
        $this->assertSame('quality.ncr_records', $event->aggregateType);
        $this->assertSame('open', $event->payload['record']['status']);
    }

    public function testSingleton(): void
    {
        $bus1 = new EventBus();
        EventBus::setInstance($bus1);

        $this->assertSame($bus1, EventBus::getInstance());
    }
}
