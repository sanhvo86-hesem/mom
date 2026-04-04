<?php
declare(strict_types=1);

function form_is_workbook_extension(string $ext): bool {
  return in_array(strtolower(trim($ext)), ['xlsx', 'xlsm', 'xls', 'csv'], true);
}

function form_extension_from_path(string $path): string {
  return strtolower(pathinfo((string)$path, PATHINFO_EXTENSION));
}

function form_normalize_revision(string $value, string $default = '0'): string {
  $value = trim($value);
  $value = preg_replace('/^[vV]\s*/', '', $value);
  if ($value === '') return $default;
  if (!preg_match('/^\d+(?:\.\d+)?$/', $value)) return $default;
  return $value;
}

function form_registry_load(string $file): array {
  $json = read_json_file($file);
  return is_array($json) ? $json : [];
}

function form_registry_save(string $file, array $registry): void {
  write_json_file($file, $registry);
}

function form_registry_get_entry(string $file, string $code, string $baseRel = ''): ?array {
  $registry = form_registry_load($file);
  $code = strtoupper(trim($code));
  $baseRel = trim(str_replace('\\', '/', $baseRel));
  foreach ($registry as $entry) {
    if (!is_array($entry)) continue;
    $entryCode = strtoupper(trim((string)($entry['code'] ?? '')));
    $entryPath = trim(str_replace('\\', '/', (string)($entry['path'] ?? '')));
    if ($entryCode === '') continue;
    if ($code !== '' && $entryCode === $code) return $entry;
    if ($baseRel !== '' && $entryPath === $baseRel) return $entry;
  }
  return null;
}

function form_registry_patch_entry(string $file, string $code, array $patch): ?array {
  $registry = form_registry_load($file);
  $code = strtoupper(trim($code));
  $updated = null;
  foreach ($registry as $idx => $entry) {
    if (!is_array($entry)) continue;
    if (strtoupper(trim((string)($entry['code'] ?? ''))) !== $code) continue;
    $registry[$idx] = array_merge($entry, $patch);
    $updated = $registry[$idx];
    break;
  }
  if (is_array($updated)) form_registry_save($file, $registry);
  return $updated;
}

function form_workflow_info(string $dataDir, string $code): array {
  $safeCode = sanitize_code($code);
  $rootAbs = rtrim($dataDir, '/\\') . '/form-workflow/' . $safeCode;
  $filesAbs = $rootAbs . '/files';
  $relRoot = 'form-workflow/' . $safeCode;
  return [
    'code' => $safeCode,
    'rootAbs' => $rootAbs,
    'filesAbs' => $filesAbs,
    'manifestAbs' => $rootAbs . '/manifest.json',
    'stateAbs' => $rootAbs . '/state.json',
    'relRoot' => $relRoot,
  ];
}

function form_state_fallback_from_registry(array $entry): array {
  $owner = trim((string)($entry['owner'] ?? 'QA/QMS')) ?: 'QA/QMS';
  return [
    'code' => strtoupper(trim((string)($entry['code'] ?? ''))),
    'kind' => 'excel_form',
    'status' => strtolower(trim((string)($entry['status'] ?? 'approved'))) ?: 'approved',
    'revision' => form_normalize_revision((string)($entry['rev'] ?? '0'), '0'),
    'released_revision' => form_normalize_revision((string)($entry['rev'] ?? '0'), '0'),
    'has_release' => true,
    'live_path' => trim((string)($entry['path'] ?? '')),
    'owner' => $owner,
    'approver' => trim((string)($entry['approver'] ?? 'General Manager')) ?: 'General Manager',
    'effective_date' => trim((string)($entry['effective_date'] ?? '')),
    'ext' => form_extension_from_path((string)($entry['path'] ?? '')),
    'version_control_model' => trim((string)($entry['version_control_model'] ?? 'v0_registry_checksum_control')),
  ];
}

function form_load_state_existing(string $dataDir, string $code): ?array {
  $info = form_workflow_info($dataDir, $code);
  return read_json_file($info['stateAbs']);
}

function form_save_state(string $dataDir, string $code, array $state): void {
  $info = form_workflow_info($dataDir, $code);
  ensure_dir($info['rootAbs']);
  ensure_dir($info['filesAbs']);
  $state['updated_at'] = now_iso();
  write_json_file($info['stateAbs'], $state);
}

function form_load_manifest_existing(string $dataDir, string $code): ?array {
  $info = form_workflow_info($dataDir, $code);
  return read_json_file($info['manifestAbs']);
}

function form_save_manifest(string $dataDir, string $code, array $manifest): void {
  $info = form_workflow_info($dataDir, $code);
  ensure_dir($info['rootAbs']);
  ensure_dir($info['filesAbs']);
  $manifest['updated_at'] = now_iso();
  write_json_file($info['manifestAbs'], $manifest);
}

function form_sha256_file(string $absPath): string {
  if (!is_file($absPath)) return '';
  $hash = @hash_file('sha256', $absPath);
  return is_string($hash) ? strtolower($hash) : '';
}

