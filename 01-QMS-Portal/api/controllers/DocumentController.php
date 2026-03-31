<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use RuntimeException;
use Throwable;

/**
 * Document management controller for HESEM QMS Portal.
 *
 * Handles document creation, draft saving, review submission, approval,
 * rejection, metadata updates, version management, and document streaming.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   2.0.0
 */
class DocumentController extends BaseController
{
    /**
     * POST create — Create a new document with initial draft.
     *
     * Legacy action: `doc_create`
     *
     * @return never
     */
    public function create(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        if (!role_can_create_docs($me, $rolePermsFile)) {
            $this->error('forbidden', 403);
        }

        try {
            $data     = $this->jsonBody();
            $code     = $this->sanitizeCode((string)($data['code'] ?? ''));
            $title    = trim((string)($data['title'] ?? ''));
            $cat      = strtoupper(trim((string)($data['cat'] ?? '')));
            $owner    = trim((string)($data['owner'] ?? ($me['dept'] ?? '')));
            $folder   = trim((string)($data['folder'] ?? ''));
            $revision = trim((string)($data['revision'] ?? ($data['initial_revision'] ?? '0.0')));
            $revision = preg_replace('/^[vV]\s*/', '', $revision);
            if ($revision === '') $revision = '0.0';

            $this->requireFields(['code' => $code, 'title' => $title, 'cat' => $cat], ['code', 'title', 'cat']);

            if (!preg_match('/^\d+(?:\.\d+)?$/', $revision)) {
                $this->error('bad_revision', 400);
            }
            if (!str_contains($revision, '.')) $revision .= '.0';

            if (portal_title_has_non_ascii($title)) {
                $this->error('title_must_be_english_ascii', 400);
            }

            // Resolve folder
            if ($folder === '') {
                $folder = default_folder_for_cat($cat, $this->rootDir);
                $this->resolveSubfolder($folder, $code);
            }
            $folder = safe_rel_path($folder);

            if (preg_match('#(^|/)_Archive(/|$)#i', $folder)) {
                $this->error('invalid_folder', 400);
            }

            // Uniqueness check
            $customDocsFile = $this->confDir . '/docs_custom.json';
            $custom = load_custom_docs($customDocsFile);
            foreach ($custom as $d) {
                if (is_array($d) && strtoupper((string)($d['code'] ?? '')) === $code) {
                    $this->error('code_exists', 409);
                }
            }

            // Generate filename
            $codeSlug  = slugify($code);
            $titleSlug = slugify($title);
            $baseName  = $codeSlug . ($titleSlug !== '' ? ('-' . $titleSlug) : '');
            if (strlen($baseName) > 120) $baseName = substr($baseName, 0, 120);
            $fileName = $baseName . '.html';

            $folderAbs = join_in_root($this->rootDir, $folder);
            ensure_dir($folderAbs);

            // Ensure unique filename
            $i = 2;
            while (is_file($folderAbs . '/' . $fileName)) {
                $fileName = $baseName . '-' . $i . '.html';
                $i++;
                if ($i > 200) $this->error('too_many_conflicts', 500);
            }

            $baseRel = ($folder !== '' ? ($folder . '/') : '') . $fileName;
            $baseRel = safe_rel_path($baseRel);
            $absFile = join_in_root($this->rootDir, $baseRel);

            // Create HTML template
            $docHtml = $this->createDocHtml($code, $title, $owner, $folder);

            if (@file_put_contents($absFile, $docHtml, LOCK_EX) === false) {
                $this->error('write_failed', 500);
            }

            // Create draft in _Archive
            $stored  = store_version_file($baseRel, $revision, 'draft', $this->rootDir, $docHtml);
            $draftRel = rel_path($stored, $this->rootDir);

            // Initialize state + manifest
            $state = [
                'code'        => $code,
                'status'      => 'draft',
                'revision'    => $revision,
                'has_release' => false,
                'createdAt'   => $this->nowIso(),
                'lastEdit'    => $this->nowIso(),
            ];
            save_doc_state($this->rootDir, $baseRel, $state);

            $manifest = [
                'code'       => $code,
                'base'       => $baseRel,
                'updated_at' => $this->nowIso(),
                'versions'   => [[
                    'status'  => 'draft',
                    'version' => 'v' . $revision,
                    'date'    => $this->humanDt(),
                    'by'      => (string)($me['name'] ?? $me['username'] ?? ''),
                    'file'    => $draftRel,
                    'note'    => 'Created',
                ]],
            ];
            save_doc_manifest($this->rootDir, $baseRel, $manifest);

            // Register in custom docs
            $custom[] = [
                'code'     => $code,
                'title'    => $title,
                'cat'      => $cat,
                'path'     => $baseRel,
                'folder'   => $folder,
                'rev'      => $revision,
                'status'   => 'draft',
                'owner'    => $owner !== '' ? $owner : 'QA/QMS',
                'ext'      => 'html',
            ];
            $customDocsFile = $this->confDir . '/docs_custom.json';
            save_custom_docs($customDocsFile, $custom);
            $this->invalidateScanCache();

            $this->auditLog('doc_create', ['code' => $code, 'title' => $title]);

            $this->success([
                'code'      => $code,
                'path'      => $baseRel,
                'folder'    => $folder,
                'file_name' => $fileName,
                'revision'  => $revision,
                'draft_rel' => $draftRel,
            ]);
        } catch (Throwable $e) {
            if ($e instanceof \HESEM\QMS\Api\Controllers\ExitException) throw $e;
            $this->error('doc_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST saveDraft — Save a working draft of a document.
     *
     * Legacy action: `doc_save_draft`
     *
     * @return never
     */
    public function saveDraft(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        require_doc_workflow_editor($me, $rolePermsFile);

        $data = $this->jsonBody();
        $code = strtoupper(trim((string)($data['code'] ?? '')));
        $html = (string)($data['html'] ?? '');
        $path = trim((string)($data['path'] ?? ''));

        if ($code === '') $this->error('missing_code', 400);
        if ($html === '') $this->error('missing_html', 400);
        if ($path === '') $this->error('missing_path', 400);

        $baseRel = safe_rel_path($path);
        $archiveDir = $this->rootDir . '/archive';

        $state = load_doc_state($this->rootDir, $baseRel, $archiveDir, $code);
        if (!$state) $state = ['code' => $code, 'status' => 'draft', 'revision' => '0.0'];

        $revision = (string)($state['revision'] ?? '0.0');
        $status   = strtolower((string)($state['status'] ?? 'draft'));

        // Store the draft version file
        $stored  = store_version_file($baseRel, $revision, $status === 'draft' ? 'draft' : $status, $this->rootDir, $html);
        $draftRel = rel_path($stored, $this->rootDir);

        // Update state
        $state['lastEdit']      = $this->nowIso();
        $state['checked_out_by'] = (string)($me['username'] ?? '');
        save_doc_state($this->rootDir, $baseRel, $state);

        // Update manifest
        $manifest = load_doc_manifest($this->rootDir, $baseRel, $archiveDir, $code);
        $versions = $manifest['versions'] ?? [];

        // Replace existing draft entry or prepend new one
        $found = false;
        foreach ($versions as &$v) {
            if (is_array($v) && ($v['status'] ?? '') === 'draft' && ($v['version'] ?? '') === 'v' . $revision) {
                $v['file'] = $draftRel;
                $v['date'] = $this->humanDt();
                $v['by']   = (string)($me['name'] ?? $me['username'] ?? '');
                $found = true;
                break;
            }
        }
        unset($v);
        if (!$found) {
            array_unshift($versions, [
                'status'  => 'draft',
                'version' => 'v' . $revision,
                'date'    => $this->humanDt(),
                'by'      => (string)($me['name'] ?? $me['username'] ?? ''),
                'file'    => $draftRel,
                'note'    => 'Draft saved',
            ]);
        }
        $manifest['versions'] = $versions;
        save_doc_manifest($this->rootDir, $baseRel, $manifest);

        $this->auditLog('doc_save_draft', ['code' => $code]);
        $this->success(['draft_rel' => $draftRel, 'revision' => $revision]);
    }

    /**
     * POST submitReview — Submit a document for review/approval.
     *
     * Legacy action: `doc_submit_review`
     *
     * @return never
     */
    public function submitReview(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        require_doc_workflow_editor($me, $rolePermsFile);

        $data     = $this->jsonBody();
        $code     = strtoupper(trim((string)($data['code'] ?? '')));
        $path     = trim((string)($data['path'] ?? ''));
        $html     = (string)($data['html'] ?? '');
        $note     = trim((string)($data['note'] ?? ''));
        $updateType = trim((string)($data['update_type'] ?? 'minor'));

        if ($code === '') $this->error('missing_code', 400);
        if ($path === '') $this->error('missing_path', 400);

        $baseRel    = safe_rel_path($path);
        $archiveDir = $this->rootDir . '/archive';

        $state = load_doc_state($this->rootDir, $baseRel, $archiveDir, $code);
        if (!$state) $state = ['code' => $code, 'status' => 'draft', 'revision' => '0.0'];

        $revision = (string)($state['revision'] ?? '0.0');

        // Store the in_review version
        if ($html !== '') {
            store_version_file($baseRel, $revision, 'in_review', $this->rootDir, $html);
        }

        // Update state
        $state['status']              = 'in_review';
        $state['submittedBy']         = (string)($me['name'] ?? $me['username'] ?? '');
        $state['submittedDate']       = $this->nowIso();
        $state['submittedUpdateType'] = $updateType;
        save_doc_state($this->rootDir, $baseRel, $state);

        // Update manifest
        $manifest = load_doc_manifest($this->rootDir, $baseRel, $archiveDir, $code);
        $versions = $manifest['versions'] ?? [];
        array_unshift($versions, [
            'status'  => 'in_review',
            'version' => 'v' . $revision,
            'date'    => $this->humanDt(),
            'by'      => (string)($me['name'] ?? $me['username'] ?? ''),
            'note'    => $note ?: 'Submitted for review',
        ]);
        $manifest['versions'] = $versions;
        save_doc_manifest($this->rootDir, $baseRel, $manifest);

        // Update custom docs entry
        $customDocsFile = $this->confDir . '/docs_custom.json';
        patch_custom_doc_entries($customDocsFile, $code, ['status' => 'in_review']);

        $this->auditLog('doc_submit_review', ['code' => $code, 'update_type' => $updateType]);
        $this->success(['status' => 'in_review', 'revision' => $revision]);
    }

    /**
     * POST approve — Approve a document (releases it).
     *
     * Legacy action: `doc_approve`
     *
     * @return never
     */
    public function approve(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        require_doc_workflow_approver($me);

        $data         = $this->jsonBody();
        $code         = strtoupper(trim((string)($data['code'] ?? '')));
        $path         = trim((string)($data['path'] ?? ''));
        $effectiveDate = trim((string)($data['effective_date'] ?? ''));
        $note         = trim((string)($data['note'] ?? ''));

        if ($code === '') $this->error('missing_code', 400);
        if ($path === '') $this->error('missing_path', 400);

        $baseRel    = safe_rel_path($path);
        $archiveDir = $this->rootDir . '/archive';

        $state = load_doc_state($this->rootDir, $baseRel, $archiveDir, $code);
        if (!$state) $this->error('doc_not_found', 404);

        $revision    = (string)($state['revision'] ?? '0.0');
        $updateType  = strtolower(trim((string)($state['submittedUpdateType'] ?? 'minor')));

        // Read the latest review version HTML
        $manifest = load_doc_manifest($this->rootDir, $baseRel, $archiveDir, $code);
        $versions = $manifest['versions'] ?? [];

        // Find the in_review version file
        $reviewFile = null;
        foreach ($versions as $v) {
            if (is_array($v) && in_array(($v['status'] ?? ''), ['in_review', 'draft'], true)) {
                $file = (string)($v['file'] ?? '');
                if ($file !== '') {
                    try {
                        $absFile = join_in_root($this->rootDir, $file);
                        if (is_file($absFile)) {
                            $reviewFile = $absFile;
                            break;
                        }
                    } catch (Throwable $e) {
                        // skip
                    }
                }
            }
        }

        // Publish the approved version to the live file
        $liveFile = join_in_root($this->rootDir, $baseRel);
        if ($reviewFile !== null && is_file($reviewFile)) {
            $html = (string)@file_get_contents($reviewFile);
            $html = strip_base_href_archive($html);
            $html = sync_doc_header_html($html, $revision, $effectiveDate !== '' ? $effectiveDate : null);
            $html = portal_sync_doc_title_blocks($html, $code, trim((string)($data['title'] ?? '')));
            @file_put_contents($liveFile, $html, LOCK_EX);
        }

        // Store approved version in archive
        if (is_file($liveFile)) {
            $approvedHtml = (string)@file_get_contents($liveFile);
            store_version_file($baseRel, $revision, 'approved', $this->rootDir, $approvedHtml);
        }

        // Update state
        $state['status']           = 'approved';
        $state['has_release']      = true;
        $state['released_revision'] = $revision;
        $state['approved_by']      = (string)($me['name'] ?? $me['username'] ?? '');
        $state['approved_date']    = $this->nowIso();
        if ($effectiveDate !== '') $state['effective_date'] = $effectiveDate;
        // Remove transient fields
        foreach (['lastEdit', 'submittedBy', 'submittedDate', 'submittedUpdateType', 'rejectedBy', 'rejectedDate', 'checked_out_by'] as $k) {
            unset($state[$k]);
        }
        save_doc_state($this->rootDir, $baseRel, $state);

        // Update manifest
        array_unshift($versions, [
            'status'  => 'approved',
            'version' => 'v' . $revision,
            'date'    => $this->humanDt(),
            'by'      => (string)($me['name'] ?? $me['username'] ?? ''),
            'file'    => $baseRel,
            'note'    => $note ?: 'Approved',
        ]);
        $manifest['versions'] = $versions;
        save_doc_manifest($this->rootDir, $baseRel, $manifest);

        // Update custom docs
        $customDocsFile = $this->confDir . '/docs_custom.json';
        patch_custom_doc_entries($customDocsFile, $code, [
            'status' => 'approved',
            'rev'    => $revision,
        ]);
        $this->invalidateScanCache();

        $this->auditLog('doc_approve', ['code' => $code, 'revision' => $revision]);
        $this->success(['status' => 'approved', 'revision' => $revision]);
    }

    /**
     * POST reject — Reject a document review submission.
     *
     * Legacy action: `doc_reject`
     *
     * @return never
     */
    public function reject(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        require_doc_workflow_approver($me);

        $data   = $this->jsonBody();
        $code   = strtoupper(trim((string)($data['code'] ?? '')));
        $path   = trim((string)($data['path'] ?? ''));
        $reason = trim((string)($data['reason'] ?? ''));

        if ($code === '') $this->error('missing_code', 400);
        if ($path === '') $this->error('missing_path', 400);

        $baseRel    = safe_rel_path($path);
        $archiveDir = $this->rootDir . '/archive';

        $state = load_doc_state($this->rootDir, $baseRel, $archiveDir, $code);
        if (!$state) $this->error('doc_not_found', 404);

        $revision = (string)($state['revision'] ?? '0.0');

        // Revert to draft
        $state['status']       = 'draft';
        $state['rejectedBy']   = (string)($me['name'] ?? $me['username'] ?? '');
        $state['rejectedDate'] = $this->nowIso();
        unset($state['submittedBy'], $state['submittedDate'], $state['submittedUpdateType']);
        save_doc_state($this->rootDir, $baseRel, $state);

        // Update manifest
        $manifest = load_doc_manifest($this->rootDir, $baseRel, $archiveDir, $code);
        $versions = $manifest['versions'] ?? [];
        array_unshift($versions, [
            'status'  => 'rejected',
            'version' => 'v' . $revision,
            'date'    => $this->humanDt(),
            'by'      => (string)($me['name'] ?? $me['username'] ?? ''),
            'note'    => $reason ?: 'Rejected',
        ]);
        $manifest['versions'] = $versions;
        save_doc_manifest($this->rootDir, $baseRel, $manifest);

        // Update custom docs
        $customDocsFile = $this->confDir . '/docs_custom.json';
        patch_custom_doc_entries($customDocsFile, $code, ['status' => 'draft']);

        $this->auditLog('doc_reject', ['code' => $code, 'reason' => $reason]);
        $this->success(['status' => 'draft', 'revision' => $revision]);
    }

    /**
     * POST updateMeta — Update document metadata (title, owner, etc.).
     *
     * Legacy action: `doc_update_meta`
     *
     * @return never
     */
    public function updateMeta(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        require_doc_workflow_editor($me, $rolePermsFile);

        $data  = $this->jsonBody();
        $code  = strtoupper(trim((string)($data['code'] ?? '')));
        $patch = $data['patch'] ?? $data;

        if ($code === '') $this->error('missing_code', 400);
        if (!is_array($patch)) $this->error('invalid_patch', 400);

        // Only allow safe fields
        $allowed = ['title', 'owner', 'cat', 'effective_date', 'delivery_mode'];
        $safePatch = [];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $patch)) {
                $safePatch[$key] = $patch[$key];
            }
        }

        $customDocsFile = $this->confDir . '/docs_custom.json';
        $changed = patch_custom_doc_entries($customDocsFile, $code, $safePatch);

        if ($changed) {
            $this->invalidateScanCache();
        }

        $this->auditLog('doc_update_meta', ['code' => $code, 'fields' => array_keys($safePatch)]);
        $this->success(['updated' => $changed]);
    }

