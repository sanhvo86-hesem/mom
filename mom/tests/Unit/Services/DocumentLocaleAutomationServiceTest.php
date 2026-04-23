<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\DataLayer;
use MOM\Services\DocumentControl\DocumentLocaleAutomationService;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class DocumentLocaleAutomationServiceTest extends TestCase
{
    public function testCommandProviderStreamsJsonPayloadToChildProcess(): void
    {
        $baseDir = realpath(__DIR__ . '/../../..');
        $rootDir = $baseDir !== false ? realpath($baseDir . '/..') : false;

        $this->assertIsString($baseDir);
        $this->assertIsString($rootDir);

        $service = new DocumentLocaleAutomationService(
            new DataLayer($baseDir . '/data', $rootDir),
            $rootDir
        );

        $payload = [
            'doc_code' => 'SOP-502',
            'source_html' => '<p>Xin chao</p>',
        ];

        $command = PHP_BINARY . ' -r ' . escapeshellarg(<<<'PHP'
$payload = json_decode(stream_get_contents(STDIN), true);
echo json_encode([
    'ok' => true,
    'provider' => 'test_command',
    'engine_version' => 'unit_test',
    'glossary_version' => 'unit_test_glossary',
    'translation_state' => 'machine_preview',
    'html' => (string)($payload['source_html'] ?? ''),
]);
PHP);

        $method = new ReflectionMethod(DocumentLocaleAutomationService::class, 'runCommandProvider');
        set_error_handler(
            static function (int $severity, string $message): bool {
                return $severity === E_DEPRECATED
                    && str_contains($message, 'ReflectionMethod::setAccessible');
            }
        );
        try {
            $method->setAccessible(true);
            $result = $method->invoke($service, $command, $payload);
        } finally {
            restore_error_handler();
        }

        $this->assertIsArray($result);
        $this->assertTrue($result['ok']);
        $this->assertSame('test_command', $result['provider']);
        $this->assertSame('machine_preview', $result['translation_state']);
        $this->assertSame('<p>Xin chao</p>', $result['html']);
    }
}
