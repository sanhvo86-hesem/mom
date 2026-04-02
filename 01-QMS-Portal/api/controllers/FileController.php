<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use FilesystemIterator;
use RuntimeException;
use Throwable;

/**
 * File and folder management controller for HESEM QMS Portal.
 *
 * Handles filesystem scanning, folder CRUD, document move/rename/delete,
 * and folder descriptions.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   2.0.0
 */
class FileController extends BaseController
{
    /**
     * GET scanFolders â€” Scan the filesystem tree and return document listing.
     *
     * Legacy action: `scan_folders`
     *
     * @return never
     */
    public function scanFolders(): never
    {
        $me = $this->requireAuth();

        $displayConfigFile  = $this->confDir . '/portal_display_config.json';
        $displayConfig      = portal_load_display_config($displayConfigFile);
        $enabledExtensions  = portal_display_config_enabled_extensions($displayConfig);
        $portalConfigJsFile = $this->rootDir . '/01-QMS-Portal/scripts/portal/01-data-config.js';
        $docVisFile         = $this->confDir . '/docs_visibility.json';
        $customDocsFile     = $this->confDir . '/docs_custom.json';
        $formRegistryFile   = $this->confDir . '/form_control_registry.json';

        // Use cached scan if available and fresh
        $cacheFile = $this->dataDir . '/scan_cache.json';
        $cacheTtl  = 120; // seconds
        if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
            $cached = $this->readJsonFile($cacheFile);
            if (is_array($cached) && !empty($cached['docs'])) {
                $hidden = load_doc_visibility($docVisFile);
                $docs   = portal_filter_docs_for_user(
                    $cached['docs'] ?? [],
                    $me,
                    $portalConfigJsFile,
                    $hidden,
                    $displayConfig
                );
                $this->success([
                    'docs'    => $docs,
                    'folders' => $cached['folders'] ?? [],
                    'cached'  => true,
                ]);
            }
        }

        // Full filesystem scan
        $scanDirs = [
            '02-Tai-Lieu-He-Thong',
            '03-Tai-Lieu-Van-Hanh',
            '04-Bieu-Mau',
            '10-Training-Academy',
        ];

        $allDocs   = [];
        $allFolders = [];

        foreach ($scanDirs as $scanDir) {
            $absDir = $this->rootDir . '/' . $scanDir;
            if (!is_dir($absDir)) continue;

            $topCat = scan_derive_cat($scanDir);

            try {
                $it = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($absDir, FilesystemIterator::SKIP_DOTS),
                    RecursiveIteratorIterator::SELF_FIRST
                );
            } catch (Throwable $e) {
                $this->rethrowResponse($e);
                continue;
            }