    /**
     * POST deleteDrafts — Delete all draft versions of a document.
     *
     * Legacy action: `doc_delete_drafts`
     *
     * @return never
     */
    public function deleteDrafts(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data = $this->jsonBody();
        $code = strtoupper(trim((string)($data['code'] ?? '')));
        $path = trim((string)($data['path'] ?? ''));

        if ($code === '') $this->error('missing_code', 400);
        if ($path === '') $this->error('missing_path', 400);

        $baseRel    = safe_rel_path($path);
        $archiveDir = $this->rootDir . '/archive';

        $manifest = load_doc_manifest($this->rootDir, $baseRel, $archiveDir, $code);
        $versions = $manifest['versions'] ?? [];
        $removed  = 0;

        $kept = [];
        foreach ($versions as $v) {
            if (!is_array($v)) continue;
            $st = strtolower((string)($v['status'] ?? ''));
            if ($st === 'draft') {
                // Delete the draft file
                $file = (string)($v['file'] ?? '');
                if ($file !== '') {
                    try {
                        $abs = join_in_root($this->rootDir, $file);
                        if (is_file($abs) && $abs !== join_in_root($this->rootDir, $baseRel)) {
                            @unlink($abs);
                        }
                    } catch (Throwable $e) {
                        // skip
                    }
                }
                $removed++;
                continue;
            }
            $kept[] = $v;
        }

        $manifest['versions'] = $kept;
        save_doc_manifest($this->rootDir, $baseRel, $manifest);

        // Recompute state
        $state = load_doc_state($this->rootDir, $baseRel, $archiveDir, $code) ?? [];
        $state = doc_recompute_release_state($kept, $state);
        save_doc_state($this->rootDir, $baseRel, $state);

        $customDocsFile = $this->confDir . '/docs_custom.json';
        patch_custom_doc_entries($customDocsFile, $code, ['status' => $state['status'] ?? 'draft']);

        $this->auditLog('doc_delete_drafts', ['code' => $code, 'removed' => $removed]);
        $this->success(['removed' => $removed, 'state' => $state]);
    }

