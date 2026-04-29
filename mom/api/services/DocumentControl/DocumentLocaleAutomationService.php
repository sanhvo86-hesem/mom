<?php

declare(strict_types=1);

namespace MOM\Services\DocumentControl;

use InvalidArgumentException;
use MOM\Database\DataLayer;
use RuntimeException;
use Throwable;

/**
 * Automates non-authoritative locale artifact generation for controlled docs.
 *
 * Vietnamese remains the only editable source. This service either:
 *   • generates a machine-preview English artifact via a configured INTERNAL
 *     command provider, or
 *   • truthfully records a blocked locale state when no compliant provider is
 *     configured.
 *
 * It must never fake an English publication by mutating browser DOM or by
 * sending document content to an undeclared external translation surface.
 */
final class DocumentLocaleAutomationService
{
    private const TARGET_LOCALE = 'en';
    private const DRIVER_COMMAND = 'command';
    private const DEFAULT_COMMAND_TIMEOUT_SECONDS = 1800;
    private const COMMAND_IO_POLL_MICROSECONDS = 200000;
    private const MAX_COMMAND_OUTPUT_BYTES = 33554432;
    private const MAX_COMMAND_MESSAGE_BYTES = 4096;
    private const LOCALE_QUALITY_GATE_VERSION = 'locale_quality_gate_v4_tiered';
    private const LOCALE_RESIDUE_VN_CHAR_ABSOLUTE_LIMIT = 60;
    private const LOCALE_RESIDUE_VN_CHAR_FRACTION_LIMIT = 0.005;
    private const LOCALE_RESIDUE_TERM_CRITICAL_THRESHOLD = 3;
    private const LOCALE_LITERAL_LEAK_TOLERANT_PATTERN
        = '/_{1,3}\s*DCC[\W_]*LITERAL[\W_]*\d+\s*_{0,3}/iu';
    private const RESIDUAL_VIETNAMESE_TERMS = [
        'đánh giá',
        'nội bộ',
        'lô',
        'mẫu',
        'phạm vi',
        'phải',
        'đúng',
        'thiếu',
        'không',
        'hồ sơ',
        'bằng chứng',
        'quyền dùng',
        'quyền dừng',
        'phát hành',
        'giao hàng',
        'một phần',
        'gá',
        'hóa',
        'phó',
    ];
    private const ASCII_RESIDUAL_VIETNAMESE_TERMS = [
        'danh gia',
        'noi bo',
        'phat hanh',
        'giao hang',
        'quyen dung',
        'ho so',
        'bang chung',
        'kiem soat',
        'ap dung khi',
        'dung khi',
        'muc dich',
        'pham vi',
        'khong',
        'phai',
        'thieu',
        'dung',
        'mau',
        'lo',
        'ga',
    ];
    private const QUALITY_REPEAT_PATTERNS = [
        '/\b([\p{L}]{2,})(?:\s+\1\b){3,}/iu',
        '/\bhóa(?:\s+hóa){1,}\b/iu',
        '/\bphó(?:\s+phó){1,}\b/iu',
        '/\bRe(?:\s+Re){1,}\b/u',
        '/\bAc(?:\s+Ac){1,}\b/u',
        '/\bdiscovery(?:\s+discovery){1,}\b/iu',
        '/\bdetection(?:\s+detection){1,}\b/iu',
        '/\breject(?:\s+reject){1,}\b/iu',
    ];
    private const MACHINE_ARTIFACT_NOISE_PATTERNS = [
        '/\bDatum\s+The\s+ink\s+applies\b/iu',
        '/\bAPPLEY\s+KHI\b/iu',
        '/\bprinciple\s+Force\b/iu',
        '/\bform\s+Force\b/iu',
        '/\bdocument\s+Executive\b/iu',
        '/\bRoom\s+goal\b/iu',
        '/\bRussian\s+decision\b/iu',
        '/\bNGUY\s+SMTP\s+CAO\b/iu',
        '/\b(?:occipital|obituation|obituary|refalested|satamot|suffier|sufiy|strutage)\b/iu',
        '/\bappr\s+Ovalpath\b/iu',
    ];

