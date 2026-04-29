<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\DataLayer;
use MOM\Services\DocumentControl\DocumentLocaleAutomationService;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
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

    public function testCommandProviderBoundsLargeErrorPayload(): void
    {
        $service = $this->newService();
        $command = PHP_BINARY . ' -r ' . escapeshellarg(<<<'PHP'
fwrite(STDERR, str_repeat('X', 400000));
exit(1);
PHP);

        $result = $this->invokeRunCommandProvider($service, $command, [
            'doc_code' => 'SOP-502',
            'source_html' => '<p>Error payload</p>',
        ]);

        $this->assertFalse($result['ok']);
        $this->assertSame('translation_command_failed', $result['reason']);
        $this->assertLessThanOrEqual(4096, strlen((string)$result['message']));
        $this->assertStringContainsString('truncated', (string)$result['message']);
    }

    public function testBoundedOutputAppendNeverExceedsConfiguredCap(): void
    {
        $service = $this->newService();
        $class = new ReflectionClass(DocumentLocaleAutomationService::class);
        $constant = $class->getReflectionConstant('MAX_COMMAND_OUTPUT_BYTES');
        $this->assertNotFalse($constant);
        $cap = (int)$constant->getValue();
        $method = new ReflectionMethod(DocumentLocaleAutomationService::class, 'appendBoundedCommandOutput');
        set_error_handler(
            static function (int $severity, string $message): bool {
                return $severity === E_DEPRECATED
                    && str_contains($message, 'ReflectionMethod::setAccessible');
            }
        );
        try {
            $method->setAccessible(true);
            $nearCap = str_repeat('A', 131060);
            $result = $method->invoke($service, $nearCap, str_repeat('B', 200));
        } finally {
            restore_error_handler();
        }

        $this->assertIsString($result);
        $this->assertLessThanOrEqual($cap, strlen($result));
        $this->assertGreaterThan(131072, strlen($result));
    }

    public function testLocaleArtifactQualityGateDetectsCorruptMachineOutput(): void
    {
        $html = '<html lang="en"><body>'
            . '<p>Accept reject Re Re Re Re Re Re Re and đánh giá nội bộ remains.</p>'
            . '<p>according to<a href="wi.html">WI-603</a>and close.</p>'
            . '</body></html>';

        $classification = DocumentLocaleAutomationService::classifyLocaleArtifactQualityIssues($html);

        // Critical: structural breakage that must block publication.
        $this->assertContains('repeated_token_loop', $classification['critical']);
        // Two residual terms ("đánh giá", "nội bộ") in a short snippet push
        // the residue fraction past the 0.5% gate, marking the artifact as
        // structurally untrustworthy.
        $this->assertContains('vietnamese_residue_severe', $classification['critical']);
        // Cosmetic anchor-spacing problems are advisory: they do not block
        // a machine_preview artifact, only get recorded in metadata.
        $this->assertContains('anchor_prefix_spacing', $classification['advisory']);
        $this->assertContains('anchor_suffix_spacing', $classification['advisory']);

        // Backwards-compatible critical-only API surfaces only the blockers.
        $issues = DocumentLocaleAutomationService::detectLocaleArtifactQualityIssues($html);
        $this->assertContains('repeated_token_loop', $issues);
        $this->assertNotContains('anchor_prefix_spacing', $issues);
    }

    public function testLocaleArtifactQualityGateAllowsCleanTechnicalCodes(): void
    {
        $html = '<html lang="en"><body>'
            . '<p>Use AQL Ac/Re with WI-603, ANNEX-701, SSOT, SoD, QPL, ToolID and PackID.</p>'
            . '<p>Evidence is recorded for internal audit and release handoff.</p>'
            . '</body></html>';

        $this->assertSame([], DocumentLocaleAutomationService::detectLocaleArtifactQualityIssues($html));
    }

    public function testLocaleArtifactQualityGateDetectsResidualAcrossTags(): void
    {
        $html = '<html lang="en"><body><span>Coach</span><span>đánh giá nội bộ</span><span>Escalation</span></body></html>';

        // "đánh giá" + "nội bộ" → 2 residual terms; below the critical
        // threshold (≥3) but well over 0.5% of the visible-text length, so
        // the percentage gate flags it as severe.
        $classification = DocumentLocaleAutomationService::classifyLocaleArtifactQualityIssues($html);
        $this->assertContains('vietnamese_residue_severe', $classification['critical']);
    }

    public function testLocaleArtifactQualityGateDetectsShortCorruptionLoops(): void
    {
        $html = '<html lang="en"><body>'
            . '<p>Accept/Reject Ac Re Re and hóa hóa must not pass.</p>'
            . '<p>detection detection discovery discovery reject reject</p>'
            . '</body></html>';

        $issues = DocumentLocaleAutomationService::detectLocaleArtifactQualityIssues($html);

        // Repeat-loop is always critical regardless of residue volume.
        $this->assertContains('repeated_token_loop', $issues);
    }

    public function testLocaleArtifactQualityGateAcceptsTinyVietnameseResidueAsAdvisory(): void
    {
        // A long English document with one stray Vietnamese diacritic should
        // pass the critical gate (publish as machine_preview) and only
        // surface the residue as advisory metadata. Real-world artifacts
        // routinely contain a single proper-name diacritic that the engine
        // cannot translate; a binary gate makes the entire document unviewable.
        $body = str_repeat(
            '<p>Released data is verified before each shift and the operator '
            . 'records evidence at the point of use, with traceability links '
            . 'maintained through final inspection.</p>',
            8
        );
        $html = '<html lang="en"><body>' . $body
            . '<p>Approved by signatory gá Khanh.</p></body></html>';

        $classification = DocumentLocaleAutomationService::classifyLocaleArtifactQualityIssues($html);
        $this->assertSame([], $classification['critical']);
        $this->assertContains('vietnamese_residue_minor', $classification['advisory']);
    }

    public function testLocaleArtifactQualityGateBlocksDenseVietnameseResidue(): void
    {
        // A short snippet that is mostly Vietnamese: the percentage gate
        // (>0.5% of visible characters) classifies this as severe and blocks.
        $html = '<html lang="en"><body><p>The fixture gá is still untranslated.</p></body></html>';

        $issues = DocumentLocaleAutomationService::detectLocaleArtifactQualityIssues($html);
        $this->assertContains('vietnamese_residue_severe', $issues);
    }

    public function testLocaleArtifactQualityGateRejectsSemanticMachineNoise(): void
    {
        $html = '<html lang="en"><body>'
            . '<p>Datum The ink applies/] principle Force must APPLEY KHI continue.</p>'
            . '<p>Use %d full request first time and occipital logic.</p>'
            . '</body></html>';

        $classification = DocumentLocaleAutomationService::classifyLocaleArtifactQualityIssues($html);

        // Machine-noise patterns are critical: they indicate the engine
        // produced incoherent text that no reader should see.
        $this->assertContains('machine_artifact_noise', $classification['critical']);
        // Stray printf-style placeholders (e.g., "%d") are advisory: visible
        // in metadata but not enough on their own to block a preview.
        $this->assertContains('symbol_placeholder_noise', $classification['advisory']);
    }

    public function testLocaleArtifactQualityGateRejectsAsciiVietnameseResidue(): void
    {
        $html = '<html lang="en"><body><p>danh gia noi bo ho so phat hanh remains from source text.</p></body></html>';

        $this->assertContains(
            'ascii_vietnamese_residue',
            DocumentLocaleAutomationService::detectLocaleArtifactQualityIssues($html)
        );
    }

    public function testLocaleArtifactQualityGateAllowsNormalPercentText(): void
    {
        $html = '<html lang="en"><body><p>Use 100% inspection when the AQL plan requires tightened control.</p></body></html>';

        $this->assertSame([], DocumentLocaleAutomationService::detectLocaleArtifactQualityIssues($html));
    }

    public function testRuntimeArtifactCacheDoesNotRestoreNonCompliantHtml(): void
    {
        $service = $this->newService();
        $docCode = 'UNIT-CACHE-QUALITY';
        $locale = 'en';
        $sourceHash = str_repeat('a', 64);
        $badHtml = '<html lang="en"><body><p>Datum The ink applies/] principle Force %d</p></body></html>';

        $pathMethod = new ReflectionMethod(DocumentLocaleAutomationService::class, 'runtimeArtifactCachePath');
        $restoreMethod = new ReflectionMethod(DocumentLocaleAutomationService::class, 'restoreArtifactFromRuntimeCache');
        set_error_handler(
            static function (int $severity, string $message): bool {
                return $severity === E_DEPRECATED
                    && str_contains($message, 'ReflectionMethod::setAccessible');
            }
        );
        try {
            $pathMethod->setAccessible(true);
            $restoreMethod->setAccessible(true);
            $cachePath = (string)$pathMethod->invoke($service, $docCode, $locale, $sourceHash);
            $cacheDir = dirname($cachePath);
            if (!is_dir($cacheDir)) {
                mkdir($cacheDir, 0775, true);
            }
            file_put_contents($cachePath, $badHtml);

            $restored = $restoreMethod->invoke(
                $service,
                $docCode,
                $locale,
                $sourceHash,
                'mom/data/cache/dcc-locale-artifacts-test/_unit-cache-quality.en.html'
            );
        } finally {
            restore_error_handler();
        }

        $this->assertFalse($restored);
        $this->assertFileDoesNotExist($cachePath);
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