    /**
     * POST deleteVersion — Delete a specific version entry.
     *
     * Legacy action: `doc_delete_version`
     *
     * @return never
     */
    public function deleteVersion(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data    = $this->jsonBody();
        $code    = strtoupper(trim((string)($data['code'] ?? '')));
        $path    = trim((string)($data['path'] ?? ''));
        $version = trim((string)($data['version'] ?? ''));

        if ($code === '' || $path === '' || $version === '') {
            $this->error('missing_params', 400);
        }

        $baseRel    = safe_rel_path($path);
        $archiveDir = $this->rootDir . '/archive';

        $manifest = load_doc_manifest($this->rootDir, $baseRel, $archiveDir, $code);
        $versions = $manifest['versions'] ?? [];

        $kept = [];
        $deleted = false;
        foreach ($versions as $v) {
            if (!is_array($v)) continue;
            if (($v['version'] ?? '') === $version && !$deleted) {
                $file = (string)($v['file'] ?? '');
                if ($file !== '' && $file !== $baseRel) {
                    try {
                        $abs = join_in_root($this->rootDir, $file);
                        if (is_file($abs)) @unlink($abs);
                    } catch (Throwable $e) { /* skip */ }
                }
                $deleted = true;
                continue;
            }
            $kept[] = $v;
        }

        $manifest['versions'] = $kept;
        save_doc_manifest($this->rootDir, $baseRel, $manifest);

        $state = load_doc_state($this->rootDir, $baseRel, $archiveDir, $code) ?? [];
        $state = doc_recompute_release_state($kept, $state);
        save_doc_state($this->rootDir, $baseRel, $state);

        $this->auditLog('doc_delete_version', ['code' => $code, 'version' => $version]);
        $this->success(['deleted' => $deleted, 'state' => $state]);
    }