            foreach ($it as $item) {
                try {
                    $itemPath = str_replace('\\', '/', $item->getPathname());
                } catch (Throwable $e) {
                    $this->rethrowResponse($e);
                    continue;
                }

                $relPath = ltrim(substr($itemPath, strlen(str_replace('\\', '/', $this->rootDir))), '/');

                if ($item->isDir()) {
                    $dirName = basename($relPath);
                    if ($dirName === '_Archive' || $dirName === '_Deleted' || $dirName[0] === '.') {
                        continue;
                    }
                    $allFolders[] = $relPath;
                    continue;
                }

                if (!$item->isFile()) continue;

                $fileName = basename($relPath);
                if ($fileName[0] === '.' || $fileName[0] === '_') continue;
                if (str_contains($relPath, '/_Archive/') || str_contains($relPath, '/_Deleted/')) continue;

                $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                if (!in_array($ext, $enabledExtensions, true)) continue;

                $folderRel = dirname($relPath);
                $subName   = basename($folderRel);
                $docCat    = scan_classify_doc_cat($topCat, $subName, $fileName);
                $docCode   = scan_extract_code($fileName);

                // Load workflow state if available
                $stateData = load_doc_state($this->rootDir, $relPath, $this->rootDir . '/archive', $docCode);
                $status    = 'approved';
                $revision  = '0';
                if (is_array($stateData)) {
                    $status   = strtolower(trim((string)($stateData['status'] ?? 'approved')));
                    $revision = portal_normalize_revision_value((string)($stateData['revision'] ?? '0'));
                }

                $allDocs[] = [
                    'code'     => $docCode,
                    'title'    => portal_standard_title_from_filename($fileName, $docCode),
                    'cat'      => $docCat,
                    'path'     => $relPath,
                    'folder'   => $folderRel,
                    'ext'      => $ext,
                    'rev'      => $revision,
                    'status'   => $status,
                    'owner'    => '',
                ];
            }
        }

        // Merge form-registered docs
        $formDocs = load_form_control_registry_docs($formRegistryFile, $this->rootDir, $enabledExtensions);
        $allDocs = array_merge($allDocs, $formDocs);

        // Merge custom docs
        $customDocs = load_custom_docs($customDocsFile);
        $allDocs = array_merge($allDocs, $customDocs);

        // Deduplicate
        $allDocs = portal_dedupe_docs($allDocs);

        // Cache the result
        $this->writeJsonFile($cacheFile, [
            'docs'       => $allDocs,
            'folders'    => $allFolders,
            'scanned_at' => $this->nowIso(),
        ]);

        // Filter for user
        $hidden = load_doc_visibility($docVisFile);
        $docs = portal_filter_docs_for_user($allDocs, $me, $portalConfigJsFile, $hidden, $displayConfig);

        $this->success([
            'docs'    => $docs,
            'folders' => $allFolders,
            'cached'  => false,
        ]);
    }

    /**
     * POST createFolder â€” Create a new folder in the document tree.
     *
     * Legacy action: `create_folder`
     *
     * @return never
     */
    public function createFolder(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        require_doc_workflow_editor($me, $rolePermsFile);

        $data   = $this->jsonBody();
        $parent = trim((string)($data['parent'] ?? ''));
        $name   = trim((string)($data['name'] ?? ''));

        if ($name === '') $this->error('missing_name', 400);

        // Sanitize folder name
        $name = preg_replace('/[^A-Za-z0-9._\- ]+/', '-', $name);
        $name = trim((string)$name, '.- ');
        if ($name === '' || strlen($name) > 120) {
            $this->error('invalid_name', 400);
        }

        $relPath = $parent !== '' ? (safe_rel_path($parent) . '/' . $name) : $name;
        if (is_reserved_root_segment($relPath)) {
            $this->error('reserved_path', 403);
        }

        $absPath = join_in_root($this->rootDir, $relPath);
        if (is_dir($absPath)) {
            $this->error('folder_exists', 409);
        }

        if (!@mkdir($absPath, 0775, true)) {
            $this->error('create_failed', 500);
        }

        $this->invalidateScanCache();
        $this->auditLog('create_folder', ['path' => $relPath]);
        $this->success(['path' => $relPath]);
    }

    /**
     * POST renameFolder â€” Rename a folder.
     *
     * Legacy action: `rename_folder`
     *
     * @return never
     */
    public function renameFolder(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data    = $this->jsonBody();
        $path    = trim((string)($data['path'] ?? ''));
        $newName = trim((string)($data['new_name'] ?? ''));

        if ($path === '' || $newName === '') {
            $this->error('missing_params', 400);
        }

        $relPath = safe_rel_path($path);
        if (is_reserved_root_segment($relPath)) {
            $this->error('reserved_path', 403);
        }

        $absPath = join_in_root($this->rootDir, $relPath);
        if (!is_dir($absPath)) {
            $this->error('folder_not_found', 404);
        }

        $newName = preg_replace('/[^A-Za-z0-9._\- ]+/', '-', $newName);
        $newName = trim((string)$newName, '.- ');
        if ($newName === '' || strlen($newName) > 120) {
            $this->error('invalid_name', 400);
        }

        $parentDir = dirname($relPath);
        $newRel    = ($parentDir !== '.' && $parentDir !== '' ? $parentDir . '/' : '') . $newName;
        $newAbs    = join_in_root($this->rootDir, $newRel);

        if (is_dir($newAbs) || is_file($newAbs)) {
            $this->error('name_conflict', 409);
        }

        if (!move_dir_fallback($absPath, $newAbs)) {
            $this->error('rename_failed', 500);
        }

        // Update custom docs paths
        $customDocsFile = $this->confDir . '/docs_custom.json';
        $custom = load_custom_docs($customDocsFile);
        $changed = false;
        foreach ($custom as &$doc) {
            if (!is_array($doc)) continue;
            $docPath = (string)($doc['path'] ?? '');
            if ($docPath !== '' && path_equals_or_child($docPath, $relPath)) {
                $doc['path'] = replace_path_prefix($docPath, $relPath, $newRel);
                $doc['folder'] = replace_path_prefix((string)($doc['folder'] ?? ''), $relPath, $newRel);
                $changed = true;
            }
        }
        unset($doc);
        if ($changed) {
            save_custom_docs($customDocsFile, $custom);
        }

        $this->invalidateScanCache();
        $this->auditLog('rename_folder', ['old' => $relPath, 'new' => $newRel]);
        $this->success(['old_path' => $relPath, 'new_path' => $newRel]);
    }

    /**
     * POST deleteFolder â€” Delete a folder (moves to _Deleted).
     *
     * Legacy action: `delete_folder`
     *
     * @return never
     */
    public function deleteFolder(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data = $this->jsonBody();
        $path = trim((string)($data['path'] ?? ''));

        if ($path === '') $this->error('missing_path', 400);

        $relPath = safe_rel_path($path);
        if (is_reserved_root_segment($relPath)) {
            $this->error('reserved_path', 403);
        }

        $absPath = join_in_root($this->rootDir, $relPath);
        if (!is_dir($absPath)) {
            $this->error('folder_not_found', 404);
        }

        // Move to _Deleted instead of permanent deletion
        $deletedDir = $this->rootDir . '/_Deleted';
        ensure_dir($deletedDir);

        $destName = basename($relPath) . '_' . gmdate('Ymd_His');
        $destPath = $deletedDir . '/' . $destName;

        if (!move_dir_fallback($absPath, $destPath)) {
            $this->error('delete_failed', 500);
        }

        $this->invalidateScanCache();
        $this->auditLog('delete_folder', ['path' => $relPath]);
        $this->success(['deleted' => $relPath]);
    }

    /**
     * POST moveDoc â€” Move a document to a different folder.
     *
     * Legacy action: `move_doc`
     *
     * @return never
     */
    public function moveDoc(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        require_doc_workflow_editor($me, $rolePermsFile);

        $data      = $this->jsonBody();
        $code      = strtoupper(trim((string)($data['code'] ?? '')));
        $path      = trim((string)($data['path'] ?? ''));
        $destFolder = trim((string)($data['dest_folder'] ?? ''));

        if ($code === '' || $path === '' || $destFolder === '') {
            $this->error('missing_params', 400);
        }

        $srcRel    = safe_rel_path($path);
        $destRel   = safe_rel_path($destFolder);
        $srcAbs    = join_in_root($this->rootDir, $srcRel);
        $fileName  = basename($srcRel);
        $newRel    = $destRel . '/' . $fileName;
        $destAbs   = join_in_root($this->rootDir, $newRel);

        if (!is_file($srcAbs)) $this->error('file_not_found', 404);

        $destDirAbs = join_in_root($this->rootDir, $destRel);
        ensure_dir($destDirAbs);

        if (is_file($destAbs)) {
            $this->error('file_exists', 409);
        }

        if (!@rename($srcAbs, $destAbs)) {
            if (!@copy($srcAbs, $destAbs)) {
                $this->error('move_failed', 500);
            }
            @unlink($srcAbs);
        }

        // Move archive assets
        try {
            rename_doc_store_assets($this->rootDir, $srcRel, $newRel, $code);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            // Non-fatal
        }

        // Update custom docs
        $customDocsFile = $this->confDir . '/docs_custom.json';
        patch_custom_doc_entries($customDocsFile, $code, [
            'path'   => $newRel,
            'folder' => $destRel,
        ]);

        $this->invalidateScanCache();
        $this->auditLog('move_doc', ['code' => $code, 'from' => $srcRel, 'to' => $newRel]);
        $this->success(['old_path' => $srcRel, 'new_path' => $newRel]);
    }

    /**
     * POST deleteDoc â€” Archive (soft-delete) a document.
     *
     * Legacy action: `delete_doc`
     *
     * @return never
     */
    public function deleteDoc(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        if (!role_can_create_docs($me, $rolePermsFile)) {
            $this->error('forbidden', 403);
        }

        $data = $this->jsonBody();
        $code = strtoupper(trim((string)($data['code'] ?? '')));
        if ($code === '' || !preg_match('/^[A-Z0-9-]{3,40}$/', $code)) {
            $this->error('missing_code', 400);
        }

        // Find the document file
        $customDocsFile = $this->confDir . '/docs_custom.json';
        $custom = load_custom_docs($customDocsFile);
        $docPath = '';
        foreach ($custom as $d) {
            if (is_array($d) && strtoupper((string)($d['code'] ?? '')) === $code) {
                $docPath = (string)($d['path'] ?? '');
                break;
            }
        }

        if ($docPath !== '') {
            try {
                $absPath = join_in_root($this->rootDir, safe_rel_path($docPath));
                if (is_file($absPath)) {
                    // Move to _Deleted
                    $deletedDir = $this->rootDir . '/_Deleted';
                    ensure_dir($deletedDir);
                    $destName = basename($docPath) . '_' . gmdate('Ymd_His');
                    @rename($absPath, $deletedDir . '/' . $destName);
                }
            } catch (Throwable $e) {
                $this->rethrowResponse($e);
                // Non-fatal; continue to remove from registry
            }
        }

        // Remove from custom docs
        $custom = array_values(array_filter($custom, function ($d) use ($code) {
            return !is_array($d) || strtoupper((string)($d['code'] ?? '')) !== $code;
        }));
        save_custom_docs($customDocsFile, $custom);

        $this->invalidateScanCache();
        $this->auditLog('delete_doc', ['code' => $code]);
        $this->success(['deleted' => $code]);
    }

    /**
     * POST renameDoc â€” Rename a document file.
     *
     * Legacy action: `rename_doc`
     *
     * @return never
     */
    public function renameDoc(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();

        $rolePermsFile = $this->confDir . '/role_permissions.json';
        require_doc_workflow_editor($me, $rolePermsFile);

        $data    = $this->jsonBody();
        $code    = strtoupper(trim((string)($data['code'] ?? '')));
        $path    = trim((string)($data['path'] ?? ''));
        $newName = trim((string)($data['new_name'] ?? ''));

        if ($code === '' || $path === '' || $newName === '') {
            $this->error('missing_params', 400);
        }

        $srcRel = safe_rel_path($path);
        $srcAbs = join_in_root($this->rootDir, $srcRel);

        if (!is_file($srcAbs)) $this->error('file_not_found', 404);

        // Sanitize new name (keep extension)
        $ext = pathinfo($srcRel, PATHINFO_EXTENSION);
        $newName = preg_replace('/[^A-Za-z0-9._\- ]+/', '-', $newName);
        $newName = trim((string)$newName, '.- ');
        if ($newName === '') $this->error('invalid_name', 400);

        if (!str_ends_with(strtolower($newName), '.' . strtolower($ext))) {
            $newName .= '.' . $ext;
        }

        $dir    = dirname($srcRel);
        $newRel = ($dir !== '.' && $dir !== '' ? $dir . '/' : '') . $newName;
        $newAbs = join_in_root($this->rootDir, $newRel);

        if ($newAbs === $srcAbs) $this->success(['path' => $newRel]); // No-op

        if (is_file($newAbs)) $this->error('name_conflict', 409);

        if (!@rename($srcAbs, $newAbs)) {
            $this->error('rename_failed', 500);
        }

        // Update archive assets
        $newCode = scan_extract_code($newName);
        try {
            rename_doc_store_assets($this->rootDir, $srcRel, $newRel, $newCode !== '' ? $newCode : $code);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            // Non-fatal
        }

        // Update custom docs
        $customDocsFile = $this->confDir . '/docs_custom.json';
        patch_custom_doc_entries($customDocsFile, $code, [
            'path' => $newRel,
        ]);

        $this->invalidateScanCache();
        $this->auditLog('rename_doc', ['code' => $code, 'old' => $srcRel, 'new' => $newRel]);
        $this->success(['old_path' => $srcRel, 'new_path' => $newRel]);
    }

    /**
     * GET getFolderDescriptions â€” Get descriptions for folders.
     *
     * Legacy action: `folder_descriptions`
     *
     * @return never
     */
    public function getFolderDescriptions(): never
    {
        $this->requireAuth();

        $descFile = $this->confDir . '/folder_descriptions.json';
        $descriptions = $this->readJsonFile($descFile) ?? [];

        $this->success(['descriptions' => $descriptions]);
    }
}
