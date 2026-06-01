<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

final class AIActorFirewall
{
    private const BLOCKED_VERBS = [
        'Approve',
        'Release',
        'Sign',
        'Post',
        'Dispatch',
        'Complete',
        'ApplyQualityHold',
        'ReleaseQualityHold',
        'Start',
        'Issue',
        'Load',
        'Bind',
    ];

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    public function evaluate(array $entry, array $envelope, array $payload): array
    {
        unset($payload);
        $actorType = strtolower(trim((string)($envelope['actor_type'] ?? $envelope['actor_kind'] ?? $envelope['source_actor_type'] ?? '')));
        $actorId = strtolower(trim((string)($envelope['actor_id'] ?? $envelope['actor_ref'] ?? '')));
        $source = strtolower(trim((string)($envelope['source_type'] ?? $envelope['source_system'] ?? '')));
        $isAi = in_array($actorType, ['ai', 'llm', 'copilot', 'agent'], true)
            || str_starts_with($actorId, 'ai:')
            || str_starts_with($actorId, 'llm:')
            || str_contains($actorId, 'ai-agent')
            || in_array($source, ['ai', 'llm', 'copilot'], true);

        if (!$isAi) {
            return $this->allow();
        }

        $commandName = (string)($envelope['command_name'] ?? $envelope['command'] ?? '');
        if (trim((string)($entry['root'] ?? '')) !== '' || ($entry['regulated_action'] ?? false) === true) {
            return $this->deny('ai_governed_action_forbidden', 'AI actors cannot execute governed mutations.', [
                'command_name' => $commandName,
                'root' => (string)($entry['root'] ?? ''),
            ]);
        }

        foreach (self::BLOCKED_VERBS as $verb) {
            if (str_contains($commandName, $verb)) {
                return $this->deny('ai_governed_action_forbidden', 'AI actors cannot execute governed mutations.', [
                    'command_name' => $commandName,
                ]);
            }
        }

        return $this->allow();
    }

    /**
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    private function allow(): array
    {
        return ['allowed' => true, 'code' => 'allowed', 'message' => 'Allowed.', 'details' => []];
    }

    /**
     * @param array<string,mixed> $details
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    private function deny(string $code, string $message, array $details = []): array
    {
        return ['allowed' => false, 'code' => $code, 'message' => $message, 'details' => $details];
    }
}