    /**
     * GET listVersions — List all version entries for a document.
     *
     * Legacy action: `doc_versions_list`
     *
     * @return never
     */
    public function listVersions(): never
    {
        $me = $this->requireAuth();

        $code = strtoupper(trim((string)($this->query('code') ?? '')));
        $path = trim((string)($this->query('path') ?? ''));

        if ($code === '') $this->error('missing_code', 400);
        if ($path === '') $this->error('missing_path', 400);

        $baseRel    = safe_rel_path($path);
        $archiveDir = $this->rootDir . '/archive';

        $manifest = load_doc_manifest($this->rootDir, $baseRel, $archiveDir, $code);
        $state    = load_doc_state($this->rootDir, $baseRel, $archiveDir, $code);

        $this->success([
            'code'     => $code,
            'versions' => $manifest['versions'] ?? [],
            'state'    => $state,
        ]);
    }

    /**
     * POST startNewRevision — Start a new revision cycle for a document.
     *
     * Legacy action: `doc_start_new_revision`
     *
     * @return never
     */
    public function startNewRevision(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        require_doc_workflow_editor($me, $rolePermsFile);

        $data       = $this->jsonBody();
        $code       = strtoupper(trim((string)($data['code'] ?? '')));
        $path       = trim((string)($data['path'] ?? ''));
        $updateType = strtolower(trim((string)($data['update_type'] ?? 'minor')));

        if ($code === '') $this->error('missing_code', 400);
        if ($path === '') $this->error('missing_path', 400);

        $baseRel    = safe_rel_path($path);
        $archiveDir = $this->rootDir . '/archive';

        $state = load_doc_state($this->rootDir, $baseRel, $archiveDir, $code);
        if (!$state) $state = ['code' => $code, 'status' => 'draft', 'revision' => '0.0'];

        // Compute next revision
        $currentRev = (string)($state['released_revision'] ?? ($state['revision'] ?? '0.0'));
        $parts = explode('.', $currentRev, 2);
        $major = (int)($parts[0] ?? 0);
        $minor = (int)($parts[1] ?? 0);

        if ($updateType === 'major') {
            $major++;
            $minor = 0;
        } else {
            $minor++;
        }
        $newRevision = $major . '.' . $minor;

        // Read live file and create new draft
        $liveFile = join_in_root($this->rootDir, $baseRel);
        $html = '';
        if (is_file($liveFile)) {
            $html = (string)@file_get_contents($liveFile);
        }

        if ($html !== '') {
            store_version_file($baseRel, $newRevision, 'draft', $this->rootDir, $html);
        }

        $state['status']   = 'draft';
        $state['revision'] = $newRevision;
        $state['lastEdit'] = $this->nowIso();
        save_doc_state($this->rootDir, $baseRel, $state);

        $manifest = load_doc_manifest($this->rootDir, $baseRel, $archiveDir, $code);
        $versions = $manifest['versions'] ?? [];
        array_unshift($versions, [
            'status'  => 'draft',
            'version' => 'v' . $newRevision,
            'date'    => $this->humanDt(),
            'by'      => (string)($me['name'] ?? $me['username'] ?? ''),
            'note'    => ucfirst($updateType) . ' revision started',
        ]);
        $manifest['versions'] = $versions;
        save_doc_manifest($this->rootDir, $baseRel, $manifest);

        $customDocsFile = $this->confDir . '/docs_custom.json';
        patch_custom_doc_entries($customDocsFile, $code, ['status' => 'draft', 'rev' => $newRevision]);

        $this->auditLog('doc_start_new_revision', ['code' => $code, 'revision' => $newRevision]);
        $this->success(['revision' => $newRevision, 'state' => $state]);
    }

