<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\AuditEvent;
use MOM\Services\AuditEventType;
use MOM\Services\AuditTrail;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class AuditTrailIntegrityTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_audit_trail_test_' . bin2hex(random_bytes(4));
        if (!mkdir($this->tmpDir, 0775, true) && !is_dir($this->tmpDir)) {
            throw new RuntimeException('Unable to create temp audit test directory.');
        }
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->tmpDir);
    }

    public function testSignedEventsStillVerifyAgainstHashChain(): void
    {
        $audit = new AuditTrail($this->tmpDir);

        $audit->logEvent(new AuditEvent(
            eventType: AuditEventType::APPROVED,
            aggregateType: 'form_entry',
            aggregateId: 'FRM-TEST-001',
            actorId: 'qa.approver',
            payload: ['state' => 'finalized'],
            metadata: ['ip' => '127.0.0.1'],
            esigReason: 'Final form approval',
        ));

        $result = $audit->verifyIntegrity('form_entry', 'FRM-TEST-001');
        $this->assertTrue($result['valid'], implode('; ', $result['errors']));
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($it as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($path);
    }
}
