<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use InvalidArgumentException;
use MOM\Database\DataLayer;
use MOM\Services\DocumentControl\DocumentControlService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Unit tests for the DCC control-plane consolidation work.
 *
 * Exercises the pure business-logic surface of DocumentControlService via an
 * in-memory DataLayer stub that records every SQL call and returns canned
 * result rows. The real DataLayer is only constructed in JSON_ONLY mode so no
 * PDO connection is ever opened — tests are fast and deterministic.
 *
 * @see DocumentControlService
 */
final class DocumentControlServiceConsolidationTest extends TestCase
{
    /** Minimal DataLayer stub that records queries and returns canned rows. */
    private DccTestDataLayer $data;

    private DocumentControlService $service;

    protected function setUp(): void
    {
        $this->data = DccTestDataLayer::build();
        $this->service = new DocumentControlService($this->data);
    }

    public function testRecordRevisionIsIdempotent(): void
    {
        $this->data->queueRow('SELECT * FROM dcc_document_revision', []);
        $this->data->queueRow('SELECT * FROM dcc_document_revision', [[
            'revision_id' => 'rev-1', 'doc_code' => 'SOP-606', 'revision' => 'V1.0',
        ]]);
        $this->data->queueRow('SELECT * FROM dcc_document_revision', [[
            'revision_id' => 'rev-1', 'doc_code' => 'SOP-606', 'revision' => 'V1.0',
        ]]);

        $first = $this->service->recordRevision('SOP-606', ['revision' => 'V1.0'], 'qa.alice');
        $second = $this->service->recordRevision('SOP-606', ['revision' => 'V1.0'], 'qa.alice');

        $this->assertSame('rev-1', $first['revision_id']);
        $this->assertSame('rev-1', $second['revision_id']);
        $inserts = $this->data->countExecutes('INSERT INTO dcc_document_revision');
        $this->assertSame(1, $inserts, 'Second call must not insert again');
    }

    public function testRecordRevisionRejectsLowercaseRevision(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('dcc_invalid_revision_pattern');
        $this->service->recordRevision('SOP-606', ['revision' => 'v1.0'], 'qa.alice');
    }

    public function testRecordRevisionRejectsInvalidUpdateType(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('dcc_record_revision_invalid_update_type');
        $this->service->recordRevision('SOP-606', [
            'revision' => 'V1.0',
            'update_type' => 'breaking',
        ], 'qa.alice');
    }

    public function testRecordRevisionRejectsBadEffectiveDate(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('dcc_record_revision_invalid_effective_date');
        $this->service->recordRevision('SOP-606', [
            'revision' => 'V1.0',
            'effective_date' => '2026/04/24',
        ], 'qa.alice');
    }

    public function testMarkRevisionCurrentFlipsExactlyOne(): void
    {
        $this->service->markRevisionCurrent('SOP-606', 'V2.0', 'qa.alice');

        // Two UPDATE statements run: the first clears is_current on all other
        // rows (SET is_current = FALSE … WHERE is_current = TRUE), the second
        // raises it on the target (SET is_current = TRUE). We match on the SET
        // fragment to avoid false matches against the WHERE clause.
        $clears = $this->data->findExecutes('UPDATE dcc_document_revision', 'SET is_current = FALSE');
        $raises = $this->data->findExecutes('UPDATE dcc_document_revision', 'SET is_current = TRUE');

        $this->assertCount(1, $clears);
        $this->assertCount(1, $raises);
        $this->assertSame('SOP-606', $clears[0]['params'][':c']);
        $this->assertSame('V2.0', $clears[0]['params'][':r']);
        $this->assertSame('SOP-606', $raises[0]['params'][':c']);
        $this->assertSame('V2.0', $raises[0]['params'][':r']);
    }

