<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Side-effect-free evaluator for P40 frontend/operator authority safety.
 *
 * Workspaces are projections. Authoritative changes must re-anchor to a record
 * shell and then flow through domain commands; offline inputs are candidates.
 */
final class MdaFrontendProjectionSafetyService
{
    private const UNSAFE_ACTION_CLASSES = [
        'create',
        'update',
        'delete',
        'transition',
        'approve',
        'release',
        'sign',
        'hold',
        'post',
        'reconcile',
        'complete',
        'dispatch',
    ];

    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'mda_frontend_projection_safety',
            'readiness_state' => 'service_gate_partial',
            'record_shell_authority' => 'mda_authoritative_record_shell_anchor',
            'workspace_projection_policy_authority' => 'mda_workspace_projection_policy',
            'freshness_authority' => 'mda_workspace_projection_freshness',
            'alias_resolution_authority' => 'mda_frontend_alias_resolution_policy',
            'offline_candidate_authority' => 'mda_offline_candidate_queue',
            'action_guard_evidence_authority' => 'mda_frontend_action_guard_decision',
            'workspace_mutation_allowed' => false,
        ];
    }

    /** @return array<string, mixed> */
    public function classifyOpsRoute(string $routePath): array
    {
        $path = '/' . trim((string)parse_url($routePath, PHP_URL_PATH), '/');
        $parts = array_values(array_filter(explode('/', trim($path, '/')), static fn(string $part): bool => $part !== ''));

        if (($parts[0] ?? '') === 'ops' && ($parts[1] ?? '') === 'ar' && count($parts) >= 4) {
            return $this->decision(true, 'allow', 'ops_authoritative_record_shell_route', 'Route opens an authoritative record shell.', [
                'route_path' => $path,
                'route_class' => 'authoritative_record_shell',
                'governed_root_code' => $this->text($parts[2]),
                'canonical_record_id' => $this->text($parts[3]),
            ]);
        }

        if (($parts[0] ?? '') === 'ops' && ($parts[1] ?? '') === 'ws' && count($parts) >= 3) {
            return $this->decision(true, 'allow', 'ops_workspace_projection_route', 'Route opens a projection-only workspace.', [
                'route_path' => $path,
                'route_class' => 'workspace_projection',
                'workspace_key' => $this->text($parts[2]),
            ]);
        }

        return $this->decision(false, 'deny', 'ops_route_unknown', 'Unknown /ops route grammar is not authoritative.', [
            'route_path' => $path,
            'route_class' => 'unknown',
        ]);
    }

    /** @param array<string, mixed> $route @param array<string, mixed> $action @return array<string, mixed> */
    public function evaluateWorkspaceAction(array $route, array $action): array
    {
        $routeClass = $this->text($route['route_class'] ?? ($route['context']['route_class'] ?? 'unknown'));
        $actionClass = strtolower($this->text($action['action_class'] ?? $action['class'] ?? $action['action_code'] ?? 'read'));
        $actionCode = $this->text($action['action_code'] ?? $action['command_name'] ?? $actionClass);

        if ($routeClass === 'workspace_projection' && in_array($actionClass, self::UNSAFE_ACTION_CLASSES, true)) {
            return $this->decision(false, 'disable', 'workspace_projection_mutation_blocked', 'Workspace projections cannot mutate governed truth.', [
                'route_class' => $routeClass,
                'action_code' => $actionCode,
                'disabled_reason' => 'Open the authoritative record shell and execute a governed command.',
                'reanchor_required' => true,
            ]);
        }

        return $this->decision(true, 'allow', 'workspace_action_read_only_allowed', 'Read-only projection action is allowed.', [
            'route_class' => $routeClass,
            'action_code' => $actionCode,
        ]);
    }

    /** @param array<string, mixed> $context @return array<string, mixed> */
    public function buildRecordShell(string $rootCode, string $recordId, array $context = []): array
    {
        $rootCode = $this->canonicalCode($rootCode);
        $recordId = $this->text($recordId);
        if ($rootCode === '' || $recordId === '') {
            return $this->decision(false, 'deny', 'record_shell_missing_canonical_id', 'Record shell requires canonical root and record id.', [
                'route_class' => 'authoritative_record_shell',
            ]);
        }

        $canonicalRef = $rootCode . ':' . $recordId;
        $result = $this->decision(true, 'allow', 'record_shell_audit_evidence_visible', 'Record shell exposes audit, evidence, command and re-anchor links.', [
            'route_class' => 'authoritative_record_shell',
            'governed_root_code' => $rootCode,
            'canonical_record_id' => $recordId,
            'canonical_record_ref' => $canonicalRef,
        ]);
        $result['record_shell'] = [
            'route_path' => '/ops/ar/' . rawurlencode($rootCode) . '/' . rawurlencode($recordId),
            'canonical_record_ref' => $canonicalRef,
            'audit_panel_ref' => '/ops/ar/' . rawurlencode($rootCode) . '/' . rawurlencode($recordId) . '/audit',
            'evidence_panel_ref' => '/ops/ar/' . rawurlencode($rootCode) . '/' . rawurlencode($recordId) . '/evidence',
            'command_endpoint' => '/api/v1/commands/{commandName}',
            'workspace_projection_mutation_allowed' => false,
            'freshness' => $context['freshness'] ?? ['state' => 'unknown'],
        ];

        return $result;
    }

    /** @param array<string, mixed> $projection @param list<array<string, mixed>> $actions @return array<string, mixed> */
    public function evaluateFreshness(array $projection, array $actions, ?DateTimeImmutable $at = null): array
    {
        $at ??= new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $generatedAt = $this->text($projection['generated_at'] ?? $projection['freshness_generated_at'] ?? '');
        $maxAgeSeconds = max(1, (int)($projection['max_age_seconds'] ?? 300));
        $state = 'unknown';
        $ageSeconds = null;

        try {
            $generated = new DateTimeImmutable($generatedAt);
            $ageSeconds = max(0, $at->getTimestamp() - $generated->getTimestamp());
            $state = $ageSeconds > $maxAgeSeconds ? 'stale' : 'fresh';
        } catch (\Throwable) {
            $state = 'unknown';
        }

        $disabled = [];
        if ($state !== 'fresh') {
            foreach ($actions as $action) {
                $actionClass = strtolower($this->text($action['action_class'] ?? $action['class'] ?? 'read'));
                if (in_array($actionClass, self::UNSAFE_ACTION_CLASSES, true)) {
                    $disabled[] = [
                        'action_code' => $this->text($action['action_code'] ?? $actionClass),
                        'reason_code' => 'projection_stale_action_disabled',
                        'reason' => 'Projection is not fresh; refresh or open the authoritative record shell.',
                    ];
                }
            }
        }

        $result = $this->decision($disabled === [], $disabled === [] ? 'allow' : 'disable', $disabled === [] ? 'projection_fresh_actions_enabled' : 'projection_stale_action_disabled', 'Projection freshness evaluated.', [
            'freshness_state' => $state,
            'age_seconds' => $ageSeconds,
            'max_age_seconds' => $maxAgeSeconds,
        ]);
        $result['disabled_actions'] = $disabled;

        return $result;
    }

    /** @param array<string, mixed> $candidate @return array<string, mixed> */
    public function queueOfflineCandidate(array $candidate): array
    {
        $payloadHash = $this->hashPayload([
            'workspace_key' => $this->text($candidate['workspace_key'] ?? ''),
            'action_code' => $this->text($candidate['action_code'] ?? ''),
            'payload' => is_array($candidate['payload'] ?? null) ? $candidate['payload'] : [],
        ]);
        $result = $this->decision(true, 'queue_candidate', 'offline_candidate_queued_not_committed', 'Offline input is queued as a candidate and is not committed to governed truth.', [
            'workspace_key' => $this->text($candidate['workspace_key'] ?? ''),
            'action_code' => $this->text($candidate['action_code'] ?? ''),
            'committed_to_authority' => false,
        ]);
        $result['offline_candidate'] = [
            'candidate_ref' => $this->text($candidate['candidate_ref'] ?? ('OFF-' . substr($payloadHash, 0, 16))),
            'payload_hash_sha256' => $payloadHash,
            'queue_state' => 'candidate_only',
            'committed_to_authority' => false,
        ];

        return $result;
    }

    /** @param array<string, array<string, string>> $aliasMap @return array<string, mixed> */
    public function resolveRecordAlias(array $aliasMap, string $aliasKey): array
    {
        $aliasKey = $this->text($aliasKey);
        $target = $aliasMap[$aliasKey] ?? null;
        if (!is_array($target) || $this->text($target['canonical_record_id'] ?? '') === '') {
            return $this->decision(false, 'deny', 'unknown_alias_record_id_not_invented', 'Unknown alias cannot create or infer a canonical record id.', [
                'alias_key' => $aliasKey,
            ]);
        }

        return $this->decision(true, 'allow', 'alias_resolved_to_canonical_record', 'Alias resolves to an existing canonical record id.', [
            'alias_key' => $aliasKey,
            'governed_root_code' => $this->canonicalCode($target['governed_root_code'] ?? ''),
            'canonical_record_id' => $this->text($target['canonical_record_id']),
        ]);
    }

    /** @param array<string, mixed> $context @return array<string, mixed> */
    private function decision(bool $allowed, string $decision, string $reasonCode, string $message, array $context = []): array
    {
        $payload = [
            'allowed' => $allowed,
            'decision' => $decision,
            'status' => $allowed ? 'passed' : 'blocked',
            'reason_code' => $reasonCode,
            'message' => $message,
            'context' => $context,
        ];
        $payload['evidence_hash_sha256'] = $this->hashPayload($payload);

        return $payload;
    }

    private function canonicalCode(mixed $value): string
    {
        return strtoupper(preg_replace('/[^A-Z0-9_-]+/', '', $this->text($value)) ?? '');
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    /** @param array<string, mixed> $payload */
    private function hashPayload(array $payload): string
    {
        return hash('sha256', json_encode($this->sortRecursively($payload), JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /** @param array<string, mixed> $value @return array<string, mixed> */
    private function sortRecursively(array $value): array
    {
        ksort($value);
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->sortRecursively($item);
            }
        }

        return $value;
    }
}

if (!class_exists('MOM\\Api\\Services\\MdaFrontendProjectionSafetyService', false)) {
    class_alias(MdaFrontendProjectionSafetyService::class, 'MOM\\Api\\Services\\MdaFrontendProjectionSafetyService');
}