function form_private_file_meta(string $dataDir, string $code, string $revision, string $status, string $ext): array {
  $info = form_workflow_info($dataDir, $code);
  $ext = strtolower(trim($ext));
  if (!form_is_workbook_extension($ext)) {
    throw new RuntimeException('unsupported_form_extension');
  }
  $status = strtolower(trim($status));
  $suffix = match ($status) {
    'draft' => '_DRAFT',
    'in_review', 'pending_approval' => '_INREVIEW',
    'obsolete' => '',
    'approved', 'initial_release' => '',
    default => '_' . strtoupper(preg_replace('/[^a-z0-9]+/i', '', $status)),
  };
  $fileName = sanitize_code($code) . '_V' . fmt_rev($revision) . $suffix . '.' . $ext;
  return [
    'abs' => $info['filesAbs'] . '/' . $fileName,
    'rel' => $info['relRoot'] . '/files/' . $fileName,
    'fileName' => $fileName,
  ];
}

function form_copy_file_or_throw(string $srcAbs, string $dstAbs): void {
  if (!is_file($srcAbs)) throw new RuntimeException('source_not_found');
  ensure_dir(dirname($dstAbs));
  if (!@copy($srcAbs, $dstAbs)) {
    throw new RuntimeException('copy_failed');
  }
}

function form_move_file_or_throw(string $srcAbs, string $dstAbs): void {
  if (!is_file($srcAbs)) throw new RuntimeException('source_not_found');
  ensure_dir(dirname($dstAbs));
  if (@rename($srcAbs, $dstAbs)) return;
  form_copy_file_or_throw($srcAbs, $dstAbs);
  @unlink($srcAbs);
}

function form_resolve_private_abs(string $dataDir, string $privateRel): string {
  $privateRel = ltrim(str_replace('\\', '/', trim($privateRel)), '/');
  $abs = rtrim($dataDir, '/\\') . '/' . $privateRel;
  $dataReal = realpath($dataDir) ?: $dataDir;
  $absReal = realpath($abs) ?: $abs;
  $dataNorm = rtrim(str_replace('\\', '/', $dataReal), '/');
  $absNorm = str_replace('\\', '/', $absReal);
  if (!str_starts_with($absNorm, $dataNorm . '/') && $absNorm !== $dataNorm) {
    throw new RuntimeException('private_path_escape');
  }
  return $abs;
}

function form_bootstrap_release_control(string $dataDir, string $rootDir, array $entry): array {
  $code = strtoupper(trim((string)($entry['code'] ?? '')));
  if ($code === '') throw new RuntimeException('missing_form_code');
  $liveRel = safe_rel_path((string)($entry['path'] ?? ''));
  $liveAbs = join_in_root($rootDir, $liveRel);
  $fallbackState = form_state_fallback_from_registry($entry);
  $state = form_load_state_existing($dataDir, $code);
  $manifest = form_load_manifest_existing($dataDir, $code);

  if (!is_array($state)) {
    $state = $fallbackState;
    form_save_state($dataDir, $code, $state);
  } else {
    $changed = false;
    foreach (['kind', 'owner', 'approver', 'live_path', 'effective_date', 'ext'] as $field) {
      if (empty($state[$field]) && !empty($fallbackState[$field])) {
        $state[$field] = $fallbackState[$field];
        $changed = true;
      }
    }
    if (!array_key_exists('has_release', $state)) {
      $state['has_release'] = true;
      $changed = true;
    }
    if (empty($state['released_revision'])) {
      $state['released_revision'] = $fallbackState['released_revision'];
      $changed = true;
    }
    if ($changed) form_save_state($dataDir, $code, $state);
  }

  $hasReleasedEntry = false;
  if (is_array($manifest) && is_array($manifest['versions'] ?? null)) {
    foreach ($manifest['versions'] as $version) {
      if (!is_array($version)) continue;
      if (in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) {
        $hasReleasedEntry = true;
        break;
      }
    }
  }
  if (!$hasReleasedEntry) {
    $checksum = trim((string)($entry['sha256'] ?? ''));
    if ($checksum === '' && is_file($liveAbs)) $checksum = form_sha256_file($liveAbs);
    $versions = [];
    if (is_array($manifest) && is_array($manifest['versions'] ?? null)) $versions = $manifest['versions'];
    array_unshift($versions, [
      'id' => 'bootstrap_release',
      'version' => 'v' . form_normalize_revision((string)($entry['rev'] ?? '0'), '0'),
      'status' => 'initial_release',
      'date' => trim((string)($entry['effective_date'] ?? '')) ?: human_dt(),
      'user' => 'System Bootstrap',
      'role' => 'System',
      'note' => 'Baseline imported from form control registry',
      'updateType' => 'major',
      'storage' => 'live',
      'live_path' => $liveRel,
      'sha256' => $checksum,
      'size_bytes' => is_file($liveAbs) ? (@filesize($liveAbs) ?: 0) : 0,
    ]);
    $manifest = [
      'code' => $code,
      'kind' => 'excel_form',
      'base' => $liveRel,
      'updated_at' => now_iso(),
      'versions' => $versions,
    ];
    form_save_manifest($dataDir, $code, $manifest);
  }

  return [
    'state' => form_load_state_existing($dataDir, $code) ?? $fallbackState,
    'manifest' => form_load_manifest_existing($dataDir, $code) ?? ['code' => $code, 'base' => $liveRel, 'versions' => []],
  ];
}

