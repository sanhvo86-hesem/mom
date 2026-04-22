<?php

declare(strict_types=1);

namespace MOM\Services\DocumentControl;

use MOM\Database\DataLayer;
use RuntimeException;
use InvalidArgumentException;

/**
 * DCC — Document Change Control Service.
 *
 * Canonical business-logic entry point for the QMS document version-control
 * workflow. Operates on migration-150 tables (dcc_document_*) and is
 * intentionally distinct from the Engineering Change Control (ECC) workflow
 * backed by plm_change_* tables. The two workflows must never share state.
 *
 * Responsibilities:
 *   • Enforce the DCC state machine:
 *       draft → in_review → approved → released → superseded → obsolete
 *   • Enforce single-owner / single-approver invariants (header constraints).
 *   • Issue revision-history rows for every transition (append-only audit).
 *   • Reject release requests that are not backed by an issued DCN.
 *
 * Standards:
 *   ISO 9001:2015 §7.5 • AS9100D §7.5 • IATF 16949 §7.5
 *   FDA 21 CFR Part 820.40 (Document Controls)
 *   FDA 21 CFR Part 11    (Electronic Records and Signatures)
 *
 * @since 4.1.0
 */
final class DocumentControlService
{
    /** @var array<string, list<string>> State machine adjacency list. */
    private const TRANSITIONS = [
        'draft'      => ['in_review'],
        'in_review'  => ['approved', 'draft'],
        'approved'   => ['released', 'draft'],
        'released'   => ['superseded', 'obsolete'],
        'superseded' => ['obsolete'],
        'obsolete'   => [],
    ];

    private const VALID_DOC_TYPES = [
        'MAN', 'POL', 'SOP', 'WI', 'FRM', 'ANNEX', 'JD', 'DEPT', 'ORG', 'REF', 'TRN',
    ];

    private const REVISION_PATTERN = '/^V\d+(\.\d+)?$/';

    public function __construct(private DataLayer $data) {}

    // ── Label registry ─────────────────────────────────────────────────────

    /**
     * Return active header labels for a locale (falls back to 'en').
     *
     * @return list<array{label_key: string, short_label: string, long_label: string, sort_order: int}>
     */
    public function listLabels(string $locale = 'en'): array
    {
        $locale = $this->normaliseLocale($locale);
        $rows = $this->data->query(
            "SELECT label_key, short_label, long_label, sort_order, help_text
             FROM dcc_document_header_label
             WHERE is_active = TRUE AND locale = :loc
             ORDER BY sort_order, label_key",
            [':loc' => $locale]
        ) ?? [];

        if ($rows === [] && $locale !== 'en') {
            return $this->listLabels('en');
        }
        return $rows;
    }

    // ── Header CRUD ────────────────────────────────────────────────────────

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function createHeader(array $input, string $actor): array
    {
        $this->validateHeaderInput($input);

        $this->data->execute(
            "INSERT INTO dcc_document_header
                 (doc_code, eqms_doc_id, title, subtitle, doc_type, revision,
                  effective_date, owner_role_code, approver_role_code, iso_clause,
                  status, locale_default, metadata, created_at, created_by,
                  updated_at, updated_by)
             VALUES
                 (:doc_code, :eqms_doc_id, :title, :subtitle, :doc_type, :revision,
                  :effective_date, :owner, :approver, :iso_clause,
                  :status, :locale_default, CAST(:metadata AS jsonb), now(), :actor,
                  now(), :actor)",
            [
                ':doc_code'       => $input['doc_code'],
                ':eqms_doc_id'    => $input['eqms_doc_id'] ?? null,
                ':title'          => $input['title'],
                ':subtitle'       => $input['subtitle'] ?? null,
                ':doc_type'       => $input['doc_type'],
                ':revision'       => $input['revision'],
                ':effective_date' => $input['effective_date'],
                ':owner'          => $input['owner_role_code'],
                ':approver'       => $input['approver_role_code'],
                ':iso_clause'     => $input['iso_clause'] ?? null,
                ':status'         => $input['status'] ?? 'draft',
                ':locale_default' => $input['locale_default'] ?? 'en',
                ':metadata'       => json_encode($input['metadata'] ?? (object)[], JSON_UNESCAPED_UNICODE),
                ':actor'          => $actor,
            ]
        );

        $this->recordHistory($input['doc_code'], [
            'revision'          => $input['revision'],
            'previous_revision' => null,
            'from_status'       => null,
            'to_status'         => $input['status'] ?? 'draft',
            'effective_date'    => $input['effective_date'],
            'actor_party_id'    => $actor,
            'actor_role_code'   => $input['actor_role_code'] ?? null,
            'dcr_id'            => null,
            'dcn_id'            => null,
            'note'              => 'initial_registration',
        ]);

        return $this->getHeader($input['doc_code']);
    }

