<?php
declare(strict_types=1);

function online_schema_workflow_info(string $dataDir, string $code): array {
  $safeCode = sanitize_code($code);
  $rootAbs = rtrim($dataDir, '/\\') . '/online-forms/schema-workflow/' . $safeCode;
  $snapshotsAbs = $rootAbs . '/snapshots';
  $relRoot = 'online-forms/schema-workflow/' . $safeCode;
  return [
    'code' => $safeCode,
    'rootAbs' => $rootAbs,
    'snapshotsAbs' => $snapshotsAbs,
    'manifestAbs' => $rootAbs . '/manifest.json',
    'stateAbs' => $rootAbs . '/state.json',
    'relRoot' => $relRoot,
    'liveRel' => 'online-forms/schemas/' . $safeCode . '.json',
    'liveAbs' => rtrim($dataDir, '/\\') . '/online-forms/schemas/' . $safeCode . '.json',
  ];
}

function online_schema_load_live_schema(string $dataDir, string $code): ?array {
  $info = online_schema_workflow_info($dataDir, $code);
  return read_json_file($info['liveAbs']);
}

function online_schema_save_live_schema(string $dataDir, string $code, array $schema): void {
  $info = online_schema_workflow_info($dataDir, $code);
  ensure_dir(dirname($info['liveAbs']));
  write_json_file($info['liveAbs'], $schema);
}

function online_schema_sha256_file(string $absPath): string {
  if (!is_file($absPath)) return '';
  $hash = @hash_file('sha256', $absPath);
  return is_string($hash) ? strtolower($hash) : '';
}

function online_schema_revision_from_schema(array $schema, string $default = '0'): string {
  return form_normalize_revision(revision_from_version_string((string)($schema['version'] ?? '')), $default);
}

function online_schema_update_type(string $value, string $default = 'minor'): string {
  $value = strtolower(trim($value));
  if (!in_array($value, ['major', 'minor'], true)) return $default;
  return $value;
}

function online_schema_state_fallback(string $code, array $liveSchema): array {
  $revision = online_schema_revision_from_schema($liveSchema, '0');
  return [
    'code' => strtoupper(trim($code)),
    'kind' => 'online_schema',
    'status' => 'approved',
    'revision' => $revision,
    'released_revision' => $revision,
    'has_release' => true,
    'live_path' => 'online-forms/schemas/' . sanitize_code($code) . '.json',
    'owner' => 'QA/QMS',
    'approver' => 'QA/QMS',
    'effective_date' => trim((string)($liveSchema['effective_date'] ?? '')),
    'version_control_model' => 'v1_online_schema_workflow',
  ];
}

function online_schema_load_state_existing(string $dataDir, string $code): ?array {
  return read_json_file(online_schema_workflow_info($dataDir, $code)['stateAbs']);
}

function online_schema_save_state(string $dataDir, string $code, array $state): void {
  $info = online_schema_workflow_info($dataDir, $code);
  ensure_dir($info['rootAbs']);
  ensure_dir($info['snapshotsAbs']);
  $state['updated_at'] = now_iso();
  write_json_file($info['stateAbs'], $state);
}

function online_schema_load_manifest_existing(string $dataDir, string $code): ?array {
  return read_json_file(online_schema_workflow_info($dataDir, $code)['manifestAbs']);
}

function online_schema_save_manifest(string $dataDir, string $code, array $manifest): void {
  $info = online_schema_workflow_info($dataDir, $code);
  ensure_dir($info['rootAbs']);
  ensure_dir($info['snapshotsAbs']);
  $manifest['updated_at'] = now_iso();
  write_json_file($info['manifestAbs'], $manifest);
}

function online_schema_snapshot_meta(string $dataDir, string $code, string $revision, string $status): array {
  $info = online_schema_workflow_info($dataDir, $code);
  $status = strtolower(trim($status));
  $suffix = match ($status) {
    'draft' => '_DRAFT',
    'in_review', 'pending_approval' => '_INREVIEW',
    'approved', 'initial_release', 'obsolete' => '',
    default => '_' . strtoupper(preg_replace('/[^a-z0-9]+/i', '', $status)),
  };
  $fileName = sanitize_code($code) . '_V' . fmt_rev($revision) . $suffix . '.json';
  return [
    'abs' => $info['snapshotsAbs'] . '/' . $fileName,
    'rel' => $info['relRoot'] . '/snapshots/' . $fileName,
    'fileName' => $fileName,
  ];
}