function form_load_state(string $dataDir, string $rootDir, array $entry): array {
  $boot = form_bootstrap_release_control($dataDir, $rootDir, $entry);
  return is_array($boot['state'] ?? null) ? $boot['state'] : form_state_fallback_from_registry($entry);
}

function form_load_manifest(string $dataDir, string $rootDir, array $entry): array {
  $boot = form_bootstrap_release_control($dataDir, $rootDir, $entry);
  $manifest = $boot['manifest'] ?? null;
  if (!is_array($manifest)) {
    $manifest = ['code' => (string)($entry['code'] ?? ''), 'base' => (string)($entry['path'] ?? ''), 'versions' => []];
  }
  if (!is_array($manifest['versions'] ?? null)) $manifest['versions'] = [];
  return $manifest;
}

function form_latest_released_revision(array $manifest, array $state, string $fallback = '0'): string {
  foreach (($manifest['versions'] ?? []) as $version) {
    if (!is_array($version)) continue;
    if (!in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) continue;
    return form_normalize_revision(revision_from_version_string((string)($version['version'] ?? '')), $fallback);
  }
  if (!empty($state['released_revision'])) return form_normalize_revision((string)$state['released_revision'], $fallback);
  if (!empty($state['revision'])) return form_normalize_revision((string)$state['revision'], $fallback);
  return $fallback;
}

function form_find_working_entry_index(array $versions, string $revision, array $statuses = ['draft', 'in_review', 'pending_approval']): int {
  $target = 'v' . form_normalize_revision($revision, '0');
  for ($i = 0; $i < count($versions); $i++) {
    $version = $versions[$i];
    if (!is_array($version)) continue;
    if (!in_array((string)($version['status'] ?? ''), $statuses, true)) continue;
    if (strcasecmp((string)($version['version'] ?? ''), $target) !== 0) continue;
    return $i;
  }
  return -1;
}

function form_public_versions(array $manifest, array $state, string $code, string $baseRel): array {
  $out = [];
  $currentRev = form_normalize_revision((string)($state['revision'] ?? ''), '');
  $currentStatus = strtolower(trim((string)($state['status'] ?? '')));
  foreach (($manifest['versions'] ?? []) as $version) {
    if (!is_array($version)) continue;
    $item = $version;
    $item['storage'] = (string)($version['storage'] ?? '');
    $item['download_url'] = '';
    if (!empty($version['live_path'])) {
      $livePath = safe_rel_path((string)$version['live_path']);
      $item['file'] = $livePath;
      $item['download_url'] = 'api.php?action=doc_stream&path=' . rawurlencode($livePath) . '&code=' . rawurlencode($code) . '&download=1';
    } elseif (!empty($version['private_rel'])) {
      $item['download_url'] = 'api.php?action=form_version_stream&code=' . rawurlencode($code) . '&base_path=' . rawurlencode($baseRel) . '&id=' . rawurlencode((string)($version['id'] ?? '')) . '&download=1';
    } else {
      $item['file'] = (string)($version['file'] ?? '');
    }
    $versionRev = form_normalize_revision(revision_from_version_string((string)($version['version'] ?? '')), '');
    $item['is_current'] = ($currentStatus === 'approved') && $currentRev !== '' && $versionRev === $currentRev && in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true);
    $out[] = $item;
  }
  return $out;
}

function form_resolve_version_for_stream(string $dataDir, string $rootDir, array $entry, string $id): ?array {
  $manifest = form_load_manifest($dataDir, $rootDir, $entry);
  foreach (($manifest['versions'] ?? []) as $version) {
    if (!is_array($version)) continue;
    if ((string)($version['id'] ?? '') !== $id) continue;
    if (!empty($version['live_path'])) {
      $liveRel = safe_rel_path((string)$version['live_path']);
      $liveAbs = join_in_root($rootDir, $liveRel);
      return [
        'abs' => $liveAbs,
        'name' => basename($liveRel),
        'ext' => form_extension_from_path($liveRel),
      ];
    }
    if (!empty($version['private_rel'])) {
      $privateAbs = form_resolve_private_abs($dataDir, (string)$version['private_rel']);
      return [
        'abs' => $privateAbs,
        'name' => basename((string)$version['private_rel']),
        'ext' => form_extension_from_path((string)$version['private_rel']),
      ];
    }
    return null;
  }
  return null;
}
