<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\TranslationService;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for TranslationService (i18n).
 */
class TranslationServiceTest extends TestCase
{
    private string $tmpDir;
    private TranslationService $t;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_i18n_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir . '/i18n', 0775, true);

        // Write test locale files
        file_put_contents($this->tmpDir . '/i18n/en.json', json_encode([
            'common' => [
                'save' => 'Save',
                'cancel' => 'Cancel',
            ],
            'error' => [
                'not_found' => 'Record not found',
                'validation' => 'Validation failed: {field} - {message}',
            ],
            'greeting' => 'Hello, {name}!',
        ]));

        file_put_contents($this->tmpDir . '/i18n/vi.json', json_encode([
            'common' => [
                'save' => 'Lưu',
                'cancel' => 'Hủy',
            ],
            'error' => [
                'not_found' => 'Không tìm thấy bản ghi',
                'validation' => 'Lỗi xác thực: {field} - {message}',
            ],
            'greeting' => 'Xin chào, {name}!',
        ]));

        $this->t = new TranslationService($this->tmpDir, 'en', 'en');
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testGetEnglish(): void
    {
        $this->assertSame('Save', $this->t->get('common.save'));
        $this->assertSame('Cancel', $this->t->get('common.cancel'));
        $this->assertSame('Record not found', $this->t->get('error.not_found'));
    }

    public function testGetVietnamese(): void
    {
        $t = new TranslationService($this->tmpDir, 'vi', 'en');
        $this->assertSame('Lưu', $t->get('common.save'));
        $this->assertSame('Không tìm thấy bản ghi', $t->get('error.not_found'));
    }

    public function testParameterInterpolation(): void
    {
        $result = $this->t->get('greeting', ['name' => 'HESEM']);
        $this->assertSame('Hello, HESEM!', $result);
    }

    public function testMultipleParameterInterpolation(): void
    {
        $result = $this->t->get('error.validation', [
            'field' => 'email',
            'message' => 'invalid format',
        ]);
        $this->assertSame('Validation failed: email - invalid format', $result);
    }

    public function testMissingKeyReturnsKey(): void
    {
        $result = $this->t->get('nonexistent.key');
        $this->assertSame('nonexistent.key', $result);
    }

    public function testFallbackLocale(): void
    {
        // Create a locale with partial translations
        file_put_contents($this->tmpDir . '/i18n/ja.json', json_encode([
            'common' => ['save' => '保存'],
        ]));

        $t = new TranslationService($this->tmpDir, 'ja', 'en');

        // Has Japanese translation
        $this->assertSame('保存', $t->get('common.save'));

        // Falls back to English
        $this->assertSame('Record not found', $t->get('error.not_found'));
    }

    public function testGetBilingual(): void
    {
        $result = $this->t->getBilingual('greeting', ['name' => 'HESEM']);

        $this->assertSame('Hello, HESEM!', $result['en']);
        $this->assertSame('Xin chào, HESEM!', $result['vi']);
    }

    public function testHas(): void
    {
        $this->assertTrue($this->t->has('common.save'));
        $this->assertFalse($this->t->has('nonexistent.key'));
    }

    public function testSetLocale(): void
    {
        $this->assertSame('en', $this->t->getLocale());

        $this->t->setLocale('vi');
        $this->assertSame('vi', $this->t->getLocale());
        $this->assertSame('Lưu', $this->t->get('common.save'));
    }

    public function testAllWithPrefix(): void
    {
        $common = $this->t->all('common.');
        $this->assertArrayHasKey('save', $common);
        $this->assertArrayHasKey('cancel', $common);
        $this->assertArrayNotHasKey('error.not_found', $common);
    }

    public function testUnsupportedLocaleDefaultsToEn(): void
    {
        $t = new TranslationService($this->tmpDir, 'xx', 'en');
        $this->assertSame('en', $t->getLocale());
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) return;
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