    /**
     * GET stream — Stream a document file for viewing/download.
     *
     * Legacy action: `doc_stream`
     *
     * @return never
     */
    public function stream(): never
    {
        $this->requireAuth();

        $path = trim((string)($this->query('path') ?? ''));
        if ($path === '') $this->error('missing_path', 400);

        $relPath = safe_rel_path($path);
        $absPath = join_in_root($this->rootDir, $relPath);

        if (!is_file($absPath)) {
            $this->error('file_not_found', 404);
        }

        $ext  = portal_get_doc_extension($relPath);
        $mime = portal_stream_mime_type($ext);

        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        header('Content-Type: ' . $mime);
        if (portal_stream_can_inline($ext)) {
            header('Content-Disposition: inline');
        } else {
            $fileName = basename($relPath);
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
        }
        header('Content-Length: ' . filesize($absPath));
        header('Cache-Control: private, max-age=300');

        readfile($absPath);
        exit;
    }

    /**
     * GET listCustom — List documents visible to the current user.
     *
     * Legacy action: `docs_custom_list`
     *
     * @return never
     */
    public function listCustom(): never
    {
        $me = $this->requireAuth();

        $customDocsFile      = $this->confDir . '/docs_custom.json';
        $docVisFile          = $this->confDir . '/docs_visibility.json';
        $displayConfigFile   = $this->confDir . '/portal_display_config.json';
        $portalConfigJsFile  = $this->rootDir . '/01-QMS-Portal/scripts/portal/01-data-config.js';

        $docs          = load_custom_docs($customDocsFile);
        $displayConfig = portal_load_display_config($displayConfigFile);
        $hidden        = load_doc_visibility($docVisFile);

        $docs = portal_filter_docs_for_user($docs, $me, $portalConfigJsFile, $hidden, $displayConfig);

        $this->success(['docs' => $docs]);
    }