    /**
     * Return the header projection for a document code.
     *
     * @return array<string, mixed>
     */
    public function getHeader(string $docCode): array
    {
        $row = $this->data->query(
            "SELECT header_id, doc_code, eqms_doc_id, title, subtitle, doc_type,
                    revision, effective_date, owner_role_code, approver_role_code,
                    iso_clause, status, locale_default, metadata,
                    created_at, created_by, updated_at, updated_by
             FROM dcc_document_header
             WHERE doc_code = :c
             LIMIT 1",
            [':c' => $docCode]
        ) ?? [];

        if ($row === []) {
            throw new RuntimeException('dcc_document_not_found:' . $docCode);
        }
        return $row[0];
    }

    /**
     * Patch mutable metadata on an existing header. Forbidden for obsolete docs.
     *
     * @param array<string, mixed> $patch
     */
    public function updateHeader(string $docCode, array $patch, string $actor): array
    {
        $current = $this->getHeader($docCode);
        if ($current['status'] === 'obsolete') {
            throw new RuntimeException('dcc_document_obsolete_readonly');
        }

        $allowed = [
            'title', 'subtitle', 'iso_clause',
            'owner_role_code', 'approver_role_code', 'metadata',
        ];
        $sets   = [];
        $params = [':c' => $docCode, ':actor' => $actor];
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $patch)) {
                continue;
            }
            if ($key === 'owner_role_code' || $key === 'approver_role_code') {
                $this->assertSingleRole($key, (string)$patch[$key]);
            }
            if ($key === 'metadata') {
                $sets[]           = "metadata = CAST(:metadata AS jsonb)";
                $params[':metadata'] = json_encode($patch['metadata'], JSON_UNESCAPED_UNICODE);
                continue;
            }
            $sets[]           = "$key = :$key";
            $params[":$key"]  = $patch[$key];
        }

        if ($sets === []) {
            return $current;
        }
        $sets[] = "updated_by = :actor";
        $sql = "UPDATE dcc_document_header SET " . implode(', ', $sets) . " WHERE doc_code = :c";
        $this->data->execute($sql, $params);

        return $this->getHeader($docCode);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listHeaders(array $filters = [], int $limit = 100, int $offset = 0): array
    {
        $where  = ['1=1'];
        $params = [];
        foreach (['doc_type', 'status', 'owner_role_code'] as $f) {
            if (!empty($filters[$f])) {
                $where[]         = "$f = :$f";
                $params[":$f"]   = $filters[$f];
            }
        }
        if (!empty($filters['search'])) {
            $where[]           = "(doc_code ILIKE :s OR title ILIKE :s)";
            $params[':s']      = '%' . $filters['search'] . '%';
        }
        $limit  = max(1, min(500, $limit));
        $offset = max(0, $offset);
        $sql = "SELECT doc_code, title, doc_type, revision, effective_date,
                       owner_role_code, approver_role_code, status, updated_at
                FROM dcc_document_header
                WHERE " . implode(' AND ', $where) . "
                ORDER BY doc_code
                LIMIT $limit OFFSET $offset";
        return $this->data->query($sql, $params) ?? [];
    }

    /** @return list<array<string, mixed>> */
    public function listRevisions(string $docCode): array
    {
        return $this->data->query(
            "SELECT history_id, revision, previous_revision, from_status, to_status,
                    effective_date, actor_party_id, actor_role_code,
                    dcr_id, dcn_id, note, recorded_at
             FROM dcc_document_revision_history
             WHERE doc_code = :c
             ORDER BY recorded_at DESC",
            [':c' => $docCode]
        ) ?? [];
    }

    // ── State machine transitions ──────────────────────────────────────────

    public function submitReview(string $docCode, string $actor, ?string $roleCode = null, ?string $note = null): array
    {
        return $this->transition($docCode, 'in_review', $actor, $roleCode, null, null, $note ?? 'submitted_for_review');
    }

    public function approve(string $docCode, string $actor, ?string $roleCode, ?string $dcrId = null, ?string $note = null): array
    {
        return $this->transition($docCode, 'approved', $actor, $roleCode, $dcrId, null, $note ?? 'approved_by_reviewer');
    }

    public function release(string $docCode, string $actor, string $roleCode, string $dcnId, ?string $note = null): array
    {
        // Verify DCN exists and matches this doc.
        $dcn = $this->data->query(
            "SELECT dcn_id, doc_code, to_revision, effective_date FROM dcc_document_change_notice
             WHERE dcn_id = :id LIMIT 1",
            [':id' => $dcnId]
        ) ?? [];
        if ($dcn === []) {
            throw new RuntimeException('dcc_release_requires_dcn_not_found');
        }
        if ($dcn[0]['doc_code'] !== $docCode) {
            throw new RuntimeException('dcc_dcn_document_mismatch');
        }

        $this->data->execute(
            "UPDATE dcc_document_header
             SET revision = :rev, effective_date = :eff, updated_by = :actor
             WHERE doc_code = :c",
            [
                ':rev'   => $dcn[0]['to_revision'],
                ':eff'   => $dcn[0]['effective_date'],
                ':actor' => $actor,
                ':c'     => $docCode,
            ]
        );

        $this->data->execute(
            "UPDATE dcc_document_change_notice SET status = 'released' WHERE dcn_id = :id",
            [':id' => $dcnId]
        );

        return $this->transition($docCode, 'released', $actor, $roleCode, null, $dcnId, $note ?? 'released_via_dcn');
    }

    public function supersede(string $docCode, string $actor, string $roleCode, ?string $note = null): array
    {
        return $this->transition($docCode, 'superseded', $actor, $roleCode, null, null, $note ?? 'superseded_by_new_revision');
    }

    public function obsolete(string $docCode, string $actor, string $roleCode, ?string $note = null): array
    {
        return $this->transition($docCode, 'obsolete', $actor, $roleCode, null, null, $note ?? 'retired_from_control');
    }

    // ── DCR / DCN operations ───────────────────────────────────────────────

    /**
     * @param array<string, mixed> $input
     */
    public function createDcr(array $input, string $actor): array
    {
        foreach (['doc_code', 'change_type', 'requested_revision', 'reason'] as $k) {
            if (empty($input[$k])) {
                throw new InvalidArgumentException("dcc_dcr_missing_$k");
            }
        }
        $this->assertValidRevision($input['requested_revision']);

        $dcrNumber = $input['dcr_number'] ?? $this->nextDcrNumber();
        $this->data->execute(
            "INSERT INTO dcc_document_change_request
                 (dcr_number, doc_code, change_type, requested_revision, reason,
                  impact_assessment, linked_ecr, requested_by, reviewer_role_code,
                  target_effective_date, status, metadata)
             VALUES
                 (:num, :c, :ctype, :rev, :reason, :impact, :ecr, :actor, :reviewer_role,
                  :target_eff, 'submitted', CAST(:metadata AS jsonb))",
            [
                ':num'           => $dcrNumber,
                ':c'             => $input['doc_code'],
                ':ctype'         => $input['change_type'],
                ':rev'           => $input['requested_revision'],
                ':reason'        => $input['reason'],
                ':impact'        => $input['impact_assessment'] ?? null,
                ':ecr'           => $input['linked_ecr'] ?? null,
                ':actor'         => $actor,
                ':reviewer_role' => $input['reviewer_role_code'] ?? null,
                ':target_eff'    => $input['target_effective_date'] ?? null,
                ':metadata'      => json_encode($input['metadata'] ?? (object)[], JSON_UNESCAPED_UNICODE),
            ]
        );

        return $this->data->query(
            "SELECT * FROM dcc_document_change_request WHERE dcr_number = :n LIMIT 1",
            [':n' => $dcrNumber]
        )[0];
    }

    public function approveDcr(string $dcrId, string $actor, string $roleCode): array
    {
        $this->data->execute(
            "UPDATE dcc_document_change_request
             SET status = 'approved', approver_role_code = :role, approver_party_id = :actor, approved_at = now()
             WHERE dcr_id = :id AND status IN ('submitted','in_review')",
            [':id' => $dcrId, ':actor' => $actor, ':role' => $roleCode]
        );
        return $this->fetchDcr($dcrId);
    }

    public function rejectDcr(string $dcrId, string $actor, string $reason): array
    {
        $this->data->execute(
            "UPDATE dcc_document_change_request
             SET status = 'rejected', rejection_reason = :reason, approver_party_id = :actor, approved_at = now()
             WHERE dcr_id = :id AND status IN ('submitted','in_review')",
            [':id' => $dcrId, ':reason' => $reason, ':actor' => $actor]
        );
        return $this->fetchDcr($dcrId);
    }

    /**
     * @param array<string, mixed> $input
     */
    public function issueDcn(array $input, string $actor): array
    {
        foreach (['dcr_id', 'to_revision', 'effective_date', 'release_authority'] as $k) {
            if (empty($input[$k])) {
                throw new InvalidArgumentException("dcc_dcn_missing_$k");
            }
        }
        $this->assertValidRevision($input['to_revision']);

        $dcr = $this->fetchDcr($input['dcr_id']);
        if ($dcr['status'] !== 'approved') {
            throw new RuntimeException('dcc_dcn_requires_approved_dcr');
        }

        $dcnNumber = $input['dcn_number'] ?? $this->nextDcnNumber();
        $this->data->execute(
            "INSERT INTO dcc_document_change_notice
                 (dcn_number, dcr_id, doc_code, from_revision, to_revision, effective_date,
                  release_authority, signature_event_id, manifest_hash_sha256, metadata)
             VALUES
                 (:num, :dcr, :doc, :from, :to, :eff,
                  :auth, :sig, :hash, CAST(:metadata AS jsonb))",
            [
                ':num'      => $dcnNumber,
                ':dcr'      => $input['dcr_id'],
                ':doc'      => $dcr['doc_code'],
                ':from'     => $input['from_revision'] ?? null,
                ':to'       => $input['to_revision'],
                ':eff'      => $input['effective_date'],
                ':auth'    => $input['release_authority'],
                ':sig'      => $input['signature_event_id'] ?? null,
                ':hash'     => $input['manifest_hash_sha256'] ?? null,
                ':metadata' => json_encode($input['metadata'] ?? (object)[], JSON_UNESCAPED_UNICODE),
            ]
        );

        return $this->data->query(
            "SELECT * FROM dcc_document_change_notice WHERE dcn_number = :n LIMIT 1",
            [':n' => $dcnNumber]
        )[0];
    }

    /** @return array<string, mixed> */
    public function fetchDcr(string $dcrId): array
    {
        $rows = $this->data->query(
            "SELECT * FROM dcc_document_change_request WHERE dcr_id = :id LIMIT 1",
            [':id' => $dcrId]
        ) ?? [];
        if ($rows === []) {
            throw new RuntimeException('dcc_dcr_not_found');
        }
        return $rows[0];
    }

    /** @return array<string, mixed> */
    public function fetchDcn(string $dcnId): array
    {
        $rows = $this->data->query(
            "SELECT * FROM dcc_document_change_notice WHERE dcn_id = :id LIMIT 1",
            [':id' => $dcnId]
        ) ?? [];
        if ($rows === []) {
            throw new RuntimeException('dcc_dcn_not_found');
        }
        return $rows[0];
    }

    // ── Internals ──────────────────────────────────────────────────────────

    private function transition(
        string $docCode,
        string $targetStatus,
        string $actor,
        ?string $roleCode,
        ?string $dcrId,
        ?string $dcnId,
        string $note
    ): array {
        $current = $this->getHeader($docCode);
        $from    = (string)$current['status'];

        $allowed = self::TRANSITIONS[$from] ?? [];
        if (!in_array($targetStatus, $allowed, true)) {
            throw new RuntimeException(sprintf(
                'dcc_invalid_transition:%s->%s',
                $from,
                $targetStatus
            ));
        }

        $this->data->execute(
            "UPDATE dcc_document_header SET status = :s, updated_by = :actor WHERE doc_code = :c",
            [':s' => $targetStatus, ':actor' => $actor, ':c' => $docCode]
        );

        $this->recordHistory($docCode, [
            'revision'          => $current['revision'],
            'previous_revision' => $current['revision'],
            'from_status'       => $from,
            'to_status'         => $targetStatus,
            'effective_date'    => $current['effective_date'],
            'actor_party_id'    => $actor,
            'actor_role_code'   => $roleCode,
            'dcr_id'            => $dcrId,
            'dcn_id'            => $dcnId,
            'note'              => $note,
        ]);

        return $this->getHeader($docCode);
    }

    /** @param array<string, mixed> $row */
    private function recordHistory(string $docCode, array $row): void
    {
        $this->data->execute(
            "INSERT INTO dcc_document_revision_history
                 (doc_code, revision, previous_revision, from_status, to_status,
                  effective_date, actor_party_id, actor_role_code,
                  dcr_id, dcn_id, note)
             VALUES
                 (:c, :rev, :prev, :from, :to, :eff, :actor, :role, :dcr, :dcn, :note)",
            [
                ':c'     => $docCode,
                ':rev'   => $row['revision'],
                ':prev'  => $row['previous_revision'] ?? null,
                ':from'  => $row['from_status'] ?? null,
                ':to'    => $row['to_status'],
                ':eff'   => $row['effective_date'] ?? null,
                ':actor' => $row['actor_party_id'],
                ':role'  => $row['actor_role_code'] ?? null,
                ':dcr'   => $row['dcr_id'] ?? null,
                ':dcn'   => $row['dcn_id'] ?? null,
                ':note'  => $row['note'] ?? null,
            ]
        );
    }

    /** @param array<string, mixed> $input */
    private function validateHeaderInput(array $input): void
    {
        foreach (['doc_code', 'title', 'doc_type', 'revision', 'effective_date',
                 'owner_role_code', 'approver_role_code'] as $k) {
            if (empty($input[$k])) {
                throw new InvalidArgumentException("dcc_header_missing_$k");
            }
        }
        if (!in_array($input['doc_type'], self::VALID_DOC_TYPES, true)) {
            throw new InvalidArgumentException('dcc_header_invalid_doc_type');
        }
        $this->assertValidRevision((string)$input['revision']);
        $this->assertSingleRole('owner_role_code',    (string)$input['owner_role_code']);
        $this->assertSingleRole('approver_role_code', (string)$input['approver_role_code']);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$input['effective_date'])) {
            throw new InvalidArgumentException('dcc_header_invalid_effective_date');
        }
    }

    private function assertValidRevision(string $rev): void
    {
        if (!preg_match(self::REVISION_PATTERN, $rev)) {
            throw new InvalidArgumentException('dcc_invalid_revision_pattern');
        }
    }

    private function assertSingleRole(string $field, string $role): void
    {
        $role = trim($role);
        if ($role === '') {
            throw new InvalidArgumentException("dcc_empty_$field");
        }
        if (preg_match('#[/|,;\s]#', $role)) {
            throw new InvalidArgumentException("dcc_multi_role_forbidden:$field");
        }
    }

    private function normaliseLocale(string $locale): string
    {
        $locale = strtolower(trim($locale));
        if ($locale === '') {
            return 'en';
        }
        // Accept en, vi, en-us, en_US → normalise to first segment for DB lookup
        $locale = str_replace('_', '-', $locale);
        return $locale;
    }

    private function nextDcrNumber(): string
    {
        $y   = date('Y');
        $n   = $this->data->scalar(
            "SELECT COUNT(*) FROM dcc_document_change_request WHERE dcr_number LIKE :p",
            [':p' => "DCR-$y-%"]
        );
        return sprintf('DCR-%s-%04d', $y, ((int)$n) + 1);
    }

    private function nextDcnNumber(): string
    {
        $y = date('Y');
        $n = $this->data->scalar(
            "SELECT COUNT(*) FROM dcc_document_change_notice WHERE dcn_number LIKE :p",
            [':p' => "DCN-$y-%"]
        );
        return sprintf('DCN-%s-%04d', $y, ((int)$n) + 1);
    }
}