function online_schema_summary(array $schema): array {
  return [
    'title' => trim((string)($schema['title'] ?? $schema['form_code'] ?? '')),
    'title_vi' => trim((string)($schema['title_vi'] ?? '')),
    'field_count' => count($schema['fields'] ?? []),
    'section_count' => count($schema['sections'] ?? []),
  ];
}

function online_schema_increment_minor(string $revision): string {
  $clean = form_normalize_revision($revision, '0');
  if (!str_contains($clean, '.')) return $clean . '.1';
  [$major, $minor] = explode('.', $clean, 2);
  return $major . '.' . (((int)$minor) + 1);
}

function online_schema_latest_released_revision(array $manifest, array $state, string $fallback = '0'): string {
  foreach (($manifest['versions'] ?? []) as $version) {
    if (!is_array($version)) continue;
    if (!in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) continue;
    return form_normalize_revision(revision_from_version_string((string)($version['version'] ?? '')), $fallback);
  }
  if (!empty($state['released_revision'])) return form_normalize_revision((string)($state['released_revision']), $fallback);
  if (!empty($state['revision'])) return form_normalize_revision((string)($state['revision']), $fallback);
  return $fallback;
}

function online_schema_find_working_index(array $versions): int {
  for ($i = 0; $i < count($versions); $i++) {
    $version = $versions[$i];
    if (!is_array($version)) continue;
    if (!in_array((string)($version['status'] ?? ''), ['draft', 'in_review', 'pending_approval'], true)) continue;
    return $i;
  }
  return -1;
}

function online_schema_find_version_index(array $versions, string $versionId = '', string $revision = '', array $statuses = []): int {
  $versionId = trim($versionId);
  $targetRevision = form_normalize_revision($revision, '');
  for ($i = 0; $i < count($versions); $i++) {
    $version = $versions[$i];
    if (!is_array($version)) continue;
    $status = (string)($version['status'] ?? '');
    if ($statuses && !in_array($status, $statuses, true)) continue;
    if ($versionId !== '' && (string)($version['id'] ?? '') === $versionId) return $i;
    if ($targetRevision !== '') {
      $candidate = form_normalize_revision(revision_from_version_string((string)($version['version'] ?? '')), '');
      if ($candidate === $targetRevision) return $i;
    }
  }
  return -1;
}