    /**
     * GET getDescriptions — Get document descriptions from custom docs.
     *
     * Legacy action: `doc_descriptions_get`
     *
     * @return never
     */
    public function getDescriptions(): never
    {
        $this->requireAuth();

        $customDocsFile = $this->confDir . '/docs_custom.json';
        $docs = load_custom_docs($customDocsFile);

        $descriptions = [];
        foreach ($docs as $doc) {
            if (!is_array($doc)) continue;
            $code = strtoupper(trim((string)($doc['code'] ?? '')));
            if ($code !== '' && isset($doc['description'])) {
                $descriptions[$code] = (string)$doc['description'];
            }
        }

        $this->success(['descriptions' => $descriptions]);
    }

    /**
     * POST saveDescription — Save a document description.
     *
     * Legacy action: `save_doc_description`
     *
     * @return never
     */
    public function saveDescription(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $data = $this->jsonBody();
        $code = strtoupper(trim((string)($data['code'] ?? '')));
        $desc = trim((string)($data['description'] ?? ''));

        if ($code === '') $this->error('missing_code', 400);

        $customDocsFile = $this->confDir . '/docs_custom.json';
        patch_custom_doc_entries($customDocsFile, $code, ['description' => $desc]);

        $this->auditLog('save_doc_description', ['code' => $code]);
        $this->success();
    }

    /**
     * GET getVisibility — Get hidden document codes.
     *
     * Legacy action: `docs_visibility_get`
     *
     * @return never
     */
    public function getVisibility(): never
    {
        $this->requireAuth();

        $docVisFile = $this->confDir . '/docs_visibility.json';
        $hidden = load_doc_visibility($docVisFile);

        $this->success(['hidden' => $hidden]);
    }