    public function __construct(
        private DataLayer $data,
        private string $rootDir,
    ) {
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function syncEnglishMachinePreview(array $input): array
    {
        $docCode = DocumentControlService::canonicalizeCode((string)($input['doc_code'] ?? ''));
        if ($docCode === '') {
            throw new InvalidArgumentException('dcc_locale_automation_missing_doc_code');
        }

        $baseRel = $this->normalizeRepoRelativePath((string)($input['base_rel_path'] ?? ''));
        if ($baseRel === '') {
            throw new InvalidArgumentException('dcc_locale_automation_missing_base_rel_path');
        }

        $sourceHtml = (string)($input['source_html'] ?? '');
        if (trim($sourceHtml) === '') {
            throw new InvalidArgumentException('dcc_locale_automation_missing_source_html');
        }

        $actor = trim((string)($input['actor'] ?? ''));
        if ($actor === '') {
            $actor = 'system';
        }

        $trigger = $this->normalizeTrigger((string)($input['trigger'] ?? 'manual'));
        $sourceStatus = $this->normaliseSourceStatus((string)($input['source_status'] ?? 'draft'));
        $sourceRevision = $this->normaliseRevision((string)($input['revision'] ?? '0.0'));
        $dccRevision = $this->toDccRevision($sourceRevision);
        $workingPreview = in_array($sourceStatus, ['draft', 'in_review'], true);
        $existingVariant = $this->fetchLocaleVariant($docCode, self::TARGET_LOCALE);
        $releasedSnapshot = $workingPreview ? $this->releasedSnapshotFrom($existingVariant) : null;

        $catalog = $this->resolveCatalogMetadata($docCode, $baseRel);
        $title = trim((string)($input['title'] ?? ($catalog['title'] ?? '')));
        if ($title === '') {
            $title = $docCode;
        }
        $subtitle = $this->nullableText($input['subtitle'] ?? ($catalog['description'] ?? null));
        $effectiveDate = $this->normaliseIsoDate($input['effective_date'] ?? ($catalog['effective_date'] ?? null))
            ?? gmdate('Y-m-d');

        $normalizedSourceHtml = $this->normalizeSourceHtml($sourceHtml);
        $sourceHash = strtolower(hash('sha256', $normalizedSourceHtml));
        $artifactRelPath = $this->hiddenSiblingArtifactPath(
            $baseRel,
            self::TARGET_LOCALE,
            $workingPreview ? $sourceRevision : null
        );
        $defaultState = in_array($trigger, ['submit_review', 'approve_release'], true)
            ? 'review_pending'
            : 'machine_preview';
        $dcc = new DocumentControlService($this->data);

        $this->syncHeaderBaseline([
            'doc_code' => $docCode,
            'title' => $title,
            'subtitle' => $subtitle,
            'revision' => $dccRevision,
            'effective_date' => $effectiveDate,
            'status' => $sourceStatus,
        ], $actor);

        $reused = $this->restoreCurrentSourceArtifactIfAvailable(
            $dcc,
            $docCode,
            $actor,
            $title,
            $subtitle,
            $dccRevision,
            $sourceHash,
            $artifactRelPath,
            $existingVariant,
            $defaultState,
            [
                'auto_sync' => true,
                'target_locale' => self::TARGET_LOCALE,
                'trigger' => $trigger,
                'source_status' => $sourceStatus,
                'source_revision' => $sourceRevision,
                'dcc_revision' => $dccRevision,
                'source_base_rel_path' => $baseRel,
                'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
            ]
        );
        if ($reused !== null) {
            return $reused;
        }

        $attempt = $this->runConfiguredProvider([
            'doc_code' => $docCode,
            'source_locale' => 'vi',
            'target_locale' => self::TARGET_LOCALE,
            'trigger' => $trigger,
            'source_status' => $sourceStatus,
            'source_revision' => $sourceRevision,
            'dcc_revision' => $dccRevision,
            'base_rel_path' => $baseRel,
            'artifact_rel_path' => $artifactRelPath,
            'title' => $title,
            'subtitle' => $subtitle,
            'source_html' => $normalizedSourceHtml,
            'glossary_path' => $this->glossaryPath(),
        ]);

        if (!$attempt['ok']) {
            $restored = $this->restoreCurrentSourceArtifactIfAvailable(
                $dcc,
                $docCode,
                $actor,
                $title,
                $subtitle,
                $dccRevision,
                $sourceHash,
                $artifactRelPath,
                $existingVariant,
                $defaultState,
                [
                    'auto_sync' => true,
                    'target_locale' => self::TARGET_LOCALE,
                    'trigger' => $trigger,
                    'source_status' => $sourceStatus,
                    'source_revision' => $sourceRevision,
                    'dcc_revision' => $dccRevision,
                    'source_base_rel_path' => $baseRel,
                    'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
                    'restored_after_provider_failure_at' => gmdate(DATE_ATOM),
                    'provider_failure_reason' => (string)($attempt['reason'] ?? 'translation_provider_failed'),
                ]
            );
            if ($restored !== null) {
                return $restored;
            }

            $this->deleteArtifactIfExists($artifactRelPath);
            $metadata = [
                'auto_sync' => true,
                'target_locale' => self::TARGET_LOCALE,
                'trigger' => $trigger,
                'source_status' => $sourceStatus,
                'source_revision' => $sourceRevision,
                'dcc_revision' => $dccRevision,
                'source_base_rel_path' => $baseRel,
                'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
                'blocked_reason' => (string)($attempt['reason'] ?? 'translation_provider_not_configured'),
                'blocked_message' => (string)($attempt['message'] ?? 'No compliant internal translation provider is configured.'),
                'last_attempt_at' => gmdate(DATE_ATOM),
            ];
            if (isset($attempt['quality_issues']) && is_array($attempt['quality_issues'])) {
                $metadata['quality_gate_version'] = self::LOCALE_QUALITY_GATE_VERSION;
                $metadata['quality_issues'] = array_values(array_map('strval', $attempt['quality_issues']));
            }
            if ($releasedSnapshot !== null) {
                $metadata['released_snapshot'] = $releasedSnapshot;
            }
            $variant = $dcc->upsertLocaleVariant($docCode, self::TARGET_LOCALE, [
                'title' => $title,
                'subtitle' => null,
                'artifact_rel_path' => null,
                'artifact_source_revision' => $dccRevision,
                'artifact_source_hash_sha256' => $sourceHash,
                'translation_state' => 'blocked',
                'translation_provider' => (string)($attempt['provider'] ?? 'unconfigured'),
                'glossary_version' => (string)($attempt['glossary_version'] ?? $this->glossaryVersion()),
                'engine_version' => (string)($attempt['engine_version'] ?? 'unconfigured'),
                'published_at' => null,
                'metadata' => $metadata,
            ], $actor);

            return [
                'ok' => false,
                'doc_code' => $docCode,
                'translation_state' => 'blocked',
                'artifact_rel_path' => null,
                'locale_variant' => $variant,
                'reason' => (string)($attempt['reason'] ?? 'translation_provider_not_configured'),
                'message' => (string)($attempt['message'] ?? 'English auto-translation is blocked until an internal provider is configured.'),
            ];
        }

        $artifactHtml = $this->normalizeArtifactHtml((string)($attempt['html'] ?? ''));
        if ($artifactHtml === '') {
            throw new RuntimeException('dcc_locale_automation_empty_artifact_html');
        }
        $artifactTitle = $this->nullableText($attempt['title'] ?? null) ?? $title;
        $artifactSubtitle = $this->nullableText($attempt['subtitle'] ?? null) ?? $subtitle;
        $artifactHtml = $this->injectDccBootstrapMetadata(
            $artifactHtml,
            $this->buildArtifactBootstrapHeader($dcc, $docCode, $artifactTitle, $artifactSubtitle)
        );
        $qualityClassification = self::classifyLocaleArtifactQualityIssues($artifactHtml);
        $qualityIssues = $qualityClassification['critical'];
        $qualityAdvisory = $qualityClassification['advisory'];
        $providerAdvisory = isset($attempt['quality_advisory']) && is_array($attempt['quality_advisory'])
            ? array_values(array_map('strval', $attempt['quality_advisory']))
            : [];
        $qualityAdvisory = array_values(array_unique(array_merge($qualityAdvisory, $providerAdvisory)));
        if ($qualityIssues !== []) {
            $this->deleteArtifactIfExists($artifactRelPath);
            $metadata = [
                'auto_sync' => true,
                'target_locale' => self::TARGET_LOCALE,
                'trigger' => $trigger,
                'source_status' => $sourceStatus,
                'source_revision' => $sourceRevision,
                'dcc_revision' => $dccRevision,
                'source_base_rel_path' => $baseRel,
                'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
                'blocked_reason' => 'translation_quality_gate_failed',
                'blocked_message' => 'Generated English artifact failed locale quality checks.',
                'quality_gate_version' => self::LOCALE_QUALITY_GATE_VERSION,
                'quality_issues' => $qualityIssues,
                'last_attempt_at' => gmdate(DATE_ATOM),
            ];
            if ($releasedSnapshot !== null) {
                $metadata['released_snapshot'] = $releasedSnapshot;
            }
            $variant = $dcc->upsertLocaleVariant($docCode, self::TARGET_LOCALE, [
                'title' => $artifactTitle,
                'subtitle' => null,
                'artifact_rel_path' => null,
                'artifact_source_revision' => $dccRevision,
                'artifact_source_hash_sha256' => $sourceHash,
                'translation_state' => 'blocked',
                'translation_provider' => (string)($attempt['provider'] ?? 'configured_command'),
                'glossary_version' => (string)($attempt['glossary_version'] ?? $this->glossaryVersion()),
                'engine_version' => (string)($attempt['engine_version'] ?? 'quality_gate_failed'),
                'published_at' => null,
                'metadata' => $metadata,
            ], $actor);

            return [
                'ok' => false,
                'doc_code' => $docCode,
                'translation_state' => 'blocked',
                'artifact_rel_path' => null,
                'locale_variant' => $variant,
                'reason' => 'translation_quality_gate_failed',
                'message' => 'Generated English artifact failed locale quality checks.',
                'quality_issues' => $qualityIssues,
            ];
        }

        $this->writeArtifact($artifactRelPath, $artifactHtml);
        $cacheMetadata = [];
        try {
            if ($this->writeRuntimeArtifactCache($docCode, self::TARGET_LOCALE, $sourceHash, $artifactHtml)) {
                $cacheMetadata['runtime_cache_written_at'] = gmdate(DATE_ATOM);
            } else {
                $cacheMetadata['runtime_cache_write_failed'] = true;
            }
        } catch (Throwable $cacheError) {
            @error_log('[DCC locale automation] runtime cache write failed for ' . $docCode . ': ' . $cacheError->getMessage());
            $cacheMetadata['runtime_cache_write_failed'] = true;
            $cacheMetadata['runtime_cache_error'] = $cacheError->getMessage();
        }

        $state = $this->normaliseVariantState(
            (string)($attempt['translation_state'] ?? $defaultState),
            $defaultState
        );
        $metadata = [
            'auto_sync' => true,
            'target_locale' => self::TARGET_LOCALE,
            'trigger' => $trigger,
            'source_status' => $sourceStatus,
            'source_revision' => $sourceRevision,
            'dcc_revision' => $dccRevision,
            'source_base_rel_path' => $baseRel,
            'artifact_strategy' => $workingPreview
                ? 'hidden_sibling_locale_artifact_revision_preview'
                : 'hidden_sibling_locale_artifact',
            'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
            'last_generated_at' => gmdate(DATE_ATOM),
        ];
        $metadata = array_merge($metadata, $cacheMetadata);
        if ($releasedSnapshot !== null) {
            $metadata['released_snapshot'] = $releasedSnapshot;
        }
        if ($qualityAdvisory !== []) {
            $metadata['quality_advisory'] = $qualityAdvisory;
            $metadata['quality_gate_version'] = self::LOCALE_QUALITY_GATE_VERSION;
        }

        $variant = $dcc->upsertLocaleVariant($docCode, self::TARGET_LOCALE, [
            'title' => $this->nullableText($attempt['title'] ?? $title),
            'subtitle' => $this->nullableText($attempt['subtitle'] ?? $subtitle),
            'artifact_rel_path' => $artifactRelPath,
            'artifact_source_revision' => $dccRevision,
            'artifact_source_hash_sha256' => $sourceHash,
            'translation_state' => $state,
            'translation_provider' => (string)($attempt['provider'] ?? 'configured_command'),
            'glossary_version' => (string)($attempt['glossary_version'] ?? $this->glossaryVersion()),
            'engine_version' => (string)($attempt['engine_version'] ?? 'command'),
            'published_at' => $state === 'released' ? gmdate(DATE_ATOM) : null,
            'metadata' => $metadata,
        ], $actor);

        return [
            'ok' => true,
            'doc_code' => $docCode,
            'translation_state' => $state,
            'artifact_rel_path' => $artifactRelPath,
            'locale_variant' => $variant,
        ];
    }

    /**
     * Queue English locale generation without blocking the caller on heavy MT runtime.
     *
     * Vietnamese remains the only editable source; this method records honest
     * locale state in DB immediately, then dispatches a background worker to
     * build/update the derived English artifact.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function scheduleEnglishMachinePreview(array $input): array
    {
        $docCode = DocumentControlService::canonicalizeCode((string)($input['doc_code'] ?? ''));
        if ($docCode === '') {
            throw new InvalidArgumentException('dcc_locale_automation_missing_doc_code');
        }

        $baseRel = $this->normalizeRepoRelativePath((string)($input['base_rel_path'] ?? ''));
        if ($baseRel === '') {
            throw new InvalidArgumentException('dcc_locale_automation_missing_base_rel_path');
        }

        $sourceHtml = (string)($input['source_html'] ?? '');
        if (trim($sourceHtml) === '') {
            throw new InvalidArgumentException('dcc_locale_automation_missing_source_html');
        }

        $actor = trim((string)($input['actor'] ?? ''));
        if ($actor === '') {
            $actor = 'system';
        }

        $trigger = $this->normalizeTrigger((string)($input['trigger'] ?? 'manual'));
        $sourceStatus = $this->normaliseSourceStatus((string)($input['source_status'] ?? 'draft'));
        $sourceRevision = $this->normaliseRevision((string)($input['revision'] ?? '0.0'));
        $dccRevision = $this->toDccRevision($sourceRevision);
        $workingPreview = in_array($sourceStatus, ['draft', 'in_review'], true);
        $existingVariant = $this->fetchLocaleVariant($docCode, self::TARGET_LOCALE);
        $releasedSnapshot = $workingPreview ? $this->releasedSnapshotFrom($existingVariant) : null;
        $catalog = $this->resolveCatalogMetadata($docCode, $baseRel);
        $title = trim((string)($input['title'] ?? ($catalog['title'] ?? '')));
        if ($title === '') {
            $title = $docCode;
        }
        $subtitle = $this->nullableText($input['subtitle'] ?? ($catalog['description'] ?? null));
        $effectiveDate = $this->normaliseIsoDate($input['effective_date'] ?? ($catalog['effective_date'] ?? null))
            ?? gmdate('Y-m-d');
        $normalizedSourceHtml = $this->normalizeSourceHtml($sourceHtml);
        $sourceHash = strtolower(hash('sha256', $normalizedSourceHtml));
        $spawnWorker = $input['spawn_worker'] ?? true;
        if (!is_bool($spawnWorker)) {
            $parsedSpawnWorker = filter_var($spawnWorker, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $spawnWorker = $parsedSpawnWorker ?? true;
        }
        $artifactRelPath = $this->hiddenSiblingArtifactPath(
            $baseRel,
            self::TARGET_LOCALE,
            $workingPreview ? $sourceRevision : null
        );
        $defaultState = in_array($trigger, ['submit_review', 'approve_release'], true)
            ? 'review_pending'
            : 'machine_preview';
        $dcc = new DocumentControlService($this->data);

        $this->syncHeaderBaseline([
            'doc_code' => $docCode,
            'title' => $title,
            'subtitle' => $subtitle,
            'revision' => $dccRevision,
            'effective_date' => $effectiveDate,
            'status' => $sourceStatus,
        ], $actor);

        $reused = $this->restoreCurrentSourceArtifactIfAvailable(
            $dcc,
            $docCode,
            $actor,
            $title,
            $subtitle,
            $dccRevision,
            $sourceHash,
            $artifactRelPath,
            $existingVariant,
            $defaultState,
            [
                'auto_sync' => true,
                'target_locale' => self::TARGET_LOCALE,
                'trigger' => $trigger,
                'source_status' => $sourceStatus,
                'source_revision' => $sourceRevision,
                'dcc_revision' => $dccRevision,
                'source_base_rel_path' => $baseRel,
                'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
            ]
        );
        if ($reused !== null) {
            $reused['queued'] = false;
            return $reused;
        }

        $provider = $this->configuredProviderStatus();
        if (!$provider['ok']) {
            $metadata = [
                'auto_sync' => true,
                'target_locale' => self::TARGET_LOCALE,
                'trigger' => $trigger,
                'source_status' => $sourceStatus,
                'source_revision' => $sourceRevision,
                'dcc_revision' => $dccRevision,
                'source_base_rel_path' => $baseRel,
                'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
                'blocked_reason' => (string)($provider['reason'] ?? 'translation_provider_not_configured'),
                'blocked_message' => (string)($provider['message'] ?? 'No compliant internal translation provider is configured.'),
                'last_attempt_at' => gmdate(DATE_ATOM),
            ];
            if ($releasedSnapshot !== null) {
                $metadata['released_snapshot'] = $releasedSnapshot;
            }
            $variant = $dcc->upsertLocaleVariant($docCode, self::TARGET_LOCALE, [
                'title' => $title,
                'subtitle' => null,
                'artifact_rel_path' => null,
                'artifact_source_revision' => $dccRevision,
                'artifact_source_hash_sha256' => $sourceHash,
                'translation_state' => 'blocked',
                'translation_provider' => (string)($provider['provider'] ?? 'unconfigured'),
                'glossary_version' => (string)($provider['glossary_version'] ?? $this->glossaryVersion()),
                'engine_version' => (string)($provider['engine_version'] ?? 'unconfigured'),
                'published_at' => null,
                'metadata' => $metadata,
            ], $actor);

            return [
                'ok' => false,
                'doc_code' => $docCode,
                'translation_state' => 'blocked',
                'artifact_rel_path' => null,
                'locale_variant' => $variant,
                'reason' => (string)($provider['reason'] ?? 'translation_provider_not_configured'),
                'message' => (string)($provider['message'] ?? 'English auto-translation is blocked until an internal provider is configured.'),
            ];
        }

        $jobPayload = [
            'doc_code' => $docCode,
            'base_rel_path' => $baseRel,
            'source_html' => $normalizedSourceHtml,
            'source_status' => $sourceStatus,
            'revision' => $sourceRevision,
            'trigger' => $trigger,
            'actor' => $actor,
            'title' => $title,
            'subtitle' => $subtitle,
            'effective_date' => $effectiveDate,
        ];
        $jobPath = $this->writeQueuedTranslationJob($docCode, self::TARGET_LOCALE, $sourceHash, $jobPayload);
        $spawned = $spawnWorker ? $this->spawnQueuedTranslationWorker($jobPath) : false;
        if ($spawnWorker && !$spawned) {
            $metadata = [
                'auto_sync' => true,
                'target_locale' => self::TARGET_LOCALE,
                'trigger' => $trigger,
                'source_status' => $sourceStatus,
                'source_revision' => $sourceRevision,
                'dcc_revision' => $dccRevision,
                'source_base_rel_path' => $baseRel,
                'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
                'blocked_reason' => 'translation_worker_spawn_failed',
                'blocked_message' => 'Background translation worker could not be started.',
                'last_attempt_at' => gmdate(DATE_ATOM),
                'queue_job_path' => $this->relativeToRoot($jobPath),
            ];
            if ($releasedSnapshot !== null) {
                $metadata['released_snapshot'] = $releasedSnapshot;
            }
            $variant = $dcc->upsertLocaleVariant($docCode, self::TARGET_LOCALE, [
                'title' => $title,
                'subtitle' => $subtitle,
                'artifact_rel_path' => null,
                'artifact_source_revision' => $dccRevision,
                'artifact_source_hash_sha256' => $sourceHash,
                'translation_state' => 'blocked',
                'translation_provider' => (string)($provider['provider'] ?? 'command'),
                'glossary_version' => (string)($provider['glossary_version'] ?? $this->glossaryVersion()),
                'engine_version' => 'worker_spawn_failed',
                'published_at' => null,
                'metadata' => $metadata,
            ], $actor);

            return [
                'ok' => false,
                'doc_code' => $docCode,
                'translation_state' => 'blocked',
                'artifact_rel_path' => null,
                'locale_variant' => $variant,
                'reason' => 'translation_worker_spawn_failed',
                'message' => 'English auto-translation worker could not be started.',
            ];
        }

        $metadata = [
            'auto_sync' => true,
            'target_locale' => self::TARGET_LOCALE,
            'trigger' => $trigger,
            'source_status' => $sourceStatus,
            'source_revision' => $sourceRevision,
            'dcc_revision' => $dccRevision,
            'source_base_rel_path' => $baseRel,
            'artifact_scope' => $workingPreview ? 'working_preview' : 'current_revision',
            'queued_at' => gmdate(DATE_ATOM),
            'queue_job_path' => $this->relativeToRoot($jobPath),
            'queue_spawned' => $spawned,
        ];
        if (!$spawnWorker) {
            $metadata['queue_spawn_deferred'] = true;
        }
        if ($releasedSnapshot !== null) {
            $metadata['released_snapshot'] = $releasedSnapshot;
        }

        $variant = $dcc->upsertLocaleVariant($docCode, self::TARGET_LOCALE, [
            'title' => $title,
            'subtitle' => $subtitle,
            'artifact_rel_path' => null,
            'artifact_source_revision' => $dccRevision,
            'artifact_source_hash_sha256' => $sourceHash,
            'translation_state' => $defaultState,
            'translation_provider' => (string)($provider['provider'] ?? 'command'),
            'glossary_version' => (string)($provider['glossary_version'] ?? $this->glossaryVersion()),
            'engine_version' => 'queued_background_worker',
            'published_at' => null,
            'metadata' => $metadata,
        ], $actor);

        return [
            'ok' => true,
            'doc_code' => $docCode,
            'translation_state' => $defaultState,
            'artifact_rel_path' => null,
            'locale_variant' => $variant,
            'queued' => true,
            'queue_spawned' => $spawned,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function restoreReleasedSnapshot(string $docCode, string $actor): array
    {
        $docCode = DocumentControlService::canonicalizeCode($docCode);
        if ($docCode === '') {
            throw new InvalidArgumentException('dcc_locale_restore_missing_doc_code');
        }

        $actor = trim($actor) !== '' ? trim($actor) : 'system';
        $existing = $this->fetchLocaleVariant($docCode, self::TARGET_LOCALE);
        $snapshot = $this->releasedSnapshotFrom($existing);
        if ($snapshot === null) {
            return ['ok' => false, 'restored' => false, 'reason' => 'released_snapshot_missing'];
        }

        $snapshotPath = $this->normalizeRepoRelativePath((string)($snapshot['artifact_rel_path'] ?? ''));
        if ($snapshotPath === '' || !is_file($this->rootDir . '/' . $snapshotPath)) {
            return ['ok' => false, 'restored' => false, 'reason' => 'released_snapshot_artifact_missing'];
        }

        $currentPath = $this->normalizeRepoRelativePath((string)($existing['artifact_rel_path'] ?? ''));
        if ($currentPath !== '' && $currentPath !== $snapshotPath) {
            $this->deleteArtifactIfExists($currentPath);
        }

        $metadata = $this->normalizeVariantMetadata($existing['metadata'] ?? []);
        unset($metadata['released_snapshot']);
        $metadata['restored_from_released_snapshot_at'] = gmdate(DATE_ATOM);

        $dcc = new DocumentControlService($this->data);
        $variant = $dcc->upsertLocaleVariant($docCode, self::TARGET_LOCALE, [
            'title' => $this->nullableText($snapshot['title'] ?? null),
            'subtitle' => $this->nullableText($snapshot['subtitle'] ?? null),
            'artifact_rel_path' => $snapshotPath,
            'artifact_source_revision' => $snapshot['artifact_source_revision'] ?? null,
            'artifact_source_hash_sha256' => $snapshot['artifact_source_hash_sha256'] ?? null,
            'translation_state' => (string)($snapshot['translation_state'] ?? 'released'),
            'translation_provider' => $snapshot['translation_provider'] ?? null,
            'glossary_version' => $snapshot['glossary_version'] ?? null,
            'engine_version' => $snapshot['engine_version'] ?? null,
            'reviewer_party_id' => $snapshot['reviewer_party_id'] ?? null,
            'reviewed_at' => $snapshot['reviewed_at'] ?? null,
            'published_at' => $snapshot['published_at'] ?? null,
            'metadata' => $metadata,
        ], $actor);

        return ['ok' => true, 'restored' => true, 'locale_variant' => $variant];
    }

    /**
     * Refresh the embedded offline bootstrap in an existing English artifact.
     *
     * The bootstrap is not source of truth, but stale values can still flash or
     * mislead when the API is unreachable. This keeps existing artifacts aligned
     * with the DCC header projection without re-running machine translation.
     *
     * @return array<string, mixed>
     */
    public function refreshEnglishArtifactBootstrap(string $docCode): array
    {
        $docCode = DocumentControlService::canonicalizeCode($docCode);
        if ($docCode === '') {
            throw new InvalidArgumentException('dcc_locale_refresh_missing_doc_code');
        }

        $dcc = new DocumentControlService($this->data);
        $projection = $dcc->getLocaleVariantProjection($docCode, self::TARGET_LOCALE);
        $artifactRelPath = $this->normalizeRepoRelativePath((string)($projection['artifact_rel_path'] ?? ''));
        if ($artifactRelPath === '') {
            return [
                'ok' => false,
                'doc_code' => $docCode,
                'changed' => false,
                'reason' => 'english_artifact_not_renderable',
            ];
        }

        $title = $this->nullableText($projection['title'] ?? null)
            ?? $this->nullableText($projection['source_title'] ?? null)
            ?? $docCode;
        $subtitle = $this->nullableText($projection['subtitle'] ?? null)
            ?? $this->nullableText($projection['source_subtitle'] ?? null);
        $changed = $this->refreshArtifactDccBootstrapMetadata($dcc, $docCode, $artifactRelPath, $title, $subtitle);

        return [
            'ok' => true,
            'doc_code' => $docCode,
            'changed' => $changed,
            'artifact_rel_path' => $artifactRelPath,
        ];
    }

    /**
     * @param array<string, mixed> $header
     */
    private function syncHeaderBaseline(array $header, string $actor): void
    {
        $docCode = (string)$header['doc_code'];
        $title = trim((string)($header['title'] ?? ''));
        $subtitle = $this->nullableText($header['subtitle'] ?? null);
        $revision = $this->toDccRevision((string)($header['revision'] ?? 'V0'));
        $effectiveDate = $this->normaliseIsoDate($header['effective_date'] ?? null) ?? gmdate('Y-m-d');
        $status = $this->normaliseSourceStatus((string)($header['status'] ?? 'draft'));

        $service = new DocumentControlService($this->data);
        $service->upsertHeader([
            'doc_code' => $docCode,
            'title' => $title !== '' ? $title : $docCode,
            'subtitle' => $subtitle,
            'doc_type' => DocumentControlService::deriveDocType($docCode),
            'revision' => $revision,
            'effective_date' => $effectiveDate,
            'status' => $status,
        ], $actor);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function runConfiguredProvider(array $payload): array
    {
        $driver = strtolower(trim((string)(getenv('DCC_TRANSLATION_DRIVER') ?: '')));
        if ($driver === '' || in_array($driver, ['disabled', 'off', 'none'], true)) {
            return [
                'ok' => false,
                'provider' => 'unconfigured',
                'engine_version' => 'unconfigured',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_provider_not_configured',
                'message' => 'No compliant internal translation provider is configured for DCC auto-translation.',
            ];
        }

        if ($driver !== self::DRIVER_COMMAND) {
            return [
                'ok' => false,
                'provider' => $driver,
                'engine_version' => 'unsupported_driver',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_provider_driver_unsupported',
                'message' => 'Configured DCC translation driver is unsupported.',
            ];
        }

        $command = trim((string)(getenv('DCC_TRANSLATION_COMMAND') ?: ''));
        if ($command === '') {
            return [
                'ok' => false,
                'provider' => 'command',
                'engine_version' => 'unconfigured_command',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_command_missing',
                'message' => 'DCC_TRANSLATION_COMMAND is not configured.',
            ];
        }

        return $this->runCommandProvider($command, $payload);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function runCommandProvider(string $command, array $payload): array
    {
        $spec = [
            // proc_open pipe modes are defined from the child-process side:
            // stdin must be readable by the child, stdout/stderr writable.
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = @proc_open(['/bin/sh', '-lc', 'exec ' . $command], $spec, $pipes, $this->rootDir);
        if (!is_resource($process)) {
            return [
                'ok' => false,
                'provider' => 'command',
                'engine_version' => 'proc_open_failed',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_command_spawn_failed',
                'message' => 'Unable to spawn the configured DCC translation command.',
            ];
        }

        $stdin = $pipes[0] ?? null;
        $stdout = $pipes[1] ?? null;
        $stderr = $pipes[2] ?? null;
        if (is_resource($stdin)) {
            stream_set_blocking($stdin, false);
        }
        if (is_resource($stdout)) {
            stream_set_blocking($stdout, false);
        }
        if (is_resource($stderr)) {
            stream_set_blocking($stderr, false);
        }

        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($encoded)) {
            if (is_resource($stdin)) {
                fclose($stdin);
            }
            if (is_resource($stdout)) {
                fclose($stdout);
            }
            if (is_resource($stderr)) {
                fclose($stderr);
            }
            proc_close($process);
            return [
                'ok' => false,
                'provider' => 'command',
                'engine_version' => 'json_encode_failed',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_payload_encode_failed',
                'message' => 'Failed to encode translation payload.',
            ];
        }

        $stdoutBody = '';
        $stderrBody = '';
        $stdinBytes = strlen($encoded);
        $stdinOffset = 0;
        $stdinClosed = !is_resource($stdin);
        $deadline = microtime(true) + $this->commandTimeoutSeconds();

        while (true) {
            $running = false;
            $status = proc_get_status($process);
            if (is_array($status)) {
                $running = (bool)$status['running'];
            }

            $read = [];
            $write = [];
            $except = [];

            if (is_resource($stdout)) {
                $read[] = $stdout;
            }
            if (is_resource($stderr)) {
                $read[] = $stderr;
            }
            if (!$stdinClosed && is_resource($stdin) && $stdinOffset < $stdinBytes) {
                $write[] = $stdin;
            }

            if (!$running && $read === [] && $write === []) {
                break;
            }
            if ($read === [] && $write === []) {
                usleep(10_000);
                continue;
            }

            $remaining = $deadline - microtime(true);
            if ($remaining <= 0) {
                return $this->abortCommandProvider(
                    $process,
                    $stdin,
                    $stdout,
                    $stderr,
                    $stdoutBody,
                    $stderrBody,
                    'translation_command_timed_out',
                    'Translation command timed out before producing a compliant locale artifact.',
                    'command_timeout'
                );
            }

            $waitSeconds = (int)floor($remaining);
            $waitMicros = (int)(($remaining - $waitSeconds) * 1_000_000);
            if ($waitSeconds === 0 && $waitMicros <= 0) {
                $waitMicros = self::COMMAND_IO_POLL_MICROSECONDS;
            } elseif ($waitSeconds === 0) {
                $waitMicros = min($waitMicros, self::COMMAND_IO_POLL_MICROSECONDS);
            }

            $selected = @stream_select($read, $write, $except, $waitSeconds, $waitMicros);
            if ($selected === false) {
                usleep(10_000);
                continue;
            }

            if (!$stdinClosed && is_resource($stdin) && in_array($stdin, $write, true)) {
                $chunk = substr($encoded, $stdinOffset, 65536);
                $written = @fwrite($stdin, $chunk);
                if ($written === false) {
                    return $this->abortCommandProvider(
                        $process,
                        $stdin,
                        $stdout,
                        $stderr,
                        $stdoutBody,
                        $stderrBody,
                        'translation_command_stdin_failed',
                        'Translation command stdin write failed.',
                        'command_stdin_failed'
                    );
                }
                if ($written > 0) {
                    $stdinOffset += $written;
                }
                if ($stdinOffset >= $stdinBytes) {
                    fclose($stdin);
                    $stdin = null;
                    $stdinClosed = true;
                }
            }

            if (is_resource($stdout) && in_array($stdout, $read, true)) {
                $chunk = stream_get_contents($stdout);
                if (is_string($chunk) && $chunk !== '') {
                    $stdoutBody = $this->appendBoundedCommandOutput($stdoutBody, $chunk);
                }
                if (feof($stdout)) {
                    fclose($stdout);
                    $stdout = null;
                }
            }
            if (is_resource($stderr) && in_array($stderr, $read, true)) {
                $chunk = stream_get_contents($stderr);
                if (is_string($chunk) && $chunk !== '') {
                    $stderrBody = $this->appendBoundedCommandOutput($stderrBody, $chunk);
                }
                if (feof($stderr)) {
                    fclose($stderr);
                    $stderr = null;
                }
            }
        }

        if (is_resource($stdin)) {
            fclose($stdin);
        }
        $stdoutBody = is_resource($stdout)
            ? $this->appendBoundedCommandOutput($stdoutBody, (string)stream_get_contents($stdout))
            : $stdoutBody;
        $stderrBody = is_resource($stderr)
            ? $this->appendBoundedCommandOutput($stderrBody, (string)stream_get_contents($stderr))
            : $stderrBody;
        if (is_resource($stdout)) {
            fclose($stdout);
        }
        if (is_resource($stderr)) {
            fclose($stderr);
        }
        $exitCode = proc_close($process);

        $decoded = json_decode($stdoutBody, true);
        if ($exitCode !== 0 || !is_array($decoded)) {
            return [
                'ok' => false,
                'provider' => 'command',
                'engine_version' => 'command_error',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_command_failed',
                'message' => $this->boundedCommandMessage(
                    $stderrBody,
                    $stdoutBody,
                    'The configured translation command failed or returned invalid JSON.'
                ),
            ];
        }

        return $decoded;
    }

    private function commandTimeoutSeconds(): int
    {
        $raw = trim((string)(getenv('DCC_TRANSLATION_COMMAND_TIMEOUT_SECONDS') ?: ''));
        $value = ctype_digit($raw) ? (int)$raw : self::DEFAULT_COMMAND_TIMEOUT_SECONDS;
        return max(1, min(3600, $value));
    }

    /**
     * @param resource $process
     * @param resource|null $stdin
     * @param resource|null $stdout
     * @param resource|null $stderr
     * @return array<string, mixed>
     */
    private function abortCommandProvider(
        $process,
        $stdin,
        $stdout,
        $stderr,
        string $stdoutBody,
        string $stderrBody,
        string $reason,
        string $fallbackMessage,
        string $engineVersion
    ): array {
        if (is_resource($stdin)) {
            fclose($stdin);
        }
        if (is_resource($stdout)) {
            $stdoutBody = $this->appendBoundedCommandOutput($stdoutBody, (string)stream_get_contents($stdout));
            fclose($stdout);
        }
        if (is_resource($stderr)) {
            $stderrBody = $this->appendBoundedCommandOutput($stderrBody, (string)stream_get_contents($stderr));
            fclose($stderr);
        }
        @proc_terminate($process);
        @proc_close($process);

        return [
            'ok' => false,
            'provider' => 'command',
            'engine_version' => $engineVersion,
            'glossary_version' => $this->glossaryVersion(),
            'reason' => $reason,
            'message' => $this->boundedCommandMessage($stderrBody, $stdoutBody, $fallbackMessage),
        ];
    }

    private function appendBoundedCommandOutput(string $buffer, string $chunk): string
    {
        if ($chunk === '' || strlen($buffer) >= self::MAX_COMMAND_OUTPUT_BYTES) {
            return $buffer;
        }

        $remaining = self::MAX_COMMAND_OUTPUT_BYTES - strlen($buffer);
        if (strlen($chunk) <= $remaining) {
            return $buffer . $chunk;
        }

        $suffix = "\n...[truncated]";
        if ($remaining <= strlen($suffix)) {
            return $buffer . substr($suffix, 0, $remaining);
        }

        $allowed = $remaining - strlen($suffix);
        return $buffer . substr($chunk, 0, $allowed) . $suffix;
    }

    private function boundedCommandMessage(string $stderrBody, string $stdoutBody, string $fallbackMessage): string
    {
        $candidate = trim($stderrBody) !== ''
            ? trim($stderrBody)
            : (trim($stdoutBody) !== '' ? trim($stdoutBody) : $fallbackMessage);

        if (strlen($candidate) <= self::MAX_COMMAND_MESSAGE_BYTES) {
            return $candidate;
        }

        $suffix = ' ...[truncated]';
        $allowed = max(0, self::MAX_COMMAND_MESSAGE_BYTES - strlen($suffix));
        return substr($candidate, 0, $allowed) . $suffix;
    }

    private function normalizeRepoRelativePath(string $path): string
    {
        $normalized = str_replace('\\', '/', trim($path));
        $normalized = ltrim($normalized, '/');
        if ($normalized === '' || str_contains($normalized, '..')) {
            return '';
        }
        return $normalized;
    }

    private function hiddenSiblingArtifactPath(string $baseRelPath, string $locale, ?string $revision = null): string
    {
        $dir = str_replace('\\', '/', dirname($baseRelPath));
        $filename = basename($baseRelPath);
        $extension = strtolower((string)pathinfo($filename, PATHINFO_EXTENSION));
        $stem = (string)pathinfo($filename, PATHINFO_FILENAME);
        $suffix = '';
        if ($revision !== null && trim($revision) !== '') {
            $revSlug = strtolower(trim($revision));
            $revSlug = preg_replace('/[^a-z0-9]+/i', '_', $revSlug) ?? $revSlug;
            $revSlug = trim($revSlug, '_');
            if ($revSlug !== '') {
                $suffix = '.preview_r' . $revSlug;
            }
        }
        $artifactFile = '_' . $stem . $suffix . '.' . strtolower($locale) . '.' . $extension;
        return ($dir === '.' || $dir === '') ? $artifactFile : ($dir . '/' . $artifactFile);
    }

    private function normalizeSourceHtml(string $html): string
    {
        $normalized = $this->stripArchiveBaseHref($html);
        $normalized = str_replace("\r\n", "\n", $normalized);
        return trim($normalized);
    }

    private function stripArchiveBaseHref(string $html): string
    {
        $out = preg_replace('/<base\s+[^>]*href=["\']\.\.\/["\'][^>]*>\s*/i', '', $html, 1);
        return is_string($out) ? $out : $html;
    }

    private function normalizeArtifactHtml(string $html): string
    {
        $normalized = trim($html);
        if ($normalized === '') {
            return '';
        }
        if (stripos($normalized, '<html') === false) {
            return '<!doctype html><html lang="en" data-qms-locale-artifact="en"><head><meta charset="utf-8"></head><body>'
                . $normalized
                . '</body></html>';
        }

        return (string)preg_replace_callback(
            '/<html\b([^>]*)>/i',
            static function (array $matches): string {
                $attrs = (string)$matches[1];
                $attrs = preg_replace('/\s+lang\s*=\s*"[^"]*"/i', '', $attrs) ?? $attrs;
                $attrs = preg_replace("/\s+lang\s*=\s*'[^']*'/i", '', $attrs) ?? $attrs;
                $attrs = preg_replace('/\s+data-qms-locale-artifact\s*=\s*"[^"]*"/i', '', $attrs) ?? $attrs;
                $attrs = preg_replace("/\s+data-qms-locale-artifact\s*=\s*'[^']*'/i", '', $attrs) ?? $attrs;
                return '<html' . $attrs . ' lang="en" data-qms-locale-artifact="en">';
            },
            $normalized,
            1
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildArtifactBootstrapHeader(
        DocumentControlService $dcc,
        string $docCode,
        string $artifactTitle,
        ?string $artifactSubtitle
    ): array {
        $current = [];
        try {
            $current = $dcc->getHeader($docCode);
        } catch (Throwable) {
            $current = [];
        }

        $title = $this->nullableText($artifactTitle)
            ?? $this->nullableText($current['title'] ?? null)
            ?? $docCode;
        $subtitle = $this->nullableText($artifactSubtitle)
            ?? $this->nullableText($current['subtitle'] ?? null);
        $effectiveDate = $this->normaliseIsoDate($current['effective_date'] ?? null) ?? gmdate('Y-m-d');

        return [
            'doc_code' => DocumentControlService::canonicalizeCode((string)($current['doc_code'] ?? $docCode)),
            'title' => $title,
            'subtitle' => $subtitle,
            'doc_type' => (string)($current['doc_type'] ?? DocumentControlService::deriveDocType($docCode)),
            'revision' => $this->toDccRevision((string)($current['revision'] ?? '')),
            'effective_date' => $effectiveDate,
            'owner_role_code' => trim((string)($current['owner_role_code'] ?? '')),
            'approver_role_code' => trim((string)($current['approver_role_code'] ?? '')),
            'iso_clause' => $this->nullableText($current['iso_clause'] ?? null),
            'status' => $this->normaliseSourceStatus((string)($current['status'] ?? 'draft')),
        ];
    }

    /**
     * @param array<string, mixed> $header
     */
    private function injectDccBootstrapMetadata(string $html, array $header): string
    {
        $payload = [
            'header' => $header,
            'labels' => $this->defaultDccBootstrapLabels(),
        ];
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            return $html;
        }

        $count = 0;
        $out = preg_replace_callback(
            '/<div\b(?=[^>]*\bdcc-header\b)[^>]*>/i',
            function (array $matches) use ($json, $header): string {
                $tag = (string)$matches[0];
                $tag = $this->upsertHtmlAttribute($tag, 'data-dcc-bootstrap', $json);
                $tag = $this->upsertHtmlAttribute($tag, 'data-dcc-doc-code', (string)($header['doc_code'] ?? ''));
                $tag = $this->upsertHtmlAttribute($tag, 'data-dcc-locale', self::TARGET_LOCALE);
                return $tag;
            },
            $html,
            1,
            $count
        );

        return $count > 0 && is_string($out) ? $out : $html;
    }

    /**
     * @return array<string, array{short: string, long: string, sort: int}>
     */
    private function defaultDccBootstrapLabels(): array
    {
        return [
            'doc_id' => ['short' => 'ID', 'long' => 'Document ID', 'sort' => 10],
            'revision' => ['short' => 'Rev', 'long' => 'Revision', 'sort' => 20],
            'effective_date' => ['short' => 'Eff', 'long' => 'Effective date', 'sort' => 30],
            'owner' => ['short' => 'Owner', 'long' => 'Owner', 'sort' => 40],
            'approver' => ['short' => 'Appr', 'long' => 'Approved by', 'sort' => 50],
        ];
    }

    private function upsertHtmlAttribute(string $tag, string $name, string $value): string
    {
        $escaped = htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $attr = ' ' . $name . '="' . $escaped . '"';
        $pattern = '/\s+' . preg_quote($name, '/') . '\s*=\s*(?:"[^"]*"|\'[^\']*\')/i';
        if (preg_match($pattern, $tag) === 1) {
            return preg_replace($pattern, $attr, $tag, 1) ?? $tag;
        }

        return preg_replace('/(\s*\/?>)$/', $attr . '$1', $tag, 1) ?? $tag;
    }

    private function refreshArtifactDccBootstrapMetadata(
        DocumentControlService $dcc,
        string $docCode,
        string $artifactRelPath,
        string $artifactTitle,
        ?string $artifactSubtitle
    ): bool {
        $artifactRelPath = $this->normalizeRepoRelativePath($artifactRelPath);
        if ($artifactRelPath === '') {
            return false;
        }

        $abs = $this->rootDir . '/' . $artifactRelPath;
        $html = @file_get_contents($abs);
        if (!is_string($html) || trim($html) === '') {
            return false;
        }

        $normalized = $this->normalizeArtifactHtml($html);
        if ($normalized === '') {
            return false;
        }

        $patched = $this->injectDccBootstrapMetadata(
            $normalized,
            $this->buildArtifactBootstrapHeader($dcc, $docCode, $artifactTitle, $artifactSubtitle)
        );
        if ($patched !== $html) {
            $this->writeArtifact($artifactRelPath, $patched);
            return true;
        }

        return false;
    }

    /**
     * Critical-only quality issues. An artifact with any item in this list
     * MUST NOT be published or cached — it is structurally broken.
     *
     * Use {@see classifyLocaleArtifactQualityIssues()} when you need both
     * critical (blocking) and advisory (non-blocking) classifications.
     *
     * @return list<string>
     */
    public static function detectLocaleArtifactQualityIssues(string $html): array
    {
        return self::classifyLocaleArtifactQualityIssues($html)['critical'];
    }

    /**
     * Tiered quality classification.
     *
     * Returns ``['critical' => [...], 'advisory' => [...]]``:
     *  - ``critical``: artifact must be rejected (block).
     *  - ``advisory``: cosmetic / minor residue acceptable for a
     *    ``machine_preview`` artifact, recorded as an advisory in metadata.
     *
     * Aligned with the Python provider's ``classify_quality_issues`` so the
     * provider and the backend agree on what blocks publication.
     *
     * @return array{critical: list<string>, advisory: list<string>}
     */
    public static function classifyLocaleArtifactQualityIssues(string $html): array
    {
        $visible = self::visibleLocaleText($html);
        $visibleLength = mb_strlen($visible, 'UTF-8');
        $critical = [];
        $advisory = [];

        $leakCount = preg_match_all(self::LOCALE_LITERAL_LEAK_TOLERANT_PATTERN, $visible, $matches);
        $leakCount = is_int($leakCount) ? $leakCount : 0;
        if ($leakCount > 0) {
            // Any leaked placeholder is a real bug — block. The Python
            // provider's tolerant restorer should have erased these before
            // returning, so a survivor here means structural breakage.
            $critical[] = 'literal_placeholder_leak';
        }

        foreach (self::QUALITY_REPEAT_PATTERNS as $pattern) {
            if (preg_match($pattern, $visible) === 1) {
                $critical[] = 'repeated_token_loop';
                break;
            }
        }

        $residualMatches = 0;
        foreach (self::RESIDUAL_VIETNAMESE_TERMS as $term) {
            $pattern = '/(?<![\p{L}\p{N}_])' . preg_quote($term, '/') . '(?![\p{L}\p{N}_])/iu';
            $count = preg_match_all($pattern, $visible, $matches);
            if (is_int($count) && $count > 0) {
                $residualMatches += $count;
            }
        }

        $vietnameseChars = preg_match_all(
            '/[àáạảãăắằẳẵặâấầẩẫậđèéẹẻẽêếềểễệìíịỉĩòóọỏõôốồổỗộơớờởỡợùúụủũưứừửữựỳýỵỷỹ]/iu',
            $visible,
            $matches
        );
        $vietnameseChars = is_int($vietnameseChars) ? $vietnameseChars : 0;
        if ($vietnameseChars > 0) {
            $fraction = $visibleLength > 0 ? $vietnameseChars / $visibleLength : 1.0;
            if (
                $vietnameseChars > self::LOCALE_RESIDUE_VN_CHAR_ABSOLUTE_LIMIT
                || $fraction > self::LOCALE_RESIDUE_VN_CHAR_FRACTION_LIMIT
            ) {
                $critical[] = 'vietnamese_residue_severe';
            } else {
                $advisory[] = 'vietnamese_residue_minor';
            }
        }
        if ($residualMatches >= self::LOCALE_RESIDUE_TERM_CRITICAL_THRESHOLD) {
            $critical[] = 'excessive_vietnamese_residue';
        }

        $asciiResidualMatches = 0;
        foreach (self::ASCII_RESIDUAL_VIETNAMESE_TERMS as $term) {
            $pattern = '/(?<![\p{L}\p{N}_])' . preg_quote($term, '/') . '(?![\p{L}\p{N}_])/iu';
            $count = preg_match_all($pattern, $visible, $matches);
            if (is_int($count) && $count > 0) {
                $asciiResidualMatches += $count;
            }
        }
        if ($asciiResidualMatches > 0) {
            // ASCII residue is genuinely ambiguous — same string can be
            // Vietnamese-without-diacritics OR a domain-specific token. Block
            // only when the density is clearly an untranslated section.
            $asciiDense = (
                $asciiResidualMatches >= 10
                || ($visibleLength > 0 && $asciiResidualMatches / $visibleLength > 0.001)
            );
            if ($asciiDense) {
                $critical[] = 'ascii_vietnamese_residue';
            } else {
                $advisory[] = 'ascii_vietnamese_residue_minor';
            }
        }

        foreach (self::MACHINE_ARTIFACT_NOISE_PATTERNS as $pattern) {
            if (preg_match($pattern, $visible) === 1) {
                $critical[] = 'machine_artifact_noise';
                break;
            }
        }

        if (preg_match('/(?<![\p{L}\p{N}])%[A-Za-z](?![\p{L}\p{N}])/u', $visible) === 1) {
            $advisory[] = 'symbol_placeholder_noise';
        }

        if (preg_match('/\b(?:to|at|from|for|according to)<a\b/i', $html) === 1) {
            $advisory[] = 'anchor_prefix_spacing';
        }
        if (preg_match('/<\/a>(?:and|or|with|must|is|are|SOP|WI|ANNEX|FRM|POL|QMS-MAN)\b/i', $html) === 1) {
            $advisory[] = 'anchor_suffix_spacing';
        }
        if (preg_match('/\b(?:to|at|from|for|according to)(?:SOP|WI|ANNEX|FRM|POL|QMS-MAN)-\d+/i', $visible) === 1) {
            $advisory[] = 'document_code_spacing';
        }

        return [
            'critical' => array_values(array_unique($critical)),
            'advisory' => array_values(array_unique($advisory)),
        ];
    }

    private static function visibleLocaleText(string $html): string
    {
        $clean = preg_replace('/<(script|style|noscript|svg|math)\b[^>]*>.*?<\/\1>/is', ' ', $html);
        $clean = is_string($clean) ? $clean : $html;
        $clean = preg_replace('/<[^>]+>/', ' ', $clean);
        $clean = is_string($clean) ? $clean : $html;
        $text = html_entity_decode(strip_tags($clean), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text);
        return trim(is_string($text) ? $text : '');
    }

    private function writeArtifact(string $artifactRelPath, string $html): void
    {
        $abs = $this->rootDir . '/' . $artifactRelPath;
        $dir = dirname($abs);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('dcc_locale_automation_artifact_dir_create_failed');
        }
        if (@file_put_contents($abs, $html, LOCK_EX) === false) {
            throw new RuntimeException('dcc_locale_automation_artifact_write_failed');
        }
    }

    private function deleteArtifactIfExists(string $artifactRelPath): void
    {
        $abs = $this->rootDir . '/' . $artifactRelPath;
        if (is_file($abs)) {
            @unlink($abs);
        }
    }

    private function artifactExists(string $artifactRelPath): bool
    {
        $artifactRelPath = $this->normalizeRepoRelativePath($artifactRelPath);
        if ($artifactRelPath === '') {
            return false;
        }

        return is_file($this->rootDir . '/' . $artifactRelPath);
    }

    private function runtimeArtifactCachePath(string $docCode, string $locale, string $sourceHash): string
    {
        $safeCode = preg_replace('/[^A-Z0-9._-]+/i', '-', DocumentControlService::canonicalizeCode($docCode)) ?? 'DOC';
        $safeHash = preg_replace('/[^a-f0-9]+/i', '', strtolower($sourceHash)) ?? '';
        $safeLocale = preg_replace('/[^a-z0-9_-]+/i', '', strtolower($locale)) ?? '';
        if ($safeLocale === '') {
            $safeLocale = self::TARGET_LOCALE;
        }
        if ($safeHash === '') {
            throw new InvalidArgumentException('dcc_locale_automation_invalid_source_hash');
        }

        return $this->rootDir . '/mom/data/cache/dcc-locale-artifacts/' . $safeLocale . '/' . $safeCode . '/' . $safeHash . '.html';
    }

    private function writeRuntimeArtifactCache(string $docCode, string $locale, string $sourceHash, string $html): bool
    {
        if (self::detectLocaleArtifactQualityIssues($html) !== []) {
            @error_log('[DCC locale automation] refused to cache non-compliant locale artifact for ' . $docCode);
            return false;
        }

        $cachePath = $this->runtimeArtifactCachePath($docCode, $locale, $sourceHash);
        $dir = dirname($cachePath);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            @error_log('[DCC locale automation] runtime cache directory create failed: ' . $dir);
            return false;
        }
        @chmod($dir, 0775);
        if (@file_put_contents($cachePath, $html, LOCK_EX) === false) {
            @error_log('[DCC locale automation] runtime cache write failed: ' . $cachePath);
            return false;
        }
        @chmod($cachePath, 0664);
        return true;
    }

    private function restoreArtifactFromRuntimeCache(
        string $docCode,
        string $locale,
        string $sourceHash,
        string $artifactRelPath
    ): bool {
        $cachePath = $this->runtimeArtifactCachePath($docCode, $locale, $sourceHash);
        if (!is_file($cachePath)) {
            return false;
        }

        $html = @file_get_contents($cachePath);
        if (!is_string($html) || trim($html) === '') {
            return false;
        }
        if (self::detectLocaleArtifactQualityIssues($html) !== []) {
            @unlink($cachePath);
            return false;
        }

        $this->writeArtifact($artifactRelPath, $html);
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    private function configuredProviderStatus(): array
    {
        $driver = strtolower(trim((string)(getenv('DCC_TRANSLATION_DRIVER') ?: '')));
        if ($driver === '' || in_array($driver, ['disabled', 'off', 'none'], true)) {
            return [
                'ok' => false,
                'provider' => 'unconfigured',
                'engine_version' => 'unconfigured',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_provider_not_configured',
                'message' => 'No compliant internal translation provider is configured for DCC auto-translation.',
            ];
        }

        if ($driver !== self::DRIVER_COMMAND) {
            return [
                'ok' => false,
                'provider' => $driver,
                'engine_version' => 'unsupported_driver',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_provider_driver_unsupported',
                'message' => 'Configured DCC translation driver is unsupported.',
            ];
        }

        $command = trim((string)(getenv('DCC_TRANSLATION_COMMAND') ?: ''));
        if ($command === '') {
            return [
                'ok' => false,
                'provider' => 'command',
                'engine_version' => 'unconfigured_command',
                'glossary_version' => $this->glossaryVersion(),
                'reason' => 'translation_command_missing',
                'message' => 'DCC_TRANSLATION_COMMAND is not configured.',
            ];
        }

        return [
            'ok' => true,
            'provider' => 'command',
            'engine_version' => 'queued_background_worker',
            'glossary_version' => $this->glossaryVersion(),
            'command' => $command,
        ];
    }

    private function queuedTranslationJobPath(string $docCode, string $locale, string $sourceHash): string
    {
        $safeCode = preg_replace('/[^A-Z0-9._-]+/i', '-', DocumentControlService::canonicalizeCode($docCode)) ?? 'DOC';
        $safeHash = preg_replace('/[^a-f0-9]+/i', '', strtolower($sourceHash)) ?? '';
        $safeLocale = preg_replace('/[^a-z0-9_-]+/i', '', strtolower($locale)) ?? '';
        if ($safeLocale === '') {
            $safeLocale = self::TARGET_LOCALE;
        }
        if ($safeHash === '') {
            throw new InvalidArgumentException('dcc_locale_automation_invalid_source_hash');
        }

        return $this->rootDir . '/mom/data/cache/dcc-locale-jobs/' . $safeLocale . '/' . $safeCode . '/' . $safeHash . '.json';
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function writeQueuedTranslationJob(string $docCode, string $locale, string $sourceHash, array $payload): string
    {
        $jobPath = $this->queuedTranslationJobPath($docCode, $locale, $sourceHash);
        $dir = dirname($jobPath);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('dcc_locale_automation_queue_dir_create_failed');
        }

        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if (!is_string($encoded)) {
            throw new RuntimeException('dcc_locale_automation_queue_payload_encode_failed');
        }
        if (@file_put_contents($jobPath, $encoded, LOCK_EX) === false) {
            throw new RuntimeException('dcc_locale_automation_queue_write_failed');
        }

        return $jobPath;
    }

    private function spawnQueuedTranslationWorker(string $jobPath): bool
    {
        $worker = $this->rootDir . '/tools/scripts/translation/dcc_locale_job_worker.php';
        if (!is_file($worker)) {
            return false;
        }

        $phpBinary = $this->resolvePhpCliBinary();
        if ($phpBinary === '') {
            return false;
        }

        $logFile = $this->rootDir . '/mom/data/php_error.log';
        $command = sprintf(
            'cd %s && nohup %s %s %s >> %s 2>&1 < /dev/null &',
            escapeshellarg($this->rootDir),
            escapeshellarg($phpBinary),
            escapeshellarg($worker),
            escapeshellarg($jobPath),
            escapeshellarg($logFile)
        );
        $process = @proc_open(['/bin/sh', '-lc', $command], [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ], $pipes, $this->rootDir);
        if (!is_resource($process)) {
            return false;
        }
        foreach ($pipes as $pipe) {
            if (is_resource($pipe)) {
                fclose($pipe);
            }
        }
        @proc_close($process);
        return true;
    }

    private function resolvePhpCliBinary(): string
    {
        $configured = trim((string)(getenv('PHP_CLI_BINARY') ?: ''));
        if ($configured !== '') {
            return $configured;
        }

        foreach (['php8.5', 'php'] as $candidate) {
            $resolved = trim((string)@shell_exec('command -v ' . escapeshellarg($candidate) . ' 2>/dev/null'));
            if ($resolved !== '') {
                return $resolved;
            }
        }

        return '';
    }

    private function relativeToRoot(string $absPath): string
    {
        $normalizedRoot = rtrim(str_replace('\\', '/', $this->rootDir), '/');
        $normalizedAbs = str_replace('\\', '/', $absPath);
        if ($normalizedRoot !== '' && str_starts_with($normalizedAbs, $normalizedRoot . '/')) {
            return substr($normalizedAbs, strlen($normalizedRoot) + 1);
        }
        return $normalizedAbs;
    }

    private function existingVariantMatchesCurrentSource(array $variant, string $dccRevision, string $sourceHash): bool
    {
        if ($variant === []) {
            return false;
        }

        $variantRevision = trim((string)($variant['artifact_source_revision'] ?? ''));
        if ($variantRevision !== '' && $variantRevision !== $dccRevision) {
            return false;
        }

        $variantHash = strtolower(trim((string)($variant['artifact_source_hash_sha256'] ?? '')));
        return $variantHash !== '' && hash_equals($variantHash, $sourceHash);
    }

    private function isRenderableVariantState(string $state): bool
    {
        return in_array(
            $this->normaliseVariantState($state, 'missing'),
            ['machine_preview', 'review_pending', 'reviewed', 'released'],
            true
        );
    }

    /**
     * @param array<string, mixed> $existingVariant
     * @param array<string, mixed> $metadataPatch
     * @return array<string, mixed>|null
     */
    private function restoreCurrentSourceArtifactIfAvailable(
        DocumentControlService $dcc,
        string $docCode,
        string $actor,
        string $title,
        ?string $subtitle,
        string $dccRevision,
        string $sourceHash,
        string $artifactRelPath,
        array $existingVariant,
        string $fallbackState,
        array $metadataPatch
    ): ?array {
        if (!$this->existingVariantMatchesCurrentSource($existingVariant, $dccRevision, $sourceHash)) {
            return null;
        }

        $existingArtifactPath = $this->normalizeRepoRelativePath((string)($existingVariant['artifact_rel_path'] ?? ''));
        $artifactReady = $this->artifactExists($artifactRelPath);
        if (!$artifactReady && $existingArtifactPath !== '' && $existingArtifactPath !== $artifactRelPath && $this->artifactExists($existingArtifactPath)) {
            $html = @file_get_contents($this->rootDir . '/' . $existingArtifactPath);
            if (is_string($html) && trim($html) !== '') {
                $this->writeArtifact($artifactRelPath, $html);
                $artifactReady = true;
            }
        }
        if (!$artifactReady) {
            $artifactReady = $this->restoreArtifactFromRuntimeCache($docCode, self::TARGET_LOCALE, $sourceHash, $artifactRelPath);
        }
        if (!$artifactReady) {
            return null;
        }
        $artifactHtml = @file_get_contents($this->rootDir . '/' . $artifactRelPath);
        $qualityIssues = is_string($artifactHtml) ? self::detectLocaleArtifactQualityIssues($artifactHtml) : ['artifact_read_failed'];
        if ($qualityIssues !== []) {
            $this->deleteArtifactIfExists($artifactRelPath);
            return null;
        }

        $artifactTitle = $this->nullableText($existingVariant['title'] ?? null) ?? $title;
        $artifactSubtitle = $this->nullableText($existingVariant['subtitle'] ?? null) ?? $subtitle;
        $this->refreshArtifactDccBootstrapMetadata($dcc, $docCode, $artifactRelPath, $artifactTitle, $artifactSubtitle);

        $state = $this->normaliseVariantState((string)($existingVariant['translation_state'] ?? $fallbackState), $fallbackState);
        if (!$this->isRenderableVariantState($state)) {
            $state = $fallbackState;
        }

        $metadata = $this->normalizeVariantMetadata($existingVariant['metadata'] ?? []);
        foreach ($metadataPatch as $key => $value) {
            $metadata[$key] = $value;
        }
        $metadata['restored_from_runtime_cache_at'] = gmdate(DATE_ATOM);

        $provider = trim((string)($existingVariant['translation_provider'] ?? ''));
        if ($provider === '' || $provider === 'unconfigured') {
            $provider = 'runtime_cache';
        }
        $engineVersion = trim((string)($existingVariant['engine_version'] ?? ''));
        if ($engineVersion === '' || $engineVersion === 'unconfigured') {
            $engineVersion = 'runtime_cache_restore';
        }
        $glossaryVersion = trim((string)($existingVariant['glossary_version'] ?? ''));
        if ($glossaryVersion === '') {
            $glossaryVersion = $this->glossaryVersion();
        }

        $variant = $dcc->upsertLocaleVariant($docCode, self::TARGET_LOCALE, [
            'title' => $this->nullableText($existingVariant['title'] ?? $title) ?? $title,
            'subtitle' => $this->nullableText($existingVariant['subtitle'] ?? $subtitle),
            'artifact_rel_path' => $artifactRelPath,
            'artifact_source_revision' => $dccRevision,
            'artifact_source_hash_sha256' => $sourceHash,
            'translation_state' => $state,
            'translation_provider' => $provider,
            'glossary_version' => $glossaryVersion,
            'engine_version' => $engineVersion,
            'reviewer_party_id' => $existingVariant['reviewer_party_id'] ?? null,
            'reviewed_at' => $existingVariant['reviewed_at'] ?? null,
            'published_at' => $state === 'released' ? ($existingVariant['published_at'] ?? gmdate(DATE_ATOM)) : null,
            'metadata' => $metadata,
        ], $actor);

        return [
            'ok' => true,
            'doc_code' => $docCode,
            'translation_state' => $state,
            'artifact_rel_path' => $artifactRelPath,
            'locale_variant' => $variant,
            'restored_from_runtime_cache' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchLocaleVariant(string $docCode, string $locale): array
    {
        $rows = $this->data->query(
            "SELECT doc_code, locale, title, subtitle, artifact_rel_path,
                    artifact_source_revision, artifact_source_hash_sha256,
                    translation_state, translation_provider, glossary_version,
                    engine_version, reviewer_party_id, reviewed_at, published_at,
                    metadata
             FROM dcc_document_locale_variant
             WHERE doc_code = :c AND locale = :loc
             LIMIT 1",
            [':c' => $docCode, ':loc' => $locale]
        ) ?? [];

        $row = $rows[0] ?? [];
        if (!is_array($row)) {
            return [];
        }
        $row['metadata'] = $this->normalizeVariantMetadata($row['metadata'] ?? []);
        return $row;
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeVariantMetadata(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    /**
     * @param array<string, mixed> $variant
     * @return array<string, mixed>|null
     */
    private function releasedSnapshotFrom(array $variant): ?array
    {
        if ($variant === []) {
            return null;
        }

        $metadata = $this->normalizeVariantMetadata($variant['metadata'] ?? []);
        $snapshot = $metadata['released_snapshot'] ?? null;
        if (is_array($snapshot) && trim((string)($snapshot['artifact_rel_path'] ?? '')) !== '') {
            return $snapshot;
        }

        $state = strtolower(trim((string)($variant['translation_state'] ?? '')));
        $artifactPath = trim((string)($variant['artifact_rel_path'] ?? ''));
        if ($artifactPath === '' || ($state !== 'released' && empty($variant['published_at']))) {
            return null;
        }

        return [
            'title' => $this->nullableText($variant['title'] ?? null),
            'subtitle' => $this->nullableText($variant['subtitle'] ?? null),
            'artifact_rel_path' => $artifactPath,
            'artifact_source_revision' => $variant['artifact_source_revision'] ?? null,
            'artifact_source_hash_sha256' => $variant['artifact_source_hash_sha256'] ?? null,
            'translation_state' => $state !== '' ? $state : 'released',
            'translation_provider' => $variant['translation_provider'] ?? null,
            'glossary_version' => $variant['glossary_version'] ?? null,
            'engine_version' => $variant['engine_version'] ?? null,
            'reviewer_party_id' => $variant['reviewer_party_id'] ?? null,
            'reviewed_at' => $variant['reviewed_at'] ?? null,
            'published_at' => $variant['published_at'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveCatalogMetadata(string $docCode, string $baseRelPath): array
    {
        $file = $this->rootDir . '/mom/data/config/docs_custom.json';
        if (!is_file($file)) {
            return [];
        }
        $raw = json_decode((string)@file_get_contents($file), true);
        $docs = is_array($raw['docs'] ?? null) ? $raw['docs'] : [];
        foreach ($docs as $row) {
            if (!is_array($row)) {
                continue;
            }
            $rowCode = DocumentControlService::canonicalizeCode((string)($row['code'] ?? ''));
            $rowPath = $this->normalizeRepoRelativePath((string)($row['path'] ?? ''));
            if (($rowCode !== '' && $rowCode === $docCode) || ($rowPath !== '' && $rowPath === $baseRelPath)) {
                return $row;
            }
        }
        return [];
    }

    private function normaliseRevision(string $revision): string
    {
        $normalized = trim($revision);
        $normalized = preg_replace('/^[vV]\s*/', '', $normalized) ?? $normalized;
        if ($normalized === '') {
            $normalized = '0.0';
        }
        if (!str_contains($normalized, '.')) {
            $normalized .= '.0';
        }
        return $normalized;
    }

    private function toDccRevision(string $revision): string
    {
        $normalized = trim($revision);
        $normalized = preg_replace('/^[vV]\s*/', '', $normalized) ?? $normalized;
        if ($normalized === '') {
            $normalized = '0';
        }
        if (!preg_match('/^\d+(?:\.\d+)?$/', $normalized)) {
            return 'V0';
        }
        return 'V' . $normalized;
    }

    private function normaliseIsoDate(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $text)) {
            return $text;
        }
        $ts = strtotime($text);
        return $ts ? gmdate('Y-m-d', $ts) : null;
    }

    private function normaliseSourceStatus(string $status): string
    {
        return match (strtolower(trim($status))) {
            'draft' => 'draft',
            'inreview', 'in_review', 'review', 'pending_review' => 'in_review',
            'approved', 'approve' => 'approved',
            'released', 'release' => 'released',
            'superseded', 'supersede' => 'superseded',
            'obsolete' => 'obsolete',
            default => 'draft',
        };
    }

    private function normaliseVariantState(string $state, string $fallback): string
    {
        $normalized = strtolower(trim($state));
        return in_array($normalized, ['machine_preview', 'review_pending', 'reviewed', 'released', 'blocked'], true)
            ? $normalized
            : $fallback;
    }

    private function normalizeTrigger(string $trigger): string
    {
        $normalized = strtolower(trim($trigger));
        return $normalized !== '' ? $normalized : 'manual';
    }

    private function nullableText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $text = trim((string)$value);
        return $text === '' ? null : $text;
    }

    private function glossaryPath(): string
    {
        return $this->rootDir . '/tools/scripts/vi-localization/glossary.json';
    }

    private function glossaryVersion(): string
    {
        $path = $this->glossaryPath();
        if (!is_file($path)) {
            return 'absent';
        }
        $hash = @sha1_file($path);
        return is_string($hash) && $hash !== ''
            ? ('sha1:' . substr($hash, 0, 12))
            : 'unreadable';
    }
}