    public function testProjectCurrentRevisionUpdatesHeaderAndWritesHistory(): void
    {
        $before = [[
            'doc_code' => 'SOP-606',
            'status' => 'approved',
            'revision' => 'V1.0',
            'effective_date' => '2026-01-01',
        ]];
        $after = [[
            'doc_code' => 'SOP-606',
            'status' => 'approved',
            'revision' => 'V2.0',
            'effective_date' => '2026-05-07',
        ]];
        $this->data->queueRow('SELECT header_id, doc_code, eqms_doc_id, title, subtitle, doc_type', $before);
        $this->data->queueRow('SELECT header_id, doc_code, eqms_doc_id, title, subtitle, doc_type', $after);

        $result = $this->service->projectCurrentRevision(
            'SOP-606',
            'V2.0',
            '2026-05-07',
            'qa.alice',
            null,
            'qa_manager',
            'legacy approve projection'
        );

        $this->assertSame('V2.0', $result['revision']);
        $updates = $this->data->findExecutes('UPDATE dcc_document_header', 'revision = :rev');
        $this->assertCount(1, $updates);
        $this->assertSame('V2.0', $updates[0]['params'][':rev']);
        $history = $this->data->findExecutes('INSERT INTO dcc_document_revision_history');
        $this->assertCount(1, $history);
        $this->assertSame('V2.0', $history[0]['params'][':rev']);
        $this->assertSame('V1.0', $history[0]['params'][':prev']);
        $this->assertSame('approved', $history[0]['params'][':to']);
        $this->assertSame('qa_manager', $history[0]['params'][':role']);
    }