    /**
     * POST saveVisibility — Save document visibility settings.
     *
     * Legacy action: `admin_docs_visibility_save`
     *
     * @return never
     */
    public function saveVisibility(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data     = $this->jsonBody();
        $hiddenIn = $data['hidden'] ?? null;
        if (!is_array($hiddenIn)) $this->error('invalid_hidden', 400);

        $clean = [];
        foreach ($hiddenIn as $c) {
            $code = $this->sanitizeCode((string)$c);
            if ($code !== '') $clean[] = $code;
        }

        $docVisFile = $this->confDir . '/docs_visibility.json';
        save_doc_visibility($docVisFile, $clean);

        $this->auditLog('admin_docs_visibility_save', ['count' => count($clean)]);
        $this->success(['hidden' => array_values(array_unique($clean))]);
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Try to resolve a subfolder matching the doc code pattern.
     *
     * @param string $folder Base folder (modified by reference).
     * @param string $code   Document code.
     * @return void
     */
    private function resolveSubfolder(string &$folder, string $code): void
    {
        $parentAbs = $this->rootDir . '/' . $folder;
        $keywords  = [];

        if (preg_match('/^PROC-([A-Z]+)/i', $code, $pm)) $keywords[] = 'PROC-' . strtoupper($pm[1]);
        if (preg_match('/JD-([A-Z]+)/i', $code, $jm)) $keywords = ['JD-' . strtoupper($jm[1]), 'Job-Descriptions'];
        if (preg_match('/^FRM-([A-Z]+)/i', $code, $fm)) $keywords[] = 'FRM-' . strtoupper($fm[1]);
        if (preg_match('/^ANNEX-([A-Z]+)/i', $code, $am)) $keywords[] = 'ANNEX-' . strtoupper($am[1]);
        if (preg_match('/^WI-([A-Z]+)/i', $code, $wm)) $keywords[] = 'WI-' . strtoupper($wm[1]);

        if (empty($keywords) || !is_dir($parentAbs)) {
            return;
        }

        foreach ((array)@scandir($parentAbs) as $sub1) {
            if ($sub1[0] === '.' || $sub1 === '_Archive') continue;
            $sub1Abs = $parentAbs . '/' . $sub1;
            if (!is_dir($sub1Abs)) continue;
            foreach ($keywords as $kw) {
                if (stripos($sub1, $kw) !== false) {
                    $folder .= '/' . $sub1;
                    return;
                }
            }
            foreach ((array)@scandir($sub1Abs) as $sub2) {
                if ($sub2[0] === '.' || $sub2 === '_Archive') continue;
                if (!is_dir($sub1Abs . '/' . $sub2)) continue;
                foreach ($keywords as $kw) {
                    if (stripos($sub2, $kw) !== false) {
                        $folder .= '/' . $sub1 . '/' . $sub2;
                        return;
                    }
                }
            }
        }
    }

    /**
     * Create the initial HTML for a new document.
     *
     * @param string $code   Document code.
     * @param string $title  Document title.
     * @param string $owner  Document owner.
     * @param string $folder Relative folder path.
     * @return string HTML content.
     */
    private function createDocHtml(string $code, string $title, string $owner, string $folder): string
    {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeCode  = htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $folderTrim = trim($folder, '/');
        $depth = ($folderTrim === '') ? 0 : count(array_filter(explode('/', $folderTrim)));
        $rootBase  = str_repeat('../', $depth);
        $rootHref  = $rootBase . '01-QMS-Portal/portal.html';
        $assetsCss = $rootBase . 'assets/style.css';
        $assetsJs  = $rootBase . 'assets/app.js';
        $logoHref  = $rootBase . 'assets/hesem-logo.svg';
        $ownerHtml = $this->buildHeaderActorClusterHtml($rootBase, $owner !== '' ? $owner : 'QA/QMS', true);
        $approverHtml = $this->buildHeaderActorClusterHtml($rootBase, 'CEO', false);

        return '<!DOCTYPE html>' . "\n" .
            '<html lang="vi">' . "\n" .
            '<head>' . "\n" .
            '  <meta charset="utf-8"/>' . "\n" .
            '  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>' . "\n" .
            '  <title>' . $safeCode . ' - ' . $safeTitle . ' | HESEM QMS</title>' . "\n" .
            '  <link rel="stylesheet" href="' . $assetsCss . '"/>' . "\n" .
            '</head>' . "\n" .
            '<body>' . "\n" .
            '<div class="container"><div class="page"><div class="page-body"><div class="form-header">' . "\n" .
            '<div class="fh-left"> <a class="brand-logo" href="' . $rootHref . '"><img alt="HESEM Logo" src="' . $logoHref . '"/></a>' . "\n" .
            '</div>' . "\n" .
            '<div class="title"> <strong class="doc-name">' . $safeTitle . '</strong>' . "\n" .
            '<span class="sub-vn">T&agrave;i li&#7879;u m&#7899;i (Draft)</span> <span class="muted">So&#7841;n th&#7843;o n&#7897;i dung theo y&ecirc;u c&#7847;u ISO/QMS.</span> </div>' . "\n" .
            '<div class="meta">' . "\n" .
            '<div class="row"><span><b>M&atilde;:</b></span><span class="doc-code">' . $safeCode . '</span></div>' . "\n" .
            '<div class="row"><span><b>Phi&ecirc;n b&#7843;n:</b></span><span>V0</span></div>' . "\n" .
            '<div class="row"><span><b>Ng&agrave;y hi&#7879;u l&#7921;c:</b></span><span>Theo quy&#7871;t &#273;&#7883;nh ban h&agrave;nh</span></div>' . "\n" .
            '<div class="row"><span><b>Ch&#7911; s&#7903; h&#7919;u:</b></span><span>' . $ownerHtml . '</span></div>' . "\n" .
            '<div class="row"><span><b>Ph&ecirc; duy&#7879;t:</b></span><span>' . $approverHtml . '</span></div>' . "\n" .
            '</div>' . "\n" .
            '</div><div class="doc-content" id="docContent"><div class="form-sheet">' . "\n" .
            '<div class="card">' . "\n" .
            '  <div class="badge"><span class="dot"></span>' . $safeCode . '</div>' . "\n" .
            '  <h1 class="h1" style="margin-top:10px">' . $safeCode . ' - ' . $safeTitle . '</h1>' . "\n" .
            '  <p class="lead">(So&#7841;n th&#7843;o n&#7897;i dung t&#7841;i &#273;&acirc;y...)</p>' . "\n" .
            '</div>' . "\n" .
            '<h2 class="h2">1. M&#7909;c &#273;&iacute;ch</h2>' . "\n" .
            '<p>...</p>' . "\n" .
            '<h2 class="h2">2. Ph&#7841;m vi</h2>' . "\n" .
            '<p>...</p>' . "\n" .
            '<h2 class="h2">3. N&#7897;i dung</h2>' . "\n" .
            '<p>...</p>' . "\n" .
            '</div></div></div></div></div>' . "\n" .
            '<script src="' . $assetsJs . '"></script>' . "\n" .
            '</body>' . "\n" .
            '</html>';
    }

    private function buildHeaderActorClusterHtml(string $rootBase, string $rawValue, bool $allowFallbackCluster): string
    {
        $map = [
            'QA' => ['kind' => 'role', 'code' => 'QA', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html', 'title' => 'QA Manager (Truong bo phan dam bao chat luong)'],
            'QMS' => ['kind' => 'role', 'code' => 'QMS', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html', 'title' => 'QMS Engineer (Ky su he thong QMS)'],
            'CEO' => ['kind' => 'role', 'code' => 'CEO', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html', 'title' => 'Chief Executive Officer (Tong Giam doc)'],
            'PD' => ['kind' => 'role', 'code' => 'PD', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-production-director.html', 'title' => 'Production Director (Giam doc san xuat)'],
            'ENGM' => ['kind' => 'role', 'code' => 'ENGM', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html', 'title' => 'Engineering Lead / Manager (Truong nhom / quan ly ky thuat)'],
            'SCM' => ['kind' => 'role', 'code' => 'SCM', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-supply-chain-manager.html', 'title' => 'Supply Chain Manager (Quan ly chuoi cung ung)'],
            'FIN' => ['kind' => 'role', 'code' => 'FIN', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html', 'title' => 'Finance Manager (Quan ly tai chinh)'],
            'HR' => ['kind' => 'role', 'code' => 'HR', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/08-JD-HR/jd-hr-manager.html', 'title' => 'HR Manager (Quan ly nhan su)'],
            'EHS' => ['kind' => 'role', 'code' => 'EHS', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/09-JD-EHS/jd-ehs-specialist.html', 'title' => 'EHS Specialist (Chuyen vien EHS)'],
            'QC' => ['kind' => 'role', 'code' => 'QC', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/04-JD-Quality/jd-qc-inspector-cmm-programmer-operator.html', 'title' => 'QC Inspector / CMM Programmer-Operator (Nhan vien QC / lap trinh vien - van hanh CMM)'],
            'CS' => ['kind' => 'role', 'code' => 'CS', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/06-JD-Sales/jd-customer-service.html', 'title' => 'Customer Service (Nhan vien dich vu khach hang)'],
            'EST' => ['kind' => 'role', 'code' => 'EST', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/06-JD-Sales/jd-estimator.html', 'title' => 'Estimator (Nhan vien bao gia)'],
            'D-ENG' => ['kind' => 'dept', 'code' => 'D-ENG', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-engineering-handbook.html', 'title' => 'Engineering Department (Phong Ky thuat)'],
            'D-HR' => ['kind' => 'dept', 'code' => 'D-HR', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-hr-handbook.html', 'title' => 'Human Resources Department (Phong Nhan su)'],
            'D-SCS' => ['kind' => 'dept', 'code' => 'D-SCS', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-sales-and-customer-service-handbook.html', 'title' => 'Sales and Customer Service Department (Phong Kinh doanh va Dich vu khach hang)'],
            'D-SCM' => ['kind' => 'dept', 'code' => 'D-SCM', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-supply-chain-handbook.html', 'title' => 'Supply Chain Department (Phong Chuoi cung ung)'],
            'D-WHS' => ['kind' => 'dept', 'code' => 'D-WHS', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-supply-chain-handbook.html', 'title' => 'Warehouse Function (Bo phan Kho)'],
            'D-FIN' => ['kind' => 'dept', 'code' => 'D-FIN', 'path' => '02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/dept-finance-handbook.html', 'title' => 'Finance Department (Phong Tai chinh)'],
        ];

        $normalized = strtoupper(trim($rawValue));
        $normalized = preg_replace('/\s+/', '', $normalized);
        $tokens = preg_split('/[+,\/|]+/', (string)$normalized) ?: [];
        $chips = [];

        foreach ($tokens as $token) {
            if ($token === '' || !isset($map[$token])) {
                continue;
            }
            $entry = $map[$token];
            $href = htmlspecialchars($rootBase . $entry['path'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $title = htmlspecialchars($entry['title'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $code = htmlspecialchars($entry['code'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $linkClass = $entry['kind'] === 'dept' ? 'entity-link dept-link' : 'entity-link role-link';
            $codeClass = $entry['kind'] === 'dept' ? 'entity-code dept-code' : 'entity-code role-code';
            $chips[] = '<a class="' . $linkClass . '" href="' . $href . '" title="' . $title . '"><span class="' . $codeClass . '">' . $code . '</span></a>';
        }

        if (!$chips && $allowFallbackCluster) {
            return $this->buildHeaderActorClusterHtml($rootBase, 'QA/QMS', false);
        }
        if (!$chips) {
            $chips[] = '<a class="entity-link role-link" href="' . htmlspecialchars($rootBase . '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '" title="Chief Executive Officer (Tong Giam doc)"><span class="entity-code role-code">CEO</span></a>';
        }

        return '<span class="entity-cluster role-cluster">' . implode('<span class="entity-sep role-sep">/</span>', $chips) . '</span>';
    }

    /**
     * POST docsSnapshot — Batch-fetch document/form states for a list of codes.
     *
     * Legacy action: `docs_snapshot`
     *
     * Accepts JSON body: { docs: [{ code, base_path|path }, ...] }
     * Returns: { states: { CODE: stateObj, ... }, server_time: "..." }
     *
     * @return never
     */
    public function docsSnapshot(): never
    {
        $this->requireAuth();

        // Release session lock early — this action can be heavy.
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        $data = $this->jsonBody();
        $docs = $data['docs'] ?? [];
        if (!is_array($docs)) $docs = [];

        $registryFile = $this->confDir . '/form_control_registry.json';
        $archiveDir   = $this->rootDir . '/archive';

        $out = [];
        foreach ($docs as $d) {
            if (!is_array($d)) continue;
            $code     = (string)($d['code'] ?? '');
            $basePath = (string)($d['base_path'] ?? ($d['path'] ?? ''));
            if ($code === '') continue;
            if (trim($basePath) === '') continue;

            // Try form registry first
            $formEntry = form_registry_get_entry($registryFile, $code, $basePath);
            if (is_array($formEntry)) {
                $st = form_load_state_existing($this->dataDir, (string)$formEntry['code']);
                if (!is_array($st)) $st = form_state_fallback_from_registry($formEntry);
                $out[$code] = $st;
                continue;
            }

            // Fall back to document state
            $st = load_doc_state($this->rootDir, $basePath, $archiveDir, $code);
            if ($st) {
                $out[$code] = $st;
            }
        }

        $this->success(['states' => $out, 'server_time' => $this->nowIso()]);
    }
}
