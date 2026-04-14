<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\EdgeConnectorService;
use PHPUnit\Framework\TestCase;

final class EdgeConnectorServiceTest extends TestCase
{
    public function testMtconnectXmlRejectsDoctypeAndDoesNotExpandEntities(): void
    {
        $service = new EdgeConnectorService();

        $normalized = $service->normalize([
            'machine_id' => 'MC-5AX-01',
            'connector_type' => 'mtconnect',
            'mtconnect_xml' => '<!DOCTYPE MTConnectStreams [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><MTConnectStreams creationTime="2026-04-14T00:00:00Z"><Streams><DeviceStream><ComponentStream><Events><Execution>&xxe;</Execution></Events></ComponentStream></DeviceStream></Streams></MTConnectStreams>',
        ], ['machine_id' => 'MC-5AX-01'], 'system.mtconnect');

        $this->assertSame('idle', $normalized['machine_state']);
        $this->assertSame('mtconnect', $normalized['connector_type']);
    }

    public function testMtconnectXmlStillExtractsBasicSignals(): void
    {
        $service = new EdgeConnectorService();

        $normalized = $service->normalize([
            'machine_id' => 'MC-5AX-01',
            'connector_type' => 'mtconnect',
            'mtconnect_xml' => '<MTConnectStreams creationTime="2026-04-14T00:00:00Z"><Streams><DeviceStream><ComponentStream><Events><Execution>ACTIVE</Execution><Program>OP20.NC</Program></Events></ComponentStream></DeviceStream></Streams></MTConnectStreams>',
        ], ['machine_id' => 'MC-5AX-01'], 'system.mtconnect');

        $this->assertSame('running', $normalized['machine_state']);
        $this->assertSame('OP20.NC', $normalized['current_program_id']);
    }
}