    public function testReleaseRequiresDcnMatch(): void
    {
        $this->data->queueRow('SELECT dcn_id, doc_code, to_revision', [[
            'dcn_id' => 'DCN-2026-0001',
            'doc_code' => 'SOP-999',
            'to_revision' => 'V2.0',
            'effective_date' => '2026-04-24',
            'signature_event_id' => null,
            'manifest_hash_sha256' => null,
        ]]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('dcc_dcn_document_mismatch');
        $this->service->release('SOP-606', 'qa.alice', 'QA_APPROVER', 'DCN-2026-0001', null);
    }

    public function testCreateDcrNormalisesUpdateAliasToRevise(): void
    {
        $this->data->queueRow('SELECT * FROM dcc_document_change_request', [[
            'dcr_id' => 'dcr-1',
            'dcr_number' => 'DCR-2026-0001',
            'change_type' => 'revise',
            'metadata' => '{"requested_update_type":"minor_update"}',
        ]]);

        $this->service->createDcr([
            'doc_code' => 'SOP-606',
            'change_type' => 'minor_update',
            'requested_revision' => 'V1.0',
            'reason' => 'simulation release',
        ], 'qa.alice');

        $inserts = $this->data->findExecutes('INSERT INTO dcc_document_change_request');
        $this->assertCount(1, $inserts);
        $this->assertSame('revise', $inserts[0]['params'][':ctype']);
        $this->assertSame(
            '{"requested_update_type":"minor_update"}',
            $inserts[0]['params'][':metadata']
        );
    }

    public function testCreateDcrRejectsUnknownChangeType(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('dcc_dcr_invalid_change_type');

        $this->service->createDcr([
            'doc_code' => 'SOP-606',
            'change_type' => 'surprise',
            'requested_revision' => 'V1.0',
            'reason' => 'invalid alias',
        ], 'qa.alice');
    }

    public function testReleaseRecordsRevisionAndFlipsCurrent(): void
    {
        $this->data->queueRow('SELECT dcn_id, doc_code, to_revision', [[
            'dcn_id' => 'DCN-2026-0002',
            'doc_code' => 'SOP-606',
            'to_revision' => 'V2.0',
            'effective_date' => '2026-04-24',
            'signature_event_id' => null,
            'manifest_hash_sha256' => null,
        ]]);
        // recordRevision: probe for existing (empty), then SELECT after INSERT.
        $this->data->queueRow('SELECT * FROM dcc_document_revision', []);
        $this->data->queueRow('SELECT * FROM dcc_document_revision', [[
            'revision_id' => 'rev-x', 'revision' => 'V2.0',
        ]]);
        // transition() calls getHeader() three times during release:
        //   (a) pre-transition fetch to read current status,
        //   (b) post-UPDATE fetch to return the new row,
        //   (c) outer release() RETURN via transition() result.
        // Queue three identical header rows to cover all three reads.
        $headerRow = [[
            'doc_code' => 'SOP-606', 'status' => 'approved',
            'revision' => 'V1.0', 'effective_date' => '2026-01-01',
        ]];
        $this->data->queueRow('SELECT header_id, doc_code, eqms_doc_id, title, subtitle, doc_type', $headerRow);
        $this->data->queueRow('SELECT header_id, doc_code, eqms_doc_id, title, subtitle, doc_type', $headerRow);
        $this->data->queueRow('SELECT header_id, doc_code, eqms_doc_id, title, subtitle, doc_type', $headerRow);

        $this->service->release('SOP-606', 'qa.alice', 'QA_APPROVER', 'DCN-2026-0002', 'release happy');

        $this->assertGreaterThanOrEqual(
            1,
            $this->data->countExecutes('INSERT INTO dcc_document_revision')
        );
        $this->assertGreaterThanOrEqual(
            2,
            $this->data->countExecutes('UPDATE dcc_document_revision')
        );
        $this->assertGreaterThanOrEqual(
            1,
            $this->data->countExecutes('UPDATE dcc_document_header')
        );
        $this->assertGreaterThanOrEqual(
            1,
            $this->data->countExecutes("UPDATE dcc_document_change_notice SET status = 'released'")
        );
        $this->assertGreaterThanOrEqual(
            1,
            $this->data->countExecutes('INSERT INTO dcc_document_revision_history')
        );
    }

    public function testListRolesFiltersActiveAndClass(): void
    {
        $this->data->queueRow('SELECT role_code, label_vi, label_en, role_class, sort_order', [
            ['role_code' => 'QA', 'label_vi' => 'QA', 'label_en' => 'QA', 'role_class' => 'owner', 'sort_order' => 1],
        ]);

        $this->service->listRoles('owner');

        $last = $this->data->lastQuery('SELECT role_code');
        $this->assertNotNull($last);
        $this->assertStringContainsString('is_active = TRUE', $last['sql']);
        $this->assertStringContainsString("role_class IN ('owner', 'both')", $last['sql']);
    }

    public function testListRolesRejectsInvalidClass(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('dcc_invalid_role_class');
        $this->service->listRoles('banana');
    }

    public function testUpdateFilenameAnchorComputesChecksum(): void
    {
        $filename = 'sop-606-audit.html';
        $this->service->updateFilenameAnchor('SOP-606', $filename, 'mom/docs/operations/' . $filename);

        $updates = $this->data->findExecutes('UPDATE dcc_document_header', 'filename_checksum');
        $this->assertCount(1, $updates);
        $this->assertSame(hash('sha256', $filename), $updates[0]['params'][':fc']);
        $this->assertSame($filename, $updates[0]['params'][':fn']);
        $this->assertSame('mom/docs/operations/' . $filename, $updates[0]['params'][':fp']);
        $this->assertSame('SOP-606', $updates[0]['params'][':c']);
    }

    public function testLocalizedHeaderFailsClosedWhenArtifactFileIsMissing(): void
    {
        $this->data->queueRow('SELECT header_id, doc_code, eqms_doc_id, title, subtitle, doc_type', [[
            'header_id' => 'hdr-1',
            'doc_code' => 'QMS-MAN-001',
            'title' => 'QMS Manual',
            'subtitle' => null,
            'doc_type' => 'MAN',
            'revision' => 'V0.0',
            'effective_date' => '2026-04-23',
            'owner_role_code' => 'QA',
            'approver_role_code' => 'CEO',
            'iso_clause' => null,
            'status' => 'released',
            'locale_default' => 'vi',
            'metadata' => '{}',
            'created_at' => '2026-04-23 00:00:00+07',
            'created_by' => 'qa.alice',
            'updated_at' => '2026-04-23 00:00:00+07',
            'updated_by' => 'qa.alice',
        ]]);
        $this->data->queueRow('SELECT doc_code, locale, title, subtitle, artifact_rel_path', [[
            'doc_code' => 'QMS-MAN-001',
            'locale' => 'en',
            'title' => 'QMS Manual',
            'subtitle' => null,
            'artifact_rel_path' => 'mom/docs/system/quality-manual/_qms-man-001-qms-manual.en.html',
            'artifact_source_revision' => 'V0.0',
            'artifact_source_hash_sha256' => '',
            'translation_state' => 'machine_preview',
            'translation_provider' => 'argos_local_vi_en',
            'glossary_version' => 'repo_glossary:test',
            'engine_version' => 'argos_local_vi_en_v1',
            'reviewer_party_id' => null,
            'reviewed_at' => null,
            'published_at' => null,
            'metadata' => '{}',
            'created_at' => '2026-04-23 00:00:00+07',
            'created_by' => 'qa.alice',
            'updated_at' => '2026-04-23 00:00:00+07',
            'updated_by' => 'qa.alice',
        ]]);

        $result = $this->service->getLocalizedHeader('QMS-MAN-001', 'en');

        $this->assertTrue($result['locale_variant_exists']);
        $this->assertFalse($result['locale_artifact_present']);
        $this->assertFalse($result['locale_renderable']);
        $this->assertNull($result['artifact_rel_path']);
        $this->assertTrue($result['is_locale_fallback']);
    }

    public function testCanonicalizeCodeStripsVerboseTitle(): void
    {
        $this->assertSame('QMS-MAN-001', DocumentControlService::canonicalizeCode('QMS-MAN-001-QMS-MANUAL'));
        $this->assertSame('SOP-606', DocumentControlService::canonicalizeCode('SOP-606-QUALITY-AUDIT'));
        $this->assertSame('FRM-403', DocumentControlService::canonicalizeCode('frm-403-scar'));
        $this->assertSame('POL-QMS-001', DocumentControlService::canonicalizeCode('POL-QMS-001-QUALITY-POLICY'));
    }

    public function testAssertSingleRoleRejectsMultiRole(): void
    {
        $this->data->queueRow('SELECT doc_code, status FROM dcc_document_header', [
            ['doc_code' => 'SOP-606', 'status' => 'draft'],
        ]);
        $this->data->queueRow('SELECT header_id, doc_code', [
            ['doc_code' => 'SOP-606', 'status' => 'draft', 'owner_role_code' => 'QA'],
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('dcc_multi_role_forbidden:owner_role_code');
        $this->service->upsertHeader([
            'doc_code' => 'SOP-606',
            'title' => 'SOP 606',
            'owner_role_code' => 'QA/QMS',
        ], 'qa.alice');
    }
}

/**
 * In-memory DataLayer test double.
 *
 * Extends the real DataLayer but runs in JSON_ONLY mode so no PDO connection
 * is ever opened. Overrides query/execute/scalar to record every call and
 * return canned rows enqueued by the test.
 *
 * @internal scoped to DocumentControlServiceConsolidationTest
 */
final class DccTestDataLayer extends DataLayer
{
    /** @var list<array{sql: string, params: array<string, mixed>, type: string}> */
    public array $log = [];

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
     * Queue a canned result to be returned by the next query() whose SQL
     * contains $match. Missing matches return an empty array.
     *
     * @param list<array<string, mixed>> $rows
     */
    public function queueRow(string $match, array $rows): void
    {
        $this->queuedRows[$match] = $this->queuedRows[$match] ?? [];
        $this->queuedRows[$match][] = $rows;
    }

    public function query(string $sql, array $params = []): ?array
    {
        $this->log[] = ['sql' => $sql, 'params' => $params, 'type' => 'query'];
        foreach ($this->queuedRows as $match => $queue) {
            if ($queue === []) {
                continue;
            }
            if (str_contains($sql, $match)) {
                $rows = array_shift($this->queuedRows[$match]);
                return $rows;
            }
        }
        return [];
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->log[] = ['sql' => $sql, 'params' => $params, 'type' => 'execute'];
        return 1;
    }

    public function scalar(string $sql, array $params = []): mixed
    {
        $this->log[] = ['sql' => $sql, 'params' => $params, 'type' => 'scalar'];
        return 0;
    }

    public function countExecutes(string $match): int
    {
        $n = 0;
        foreach ($this->log as $entry) {
            if ($entry['type'] !== 'execute') {
                continue;
            }
            if (str_contains($entry['sql'], $match)) {
                $n++;
            }
        }
        return $n;
    }

    /**
     * @return list<array{sql: string, params: array<string, mixed>, type: string}>
     */
    public function findExecutes(string $match, ?string $contains = null): array
    {
        $out = [];
        foreach ($this->log as $entry) {
            if ($entry['type'] !== 'execute') {
                continue;
            }
            if (!str_contains($entry['sql'], $match)) {
                continue;
            }
            if ($contains !== null && !str_contains($entry['sql'], $contains)) {
                continue;
            }
            $out[] = $entry;
        }
        return $out;
    }

    /**
     * @return array{sql: string, params: array<string, mixed>, type: string}|null
     */
    public function lastQuery(string $match): ?array
    {
        $last = null;
        foreach ($this->log as $entry) {
            if ($entry['type'] !== 'query') {
                continue;
            }
            if (str_contains($entry['sql'], $match)) {
                $last = $entry;
            }
        }
        return $last;
    }
}
