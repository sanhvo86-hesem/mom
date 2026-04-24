<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\DataLayer;
use MOM\Services\DocumentControl\DocumentHeaderService;
use PHPUnit\Framework\TestCase;

final class DocumentHeaderServiceFallbackTest extends TestCase
{
    private HeaderTestDataLayer $data;

    private DocumentHeaderService $service;

    protected function setUp(): void
    {
        $this->data = HeaderTestDataLayer::build();
        $this->service = new DocumentHeaderService($this->data);
    }

    public function testRenderFallsBackToLegacyCatalogTitleAndDocDescriptionSubtitle(): void
    {
        $this->queueDefaultLabels();
        $this->data->queueRow('FROM dcc_document_header', [[
            'header_id' => 'hdr-1',
            'doc_code' => 'QMS-MAN-001',
            'eqms_doc_id' => null,
            'title' => 'QMS-MAN-001',
            'subtitle' => null,
            'doc_type' => 'MAN',
            'revision' => 'V2.0',
            'effective_date' => '2026-04-24',
            'owner_role_code' => 'QA',
            'approver_role_code' => 'CEO',
            'iso_clause' => null,
            'status' => 'approved',
            'locale_default' => 'vi',
            'metadata' => '{}',
            'created_at' => '2026-04-24 00:00:00+07',
            'created_by' => 'qa.alice',
            'updated_at' => '2026-04-24 00:00:00+07',
            'updated_by' => 'qa.alice',
        ]]);

        $result = $this->service->render('QMS-MAN-001', 'vi');

        $this->assertSame('QMS Manual', $result['title']);
        $this->assertSame('Sổ tay QMS tích hợp — tổng quan hệ thống quản lý chất lượng', $result['subtitle']);
        $this->assertSame('2026-04-24', $result['effective_date']);
    }

    public function testRenderPreservesMeaningfulDbTitleAndSubtitle(): void
    {
        $this->queueDefaultLabels();
        $this->data->queueRow('FROM dcc_document_header', [[
            'header_id' => 'hdr-2',
            'doc_code' => 'SOP-108',
            'eqms_doc_id' => null,
            'title' => 'Operational Contingency Plan',
            'subtitle' => 'Kích hoạt, vận hành, phục hồi và bù dữ liệu tồn khi có gián đoạn',
            'doc_type' => 'SOP',
            'revision' => 'V1.0',
            'effective_date' => '2026-04-23',
            'owner_role_code' => 'QA',
            'approver_role_code' => 'CEO',
            'iso_clause' => null,
            'status' => 'approved',
            'locale_default' => 'vi',
            'metadata' => '{}',
            'created_at' => '2026-04-23 00:00:00+07',
            'created_by' => 'qa.alice',
            'updated_at' => '2026-04-23 00:00:00+07',
            'updated_by' => 'qa.alice',
        ]]);

        $result = $this->service->render('SOP-108', 'vi');

        $this->assertSame('Operational Contingency Plan', $result['title']);
        $this->assertSame('Kích hoạt, vận hành, phục hồi và bù dữ liệu tồn khi có gián đoạn', $result['subtitle']);
    }

    private function queueDefaultLabels(): void
    {
        $this->data->queueRow('FROM dcc_document_header_label', [
            ['label_key' => 'doc_id', 'short_label' => 'ID', 'long_label' => 'Mã tài liệu', 'sort_order' => 10],
            ['label_key' => 'revision', 'short_label' => 'Rev', 'long_label' => 'Phiên bản', 'sort_order' => 20],
            ['label_key' => 'effective_date', 'short_label' => 'Eff', 'long_label' => 'Ngày hiệu lực', 'sort_order' => 30],
            ['label_key' => 'owner', 'short_label' => 'Owner', 'long_label' => 'Chủ sở hữu', 'sort_order' => 40],
            ['label_key' => 'approver', 'short_label' => 'Appr', 'long_label' => 'Phê duyệt', 'sort_order' => 50],
        ]);
    }
}

final class HeaderTestDataLayer extends DataLayer
{
    /** @var array<string, list<list<array<string, mixed>>>> */
    private array $queuedRows = [];

    public static function build(): self
    {
        $tmp = sys_get_temp_dir();
        return new self($tmp, $tmp, [
            'use_postgres' => false,
            'shadow_write' => false,
            'json_fallback' => false,
        ]);
    }

    /**
     * @param list<array<string, mixed>> $rows
     */
    public function queueRow(string $match, array $rows): void
    {
        $this->queuedRows[$match] = $this->queuedRows[$match] ?? [];
        $this->queuedRows[$match][] = $rows;
    }

    public function query(string $sql, array $params = []): ?array
    {
        foreach ($this->queuedRows as $match => $queues) {
            if (str_contains($sql, $match) && $queues !== []) {
                $rows = array_shift($this->queuedRows[$match]);
                return $rows;
            }
        }
        return [];
    }

    public function execute(string $sql, array $params = []): int
    {
        return 1;
    }

    public function scalar(string $sql, array $params = []): mixed
    {
        return null;
    }
}