function online_schema_resolve_private_abs(string $dataDir, string $privateRel): string {
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

function online_schema_load_snapshot(string $dataDir, string $privateRel): ?array {
  $privateRel = ltrim(str_replace('\\', '/', trim($privateRel)), '/');
  if ($privateRel === '') return null;
  return read_json_file(online_schema_resolve_private_abs($dataDir, $privateRel));
}

function online_schema_delete_private_snapshot(string $dataDir, string $privateRel): void {
  $privateRel = trim($privateRel);
  if ($privateRel === '') return;
  try {
    $abs = online_schema_resolve_private_abs($dataDir, $privateRel);
    if (is_file($abs)) @unlink($abs);
  } catch (Throwable $e) {
    // Ignore stale private paths during cleanup.
  }
}

function online_schema_write_snapshot(string $dataDir, string $code, string $revision, string $status, array $schema): array {
  $snapshot = online_schema_snapshot_meta($dataDir, $code, $revision, $status);
  ensure_dir(dirname($snapshot['abs']));
  write_json_file($snapshot['abs'], $schema);
  $snapshot['sha256'] = online_schema_sha256_file($snapshot['abs']);
  return $snapshot;
}

function online_schema_load_schema_from_version(string $dataDir, string $code, array $version, ?array $liveSchema = null): ?array {
  $privateRel = trim((string)($version['private_rel'] ?? ''));
  if ($privateRel !== '') {
    $schema = online_schema_load_snapshot($dataDir, $privateRel);
    if (is_array($schema)) return $schema;
  }
  $livePath = trim((string)($version['live_path'] ?? ''));
  if ($livePath !== '') {
    if (is_array($liveSchema)) return $liveSchema;
    return online_schema_load_live_schema($dataDir, $code);
  }
  return null;
}

function online_schema_load_working_draft_schema(string $dataDir, array $manifest): ?array {
  foreach (($manifest['versions'] ?? []) as $version) {
    if (!is_array($version)) continue;
    if (!in_array((string)($version['status'] ?? ''), ['draft', 'in_review', 'pending_approval'], true)) continue;
    $schema = online_schema_load_schema_from_version($dataDir, (string)($manifest['code'] ?? ''), $version, null);
    if (is_array($schema)) return $schema;
  }
  return null;
}

function online_schema_public_versions(array $manifest, array $state): array {
  $out = [];
  $currentRev = form_normalize_revision((string)($state['revision'] ?? ''), '');
  $currentStatus = strtolower(trim((string)($state['status'] ?? '')));
  foreach (($manifest['versions'] ?? []) as $version) {
    if (!is_array($version)) continue;
    $item = $version;
    $item['storage'] = (string)($version['storage'] ?? '');
    $versionStatus = (string)($version['status'] ?? '');
    $versionRev = form_normalize_revision(revision_from_version_string((string)($version['version'] ?? '')), '');
    $item['is_current'] =
      $currentRev !== '' &&
      $versionRev === $currentRev &&
      (
        $currentStatus === $versionStatus ||
        ($currentStatus === 'approved' && in_array($versionStatus, ['approved', 'initial_release'], true))
      );
    $out[] = $item;
  }
  return $out;
}

function online_schema_bootstrap(string $dataDir, string $code): array {
  $liveSchema = online_schema_load_live_schema($dataDir, $code);
  if (!is_array($liveSchema)) throw new RuntimeException('schema_not_found');
  $info = online_schema_workflow_info($dataDir, $code);
  $state = online_schema_load_state_existing($dataDir, $code);
  $manifest = online_schema_load_manifest_existing($dataDir, $code);
  $fallback = online_schema_state_fallback($code, $liveSchema);

  if (!is_array($state)) {
    $state = $fallback;
    online_schema_save_state($dataDir, $code, $state);
  } else {
    $changed = false;
    foreach (['kind', 'owner', 'approver', 'live_path', 'effective_date', 'version_control_model'] as $field) {
      if (empty($state[$field]) && !empty($fallback[$field])) {
        $state[$field] = $fallback[$field];
        $changed = true;
      }
    }
    if (!array_key_exists('has_release', $state)) {
      $state['has_release'] = true;
      $changed = true;
    }
    if (empty($state['released_revision'])) {
      $state['released_revision'] = $fallback['released_revision'];
      $changed = true;
    }
    if ($changed) online_schema_save_state($dataDir, $code, $state);
  }

  $hasReleased = false;
  if (is_array($manifest) && is_array($manifest['versions'] ?? null)) {
    foreach ($manifest['versions'] as $version) {
      if (!is_array($version)) continue;
      if (in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) {
        $hasReleased = true;
        break;
      }
    }
  }
  if (!$hasReleased) {
    $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
    $summary = online_schema_summary($liveSchema);
    array_unshift($versions, [
      'id' => 'bootstrap_release',
      'version' => 'v' . online_schema_revision_from_schema($liveSchema, '0'),
      'status' => 'initial_release',
      'date' => trim((string)($liveSchema['updated_at'] ?? now_iso())),
      'user' => 'System Bootstrap',
      'role' => 'System',
      'note' => 'Baseline imported from live online schema',
      'updateType' => 'major',
      'storage' => 'live',
      'live_path' => $info['liveRel'],
      'sha256' => online_schema_sha256_file($info['liveAbs']),
      'title' => $summary['title'],
      'title_vi' => $summary['title_vi'],
      'field_count' => $summary['field_count'],
      'section_count' => $summary['section_count'],
    ]);
    $manifest = [
      'code' => strtoupper(trim($code)),
      'kind' => 'online_schema',
      'base' => $info['liveRel'],
      'versions' => $versions,
    ];
    online_schema_save_manifest($dataDir, $code, $manifest);
  }

  return [
    'state' => online_schema_load_state_existing($dataDir, $code) ?? $fallback,
    'manifest' => online_schema_load_manifest_existing($dataDir, $code) ?? ['code' => strtoupper(trim($code)), 'base' => $info['liveRel'], 'versions' => []],
    'live_schema' => $liveSchema,
  ];
}

function online_schema_save_draft_working_copy(string $dataDir, string $code, array $schema, string $user, string $note = '', string $role = 'Author'): array {
  $boot = online_schema_bootstrap($dataDir, $code);
  $state = $boot['state'];
  $manifest = $boot['manifest'];
  $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
  $workingIdx = online_schema_find_working_index($versions);
  $releasedRevision = online_schema_latest_released_revision($manifest, $state, '0');
  $targetRevision = $workingIdx >= 0
    ? form_normalize_revision(revision_from_version_string((string)($versions[$workingIdx]['version'] ?? '')), online_schema_increment_minor($releasedRevision))
    : online_schema_increment_minor(($state['status'] ?? '') === 'draft' ? (string)($state['revision'] ?? $releasedRevision) : $releasedRevision);
  $updateType = online_schema_update_type(
    (string)($workingIdx >= 0 ? ($versions[$workingIdx]['updateType'] ?? '') : ($state['updateType'] ?? 'minor')),
    str_contains($targetRevision, '.') ? 'minor' : 'major'
  );

  $schema['form_code'] = strtoupper(trim($code));
  $schema['version'] = 'V' . $targetRevision;
  $schema['online'] = ($schema['online'] ?? true) !== false;
  if (empty($schema['delivery_mode'])) $schema['delivery_mode'] = 'online';
  $schema['updated_at'] = now_iso();
  $schema['updated_by'] = $user;

  $previousPrivateRel = $workingIdx >= 0 ? trim((string)($versions[$workingIdx]['private_rel'] ?? '')) : '';
  $snapshot = online_schema_write_snapshot($dataDir, $code, $targetRevision, 'draft', $schema);
  $summary = online_schema_summary($schema);
  $entry = [
    'id' => $workingIdx >= 0 ? (string)($versions[$workingIdx]['id'] ?? ('draft_' . ts_compact())) : ('draft_' . ts_compact()),
    'version' => 'v' . $targetRevision,
    'status' => 'draft',
    'date' => now_iso(),
    'user' => $user,
    'role' => $role,
    'note' => $note !== '' ? $note : 'Draft saved from form builder',
    'updateType' => $updateType,
    'storage' => 'private',
    'private_rel' => $snapshot['rel'],
    'sha256' => $snapshot['sha256'],
    'title' => $summary['title'],
    'title_vi' => $summary['title_vi'],
    'field_count' => $summary['field_count'],
    'section_count' => $summary['section_count'],
  ];
  if ($workingIdx >= 0) $versions[$workingIdx] = array_merge($versions[$workingIdx], $entry);
  else array_unshift($versions, $entry);

  $manifest['code'] = strtoupper(trim($code));
  $manifest['kind'] = 'online_schema';
  $manifest['base'] = online_schema_workflow_info($dataDir, $code)['liveRel'];
  $manifest['versions'] = $versions;
  online_schema_save_manifest($dataDir, $code, $manifest);

  $state['status'] = 'draft';
  $state['revision'] = $targetRevision;
  $state['updateType'] = $updateType;
  $state['has_release'] = true;
  $state['live_path'] = online_schema_workflow_info($dataDir, $code)['liveRel'];
  $state['updated_by'] = $user;
  $state['lastEdit'] = [
    'by' => $user,
    'role' => $role,
    'date' => now_iso(),
    'note' => $note !== '' ? $note : 'Draft saved from form builder',
  ];
  foreach (['submittedBy', 'approvedBy', 'approvedDate', 'rejectedBy'] as $key) {
    if (array_key_exists($key, $state)) unset($state[$key]);
  }
  online_schema_save_state($dataDir, $code, $state);

  if ($previousPrivateRel !== '' && $previousPrivateRel !== $snapshot['rel']) {
    online_schema_delete_private_snapshot($dataDir, $previousPrivateRel);
  }

  return [
    'state' => online_schema_load_state_existing($dataDir, $code) ?? $state,
    'versions' => online_schema_public_versions(online_schema_load_manifest_existing($dataDir, $code) ?? $manifest, online_schema_load_state_existing($dataDir, $code) ?? $state),
    'live_schema' => $boot['live_schema'],
    'draft_schema' => $schema,
  ];
}

function online_schema_submit_review_working_copy(string $dataDir, string $code, string $user, string $note = '', string $updateType = 'minor', string $role = 'Author'): array {
  $boot = online_schema_bootstrap($dataDir, $code);
  $state = $boot['state'];
  $manifest = $boot['manifest'];
  $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
  $workingIdx = online_schema_find_working_index($versions);
  if ($workingIdx < 0) throw new RuntimeException('missing_draft_schema');

  $workingRevision = form_normalize_revision(
    revision_from_version_string((string)($versions[$workingIdx]['version'] ?? '')),
    form_normalize_revision((string)($state['revision'] ?? '0'), '0')
  );
  $schema = online_schema_load_schema_from_version($dataDir, $code, $versions[$workingIdx], $boot['live_schema']);
  if (!is_array($schema)) throw new RuntimeException('missing_draft_schema');

  $previousPrivateRel = trim((string)($versions[$workingIdx]['private_rel'] ?? ''));
  $snapshot = online_schema_snapshot_meta($dataDir, $code, $workingRevision, 'in_review');
  if ($previousPrivateRel !== '') {
    try {
      $previousAbs = online_schema_resolve_private_abs($dataDir, $previousPrivateRel);
      $sameTarget = str_replace('\\', '/', $previousAbs) === str_replace('\\', '/', $snapshot['abs']);
      if ($sameTarget && is_file($previousAbs)) {
        $snapshot['sha256'] = online_schema_sha256_file($previousAbs);
      } elseif (is_file($previousAbs)) {
        form_move_file_or_throw($previousAbs, $snapshot['abs']);
      }
      else $snapshot = online_schema_write_snapshot($dataDir, $code, $workingRevision, 'in_review', $schema);
    } catch (Throwable $e) {
      $snapshot = online_schema_write_snapshot($dataDir, $code, $workingRevision, 'in_review', $schema);
    }
  } else {
    $snapshot = online_schema_write_snapshot($dataDir, $code, $workingRevision, 'in_review', $schema);
  }
  $snapshot['sha256'] = online_schema_sha256_file($snapshot['abs']);

  $entryUpdateType = online_schema_update_type($updateType, (string)($versions[$workingIdx]['updateType'] ?? ($state['updateType'] ?? 'minor')));
  $summary = online_schema_summary($schema);
  $dt = now_iso();
  $versions[$workingIdx] = array_merge($versions[$workingIdx], [
    'id' => (string)($versions[$workingIdx]['id'] ?? ('review_' . ts_compact())),
    'version' => 'v' . $workingRevision,
    'status' => 'in_review',
    'date' => $dt,
    'user' => $user,
    'role' => $role,
    'note' => $note !== '' ? $note : 'Submitted schema for review',
    'updateType' => $entryUpdateType,
    'storage' => 'private',
    'private_rel' => $snapshot['rel'],
    'sha256' => $snapshot['sha256'],
    'submittedBy' => $user,
    'submittedDate' => $dt,
    'title' => $summary['title'],
    'title_vi' => $summary['title_vi'],
    'field_count' => $summary['field_count'],
    'section_count' => $summary['section_count'],
  ]);

  $manifest['versions'] = $versions;
  online_schema_save_manifest($dataDir, $code, $manifest);

  $state['status'] = 'in_review';
  $state['revision'] = $workingRevision;
  $state['updateType'] = $entryUpdateType;
  $state['submittedBy'] = [
    'name' => $user,
    'role' => $role,
    'date' => $dt,
    'updateType' => $entryUpdateType,
    'note' => $note,
  ];
  if (array_key_exists('rejectedBy', $state)) unset($state['rejectedBy']);
  online_schema_save_state($dataDir, $code, $state);

  return [
    'state' => online_schema_load_state_existing($dataDir, $code) ?? $state,
    'versions' => online_schema_public_versions(online_schema_load_manifest_existing($dataDir, $code) ?? $manifest, online_schema_load_state_existing($dataDir, $code) ?? $state),
    'live_schema' => $boot['live_schema'],
    'draft_schema' => $schema,
  ];
}

function online_schema_publish_release(string $dataDir, string $code, string $user, string $note = '', string $updateType = 'major', string $role = 'Approver', string $requestedRevision = '', string $effectiveDate = ''): array {
  $boot = online_schema_bootstrap($dataDir, $code);
  $info = online_schema_workflow_info($dataDir, $code);
  $state = $boot['state'];
  $manifest = $boot['manifest'];
  $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];

  $workingRevision = '';
  $sourceIdx = -1;
  foreach (['in_review', 'pending_approval', 'draft'] as $status) {
    $idx = online_schema_find_version_index($versions, '', form_normalize_revision((string)($state['revision'] ?? ''), ''), [$status]);
    if ($idx >= 0) {
      $sourceIdx = $idx;
      break;
    }
    for ($i = 0; $i < count($versions); $i++) {
      if (!is_array($versions[$i])) continue;
      if ((string)($versions[$i]['status'] ?? '') !== $status) continue;
      $sourceIdx = $i;
      break 2;
    }
  }
  if ($sourceIdx < 0) throw new RuntimeException('missing_review_schema');

  $workingRevision = form_normalize_revision(
    revision_from_version_string((string)($versions[$sourceIdx]['version'] ?? '')),
    form_normalize_revision((string)($state['revision'] ?? '0'), '0')
  );
  $requestedRevision = form_normalize_revision($requestedRevision, $workingRevision);
  if ($requestedRevision !== $workingRevision) {
    throw new RuntimeException('approve_revision_mismatch');
  }

  $sourceSchema = online_schema_load_schema_from_version($dataDir, $code, $versions[$sourceIdx], $boot['live_schema']);
  if (!is_array($sourceSchema)) throw new RuntimeException('missing_review_schema');

  $dt = now_iso();
  $effectiveDate = trim($effectiveDate);
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $effectiveDate)) $effectiveDate = substr($dt, 0, 10);
  $prevRevision = online_schema_latest_released_revision($manifest, $state, form_normalize_revision((string)($state['released_revision'] ?? '0'), '0'));
  $hasRelease = false;
  foreach ($versions as $version) {
    if (!is_array($version)) continue;
    if (in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) {
      $hasRelease = true;
      break;
    }
  }

  if ($hasRelease && is_array($boot['live_schema'])) {
    $archive = online_schema_write_snapshot($dataDir, $code, $prevRevision, 'obsolete', $boot['live_schema']);
    $archiveSummary = online_schema_summary($boot['live_schema']);
    foreach ($versions as &$version) {
      if (!is_array($version)) continue;
      if (!in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) continue;
      $version['status'] = 'obsolete';
      $version['storage'] = 'private';
      $version['private_rel'] = $archive['rel'];
      $version['sha256'] = $archive['sha256'];
      $version['title'] = $archiveSummary['title'];
      $version['title_vi'] = $archiveSummary['title_vi'];
      $version['field_count'] = $archiveSummary['field_count'];
      $version['section_count'] = $archiveSummary['section_count'];
      unset($version['live_path']);
    }
    unset($version);
  }

  $publishedSchema = $sourceSchema;
  $publishedSchema['form_code'] = strtoupper(trim($code));
  $publishedSchema['version'] = 'V' . $workingRevision;
  $publishedSchema['online'] = true;
  $publishedSchema['delivery_mode'] = 'online';
  $publishedSchema['effective_date'] = $effectiveDate;
  $publishedSchema['updated_at'] = $dt;
  $publishedSchema['updated_by'] = $user;
  $publishedSchema['published_at'] = $dt;
  $publishedSchema['published_by'] = $user;
  online_schema_save_live_schema($dataDir, $code, $publishedSchema);

  $liveSha = online_schema_sha256_file($info['liveAbs']);
  $summary = online_schema_summary($publishedSchema);
  $capturedSubmittedBy = '';
  $capturedSubmittedDate = '';
  $capturedLastEditBy = '';
  $capturedLastEditRole = '';
  $capturedLastEditDate = '';
  if (isset($state['submittedBy']) && is_array($state['submittedBy'])) {
    $capturedSubmittedBy = (string)($state['submittedBy']['name'] ?? '');
    $capturedSubmittedDate = (string)($state['submittedBy']['date'] ?? '');
  }
  if (isset($state['lastEdit']) && is_array($state['lastEdit'])) {
    $capturedLastEditBy = (string)($state['lastEdit']['by'] ?? '');
    $capturedLastEditRole = (string)($state['lastEdit']['role'] ?? '');
    $capturedLastEditDate = (string)($state['lastEdit']['date'] ?? '');
  }

  $cleaned = [];
  foreach ($versions as $version) {
    if (!is_array($version)) continue;
    $versionStatus = (string)($version['status'] ?? '');
    $versionRevision = form_normalize_revision(revision_from_version_string((string)($version['version'] ?? '')), '');
    if ($versionRevision === $workingRevision && in_array($versionStatus, ['draft', 'in_review', 'pending_approval'], true)) {
      online_schema_delete_private_snapshot($dataDir, (string)($version['private_rel'] ?? ''));
      continue;
    }
    $cleaned[] = $version;
  }

  array_unshift($cleaned, [
    'id' => ts_compact() . '_approved',
    'version' => 'v' . $workingRevision,
    'status' => $hasRelease ? 'approved' : 'initial_release',
    'date' => $dt,
    'user' => $user,
    'role' => $role,
    'submittedBy' => $capturedSubmittedBy,
    'submittedDate' => $capturedSubmittedDate,
    'lastEditBy' => $capturedLastEditBy,
    'lastEditRole' => $capturedLastEditRole,
    'lastEditDate' => $capturedLastEditDate,
    'approvedBy' => $user,
    'approvedDate' => $dt,
    'note' => $note !== '' ? $note : 'Published online schema',
    'updateType' => online_schema_update_type($updateType, (string)($state['updateType'] ?? 'major')),
    'storage' => 'live',
    'live_path' => $info['liveRel'],
    'sha256' => $liveSha,
    'title' => $summary['title'],
    'title_vi' => $summary['title_vi'],
    'field_count' => $summary['field_count'],
    'section_count' => $summary['section_count'],
  ]);

  $manifest['code'] = strtoupper(trim($code));
  $manifest['kind'] = 'online_schema';
  $manifest['base'] = $info['liveRel'];
  $manifest['versions'] = $cleaned;
  online_schema_save_manifest($dataDir, $code, $manifest);

  $state['status'] = 'approved';
  $state['revision'] = $workingRevision;
  $state['released_revision'] = $workingRevision;
  $state['updateType'] = online_schema_update_type($updateType, (string)($state['updateType'] ?? 'major'));
  $state['effective_date'] = $effectiveDate;
  $state['approvedBy'] = [
    'name' => $user,
    'role' => $role,
    'date' => $dt,
  ];
  $state['approvedDate'] = $dt;
  $state['has_release'] = true;
  $state['updated_by'] = $user;
  foreach (['lastEdit', 'submittedBy', 'rejectedBy'] as $key) {
    if (array_key_exists($key, $state)) unset($state[$key]);
  }
  online_schema_save_state($dataDir, $code, $state);

  return [
    'state' => online_schema_load_state_existing($dataDir, $code) ?? $state,
    'versions' => online_schema_public_versions(online_schema_load_manifest_existing($dataDir, $code) ?? $manifest, online_schema_load_state_existing($dataDir, $code) ?? $state),
    'live_schema' => online_schema_load_live_schema($dataDir, $code) ?? $publishedSchema,
    'draft_schema' => null,
  ];
}

