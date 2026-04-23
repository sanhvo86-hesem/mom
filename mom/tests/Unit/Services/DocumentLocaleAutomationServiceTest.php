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
        $service = $this->newService();

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

        $result = $this->invokeRunCommandProvider($service, $command, $payload);

        $this->assertIsArray($result);
        $this->assertTrue($result['ok']);
        $this->assertSame('test_command', $result['provider']);
        $this->assertSame('machine_preview', $result['translation_state']);
        $this->assertSame('<p>Xin chao</p>', $result['html']);
    }

    public function testCommandProviderDrainsHeavyStderrWithoutDeadlock(): void
    {
        $service = $this->newService();
        $payload = [
            'doc_code' => 'SOP-502',
            'source_html' => '<p>Heavy stderr</p>',
        ];

        $command = PHP_BINARY . ' -r ' . escapeshellarg(<<<'PHP'
fwrite(STDERR, str_repeat('E', 262144));
$payload = json_decode(stream_get_contents(STDIN), true);
echo json_encode([
    'ok' => true,
    'provider' => 'test_command',
    'engine_version' => 'stderr_ok',
    'glossary_version' => 'unit_test_glossary',
    'translation_state' => 'machine_preview',
    'html' => (string)($payload['source_html'] ?? ''),
]);
PHP);

        $result = $this->invokeRunCommandProvider($service, $command, $payload);

        $this->assertTrue($result['ok']);
        $this->assertSame('stderr_ok', $result['engine_version']);
        $this->assertSame('<p>Heavy stderr</p>', $result['html']);
    }

    public function testCommandProviderSupportsLargePayloadStreaming(): void
    {
        $service = $this->newService();
        $largeHtml = str_repeat('<p>0123456789</p>', 12000);
        $payload = [
            'doc_code' => 'SOP-502',
            'source_html' => $largeHtml,
        ];

        $command = PHP_BINARY . ' -r ' . escapeshellarg(<<<'PHP'
$payload = json_decode(stream_get_contents(STDIN), true);
$html = (string)($payload['source_html'] ?? '');
echo json_encode([
    'ok' => true,
    'provider' => 'test_command',
    'engine_version' => 'large_payload_ok',
    'glossary_version' => 'unit_test_glossary',
    'translation_state' => 'machine_preview',
    'html_length' => strlen($html),
]);
PHP);

        $result = $this->invokeRunCommandProvider($service, $command, $payload);

        $this->assertTrue($result['ok']);
        $this->assertSame('large_payload_ok', $result['engine_version']);
        $this->assertSame(strlen($largeHtml), $result['html_length']);
    }

    public function testCommandProviderTimesOutHungCommand(): void
    {
        $service = $this->newService();
        $previousTimeout = getenv('DCC_TRANSLATION_COMMAND_TIMEOUT_SECONDS');
        putenv('DCC_TRANSLATION_COMMAND_TIMEOUT_SECONDS=1');

        try {
            $command = PHP_BINARY . ' -r ' . escapeshellarg('sleep(2);');
            $result = $this->invokeRunCommandProvider($service, $command, [
                'doc_code' => 'SOP-502',
                'source_html' => '<p>Timeout</p>',
            ]);
        } finally {
            if ($previousTimeout === false) {
                putenv('DCC_TRANSLATION_COMMAND_TIMEOUT_SECONDS');
            } else {
                putenv('DCC_TRANSLATION_COMMAND_TIMEOUT_SECONDS=' . $previousTimeout);
            }
        }

        $this->assertFalse($result['ok']);
        $this->assertSame('translation_command_timed_out', $result['reason']);
        $this->assertSame('command_timeout', $result['engine_version']);
    }

    private function newService(): DocumentLocaleAutomationService
    {
        $baseDir = realpath(__DIR__ . '/../../..');
        $rootDir = $baseDir !== false ? realpath($baseDir . '/..') : false;

        $this->assertIsString($baseDir);
        $this->assertIsString($rootDir);

        return new DocumentLocaleAutomationService(
            new DataLayer($baseDir . '/data', $rootDir),
            $rootDir
        );
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function invokeRunCommandProvider(
        DocumentLocaleAutomationService $service,
        string $command,
        array $payload
    ): array {
        $method = new ReflectionMethod(DocumentLocaleAutomationService::class, 'runCommandProvider');
        set_error_handler(
            static function (int $severity, string $message): bool {
                return $severity === E_DEPRECATED
                    && str_contains($message, 'ReflectionMethod::setAccessible');
            }
        );
        try {
            $method->setAccessible(true);
            /** @var array<string, mixed> $result */
            $result = $method->invoke($service, $command, $payload);
        } finally {
            restore_error_handler();
        }

        return $result;
    }
}
