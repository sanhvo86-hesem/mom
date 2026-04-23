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

    /** @var array<string, string|null> */
    private array $sourceDocumentPathCache = [];

    /** @var array<string, string|null> */
    private array $activeSourceDocumentPathCache = [];

    /** @var array<string, string> */
    private array $sourceDocumentHashCache = [];

    public function __construct(private DataLayer $data) {}

    // ── Code canonicalisation ──────────────────────────────────────────────

    /**
     * Normalise a user-entered document code.
     *
     * Historic filenames frequently bake a verbose title into the code, e.g.
     *     QMS-MAN-001-QMS-MANUAL      → QMS-MAN-001
     *     POL-QMS-001-QUALITY-POLICY  → POL-QMS-001
     *     SOP-606-QUALITY-AUDIT       → SOP-606
     *     FRM-403-SCAR                → FRM-403
     *
     * The rule is: keep the leading type-code family (upper-case, hyphen +
     * digits family matches) and drop everything after the numeric tail.
     * When the input does not match a recognised family we uppercase-trim
     * and return as-is so the user can still persist unusual codes.
     */
    public static function canonicalizeCode(string $raw): string
    {
        $clean = strtoupper(trim($raw));
        if ($clean === '') {
            return '';
        }
        // Strip any trailing extension a paste might include
        $clean = preg_replace('/\.[A-Z0-9]+$/', '', $clean) ?? $clean;

        /*
         * Use SPECIFIC patterns — same as scan_extract_code() in the filesystem
         * scanner and deriveDocCodeFromPath() in the portal. A generic greedy
         * pattern like `^(FAM-[A-Z0-9]+(?:-[A-Z0-9]+)?)` mis-parses
         * "QMS-MAN-001-QMS-MANUAL" as "QMS-MAN-001-QMS" because the first
         * character class captures "001" and the optional group captures "-QMS".
         * Numeric-tail families must stop at the first digit group.
         */
        $patterns = [
            '/^(SOP-\d{3})/',
            '/^(FRM-\d{3})/',
            '/^(WI-\d{3})/',
            '/^(ANNEX-\d{3})/',
            '/^(REF-\d{3})/',
            '/^(QMS-MAN-\d+)/',
            '/^(QMS-GDL-\d+)/',
            '/^(POL-QMS-\d+)/',
            '/^(FRM-HR-JD-[A-Z]+-\d+)/',
            '/^(FRM-HR-TRN-\d+)/',
            '/^(ANNEX-DEP-[A-Z]+-\d+)/',
            '/^(ANNEX-(?:JOB|ORG)-\d+)/',
            '/^(ANNEX-HR-LAB-\d+)/',
            '/^((?:SOP|PROC|WI|FRM|ANNEX|POL|QMS|DEPT)-[A-Z]+-\d+)/',
            '/^(JD-[A-Z0-9-]+)/',
            '/^(DEPT-[A-Z0-9-]+)/',
            '/^(RACI-[A-Z0-9-]+)/',
            '/^(AUTHORITY-[A-Z0-9-]+)/',
        ];
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $clean, $m)) {
                return strtoupper($m[1]);
            }
        }

        return $clean;
    }

    /**
     * Derive a doc_type enum value from a canonical code. Falls back to REF
     * for unrecognised prefixes so the NOT NULL constraint never trips.
     */
    public static function deriveDocType(string $canonicalCode): string
    {
        $upper = strtoupper($canonicalCode);
        if (str_starts_with($upper, 'QMS-MAN')) return 'MAN';
        if ($upper === 'POL' || str_starts_with($upper, 'POL-')) return 'POL';
        if (str_starts_with($upper, 'SOP-'))    return 'SOP';
        if (str_starts_with($upper, 'WI-'))     return 'WI';
        if (str_starts_with($upper, 'ANNEX-'))  return 'ANNEX';
        if (str_starts_with($upper, 'FRM-'))    return 'FRM';
        if (str_starts_with($upper, 'JD-'))     return 'JD';
        if (str_starts_with($upper, 'DEPT-'))   return 'DEPT';
        if (str_starts_with($upper, 'ORG-'))    return 'ORG';
        if (str_starts_with($upper, 'RACI-'))   return 'ORG';
        if (str_starts_with($upper, 'TRN'))     return 'TRN';
        if (str_starts_with($upper, 'SYS-OPS')) return 'REF';
        if (str_starts_with($upper, 'MRR'))     return 'REF';
        return 'REF';
    }

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
                ':locale_default' => $input['locale_default'] ?? 'vi',
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
     * Return the header projection merged with a locale variant when present.
     *
     * @return array<string, mixed>
     */
    public function getLocalizedHeader(string $docCode, string $locale = 'vi'): array
    {
        $header = $this->getHeader($docCode);
        return $this->applyLocaleVariant($header, $locale);
    }

    /**
     * Upsert a document header from the portal "Edit Document" dialog.
     *
     * - Canonicalises the supplied doc_code (strips redundant suffixes).
     * - Creates a new row with sane defaults if the header does not exist
     *   (doc_type derived from prefix, revision V0, today as effective_date,
     *   QA owner, CEO approver, status draft).
     * - Otherwise patches only the dialog-editable fields (title, subtitle).
     *
     * The ID normalisation happens here as well as in the frontend so the
     * database always receives a clean code regardless of the client path.
     *
     * @param array{doc_code: string, title?: string, subtitle?: string,
     *              owner_role_code?: string, approver_role_code?: string,
     *              revision?: string, effective_date?: string,
     *              doc_type?: string, iso_clause?: string,
     *              metadata?: array} $input
     * @return array{header: array<string, mixed>, canonical_code: string,
     *                raw_code: string, created: bool}
     */
    public function upsertHeader(array $input, string $actor): array
    {
        $rawCode = (string)($input['doc_code'] ?? '');
        if (trim($rawCode) === '') {
            throw new InvalidArgumentException('dcc_upsert_missing_doc_code');
        }
        $canonical = self::canonicalizeCode($rawCode);
        if ($canonical === '') {
            throw new InvalidArgumentException('dcc_upsert_invalid_doc_code');
        }

        /* Honour old_doc_code: when the portal is renaming a document, the
         * client sends both the prior canonical code and the new one. If
         * the old row exists and the new code differs, rename in place via
         * the ON UPDATE CASCADE chain (dcc_document_change_request,
         * dcc_document_change_notice, dcc_document_revision_history all
         * follow). This keeps the row count stable across edits and prevents
         * orphans like QMS-MAN-001 + QMS-MAN-0012 from piling up. */
        $oldCanonical = '';
        if (isset($input['old_doc_code']) && trim((string)$input['old_doc_code']) !== '') {
            $oldCanonical = self::canonicalizeCode((string)$input['old_doc_code']);
        }
        if ($oldCanonical !== '' && $oldCanonical !== $canonical) {
            $oldExisting = $this->data->query(
                "SELECT doc_code FROM dcc_document_header WHERE doc_code = :c LIMIT 1",
                [':c' => $oldCanonical]
            ) ?? [];
            if ($oldExisting !== []) {
                $newCollision = $this->data->query(
                    "SELECT doc_code FROM dcc_document_header WHERE doc_code = :c LIMIT 1",
                    [':c' => $canonical]
                ) ?? [];
                if ($newCollision === []) {
                    $this->data->execute(
                        "UPDATE dcc_document_header SET doc_code = :new, updated_by = :actor WHERE doc_code = :old",
                        [':new' => $canonical, ':old' => $oldCanonical, ':actor' => $actor]
                    );
                }
                // If new already exists we fall through to the patch branch below,
                // which will just update title/subtitle on the existing row and
                // leave the old row alone (cleanup is a separate operation).
            }
        }

        $existing = $this->data->query(
            "SELECT doc_code, status FROM dcc_document_header WHERE doc_code = :c LIMIT 1",
            [':c' => $canonical]
        ) ?? [];

        if ($existing !== []) {
            if ($existing[0]['status'] === 'obsolete') {
                throw new RuntimeException('dcc_document_obsolete_readonly');
            }
            $patch = array_intersect_key($input, array_flip([
                'title', 'subtitle', 'iso_clause',
                'owner_role_code', 'approver_role_code', 'metadata',
            ]));
            $header = $this->updateHeader($canonical, $patch, $actor);
            return [
                'header'         => $header,
                'canonical_code' => $canonical,
                'raw_code'       => $rawCode,
                'created'        => false,
            ];
        }

        $header = $this->createHeader([
            'doc_code'           => $canonical,
            'title'              => trim((string)($input['title'] ?? $canonical)),
            'subtitle'           => isset($input['subtitle']) ? trim((string)$input['subtitle']) : null,
            'doc_type'           => $input['doc_type'] ?? self::deriveDocType($canonical),
            'revision'           => $input['revision'] ?? 'V0',
            'effective_date'     => $input['effective_date'] ?? date('Y-m-d'),
            'owner_role_code'    => $input['owner_role_code']    ?? 'QA',
            'approver_role_code' => $input['approver_role_code'] ?? 'CEO',
            'iso_clause'         => $input['iso_clause'] ?? null,
            'status'             => 'draft',
            'metadata'           => $input['metadata'] ?? (object)[],
        ], $actor);

        return [
            'header'         => $header,
            'canonical_code' => $canonical,
            'raw_code'       => $rawCode,
            'created'        => true,
        ];
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
        return $this->listLocalizedHeaders($filters, $limit, $offset, 'vi');
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listLocalizedHeaders(array $filters = [], int $limit = 100, int $offset = 0, string $locale = 'vi'): array
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
        $sql = "SELECT doc_code, title, subtitle, doc_type, revision, effective_date,
                       owner_role_code, approver_role_code, status, updated_at
                FROM dcc_document_header
                WHERE " . implode(' AND ', $where) . "
                ORDER BY doc_code
                LIMIT $limit OFFSET $offset";
        $rows = $this->data->query($sql, $params) ?? [];
        $out = [];
        foreach ($rows as $row) {
            $out[] = $this->applyLocaleVariant($row, $locale);
        }
        return $out;
    }

    /**
     * Return one locale-variant projection for a document.
     *
     * @return array<string, mixed>
     */
    public function getLocaleVariantProjection(string $docCode, string $locale): array
    {
        $header = $this->getHeader($docCode);
        return $this->buildLocaleVariantProjection($header, $locale, $this->fetchLocaleVariantRow($docCode, $locale));
    }

    /**
     * Create or update a locale variant row.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function upsertLocaleVariant(string $docCode, string $locale, array $input, string $actor): array
    {
        $header = $this->getHeader($docCode);
        $locale = $this->normaliseLocale($locale);
        if ($locale === '' || $locale === 'vi') {
            throw new InvalidArgumentException('dcc_locale_variant_noncanonical_locale_required');
        }
        $patch = $this->normaliseLocaleVariantPatch($input);
        if ($patch === []) {
            return $this->buildLocaleVariantProjection($header, $locale, $this->fetchLocaleVariantRow($docCode, $locale));
        }

        $existing = $this->fetchLocaleVariantRow($docCode, $locale);
        if ($existing === []) {
            $columns = ['doc_code', 'locale', 'created_by', 'updated_by'];
            $values  = [':doc_code', ':locale', ':actor', ':actor'];
            $params  = [
                ':doc_code' => $docCode,
                ':locale'   => $locale,
                ':actor'    => $actor,
            ];
            foreach ($patch as $key => $value) {
                $columns[] = $key;
                $values[] = ':' . $key;
                $params[':' . $key] = $value;
            }
            $sql = 'INSERT INTO dcc_document_locale_variant (' . implode(', ', $columns) . ')
                    VALUES (' . implode(', ', $values) . ')';
            $this->data->execute($sql, $params);
        } else {
            $sets = ['updated_by = :actor'];
            $params = [
                ':doc_code' => $docCode,
                ':locale'   => $locale,
                ':actor'    => $actor,
            ];
            foreach ($patch as $key => $value) {
                if ($key === 'metadata') {
                    $sets[] = 'metadata = CAST(:metadata AS jsonb)';
                    $params[':metadata'] = $value;
                    continue;
                }
                $sets[] = $key . ' = :' . $key;
                $params[':' . $key] = $value;
            }
            $sql = 'UPDATE dcc_document_locale_variant
                    SET ' . implode(', ', $sets) . '
                    WHERE doc_code = :doc_code AND locale = :locale';
            $this->data->execute($sql, $params);
        }

        return $this->buildLocaleVariantProjection($header, $locale, $this->fetchLocaleVariantRow($docCode, $locale));
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
            return 'vi';
        }
        $locale = str_replace('_', '-', $locale);
        $parts = explode('-', $locale, 2);
        return $parts[0] !== '' ? $parts[0] : 'vi';
    }

    /** @param array<string, mixed> $header */
    private function applyLocaleVariant(array $header, string $locale): array
    {
        return $this->buildLocaleVariantProjection(
            $header,
            $locale,
            $this->fetchLocaleVariantRow((string)($header['doc_code'] ?? ''), $locale)
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchLocaleVariantRow(string $docCode, string $locale): array
    {
        $locale = $this->normaliseLocale($locale);
        if ($docCode === '' || $locale === '' || $locale === 'vi') {
            return [];
        }
        $rows = $this->data->query(
            "SELECT doc_code, locale, title, subtitle, artifact_rel_path,
                    artifact_source_revision, artifact_source_hash_sha256,
                    translation_state, translation_provider, glossary_version,
                    engine_version, reviewer_party_id, reviewed_at, published_at,
                    metadata, created_at, created_by, updated_at, updated_by
             FROM dcc_document_locale_variant
             WHERE doc_code = :c AND locale = :loc
             LIMIT 1",
            [':c' => $docCode, ':loc' => $locale]
        ) ?? [];
        return $rows[0] ?? [];
    }

    /**
     * @param array<string, mixed> $header
     * @param array<string, mixed> $variant
     * @return array<string, mixed>
     */
    private function buildLocaleVariantProjection(array $header, string $locale, array $variant): array
    {
        $locale = $this->normaliseLocale($locale);
        $exists = $variant !== [];
        $state = $exists
            ? strtolower(trim((string)($variant['translation_state'] ?? 'machine_preview')))
            : ($locale === 'vi' ? 'source' : 'missing');
        $artifactPath = $exists ? trim((string)($variant['artifact_rel_path'] ?? '')) : '';
        $renderableStates = ['machine_preview', 'review_pending', 'reviewed', 'released'];
        $sourceRevision = trim((string)($variant['artifact_source_revision'] ?? ''));
        $headerRevision = trim((string)($header['revision'] ?? ''));
        $revisionMatches = ($sourceRevision === '') || ($headerRevision !== '' && $sourceRevision === $headerRevision);
        $sourceHashMatches = $exists ? $this->sourceHashMatchesCurrentSource((string)($header['doc_code'] ?? ''), $variant) : true;
        $publishedOk = $state !== 'released' || !empty($variant['published_at']);
        $renderable = $exists
            && $locale !== 'vi'
            && $artifactPath !== ''
            && in_array($state, $renderableStates, true)
            && $revisionMatches
            && $sourceHashMatches
            && $publishedOk;
        $out = $header;
        $out['locale'] = $locale;
        $out['source_title'] = $header['title'] ?? '';
        $out['source_subtitle'] = $header['subtitle'] ?? null;
        $out['locale_variant_exists'] = $exists;
        $out['locale_renderable'] = $renderable;
        $out['is_locale_fallback'] = ($locale === 'vi') ? false : !$renderable;
        $out['translation_state'] = $state;
        $out['artifact_rel_path'] = $renderable ? $artifactPath : null;
        $out['artifact_source_revision'] = $exists ? ($variant['artifact_source_revision'] ?? null) : null;
        $out['artifact_source_hash_sha256'] = $exists ? ($variant['artifact_source_hash_sha256'] ?? null) : null;
        $out['translation_provider'] = $exists ? ($variant['translation_provider'] ?? null) : null;
        $out['glossary_version'] = $exists ? ($variant['glossary_version'] ?? null) : null;
        $out['engine_version'] = $exists ? ($variant['engine_version'] ?? null) : null;
        $out['reviewer_party_id'] = $exists ? ($variant['reviewer_party_id'] ?? null) : null;
        $out['reviewed_at'] = $exists ? ($variant['reviewed_at'] ?? null) : null;
        $out['published_at'] = $renderable ? ($variant['published_at'] ?? null) : null;
        $out['locale_metadata'] = $exists ? ($variant['metadata'] ?? []) : [];
        $out['locale_revision_matches_source'] = $exists ? $revisionMatches : true;
        $out['locale_source_hash_matches'] = $exists ? $sourceHashMatches : true;

        if ($renderable) {
            if (array_key_exists('title', $variant) && trim((string)$variant['title']) !== '') {
                $out['title'] = trim((string)$variant['title']);
            }
            if (array_key_exists('subtitle', $variant)) {
                $subtitle = $variant['subtitle'];
                $out['subtitle'] = ($subtitle === null || trim((string)$subtitle) === '')
                    ? null
                    : trim((string)$subtitle);
            }
        }

        return $out;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normaliseLocaleVariantPatch(array $input): array
    {
        $allowed = [
            'title',
            'subtitle',
            'artifact_rel_path',
            'artifact_source_revision',
            'artifact_source_hash_sha256',
            'translation_state',
            'translation_provider',
            'glossary_version',
            'engine_version',
            'reviewer_party_id',
            'reviewed_at',
            'published_at',
            'metadata',
        ];

        $patch = [];
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $input)) {
                continue;
            }
            $value = $input[$key];
            if ($key === 'metadata') {
                $patch['metadata'] = json_encode($value ?? (object)[], JSON_UNESCAPED_UNICODE);
                continue;
            }
            if ($key === 'artifact_rel_path') {
                $patch[$key] = $this->normaliseArtifactRelativePath($value);
                continue;
            }
            if ($key === 'translation_state') {
                $state = strtolower(trim((string)$value));
                $valid = ['machine_preview', 'review_pending', 'reviewed', 'released', 'superseded', 'blocked'];
                if (!in_array($state, $valid, true)) {
                    throw new InvalidArgumentException('dcc_locale_variant_invalid_state');
                }
                $patch[$key] = $state;
                continue;
            }
            if ($value === null) {
                $patch[$key] = null;
                continue;
            }
            $patch[$key] = trim((string)$value);
        }

        return $patch;
    }

    private function normaliseArtifactRelativePath(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $path = str_replace('\\', '/', trim((string)$value));
        $path = ltrim($path, '/');
        if ($path === '') {
            return null;
        }
        if (str_contains($path, '..')) {
            throw new InvalidArgumentException('dcc_locale_variant_invalid_artifact_path');
        }
        if (!preg_match('/\.(html?|pdf|docx|xlsx|pptx)$/i', $path)) {
            throw new InvalidArgumentException('dcc_locale_variant_invalid_artifact_extension');
        }
        return $path;
    }

    /**
     * @param array<string, mixed> $variant
     */
    private function sourceHashMatchesCurrentSource(string $docCode, array $variant): bool
    {
        $expected = strtolower(trim((string)($variant['artifact_source_hash_sha256'] ?? '')));
        if ($expected === '') {
            return false;
        }
        $current = $this->sourceDocumentHashFor($docCode);
        if ($current === '') {
            return false;
        }
        return hash_equals($expected, $current);
    }

    private function sourceDocumentHashFor(string $docCode): string
    {
        $canonical = self::canonicalizeCode($docCode);
        if ($canonical === '') {
            return '';
        }
        if (array_key_exists($canonical, $this->sourceDocumentHashCache)) {
            return $this->sourceDocumentHashCache[$canonical];
        }
        $path = $this->activeSourceDocumentPathFor($canonical);
        if ($path === null || $path === '' || !is_file($path)) {
            $this->sourceDocumentHashCache[$canonical] = '';
            return '';
        }
        $normalized = $this->normalisedDocumentHashFromFile($path);
        $this->sourceDocumentHashCache[$canonical] = $normalized;
        return $normalized;
    }

    private function activeSourceDocumentPathFor(string $docCode): ?string
    {
        $canonical = self::canonicalizeCode($docCode);
        if ($canonical === '') {
            return null;
        }
        if (array_key_exists($canonical, $this->activeSourceDocumentPathCache)) {
            return $this->activeSourceDocumentPathCache[$canonical];
        }

        $livePath = $this->sourceDocumentPathFor($canonical);
        if ($livePath === null || $livePath === '') {
            $this->activeSourceDocumentPathCache[$canonical] = null;
            return null;
        }

        $rootDir = dirname(__DIR__, 4);
        $baseRel = $this->relativeRepoPath($livePath, $rootDir);
        if ($baseRel === null || !function_exists('load_doc_state') || !function_exists('load_doc_manifest')) {
            $this->activeSourceDocumentPathCache[$canonical] = $livePath;
            return $livePath;
        }

        $state = \load_doc_state($rootDir, $baseRel, $rootDir . '/archive', $canonical) ?? [];
        $status = strtolower(trim((string)($state['status'] ?? '')));
        if (!in_array($status, ['draft', 'in_review'], true)) {
            $this->activeSourceDocumentPathCache[$canonical] = $livePath;
            return $livePath;
        }

        $revision = strtolower(ltrim(trim((string)($state['revision'] ?? '')), 'vV'));
        $manifest = \load_doc_manifest($rootDir, $baseRel, $rootDir . '/archive', $canonical);
        $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];

        foreach ($versions as $row) {
            if (!is_array($row)) {
                continue;
            }
            $rowStatus = strtolower(trim((string)($row['status'] ?? '')));
            if (!in_array($rowStatus, ['draft', 'in_review'], true)) {
                continue;
            }
            $rowRevision = strtolower(ltrim(trim((string)($row['version'] ?? '')), 'vV'));
            if ($revision !== '' && $rowRevision !== '' && $rowRevision !== $revision) {
                continue;
            }
            $fileRel = trim((string)($row['file'] ?? ''));
            if ($fileRel === '') {
                continue;
            }
            $fileRel = ltrim(str_replace('\\', '/', $fileRel), '/');
            if ($fileRel === '' || str_contains($fileRel, '..')) {
                continue;
            }
            $candidate = $rootDir . '/' . $fileRel;
            if (is_file($candidate)) {
                $normalized = str_replace('\\', '/', $candidate);
                $this->activeSourceDocumentPathCache[$canonical] = $normalized;
                return $normalized;
            }
        }

        $this->activeSourceDocumentPathCache[$canonical] = $livePath;
        return $livePath;
    }

    private function sourceDocumentPathFor(string $docCode): ?string
    {
        $canonical = self::canonicalizeCode($docCode);
        if ($canonical === '') {
            return null;
        }
        if (array_key_exists($canonical, $this->sourceDocumentPathCache)) {
            return $this->sourceDocumentPathCache[$canonical];
        }
        $docsRoot = dirname(__DIR__, 3) . '/docs';
        $scanRoots = [
            $docsRoot . '/system',
            $docsRoot . '/operations',
            $docsRoot . '/forms',
            $docsRoot . '/training',
        ];
        foreach ($scanRoots as $root) {
            if (!is_dir($root)) {
                continue;
            }
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY,
                \RecursiveIteratorIterator::CATCH_GET_CHILD
            );
            foreach ($iterator as $file) {
                if (!$file instanceof \SplFileInfo || !$file->isFile()) {
                    continue;
                }
                $filename = (string)$file->getFilename();
                if (strtolower(pathinfo($filename, PATHINFO_EXTENSION)) !== 'html') {
                    continue;
                }
                if (str_starts_with($filename, '_')) {
                    continue;
                }
                $normalizedPath = str_replace('\\', '/', (string)$file->getPathname());
                if (str_contains($normalizedPath, '/_Archive/')) {
                    continue;
                }
                $candidate = self::canonicalizeCode((string)pathinfo($filename, PATHINFO_FILENAME));
                if ($candidate !== $canonical) {
                    continue;
                }
                $this->sourceDocumentPathCache[$canonical] = $normalizedPath;
                return $normalizedPath;
            }
        }
        $this->sourceDocumentPathCache[$canonical] = null;
        return null;
    }

    private function relativeRepoPath(string $absolutePath, string $rootDir): ?string
    {
        $normalizedPath = str_replace('\\', '/', $absolutePath);
        $normalizedRoot = rtrim(str_replace('\\', '/', $rootDir), '/');
        $prefix = $normalizedRoot . '/';
        if (!str_starts_with($normalizedPath, $prefix)) {
            return null;
        }
        return substr($normalizedPath, strlen($prefix));
    }

    private function normalisedDocumentHashFromFile(string $absolutePath): string
    {
        $html = @file_get_contents($absolutePath);
        if (!is_string($html) || $html === '') {
            return '';
        }
        $normalized = function_exists('strip_base_href_archive')
            ? (string)\strip_base_href_archive($html)
            : $html;
        $normalized = trim(str_replace("\r\n", "\n", $normalized));
        return strtolower(hash('sha256', $normalized));
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