function online_schema_reject_review(string $dataDir, string $code, string $user, string $reason = '', string $role = 'Approver'): array {
  $boot = online_schema_bootstrap($dataDir, $code);
  $state = $boot['state'];
  $manifest = $boot['manifest'];
  $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
  $targetRevision = form_normalize_revision((string)($state['revision'] ?? '0'), '0');
  $reviewIdx = online_schema_find_version_index($versions, '', $targetRevision, ['in_review', 'pending_approval']);
  if ($reviewIdx < 0) throw new RuntimeException('nothing_to_reject');

  $schema = online_schema_load_schema_from_version($dataDir, $code, $versions[$reviewIdx], $boot['live_schema']);
  if (!is_array($schema)) throw new RuntimeException('nothing_to_reject');

  $reviewRel = trim((string)($versions[$reviewIdx]['private_rel'] ?? ''));
  $draftSnapshot = online_schema_snapshot_meta($dataDir, $code, $targetRevision, 'draft');
  if ($reviewRel !== '') {
    try {
      $reviewAbs = online_schema_resolve_private_abs($dataDir, $reviewRel);
      if (is_file($reviewAbs)) {
        form_move_file_or_throw($reviewAbs, $draftSnapshot['abs']);
      } else {
        $draftSnapshot = online_schema_write_snapshot($dataDir, $code, $targetRevision, 'draft', $schema);
      }
    } catch (Throwable $e) {
      $draftSnapshot = online_schema_write_snapshot($dataDir, $code, $targetRevision, 'draft', $schema);
    }
  } else {
    $draftSnapshot = online_schema_write_snapshot($dataDir, $code, $targetRevision, 'draft', $schema);
  }
  $draftSnapshot['sha256'] = online_schema_sha256_file($draftSnapshot['abs']);

  $dt = now_iso();
  $existingNote = trim((string)($versions[$reviewIdx]['note'] ?? ''));
  $versions[$reviewIdx]['status'] = 'draft';
  $versions[$reviewIdx]['date'] = $dt;
  $versions[$reviewIdx]['storage'] = 'private';
  $versions[$reviewIdx]['private_rel'] = $draftSnapshot['rel'];
  $versions[$reviewIdx]['sha256'] = $draftSnapshot['sha256'];
  $versions[$reviewIdx]['rejectedBy'] = $user;
  $versions[$reviewIdx]['rejectedDate'] = $dt;
  if ($reason !== '') {
    $versions[$reviewIdx]['note'] = ($existingNote !== '' ? ($existingNote . ' | ') : '') . 'Rejected: ' . $reason;
  }
  unset($versions[$reviewIdx]['submittedBy'], $versions[$reviewIdx]['submittedDate'], $versions[$reviewIdx]['approvedBy'], $versions[$reviewIdx]['approvedDate'], $versions[$reviewIdx]['live_path']);

  $manifest['versions'] = $versions;
  online_schema_save_manifest($dataDir, $code, $manifest);

  $state['status'] = 'draft';
  $state['revision'] = $targetRevision;
  $state['rejectedBy'] = [
    'name' => $user,
    'role' => $role,
    'date' => $dt,
    'reason' => $reason,
  ];
  foreach (['submittedBy', 'approvedBy', 'approvedDate'] as $key) {
    if (array_key_exists($key, $state)) unset($state[$key]);
  }
  online_schema_save_state($dataDir, $code, $state);

  return [
    'state' => online_schema_load_state_existing($dataDir, $code) ?? $state,
    'versions' => online_schema_public_versions(online_schema_load_manifest_existing($dataDir, $code) ?? $manifest, online_schema_load_state_existing($dataDir, $code) ?? $state),
    'live_schema' => $boot['live_schema'],
    'draft_schema' => $schema,
  ];
}

function online_schema_version_detail(string $dataDir, string $code, string $versionId): array {
  $boot = online_schema_bootstrap($dataDir, $code);
  $manifest = $boot['manifest'];
  foreach (($manifest['versions'] ?? []) as $version) {
    if (!is_array($version)) continue;
    if ((string)($version['id'] ?? '') !== $versionId) continue;
    $schema = online_schema_load_schema_from_version($dataDir, $code, $version, $boot['live_schema']);
    if (!is_array($schema)) throw new RuntimeException('version_not_found');
    return [
      'state' => $boot['state'],
      'version' => $version,
      'schema' => $schema,
      'live_schema' => $boot['live_schema'],
    ];
  }
  throw new RuntimeException('version_not_found');
}

function online_schema_rollback_to_draft(string $dataDir, string $code, string $user, string $versionId = '', string $revision = '', string $note = '', string $role = 'Author'): array {
  $boot = online_schema_bootstrap($dataDir, $code);
  $manifest = $boot['manifest'];
  $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
  $targetIdx = online_schema_find_version_index($versions, $versionId, $revision, ['approved', 'initial_release', 'obsolete']);
  if ($targetIdx < 0) throw new RuntimeException('version_not_found');

  $targetVersion = $versions[$targetIdx];
  $sourceSchema = online_schema_load_schema_from_version($dataDir, $code, $targetVersion, $boot['live_schema']);
  if (!is_array($sourceSchema)) throw new RuntimeException('version_not_found');

  $sourceLabel = (string)($targetVersion['version'] ?? ('v' . form_normalize_revision($revision, '0')));
  $rollbackNote = $note !== '' ? $note : ('Rollback draft created from ' . $sourceLabel);
  return online_schema_save_draft_working_copy($dataDir, $code, $sourceSchema, $user, $rollbackNote, $role);
}
